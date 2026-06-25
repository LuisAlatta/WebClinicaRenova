'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSesion } from '../../lib/api';
import { LogoFull } from '../../components/Logo';

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
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem', marginTop: '1.5rem' }}>
          Demo: admin@renova.pe / renova123
        </p>
      </form>
    </div>
  );
}
