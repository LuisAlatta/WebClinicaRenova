-- ============ DOMINIO: HOSPITALIZACIÓN ============
SET search_path TO hospitalizacion;

CREATE TABLE camas (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  piso   INTEGER,
  ocupada BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE internamientos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         UUID NOT NULL,
  medico_responsable_id UUID NOT NULL,
  cama_id             INTEGER REFERENCES camas(id),
  fecha_ingreso       TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_egreso        TIMESTAMPTZ,
  motivo_ingreso      TEXT,
  resumen_alta        TEXT,
  estado              VARCHAR(30) NOT NULL DEFAULT 'EN_PROCESO',  -- EN_PROCESO | FINALIZADO
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_internamientos_paciente ON internamientos(paciente_id);

CREATE TABLE seguimientos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internamiento_id UUID NOT NULL REFERENCES internamientos(id) ON DELETE CASCADE,
  fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT now(),
  temperatura     NUMERIC(4,1),
  presion_arterial VARCHAR(12),
  frecuencia_cardiaca INTEGER,
  observaciones   TEXT
);
