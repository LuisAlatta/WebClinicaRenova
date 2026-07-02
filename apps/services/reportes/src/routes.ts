import type { FastifyInstance } from 'fastify';
import { query } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';

/**
 * ReportesService — indicadores gerenciales (solo lectura sobre varios dominios).
 * Alimenta el Dashboard del mockup (estatus de pacientes, inventario, ingresos, etc.).
 */
export async function registrarRutas(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: requireAuth() }, async () => {
    const n = async (sql: string) => {
      try { const r = await query<{ n: string }>(sql); return Number(r[0]?.n ?? 0); }
      catch { return 0; }
    };

    const [totalPacientes, totalMedicos, medicamentosDisponibles, citasHoy, internadosActivos, boletasGeneradas, ventaMes] =
      await Promise.all([
        n('SELECT COUNT(*)::int n FROM pacientes.pacientes'),
        n('SELECT COUNT(*)::int n FROM maestras.medicos WHERE activo'),
        n('SELECT COUNT(*)::int n FROM farmacia.medicamentos WHERE activo'),
        n("SELECT COUNT(*)::int n FROM citas.consultas WHERE fecha_hora::date = CURRENT_DATE"),
        n("SELECT COUNT(*)::int n FROM hospitalizacion.internamientos WHERE estado='EN_PROCESO'"),
        n('SELECT COUNT(*)::int n FROM facturacion.facturas'),
        n("SELECT COALESCE(SUM(total),0)::int n FROM facturacion.facturas WHERE estado='PAGADO' AND date_trunc('month',emitida_en)=date_trunc('month',CURRENT_DATE)"),
      ]);

    let estatusPacientes: { status: string; pacientes: number }[] = [];
    try {
      const rows = await query<{ estado: string; n: string }>(
        'SELECT estado, COUNT(*)::int n FROM citas.consultas GROUP BY estado',
      );
      const map: Record<string, string> = { PROGRAMADO: 'En espera', EN_PROCESO: 'En proceso', FINALIZADO: 'Terminado' };
      estatusPacientes = rows
        .filter((r) => map[r.estado])
        .map((r) => ({ status: map[r.estado], pacientes: Number(r.n) }));
    } catch { /* sin datos */ }

    return {
      ok: true,
      data: {
        totalPacientes, totalMedicos, medicamentosDisponibles, citasHoy,
        internadosActivos, boletasGeneradas, ventaMes, estatusPacientes,
      },
    };
  });

  app.get('/ocupacion', { preHandler: requireAuth(['ADMIN', 'AUDITOR']) }, async () => {
    const get = async (sql: string) => { try { const r = await query<{ n: string }>(sql); return Number(r[0]?.n ?? 0); } catch { return 0; } };
    const total = await get('SELECT COUNT(*)::int n FROM hospitalizacion.camas');
    const ocupadas = await get('SELECT COUNT(*)::int n FROM hospitalizacion.camas WHERE ocupada');
    return { ok: true, data: { total, ocupadas, libres: total - ocupadas } };
  });

  app.get('/ingresos', { preHandler: requireAuth(['ADMIN', 'AUDITOR']) }, async (req) => {
    const { desde, hasta } = req.query as { desde?: string; hasta?: string };
    try {
      const rows = await query(
        `SELECT date_trunc('day', emitida_en)::date AS dia, COALESCE(SUM(total),0) AS total
           FROM facturacion.facturas
          WHERE ($1::date IS NULL OR emitida_en >= $1) AND ($2::date IS NULL OR emitida_en <= $2)
          GROUP BY 1 ORDER BY 1`,
        [desde ?? null, hasta ?? null],
      );
      return { ok: true, data: rows };
    } catch { return { ok: true, data: [] }; }
  });
}
