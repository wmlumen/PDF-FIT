# Graph Report - SNC_v3  (2026-10-19)

## Corpus Check
- 90 files · ~98,762 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .css 5, (none) 4, .csv 3)

## Summary
- 1009 nodes · 1807 edges · 79 communities (41 shown, 38 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3724fd5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- LayerManagerClass
- Exportación y Certificados
- Community 5
- graphify_index_docs.py
- Estado y Persistencia
- Mapa y Capas Leaflet
- Carga de Archivos Geo
- Estado y Persistencia
- layerPanel.js
- mapEngine.js
- DB y Autenticación
- crs.js
- Community 14
- validator.js
- package.json
- config.env.js
- sanitize.js
- Deploy SNC_v3 — Firebase Hosting
- cogoUI.js
- Estado y Persistencia
- DB y Autenticación
- Versionado y Municipal
- DB y Autenticación
- rateLimit.js
- 2. Checklist Pre-Deploy
- ref_node_fs
- Carga de Archivos Geo
- 11. Estado del proyecto (2026-10-18)
- DB y Autenticación
- probar_members.cjs
- workspace.js
- Community 28
- Community 37
- Mapa y Capas Leaflet
- Community 42
- Community 40
- Community 41
- convert-piribebuy.mjs
- Mapa y Capas Leaflet
- Mapa y Capas Leaflet
- Community 49
- Community 52
- PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)
- Community 64
- Community 68
- Community 69
- logger.js
- Community 73
- Community 77
- register-errors.mjs
- probe_free_models.sh
- backup_sqlite.sh script
- run_full_check.sh script
- restore_sqlite.sh
- rotate_legacy_hashes.sh script

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 75 edges
2. `LayerManagerClass` - 43 edges
3. `compilerOptions` - 37 edges
4. `StateManager` - 26 edges
5. `runValidation()` - 21 edges
6. `scripts` - 19 edges
7. `logger` - 18 edges
8. `handleGeoFile()` - 17 edges
9. `calcularMetricasPlanasUTM()` - 16 edges
10. `render()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Nodos` --references--> `handleGeoFile()`  [INFERRED]
  GRAFOS.md → js/parser.js
- `God Nodes (más conectados)` --references--> `StateManager`  [INFERRED]
  GRAFOS.md → js/state.js
- `God Nodes (más conectados)` --references--> `showToast()`  [INFERRED]
  GRAFOS.md → js/utils.js
- `Nodos` --references--> `ValidadorMunicipal`  [INFERRED]
  GRAFOS.md → js/municipal.js
- `God Nodes (más conectados)` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js

## Import Cycles
- None detected.

## Communities (79 total, 38 thin omitted)

### Community 1 - "Exportación y Certificados"
Cohesion: 0.10
Nodes (32): buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportGeoJSON(), exportKML(), exportProfessionalReport(), generateAuditCertificate(), generateComplianceCertificate() (+24 more)

### Community 2 - "Community 5"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 3 - "graphify_index_docs.py"
Cohesion: 0.08
Nodes (13): backup(), base_extraction(), _fail(), _hub_label(), is_excluded_rel(), load_json(), main(), merge() (+5 more)

### Community 5 - "Mapa y Capas Leaflet"
Cohesion: 0.11
Nodes (22): CAMPOS_REQUERIDOS, addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow() (+14 more)

### Community 6 - "Carga de Archivos Geo"
Cohesion: 0.12
Nodes (30): explodePolygonFeatures(), detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+22 more)

### Community 7 - "Estado y Persistencia"
Cohesion: 0.07
Nodes (19): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+11 more)

### Community 8 - "layerPanel.js"
Cohesion: 0.17
Nodes (23): CONTENT_MODES, formatScale(), LayerManager, zoomToScale(), bindEvents(), closeMenu(), esc(), handleMenuAction() (+15 more)

### Community 9 - "mapEngine.js"
Cohesion: 0.07
Nodes (73): addDraftVertex(), assertMapDependencies(), assignNumberFromMap(), BASE_LAYER_TITLES, cancelVertexEdit(), captureCertificateMapImages(), checkMapDependencies(), clearProjectLayer() (+65 more)

### Community 10 - "DB y Autenticación"
Cohesion: 0.08
Nodes (24): admin_audit, api, db, DB_PATH, dbAPI, DB_LOG, dbAsync, expedientes (+16 more)

### Community 11 - "crs.js"
Cohesion: 0.09
Nodes (38): PROJ_32720, analyzeCRS(), bboxOf(), CANDIDATE_ZONES, CRS_BY_ZONE, CRS_DEFS, CRS_LABELS, CRS_WKT (+30 more)

### Community 12 - "Community 14"
Cohesion: 0.17
Nodes (15): buildJson(), buildReadme(), CHECK, clean(), main(), OUT_DIR, parseFindings(), PHASE (+7 more)

### Community 13 - "validator.js"
Cohesion: 0.06
Nodes (51): 1. Grafo tree-sitter (graphify), 2. Grafo de dominio, Aristas, Comunidades del grafo tree-sitter (etiquetadas), Consulta rápida (python), Estado, God Nodes (más conectados), Grafos de SNC_v3 (+43 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (46): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+38 more)

### Community 15 - "config.env.js"
Cohesion: 0.24
Nodes (5): ENV, askNVIDIA(), nvidiaClient, streamNVIDIA(), dotenv

### Community 16 - "sanitize.js"
Cohesion: 0.20
Nodes (3): ALLOWED_ATTR, ALLOWED_TAGS, DOMPurify

