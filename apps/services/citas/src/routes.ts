import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
// import { query } from '@renova/db';

/**
 * CitasService — POR IMPLEMENTAR.  Responsable sugerido: Jose Carlos Ugarte.
 * Cubre: ProgramacionConsultaService, CancelarConsultaService, ProgramacionCirugiaService,
 *        ValidarDisponibilidadService (como helper interno).
 * Esquemas DB: citas.consultas, citas.cirugias, citas.bloqueos_agenda.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET /  -> listar consultas (puedes filtrar por fecha/medico)
  app.get('/', { preHandler: requireAuth() }, async () => {
    // TODO: SELECT * FROM citas.consultas ...
    return { ok: true, data: [] };
  });

  // GET /disponibilidad?recurso=&inicio=&fin=
  app.get('/disponibilidad', { preHandler: requireAuth() }, async (_req, reply) => {
    // TODO: validar que el médico/sala/consultorio esté libre en ese rango (citas.bloqueos_agenda)
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // POST /  -> programar consulta (validar disponibilidad antes de insertar)
  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (_req, reply) => {
    // TODO: 1) validar disponibilidad  2) INSERT consulta  3) publicar evento "cita.creada" (notificaciones)
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // PATCH /:id/cancelar
  app.patch('/:id/cancelar', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (_req, reply) => {
    // TODO: UPDATE estado='CANCELADO' y liberar recurso
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // POST /cirugias
  app.post('/cirugias', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (_req, reply) => {
    // TODO: validar sala + equipo + stock (llamar a farmacia) e INSERT en citas.cirugias
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });
}
