-- ============================================================
--  SEED / DATOS DEMO  (password de todos los usuarios: renova123)
-- ============================================================

-- ---------- AUTH ----------
-- Matriz de roles oficial (documento 2º avance, sección 5.1 RBAC)
INSERT INTO auth.roles (codigo, nombre, descripcion) VALUES
  ('ADMIN',        'Administrador',       'Acceso total: configuración, usuarios, auditoría y reportes'),
  ('MEDICO',       'Médico/Cirujano',     'Historia clínica, resultados de laboratorio y hospitalización'),
  ('ASISTENTE',    'Admisión/Administrativo','Registro de pacientes, citas/cirugías y facturación'),
  ('FARMACEUTICO', 'Personal de Farmacia','Inventario, stock y despacho de medicamentos'),
  ('LABORATORISTA','Personal de Laboratorio','Solicitudes y resultados de exámenes');

-- hash bcrypt de 'renova123'
INSERT INTO auth.usuarios (email, password_hash, nombres, apellidos, rol_id) VALUES
  ('admin@renova.pe',        '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Luis',     'Alatta',     (SELECT id FROM auth.roles WHERE codigo='ADMIN')),
  ('medico@renova.pe',       '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Yordy',    'Neyra',      (SELECT id FROM auth.roles WHERE codigo='MEDICO')),
  ('asistente@renova.pe',    '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Jose',     'Ugarte',     (SELECT id FROM auth.roles WHERE codigo='ASISTENTE')),
  ('medico2@renova.pe',      '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Sebastian','Ticlavilca', (SELECT id FROM auth.roles WHERE codigo='MEDICO')),
  ('farmaceutico@renova.pe', '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Rosa',     'Mendoza',    (SELECT id FROM auth.roles WHERE codigo='FARMACEUTICO')),
  ('laboratorista@renova.pe','$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Carlos',   'Ramos',      (SELECT id FROM auth.roles WHERE codigo='LABORATORISTA')),
  ('medico3@renova.pe',       '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Elena',   'Vega',       (SELECT id FROM auth.roles WHERE codigo='MEDICO')),
  ('asistente2@renova.pe',    '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Karina',  'Ponce',      (SELECT id FROM auth.roles WHERE codigo='ASISTENTE')),
  ('farmaceutico2@renova.pe', '$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Diego',   'Cárdenas',   (SELECT id FROM auth.roles WHERE codigo='FARMACEUTICO')),
  ('laboratorista2@renova.pe','$2b$10$eNgl7veTmfl.3C4.vREg4.oYNU4bttJGhnjBm1KFck2EX/DF7fFYq', 'Camila',  'Rojas',      (SELECT id FROM auth.roles WHERE codigo='LABORATORISTA'));

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

