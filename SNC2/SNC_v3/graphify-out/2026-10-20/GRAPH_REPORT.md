# Graph Report - SNC_v3  (2026-10-20)

## Corpus Check
- modo incremental — el corpus no se re-escaneó; se parte del grafo existente y se agregan archivos

## Summary
- 2023 nodes · 3336 edges · 181 communities (108 shown, 73 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 224 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- coordinator-mem.mjs
- crs.js
- AttributeTableClass
- Exportación y Certificados
- DB y Autenticación
- validator.test.mjs
- attributeEditor.js
- LayerManagerClass
- Community 5
- 📋 INFORME DE VALIDACIÓN - Catastro PY Pro
- export.js
- coordinator-nosys.mjs
- parser.js
- StateManager
- dataTable.js
- labelEngine.js
- mapEngine.js
- attributeTableUI.js
- server-api.js
- mapLegend.js
- export.test.mjs
- PLAN DE ARREGLOS — SNC_v3 (2026-10-19)
- package.json
- validator.js
- Plan de remediación
- 🧪 QA Checklist - Salud del Proyecto
- index.js
- Mapa y Capas Leaflet
- GraphCoordinator
- utils.js
- DB y Autenticación
- versioningUI.js
- DB y Autenticación
- coordinator.mjs
- GraphClient
- Carga de Archivos Geo
- 📊 Resumen de Diagnósticos
- mapEngine.js
- 1. Tablas y Estructura
- Community 14
- DB y Autenticación
- workflow.test.mjs
- Community 45
- Plan: Capa de Base de Datos Completa (SQLite + Firestore + Cache)
- Catastro PY Pro v3.0 - SNC 551/2023
- cli.mjs
- Auditoría 2026-10-18
- Auditoría 2026-10-18
- 📊 Tabla Comparativa de Funcionalidades
- Mapa y Capas Leaflet
- mapEngine.js
- Mapa y Capas Leaflet
- ValidadorMunicipal
- geometry-history.test.mjs
- api-security.test.mjs
- Community 37
- ValidadorMunicipal
- municipalClient.js
- Mapa y Capas Leaflet
- Community 42
- dependencies
- Auditoría y plan de remediación
- Community 41
- config.env.js
- Community 28
- Graph Coordinator - Documentación de Uso
- Auditoría y plan de remediación
- Auditoría 2026-10-18
- Promoción SNC_v3 — Checklist
- 🧭 Supuestos CRS y Reproyección - Parser/Export
- Community 64
- sanitize.js
- backup_complement.js
- mapEngine.js
- Mapa y Capas Leaflet
- rateLimit.js
- Community 49
- Community 52
- NVIDIAClient
- Community 73
- Plan de remediación
- 🚧 Pendientes de Desarrollo
- 🔧 Variables de Entorno
- mapEngine.js
- espejo_auditoria_graphify.md
- grafo_completo.md
- graphClient.mjs
- ref_node_path
- 📊 Cobertura QA P3 - SNC_v3
- 📁 Descripción de Archivos
- Mapa y Capas Leaflet
- indexar_auditoria_grafo.md
- 2. Checklist Pre-Deploy
- generateConsultaDescriptivaPDF()
- Community 69
- mapEngine.js
- payment.js
- documentar_auditoria.md
- guard_graph_refresh.md
- 🏁 Guía de Promoción a Producción
- 🏁 Guía de Promoción a Producción
- Community 77
- Changelog - Security
- Mejoras P3 Frontend SNC_v3
- grafo_graphify_out.md
- Changelog - Repo Hygiene
- dependencies
- promotion_gate.sh
- 👥 Panel de Gestión (`members.html`)
- 📦 Exportación y Certificación
- 🛠️ Tecnologías
- 📋 Notas de Origen y Versiones
- 🔄 Compatibilidad de Formatos
- Changelog - Architecture
- Changelog - Code Quality
- fix_municipal_data_import.md
- fix_pagina_index.md
- grafo_completo_final.md
- Changelog - Municipal Compliance
- Changelog - Performance
- validarCierreAnillos()
- workspace.js
- db_contract_expedientes.md
- 2026-10-19 - imp_1792381717754_0trkdg9t
- fix_auth_register_login.md
- fix_browser_logger.md
- 2026-10-19 - imp_1792381833285_kz2cwjk3
- fix_encoding_map_engine.md
- fix_fluxograma_bundle.md
- 2026-10-18 - imp_1792367788085_hln28gpr
- fix_icons_index_municipal_html.md
- fix_server_api_complete.md
- 2026-10-18 - imp_1792365483660_2ze771kq
- 2026-10-18 - imp_1792365725348_fa4z2bqy
- piribebuy_reproject_gis.md
- repair_topology.md
- runtime_mismatch_isolation.md
- probe_free_models.sh
- backup_sqlite.sh script
- restore_sqlite.sh script
- rotate_legacy_hashes.sh script
- simulateValidarProyeccion()

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 78 edges
2. `AttributeTableClass` - 45 edges
3. `LayerManagerClass` - 45 edges
4. `compilerOptions` - 37 edges
5. `GraphCoordinator` - 27 edges
6. `StateManager` - 26 edges
7. `Catastro PY Pro v3.0 - SNC 551/2023` - 26 edges
8. `logger` - 22 edges
9. `runValidation()` - 21 edges
10. `GraphCoordinator` - 20 edges

## Surprising Connections (you probably didn't know these)
- `7. Hallazgos bajos` --references--> `pruneCache()`  [INFERRED]
  docs/AUDITORIA_SNC_v3_2026-10-18.md → cacheDb.js
- `6. Hallazgos medios` --references--> `resolvePlan()`  [INFERRED]
  docs/AUDITORIA_SNC_v3_2026-10-18.md → js/plans.js
- `ESTADO FINAL: ✅ COMPLETADO — APTO PARA PROMOCIÓN` --references--> `sanitizeString()`  [INFERRED]
  docs/PLAN_ARREGLOS_2026-10-19.md → js/utils.js
- `1. Certificación PDF completa` --references--> `generateConsultaDescriptivaPDF()`  [INFERRED]
  docs/README.md → js/export.js
- `🚀 Estado del Proyecto` --references--> `generateConsultaDescriptivaPDF()`  [INFERRED]
  docs/README.md → js/export.js

## Import Cycles
- 2-file cycle: `.opencode/coordination/coordinator.mjs -> .opencode/coordination/orchestrator.mjs -> .opencode/coordination/coordinator.mjs`

## Communities (181 total, 73 thin omitted)

### Community 0 - "coordinator-mem.mjs"
Cohesion: 0.06
Nodes (29): appendFileSync(), appendJsonl(), CHANGELOG_DIR, COORD_DIR, ERRORS_FILE, existsSync(), _files, genId() (+21 more)

### Community 1 - "crs.js"
Cohesion: 0.05
Nodes (56): PROJ_32720, PROJ_32721, analyzeCRS(), bboxOf(), CANDIDATE_ZONES, CRS_BY_ZONE, CRS_DEFS, CRS_LABELS (+48 more)

### Community 2 - "AttributeTableClass"
Cohesion: 0.07
Nodes (13): AttributeTable, AttributeTableClass, boundsOfFeatures(), compareValues(), deriveColumns(), evaluateCondition(), FILTER_OPERATORS, formatCondition() (+5 more)

### Community 3 - "Exportación y Certificados"
Cohesion: 0.09
Nodes (40): applyDialogValues(), buildDialogSpec(), buildPopupFields(), closeDialog(), collectValues(), esc(), formatScaleRange(), geometryLabel() (+32 more)

### Community 4 - "DB y Autenticación"
Cohesion: 0.05
Nodes (41): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+33 more)

