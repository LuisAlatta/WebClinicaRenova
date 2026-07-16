-- ============ DOMINIO: LABORATORIO ============
SET search_path TO laboratorio;

-- Catálogo de áreas de laboratorio
CREATE TABLE areas_laboratorio (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(80) NOT NULL
);

-- Catálogo de tipos de examen por área, con valores de referencia
CREATE TABLE tipos_examen_catalogo (
  id              SERIAL PRIMARY KEY,
  area_id         INT NOT NULL REFERENCES areas_laboratorio(id),
  codigo          VARCHAR(30) UNIQUE NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  unidad_resultado VARCHAR(30),         -- mg/dL, g/dL, %, etc.
  valor_ref_min   NUMERIC,              -- referencia mínima (adulto general)
  valor_ref_max   NUMERIC,              -- referencia máxima (adulto general)
  activo          BOOL NOT NULL DEFAULT true
);

-- Equipos de laboratorio (para verificar disponibilidad por área)
CREATE TABLE equipos (
  id      SERIAL PRIMARY KEY,
  area_id INT NOT NULL REFERENCES areas_laboratorio(id),
  nombre  VARCHAR(80) NOT NULL,
  activo  BOOL NOT NULL DEFAULT true
);

-- Solicitudes de examen (enriquecida)
CREATE TABLE solicitudes_examen (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         UUID NOT NULL,
  medico_id           UUID NOT NULL,
  tipo_examen_id      INT REFERENCES tipos_examen_catalogo(id),
  tipo_examen         VARCHAR(120) NOT NULL,   -- snapshot del nombre (retrocompatibilidad)
  area_id             INT REFERENCES areas_laboratorio(id),
  equipo_id           INT REFERENCES equipos(id),
  prioridad           VARCHAR(20) NOT NULL DEFAULT 'NORMAL',   -- NORMAL | URGENTE
  estado              VARCHAR(30) NOT NULL DEFAULT 'SOLICITADO', -- SOLICITADO | EN_PROCESO | FINALIZADO
  fecha_programada    TIMESTAMPTZ,              -- cuándo está agendado (para vista diaria)
  observaciones_solicitud TEXT,
  solicitado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitudes_paciente  ON solicitudes_examen(paciente_id);
CREATE INDEX idx_solicitudes_estado    ON solicitudes_examen(estado);
CREATE INDEX idx_solicitudes_fecha     ON solicitudes_examen(fecha_programada);
CREATE INDEX idx_solicitudes_medico    ON solicitudes_examen(medico_id);

-- Resultados estructurados
CREATE TABLE resultados (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id  UUID NOT NULL REFERENCES solicitudes_examen(id) ON DELETE CASCADE,
  tecnico_id    UUID,                    -- usuario que procesó el examen
  resultado     JSONB,                   -- valores del examen (flexible por tipo)
  observaciones TEXT,
  recibido_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (solicitud_id)                  -- garantiza relación 1:1
);

-- ── Seed de catálogo ────────────────────────────────────────────────────────
INSERT INTO areas_laboratorio (codigo, nombre) VALUES
  ('HEMAT',  'Hematología'),
  ('QUIM',   'Química Clínica'),
  ('IMAGEN', 'Imagenología'),
  ('MICRO',  'Microbiología'),
  ('URINA',  'Urianálisis');

INSERT INTO tipos_examen_catalogo (area_id, codigo, nombre, unidad_resultado, valor_ref_min, valor_ref_max) VALUES
  (1,'HEMO',  'Hemograma completo',     NULL,   NULL, NULL),
  (1,'HGB',   'Hemoglobina',            'g/dL', 12.0, 17.5),
  (1,'HTO',   'Hematocrito',            '%',    36.0, 52.0),
  (2,'GLU',   'Glucosa en ayunas',      'mg/dL',70.0,100.0),
  (2,'CREA',  'Creatinina',             'mg/dL', 0.6,  1.2),
  (2,'UREA',  'Urea',                   'mg/dL',10.0, 50.0),
  (2,'LIPID', 'Perfil lipídico',        NULL,   NULL, NULL),
  (2,'COLT',  'Colesterol total',       'mg/dL',NULL,200.0),
  (2,'TGO',   'TGO (AST)',              'U/L',  10.0, 40.0),
  (3,'RXT',   'Radiografía de tórax',   NULL,   NULL, NULL),
  (3,'RXL',   'Radiografía lumbar',     NULL,   NULL, NULL),
  (3,'ECOA',  'Ecografía abdominal',    NULL,   NULL, NULL),
  (4,'CULT',  'Cultivo y antibiograma', NULL,   NULL, NULL),
  (5,'ORINA', 'Orina completa',         NULL,   NULL, NULL),
  (5,'UROCU', 'Urocultivo',             NULL,   NULL, NULL);

INSERT INTO equipos (area_id, nombre) VALUES
  (1,'Analizador hematológico A'),
  (2,'Analizador bioquímico B'),
  (3,'Equipo de rayos X digital'),
  (3,'Ecógrafo'),
  (4,'Incubadora microbiológica'),
  (5,'Analizador de orina');
