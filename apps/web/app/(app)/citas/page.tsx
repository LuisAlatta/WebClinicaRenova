'use client';
import { useEffect, useState } from 'react';
import { api, getUsuario } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import BuscadorPaciente, { type PacienteLite } from '../../../components/BuscadorPaciente';
import { useToast } from '../../../components/Toast';
import { useConfirm } from '../../../components/useConfirm';

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { cls: string; txt: string }> = {
    FINALIZADO: { cls: 'ok', txt: 'Terminado' },
    EN_PROCESO: { cls: 'danger', txt: 'En proceso' },
    PROGRAMADO: { cls: 'warn', txt: 'Programado' },
    CANCELADO: { cls: 'soft', txt: 'Cancelado' },
  };
  const e = map[estado] || { cls: 'soft', txt: estado };
  return <span className={`badge ${e.cls}`}>{e.txt}</span>;
}

function fmtFecha(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function hoyISO() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en zona local
}

export default function CitasPage() {
  const [vista, setVista] = useState<'lista' | 'form' | 'agenda'>('lista');
  const [data, setData] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [fecha, setFecha] = useState(''); // filtro por año/mes/día

  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [recursos, setRecursos] = useState<any>({ consultorios: [], salas: [], procedimientos: [], camas_libres: [] });

  const [agenda, setAgenda] = useState<any[]>([]);
  const [fechaAgenda, setFechaAgenda] = useState(hoyISO());
  const toast = useToast();
  const { confirmar, ConfirmUI } = useConfirm();

  // Consulta la registra Admisión (ASISTENTE); la cirugía la programa el médico. ADMIN puede ambas.
  const rol = getUsuario()?.rol;
  const puedeConsulta = rol === 'ADMIN' || rol === 'ASISTENTE';
  const puedeCirugia = rol === 'ADMIN' || rol === 'MEDICO';

  const [pacienteSel, setPacienteSel] = useState<PacienteLite | null>(null);
  const [f, setF] = useState({
    tipo_atencion: puedeConsulta ? 'Consulta' : 'Cirugía',
    especialidad_id: '', medico_id: '', consultorio_id: '',
    sala_id: '', cama_id: '', tipo_procedimiento_id: '', fecha_hora: '', duracion_min: '', motivo: '',
  });

  async function cargarLista() {
    const params = new URLSearchParams();
    if (busca) params.set('q', busca);
    if (fecha) params.set('fecha', fecha);
    const r = await api(`/api/citas${params.toString() ? `?${params}` : ''}`);
    setData(r.data || []);
  }
  async function cargarCombos() {
    const [e, r] = await Promise.all([api('/api/pacientes/especialidades'), api('/api/citas/recursos')]);
    setEspecialidades(e.data || []); setRecursos(r.data || {});
  }
  async function cargarAgenda() {
    const r = await api(`/api/citas/agenda?fecha=${fechaAgenda}`);
    setAgenda(r.data || []);
  }
  useEffect(() => { cargarLista().catch(() => {}); cargarCombos().catch(() => {}); }, []);
  useEffect(() => { if (vista === 'agenda') cargarAgenda().catch(() => {}); }, [vista, fechaAgenda]);

  // Paso 1 -> Paso 2: al elegir especialidad, cargar solo los médicos de esa especialidad.
  async function elegirEspecialidad(id: string) {
    setF((prev) => ({ ...prev, especialidad_id: id, medico_id: '' }));
    if (!id) { setMedicos([]); return; }
    const r = await api(`/api/pacientes/medicos?especialidad_id=${id}`);
    setMedicos(r.data || []);
  }

  function resetForm() {
    setPacienteSel(null);
    setMedicos([]);
    setF({
      tipo_atencion: puedeConsulta ? 'Consulta' : 'Cirugía',
      especialidad_id: '', medico_id: '', consultorio_id: '',
      sala_id: '', cama_id: '', tipo_procedimiento_id: '', fecha_hora: '', duracion_min: '', motivo: '',
    });
  }

  function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteSel) { toast.error('Falta el paciente', 'Busca y selecciona un paciente por su documento.'); return; }
    if (!f.medico_id) { toast.error('Falta el médico', 'Elige la especialidad y luego el médico.'); return; }
    if (!f.fecha_hora) { toast.error('Falta la fecha', 'Indica fecha y hora de la programación.'); return; }
    const medico = medicos.find((m) => String(m.id) === String(f.medico_id));
    confirmar(
      {
        title: `¿Registrar ${f.tipo_atencion.toLowerCase()}?`,
        message: `Se programará una ${f.tipo_atencion.toLowerCase()} para ${pacienteSel.nombres} ${pacienteSel.apellidos}`
          + `${medico ? ` con ${medico.nombres} ${medico.apellidos}` : ''} el ${fmtFecha(f.fecha_hora)}.`,
        confirmLabel: 'Sí, registrar',
      },
      ejecutarRegistro,
    );
  }

  async function ejecutarRegistro() {
    if (!pacienteSel) return;
    try {
      if (f.tipo_atencion === 'Cirugía') {
        await api('/api/citas/cirugias', {
          method: 'POST',
          body: JSON.stringify({
            paciente_id: pacienteSel.id, cirujano_id: f.medico_id,
            especialidad_id: f.especialidad_id ? Number(f.especialidad_id) : null,
            sala_id: f.sala_id ? Number(f.sala_id) : null,
            cama_id: f.cama_id ? Number(f.cama_id) : null,
            tipo_procedimiento_id: f.tipo_procedimiento_id ? Number(f.tipo_procedimiento_id) : null,
            fecha_hora: f.fecha_hora, duracion_min: f.duracion_min ? Number(f.duracion_min) : null,
          }),
        });
      } else {
        await api('/api/citas', {
          method: 'POST',
          body: JSON.stringify({
            paciente_id: pacienteSel.id, medico_id: f.medico_id,
            especialidad_id: f.especialidad_id ? Number(f.especialidad_id) : null,
            consultorio_id: f.consultorio_id ? Number(f.consultorio_id) : null,
            fecha_hora: f.fecha_hora, motivo: f.motivo,
          }),
        });
      }
      toast.ok('Programación registrada', 'La cita/cirugía se registró correctamente.');
      resetForm();
      setVista('lista');
      cargarLista();
    } catch (e: any) { toast.error('No se pudo registrar', e.message); }
  }

  return (
    <>
      <PageHeader title="Programación de consultas" />

      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        <div className={`tab ${vista === 'lista' ? 'active' : ''}`} onClick={() => setVista('lista')}>Programaciones</div>
        <div className={`tab ${vista === 'agenda' ? 'active' : ''}`} onClick={() => setVista('agenda')}>Agenda del día</div>
      </div>

      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search" style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
              <input className="input" placeholder="Buscar por médico, paciente o DNI" value={busca}
                onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && cargarLista()} />
            </div>
            <label className="label" style={{ margin: 0 }}>Fecha:</label>
            <input className="input" type="date" style={{ maxWidth: 180 }} value={fecha}
              onChange={(e) => { setFecha(e.target.value); }} />
            <button className="btn btn-secondary" type="button" onClick={() => { setFecha(hoyISO()); setTimeout(cargarLista, 0); }}>Hoy</button>
            <button className="btn" type="button" onClick={cargarLista}>Filtrar</button>
            <button className="btn btn-secondary" type="button" onClick={() => { setBusca(''); setFecha(''); setTimeout(cargarLista, 0); }}>Limpiar</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-secondary" onClick={() => { resetForm(); setVista('form'); }}>+ Crear programación</button>
          </div>

          <div className="card table-card">
            <table>
              <thead><tr><th>N°</th><th>Fecha</th><th>Médico</th><th>Especialidad</th><th>Tipo Atención</th><th>Paciente</th><th>Tipo cirugía</th><th>Sala/Consult.</th><th>Estado</th></tr></thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td><td>{fmtFecha(r.fecha_hora)}</td><td>{r.medico || '—'}</td>
                    <td>{r.especialidad || '—'}</td><td>{r.tipo_atencion}</td>
                    <td>{r.paciente || '—'}</td><td>{r.tipo_cirugia || '—'}</td><td>{r.sala || '—'}</td>
                    <td><EstadoBadge estado={r.estado} /></td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan={9} style={{ color: 'var(--muted)' }}>Sin programaciones para el filtro elegido</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {vista === 'agenda' && (
        <>
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <label className="label" style={{ margin: 0 }}>Día:</label>
            <input className="input" type="date" style={{ maxWidth: 180 }} value={fechaAgenda}
              onChange={(e) => setFechaAgenda(e.target.value)} />
            <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
              {agenda.length} atención(es) distribuida(s) ese día
            </span>
          </div>
          <div className="card table-card">
            <table>
              <thead><tr><th>Hora</th><th>Tipo</th><th>Especialidad</th><th>Médico</th><th>Paciente</th><th>Ambiente</th><th>Estado</th></tr></thead>
              <tbody>
                {agenda.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{new Date(r.fecha_hora).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</strong></td>
                    <td>{r.tipo_atencion}</td><td>{r.especialidad || '—'}</td><td>{r.medico || '—'}</td>
                    <td>{r.paciente || '—'}</td><td>{r.ambiente || '—'}</td><td><EstadoBadge estado={r.estado} /></td>
                  </tr>
                ))}
                {agenda.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>Sin atenciones programadas ese día</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {vista === 'form' && (
        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setVista('lista')}>Volver a búsqueda</button>
          </div>

          <form onSubmit={registrar}>
            <div className="section-title">Datos a llenar</div>

            <div className="form-row"><label className="label">Tipo Atención</label>
              <select className="input" value={f.tipo_atencion} onChange={(e) => setF({ ...f, tipo_atencion: e.target.value })}>
                {puedeConsulta && <option>Consulta</option>}
                {puedeCirugia && <option>Cirugía</option>}
              </select>
            </div>

            <div className="form-row"><label className="label">Paciente (busca por DNI)</label>
              <BuscadorPaciente onSelect={setPacienteSel} placeholder="DNI, C.E., pasaporte o nombre…" />
              {pacienteSel && (
                <div style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--ok)' }}>
                  Seleccionado: <strong>{pacienteSel.nombres} {pacienteSel.apellidos}</strong> — {pacienteSel.tipo_documento || 'DNI'} {pacienteSel.dni}
                </div>
              )}
            </div>

            <div className="form-row"><label className="label">Especialidad</label>
              <select className="input" value={f.especialidad_id} onChange={(e) => elegirEspecialidad(e.target.value)}>
                <option value="">Seleccione la especialidad…</option>
                {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>

            <div className="form-row"><label className="label">Médico</label>
              <select className="input" value={f.medico_id} disabled={!f.especialidad_id}
                onChange={(e) => setF({ ...f, medico_id: e.target.value })}>
                <option value="">{f.especialidad_id ? 'Seleccione el médico…' : 'Primero elija una especialidad'}</option>
                {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombres} {m.apellidos} {m.cmp ? `(${m.cmp})` : ''}</option>)}
              </select>
              {f.especialidad_id && medicos.length === 0 && (
                <div style={{ fontSize: '.8rem', color: 'var(--warn)', marginTop: '.35rem' }}>No hay médicos activos en esta especialidad.</div>
              )}
            </div>

            <div className="form-row"><label className="label">Fecha/hora</label>
              <input className="input" type="datetime-local" value={f.fecha_hora} onChange={(e) => setF({ ...f, fecha_hora: e.target.value })} />
            </div>

            {f.tipo_atencion === 'Cirugía' ? (
              <>
                <div className="form-row"><label className="label">Tipo Cirugía</label>
                  <select className="input" value={f.tipo_procedimiento_id} onChange={(e) => setF({ ...f, tipo_procedimiento_id: e.target.value })}>
                    <option value="">Seleccione…</option>
                    {recursos.procedimientos?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="label">Sala de operación</label>
                  <select className="input" value={f.sala_id} onChange={(e) => setF({ ...f, sala_id: e.target.value })}>
                    <option value="">Seleccione la sala…</option>
                    {recursos.salas?.map((s: any) => <option key={s.id} value={s.id}>{s.codigo}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="label">Cama/cuarto de recuperación</label>
                  <select className="input" value={f.cama_id} onChange={(e) => setF({ ...f, cama_id: e.target.value })}>
                    <option value="">Seleccione una cama libre…</option>
                    {recursos.camas_libres?.map((c: any) => <option key={c.id} value={c.id}>{c.codigo}{c.piso ? ` (piso ${c.piso})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="label">Duración (min)</label>
                  <input className="input" type="number" value={f.duracion_min} onChange={(e) => setF({ ...f, duracion_min: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div className="form-row"><label className="label">Consultorio (por disponibilidad)</label>
                  <select className="input" value={f.consultorio_id} onChange={(e) => setF({ ...f, consultorio_id: e.target.value })}>
                    <option value="">Seleccione el consultorio…</option>
                    {recursos.consultorios?.map((c: any) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="label">Motivo</label>
                  <input className="input" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} />
                </div>
              </>
            )}

            <div style={{ textAlign: 'right' }}><button className="btn">Registrar</button></div>
          </form>
        </div>
      )}

      {ConfirmUI}
    </>
  );
}