### Community 5 - "validator.test.mjs"
Cohesion: 0.04
Nodes (40): areaFail, areaOkUrbanoFeature, areaOkUrbanoGeom, calculatedArea, CAMPOS_REQUERIDOS, completoUrbano, exportCheckBadProj, exportCheckMissing (+32 more)

### Community 6 - "attributeEditor.js"
Cohesion: 0.08
Nodes (34): addColumn(), cellValue(), columns(), join(), rowKey(), save(), setCellValue(), state (+26 more)

### Community 7 - "LayerManagerClass"
Cohesion: 0.08
Nodes (3): LayerManagerClass, makeNode(), normalizeLabelConfigSafe()

### Community 8 - "Community 5"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 9 - "📋 INFORME DE VALIDACIÓN - Catastro PY Pro"
Cohesion: 0.05
Nodes (39): 📊 1. QUÉ VALIDA EL SISTEMA (8 CRITERIOS SNC 551/2023), 📄 2. ESTRUCTURA DEL INFORME DE VALIDACIÓN, ✅ 4.1 CAMPOS OBLIGATORIOS (Art. 8 de la Res.), ✅ 4.2 TOLERANCIA DE ÁREA (Art. 12 de la Res.), ✅ 4.3 PROYECCIÓN CARTOGRÁFICA (Art. 15 de la Res.), ✅ 4.4 TOPOLOGÍA (Art. 18 de la Res.), ✅ 4.5 ESTRUCTURA DE ARCHIVOS (Art. 20 de la Res.), ✅ 4.6 CERTIFICACIÓN (Anexo B de la Res.) (+31 more)

### Community 10 - "export.js"
Cohesion: 0.10
Nodes (31): CONFIG_MUNICIPAL, METADATOS_GEODESICOS, buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportGeoJSON(), exportKML(), exportProfessionalReport() (+23 more)

