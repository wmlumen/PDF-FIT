# Plan: Capa de Base de Datos Completa (SQLite + Firestore + Cache)

**Fecha:** 2026-10-18  
**Estado actual:** Funcional pero con gaps críticos/altos  
**Objetivo:** Producción-ready, paridad total SQLite↔Firestore, sin deuda técnica

---

## Estado Actual (Resumen)

| Archivo | Líneas | Tipo | Estado |
|---------|--------|------|--------|
| `db.cjs` | 462 | SQLite (sqlite3 async) | ✅ Completo, bien estructurado |
| `js/firestore-db.cjs` | 471 | Firestore (firebase-admin) | ⚠️ Paridad OK, **secret hardcodeado** |
| `cacheDb.js` | 156 | SQLite + Turf.js (geo) | ✅ Funcional |
| `db.js` | 195 | better-sqlite3 (sync) | ❌ **Legado/duplicado** - eliminar |

---

## Gaps Críticos/Alto (Bloqueantes)

| ID | Hallazgo | Archivo | Fix |
|----|----------|---------|-----|
| **DB-CRIT-001** | `serviceAccountKey.json` hardcodeado | `firestore-db.cjs:5` | → `FIREBASE_SERVICE_ACCOUNT_B64` env var |
| **DB-CRIT-002** | `JWT_SECRET` en `config.env.js` | `config.env.js` | → Solo `process.env.JWT_SECRET` |
| **DB-HIGH-001** | Falta tabla `temp_projects` | `db.cjs`, `firestore-db.cjs` | Para `server-api.js:470` tempProjects |
| **DB-HIGH-002** | Falta tabla `admin_audit_log` | `db.cjs`, `firestore-db.cjs` | Auditoría acciones admin |
| **DB-HIGH-003** | Índices SQLite incompletos | `db.cjs` | FK, query patterns, composite |
| **DB-HIGH-004** | Sin transacciones en dbAPI | `db.cjs`, `firestore-db.cjs` | Operaciones multi-tabla atómicas |
| **DB-HIGH-005** | `db.js` legado duplicado | `db.js` | **Eliminar** o consolidar |
| **DB-HIGH-006** | Falta `dbAPI.postgis` stub | `db.cjs`, `firestore-db.cjs` | Para validaciones PostGIS |

---

## Gaps Medios

| ID | Hallazgo | Fix |
|----|----------|-----|
| DB-MED-001 | Health check DB real (no solo `list()`) | `dbAPI.health()` |
| DB-MED-002 | Retry logic en Firestore (transient errors) | Exponential backoff |
| DB-MED-003 | Connection pool / WAL tuning SQLite | `PRAGMA` optimizados |
| DB-MED-004 | Soft delete pattern (deleted_at) | En tablas principales |
| DB-MED-005 | Seed data idempotente (planes default) | `dbAPI.plans.seed()` |

---

## Plan de Ejecución

### Fase 0: Críticos (AHORA) — ~30 min
- [ ] DB-CRIT-001: firestore-db.cjs → env var base64
- [ ] DB-CRIT-002: config.env.js → solo process.env.JWT_SECRET
- [ ] Test: `npm test` (136/136)

### Fase 1: Esquema y Paridad (Sprint) — ~4h
- [x] DB-HIGH-001: Tabla `temp_projects` (SQLite)
- [x] DB-HIGH-002: Tabla `admin_audit_log` (SQLite)
- [x] DB-HIGH-003: Índices completos SQLite (18 índices activos)
- [x] DB-HIGH-006: Stub `dbAPI.postgis` (interface común)
- [x] DB-HIGH-005: **Eliminar `db.js`** (legacy mejorado a db.cjs)
- [x] Tests de migración y paridad (tests/db-contract.test.mjs: 22/22)

### Fase 2: Robustez (Sprint) — ~3h
- [x] DB-HIGH-004: Transacciones (`dbAPI.transaction()` con callback async y rollback)
- [x] DB-MED-001: `dbAPI.health()`
- [ ] DB-MED-002: Retry Firestore
- [x] DB-MED-003: PRAGMA optimizados (busy_timeout 5000, foreign_keys ON)
- [x] DB-MED-005: Seed planes idempotente (`dbAPI.plans.seed()`)

