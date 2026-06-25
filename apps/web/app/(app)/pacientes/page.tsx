'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

/** Pantalla de Pacientes — FUNCIONAL (referencia para las demás pantallas). */
export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [form, setForm] = useState({ dni: '', nombres: '', apellidos: '', telefono: '', email: '' });
  const [msg, setMsg] = useState('');

  async function cargar() {
    try {
      const r = await api('/api/pacientes');
      setPacientes(r.data || []);
    } catch (e: any) {
      setMsg(e.message);
    }
  }
  useEffect(() => { cargar(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api('/api/pacientes', { method: 'POST', body: JSON.stringify(form) });
      setForm({ dni: '', nombres: '', apellidos: '', telefono: '', email: '' });
      cargar();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px' }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pacientes registrados</h3>
        <table>
          <thead><tr><th>DNI</th><th>Nombre</th><th>Teléfono</th><th>Email</th></tr></thead>
          <tbody>
            {pacientes.map((p) => (
              <tr key={p.id}>
                <td>{p.dni}</td>
                <td>{p.nombres} {p.apellidos}</td>
                <td>{p.telefono || '—'}</td>
                <td>{p.email || '—'}</td>
              </tr>
            ))}
            {pacientes.length === 0 && <tr><td colSpan={4} style={{ color: 'var(--muted)' }}>Sin registros</td></tr>}
          </tbody>
        </table>
      </div>

      <form className="card" onSubmit={crear}>
        <h3 style={{ marginTop: 0 }}>Nuevo paciente</h3>
        {(['dni', 'nombres', 'apellidos', 'telefono', 'email'] as const).map((campo) => (
          <input
            key={campo}
            className="input"
            placeholder={campo}
            value={(form as any)[campo]}
            onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
            style={{ marginBottom: '.6rem' }}
          />
        ))}
        {msg && <p style={{ color: 'var(--danger)', fontSize: '.85rem' }}>{msg}</p>}
        <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>Registrar</button>
      </form>
    </div>
  );
}
