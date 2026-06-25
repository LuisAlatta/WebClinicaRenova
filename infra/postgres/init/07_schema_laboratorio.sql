-- ============ DOMINIO: LABORATORIO ============
SET search_path TO laboratorio;

CREATE TABLE solicitudes_examen (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  UUID NOT NULL,
  medico_id    UUID NOT NULL,
  tipo_examen  VARCHAR(120) NOT NULL,
  prioridad    VARCHAR(20) NOT NULL DEFAULT 'NORMAL',   -- NORMAL | URGENTE
  estado       VARCHAR(30) NOT NULL DEFAULT 'SOLICITADO', -- SOLICITADO | EN_PROCESO | FINALIZADO
  solicitado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_solicitudes_paciente ON solicitudes_examen(paciente_id);

CREATE TABLE resultados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id  UUID NOT NULL REFERENCES solicitudes_examen(id) ON DELETE CASCADE,
  resultado     JSONB,                 -- valores del examen (flexible)
  observaciones TEXT,
  recibido_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
