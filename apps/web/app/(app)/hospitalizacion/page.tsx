'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PageHeader from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';

/* HP0001 - Configuración de conexión backend (vía API Gateway) */
const API_HOSPITALIZACION = 'http://localhost:4000/api/hospitalizacion';

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
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const toast = useToast();

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
        detalle: item.resumen_alta
          ? `Resumen de alta: ${item.resumen_alta}`
          : item.motivo_ingreso
            ? `Motivo de ingreso: ${item.motivo_ingreso}`
            : 'Sin observaciones adicionales registradas.',
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
      toast.info('Paciente no encontrado', 'No está en admisión. Complete los datos manualmente.');
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
      toast.error('Datos incompletos', 'Complete DNI, nombres, habitación y cama.');
      return;
    }

    const cuartoExiste = cuartos.some((c) => c.cuarto === form.habitacion);

    if (!cuartoExiste) {
      toast.error('Habitación inválida', 'La habitación no existe. Agréguela primero en disponibilidad.');
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
          toast.error('No se pudo registrar', json.error || 'No se pudo guardar el ingreso.');
        } else {
          await cargarDatosBackend();
          limpiarFormularioIngreso();
          setModalIngreso(false);
          toast.ok('Ingreso registrado', 'El internamiento se guardó correctamente.');
          return;
        }
      } catch {
        toast.error('Sin conexión', 'No se pudo conectar con el servidor.');
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
      toast.error('Falta el motivo', 'Ingrese motivo u observación de la acción.');
      return;
    }

    if (
      accion.tipo === 'TRASLADO' &&
      (!accion.nuevaHabitacion || !accion.nuevaCama)
    ) {
      toast.error('Datos incompletos', 'Ingrese nueva habitación y nueva cama.');
      return;
    }

    if (accion.tipo === 'TRASLADO') {
      const cuartoExiste = cuartos.some((c) => c.cuarto === accion.nuevaHabitacion);

      if (!cuartoExiste) {
        toast.error('Habitación inválida', 'La nueva habitación no existe en disponibilidad.');
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
          toast.ok('Acción registrada', `Se registró: ${accion.tipo.toLowerCase()}.`);
          return;
        }

        toast.error('No se pudo registrar', json.error || 'No se pudo registrar la acción.');
      } catch {
        toast.error('Sin conexión', 'No se pudo conectar con el servidor.');
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
      toast.error('Falta el número', 'Ingrese número de cuarto.');
      return;
    }

    const yaExiste = cuartos.some(
      (c) => c.cuarto.toUpperCase() === cuartoLimpio,
    );

    if (yaExiste) {
      toast.error('Cuarto duplicado', `El cuarto ${cuartoLimpio} ya existe.`);
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
    toast.ok('Cuarto agregado', `Se agregó el cuarto ${cuartoLimpio}.`);
  }

  /* Valida y abre la confirmación antes de borrar un cuarto */
  function pedirQuitarCuarto() {
    if (!cuartoAQuitar) {
      toast.error('Selecciona un cuarto', 'Elige un cuarto para quitar.');
      return;
    }
    const seleccionado = cuartos.find((c) => c.cuarto === cuartoAQuitar);
    if (!seleccionado) return;
    if (seleccionado.pacientes > 0) {
      toast.error('Cuarto ocupado', 'No se puede quitar un cuarto ocupado.');
      return;
    }
    setConfirmarQuitar(true);
  }

  /* Borrado efectivo tras confirmar */
  function quitarCuartoConfirmado() {
    setCuartos(cuartos.filter((c) => c.cuarto !== cuartoAQuitar));
    toast.ok('Cuarto eliminado', `Se quitó el cuarto ${cuartoAQuitar} de disponibilidad.`);
    setCuartoAQuitar('');
    setConfirmarQuitar(false);
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
      <PageHeader title="Hospitalización" />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className="hp-pulse"
          style={primaryButton}
          onClick={() => setModalIngreso(true)}
        >
          + Agregar paciente
        </button>

        <button style={secondaryButton} onClick={() => setModalCuarto(true)}>
          Agregar / quitar cuarto
        </button>

        <button style={refreshButton} onClick={cargarDatosBackend}>
          Actualizar BD
        </button>

        <span style={backendBadge(backendActivo)}>
          {cargandoBackend
            ? 'Cargando…'
            : backendActivo
              ? 'En línea'
              : 'Sin conexión'}
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
                        Dar alta
                      </button>
                      <button style={smallButton} onClick={() => abrirAccion(p, 'TRASLADO')}>
                        Trasladar
                      </button>
                      <button
                        style={warningButton}
                        onClick={() => abrirAccion(p, 'ALTA VOLUNTARIA')}
                      >
                        Alta voluntaria
                      </button>
                      <button
                        style={dangerButton}
                        onClick={() => abrirAccion(p, 'REFERIDO EMERGENCIA')}
                      >
                        Emergencia
                      </button>
                    </div>
                  ) : (
                    'Cerrado'
                  )}
                </td>
                <td style={td}>
                  <button style={iconButton} onClick={() => verDetalle(p)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP0025 - Tabla de cuartos */}
      <h3 style={{ marginTop: 28, color: 'var(--navy)' }}>
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
                <td style={td}>
                  <span className={`badge ${c.estado === 'LIBRE' ? 'ok' : 'warn'}`}>{c.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* HP0026 - Modal ingreso */}
      {modalIngreso && (
        <Modal titulo="Registrar ingreso hospitalario" onClose={() => setModalIngreso(false)}>
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
        <Modal titulo={`Registrar acción: ${accion.tipo}`} onClose={() => setModalAccion(false)}>
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
        <Modal titulo="Detalle del internamiento" onClose={() => setModalDetalle(false)}>
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
        <Modal titulo="Gestión de cuartos y ambientes" onClose={() => setModalCuarto(false)}>
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
            Guardar cuarto
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

          <button style={dangerButtonLarge} onClick={pedirQuitarCuarto}>
            Quitar cuarto seleccionado
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

      {/* HP0029b - Confirmación de borrado de cuarto */}
      <ConfirmDialog
        open={confirmarQuitar}
        title="¿Quitar este cuarto?"
        message={`Se eliminará el cuarto ${cuartoAQuitar} de la disponibilidad. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, quitar"
        onConfirm={quitarCuartoConfirmado}
        onCancel={() => setConfirmarQuitar(false)}
      />
    </div>
  );
}

/* HP0030 - Modal reutilizable (usa el sistema de diseño compartido) */
function Modal({ titulo, onClose, children }: { titulo: string; onClose?: () => void; children: ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-card lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <div className="modal-titles"><h3 className="modal-title">{titulo}</h3></div>
          {onClose && <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* HP0031 - Estados visuales (paleta de tokens) */
function estadoColor(estadoPaciente: EstadoPaciente) {
  let background = 'var(--pending)';
  if (estadoPaciente === 'ALTA') background = 'var(--ok)';
  if (estadoPaciente === 'ALTA VOLUNTARIA') background = 'var(--warn)';
  if (estadoPaciente === 'REFERIDO EMERGENCIA') background = 'var(--danger)';

  return {
    padding: '.3rem .7rem',
    display: 'inline-block',
    fontWeight: 700,
    fontSize: '.78rem',
    background,
    color: '#fff',
    borderRadius: 8,
    whiteSpace: 'nowrap' as const,
  };
}

function backendBadge(activo: boolean) {
  return {
    padding: '.4rem .85rem',
    borderRadius: 999,
    fontSize: '.78rem',
    fontWeight: 700,
    background: activo ? '#e8f6ef' : '#fdf4e3',
    color: activo ? 'var(--ok)' : 'var(--warn)',
    border: `1px solid ${activo ? '#bfe6d2' : '#f0dcae'}`,
  };
}

/* HP0032 - Estilos */
const page = {
  padding: 0,
};

const primaryButton = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '.7rem 1.3rem',
  fontSize: '.9rem',
  cursor: 'pointer',
  borderRadius: 10,
  fontWeight: 700,
};

const secondaryButton = {
  background: 'var(--secondary)',
  color: '#fff',
  border: 'none',
  padding: '.7rem 1.3rem',
  fontSize: '.9rem',
  cursor: 'pointer',
  borderRadius: 10,
  fontWeight: 700,
};

const refreshButton = {
  background: '#fff',
  color: 'var(--brand)',
  border: '1.5px solid var(--brand)',
  padding: '.7rem 1.3rem',
  fontSize: '.9rem',
  cursor: 'pointer',
  borderRadius: 10,
  fontWeight: 700,
};

const mainTable = {
  width: '100%',
  background: 'var(--surface)',
  borderCollapse: 'collapse' as const,
  marginTop: 12,
  fontSize: '.88rem',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow)',
};

const smallTable = {
  width: '100%',
  maxWidth: 640,
  background: 'var(--surface)',
  borderCollapse: 'collapse' as const,
  marginTop: 12,
  fontSize: '.9rem',
  borderRadius: 'var(--radius)',
  overflow: 'hidden',
  boxShadow: 'var(--shadow)',
};

const th = {
  padding: '.7rem .85rem',
  color: 'var(--muted)',
  fontWeight: 600,
  borderBottom: '1px solid var(--border)',
  textAlign: 'left' as const,
  background: 'var(--surface)',
  fontSize: '.82rem',
};

const blueTh = {
  ...th,
  background: 'var(--sidebar-active)',
  color: 'var(--brand-d)',
};

const td = {
  padding: '.7rem .85rem',
  borderBottom: '1px solid #f0f2f7',
  textAlign: 'left' as const,
  color: 'var(--text)',
};

const smallButton = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '.4rem .7rem',
  cursor: 'pointer',
  fontSize: '.78rem',
  fontWeight: 700,
  borderRadius: 8,
};

const warningButton = {
  ...smallButton,
  background: 'var(--warn)',
};

const dangerButton = {
  ...smallButton,
  background: 'var(--danger)',
};

const dangerButtonLarge = {
  background: 'var(--danger)',
  color: '#fff',
  border: 'none',
  padding: '.6rem 1.1rem',
  cursor: 'pointer',
  borderRadius: 10,
  fontWeight: 700,
};

const iconButton = {
  background: 'var(--sidebar-active)',
  border: '1px solid var(--border)',
  padding: '.4rem .6rem',
  cursor: 'pointer',
  borderRadius: 8,
};

const input = {
  width: '100%',
  padding: '.7rem .9rem',
  marginBottom: '.7rem',
  border: '1px solid transparent',
  borderRadius: 10,
  background: 'var(--input)',
  color: 'var(--text)',
  fontSize: '.95rem',
  fontFamily: 'inherit',
};

const saveButton = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  padding: '.7rem 1.4rem',
  marginRight: 8,
  cursor: 'pointer',
  borderRadius: 10,
  fontWeight: 700,
};

const cancelButton = {
  background: 'transparent',
  color: 'var(--muted)',
  border: 'none',
  padding: '.7rem 1.4rem',
  cursor: 'pointer',
  borderRadius: 10,
  fontWeight: 700,
};

const detalleBox = {
  background: '#f6f8fd',
  border: '1px solid var(--border)',
  padding: '.9rem 1rem',
  whiteSpace: 'pre-wrap' as const,
  fontSize: '.85rem',
  color: 'var(--text)',
  borderRadius: 10,
};

const sectionTitle = {
  margin: '.5rem 0 .85rem',
  color: 'var(--navy)',
  fontWeight: 800,
};