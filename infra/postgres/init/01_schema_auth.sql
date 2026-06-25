-- ============ DOMINIO: SEGURIDAD / AUTH (RBAC) ============
SET search_path TO auth;

CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(30) UNIQUE NOT NULL,   -- ADMIN | MEDICO | ASISTENTE
  nombre      VARCHAR(80) NOT NULL,
  descripcion TEXT
);

CREATE TABLE usuarios (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(120) UNIQUE NOT NULL,
  password_hash   VARCHAR(200) NOT NULL,
  nombres         VARCHAR(120) NOT NULL,
  apellidos       VARCHAR(120) NOT NULL,
  rol_id          INTEGER NOT NULL REFERENCES roles(id),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);

-- Permisos finos opcionales (el RBAC base se hace por rol)
CREATE TABLE permisos (
  id      SERIAL PRIMARY KEY,
  codigo  VARCHAR(60) UNIQUE NOT NULL,       -- ej. pacientes:crear
  nombre  VARCHAR(120) NOT NULL
);

CREATE TABLE rol_permiso (
  rol_id     INTEGER REFERENCES roles(id),
  permiso_id INTEGER REFERENCES permisos(id),
  PRIMARY KEY (rol_id, permiso_id)
);
