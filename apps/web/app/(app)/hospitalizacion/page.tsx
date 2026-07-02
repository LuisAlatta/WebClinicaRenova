'use client';

import { useEffect, useState, type ReactNode } from 'react';

/* HP0001 - Configuración de conexión backend */
const API_HOSPITALIZACION = 'http://localhost:3004';

/* HP0002 - Tipos principales del módulo */
type EstadoPaciente =
  | 'INTERNADO'
  | 'ALTA'
  | 'ALTA VOLUNTARIA'
  | 'REFERIDO EMERGENCIA';

type Paciente = {
  id: number;
  serverId?: string;
  pacienteId?: string;
  medicoId?: string;
  camaId?: number;
  dni: string;
  nombres: string;
  edad: string;
  doctor: string;
  procedimiento: string;
  tipo: string;
  habitacion: string;
  cama: string;
  fechaIngreso: string;
  fechaAlta: string;
  estado: EstadoPaciente;
  observacion: string;
  responsableIngreso: string;
  responsableAlta: string;
  detalle: string;
};

type Cuarto = {
  backendId?: number;
  cuarto: string;
  pacientes: number;
  tipo: string;
  estado: 'LIBRE' | 'OCUPADO';
};

type BackendCama = {
  id: number;
  codigo: string;
  piso: number | null;
  ocupada: boolean;
};

type BackendInternamiento = {
  id: string;
  paciente_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  medico_responsable_id: string;
  medico_nombres: string;
  medico_apellidos: string;
  cama_id: number;
  cama_codigo: string;
  piso: number | null;
  fecha_ingreso: string;
  fecha_egreso: string | null;
  motivo_ingreso: string | null;
  resumen_alta: string | null;
  estado: string;
};

/* HP0003 - Responsables ficticios para demo */
const responsables = [
  'Lic. Andrea Vargas',
  'Lic. Karina Ponce',
  'Lic. Diego Cárdenas',
  'Lic. Luis Gamarra',
  'Tec. Camila Rojas',
  'Tec. Mariana Flores',
  'Tec. José Villanueva',
  'Tec. Kevin Salazar',
];

/* HP0004 - Pacientes simulados, alineados a IDs reales de la BD */
const pacientesBase = [
  {
    pacienteId: '8e741c8a-7760-45b3-8dab-a5bb71d7faed',
    dni: '72345678',
    nombres: 'Carlos Mamani Flores',
    edad: '46',
    medicoId: '2b13f0f3-95a8-4c4c-849b-5f2e5411be6a',
    doctor: 'Dr. Yordy Neyra',
    procedimiento: 'Colecistectomía laparoscópica',
    tipo: 'HOSPITALARIA',
  },
  {
    pacienteId: '6daa49df-2bc2-42b9-9566-824a52dd66f7',
    dni: '45678912',
    nombres: 'María Huanca Ccama',
    edad: '34',
    medicoId: '7fdff442-6980-450f-825e-5470f6de77ba',
    doctor: 'Dr. Sebastian Ticlavilca',
    procedimiento: 'Hernioplastía inguinal',
    tipo: 'HOSPITALARIA',
  },
  {
    pacienteId: '333c428d-b2b8-4609-8f06-5dbc788b9d71',
    dni: '60123456',
    nombres: 'Pedro Condori Apaza',
    edad: '52',
    medicoId: '7201390d-86e1-4d16-8503-6d26ab51864e',
    doctor: 'Dra. Ana Quispe',
    procedimiento: 'Endoscopía digestiva',
    tipo: 'AMBULATORIA',
  },
  {
    pacienteId: 'd85fa3d5-9d62-4714-89b8-7e6de153aacc',
    dni: '41239876',
    nombres: 'Lucía Vargas Ríos',
    edad: '29',
    medicoId: '7201390d-86e1-4d16-8503-6d26ab51864e',
    doctor: 'Dra. Ana Quispe',
    procedimiento: 'Tratamiento médico',
    tipo: 'TRATAMIENTO',
  },
];

/* HP0005 - Datos visuales de respaldo si internamientos BD está vacío */
const pacientesIniciales: Paciente[] = [
  {
    id: 1,
    ...pacientesBase[0],
    habitacion: '201',
    cama: 'CAMA-201',
    fechaIngreso: '24/06/2026 09:54',
    fechaAlta: '',
    estado: 'INTERNADO',
    observacion: 'Paciente en recuperación postoperatoria.',
    responsableIngreso: 'Lic. Andrea Vargas',
    responsableAlta: '',
    detalle: 'Ingreso registrado por hospitalización posterior a cirugía.',
  },
  {
    id: 2,
    ...pacientesBase[1],
    habitacion: '202',
    cama: 'CAMA-202',
    fechaIngreso: '24/06/2026 10:27',
    fechaAlta: '',
    estado: 'INTERNADO',
    observacion: 'Paciente estable, pendiente de reevaluación médica.',
    responsableIngreso: 'Tec. Kevin Salazar',
    responsableAlta: '',
    detalle: 'Paciente ingresado para observación y control de evolución.',
  },
];

