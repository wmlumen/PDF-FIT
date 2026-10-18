# Graph Report - SNC_v3  (2026-10-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 696 nodes · 1322 edges · 48 communities (28 shown, 20 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1efe7f23`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 31
- Community 34
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 68 edges
2. `compilerOptions` - 37 edges
3. `StateManager` - 25 edges
4. `runValidation()` - 19 edges
5. `logger` - 17 edges
6. `calcularMetricasPlanasUTM()` - 16 edges
7. `handleGeoFile()` - 16 edges
8. `scripts` - 16 edges
9. `render()` - 15 edges
10. `packAndDownload()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `activatePayment()` --calls--> `sendAdminAlert()`  [EXTRACTED]
  server-api.js → js/mailer.js
- `loadTemplateFromLink()` --calls--> `showToast()`  [EXTRACTED]
  js/dataTable.js → js/utils.js
- `saveToExcel()` --calls--> `showToast()`  [EXTRACTED]
  js/dataTable.js → js/utils.js
- `activatePayment()` --calls--> `resolvePlan()`  [EXTRACTED]
  server-api.js → js/plans.js
- `clearTopologyErrors()` --calls--> `showToast()`  [EXTRACTED]
  js/mapEngine.js → js/utils.js

## Import Cycles
- None detected.

## Communities (48 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (65): addDraftVertex(), assertMapDependencies(), assignNumberFromMap(), cancelVertexEdit(), captureCertificateMapImages(), checkMapDependencies(), clearProjectLayer(), clearTopologyErrors() (+57 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (41): CAMPOS_RURALES, CAMPOS_URBANOS, CONFIG_MUNICIPAL, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAP_CONFIG, MAX_VERTICES_BEFORE_SIMPLIFY (+33 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (17): Diagnostic, calcularDistancia(), gradosARadianes(), LayerGuard, LayerGuardClass, logger, DEPARTAMENTOS_PY, DISTRITOS_PY (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (30): buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportGeoJSON(), exportKML(), exportProfessionalReport(), generateAuditCertificate(), generateComplianceCertificate() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (22): CAMPOS_REQUERIDOS, addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (29): explodePolygonFeatures(), detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (18): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (22): booleanResult(), ensureFeature(), executeGeoprocessing(), close(), featureLabel(), modal(), open(), run() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (16): escapeHtml(), renderLineage(), MunicipalClient, State, clone(), compareVersions(), createProjectVersion(), transitionVersion() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (21): bcrypt, db, DB_PATH, dbAPI, DB_LOG, { existsSync, mkdirSync, appendFileSync }, expedientes, { join } (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (22): name, private, type, version, dxf-parser, eslint, graphify, husky (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (16): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+8 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (5): App, graphCoordinator, initializeAgentSwarm(), actualizarEstadoProyecto(), gc

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (16): scripts, backup:db, build, deploy, deploy:all, dev, format, lint (+8 more)

### Community 18 - "Community 18"
Cohesion: 0.26
Nodes (12): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.31
Nodes (12): ENV, BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail() (+4 more)

### Community 20 - "Community 20"
Cohesion: 0.23
Nodes (8): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), runJsonMigration(), stmts, better-sqlite3

### Community 21 - "Community 21"
Cohesion: 0.26
Nodes (10): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (12): dependencies, bcrypt, better-sqlite3, docx, dotenv, express, firebase-admin, graphify (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.27
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 25 - "Community 25"
Cohesion: 0.47
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (4): http, listenPort, server, targetPort

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (4): block, end, start, text

### Community 28 - "Community 28"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

## Knowledge Gaps
- **19 isolated node(s):** `../logger.js`, `../state.js`, `../utils.js`, `dxf-parser`, `eslint` (+14 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 301 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `Community 2` to `Community 0`, `Community 1`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 10`, `Community 16`, `Community 19`, `Community 28`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **What connects `../logger.js`, `../state.js`, `../utils.js` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0792838874680307 - nodes in this community are weakly interconnected._
- **Why does `showToast()` connect `Community 0` to `Community 1`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 10`, `Community 16`, `Community 18`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07058001397624039 - nodes in this community are weakly interconnected._
- **Why does `StateManager` connect `Community 9` to `Community 10`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.056910569105691054 - nodes in this community are weakly interconnected._