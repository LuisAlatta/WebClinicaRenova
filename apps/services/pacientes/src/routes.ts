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
      `INSERT INTO pacientes.pacientes
         (tipo_documento, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion, canal_preferido)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [body.tipo_documento ?? 'DNI', body.dni, body.nombres, body.apellidos, body.fecha_nacimiento ?? null,
       body.sexo ?? null, body.telefono ?? null, body.email ?? null, body.direccion ?? null,
       body.canal_preferido ?? 'email'],
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
  app.get('/:id/historia', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req) => {
    const { id } = req.params as { id: string };
    const p = await query<{ dni: string }>('SELECT dni FROM pacientes.pacientes WHERE id = $1', [id]);
    const db = await getMongo();
    const hc = p[0] ? await db.collection('historias_clinicas').findOne({ dni: p[0].dni }) : null;
    return { ok: true, data: hc };
  });

  // ===================== MÉDICOS =====================

  // Lista médicos; si llega ?especialidad_id filtra por especialidad (paso 1: especialidad -> paso 2: médico).
  app.get('/medicos', { preHandler: requireAuth() }, async (req) => {
    const { especialidad_id } = req.query as { especialidad_id?: string };
    const base = `SELECT m.id, m.nombres, m.apellidos, m.cmp, e.nombre AS especialidad, m.especialidad_id, m.activo
                    FROM maestras.medicos m LEFT JOIN maestras.especialidades e ON e.id = m.especialidad_id
                   WHERE m.activo`;
    const data = especialidad_id
      ? await query(`${base} AND m.especialidad_id = $1 ORDER BY m.apellidos`, [Number(especialidad_id)])
      : await query(`${base} ORDER BY m.apellidos`);
    return { ok: true, data };
  });

  // ===================== PACIENTE COMO CANAL / RED =====================
  // El paciente es el hilo que conecta la red de servicios: desde su ficha se
  // ven sus consultas, cirugías, internamientos y exámenes en un solo lugar.
  app.get('/:id/red', { preHandler: requireAuth() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const paciente = await query('SELECT * FROM pacientes.pacientes WHERE id = $1', [id]);
    if (!paciente[0]) return reply.code(404).send({ ok: false, error: 'Paciente no encontrado' });

    const [consultas, cirugias, internamientos, examenes] = await Promise.all([
      query(
        `SELECT c.id, c.fecha_hora, c.estado, c.motivo, e.nombre AS especialidad,
                (m.nombres||' '||m.apellidos) AS medico
           FROM citas.consultas c
           LEFT JOIN maestras.medicos m ON m.id = c.medico_id
           LEFT JOIN maestras.especialidades e ON e.id = c.especialidad_id
          WHERE c.paciente_id = $1 ORDER BY c.fecha_hora DESC LIMIT 50`, [id]),
      query(
        `SELECT cx.id, cx.fecha_hora, cx.estado, tp.nombre AS procedimiento,
                (m.nombres||' '||m.apellidos) AS cirujano
           FROM citas.cirugias cx
           LEFT JOIN maestras.medicos m ON m.id = cx.cirujano_id
           LEFT JOIN maestras.tipos_procedimiento tp ON tp.id = cx.tipo_procedimiento_id
          WHERE cx.paciente_id = $1 ORDER BY cx.fecha_hora DESC LIMIT 50`, [id]),
      query(
        `SELECT i.id, i.fecha_ingreso, i.fecha_egreso, i.estado, i.motivo_ingreso,
                c.codigo AS cama, e.nombre AS especialidad
           FROM hospitalizacion.internamientos i
           LEFT JOIN hospitalizacion.camas c ON c.id = i.cama_id
           LEFT JOIN maestras.especialidades e ON e.id = i.especialidad_id
          WHERE i.paciente_id = $1 ORDER BY i.fecha_ingreso DESC LIMIT 50`, [id]),
      query(
        `SELECT s.id, s.tipo_examen, s.prioridad, s.estado, s.solicitado_en
           FROM laboratorio.solicitudes_examen s
          WHERE s.paciente_id = $1 ORDER BY s.solicitado_en DESC LIMIT 50`, [id]).catch(() => []),
    ]);

    return { ok: true, data: { paciente: paciente[0], consultas, cirugias, internamientos, examenes } };
  });

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
