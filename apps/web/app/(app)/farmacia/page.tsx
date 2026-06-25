'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';

/* ─── Tipos ───────────────────────────────────────────── */
interface Medicamento {
  id: string; codigo: string; nombre: string; presentacion: string;
  stock_total: number; stock_minimo: number; precio_unit: number; activo: boolean;
}
interface AlertaMedicamento { id: string; codigo: string; nombre: string; stock_total: number; stock_minimo: number; }
interface AlertaLote { medicamento: string; numero_lote: string; cantidad: number; fecha_vencimiento: string; dias_restantes: number; }
interface Alertas { bajo_minimo: AlertaMedicamento[]; por_vencer: AlertaLote[]; }
type Tab = 'stock' | 'alertas' | 'despacho' | 'nuevo' | 'lote';
type Msg = { tipo: 'ok' | 'err'; texto: string } | null;

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
const estadoBadge = (m: Medicamento) => {
  if (!m.activo) return { cls: 'soft', txt: 'Inactivo' };
  if (m.stock_total === 0) return { cls: 'danger', txt: 'Sin stock' };
  if (m.stock_total < m.stock_minimo) return { cls: 'warn', txt: 'Bajo stock' };
  return { cls: 'ok', txt: 'Disponible' };
};

/* ─── Íconos SVG profesionales ────────────────────────── */
const IcoCaja = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </svg>
);
const IcoAlerta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IcoDespacho = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="M3 17h4m-2-2v4M3 14h7v7" />
  </svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IcoBuscar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const IcoNuevo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IcoLote = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
    <path d="M10 12h4" />
  </svg>
);

