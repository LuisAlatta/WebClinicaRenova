'use client';

import { useState, type ReactNode } from 'react';

/* HP0001 - Tipos principales del módulo */
type EstadoPaciente =
  | 'INTERNADO'
  | 'ALTA'
  | 'ALTA VOLUNTARIA'
  | 'REFERIDO EMERGENCIA';

type Paciente = {
  id: number;
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
  cuarto: string;
  pacientes: number;
  tipo: string;
  estado: 'LIBRE' | 'OCUPADO';
};

/* HP0002 - Datos simulados: responsables ficticios */
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

/* HP0003 - Base simulada de pacientes desde admisión */
const pacientesBase = [
  {
    dni: '73124568',
    nombres: 'Andrea Salazar Rojas',
    edad: '34',
    doctor: 'Dr. Alejandro Mendoza',
    procedimiento: 'Colecistectomía laparoscópica',
    tipo: 'HOSPITALARIA',
  },
  {
    dni: '45671239',
    nombres: 'Miguel Torres Campos',
    edad: '58',
    doctor: 'Dra. Patricia Ríos',
    procedimiento: 'Hernioplastía inguinal',
    tipo: 'HOSPITALARIA',
  },
  {
    dni: '70456312',
    nombres: 'Valeria Paredes León',
    edad: '41',
    doctor: 'Dr. Ricardo Salinas',
    procedimiento: 'Endoscopía digestiva',
    tipo: 'AMBULATORIA',
  },
  {
    dni: '61987453',
    nombres: 'Carlos Medina Huamán',
    edad: '29',
    doctor: 'Dra. Verónica Aguilar',
    procedimiento: 'Tratamiento médico',
    tipo: 'TRATAMIENTO',
  },
];

/* HP0004 - Pacientes iniciales ficticios */
const pacientesIniciales: Paciente[] = [
  {
    id: 1,
    ...pacientesBase[0],
    habitacion: '402',
    cama: '402A',
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
    habitacion: '409',
    cama: '409A',
    fechaIngreso: '24/06/2026 10:27',
    fechaAlta: '',
    estado: 'INTERNADO',
    observacion: 'Paciente estable, pendiente de reevaluación médica.',
    responsableIngreso: 'Tec. Kevin Salazar',
    responsableAlta: '',
    detalle: 'Paciente ingresado para observación y control de evolución.',
  },
];

/* HP0005 - Cuartos iniciales ficticios */
const cuartosIniciales: Cuarto[] = [
  { cuarto: '401', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '402', pacientes: 1, tipo: 'INDIVIDUAL', estado: 'OCUPADO' },
  { cuarto: '403', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '404', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '405', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '406', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '407', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '408', pacientes: 0, tipo: 'INDIVIDUAL', estado: 'LIBRE' },
  { cuarto: '409', pacientes: 1, tipo: 'INDIVIDUAL', estado: 'OCUPADO' },
  { cuarto: '301', pacientes: 0, tipo: 'SALA', estado: 'LIBRE' },
  { cuarto: '302', pacientes: 0, tipo: 'SALA', estado: 'LIBRE' },
  { cuarto: '201', pacientes: 0, tipo: 'CONSULTORIO', estado: 'LIBRE' },
  { cuarto: '202', pacientes: 0, tipo: 'CONSULTORIO', estado: 'LIBRE' },
  { cuarto: 'R', pacientes: 0, tipo: 'RECUPERACIÓN', estado: 'LIBRE' },
];

