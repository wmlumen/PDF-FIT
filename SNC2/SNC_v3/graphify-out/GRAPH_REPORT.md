# Graph Report - SNC_v3  (2026-10-18)

## Corpus Check
- modo incremental — el corpus no se re-escaneó; se parte del grafo existente y se agregan archivos

## Summary
- 1409 nodes · 2175 edges · 136 communities (90 shown, 46 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92cf603`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tests Validator
- Exportación y Certificados
- Community 5
- Tests Export
- Estado y Persistencia
- Mapa y Capas Leaflet
- Carga de Archivos Geo
- Estado y Persistencia
- Exportación y Certificados
- Mapa y Capas Leaflet
- DB y Autenticación
- Versionado y Municipal
- Community 14
- Utilidades y Geometría
- Versionado y Municipal
- Rate Limiting y Seguridad
- Tests Export
- Community 45
- Mapa y Capas Leaflet
- Estado y Persistencia
- DB y Autenticación
- Versionado y Municipal
- DB y Autenticación
- Mapa y Capas Leaflet
- Orquestador Multi-IA
- DB y Autenticación
- Carga de Archivos Geo
- Catastro Cache
- DB y Autenticación
- Estado y Persistencia
- Exportación y Certificados
- Mapa y Capas Leaflet
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 63
- Community 33
- DB y Autenticación
- Community 34
- Community 35
- Community 36
- Community 37
- Community 59
- Mapa y Capas Leaflet
- Mapa y Capas Leaflet
- Community 42
- Community 38
- Community 39
- Community 40
- Community 41
- Community 43
- Community 44
- Community 60
- Mapa y Capas Leaflet
- Community 47
- Mapa y Capas Leaflet
- Community 46
- Mapa y Capas Leaflet
- Mapa y Capas Leaflet
- Community 57
- Community 49
- Community 50
- Community 51
- Community 52
- Community 54
- Community 55
- Community 56
- Community 48
- Community 58
- grafo_completo.md
- Community 61
- Community 62
- Community 64
- Community 65
- Community 67
- Community 68
- Community 69
- Mapa y Capas Leaflet
- Community 71
- Community 72
- Community 73
- Community 75
- Community 76
- Community 77
- Community 78
- Estado y Persistencia
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- grafo_completo_final.md
- Community 92
- Community 93
- Community 94
- Community 95
- repair_topology.md
- runtime_mismatch_isolation.md
- probe_free_models.sh
- backup_sqlite.sh script
- promotion_gate.sh
- restore_sqlite.sh
- rotate_legacy_hashes.sh script
- start-server.sh script
- simulateValidarProyeccion()

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 69 edges
2. `compilerOptions` - 37 edges
3. `StateManager` - 26 edges
4. `Catastro PY Pro v3.0 - SNC 551/2023` - 26 edges
5. `GraphCoordinator` - 25 edges
6. `runValidation()` - 21 edges
7. `GraphClient` - 20 edges
8. `scripts` - 19 edges
9. `handleGeoFile()` - 17 edges
10. `logger` - 17 edges

## Surprising Connections (you probably didn't know these)
- `6. Hallazgos medios` --references--> `resolvePlan()`  [INFERRED]
  docs/AUDITORIA_SNC_v3_2026-10-18.md → js/plans.js
- `1) JSDoc mínimo en MapEngine` --references--> `loadGeoJSON()`  [INFERRED]
  docs/frontend-p3-improvements.md → js/mapEngine.js
- `1) JSDoc mínimo en MapEngine` --references--> `toggleSNCReferenceLayer()`  [INFERRED]
  docs/frontend-p3-improvements.md → js/mapEngine.js
- `God Nodes (más conectados)` --references--> `showToast()`  [INFERRED]
  GRAFOS.md → js/utils.js
- `1. Certificación PDF completa` --references--> `generateConsultaDescriptivaPDF()`  [INFERRED]
  docs/README.md → js/export.js

## Import Cycles
- 2-file cycle: `.opencode/coordination/coordinator.mjs -> .opencode/coordination/orchestrator.mjs -> .opencode/coordination/coordinator.mjs`

## Communities (136 total, 46 thin omitted)

### Community 0 - "Tests Validator"
Cohesion: 0.04
Nodes (40): areaFail, areaOkUrbanoFeature, areaOkUrbanoGeom, calculatedArea, CAMPOS_REQUERIDOS, completoUrbano, exportCheckBadProj, exportCheckMissing (+32 more)

### Community 1 - "Exportación y Certificados"
Cohesion: 0.09
Nodes (35): 🗂️ 3. QUÉ SE HIZO CON LOS ARCHIVOS, B. TRANSFORMACIONES APLICADAS, C. ARCHIVOS DE SALIDA GENERADOS, 1. Certificación PDF completa, 🚀 Estado del Proyecto, buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps() (+27 more)

### Community 2 - "Community 5"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 3 - "Tests Export"
Cohesion: 0.05
Nodes (39): 📊 1. QUÉ VALIDA EL SISTEMA (8 CRITERIOS SNC 551/2023), 📄 2. ESTRUCTURA DEL INFORME DE VALIDACIÓN, ✅ 4.1 CAMPOS OBLIGATORIOS (Art. 8 de la Res.), ✅ 4.2 TOLERANCIA DE ÁREA (Art. 12 de la Res.), ✅ 4.3 PROYECCIÓN CARTOGRÁFICA (Art. 15 de la Res.), ✅ 4.4 TOPOLOGÍA (Art. 18 de la Res.), ✅ 4.5 ESTRUCTURA DE ARCHIVOS (Art. 20 de la Res.), ✅ 4.6 CERTIFICACIÓN (Anexo B de la Res.) (+31 more)

### Community 4 - "Estado y Persistencia"
Cohesion: 0.10
Nodes (10): 4) Deuda técnica frontend y recomendaciones de bundling, Deuda técnica relevante, Recomendaciones de bundling, 1. Grafo tree-sitter (graphify), Comunidades (56, etiquetadas en español), Estado, God Nodes (más conectados), Grafos de SNC_v3 (+2 more)

### Community 5 - "Mapa y Capas Leaflet"
Cohesion: 0.12
Nodes (19): addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData, deleteRow(), editRow() (+11 more)

### Community 6 - "Carga de Archivos Geo"
Cohesion: 0.14
Nodes (27): A. ARCHIVOS DE ENTRADA ACEPTADOS, detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile(), handleFiles() (+19 more)

### Community 7 - "Estado y Persistencia"
Cohesion: 0.08
Nodes (18): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+10 more)

### Community 8 - "Exportación y Certificados"
Cohesion: 0.07
Nodes (18): CAMPOS_REQUERIDOS, certInvalid, certOk, downloads, expBad, expMissing, expOk, generateShapefile() (+10 more)

### Community 9 - "Mapa y Capas Leaflet"
Cohesion: 0.14
Nodes (21): LayerGuard, assertMapDependencies(), captureCertificateMapImages(), checkMapDependencies(), convertPointsToPolygon(), focusWorkPolygon(), geometryHistory, getPolygonVertices() (+13 more)

### Community 10 - "DB y Autenticación"
Cohesion: 0.09
Nodes (21): bcrypt, db, DB_PATH, dbAPI, DB_LOG, { existsSync, mkdirSync, appendFileSync }, expedientes, { join } (+13 more)

### Community 11 - "Versionado y Municipal"
Cohesion: 0.12
Nodes (20): CAMPOS_RURALES, CAMPOS_URBANOS, CONFIG_MUNICIPAL, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAP_CONFIG, MAX_VERTICES_BEFORE_SIMPLIFY (+12 more)

### Community 12 - "Community 14"
Cohesion: 0.11
Nodes (21): Acciones pendientes, Cobertura actual estimada, 📊 Cobertura QA P3 - SNC_v3, Objetivo, Supuestos y alcance, Umbrales fijados, buildJson(), buildReadme() (+13 more)

### Community 13 - "Utilidades y Geometría"
Cohesion: 0.17
Nodes (20): calcularMetricasPlanasUTM(), isNumeric(), formatCoordinate(), normalizarNombreTerritorial(), obtenerCodigo(), runExportValidation(), runValidation(), validarArchivosPresentes() (+12 more)

### Community 14 - "Versionado y Municipal"
Cohesion: 0.09
Nodes (21): name, private, type, version, dxf-parser, eslint, graphify, husky (+13 more)

### Community 15 - "Rate Limiting y Seguridad"
Cohesion: 0.10
Nodes (20): CRIT-001: `serviceAccountKey.json` hardcodeado en código, CRIT-002: `JWT_SECRET` expuesto en `config.env.js`, Criterios de Cierre Global (Definition of Done), Fase 0 — Bloqueantes (AHORA) — **~45 min**, Fase 1 — Alta Prioridad (Sprint actual) — **~10h**, Fase 2 — Media (Próximo sprint) — **~8h**, Fase 3 — Baja (Backlog) — **~6h**, Hallazgos ALTOS (+12 more)

### Community 16 - "Tests Export"
Cohesion: 0.10
Nodes (20): Archivos Principales, 📅 Auditorías Programadas, 🔧 Checklist de Componentes, 🧩 Checklist de Funcionalidad, 🚨 Checklist de Problemas Conocidos, 🧪 Checklist de Tests, 📋 Checklist de Validación (Pre-Exportación), Criterios de Validación (Res. SNC 551/2023) (+12 more)

### Community 17 - "Community 45"
Cohesion: 0.10
Nodes (20): 10. Notas importantes, 11. Estado del proyecto (2026-10-18), 1. Requisitos previos, 2. Checklist Pre-Deploy, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview (+12 more)

### Community 18 - "Mapa y Capas Leaflet"
Cohesion: 0.19
Nodes (16): buildCogoRing(), normalizeAzimuth(), parseBearing(), parseCogoCourses(), toDegrees(), toRadians(), validateCourse(), close() (+8 more)

### Community 19 - "Estado y Persistencia"
Cohesion: 0.16
Nodes (10): Diagnostic, App, CAMPOS_REQUERIDOS, escapeHtml(), renderLineage(), logger, localStoragePolyfill, State (+2 more)

### Community 20 - "DB y Autenticación"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 21 - "Versionado y Municipal"
Cohesion: 0.19
Nodes (16): clone(), compareVersions(), createProjectVersion(), transitionVersion(), compareLatest(), create(), persistVersions(), render() (+8 more)

### Community 22 - "DB y Autenticación"
Cohesion: 0.11
Nodes (19): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+11 more)

### Community 23 - "Mapa y Capas Leaflet"
Cohesion: 0.16
Nodes (17): 1) JSDoc mínimo en MapEngine, 2) Centralización de estados globales, 3) Evaluación de `central.html`, Resumen de cambios, loadTemplateFromLink(), saveToExcel(), clearTopologyErrors(), commitExternalGeometry() (+9 more)

### Community 24 - "Orquestador Multi-IA"
Cohesion: 0.22
Nodes (6): handleCheck(), handleLock(), handleUnlock(), GraphCoordinator, readJsonl(), safeWriteFileSync()

### Community 26 - "Carga de Archivos Geo"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 27 - "Catastro Cache"
Cohesion: 0.20
Nodes (16): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+8 more)

### Community 28 - "DB y Autenticación"
Cohesion: 0.15
Nodes (12): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), runJsonMigration(), stmts, block (+4 more)

### Community 29 - "Estado y Persistencia"
Cohesion: 0.12
Nodes (16): 1. admin.html - Panel de Administración, 2. fluxograma.html - Flujograma Interactivo, 3. geoconverter.html - Inspector CAD, Configuración (config.js), 🔍 Diagnóstico de Dependencias Externas, 🛠️ Ejecución de Diagnóstico, Estado (state.js), 📊 Estadísticas del Sistema (+8 more)

### Community 30 - "Exportación y Certificados"
Cohesion: 0.14
Nodes (9): explodePolygonFeatures(), exploded, geojsonText, input, kml, official, officialFields, rows (+1 more)

### Community 31 - "Mapa y Capas Leaflet"
Cohesion: 0.21
Nodes (13): assignNumberFromMap(), clearVertexMarkers(), closeParcelInspector(), getPolygonFeatures(), loadGeoJSON(), renderParcelNumberLabels(), selectParcelByNumber(), showParcelInspector() (+5 more)

### Community 32 - "Community 28"
Cohesion: 0.31
Nodes (12): ENV, BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail() (+4 more)

### Community 33 - "Community 29"
Cohesion: 0.14
Nodes (13): Comandos de Verificación, Criterios de Cierre (Definition of Done), Esquema Objetivo (SQLite), Estado Actual (Resumen), Fase 0: Críticos (AHORA) — ~30 min, Fase 1: Esquema y Paridad (Sprint) — ~4h, Fase 2: Robustez (Sprint) — ~3h, Fase 3: Limpieza y Docs — ~1h (+5 more)

### Community 34 - "Community 30"
Cohesion: 0.14
Nodes (14): 📋 Campos Obligatorios (14+2 según Anexo A Res. 551/2023), Catastro PY Pro v3.0 - SNC 551/2023, ✅ Checklist de Salud del Proyecto, ✅ Estado Final - Checklist Completado, 📂 Estructura del Proyecto, 🧪 Hallazgos de pruebas, 📜 Historial de Versiones, 🏁 Inicio Rápido (+6 more)

### Community 35 - "Community 31"
Cohesion: 0.15
Nodes (12): 5. Hallazgos altos, A-01 · `/api/usage/increment` responde 403 siempre, A-02 · Health check que siempre dice "ok", A-03 · Los usuarios con hash legacy no pueden iniciar sesión, A-04 · El primer usuario registrado se convierte en administrador, A-05 · Rate limiting inefectivo, A-06 · XSS almacenado en el checkout de pagos (y alcanzable por un admin vía IDOR), A-08 · Logs con datos sensibles y sin rotación (+4 more)

### Community 36 - "Community 32"
Cohesion: 0.22
Nodes (7): 2. Grafo de dominio, Aristas, Consulta rápida (python), Nodos, Nodos de fixes (trazabilidad de auditoría), runMunicipalValidation(), ValidadorMunicipal

### Community 37 - "Community 63"
Cohesion: 0.32
Nodes (11): close(), featureLabel(), modal(), open(), run(), createLineageEvent(), getParcelId(), apply() (+3 more)

### Community 38 - "Community 33"
Cohesion: 0.21
Nodes (6): handleFail(), handlePass(), appendJsonl(), genId(), readJson(), writeJson()

### Community 39 - "DB y Autenticación"
Cohesion: 0.17
Nodes (8): __dirname, __filename, LOCAL_DOMAIN, LOCAL_GRAPH, ROOT_DOMAIN, ROOT_GRAPH, vite, @vitejs/plugin-legacy

### Community 41 - "Community 35"
Cohesion: 0.15
Nodes (11): proj4, first, geographic, history, initial, redo, roundTrip, second (+3 more)

### Community 42 - "Community 36"
Cohesion: 0.15
Nodes (6): capped, clean1, clean2, deepState, filesWithLongUrl, invalidGeo

### Community 43 - "Community 37"
Cohesion: 0.17
Nodes (12): 1. Login y proyecto (Windows), 2. Gate pre-promoción + tests (WSL), 3. Preview (Windows), 4. Deploy a producción (Windows), 5. Verificación post-deploy, 6. Rollback, Deploy Windows + WSL — SNC_v3, Flujo ejecutivo (+4 more)

### Community 44 - "Community 59"
Cohesion: 0.17
Nodes (12): 10. Conclusión, 1. Resumen ejecutivo, 2. Inventario auditado, 3. Verificaciones ejecutadas (evidencia), 6. Hallazgos medios, 8. Plan de remediación priorizado, 9. Anexo — Parches sugeridos (orientativos), Auditoría técnica — SNC_v3 (Catastro PY / Res. SNC 551/2023) (+4 more)

### Community 45 - "Mapa y Capas Leaflet"
Cohesion: 0.27
Nodes (12): cancelVertexEdit(), clearProjectLayer(), commitVertexEdit(), ensureKeyboardShortcuts(), onVertexEditMapClick(), redoGeometryEdit(), startVertexEdit(), toggleVertexEdit() (+4 more)

### Community 46 - "Mapa y Capas Leaflet"
Cohesion: 0.20
Nodes (6): DEPARTAMENTOS_PY, DISTRITOS_PY, _LAYERS_CACHE, validarClave(), validarDIST(), validarDPTO()

### Community 47 - "Community 42"
Cohesion: 0.26
Nodes (10): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), PLANS, resolvePlan() (+2 more)

### Community 48 - "Community 38"
Cohesion: 0.27
Nodes (10): buildTopologyRepairPreview(), cleanGeometry(), cleanRing(), clone(), same(), bowtie, overlapping, remainingOverlap (+2 more)

### Community 49 - "Community 39"
Cohesion: 0.17
Nodes (9): CHANGELOG_DIR, __dirname, ERRORS_FILE, __filename, LOCKS_FILE, SKILLS_FILE, TASKS_FILE, gc (+1 more)

### Community 50 - "Community 40"
Cohesion: 0.17
Nodes (12): dependencies, bcrypt, better-sqlite3, docx, dotenv, express, firebase-admin, graphify (+4 more)

### Community 51 - "Community 41"
Cohesion: 0.18
Nodes (11): 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 2. Ciclo de Vida Obligatorio para Cada Tarea, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos, Paso 3: Adquirir el Lock (+3 more)

### Community 52 - "Community 43"
Cohesion: 0.18
Nodes (10): 1. Locks - Evitar Solapamiento, 2. Error Registry - No Repetir Errores, 3. Skill Evolution - Mejoras Persistentes, 4. Patterns - Detección Automática, 5. Health Check, Archivos Generados, Flujo Recomendado de Trabajo, Graph Coordinator - Documentación de Uso (+2 more)

### Community 53 - "Community 44"
Cohesion: 0.22
Nodes (10): 0. Contexto obligatorio: auditoría abierta (2026-10-18), Reglas adicionales mientras la auditoría esté abierta, A-07 · Sanitización de HTML por regex y reporte "público" que exige login, C-05 · Tokens JWT forjables / sesiones no revocables, 1. Reglas para quien implemente, API, Backend, 🔒 Seguridad (+2 more)

### Community 54 - "Community 60"
Cohesion: 0.20
Nodes (8): 4. Hallazgos críticos, C-01 · Credenciales reales versionadas en Git, C-02 · Clave privada de Firebase Admin en el workspace, C-03 · El despliegue publica todo el repositorio, C-04 · IDOR multi-tenant en proyectos, expedientes, archivos y pagos, C-06 · Firestore roto + fallback silencioso a SQLite, C-07 · Endpoints core en 500: contrato `db.cjs` incompleto y `files_json` inexistente, C-08 · El webhook de pagos no puede validar la firma

### Community 55 - "Mapa y Capas Leaflet"
Cohesion: 0.20
Nodes (10): 1. Criterios núcleo SNC 551/2023, 2. Cobertura funcional, 3. Pruebas y calidad, 4. Seguridad, 5. Deploy, 6. Documentación, 7. Items manuales / producción, 8. Aprobación (+2 more)

### Community 56 - "Community 47"
Cohesion: 0.22
Nodes (9): 1. Principios generales, 2. Supuestos en `js/parser.js`, 3. Supuestos en `js/export.js`, 4. Supuestos en `js/validator.js`, 5. Matriz de responsabilidad CRS, 6. Trazabilidad y riesgos, 7. Cambios asociados, 🧭 Supuestos CRS y Reproyección - Parser/Export (+1 more)

### Community 57 - "Mapa y Capas Leaflet"
Cohesion: 0.33
Nodes (10): addDraftVertex(), deleteDraftVertex(), findSnapCoordinate(), getEditableVertexRefs(), getGeometrySegments(), getRingByPath(), getSnapToleranceMeters(), moveCoincidentVertices() (+2 more)

### Community 58 - "Community 46"
Cohesion: 0.22
Nodes (7): coord, __dirname, DOMAIN_ROUTES, __filename, handleRoute(), handleStatus(), getGraphClient()

### Community 61 - "Community 57"
Cohesion: 0.31
Nodes (6): applyLineageEvent(), clone(), technicalId(), event, geojson, updated

### Community 62 - "Community 49"
Cohesion: 0.31
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 63 - "Community 50"
Cohesion: 0.28
Nodes (7): CPU_THRESHOLD, DEFAULT_SWARM_CONFIG, getBrowserResources(), getResources(), getSystemResources(), MAX_CONCURRENT_AGENTS, MEMORY_THRESHOLD

### Community 65 - "Community 52"
Cohesion: 0.22
Nodes (9): 🚀 Arranque rápido, 🔴 Bloqueantes conocidos (leer antes de desplegar), 📚 Documentación, 🗂️ Estructura, 🧠 Grafo del repositorio (`graphify-out/`), 🤖 Para agentes de IA, Scripts, SNC v3 — Catastro PY (Res. SNC N° 551/2023) (+1 more)

### Community 67 - "Community 54"
Cohesion: 0.25
Nodes (8): 0. Estado, 2. Fase 0 — Contención (0-48 h, bloqueante de despliegue), 3. Fase 1 — Autorización y funcionalidad core (semana 1), 4. Fase 2 — Calidad, XSS y cadena de entrega (semanas 2-3), 5. Fase 3 — Endurecimiento y deuda (backlog), 6. Zonas congeladas hasta cerrar Fase 0, 7. Cómo retomar el trabajo, Plan de remediación — Auditoría 2026-10-18

### Community 68 - "Community 55"
Cohesion: 0.25
Nodes (8): 2. Botón de certificación con fondo de parcelas, 3. README actualizado con rutas nuevas, 4. README actualizado con migración JSON→SQLite, 5. README actualizado con variables de entorno, 6. README actualizado con seguridad, 7. Panel de gestión documentado, 8. Detalles menores de UI/docs, 🚧 Pendientes de Desarrollo

### Community 69 - "Community 56"
Cohesion: 0.25
Nodes (8): Administración, Autenticación, Catastro y Cache, Proyectos temporales, Proyectos y Expedientes, Uso y Pagos, Utilidades, 🔧 Variables de Entorno

### Community 70 - "Community 48"
Cohesion: 0.36
Nodes (5): booleanResult(), ensureFeature(), executeGeoprocessing(), @turf/turf, geojson

### Community 71 - "Community 58"
Cohesion: 0.25
Nodes (7): 2026-10-18 - imp_1792361697889_6t3zepfm, 2026-10-18 - imp_1792361697998_ipv7002q, 2026-10-18 - imp_1792361698145_ybfinmul, 2026-10-18 - imp_1792361698275_q8itkdzq, 2026-10-18 - imp_1792361698379_sleq28k8, 2026-10-18 - imp_1792361698514_p7mxptx0, 2026-10-18 - imp_1792361698622_woclefft

### Community 72 - "grafo_completo.md"
Cohesion: 0.25
Nodes (7): 2026-10-18 - imp_1792362418967_9a0r4yqd, 2026-10-18 - imp_1792362419072_yueibjyo, 2026-10-18 - imp_1792362419162_ljvt8gvf, 2026-10-18 - imp_1792362419253_98m5hyod, 2026-10-18 - imp_1792362419349_uqs8torm, 2026-10-18 - imp_1792362419441_t36uoh0a, 2026-10-18 - imp_1792362419525_tvv39bfz

### Community 73 - "Community 61"
Cohesion: 0.29
Nodes (6): ✅ Funcionalidades Activas (Mantenidas), ❌ Funcionalidades Descartadas (Eliminadas), ⚠️ Funcionalidades Eliminadas (Evaluación), 🎯 Recomendaciones, 📊 Resumen de Clasificación, 📊 Tabla Comparativa de Funcionalidades

### Community 74 - "Community 62"
Cohesion: 0.29
Nodes (7): Archivos Principales (HTML), Datos (data/), 📁 Descripción de Archivos, Documentación (docs/), Estilos (css/), Módulos JavaScript (js/), Tests (tests/)

### Community 75 - "Community 64"
Cohesion: 0.38
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 76 - "Community 65"
Cohesion: 0.29
Nodes (6): 2026-10-18 - imp_1792361978615_cdbg8xgy, 2026-10-18 - imp_1792361978856_pzuwhpo0, 2026-10-18 - imp_1792361979506_44suukjx, 2026-10-18 - imp_1792361979631_s81v29x2, 2026-10-18 - imp_1792361979705_vx219571, 2026-10-18 - imp_1792361979835_qgm8mt2w

### Community 77 - "Community 67"
Cohesion: 0.33
Nodes (6): Catastro - copia/ (Duplicado - ELIMINAR), catastro index/ (Versiones antiguas - ELIMINAR), Catastrov2/ (Obsoleto - ELIMINAR), 📋 Detalle de Funcionalidades por Carpeta, Nueva carpeta/ (Duplicado - ELIMINAR), Proyectos/catastro_js/ (Versión funcional - ORIGEN)

### Community 79 - "Community 69"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 80 - "Mapa y Capas Leaflet"
Cohesion: 0.33
Nodes (5): express, { logger }, router, users, express

### Community 81 - "Community 71"
Cohesion: 0.33
Nodes (5): 2026-10-18 - imp_1792361399688_esel27pj, 2026-10-18 - imp_1792361399793_c91fa2qt, 2026-10-18 - imp_1792361399887_08fizuws, 2026-10-18 - imp_1792361400018_p94tvm5k, 2026-10-18 - imp_1792361400156_psgiog42

### Community 82 - "Community 72"
Cohesion: 0.33
Nodes (5): 2026-10-18 - imp_1792362097704_7uhlkuu6, 2026-10-18 - imp_1792362097778_u8fc7x14, 2026-10-18 - imp_1792362097836_rlbd4ibu, 2026-10-18 - imp_1792362097910_s5dk5un8, 2026-10-18 - imp_1792362097974_jih2rzi4

### Community 83 - "Community 73"
Cohesion: 0.33
Nodes (4): http, listenPort, server, targetPort

### Community 84 - "Community 75"
Cohesion: 0.40
Nodes (5): Criterios mínimos de promoción, Flujo recomendado, 🏁 Guía de Promoción a Producción, Mantenimiento recomendado, Rollback

### Community 85 - "Community 76"
Cohesion: 0.40
Nodes (5): Criterios mínimos de promoción, Flujo recomendado, 🏁 Guía de Promoción a Producción, Mantenimiento recomendado, Rollback

### Community 86 - "Community 77"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

### Community 87 - "Community 78"
Cohesion: 0.40
Nodes (4): 2026-10-18 - imp_20261018_municipal_postgis, 2026-10-18 - imp_20261018_repo_hygiene, 2026-10-18 - imp_20261018_security_secrets, Changelog - Security

### Community 89 - "Estado y Persistencia"
Cohesion: 0.50
Nodes (3): Archivos evaluados para remover, Archivos modificados, Mejoras P3 Frontend SNC_v3

### Community 90 - "Community 82"
Cohesion: 0.50
Nodes (3): 2026-10-18 - imp_1792361579215_lvkle3b2, 2026-10-18 - imp_1792361579280_fxyi8m5x, 2026-10-18 - imp_1792361579364_4g14d6bi

### Community 91 - "Community 83"
Cohesion: 0.50
Nodes (3): 2026-10-18 - imp_20261018_repo_hygiene, 2026-10-18 - imp_20261018_security_secrets, Changelog - Repo Hygiene

### Community 93 - "Community 85"
Cohesion: 0.67
Nodes (3): Acceso, Migración JSON → SQLite, 👥 Panel de Gestión (`members.html`)

### Community 94 - "Community 86"
Cohesion: 0.67
Nodes (3): Archivos generados:, 📦 Exportación y Certificación, Flujo de certificación (según Anexo B):

### Community 95 - "Community 87"
Cohesion: 0.67
Nodes (3): Backend / API, Frontend, 🛠️ Tecnologías

### Community 96 - "Community 88"
Cohesion: 0.67
Nodes (3): Base del Proyecto, Módulos JS, 📋 Notas de Origen y Versiones

### Community 97 - "Community 89"
Cohesion: 0.67
Nodes (3): 🔄 Compatibilidad de Formatos, Entrada (Parsers) - Resolución Art. 14, Salida (Exportadores) - Anexo B Res. 551/2023

### Community 104 - "Community 95"
Cohesion: 0.67
Nodes (3): formatCoordinate(), validarCierreAnillos(), validarGeometria()

## Knowledge Gaps
- **15 isolated node(s):** `dxf-parser`, `eslint`, `graphify`, `husky`, `jszip` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 801 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **46 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `logger` connect `Estado y Persistencia` to `Community 28`, `Exportación y Certificados`, `Mapa y Capas Leaflet`, `Carga de Archivos Geo`, `Estado y Persistencia`, `Mapa y Capas Leaflet`, `Versionado y Municipal`, `Utilidades y Geometría`, `Mapa y Capas Leaflet`, `Mapa y Capas Leaflet`, `Community 77`, `Mapa y Capas Leaflet`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `dxf-parser`, `eslint`, `graphify` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tests Validator` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Why does `showToast()` connect `Mapa y Capas Leaflet` to `Exportación y Certificados`, `Estado y Persistencia`, `Mapa y Capas Leaflet`, `Community 63`, `Carga de Archivos Geo`, `Mapa y Capas Leaflet`, `Versionado y Municipal`, `Mapa y Capas Leaflet`, `Utilidades y Geometría`, `Mapa y Capas Leaflet`, `Estado y Persistencia`, `Versionado y Municipal`, `Mapa y Capas Leaflet`, `Mapa y Capas Leaflet`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `Exportación y Certificados` be split into smaller, more focused modules?**
  _Cohesion score 0.09191583610188261 - nodes in this community are weakly interconnected._
- **Why does `@turf/turf` connect `Community 48` to `Community 38`, `Tests Validator`, `Catastro Cache`, `Versionado y Municipal`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._