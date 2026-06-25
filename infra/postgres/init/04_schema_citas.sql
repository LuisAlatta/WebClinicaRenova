-- ============ DOMINIO: CITAS, CONSULTAS Y CIRUGÍAS ============
SET search_path TO citas;

CREATE TABLE consultas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id     UUID NOT NULL,                 -- ref pacientes.pacientes(id)
  medico_id       UUID NOT NULL,                 -- ref maestras.medicos(id)
  consultorio_id  INTEGER,                       -- ref maestras.consultorios(id)
  especialidad_id INTEGER,
  fecha_hora      TIMESTAMPTZ NOT NULL,
  motivo          TEXT,
  estado          VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADO',
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consultas_fecha ON consultas(fecha_hora);
CREATE INDEX idx_consultas_medico ON consultas(medico_id, fecha_hora);

CREATE TABLE cirugias (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id        UUID NOT NULL,
  cirujano_id        UUID NOT NULL,
  anestesiologo_id   UUID,
  sala_id            INTEGER,                     -- ref maestras.salas_quirurgicas(id)
  tipo_procedimiento_id INTEGER,
  tipo_anestesia_id  INTEGER,
  fecha_hora         TIMESTAMPTZ NOT NULL,
  duracion_min       INTEGER,
  estado             VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADO',
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cirugias_fecha ON cirugias(fecha_hora);

-- Bloqueos de agenda (para ValidarDisponibilidad)
CREATE TABLE bloqueos_agenda (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_tipo VARCHAR(20) NOT NULL,             -- medico | consultorio | sala
  recurso_id  VARCHAR(60) NOT NULL,
  inicio      TIMESTAMPTZ NOT NULL,
  fin         TIMESTAMPTZ NOT NULL
);
