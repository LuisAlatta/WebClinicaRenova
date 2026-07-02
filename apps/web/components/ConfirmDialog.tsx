'use client';
import { useState } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  /** Texto del botón de confirmación. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' para borrados/acciones irreversibles (por defecto), 'warn' o 'info'. */
  tone?: 'danger' | 'warn' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const IcoAlerta = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * Diálogo de confirmación para acciones destructivas o irreversibles.
 * Se usa SIEMPRE antes de borrar/anular/cerrar datos. Maneja estado de carga.
 */
export default function ConfirmDialog({
  open, title = '¿Estás seguro?', message,
  confirmLabel = 'Eliminar', cancelLabel = 'Cancelar',
  tone = 'danger', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const [procesando, setProcesando] = useState(false);

  async function confirmar() {
    try {
      setProcesando(true);
      await onConfirm();
    } finally {
      setProcesando(false);
    }
  }

  const btnCls = tone === 'info' ? 'btn' : 'btn btn-danger';

  return (
    <Modal
      open={open}
      onClose={procesando ? () => {} : onCancel}
      title={title}
      size="sm"
      icon={<span className={`modal-icon ${tone}`}><IcoAlerta /></span>}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel} disabled={procesando}>{cancelLabel}</button>
          <button className={btnCls} onClick={confirmar} disabled={procesando}>
            {procesando ? 'Procesando…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text)', fontSize: '.95rem', lineHeight: 1.5 }}>{message}</p>
    </Modal>
  );
}
