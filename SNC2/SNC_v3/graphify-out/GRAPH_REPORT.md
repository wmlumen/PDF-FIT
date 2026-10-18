# Graph Report - SNC_v3  (2026-10-18)

## Corpus Check
- modo incremental — el corpus no se re-escaneó; se parte del grafo existente y se agregan archivos

## Summary
- 1398 nodes · 2166 edges · 126 communities (84 shown, 42 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2f202d0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Catastro Cache
- Versionado y Municipal
- validator.test.mjs
- 📋 INFORME DE VALIDACIÓN - Catastro PY Pro
- Probe Modelos Free
- Exportación y Certificados
- logger
- Versionado y Municipal
- Rate Limiting y Planes
- Utilidades y Geometría
- Auditoría 2026-10-18
- export.test.mjs
- Auditoría 2026-10-18
- Admin y Pagos
- Templates HTML
- Auditoría 2026-10-18
- Linting y Calidad
- Plan de remediación
- 🧪 QA Checklist - Salud del Proyecto
- Email y Notificaciones
- Migración DB
- Planes y Features
- GraphCoordinator
- Firebase Admin
- Linting y Calidad
- Bloqueo de Miembros
- 📊 Resumen de Diagnósticos
- Auditoría 2026-10-18
- Deploy Windows
- Plan: Capa de Base de Datos Completa (SQLite + Firestore + Cache)
- Catastro PY Pro v3.0 - SNC 551/2023
- Auditoría 2026-10-18
- Auditoría 2026-10-18
- genId()
- MainAgent
- geometry-history.test.mjs
- api-security.test.mjs
- RedTicket API
- Utilidades y Geometría
- coordinator.mjs
- Start Server
- DB Loader
- Firebase Auth
- Graph Coordinator - Documentación de Uso
- Auditoría y plan de remediación
- Orquestador Multi-IA
- cli.mjs
- 🧭 Supuestos CRS y Reproyección - Parser/Export
- Utilidades y Geometría
- Pagos Legacy
- orchestrator.mjs
- AgentOrchestrator
- Community 58
- Plan de remediación
- 🚧 Pendientes de Desarrollo
- 🔧 Variables de Entorno
- Utilidades y Geometría
- espejo_auditoria_graphify.md
- Auditoría 2026-10-18
- Auditoría 2026-10-18
- 📊 Tabla Comparativa de Funcionalidades
- 📁 Descripción de Archivos
- Utilidades y Geometría
- Community 68
- indexar_auditoria_grafo.md
- TypeScript y Build
- 📋 Detalle de Funcionalidades por Carpeta
- Community 72
- Community 73
- Utilidades y Geometría
- documentar_auditoria.md
- guard_graph_refresh.md
- Community 76
- Auditoría 2026-10-18
- 🏁 Guía de Promoción a Producción
- 🏁 Guía de Promoción a Producción
- Community 81
- Changelog - Security
- Linting y Calidad
- Carga de Archivos Geo
- grafo_graphify_out.md
- Changelog - Repo Hygiene
- Estructura segura de SNC_v3
- 👥 Panel de Gestión (`members.html`)
- 📦 Exportación y Certificación
- 🛠️ Tecnologías
- 📋 Notas de Origen y Versiones
- 🔄 Compatibilidad de Formatos
- Changelog - Architecture
- Changelog - Code Quality
- Changelog - Municipal Compliance
- Changelog - Performance
- Community 98
- validarCierreAnillos()
- 2026-10-18 - imp_1792361341299_8pl7wsoo
- runtime_mismatch_isolation.md
- probe_free_models.sh
- backup_sqlite.sh
- promotion_gate.sh script
- restore_sqlite.sh
- rotate_legacy_hashes.sh
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
- `7. Hallazgos bajos` --references--> `pruneCache()`  [INFERRED]
  docs/AUDITORIA_SNC_v3_2026-10-18.md → cacheDb.js
- `God Nodes (más conectados)` --references--> `showToast()`  [INFERRED]
  GRAFOS.md → js/utils.js
- `C. ARCHIVOS DE SALIDA GENERADOS` --references--> `generateConsultaDescriptivaPDF()`  [INFERRED]
  docs/INFORME_VALIDACION.md → js/export.js
- `1. Certificación PDF completa` --references--> `generateConsultaDescriptivaPDF()`  [INFERRED]
  docs/README.md → js/export.js

## Import Cycles
- 2-file cycle: `.opencode/coordination/coordinator.mjs -> .opencode/coordination/orchestrator.mjs -> .opencode/coordination/coordinator.mjs`

## Communities (126 total, 42 thin omitted)

### Community 0 - "Catastro Cache"
Cohesion: 0.05
Nodes (85): 1) JSDoc mínimo en MapEngine, 2) Centralización de estados globales, addRow(), attributeHistory, autoCompleteWithSNC(), cancelEdit(), clearSelection(), currentData (+77 more)

