import { Queue, Worker, type Processor } from 'bullmq';

/**
 * Cola de eventos asíncronos (BullMQ sobre Redis).
 * Los servicios publican mensajes (notificaciones) y el notificaciones-service los consume.
 */
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

export const COLA_NOTIFICACIONES = 'notificaciones';

export interface Notificacion {
  canal: 'email' | 'sms' | 'whatsapp';
  destino: string;
  asunto: string;
  mensaje: string;
  tipo?: string; // bienvenida | cita | resultado | alerta | comprobante
}

let cola: Queue | null = null;
function getCola(): Queue {
  if (!cola) cola = new Queue(COLA_NOTIFICACIONES, { connection });
  return cola;
}

/** Publica una notificación. Best-effort: si Redis no está, no rompe el flujo principal. */
export async function publicarNotificacion(n: Notificacion): Promise<void> {
  try {
    await getCola().add('enviar', n, { removeOnComplete: true, attempts: 3 });
  } catch (e) {
    console.warn('[eventos] no se pudo publicar la notificación:', (e as Error).message);
  }
}

/** Crea un Worker que procesa la cola de notificaciones. */
export function crearWorkerNotificaciones(handler: Processor<Notificacion>): Worker {
  return new Worker(COLA_NOTIFICACIONES, handler, { connection });
}
