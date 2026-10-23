# Graph Report - SNC_v3  (2026-10-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 695 nodes · 1322 edges · 55 communities (35 shown, 20 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0666b27a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compilerOptions
- Deploy Windows + WSL — SNC_v3
- StateManager
- parser.js
- mapEngine.js
- dataTable.js
- geoprocessingUI.js
- server-api.js
- package.json
- validator.js
- utils.js
- export.js
- Deploy SNC_v3 — Firebase Hosting
- state.js
- sync-auditoria.mjs
- cacheDb.js
- devDependencies
- dependencies
- mailer.js
- cogoUI.js
- packAndDownload
- showToast
- updateHistoryControls
- paraguayRef.js
- plans.js
- logger.js
- sanitize.js
- backup_complement.js
- LayerGuardClass
- index.js
- ValidadorMunicipal
- rateLimit.js
- firebase-admin.js
- redticket-payments.js
- municipalClient.js
- firebase-client.js
- init
- loadGeoJSON
- payment.js
- vite.config.js

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 69 edges
2. `compilerOptions` - 37 edges
3. `StateManager` - 26 edges
4. `runValidation()` - 21 edges
5. `scripts` - 19 edges
6. `handleGeoFile()` - 17 edges
7. `logger` - 17 edges
8. `calcularMetricasPlanasUTM()` - 16 edges
9. `render()` - 15 edges
10. `packAndDownload()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Nodos` --references--> `ValidadorMunicipal`  [INFERRED]
  GRAFOS.md → js/municipal.js
- `God Nodes (más conectados)` --references--> `showToast()`  [INFERRED]
  GRAFOS.md → js/utils.js
- `Nodos` --references--> `handleGeoFile()`  [INFERRED]
  GRAFOS.md → js/parser.js
- `God Nodes (más conectados)` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js
- `Nodos` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js

## Import Cycles
- None detected.

## Communities (55 total, 20 thin omitted)

### Community 0 - "compilerOptions"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 1 - "Deploy Windows + WSL — SNC_v3"
Cohesion: 0.05
Nodes (35): 0. Contexto obligatorio: auditoría abierta (2026-10-18), 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 2. Ciclo de Vida Obligatorio para Cada Tarea, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos (+27 more)

### Community 2 - "StateManager"
Cohesion: 0.10
Nodes (11): 1. Grafo tree-sitter (graphify), 2. Grafo de dominio, Aristas, Comunidades (56, etiquetadas en español), Consulta rápida (python), Estado, God Nodes (más conectados), Grafos de SNC_v3 (+3 more)

### Community 3 - "parser.js"
Cohesion: 0.13
Nodes (29): explodePolygonFeatures(), detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+21 more)

### Community 4 - "mapEngine.js"
Cohesion: 0.12
Nodes (30): addDraftVertex(), captureCertificateMapImages(), clearVertexMarkers(), closeParcelInspector(), convertPointsToPolygon(), deleteDraftVertex(), findSnapCoordinate(), geometryHistory (+22 more)

### Community 5 - "dataTable.js"
Cohesion: 0.12
Nodes (19): addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow(), editRow() (+11 more)

### Community 6 - "geoprocessingUI.js"
Cohesion: 0.16
Nodes (22): booleanResult(), ensureFeature(), executeGeoprocessing(), close(), featureLabel(), modal(), open(), run() (+14 more)

### Community 7 - "server-api.js"
Cohesion: 0.08
Nodes (14): closeRateLimit(), app, countExportsToday(), __dirname, getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+6 more)

### Community 8 - "package.json"
Cohesion: 0.08
Nodes (24): name, private, type, version, bcrypt, better-sqlite3, dxf-parser, eslint (+16 more)

### Community 9 - "validator.js"
Cohesion: 0.17
Nodes (21): getParsingLogs(), calcularMetricasPlanasUTM(), isNumeric(), formatCoordinate(), normalizarNombreTerritorial(), obtenerCodigo(), runExportValidation(), runValidation() (+13 more)

### Community 10 - "utils.js"
Cohesion: 0.12
Nodes (19): CAMPOS_RURALES, CAMPOS_URBANOS, CONFIG_MUNICIPAL, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAP_CONFIG, MAX_VERTICES_BEFORE_SIMPLIFY (+11 more)

### Community 11 - "export.js"
Cohesion: 0.15
Nodes (17): buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportProfessionalReport(), generateAuditCertificate(), generateComplianceCertificate(), generateConsultaDescriptivaPDF(), generatePDFReport() (+9 more)