### Community 1 - "Versionado y Municipal"
Cohesion: 0.06
Nodes (41): 1. Certificación PDF completa, 🚀 Estado del Proyecto, buildResolutionChecklist(), calcularToleranciaSNC(), captureProfessionalMaps(), exportGeoJSON(), exportKML(), exportProfessionalReport() (+33 more)

### Community 2 - "validator.test.mjs"
Cohesion: 0.04
Nodes (40): areaFail, areaOkUrbanoFeature, areaOkUrbanoGeom, calculatedArea, CAMPOS_REQUERIDOS, completoUrbano, exportCheckBadProj, exportCheckMissing (+32 more)

### Community 3 - "📋 INFORME DE VALIDACIÓN - Catastro PY Pro"
Cohesion: 0.05
Nodes (42): 📊 1. QUÉ VALIDA EL SISTEMA (8 CRITERIOS SNC 551/2023), 📄 2. ESTRUCTURA DEL INFORME DE VALIDACIÓN, 🗂️ 3. QUÉ SE HIZO CON LOS ARCHIVOS, ✅ 4.1 CAMPOS OBLIGATORIOS (Art. 8 de la Res.), ✅ 4.2 TOLERANCIA DE ÁREA (Art. 12 de la Res.), ✅ 4.3 PROYECCIÓN CARTOGRÁFICA (Art. 15 de la Res.), ✅ 4.4 TOPOLOGÍA (Art. 18 de la Res.), ✅ 4.5 ESTRUCTURA DE ARCHIVOS (Art. 20 de la Res.) (+34 more)

### Community 4 - "Probe Modelos Free"
Cohesion: 0.06
Nodes (17): Diagnostic, calcularDistancia(), gradosARadianes(), LayerGuard, LayerGuardClass, logger, DEPARTAMENTOS_PY, DISTRITOS_PY (+9 more)

### Community 5 - "Exportación y Certificados"
Cohesion: 0.05
Nodes (40): compilerOptions, allowJs, allowUnreachableCode, allowUnusedLabels, alwaysStrict, baseUrl, checkJs, declaration (+32 more)

### Community 6 - "logger"
Cohesion: 0.08
Nodes (15): 3) Evaluación de `central.html`, 4) Deuda técnica frontend y recomendaciones de bundling, Archivos evaluados para remover, Archivos modificados, Deuda técnica relevante, Mejoras P3 Frontend SNC_v3, Recomendaciones de bundling, Resumen de cambios (+7 more)

### Community 7 - "Versionado y Municipal"
Cohesion: 0.13
Nodes (30): A. ARCHIVOS DE ENTRADA ACEPTADOS, explodePolygonFeatures(), detectCoordinateDelimiter(), detectCSVType(), extractPolygonsFromDXF(), findCoordinateColumn(), handleDataFile(), handleFile() (+22 more)

### Community 8 - "Rate Limiting y Planes"
Cohesion: 0.07
Nodes (19): app, countExportsToday(), __dirname, getClientIdentifier(), getTodayKey(), incrementExportsToday(), PLAN_TYPES, PUBLIC_HTML_FILES (+11 more)

