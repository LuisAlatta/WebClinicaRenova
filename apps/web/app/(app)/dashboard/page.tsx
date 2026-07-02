'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import PageHeader from '../../../components/PageHeader';

const COLORS = ['#4f7cf7', '#f0a23b', '#9aa3b2'];

function Donut({ data }: { data: { status: string; pacientes: number }[] }) {
  const total = data.reduce((s, d) => s + d.pacientes, 0) || 1;
  let acc = 0;
  const R = 60, C = 2 * Math.PI * R;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        <g transform="translate(80,80) rotate(-90)">
          <circle r={R} fill="none" stroke="#eef1f6" strokeWidth="22" />
          {data.map((d, i) => {
            const frac = d.pacientes / total;
            const seg = (
              <circle key={i} r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="22"
                strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} />
            );
            acc += frac;
            return seg;
          })}
        </g>
      </svg>
      <div>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem', fontSize: '.9rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
            {d.status} · <strong>{d.pacientes}</strong>
          </div>
        ))}
        {data.length === 0 && <span style={{ color: 'var(--muted)' }}>Sin datos</span>}
      </div>
    </div>
  );
}

function InfoCard({ titulo, a, b }: { titulo: string; a: [string, React.ReactNode]; b: [string, React.ReactNode] }) {
  return (
    <div className="card">
      <h4 style={{ margin: '0 0 1rem', color: 'var(--navy)' }}>{titulo}</h4>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div><div className="n" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)' }}>{a[1]}</div><div className="l" style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{a[0]}</div></div>
        <div><div className="n" style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)' }}>{b[1]}</div><div className="l" style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{b[0]}</div></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState<any>({ estatusPacientes: [] });
  useEffect(() => { api('/api/reportes/dashboard').then((r: any) => setD(r.data || {})).catch(() => {}); }, []);

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', marginBottom: '1.25rem' }}>
        <div className="card">
          <h4 style={{ margin: '0 0 1rem', color: 'var(--navy)' }}>Estatus de pacientes</h4>
          <table>
            <thead><tr><th>N°</th><th>Estado</th><th>Pacientes</th></tr></thead>
            <tbody>
              {(d.estatusPacientes || []).map((e: any, i: number) => (
                <tr key={i}><td>{i + 1}</td><td>{e.status}</td><td>{e.pacientes}</td></tr>
              ))}
              {(!d.estatusPacientes || d.estatusPacientes.length === 0) && <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Donut data={d.estatusPacientes || []} />
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <InfoCard titulo="Inventario" a={['Total medicinas disponibles', d.medicamentosDisponibles ?? '—']} b={['Citas hoy', d.citasHoy ?? '—']} />
        <InfoCard titulo="Pacientes y médicos" a={['Total de pacientes', d.totalPacientes ?? '—']} b={['Total de médicos', d.totalMedicos ?? '—']} />
        <InfoCard titulo="Hospitalización" a={['Internados activos', d.internadosActivos ?? '—']} b={['Boletas/facturas', d.boletasGeneradas ?? '—']} />
        <InfoCard titulo="Informe rápido" a={['Venta del mes', `S/ ${d.ventaMes ?? 0}`]} b={['Comprobantes', d.boletasGeneradas ?? '—']} />
      </div>
    </>
  );
}
