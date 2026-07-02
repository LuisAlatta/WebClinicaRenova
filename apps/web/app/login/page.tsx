'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSesion } from '../../lib/api';
import { LogoFull } from '../../components/Logo';

/* Íconos simples (solo paths) para los accesos de demo por rol */
const Ico = (d: string) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

/* Usuarios de prueba (todos con clave renova123) */
const ROLES_DEMO = [
  { label: 'Administrador', email: 'admin@renova.pe', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { label: 'Médico', email: 'medico@renova.pe', d: 'M3 12h4l2 5 4-12 2 7h6' },
  { label: 'Asistente', email: 'asistente@renova.pe', d: 'M9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 21a7 7 0 0 1 14 0' },
  { label: 'Enfermero/a', email: 'enfermero@renova.pe', d: 'M12 6v12|M6 12h12' },
  { label: 'Farmacéutico', email: 'farmaceutico@renova.pe', d: 'M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z|M8.5 8.5l7 7' },
  { label: 'Laboratorista', email: 'laboratorista@renova.pe', d: 'M9 2v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V2|M9 2h6' },
  { label: 'Auditor', email: 'auditor@renova.pe', d: 'M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z|M9 12h6|M9 16h4' },
];
const CLAVE_DEMO = 'renova123';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@renova.pe');
  const [password, setPassword] = useState('renova123');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const r = await api<{ data: { token: string; usuario: unknown } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSesion(r.data.token, r.data.usuario);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="login-wrap">
      <LogoFull />
      <form className="card login-card" onSubmit={onSubmit}>
        <h2>LOGIN</h2>

        <div className="login-field">
          <label className="label">Usuario</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@renova.pe" />
        </div>
        <div className="login-field">
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '.9rem', textAlign: 'center' }}>{error}</p>}

        <div className="login-actions">
          <a href="#">¿Olvidaste tu usuario o contraseña?</a>
          <button className="btn btn-outline" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Login'}
          </button>
        </div>
        <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem', margin: '0 0 .8rem' }}>
            Ingreso rápido de demostración (clave: {CLAVE_DEMO})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', justifyContent: 'center' }}>
            {ROLES_DEMO.map((r) => (
              <button
                key={r.email}
                type="button"
                onClick={() => { setEmail(r.email); setPassword(CLAVE_DEMO); setError(''); }}
                title={r.email}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                  padding: '.45rem .8rem', borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${email === r.email ? 'var(--brand)' : 'var(--border)'}`,
                  background: email === r.email ? 'var(--sidebar-active)' : '#fff',
                  color: email === r.email ? 'var(--brand-d)' : 'var(--text)',
                  fontSize: '.82rem', fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                {Ico(r.d)}{r.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
