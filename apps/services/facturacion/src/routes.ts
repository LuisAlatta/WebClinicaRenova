import type { FastifyInstance } from 'fastify';
import { query, getMongo } from '@renova/db';
import { requireAuth } from '@renova/auth-jwt';
import { publicarNotificacion } from '@renova/eventos';

const IGV = 0.18;

/**
 * FacturacionService — generación de comprobantes y registro de pagos.
 * Flujo: consolidar consumos -> generar factura (IGV 18%) -> verificar método de pago
 *        -> registrar pago (total o parcial) -> log transacción -> email comprobante.
 */
export async function registrarRutas(app: FastifyInstance) {
  // LISTAR
  app.get('/', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: await query('SELECT * FROM facturacion.facturas ORDER BY emitida_en DESC LIMIT 100'),
  }));

  // MÉTODOS DE PAGO habilitados (catálogo maestro)
  app.get('/metodos', { preHandler: requireAuth() }, async () => ({
    ok: true,
    data: await query('SELECT id, codigo, nombre FROM maestras.metodos_pago ORDER BY nombre'),
  }));

  // DETALLE
  app.get('/:id', { preHandler: requireAuth() }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const fac = await query('SELECT * FROM facturacion.facturas WHERE id=$1', [id]);
    if (!fac[0]) return reply.code(404).send({ ok: false, error: 'Factura no encontrada' });
    const detalle = await query('SELECT * FROM facturacion.detalle_factura WHERE factura_id=$1', [id]);
    const pagos = await query('SELECT * FROM facturacion.pagos WHERE factura_id=$1', [id]);
    return { ok: true, data: { ...fac[0], detalle, pagos } };
  });

  // GENERAR FACTURA
  app.post('/', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const b = req.body as { paciente_id: string; tipo_comprobante?: string; items: any[] };
    if (!b.paciente_id || !Array.isArray(b.items) || b.items.length === 0) {
      return reply.code(422).send({ ok: false, error: 'Paciente e ítems son requeridos' });
    }
    const items = b.items.map((it) => ({
      descripcion: String(it.descripcion ?? 'Servicio'),
      cantidad: Number(it.cantidad ?? 1),
      precio_unit: Number(it.precio_unit ?? 0),
      importe: Number(it.cantidad ?? 1) * Number(it.precio_unit ?? 0),
    }));
    if (items.some((i) => i.importe < 0 || isNaN(i.importe))) {
      return reply.code(422).send({ ok: false, error: 'Inconsistencia en los montos' });
    }
    const subtotal = +items.reduce((s, i) => s + i.importe, 0).toFixed(2);
    const igv = +(subtotal * IGV).toFixed(2);
    const total = +(subtotal + igv).toFixed(2);

    const fac = await query(
      `INSERT INTO facturacion.facturas (paciente_id, tipo_comprobante, subtotal, igv, total)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [b.paciente_id, b.tipo_comprobante ?? 'BOLETA', subtotal, igv, total],
    );
    const factura = fac[0];
    for (const it of items) {
      await query(
        `INSERT INTO facturacion.detalle_factura (factura_id, descripcion, cantidad, precio_unit, importe)
         VALUES ($1,$2,$3,$4,$5)`,
        [factura.id, it.descripcion, it.cantidad, it.precio_unit, it.importe],
      );
    }
    await auditar(req.usuario?.email, 'GENERAR_FACTURA', `factura:${factura.id}`);
    return reply.code(201).send({ ok: true, data: { ...factura, detalle: items } });
  });

  // REGISTRAR PAGO (total o parcial)
  app.post('/:id/pagos', { preHandler: requireAuth(['ADMIN', 'ASISTENTE']) }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const b = req.body as { metodo_pago_id?: number; monto: number };
    if (!b.monto || b.monto <= 0) return reply.code(422).send({ ok: false, error: 'Monto inválido' });

    const fac = await query<{ total: string }>('SELECT total FROM facturacion.facturas WHERE id=$1', [id]);
    if (!fac[0]) return reply.code(404).send({ ok: false, error: 'Factura no encontrada' });

    // Verificar método de pago habilitado
    if (b.metodo_pago_id) {
      const m = await query('SELECT id FROM maestras.metodos_pago WHERE id=$1', [b.metodo_pago_id]);
      if (!m[0]) return reply.code(422).send({ ok: false, error: 'Método de pago no habilitado' });
    }

    await query(
      'INSERT INTO facturacion.pagos (factura_id, metodo_pago_id, monto) VALUES ($1,$2,$3)',
      [id, b.metodo_pago_id ?? null, b.monto],
    );

    const pagado = await query<{ s: string }>('SELECT COALESCE(SUM(monto),0)::numeric s FROM facturacion.pagos WHERE factura_id=$1', [id]);
    const totalPagado = Number(pagado[0].s);
    const total = Number(fac[0].total);
    const estado = totalPagado >= total ? 'PAGADO' : 'PENDIENTE';
    const saldo = +(total - totalPagado).toFixed(2);
    await query('UPDATE facturacion.facturas SET estado=$1 WHERE id=$2', [estado, id]);

    await auditar(req.usuario?.email, 'REGISTRAR_PAGO', `factura:${id}`);
    // Email comprobante (best-effort)
    try {
      const p = await query<{ email: string }>(
        'SELECT email FROM pacientes.pacientes WHERE id=(SELECT paciente_id FROM facturacion.facturas WHERE id=$1)', [id],
      );
      if (p[0]?.email) {
        await publicarNotificacion({
          canal: 'email', destino: p[0].email, tipo: 'comprobante',
          asunto: 'Comprobante de pago - Clínica Renova',
          mensaje: estado === 'PAGADO' ? 'Pago registrado. Gracias por su preferencia.' : `Pago parcial registrado. Saldo pendiente S/ ${saldo}.`,
        });
      }
    } catch { /* notificación best-effort */ }

    return reply.code(201).send({ ok: true, data: { estado, totalPagado, saldo } });
  });
}

async function auditar(usuario: string | undefined, accion: string, recurso: string) {
  try {
    const db = await getMongo();
    await db.collection('auditoria_logs').insertOne({ fecha: new Date(), usuario: usuario || 'desconocido', accion, recurso });
  } catch { /* auditoría best-effort */ }
}
