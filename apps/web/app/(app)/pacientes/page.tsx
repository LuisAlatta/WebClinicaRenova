'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';

export default function PacientesPage() {
  const [tab, setTab] = useState<'paciente' | 'medico'>('paciente');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const toast = useToast();

  const [fp, setFp] = useState({ nombres: '', apellidos: '', fecha_nacimiento: '', telefono: '', dni: '', email: '' });
  const [fm, setFm] = useState({ nombres: '', apellidos: '', especialidad_id: '', cmp: '', cargo: '', nacionalidad: '' });

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
      setFp({ nombres: '', apellidos: '', fecha_nacimiento: '', telefono: '', dni: '', email: '' });
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
      setFm({ nombres: '', apellidos: '', especialidad_id: '', cmp: '', cargo: '', nacionalidad: '' });
    } catch (e: any) { toast.error('No se pudo registrar', e.message); }
  }

  return (
    <>
      <PageHeader title="Registro de pacientes y médicos" />

      <div className="card">
        <div className="tabs">
          <div className={`tab ${tab === 'paciente' ? 'active' : ''}`} onClick={() => setTab('paciente')}>Pacientes</div>
          <div className={`tab ${tab === 'medico' ? 'active' : ''}`} onClick={() => setTab('medico')}>Registrar Médico</div>
        </div>

        {tab === 'paciente' ? (
          <form onSubmit={crearPaciente}>
            <div className="section-title">Datos</div>
            <div className="form-row"><label className="label">Nombres</label><input className="input" value={fp.nombres} onChange={(e) => setFp({ ...fp, nombres: e.target.value })} /></div>
            <div className="form-row"><label className="label">Apellidos</label><input className="input" value={fp.apellidos} onChange={(e) => setFp({ ...fp, apellidos: e.target.value })} /></div>
            <div className="form-row"><label className="label">Fecha de nacimiento</label><input className="input" type="date" value={fp.fecha_nacimiento} onChange={(e) => setFp({ ...fp, fecha_nacimiento: e.target.value })} /></div>
            <div className="form-row"><label className="label">Teléfono</label><input className="input" value={fp.telefono} onChange={(e) => setFp({ ...fp, telefono: e.target.value })} /></div>
            <div className="form-row"><label className="label">Número de documento (DNI)</label><input className="input" value={fp.dni} onChange={(e) => setFp({ ...fp, dni: e.target.value })} /></div>
            <div className="form-row"><label className="label">Correo</label><input className="input" type="email" value={fp.email} onChange={(e) => setFp({ ...fp, email: e.target.value })} /></div>
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
            <div className="form-row"><label className="label">CMP</label><input className="input" value={fm.cmp} onChange={(e) => setFm({ ...fm, cmp: e.target.value })} /></div>
            <div className="form-row"><label className="label">Cargo</label><input className="input" value={fm.cargo} onChange={(e) => setFm({ ...fm, cargo: e.target.value })} /></div>
            <div className="form-row"><label className="label">Nacionalidad</label><input className="input" value={fm.nacionalidad} onChange={(e) => setFm({ ...fm, nacionalidad: e.target.value })} /></div>
            <div className="section-title">Datos</div>
            <div className="form-row"><label className="label">Nombres</label><input className="input" value={fm.nombres} onChange={(e) => setFm({ ...fm, nombres: e.target.value })} /></div>
            <div className="form-row"><label className="label">Apellidos</label><input className="input" value={fm.apellidos} onChange={(e) => setFm({ ...fm, apellidos: e.target.value })} /></div>
            <div style={{ textAlign: 'right' }}><button className="btn">Registrar</button></div>
          </form>
        )}
      </div>

      <div className="card table-card" style={{ marginTop: '1.25rem' }}>
        <table>
          <thead><tr><th>DNI</th><th>Nombre</th><th>Teléfono</th><th>Correo</th></tr></thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id}><td>{p.dni}</td><td>{p.nombres} {p.apellidos}</td><td>{p.telefono || '—'}</td><td>{p.email || '—'}</td></tr>
            ))}
            {pacientes.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