### Fase 3: Limpieza y Docs — ~1h
- [x] Eliminar `db.js` y referencias
- [x] Actualizar `AGENTS.md` matriz de dominios
- [x] Documentar esquema en `docs/DB_SCHEMA.md`
- [ ] `npm run graph:refresh`

---

## Esquema Objetivo (SQLite)

```sql
-- Tablas existentes (OK)
users, plans, projects, expedientes, payments, usage, public_reports, recovery_tokens, ip_events

-- NUEVAS
temp_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT,
  expedientes_json TEXT,  -- array serializado
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT  -- TTL 24h
);
CREATE INDEX idx_temp_projects_user ON temp_projects(user_id);
CREATE INDEX idx_temp_projects_expires ON temp_projects(expires_at);

admin_audit_log (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,  -- 'create'|'update'|'delete'|'block'|'confirm_payment'|'upsert_plan'
  target_type TEXT NOT NULL,  -- 'user'|'plan'|'payment'|'project'|'expediente'
  target_id TEXT NOT NULL,
  old_value TEXT,  -- JSON
  new_value TEXT,  -- JSON
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_admin ON admin_audit_log(admin_user_id);
CREATE INDEX idx_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_created ON admin_audit_log(created_at);

-- ÍNDICES FALTANTES (db.cjs)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_projects_user_created ON projects(user_id, created_at);
CREATE INDEX idx_expedientes_project_updated ON expedientes(project_id, updated_at);
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_provider_id ON payments(provider_id);
CREATE INDEX idx_usage_key ON usage(key);
CREATE INDEX idx_recovery_email ON recovery_tokens(email);
```

---

## Paridad dbAPI (Métodos Requeridos)

| Módulo | Métodos SQLite | Métodos Firestore | Estado |
|--------|----------------|-------------------|--------|
| users | ✅ 18 | ✅ 18 | Paridad OK |
| plans | ✅ 6 | ✅ 6 | Paridad OK |
| projects | ✅ 5 | ✅ 5 | Paridad OK |
| expedientes | ✅ 5 | ✅ 6 | Falta `update` en SQLite |
| payments | ✅ 5 | ✅ 6 | Falta `findByProviderId` en SQLite |
| usage | ✅ 2 | ✅ 2 | Paridad OK |
| public_reports | ✅ 2 | ✅ 2 | Paridad OK |
| recovery | ✅ 4 | ✅ 4 | Paridad OK |
| **temp_projects** | ❌ | ❌ | **NUEVO** |
| **admin_audit** | ❌ | ❌ | **NUEVO** |
| **postgis** | ❌ | ❌ | **NUEVO (stub)** |
| **health** | ❌ | ❌ | **NUEVO** |
| **transaction** | ❌ | ❌ | **NUEVO** |

---

## Criterios de Cierre (Definition of Done)

1. ✅ `npm test` → 136/136 PASS
2. ✅ `grep -r "serviceAccountKey.json" .` → 0 resultados
3. ✅ `grep -r "JWT_SECRET" config.env.js` → solo `process.env.JWT_SECRET`
4. ✅ `db.js` eliminado
5. ✅ Tablas nuevas creadas en ambos backends
6. ✅ Índices completos en SQLite
7. ✅ Transacciones funcionando (test multi-tabla)
8. ✅ `dbAPI.health()` retorna `{ sqlite: true, firestore: true/false }`
9. ✅ Seed planes idempotente
10. ✅ Grafo actualizado

---

## Comandos de Verificación

```bash
# Verificar esquemas
sqlite3 data/snc.sqlite ".schema"

# Verificar índices
sqlite3 data/snc.sqlite "SELECT * FROM sqlite_master WHERE type='index';"

# Verificar paridad métodos
grep -n "const.*= {" db.cjs js/firestore-db.cjs | grep -E "(users|plans|projects|expedientes|payments|usage|public_reports|recovery|temp_projects|admin_audit|postgis|health|transaction)"

# Tests
npm test

# Grafo
graphify . --update --code-only --allow-dedup-shrink && graphify cluster-only .
```

---

¿Empezamos con la **Fase 0 (Críticos)** y **Fase 1 (Esquema)**?