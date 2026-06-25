# División de módulos

## ✅ Implementado (Luis Alatta)
Auth (JWT + RBAC + auditoría), API Gateway, Pacientes (registro + médicos + historia clínica),
Citas (programación de consultas y cirugías), Notificaciones (worker async), Reportes (dashboard),
Facturación (IGV + pagos parciales). Más infra, base de datos con datos y todos los packages compartidos.

---

## ⬜ Pendiente (cada compañero implementa el suyo)

Cada servicio ya tiene servidor Fastify + Swagger + `/health` + endpoints con `TODO`,
su esquema de base de datos con datos demo, y su pantalla en el frontend.
Reemplaza los `501` por tu lógica. Guíate de `auth`, `pacientes`, `citas` y `facturacion` (ya hechos).

### 👤 Jordi — Laboratorio  (`apps/services/laboratorio`)
Flujo (ASÍNCRONO): el médico solicita examen → el laboratorio externo envía el resultado
(callback) → se integra a la historia clínica (Mongo) → se notifica.
- [ ] `GET /examenes` — listar solicitudes (join paciente y médico)
- [ ] `POST /examenes` — crear solicitud (rol MEDICO)
- [ ] `POST /resultados` — recibir resultado, marcar solicitud FINALIZADO, integrar a HC, `publicarNotificacion`
- [ ] Pantalla `app/(app)/laboratorio/page.tsx` (tabla + "Ver resultado" + formulario de solicitud)
- Tablas: `laboratorio.solicitudes_examen`, `laboratorio.resultados`

### 👤 Jose — Hospitalización  (`apps/services/hospitalizacion`)
Flujo: ¿cama libre? (409) → registrar ingreso → seguimiento diario (iterativo) →
¿activo? → generar factura → registrar egreso → alta.
- [ ] `GET /` — internamientos activos
- [ ] `POST /` — ingreso: asignar cama libre y marcarla ocupada
- [ ] `POST /:id/seguimiento` — signos vitales y observaciones
- [ ] `PATCH /:id/egreso` — alta, liberar cama, generar resumen (puede llamar a `/api/facturacion`)
- [ ] Pantalla `app/(app)/hospitalizacion/page.tsx` (tabla de internamientos + insumos)
- Tablas: `hospitalizacion.internamientos`, `hospitalizacion.seguimientos`, `hospitalizacion.camas`

### 👤 Sebas — Farmacia  (`apps/services/farmacia`)
Flujo: consultar stock → ¿stock ok? (409) → despachar → recalcular stock →
¿bajo umbral? → alerta + email jefe farmacia → auditar.
- [ ] `GET /stock` — medicamentos con stock total (join lotes)
- [ ] `POST /despachos` — descontar stock, registrar movimiento EGRESO; si queda bajo el mínimo, `publicarNotificacion`
- [ ] `GET /alertas` — medicamentos bajo mínimo o lotes por vencer
- [ ] Pantalla `app/(app)/farmacia/page.tsx` (tabla con estado Disponible/Bajo stock/Vencido + crear producto + venta)
- Tablas: `farmacia.medicamentos`, `farmacia.lotes`, `farmacia.movimientos_stock`, `farmacia.despachos`

---

## Convenciones
- Respuestas: `{ ok: true, data }` / `{ ok: false, error }`.
- SQL siempre parametrizado (`$1, $2`); nunca concatenar.
- Rutas protegidas con `requireAuth([...roles])`.
- Eventos async con `publicarNotificacion(...)` de `@renova/eventos`.
- Códigos: 422 datos inválidos, 409 conflicto (duplicado/no disponible), 404 no encontrado, 201 creado.

## Síncrono vs Asíncrono
| Servicio | Tipo |
|---|---|
| Pacientes, Citas, Hospitalización, Farmacia | Síncrono |
| Laboratorio (resultados), Notificaciones, Reportes | Asíncrono (cola Redis/BullMQ) |

> Los mockups y diagramas de flujo de cada proceso están en `.design/mockups/`.
