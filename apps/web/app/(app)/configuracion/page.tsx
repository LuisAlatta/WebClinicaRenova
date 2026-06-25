'use client';
import PageHeader from '../../../components/PageHeader';

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader title="Configuración" />
      <div className="card">
        <p style={{ color: 'var(--muted)', margin: 0 }}>Opciones de configuración del sistema.</p>
      </div>
    </>
  );
}
