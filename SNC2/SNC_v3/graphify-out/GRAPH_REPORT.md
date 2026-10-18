# Graph Report - SNC_v3  (2026-10-18)

## Corpus Check
- modo incremental — el corpus no se re-escaneó; se parte del grafo existente y se agregan documentos

## Summary
- 848 nodes · 1501 edges · 63 communities (42 shown, 21 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6977dc0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mapEngine.js
- Deploy SNC_v3 — Firebase Hosting
- cogoUI.js
- compilerOptions
- parser.js
- dataTable.js
- server-api.js
- graphify_index_docs.py
- StateManager
- validator.js
- Estado y Persistencia
- export.js
- package.json
- utils.js
- index.js
- Scripts NPM
- Grafos de SNC_v3
- Cogo y Coordenadas
- scripts
- package.json
- sync-auditoria.mjs
- Email y Notificaciones
- Migración DB
- Auditoría 2026-10-18
- export.js
- logger.js
- Pagos RedTicket
- Dependencias y Tooling
- PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)
- state.js
- Migración DB
- Auditoría 2026-10-18
- Plan de remediación
- logger.js
- logger.js
- Auditoría 2026-10-18
- 2. Ciclo de Vida Obligatorio para Cada Tarea
- municipalClient.js
- firebase-client.js
- logger.js
- redticket-payments.js
- localhost-proxy.cjs
- _update_user.cjs
- Auditoría 2026-10-18
- fix_members_auth.mjs
- firebase-admin.js
- package.json
- probar_members.cjs
- register-errors.mjs
- probe_free_models.sh
- backup_sqlite.sh script
- promotion_gate.sh script
- restore_sqlite.sh script
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
- `God Nodes (más conectados)` --references--> `showToast()`  [INFERRED]
  GRAFOS.md → js/utils.js
- `God Nodes (más conectados)` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js
- `Nodos` --references--> `runValidation()`  [INFERRED]
  GRAFOS.md → js/validator.js
- `Nodos` --references--> `handleGeoFile()`  [INFERRED]
  GRAFOS.md → js/parser.js

## Import Cycles
- None detected.

## Communities (63 total, 21 thin omitted)

### Community 0 - "mapEngine.js"
Cohesion: 0.07
Nodes (69): MAP_CONFIG, UTM_ZONE_RANGES, loadTemplateFromLink(), LayerGuard, addDraftVertex(), assertMapDependencies(), assignNumberFromMap(), cancelVertexEdit() (+61 more)

### Community 1 - "Deploy SNC_v3 — Firebase Hosting"
Cohesion: 0.05
Nodes (41): 10. Notas importantes, 11. Estado del proyecto (2026-10-18), 1. Requisitos previos, 2. Checklist Pre-Deploy, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview (+33 more)

### Community 2 - "cogoUI.js"
Cohesion: 0.10
Nodes (34): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+26 more)

### Community 3 - "compilerOptions"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 4 - "parser.js"
Cohesion: 0.13
Nodes (29): explodePolygonFeatures(), detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+21 more)

### Community 5 - "dataTable.js"
Cohesion: 0.12
Nodes (20): addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow(), editRow() (+12 more)

### Community 6 - "server-api.js"
Cohesion: 0.07
Nodes (19): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+11 more)

### Community 7 - "graphify_index_docs.py"
Cohesion: 0.11
Nodes (8): backup(), base_extraction(), _fail(), _hub_label(), load_json(), main(), merge(), reuse_labels()

### Community 9 - "validator.js"
Cohesion: 0.17
Nodes (21): getParsingLogs(), calcularMetricasPlanasUTM(), isNumeric(), formatCoordinate(), normalizarNombreTerritorial(), obtenerCodigo(), runExportValidation(), runValidation() (+13 more)

### Community 10 - "Estado y Persistencia"
Cohesion: 0.10
Nodes (20): bcrypt, db, DB_PATH, dbAPI, DB_LOG, { existsSync, mkdirSync, appendFileSync }, expedientes, { join } (+12 more)