export default function HospitalizacionPage() {
  /* HP0006 - Estados principales */
  const [pacientes, setPacientes] = useState<Paciente[]>(pacientesIniciales);
  const [cuartos, setCuartos] = useState<Cuarto[]>(cuartosIniciales);

  const [modalIngreso, setModalIngreso] = useState(false);
  const [modalAccion, setModalAccion] = useState(false);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalCuarto, setModalCuarto] = useState(false);

  const [pacienteSeleccionado, setPacienteSeleccionado] =
    useState<Paciente | null>(null);

  /* HP0007 - Formulario de ingreso */
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
  });

  /* HP0008 - Formulario de acciones */
  const [accion, setAccion] = useState({
    tipo: '',
    motivo: '',
    nuevaHabitacion: '',
    nuevaCama: '',
    responsable: responsables[0],
  });

  /* HP0009 - Formulario agregar/quitar cuarto */
  const [nuevoCuarto, setNuevoCuarto] = useState({
    cuarto: '',
    tipo: 'INDIVIDUAL',
  });

  const [cuartoAQuitar, setCuartoAQuitar] = useState('');

  /* HP0010 - Fecha automática */
  function fechaActual() {
    return new Date().toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /* HP0011 - Buscar paciente por DNI simulado desde admisión */
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
    });
  }

  /* HP0012 - Actualiza ocupación del cuarto */
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

  /* HP0013 - Registrar ingreso hospitalario */
  function agregarPaciente() {
    if (!form.dni || !form.nombres || !form.habitacion || !form.cama) {
      alert('Complete DNI, nombres, habitación y cama.');
      return;
    }

    const cuartoExiste = cuartos.some((c) => c.cuarto === form.habitacion);

    if (!cuartoExiste) {
      alert('La habitación indicada no existe. Primero agréguela en disponibilidad.');
      return;
    }

    const nuevo: Paciente = {
      id: pacientes.length + 1,
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
    });

    setModalIngreso(false);
  }

  /* HP0014 - Abrir acción clínica */
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

  /* HP0015 - Confirmar alta, traslado, alta voluntaria o referencia */
  function confirmarAccion() {
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

  /* HP0016 - Ver detalle del internamiento */
  function verDetalle(paciente: Paciente) {
    setPacienteSeleccionado(paciente);
    setModalDetalle(true);
  }

  /* HP0017 - Agregar cuarto con bloqueo de duplicados */
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

  /* HP0018 - Quitar cuarto desde selector */
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
      {/* HP0019 - Animaciones y efectos visuales */}
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

          button {
            transition: all .18s ease;
          }

          button:hover {
            transform: translateY(-1px);
            filter: brightness(.97);
          }

          tbody tr {
            transition: background .18s ease, transform .18s ease;
          }

          tbody tr:hover {
            background: #eef8f4;
          }

          .hp-card {
            animation: subirSuave .25s ease-out;
          }

          .hp-pulse {
            animation: pulso 1.6s infinite;
          }
        `}
      </style>

      {/* HP0020 - Encabezado */}
      <h2 style={title}>Hospitalización</h2>
      <p style={subtitle}>Buen día, nameUser</p>

      <div style={{ display: 'flex', gap: 10 }}>
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
      </div>

      {/* HP0021 - Tabla principal de pacientes */}
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
              <tr key={p.id}>
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

      {/* HP0022 - Disponibilidad de cuartos */}
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

      {/* HP0023 - Modal ingreso paciente */}
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

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={input}
              placeholder="Habitación"
              value={form.habitacion}
              onChange={(e) => setForm({ ...form, habitacion: e.target.value })}
            />
            <input
              style={input}
              placeholder="Cama"
              value={form.cama}
              onChange={(e) => setForm({ ...form, cama: e.target.value })}
            />
          </div>

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
            placeholder="Observación de ingreso"
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

      {/* HP0024 - Modal acciones clínicas */}
      {modalAccion && pacienteSeleccionado && (
        <Modal titulo={`Registrar acción: ${accion.tipo}`}>
          <p style={{ fontSize: 13 }}>
            Paciente: <b>{pacienteSeleccionado.nombres}</b>
          </p>

          {accion.tipo === 'TRASLADO' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={input}
                placeholder="Nueva habitación"
                value={accion.nuevaHabitacion}
                onChange={(e) =>
                  setAccion({ ...accion, nuevaHabitacion: e.target.value })
                }
              />
              <input
                style={input}
                placeholder="Nueva cama"
                value={accion.nuevaCama}
                onChange={(e) =>
                  setAccion({ ...accion, nuevaCama: e.target.value })
                }
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

      {/* HP0025 - Modal detalle */}
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

      {/* HP0026 - Modal agregar/quitar cuarto */}
      {modalCuarto && (
        <Modal titulo="🛏️ Gestión de cuartos y ambientes">
          <h4 style={sectionTitle}>Agregar nuevo cuarto</h4>

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

          <h4 style={sectionTitle}>Quitar cuarto libre</h4>

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

/* HP0027 - Componente modal reutilizable */
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

/* HP0028 - Color según estado del paciente */
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

/* HP0029 - Estilos generales */
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