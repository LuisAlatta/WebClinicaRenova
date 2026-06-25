#!/usr/bin/env bash
# Generador de archivos COMUNES de cada servicio (package.json, tsconfig, Dockerfile, index.ts).
# Las rutas (routes.ts) y README se personalizan por dominio aparte.
set -e
cd "$(dirname "$0")/.."
BASE="apps/services"

gen() {
  NAME="$1"; PORT="$2"; TITLE="$3"; EXTRA="$4"
  DIR="$BASE/$NAME"
  mkdir -p "$DIR/src"

  cat > "$DIR/package.json" <<EOF
{
  "name": "@renova/svc-$NAME",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "fastify": "^5.1.0",
    "@fastify/cors": "^10.0.1",
    "@fastify/swagger": "^9.2.0",
    "@fastify/swagger-ui": "^5.1.0",
    "@renova/db": "*",
    "@renova/auth-jwt": "*",
    "@renova/validacion": "*",
    "@renova/tipos": "*"$EXTRA
  },
  "devDependencies": {
    "tsx": "^4.16.2",
    "typescript": "^5.5.4"
  }
}
EOF

  cat > "$DIR/tsconfig.json" <<EOF
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
EOF

  cat > "$DIR/Dockerfile" <<EOF
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/$DIR
CMD ["npm", "run", "start"]
EOF

  cat > "$DIR/src/index.ts" <<EOF
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registrarRutas } from './routes.js';

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || $PORT);

await app.register(cors, { origin: true });
await app.register(swagger, {
  openapi: { info: { title: '$TITLE', version: '1.0.0', description: 'Servicio RENOVA' } },
});
await app.register(swaggerUi, { routePrefix: '/docs' });

app.get('/health', async () => ({ ok: true, servicio: '$NAME' }));

await registrarRutas(app);

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => app.log.info('$TITLE escuchando en :' + PORT))
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
EOF
  echo "  ok: $NAME"
}

echo "Generando servicios..."
gen auth            3001 "Auth Service"            ', "bcryptjs": "^2.4.3", "@types/bcryptjs": "^2.4.6"'
gen pacientes       3002 "Pacientes Service"        ''
gen citas           3003 "Citas Service"            ''
gen hospitalizacion 3004 "Hospitalizacion Service"  ''
gen farmacia        3005 "Farmacia Service"         ', "bullmq": "^5.12.0"'
gen laboratorio     3006 "Laboratorio Service"      ', "bullmq": "^5.12.0"'
gen facturacion     3007 "Facturacion Service"      ''
gen notificaciones  3008 "Notificaciones Service"   ', "bullmq": "^5.12.0"'
gen reportes        3009 "Reportes Service"         ', "bullmq": "^5.12.0"'
echo "Listo."
