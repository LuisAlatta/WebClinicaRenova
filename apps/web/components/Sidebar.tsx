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

// roles omitido = visible para todos los roles autenticados.
// ADMIN siempre ve todo (ver `puedeVer`).
type NavItem = { href: string; label: string; icon: React.ReactNode; roles?: string[] };

const items: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: I('M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z') },
  { href: '/pacientes', label: 'Pacientes', roles: ['ASISTENTE'], icon: I('M9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 21a7 7 0 0 1 14 0|M18 8v6|M21 11h-6') },
  { href: '/citas', label: 'Programacion de Consultas', roles: ['ASISTENTE', 'MEDICO'], icon: I('M8 2v4|M16 2v4|M3 10h18|M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z') },
  { href: '/hospitalizacion', label: 'Hospitalizacion', roles: ['MEDICO', 'ASISTENTE'], icon: I('M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6|M3 18h18|M7 10V7a1 1 0 0 1 1-1h3') },
  { href: '/farmacia', label: 'Farmacia', roles: ['FARMACEUTICO', 'ASISTENTE', 'MEDICO'], icon: I('M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z|M8.5 8.5l7 7') },
  { href: '/laboratorio', label: 'Laboratorio', roles: ['LABORATORISTA', 'MEDICO'], icon: I('M9 2v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V2|M9 2h6|M7 14h10') },
  { href: '/facturacion', label: 'Facturación', roles: ['ASISTENTE'], icon: I('M6 2h9l3 3v17l-3-2-2 2-2-2-2 2-2-2-2 2V4a2 2 0 0 1 2-2z|M9 7h6|M9 11h6|M9 15h4') },
];

// roles: [] => solo ADMIN (ver `puedeVer`).
const itemUsuarios: NavItem = { href: '/usuarios', label: 'Usuarios', roles: [], icon: I('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75') };
const itemAuditoria: NavItem = { href: '/auditoria', label: 'Auditoría', roles: [], icon: I('M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z|M9 12h6|M9 16h4') };

const itemsBottom: NavItem[] = [
  { href: '/notificaciones', label: 'Notificaciones', icon: I('M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9|M13.7 21a2 2 0 0 1-3.4 0') },
  { href: '/configuracion', label: 'Configuracion', icon: I('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7') },
];

// Perfil visual por rol: etiqueta, color e icono representativo (avatar).
type Perfil = { label: string; color: string; icon: string };
const PERFILES: Record<string, Perfil> = {
  ADMIN: { label: 'Administrador', color: '#6d5ae6', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  MEDICO: { label: 'Médico', color: '#0ea5a3', icon: 'M3 12h4l2 5 4-12 2 7h6' },
  ASISTENTE: { label: 'Asistente', color: '#3b82f6', icon: 'M9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 21a7 7 0 0 1 14 0' },
  FARMACEUTICO: { label: 'Farmacéutico', color: '#f0a23b', icon: 'M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z|M8.5 8.5l7 7' },
  LABORATORISTA: { label: 'Laboratorista', color: '#8b5cf6', icon: 'M9 2v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V2|M9 2h6|M7 14h10' },
};
const PERFIL_DEFECTO: Perfil = { label: 'Usuario', color: '#8fb6e8', icon: 'M9 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M2 21a7 7 0 0 1 14 0' };

const AvatarRol = ({ perfil, size = 20 }: { perfil: Perfil; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {perfil.icon.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const usuario = getUsuario();

  const rol: string = usuario?.rol || '';
  const perfil = PERFILES[rol] || PERFIL_DEFECTO;
  const puedeVer = (it: NavItem) => !it.roles || rol === 'ADMIN' || it.roles.includes(rol);

  const Item = (it: NavItem) => (
    <Link key={it.href} href={it.href} className={`navlink ${pathname === it.href ? 'active' : ''}`}>
      {it.icon}<span>{it.label}</span>
    </Link>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <LogoFull compact />
        <div className="user">{usuario?.nombre || 'Usuario'}</div>
        {rol && <div className="user-rol" style={{ color: perfil.color }}>{perfil.label}</div>}
      </div>

      <nav className="nav">
        {items.filter(puedeVer).map(Item)}
        <div className="sep" />
        {puedeVer(itemUsuarios) && Item(itemUsuarios)}
        {puedeVer(itemAuditoria) && Item(itemAuditoria)}
        {itemsBottom.filter(puedeVer).map(Item)}
      </nav>

      <div className="sb-footer">
        <div className="avatar" style={{ background: perfil.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AvatarRol perfil={perfil} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{usuario?.nombre || 'Usuario'}</div>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: perfil.color, textTransform: 'uppercase', letterSpacing: '.3px' }}>{perfil.label}</div>
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
