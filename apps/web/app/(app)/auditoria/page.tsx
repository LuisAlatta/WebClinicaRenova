'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';

interface LogAuditoria {
  _id: string;
  fecha: string;
  usuario: string;
  rol?: string | null;
  accion: string;
  metodo?: string;
  recurso?: string;
  ruta?: string;
  estado?: number;
  exito?: boolean;
  detalle?: string;
  origen?: string;
}
interface Meta { total: number; page: number; limit: number }

const accionCls = (accion: string) => {
  if (accion === 'ELIMINAR') return 'danger';
  if (accion === 'CREAR') return 'ok';
  if (accion === 'ACTUALIZAR') return 'warn';
  return 'soft';
};

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 25 });
  const [acciones, setAcciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [filtros, setFiltros] = useState({ q: '', accion: '', desde: '', hasta: '' });
  const toast = useToast();

  const cargar = useCallback(async (pagina: number) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pagina), limit: '25' });
      if (filtros.q) qs.set('q', filtros.q);
      if (filtros.accion) qs.set('accion', filtros.accion);
      if (filtros.desde) qs.set('desde', filtros.desde);
      if (filtros.hasta) qs.set('hasta', filtros.hasta);
      const r = await api<{ data: LogAuditoria[]; meta: Meta }>(`/api/auditoria/logs?${qs.toString()}`);
      setLogs(r.data || []);
      setMeta(r.meta || { total: 0, page: pagina, limit: 25 });
    } catch (e: any) {
      toast.error('No se pudo cargar la auditoría', e.message);
      setLogs([]);
    } finally { setLoading(false); }
  }, [filtros, toast]);

  // Carga solo al cambiar de página o al pulsar Filtrar/Limpiar (no en cada tecla).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(page); }, [page, reload]);
  useEffect(() => {
    api<{ data: string[] }>('/api/auditoria/acciones').then(r => setAcciones(r.data || [])).catch(() => {});
  }, []);

  function aplicarFiltros(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setReload(r => r + 1);
  }
  function limpiar() {
    setFiltros({ q: '', accion: '', desde: '', hasta: '' });
    setPage(1);
    setReload(r => r + 1);
  }

  const totalPaginas = Math.max(1, Math.ceil(meta.total / meta.limit));
  const setF = (k: keyof typeof filtros) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFiltros(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="Auditoría del sistema" />

      {/* Filtros */}
      <form className="card" onSubmit={aplicarFiltros} style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'end' }}>
        <div>
          <label className="label" htmlFor="aud-q">Búsqueda</label>
          <input id="aud-q" className="input" placeholder="Usuario, recurso, ruta..." value={filtros.q} onChange={setF('q')} />
        </div>
        <div>
          <label className="label" htmlFor="aud-accion">Acción</label>
          <select id="aud-accion" className="input" value={filtros.accion} onChange={setF('accion')}>
            <option value="">Todas</option>
            {acciones.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="aud-desde">Desde</label>
          <input id="aud-desde" className="input" type="date" value={filtros.desde} onChange={setF('desde')} />
        </div>
        <div>
          <label className="label" htmlFor="aud-hasta">Hasta</label>
          <input id="aud-hasta" className="input" type="date" value={filtros.hasta} onChange={setF('hasta')} />
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button className="btn" type="submit">Filtrar</button>
          <button className="btn btn-outline" type="button" onClick={limpiar}>Limpiar</button>
        </div>
      </form>

      {/* Tabla */}
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th>
              <th>Recurso</th><th>Ruta</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>Cargando…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>Sin registros de auditoría</td></tr>
            ) : logs.map(l => (
              <tr key={l._id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtFecha(l.fecha)}</td>
                <td style={{ fontWeight: 600 }}>{l.usuario}</td>
                <td style={{ color: 'var(--muted)' }}>{l.rol || '—'}</td>
                <td><span className={`badge ${accionCls(l.accion)}`}>{l.accion}</span></td>
                <td>{l.recurso || '—'}</td>
                <td><code style={{ fontSize: '.8rem', color: 'var(--brand)' }}>{l.ruta || '—'}</code></td>
                <td>
                  {l.estado != null
                    ? <span className={`badge ${l.exito ?? l.estado < 400 ? 'ok' : 'danger'}`}>{l.estado}</span>
                    : <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
          {meta.total} registro{meta.total === 1 ? '' : 's'} · página {meta.page} de {totalPaginas}
        </span>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>← Anterior</button>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPaginas || loading} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
        </div>
      </div>
    </>
  );
}
