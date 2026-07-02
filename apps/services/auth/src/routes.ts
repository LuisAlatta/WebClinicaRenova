import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { query, getMongo } from '@renova/db';
import { firmarToken, firmarRefresh, requireAuth, type JwtPayload } from '@renova/auth-jwt';

/**
 * AuthService — IMPLEMENTADO (sirve de referencia para los demás servicios).
 * Cubre: AutenticacionService, AutorizacionRBACService (vía requireAuth), RegistroAuditoriaService.
 */
export async function registrarRutas(app: FastifyInstance) {
  // ---- LOGIN ----
  app.post('/login', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string' }, password: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };

    const rows = await query<{
      id: string; email: string; password_hash: string; nombres: string; apellidos: string; rol: string;
    }>(
      `SELECT u.id, u.email, u.password_hash, u.nombres, u.apellidos, r.codigo AS rol
         FROM auth.usuarios u JOIN auth.roles r ON r.id = u.rol_id
        WHERE u.email = $1 AND u.activo = true`,
      [email],
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ ok: false, error: 'Credenciales inválidas' });
    }

    const payload: JwtPayload = {
      sub: user.id, email: user.email, rol: user.rol as any,
      nombre: `${user.nombres} ${user.apellidos}`,
    };
    await registrarAuditoria(user.email, 'LOGIN', 'auth');

    return {
      ok: true,
      data: {
        token: firmarToken(payload),
        refresh: firmarRefresh({ sub: user.id }),
        usuario: payload,
      },
    };
  });

  // ---- PERFIL ----
  app.get('/me', { preHandler: requireAuth() }, async (req: any) => ({ ok: true, data: req.usuario }));

  // ---- LISTAR USUARIOS (ADMIN y AUDITOR de solo lectura) ----
  app.get('/usuarios', { preHandler: requireAuth(['ADMIN', 'AUDITOR']) }, async () => {
    const rows = await query(
      `SELECT u.id, u.email, u.nombres, u.apellidos, r.codigo AS rol, u.activo
         FROM auth.usuarios u JOIN auth.roles r ON r.id = u.rol_id ORDER BY u.creado_en`,
    );
    return { ok: true, data: rows };
  });
}

async function registrarAuditoria(usuario: string, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({ fecha: new Date(), usuario, accion, recurso });
  } catch {
    /* la auditoría no debe romper el login */
  }
}
