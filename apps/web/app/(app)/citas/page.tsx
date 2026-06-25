'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';

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

export default function CitasPage() {
  const [vista, setVista] = useState<'lista' | 'form'>('lista');
  const [data, setData] = useState<any[]>([]);
  const [busca, setBusca] = useState('');

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [recursos, setRecursos] = useState<any>({ consultorios: [], salas: [], procedimientos: [] });
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const [f, setF] = useState({
    tipo_atencion: 'Consulta', paciente_id: '', medico_id: '', consultorio_id: '',
    sala_id: '', tipo_procedimiento_id: '', fecha_hora: '', duracion_min: '', motivo: '',
  });

  async function cargarLista() {
    const r = await api(`/api/citas${busca ? `?q=${encodeURIComponent(busca)}` : ''}`);
    setData(r.data || []);
  }
  async function cargarCombos() {
    const [p, m, r] = await Promise.all([
      api('/api/pacientes'), api('/api/pacientes/medicos'), api('/api/citas/recursos'),
    ]);
    setPacientes(p.data || []); setMedicos(m.data || []); setRecursos(r.data || {});
  }
  useEffect(() => { cargarLista().catch(() => {}); cargarCombos().catch(() => {}); }, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      if (f.tipo_atencion === 'Cirugía') {
        await api('/api/citas/cirugias', {
          method: 'POST',
          body: JSON.stringify({
            paciente_id: f.paciente_id, cirujano_id: f.medico_id, sala_id: f.sala_id ? Number(f.sala_id) : null,
            tipo_procedimiento_id: f.tipo_procedimiento_id ? Number(f.tipo_procedimiento_id) : null,
            fecha_hora: f.fecha_hora, duracion_min: f.duracion_min ? Number(f.duracion_min) : null,
          }),
        });
      } else {
        await api('/api/citas', {
          method: 'POST',
          body: JSON.stringify({
            paciente_id: f.paciente_id, medico_id: f.medico_id,
            consultorio_id: f.consultorio_id ? Number(f.consultorio_id) : null,
            fecha_hora: f.fecha_hora, motivo: f.motivo,
          }),
        });
      }
      setMsg({ tipo: 'ok', texto: 'Programación registrada correctamente' });
      setVista('lista');
      cargarLista();
    } catch (e: any) { setMsg({ tipo: 'err', texto: e.message }); }
  }

  return (
    <>
      <PageHeader title="Programación de consultas" />

      {vista === 'lista' ? (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="search" style={{ flex: 1, maxWidth: 420 }}>
              <input className="input" placeholder="Buscar programación" value={busca}
                onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && cargarLista()} />
            </div>
            <button className="btn btn-secondary" onClick={() => setVista('form')}>+ Crear programación</button>
          </div>

          <div className="card table-card">
            <table>
              <thead><tr><th>N°</th><th>Médico</th><th>Tipo Atención</th><th>Paciente</th><th>Tipo cirugía</th><th>Sala</th><th>Estado</th></tr></thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td><td>{r.medico || '—'}</td><td>{r.tipo_atencion}</td>
                    <td>{r.paciente || '—'}</td><td>{r.tipo_cirugia || '—'}</td><td>{r.sala || '—'}</td>
                    <td><EstadoBadge estado={r.estado} /></td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>Sin programaciones</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button">+ Crear programación</button>
            <button className="btn btn-secondary" type="button" onClick={() => setVista('lista')}>Volver a búsqueda</button>
          </div>
          {msg && <p style={{ color: msg.tipo === 'ok' ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>{msg.texto}</p>}

          <form onSubmit={registrar}>
            <div className="section-title">Datos a llenar</div>
            <div className="form-row"><label className="label">Tipo Atención</label>
              <select className="input" value={f.tipo_atencion} onChange={(e) => setF({ ...f, tipo_atencion: e.target.value })}>
                <option>Consulta</option><option>Cirugía</option>
              </select>
            </div>
            <div className="form-row"><label className="label">Seleccione al paciente</label>
              <select className="input" value={f.paciente_id} onChange={(e) => setF({ ...f, paciente_id: e.target.value })}>
                <option value="">Buscar paciente...</option>
                {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} - {p.dni}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="label">Seleccione al médico</label>
              <select className="input" value={f.medico_id} onChange={(e) => setF({ ...f, medico_id: e.target.value })}>
                <option value="">Buscar médico...</option>
                {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombres} {m.apellidos} {m.especialidad ? `(${m.especialidad})` : ''}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="label">Fecha/hora</label>
              <input className="input" type="datetime-local" value={f.fecha_hora} onChange={(e) => setF({ ...f, fecha_hora: e.target.value })} />
            </div>

            {f.tipo_atencion === 'Cirugía' ? (
              <>
                <div className="form-row"><label className="label">Tipo Cirugía</label>
                  <select className="input" value={f.tipo_procedimiento_id} onChange={(e) => setF({ ...f, tipo_procedimiento_id: e.target.value })}>
                    <option value="">Seleccione...</option>
                    {recursos.procedimientos?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="label">Sala</label>
                  <select className="input" value={f.sala_id} onChange={(e) => setF({ ...f, sala_id: e.target.value })}>
                    <option value="">Buscar sala...</option>
                    {recursos.salas?.map((s: any) => <option key={s.id} value={s.id}>{s.codigo}</option>)}
                  </select>
                </div>
                <div className="form-row"><label className="label">Duración (min)</label>
                  <input className="input" type="number" value={f.duracion_min} onChange={(e) => setF({ ...f, duracion_min: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div className="form-row"><label className="label">Consultorio</label>
                  <select className="input" value={f.consultorio_id} onChange={(e) => setF({ ...f, consultorio_id: e.target.value })}>
                    <option value="">Buscar consultorio...</option>
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
    </>
  );
}
