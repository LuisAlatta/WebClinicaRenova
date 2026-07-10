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
  // ---- LISTA UNIFICADA (consultas + cirugías) con fecha, especialidad y filtro por fecha ----
  // Filtros: ?q (médico/paciente), ?fecha=YYYY-MM-DD (día exacto), ?desde / ?hasta (rango).
  app.get('/', { preHandler: requireAuth() }, async (req) => {
    const { q, fecha, desde, hasta } = req.query as { q?: string; fecha?: string; desde?: string; hasta?: string };
    const filtro = q ? `%${q}%` : '%';

    const rows = await query(
      `SELECT * FROM (
         SELECT c.id, 'Consulta M.' AS tipo_atencion,
                (m.nombres||' '||m.apellidos) AS medico,
                (p.nombres||' '||p.apellidos) AS paciente,
                p.dni AS paciente_dni,
                e.nombre AS especialidad,
                NULL::text AS tipo_cirugia,
                co.codigo AS sala, c.estado, c.fecha_hora
           FROM citas.consultas c
           LEFT JOIN maestras.medicos m ON m.id = c.medico_id
           LEFT JOIN pacientes.pacientes p ON p.id = c.paciente_id
           LEFT JOIN maestras.consultorios co ON co.id = c.consultorio_id
           LEFT JOIN maestras.especialidades e ON e.id = c.especialidad_id
         UNION ALL
         SELECT cx.id, 'Cirugía' AS tipo_atencion,
                (m.nombres||' '||m.apellidos) AS medico,
                (p.nombres||' '||p.apellidos) AS paciente,
                p.dni AS paciente_dni,
                e.nombre AS especialidad,
                tp.nombre AS tipo_cirugia,
                s.codigo AS sala, cx.estado, cx.fecha_hora
           FROM citas.cirugias cx
           LEFT JOIN maestras.medicos m ON m.id = cx.cirujano_id
           LEFT JOIN pacientes.pacientes p ON p.id = cx.paciente_id
           LEFT JOIN maestras.tipos_procedimiento tp ON tp.id = cx.tipo_procedimiento_id
           LEFT JOIN maestras.salas_quirurgicas s ON s.id = cx.sala_id
           LEFT JOIN maestras.especialidades e ON e.id = cx.especialidad_id
       ) t
       WHERE (t.medico ILIKE $1 OR t.paciente ILIKE $1 OR t.paciente_dni ILIKE $1)
         AND ($2::date IS NULL OR t.fecha_hora::date = $2::date)
         AND ($3::date IS NULL OR t.fecha_hora::date >= $3::date)
         AND ($4::date IS NULL OR t.fecha_hora::date <= $4::date)
       ORDER BY t.fecha_hora DESC LIMIT 300`,
      [filtro, fecha ?? null, desde ?? null, hasta ?? null],
    );
    return { ok: true, data: rows };
  });

  // ---- AGENDA DEL DÍA: distribución diaria por médico/consultorio/sala ----
  app.get('/agenda', { preHandler: requireAuth() }, async (req) => {
    const { fecha } = req.query as { fecha?: string };
    const rows = await query(
      `SELECT * FROM (
         SELECT c.id, 'Consulta M.' AS tipo_atencion, c.fecha_hora,
                (m.nombres||' '||m.apellidos) AS medico,
                (p.nombres||' '||p.apellidos) AS paciente,
                e.nombre AS especialidad, co.codigo AS ambiente, c.estado
           FROM citas.consultas c
           LEFT JOIN maestras.medicos m ON m.id = c.medico_id
           LEFT JOIN pacientes.pacientes p ON p.id = c.paciente_id
           LEFT JOIN maestras.consultorios co ON co.id = c.consultorio_id
           LEFT JOIN maestras.especialidades e ON e.id = c.especialidad_id
         UNION ALL
         SELECT cx.id, 'Cirugía' AS tipo_atencion, cx.fecha_hora,
                (m.nombres||' '||m.apellidos) AS medico,
                (p.nombres||' '||p.apellidos) AS paciente,
                e.nombre AS especialidad, s.codigo AS ambiente, cx.estado
           FROM citas.cirugias cx
           LEFT JOIN maestras.medicos m ON m.id = cx.cirujano_id
           LEFT JOIN pacientes.pacientes p ON p.id = cx.paciente_id
           LEFT JOIN maestras.salas_quirurgicas s ON s.id = cx.sala_id
           LEFT JOIN maestras.especialidades e ON e.id = cx.especialidad_id
       ) t
       WHERE t.fecha_hora::date = COALESCE($1::date, CURRENT_DATE)
         AND t.estado <> 'CANCELADO'
       ORDER BY t.fecha_hora ASC`,
      [fecha ?? null],
    );
    return { ok: true, data: rows };
  });

  // ---- DISPONIBILIDAD de un recurso (médico | consultorio | sala) en una fecha/hora (± 1 hora) ----
  app.get('/disponibilidad', { preHandler: requireAuth() }, async (req) => {
    const { recurso, medico_id, consultorio_id, sala_id, fecha_hora } =
      req.query as { recurso?: string; medico_id?: string; consultorio_id?: string; sala_id?: string; fecha_hora?: string };
    if (!fecha_hora) return { ok: true, data: { disponible: true } };

    // Compatibilidad: si solo llega medico_id (comportamiento antiguo).
    const tipo = recurso || (medico_id ? 'medico' : consultorio_id ? 'consultorio' : sala_id ? 'sala' : '');
    const id = medico_id || consultorio_id || sala_id;
    if (!tipo || !id) return { ok: true, data: { disponible: true } };

    const disponible = await recursoDisponible(tipo, id, fecha_hora);
    return { ok: true, data: { disponible } };
  });

  // ---- RECURSOS (consultorios + salas + procedimientos) para los selects del formulario ----
  app.get('/recursos', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: {
      consultorios: await query('SELECT id, codigo FROM maestras.consultorios WHERE activo ORDER BY codigo'),
      salas: await query('SELECT id, codigo FROM maestras.salas_quirurgicas WHERE activo ORDER BY codigo'),
      procedimientos: await query('SELECT id, nombre FROM maestras.tipos_procedimiento ORDER BY nombre'),
      camas_libres: await query('SELECT id, codigo, piso FROM hospitalizacion.camas WHERE NOT ocupada ORDER BY codigo'),
    },
  }));

  // ---- PROGRAMAR CONSULTA (valida médico + consultorio libres) ----
  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const b = req.body as any;
    if (!b.paciente_id || !b.medico_id || !b.fecha_hora) {
      return reply.code(422).send({ ok: false, error: 'Paciente, médico y fecha/hora son requeridos' });
    }
    if (!(await recursoDisponible('medico', b.medico_id, b.fecha_hora))) {
      return reply.code(409).send({ ok: false, error: 'El médico no está disponible en ese horario' });
    }
    if (b.consultorio_id && !(await recursoDisponible('consultorio', b.consultorio_id, b.fecha_hora))) {
      return reply.code(409).send({ ok: false, error: 'El consultorio ya está ocupado en ese horario' });
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

  // ---- PROGRAMAR CIRUGÍA (coordina cirujano + sala de operación + cama de recuperación) ----
  app.post('/cirugias', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req: any, reply) => {
    const b = req.body as any;
    if (!b.paciente_id || !b.cirujano_id || !b.fecha_hora) {
      return reply.code(422).send({ ok: false, error: 'Paciente, cirujano y fecha/hora son requeridos' });
    }
    if (!(await recursoDisponible('medico', b.cirujano_id, b.fecha_hora))) {
      return reply.code(409).send({ ok: false, error: 'El cirujano no está disponible en ese horario' });
    }
    if (!b.sala_id) {
      return reply.code(422).send({ ok: false, error: 'Debe asignar una sala de operación' });
    }
    if (!(await recursoDisponible('sala', b.sala_id, b.fecha_hora))) {
      return reply.code(409).send({ ok: false, error: 'La sala de operación ya está reservada en ese horario' });
    }
    // Coordina cama/cuarto de recuperación: debe existir y estar libre.
    if (b.cama_id) {
      const cama = await query<{ ocupada: boolean }>('SELECT ocupada FROM hospitalizacion.camas WHERE id = $1', [b.cama_id]);
      if (!cama[0]) return reply.code(404).send({ ok: false, error: 'La cama de recuperación no existe' });
      if (cama[0].ocupada) return reply.code(409).send({ ok: false, error: 'La cama de recuperación ya está ocupada' });
    }
    const rows = await query(
      `INSERT INTO citas.cirugias
         (paciente_id, cirujano_id, anestesiologo_id, especialidad_id, sala_id, cama_id, tipo_procedimiento_id, tipo_anestesia_id, fecha_hora, duracion_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [b.paciente_id, b.cirujano_id, b.anestesiologo_id ?? null, b.especialidad_id ?? null, b.sala_id,
       b.cama_id ?? null, b.tipo_procedimiento_id ?? null, b.tipo_anestesia_id ?? null, b.fecha_hora, b.duracion_min ?? null],
    );
    await auditar(req.usuario?.email, 'PROGRAMAR_CIRUGIA', `cirugia:${rows[0].id}`);
    await notificarPaciente(b.paciente_id, 'cita', 'Cirugía programada', 'Tu cirugía fue programada con éxito.');
    return reply.code(201).send({ ok: true, data: rows[0] });
  });
}

/**
 * Verifica si un recurso (médico, consultorio o sala) está libre en una ventana de ±59 min.
 * Cruza tanto consultas como cirugías para evitar solapamientos entre ambas agendas.
 */
async function recursoDisponible(tipo: string, id: string | number, fechaHora: string): Promise<boolean> {
  const ventana = `fecha_hora BETWEEN ($2::timestamptz - interval '59 minutes') AND ($2::timestamptz + interval '59 minutes')`;
  let sql = '';
  if (tipo === 'medico') {
    sql = `SELECT
             (SELECT COUNT(*) FROM citas.consultas WHERE medico_id = $1 AND estado <> 'CANCELADO' AND ${ventana})
           + (SELECT COUNT(*) FROM citas.cirugias  WHERE cirujano_id = $1 AND estado <> 'CANCELADO' AND ${ventana}) AS n`;
  } else if (tipo === 'consultorio') {
    sql = `SELECT COUNT(*) AS n FROM citas.consultas WHERE consultorio_id = $1 AND estado <> 'CANCELADO' AND ${ventana}`;
  } else if (tipo === 'sala') {
    sql = `SELECT COUNT(*) AS n FROM citas.cirugias WHERE sala_id = $1 AND estado <> 'CANCELADO' AND ${ventana}`;
  } else {
    return true;
  }
  const r = await query<{ n: string }>(sql, [id, fechaHora]);
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
