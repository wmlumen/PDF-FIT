# Plan de Remediación: server-api.js — Hallazgos Críticos y Altos

**Fecha:** 2026-10-18  
**Origen:** Auditoría profunda server-api.js (1694 líneas)  
**Estado:** ABIERTO  
**Commit base:** `259c361e`

---

## Resumen Ejecutivo

| Severidad | Hallazgos | Acción Requerida |
|-----------|-----------|------------------|
| **CRÍTICA** | 2 | Bloqueante para producción |
| **ALTA** | 4 | Antes de siguiente release |
| **MEDIA** | 6 | Próximo sprint |
| **BAJA** | 4 | Deuda técnica |

**Veredicto:** **NO APTO PARA PRODUCCIÓN** hasta cerrar CRÍTICAS.

---

## Hallazgos CRÍTICOS (Bloqueantes)

### CRIT-001: `serviceAccountKey.json` hardcodeado en código
- **Archivo:** `server-api.js:12`
- **Código:** `const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');`
- **Riesgo:** Credenciales Firebase Admin SDK en repo → acceso total a Firestore, Auth, Storage
- **Evidencia:** `.gitignore` lo excluye, pero la ruta está hardcodeada; si alguien commitea el archivo, se filtra
- **Remediación:**
  1. Eliminar `serviceAccountKey.json` del repo (si existe en historial: `git filter-repo`)
  2. Crear `FIREBASE_SERVICE_ACCOUNT_B64` en `.env` (base64 del JSON)
  3. En `server-api.js:12-22`:
     ```javascript
     // ANTES
     const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
     
     // DESPUÉS
     let firestoreDbModule = null;
     if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
       const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString());
       initializeApp({ credential: cert(serviceAccount) });
       firestoreDbModule = require('./js/firestore-db.cjs');
     }
     ```
  4. Actualizar `.env.example` con `FIREBASE_SERVICE_ACCOUNT_B64=`
- **Criterio de cierre:** `grep -r "serviceAccountKey.json" .` → 0 resultados; `server-api.js` usa solo env var
- **Estimación:** 30 min

---

### CRIT-002: `JWT_SECRET` expuesto en `config.env.js`
- **Archivo:** `server-api.js:33` → `const JWT_SECRET = ENV.JWT_SECRET;`
- **Riesgo:** Si `config.env.js` tiene fallback hardcodeado, secret en repo → firma/verificación de tokens comprometida
- **Evidencia:** Verificar `config.env.js` línea que define `JWT_SECRET`
- **Remediación:**
  1. `config.env.js` debe leer **solo** `process.env.JWT_SECRET` (sin fallback)
  2. Si no existe → `throw new Error('JWT_SECRET requerido en entorno')`
  3. Generar secret fuerte: `openssl rand -base64 64`
  4. Documentar en `.env.example`: `JWT_SECRET=`
- **Criterio de cierre:** `grep -n "JWT_SECRET" config.env.js` → solo `process.env.JWT_SECRET`
- **Estimación:** 15 min

---

## Hallazgos ALTOS

### HIGH-001: Rate Limiting en memoria (`Map`) — No escala / No persiste
- **Archivo:** `server-api.js:157-158, 168-203`
- **Riesgo:** Reinicio = bypass; multi-instancia = bypass; memoria ilimitada = DoS
- **Remediación:**
  1. Añadir `ioredis` dependency
  2. Crear `rateLimitStore.js` con Redis backend (sliding window + Lua script)
  3. Fallback a memoria solo si `REDIS_URL` no configurado (dev)
  4. TTL automático en Redis = `RATE_LIMIT_WINDOW_MS`
- **Criterio de cierre:** `npm test` pasa; 2 instancias comparten rate limit; reinicio no resetea contadores
- **Estimación:** 3-4h

---

### HIGH-002: Sin Audit Log de acciones administrativas
- **Archivo:** `server-api.js` (endpoints `/api/admin/*`)
- **Riesgo:** No trazabilidad de quién cambió qué (roles, planes, bloqueos, pagos)
- **Remediación:**
  1. Crear tabla `admin_audit_log` (id, admin_user_id, action, target_type, target_id, old_value, new_value, ip, timestamp)
  2. Middleware `auditAdmin(action, targetType)` que inyecta en handlers admin
  3. Log: create/update/delete users, plans, block/unblock, payment confirm, plan upsert
  4. Endpoint `GET /api/admin/audit-log` (paginado, filtros)
- **Criterio de cierre:** Cada endpoint admin escribe log; endpoint de consulta funciona
- **Estimación:** 3-4h

---

### HIGH-003: Pool de conexiones PostGIS por request (ineficiente)
- **Archivo:** `server-api.js:996-1006` (dentro de `/api/postgis/analisis-espacial`)
- **Riesgo:** Latencia alta, agotamiento conexiones bajo carga
- **Remediación:**
  1. Crear `postgis-pool.js` al inicio (singleton `pg.Pool`)
  2. Configurar `max: 10`, `idleTimeoutMillis: 30000`
  3. Usar `pool.query()` en todos los endpoints PostGIS
  4. Cerrar pool en `shutdown()`
