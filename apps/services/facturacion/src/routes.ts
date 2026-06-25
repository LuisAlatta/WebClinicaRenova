import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
// import { query } from '@renova/db';

/**
 * FacturacionService — POR IMPLEMENTAR.  Responsable sugerido: Sebastian Ticlavilca.
 * Cubre: GenerarFacturaService, RegistroPagoService.
 * Esquemas DB: facturacion.facturas, facturacion.detalle_factura, facturacion.pagos.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET / -> facturas
  app.get('/', { preHandler: requireAuth() }, async () => {
    // TODO: SELECT * FROM facturacion.facturas ...
    return { ok: true, data: [] };
  });

  // POST / -> generar factura (consolida servicios/medicamentos, calcula IGV 18%)
  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (_req, reply) => {
    // TODO: subtotal = SUM(detalle.importe); igv = subtotal*0.18; total = subtotal+igv
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // POST /:id/pagos -> registrar pago (soporta pagos parciales -> estado PAGADO al completar)
  app.post('/:id/pagos', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });
}
