-- ============ DOMINIO: FACTURACIÓN Y PAGOS ============
SET search_path TO facturacion;

CREATE TABLE facturas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id   UUID NOT NULL,
  tipo_comprobante VARCHAR(20) NOT NULL DEFAULT 'BOLETA', -- BOLETA | FACTURA
  serie         VARCHAR(10),
  numero        VARCHAR(20),
  subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0,
  igv           NUMERIC(10,2) NOT NULL DEFAULT 0,         -- 18%
  total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado        VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE | PAGADO | ANULADO
  emitida_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE detalle_factura (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id   UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  descripcion  VARCHAR(200) NOT NULL,
  cantidad     INTEGER NOT NULL DEFAULT 1,
  precio_unit  NUMERIC(10,2) NOT NULL DEFAULT 0,
  importe      NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE pagos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id    UUID NOT NULL REFERENCES facturas(id),
  metodo_pago_id INTEGER,                 -- ref maestras.metodos_pago(id)
  monto         NUMERIC(10,2) NOT NULL,
  pagado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