### Community 9 - "Utilidades y Geometría"
Cohesion: 0.11
Nodes (26): 1. Criterios núcleo SNC 551/2023, 2. Cobertura funcional, 3. Pruebas y calidad, 4. Seguridad, 5. Deploy, 6. Documentación, 7. Items manuales / producción, 8. Aprobación (+18 more)

### Community 10 - "Auditoría 2026-10-18"
Cohesion: 0.09
Nodes (9): C-06 · Firestore roto + fallback silencioso a SQLite, __dirname, __filename, getGraphClient(), GraphClient, LOCAL_DOMAIN, LOCAL_GRAPH, ROOT_DOMAIN (+1 more)

### Community 11 - "export.test.mjs"
Cohesion: 0.07
Nodes (18): CAMPOS_REQUERIDOS, certInvalid, certOk, downloads, expBad, expMissing, expOk, generateShapefile() (+10 more)

### Community 12 - "Auditoría 2026-10-18"
Cohesion: 0.11
Nodes (23): CAMPOS_RURALES, CAMPOS_URBANOS, CONFIG_MUNICIPAL, EPSG_32720, EPSG_32721, ESPECIFICACION_CAMPOS_SNC, MAP_CONFIG, MAX_VERTICES_BEFORE_SIMPLIFY (+15 more)

### Community 13 - "Admin y Pagos"
Cohesion: 0.09
Nodes (21): bcrypt, db, DB_PATH, dbAPI, DB_LOG, { existsSync, mkdirSync, appendFileSync }, expedientes, { join } (+13 more)

### Community 14 - "Templates HTML"
Cohesion: 0.11
Nodes (21): Acciones pendientes, Cobertura actual estimada, 📊 Cobertura QA P3 - SNC_v3, Objetivo, Supuestos y alcance, Umbrales fijados, buildJson(), buildReadme() (+13 more)

### Community 15 - "Auditoría 2026-10-18"
Cohesion: 0.17
Nodes (20): 4. Supuestos en `js/validator.js`, isNumeric(), formatCoordinate(), normalizarNombreTerritorial(), obtenerCodigo(), runExportValidation(), runValidation(), validarArchivosPresentes() (+12 more)

### Community 16 - "Linting y Calidad"
Cohesion: 0.09
Nodes (21): name, private, type, version, dxf-parser, eslint, graphify, husky (+13 more)

### Community 17 - "Plan de remediación"
Cohesion: 0.10
Nodes (20): CRIT-001: `serviceAccountKey.json` hardcodeado en código, CRIT-002: `JWT_SECRET` expuesto en `config.env.js`, Criterios de Cierre Global (Definition of Done), Fase 0 — Bloqueantes (AHORA) — **~45 min**, Fase 1 — Alta Prioridad (Sprint actual) — **~10h**, Fase 2 — Media (Próximo sprint) — **~8h**, Fase 3 — Baja (Backlog) — **~6h**, Hallazgos ALTOS (+12 more)

### Community 18 - "🧪 QA Checklist - Salud del Proyecto"
Cohesion: 0.10
Nodes (20): Archivos Principales, 📅 Auditorías Programadas, 🔧 Checklist de Componentes, 🧩 Checklist de Funcionalidad, 🚨 Checklist de Problemas Conocidos, 🧪 Checklist de Tests, 📋 Checklist de Validación (Pre-Exportación), Criterios de Validación (Res. SNC 551/2023) (+12 more)

### Community 19 - "Email y Notificaciones"
Cohesion: 0.11
Nodes (14): admin, db, dbAPI, { existsSync }, expedientes, { join }, payments, plans (+6 more)

### Community 20 - "Migración DB"
Cohesion: 0.19
Nodes (16): clone(), compareVersions(), createProjectVersion(), transitionVersion(), compareLatest(), create(), persistVersions(), render() (+8 more)

### Community 21 - "Planes y Features"
Cohesion: 0.11
Nodes (19): scripts, audit:graph, audit:sync, backup:db, build, deploy, deploy:all, dev (+11 more)

### Community 22 - "GraphCoordinator"
Cohesion: 0.22
Nodes (6): handleCheck(), handleLock(), handleUnlock(), GraphCoordinator, readJsonl(), safeWriteFileSync()

