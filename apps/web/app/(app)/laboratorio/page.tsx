'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, getUsuario } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import Modal from '../../../components/Modal';
import Autocomplete from '../../../components/Autocomplete';
import { useToast } from '../../../components/Toast';

// ─── Helpers visuales ────────────────────────────────────────────────────────
const TIPOS_DOC = [
  { valor: 'DNI',       label: 'DNI' },
  { valor: 'CE',        label: 'C.E.' },
  { valor: 'PASAPORTE', label: 'Pasaporte' },
  { valor: 'CONADIS',   label: 'CONADIS' },
];

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, { cls: string; txt: string }> = {
    FINALIZADO: { cls: 'ok',      txt: 'Finalizado' },
    EN_PROCESO: { cls: 'info',    txt: 'En proceso' },
    SOLICITADO: { cls: 'pending', txt: 'Pendiente'  },
  };
  const e = map[estado] || { cls: 'soft', txt: estado };
  return <span className={`badge ${e.cls}`}>{e.txt}</span>;
}

function PrioridadBadge({ prioridad }: { prioridad: string }) {
  return prioridad === 'URGENTE'
    ? <span className="badge danger" style={{ fontSize: '.68rem' }}>URGENTE</span>
    : null;
}

// Incremento 7: resultado estructurado con rangos de referencia
function ResultadoView({ resultado, solicitud }: { resultado: unknown; solicitud: any }) {
  if (!resultado) return <p style={{ color: 'var(--muted)' }}>Sin resultado registrado.</p>;

  if (resultado && typeof resultado === 'object' && !Array.isArray(resultado)) {
    const entries = Object.entries(resultado as Record<string, unknown>);
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
        <thead>
          <tr style={{ background: 'var(--sidebar-bg)' }}>
            <th style={{ textAlign: 'left', padding: '.5rem .75rem', color: 'var(--muted)', fontWeight: 600 }}>Parámetro</th>
            <th style={{ textAlign: 'right', padding: '.5rem .75rem', color: 'var(--muted)', fontWeight: 600 }}>Valor</th>
            <th style={{ textAlign: 'center', padding: '.5rem .75rem', color: 'var(--muted)', fontWeight: 600 }}>Indicador</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => {
            const num = parseFloat(String(v));
            const min = solicitud?.valor_ref_min;
            const max = solicitud?.valor_ref_max;
            let indicador = null;
            if (!isNaN(num) && (min != null || max != null)) {
              if (min != null && num < min)  indicador = <span className="badge danger" style={{ fontSize: '.7rem' }}>▼ BAJO</span>;
              else if (max != null && num > max) indicador = <span className="badge danger" style={{ fontSize: '.7rem' }}>▲ ALTO</span>;
              else                               indicador = <span className="badge ok"    style={{ fontSize: '.7rem' }}>✓ NORMAL</span>;
            }
            const label = k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
            return (
              <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '.5rem .75rem' }}>{label}</td>
                <td style={{ padding: '.5rem .75rem', textAlign: 'right', fontWeight: 600 }}>
                  {String(v)} {solicitud?.unidad_resultado ?? ''}
                </td>
                <td style={{ padding: '.5rem .75rem', textAlign: 'center' }}>{indicador ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  return <p style={{ padding: '.5rem' }}>{String(resultado)}</p>;
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function LaboratorioPage() {
  const rol = getUsuario()?.rol;
  const puedeSolicitar = rol === 'ADMIN' || rol === 'MEDICO';
  const puedeCargar    = rol === 'ADMIN' || rol === 'ASISTENTE';

  const toast = useToast();
  const [vista, setVista] = useState<'lista' | 'diario' | 'form' | 'historial'>('lista');

  // ── Lista / búsqueda ──────────────────────────────────────────────────────
  const [data, setData]     = useState<any[]>([]);
  const [busca, setBusca]   = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // ── Vista diaria ──────────────────────────────────────────────────────────
  const [fechaDiario, setFechaDiario] = useState(new Date().toISOString().slice(0, 10));
  const [dataDiario, setDataDiario]   = useState<any[]>([]);

  // ── Historial paciente ────────────────────────────────────────────────────
  const [histPaciente, setHistPaciente] = useState<any | null>(null);
  const [histData, setHistData]         = useState<any[]>([]);

  // ── Modales ───────────────────────────────────────────────────────────────
  const [verResultado, setVerResultado] = useState<any | null>(null);
  const [cargarEx, setCargarEx]         = useState<any | null>(null);
  const [fRes, setFRes]   = useState({ resultado: '', observaciones: '' });
  const [guardando, setGuardando] = useState(false);

  // ── Formulario de solicitud ───────────────────────────────────────────────
  // Incremento 1: tipo_documento; Incremento 3: área→tipo; Incremento 5: disponibilidad
  const [tipDoc, setTipDoc]       = useState('DNI');
  const [dniInput, setDniInput]   = useState('');
  const [paciente, setPaciente]   = useState<any | null>(null);
  const [buscandoPac, setBuscandoPac] = useState(false);
  const [medico, setMedico]           = useState<any | null>(null);
  const [areas, setAreas]             = useState<any[]>([]);
  const [areaId, setAreaId]           = useState('');
  const [tipoExamen, setTipoExamen]   = useState<any | null>(null);
  const [fechaProg, setFechaProg]     = useState('');
  const [prioridad, setPrioridad]     = useState('NORMAL');
  const [observaciones, setObs]       = useState('');
  const [disponibilidad, setDisp]     = useState<{ disponible: boolean; ocupados: number; capacidad: number } | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  async function cargarAreas() {
    try { const r = await api('/api/laboratorio/areas'); setAreas(r.data || []); } catch { /* */ }
  }
  useEffect(() => { cargarAreas(); }, []);

  // ── Acciones de lista ─────────────────────────────────────────────────────
  async function buscar() {
    const params = new URLSearchParams();
    if (busca)       params.set('q', busca);
    if (filtroEstado) params.set('estado', filtroEstado);
    const qs = params.toString();
    if (!qs) { toast.error('Búsqueda vacía', 'Escribe un término o filtra por estado para buscar.'); return; }
    try {
      const r = await api(`/api/laboratorio/examenes?${qs}`);
      setData(r.data || []);
    } catch (e: any) { toast.error('Error', e.message); }
  }

  async function cargarDiario(fecha: string) {
    try {
      const r = await api(`/api/laboratorio/examenes/diario?fecha=${fecha}`);
      setDataDiario(r.data || []);
    } catch (e: any) { toast.error('Error', e.message); }
  }

  useEffect(() => { if (vista === 'diario') cargarDiario(fechaDiario); }, [vista, fechaDiario]);

  async function verHistorial(pac: any) {
    setHistPaciente(pac);
    setVista('historial');
    try {
      const r = await api(`/api/laboratorio/examenes/paciente/${pac.paciente_id}`);
      setHistData(r.data || []);
    } catch (e: any) { toast.error('Error', e.message); }
  }

  // ── Disponibilidad al cambiar área + fecha ────────────────────────────────
  const verificarDisp = useCallback(async (aid: string, fh: string) => {
    if (!aid || !fh) { setDisp(null); return; }
    try {
      const r = await api(`/api/laboratorio/disponibilidad?area_id=${aid}&fecha_hora=${encodeURIComponent(fh)}`);
      setDisp(r.data);
    } catch { setDisp(null); }
  }, []);

  // ── Búsqueda de paciente por documento ───────────────────────────────────
  async function buscarPaciente() {
    if (!dniInput.trim()) return;
    setBuscandoPac(true); setPaciente(null);
    try {
      const r = await api(`/api/pacientes?tipo_documento=${tipDoc}&dni=${encodeURIComponent(dniInput.trim())}`);
      const enc = r.data?.[0] ?? null;
      if (!enc) toast.error('No encontrado', `No existe un paciente con ${tipDoc} ${dniInput}`);
      setPaciente(enc);
    } catch (e: any) { toast.error('Error', e.message); }
    finally { setBuscandoPac(false); }
  }

  // ── Enviar solicitud ──────────────────────────────────────────────────────
  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    if (!paciente) { toast.error('Falta paciente', 'Busca al paciente primero.'); return; }
    if (!medico)   { toast.error('Falta médico',   'Selecciona un médico.'); return; }
    if (!tipoExamen) { toast.error('Falta examen', 'Selecciona el tipo de examen.'); return; }
    try {
      await api('/api/laboratorio/examenes', {
        method: 'POST',
        body: JSON.stringify({
          paciente_id:    paciente.id,
          medico_id:      medico.id,
          tipo_examen_id: tipoExamen.id,
          tipo_examen:    tipoExamen.nombre,
          area_id:        areaId ? Number(areaId) : null,
          fecha_programada: fechaProg || null,
          prioridad, observaciones: observaciones || null,
        }),
      });
      toast.ok('Solicitud registrada', 'El examen fue solicitado y se notificó al paciente.');
      setVista('lista'); setData([]);
      setPaciente(null); setDniInput(''); setMedico(null);
      setAreaId(''); setTipoExamen(null); setFechaProg(''); setObs(''); setDisp(null);
    } catch (e: any) { toast.error('No se pudo solicitar', e.message); }
  }

  // ── Cargar resultado (laboratorista) ─────────────────────────────────────
  async function guardarResultado(e: React.FormEvent) {
    e.preventDefault();
    if (!cargarEx || !fRes.resultado.trim()) { toast.error('Falta resultado', ''); return; }
    setGuardando(true);
    try {
      await api('/api/laboratorio/resultados', {
        method: 'POST',
        body: JSON.stringify({
          solicitud_id: cargarEx.id,
          resultado: { detalle: fRes.resultado.trim() },
          observaciones: fRes.observaciones.trim() || undefined,
        }),
      });
      toast.ok('Resultado cargado', 'Examen finalizado y paciente notificado.');
      setCargarEx(null); setFRes({ resultado: '', observaciones: '' });
      if (vista === 'diario') cargarDiario(fechaDiario); else buscar();
    } catch (err: any) { toast.error('Error', err.message); }
    finally { setGuardando(false); }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="Laboratorio" />

      {/* Tabs de vista */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        <div className={`tab ${vista === 'lista'   ? 'active' : ''}`} onClick={() => setVista('lista')}>Búsqueda</div>
        <div className={`tab ${vista === 'diario'  ? 'active' : ''}`} onClick={() => setVista('diario')}>Vista diaria</div>
        {puedeSolicitar && (
          <div className={`tab ${vista === 'form' ? 'active' : ''}`} onClick={() => setVista('form')}>+ Solicitar examen</div>
        )}
      </div>

      {/* ── VISTA: BÚSQUEDA ─────────────────────────────────────────────── */}
      {vista === 'lista' && (
        <>
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 200 }}
              placeholder="Buscar por paciente, médico, DNI, tipo de examen…"
              value={busca} onChange={e => setBusca(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()} />
            <select className="input" style={{ width: 160 }}
              value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="SOLICITADO">Pendiente</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
            <button className="btn btn-secondary" onClick={buscar}>Buscar</button>
            <button className="btn btn-ghost" onClick={() => { setBusca(''); setFiltroEstado(''); setData([]); }}>Limpiar</button>
          </div>

          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>N°</th><th>Paciente</th><th>Examen</th><th>Área</th>
                  <th>Médico / Especialidad</th><th>Fecha prog.</th>
                  <th>Resultado</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      {r.paciente || '—'}
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                        {r.tipo_documento} {r.dni}
                      </div>
                    </td>
                    <td>
                      {r.tipo_examen} <PrioridadBadge prioridad={r.prioridad} />
                    </td>
                    <td>{r.area || '—'}</td>
                    {/* Incremento 6: especialidad del médico visible */}
                    <td>
                      {r.medico || '—'}
                      {r.especialidad_medico && (
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{r.especialidad_medico}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '.83rem' }}>
                      {r.fecha_programada ? new Date(r.fecha_programada).toLocaleString('es-PE') : '—'}
                    </td>
                    <td>
                      {r.resultado ? (
                        <button className="btn btn-outline btn-sm" onClick={() => setVerResultado(r)}>Ver resultado</button>
                      ) : puedeCargar ? (
                        <button className="btn btn-sm" onClick={() => { setCargarEx(r); setFRes({ resultado: '', observaciones: '' }); }}>Cargar</button>
                      ) : (
                        <button className="btn btn-outline btn-sm" disabled>Pendiente</button>
                      )}
                    </td>
                    <td>
                      <EstadoBadge estado={r.estado} />
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr><td colSpan={8} style={{ color: 'var(--muted)', textAlign: 'center' }}>
                    Usa el buscador para encontrar solicitudes
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VISTA: DIARIO ───────────────────────────────────────────────── */}
      {vista === 'diario' && (
        <>
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', alignItems: 'center' }}>
            <label className="label" style={{ margin: 0 }}>Fecha:</label>
            <input className="input" type="date" style={{ width: 180 }}
              value={fechaDiario}
              onChange={e => setFechaDiario(e.target.value)} />
            <span style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
              {dataDiario.length} examen(es) programado(s)
            </span>
          </div>
          <div className="card table-card">
            <table>
              <thead>
                <tr>
                  <th>Hora</th><th>Paciente</th><th>Examen</th><th>Área</th>
                  <th>Médico / Especialidad</th><th>Prioridad</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {dataDiario.map(r => (
                  <tr key={r.id} style={r.prioridad === 'URGENTE' ? { background: '#fff8f7' } : {}}>
                    <td style={{ fontWeight: 600, fontSize: '.88rem' }}>
                      {r.fecha_programada
                        ? new Date(r.fecha_programada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                        : new Date(r.solicitado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      {r.paciente}
                      <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{r.dni}</div>
                    </td>
                    <td>{r.tipo_examen}</td>
                    <td>{r.area || '—'}</td>
                    {/* Incremento 6 */}
                    <td>
                      {r.medico || '—'}
                      {r.especialidad_medico && (
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{r.especialidad_medico}</div>
                      )}
                    </td>
                    <td><PrioridadBadge prioridad={r.prioridad} /></td>
                    <td><EstadoBadge estado={r.estado} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => verHistorial(r)}>
                        Historial
                      </button>
                    </td>
                  </tr>
                ))}
                {dataDiario.length === 0 && (
                  <tr><td colSpan={8} style={{ color: 'var(--muted)', textAlign: 'center' }}>
                    Sin exámenes programados para esta fecha
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── VISTA: FORMULARIO ───────────────────────────────────────────── */}
      {vista === 'form' && (
        <div className="card">
          <form onSubmit={solicitar}>
            <div className="section-title">1 · Paciente</div>

            {/* Incremento 1: tipo de documento */}
            <div className="form-row">
              <label className="label">Tipo de documento</label>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <select className="input" style={{ width: 150 }}
                  value={tipDoc} onChange={e => { setTipDoc(e.target.value); setPaciente(null); setDniInput(''); }}>
                  {TIPOS_DOC.map(t => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </select>
                <input className="input" style={{ flex: 1 }}
                  placeholder={tipDoc === 'DNI' ? '12345678' : tipDoc === 'CE' ? 'A1234567' : 'Número'}
                  value={dniInput}
                  onChange={e => { setDniInput(e.target.value.toUpperCase()); setPaciente(null); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), buscarPaciente())} />
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={buscarPaciente} disabled={buscandoPac}>
                  {buscandoPac ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
            </div>
            {paciente && (
              <div className="form-row">
                <label className="label">Paciente encontrado</label>
                <div className="data-block">
                  <dl>
                    <dt>Nombre</dt><dd>{paciente.nombres} {paciente.apellidos}</dd>
                    <dt>Documento</dt><dd>{paciente.tipo_documento}: {paciente.dni}</dd>
                    {paciente.email && <><dt>Correo</dt><dd>{paciente.email}</dd></>}
                    {paciente.canal_preferido && <><dt>Canal notif.</dt><dd>{paciente.canal_preferido}</dd></>}
                  </dl>
                </div>
              </div>
            )}

            <div className="section-title">2 · Médico solicitante</div>
            {/* Incremento 2: Autocomplete de médico */}
            <div className="form-row">
              <label className="label">Médico</label>
              <Autocomplete
                endpoint="/api/pacientes/medicos"
                placeholder="Buscar médico por nombre…"
                label={m => `${m.nombres} ${m.apellidos}${m.especialidad ? ` · ${m.especialidad}` : ''}`}
                value={medico?.id}
                displayValue={medico ? `${medico.nombres} ${medico.apellidos}` : ''}
                onChange={(_, item) => setMedico(item)}
                required
              />
            </div>

            <div className="section-title">3 · Examen</div>
            {/* Incremento 3: área → tipo de examen */}
            <div className="form-row">
              <label className="label">Área</label>
              <select className="input" value={areaId}
                onChange={e => { setAreaId(e.target.value); setTipoExamen(null); }}>
                <option value="">Todas las áreas</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label className="label">Tipo de examen</label>
              <Autocomplete
                endpoint="/api/laboratorio/tipos-examen"
                extraParams={areaId ? { area_id: areaId } : {}}
                placeholder={areaId ? 'Buscar examen de esta área…' : 'Buscar tipo de examen…'}
                label={t => `${t.nombre}${t.area ? ` · ${t.area}` : ''}${t.unidad_resultado ? ` (${t.unidad_resultado})` : ''}`}
                value={tipoExamen?.id}
                displayValue={tipoExamen?.nombre ?? ''}
                onChange={(_, item) => setTipoExamen(item)}
                required
              />
            </div>

            <div className="section-title">4 · Programación</div>
            {/* Incremento 5: fecha programada + disponibilidad */}
            <div className="form-row">
              <label className="label">Fecha y hora programada</label>
              <input className="input" type="datetime-local" value={fechaProg}
                onChange={e => { setFechaProg(e.target.value); verificarDisp(areaId, e.target.value); }} />
            </div>
            {disponibilidad && (
              <div className="form-row">
                <label className="label">Disponibilidad del área</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span className={`avail ${disponibilidad.disponible ? 'ok' : 'busy'}`}>
                    {disponibilidad.disponible ? '✓ Disponible' : '✗ Sin disponibilidad'}
                  </span>
                  <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
                    {disponibilidad.ocupados} / {disponibilidad.capacidad} equipos ocupados
                  </span>
                </div>
              </div>
            )}
            <div className="form-row">
              <label className="label">Prioridad</label>
              <select className="input" value={prioridad} onChange={e => setPrioridad(e.target.value)}>
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
            <div className="form-row">
              <label className="label">Observaciones</label>
              <input className="input" placeholder="Indicaciones adicionales (opcional)"
                value={observaciones} onChange={e => setObs(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setVista('lista')}>Cancelar</button>
              <button type="submit" className="btn">+ Enviar solicitud</button>
            </div>
          </form>
        </div>
      )}

      {/* ── VISTA: HISTORIAL PACIENTE ────────────────────────────────────── */}
      {vista === 'historial' && histPaciente && (
        <>
          <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setVista('diario')}>← Volver al diario</button>
            <span style={{ fontWeight: 600 }}>Historial de: <strong>{histPaciente.paciente}</strong></span>
          </div>
          <div className="card table-card">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Examen</th><th>Área</th><th>Médico / Espec.</th><th>Estado</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {histData.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '.83rem' }}>{new Date(r.solicitado_en).toLocaleDateString('es-PE')}</td>
                    <td>{r.tipo_examen}</td>
                    <td>{r.area || '—'}</td>
                    <td>
                      {r.medico || '—'}
                      {r.especialidad_medico && <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{r.especialidad_medico}</div>}
                    </td>
                    <td><EstadoBadge estado={r.estado} /></td>
                    <td>
                      {r.resultado
                        ? <button className="btn btn-outline btn-sm" onClick={() => setVerResultado(r)}>Ver</button>
                        : <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>Pendiente</span>}
                    </td>
                  </tr>
                ))}
                {histData.length === 0 && (
                  <tr><td colSpan={6} style={{ color: 'var(--muted)', textAlign: 'center' }}>Sin historial</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODAL: Ver resultado ─────────────────────────────────────────── */}
      <Modal
        open={!!verResultado} onClose={() => setVerResultado(null)}
        title={verResultado ? `Resultado · ${verResultado.tipo_examen}` : ''}
        subtitle={`${verResultado?.paciente ?? ''}${verResultado?.especialidad_medico ? ` · ${verResultado.especialidad_medico}` : ''}`}
        footer={<button className="btn btn-secondary" onClick={() => setVerResultado(null)}>Cerrar</button>}
      >
        {verResultado && (
          <>
            {/* Incremento 7: resultado estructurado con indicadores */}
            <ResultadoView resultado={verResultado.resultado} solicitud={verResultado} />
            {verResultado.resultado_observaciones && (
              <p style={{ margin: '1rem 0 0', fontSize: '.9rem' }}>
                <strong style={{ color: 'var(--muted)', fontWeight: 600 }}>Observaciones:</strong>{' '}
                {verResultado.resultado_observaciones}
              </p>
            )}
            {verResultado.recibido_en && (
              <p style={{ margin: '.4rem 0 0', color: 'var(--muted)', fontSize: '.8rem' }}>
                Recibido: {new Date(verResultado.recibido_en).toLocaleString('es-PE')}
              </p>
            )}
          </>
        )}
      </Modal>

      {/* ── MODAL: Cargar resultado ──────────────────────────────────────── */}
      <Modal
        open={!!cargarEx} onClose={() => setCargarEx(null)}
        title={cargarEx ? `Cargar resultado · ${cargarEx.tipo_examen}` : ''}
        subtitle={cargarEx?.paciente}
      >
        <form onSubmit={guardarResultado}>
          <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
            <label className="label">Resultado *</label>
            <textarea className="input" rows={4} value={fRes.resultado}
              onChange={e => setFRes({ ...fRes, resultado: e.target.value })}
              placeholder="Ej. glucosa: 98, unidad: mg/dL" />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr' }}>
            <label className="label">Observaciones</label>
            <input className="input" value={fRes.observaciones}
              onChange={e => setFRes({ ...fRes, observaciones: e.target.value })}
              placeholder="Opcional" />
          </div>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCargarEx(null)}>Cancelar</button>
            <button type="submit" className="btn" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar resultado'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
