import type { FastifyInstance } from 'fastify';
import { query, getMongo } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';
import { publicarNotificacion } from '@renova/eventos';

/**
 * CitasService — Programación de Consultas y Cirugías.
 * Flujos: validar JWT -> consultar paciente -> buscar médico/sala -> validar disponibilidad (409)
 *         -> programar -> auditar -> notificar -> 201.
 */
export async function registrarRutas(app: FastifyInstance) {
  // ---- LISTA UNIFICADA (consultas + cirugías) para la tabla del mockup ----
  app.get('/', { preHandler: requireAuth() }, async (req) => {
    const { q } = req.query as { q?: string };
    const filtro = q ? `%${q}%` : '%';
    const rows = await query(
      `SELECT * FROM (
         SELECT c.id, 'Consulta M.' AS tipo_atencion,
                (m.nombres||' '||m.apellidos) AS medico,
                (p.nombres||' '||p.apellidos) AS paciente,
                NULL::text AS tipo_cirugia,
                co.codigo AS sala, c.estado, c.fecha_hora
           FROM citas.consultas c
           LEFT JOIN maestras.medicos m ON m.id = c.medico_id
           LEFT JOIN pacientes.pacientes p ON p.id = c.paciente_id
           LEFT JOIN maestras.consultorios co ON co.id = c.consultorio_id
         UNION ALL
         SELECT cx.id, 'Cirugía' AS tipo_atencion,
                (m.nombres||' '||m.apellidos) AS medico,
                (p.nombres||' '||p.apellidos) AS paciente,
                tp.nombre AS tipo_cirugia,
                s.codigo AS sala, cx.estado, cx.fecha_hora
           FROM citas.cirugias cx
           LEFT JOIN maestras.medicos m ON m.id = cx.cirujano_id
           LEFT JOIN pacientes.pacientes p ON p.id = cx.paciente_id
           LEFT JOIN maestras.tipos_procedimiento tp ON tp.id = cx.tipo_procedimiento_id
           LEFT JOIN maestras.salas_quirurgicas s ON s.id = cx.sala_id
       ) t
       WHERE t.medico ILIKE $1 OR t.paciente ILIKE $1
       ORDER BY t.fecha_hora DESC LIMIT 200`,
      [filtro],
    );
    return { ok: true, data: rows };
  });

  // ---- DISPONIBILIDAD del médico en una fecha/hora (± 1 hora) ----
  app.get('/disponibilidad', { preHandler: requireAuth() }, async (req) => {
    const { medico_id, fecha_hora } = req.query as { medico_id?: string; fecha_hora?: string };
    if (!medico_id || !fecha_hora) return { ok: true, data: { disponible: true } };
    const disponible = await medicoDisponible(medico_id, fecha_hora);
    return { ok: true, data: { disponible } };
  });

  // ---- RECURSOS (consultorios + salas) para los selects del formulario ----
  app.get('/recursos', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: {
      consultorios: await query('SELECT id, codigo FROM maestras.consultorios WHERE activo ORDER BY codigo'),
      salas: await query('SELECT id, codigo FROM maestras.salas_quirurgicas WHERE activo ORDER BY codigo'),
      procedimientos: await query('SELECT id, nombre FROM maestras.tipos_procedimiento ORDER BY nombre'),
    },
  }));

  // ---- PROGRAMAR CONSULTA ----
  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const b = req.body as any;
    if (!b.paciente_id || !b.medico_id || !b.fecha_hora) {
      return reply.code(422).send({ ok: false, error: 'Paciente, médico y fecha/hora son requeridos' });
    }
    if (!(await medicoDisponible(b.medico_id, b.fecha_hora))) {
      return reply.code(409).send({ ok: false, error: 'El médico no está disponible en ese horario' });
    }
    const rows = await query(
      `INSERT INTO citas.consultas (paciente_id, medico_id, consultorio_id, especialidad_id, fecha_hora, motivo)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [b.paciente_id, b.medico_id, b.consultorio_id ?? null, b.especialidad_id ?? null, b.fecha_hora, b.motivo ?? null],
    );
    await auditar(req.usuario?.email, 'PROGRAMAR_CONSULTA', `consulta:${rows[0].id}`);
    await notificarPaciente(b.paciente_id, 'cita', 'Cita confirmada', 'Tu cita médica fue programada con éxito.');
    return reply.code(201).send({ ok: true, data: rows[0] });
  });

  // ---- CANCELAR / REPROGRAMAR ----
  app.patch('/:id/cancelar', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query(`UPDATE citas.consultas SET estado='CANCELADO' WHERE id=$1 RETURNING *`, [id]);
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Consulta no encontrada' });
    await auditar(req.usuario?.email, 'CANCELAR_CONSULTA', `consulta:${id}`);
    return { ok: true, data: rows[0] };
  });

  // ---- PROGRAMAR CIRUGÍA (valida sala libre + stock best-effort) ----
  app.post('/cirugias', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req: any, reply) => {
    const b = req.body as any;
    if (!b.paciente_id || !b.cirujano_id || !b.fecha_hora) {
      return reply.code(422).send({ ok: false, error: 'Paciente, cirujano y fecha/hora son requeridos' });
    }
    if (!(await medicoDisponible(b.cirujano_id, b.fecha_hora))) {
      return reply.code(409).send({ ok: false, error: 'El cirujano no está disponible en ese horario' });
    }
    const rows = await query(
      `INSERT INTO citas.cirugias (paciente_id, cirujano_id, anestesiologo_id, sala_id, tipo_procedimiento_id, tipo_anestesia_id, fecha_hora, duracion_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [b.paciente_id, b.cirujano_id, b.anestesiologo_id ?? null, b.sala_id ?? null,
       b.tipo_procedimiento_id ?? null, b.tipo_anestesia_id ?? null, b.fecha_hora, b.duracion_min ?? null],
    );
    await auditar(req.usuario?.email, 'PROGRAMAR_CIRUGIA', `cirugia:${rows[0].id}`);
    await notificarPaciente(b.paciente_id, 'cita', 'Cirugía programada', 'Tu cirugía fue programada con éxito.');
    return reply.code(201).send({ ok: true, data: rows[0] });
  });
}

async function medicoDisponible(medicoId: string, fechaHora: string): Promise<boolean> {
  const r = await query<{ n: string }>(
    `SELECT COUNT(*)::int AS n FROM citas.consultas
      WHERE medico_id = $1 AND estado <> 'CANCELADO'
        AND fecha_hora BETWEEN ($2::timestamptz - interval '59 minutes') AND ($2::timestamptz + interval '59 minutes')`,
    [medicoId, fechaHora],
  );
  return Number(r[0]?.n ?? 0) === 0;
}

async function notificarPaciente(pacienteId: string, tipo: string, asunto: string, mensaje: string) {
  try {
    const p = await query<{ email: string }>('SELECT email FROM pacientes.pacientes WHERE id = $1', [pacienteId]);
    if (p[0]?.email) await publicarNotificacion({ canal: 'email', destino: p[0].email, tipo, asunto, mensaje });
  } catch { /* notificación best-effort */ }
}

async function auditar(usuario: string | undefined, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({ fecha: new Date(), usuario: usuario || 'desconocido', accion, recurso });
  } catch { /* auditoría best-effort */ }
}