### Community 23 - "Firebase Admin"
Cohesion: 0.11
Nodes (18): devDependencies, dxf-parser, eslint, husky, jszip, lint-staged, prettier, proj4 (+10 more)

### Community 24 - "Linting y Calidad"
Cohesion: 0.20
Nodes (16): cacheLog(), db, dbDir, dbPath, getFeatureContainingPoint(), getFeaturesByBbox(), LOG_PATH, MAX_CACHE_ROWS (+8 more)

### Community 25 - "Bloqueo de Miembros"
Cohesion: 0.15
Nodes (12): DATA_DIR, db, DB_PATH, dbAPI, migrateFromJson(), runJsonMigration(), stmts, block (+4 more)

### Community 26 - "📊 Resumen de Diagnósticos"
Cohesion: 0.12
Nodes (16): 1. admin.html - Panel de Administración, 2. fluxograma.html - Flujograma Interactivo, 3. geoconverter.html - Inspector CAD, Configuración (config.js), 🔍 Diagnóstico de Dependencias Externas, 🛠️ Ejecución de Diagnóstico, Estado (state.js), 📊 Estadísticas del Sistema (+8 more)

### Community 27 - "Auditoría 2026-10-18"
Cohesion: 0.18
Nodes (8): App, CAMPOS_REQUERIDOS, escapeHtml(), renderLineage(), PLANS, localStoragePolyfill, State, Workspace

### Community 28 - "Deploy Windows"
Cohesion: 0.31
Nodes (12): ENV, BRAND, buildTransport(), button(), getTransporter(), sendAdminAlert(), sendMail(), sendRecoveryEmail() (+4 more)

### Community 29 - "Plan: Capa de Base de Datos Completa (SQLite + Firestore + Cache)"
Cohesion: 0.14
Nodes (13): Comandos de Verificación, Criterios de Cierre (Definition of Done), Esquema Objetivo (SQLite), Estado Actual (Resumen), Fase 0: Críticos (AHORA) — ~30 min, Fase 1: Esquema y Paridad (Sprint) — ~4h, Fase 2: Robustez (Sprint) — ~3h, Fase 3: Limpieza y Docs — ~1h (+5 more)

### Community 30 - "Catastro PY Pro v3.0 - SNC 551/2023"
Cohesion: 0.14
Nodes (14): 📋 Campos Obligatorios (14+2 según Anexo A Res. 551/2023), Catastro PY Pro v3.0 - SNC 551/2023, ✅ Checklist de Salud del Proyecto, ✅ Estado Final - Checklist Completado, 📂 Estructura del Proyecto, 🧪 Hallazgos de pruebas, 📜 Historial de Versiones, 🏁 Inicio Rápido (+6 more)

### Community 31 - "Auditoría 2026-10-18"
Cohesion: 0.15
Nodes (12): 5. Hallazgos altos, A-01 · `/api/usage/increment` responde 403 siempre, A-02 · Health check que siempre dice "ok", A-03 · Los usuarios con hash legacy no pueden iniciar sesión, A-04 · El primer usuario registrado se convierte en administrador, A-05 · Rate limiting inefectivo, A-06 · XSS almacenado en el checkout de pagos (y alcanzable por un admin vía IDOR), A-08 · Logs con datos sensibles y sin rotación (+4 more)

### Community 32 - "Auditoría 2026-10-18"
Cohesion: 0.22
Nodes (7): 2. Grafo de dominio, Aristas, Consulta rápida (python), Nodos, Nodos de fixes (trazabilidad de auditoría), runMunicipalValidation(), ValidadorMunicipal

### Community 33 - "genId()"
Cohesion: 0.21
Nodes (6): handleFail(), handlePass(), appendJsonl(), genId(), readJson(), writeJson()

### Community 35 - "geometry-history.test.mjs"
Cohesion: 0.15
Nodes (11): proj4, first, geographic, history, initial, redo, roundTrip, second (+3 more)