-- 3 médicos por cada especialidad (se conservan los CMP originales referenciados más abajo).
INSERT INTO maestras.medicos (nombres, apellidos, especialidad_id, cmp) VALUES
  -- Medicina General (MG)
  ('Rosa','Herrera',    (SELECT id FROM maestras.especialidades WHERE codigo='MG'),  'CMP20001'),
  ('Luis','Fernández',  (SELECT id FROM maestras.especialidades WHERE codigo='MG'),  'CMP20002'),
  ('Carmen','Díaz',     (SELECT id FROM maestras.especialidades WHERE codigo='MG'),  'CMP20003'),
  -- Cardiología (CAR)
  ('Yordy','Neyra',     (SELECT id FROM maestras.especialidades WHERE codigo='CAR'), 'CMP12345'),
  ('Manuel','Rojas',    (SELECT id FROM maestras.especialidades WHERE codigo='CAR'), 'CMP20004'),
  ('Patricia','Salas',  (SELECT id FROM maestras.especialidades WHERE codigo='CAR'), 'CMP20005'),
  -- Pediatría (PED)
  ('Ana','Quispe',      (SELECT id FROM maestras.especialidades WHERE codigo='PED'), 'CMP11223'),
  ('Jorge','Ramírez',   (SELECT id FROM maestras.especialidades WHERE codigo='PED'), 'CMP20006'),
  ('Elena','Vega',      (SELECT id FROM maestras.especialidades WHERE codigo='PED'), 'CMP20007'),
  -- Traumatología (TRA)
  ('Sebastian','Ticlavilca', (SELECT id FROM maestras.especialidades WHERE codigo='TRA'), 'CMP67890'),
  ('Óscar','Mendoza',   (SELECT id FROM maestras.especialidades WHERE codigo='TRA'), 'CMP20008'),
  ('Diana','Castro',    (SELECT id FROM maestras.especialidades WHERE codigo='TRA'), 'CMP20009'),
  -- Ginecología (GIN)
  ('María','Torres',    (SELECT id FROM maestras.especialidades WHERE codigo='GIN'), 'CMP20010'),
  ('Lucía','Ríos',      (SELECT id FROM maestras.especialidades WHERE codigo='GIN'), 'CMP20011'),
  ('Andrea','Campos',   (SELECT id FROM maestras.especialidades WHERE codigo='GIN'), 'CMP20012'),
  -- Cirugía General (CIR)
  ('Carlos','Vargas',   (SELECT id FROM maestras.especialidades WHERE codigo='CIR'), 'CMP20013'),
  ('Ricardo','Ponce',   (SELECT id FROM maestras.especialidades WHERE codigo='CIR'), 'CMP20014'),
  ('Sofía','Guzmán',    (SELECT id FROM maestras.especialidades WHERE codigo='CIR'), 'CMP20015');

-- 10 consultorios y 10 salas quirúrgicas
INSERT INTO maestras.consultorios (codigo, piso) VALUES
  ('C-101',1),('C-102',1),('C-103',1),('C-201',2),('C-202',2),
  ('C-203',2),('C-301',3),('C-302',3),('C-303',3),('C-401',4);
INSERT INTO maestras.salas_quirurgicas (codigo, piso) VALUES
  ('SOP-1',3),('SOP-2',3),('SOP-3',3),('SOP-4',4),('SOP-5',4),
  ('SOP-6',4),('SOP-7',5),('SOP-8',5),('SOP-9',5),('SOP-10',5);

-- ---------- PACIENTES (12) ----------
INSERT INTO pacientes.pacientes (tipo_documento, dni, nombres, apellidos, fecha_nacimiento, sexo, telefono, email, direccion) VALUES
  ('DNI','72345678','Carlos','Mamani Flores','1990-05-12','M','987654321','carlos.m@gmail.com','Av. Los Andes 123, Lima'),
  ('DNI','45678912','María','Huanca Ccama','1985-11-03','F','912345678','maria.h@gmail.com','Jr. Puno 456, Lima'),
  ('DNI','60123456','Pedro','Condori Apaza','2001-02-20','M','998877665','pedro.c@gmail.com','Calle Real 789, Cusco'),
  ('DNI','41239876','Lucía','Vargas Ríos','1978-07-30','F','977665544','lucia.v@gmail.com','Av. Grau 321, Arequipa'),
  ('DNI','70112233','Jorge','Salazar Núñez','1995-01-18','M','900111222','jorge.s@gmail.com','Jr. Lima 12, Lima'),
  ('DNI','80223344','Rosa','Chávez Pérez','1982-09-09','F','900222333','rosa.c@gmail.com','Av. Sol 45, Cusco'),
  ('DNI','50334455','Miguel','Rojas Díaz','1969-12-25','M','900333444','miguel.r@gmail.com','Calle Bolognesi 67, Tacna'),
  ('DNI','90445566','Elena','Paredes Soto','2005-06-14','F','900444555','elena.p@gmail.com','Av. Brasil 89, Lima'),
  ('DNI','30556677','Víctor','Gutiérrez Lara','1974-03-08','M','900555666','victor.g@gmail.com','Jr. Junín 101, Junín'),
  ('CE','A123456789','John','Smith','1988-03-15','M','991234567','john.s@gmail.com','Miraflores 202, Lima'),
  ('PASAPORTE','AB123456','Marie','Dupont','1992-09-22','F','992345678','marie.d@gmail.com','San Isidro 303, Lima'),
  ('CONADIS','C00123456','Ana','Torres Aliaga','1975-12-01','F','993456789','ana.t@gmail.com','Barranco 404, Lima');