### Community 11 - "coordinator-nosys.mjs"
Cohesion: 0.11
Nodes (18): appendFileSync(), appendJsonl(), CHANGELOG_DIR, COORD_DIR, ERRORS_FILE, existsSync(), _files, genId() (+10 more)

### Community 12 - "parser.js"
Cohesion: 0.12
Nodes (28): A. ARCHIVOS DE ENTRADA ACEPTADOS, detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+20 more)

### Community 13 - "StateManager"
Cohesion: 0.10
Nodes (10): 4) Deuda técnica frontend y recomendaciones de bundling, Deuda técnica relevante, Recomendaciones de bundling, 1. Grafo tree-sitter (graphify), Comunidades del grafo tree-sitter (etiquetadas), Estado, God Nodes (más conectados), Grafos de SNC_v3 (+2 more)

### Community 14 - "dataTable.js"
Cohesion: 0.12
Nodes (20): addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow(), editRow() (+12 more)

### Community 15 - "labelEngine.js"
Cohesion: 0.15
Nodes (24): anchorOf(), apply(), clear(), clearAll(), configs, groups, makeTooltip(), refreshForScale() (+16 more)

### Community 16 - "mapEngine.js"
Cohesion: 0.13
Nodes (29): addDraftVertex(), captureCertificateMapImages(), commitVertexEdit(), convertPointsToPolygon(), deleteDraftVertex(), findSnapCoordinate(), geometryHistory, getEditableVertexRefs() (+21 more)

### Community 17 - "attributeTableUI.js"
Cohesion: 0.16
Nodes (29): formatCellValue(), applyFilterFromInput(), back(), bindDocumentEvents(), bindEvents(), buildFilterText(), clearHighlight(), close() (+21 more)

### Community 18 - "server-api.js"
Cohesion: 0.07
Nodes (19): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+11 more)

### Community 19 - "mapLegend.js"
Cohesion: 0.14
Nodes (23): esc(), handleClick(), hooks, kindOf(), legendRows(), mount(), nodeOf(), patchSvg() (+15 more)

### Community 20 - "export.test.mjs"
Cohesion: 0.07
Nodes (18): CAMPOS_REQUERIDOS, certInvalid, certOk, downloads, expBad, expMissing, expOk, generateShapefile() (+10 more)

### Community 21 - "PLAN DE ARREGLOS — SNC_v3 (2026-10-19)"
Cohesion: 0.08
Nodes (25): ESTADO FINAL: ✅ COMPLETADO — APTO PARA PROMOCIÓN, FASE 0 — CRÍTICOS (bloquean el login: nadie puede entrar), FASE 1 — CONTRATO DE BASE DE DATOS (`tests/db-contract.test.mjs`), FASE 2 — PÁGINAS FALTANTES (8 archivos), FASE 3 — GATE PRE-PROMOCIÓN, FASE 4 — VERIFICACIÓN FINAL (100%), LÍNEA BASE MEDIDA (2026-10-19), P0-1 · Registro y alta de usuarios rotos (password_hash NOT NULL) (+17 more)

### Community 22 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, type, version, bcrypt, dxf-parser, eslint, graphify (+14 more)

### Community 23 - "validator.js"
Cohesion: 0.18
Nodes (19): isNumeric(), formatCoordinate(), normalizarNombreTerritorial(), obtenerCodigo(), runExportValidation(), runValidation(), validarArchivosPresentes(), validarCamposObligatorios() (+11 more)

### Community 24 - "Plan de remediación"
Cohesion: 0.10
Nodes (20): CRIT-001: `serviceAccountKey.json` hardcodeado en código, CRIT-002: `JWT_SECRET` expuesto en `config.env.js`, Criterios de Cierre Global (Definition of Done), Fase 0 — Bloqueantes (AHORA) — **~45 min**, Fase 1 — Alta Prioridad (Sprint actual) — **~10h**, Fase 2 — Media (Próximo sprint) — **~8h**, Fase 3 — Baja (Backlog) — **~6h**, Hallazgos ALTOS (+12 more)

### Community 25 - "🧪 QA Checklist - Salud del Proyecto"
Cohesion: 0.10
Nodes (20): Archivos Principales, 📅 Auditorías Programadas, 🔧 Checklist de Componentes, 🧩 Checklist de Funcionalidad, 🚨 Checklist de Problemas Conocidos, 🧪 Checklist de Tests, 📋 Checklist de Validación (Pre-Exportación), Criterios de Validación (Res. SNC 551/2023) (+12 more)

### Community 26 - "index.js"
Cohesion: 0.13
Nodes (10): Diagnostic, App, initializeNodeCoordination(), CAMPOS_REQUERIDOS, LayerGuard, escapeHtml(), renderLineage(), logger (+2 more)

