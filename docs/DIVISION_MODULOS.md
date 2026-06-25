# División de módulos y checklist por integrante

Cada servicio ya tiene: servidor Fastify + Swagger + `/health` + endpoints declarados con `TODO`.
Cada esquema de base de datos ya existe y tiene datos demo. Solo falta la lógica.

---

## 👤 Luis Alatta — Plataforma / Integración  (base ✅)
- [x] Monorepo, Docker Compose, base de datos + seed
- [x] `auth-service`: login JWT, RBAC, auditoría (referencia)
- [x] API Gateway (enrutamiento + rate-limit + CORS)
- [x] Frontend: login + shell con sidebar
- [ ] Integrar y probar el flujo completo entre servicios
- [ ] Desplegar frontend en Vercel + servicios en contenedores

## 👤 Yordy Neyra — Pacientes (✅ ref) + Laboratorio
- [x] `pacientes-service` (CRUD + historia clínica Mongo) — referencia
- [ ] `laboratorio-service`:
  - [ ] `GET /examenes` (listar solicitudes)
  - [ ] `POST /examenes` (médico solicita examen)
  - [ ] `POST /resultados` (ASÍNCRONO: laboratorio externo envía resultado → integrar a HC Mongo)
- [ ] Pantalla Laboratorio (`app/(app)/laboratorio/page.tsx`)

## 👤 Jose Carlos Ugarte — Citas + Hospitalización
- [ ] `citas-service`:
  - [ ] `GET /disponibilidad` (validar médico/sala/horario libre)
  - [ ] `POST /` (programar consulta) y `PATCH /:id/cancelar`
  - [ ] `POST /cirugias` (validar sala + insumos)
- [ ] `hospitalizacion-service`:
  - [ ] `POST /` ingreso (asignar cama) · `POST /:id/seguimiento` · `PATCH /:id/egreso`
- [ ] Pantallas Citas y Hospitalización

## 👤 Sebastian Ticlavilca — Farmacia + Facturación + Notificaciones + Reportes
- [ ] `farmacia-service`: `GET /stock`, `POST /despachos` (descontar stock), `GET /alertas`
- [ ] `facturacion-service`: `POST /` (calcular IGV 18%), `POST /:id/pagos` (parciales)
- [ ] `notificaciones-service`: worker BullMQ que "envía" (cita/resultado/alerta)
- [ ] `reportes-service`: `GET /dashboard` con KPIs reales + `GET /ocupacion` + `GET /ingresos`
- [ ] Pantalla Farmacia + KPIs del Dashboard

---

## Síncrono vs Asíncrono (del 2do avance)
| Servicio | Tipo |
|---|---|
| Registro pacientes, Citas, Hospitalización, Farmacia | **Síncrono** |
| Laboratorio (resultados), Notificaciones, Reportes | **Asíncrono** (cola Redis/BullMQ) |

## Convenciones
- Respuestas: `{ ok: true, data }` / `{ ok: false, error }`.
- SQL siempre parametrizado (`$1, $2`) — nunca concatenar strings.
- Rutas protegidas con `requireAuth([...roles])`.
- Un commit por avance significativo, en español y breve.