-- ---------- FARMACIA (12 medicamentos) ----------
INSERT INTO farmacia.medicamentos (codigo, nombre, presentacion, stock_minimo, precio_unit) VALUES
  ('MED-001','Paracetamol 500mg','Caja x 100 tab',50,0.20),
  ('MED-002','Amoxicilina 500mg','Caja x 100 cap',30,0.50),
  ('MED-003','Ibuprofeno 400mg','Caja x 100 tab',40,0.30),
  ('MED-004','Suero Fisiológico 1L','Bolsa',20,5.00),
  ('MED-005','Omeprazol 20mg','Caja x 30 cap',30,0.40),
  ('MED-006','Metformina 850mg','Caja x 30 tab',25,0.35),
  ('MED-007','Losartán 50mg','Caja x 30 tab',25,0.45),
  ('MED-008','Salbutamol inhalador','Frasco',15,12.00),
  ('MED-009','Diclofenaco 50mg','Caja x 20 tab',30,0.25),
  ('MED-010','Cetirizina 10mg','Caja x 10 tab',20,0.30),
  ('MED-011','Azitromicina 500mg','Caja x 3 tab',20,1.20),
  ('MED-012','Dexametasona 4mg','Ampolla',15,2.50);

-- Un lote por medicamento (12) => define el stock inicial
INSERT INTO farmacia.lotes (medicamento_id, numero_lote, cantidad, fecha_vencimiento)
SELECT id, 'L-2026-' || substr(codigo,5),
       200,
       (date '2027-01-31' + (row_number() OVER (ORDER BY codigo))::int * 30)
FROM farmacia.medicamentos;

-- Movimientos de INGRESO (12) por cada lote inicial
INSERT INTO farmacia.movimientos_stock (medicamento_id, tipo, cantidad, motivo, fecha)
SELECT id, 'INGRESO', 200, 'Ingreso de lote inicial', now() - interval '20 days'
FROM farmacia.medicamentos;

-- Despachos a pacientes (12) + su movimiento de EGRESO
WITH p AS (SELECT id, row_number() OVER (ORDER BY dni) rn FROM pacientes.pacientes),
     md AS (SELECT id, row_number() OVER (ORDER BY codigo) rn FROM farmacia.medicamentos)
INSERT INTO farmacia.despachos (paciente_id, medicamento_id, cantidad, orden_medica, fecha)
SELECT p.id, md.id, 1 + (g.n % 5), 'REC-' || lpad(g.n::text,4,'0'), now() - ((g.n) || ' hours')::interval
FROM generate_series(1,12) AS g(n)
JOIN p  ON p.rn  = 1 + ((g.n-1) % (SELECT count(*) FROM p))
JOIN md ON md.rn = 1 + ((g.n-1) % (SELECT count(*) FROM md));

INSERT INTO farmacia.movimientos_stock (medicamento_id, tipo, cantidad, motivo, fecha)
SELECT medicamento_id, 'EGRESO', cantidad, 'Despacho a paciente', fecha FROM farmacia.despachos;

-- ---------- HOSPITALIZACIÓN (12 camas + 10 internamientos) ----------
INSERT INTO hospitalizacion.camas (codigo, piso) VALUES
  ('CAMA-201',2),('CAMA-202',2),('CAMA-203',2),('CAMA-204',2),
  ('CAMA-301',3),('CAMA-302',3),('CAMA-303',3),('CAMA-304',3),
  ('CAMA-401',4),('CAMA-402',4),('CAMA-403',4),('CAMA-404',4);

