import type { FastifyInstance } from 'fastify';
import { query, getMongo } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';
import { publicarNotificacion } from '@renova/eventos';

/**
 * LaboratorioService — flujo ASÍNCRONO.
 * El médico solicita un examen -> el laboratorio externo envía el resultado (callback)
 * -> se integra a la historia clínica (Mongo) -> se notifica al paciente.
 * Tablas: laboratorio.solicitudes_examen, laboratorio.resultados.
 */
export async function registrarRutas(app: FastifyInstance) {
  // ===================== SOLICITUDES =====================

  // GET /examenes -> lista (join paciente + medico), con busqueda y filtro por estado.
  // Trae el resultado embebido (LEFT JOIN) para que el frontend pinte "Ver resultado" sin otra llamada.
  app.get('/examenes', { preHandler: requireAuth() }, async (req) => {
    const { q, estado, paciente_id } = req.query as { q?: string; estado?: string; paciente_id?: string };

    const condiciones: string[] = [];
    const params: any[] = [];

    if (q) {
      params.push(`%${q}%`);
      condiciones.push(
        `((p.nombres || ' ' || p.apellidos) ILIKE $${params.length}
          OR (m.nombres || ' ' || m.apellidos) ILIKE $${params.length}
          OR s.tipo_examen ILIKE $${params.length})`,
      );
    }
    if (estado) {
      params.push(estado);
      condiciones.push(`s.estado = $${params.length}`);
    }
    if (paciente_id) {
      params.push(paciente_id);
      condiciones.push(`s.paciente_id = $${params.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const data = await query(
      `SELECT s.id, s.paciente_id, s.medico_id, s.tipo_examen, s.prioridad, s.estado, s.solicitado_en,
              (p.nombres || ' ' || p.apellidos) AS paciente,
              (m.nombres || ' ' || m.apellidos) AS medico,
              r.resultado, r.observaciones AS resultado_observaciones, r.recibido_en
         FROM laboratorio.solicitudes_examen s
         LEFT JOIN pacientes.pacientes p ON p.id = s.paciente_id
         LEFT JOIN maestras.medicos    m ON m.id = s.medico_id
         LEFT JOIN laboratorio.resultados r ON r.solicitud_id = s.id
        ${where}
        ORDER BY s.solicitado_en DESC
        LIMIT 200`,
      params,
    );

    return { ok: true, data };
  });

  // POST /examenes -> el medico solicita un examen
  app.post('/examenes', { preHandler: requireAuth(['MEDICO']) }, async (req: any, reply) => {
    const b = req.body as any;

    if (!b.paciente_id || !b.medico_id || !b.tipo_examen) {
      return reply.code(422).send({ ok: false, error: 'Paciente, medico y tipo de examen son requeridos' });
    }
    const prioridad = b.prioridad === 'URGENTE' ? 'URGENTE' : 'NORMAL';

    const rows = await query(
      `INSERT INTO laboratorio.solicitudes_examen (paciente_id, medico_id, tipo_examen, prioridad)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [b.paciente_id, b.medico_id, b.tipo_examen, prioridad],
    );
    const solicitud = rows[0];

    await auditar(req.usuario?.email, 'SOLICITAR_EXAMEN', `solicitud_examen:${solicitud.id}`);

    return reply.code(201).send({ ok: true, data: solicitud });
  });

  // ===================== RESULTADOS (callback async del laboratorio externo) =====================

  // POST /resultados -> el laboratorio externo entrega el resultado.
  // No usa requireAuth() de usuario: quien llama es un sistema externo, no alguien logueado.
  // Si se configura LAB_CALLBACK_SECRET, se exige por header; si no, queda abierto como el resto del stub original.
  app.post('/resultados', async (req: any, reply) => {
    const b = req.body as any;

    if (process.env.LAB_CALLBACK_SECRET && req.headers['x-lab-secret'] !== process.env.LAB_CALLBACK_SECRET) {
      return reply.code(401).send({ ok: false, error: 'Credencial de laboratorio externo invalida' });
    }
    if (!b.solicitud_id || !b.resultado) {
      return reply.code(422).send({ ok: false, error: 'solicitud_id y resultado son requeridos' });
    }

    const solicitudRows = await query(
      `SELECT s.*, p.dni, (p.nombres || ' ' || p.apellidos) AS paciente_nombre, p.email
         FROM laboratorio.solicitudes_examen s
         JOIN pacientes.pacientes p ON p.id = s.paciente_id
        WHERE s.id = $1`,
      [b.solicitud_id],
    );
    const solicitud = solicitudRows[0];
    if (!solicitud) return reply.code(404).send({ ok: false, error: 'Solicitud no encontrada' });

    // 1) Guardar el resultado (estructura libre en JSONB)
    const resultadoRows = await query(
      `INSERT INTO laboratorio.resultados (solicitud_id, resultado, observaciones)
       VALUES ($1, $2, $3) RETURNING *`,
      [b.solicitud_id, JSON.stringify(b.resultado), b.observaciones ?? null],
    );
    const resultado = resultadoRows[0];

    // 2) Marcar la solicitud como FINALIZADO
    await query(`UPDATE laboratorio.solicitudes_examen SET estado = 'FINALIZADO' WHERE id = $1`, [b.solicitud_id]);

    // 3) Integrar a la historia clinica (Mongo).
    // Nota: solicitudes_examen no guarda a que episodio/consulta pertenece, asi que se
    // adjunta al episodio mas reciente del paciente. Si se necesita trazabilidad exacta,
    // conviene agregar una columna cita_id a laboratorio.solicitudes_examen a futuro.
    try {
      const db = await getMongo();
      const pacienteDoc = await db.collection('historias_clinicas').findOne({ dni: solicitud.dni });
      if (pacienteDoc?.episodios?.length) {
        const ultimoIndex = pacienteDoc.episodios.length - 1;
        await db.collection('historias_clinicas').updateOne(
          { dni: solicitud.dni },
          {
            $push: {
              [`episodios.${ultimoIndex}.resultados_lab`]: {
                solicitud_id: solicitud.id,
                tipo_examen: solicitud.tipo_examen,
                resultado: b.resultado,
                observaciones: b.observaciones ?? null,
                recibido_en: new Date(),
              },
            },
          },
        );
      }
    } catch (e) {
      app.log.warn('No se pudo integrar el resultado a la historia clinica: ' + (e as Error).message);
    }

    // 4) Auditar
    await auditar('sistema-laboratorio-externo', 'RECIBIR_RESULTADO_EXAMEN', `solicitud_examen:${b.solicitud_id}`);

    // 5) Notificar al paciente (best-effort, igual que en pacientes/citas)
    if (solicitud.email) {
      await publicarNotificacion({
        canal: 'email',
        destino: solicitud.email,
        tipo: 'resultado',
        asunto: 'Tu resultado de laboratorio esta listo',
        mensaje: `Hola ${solicitud.paciente_nombre}, el resultado de tu examen "${solicitud.tipo_examen}" ya esta disponible.`,
      });
    }

    return reply.code(201).send({ ok: true, data: resultado });
  });
}

async function auditar(usuario: string | undefined, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({ fecha: new Date(), usuario: usuario || 'desconocido', accion, recurso });
  } catch { /* la auditoria no debe romper la operacion */ }
}