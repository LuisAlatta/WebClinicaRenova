-- ============================================================
--  MIGRACIÓN — Observaciones de revisión (julio 2026)
--  Idempotente: se puede correr varias veces sin romper datos.
--  Aplica sobre una base YA creada (no borra información).
--
--  Ejecutar:
--    docker exec -i renova_postgres psql -U renova -d renova \
--      < infra/postgres/migraciones/2026-07_observaciones.sql
-- ============================================================

-- ---------- PACIENTES: tipo de documento + canal de contacto ----------
ALTER TABLE pacientes.pacientes
  ADD COLUMN IF NOT EXISTS tipo_documento  VARCHAR(12) NOT NULL DEFAULT 'DNI';
ALTER TABLE pacientes.pacientes
  ADD COLUMN IF NOT EXISTS canal_preferido VARCHAR(12) NOT NULL DEFAULT 'email';
-- El nro. de documento debe admitir C.E./Pasaporte/CONADIS (alfanuméricos y más largos).
ALTER TABLE pacientes.pacientes
  ALTER COLUMN dni TYPE VARCHAR(20);

-- ---------- CITAS: especialidad y cama de recuperación en cirugía ----------
ALTER TABLE citas.cirugias
  ADD COLUMN IF NOT EXISTS especialidad_id INTEGER;
ALTER TABLE citas.cirugias
  ADD COLUMN IF NOT EXISTS cama_id INTEGER;

-- ---------- HOSPITALIZACIÓN: especialidad y referencias de traslado ----------
ALTER TABLE hospitalizacion.internamientos
  ADD COLUMN IF NOT EXISTS especialidad_id     INTEGER;
ALTER TABLE hospitalizacion.internamientos
  ADD COLUMN IF NOT EXISTS referencia_origen   TEXT;
ALTER TABLE hospitalizacion.internamientos
  ADD COLUMN IF NOT EXISTS referencia_destino  TEXT;
