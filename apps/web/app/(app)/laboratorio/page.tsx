'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';

/** Formatea una clave tipo "perfil_lipidico" -> "Perfil lipidico". */
function etiqueta(k: string) {
  const s = k.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Muestra un resultado (objeto JSON, string o valor) de forma legible y coherente. */
function ResultadoView({ resultado }: { resultado: unknown }) {
  if (resultado && typeof resultado === 'object' && !Array.isArray(resultado)) {
    const entradas = Object.entries(resultado as Record<string, unknown>);
    return (
      <div className="data-block">
        <dl>
          {entradas.map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt>{etiqueta(k)}</dt>
              <dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  return <div className="data-block">{String(resultado ?? '—')}</div>;
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { cls: string; txt: string }> = {
    FINALIZADO: { cls: 'ok', txt: 'Finalizado' },
    EN_PROCESO: { cls: 'info', txt: 'En proceso' },
    SOLICITADO: { cls: 'pending', txt: 'Pendiente' },
  };
  const e = map[estado] || { cls: 'soft', txt: estado };
  return <span className={`badge ${e.cls}`}>{e.txt}</span>;
}

const TIPOS_EXAMEN = ['Glucosa', 'Hemograma', 'Rayos X', 'Perfil lipidico', 'Orina completa'];

export default function LaboratorioPage() {
  const [vista, setVista] = useState<'lista' | 'form'>('lista');
  const [data, setData] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [medicos, setMedicos] = useState<any[]>([]);
  const [verResultado, setVerResultado] = useState<any | null>(null);
  const toast = useToast();

  const [f, setF] = useState({ paciente_id: '', medico_id: '', tipo_examen: '', prioridad: 'NORMAL' });

  async function cargarLista() {
    const r = await api(`/api/laboratorio/examenes${busca ? `?q=${encodeURIComponent(busca)}` : ''}`);
    setData(r.data || []);
  }
  async function cargarCombos() {
    const [p, m] = await Promise.all([api('/api/pacientes'), api('/api/pacientes/medicos')]);
    setPacientes(p.data || []);
    setMedicos(m.data || []);
  }
  useEffect(() => { cargarLista().catch(() => {}); cargarCombos().catch(() => {}); }, []);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/laboratorio/examenes', { method: 'POST', body: JSON.stringify(f) });
      toast.ok('Solicitud registrada', 'El examen fue solicitado correctamente.');
      setF({ paciente_id: '', medico_id: '', tipo_examen: '', prioridad: 'NORMAL' });
      setVista('lista');
      cargarLista();
    } catch (e: any) {
      toast.error('No se pudo solicitar', e.message);
    }
  }

  return (
    <>
      <PageHeader title="Laboratorio" />

      {vista === 'lista' ? (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="search" style={{ flex: 1, maxWidth: 420 }}>
              <input
                className="input"
                placeholder="Buscar programacion"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && cargarLista()}
              />
            </div>
            <button className="btn btn-secondary" onClick={() => setVista('form')}>+ Solicitar examen</button>
          </div>

          <div className="card table-card">
            <table>
              <thead>
                <tr><th>N°</th><th>Paciente</th><th>Examen</th><th>Fecha</th><th>Medico</th><th>Resultado</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.paciente || '—'}</td>
                    <td>{r.tipo_examen}</td>
                    <td>{new Date(r.solicitado_en).toLocaleDateString()}</td>
                    <td>{r.medico || '—'}</td>
                    <td>
                      <button className="btn btn-outline" disabled={!r.resultado} onClick={() => setVerResultado(r)}>
                        Ver resultado
                      </button>
                    </td>
                    <td><EstadoBadge estado={r.estado} /></td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--muted)' }}>Sin solicitudes de examen</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setVista('lista')}>Volver a busqueda</button>
          </div>

          <form onSubmit={solicitar}>
            <div className="section-title">Formulario de solicitud de examen</div>

            <div className="form-row">
              <label className="label">Id Paciente</label>
              <select className="input" value={f.paciente_id} onChange={(e) => setF({ ...f, paciente_id: e.target.value })} required>
                <option value="">Buscar paciente...</option>
                {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} — {p.dni}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label className="label">Id Medico</label>
              <select className="input" value={f.medico_id} onChange={(e) => setF({ ...f, medico_id: e.target.value })} required>
                <option value="">Buscar medico...</option>
                {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombres} {m.apellidos}</option>)}
              </select>
            </div>

            <div className="form-row">
              <label className="label">Tipo de examen</label>
              <input
                className="input"
                list="tipos-examen"
                placeholder="Ej. Glucosa, Hemograma..."
                value={f.tipo_examen}
                onChange={(e) => setF({ ...f, tipo_examen: e.target.value })}
                required
              />
              <datalist id="tipos-examen">
                {TIPOS_EXAMEN.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>

            <div className="form-row">
              <label className="label">Prioridad</label>
              <select className="input" value={f.prioridad} onChange={(e) => setF({ ...f, prioridad: e.target.value })}>
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            <button className="btn" type="submit">+ Enviar Solicitud</button>
          </form>
        </div>
      )}

      <Modal
        open={!!verResultado}
        onClose={() => setVerResultado(null)}
        title={verResultado ? `Resultado · ${verResultado.tipo_examen}` : ''}
        subtitle={verResultado?.paciente}
        icon={<span className="modal-icon ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>}
        footer={<button className="btn btn-secondary" onClick={() => setVerResultado(null)}>Cerrar</button>}
      >
        {verResultado && (
          <>
            <ResultadoView resultado={verResultado.resultado} />
            {verResultado.resultado_observaciones && (
              <p style={{ margin: '1rem 0 0', color: 'var(--text)', fontSize: '.9rem' }}>
                <strong style={{ color: 'var(--muted)', fontWeight: 600 }}>Observaciones:</strong> {verResultado.resultado_observaciones}
              </p>
            )}
            {verResultado.recibido_en && (
              <p style={{ margin: '.5rem 0 0', color: 'var(--muted)', fontSize: '.82rem' }}>
                Recibido: {new Date(verResultado.recibido_en).toLocaleString('es-PE')}
              </p>
            )}
          </>
        )}
      </Modal>
    </>
  );
}