### Community 36 - "api-security.test.mjs"
Cohesion: 0.15
Nodes (6): capped, clean1, clean2, deepState, filesWithLongUrl, invalidGeo

### Community 37 - "RedTicket API"
Cohesion: 0.17
Nodes (12): 1. Login y proyecto (Windows), 2. Gate pre-promoción + tests (WSL), 3. Preview (Windows), 4. Deploy a producción (Windows), 5. Verificación post-deploy, 6. Rollback, Deploy Windows + WSL — SNC_v3, Flujo ejecutivo (+4 more)

### Community 38 - "Utilidades y Geometría"
Cohesion: 0.27
Nodes (10): buildTopologyRepairPreview(), cleanGeometry(), cleanRing(), clone(), same(), bowtie, overlapping, remainingOverlap (+2 more)

### Community 39 - "coordinator.mjs"
Cohesion: 0.17
Nodes (9): CHANGELOG_DIR, __dirname, ERRORS_FILE, __filename, LOCKS_FILE, SKILLS_FILE, TASKS_FILE, gc (+1 more)

### Community 40 - "Start Server"
Cohesion: 0.17
Nodes (12): dependencies, bcrypt, better-sqlite3, docx, dotenv, express, firebase-admin, graphify (+4 more)

### Community 41 - "DB Loader"
Cohesion: 0.18
Nodes (11): 1.1 Fuente de la Verdad: `graphify-out/`, 1. Regla Inviolable: Aislamiento de Entornos, 2. Ciclo de Vida Obligatorio para Cada Tarea, 3. Matriz Rápida de Dominios y Archivos Responsables, 4. Consulta Rápida de Estado, Paso 1: Identificar la ruta (Dónde tocar), Paso 2: Verificar bloqueos y malos aprendizajes previos, Paso 3: Adquirir el Lock (+3 more)

### Community 42 - "Firebase Auth"
Cohesion: 0.29
Nodes (9): canCreateExpediente(), canCreateProject(), canExport(), getPlanFeatures(), getPlanType(), getWatermark(), resolvePlan(), ROLE_CAPABILITIES (+1 more)

### Community 43 - "Graph Coordinator - Documentación de Uso"
Cohesion: 0.18
Nodes (10): 1. Locks - Evitar Solapamiento, 2. Error Registry - No Repetir Errores, 3. Skill Evolution - Mejoras Persistentes, 4. Patterns - Detección Automática, 5. Health Check, Archivos Generados, Flujo Recomendado de Trabajo, Graph Coordinator - Documentación de Uso (+2 more)

### Community 44 - "Auditoría y plan de remediación"
Cohesion: 0.22
Nodes (10): 0. Contexto obligatorio: auditoría abierta (2026-10-18), Reglas adicionales mientras la auditoría esté abierta, A-07 · Sanitización de HTML por regex y reporte "público" que exige login, C-05 · Tokens JWT forjables / sesiones no revocables, 1. Reglas para quien implemente, API, Backend, 🔒 Seguridad (+2 more)

### Community 45 - "Orquestador Multi-IA"
Cohesion: 0.20
Nodes (10): 10. Notas importantes, 1. Requisitos previos, 3. Inicio de sesión y proyecto, 4. Verificar configuración, 5. Prueba local / preview, 6. Deploy a preview, 7. Deploy a producción, 8. Verificar post-deploy (+2 more)

### Community 46 - "cli.mjs"
Cohesion: 0.22
Nodes (7): coord, __dirname, DOMAIN_ROUTES, __filename, handleRoute(), handleStatus(), getGraphClient()

### Community 47 - "🧭 Supuestos CRS y Reproyección - Parser/Export"
Cohesion: 0.25
Nodes (8): 1. Principios generales, 2. Supuestos en `js/parser.js`, 3. Supuestos en `js/export.js`, 5. Matriz de responsabilidad CRS, 6. Trazabilidad y riesgos, 7. Cambios asociados, 🧭 Supuestos CRS y Reproyección - Parser/Export, getParsingLogs()

### Community 48 - "Utilidades y Geometría"
Cohesion: 0.31
Nodes (5): booleanResult(), ensureFeature(), executeGeoprocessing(), @turf/turf, geojson

