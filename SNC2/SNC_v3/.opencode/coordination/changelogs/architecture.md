# Changelog - Architecture

## 2026-10-18 - imp_20261018_architecture_split
**Agent:** audit-agent  
**Type:** pattern_detected  
**Description:** Dividir archivos monolíticos > 1000 líneas en módulos

```diff
# app.js split proposal
js/app/
  index.js          # Orquestador principal (200 lines)
  ui/
    tabs.js         # Navegación tabs
    modals.js       # Modales
    notifications.js # Toasts
  features/
    import.js       # Carga archivos
    validate.js     # Validación SNC
    export.js       # Exportación
    municipal.js    # Validación municipal
    cogo.js         # COGO
    map.js          # Leaflet wrapper
  core/
    state.js        # Estado global
    events.js       # Event bus

# server-api.js split
server/
  index.js          # Express setup (100 lines)
  routes/
    auth.js         # /api/auth/*
    projects.js     # /api/projects/*
    expedientes.js  # /api/expedientes/*
    payments.js     # /api/payments/*
    validation.js   # /api/validation/*
    admin.js        # /api/admin/*
  middleware/
    auth.js         # JWT + Firebase
    rateLimit.js    # Rate limiting
    sanitize.js     # Input sanitization
  db/
    sqlite.js       # SQLite wrapper
    firestore.js    # Firestore wrapper
```

**Lesson:** Regla: max 500 líneas por archivo. Single Responsibility. Feature-based folder structure. Barrel exports.

**Status:** pending

## 2026-10-23 - imp_20261023_fase11_ccc_backlog
**Agent:** claude-sonnet-5
**Type:** pattern_detected + task_list
**Description:** Fase 11 (modelo de datos/BI) implementada parcialmente (CCC, personas, matriculas,
parcel_lineage, vepMetrics.js — commits `ca2d34e`, `6540155`, `60fb9ed`). El backlog completo de lo
que sigue (rendimiento pendiente, ambiental, POUT, dashboard, data warehouse, migración PostgreSQL)
queda en [`docs/PLAN_FASE11_BACKLOG.md`](../../../docs/PLAN_FASE11_BACKLOG.md) — no duplicar la lista
aquí, ese archivo es la fuente de verdad del backlog.

```diff
# antes de esta sesión
+ projects / expedientes / parcelas solo como atributos planos del GeoJSON
+ sin CCC, sin personas, sin matriculas, sin motor de indicadores

# despues
+ db.cjs: parcelas, cuenta_catastral, personas, parcela_propietario, matriculas, parcel_lineage
+ server-api.js: sync automatico en POST/PUT expedientes + 4 endpoints nuevos (con ownership)
+ js/vepMetrics.js: reporting basico + IND-CAT-01 real + helpers espaciales (IND-AMB-04 resuelto)
```

**Hallazgos colaterales para auditar aparte (no corregidos, ver PLAN_FASE11_BACKLOG.md §4):**
- H-1: condición de carrera en el arranque de `db.cjs` (migración Mesa de Entrada) puede tumbar el
  proceso contra una base nueva — `SQLITE_ERROR: no such column: entrada_nro`.
- H-2: `package.json` declara `graphify` como dependencia npm, pero es un paquete sin relación (RGG,
  sin CLI). La herramienta real que usa `npm run audit:graph` es un paquete **Python** del mismo
  nombre, instalado aparte. `npm run graph:refresh` (`graphify update .`) está roto por esto.

**Lesson:** antes de agregar un módulo nuevo (notarial, VEP, MAG-sync, etc.) verificar si ya tiene
tabla propia o si solo vive como atributo suelto del GeoJSON — la segunda opción no escala a
copropiedad, historial ni integraciones externas (Registro Público, ambiental).

**Status:** in_progress (§0 de PLAN_FASE11_BACKLOG.md hecho; §1 a §4 siguen abiertos)