- **Criterio de cierre:** `grep -n "new Client" server-api.js` → 0 resultados; pool global usado
- **Estimación:** 1h

---

### HIGH-004: `tempProjects` en memoria sin TTL ni persistencia
- **Archivo:** `server-api.js:470, 687-766`
- **Riesgo:** Fuga memoria, pérdida datos al reiniciar, no respeta límites de plan
- **Remediación:**
  1. Mover a `db.cjs` / `firestore-db.cjs` tabla `temp_projects` (TTL 24h)
  2. Job cron `pruneTempProjects()` cada hora (DELETE WHERE created_at < NOW() - 24h)
  3. Contar en límites de plan (`canCreateProject` incluye temporales)
  4. Opcional: persistir a disco si usuario guarda (convertir a proyecto real)
- **Criterio de cierre:** Reinicio no pierde temporales; TTL funciona; límites respetados
- **Estimación:** 2-3h

---

## Hallazgos MEDIOS

| ID | Hallazgo | Archivo/Línea | Remediación |
|----|----------|---------------|-------------|
| MED-001 | CSP permite `style-src 'self' https://...` (inline styles) | L263 | Añadir `'unsafe-inline'` solo si necesario; mejor: nonces |
| MED-002 | `/api/admin/members` expone `plan_price` | L492 | Remover del response o separar endpoint `/admin/plans` |
| MED-003 | `/api/auth/login` devuelve `sameIpUsers` (fuga info) | L378 | Remover o solo contar (no listar emails) |
| MED-004 | Sin compresión HTTP (`compression()` middleware) | - | `app.use(compression())` antes de static |
| MED-005 | WFS fetch sin cache HTTP (catastro.gov.py) | L1046, L1091 | `Cache-Control`, ETag, o proxy cache local |
| MED-006 | Sin API versioning (`/v1/`) | - | Prefijar todas las rutas `/api/v1/` |

---

## Hallazgos BAJOS (Deuda Técnica)

| ID | Hallazgo | Remediación |
|----|----------|-------------|
| LOW-001 | Scripts sueltos `_update_user.cjs`, `fix_members_auth.mjs` | Mover a `scripts/` o eliminar |
| LOW-002 | `db.js` duplicado/legacy vs `db.cjs` | Consolidar o documentar propósito |
| LOW-003 | Sin OpenAPI/Swagger spec | `swagger-jsdoc` + `swagger-ui-express` |
| LOW-004 | Sin métricas Prometheus | `prom-client` + `/metrics` endpoint |

---

## Plan de Ejecución (Orden Recomendado)

### Fase 0 — Bloqueantes (AHORA) — **~45 min**
- [ ] CRIT-001: `serviceAccountKey.json` → env var
- [ ] CRIT-002: `JWT_SECRET` solo env var
- [ ] Verificar: `npm test` (136/136 PASS)
- [ ] Commit: `fix: security - remove hardcoded secrets`

### Fase 1 — Alta Prioridad (Sprint actual) — **~10h**
- [ ] HIGH-003: PostGIS connection pool (1h)
- [ ] HIGH-004: tempProjects → DB + TTL (2-3h)
- [ ] HIGH-001: Rate limit → Redis (3-4h)
- [ ] HIGH-002: Admin audit log (3-4h)
- [ ] Tests nuevos para cada cambio

### Fase 2 — Media (Próximo sprint) — **~8h**
- [ ] MED-001 a MED-006
- [ ] Tests de regresión

### Fase 3 — Baja (Backlog) — **~6h**
- [ ] LOW-001 a LOW-004

---

## Criterios de Cierre Global (Definition of Done)

1. **Todas las CRÍTICAS cerradas** + `npm test` verde
2. **Todas las ALTAS cerradas** + tests nuevos pasando
3. **Documentación actualizada**: `.env.example`, `README.md`, `AGENTS.md` si cambia arquitectura
4. **Graphify actualizado**: `graphify . --update --code-only --allow-dedup-shrink && graphify cluster-only .`
5. **Commit único por hallazgo** (trazabilidad)
6. **Verificación manual**: `curl` endpoints críticos (auth, admin, pagos, validaciones)

---

## Referencias Cruzadas

- Auditoría completa: `docs/AUDITORIA_SNC_v3_2026-10-18.md`
- Plan general: `docs/PLAN_REMEDIACION_AUDITORIA.md`
- Grafo actual: `graphify-out/GRAPH_REPORT.md` (commit `259c361e`)
- Skills de auditoría: `.agents/skills/`

---

## Registro de Cambios

| Fecha | Hallazgo | Acción | Commit | Verificado |
|-------|----------|--------|--------|------------|
| 2026-10-18 | CRIT-001, CRIT-002 | Identificados | - | Pendiente |
| 2026-10-18 | HIGH-001 a HIGH-004 | Identificados | - | Pendiente |
| 2026-10-18 | MED-001 a MED-006 | Identificados | - | Pendiente |
| 2026-10-18 | LOW-001 a LOW-004 | Identificados | - | Pendiente |

---

> **Nota:** Este documento es parte del código del proyecto. Al commitearlo, `graphify update` lo indexará y futuras IAs podrán consultarlo con `graphify query "plan remediación server-api"`.