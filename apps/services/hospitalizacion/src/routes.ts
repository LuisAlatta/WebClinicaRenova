import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
import { query } from '@renova/db';

/**
 * HP-BE-0001
 * Servicio de Hospitalización.
 * Conecta internamientos, camas, pacientes y médicos.
 */
export async function registrarRutas(app: FastifyInstance) {
  /**
   * HP-BE-0002
   * Lista internamientos con datos del paciente, médico y cama.
   */
  app.get('/', async () => {
    const data = await query(`
      SELECT 
        i.id,
        i.paciente_id,
        p.dni,
        p.nombres,
        p.apellidos,
        i.medico_responsable_id,
        m.nombres AS medico_nombres,
        m.apellidos AS medico_apellidos,
        i.cama_id,
        c.codigo AS cama_codigo,
        c.piso,
        i.fecha_ingreso,
        i.fecha_egreso,
        i.motivo_ingreso,
        i.resumen_alta,
        i.estado
      FROM hospitalizacion.internamientos i
      INNER JOIN pacientes.pacientes p ON p.id = i.paciente_id
      INNER JOIN maestras.medicos m ON m.id = i.medico_responsable_id
      LEFT JOIN hospitalizacion.camas c ON c.id = i.cama_id
      ORDER BY i.fecha_ingreso DESC
    `);

    return { ok: true, data };
  });

  /**
   * HP-BE-0003
   * Lista camas disponibles y ocupadas.
   */
 app.get('/camas', async () => {
    const data = await query(`
      SELECT id, codigo, piso, ocupada
      FROM hospitalizacion.camas
      ORDER BY codigo ASC
    `);

    return { ok: true, data };
  });

  /**
   * HP-BE-0004
   * Registra internamiento.
   * Body esperado:
   * {
   *   paciente_id,
   *   medico_responsable_id,
   *   cama_id,
   *   motivo_ingreso
   * }
   */
  app.post('/', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req, reply) => {
    const body = req.body as {
      paciente_id?: string;
      medico_responsable_id?: string;
      cama_id?: number;
      motivo_ingreso?: string;
    };

    if (!body.paciente_id || !body.medico_responsable_id || !body.cama_id) {
      return reply.code(400).send({
        ok: false,
        error: 'Paciente, médico responsable y cama son obligatorios.',
      });
    }

    const cama = await query<{ id: number; ocupada: boolean }>(
      `
      SELECT id, ocupada
      FROM hospitalizacion.camas
      WHERE id = $1
      `,
      [body.cama_id],
    );

    if (!cama.length) {
      return reply.code(404).send({
        ok: false,
        error: 'La cama indicada no existe.',
      });
    }

    if (cama[0].ocupada) {
      return reply.code(409).send({
        ok: false,
        error: 'La cama seleccionada ya está ocupada.',
      });
    }

    const nuevo = await query(
      `
      INSERT INTO hospitalizacion.internamientos
        (paciente_id, medico_responsable_id, cama_id, motivo_ingreso, estado)
      VALUES
        ($1, $2, $3, $4, 'EN_PROCESO')
      RETURNING *
      `,
      [
        body.paciente_id,
        body.medico_responsable_id,
        body.cama_id,
        body.motivo_ingreso || null,
      ],
    );

    await query(
      `
      UPDATE hospitalizacion.camas
      SET ocupada = true
      WHERE id = $1
      `,
      [body.cama_id],
    );

    return reply.code(201).send({ ok: true, data: nuevo[0] });
  });

  /**
   * HP-BE-0005
   * Egreso/alta del paciente.
   * Libera la cama.
   */
  app.patch('/:id/egreso', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      resumen_alta?: string;
      estado?: 'ALTA' | 'ALTA_VOLUNTARIA' | 'REFERIDO_EMERGENCIA';
    };

    const actual = await query<{ id: string; cama_id: number | null; estado: string }>(
      `
      SELECT id, cama_id, estado
      FROM hospitalizacion.internamientos
      WHERE id = $1
      `,
      [id],
    );

    if (!actual.length) {
      return reply.code(404).send({
        ok: false,
        error: 'Internamiento no encontrado.',
      });
    }

    if (actual[0].estado !== 'EN_PROCESO') {
      return reply.code(409).send({
        ok: false,
        error: 'El internamiento ya fue cerrado.',
      });
    }

    const estadoFinal = body.estado || 'ALTA';

    const actualizado = await query(
      `
      UPDATE hospitalizacion.internamientos
      SET 
        fecha_egreso = now(),
        resumen_alta = $2,
        estado = $3
      WHERE id = $1
      RETURNING *
      `,
      [id, body.resumen_alta || null, estadoFinal],
    );

    if (actual[0].cama_id) {
      await query(
        `
        UPDATE hospitalizacion.camas
        SET ocupada = false
        WHERE id = $1
        `,
        [actual[0].cama_id],
      );
    }

    return { ok: true, data: actualizado[0] };
  });

  /**
   * HP-BE-0006
   * Registra seguimiento de signos vitales.
   */
  app.post('/:id/seguimiento', { preHandler: requireAuth(['MEDICO']) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as {
      temperatura?: number;
      presion_arterial?: string;
      frecuencia_cardiaca?: number;
      observaciones?: string;
    };

    const nuevo = await query(
      `
      INSERT INTO hospitalizacion.seguimientos
        (internamiento_id, temperatura, presion_arterial, frecuencia_cardiaca, observaciones)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        id,
        body.temperatura || null,
        body.presion_arterial || null,
        body.frecuencia_cardiaca || null,
        body.observaciones || null,
      ],
    );

    return reply.code(201).send({ ok: true, data: nuevo[0] });
  });
}