### Community 27 - "Mapa y Capas Leaflet"
Cohesion: 0.19
Nodes (16): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+8 more)

### Community 28 - "GraphCoordinator"
Cohesion: 0.24
Nodes (6): handleCheck(), handleLock(), handlePass(), handleUnlock(), GraphCoordinator, readJsonl()

### Community 29 - "utils.js"
Cohesion: 0.13
Nodes (16): CAMPOS_RURALES, CAMPOS_URBANOS, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAP_CONFIG, MAX_VERTICES_BEFORE_SIMPLIFY, MENSAJES (+8 more)

### Community 30 - "DB y Autenticación"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 31 - "versioningUI.js"
Cohesion: 0.19
Nodes (16): clone(), compareVersions(), createProjectVersion(), transitionVersion(), compareLatest(), create(), persistVersions(), render() (+8 more)

### Community 32 - "DB y Autenticación"
Cohesion: 0.11
Nodes (19): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+11 more)

### Community 33 - "coordinator.mjs"
Cohesion: 0.12
Nodes (11): appendJsonl(), _initPaths(), _lsLoad(), _lsSave(), _MEM_ERRORS, _MEM_LOCKS, _MEM_SKILLS, _MEM_TASKS (+3 more)

### Community 35 - "Carga de Archivos Geo"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 36 - "📊 Resumen de Diagnósticos"
Cohesion: 0.12
Nodes (16): 1. admin.html - Panel de Administración, 2. fluxograma.html - Flujograma Interactivo, 3. geoconverter.html - Inspector CAD, Configuración (config.js), 🔍 Diagnóstico de Dependencias Externas, 🛠️ Ejecución de Diagnóstico, Estado (state.js), 📊 Estadísticas del Sistema (+8 more)

### Community 37 - "mapEngine.js"
Cohesion: 0.18
Nodes (17): 1) JSDoc mínimo en MapEngine, 2) Centralización de estados globales, 3) Evaluación de `central.html`, Resumen de cambios, loadTemplateFromLink(), saveToExcel(), clearTopologyErrors(), commitExternalGeometry() (+9 more)

### Community 38 - "1. Tablas y Estructura"
Cohesion: 0.12
Nodes (15): 1. Tablas y Estructura, 2. Índices de Rendimiento, 3. Contrato `dbAPI`, `admin_audit_log`, Esquema de Base de Datos SNC v3 (SQLite), `expedientes`, `ip_events`, `payments` (+7 more)

### Community 39 - "Community 14"
Cohesion: 0.17
Nodes (15): buildJson(), buildReadme(), CHECK, clean(), main(), OUT_DIR, parseFindings(), PHASE (+7 more)

### Community 40 - "DB y Autenticación"
Cohesion: 0.15
Nodes (11): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), stmts, block, end (+3 more)

### Community 41 - "workflow.test.mjs"
Cohesion: 0.14
Nodes (9): explodePolygonFeatures(), exploded, geojsonText, input, kml, official, officialFields, rows (+1 more)

### Community 42 - "Community 45"
Cohesion: 0.14
Nodes (14): 10. Notas importantes, 11. Estado del proyecto (2026-10-18), 1. Requisitos previos, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview, 7. Deploy a producción (+6 more)

### Community 43 - "Plan: Capa de Base de Datos Completa (SQLite + Firestore + Cache)"
Cohesion: 0.14
Nodes (13): Comandos de Verificación, Criterios de Cierre (Definition of Done), Esquema Objetivo (SQLite), Estado Actual (Resumen), Fase 0: Críticos (AHORA) — ~30 min, Fase 1: Esquema y Paridad (Sprint) — ~4h, Fase 2: Robustez (Sprint) — ~3h, Fase 3: Limpieza y Docs — ~1h (+5 more)

### Community 44 - "Catastro PY Pro v3.0 - SNC 551/2023"
Cohesion: 0.14
Nodes (14): 📋 Campos Obligatorios (14+2 según Anexo A Res. 551/2023), Catastro PY Pro v3.0 - SNC 551/2023, ✅ Checklist de Salud del Proyecto, ✅ Estado Final - Checklist Completado, 📂 Estructura del Proyecto, 🧪 Hallazgos de pruebas, 📜 Historial de Versiones, 🏁 Inicio Rápido (+6 more)

### Community 45 - "cli.mjs"
Cohesion: 0.14
Nodes (8): coord, __dirname, DOMAIN_ROUTES, __filename, handleFail(), handleStatus(), LAYERS, OUT

