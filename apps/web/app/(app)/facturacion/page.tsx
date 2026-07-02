'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';

/* ─── Tipos ───────────────────────────────────────────── */
interface Factura {
  id: string; paciente_id: string; tipo_comprobante: string;
  subtotal: string; igv: string; total: string; estado: string; emitida_en: string;
}
interface Paciente { id: string; dni: string; nombres: string; apellidos: string; }
interface MetodoPago { id: number; codigo: string; nombre: string; }
interface Item { descripcion: string; cantidad: string; precio_unit: string; }
interface DetalleFactura extends Factura {
  detalle: { id: string; descripcion: string; cantidad: number; precio_unit: string; importe: string }[];
  pagos: { id: string; monto: string; pagada_en?: string }[];
}

const IGV = 0.18;
const fmt = (n: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n);
const fmtFecha = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

const estadoBadge = (e: string) =>
  e === 'PAGADO' ? 'ok' : e === 'ANULADO' ? 'soft' : 'warn';

export default function FacturacionPage() {
  const [vista, setVista] = useState<'lista' | 'nueva'>('lista');
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [metodos, setMetodos] = useState<MetodoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<DetalleFactura | null>(null);
  const toast = useToast();

  // Formulario nueva factura
  const [pacienteId, setPacienteId] = useState('');
  const [tipoComp, setTipoComp] = useState('BOLETA');
  const [items, setItems] = useState<Item[]>([{ descripcion: '', cantidad: '1', precio_unit: '' }]);
  const [enviando, setEnviando] = useState(false);

  // Pago
  const [pago, setPago] = useState({ monto: '', metodo_pago_id: '' });
  const [pagando, setPagando] = useState(false);

  const nombrePaciente = useMemo(() => {
    const m = new Map(pacientes.map((p) => [p.id, `${p.nombres} ${p.apellidos}`]));
    return (id: string) => m.get(id) || id.slice(0, 8);
  }, [pacientes]);

  async function cargar() {
    setLoading(true);
    try {
      const r = await api<{ data: Factura[] }>('/api/facturacion');
      setFacturas(r.data || []);
    } catch (e: any) { toast.error('No se pudo cargar', e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    cargar();
    api<{ data: Paciente[] }>('/api/pacientes').then((r) => setPacientes(r.data || [])).catch(() => {});
    api<{ data: MetodoPago[] }>('/api/facturacion/metodos').then((r) => setMetodos(r.data || [])).catch(() => {});
  }, []);

  /* Totales en vivo del formulario */
  const subtotal = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unit) || 0), 0);
  const igvCalc = +(subtotal * IGV).toFixed(2);
  const totalCalc = +(subtotal + igvCalc).toFixed(2);

  const setItem = (i: number, k: keyof Item, v: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addItem = () => setItems((prev) => [...prev, { descripcion: '', cantidad: '1', precio_unit: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  function limpiarNueva() {
    setPacienteId(''); setTipoComp('BOLETA'); setItems([{ descripcion: '', cantidad: '1', precio_unit: '' }]);
  }

  async function generarFactura(e: React.FormEvent) {
    e.preventDefault();
    const itemsValidos = items.filter((it) => it.descripcion.trim() && Number(it.precio_unit) > 0);
    if (!pacienteId || itemsValidos.length === 0) {
      toast.error('Datos incompletos', 'Selecciona un paciente y agrega al menos un ítem con precio.'); return;
    }
    setEnviando(true);
    try {
      await api('/api/facturacion', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id: pacienteId,
          tipo_comprobante: tipoComp,
          items: itemsValidos.map((it) => ({ descripcion: it.descripcion.trim(), cantidad: Number(it.cantidad) || 1, precio_unit: Number(it.precio_unit) })),
        }),
      });
      toast.ok('Comprobante generado', `${tipoComp} por ${fmt(totalCalc)} registrada.`);
      limpiarNueva();
      setVista('lista');
      cargar();
    } catch (e: any) { toast.error('No se pudo generar', e.message); }
    finally { setEnviando(false); }
  }

  async function verDetalle(id: string) {
    try {
      const r = await api<{ data: DetalleFactura }>(`/api/facturacion/${id}`);
      setDetalle(r.data);
      setPago({ monto: '', metodo_pago_id: '' });
    } catch (e: any) { toast.error('No se pudo abrir', e.message); }
  }

  const saldo = detalle
    ? +(Number(detalle.total) - detalle.pagos.reduce((s, p) => s + Number(p.monto), 0)).toFixed(2)
    : 0;

  async function registrarPago(e: React.FormEvent) {
    e.preventDefault();
    if (!detalle) return;
    const monto = Number(pago.monto);
    if (!monto || monto <= 0) { toast.error('Monto inválido', 'Ingresa un monto mayor a 0.'); return; }
    setPagando(true);
    try {
      await api(`/api/facturacion/${detalle.id}/pagos`, {
        method: 'POST',
        body: JSON.stringify({ monto, metodo_pago_id: pago.metodo_pago_id ? Number(pago.metodo_pago_id) : undefined }),
      });
      toast.ok('Pago registrado', `Se registró un pago de ${fmt(monto)}.`);
      await verDetalle(detalle.id);
      cargar();
    } catch (e: any) { toast.error('No se pudo registrar el pago', e.message); }
    finally { setPagando(false); }
  }

  return (
    <>
      <PageHeader title="Facturación y cobranza" />

      {vista === 'lista' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.25rem' }}>
            <button className="btn btn-outline" onClick={cargar}>↻ Actualizar</button>
            <button className="btn" onClick={() => { limpiarNueva(); setVista('nueva'); }}>+ Nuevo comprobante</button>
          </div>

          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>Comprobante</th><th>Paciente</th><th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>IGV</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>Cargando…</td></tr>
                ) : facturas.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2.5rem' }}>Sin comprobantes emitidos</td></tr>
                ) : facturas.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.tipo_comprobante}</td>
                    <td>{nombrePaciente(f.paciente_id)}</td>
                    <td>{fmtFecha(f.emitida_en)}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(Number(f.subtotal))}</td>
                    <td style={{ textAlign: 'right', color: 'var(--muted)' }}>{fmt(Number(f.igv))}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(Number(f.total))}</td>
                    <td><span className={`badge ${estadoBadge(f.estado)}`}>{f.estado}</span></td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => verDetalle(f.id)}>Ver / Pagar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card" style={{ maxWidth: 760 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setVista('lista')}>← Volver</button>
          </div>
          <form onSubmit={generarFactura}>
            <div className="section-title">Datos del comprobante</div>

            <div className="form-row">
              <label className="label">Paciente *</label>
              <select className="input" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)} required>
                <option value="">Seleccione un paciente...</option>
                {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} — {p.dni}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="label">Tipo</label>
              <select className="input" value={tipoComp} onChange={(e) => setTipoComp(e.target.value)}>
                <option value="BOLETA">Boleta</option>
                <option value="FACTURA">Factura</option>
              </select>
            </div>

            <div className="section-title" style={{ marginTop: '1.5rem' }}>Ítems (servicios / medicamentos)</div>
            <div className="card table-card" style={{ marginBottom: '1rem' }}>
              <table>
                <thead>
                  <tr><th>Descripción</th><th style={{ width: 90 }}>Cant.</th><th style={{ width: 130 }}>P. unit.</th><th style={{ width: 120, textAlign: 'right' }}>Importe</th><th style={{ width: 40 }}></th></tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td><input className="input" placeholder="Ej. Consulta médica" value={it.descripcion} onChange={(e) => setItem(i, 'descripcion', e.target.value)} /></td>
                      <td><input className="input" type="number" min={1} value={it.cantidad} onChange={(e) => setItem(i, 'cantidad', e.target.value)} /></td>
                      <td><input className="input" type="number" min={0} step="0.01" placeholder="0.00" value={it.precio_unit} onChange={(e) => setItem(i, 'precio_unit', e.target.value)} /></td>
                      <td style={{ textAlign: 'right' }}>{fmt((Number(it.cantidad) || 0) * (Number(it.precio_unit) || 0))}</td>
                      <td>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(i)} disabled={items.length === 1} title="Quitar">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={addItem}>+ Agregar ítem</button>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.3rem', fontSize: '.95rem' }}>
              <div style={{ color: 'var(--muted)' }}>Subtotal: <strong style={{ color: 'var(--text)' }}>{fmt(subtotal)}</strong></div>
              <div style={{ color: 'var(--muted)' }}>IGV (18%): <strong style={{ color: 'var(--text)' }}>{fmt(igvCalc)}</strong></div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>Total: {fmt(totalCalc)}</div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={limpiarNueva}>Limpiar</button>
              <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Generando…' : 'Generar comprobante'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal detalle + pago */}
      <Modal
        open={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? `${detalle.tipo_comprobante} · ${fmt(Number(detalle.total))}` : ''}
        subtitle={detalle ? nombrePaciente(detalle.paciente_id) : ''}
        size="lg"
        footer={<button className="btn btn-secondary" onClick={() => setDetalle(null)}>Cerrar</button>}
      >
        {detalle && (
          <>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span className={`badge ${estadoBadge(detalle.estado)}`}>{detalle.estado}</span>
              <span style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Emitida el {fmtFecha(detalle.emitida_en)}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: saldo > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                Saldo: {fmt(saldo)}
              </span>
            </div>

            <div className="data-block" style={{ marginBottom: '1rem' }}>
              {detalle.detalle.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.15rem 0' }}>
                  <span>{d.cantidad} × {d.descripcion}</span>
                  <strong>{fmt(Number(d.importe))}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '.4rem', paddingTop: '.4rem', display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                <span>Subtotal / IGV</span><span>{fmt(Number(detalle.subtotal))} / {fmt(Number(detalle.igv))}</span>
              </div>
            </div>

            {detalle.pagos.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="section-title" style={{ margin: '0 0 .5rem' }}>Pagos registrados</div>
                {detalle.pagos.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.9rem', padding: '.2rem 0', color: 'var(--text)' }}>
                    <span style={{ color: 'var(--muted)' }}>Pago</span><strong>{fmt(Number(p.monto))}</strong>
                  </div>
                ))}
              </div>
            )}

            {detalle.estado !== 'PAGADO' && detalle.estado !== 'ANULADO' && (
              <form onSubmit={registrarPago} style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div className="section-title" style={{ margin: '0 0 .75rem' }}>Registrar pago</div>
                <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="label">Monto *</label>
                    <input className="input" type="number" min={0} step="0.01" placeholder={`Máx. ${saldo}`} value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <label className="label">Método</label>
                    <select className="input" value={pago.metodo_pago_id} onChange={(e) => setPago({ ...pago, metodo_pago_id: e.target.value })}>
                      <option value="">Sin especificar</option>
                      {metodos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <button className="btn" type="submit" disabled={pagando}>{pagando ? 'Registrando…' : 'Registrar pago'}</button>
                </div>
              </form>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
