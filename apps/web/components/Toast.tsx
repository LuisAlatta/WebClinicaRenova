'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastTipo = 'ok' | 'err' | 'info';
interface ToastItem { id: number; tipo: ToastTipo; titulo: string; mensaje?: string; }

interface ToastApi {
  ok: (titulo: string, mensaje?: string) => void;
  error: (titulo: string, mensaje?: string) => void;
  info: (titulo: string, mensaje?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Hook para lanzar notificaciones coherentes desde cualquier módulo. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

const DURACION = 4200;

const Iconos: Record<ToastTipo, ReactNode> = {
  ok: (
    <svg className="toast-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  err: (
    <svg className="toast-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg className="toast-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const TITULO_DEFECTO: Record<ToastTipo, string> = { ok: 'Listo', err: 'Error', info: 'Aviso' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const quitar = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), []);

  const push = useCallback((tipo: ToastTipo, titulo: string, mensaje?: string) => {
    // id monotónico sin Date.now(): basta un contador incremental por render
    const id = Math.floor(performance.now() * 1000) + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, tipo, titulo, mensaje }]);
    setTimeout(() => quitar(id), DURACION);
  }, [quitar]);

  const api: ToastApi = {
    ok: (t, m) => push('ok', t, m),
    error: (t, m) => push('err', t, m),
    info: (t, m) => push('info', t, m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tipo}`} role="status">
            {Iconos[t.tipo]}
            <div className="toast-body">
              <div className="toast-title">{t.titulo || TITULO_DEFECTO[t.tipo]}</div>
              {t.mensaje && <div className="toast-msg">{t.mensaje}</div>}
            </div>
            <button className="toast-x" onClick={() => quitar(t.id)} aria-label="Cerrar">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
