import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import proxy from '@fastify/http-proxy';

/**
 * API Gateway — punto de entrada único del sistema RENOVA.
 * Centraliza: CORS, rate-limit y enrutamiento hacia cada servicio de dominio.
 * La autenticación JWT/RBAC se aplica en cada servicio vía @renova/auth-jwt (lógica compartida).
 */
const app = Fastify({ logger: true });
const PORT = Number(process.env.GATEWAY_PORT || 8080);

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
};

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