### Community 11 - "export.js"
Cohesion: 0.15
Nodes (17): buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportProfessionalReport(), generateAuditCertificate(), generateComplianceCertificate(), generateConsultaDescriptivaPDF(), generatePDFReport() (+9 more)

### Community 12 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, type, version, dxf-parser, eslint, graphify, husky (+14 more)

### Community 13 - "utils.js"
Cohesion: 0.13
Nodes (18): CAMPOS_RURALES, CAMPOS_URBANOS, CONFIG_MUNICIPAL, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAX_VERTICES_BEFORE_SIMPLIFY, MENSAJES (+10 more)

### Community 14 - "index.js"
Cohesion: 0.16
Nodes (10): Diagnostic, App, CAMPOS_REQUERIDOS, escapeHtml(), renderLineage(), logger, localStoragePolyfill, State (+2 more)

### Community 15 - "Scripts NPM"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 16 - "Grafos de SNC_v3"
Cohesion: 0.14
Nodes (11): 1. Grafo tree-sitter (graphify), 2. Grafo de dominio, Aristas, Comunidades del grafo tree-sitter (etiquetadas), Consulta rápida (python), Estado, God Nodes (más conectados), Grafos de SNC_v3 (+3 more)

### Community 17 - "Cogo y Coordenadas"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 18 - "scripts"
Cohesion: 0.11
Nodes (18): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+10 more)

### Community 19 - "package.json"
Cohesion: 0.20
Nodes (16): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+8 more)

### Community 20 - "sync-auditoria.mjs"
Cohesion: 0.16
Nodes (15): buildJson(), buildReadme(), CHECK, clean(), main(), OUT_DIR, parseFindings(), PHASE (+7 more)

### Community 21 - "Email y Notificaciones"
Cohesion: 0.31
Nodes (12): ENV, BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail() (+4 more)

### Community 22 - "Migración DB"
Cohesion: 0.23
Nodes (8): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), runJsonMigration(), stmts, better-sqlite3

### Community 23 - "Auditoría 2026-10-18"
Cohesion: 0.17
Nodes (12): 5. Hallazgos altos, A-01 · `/api/usage/increment` responde 403 siempre, A-02 · Health check que siempre dice "ok", A-03 · Los usuarios con hash legacy no pueden iniciar sesión, A-04 · El primer usuario registrado se convierte en administrador, A-05 · Rate limiting inefectivo, A-06 · XSS almacenado en el checkout de pagos (y alcanzable por un admin vía IDOR), A-07 · Sanitización de HTML por regex y reporte "público" que exige login (+4 more)

### Community 24 - "export.js"
Cohesion: 0.29
Nodes (11): exportGeoJSON(), exportKML(), getExportGeoJSON(), packAndDownload(), buildGeoJSON(), buildKML(), escapeXml(), selectOfficialProperties() (+3 more)

### Community 25 - "logger.js"
Cohesion: 0.20
Nodes (6): DEPARTAMENTOS_PY, DISTRITOS_PY, _LAYERS_CACHE, validarClave(), validarDIST(), validarDPTO()

### Community 26 - "Pagos RedTicket"
Cohesion: 0.26
Nodes (10): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+2 more)

### Community 27 - "Dependencias y Tooling"
Cohesion: 0.17
Nodes (12): dependencies, bcrypt, better-sqlite3, docx, dotenv, express, firebase-admin, graphify (+4 more)

### Community 28 - "PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)"
Cohesion: 0.18
Nodes (8): 0. Contexto obligatorio: auditoría abierta (2026-10-18), 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023), Reglas adicionales mientras la auditoría esté abierta, adminMiddleware()

### Community 29 - "state.js"
Cohesion: 0.40
Nodes (9): clone(), compareVersions(), createProjectVersion(), transitionVersion(), compareLatest(), create(), persistVersions(), render() (+1 more)

