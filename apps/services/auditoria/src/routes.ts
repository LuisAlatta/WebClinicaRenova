import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
import { getMongo } from '@renova/db';

/**
 * AuditoriaService — consulta de la bitácora del sistema (colección Mongo `auditoria_logs`).
 * La ESCRITURA de logs la hace automáticamente el API Gateway en cada operación de escritura,
 * más los `auditar()` de dominio de cada servicio. Aquí solo se LEE (solo ADMIN).
 */

const LIMITE_DEFECTO = 25;
const LIMITE_MAX = 100;

export async function registrarRutas(app: FastifyInstance) {
  // GET /logs -> bitácora filtrable y paginada
  app.get('/logs', { preHandler: requireAuth(['ADMIN']) }, async (req) => {
    const {
      usuario, accion, recurso, metodo, desde, hasta, q,
      page = '1', limit = String(LIMITE_DEFECTO),
    } = req.query as Record<string, string>;

    const filtro: Record<string, unknown> = {};
    if (usuario) filtro.usuario = { $regex: usuario, $options: 'i' };
    if (accion) filtro.accion = accion;
    if (metodo) filtro.metodo = metodo;
    if (recurso) filtro.recurso = { $regex: recurso, $options: 'i' };

    if (desde || hasta) {
      const rango: Record<string, Date> = {};
      if (desde) rango.$gte = new Date(desde);
      if (hasta) {
        // incluir todo el día "hasta"
        const fin = new Date(hasta);
        fin.setHours(23, 59, 59, 999);
        rango.$lte = fin;
      }
      filtro.fecha = rango;
    }

    if (q) {
      const rx = { $regex: q, $options: 'i' };
      filtro.$or = [{ usuario: rx }, { recurso: rx }, { ruta: rx }, { accion: rx }, { detalle: rx }];
    }

    const pagina = Math.max(1, Number(page) || 1);
    const porPagina = Math.min(LIMITE_MAX, Math.max(1, Number(limit) || LIMITE_DEFECTO));

    const db = await getMongo();
    const col = db.collection('auditoria_logs');

    const [data, total] = await Promise.all([
      col.find(filtro).sort({ fecha: -1 }).skip((pagina - 1) * porPagina).limit(porPagina).toArray(),
      col.countDocuments(filtro),
    ]);

    return { ok: true, data, meta: { total, page: pagina, limit: porPagina } };
  });

  // GET /acciones -> lista de acciones distintas (para poblar filtros en el frontend)
  app.get('/acciones', { preHandler: requireAuth(['ADMIN']) }, async () => {
    const db = await getMongo();
    const acciones = await db.collection('auditoria_logs').distinct('accion');
    return { ok: true, data: acciones.filter(Boolean).sort() };
  });
}
