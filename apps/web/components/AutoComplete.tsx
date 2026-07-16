'use client';
import { useEffect, useRef, useState } from 'react';

interface AutoCompleteProps<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T | null) => void;
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  /** Id preseleccionado desde el padre (ej. al hacer clic en "Despachar" de una fila). */
  selectedId?: string;
}

/**
 * Autocompletado genérico sobre una lista ya cargada en memoria.
 *  - Al enfocar: despliega TODOS los elementos.
 *  - Al escribir: filtra por la etiqueta (coincidencia por texto).
 * Reutilizable para médicos, medicamentos, etc. (mismo patrón que BuscadorPaciente).
 */
export default function AutoComplete<T>({
  items, getId, getLabel, onSelect, placeholder, disabled, emptyText, selectedId,
}: AutoCompleteProps<T>) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const elegido = useRef(false);

  // Sincroniza el texto cuando el padre preselecciona un id (o cuando llegan los items).
  useEffect(() => {
    if (!selectedId) return;
    const it = items.find((i) => getId(i) === selectedId);
    if (it) { setTexto(getLabel(it)); elegido.current = true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, items.length]);

  const q = texto.trim().toLowerCase();
  const filtradas = elegido.current || q === ''
    ? items
    : items.filter((it) => getLabel(it).toLowerCase().includes(q));

  function elegir(it: T) {
    onSelect(it);
    elegido.current = true;
    setTexto(getLabel(it));
    setAbierto(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input"
        style={{ width: '100%' }}
        value={texto}
        disabled={disabled}
        placeholder={placeholder || 'Escribe o elige…'}
        onChange={(e) => { elegido.current = false; setTexto(e.target.value); onSelect(null); setAbierto(true); }}
        onFocus={() => !disabled && setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
      />

      {abierto && !disabled && (
        <div
          style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: 'var(--shadow)', maxHeight: 260, overflowY: 'auto',
          }}
        >
          {filtradas.length > 0 ? (
            filtradas.slice(0, 100).map((it) => (
              <div
                key={getId(it)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(it)}
                style={{ padding: '.6rem .8rem', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              >
                {getLabel(it)}
              </div>
            ))
          ) : (
            <div style={{ padding: '.6rem .8rem', color: 'var(--muted)', fontSize: '.85rem' }}>
              {emptyText || 'Sin coincidencias'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
