'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getUsuario } from '../lib/api';
import { LogoFull } from './Logo';

const I = (d: string) => (
  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: I('M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z') },
  { href: '/pacientes', label: 'Registrar Pacientes', icon: I('M9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 21a7 7 0 0 1 14 0|M18 8v6|M21 11h-6') },
  { href: '/citas', label: 'Programacion de Consultas', icon: I('M8 2v4|M16 2v4|M3 10h18|M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z') },
  { href: '/hospitalizacion', label: 'Hospitalizacion', icon: I('M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6|M3 18h18|M7 10V7a1 1 0 0 1 1-1h3') },
  { href: '/farmacia', label: 'Farmacia', icon: I('M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z|M8.5 8.5l7 7') },
  { href: '/laboratorio', label: 'Laboratorio', icon: I('M9 2v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V2|M9 2h6|M7 14h10') },
];

const itemsBottom = [
  { href: '/notificaciones', label: 'Notificaciones', icon: I('M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 0 1-3.4 0') },
  { href: '/configuracion', label: 'Configuracion', icon: I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7') },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = getUsuario();

  const Item = (it: { href: string; label: string; icon: React.ReactNode }) => (
    <Link key={it.href} href={it.href} className={`navlink ${pathname === it.href ? 'active' : ''}`}>
      {it.icon}<span>{it.label}</span>
    </Link>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoFull compact />
        <div className="user">{usuario?.nombre || 'Usuario'}</div>
      </div>

      <nav className="nav">
        {items.map(Item)}
        <div className="sep" />
        {itemsBottom.map(Item)}
      </nav>

      <div className="sb-footer">
        <div className="avatar" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{usuario?.nombre || 'Usuario'}</div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: '.85rem' }}
          >
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
