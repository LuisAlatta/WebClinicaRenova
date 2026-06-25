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

db.auditoria_logs.insertOne({
  fecha: new Date(),
  usuario: 'admin@renova.pe',
  accion: 'SEED',
  recurso: 'sistema',
  detalle: 'Carga inicial de datos demo'
});

print('Mongo RENOVA inicializado: historias_clinicas + auditoria_logs');
