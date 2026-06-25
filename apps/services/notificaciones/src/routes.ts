import type { FastifyInstance } from 'fastify';
// import { Queue, Worker } from 'bullmq';

/**
 * NotificacionesService — POR IMPLEMENTAR (ASÍNCRONO).  Responsable sugerido: Sebastian Ticlavilca.
 * Cubre: EnvioNotificacionService.
 * Patrón: consumidor de una cola BullMQ (Redis). Otros servicios publican mensajes
 *         (cita.creada, resultado.listo, alerta.stock) y aquí se "envían" (email/SMS/WhatsApp simulado).
 */
export async function registrarRutas(app: FastifyInstance) {
  // POST /enviar -> encolar una notificación manual (para pruebas)
  app.post('/enviar', async (_req, reply) => {
    // TODO: añadir job a la cola "notificaciones" (BullMQ)
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // GET /historial -> notificaciones enviadas (puedes guardarlas en Mongo)
  app.get('/historial', async () => ({ ok: true, data: [] }));

  // TODO: iniciar un Worker BullMQ que procese la cola y "envíe" (console.log / nodemailer simulado).
}
