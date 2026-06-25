import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
// import { query } from '@renova/db';

/**
 * FarmaciaService — POR IMPLEMENTAR.  Responsable sugerido: Sebastian Ticlavilca.
 * Cubre: ConsultaStockService, DespachoMedicamentoService, AlertaStockService.
 * Esquemas DB: farmacia.medicamentos, farmacia.lotes, farmacia.movimientos_stock, farmacia.despachos.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET /stock -> medicamentos con su stock total
  app.get('/stock', { preHandler: requireAuth() }, async () => {
    // TODO: SELECT m.*, SUM(l.cantidad) FROM medicamentos m LEFT JOIN lotes l ... GROUP BY m.id
    return { ok: true, data: [] };
  });

  // POST /despachos -> entregar medicamento (descuenta stock, registra movimiento EGRESO)
  app.post('/despachos', { preHandler: requireAuth(['MEDICO', 'ASISTENTE']) }, async (_req, reply) => {
    // TODO: validar stock suficiente -> INSERT despacho + movimiento -> si stock < minimo, publicar alerta
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // GET /alertas -> medicamentos bajo stock mínimo o lotes por vencer
  app.get('/alertas', { preHandler: requireAuth(['ADMIN']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // TODO: cola BullMQ "alertas-stock" -> publicar a notificaciones cuando se alcanza el mínimo.
}
