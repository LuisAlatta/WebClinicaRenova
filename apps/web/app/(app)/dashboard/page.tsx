'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<any>({});

  useEffect(() => {
    api('/api/reportes/dashboard')
      .then((r: any) => setKpis(r.data || {}))
      .catch(() => setKpis({}));
  }, []);

  const cards = [
    { l: 'Pacientes', n: kpis.totalPacientes ?? '—' },
    { l: 'Citas hoy', n: kpis.citasHoy ?? '—' },
    { l: 'Internados', n: kpis.internadosActivos ?? '—' },
    { l: 'Ingresos del mes', n: kpis.ingresosMes ?? '—' },
    { l: 'Alertas de stock', n: kpis.alertasStock ?? '—' },
  ];

  return (
    <>
      <div className="grid kpis">
        {cards.map((c) => (
          <div key={c.l} className="card kpi">
            <div className="n">{c.n}</div>
            <div className="l">{c.l}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h3 style={{ marginTop: 0 }}>Reportes y estadísticas</h3>
        <p className="todo">
          TODO (Reportes): conectar <code>GET /api/reportes/dashboard</code> con datos reales y agregar gráficos
          (ocupación, ingresos por mes, citas por especialidad).
        </p>
      </div>
    </>
  );
}
