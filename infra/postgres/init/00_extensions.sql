-- Extensiones globales
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- búsquedas sin tildes

-- Esquemas por dominio (SOA: cada servicio es dueño de su esquema)
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS maestras;
CREATE SCHEMA IF NOT EXISTS pacientes;
CREATE SCHEMA IF NOT EXISTS citas;
CREATE SCHEMA IF NOT EXISTS hospitalizacion;
CREATE SCHEMA IF NOT EXISTS farmacia;
CREATE SCHEMA IF NOT EXISTS laboratorio;
CREATE SCHEMA IF NOT EXISTS facturacion;
