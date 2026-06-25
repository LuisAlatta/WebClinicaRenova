'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function LaboratorioPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { api('/api/laboratorio/examenes').then((r: any) => setData(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Laboratorio</h3>
      <p className="todo">
        TODO (Yordy): solicitud de exámenes y recepción ASÍNCRONA de resultados con integración a la
        historia clínica. Endpoint: <code>/api/laboratorio/examenes</code>.
      </p>
      <pre style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
