'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function FarmaciaPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { api('/api/farmacia/stock').then((r: any) => setData(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Farmacia · Control de stock</h3>
      <p className="todo">
        TODO (Sebastian): tabla de stock en tiempo real, despacho de medicamentos y alertas de stock mínimo.
        Endpoint: <code>/api/farmacia/stock</code>.
      </p>
      <pre style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