### Community 46 - "Auditoría 2026-10-18"
Cohesion: 0.15
Nodes (13): 10. Conclusión, 1. Resumen ejecutivo, 2. Inventario auditado, 3. Verificaciones ejecutadas (evidencia), 6. Hallazgos medios, 7. Hallazgos bajos, 8. Plan de remediación priorizado, 9. Anexo — Parches sugeridos (orientativos) (+5 more)

### Community 47 - "Auditoría 2026-10-18"
Cohesion: 0.15
Nodes (12): 5. Hallazgos altos, A-01 · `/api/usage/increment` responde 403 siempre, A-02 · Health check que siempre dice "ok", A-03 · Los usuarios con hash legacy no pueden iniciar sesión, A-04 · El primer usuario registrado se convierte en administrador, A-05 · Rate limiting inefectivo, A-06 · XSS almacenado en el checkout de pagos (y alcanzable por un admin vía IDOR), A-08 · Logs con datos sensibles y sin rotación (+4 more)

### Community 48 - "📊 Tabla Comparativa de Funcionalidades"
Cohesion: 0.15
Nodes (12): Catastro - copia/ (Duplicado - ELIMINAR), catastro index/ (Versiones antiguas - ELIMINAR), Catastrov2/ (Obsoleto - ELIMINAR), 📋 Detalle de Funcionalidades por Carpeta, ✅ Funcionalidades Activas (Mantenidas), ❌ Funcionalidades Descartadas (Eliminadas), ⚠️ Funcionalidades Eliminadas (Evaluación), Nueva carpeta/ (Duplicado - ELIMINAR) (+4 more)

### Community 49 - "Mapa y Capas Leaflet"
Cohesion: 0.32
Nodes (11): close(), featureLabel(), modal(), open(), run(), createLineageEvent(), getParcelId(), apply() (+3 more)

### Community 50 - "mapEngine.js"
Cohesion: 0.24
Nodes (11): assignNumberFromMap(), getPolygonFeatures(), loadGeoJSON(), renderParcelNumberLabels(), selectParcelByNumber(), showParcelInspector(), stopParcelNumberAssignment(), toggleParcelNumberAssignment() (+3 more)

### Community 51 - "Mapa y Capas Leaflet"
Cohesion: 0.24
Nodes (11): buildTopologyRepairPreview(), cleanGeometry(), cleanRing(), clone(), same(), @turf/turf, bowtie, overlapping (+3 more)

### Community 52 - "ValidadorMunicipal"
Cohesion: 0.23
Nodes (3): runMunicipalValidation(), ValidadorMunicipal, validadorMunicipalDefault

### Community 53 - "geometry-history.test.mjs"
Cohesion: 0.15
Nodes (11): proj4, first, geographic, history, initial, redo, roundTrip, second (+3 more)

### Community 54 - "api-security.test.mjs"
Cohesion: 0.15
Nodes (6): capped, clean1, clean2, deepState, filesWithLongUrl, invalidGeo

### Community 55 - "Community 37"
Cohesion: 0.17
Nodes (12): 1. Login y proyecto (Windows), 2. Gate pre-promoción + tests (WSL), 3. Preview (Windows), 4. Deploy a producción (Windows), 5. Verificación post-deploy, 6. Rollback, Deploy Windows + WSL — SNC_v3, Flujo ejecutivo (+4 more)

### Community 56 - "ValidadorMunicipal"
Cohesion: 0.24
Nodes (6): 2. Grafo de dominio, Aristas, Consulta rápida (python), Nodos, runMunicipalValidation(), ValidadorMunicipal

### Community 58 - "Mapa y Capas Leaflet"
Cohesion: 0.20
Nodes (6): DEPARTAMENTOS_PY, DISTRITOS_PY, _LAYERS_CACHE, validarClave(), validarDIST(), validarDPTO()

### Community 59 - "Community 42"
Cohesion: 0.26
Nodes (10): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+2 more)

### Community 60 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcrypt, better-sqlite3, docx, dotenv, express, firebase-admin, graphify (+4 more)

### Community 62 - "Community 41"
Cohesion: 0.18
Nodes (11): 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 2. Ciclo de Vida Obligatorio para Cada Tarea, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos, Paso 3: Adquirir el Lock (+3 more)

### Community 63 - "config.env.js"
Cohesion: 0.24
Nodes (5): ENV, askNVIDIA(), nvidiaClient, streamNVIDIA(), dotenv

### Community 64 - "Community 28"
Cohesion: 0.44
Nodes (10): BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail(), sendWelcomeEmail() (+2 more)

### Community 65 - "Graph Coordinator - Documentación de Uso"
Cohesion: 0.18
Nodes (10): 1. Locks - Evitar Solapamiento, 2. Error Registry - No Repetir Errores, 3. Skill Evolution - Mejoras Persistentes, 4. Patterns - Detección Automática, 5. Health Check, Archivos Generados, Flujo Recomendado de Trabajo, Graph Coordinator - Documentación de Uso (+2 more)