/* ─── Componentes reutilizables ───────────────────────── */
function KpiCard({ valor, label, color }: { valor: number; label: string; color: string }) {
  return (
    <div className="card kpi" style={{ borderTop: `3px solid ${color}` }}>
      <div className="n" style={{ color }}>{valor}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
      <div style={{ width: 36, height: 36, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  );
}

function EmptyRow({ cols, texto }: { cols: number; texto: string }) {
  return <tr><td colSpan={cols} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>{texto}</td></tr>;
}

function AlertMsg({ msg }: { msg: Msg }) {
  if (!msg) return null;
  const ok = msg.tipo === 'ok';
  return (
    <div style={{
      padding: '.85rem 1.2rem', borderRadius: 10, marginBottom: '1.25rem', fontWeight: 600,
      background: ok ? '#ecfdf5' : '#fef2f2', color: ok ? 'var(--ok)' : 'var(--danger)',
      border: `1px solid ${ok ? '#a7f3d0' : '#fecaca'}`
    }}>
      {msg.texto}
    </div>
  );
}

/* ─── Definición de tabs ──────────────────────────────── */
const TABS: { id: Tab; label: string; Ico: () => JSX.Element }[] = [
  { id: 'stock', label: 'Stock de medicamentos', Ico: IcoCaja },
  { id: 'alertas', label: 'Alertas', Ico: IcoAlerta },
  { id: 'despacho', label: 'Registrar despacho', Ico: IcoDespacho },
  { id: 'nuevo', label: 'Nuevo medicamento', Ico: IcoNuevo },
  { id: 'lote', label: 'Ingresar lote', Ico: IcoLote },
];

/* ─── Página principal ────────────────────────────────── */
export default function FarmaciaPage() {
  const [tab, setTab] = useState<Tab>('stock');
  const [stock, setStock] = useState<Medicamento[]>([]);
  const [busca, setBusca] = useState('');
  const [loadingStock, setLoadingStock] = useState(true);
  const [alertas, setAlertas] = useState<Alertas>({ bajo_minimo: [], por_vencer: [] });
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [f, setF] = useState({ paciente_id: '', medicamento_id: '', cantidad: '', orden_medica: '' });
  const [msg, setMsg] = useState<Msg>(null);
  const [enviando, setEnviando] = useState(false);

  // Estado formulario Nuevo Medicamento
  const [fNuevo, setFNuevo] = useState({ codigo: '', nombre: '', presentacion: '', stock_minimo: '10', precio_unit: '0' });
  const [msgNuevo, setMsgNuevo] = useState<Msg>(null);
  const [guardando, setGuardando] = useState(false);
  const setFieldNuevo = (k: keyof typeof fNuevo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFNuevo(prev => ({ ...prev, [k]: e.target.value }));

  // Estado formulario Ingresar Lote
  const [fLote, setFLote] = useState({ medicamento_id: '', numero_lote: '', cantidad: '', fecha_vencimiento: '' });
  const [msgLote, setMsgLote] = useState<Msg>(null);
  const [registrandoLote, setRegistrandoLote] = useState(false);
  const setFieldLote = (k: keyof typeof fLote) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFLote(prev => ({ ...prev, [k]: e.target.value }));

  const setField = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  /* Carga */
  async function cargarStock() {
    setLoadingStock(true);
    try { const r = await api<{ data: Medicamento[] }>('/api/farmacia/stock'); setStock(r.data || []); }
    catch { setStock([]); } finally { setLoadingStock(false); }
  }
  async function cargarAlertas() {
    setLoadingAlertas(true);
    try { const r = await api<{ data: Alertas }>('/api/farmacia/alertas'); setAlertas(r.data || { bajo_minimo: [], por_vencer: [] }); }
    catch { setAlertas({ bajo_minimo: [], por_vencer: [] }); } finally { setLoadingAlertas(false); }
  }

  useEffect(() => { cargarStock(); }, []);
  useEffect(() => { if (tab === 'alertas') cargarAlertas(); }, [tab]);

  /* Despacho */
  async function registrarDespacho(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!f.paciente_id || !f.medicamento_id || !f.cantidad) {
      setMsg({ tipo: 'err', texto: 'Completa todos los campos requeridos.' }); return;
    }
    setEnviando(true);
    try {
      await api('/api/farmacia/despachos', { method: 'POST', body: JSON.stringify({ paciente_id: f.paciente_id, medicamento_id: f.medicamento_id, cantidad: Number(f.cantidad), orden_medica: f.orden_medica || undefined }) });
      setMsg({ tipo: 'ok', texto: '✓ Despacho registrado correctamente.' });
      setF({ paciente_id: '', medicamento_id: '', cantidad: '', orden_medica: '' });
      cargarStock();
    } catch (err: any) { setMsg({ tipo: 'err', texto: err.message || 'Error al registrar el despacho.' }); }
    finally { setEnviando(false); }
  }

  /* Nuevo medicamento */
  async function registrarMedicamento(e: React.FormEvent) {
    e.preventDefault(); setMsgNuevo(null);
    if (!fNuevo.codigo || !fNuevo.nombre) {
      setMsgNuevo({ tipo: 'err', texto: 'Código y nombre son obligatorios.' }); return;
    }
    setGuardando(true);
    try {
      await api('/api/farmacia/medicamentos', {
        method: 'POST',
        body: JSON.stringify({
          codigo: fNuevo.codigo.trim().toUpperCase(),
          nombre: fNuevo.nombre.trim(),
          presentacion: fNuevo.presentacion.trim() || undefined,
          stock_minimo: Number(fNuevo.stock_minimo) || 10,
          precio_unit: Number(fNuevo.precio_unit) || 0,
        }),
      });
      setMsgNuevo({ tipo: 'ok', texto: `✓ Medicamento "${fNuevo.nombre}" registrado correctamente.` });
      setFNuevo({ codigo: '', nombre: '', presentacion: '', stock_minimo: '10', precio_unit: '0' });
      cargarStock();
    } catch (err: any) {
      setMsgNuevo({ tipo: 'err', texto: err.message || 'Error al registrar el medicamento.' });
    } finally { setGuardando(false); }
  }

  /* Ingresar lote */
  async function registrarLote(e: React.FormEvent) {
    e.preventDefault(); setMsgLote(null);
    if (!fLote.medicamento_id || !fLote.numero_lote || !fLote.cantidad) {
      setMsgLote({ tipo: 'err', texto: 'Medicamento, número de lote y cantidad son obligatorios.' }); return;
    }
    setRegistrandoLote(true);
    try {
      await api('/api/farmacia/lotes', {
        method: 'POST',
        body: JSON.stringify({
          medicamento_id: fLote.medicamento_id,
          numero_lote: fLote.numero_lote.trim().toUpperCase(),
          cantidad: Number(fLote.cantidad),
          fecha_vencimiento: fLote.fecha_vencimiento || undefined,
        }),
      });
      const med = stock.find(m => m.id === fLote.medicamento_id);
      setMsgLote({ tipo: 'ok', texto: `✓ Lote "${fLote.numero_lote.toUpperCase()}" ingresado para ${med?.nombre ?? 'el medicamento'}.` });
      setFLote({ medicamento_id: '', numero_lote: '', cantidad: '', fecha_vencimiento: '' });
      cargarStock();
    } catch (err: any) {
      setMsgLote({ tipo: 'err', texto: err.message || 'Error al ingresar el lote.' });
    } finally { setRegistrandoLote(false); }
  }

  /* KPIs */
  const kpis = [
    { valor: stock.length, label: 'Total medicamentos', color: 'var(--brand)' },
    { valor: stock.filter(m => m.activo && m.stock_total >= m.stock_minimo).length, label: 'Disponibles', color: 'var(--ok)' },
    { valor: stock.filter(m => m.activo && m.stock_total > 0 && m.stock_total < m.stock_minimo).length, label: 'Bajo stock mínimo', color: 'var(--warn)' },
    { valor: stock.filter(m => m.activo && m.stock_total === 0).length, label: 'Sin stock', color: 'var(--danger)' },
  ];

  const stockFiltrado = stock.filter(m =>
    m.nombre.toLowerCase().includes(busca.toLowerCase()) ||
    m.codigo.toLowerCase().includes(busca.toLowerCase())
  );
  const tabIdx = TABS.findIndex(t => t.id === tab);
  const precioEst = f.medicamento_id && f.cantidad
    ? (stock.find(m => m.id === f.medicamento_id)?.precio_unit || 0) * Number(f.cantidad)
    : null;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:translateY(0);} }
        .fila-anim { animation: fadeInUp .22s ease both; }
        ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `.fila-anim:nth-child(${i}) { animation-delay: ${i * 0.04}s; }`).join(' ')}

        /* Tab bar */
        .fm-tabs { display:flex; gap:0; border-bottom:2px solid var(--border); margin-bottom:1.5rem; position:relative; }
        .fm-tab {
          display:flex; align-items:center; gap:.5rem;
          padding:.75rem 1.4rem; font-size:.9rem; font-weight:600; color:var(--muted);
          background:none; border:none; cursor:pointer; font-family:inherit;
          border-bottom: 3px solid transparent; margin-bottom:-2px;
          transition: color .2s;
        }
        .fm-tab:hover { color:var(--navy); }
        .fm-tab.active { color:var(--brand-d); border-bottom-color:var(--brand); }
        .fm-tab .tab-ico { width:17px; height:17px; flex:none; }

        /* Botón despachar inline */
        .btn-desp {
          background:var(--primary); color:#fff; border:none;
          padding:.32rem .8rem; border-radius:7px; font-size:.8rem; font-weight:700;
          cursor:pointer; transition:background .15s; white-space:nowrap;
        }
        .btn-desp:hover { background:var(--primary-d); }
        .btn-desp:disabled { opacity:.4; cursor:not-allowed; }

        /* Sección alerta */
        .alerta-hdr { display:flex; align-items:center; gap:.5rem; font-weight:800; font-size:.95rem; margin:0 0 .75rem; }
        .dias-pill { display:inline-block; padding:.2rem .65rem; border-radius:20px; font-size:.78rem; font-weight:700; color:#fff; }
      `}</style>

      <PageHeader title="Control de stock de medicamentos" />

      {/* KPI Cards */}
      <div className="grid kpis" style={{ marginBottom: '1.5rem' }}>
        {kpis.map(k => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Tab bar con indicador deslizante */}
      <div className="fm-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`fm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => { setTab(t.id); setMsg(null); }}
          >
            <span className="tab-ico"><t.Ico /></span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB 1: STOCK ══ */}
      {tab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="search" style={{ flex: 1, maxWidth: 420 }}>
              <input id="farmacia-busca" className="input" placeholder="Buscar por nombre o código..."
                value={busca} onChange={e => setBusca(e.target.value)} />
              <IcoBuscar />
            </div>
            <button id="farmacia-btn-despacho" className="btn btn-secondary" onClick={() => setTab('despacho')}>+ Registrar despacho</button>
            <button className="btn btn-outline" onClick={cargarStock}>↻ Actualizar</button>
          </div>

          <div className="card table-card">
            {loadingStock ? <Spinner /> : (
              <table>
                <thead>
                  <tr>
                    <th>Código</th><th>Medicamento</th><th>Presentación</th>
                    <th style={{ textAlign: 'right' }}>Stock total</th>
                    <th style={{ textAlign: 'right' }}>Mínimo</th>
                    <th style={{ textAlign: 'right' }}>Precio unit.</th>
                    <th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {stockFiltrado.length === 0
                    ? <EmptyRow cols={8} texto={busca ? 'Sin resultados para la búsqueda.' : 'No hay medicamentos registrados.'} />
                    : stockFiltrado.map(m => {
                      const { cls, txt } = estadoBadge(m);
                      const stockColor = m.stock_total === 0 ? 'var(--danger)' : m.stock_total < m.stock_minimo ? 'var(--warn)' : 'var(--ok)';
                      return (
                        <tr key={m.id} className="fila-anim">
                          <td><code style={{ fontSize: '.82rem', color: 'var(--brand)' }}>{m.codigo}</code></td>
                          <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{m.presentacion || '—'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '1.05rem', color: stockColor }}>{m.stock_total}</td>
                          <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{m.stock_minimo}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(m.precio_unit)}</td>
                          <td><span className={`badge ${cls}`}>{txt}</span></td>
                          <td>
                            <button className="btn-desp" disabled={m.stock_total === 0 || !m.activo}
                              onClick={() => { setF(p => ({ ...p, medicamento_id: m.id })); setTab('despacho'); }}>
                              Despachar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ══ TAB 2: ALERTAS ══ */}
      {tab === 'alertas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-outline" onClick={cargarAlertas}>↻ Actualizar</button>
          </div>
          {loadingAlertas ? <Spinner /> : (
            alertas.bajo_minimo.length === 0 && alertas.por_vencer.length === 0
              ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div style={{ color: 'var(--ok)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}>
                    <IcoCheck />
                    <p style={{ fontWeight: 600, color: 'var(--muted)', margin: 0 }}>¡Sin alertas! Todo el stock está en orden.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Bajo mínimo */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div className="alerta-hdr" style={{ color: 'var(--danger)' }}>
                      <IcoAlerta />
                      Medicamentos bajo stock mínimo
                      <span className="badge danger" style={{ fontSize: '.75rem' }}>{alertas.bajo_minimo.length}</span>
                    </div>
                    <div className="card table-card">
                      <table>
                        <thead><tr><th>Código</th><th>Medicamento</th><th style={{ textAlign: 'right' }}>Stock actual</th><th style={{ textAlign: 'right' }}>Mínimo</th><th style={{ textAlign: 'right' }}>Déficit</th></tr></thead>
                        <tbody>
                          {alertas.bajo_minimo.length === 0
                            ? <EmptyRow cols={5} texto="Sin medicamentos bajo mínimo." />
                            : alertas.bajo_minimo.map(m => (
                              <tr key={m.id} className="fila-anim">
                                <td><code style={{ color: 'var(--brand)', fontSize: '.82rem' }}>{m.codigo}</code></td>
                                <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                                <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 700 }}>{m.stock_total}</td>
                                <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{m.stock_minimo}</td>
                                <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 800 }}>-{m.stock_minimo - m.stock_total}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Por vencer */}
                  <div>
                    <div className="alerta-hdr" style={{ color: 'var(--warn)' }}>
                      <IcoAlerta />
                      Lotes próximos a vencer (≤ 30 días)
                      <span className="badge warn" style={{ fontSize: '.75rem' }}>{alertas.por_vencer.length}</span>
                    </div>
                    <div className="card table-card">
                      <table>
                        <thead><tr><th>Medicamento</th><th>N° Lote</th><th style={{ textAlign: 'right' }}>Cantidad</th><th>Vence</th><th style={{ textAlign: 'center' }}>Días restantes</th></tr></thead>
                        <tbody>
                          {alertas.por_vencer.length === 0
                            ? <EmptyRow cols={5} texto="Sin lotes próximos a vencer." />
                            : alertas.por_vencer.map((l, i) => (
                              <tr key={i} className="fila-anim">
                                <td style={{ fontWeight: 600 }}>{l.medicamento}</td>
                                <td><code style={{ fontSize: '.82rem' }}>{l.numero_lote}</code></td>
                                <td style={{ textAlign: 'right' }}>{l.cantidad}</td>
                                <td>{fmtFecha(l.fecha_vencimiento)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="dias-pill" style={{ background: l.dias_restantes <= 7 ? 'var(--danger)' : 'var(--warn)' }}>
                                    {l.dias_restantes}d
                                  </span>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
          )}
        </div>
      )}

      {/* ══ TAB 3: DESPACHO ══ */}
      {tab === 'despacho' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setTab('stock')}>← Volver al stock</button>
          </div>
          <AlertMsg msg={msg} />
          <form id="farmacia-form-despacho" onSubmit={registrarDespacho}>
            <div className="section-title">Datos del despacho</div>

            {([
              { id: 'desp-paciente', label: 'Paciente ID *', key: 'paciente_id', placeholder: 'UUID del paciente (ej. 001..)', required: true },
              { id: 'desp-cant', label: 'Cantidad *', key: 'cantidad', placeholder: 'Unidades a despachar', required: true, type: 'number', min: 1 },
              { id: 'desp-orden', label: 'Orden médica', key: 'orden_medica', placeholder: 'Nº de receta o referencia (opcional)' },
            ] as any[]).map(({ id, label, key, ...rest }) => (
              <div key={id} className="form-row">
                <label className="label" htmlFor={id}>{label}</label>
                <input id={id} className="input" value={(f as any)[key]} onChange={setField(key as keyof typeof f)} {...rest} />
              </div>
            ))}

            <div className="form-row">
              <label className="label" htmlFor="desp-med">Medicamento *</label>
              <select id="desp-med" className="input" value={f.medicamento_id} onChange={setField('medicamento_id')} required>
                <option value="">Seleccione un medicamento...</option>
                {stock.filter(m => m.activo && m.stock_total > 0).map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} — Stock: {m.stock_total} | {fmt(m.precio_unit)}</option>
                ))}
              </select>
            </div>

            {precioEst !== null && (
              <div style={{ background: 'var(--sidebar-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '.85rem 1.2rem', marginBottom: '1rem', fontSize: '.92rem', color: 'var(--navy)' }}>
                💰 <strong>Total estimado:</strong> {fmt(precioEst)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline"
                onClick={() => { setF({ paciente_id: '', medicamento_id: '', cantidad: '', orden_medica: '' }); setMsg(null); }}>
                Limpiar
              </button>
              <button id="farmacia-btn-registrar" className="btn" type="submit" disabled={enviando}>
                {enviando ? 'Registrando...' : 'Registrar despacho'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══ TAB 4: NUEVO MEDICAMENTO ══ */}
      {tab === 'nuevo' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setTab('stock')}>← Volver al stock</button>
          </div>
          <AlertMsg msg={msgNuevo} />
          <form id="farmacia-form-nuevo" onSubmit={registrarMedicamento}>
            <div className="section-title">Datos del medicamento</div>

            {([
              { id: 'nv-codigo', label: 'Código *', key: 'codigo', placeholder: 'Ej. PARA500, AMOX250...' },
              { id: 'nv-nombre', label: 'Nombre *', key: 'nombre', placeholder: 'Nombre completo del medicamento' },
              { id: 'nv-pres', label: 'Presentación', key: 'presentacion', placeholder: 'Ej. Tableta 500mg, Jarabe 250ml...' },
              { id: 'nv-minimo', label: 'Stock mínimo', key: 'stock_minimo', placeholder: '10', type: 'number', min: 0 },
              { id: 'nv-precio', label: 'Precio unitario', key: 'precio_unit', placeholder: '0.00', type: 'number', min: 0, step: '0.01' },
            ] as any[]).map(({ id, label, key, ...rest }) => (
              <div key={id} className="form-row">
                <label className="label" htmlFor={id}>{label}</label>
                <input id={id} className="input" value={(fNuevo as any)[key]} onChange={setFieldNuevo(key as keyof typeof fNuevo)} {...rest} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline"
                onClick={() => { setFNuevo({ codigo: '', nombre: '', presentacion: '', stock_minimo: '10', precio_unit: '0' }); setMsgNuevo(null); }}>
                Limpiar
              </button>
              <button id="farmacia-btn-guardar" className="btn" type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Registrar medicamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══ TAB 5: INGRESAR LOTE ══ */}
      {tab === 'lote' && (
        <div className="card" style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setTab('stock')}>← Volver al stock</button>
          </div>
          <AlertMsg msg={msgLote} />
          <form id="farmacia-form-lote" onSubmit={registrarLote}>
            <div className="section-title">Datos del lote</div>

            <div className="form-row">
              <label className="label" htmlFor="lote-med">Medicamento *</label>
              <select id="lote-med" className="input" value={fLote.medicamento_id} onChange={setFieldLote('medicamento_id')} required>
                <option value="">Seleccione un medicamento...</option>
                {stock.filter(m => m.activo).map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.codigo}) — Stock actual: {m.stock_total}</option>
                ))}
              </select>
            </div>

            {([
              { id: 'lote-num', label: 'N° de lote *', key: 'numero_lote', placeholder: 'Ej. LOT-2025-001' },
              { id: 'lote-cant', label: 'Cantidad *', key: 'cantidad', placeholder: 'Unidades ingresadas', type: 'number', min: 1 },
              { id: 'lote-fecha', label: 'Fecha de vencimiento', key: 'fecha_vencimiento', type: 'date' },
            ] as any[]).map(({ id, label, key, ...rest }) => (
              <div key={id} className="form-row">
                <label className="label" htmlFor={id}>{label}</label>
                <input id={id} className="input" value={(fLote as any)[key]} onChange={setFieldLote(key as keyof typeof fLote)} {...rest} />
              </div>
            ))}

            {fLote.medicamento_id && fLote.cantidad && (
              <div style={{ background: 'var(--sidebar-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '.85rem 1.2rem', marginBottom: '1rem', fontSize: '.92rem', color: 'var(--navy)' }}>
                📦 <strong>Stock resultante:</strong>{' '}
                {(stock.find(m => m.id === fLote.medicamento_id)?.stock_total ?? 0) + Number(fLote.cantidad)} unidades
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline"
                onClick={() => { setFLote({ medicamento_id: '', numero_lote: '', cantidad: '', fecha_vencimiento: '' }); setMsgLote(null); }}>
                Limpiar
              </button>
              <button id="farmacia-btn-lote" className="btn" type="submit" disabled={registrandoLote}>
                {registrandoLote ? 'Ingresando...' : 'Ingresar lote'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}