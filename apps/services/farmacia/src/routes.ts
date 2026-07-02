import type { FastifyInstance } from 'fastify';
import { requireAuth } from '@renova/auth-jwt';
import { pgPool, query } from '@renova/db';
import { publicarNotificacion } from '@renova/eventos';

/**
 * FarmaciaService — Implementado.
 * Esquemas DB: farmacia.medicamentos, farmacia.lotes, farmacia.movimientos_stock, farmacia.despachos.
 */
export async function registrarRutas(app: FastifyInstance) {
  // GET /stock -> medicamentos con su stock total (Todos los autenticados)
  app.get('/stock', { preHandler: requireAuth() }, async () => {
    const stock = await query(`
      SELECT m.id, m.codigo, m.nombre, m.presentacion, m.stock_minimo, m.precio_unit, m.activo,
             COALESCE(SUM(l.cantidad), 0)::int as stock_total
      FROM farmacia.medicamentos m
      LEFT JOIN farmacia.lotes l ON m.id = l.medicamento_id
      GROUP BY m.id
      ORDER BY m.nombre ASC
    `);
    return { ok: true, data: stock };
  });

  // POST /medicamentos -> registrar medicamento nuevo (Solo ASISTENTE)
  app.post('/medicamentos', { preHandler: requireAuth(['ASISTENTE']) }, async (req, reply) => {
    const { codigo, nombre, presentacion, stock_minimo, precio_unit } = req.body as any;

    if (!codigo || !nombre) {
      return reply.code(422).send({ ok: false, error: 'Código y nombre son obligatorios' });
    }

    try {
      const rows = await query(`
        INSERT INTO farmacia.medicamentos (codigo, nombre, presentacion, stock_minimo, precio_unit)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [codigo, nombre, presentacion, stock_minimo, precio_unit]);
      return { ok: true, data: { id: rows[0].id } };
    } catch (e: any) {
      if (e.code === '23505') { // unique_violation
        return reply.code(409).send({ ok: false, error: 'Ya existe un medicamento con ese código' });
      }
      return reply.code(500).send({ ok: false, error: e.message || 'Error al registrar medicamento' });
    }
  });

  // POST /lotes -> ingresar lote a inventario (Solo ASISTENTE)
  app.post('/lotes', { preHandler: requireAuth(['ASISTENTE']) }, async (req, reply) => {
    const { medicamento_id, numero_lote, cantidad, fecha_vencimiento } = req.body as any;

    if (!medicamento_id || !numero_lote || !cantidad || cantidad <= 0) {
      return reply.code(422).send({ ok: false, error: 'Datos de lote inválidos' });
    }

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // Verificar que el medicamento existe
      const medRes = await client.query('SELECT id FROM farmacia.medicamentos WHERE id = $1', [medicamento_id]);
      if (medRes.rowCount === 0) {
        throw new Error('El medicamento no existe');
      }

      // Insertar lote
      const rows = await client.query(`
        INSERT INTO farmacia.lotes (medicamento_id, numero_lote, cantidad, fecha_vencimiento)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [medicamento_id, numero_lote, cantidad, fecha_vencimiento]);

      // Registrar movimiento de ingreso
      await client.query(`
        INSERT INTO farmacia.movimientos_stock (medicamento_id, tipo, cantidad, motivo)
        VALUES ($1, 'INGRESO', $2, $3)
      `, [medicamento_id, cantidad, `Ingreso de lote ${numero_lote}`]);

      await client.query('COMMIT');
      return { ok: true, data: { id: rows.rows[0].id } };
    } catch (e: any) {
      await client.query('ROLLBACK');
      return reply.code(500).send({ ok: false, error: e.message || 'Error al ingresar lote' });
    } finally {
      client.release();
    }
  });

  // POST /despachos -> entregar medicamento (descuenta stock FEFO, registra movimiento EGRESO) (MEDICO, ASISTENTE)
  app.post('/despachos', { preHandler: requireAuth(['MEDICO', 'ASISTENTE']) }, async (req, reply) => {
    const { paciente_id, medicamento_id, cantidad, orden_medica } = req.body as any;

    if (!paciente_id || !medicamento_id || !cantidad || cantidad <= 0) {
      return reply.code(422).send({ ok: false, error: 'Datos de despacho inválidos' });
    }

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener medicamento y calcular stock actual sumando lotes
      const medRes = await client.query(`
        SELECT m.id, m.nombre, m.stock_minimo, COALESCE(SUM(l.cantidad), 0)::int as stock_actual
        FROM farmacia.medicamentos m
        LEFT JOIN farmacia.lotes l ON m.id = l.medicamento_id
        WHERE m.id = $1 AND m.activo = true
        GROUP BY m.id
      `, [medicamento_id]);

      if (medRes.rowCount === 0) {
        throw new Error('Medicamento no encontrado o inactivo');
      }

      const med = medRes.rows[0];
      let stockRestante = med.stock_actual;

      if (cantidad > stockRestante) {
        // Lanzamos un 409 Conflict si no hay stock
        return reply.code(409).send({ ok: false, error: 'Stock insuficiente para despachar' });
      }

      // 2. Obtener lotes disponibles ordenados por fecha de vencimiento (Algoritmo FEFO)
      const lotesRes = await client.query(`
        SELECT id, cantidad, numero_lote 
        FROM farmacia.lotes 
        WHERE medicamento_id = $1 AND cantidad > 0 
        ORDER BY fecha_vencimiento ASC
      `, [medicamento_id]);

      let cantidadPorDespachar = cantidad;

      // 3. Iterar y descontar stock de los lotes
      for (const lote of lotesRes.rows) {
        if (cantidadPorDespachar <= 0) break;

        const aDescontar = Math.min(lote.cantidad, cantidadPorDespachar);

        await client.query(`
          UPDATE farmacia.lotes 
          SET cantidad = cantidad - $1 
          WHERE id = $2
        `, [aDescontar, lote.id]);

        cantidadPorDespachar -= aDescontar;
      }

      if (cantidadPorDespachar > 0) {
        throw new Error('Error al descontar lotes: inconsistencia de inventario');
      }

      // 4. Insertar en tabla de despachos
      await client.query(`
        INSERT INTO farmacia.despachos (paciente_id, medicamento_id, cantidad, orden_medica)
        VALUES ($1, $2, $3, $4)
      `, [paciente_id, medicamento_id, cantidad, orden_medica]);

      // 5. Insertar auditoría de movimiento (EGRESO)
      await client.query(`
        INSERT INTO farmacia.movimientos_stock (medicamento_id, tipo, cantidad, motivo)
        VALUES ($1, 'EGRESO', $2, $3)
      `, [medicamento_id, cantidad, `Despacho a paciente ${paciente_id}`]);

      // 6. Verificar alerta por stock mínimo tras el despacho
      stockRestante -= cantidad;
      if (stockRestante < med.stock_minimo) {
        // Enviar notificación asíncrona a la cola (BullMQ)
        await publicarNotificacion({
          canal: 'email',
          destino: 'jefe.farmacia@renova.pe',
          asunto: `ALERTA: Stock bajo para ${med.nombre}`,
          mensaje: `El medicamento ${med.nombre} ha caído por debajo del mínimo (${stockRestante} < ${med.stock_minimo}). Por favor gestione la reposición.`,
          tipo: 'alerta'
        });
      }

      await client.query('COMMIT');
      return { ok: true, data: { mensaje: 'Despacho registrado correctamente', stock_restante: stockRestante } };

    } catch (e: any) {
      await client.query('ROLLBACK');
      return reply.code(500).send({ ok: false, error: e.message || 'Error interno del servidor' });
    } finally {
      client.release();
    }
  });

  // GET /alertas -> medicamentos bajo stock mínimo o lotes por vencer (ADMIN y ASISTENTE)
  app.get('/alertas', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async () => {
    // 1. Medicamentos cuyo stock total es menor o igual al stock mínimo
    const bajo_minimo = await query(`
      SELECT m.id, m.codigo, m.nombre, m.stock_minimo, COALESCE(SUM(l.cantidad), 0)::int as stock_total
      FROM farmacia.medicamentos m
      LEFT JOIN farmacia.lotes l ON m.id = l.medicamento_id
      WHERE m.activo = true
      GROUP BY m.id
      HAVING COALESCE(SUM(l.cantidad), 0) <= m.stock_minimo
    `);

    // 2. Lotes próximos a vencer (≤ 30 días)
    const por_vencer = await query(`
      SELECT m.nombre as medicamento, l.numero_lote, l.cantidad, l.fecha_vencimiento,
             (l.fecha_vencimiento - CURRENT_DATE)::int as dias_restantes
      FROM farmacia.lotes l
      JOIN farmacia.medicamentos m ON l.medicamento_id = m.id
      WHERE l.cantidad > 0 
        AND l.fecha_vencimiento <= CURRENT_DATE + interval '30 days'
      ORDER BY l.fecha_vencimiento ASC
    `);

    return { ok: true, data: { bajo_minimo, por_vencer } };
  });

  // GET /movimientos -> Historial de movimientos (ingresos y egresos)
  app.get('/movimientos', { preHandler: requireAuth(['ADMIN', 'ASISTENTE', 'MEDICO']) }, async () => {
    const movimientos = await query(`
      SELECT mov.id, med.nombre as medicamento, mov.tipo, mov.cantidad, mov.motivo, mov.fecha,
             d.paciente_id
      FROM farmacia.movimientos_stock mov
      JOIN farmacia.medicamentos med ON mov.medicamento_id = med.id
      LEFT JOIN farmacia.despachos d
        ON mov.tipo = 'EGRESO'
        AND d.medicamento_id = mov.medicamento_id
        AND d.fecha::timestamptz BETWEEN mov.fecha - interval '2 seconds' AND mov.fecha + interval '2 seconds'
      ORDER BY mov.fecha DESC
      LIMIT 50
    `);
    return { ok: true, data: movimientos };
  });
}