### Community 66 - "Auditoría y plan de remediación"
Cohesion: 0.22
Nodes (10): 0. Contexto obligatorio: auditoría abierta (2026-10-18), Reglas adicionales mientras la auditoría esté abierta, A-07 · Sanitización de HTML por regex y reporte "público" que exige login, C-05 · Tokens JWT forjables / sesiones no revocables, 1. Reglas para quien implemente, API, Backend, 🔒 Seguridad (+2 more)

### Community 67 - "Auditoría 2026-10-18"
Cohesion: 0.20
Nodes (8): 4. Hallazgos críticos, C-01 · Credenciales reales versionadas en Git, C-02 · Clave privada de Firebase Admin en el workspace, C-03 · El despliegue publica todo el repositorio, C-04 · IDOR multi-tenant en proyectos, expedientes, archivos y pagos, C-06 · Firestore roto + fallback silencioso a SQLite, C-07 · Endpoints core en 500: contrato `db.cjs` incompleto y `files_json` inexistente, C-08 · El webhook de pagos no puede validar la firma

### Community 68 - "Promoción SNC_v3 — Checklist"
Cohesion: 0.20
Nodes (10): 1. Criterios núcleo SNC 551/2023, 2. Cobertura funcional, 3. Pruebas y calidad, 4. Seguridad, 5. Deploy, 6. Documentación, 7. Items manuales / producción, 8. Aprobación (+2 more)

### Community 69 - "🧭 Supuestos CRS y Reproyección - Parser/Export"
Cohesion: 0.22
Nodes (9): 1. Principios generales, 2. Supuestos en `js/parser.js`, 3. Supuestos en `js/export.js`, 4. Supuestos en `js/validator.js`, 5. Matriz de responsabilidad CRS, 6. Trazabilidad y riesgos, 7. Cambios asociados, 🧭 Supuestos CRS y Reproyección - Parser/Export (+1 more)

### Community 70 - "Community 64"
Cohesion: 0.27
Nodes (5): redticketSign(), verifyRedTicketSignature(), verifyWebhook(), assertCondition(), runTests()

### Community 71 - "sanitize.js"
Cohesion: 0.20
Nodes (3): ALLOWED_ATTR, ALLOWED_TAGS, DOMPurify

### Community 74 - "Mapa y Capas Leaflet"
Cohesion: 0.31
Nodes (6): applyLineageEvent(), clone(), technicalId(), event, geojson, updated

### Community 75 - "rateLimit.js"
Cohesion: 0.33
Nodes (6): getClientIdentifier(), incrementWithTTL(), memoryStore, rateLimit(), sensitiveMemoryStore, sensitiveRateLimit()

### Community 76 - "Community 49"
Cohesion: 0.31
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 77 - "Community 52"
Cohesion: 0.22
Nodes (9): 🚀 Arranque rápido, 🔴 Bloqueantes conocidos (leer antes de desplegar), 📚 Documentación, 🗂️ Estructura, 🧠 Grafo del repositorio (`graphify-out/`), 🤖 Para agentes de IA, Scripts, SNC v3 — Catastro PY (Res. SNC N° 551/2023) (+1 more)

### Community 78 - "NVIDIAClient"
Cohesion: 0.28
Nodes (3): askNVIDIA(), NVIDIAClient, streamNVIDIA()

### Community 79 - "Community 73"
Cohesion: 0.25
Nodes (6): http, listenPort, server, targetPort, assertCondition(), runTests()

### Community 80 - "Plan de remediación"
Cohesion: 0.25
Nodes (8): 0. Estado, 2. Fase 0 — Contención (0-48 h, bloqueante de despliegue), 3. Fase 1 — Autorización y funcionalidad core (semana 1), 4. Fase 2 — Calidad, XSS y cadena de entrega (semanas 2-3), 5. Fase 3 — Endurecimiento y deuda (backlog), 6. Zonas congeladas hasta cerrar Fase 0, 7. Cómo retomar el trabajo, Plan de remediación — Auditoría 2026-10-18

### Community 81 - "🚧 Pendientes de Desarrollo"
Cohesion: 0.25
Nodes (8): 2. Botón de certificación con fondo de parcelas, 3. README actualizado con rutas nuevas, 4. README actualizado con migración JSON→SQLite, 5. README actualizado con variables de entorno, 6. README actualizado con seguridad, 7. Panel de gestión documentado, 8. Detalles menores de UI/docs, 🚧 Pendientes de Desarrollo

### Community 82 - "🔧 Variables de Entorno"
Cohesion: 0.25
Nodes (8): Administración, Autenticación, Catastro y Cache, Proyectos temporales, Proyectos y Expedientes, Uso y Pagos, Utilidades, 🔧 Variables de Entorno

