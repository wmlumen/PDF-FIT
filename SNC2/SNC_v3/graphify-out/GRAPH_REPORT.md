# Graph Report - SNC_v3  (2026-10-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 803 nodes · 1456 edges · 57 communities (38 shown, 19 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6977dc05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mapEngine.js
- package.json
- logger.js
- cogoUI.js
- compilerOptions
- export.js
- dataTable.js
- parser.js
- server-api.js
- graphify_index_docs.py
- StateManager
- Estado y Persistencia
- utils.js
- validator.js
- state.js
- Scripts NPM
- Cogo y Coordenadas
- scripts
- sync-auditoria.mjs
- Email y Notificaciones
- PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)
- Migración DB
- Deploy Windows + WSL — SNC_v3
- Pagos RedTicket
- Dependencias y Tooling
- Deploy SNC_v3 — Firebase Hosting
- Grafos de SNC_v3
- Migración DB
- SNC v3 — Catastro PY (Res. SNC N° 551/2023)
- index.js
- ValidadorMunicipal
- 2. Ciclo de Vida Obligatorio para Cada Tarea
- 2. Checklist Pre-Deploy
- municipalClient.js
- firebase-client.js
- redticket-payments.js
- localhost-proxy.cjs
- _update_user.cjs
- fix_members_auth.mjs
- firebase-admin.js
- 11. Estado del proyecto (2026-10-18)
- probar_members.cjs
- register-errors.mjs
- probe_free_models.sh
- backup_sqlite.sh
- promotion_gate.sh
- restore_sqlite.sh
- rotate_legacy_hashes.sh

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 69 edges
2. `compilerOptions` - 37 edges
3. `StateManager` - 26 edges
4. `runValidation()` - 21 edges
5. `scripts` - 18 edges
6. `handleGeoFile()` - 17 edges
7. `logger` - 17 edges
8. `calcularMetricasPlanasUTM()` - 16 edges
9. `render()` - 15 edges
10. `packAndDownload()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `God Nodes (más conectados)` --references--> `StateManager`  [INFERRED]
  GRAFOS.md → js/state.js
- `Nodos` --references--> `ValidadorMunicipal`  [INFERRED]
  GRAFOS.md → js/municipal.js
- `God Nodes (más conectados)` --references--> `showToast()`  [INFERRED]
  GRAFOS.md → js/utils.js
- `God Nodes (más conectados)` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js
- `Nodos` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js

## Import Cycles
- None detected.

## Communities (57 total, 19 thin omitted)

### Community 0 - "mapEngine.js"
Cohesion: 0.08
Nodes (63): addDraftVertex(), assertMapDependencies(), assignNumberFromMap(), cancelVertexEdit(), captureCertificateMapImages(), checkMapDependencies(), clearProjectLayer(), clearTopologyErrors() (+55 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (41): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+33 more)

### Community 2 - "logger.js"
Cohesion: 0.06
Nodes (17): Diagnostic, calcularDistancia(), gradosARadianes(), LayerGuard, LayerGuardClass, logger, DEPARTAMENTOS_PY, DISTRITOS_PY (+9 more)

### Community 3 - "cogoUI.js"
Cohesion: 0.10
Nodes (34): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+26 more)

### Community 4 - "compilerOptions"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 5 - "export.js"
Cohesion: 0.11
Nodes (31): buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportGeoJSON(), exportKML(), exportProfessionalReport(), generateAuditCertificate(), generateComplianceCertificate() (+23 more)

### Community 6 - "dataTable.js"
Cohesion: 0.11
Nodes (21): addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow(), editRow() (+13 more)

### Community 7 - "parser.js"
Cohesion: 0.13
Nodes (29): explodePolygonFeatures(), detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+21 more)

### Community 8 - "server-api.js"
Cohesion: 0.07
Nodes (19): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+11 more)

### Community 9 - "graphify_index_docs.py"
Cohesion: 0.11
Nodes (8): backup(), base_extraction(), _fail(), _hub_label(), load_json(), main(), merge(), reuse_labels()

### Community 11 - "Estado y Persistencia"
Cohesion: 0.10
Nodes (20): bcrypt, db, DB_PATH, dbAPI, DB_LOG, { existsSync, mkdirSync, appendFileSync }, expedientes, { join } (+12 more)

### Community 12 - "utils.js"
Cohesion: 0.12
Nodes (19): CAMPOS_RURALES, CAMPOS_URBANOS, CONFIG_MUNICIPAL, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAP_CONFIG, MAX_VERTICES_BEFORE_SIMPLIFY (+11 more)

### Community 13 - "validator.js"
Cohesion: 0.17
Nodes (20): getParsingLogs(), isNumeric(), formatCoordinate(), normalizarNombreTerritorial(), obtenerCodigo(), runExportValidation(), runValidation(), validarArchivosPresentes() (+12 more)

### Community 14 - "state.js"
Cohesion: 0.18
Nodes (14): escapeHtml(), renderLineage(), loadPersistedExpediente(), localStoragePolyfill, State, clone(), compareVersions(), createProjectVersion() (+6 more)

### Community 15 - "Scripts NPM"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 16 - "Cogo y Coordenadas"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 17 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+10 more)

### Community 18 - "sync-auditoria.mjs"
Cohesion: 0.16
Nodes (15): buildJson(), buildReadme(), CHECK, clean(), main(), OUT_DIR, parseFindings(), PHASE (+7 more)

### Community 19 - "Email y Notificaciones"
Cohesion: 0.31
Nodes (12): ENV, BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail() (+4 more)

### Community 20 - "PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)"
Cohesion: 0.17
Nodes (8): 0. Contexto obligatorio: auditoría abierta (2026-10-18), 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023), Reglas adicionales mientras la auditoría esté abierta, adminMiddleware()

### Community 21 - "Migración DB"
Cohesion: 0.23
Nodes (8): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), runJsonMigration(), stmts, better-sqlite3

### Community 22 - "Deploy Windows + WSL — SNC_v3"
Cohesion: 0.17
Nodes (12): 1. Login y proyecto (Windows), 2. Gate pre-promoción + tests (WSL), 3. Preview (Windows), 4. Deploy a producción (Windows), 5. Verificación post-deploy, 6. Rollback, Deploy Windows + WSL — SNC_v3, Flujo ejecutivo (+4 more)

### Community 23 - "Pagos RedTicket"
Cohesion: 0.26
Nodes (10): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+2 more)

### Community 24 - "Dependencias y Tooling"
Cohesion: 0.17
Nodes (12): dependencies, bcrypt, better-sqlite3, docx, dotenv, express, firebase-admin, graphify (+4 more)

### Community 25 - "Deploy SNC_v3 — Firebase Hosting"
Cohesion: 0.20
Nodes (10): 10. Notas importantes, 1. Requisitos previos, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview, 7. Deploy a producción, 8. Verificar post-deploy (+2 more)

### Community 26 - "Grafos de SNC_v3"
Cohesion: 0.20
Nodes (9): 1. Grafo tree-sitter (graphify), 2. Grafo de dominio, Aristas, Comunidades del grafo tree-sitter (etiquetadas), Consulta rápida (python), Estado, God Nodes (más conectados), Grafos de SNC_v3 (+1 more)

### Community 27 - "Migración DB"
Cohesion: 0.27
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 28 - "SNC v3 — Catastro PY (Res. SNC N° 551/2023)"
Cohesion: 0.22
Nodes (9): 🚀 Arranque rápido, 🔴 Bloqueantes conocidos (leer antes de desplegar), 📚 Documentación, 🗂️ Estructura, 🧠 Grafo del repositorio (`graphify-out/`), 🤖 Para agentes de IA, Scripts, SNC v3 — Catastro PY (Res. SNC N° 551/2023) (+1 more)

### Community 29 - "index.js"
Cohesion: 0.29
Nodes (4): App, CAMPOS_REQUERIDOS, actualizarEstadoProyecto(), Workspace

### Community 31 - "2. Ciclo de Vida Obligatorio para Cada Tarea"
Cohesion: 0.33
Nodes (6): 2. Ciclo de Vida Obligatorio para Cada Tarea, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos, Paso 3: Adquirir el Lock, Paso 4: Realizar el cambio y verificar, Paso 5: Registrar el aprendizaje (Feedback Loop)

### Community 32 - "2. Checklist Pre-Deploy"
Cohesion: 0.33
Nodes (6): 2. Checklist Pre-Deploy, Backend y entorno, Configuración y secretos, Código y calidad, Datos y hosting, Seguridad (Fase 2 verificada)

### Community 34 - "firebase-client.js"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 35 - "redticket-payments.js"
Cohesion: 0.47
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 36 - "localhost-proxy.cjs"
Cohesion: 0.33
Nodes (4): http, listenPort, server, targetPort

### Community 37 - "_update_user.cjs"
Cohesion: 0.40
Nodes (3): bcrypt, bcrypt, { dbAPI }

### Community 38 - "fix_members_auth.mjs"
Cohesion: 0.40
Nodes (4): block, end, start, text

### Community 39 - "firebase-admin.js"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

### Community 40 - "11. Estado del proyecto (2026-10-18)"
Cohesion: 0.50
Nodes (4): 11. Estado del proyecto (2026-10-18), Archivos eliminados, Completado, Pendiente de verificación manual

## Knowledge Gaps
- **16 isolated node(s):** `dxf-parser`, `eslint`, `graphify`, `husky`, `jszip` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 366 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `logger.js` to `mapEngine.js`, `export.js`, `dataTable.js`, `firebase-admin.js`, `parser.js`, `server-api.js`, `utils.js`, `validator.js`, `state.js`, `Email y Notificaciones`, `index.js`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runValidation()` (e.g. with `God Nodes (más conectados)` and `Nodos`) actually correct?**
  _`runValidation()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `dxf-parser`, `eslint`, `graphify` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mapEngine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08344988344988345 - nodes in this community are weakly interconnected._
- **Why does `adminMiddleware()` connect `PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)` to `server-api.js`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.057971014492753624 - nodes in this community are weakly interconnected._
- **Should `logger.js` be split into smaller, more focused modules?**
  _Cohesion score 0.056910569105691054 - nodes in this community are weakly interconnected._