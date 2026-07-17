'use client';
import { useCallback, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

interface OpcionesConfirm {
  title?: string;
  message: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warn' | 'info';
}

type Pendiente = OpcionesConfirm & { onOk: () => void | Promise<void> };

/**
 * Hook reutilizable para pedir confirmación antes de una acción importante.
 * Uso:
 *   const { confirmar, ConfirmUI } = useConfirm();
 *   confirmar({ message: '¿Registrar?', confirmLabel: 'Sí, registrar' }, () => hacerAlgo());
 *   ...  return (<> ... {ConfirmUI} </>);
 */
export function useConfirm() {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const confirmar = useCallback((opts: OpcionesConfirm, onOk: () => void | Promise<void>) => {
    setPendiente({ ...opts, onOk });
  }, []);

  const ConfirmUI = (
    <ConfirmDialog
      open={!!pendiente}
      title={pendiente?.title || '¿Confirmar acción?'}
      message={pendiente?.message || ''}
      confirmLabel={pendiente?.confirmLabel || 'Confirmar'}
      tone={pendiente?.tone || 'info'}
      onConfirm={async () => { await pendiente?.onOk(); setPendiente(null); }}
      onCancel={() => setPendiente(null)}
    />
  );

  return { confirmar, ConfirmUI };
}
