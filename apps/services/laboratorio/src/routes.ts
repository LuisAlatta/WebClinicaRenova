import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
// import { query, getMongo } from '@renova/db';

/**
 * LaboratorioService — POR IMPLEMENTAR (incluye flujo ASÍNCRONO).  Responsable sugerido: Yordy Neyra.
 * Cubre: SolicitudExamenService, RecepcionResultadoService.
 * Esquemas DB: laboratorio.solicitudes_examen, laboratorio.resultados.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET /examenes -> solicitudes (filtrables por paciente/estado)
  app.get('/examenes', { preHandler: requireAuth() }, async () => {
    // TODO: SELECT * FROM laboratorio.solicitudes_examen ...
    return { ok: true, data: [] };
  });

  // POST /examenes -> el médico solicita un examen
  app.post('/examenes', { preHandler: requireAuth(['MEDICO']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // POST /resultados -> ASÍNCRONO: el laboratorio externo envía el resultado (callback)
  app.post('/resultados', async (_req, reply) => {
    // TODO: 1) INSERT resultado  2) UPDATE solicitud='FINALIZADO'
    //       3) integrar a la HISTORIA CLÍNICA en Mongo  4) publicar evento "resultado.listo"
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });
}
