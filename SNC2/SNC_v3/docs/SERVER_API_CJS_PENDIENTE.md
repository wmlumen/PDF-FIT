# `server-api.cjs` — Servidor experimental (PENDIENTE, listo para activar)

> **Estado: NO ACTIVO.** El servidor oficial del proyecto es [`server-api.js`](../server-api.js) (puerto 5556),
> tal como fija la regla congelada **AGENTS.md §1.2**. Este documento describe el servidor alternativo
> `server-api.cjs`, qué le falta y cómo activarlo cuando corresponda.

---

## 1. Qué es

`server-api.cjs` es un **servidor Express 5 en CommonJS** de ~10 KB que expone dos bloques de rutas:

| Bloque | Rutas | Estado |
|---|---|---|
| Módulo 1 | `GET /api/modulo1/estado`, `/coordinates`, `/certificate`; `POST /api/modulo1/validate`, `/export` | ✅ Implementado (persistencia en `js/db-modulo1.cjs`) |
| Admin | `GET /api/admin/metrics`, `/members`, `/plans`, `/finance`, `/errors`, `/audit`, `/fiscalizacion`, `/ambiental`, `/dictamenes`, `/expedientes`; `PUT /api/admin/members/:id` | ⚠️ Parcial (depende de métodos que faltan) |
| Health | `GET /api/health` | ✅ Mínimo (chequeo real de DB) |

---

## 2. Qué le falta (pendiente)

Estas piezas **no** están implementadas y son las que impiden usarlo como servidor principal:

1. **Login / registro / auth real** — hoy `authMiddleware` decodifica un token **base64 sin verificar firma**.
   Debe reemplazarse por el `authMiddleware` de `server-api.js` (JWT + bcrypt + chequeo de rol/estado).
2. **Proyectos y expedientes** (CRUD) — `server-api.js` ya los tiene; acá faltan.
3. **Pagos** (Red Ticket, webhook, checkout) — faltan.
4. **Servir el frontend** — no hay `express.static` ni `sendFile` para `index.html`, `/js`, `/css`, `/vendor`, `/data`.
5. **Métodos de datos faltantes en `db.cjs`** usados por el panel admin:
   `dbAPI.projects.listByUser`, `dbAPI.expedientes.list`, `dbAPI.payments.list`, `dbAPI.plans.list`
   (los nombres reales en `db.cjs` son otros, p. ej. `findByUser`).

---

## 3. Cómo activarlo (cuando se complete lo anterior)

### 3.1 Prueba local sin tocar el servidor principal

Usa el **puerto 5557** por defecto, así convive con `server-api.js` (5556):

```bash
PORT=5557 node server-api.cjs
```

Luego:

```bash
curl http://127.0.0.1:5557/api/health
```

### 3.2 Promoverlo a servidor principal (solo tras cerrar los pendientes)

1. Igualar el `authMiddleware` al de `server-api.js` (JWT + bcrypt).
2. Agregar el servido del frontend y de `/vendor/*` (copiar el bloque de `server-api.js`).
3. Implementar proyectos/expedientes/pagos/health reales.
4. Recién entonces cambiar en `package.json`:

```diff
- "start": "node server-api.js",
+ "start": "node server-api.cjs",
```

> ⚠️ La regla **AGENTS.md §1.2** prohíbe ese cambio mientras `server-api.js` sea el servidor único e inmutable.
> Promover `server-api.cjs` requiere actualizar esa regla explícitamente.

---

## 4. Dependencias que ya están resueltas

| Componente | Archivo | Estado |
|---|---|---|
| Métodos del módulo 1 | [`js/db-modulo1.cjs`](../js/db-modulo1.cjs) | ✅ Creado (aditivo, no toca el esquema) |
| Persistencia módulo 1 | `data/modulo1.json` + `data/modulo1.log` | ✅ Se crea solo al usar las rutas |
| Grupos de datos base | `users`, `plans`, `admin_audit`, `temp_projects`, … | ✅ Ya existen en `db.cjs` |

El módulo 1 se inyecta así (ya aplicado en la cabecera del stub):

```js
const { dbAPI } = require('./db.cjs');
Object.assign(dbAPI, require('./js/db-modulo1.cjs'));
```

---

## 5. Verificación realizada

| Prueba | Resultado |
|---|---|
| `node --check server-api.cjs` | ✅ Sintaxis OK |
| `node --check js/db-modulo1.cjs` | ✅ Sintaxis OK |
| Arranque en `PORT=5557` | ✅ Arranca |
| `GET /api/health` (5557) | ✅ `200 {"status":"ok","db":true}` |
| `GET /api/modulo1/estado` (5557) | ✅ `200` con contadores y lista de pendientes |
| `GET /api/admin/metrics` (5557) | ⚠️ `500` — depende de métodos pendientes (§2.5) |
| Servidor principal 5556 | ✅ Sigue operativo, sin cambios |

---

## 6. Recomendación

Mantener `server-api.cjs` **desactivado** (no agregarlo al `start`, no borrarlo) y usarlo solo como
banco de trabajo del módulo 1. Cuando los pendientes de §2 estén cerrados y verificados con tests,
evaluar la promoción actualizando §1.2 de `AGENTS.md` en el mismo commit.