WITH p AS (SELECT id, row_number() OVER (ORDER BY dni) rn FROM pacientes.pacientes),
     m AS (SELECT id, especialidad_id, row_number() OVER (ORDER BY cmp) rn FROM maestras.medicos),
     cm AS (SELECT id, row_number() OVER (ORDER BY codigo) rn FROM hospitalizacion.camas)
INSERT INTO hospitalizacion.internamientos
  (paciente_id, medico_responsable_id, especialidad_id, cama_id, fecha_ingreso, fecha_egreso, motivo_ingreso, resumen_alta, estado)
SELECT p.id, m.id, m.especialidad_id, cm.id,
       now() - ((g.n) || ' days')::interval,
       CASE WHEN g.n % 2 = 0 THEN now() - ((g.n - 1) || ' days')::interval ELSE NULL END,
       (ARRAY['Observación clínica','Postoperatorio','Neumonía','Fractura de cadera','Control de diabetes'])[1 + (g.n % 5)],
       CASE WHEN g.n % 2 = 0 THEN 'Evolución favorable, se otorga alta.' ELSE NULL END,
       CASE WHEN g.n % 2 = 0 THEN 'ALTA' ELSE 'EN_PROCESO' END
FROM generate_series(1,10) AS g(n)
JOIN p  ON p.rn  = 1 + ((g.n-1) % (SELECT count(*) FROM p))
JOIN m  ON m.rn  = 1 + ((g.n-1) % (SELECT count(*) FROM m))
JOIN cm ON cm.rn = g.n;

-- Marca ocupadas las camas de internamientos en curso
UPDATE hospitalizacion.camas SET ocupada = true
WHERE id IN (SELECT cama_id FROM hospitalizacion.internamientos WHERE estado='EN_PROCESO' AND cama_id IS NOT NULL);

-- ---------- CITAS (12 consultas + 10 cirugías) ----------
WITH p AS (SELECT id, row_number() OVER (ORDER BY dni) rn FROM pacientes.pacientes),
     m AS (SELECT id, especialidad_id, row_number() OVER (ORDER BY cmp) rn FROM maestras.medicos),
     c AS (SELECT id, row_number() OVER (ORDER BY codigo) rn FROM maestras.consultorios)
INSERT INTO citas.consultas (paciente_id, medico_id, consultorio_id, especialidad_id, fecha_hora, motivo, estado)
SELECT p.id, m.id, c.id, m.especialidad_id,
       now() + ((g.n - 6) || ' days')::interval + ((8 + g.n) || ' hours')::interval,
       (ARRAY['Control de rutina','Dolor abdominal','Chequeo preventivo','Seguimiento de tratamiento','Evaluación general','Consulta por dolor'])[1 + (g.n % 6)],
       (ARRAY['PROGRAMADO','FINALIZADO','EN_PROCESO','PROGRAMADO'])[1 + (g.n % 4)]
FROM generate_series(1,12) AS g(n)
JOIN p ON p.rn = 1 + ((g.n-1) % (SELECT count(*) FROM p))
JOIN m ON m.rn = 1 + ((g.n-1) % (SELECT count(*) FROM m))
JOIN c ON c.rn = 1 + ((g.n-1) % (SELECT count(*) FROM c));

WITH p AS (SELECT id, row_number() OVER (ORDER BY dni) rn FROM pacientes.pacientes),
     m AS (SELECT id, especialidad_id, row_number() OVER (ORDER BY cmp) rn FROM maestras.medicos),
     s AS (SELECT id, row_number() OVER (ORDER BY codigo) rn FROM maestras.salas_quirurgicas),
     tp AS (SELECT id, row_number() OVER (ORDER BY id) rn FROM maestras.tipos_procedimiento),
     ta AS (SELECT id, row_number() OVER (ORDER BY id) rn FROM maestras.tipos_anestesia)
INSERT INTO citas.cirugias (paciente_id, cirujano_id, especialidad_id, sala_id, tipo_procedimiento_id, tipo_anestesia_id, fecha_hora, duracion_min, estado)
SELECT p.id, m.id, m.especialidad_id, s.id, tp.id, ta.id,
       now() + ((g.n) || ' days')::interval + ((7 + g.n) || ' hours')::interval,
       60 + (g.n * 15),
       (ARRAY['PROGRAMADO','FINALIZADO','EN_PROCESO'])[1 + (g.n % 3)]
