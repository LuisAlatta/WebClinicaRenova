'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '../lib/api';

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pacientes', label: 'Pacientes' },
  { href: '/citas', label: 'Citas y Cirugías' },
  { href: '/hospitalizacion', label: 'Hospitalización' },
  { href: '/farmacia', label: 'Farmacia' },
  { href: '/laboratorio', label: 'Laboratorio' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="sidebar">
      <div className="brand">RENOVA<span>+</span></div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', flex: 1 }}>
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={`navlink ${pathname === it.href ? 'active' : ''}`}>
            {it.label}
          </Link>
        ))}
      </nav>
      <button
        className="navlink"
        style={{ background: 'rgba(0,0,0,.15)', border: 0, cursor: 'pointer', textAlign: 'left' }}
        onClick={() => { logout(); router.push('/login'); }}
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
