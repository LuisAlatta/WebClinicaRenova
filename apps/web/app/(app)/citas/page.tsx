'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function CitasPage() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => { api('/api/citas').then((r: any) => setData(r.data || [])).catch(() => {}); }, []);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Programación de consultas y cirugías</h3>
      <p className="todo">
        TODO (Jose Carlos): implementar el formulario de programación con validación de disponibilidad
        (médico / consultorio / horario) y la lista de citas. Endpoint: <code>/api/citas</code>.
      </p>
      <pre style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
