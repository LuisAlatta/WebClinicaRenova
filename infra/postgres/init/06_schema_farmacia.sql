-- ============ DOMINIO: FARMACIA ============
SET search_path TO farmacia;

CREATE TABLE medicamentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        VARCHAR(30) UNIQUE NOT NULL,
  nombre        VARCHAR(150) NOT NULL,
  presentacion  VARCHAR(80),
  stock_minimo  INTEGER NOT NULL DEFAULT 10,
  precio_unit   NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE lotes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id UUID NOT NULL REFERENCES medicamentos(id),
  numero_lote    VARCHAR(40) NOT NULL,
  cantidad       INTEGER NOT NULL DEFAULT 0,
  fecha_vencimiento DATE
);
CREATE INDEX idx_lotes_medicamento ON lotes(medicamento_id);

CREATE TABLE movimientos_stock (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicamento_id UUID NOT NULL REFERENCES medicamentos(id),
  tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('INGRESO','EGRESO')),
  cantidad       INTEGER NOT NULL,
  motivo         VARCHAR(120),
  fecha          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE despachos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id    UUID NOT NULL,
  medicamento_id UUID NOT NULL REFERENCES medicamentos(id),
  cantidad       INTEGER NOT NULL,
  orden_medica   VARCHAR(60),
  fecha          TIMESTAMPTZ NOT NULL DEFAULT now()
);
