import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registrarRutas } from './routes.js';

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 3003);

await app.register(cors, { origin: true });
await app.register(swagger, {
  openapi: { info: { title: 'Citas Service', version: '1.0.0', description: 'Servicio RENOVA' } },
});
await app.register(swaggerUi, { routePrefix: '/docs' });

app.get('/health', async () => ({ ok: true, servicio: 'citas' }));

await registrarRutas(app);

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info('Citas Service escuchando en :' + PORT))
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
