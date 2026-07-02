'use client';
import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Botones del pie. Si se omite, no se muestra el pie. */
  footer?: ReactNode;
  /** Ícono a la izquierda del título (confirmaciones). */
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Modal base del sistema de diseño RENOVA.
 * Cierra con Escape, clic en el fondo o el botón ✕. Estilos en globals.css (.modal-*).
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, icon, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeCls = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : '';

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-card ${sizeCls}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          {icon}
          <div className="modal-titles">
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
