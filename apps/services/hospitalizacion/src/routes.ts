import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
// import { query } from '@renova/db';

/**
 * HospitalizacionService — POR IMPLEMENTAR.  Responsable sugerido: Jose Carlos Ugarte.
 * Cubre: IngresoHospitalizacionService, SeguimientoPacienteService, EgresoHospitalizacionService.
 * Esquemas DB: hospitalizacion.internamientos, hospitalizacion.seguimientos, hospitalizacion.camas.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET / -> internamientos activos
  app.get('/', { preHandler: requireAuth() }, async () => {
    // TODO: SELECT * FROM hospitalizacion.internamientos WHERE estado='EN_PROCESO'
    return { ok: true, data: [] };
  });

  // POST / -> registrar ingreso (asignar cama libre + marcar cama ocupada)
  app.post('/', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // POST /:id/seguimiento -> registrar signos vitales / observaciones del día
  app.post('/:id/seguimiento', { preHandler: requireAuth(['MEDICO']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // PATCH /:id/egreso -> alta del paciente + liberar cama + generar resumen
  app.patch('/:id/egreso', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (_req, reply) => {
    // TODO: al egresar, opcionalmente disparar facturación (GenerarFacturaService)
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });
}
