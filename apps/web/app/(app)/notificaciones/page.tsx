'use client';
import PageHeader from '../../../components/PageHeader';

export default function NotificacionesPage() {
  return (
    <>
      <PageHeader title="Notificaciones" />
      <div className="card">
        <p style={{ color: 'var(--muted)', margin: 0 }}>Aún no hay notificaciones.</p>
      </div>
    </>
  );
}
