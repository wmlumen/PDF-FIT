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