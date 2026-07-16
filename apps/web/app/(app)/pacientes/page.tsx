'use client';
import { useEffect, useState } from 'react';
import { api, getUsuario } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import Modal from '../../../components/Modal';
import { useToast } from '../../../components/Toast';

const TIPOS_DOC = [
  { v: 'DNI', t: 'DNI' },
  { v: 'CE', t: 'Carnet de Extranjería (C.E.)' },
  { v: 'PASAPORTE', t: 'Pasaporte' },
  { v: 'CONADIS', t: 'Carnet CONADIS' },
];
const CANALES = [
  { v: 'email', t: 'Correo electrónico' },
  { v: 'sms', t: 'SMS' },
  { v: 'whatsapp', t: 'WhatsApp' },
  { v: 'ninguno', t: 'Sin notificaciones' },
];

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function hoyISO() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en zona local
}

export default function PacientesPage() {
  // Solo el administrador puede registrar médicos (POST /medicos exige ADMIN).
  const puedeRegistrarMedico = getUsuario()?.rol === 'ADMIN';
  const [tab, setTab] = useState<'paciente' | 'medico'>('paciente');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const toast = useToast();

  const [fp, setFp] = useState({
    tipo_documento: 'DNI', dni: '', nombres: '', apellidos: '',
    fecha_nacimiento: '', sexo: '', telefono: '', email: '', direccion: '', canal_preferido: 'email',
  });
  const [fm, setFm] = useState({ nombres: '', apellidos: '', especialidad_id: '', cmp: '' });

  // Ficha-red del paciente (paciente como canal de conexión con la red de servicios).
  const [redAbierta, setRedAbierta] = useState(false);
  const [red, setRed] = useState<any>(null);
  const [cargandoRed, setCargandoRed] = useState(false);

  async function cargar() {
    try {
      const [p, e] = await Promise.all([api('/api/pacientes'), api('/api/pacientes/especialidades')]);
      setPacientes(p.data || []);
      setEspecialidades(e.data || []);
    } catch (e: any) { toast.error('Error al cargar', e.message); }
  }
  useEffect(() => { cargar(); }, []);

  async function crearPaciente(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/pacientes', { method: 'POST', body: JSON.stringify(fp) });
      toast.ok('Paciente registrado', 'El paciente se registró correctamente.');
      setFp({ tipo_documento: 'DNI', dni: '', nombres: '', apellidos: '', fecha_nacimiento: '', sexo: '', telefono: '', email: '', direccion: '', canal_preferido: 'email' });
      cargar();
    } catch (e: any) { toast.error('No se pudo registrar', e.message); }
  }

  async function crearMedico(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/pacientes/medicos', {
        method: 'POST',
        body: JSON.stringify({ ...fm, especialidad_id: fm.especialidad_id ? Number(fm.especialidad_id) : null }),
      });
      toast.ok('Médico registrado', 'El médico se registró correctamente.');
      setFm({ nombres: '', apellidos: '', especialidad_id: '', cmp: '' });
    } catch (e: any) { toast.error('No se pudo registrar', e.message); }
  }

  async function verRed(p: any) {
    setRedAbierta(true); setRed(null); setCargandoRed(true);
    try {
      const r = await api(`/api/pacientes/${p.id}/red`);
      setRed(r.data);
    } catch (e: any) { toast.error('No se pudo cargar la ficha', e.message); }
    finally { setCargandoRed(false); }
  }

  const docLabel =
    fp.tipo_documento === 'DNI' ? 'Número (8 dígitos)'
    : fp.tipo_documento === 'CE' ? 'Número (9 a 12 caracteres)'
    : 'Número (6 a 12 caracteres)';
  const esDni = fp.tipo_documento === 'DNI';

  return (
    <>
      <PageHeader title="Registro de pacientes y médicos" />

      <div className="card">
        <div className="tabs">
          <div className={`tab ${tab === 'paciente' ? 'active' : ''}`} onClick={() => setTab('paciente')}>Pacientes</div>
          {puedeRegistrarMedico && (
            <div className={`tab ${tab === 'medico' ? 'active' : ''}`} onClick={() => setTab('medico')}>Registrar Médico</div>
          )}
        </div>

        {tab === 'paciente' || !puedeRegistrarMedico ? (
          <form onSubmit={crearPaciente}>
            <div className="section-title">Datos</div>
            <div className="form-row"><label className="label">Tipo de documento</label>
              <select className="input" value={fp.tipo_documento} onChange={(e) => setFp({ ...fp, tipo_documento: e.target.value })}>
                {TIPOS_DOC.map((d) => <option key={d.v} value={d.v}>{d.t}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="label">{docLabel}</label>
              <input
                className="input"
                value={fp.dni}
                inputMode={esDni ? 'numeric' : 'text'}
                maxLength={esDni ? 8 : 12}
                placeholder={esDni ? '12345678' : 'Ej. X1234567'}
                onChange={(e) => {
                  const v = esDni ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^A-Za-z0-9]/g, '');
                  setFp({ ...fp, dni: v });
                }}
              />
            </div>
            <div className="form-row"><label className="label">Nombres</label><input className="input" value={fp.nombres} onChange={(e) => setFp({ ...fp, nombres: e.target.value })} /></div>
            <div className="form-row"><label className="label">Apellidos</label><input className="input" value={fp.apellidos} onChange={(e) => setFp({ ...fp, apellidos: e.target.value })} /></div>
            <div className="form-row"><label className="label">Fecha de nacimiento</label><input className="input" type="date" max={hoyISO()} value={fp.fecha_nacimiento} onChange={(e) => setFp({ ...fp, fecha_nacimiento: e.target.value })} /></div>
            <div className="form-row"><label className="label">Sexo</label>
              <select className="input" value={fp.sexo} onChange={(e) => setFp({ ...fp, sexo: e.target.value })}>
                <option value="">Sin especificar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div className="form-row"><label className="label">Teléfono</label><input className="input" type="tel" inputMode="numeric" maxLength={15} placeholder="9 dígitos" value={fp.telefono} onChange={(e) => setFp({ ...fp, telefono: e.target.value.replace(/[^\d]/g, '') })} /></div>
            <div className="form-row"><label className="label">Correo</label><input className="input" type="email" placeholder="paciente@correo.com" value={fp.email} onChange={(e) => setFp({ ...fp, email: e.target.value })} /></div>
            <div className="form-row"><label className="label">Dirección</label><input className="input" placeholder="Av. / Jr. / Calle, número, distrito" value={fp.direccion} onChange={(e) => setFp({ ...fp, direccion: e.target.value })} /></div>
            <div className="form-row"><label className="label">Canal de contacto</label>
              <select className="input" value={fp.canal_preferido} onChange={(e) => setFp({ ...fp, canal_preferido: e.target.value })}>
                {CANALES.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
              </select>
            </div>
            <div style={{ textAlign: 'right' }}><button className="btn">Registrar</button></div>
          </form>
        ) : (
          <form onSubmit={crearMedico}>
            <div className="form-row"><label className="label">Especialidad</label>
              <select className="input" value={fm.especialidad_id} onChange={(e) => setFm({ ...fm, especialidad_id: e.target.value })}>
                <option value="">Seleccione...</option>
                {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="form-row"><label className="label">CMP (colegiatura)</label><input className="input" placeholder="N° de colegiatura médica" value={fm.cmp} onChange={(e) => setFm({ ...fm, cmp: e.target.value })} /></div>
            <div className="section-title">Datos</div>
            <div className="form-row"><label className="label">Nombres</label><input className="input" value={fm.nombres} onChange={(e) => setFm({ ...fm, nombres: e.target.value })} /></div>
            <div className="form-row"><label className="label">Apellidos</label><input className="input" value={fm.apellidos} onChange={(e) => setFm({ ...fm, apellidos: e.target.value })} /></div>
            <div style={{ textAlign: 'right' }}><button className="btn">Registrar</button></div>
          </form>
        )}
      </div>

      <div className="card table-card" style={{ marginTop: '1.25rem' }}>
        <table>
          <thead><tr><th>Documento</th><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Canal</th><th>Red</th></tr></thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id}>
                <td><span style={{ color: 'var(--muted)', fontSize: '.75rem' }}>{p.tipo_documento || 'DNI'}</span><br />{p.dni}</td>
                <td>{p.nombres} {p.apellidos}</td>
                <td>{p.telefono || '—'}</td>
                <td>{p.email || '—'}</td>
                <td>{p.canal_preferido || 'email'}</td>
                <td><button className="btn btn-secondary" style={{ padding: '.3rem .7rem', fontSize: '.8rem' }} onClick={() => verRed(p)}>Ver red</button></td>
              </tr>
            ))}
            {pacientes.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--muted)' }}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal
        open={redAbierta}
        onClose={() => setRedAbierta(false)}
        size="lg"
        title="Ficha del paciente en la red"
        subtitle={red?.paciente ? `${red.paciente.nombres} ${red.paciente.apellidos} — ${red.paciente.tipo_documento || 'DNI'} ${red.paciente.dni}` : undefined}
      >
        {cargandoRed && <p style={{ color: 'var(--muted)' }}>Cargando conexiones…</p>}
        {red && (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <RedSeccion titulo="Consultas" vacio="Sin consultas registradas" items={red.consultas}
              render={(c: any) => `${fmt(c.fecha_hora)} · ${c.especialidad || 'Sin especialidad'} · ${c.medico || 'Sin médico'} · ${c.estado}`} />
            <RedSeccion titulo="Cirugías" vacio="Sin cirugías registradas" items={red.cirugias}
              render={(c: any) => `${fmt(c.fecha_hora)} · ${c.procedimiento || 'Procedimiento'} · ${c.cirujano || 'Sin cirujano'} · ${c.estado}`} />
            <RedSeccion titulo="Internamientos" vacio="Sin internamientos" items={red.internamientos}
              render={(i: any) => `${fmt(i.fecha_ingreso)} · ${i.especialidad || 'Sin especialidad'} · cama ${i.cama || '—'} · ${i.estado}`} />
            <RedSeccion titulo="Exámenes de laboratorio" vacio="Sin exámenes" items={red.examenes}
              render={(x: any) => `${fmt(x.solicitado_en)} · ${x.tipo_examen} · ${x.prioridad} · ${x.estado}`} />
          </div>
        )}
      </Modal>
    </>
  );
}

function RedSeccion({ titulo, items, vacio, render }: { titulo: string; items?: any[]; vacio: string; render: (x: any) => string }) {
  return (
    <div>
      <div className="section-title" style={{ marginBottom: '.5rem' }}>{titulo} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({items?.length || 0})</span></div>
      {items && items.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '.35rem' }}>
          {items.map((it) => <li key={it.id} style={{ fontSize: '.85rem' }}>{render(it)}</li>)}
        </ul>
      ) : <p style={{ color: 'var(--muted)', fontSize: '.85rem', margin: 0 }}>{vacio}</p>}
    </div>
  );
}
