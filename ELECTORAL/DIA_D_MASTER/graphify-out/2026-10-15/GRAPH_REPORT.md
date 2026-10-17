# Graph Report - DIA_D_MASTER  (2026-10-15)

## Corpus Check
- 47 files · ~161,173 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: (none) 5, .dbf 4, .cdx 3)

## Summary
- 717 nodes · 1320 edges · 146 communities (42 shown, 104 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df5d4317`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Inicialización de DB y Autenticación
- Motor de Temas de UI (party_theme.js)
- api_get
- Request
- get
- log_auditoria
- Autorización de Roles en Frontend (auth.js)
- app.py
- _require_auth
- post
- json
- Mensajería y Notificaciones
- Scripts de Despliegue del Servidor
- Configuración del Manifest PWA
- _alcance_geografico_cliente
- Electoral KPI Documentation
- Logistics API Documentation
- CSS Processing Pipeline
- Client Panel Actions
- Project Conventions and Agents
- autorizar_recogida
- normalizar_texto
- Database Structure Maintenance
- Voter Registry Pipeline
- Project Deployment Guide
- cargar_masivo_dirigente
- api_post
- Polling Station Sync
- Knowledge Graph Documentation
- Territorial Hierarchy Levels
- Client Management UI
- Electoral System Modules
- Transport Management API
- _autenticar_unificado
- cliente_dashboard
- Tailwind CSS Integration
- GPS and Map Navigation
- Voter Management Actions
- Voting Interface Actions
- permisos_check
- Global App Styles
- Tailwind Style Generation
- Electoral Algorithm Specialist
- Role Hierarchy API
- _cliente_de_sesion
- cliente_perfil
- calcular_dhondt_custom
- alcance_por_plan
- descargar_apk
- cliente_pcs
- normalizar_cedula
- dirigente_movilidad
- conductor_detalle
- get_certificacion
- get_departamentos
- conductor_lista
- get_mesas_conteo
- conductor_historial_extendido
- conductor_ultima_ubicacion
- actividad_reciente
- health_check
- auditoria_exportar
- mi_dashboard_resumen_candidatos
- get_candidatos_electos
- usuarios_lista
- cliente_dirigente_editar
- cliente_transporte
- clientes_resumen
- permisos_lista
- conductor_pendientes
- conductor_stats
- dashboard_stats
- todas_ubicaciones
- roles_disponibles
- get_candidato_electo
- serve_party_theme
- General Admin Interface
- Gamification Ranking API
- User Data Persistence
- Package Data Persistence
- Polling Station Analysis
- UI Icon Definitions
- Module Cache Management
- Attendance Registration
- Driver Service Worker
- Prospect Management
- Profile and Dashboard Rendering
- Registration Step Rendering
- App Service Worker
- Auditor Agent
- Full Stack Developer Agent
- Logistics Coordinator Agent
- Developer Agent
- KPI Visualization Standard
- Voter Data Sources
- Gamification Engine
- Admin General
- Vista Maestro (Frontend)
- Miembro de Mesa
- Panel Partido
- Vista de Veedor (Frontend)
- Cargar Altas (Frontend)
- cargarEstadisticasGenerales
- Guardar Cliente (Frontend)
- Tema de Partido (Frontend)
- Cargar Usuarios (Frontend)
- PostCSS Nested Plugin Factory
- Inteligencia de Centro (Frontend)
- Lucide Icons v1.16.0
- Puesto de Comando (Frontend)
- Default Export Wrapper
- Tailwind Variant Definitions
- Tailwind Core Plugins
- get_distritos
- Completar Viaje (Conductor)
- Login en Frontend
- Iniciar Viaje (Conductor)
- Conductor State
- toggleDisponibilidad
- aplicarMarcaPorDominio
- Búsqueda (Frontend)
- DDIA v2 Final APK
- DDIA Exacto Offline APK
- Cálculo (Frontend)
- Asignar Candidato (Frontend)
- Buscar en Padrón (Frontend)
- Cargar Movilidad (Frontend)
- enviarSolicitudTransporte
- Encuesta de Intención de Voto
- Padrón Unificado UI
- Panel del Cliente UI
- Buscar en Padrón (Frontend)
- Theming Documentation
- get_listas_partido
- get_solicitudes_recogida
- padron_buscar
- seccional_candidatos
- tareas_lista
- usuarios_editar
- sesiones_lista

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 140 edges
2. `normalizar_cedula()` - 74 edges
3. `PartyThemeEngine` - 49 edges
4. `normalizar_texto()` - 37 edges
5. `api_post()` - 25 edges
6. `log_auditoria()` - 22 edges
7. `api_get()` - 20 edges
8. `init_db()` - 20 edges
9. `_autenticar_unificado()` - 17 edges
10. `_require_auth()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Servicios identificados en el sistema` --references--> `enviar_bienvenida_cliente()`  [INFERRED]
  docs/PLANES_Y_PRECIOS.md → app.py
- `Estado` --references--> `_autenticar_unificado()`  [INFERRED]
  docs/CREDENCIALES_DEV.md → app.py
- `2) Gráficos que sirven (y para qué)` --references--> `serve_page()`  [INFERRED]
  .apc/skills/electoral-kpi-dashboard/SKILL.md → app.py
- `Conductor / Logística` --references--> `DIA D MASTER - Transporte y Logística`  [INFERRED]
  static/roles.html → static/transporte.html
- `Escrutinio General` --semantically_similar_to--> `Escrutinio Intendentes`  [INFERRED] [semantically similar]
  static/escrutinio.html → static/escrutinio_intendentes.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Election Monitoring and Anomalies** — static_anomalias_analizarMesas, static_anomalias_cargarDatos, static_asistencia_loadAll [EXTRACTED 0.85]
- **Administrative Management Flow** — static_admin_general_renderTabClientes, static_admin_general_cargarUsuarios, static_admin_usuarios_cargarUsuarios [EXTRACTED 0.90]
- **Electoral Control Flow** — static_index, static_mesas, static_escrutinio, static_gestion_territorial [EXTRACTED 0.90]
- **Transport Logistics System** — static_transporte, api_transportes, api_rutas, api_ubicaciones, role_conductor [EXTRACTED 0.90]
- **Electoral Management Hierarchy** — role_nacional, role_departamental, role_distrital, role_seccional [EXTRACTED 0.95]
- **APX Agent Team** — agents_electoral, agents_logistica, agents_auditoria, agents_desarrollador [EXTRACTED 1.00]
- **DIA D MASTER Core Modules** — static_transporte_html, static_veedores_html, static_votacion_html [EXTRACTED 1.00]
- **Electoral Control System** — static_app_html, static_no_voto_html, static_admin_general_html [EXTRACTED 1.00]
- **PostCSS JS Implementation** — static_app_po, static_app_wn, static_app_xd, static_app_jd, static_app_th [EXTRACTED 1.00]
- **Tailwind Runtime Style Generation** — static_app_mutation_observer, static_app_jit_engine, static_app_autoprefixer [EXTRACTED 1.00]
- **Voter Registration & Linking** — static_registro_qr_buscarenpadron, static_registro_qr_verificarcodigo, static_registro_qr_registrarsolicitud [EXTRACTED 1.00]
- **Field Operations Flow** — role_dirigente, role_conductor, role_veedor, role_miembro_mesa [INFERRED 0.80]
- **Electoral Management Flow** — static_panel_cliente_renderdashboard, static_panel_distrital_cargarpanel, static_ranking_cargarranking [INFERRED 0.85]
- **Offline-Ready Frontend** — static_app_html, apc_skills_electoral_kpi_dashboard_skill_electoral_kpi_dashboard [INFERRED 0.85]
- **Tailwind CSS Core Engine** — static_app_se, static_app_yh, static_app_vh, static_app_pl [INFERRED 0.95]

## Communities (146 total, 104 thin omitted)

### Community 0 - "Inicialización de DB y Autenticación"
Cohesion: 0.06
Nodes (17): obtener_permisos_rol(), startup(), _aplicar_alcance(), _asignar_permisos_default(), completar_nombres_geo_padron(), ensure_padron2026_completo(), get_connection(), init_db() (+9 more)

### Community 1 - "Motor de Temas de UI (party_theme.js)"
Cohesion: 0.09
Nodes (7): clienteObservado(), credencialesAuth(), esAdminMaster(), mostrarBannerCliente(), PartyThemeEngine, sesionActual(), _usuarioSesion()

### Community 2 - "api_get"
Cohesion: 0.20
Nodes (6): api_get(), buscar_elector_padron_completo(), contar_padron_completo(), registrar_consulta_publica(), resolver_candidato_por_dominio(), veedores_consultar_donde_vota()

### Community 3 - "Request"
Cohesion: 0.11
Nodes (9): cliente_dirigente_crear(), cliente_dirigente_quitar(), cliente_pc_crear(), cliente_pc_eliminar(), cliente_transporte_eliminar(), dirigente_movilidad_actualizar(), encuesta_responder(), encuesta_solicitar_transporte() (+1 more)

### Community 4 - "get"
Cohesion: 0.08
Nodes (14): auditoria_lista(), candidatos_agrupados(), cliente_dirigentes(), cliente_logistica(), conductor_historial(), estadisticas_candidatos_electos(), gamificacion_ranking(), get_votantes_paginados() (+6 more)

### Community 5 - "log_auditoria"
Cohesion: 0.11
Nodes (9): auditar_accion(), cargar_masivo_dirigente(), crear_tarea(), log_auditoria(), sesiones_cerrar(), usuarios_asignar_rol(), usuarios_crear(), usuarios_perfil() (+1 more)

### Community 6 - "Autorización de Roles en Frontend (auth.js)"
Cohesion: 0.15
Nodes (25): apiPost(), cambiarRol(), esAdmin(), esCliente(), esConductor(), esDirigente(), esPc(), getNivel() (+17 more)

### Community 7 - "app.py"
Cohesion: 0.10
Nodes (4): actividad_votantes(), get_certificacion_resumen(), mesas_estado_dirigente(), verify_dirigente_api_key()

### Community 8 - "_require_auth"
Cohesion: 0.11
Nodes (12): admin_estadisticas_generales(), _check_nivel(), delete_pc(), delete_unidad(), _formatear_partido_config(), get_partido_config(), get_partido_unidades(), _nivel_index() (+4 more)

### Community 9 - "post"
Cohesion: 0.15
Nodes (6): completar_tarea(), conductor_completar(), conductor_confirmar(), crear_candidato_electo(), permisos_asignar_multi(), transporte_eliminar()

### Community 10 - "json"
Cohesion: 0.22
Nodes (5): conductor_register_push(), get_partido(), get_partidos(), veedores_mesa_estado_get(), veedores_mesa_estado_post()

### Community 11 - "Mensajería y Notificaciones"
Cohesion: 0.09
Nodes (17): enviar_bienvenida_cliente(), enviar_contacto(), enviar_email(), enviar_email_cuenta_nueva(), enviar_sms(), enviar_whatsapp(), recuperar_password(), _twilio_enviar() (+9 more)

### Community 12 - "Scripts de Despliegue del Servidor"
Cohesion: 0.21
Nodes (4): banner(), check_dependencies(), init_database(), main()

### Community 13 - "Configuración del Manifest PWA"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 14 - "_alcance_geografico_cliente"
Cohesion: 0.20
Nodes (5): _alcance_geografico_cliente(), mi_dashboard(), mi_dashboard_detalle(), mi_dashboard_encuesta(), mi_dashboard_mesa_detalle()

### Community 15 - "Electoral KPI Documentation"
Cohesion: 0.22
Nodes (8): 1) KPIs esenciales (tarjetas superiores "semáforo"), 2) Gráficos que sirven (y para qué), 3) Tablas de respaldo (el gráfico resume, la tabla prueba), 4) Principios de diseño, 5) Datos — de dónde sale cada KPI en este proyecto, 6) Pitfalls de datos electorales en vivo, Electoral KPI Dashboard — estándar de visualización (DIA D MASTER), serve_page()

### Community 16 - "Logistics API Documentation"
Cohesion: 0.22
Nodes (9): API Actividad Reciente, API Conductor Lista, API Login, API Rutas, API Solicitudes Recogida, API Transportes, API Ubicaciones, Conductor / Logística (+1 more)

### Community 17 - "CSS Processing Pipeline"
Cohesion: 0.31
Nodes (9): Sync CSS Processor, PostCSS Warning Logger, Sync CSS Processor Wrapper, Selector Resolver, CSS Objectifier, PostCSS JS API, CSS Property CamelCaser, CSS Parser (+1 more)

### Community 18 - "Client Panel Actions"
Cohesion: 0.25
Nodes (8): /api, desvincularDirigente, renderCampana, cargarPanel, loginPanel, pintarGrafico, registrarSolicitud, verificarCodigo

### Community 19 - "Project Conventions and Agents"
Cohesion: 0.33
Nodes (5): 📜 Convenciones y Reglas de Código, 🗳️ DIA D MASTER - APC Agent Guide (AGENTS.md), 🤖 Equipo de Agentes APX Configurados, graphify, 📌 Visión General del Proyecto

### Community 20 - "autorizar_recogida"
Cohesion: 0.33
Nodes (3): autorizar_recogida(), conductor_asignar(), enviar_push()

### Community 21 - "normalizar_texto"
Cohesion: 0.13
Nodes (8): cliente_logistica_autorizar(), cliente_transporte_crear(), cliente_transporte_editar(), conductor_ubicacion(), normalizar_texto(), post_crear_pc(), transporte_editar(), usuarios_quitar_rol()

### Community 23 - "Voter Registry Pipeline"
Cohesion: 0.33
Nodes (5): Contenido, Fuentes del padrón (ANR) — ojo, acá NO hay nada del PLRA ni del TSJE, ⚠️ Pipeline de importación roto, Qué falta para usar esta data completa, ¿Y el PLRA?

### Community 24 - "Project Deployment Guide"
Cohesion: 0.33
Nodes (5): 📱 Despliegue en Celulares de Campo, 🗳️ DIA D MASTER - Sistema Electoral Unificado, 📂 Estructura del Proyecto, 🚀 Inicio Rápido en Windows, 👥 Roles y Credenciales Iniciales

### Community 25 - "cargar_masivo_dirigente"
Cohesion: 0.22
Nodes (3): _authenticate(), exportar_excel_dirigente(), parsear_archivo_dirigente()

### Community 26 - "api_post"
Cohesion: 0.25
Nodes (5): api_post(), _certificar(), default_password(), _ejecutar_desvinculo(), row_to_dict()

### Community 27 - "Polling Station Sync"
Cohesion: 0.40
Nodes (4): /veedores/mesa/:id/estado, apiFetch, syncFromBackend, syncToBackend

### Community 28 - "Knowledge Graph Documentation"
Cohesion: 0.40
Nodes (4): Actualización automática, Consultar (en vez de grep/read masivos), DIA_D_MASTER — grafo de conocimiento (graphify), Exclusiones (`.graphifyignore`)

### Community 29 - "Territorial Hierarchy Levels"
Cohesion: 0.40
Nodes (5): Departamental, Dirigente, Distrital, Nacional, Seccional

### Community 30 - "Client Management UI"
Cohesion: 0.40
Nodes (5): abrirActividadCliente, buscarClientes, cargarClientes, renderClienteDetalle, renderTabClientes

### Community 31 - "Electoral System Modules"
Cohesion: 0.40
Nodes (5): Escrutinio General, Escrutinio Intendentes, Gestión Territorial Local, Sistema Electoral Unificado (Dashboard), Mesas Electorales

### Community 32 - "Transport Management API"
Cohesion: 0.50
Nodes (4): /api/autorizar_recogida, /api/conductor/todas_ubicaciones, registrar_transporte action, Transporte Management

### Community 33 - "_autenticar_unificado"
Cohesion: 0.08
Nodes (16): _autenticar_unificado(), _cargar_roles_unificado(), check_password(), generar_session_id(), hash_password(), migrar_legacy_a_unificado(), _migrar_roles_legacy(), registrar_intento_login() (+8 more)

### Community 35 - "Tailwind CSS Integration"
Cohesion: 0.67
Nodes (4): Autoprefixer, Tailwind JIT Engine, DOM Mutation Observer, Tailwind CSS CDN

### Community 36 - "GPS and Map Navigation"
Cohesion: 0.50
Nodes (4): actualizarMapa, iniciarGPS, recargar, showMainApp

### Community 37 - "Voter Management Actions"
Cohesion: 0.67
Nodes (3): confirmar_participacion action, registrar_veedor action, Veedores Management

### Community 38 - "Voting Interface Actions"
Cohesion: 0.67
Nodes (3): padron action, votos action, Votación Interface

### Community 41 - "Tailwind Style Generation"
Cohesion: 0.67
Nodes (3): CSS Property Value Normalizer, Tailwind Stylesheet Generator, Tailwind Context Manager

### Community 44 - "_cliente_de_sesion"
Cohesion: 0.29
Nodes (4): _cliente_de_request(), _cliente_de_sesion(), _css_color(), serve_tema_cliente()

### Community 46 - "calcular_dhondt_custom"
Cohesion: 0.33
Nodes (3): calcular_dhondt_custom(), _cargos_permitidos_cliente(), _tiene_dato_general()

### Community 47 - "alcance_por_plan"
Cohesion: 0.33
Nodes (3): alcance_por_plan(), _clientes_visibles(), _es_admin_master()

### Community 50 - "normalizar_cedula"
Cohesion: 0.14
Nodes (8): cancelar_recogida(), _cliente_de_cedula(), conductor_disponibilidad(), eliminar_tarea(), normalizar_cedula(), solicitar_recogida(), usuarios_resetear_password(), usuarios_toggle_branding()

## Knowledge Gaps
- **108 isolated node(s):** `Gamification Engine`, `Admin General`, `Master`, `Miembro de Mesa`, `Panel Partido` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 361 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **104 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `Inicialización de DB y Autenticación` to `api_get`, `Request`, `get`, `log_auditoria`, `app.py`, `_require_auth`, `post`, `json`, `get_listas_partido`, `get_solicitudes_recogida`, `padron_buscar`, `_alcance_geografico_cliente`, `Mensajería y Notificaciones`, `seccional_candidatos`, `sesiones_lista`, `tareas_lista`, `usuarios_editar`, `autorizar_recogida`, `normalizar_texto`, `cargar_masivo_dirigente`, `api_post`, `_autenticar_unificado`, `cliente_dashboard`, `permisos_check`, `_cliente_de_sesion`, `cliente_perfil`, `calcular_dhondt_custom`, `alcance_por_plan`, `cliente_pcs`, `normalizar_cedula`, `dirigente_movilidad`, `conductor_detalle`, `get_certificacion`, `get_departamentos`, `conductor_lista`, `get_mesas_conteo`, `conductor_historial_extendido`, `conductor_ultima_ubicacion`, `actividad_reciente`, `health_check`, `auditoria_exportar`, `mi_dashboard_resumen_candidatos`, `get_candidatos_electos`, `usuarios_lista`, `cliente_dirigente_editar`, `cliente_transporte`, `clientes_resumen`, `permisos_lista`, `conductor_pendientes`, `conductor_stats`, `dashboard_stats`, `todas_ubicaciones`, `get_candidato_electo`, `get_distritos`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `Gamification Engine`, `Admin General`, `Master` to the rest of the system?**
  _108 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Inicialización de DB y Autenticación` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Why does `init_db()` connect `Inicialización de DB y Autenticación` to `Scripts de Despliegue del Servidor`, `app.py`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `Motor de Temas de UI (party_theme.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Why does `enviar_bienvenida_cliente()` connect `Mensajería y Notificaciones` to `api_post`, `app.py`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Request` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._