'use client';
import { getUsuario } from '../lib/api';

export default function PageHeader({ title }: { title: string }) {
  const usuario = getUsuario();
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h1 className="page-title">{title}</h1>
      <p className="page-sub">Buen día, {usuario?.nombre || 'Usuario'}</p>
    </div>
  );
}
