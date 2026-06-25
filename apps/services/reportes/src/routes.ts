import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
// import { query } from '@renova/db';

/**
 * ReportesService — POR IMPLEMENTAR.  Responsable sugerido: Sebastian Ticlavilca (apoyo Luis).
 * Cubre: GenerarReporteService, DashboardEstadisticaService.
 * Lee (solo lectura) de varios esquemas para construir indicadores.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET /dashboard -> KPIs para la pantalla principal
  app.get('/dashboard', { preHandler: requireAuth() }, async () => {
    // TODO: devolver { totalPacientes, citasHoy, internadosActivos, ingresosMes, alertasStock }
    return {
      ok: true,
      data: { totalPacientes: 0, citasHoy: 0, internadosActivos: 0, ingresosMes: 0, alertasStock: 0 },
    };
  });

  // GET /ocupacion -> ocupación hospitalaria (camas usadas/total)
  app.get('/ocupacion', { preHandler: requireAuth(['ADMIN']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });

  // GET /ingresos?desde=&hasta= -> ingresos económicos por rango
  app.get('/ingresos', { preHandler: requireAuth(['ADMIN']) }, async (_req, reply) => {
    return reply.code(501).send({ ok: false, error: 'No implementado todavía' });
  });
}