### Community 49 - "Pagos Legacy"
Cohesion: 0.31
Nodes (7): authHeader, createCharge(), crypto, getCharge(), getCheckoutByToken(), hasRedTicketConfig(), request()

### Community 50 - "orchestrator.mjs"
Cohesion: 0.28
Nodes (7): CPU_THRESHOLD, DEFAULT_SWARM_CONFIG, getBrowserResources(), getResources(), getSystemResources(), MAX_CONCURRENT_AGENTS, MEMORY_THRESHOLD

### Community 52 - "Community 58"
Cohesion: 0.22
Nodes (9): 🚀 Arranque rápido, 🔴 Bloqueantes conocidos (leer antes de desplegar), 📚 Documentación, 🗂️ Estructura, 🧠 Grafo del repositorio (`graphify-out/`), 🤖 Para agentes de IA, Scripts, SNC v3 — Catastro PY (Res. SNC N° 551/2023) (+1 more)

### Community 54 - "Plan de remediación"
Cohesion: 0.25
Nodes (8): 0. Estado, 2. Fase 0 — Contención (0-48 h, bloqueante de despliegue), 3. Fase 1 — Autorización y funcionalidad core (semana 1), 4. Fase 2 — Calidad, XSS y cadena de entrega (semanas 2-3), 5. Fase 3 — Endurecimiento y deuda (backlog), 6. Zonas congeladas hasta cerrar Fase 0, 7. Cómo retomar el trabajo, Plan de remediación — Auditoría 2026-10-18

### Community 55 - "🚧 Pendientes de Desarrollo"
Cohesion: 0.25
Nodes (8): 2. Botón de certificación con fondo de parcelas, 3. README actualizado con rutas nuevas, 4. README actualizado con migración JSON→SQLite, 5. README actualizado con variables de entorno, 6. README actualizado con seguridad, 7. Panel de gestión documentado, 8. Detalles menores de UI/docs, 🚧 Pendientes de Desarrollo

### Community 56 - "🔧 Variables de Entorno"
Cohesion: 0.25
Nodes (8): Administración, Autenticación, Catastro y Cache, Proyectos temporales, Proyectos y Expedientes, Uso y Pagos, Utilidades, 🔧 Variables de Entorno

### Community 57 - "Utilidades y Geometría"
Cohesion: 0.36
Nodes (6): applyLineageEvent(), clone(), technicalId(), event, geojson, updated

### Community 58 - "espejo_auditoria_graphify.md"
Cohesion: 0.25
Nodes (7): 2026-10-18 - imp_1792361697889_6t3zepfm, 2026-10-18 - imp_1792361697998_ipv7002q, 2026-10-18 - imp_1792361698145_ybfinmul, 2026-10-18 - imp_1792361698275_q8itkdzq, 2026-10-18 - imp_1792361698379_sleq28k8, 2026-10-18 - imp_1792361698514_p7mxptx0, 2026-10-18 - imp_1792361698622_woclefft

### Community 59 - "Auditoría 2026-10-18"
Cohesion: 0.29
Nodes (7): 10. Conclusión, 1. Resumen ejecutivo, 2. Inventario auditado, 3. Verificaciones ejecutadas (evidencia), 6. Hallazgos medios, 9. Anexo — Parches sugeridos (orientativos), Auditoría técnica — SNC_v3 (Catastro PY / Res. SNC 551/2023)

### Community 60 - "Auditoría 2026-10-18"
Cohesion: 0.29
Nodes (7): 4. Hallazgos críticos, C-01 · Credenciales reales versionadas en Git, C-02 · Clave privada de Firebase Admin en el workspace, C-03 · El despliegue publica todo el repositorio, C-04 · IDOR multi-tenant en proyectos, expedientes, archivos y pagos, C-07 · Endpoints core en 500: contrato `db.cjs` incompleto y `files_json` inexistente, C-08 · El webhook de pagos no puede validar la firma

