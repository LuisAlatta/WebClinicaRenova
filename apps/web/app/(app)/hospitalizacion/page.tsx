'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function HospitalizacionPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { api('/api/hospitalizacion').then((r: any) => setData(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Hospitalización</h3>
      <p className="todo">
        TODO (Jose Carlos): ingreso con asignación de cama, seguimiento diario (signos vitales) y egreso.
        Endpoint: <code>/api/hospitalizacion</code>.
      </p>
      <pre style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