/* HP0006 - Cuartos de respaldo si falla backend */
const cuartosIniciales: Cuarto[] = [
  { cuarto: '201', pacientes: 0, tipo: 'PISO 2', estado: 'LIBRE' },
  { cuarto: '202', pacientes: 0, tipo: 'PISO 2', estado: 'LIBRE' },
  { cuarto: '301', pacientes: 0, tipo: 'PISO 3', estado: 'LIBRE' },
  { cuarto: '302', pacientes: 0, tipo: 'PISO 3', estado: 'LIBRE' },
];

export default function HospitalizacionPage() {
  /* HP0007 - Estados principales */
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesIniciales);
  const [cuartos, setCuartos] = useState<Cuarto[]>(cuartosIniciales);
  const [cargandoBackend, setCargandoBackend] = useState(false);
  const [backendActivo, setBackendActivo] = useState(false);

  const [modalIngreso, setModalIngreso] = useState(false);
  const [modalAccion, setModalAccion] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalCuarto, setModalCuarto] = useState(false);

  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState<Paciente | null>(null);

  /* HP0008 - Formulario de ingreso */
  const [form, setForm] = useState({
    dni: '',
    nombres: '',
    edad: '',
    doctor: '',
    procedimiento: '',
    tipo: 'HOSPITALARIA',
    habitacion: '',
    cama: '',
    observacion: '',
    responsableIngreso: responsables[0],
    pacienteId: '',
    medicoId: '',
    camaId: '',
  });

  /* HP0009 - Formulario de acciones */
  const [accion, setAccion] = useState({
    tipo: '',
    motivo: '',
    nuevaHabitacion: '',
    nuevaCama: '',
    responsable: responsables[0],
  });

  /* HP0010 - Gestión de cuartos visuales */
  const [nuevoCuarto, setNuevoCuarto] = useState({
    cuarto: '',
    tipo: 'INDIVIDUAL',
  });

  const [cuartoAQuitar, setCuartoAQuitar] = useState('');

  /* HP0011 - Carga inicial desde backend */
  useEffect(() => {
    cargarDatosBackend();
  }, []);

  async function cargarDatosBackend() {
    setCargandoBackend(true);

    try {
      await Promise.all([cargarCamasBackend(), cargarInternamientosBackend()]);
      setBackendActivo(true);
    } catch {
      setBackendActivo(false);
    } finally {
      setCargandoBackend(false);
    }
  }

  /* HP0012 - GET /camas desde PostgreSQL */
  async function cargarCamasBackend() {
    const res = await fetch(`${API_HOSPITALIZACION}/camas`);
    const json = await res.json();

    if (!json.ok) throw new Error('No se pudo cargar camas.');

    const camasConvertidas: Cuarto[] = json.data.map((cama: BackendCama) => {
      const cuarto = cama.codigo.replace('CAMA-', '');

      return {
        backendId: cama.id,
        cuarto,
        pacientes: cama.ocupada ? 1 : 0,
        tipo: cama.piso ? `PISO ${cama.piso}` : 'SIN PISO',
        estado: cama.ocupada ? 'OCUPADO' : 'LIBRE',
      };
    });

    setCuartos(camasConvertidas);
  }

  /* HP0013 - GET / internamientos desde PostgreSQL */
  async function cargarInternamientosBackend() {
    const res = await fetch(`${API_HOSPITALIZACION}/`);
    const json = await res.json();

    if (!json.ok) throw new Error('No se pudo cargar internamientos.');

    if (!json.data || json.data.length === 0) return;

    const convertidos: Paciente[] = json.data.map(
      (item: BackendInternamiento, index: number) => ({
        id: index + 1,
        serverId: item.id,
        pacienteId: item.paciente_id,
        medicoId: item.medico_responsable_id,
        camaId: item.cama_id,
        dni: item.dni,
        nombres: `${item.nombres} ${item.apellidos}`,
        edad: '-',
        doctor: `${item.medico_nombres} ${item.medico_apellidos}`,
        procedimiento: item.motivo_ingreso || 'Internamiento hospitalario',
        tipo: 'HOSPITALARIA',
        habitacion: item.cama_codigo?.replace('CAMA-', '') || '-',
        cama: item.cama_codigo || '-',
        fechaIngreso: formatearFecha(item.fecha_ingreso),
        fechaAlta: item.fecha_egreso ? formatearFecha(item.fecha_egreso) : '',
        estado: convertirEstadoBackend(item.estado),
        observacion: item.motivo_ingreso || '',
        responsableIngreso: 'Sistema RENOVA',
        responsableAlta: item.fecha_egreso ? 'Sistema RENOVA' : '',
        detalle: `Internamiento registrado en PostgreSQL. Estado: ${item.estado}. ${
          item.resumen_alta ? `Resumen alta: ${item.resumen_alta}` : ''
        }`,
      }),
    );

    setPacientes(convertidos);
  }

  /* HP0014 - Utilidades generales */
  function fechaActual() {
    return new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function convertirEstadoBackend(estado: string): EstadoPaciente {
    if (estado === 'ALTA') return 'ALTA';
    if (estado === 'ALTA_VOLUNTARIA') return 'ALTA VOLUNTARIA';
    if (estado === 'REFERIDO_EMERGENCIA') return 'REFERIDO EMERGENCIA';
    return 'INTERNADO';
  }

  function convertirEstadoFrontend(estado: string) {
    if (estado === 'ALTA VOLUNTARIA') return 'ALTA_VOLUNTARIA';
    if (estado === 'REFERIDO EMERGENCIA') return 'REFERIDO_EMERGENCIA';
    if (estado === 'ALTA') return 'ALTA';
    return 'ALTA';
  }

  function obtenerToken() {
    if (typeof window === 'undefined') return '';

    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('renova_token') ||
      ''
    );
  }

  /* HP0015 - Buscar paciente por DNI */
  function buscarPacientePorDni() {
    const encontrado = pacientesBase.find((p) => p.dni === form.dni);

    if (!encontrado) {
      alert('Paciente no encontrado en admisión. Complete los datos manualmente.');
      return;
    }

    setForm({
      ...form,
      nombres: encontrado.nombres,
      edad: encontrado.edad,
      doctor: encontrado.doctor,
      procedimiento: encontrado.procedimiento,
      tipo: encontrado.tipo,
      pacienteId: encontrado.pacienteId,
      medicoId: encontrado.medicoId,
    });
  }

  /* HP0016 - Actualización visual de ocupación */
  function ajustarCuarto(cuarto: string, cambio: number) {
    setCuartos((actual) =>
      actual.map((c) => {
        if (c.cuarto !== cuarto) return c;

        const nuevoTotal = Math.max(c.pacientes + cambio, 0);

        return {
          ...c,
          pacientes: nuevoTotal,
          estado: nuevoTotal > 0 ? 'OCUPADO' : 'LIBRE',
        };
      }),
    );
  }

  /* HP0017 - Registrar ingreso: intenta backend y mantiene demo visual */
  async function agregarPaciente() {
    if (!form.dni || !form.nombres || !form.habitacion || !form.cama) {
      alert('Complete DNI, nombres, habitación y cama.');
      return;
    }

    const cuartoExiste = cuartos.some((c) => c.cuarto === form.habitacion);

    if (!cuartoExiste) {
      alert('La habitación indicada no existe. Primero agréguela en disponibilidad.');
      return;
    }

    const camaSeleccionada = cuartos.find((c) => c.cuarto === form.habitacion);
    const token = obtenerToken();

    if (token && form.pacienteId && form.medicoId && camaSeleccionada?.backendId) {
      try {
        const res = await fetch(`${API_HOSPITALIZACION}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paciente_id: form.pacienteId,
            medico_responsable_id: form.medicoId,
            cama_id: camaSeleccionada.backendId,
            motivo_ingreso:
              form.observacion || form.procedimiento || 'Ingreso hospitalario',
          }),
        });

        const json = await res.json();

        if (!json.ok) {
          alert(json.error || 'No se pudo registrar en backend. Se registrará visualmente.');
        } else {
          await cargarDatosBackend();
          limpiarFormularioIngreso();
          setModalIngreso(false);
          return;
        }
      } catch {
        alert('No se pudo conectar al backend. Se registrará visualmente.');
      }
    }

    const nuevo: Paciente = {
      id: pacientes.length + 1,
      pacienteId: form.pacienteId,
      medicoId: form.medicoId,
      dni: form.dni,
      nombres: form.nombres,
      edad: form.edad,
      doctor: form.doctor,
      procedimiento: form.procedimiento,
      tipo: form.tipo,
      habitacion: form.habitacion,
      cama: form.cama,
      fechaIngreso: fechaActual(),
      fechaAlta: '',
      estado: 'INTERNADO',
      observacion: form.observacion,
      responsableIngreso: form.responsableIngreso,
      responsableAlta: '',
      detalle: `Ingreso registrado el ${fechaActual()} por ${form.responsableIngreso}. Observación: ${
        form.observacion || 'Sin observaciones adicionales.'
      }`,
    };

    setPacientes([...pacientes, nuevo]);
    ajustarCuarto(form.habitacion, 1);
    limpiarFormularioIngreso();
    setModalIngreso(false);
  }

  function limpiarFormularioIngreso() {
    setForm({
      dni: '',
      nombres: '',
      edad: '',
      doctor: '',
      procedimiento: '',
      tipo: 'HOSPITALARIA',
      habitacion: '',
      cama: '',
      observacion: '',
      responsableIngreso: responsables[0],
      pacienteId: '',
      medicoId: '',
      camaId: '',
    });
  }

  /* HP0018 - Abrir acción clínica */
  function abrirAccion(paciente: Paciente, tipoAccion: string) {
    setPacienteSeleccionado(paciente);
    setAccion({
      tipo: tipoAccion,
      motivo: '',
      nuevaHabitacion: '',
      nuevaCama: '',
      responsable: responsables[0],
    });
    setModalAccion(true);
  }

  /* HP0019 - Confirmar acción: intenta PATCH backend si tiene serverId */
  async function confirmarAccion() {
    if (!pacienteSeleccionado) return;

    if (!accion.motivo) {
      alert('Ingrese motivo u observación de la acción.');
      return;
    }

    if (
      accion.tipo === 'TRASLADO' &&
      (!accion.nuevaHabitacion || !accion.nuevaCama)
    ) {
      alert('Ingrese nueva habitación y nueva cama.');
      return;
    }

    if (accion.tipo === 'TRASLADO') {
      const cuartoExiste = cuartos.some((c) => c.cuarto === accion.nuevaHabitacion);

      if (!cuartoExiste) {
        alert('La nueva habitación no existe en disponibilidad.');
        return;
      }
    }

    const token = obtenerToken();

    if (
      pacienteSeleccionado.serverId &&
      token &&
      accion.tipo !== 'TRASLADO'
    ) {
      try {
        const res = await fetch(
          `${API_HOSPITALIZACION}/${pacienteSeleccionado.serverId}/egreso`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              resumen_alta: accion.motivo,
              estado: convertirEstadoFrontend(accion.tipo),
            }),
          },
        );

        const json = await res.json();

        if (json.ok) {
          await cargarDatosBackend();
          setModalAccion(false);
          return;
        }

        alert(json.error || 'No se pudo registrar acción en backend.');
      } catch {
        alert('No se pudo conectar al backend. Se aplicará visualmente.');
      }
    }

    aplicarAccionVisual();
  }

  /* HP0020 - Aplica acción visual si no hay token o no es registro backend */
  function aplicarAccionVisual() {
    if (!pacienteSeleccionado) return;

    const fecha = fechaActual();

    setPacientes(
      pacientes.map((p) => {
        if (p.id !== pacienteSeleccionado.id) return p;

        if (accion.tipo === 'TRASLADO') {
          return {
            ...p,
            habitacion: accion.nuevaHabitacion,
            cama: accion.nuevaCama,
            observacion: accion.motivo,
            detalle: `${p.detalle}\nTraslado realizado el ${fecha} por ${accion.responsable}. Motivo: ${accion.motivo}. Nueva ubicación: ${accion.nuevaHabitacion} - ${accion.nuevaCama}.`,
          };
        }

        if (accion.tipo === 'ALTA') {
          return {
            ...p,
            estado: 'ALTA',
            fechaAlta: fecha,
            responsableAlta: accion.responsable,
            observacion: accion.motivo,
            detalle: `${p.detalle}\nAlta registrada el ${fecha} por ${accion.responsable}. Indicaciones: ${accion.motivo}.`,
          };
        }

        if (accion.tipo === 'ALTA VOLUNTARIA') {
          return {
            ...p,
            estado: 'ALTA VOLUNTARIA',
            fechaAlta: fecha,
            responsableAlta: accion.responsable,
            observacion: accion.motivo,
            detalle: `${p.detalle}\nAlta voluntaria registrada el ${fecha} por ${accion.responsable}. Motivo declarado: ${accion.motivo}.`,
          };
        }

        return {
          ...p,
          estado: 'REFERIDO EMERGENCIA',
          fechaAlta: fecha,
          responsableAlta: accion.responsable,
          observacion: accion.motivo,
          detalle: `${p.detalle}\nReferencia de emergencia registrada el ${fecha} por ${accion.responsable}. Situación reportada: ${accion.motivo}.`,
        };
      }),
    );

    if (accion.tipo === 'TRASLADO') {
      ajustarCuarto(pacienteSeleccionado.habitacion, -1);
      ajustarCuarto(accion.nuevaHabitacion, 1);
    } else {
      ajustarCuarto(pacienteSeleccionado.habitacion, -1);
    }

    setModalAccion(false);
  }

  /* HP0021 - Detalle y gestión visual de cuartos */
  function verDetalle(paciente: Paciente) {
    setPacienteSeleccionado(paciente);
    setModalDetalle(true);
  }

  function agregarCuarto() {
    const cuartoLimpio = nuevoCuarto.cuarto.trim().toUpperCase();

    if (!cuartoLimpio) {
      alert('Ingrese número de cuarto.');
      return;
    }

    const yaExiste = cuartos.some(
      (c) => c.cuarto.toUpperCase() === cuartoLimpio,
    );

    if (yaExiste) {
      alert(`El cuarto ${cuartoLimpio} ya existe. No se puede duplicar.`);
      return;
    }

    setCuartos([
      ...cuartos,
      {
        cuarto: cuartoLimpio,
        pacientes: 0,
        tipo: nuevoCuarto.tipo,
        estado: 'LIBRE',
      },
    ]);

    setNuevoCuarto({ cuarto: '', tipo: 'INDIVIDUAL' });
  }

  function quitarCuarto() {
    if (!cuartoAQuitar) {
      alert('Seleccione un cuarto para quitar.');
      return;
    }

    const seleccionado = cuartos.find((c) => c.cuarto === cuartoAQuitar);

    if (!seleccionado) return;

    if (seleccionado.pacientes > 0) {
      alert('No se puede quitar un cuarto ocupado.');
      return;
    }

    setCuartos(cuartos.filter((c) => c.cuarto !== cuartoAQuitar));
    setCuartoAQuitar('');
  }

  return (
    <div style={page}>
      {/* HP0022 - Animaciones */}
      <style>
        {`
          @keyframes aparecerModal {
            from { transform: scale(.94); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }

          @keyframes subirSuave {
            from { transform: translateY(8px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }

          @keyframes pulso {
            0% { box-shadow: 0 0 0 0 rgba(0, 152, 155, .28); }
            70% { box-shadow: 0 0 0 10px rgba(0, 152, 155, 0); }
            100% { box-shadow: 0 0 0 0 rgba(0, 152, 155, 0); }
          }

          button { transition: all .18s ease; }
          button:hover { transform: translateY(-1px); filter: brightness(.97); }
          tbody tr { transition: background .18s ease, transform .18s ease; }
          tbody tr:hover { background: #eef8f4; }
          .hp-card { animation: subirSuave .25s ease-out; }
          .hp-pulse { animation: pulso 1.6s infinite; }
        `}
      </style>

      {/* HP0023 - Encabezado */}
      <h2 style={title}>Hospitalización</h2>
      <p style={subtitle}>Buen día, nameUser</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          className="hp-pulse"
          style={primaryButton}
          onClick={() => setModalIngreso(true)}
        >
          🏥 + Agregar paciente
        </button>

        <button style={secondaryButton} onClick={() => setModalCuarto(true)}>
          🛏️ Agregar / quitar cuarto
        </button>

        <button style={refreshButton} onClick={cargarDatosBackend}>
          🔄 Actualizar BD
        </button>

        <span style={backendBadge(backendActivo)}>
          {cargandoBackend
            ? 'Conectando...'
            : backendActivo
              ? 'BD conectada'
              : 'Modo demo'}
        </span>
      </div>

      {/* HP0024 - Tabla principal */}
      <div className="hp-card">
        <table style={mainTable}>
          <thead>
            <tr>
              <th style={th}>DNI</th>
              <th style={th}>Nombres</th>
              <th style={th}>Edad</th>
              <th style={th}>Doctor</th>
              <th style={th}>Procedimiento</th>
              <th style={th}>Tipo</th>
              <th style={th}>Hab.</th>
              <th style={th}>Cama</th>
              <th style={th}>Ingreso</th>
              <th style={th}>Alta</th>
              <th style={th}>Estado</th>
              <th style={th}>Observación</th>
              <th style={th}>Acciones</th>
              <th style={th}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={`${p.id}-${p.serverId || p.dni}`}>
                <td style={td}>{p.dni}</td>
                <td style={td}>{p.nombres}</td>
                <td style={td}>{p.edad}</td>
                <td style={td}>{p.doctor}</td>
                <td style={td}>{p.procedimiento}</td>
                <td style={td}>{p.tipo}</td>
                <td style={td}>{p.habitacion}</td>
                <td style={td}>{p.cama}</td>
                <td style={td}>{p.fechaIngreso}</td>
                <td style={td}>{p.fechaAlta || '-'}</td>
                <td style={td}>
                  <span style={estadoColor(p.estado)}>{p.estado}</span>
                </td>
                <td style={td}>{p.observacion || '-'}</td>
                <td style={td}>
                  {p.estado === 'INTERNADO' ? (
                    <div style={{ display: 'grid', gap: 4 }}>
                      <button style={smallButton} onClick={() => abrirAccion(p, 'ALTA')}>
                        ✅ Dar alta
                      </button>
                      <button style={smallButton} onClick={() => abrirAccion(p, 'TRASLADO')}>
                        🔁 Trasladar
                      </button>
                      <button
                        style={warningButton}
                        onClick={() => abrirAccion(p, 'ALTA VOLUNTARIA')}
                      >
                        ⚠️ Alta voluntaria
                      </button>
                      <button
                        style={dangerButton}
                        onClick={() => abrirAccion(p, 'REFERIDO EMERGENCIA')}
                      >
                        🚑 Emergencia
                      </button>
                    </div>
                  ) : (
                    'Cerrado'
                  )}
                </td>
                <td style={td}>
                  <button style={iconButton} onClick={() => verDetalle(p)}>
                    🔍
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP0025 - Tabla de cuartos */}
      <h3 style={{ marginTop: 28, color: '#162b5f' }}>
        Disponibilidad de cuartos
      </h3>

      <div className="hp-card">
        <table style={smallTable}>
          <thead>
            <tr>
              <th style={blueTh}>Cuarto</th>
              <th style={blueTh}>N° pacientes</th>
              <th style={blueTh}>Tipo</th>
              <th style={blueTh}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {cuartos.map((c) => (
              <tr key={c.cuarto}>
                <td style={td}>{c.cuarto}</td>
                <td style={td}>{c.pacientes}</td>
                <td style={td}>{c.tipo}</td>
                <td
                  style={{
                    ...td,
                    background: c.estado === 'LIBRE' ? '#3ee66f' : '#fff06a',
                    fontWeight: 800,
                  }}
                >
                  {c.estado}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP0026 - Modal ingreso */}
      {modalIngreso && (
        <Modal titulo="🏥 Registrar ingreso hospitalario">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={input}
              placeholder="DNI"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
            />
            <button style={smallButton} onClick={buscarPacientePorDni}>
              Buscar
            </button>
          </div>

          <input
            style={input}
            placeholder="Nombres y apellidos"
            value={form.nombres}
            onChange={(e) => setForm({ ...form, nombres: e.target.value })}
          />

          <input
            style={input}
            placeholder="Edad"
            value={form.edad}
            onChange={(e) => setForm({ ...form, edad: e.target.value })}
          />

          <input
            style={input}
            placeholder="Doctor tratante"
            value={form.doctor}
            onChange={(e) => setForm({ ...form, doctor: e.target.value })}
          />

          <input
            style={input}
            placeholder="Procedimiento"
            value={form.procedimiento}
            onChange={(e) =>
              setForm({ ...form, procedimiento: e.target.value })
            }
          />

          <select
            style={input}
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option>HOSPITALARIA</option>
            <option>AMBULATORIA</option>
            <option>TRATAMIENTO</option>
            <option>RE INGRESO</option>
          </select>

          <select
            style={input}
            value={form.habitacion}
            onChange={(e) => {
              const seleccionado = cuartos.find((c) => c.cuarto === e.target.value);
              setForm({
                ...form,
                habitacion: e.target.value,
                cama: seleccionado ? `CAMA-${seleccionado.cuarto}` : '',
                camaId: seleccionado?.backendId ? String(seleccionado.backendId) : '',
              });
            }}
          >
            <option value="">Seleccione habitación/cama libre</option>
            {cuartos
              .filter((c) => c.estado === 'LIBRE')
              .map((c) => (
                <option key={c.cuarto} value={c.cuarto}>
                  {c.cuarto} - {c.tipo}
                </option>
              ))}
          </select>

          <input style={input} placeholder="Cama" value={form.cama} readOnly />

          <select
            style={input}
            value={form.responsableIngreso}
            onChange={(e) =>
              setForm({ ...form, responsableIngreso: e.target.value })
            }
          >
            {responsables.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <textarea
            style={input}
            placeholder="Observación de ingreso / motivo"
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
          />

          <button style={saveButton} onClick={agregarPaciente}>
            Guardar ingreso
          </button>
          <button style={cancelButton} onClick={() => setModalIngreso(false)}>
            Cancelar
          </button>
        </Modal>
      )}

      {/* HP0027 - Modal acciones */}
      {modalAccion && pacienteSeleccionado && (
        <Modal titulo={`Registrar acción: ${accion.tipo}`}>
          <p style={{ fontSize: 13 }}>
            Paciente: <b>{pacienteSeleccionado.nombres}</b>
          </p>

          {accion.tipo === 'TRASLADO' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                style={input}
                value={accion.nuevaHabitacion}
                onChange={(e) => {
                  const seleccionado = cuartos.find((c) => c.cuarto === e.target.value);
                  setAccion({
                    ...accion,
                    nuevaHabitacion: e.target.value,
                    nuevaCama: seleccionado ? `CAMA-${seleccionado.cuarto}` : '',
                  });
                }}
              >
                <option value="">Seleccione nueva habitación libre</option>
                {cuartos
                  .filter((c) => c.estado === 'LIBRE')
                  .map((c) => (
                    <option key={c.cuarto} value={c.cuarto}>
                      {c.cuarto} - {c.tipo}
                    </option>
                  ))}
              </select>

              <input
                style={input}
                placeholder="Nueva cama"
                value={accion.nuevaCama}
                readOnly
              />
            </div>
          )}

          <select
            style={input}
            value={accion.responsable}
            onChange={(e) =>
              setAccion({ ...accion, responsable: e.target.value })
            }
          >
            {responsables.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <textarea
            style={input}
            placeholder="Motivo, indicaciones u observación"
            value={accion.motivo}
            onChange={(e) => setAccion({ ...accion, motivo: e.target.value })}
          />

          <button style={saveButton} onClick={confirmarAccion}>
            Confirmar
          </button>
          <button style={cancelButton} onClick={() => setModalAccion(false)}>
            Cancelar
          </button>
        </Modal>
      )}

      {/* HP0028 - Modal detalle */}
      {modalDetalle && pacienteSeleccionado && (
        <Modal titulo="🔍 Detalle del internamiento">
          <p>
            <b>Paciente:</b> {pacienteSeleccionado.nombres}
          </p>
          <p>
            <b>Estado:</b> {pacienteSeleccionado.estado}
          </p>
          <p>
            <b>Ingreso:</b> {pacienteSeleccionado.fechaIngreso}
          </p>
          <p>
            <b>Alta/Salida:</b> {pacienteSeleccionado.fechaAlta || '-'}
          </p>
          <p>
            <b>Responsable ingreso:</b> {pacienteSeleccionado.responsableIngreso}
          </p>
          <p>
            <b>Responsable salida:</b> {pacienteSeleccionado.responsableAlta || '-'}
          </p>

          <pre style={detalleBox}>{pacienteSeleccionado.detalle}</pre>

          <button style={cancelButton} onClick={() => setModalDetalle(false)}>
            Cerrar
          </button>
        </Modal>
      )}

      {/* HP0029 - Modal cuartos */}
      {modalCuarto && (
        <Modal titulo="🛏️ Gestión de cuartos y ambientes">
          <h4 style={sectionTitle}>Agregar nuevo cuarto visual</h4>

          <input
            style={input}
            placeholder="Número de cuarto o ambiente"
            value={nuevoCuarto.cuarto}
            onChange={(e) =>
              setNuevoCuarto({ ...nuevoCuarto, cuarto: e.target.value })
            }
          />

          <select
            style={input}
            value={nuevoCuarto.tipo}
            onChange={(e) =>
              setNuevoCuarto({ ...nuevoCuarto, tipo: e.target.value })
            }
          >
            <option>INDIVIDUAL</option>
            <option>DOBLE</option>
            <option>SALA</option>
            <option>CONSULTORIO</option>
            <option>RECUPERACIÓN</option>
          </select>

          <button style={saveButton} onClick={agregarCuarto}>
            ➕ Guardar cuarto
          </button>

          <hr style={{ margin: '18px 0', border: '1px solid #eef0f5' }} />

          <h4 style={sectionTitle}>Quitar cuarto libre visual</h4>

          <select
            style={input}
            value={cuartoAQuitar}
            onChange={(e) => setCuartoAQuitar(e.target.value)}
          >
            <option value="">Seleccione un cuarto libre</option>
            {cuartos
              .filter((c) => c.pacientes === 0)
              .map((c) => (
                <option key={c.cuarto} value={c.cuarto}>
                  {c.cuarto} - {c.tipo}
                </option>
              ))}
          </select>

          <button style={dangerButtonLarge} onClick={quitarCuarto}>
            🗑️ Quitar cuarto seleccionado
          </button>

          <table style={{ ...smallTable, width: '100%', marginTop: 14 }}>
            <thead>
              <tr>
                <th style={blueTh}>Cuarto</th>
                <th style={blueTh}>Pacientes</th>
                <th style={blueTh}>Tipo</th>
                <th style={blueTh}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuartos.map((c) => (
                <tr key={c.cuarto}>
                  <td style={td}>{c.cuarto}</td>
                  <td style={td}>{c.pacientes}</td>
                  <td style={td}>{c.tipo}</td>
                  <td style={td}>{c.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            style={{ ...cancelButton, marginTop: 12 }}
            onClick={() => setModalCuarto(false)}
          >
            Cerrar
          </button>
        </Modal>
      )}
    </div>
  );
}

/* HP0030 - Modal reutilizable */
function Modal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div style={modalFondo}>
      <div style={modalCaja}>
        <h3 style={{ marginTop: 0, color: '#16365f' }}>{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

/* HP0031 - Estados visuales */
function estadoColor(estadoPaciente: EstadoPaciente) {
  let background = '#fff06a';

  if (estadoPaciente === 'ALTA') background = '#3ee66f';
  if (estadoPaciente === 'ALTA VOLUNTARIA') background = '#ffcc4d';
  if (estadoPaciente === 'REFERIDO EMERGENCIA') background = '#ff6b6b';

  return {
    padding: '5px 8px',
    display: 'inline-block',
    fontWeight: 800,
    background,
    color: '#000',
    borderRadius: 4,
  };
}

function backendBadge(activo: boolean) {
  return {
    padding: '7px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: activo ? '#d8ffe6' : '#fff3cd',
    color: activo ? '#087f3d' : '#856404',
    border: activo ? '1px solid #3ee66f' : '1px solid #ffd76a',
  };
}

/* HP0032 - Estilos */
const page = {
  background: 'linear-gradient(135deg, #eefbf3 0%, #f1f3fc 45%, #eaf7ff 100%)',
  minHeight: '100vh',
  padding: '10px 0 40px 0',
};

const title = {
  margin: 0,
  color: '#162b5f',
  fontSize: '26px',
  fontWeight: 800,
};

const subtitle = {
  marginTop: 4,
  color: '#111827',
  fontSize: '15px',
};

const primaryButton = {
  background: 'linear-gradient(135deg, #00a86b, #00989b)',
  color: '#fff',
  border: 'none',
  padding: '11px 18px',
  fontSize: '13px',
  cursor: 'pointer',
  borderRadius: 8,
  fontWeight: 800,
};

const secondaryButton = {
  background: 'linear-gradient(135deg, #7782c8, #a7abc9)',
  color: '#fff',
  border: 'none',
  padding: '11px 18px',
  fontSize: '13px',
  cursor: 'pointer',
  borderRadius: 8,
  fontWeight: 800,
};

const refreshButton = {
  background: '#16365f',
  color: '#fff',
  border: 'none',
  padding: '11px 18px',
  fontSize: '13px',
  cursor: 'pointer',
  borderRadius: 8,
  fontWeight: 800,
};

const mainTable = {
  width: '100%',
  background: '#fff',
  borderCollapse: 'collapse' as const,
  marginTop: 12,
  fontSize: '10px',
  boxShadow: '0 10px 24px rgba(21, 42, 91, .08)',
};

const smallTable = {
  width: '48%',
  background: '#fff',
  borderCollapse: 'collapse' as const,
  marginTop: 12,
  fontSize: '13px',
  boxShadow: '0 10px 24px rgba(21, 42, 91, .08)',
};

const th = {
  padding: '7px',
  color: '#111827',
  fontWeight: 800,
  border: '1px solid #d5d8e2',
  textAlign: 'center' as const,
  background: '#f9fbff',
};

const blueTh = {
  ...th,
  background: '#185cc9',
  color: '#fff',
  fontSize: '14px',
};

const td = {
  padding: '7px',
  border: '1px solid #d5d8e2',
  textAlign: 'center' as const,
  color: '#111827',
};

const smallButton = {
  background: '#00989b',
  color: '#fff',
  border: 'none',
  padding: '5px 8px',
  cursor: 'pointer',
  fontSize: '10px',
  borderRadius: 5,
};

const warningButton = {
  ...smallButton,
  background: '#f2a900',
};

const dangerButton = {
  ...smallButton,
  background: '#d93636',
};

const dangerButtonLarge = {
  background: '#d93636',
  color: '#fff',
  border: 'none',
  padding: '9px 15px',
  cursor: 'pointer',
  borderRadius: 6,
  fontWeight: 800,
};

const iconButton = {
  background: '#eef2ff',
  border: '1px solid #cfd3df',
  padding: '6px 8px',
  cursor: 'pointer',
  borderRadius: 6,
};

const modalFondo = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 20,
};

const modalCaja = {
  background: '#fff',
  padding: 24,
  borderRadius: 12,
  width: 560,
  maxHeight: '88vh',
  overflowY: 'auto' as const,
  boxShadow: '0 18px 45px rgba(0,0,0,.25)',
  animation: 'aparecerModal .18s ease-out',
};

const input = {
  width: '100%',
  padding: 9,
  marginBottom: 8,
  border: '1px solid #cfd3df',
  borderRadius: 6,
};

const saveButton = {
  background: '#00989b',
  color: '#fff',
  border: 'none',
  padding: '9px 15px',
  marginRight: 8,
  cursor: 'pointer',
  borderRadius: 6,
  fontWeight: 800,
};

const cancelButton = {
  background: '#ddd',
  border: 'none',
  padding: '9px 15px',
  cursor: 'pointer',
  borderRadius: 6,
};

const detalleBox = {
  background: '#f5f5f5',
  padding: 12,
  whiteSpace: 'pre-wrap' as const,
  fontSize: 12,
  borderRadius: 6,
};

const sectionTitle = {
  margin: '6px 0 10px',
  color: '#162b5f',
};