### Community 30 - "Migración DB"
Cohesion: 0.27
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 31 - "Auditoría 2026-10-18"
Cohesion: 0.22
Nodes (9): 4. Hallazgos críticos, C-01 · Credenciales reales versionadas en Git, C-02 · Clave privada de Firebase Admin en el workspace, C-03 · El despliegue publica todo el repositorio, C-04 · IDOR multi-tenant en proyectos, expedientes, archivos y pagos, C-05 · Tokens JWT forjables / sesiones no revocables, C-06 · Firestore roto + fallback silencioso a SQLite, C-07 · Endpoints core en 500: contrato `db.cjs` incompleto y `files_json` inexistente (+1 more)

### Community 32 - "Plan de remediación"
Cohesion: 0.22
Nodes (9): 0. Estado, 1. Reglas para quien implemente, 2. Fase 0 — Contención (0-48 h, bloqueante de despliegue), 3. Fase 1 — Autorización y funcionalidad core (semana 1), 4. Fase 2 — Calidad, XSS y cadena de entrega (semanas 2-3), 5. Fase 3 — Endurecimiento y deuda (backlog), 6. Zonas congeladas hasta cerrar Fase 0, 7. Cómo retomar el trabajo (+1 more)

### Community 35 - "Auditoría 2026-10-18"
Cohesion: 0.25
Nodes (8): 10. Conclusión, 1. Resumen ejecutivo, 2. Inventario auditado, 3. Verificaciones ejecutadas (evidencia), 6. Hallazgos medios, 7. Hallazgos bajos, 9. Anexo — Parches sugeridos (orientativos), Auditoría técnica — SNC_v3 (Catastro PY / Res. SNC 551/2023)

### Community 36 - "2. Ciclo de Vida Obligatorio para Cada Tarea"
Cohesion: 0.33
Nodes (6): 2. Ciclo de Vida Obligatorio para Cada Tarea, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos, Paso 3: Adquirir el Lock, Paso 4: Realizar el cambio y verificar, Paso 5: Registrar el aprendizaje (Feedback Loop)

### Community 38 - "firebase-client.js"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 39 - "logger.js"
Cohesion: 0.33
Nodes (5): express, { logger }, router, users, express

### Community 40 - "redticket-payments.js"
Cohesion: 0.47
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 41 - "localhost-proxy.cjs"
Cohesion: 0.33
Nodes (4): http, listenPort, server, targetPort

### Community 42 - "_update_user.cjs"
Cohesion: 0.40
Nodes (3): bcrypt, bcrypt, { dbAPI }

### Community 43 - "Auditoría 2026-10-18"
Cohesion: 0.40
Nodes (5): 8. Plan de remediación priorizado, Fase 0 — Contención (0-48 h), Fase 1 — Corrección funcional y de autorización (semana 1), Fase 2 — Calidad y cadena de entrega (semanas 2-3), Fase 3 — Endurecimiento y deuda (backlog)

### Community 44 - "fix_members_auth.mjs"
Cohesion: 0.40
Nodes (4): block, end, start, text

### Community 45 - "firebase-admin.js"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

## Knowledge Gaps
- **16 isolated node(s):** `dxf-parser`, `eslint`, `graphify`, `husky`, `jszip` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 404 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `adminMiddleware()` connect `PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)` to `server-api.js`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `runValidation()` (e.g. with `God Nodes (más conectados)` and `Nodos`) actually correct?**
  _`runValidation()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `dxf-parser`, `eslint`, `graphify` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mapEngine.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06923361717882266 - nodes in this community are weakly interconnected._
- **Why does `PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)` connect `PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)` to `2. Ciclo de Vida Obligatorio para Cada Tarea`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Should `Deploy SNC_v3 — Firebase Hosting` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._
- **Should `cogoUI.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09988385598141696 - nodes in this community are weakly interconnected._