// Se ejecuta automáticamente al crear el contenedor de Mongo por primera vez.
db = db.getSiblingDB('renova');

db.createCollection('historias_clinicas');
db.createCollection('auditoria_logs');

db.historias_clinicas.createIndex({ dni: 1 }, { unique: true });
db.auditoria_logs.createIndex({ fecha: -1 });

// Documento de ejemplo: la HC es flexible (JSON), por eso vive en Mongo.
db.historias_clinicas.insertOne({
  dni: '72345678',
  paciente: { nombres: 'Carlos', apellidos: 'Mamani Flores' },
  episodios: [
    {
      fecha: new Date(),
      tipo: 'consulta',
      medico: 'Yordy Neyra',
      diagnostico: 'Hipertensión arterial leve',
      tratamiento: 'Dieta hiposódica + control en 30 días',
      resultados_lab: []
    }
  ],
  creado_en: new Date()
});

db.createCollection('notificaciones');
db.notificaciones.createIndex({ enviada_en: -1 });

// ---- Auditoría (>= 10 registros de ejemplo) ----
var usuariosDemo = ['admin@renova.pe','asistente@renova.pe','medico@renova.pe','farmaceutico@renova.pe','laboratorista@renova.pe'];
var accionesDemo = [
  ['LOGIN','auth'], ['REGISTRAR_PACIENTE','pacientes'], ['CREAR_CITA','citas'],
  ['REGISTRAR_DESPACHO','farmacia'], ['SOLICITAR_EXAMEN','laboratorio'],
  ['CARGAR_RESULTADO','laboratorio'], ['GENERAR_COMPROBANTE','facturacion'],
  ['REGISTRAR_PAGO','facturacion'], ['REGISTRAR_INGRESO','hospitalizacion'],
  ['DAR_ALTA','hospitalizacion'], ['CREAR_USUARIO','auth'], ['REGISTRAR_MEDICO','pacientes']
];
var logs = [{ fecha: new Date(), usuario: 'admin@renova.pe', accion: 'SEED', recurso: 'sistema', detalle: 'Carga inicial de datos demo' }];
for (var i = 0; i < accionesDemo.length; i++) {
  logs.push({
    fecha: new Date(Date.now() - (i + 1) * 3600 * 1000),
    usuario: usuariosDemo[i % usuariosDemo.length],
    accion: accionesDemo[i][0],
    recurso: accionesDemo[i][1],
    detalle: 'Acción registrada por el sistema (demo)'
  });
}
db.auditoria_logs.insertMany(logs);

// ---- Notificaciones (>= 10 registros de ejemplo) ----
var canales = ['email','sms','whatsapp'];
var tipos = [
  ['bienvenida','Bienvenido a Clínica Renova','Su registro fue exitoso.'],
  ['cita','Recordatorio de cita','Tiene una consulta programada próximamente.'],
  ['resultado','Resultado de laboratorio','Su examen ya está disponible.'],
  ['pago','Comprobante emitido','Se ha generado su comprobante de pago.'],
  ['alta','Alta hospitalaria','Ha sido dado de alta. Cuídese mucho.']
];
var destinos = ['carlos.m@gmail.com','maria.h@gmail.com','pedro.c@gmail.com','lucia.v@gmail.com','jorge.s@gmail.com',
  'rosa.c@gmail.com','miguel.r@gmail.com','elena.p@gmail.com','victor.g@gmail.com','john.s@gmail.com','marie.d@gmail.com','ana.t@gmail.com'];
var notifs = [];
for (var j = 0; j < 12; j++) {
  var t = tipos[j % tipos.length];
  notifs.push({
    canal: canales[j % canales.length],
    destino: destinos[j % destinos.length],
    tipo: t[0],
    asunto: t[1],
    mensaje: t[2],
    estado: 'ENVIADA',
    enviada_en: new Date(Date.now() - (j + 1) * 1800 * 1000)
  });
}
db.notificaciones.insertMany(notifs);

print('Mongo RENOVA inicializado: historias_clinicas + auditoria_logs + notificaciones');
