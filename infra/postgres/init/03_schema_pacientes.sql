-- ============ DOMINIO: PACIENTES ============
SET search_path TO pacientes;

CREATE TABLE pacientes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni               VARCHAR(8) UNIQUE NOT NULL,     -- anti-duplicidad por DNI
  nombres           VARCHAR(120) NOT NULL,
  apellidos         VARCHAR(120) NOT NULL,
  fecha_nacimiento  DATE,
  sexo              CHAR(1) CHECK (sexo IN ('M','F')),
  telefono          VARCHAR(20),
  email             VARCHAR(120),
  direccion         TEXT,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pacientes_dni ON pacientes(dni);

CREATE TABLE contactos_emergencia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  nombre      VARCHAR(120) NOT NULL,
  parentesco  VARCHAR(40),
  telefono    VARCHAR(20)
);

CREATE TABLE antecedentes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tipo        VARCHAR(40),                  -- alergia | enfermedad | cirugia previa
  descripcion TEXT,
  registrado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nota: la HISTORIA CLÍNICA detallada vive en MongoDB (colección historias_clinicas).