FROM generate_series(1,10) AS g(n)
JOIN p  ON p.rn  = 1 + ((g.n-1) % (SELECT count(*) FROM p))
JOIN m  ON m.rn  = 1 + ((g.n-1) % (SELECT count(*) FROM m))
JOIN s  ON s.rn  = 1 + ((g.n-1) % (SELECT count(*) FROM s))
JOIN tp ON tp.rn = 1 + ((g.n-1) % (SELECT count(*) FROM tp))
JOIN ta ON ta.rn = 1 + ((g.n-1) % (SELECT count(*) FROM ta));

-- ---------- LABORATORIO (12 solicitudes; 10 finalizadas con resultado) ----------
WITH p AS (SELECT id, row_number() OVER (ORDER BY dni) rn FROM pacientes.pacientes),
     m AS (SELECT id, row_number() OVER (ORDER BY cmp) rn FROM maestras.medicos)
INSERT INTO laboratorio.solicitudes_examen (paciente_id, medico_id, tipo_examen, prioridad, estado, solicitado_en)
SELECT p.id, m.id,
       (ARRAY['Hemograma completo','Glucosa','Perfil lipídico','Orina completa','Rayos X de tórax','Perfil hepático','Creatinina','TSH','Hemoglobina glicosilada','Urocultivo','Electrolitos','Prueba de embarazo'])[1 + (g.n % 12)],
       (ARRAY['NORMAL','URGENTE'])[1 + (g.n % 2)],
       CASE WHEN g.n <= 10 THEN 'FINALIZADO' ELSE 'SOLICITADO' END,
       now() - ((g.n) || ' days')::interval
FROM generate_series(1,12) AS g(n)
JOIN p ON p.rn = 1 + ((g.n-1) % (SELECT count(*) FROM p))
JOIN m ON m.rn = 1 + ((g.n-1) % (SELECT count(*) FROM m));

INSERT INTO laboratorio.resultados (solicitud_id, resultado, observaciones)
SELECT id,
       jsonb_build_object('examen', tipo_examen, 'detalle', 'Valores dentro del rango normal'),
       'Resultado validado por laboratorio.'
FROM laboratorio.solicitudes_examen WHERE estado = 'FINALIZADO';

-- ---------- FACTURACIÓN (12 facturas + detalle + 10 pagos) ----------
WITH p AS (SELECT id, row_number() OVER (ORDER BY dni) rn FROM pacientes.pacientes)
INSERT INTO facturacion.facturas (paciente_id, tipo_comprobante, serie, numero, subtotal, igv, total, estado, emitida_en)
SELECT p.id,
       (ARRAY['BOLETA','FACTURA'])[1 + (g.n % 2)],
       CASE WHEN g.n % 2 = 0 THEN 'F001' ELSE 'B001' END,
       lpad(g.n::text, 6, '0'),
       (g.n * 50)::numeric,
       round((g.n * 50) * 0.18, 2),
       round((g.n * 50) * 1.18, 2),
       CASE WHEN g.n <= 10 THEN 'PAGADO' ELSE 'PENDIENTE' END,
       now() - ((g.n) || ' days')::interval
FROM generate_series(1,12) AS g(n)
JOIN p ON p.rn = 1 + ((g.n-1) % (SELECT count(*) FROM p));

INSERT INTO facturacion.detalle_factura (factura_id, descripcion, cantidad, precio_unit, importe)
SELECT id, 'Atención y servicios médicos', 1, subtotal, subtotal FROM facturacion.facturas;

INSERT INTO facturacion.pagos (factura_id, metodo_pago_id, monto, pagado_en)
SELECT id, 1 + (numero::int % 4), total, emitida_en + interval '2 hours'
FROM facturacion.facturas WHERE estado = 'PAGADO';
