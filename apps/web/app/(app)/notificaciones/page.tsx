'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';

export default function NotificacionesPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { api('/api/notificaciones/historial').then((r: any) => setData(r.data || [])).catch(() => {}); }, []);

  return (
    <>
      <PageHeader title="Notificaciones" />
      <div className="card table-card">
        <table>
          <thead><tr><th>Canal</th><th>Destino</th><th>Asunto</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>
            {data.map((n, i) => (
              <tr key={i}>
                <td>{n.canal}</td><td>{n.destino}</td><td>{n.asunto}</td>
                <td>{n.tipo || '—'}</td><td><span className="badge ok">{n.estado || 'ENVIADA'}</span></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Aún no hay notificaciones</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