### Community 83 - "mapEngine.js"
Cohesion: 0.39
Nodes (8): cancelVertexEdit(), clearProjectLayer(), clearVertexMarkers(), closeParcelInspector(), ensureKeyboardShortcuts(), redoGeometryEdit(), undoGeometryEdit(), updateHistoryControls()

### Community 84 - "espejo_auditoria_graphify.md"
Cohesion: 0.25
Nodes (7): 2026-10-18 - imp_1792361697889_6t3zepfm, 2026-10-18 - imp_1792361697998_ipv7002q, 2026-10-18 - imp_1792361698145_ybfinmul, 2026-10-18 - imp_1792361698275_q8itkdzq, 2026-10-18 - imp_1792361698379_sleq28k8, 2026-10-18 - imp_1792361698514_p7mxptx0, 2026-10-18 - imp_1792361698622_woclefft

### Community 85 - "grafo_completo.md"
Cohesion: 0.25
Nodes (7): 2026-10-18 - imp_1792362418967_9a0r4yqd, 2026-10-18 - imp_1792362419072_yueibjyo, 2026-10-18 - imp_1792362419162_ljvt8gvf, 2026-10-18 - imp_1792362419253_98m5hyod, 2026-10-18 - imp_1792362419349_uqs8torm, 2026-10-18 - imp_1792362419441_t36uoh0a, 2026-10-18 - imp_1792362419525_tvv39bfz

### Community 86 - "graphClient.mjs"
Cohesion: 0.29
Nodes (6): handleRoute(), getGraphClient(), _initGraphClient(), __dirname, __filename, GRAPH_PATH

### Community 87 - "ref_node_path"
Cohesion: 0.39
Nodes (3): genId(), readJson(), writeJson()

### Community 88 - "📊 Cobertura QA P3 - SNC_v3"
Cohesion: 0.29
Nodes (6): Acciones pendientes, Cobertura actual estimada, 📊 Cobertura QA P3 - SNC_v3, Objetivo, Supuestos y alcance, Umbrales fijados

### Community 89 - "📁 Descripción de Archivos"
Cohesion: 0.29
Nodes (7): Archivos Principales (HTML), Datos (data/), 📁 Descripción de Archivos, Documentación (docs/), Estilos (css/), Módulos JavaScript (js/), Tests (tests/)

### Community 90 - "Mapa y Capas Leaflet"
Cohesion: 0.43
Nodes (4): booleanResult(), ensureFeature(), executeGeoprocessing(), geojson

### Community 91 - "indexar_auditoria_grafo.md"
Cohesion: 0.29
Nodes (6): 2026-10-18 - imp_1792361978615_cdbg8xgy, 2026-10-18 - imp_1792361978856_pzuwhpo0, 2026-10-18 - imp_1792361979506_44suukjx, 2026-10-18 - imp_1792361979631_s81v29x2, 2026-10-18 - imp_1792361979705_vx219571, 2026-10-18 - imp_1792361979835_qgm8mt2w

### Community 92 - "2. Checklist Pre-Deploy"
Cohesion: 0.33
Nodes (6): 2. Checklist Pre-Deploy, Backend y entorno, Configuración y secretos, Código y calidad, Datos y hosting, Seguridad (Fase 2 verificada)

### Community 93 - "generateConsultaDescriptivaPDF()"
Cohesion: 0.33
Nodes (6): 🗂️ 3. QUÉ SE HIZO CON LOS ARCHIVOS, B. TRANSFORMACIONES APLICADAS, C. ARCHIVOS DE SALIDA GENERADOS, 1. Certificación PDF completa, 🚀 Estado del Proyecto, generateConsultaDescriptivaPDF()

### Community 94 - "Community 69"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 95 - "mapEngine.js"
Cohesion: 0.47
Nodes (6): assertMapDependencies(), checkMapDependencies(), focusWorkPolygon(), init(), invalidateSize(), restoreStartupView()

### Community 96 - "payment.js"
Cohesion: 0.33
Nodes (5): express, { logger }, router, users, express

### Community 97 - "documentar_auditoria.md"
Cohesion: 0.33
Nodes (5): 2026-10-18 - imp_1792361399688_esel27pj, 2026-10-18 - imp_1792361399793_c91fa2qt, 2026-10-18 - imp_1792361399887_08fizuws, 2026-10-18 - imp_1792361400018_p94tvm5k, 2026-10-18 - imp_1792361400156_psgiog42

### Community 98 - "guard_graph_refresh.md"
Cohesion: 0.33
Nodes (5): 2026-10-18 - imp_1792362097704_7uhlkuu6, 2026-10-18 - imp_1792362097778_u8fc7x14, 2026-10-18 - imp_1792362097836_rlbd4ibu, 2026-10-18 - imp_1792362097910_s5dk5un8, 2026-10-18 - imp_1792362097974_jih2rzi4

