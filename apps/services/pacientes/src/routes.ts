import type { FastifyInstance } from 'fastify';
import { query, getMongo } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';
import { validarPaciente } from '@renova/validacion';

/**
 * PacientesService — IMPLEMENTADO como EJEMPLO DE REFERENCIA.
 * Cubre: RegistroPacienteService, ConsultaPacienteService, HistoriaClinicaService (Mongo).
 * Responsable sugerido: Yordy Neyra.
 *
 * Copia este patrón (validación -> query parametrizada -> respuesta ApiResponse) en tu servicio.
 */
export async function registrarRutas(app: FastifyInstance) {
  // ---- LISTAR / BUSCAR ----
  app.get('/', { preHandler: requireAuth() }, async (req) => {
    const { dni } = req.query as { dni?: string };
    const rows = dni
      ? await query('SELECT * FROM pacientes.pacientes WHERE dni = $1', [dni])
      : await query('SELECT * FROM pacientes.pacientes ORDER BY creado_en DESC LIMIT 100');
    return { ok: true, data: rows };
  });

  // ---- DETALLE ----
  app.get('/:id', { preHandler: requireAuth() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const rows = await query('SELECT * FROM pacientes.pacientes WHERE id = $1', [id]);
    if (!rows[0]) return reply.code(404).send({ ok: false, error: 'Paciente no encontrado' });
    return { ok: true, data: rows[0] };
  });

  // ---- REGISTRAR (anti-duplicidad por DNI) ----
  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req, reply) => {
    const body = req.body as any;
    const v = validarPaciente(body);
    if (!v.valido) return reply.code(400).send({ ok: false, error: v.errores.join(', ') });

    const dup = await query('SELECT id FROM pacientes.pacientes WHERE dni = $1', [body.dni]);
    if (dup[0]) return reply.code(409).send({ ok: false, error: 'Ya existe un paciente con ese DNI' });

    const rows = await query(
      `INSERT INTO pacientes.pacientes (dni, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [body.dni, body.nombres, body.apellidos, body.fecha_nacimiento ?? null,
       body.sexo ?? null, body.telefono ?? null, body.email ?? null, body.direccion ?? null],
    );
    return reply.code(201).send({ ok: true, data: rows[0] });
  });

  // ---- HISTORIA CLÍNICA (MongoDB) ----
  app.get('/:id/historia', { preHandler: requireAuth(['ADMIN', 'MEDICO']) }, async (req) => {
    const { id } = req.params as { id: string };
    const p = await query<{ dni: string }>('SELECT dni FROM pacientes.pacientes WHERE id = $1', [id]);
    const db = await getMongo();
    const hc = p[0] ? await db.collection('historias_clinicas').findOne({ dni: p[0].dni }) : null;
    return { ok: true, data: hc };
  });

  // TODO (Yordy): POST /:id/historia para agregar un episodio a la HC en Mongo.
}