### Community 17 - "Deploy SNC_v3 — Firebase Hosting"
Cohesion: 0.20
Nodes (10): 10. Notas importantes, 1. Requisitos previos, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview, 7. Deploy a producción, 8. Verificar post-deploy (+2 more)

### Community 18 - "cogoUI.js"
Cohesion: 0.10
Nodes (34): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+26 more)

### Community 19 - "Estado y Persistencia"
Cohesion: 0.18
Nodes (6): App, initializeNodeCoordination(), escapeHtml(), renderLineage(), localStoragePolyfill, State

### Community 20 - "DB y Autenticación"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 21 - "Versionado y Municipal"
Cohesion: 0.40
Nodes (9): clone(), compareVersions(), createProjectVersion(), transitionVersion(), compareLatest(), create(), persistVersions(), render() (+1 more)

### Community 22 - "DB y Autenticación"
Cohesion: 0.11
Nodes (19): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+11 more)

### Community 23 - "rateLimit.js"
Cohesion: 0.33
Nodes (6): getClientIdentifier(), incrementWithTTL(), memoryStore, rateLimit(), sensitiveMemoryStore, sensitiveRateLimit()

### Community 24 - "2. Checklist Pre-Deploy"
Cohesion: 0.33
Nodes (6): 2. Checklist Pre-Deploy, Backend y entorno, Configuración y secretos, Código y calidad, Datos y hosting, Seguridad (Fase 2 verificada)

### Community 25 - "ref_node_fs"
Cohesion: 0.33
Nodes (4): block, end, start, text

### Community 26 - "Carga de Archivos Geo"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 27 - "11. Estado del proyecto (2026-10-18)"
Cohesion: 0.50
Nodes (4): 11. Estado del proyecto (2026-10-18), Archivos eliminados, Completado, Pendiente de verificación manual

### Community 28 - "DB y Autenticación"
Cohesion: 0.24
Nodes (7): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), stmts, better-sqlite3

### Community 32 - "Community 28"
Cohesion: 0.38
Nodes (11): BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail(), sendWelcomeEmail() (+3 more)

### Community 43 - "Community 37"
Cohesion: 0.17
Nodes (12): 1. Login y proyecto (Windows), 2. Gate pre-promoción + tests (WSL), 3. Preview (Windows), 4. Deploy a producción (Windows), 5. Verificación post-deploy, 6. Rollback, Deploy Windows + WSL — SNC_v3, Flujo ejecutivo (+4 more)

### Community 46 - "Mapa y Capas Leaflet"
Cohesion: 0.20
Nodes (6): DEPARTAMENTOS_PY, DISTRITOS_PY, _LAYERS_CACHE, validarClave(), validarDIST(), validarDPTO()

### Community 47 - "Community 42"
Cohesion: 0.26
Nodes (10): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+2 more)

### Community 50 - "Community 40"
Cohesion: 0.11
Nodes (18): dependencies, bcrypt, better-sqlite3, docx, dom-to-image, dotenv, express, firebase-admin (+10 more)

### Community 51 - "Community 41"
Cohesion: 0.33
Nodes (6): 2. Ciclo de Vida Obligatorio para Cada Tarea, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos, Paso 3: Adquirir el Lock, Paso 4: Realizar el cambio y verificar, Paso 5: Registrar el aprendizaje (Feedback Loop)

### Community 62 - "Community 49"
Cohesion: 0.31
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 65 - "Community 52"
Cohesion: 0.22
Nodes (9): 🚀 Arranque rápido, 🔴 Bloqueantes conocidos (leer antes de desplegar), 📚 Documentación, 🗂️ Estructura, 🧠 Grafo del repositorio (`graphify-out/`), 🤖 Para agentes de IA, Scripts, SNC v3 — Catastro PY (Res. SNC N° 551/2023) (+1 more)

### Community 66 - "PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)"
Cohesion: 0.17
Nodes (8): 0. Contexto obligatorio: auditoría abierta (2026-10-18), 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023), Reglas adicionales mientras la auditoría esté abierta, adminMiddleware()

### Community 75 - "Community 64"
Cohesion: 0.38
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 79 - "Community 69"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 80 - "logger.js"
Cohesion: 0.21
Nodes (8): Diagnostic, LayerGuard, logger, express, { logger }, router, users, express

### Community 83 - "Community 73"
Cohesion: 0.33
Nodes (4): http, listenPort, server, targetPort

### Community 86 - "Community 77"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

## Knowledge Gaps
- **21 isolated node(s):** `dom-to-image`, `graphify`, `jspdf`, `jspdf-autotable`, `leaflet` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 456 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `logger.js` to `Community 28`, `Exportación y Certificados`, `Mapa y Capas Leaflet`, `Carga de Archivos Geo`, `Estado y Persistencia`, `layerPanel.js`, `mapEngine.js`, `validator.js`, `Mapa y Capas Leaflet`, `Estado y Persistencia`, `Community 77`, `Mapa y Capas Leaflet`?**
  _High betweenness centrality (0.160) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runValidation()` (e.g. with `God Nodes (más conectados)` and `Nodos`) actually correct?**
  _`runValidation()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `dom-to-image`, `graphify`, `jspdf` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `LayerManagerClass` be split into smaller, more focused modules?**
  _Cohesion score 0.08350951374207188 - nodes in this community are weakly interconnected._
- **Why does `adminMiddleware()` connect `PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)` to `Estado y Persistencia`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `Exportación y Certificados` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._