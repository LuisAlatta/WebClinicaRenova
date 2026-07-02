import type { FastifyInstance } from 'fastify';
import { query, getMongo } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';
import { validarPaciente } from '@renova/validacion';
import { publicarNotificacion } from '@renova/eventos';

/**
 * PacientesService — registro de pacientes y médicos + historia clínica.
 * Sigue el flujo del orquestador de Admisión: validar -> anti-duplicidad DNI -> auditar -> notificar -> 201.
 */
export async function registrarRutas(app: FastifyInstance) {
  // ===================== PACIENTES =====================

  app.get('/', { preHandler: requireAuth() }, async (req) => {
    const { dni, q } = req.query as { dni?: string; q?: string };
    if (dni) return { ok: true, data: await query('SELECT * FROM pacientes.pacientes WHERE dni = $1', [dni]) };
    if (q) {
      return {
        ok: true,
        data: await query(
          `SELECT * FROM pacientes.pacientes
            WHERE dni ILIKE $1 OR (nombres || ' ' || apellidos) ILIKE $1
            ORDER BY creado_en DESC LIMIT 100`,
          [`%${q}%`],
        ),
      };
    }
    return { ok: true, data: await query('SELECT * FROM pacientes.pacientes ORDER BY creado_en DESC LIMIT 100') };
  });

  app.get('/:id', { preHandler: requireAuth() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query('SELECT * FROM pacientes.pacientes WHERE id = $1', [id]);
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Paciente no encontrado' });
    return { ok: true, data: rows[0] };
  });

  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const body = req.body as any;

    // 1) Validar formato -> 422
    const v = validarPaciente(body);
    if (!v.valido) return reply.code(422).send({ ok: false, error: v.errores.join(', ') });

    // 2) Anti-duplicidad por DNI -> 409
    const dup = await query('SELECT id FROM pacientes.pacientes WHERE dni = $1', [body.dni]);
    if (dup[0]) return reply.code(409).send({ ok: false, error: 'Ya existe un paciente con ese DNI' });

    // 3) Insertar
    const rows = await query(
      `INSERT INTO pacientes.pacientes (dni, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [body.dni, body.nombres, body.apellidos, body.fecha_nacimiento ?? null,
       body.sexo ?? null, body.telefono ?? null, body.email ?? null, body.direccion ?? null],
    );
    const paciente = rows[0];

    // 4) Auditar  5) Email de bienvenida (async)
    await auditar(req.usuario?.email, 'REGISTRAR_PACIENTE', `paciente:${paciente.id}`);
    if (body.email) {
      await publicarNotificacion({
        canal: 'email', destino: body.email, tipo: 'bienvenida',
        asunto: 'Bienvenido a Clínica Renova',
        mensaje: `Hola ${body.nombres}, tu registro en Clínica Renova fue exitoso.`,
      });
    }

    return reply.code(201).send({ ok: true, data: paciente });
  });

  // Historia clínica (MongoDB)
  app.get('/:id/historia', { preHandler: requireAuth(['ADMIN', 'MEDICO', 'ENFERMERO']) }, async (req) => {
    const { id } = req.params as { id: string };
    const p = await query<{ dni: string }>('SELECT dni FROM pacientes.pacientes WHERE id = $1', [id]);
    const db = await getMongo();
    const hc = p[0] ? await db.collection('historias_clinicas').findOne({ dni: p[0].dni }) : null;
    return { ok: true, data: hc };
  });

  // ===================== MÉDICOS =====================

  app.get('/medicos', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: await query(
      `SELECT m.id, m.nombres, m.apellidos, m.cmp, e.nombre AS especialidad, m.especialidad_id, m.activo
         FROM maestras.medicos m LEFT JOIN maestras.especialidades e ON e.id = m.especialidad_id
        ORDER BY m.apellidos`,
    ),
  }));

  app.post('/medicos', { preHandler: requireAuth(['ADMIN']) }, async (req: any, reply) => {
    const b = req.body as any;
    if (!b.nombres?.trim() || !b.apellidos?.trim()) {
      return reply.code(422).send({ ok: false, error: 'Nombres y apellidos son requeridos' });
    }
    const rows = await query(
      `INSERT INTO maestras.medicos (nombres, apellidos, especialidad_id, cmp)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [b.nombres, b.apellidos, b.especialidad_id ?? null, b.cmp ?? null],
    );
    await auditar(req.usuario?.email, 'REGISTRAR_MEDICO', `medico:${rows[0].id}`);
    return reply.code(201).send({ ok: true, data: rows[0] });
  });

  // ===================== CATÁLOGOS =====================
  app.get('/especialidades', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: await query('SELECT id, codigo, nombre FROM maestras.especialidades ORDER BY nombre'),
  }));
}

async function auditar(usuario: string | undefined, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({ fecha: new Date(), usuario: usuario || 'desconocido', accion, recurso });
  } catch { /* la auditoría no debe romper la operación */ }
}
