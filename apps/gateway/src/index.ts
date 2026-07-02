import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';
import { getMongo } from '@renova/db';

/**
 * API Gateway — punto de entrada único del sistema RENOVA.
 * Centraliza: CORS, rate-limit, enrutamiento y AUDITORÍA automática de escrituras.
 * La autenticación JWT/RBAC se aplica en cada servicio vía @renova/auth-jwt (lógica compartida).
 */
const app = Fastify({ logger: true });
const PORT = Number(process.env.GATEWAY_PORT || 4000);

await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

// Mapa de rutas -> servicio destino
const rutas: Record<string, string | undefined> = {
  '/api/auth': process.env.AUTH_URL || 'http://localhost:3001',
  '/api/pacientes': process.env.PACIENTES_URL || 'http://localhost:3002',
  '/api/citas': process.env.CITAS_URL || 'http://localhost:3003',
  '/api/hospitalizacion': process.env.HOSPITALIZACION_URL || 'http://localhost:3004',
  '/api/farmacia': process.env.FARMACIA_URL || 'http://localhost:3005',
  '/api/laboratorio': process.env.LABORATORIO_URL || 'http://localhost:3006',
  '/api/facturacion': process.env.FACTURACION_URL || 'http://localhost:3007',
  '/api/notificaciones': process.env.NOTIFICACIONES_URL || 'http://localhost:3008',
  '/api/reportes': process.env.REPORTES_URL || 'http://localhost:3009',
  '/api/auditoria': process.env.AUDITORIA_URL || 'http://localhost:3010',
};

// ===================== AUDITORÍA AUTOMÁTICA =====================
// Cada operación de escritura que pasa por el gateway se registra en `auditoria_logs`.
// Es best-effort: si Mongo falla, no rompe la petición del usuario.
const METODOS_ESCRITURA = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ACCION_POR_METODO: Record<string, string> = { POST: 'CREAR', PUT: 'ACTUALIZAR', PATCH: 'ACTUALIZAR', DELETE: 'ELIMINAR' };

/** Extrae usuario y rol del JWT (solo decodifica el payload; el servicio destino ya lo verifica). */
function usuarioDeToken(auth?: string): { usuario: string; rol: string | null } {
  if (!auth || !auth.startsWith('Bearer ')) return { usuario: 'anónimo', rol: null };
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7).split('.')[1], 'base64').toString('utf8'));
    return { usuario: payload.email || payload.sub || 'desconocido', rol: payload.rol || null };
  } catch {
    return { usuario: 'desconocido', rol: null };
  }
}

/** '/api/pacientes/123' -> 'pacientes' (el dominio auditado). */
function recursoDeRuta(url: string): string {
  const limpia = url.split('?')[0].replace(/^\/api\//, '');
  return limpia.split('/')[0] || 'sistema';
}

app.addHook('onResponse', async (req, reply) => {
  if (!METODOS_ESCRITURA.has(req.method)) return;
  if (!req.url.startsWith('/api/')) return;
  if (req.url.startsWith('/api/auth/login') || req.url.startsWith('/api/auth/refresh')) return; // ruido/credenciales
  try {
    const { usuario, rol } = usuarioDeToken(req.headers.authorization);
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({
      fecha: new Date(),
      usuario,
      rol,
      accion: ACCION_POR_METODO[req.method] || req.method,
      metodo: req.method,
      recurso: recursoDeRuta(req.url),
      ruta: req.url.split('?')[0],
      estado: reply.statusCode,
      exito: reply.statusCode < 400,
      ip: req.ip,
      origen: 'gateway',
    });
  } catch (e) {
    req.log.warn('auditoría no registrada: ' + (e as Error).message);
  }
});

for (const [prefix, upstream] of Object.entries(rutas)) {
  await app.register(proxy, {
    upstream: upstream!,
    prefix,            // /api/pacientes/*  ->  servicio pacientes /*
    rewritePrefix: '',
    http2: false,
  });
}

app.get('/health', async () => ({ ok: true, gateway: true, rutas: Object.keys(rutas) }));

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info('API Gateway en :' + PORT))
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