### Community 61 - "📊 Tabla Comparativa de Funcionalidades"
Cohesion: 0.29
Nodes (6): ✅ Funcionalidades Activas (Mantenidas), ❌ Funcionalidades Descartadas (Eliminadas), ⚠️ Funcionalidades Eliminadas (Evaluación), 🎯 Recomendaciones, 📊 Resumen de Clasificación, 📊 Tabla Comparativa de Funcionalidades

### Community 62 - "📁 Descripción de Archivos"
Cohesion: 0.29
Nodes (7): Archivos Principales (HTML), Datos (data/), 📁 Descripción de Archivos, Documentación (docs/), Estilos (css/), Módulos JavaScript (js/), Tests (tests/)

### Community 63 - "Utilidades y Geometría"
Cohesion: 0.57
Nodes (6): close(), featureLabel(), modal(), open(), run(), getParcelId()

### Community 64 - "Community 68"
Cohesion: 0.38
Nodes (3): redticketSign(), verifyRedTicketSignature(), verifyWebhook()

### Community 65 - "indexar_auditoria_grafo.md"
Cohesion: 0.29
Nodes (6): 2026-10-18 - imp_1792361978615_cdbg8xgy, 2026-10-18 - imp_1792361978856_pzuwhpo0, 2026-10-18 - imp_1792361979506_44suukjx, 2026-10-18 - imp_1792361979631_s81v29x2, 2026-10-18 - imp_1792361979705_vx219571, 2026-10-18 - imp_1792361979835_qgm8mt2w

### Community 66 - "TypeScript y Build"
Cohesion: 0.33
Nodes (6): 2. Checklist Pre-Deploy, Backend y entorno, Configuración y secretos, Código y calidad, Datos y hosting, Seguridad (Fase 2 verificada)

### Community 67 - "📋 Detalle de Funcionalidades por Carpeta"
Cohesion: 0.33
Nodes (6): Catastro - copia/ (Duplicado - ELIMINAR), catastro index/ (Versiones antiguas - ELIMINAR), Catastrov2/ (Obsoleto - ELIMINAR), 📋 Detalle de Funcionalidades por Carpeta, Nueva carpeta/ (Duplicado - ELIMINAR), Proyectos/catastro_js/ (Versión funcional - ORIGEN)

### Community 69 - "Community 73"
Cohesion: 0.33
Nodes (4): app, auth, db, firebaseConfig

### Community 70 - "Utilidades y Geometría"
Cohesion: 0.60
Nodes (5): createLineageEvent(), apply(), clearLayer(), close(), open()

### Community 71 - "documentar_auditoria.md"
Cohesion: 0.33
Nodes (5): 2026-10-18 - imp_1792361399688_esel27pj, 2026-10-18 - imp_1792361399793_c91fa2qt, 2026-10-18 - imp_1792361399887_08fizuws, 2026-10-18 - imp_1792361400018_p94tvm5k, 2026-10-18 - imp_1792361400156_psgiog42

### Community 72 - "guard_graph_refresh.md"
Cohesion: 0.33
Nodes (5): 2026-10-18 - imp_1792362097704_7uhlkuu6, 2026-10-18 - imp_1792362097778_u8fc7x14, 2026-10-18 - imp_1792362097836_rlbd4ibu, 2026-10-18 - imp_1792362097910_s5dk5un8, 2026-10-18 - imp_1792362097974_jih2rzi4

### Community 73 - "Community 76"
Cohesion: 0.33
Nodes (4): http, listenPort, server, targetPort

### Community 74 - "Auditoría 2026-10-18"
Cohesion: 0.40
Nodes (5): 8. Plan de remediación priorizado, Fase 0 — Contención (0-48 h), Fase 1 — Corrección funcional y de autorización (semana 1), Fase 2 — Calidad y cadena de entrega (semanas 2-3), Fase 3 — Endurecimiento y deuda (backlog)

### Community 75 - "🏁 Guía de Promoción a Producción"
Cohesion: 0.40
Nodes (5): Criterios mínimos de promoción, Flujo recomendado, 🏁 Guía de Promoción a Producción, Mantenimiento recomendado, Rollback

