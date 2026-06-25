import pg from 'pg';
import { MongoClient, Db } from 'mongodb';
import Redis from 'ioredis';

const { Pool } = pg;

/**
 * Pool de PostgreSQL compartido. Cada servicio lo importa y consulta su esquema.
 * Uso:  const { rows } = await pgPool.query('SELECT * FROM pacientes.pacientes');
 */
export const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'renova',
  password: process.env.POSTGRES_PASSWORD || 'renova123',
  database: process.env.POSTGRES_DB || 'renova',
  max: 10,
});

/** Helper corto para queries parametrizadas (previene SQL injection). */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await pgPool.query(text, params);
  return res.rows as T[];
}

/** Cliente Mongo (historias clínicas / auditoría). Lazy singleton. */
let mongoDb: Db | null = null;
export async function getMongo(): Promise<Db> {
  if (mongoDb) return mongoDb;
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
  await client.connect();
  mongoDb = client.db(process.env.MONGO_DB || 'renova');
  return mongoDb;
}

/** Cliente Redis (cola async / rate-limit). */
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  lazyConnect: true,
  maxRetriesPerRequest: null,
});
