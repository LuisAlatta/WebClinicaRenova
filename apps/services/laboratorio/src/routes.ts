import type { FastifyInstance } from 'fastify';
import { query, getMongo } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';
import { publicarNotificacion } from '@renova/eventos';

export async function registrarRutas(app: FastifyInstance) {

  // ── CATÁLOGO: áreas ──────────────────────────────────────────────────────
  app.get('/areas', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: await query('SELECT id, codigo, nombre FROM laboratorio.areas_laboratorio ORDER BY nombre'),
  }));

  // ── CATÁLOGO: tipos de examen (filtrable por área + autocomplete) ─────────
  // Incremento 3: área → tipo de examen (paralelo a especialidad → médico en citas)
  app.get('/tipos-examen', { preHandler: requireAuth() }, async (req) => {
    const { area_id, q } = req.query as { area_id?: string; q?: string };
    const conds: string[] = [];
    const params: any[] = [];
    if (area_id) { params.push(Number(area_id)); conds.push(`area_id = $${params.length}`); }
    if (q)       { params.push(`%${q}%`);         conds.push(`nombre ILIKE $${params.length}`); }
    conds.push('activo = true');
    const rows = await query(
      `SELECT t.id, t.codigo, t.nombre, t.unidad_resultado, t.valor_ref_min, t.valor_ref_max,
              a.nombre AS area
         FROM laboratorio.tipos_examen_catalogo t
         JOIN laboratorio.areas_laboratorio a ON a.id = t.area_id
        WHERE ${conds.join(' AND ')}
        ORDER BY t.nombre LIMIT 30`,
      params,
    );
    return { ok: true, data: rows };
  });

  // ── CATÁLOGO: equipos por área ───────────────────────────────────────────
  app.get('/equipos', { preHandler: requireAuth() }, async (req) => {
    const { area_id } = req.query as { area_id?: string };
    const rows = await query(
      `SELECT e.id, e.nombre, a.nombre AS area
         FROM laboratorio.equipos e
         JOIN laboratorio.areas_laboratorio a ON a.id = e.area_id
        WHERE e.activo ${area_id ? 'AND e.area_id = $1' : ''}
        ORDER BY e.nombre`,
      area_id ? [Number(area_id)] : [],
    );
    return { ok: true, data: rows };
  });

  // ── DISPONIBILIDAD: cupo por área y fecha/hora ───────────────────────────
  // Incremento 5: antes de solicitar, se verifica si hay equipo disponible
  app.get('/disponibilidad', { preHandler: requireAuth() }, async (req) => {
    const { area_id, fecha_hora } = req.query as { area_id?: string; fecha_hora?: string };
    if (!area_id || !fecha_hora) return { ok: true, data: { disponible: true, ocupados: 0, capacidad: 0 } };

    // Contar solicitudes en proceso para esa área en la misma hora (± 30 min)
    const ocupRows = await query<{ n: string }>(
      `SELECT COUNT(*)::int AS n FROM laboratorio.solicitudes_examen
        WHERE area_id = $1 AND estado <> 'FINALIZADO'
          AND fecha_programada BETWEEN ($2::timestamptz - interval '29 minutes')
                                   AND ($2::timestamptz + interval '29 minutes')`,
      [Number(area_id), fecha_hora],
    );
    // Contar equipos activos del área como capacidad máxima simultánea
    const capRows = await query<{ n: string }>(
      'SELECT COUNT(*)::int AS n FROM laboratorio.equipos WHERE area_id = $1 AND activo',
      [Number(area_id)],
    );
    const ocupados  = Number(ocupRows[0]?.n ?? 0);
    const capacidad = Number(capRows[0]?.n ?? 1);
    return { ok: true, data: { disponible: ocupados < capacidad, ocupados, capacidad } };
  });

  // ── LISTA DE SOLICITUDES (con autocomplete y filtro botón) ───────────────
  // Incremento 2: tabla vacía al abrir, busca solo con ?q= o ?fecha=
  // Incremento 6: incluye especialidad del médico y columna de fecha_programada
  app.get('/examenes', { preHandler: requireAuth() }, async (req) => {
    const { q, estado, paciente_id, fecha } = req.query as {
      q?: string; estado?: string; paciente_id?: string; fecha?: string;
    };

    // Sin parámetros devuelve vacío (tabla inicia vacía, igual que citas)
    if (!q && !estado && !paciente_id && !fecha) return { ok: true, data: [] };

    const conds: string[] = [];
    const params: any[] = [];

    if (q) {
      params.push(`%${q}%`);
      conds.push(
        `((p.nombres||' '||p.apellidos) ILIKE $${params.length}
           OR (m.nombres||' '||m.apellidos) ILIKE $${params.length}
           OR s.tipo_examen ILIKE $${params.length}
           OR p.dni ILIKE $${params.length})`,
      );
    }
    if (estado)      { params.push(estado);                conds.push(`s.estado = $${params.length}`); }
    if (paciente_id) { params.push(paciente_id);           conds.push(`s.paciente_id = $${params.length}`); }
    if (fecha)       { params.push(fecha);                 conds.push(`s.fecha_programada::date = $${params.length}::date`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const data = await query(
      `SELECT s.id, s.paciente_id, s.medico_id, s.tipo_examen, s.prioridad,
              s.estado, s.solicitado_en, s.fecha_programada, s.observaciones_solicitud,
              s.area_id,
              (p.nombres||' '||p.apellidos)   AS paciente,
              p.tipo_documento, p.dni,
              (m.nombres||' '||m.apellidos)   AS medico,
              e.nombre                         AS especialidad_medico,
              tc.nombre                        AS tipo_examen_nombre,
              a.nombre                         AS area,
              r.resultado, r.observaciones     AS resultado_observaciones,
              r.recibido_en, r.tecnico_id
         FROM laboratorio.solicitudes_examen s
         LEFT JOIN pacientes.pacientes           p  ON p.id  = s.paciente_id
         LEFT JOIN maestras.medicos              m  ON m.id  = s.medico_id
         LEFT JOIN maestras.especialidades       e  ON e.id  = m.especialidad_id
         LEFT JOIN laboratorio.tipos_examen_catalogo tc ON tc.id = s.tipo_examen_id
         LEFT JOIN laboratorio.areas_laboratorio a  ON a.id  = s.area_id
         LEFT JOIN laboratorio.resultados        r  ON r.solicitud_id = s.id
        ${where}
        ORDER BY COALESCE(s.fecha_programada, s.solicitado_en) DESC
        LIMIT 200`,
      params,
    );
    return { ok: true, data };
  });

  // ── VISTA DIARIA ──────────────────────────────────────────────────────────
  // Incremento 4: lista del día ordenada por hora programada
  app.get('/examenes/diario', { preHandler: requireAuth() }, async (req) => {
    const { fecha } = req.query as { fecha?: string };
    const dia = fecha ?? new Date().toISOString().slice(0, 10);
    const data = await query(
      `SELECT s.id, s.tipo_examen, s.prioridad, s.estado,
              s.fecha_programada, s.solicitado_en,
              (p.nombres||' '||p.apellidos) AS paciente, p.dni,
              (m.nombres||' '||m.apellidos) AS medico,
              e.nombre AS especialidad_medico,
              a.nombre AS area,
              r.resultado IS NOT NULL AS tiene_resultado
         FROM laboratorio.solicitudes_examen s
         LEFT JOIN pacientes.pacientes         p ON p.id = s.paciente_id
         LEFT JOIN maestras.medicos            m ON m.id = s.medico_id
         LEFT JOIN maestras.especialidades     e ON e.id = m.especialidad_id
         LEFT JOIN laboratorio.areas_laboratorio a ON a.id = s.area_id
         LEFT JOIN laboratorio.resultados      r ON r.solicitud_id = s.id
        WHERE COALESCE(s.fecha_programada, s.solicitado_en)::date = $1::date
        ORDER BY COALESCE(s.fecha_programada, s.solicitado_en) ASC`,
      [dia],
    );
    return { ok: true, data, fecha: dia };
  });

  // ── HISTORIAL DE UN PACIENTE ──────────────────────────────────────────────
  // Incremento 9 (propio): ver todos los exámenes históricos de un paciente
  app.get('/examenes/paciente/:paciente_id', { preHandler: requireAuth() }, async (req, reply) => {
    const { paciente_id } = req.params as { paciente_id: string };
    const { desde, hasta, area_id } = req.query as { desde?: string; hasta?: string; area_id?: string };
    const conds = [`s.paciente_id = $1`];
    const params: any[] = [paciente_id];
    if (desde)   { params.push(desde);          conds.push(`s.solicitado_en >= $${params.length}::date`); }
    if (hasta)   { params.push(hasta);          conds.push(`s.solicitado_en <= $${params.length}::date`); }
    if (area_id) { params.push(Number(area_id));conds.push(`s.area_id = $${params.length}`); }
    const data = await query(
      `SELECT s.id, s.tipo_examen, s.estado, s.prioridad,
              s.solicitado_en, s.fecha_programada,
              a.nombre AS area,
              (m.nombres||' '||m.apellidos) AS medico,
              e.nombre AS especialidad_medico,
              r.resultado, r.observaciones AS resultado_observaciones,
              r.recibido_en
         FROM laboratorio.solicitudes_examen s
         LEFT JOIN laboratorio.areas_laboratorio a ON a.id = s.area_id
         LEFT JOIN maestras.medicos            m ON m.id = s.medico_id
         LEFT JOIN maestras.especialidades     e ON e.id = m.especialidad_id
         LEFT JOIN laboratorio.resultados      r ON r.solicitud_id = s.id
        WHERE ${conds.join(' AND ')}
        ORDER BY s.solicitado_en DESC`,
      params,
    );
    return { ok: true, data };
  });

  // ── SOLICITAR EXAMEN ──────────────────────────────────────────────────────
  // Incremento 1: soporta tipo_documento (CE, Pasaporte, CONADIS)
  // Incremento 5: valida disponibilidad del equipo/área antes de guardar
  app.post('/examenes', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req: any, reply) => {
    const b = req.body as any;
    if (!b.paciente_id || !b.medico_id || !b.tipo_examen) {
      return reply.code(422).send({ ok: false, error: 'Paciente, médico y tipo de examen son requeridos' });
    }

    // Disponibilidad de equipo (si se especificó área y fecha)
    if (b.area_id && b.fecha_programada) {
      const dispRows = await query<{ disponible: boolean }>(
        `SELECT COUNT(*) < (SELECT COUNT(*) FROM laboratorio.equipos WHERE area_id = $1 AND activo) AS disponible
           FROM laboratorio.solicitudes_examen
          WHERE area_id = $1 AND estado <> 'FINALIZADO'
            AND fecha_programada BETWEEN ($2::timestamptz - interval '29 minutes')
                                     AND ($2::timestamptz + interval '29 minutes')`,
        [Number(b.area_id), b.fecha_programada],
      );
      if (!dispRows[0]?.disponible) {
        return reply.code(409).send({ ok: false, error: 'No hay equipo disponible en esa área para la fecha y hora solicitada' });
      }
    }

    const prioridad = b.prioridad === 'URGENTE' ? 'URGENTE' : 'NORMAL';
    const rows = await query(
      `INSERT INTO laboratorio.solicitudes_examen
         (paciente_id, medico_id, tipo_examen_id, tipo_examen, area_id, equipo_id,
          prioridad, fecha_programada, observaciones_solicitud)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [b.paciente_id, b.medico_id, b.tipo_examen_id ?? null, b.tipo_examen,
       b.area_id ?? null, b.equipo_id ?? null,
       prioridad, b.fecha_programada ?? null, b.observaciones ?? null],
    );
    const solicitud = rows[0];

    await auditar(req.usuario?.email, 'SOLICITAR_EXAMEN', `solicitud_examen:${solicitud.id}`);

    // Notificar al paciente según su canal preferido (Incremento 8)
    try {
      const pacRow = await query<{ email: string; canal_preferido: string; nombres: string }>(
        'SELECT email, canal_preferido, nombres FROM pacientes.pacientes WHERE id = $1',
        [b.paciente_id],
      );
      const pac = pacRow[0];
      if (pac?.email) {
        await publicarNotificacion({
          canal: (pac.canal_preferido as any) || 'email',
          destino: pac.email,
          tipo: 'examen',
          asunto: 'Se te ha solicitado un examen de laboratorio',
          mensaje: `Hola ${pac.nombres}, el Dr./Dra. ${req.usuario?.nombre ?? ''} te solicitó el examen "${b.tipo_examen}".${b.fecha_programada ? ` Fecha programada: ${new Date(b.fecha_programada).toLocaleString('es-PE')}.` : ''} Te avisaremos cuando el resultado esté listo.`,
        });
      }
    } catch (e) {
      app.log.warn('No se pudo notificar al paciente: ' + (e as Error).message);
    }

    return reply.code(201).send({ ok: true, data: solicitud });
  });

  // ── CAMBIAR ESTADO ────────────────────────────────────────────────────────
  app.patch('/examenes/:id/estado', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const { estado } = req.body as { estado?: string };
    const validos = ['SOLICITADO', 'EN_PROCESO', 'FINALIZADO'];
    if (!estado || !validos.includes(estado)) {
      return reply.code(422).send({ ok: false, error: `Estado inválido. Use: ${validos.join(', ')}` });
    }
    if (estado === 'FINALIZADO') {
      const r = await query('SELECT id FROM laboratorio.resultados WHERE solicitud_id = $1', [id]);
      if (!r[0]) return reply.code(422).send({ ok: false, error: 'No se puede finalizar sin un resultado registrado' });
    }
    const rows = await query(
      `UPDATE laboratorio.solicitudes_examen SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id],
    );
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Solicitud no encontrada' });
    await auditar(req.usuario?.email, 'CAMBIAR_ESTADO_EXAMEN', `solicitud_examen:${id}:${estado}`);
    return { ok: true, data: rows[0] };
  });

  // ── RECIBIR RESULTADO (callback laboratorio externo) ──────────────────────
  // Incremento 7: guarda tecnico_id; resultado con metadatos de referencia
  // Incremento 8: notifica por canal_preferido del paciente
  app.post('/resultados', async (req: any, reply) => {
    const b = req.body as any;
    if (process.env.LAB_CALLBACK_SECRET && req.headers['x-lab-secret'] !== process.env.LAB_CALLBACK_SECRET) {
      return reply.code(401).send({ ok: false, error: 'Credencial de laboratorio externo inválida' });
    }
    if (!b.solicitud_id || !b.resultado) {
      return reply.code(422).send({ ok: false, error: 'solicitud_id y resultado son requeridos' });
    }

    const solRows = await query(
      `SELECT s.*, p.dni, (p.nombres||' '||p.apellidos) AS paciente_nombre,
              p.email, p.canal_preferido, p.nombres AS paciente_nombres,
              tc.unidad_resultado, tc.valor_ref_min, tc.valor_ref_max
         FROM laboratorio.solicitudes_examen s
         JOIN pacientes.pacientes p ON p.id = s.paciente_id
         LEFT JOIN laboratorio.tipos_examen_catalogo tc ON tc.id = s.tipo_examen_id
        WHERE s.id = $1`,
      [b.solicitud_id],
    );
    const sol = solRows[0];
    if (!sol) return reply.code(404).send({ ok: false, error: 'Solicitud no encontrada' });
    if (sol.estado === 'FINALIZADO') {
      return reply.code(409).send({ ok: false, error: 'Esta solicitud ya tiene un resultado registrado' });
    }

    // Guardar resultado con técnico (Incremento 8)
    const tecnicoId = req.usuario?.sub ?? b.tecnico_id ?? null;
    const resRows = await query(
      `INSERT INTO laboratorio.resultados (solicitud_id, resultado, observaciones, tecnico_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [b.solicitud_id, JSON.stringify(b.resultado), b.observaciones ?? null, tecnicoId],
    );
    await query(`UPDATE laboratorio.solicitudes_examen SET estado = 'FINALIZADO' WHERE id = $1`, [b.solicitud_id]);

    // Integrar a historia clínica (Mongo)
    try {
      const db = await getMongo();
      const hc = await db.collection('historias_clinicas').findOne({ dni: sol.dni });
      if (hc?.episodios?.length) {
        const idx = hc.episodios.length - 1;
        await db.collection('historias_clinicas').updateOne(
          { dni: sol.dni },
          { $push: { [`episodios.${idx}.resultados_lab`]: {
            solicitud_id: sol.id, tipo_examen: sol.tipo_examen,
            resultado: b.resultado, observaciones: b.observaciones ?? null,
            recibido_en: new Date(),
          }} } as any,
        );
      }
    } catch (e) {
      app.log.warn('No se pudo integrar a historia clínica: ' + (e as Error).message);
    }

    await auditar('sistema-laboratorio-externo', 'RECIBIR_RESULTADO_EXAMEN', `solicitud_examen:${b.solicitud_id}`);

    // Notificar por canal preferido del paciente (Incremento 8)
    if (sol.email) {
      await publicarNotificacion({
        canal: (sol.canal_preferido as any) || 'email',
        destino: sol.email,
        tipo: 'resultado',
        asunto: 'Tu resultado de laboratorio está listo',
        mensaje: `Hola ${sol.paciente_nombres}, el resultado de tu examen "${sol.tipo_examen}" ya está disponible. Puedes consultarlo con tu médico.`,
      });
    }

    return reply.code(201).send({ ok: true, data: resRows[0] });
  });
}

async function auditar(usuario: string | undefined, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({
      fecha: new Date(), usuario: usuario || 'desconocido', accion, recurso,
    });
  } catch { /* best-effort */ }
}