### Community 76 - "🏁 Guía de Promoción a Producción"
Cohesion: 0.40
Nodes (5): Criterios mínimos de promoción, Flujo recomendado, 🏁 Guía de Promoción a Producción, Mantenimiento recomendado, Rollback

### Community 77 - "Community 81"
Cohesion: 0.60
Nodes (4): getFirebaseAuth(), getFirestoreDb(), initFirebaseAdmin(), firebase-admin

### Community 78 - "Changelog - Security"
Cohesion: 0.40
Nodes (4): 2026-10-18 - imp_20261018_municipal_postgis, 2026-10-18 - imp_20261018_repo_hygiene, 2026-10-18 - imp_20261018_security_secrets, Changelog - Security

### Community 80 - "Carga de Archivos Geo"
Cohesion: 0.50
Nodes (4): 11. Estado del proyecto (2026-10-18), Archivos eliminados, Completado, Pendiente de verificación manual

### Community 82 - "grafo_graphify_out.md"
Cohesion: 0.50
Nodes (3): 2026-10-18 - imp_1792361579215_lvkle3b2, 2026-10-18 - imp_1792361579280_fxyi8m5x, 2026-10-18 - imp_1792361579364_4g14d6bi

### Community 83 - "Changelog - Repo Hygiene"
Cohesion: 0.50
Nodes (3): 2026-10-18 - imp_20261018_repo_hygiene, 2026-10-18 - imp_20261018_security_secrets, Changelog - Repo Hygiene

### Community 85 - "👥 Panel de Gestión (`members.html`)"
Cohesion: 0.67
Nodes (3): Acceso, Migración JSON → SQLite, 👥 Panel de Gestión (`members.html`)

### Community 86 - "📦 Exportación y Certificación"
Cohesion: 0.67
Nodes (3): Archivos generados:, 📦 Exportación y Certificación, Flujo de certificación (según Anexo B):

### Community 87 - "🛠️ Tecnologías"
Cohesion: 0.67
Nodes (3): Backend / API, Frontend, 🛠️ Tecnologías

### Community 88 - "📋 Notas de Origen y Versiones"
Cohesion: 0.67
Nodes (3): Base del Proyecto, Módulos JS, 📋 Notas de Origen y Versiones

### Community 89 - "🔄 Compatibilidad de Formatos"
Cohesion: 0.67
Nodes (3): 🔄 Compatibilidad de Formatos, Entrada (Parsers) - Resolución Art. 14, Salida (Exportadores) - Anexo B Res. 551/2023

### Community 95 - "validarCierreAnillos()"
Cohesion: 0.67
Nodes (3): formatCoordinate(), validarCierreAnillos(), validarGeometria()

## Knowledge Gaps
- **15 isolated node(s):** `dxf-parser`, `eslint`, `graphify`, `husky`, `jszip` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 792 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@turf/turf` connect `Utilidades y Geometría` to `Linting y Calidad`, `Linting y Calidad`, `validator.test.mjs`, `Utilidades y Geometría`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **What connects `dxf-parser`, `eslint`, `graphify` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Catastro Cache` be split into smaller, more focused modules?**
  _Cohesion score 0.050475635798874006 - nodes in this community are weakly interconnected._
- **Why does `logger` connect `Probe Modelos Free` to `Catastro Cache`, `Versionado y Municipal`, `Versionado y Municipal`, `Rate Limiting y Planes`, `Auditoría 2026-10-18`, `Community 81`, `Auditoría 2026-10-18`, `Auditoría 2026-10-18`, `Deploy Windows`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `Versionado y Municipal` be split into smaller, more focused modules?**
  _Cohesion score 0.06428571428571428 - nodes in this community are weakly interconnected._
- **Why does `showToast()` connect `Catastro Cache` to `Versionado y Municipal`, `logger`, `Versionado y Municipal`, `Utilidades y Geometría`, `Utilidades y Geometría`, `Auditoría 2026-10-18`, `Auditoría 2026-10-18`, `Migración DB`, `Auditoría 2026-10-18`, `Utilidades y Geometría`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `validator.test.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._