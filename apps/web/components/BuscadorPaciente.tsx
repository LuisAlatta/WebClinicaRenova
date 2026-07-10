'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export interface PacienteLite {
  id: string;
  dni: string;
  tipo_documento?: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  email?: string;
}

interface BuscadorPacienteProps {
  onSelect: (paciente: PacienteLite) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/**
 * Búsqueda de paciente por DNI/nombre con botón y sugerencias en vivo.
 * Reemplaza al listado completo <select> para soportar grandes volúmenes de data.
 */
export default function BuscadorPaciente({ onSelect, placeholder, autoFocus }: BuscadorPacienteProps) {
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState<PacienteLite[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autocompletado con debounce (sugerencias mientras se escribe).
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (texto.trim().length < 2) { setSugerencias([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await api(`/api/pacientes?q=${encodeURIComponent(texto.trim())}`);
        setSugerencias(r.data || []);
        setAbierto(true);
      } catch { /* silencioso: el usuario puede usar el botón Buscar */ }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [texto]);

  function elegir(p: PacienteLite) {
    onSelect(p);
    setTexto(`${p.nombres} ${p.apellidos} — ${p.dni}`);
    setAbierto(false);
    setError('');
  }

  // Botón Buscar: intenta match exacto por DNI y, si no, deja las sugerencias.
  async function buscar() {
    const q = texto.trim();
    if (!q) return;
    setBuscando(true); setError('');
    try {
      const exacto = await api(`/api/pacientes?dni=${encodeURIComponent(q)}`);
      if (exacto.data?.length === 1) { elegir(exacto.data[0]); return; }
      const r = await api(`/api/pacientes?q=${encodeURIComponent(q)}`);
      setSugerencias(r.data || []);
      setAbierto(true);
      if (!r.data?.length) setError('Sin coincidencias. Verifica el documento o el nombre.');
    } catch (e: any) {
      setError(e.message || 'No se pudo buscar');
    } finally { setBuscando(false); }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <input
          className="input"
          style={{ flex: 1 }}
          value={texto}
          autoFocus={autoFocus}
          placeholder={placeholder || 'Buscar por DNI o nombre…'}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => sugerencias.length && setAbierto(true)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscar())}
        />
        <button className="btn btn-secondary" type="button" onClick={buscar} disabled={buscando}>
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: '.35rem' }}>{error}</div>}

      {abierto && sugerencias.length > 0 && (
        <div
          style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: 'var(--shadow)', maxHeight: 240, overflowY: 'auto',
          }}
        >
          {sugerencias.map((p) => (
            <div
              key={p.id}
              onClick={() => elegir(p)}
              style={{ padding: '.6rem .8rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <strong>{p.nombres} {p.apellidos}</strong>
              <span style={{ color: 'var(--muted)', marginLeft: 8, fontSize: '.82rem' }}>
                {p.tipo_documento || 'DNI'}: {p.dni}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
