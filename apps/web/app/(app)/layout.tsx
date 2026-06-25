'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { getToken, getUsuario } from '../../lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUsuario(getUsuario());
    setListo(true);
  }, [router]);

  if (!listo) return null;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <div className="topbar">
          <div>
            <h1 className="h1">Panel clínico</h1>
            <p className="sub">Sistema de Gestión Clínica RENOVA · SOA</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700 }}>{usuario?.nombre}</div>
            <span className="badge">{usuario?.rol}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
