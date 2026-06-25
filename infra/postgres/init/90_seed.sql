-- ============================================================
--  SEED / DATOS DEMO  (password de todos los usuarios: renova123)
-- ============================================================

-- ---------- AUTH ----------
INSERT INTO auth.roles (codigo, nombre, descripcion) VALUES
  ('ADMIN',     'Administrador', 'Acceso total al sistema'),
  ('MEDICO',    'Médico',        'Atención clínica y consultas'),
  ('ASISTENTE', 'Asistente',     'Admisión, agenda y soporte');

-- hash bcrypt de 'renova123'
INSERT INTO auth.usuarios (email, password_hash, nombres, apellidos, rol_id) VALUES
  ('admin@renova.pe',    '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Luis',     'Alatta',     (SELECT id FROM auth.roles WHERE codigo='ADMIN')),
  ('medico@renova.pe',   '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Yordy',    'Neyra',      (SELECT id FROM auth.roles WHERE codigo='MEDICO')),
  ('asistente@renova.pe','$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Jose',     'Ugarte',     (SELECT id FROM auth.roles WHERE codigo='ASISTENTE')),
  ('medico2@renova.pe',  '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Sebastian','Ticlavilca', (SELECT id FROM auth.roles WHERE codigo='MEDICO'));

INSERT INTO auth.permisos (codigo, nombre) VALUES
  ('pacientes:gestionar','Gestionar pacientes'),
  ('citas:gestionar','Gestionar citas'),
  ('farmacia:gestionar','Gestionar farmacia'),
  ('reportes:ver','Ver reportes');

-- ---------- MAESTRAS ----------
INSERT INTO maestras.especialidades (codigo, nombre) VALUES
  ('MG','Medicina General'), ('CAR','Cardiología'), ('PED','Pediatría'),
  ('TRA','Traumatología'), ('GIN','Ginecología'), ('CIR','Cirugía General');

INSERT INTO maestras.tipos_procedimiento (codigo, nombre) VALUES
  ('APEND','Apendicectomía'), ('COLE','Colecistectomía'),
  ('CESAR','Cesárea'), ('HERN','Herniorrafia');

INSERT INTO maestras.tipos_anestesia (codigo, nombre) VALUES
  ('GEN','General'), ('REG','Regional'), ('LOC','Local');

INSERT INTO maestras.estados (entidad, codigo, nombre) VALUES
  ('consulta','PROGRAMADO','Programado'), ('consulta','EN_PROCESO','En proceso'),
  ('consulta','FINALIZADO','Finalizado'), ('consulta','CANCELADO','Cancelado'),
  ('cirugia','PROGRAMADO','Programado'), ('cirugia','EN_PROCESO','En proceso'),
  ('cirugia','FINALIZADO','Finalizado'), ('cirugia','CANCELADO','Cancelado'),
  ('internamiento','EN_PROCESO','En proceso'), ('internamiento','FINALIZADO','Finalizado'),
  ('factura','PENDIENTE','Pendiente'), ('factura','PAGADO','Pagado'), ('factura','ANULADO','Anulado'),
  ('examen','SOLICITADO','Solicitado'), ('examen','EN_PROCESO','En proceso'), ('examen','FINALIZADO','Finalizado');

INSERT INTO maestras.metodos_pago (codigo, nombre) VALUES
  ('EFEC','Efectivo'), ('TARJ','Tarjeta'), ('YAPE','Yape/Plin'), ('TRANS','Transferencia');

INSERT INTO maestras.medicos (nombres, apellidos, especialidad_id, cmp) VALUES
  ('Yordy','Neyra',     (SELECT id FROM maestras.especialidades WHERE codigo='CAR'), 'CMP12345'),
  ('Sebastian','Ticlavilca', (SELECT id FROM maestras.especialidades WHERE codigo='TRA'), 'CMP67890'),
  ('Ana','Quispe',      (SELECT id FROM maestras.especialidades WHERE codigo='PED'), 'CMP11223');

INSERT INTO maestras.consultorios (codigo, piso) VALUES ('C-101',1), ('C-102',1), ('C-201',2);
INSERT INTO maestras.salas_quirurgicas (codigo, piso) VALUES ('SOP-1',3), ('SOP-2',3);

-- ---------- PACIENTES ----------
INSERT INTO pacientes.pacientes (dni, nombres, apellidos, fecha_nacimiento, sexo, telefono, email) VALUES
  ('72345678','Carlos','Mamani Flores','1990-05-12','M','987654321','carlos.m@gmail.com'),
  ('45678912','María','Huanca Ccama','1985-11-03','F','912345678','maria.h@gmail.com'),
  ('60123456','Pedro','Condori Apaza','2001-02-20','M','998877665','pedro.c@gmail.com'),
  ('41239876','Lucía','Vargas Ríos','1978-07-30','F','977665544','lucia.v@gmail.com');

-- ---------- FARMACIA ----------
INSERT INTO farmacia.medicamentos (codigo, nombre, presentacion, stock_minimo, precio_unit) VALUES
  ('MED-001','Paracetamol 500mg','Caja x 100 tab', 50, 0.20),
  ('MED-002','Amoxicilina 500mg','Caja x 100 cap', 30, 0.50),
  ('MED-003','Ibuprofeno 400mg','Caja x 100 tab', 40, 0.30),
  ('MED-004','Suero Fisiológico 1L','Bolsa', 20, 5.00);

INSERT INTO farmacia.lotes (medicamento_id, numero_lote, cantidad, fecha_vencimiento)
SELECT id, 'L-2026-A', 200, '2027-12-31' FROM farmacia.medicamentos;

-- ---------- HOSPITALIZACIÓN ----------
INSERT INTO hospitalizacion.camas (codigo, piso) VALUES
  ('CAMA-201',2), ('CAMA-202',2), ('CAMA-301',3), ('CAMA-302',3);

-- ---------- CITAS (ejemplo) ----------
INSERT INTO citas.consultas (paciente_id, medico_id, consultorio_id, especialidad_id, fecha_hora, motivo)
VALUES (
  (SELECT id FROM pacientes.pacientes WHERE dni='72345678'),
  (SELECT id FROM maestras.medicos WHERE cmp='CMP12345'),
  (SELECT id FROM maestras.consultorios WHERE codigo='C-101'),
  (SELECT id FROM maestras.especialidades WHERE codigo='CAR'),
  now() + interval '1 day', 'Dolor torácico - evaluación cardiológica'
);

-- ---------- LABORATORIO (ejemplo) ----------
INSERT INTO laboratorio.solicitudes_examen (paciente_id, medico_id, tipo_examen, prioridad)
VALUES (
  (SELECT id FROM pacientes.pacientes WHERE dni='45678912'),
  (SELECT id FROM maestras.medicos WHERE cmp='CMP12345'),
  'Hemograma completo', 'NORMAL'
);