### Community 12 - "Deploy SNC_v3 — Firebase Hosting"
Cohesion: 0.10
Nodes (20): 10. Notas importantes, 11. Estado del proyecto (2026-10-18), 1. Requisitos previos, 2. Checklist Pre-Deploy, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview (+12 more)

### Community 13 - "state.js"
Cohesion: 0.18
Nodes (14): escapeHtml(), renderLineage(), loadPersistedExpediente(), localStoragePolyfill, State, clone(), compareVersions(), createProjectVersion() (+6 more)

### Community 14 - "sync-auditoria.mjs"
Cohesion: 0.11
Nodes (19): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+11 more)

### Community 15 - "cacheDb.js"
Cohesion: 0.18
Nodes (16): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+8 more)

### Community 16 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 17 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, bcrypt, better-sqlite3, docx, dompurify, dotenv, express, firebase-admin (+9 more)

### Community 18 - "mailer.js"
Cohesion: 0.25
Nodes (14): ENV, BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail() (+6 more)

### Community 19 - "cogoUI.js"
Cohesion: 0.26
Nodes (12): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+4 more)

### Community 20 - "packAndDownload"
Cohesion: 0.23
Nodes (13): exportGeoJSON(), exportKML(), getExportGeoJSON(), packAndDownload(), buildGeoJSON(), buildKML(), escapeXml(), selectOfficialProperties() (+5 more)

### Community 21 - "showToast"
Cohesion: 0.18
Nodes (12): loadTemplateFromLink(), saveToExcel(), clearTopologyErrors(), downloadEnvironmentCache(), performSplit(), performSplitLegacy(), showTopologyErrors(), toggleDeptos() (+4 more)

### Community 22 - "updateHistoryControls"
Cohesion: 0.27
Nodes (12): cancelVertexEdit(), clearProjectLayer(), commitExternalGeometry(), commitVertexEdit(), ensureKeyboardShortcuts(), onVertexEditMapClick(), redoGeometryEdit(), startVertexEdit() (+4 more)

### Community 23 - "paraguayRef.js"
Cohesion: 0.20
Nodes (6): DEPARTAMENTOS_PY, DISTRITOS_PY, _LAYERS_CACHE, validarClave(), validarDIST(), validarDPTO()

### Community 24 - "plans.js"
Cohesion: 0.29
Nodes (9): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+1 more)

### Community 25 - "logger.js"
Cohesion: 0.24
Nodes (7): Diagnostic, LayerGuard, appStream, errorStream, LOG_DIR, logger, pino

### Community 26 - "sanitize.js"
Cohesion: 0.20
Nodes (8): ALLOWED_ATTR, ALLOWED_TAGS, DOMPurify, escapeHtml(), generateReportToken(), sanitizeHtml(), dompurify, jsdom

### Community 29 - "index.js"
Cohesion: 0.29
Nodes (4): App, CAMPOS_REQUERIDOS, actualizarEstadoProyecto(), Workspace

### Community 31 - "rateLimit.js"
Cohesion: 0.39
Nodes (7): getClientIdentifier(), incrementWithTTL(), memoryStore, rateLimit(), sensitiveMemoryStore, sensitiveRateLimit(), ioredis

### Community 32 - "firebase-admin.js"
Cohesion: 0.38
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

### Community 33 - "redticket-payments.js"
Cohesion: 0.38
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 35 - "firebase-client.js"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 36 - "init"
Cohesion: 0.47
Nodes (6): assertMapDependencies(), checkMapDependencies(), focusWorkPolygon(), init(), invalidateSize(), restoreStartupView()

### Community 37 - "loadGeoJSON"
Cohesion: 0.53
Nodes (6): assignNumberFromMap(), getPolygonFeatures(), loadGeoJSON(), renderParcelNumberLabels(), stopParcelNumberAssignment(), toggleParcelNumberAssignment()

### Community 38 - "payment.js"
Cohesion: 0.33
Nodes (5): express, { logger }, router, users, express

## Knowledge Gaps
- **18 isolated node(s):** `better-sqlite3`, `dxf-parser`, `eslint`, `graphify`, `husky` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 292 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `adminMiddleware()` connect `Deploy Windows + WSL — SNC_v3` to `server-api.js`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runValidation()` (e.g. with `God Nodes (más conectados)` and `Nodos`) actually correct?**
  _`runValidation()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `better-sqlite3`, `dxf-parser`, `eslint` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Deploy Windows + WSL — SNC_v3` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `StateManager` be split into smaller, more focused modules?**
  _Cohesion score 0.09915966386554621 - nodes in this community are weakly interconnected._
- **Should `parser.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1319073083778966 - nodes in this community are weakly interconnected._