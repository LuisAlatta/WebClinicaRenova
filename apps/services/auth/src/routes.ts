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

  // ---- LISTAR ROLES (solo ADMIN) ----
  app.get('/roles', { preHandler: requireAuth(['ADMIN']) }, async () => {
    const rows = await query('SELECT id, codigo, nombre, descripcion FROM auth.roles ORDER BY id');
    return { ok: true, data: rows };
  });

  // ---- LISTAR USUARIOS (solo ADMIN) ----
  app.get('/usuarios', { preHandler: requireAuth(['ADMIN']) }, async () => {
    const rows = await query(
      `SELECT u.id, u.email, u.nombres, u.apellidos, r.codigo AS rol, r.nombre AS rol_nombre, u.activo, u.creado_en
         FROM auth.usuarios u JOIN auth.roles r ON r.id = u.rol_id ORDER BY u.creado_en`,
    );
    return { ok: true, data: rows };
  });

  // ---- CREAR USUARIO (solo ADMIN) ----
  app.post('/usuarios', { preHandler: requireAuth(['ADMIN']) }, async (req: any, reply) => {
    const b = req.body as { email?: string; password?: string; nombres?: string; apellidos?: string; rol?: string };
    const errores = validarUsuario(b, true);
    if (errores.length) return reply.code(422).send({ ok: false, error: errores.join(', ') });

    const rol = await query<{ id: number }>('SELECT id FROM auth.roles WHERE codigo = $1', [b.rol]);
    if (!rol[0]) return reply.code(422).send({ ok: false, error: 'Rol inválido' });

    const dup = await query('SELECT id FROM auth.usuarios WHERE email = $1', [b.email!.toLowerCase()]);
    if (dup[0]) return reply.code(409).send({ ok: false, error: 'Ya existe un usuario con ese correo' });

    const hash = await bcrypt.hash(b.password!, 10);
    const rows = await query(
      `INSERT INTO auth.usuarios (email, password_hash, nombres, apellidos, rol_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, nombres, apellidos, activo`,
      [b.email!.toLowerCase(), hash, b.nombres!.trim(), b.apellidos!.trim(), rol[0].id],
    );
    await registrarAuditoria(req.usuario?.email, 'CREAR_USUARIO', `usuario:${rows[0].id}`);
    return reply.code(201).send({ ok: true, data: rows[0] });
  });

  // ---- EDITAR USUARIO (solo ADMIN) ----
  app.patch('/usuarios/:id', { preHandler: requireAuth(['ADMIN']) }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const b = req.body as { email?: string; password?: string; nombres?: string; apellidos?: string; rol?: string; activo?: boolean };

    const actual = await query('SELECT id FROM auth.usuarios WHERE id = $1', [id]);
    if (!actual[0]) return reply.code(404).send({ ok: false, error: 'Usuario no encontrado' });

    const errores = validarUsuario(b, false);
    if (errores.length) return reply.code(422).send({ ok: false, error: errores.join(', ') });

    // Construcción dinámica de la actualización con solo los campos enviados.
    const sets: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (b.nombres !== undefined) { sets.push(`nombres = $${i++}`); vals.push(b.nombres.trim()); }
    if (b.apellidos !== undefined) { sets.push(`apellidos = $${i++}`); vals.push(b.apellidos.trim()); }
    if (b.email !== undefined) {
      const dup = await query('SELECT id FROM auth.usuarios WHERE email = $1 AND id <> $2', [b.email.toLowerCase(), id]);
      if (dup[0]) return reply.code(409).send({ ok: false, error: 'Ya existe otro usuario con ese correo' });
      sets.push(`email = $${i++}`); vals.push(b.email.toLowerCase());
    }
    if (b.rol !== undefined) {
      const rol = await query<{ id: number }>('SELECT id FROM auth.roles WHERE codigo = $1', [b.rol]);
      if (!rol[0]) return reply.code(422).send({ ok: false, error: 'Rol inválido' });
      sets.push(`rol_id = $${i++}`); vals.push(rol[0].id);
    }
    if (b.activo !== undefined) { sets.push(`activo = $${i++}`); vals.push(!!b.activo); }
    if (b.password) { sets.push(`password_hash = $${i++}`); vals.push(await bcrypt.hash(b.password, 10)); }
    if (!sets.length) return reply.code(422).send({ ok: false, error: 'Nada que actualizar' });

    sets.push('actualizado_en = now()');
    vals.push(id);
    const rows = await query(
      `UPDATE auth.usuarios SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, email, nombres, apellidos, activo`,
      vals,
    );
    await registrarAuditoria(req.usuario?.email, 'EDITAR_USUARIO', `usuario:${id}`);
    return { ok: true, data: rows[0] };
  });

  // ---- ELIMINAR USUARIO (solo ADMIN) ----
  app.delete('/usuarios/:id', { preHandler: requireAuth(['ADMIN']) }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    if (req.usuario?.sub === id) {
      return reply.code(409).send({ ok: false, error: 'No puedes eliminar tu propia cuenta' });
    }
    const rows = await query('DELETE FROM auth.usuarios WHERE id = $1 RETURNING id', [id]);
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Usuario no encontrado' });
    await registrarAuditoria(req.usuario?.email, 'ELIMINAR_USUARIO', `usuario:${id}`);
    return { ok: true, data: { id } };
  });
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida los datos de un usuario. En creación (crear=true) exige todos los campos. */
function validarUsuario(
  b: { email?: string; password?: string; nombres?: string; apellidos?: string; rol?: string },
  crear: boolean,
): string[] {
  const e: string[] = [];
  if (crear || b.email !== undefined) {
    if (!b.email || !RE_EMAIL.test(b.email)) e.push('Correo inválido');
  }
  if (crear) {
    if (!b.password || b.password.length < 6) e.push('La contraseña debe tener al menos 6 caracteres');
    if (!b.rol) e.push('Rol requerido');
  } else if (b.password !== undefined && b.password.length > 0 && b.password.length < 6) {
    e.push('La contraseña debe tener al menos 6 caracteres');
  }
  if ((crear || b.nombres !== undefined) && !b.nombres?.trim()) e.push('Nombres requeridos');
  if ((crear || b.apellidos !== undefined) && !b.apellidos?.trim()) e.push('Apellidos requeridos');
  return e;
}

async function registrarAuditoria(usuario: string, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({ fecha: new Date(), usuario, accion, recurso });
  } catch {
    /* la auditoría no debe romper el login */
  }
}
