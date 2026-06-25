-- ============ TABLAS MAESTRAS / CATÁLOGOS ============
SET search_path TO maestras;

CREATE TABLE especialidades (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE tipos_procedimiento (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL
);

CREATE TABLE tipos_anestesia (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(80) NOT NULL
);

-- Catálogo de estados reutilizable por entidad (consulta/cirugia/internamiento/factura...)
CREATE TABLE estados (
  id      SERIAL PRIMARY KEY,
  entidad VARCHAR(40) NOT NULL,      -- consulta | cirugia | internamiento | factura | examen
  codigo  VARCHAR(30) NOT NULL,      -- PROGRAMADO | EN_PROCESO | FINALIZADO | CANCELADO ...
  nombre  VARCHAR(60) NOT NULL,
  UNIQUE (entidad, codigo)
);

CREATE TABLE metodos_pago (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(60) NOT NULL
);

-- Médicos / personal clínico (referenciado por citas, hospitalización, etc.)
CREATE TABLE medicos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID,                       -- enlaza con auth.usuarios (sin FK cross-schema dura)
  nombres         VARCHAR(120) NOT NULL,
  apellidos       VARCHAR(120) NOT NULL,
  especialidad_id INTEGER REFERENCES especialidades(id),
  cmp             VARCHAR(20),                -- colegiatura
  activo          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE consultorios (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  piso   INTEGER,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE salas_quirurgicas (
  id     SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  piso   INTEGER,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);
