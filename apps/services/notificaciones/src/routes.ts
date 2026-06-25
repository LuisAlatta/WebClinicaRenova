import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
import { getMongo } from '@renova/db';
import { crearWorkerNotificaciones, publicarNotificacion, type Notificacion } from '@renova/eventos';

/**
 * NotificacionesService — consumidor ASÍNCRONO de la cola (BullMQ/Redis).
 * Los demás servicios publican (cita, resultado, alerta, bienvenida, comprobante)
 * y aquí se "envían" (simulado) y se guarda el historial en Mongo.
 */
export async function registrarRutas(app: FastifyInstance) {
  // Worker que procesa la cola en segundo plano
  try {
    const worker = crearWorkerNotificaciones(async (job) => {
      const n = job.data as Notificacion;
      app.log.info(`📨 Notificación [${n.canal}] -> ${n.destino} | ${n.asunto}`);
      try {
        const db = await getMongo();
        await db.collection('notificaciones').insertOne({ ...n, enviada_en: new Date(), estado: 'ENVIADA' });
      } catch { /* historial best-effort */ }
    });
    worker.on('failed', (job, err) => app.log.error(`Notificación fallida: ${err.message}`));
  } catch (e) {
    app.log.warn('No se pudo iniciar el worker de notificaciones (¿Redis arriba?)');
  }

  // Historial de notificaciones enviadas
  app.get('/historial', { preHandler: requireAuth() }, async () => {
    try {
      const db = await getMongo();
      const data = await db.collection('notificaciones').find().sort({ enviada_en: -1 }).limit(100).toArray();
      return { ok: true, data };
    } catch {
      return { ok: true, data: [] };
    }
  });

  // Enviar/encolar una notificación manual (pruebas)
  app.post('/enviar', { preHandler: requireAuth(['ADMIN']) }, async (req, reply) => {
    const b = req.body as Notificacion;
    if (!b?.destino || !b?.mensaje) return reply.code(422).send({ ok: false, error: 'destino y mensaje son requeridos' });
    await publicarNotificacion({ canal: b.canal || 'email', destino: b.destino, asunto: b.asunto || 'Notificación', mensaje: b.mensaje, tipo: b.tipo });
    return reply.code(202).send({ ok: true, data: 'encolada' });
  });
}
