'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSesion } from '../../lib/api';

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
      <form className="card login-card" onSubmit={onSubmit}>
        <h1 style={{ margin: 0, fontSize: '1.6rem' }}>
          RENOVA <span style={{ color: 'var(--accent)' }}>·</span> Clínica
        </h1>
        <p className="sub" style={{ marginBottom: '1.25rem' }}>Ingresa con tu cuenta</p>

        <label style={{ fontSize: '.85rem', fontWeight: 600 }}>Correo</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} style={{ margin: '.3rem 0 .9rem' }} />

        <label style={{ fontSize: '.85rem', fontWeight: 600 }}>Contraseña</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ margin: '.3rem 0 1rem' }} />

        {error && <p style={{ color: 'var(--danger)', fontSize: '.9rem' }}>{error}</p>}

        <button className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={cargando}>
          {cargando ? 'Ingresando...' : 'Iniciar sesión'}
        </button>

        <p className="sub" style={{ marginTop: '1rem', fontSize: '.8rem' }}>
          Demo: admin@renova.pe / renova123
        </p>
      </form>
    </div>
  );
}