### Community 99 - "🏁 Guía de Promoción a Producción"
Cohesion: 0.40
Nodes (5): Criterios mínimos de promoción, Flujo recomendado, 🏁 Guía de Promoción a Producción, Mantenimiento recomendado, Rollback

### Community 100 - "🏁 Guía de Promoción a Producción"
Cohesion: 0.40
Nodes (5): Criterios mínimos de promoción, Flujo recomendado, 🏁 Guía de Promoción a Producción, Mantenimiento recomendado, Rollback

### Community 101 - "Community 77"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

### Community 102 - "Changelog - Security"
Cohesion: 0.40
Nodes (4): 2026-10-18 - imp_20261018_municipal_postgis, 2026-10-18 - imp_20261018_repo_hygiene, 2026-10-18 - imp_20261018_security_secrets, Changelog - Security

### Community 104 - "Mejoras P3 Frontend SNC_v3"
Cohesion: 0.50
Nodes (3): Archivos evaluados para remover, Archivos modificados, Mejoras P3 Frontend SNC_v3

### Community 106 - "grafo_graphify_out.md"
Cohesion: 0.50
Nodes (3): 2026-10-18 - imp_1792361579215_lvkle3b2, 2026-10-18 - imp_1792361579280_fxyi8m5x, 2026-10-18 - imp_1792361579364_4g14d6bi

### Community 107 - "Changelog - Repo Hygiene"
Cohesion: 0.50
Nodes (3): 2026-10-18 - imp_20261018_repo_hygiene, 2026-10-18 - imp_20261018_security_secrets, Changelog - Repo Hygiene

### Community 108 - "dependencies"
Cohesion: 0.50
Nodes (3): dependencies, @opencode-ai/plugin, @opencode-ai/plugin

### Community 110 - "👥 Panel de Gestión (`members.html`)"
Cohesion: 0.67
Nodes (3): Acceso, Migración JSON → SQLite, 👥 Panel de Gestión (`members.html`)

### Community 111 - "📦 Exportación y Certificación"
Cohesion: 0.67
Nodes (3): Archivos generados:, 📦 Exportación y Certificación, Flujo de certificación (según Anexo B):

### Community 112 - "🛠️ Tecnologías"
Cohesion: 0.67
Nodes (3): Backend / API, Frontend, 🛠️ Tecnologías

### Community 113 - "📋 Notas de Origen y Versiones"
Cohesion: 0.67
Nodes (3): Base del Proyecto, Módulos JS, 📋 Notas de Origen y Versiones

### Community 114 - "🔄 Compatibilidad de Formatos"
Cohesion: 0.67
Nodes (3): 🔄 Compatibilidad de Formatos, Entrada (Parsers) - Resolución Art. 14, Salida (Exportadores) - Anexo B Res. 551/2023

### Community 122 - "validarCierreAnillos()"
Cohesion: 0.67
Nodes (3): formatCoordinate(), validarCierreAnillos(), validarGeometria()

## Knowledge Gaps
- **16 isolated node(s):** `dxf-parser`, `eslint`, `graphify`, `husky`, `jszip` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1033 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `index.js` to `Community 28`, `payment.js`, `Exportación y Certificados`, `Community 77`, `attributeEditor.js`, `backup_complement.js`, `export.js`, `parser.js`, `dataTable.js`, `labelEngine.js`, `mapEngine.js`, `attributeTableUI.js`, `server-api.js`, `mapLegend.js`, `validator.js`, `Mapa y Capas Leaflet`, `utils.js`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `dxf-parser`, `eslint`, `graphify` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `coordinator-mem.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.058385093167701865 - nodes in this community are weakly interconnected._
- **Why does `showToast()` connect `mapEngine.js` to `Exportación y Certificados`, `export.js`, `parser.js`, `StateManager`, `dataTable.js`, `mapEngine.js`, `attributeTableUI.js`, `Mapa y Capas Leaflet`, `mapEngine.js`, `mapEngine.js`, `utils.js`, `validator.js`, `index.js`, `Mapa y Capas Leaflet`, `versioningUI.js`, `generateConsultaDescriptivaPDF()`, `mapEngine.js`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `crs.js` be split into smaller, more focused modules?**
  _Cohesion score 0.051560379918588875 - nodes in this community are weakly interconnected._
- **Why does `generateConsultaDescriptivaPDF()` connect `generateConsultaDescriptivaPDF()` to `export.js`, `mapEngine.js`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Should `AttributeTableClass` be split into smaller, more focused modules?**
  _Cohesion score 0.06604324956165984 - nodes in this community are weakly interconnected._