# Graph Report - DIA_D_MASTER  (2026-10-16)

## Corpus Check
- 54 files · ~208,993 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 6, .css 2, .example 1)

## Summary
- 1004 nodes · 1837 edges · 180 communities (50 shown, 130 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- database.py
- get
- armar_viaje_redondo
- _autenticar_y_verificar_dueno
- DIA_D_MASTER — Auditoría Completa de APIs
- auth.js
- candidato_dashboard
- Request
- get_connection
- app.py
- log_auditoria
- normalizar_texto
- init_db
- _require_auth
- normalizar_cedula
- recuperar_password
- Dibujo de Módulo: Página de Candidato
- server.py
- Client Panel Actions
- _cliente_de_request
- candidatos_agrupados
- api_get
- alcance_por_plan
- autorizar_recogida
- Project Deployment Guide
- _alcance_geografico_cliente
- auditoria_lista
- Polling Station Sync
- Knowledge Graph Documentation
- Territorial Hierarchy Levels
- Client Management UI
- api_post
- _autenticar_unificado
- Credenciales — DIA D MASTER
- candidato_simpatia_mapa
- cargar_masivo_dirigente
- hash_password
- sqlite3
- Voting Interface Actions
- post
- Global App Styles
- Tailwind Style Generation
- Electoral Algorithm Specialist
- Role Hierarchy API
- normalizar_texto
- permisos_check
- conductor_historial
- os
- delete_pc
- cliente_dashboard
- seed_data
- gamificacion_ranking
- votante_link_ubicacion
- _check_nivel
- conductor_lista
- Planes y precios — DIA D MASTER
- cliente_pcs
- candidato_encuesta
- Credenciales — DIA D MASTER
- actividad_votantes
- estadisticas_candidatos_electos
- post
- auditoria_exportar
- get_certificacion_resumen
- cancelar_recogida
- Frontend Design
- listar_cargos_electivos
- listar_elecciones
- candidato_fotos_fans_listar
- candidato_historial
- Frontend Design
- candidato_simpatia_comparativo
- Frontend Design Plugin
- candidato_encuesta_resultados
- get_departamentos
- cliente_dashboard
- candidato_publicaciones
- candidatos_listing
- get_partido
- cliente_pc_crear
- cliente_dirigentes
- health_check
- cliente_transporte
- cliente_logistica
- conductor_historial
- cliente_logistica_autorizar
- conductor_lista
- cliente_transporte_editar
- clientes_resumen
- completar_tarea
- listar_tipos_eleccion
- mi_dashboard_resumen_candidatos
- detalle_transporte
- listar_listas_todas
- conductor_confirmar
- listar_transportes
- listar_veedores_mesa
- Logistics Documentation
- conductor_register_push
- Gamification Engine
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
- Tailwind Core Plugins
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
- Credenciales Twilio
- get_candidatos_electos
- descargar_apk
- mi_dashboard_resumen_candidatos
- stats_conductor
- tareas_lista
- roles_disponibles
- get_mesas_conteo
- listar_cargos_electivos
- listar_elecciones
- listar_listas_todas
- listar_no_voto
- listar_tipos_eleccion
- listar_transportes
- listar_ubicaciones_gps
- listar_veedores_mesa
- padron_buscar
- permisos_lista
- seccional_candidatos
- todas_ubicaciones
- conductor_ultima_ubicacion
- todas_ubicaciones
- crear_eleccion
- cliente_transporte_crear
- viajes_de_mis_votantes
- tareas_lista
- conductor_completar
- encuesta_solicitar_transporte
- dashboard_stats
- gamificacion_ranking
- get_distritos
- get_votantes_paginados
- get_candidatos_electos
- listar_no_voto
- mapa_datos_geograficos
- mesas_estado_dirigente
- mi_dashboard_dirigente_detalle
- usuarios_lista
- sesiones_lista
- votante_publico_ubicacion
- transporte_reportar_incidencia

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 216 edges
2. `normalizar_cedula()` - 90 edges
3. `normalizar_texto()` - 51 edges
4. `PartyThemeEngine` - 49 edges
5. `api_post()` - 27 edges
6. `log_auditoria()` - 22 edges
7. `init_db()` - 21 edges
8. `api_get()` - 20 edges
9. `_autenticar_unificado()` - 17 edges
10. `getSessionUser()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Estado` --references--> `_autenticar_unificado()`  [INFERRED]
  docs/CREDENCIALES_DEV.md → app.py
- `Fase 1 — Bloqueadores (impacto inmediato, 3 fixes)` --references--> `encuesta_responder()`  [INFERRED]
  docs/audit_api_completa.md → app.py
- `Fase 1: Esquema + Endpoints Core (2-3 días)` --references--> `init_db()`  [INFERRED]
  docs/diseno_modulo_candidato.md → database.py
- `Servicios identificados en el sistema` --references--> `enviar_bienvenida_cliente()`  [INFERRED]
  docs/PLANES_Y_PRECIOS.md → app.py
- `🧭 Diagnóstico de Brechas Arquitectónicas` --references--> `enviar_push()`  [INFERRED]
  docs/ROADMAP_APP_CONDUCTOR.md → app.py

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

## Communities (180 total, 130 thin omitted)

### Community 0 - "database.py"
Cohesion: 0.09
Nodes (7): clienteObservado(), credencialesAuth(), esAdminMaster(), mostrarBannerCliente(), PartyThemeEngine, sesionActual(), _usuarioSesion()

### Community 1 - "get"
Cohesion: 0.04
Nodes (26): actividad_reciente(), candidato_eventos(), candidato_lugar_votacion(), candidato_partido(), candidato_simpatia_metricas(), candidato_stream(), conductor_detalle(), conductor_historial_extendido() (+18 more)

### Community 2 - "armar_viaje_redondo"
Cohesion: 0.06
Nodes (25): armar_viaje_redondo(), completar_tramo(), conductor_ubicacion(), conductores_cercanos(), _crear_tramo(), _distancia_haversine_km(), obtener_ruta_calles(), optimizar_asignaciones() (+17 more)

### Community 3 - "_autenticar_y_verificar_dueno"
Cohesion: 0.10
Nodes (9): _autenticar_y_verificar_dueno(), _authenticate(), candidato_foto_actualizar(), candidato_fotos_fans_moderar(), candidato_fotos_fans_pendientes(), _cargar_fuente(), exportar_excel_dirigente(), parsear_archivo_dirigente() (+1 more)

### Community 4 - "DIA_D_MASTER — Auditoría Completa de APIs"
Cohesion: 0.07
Nodes (29): 2.1 Crear/Registrar (12), 2.2 Actualizar (5), 2.3 Eliminar (8), 2.4 Listar/Ver (5), 2.5 Asignar/Gestionar (9), 2.6 Buscar/Verificar (2), 2.7 Otros (32), 2. ACCIONES MUERTAS (backend tiene, frontend NO llama) — 73 (+21 more)

### Community 5 - "auth.js"
Cohesion: 0.12
Nodes (32): apiPost(), cambiarRol(), esAdmin(), esCliente(), esConductor(), esDirigente(), esPc(), getNivel() (+24 more)

### Community 7 - "Request"
Cohesion: 0.09
Nodes (11): candidato_perfil_actualizar(), cliente_dirigente_crear(), cliente_dirigente_editar(), cliente_dirigente_quitar(), cliente_pc_eliminar(), cliente_transporte_eliminar(), crear_candidato_electo(), dirigente_movilidad_actualizar() (+3 more)

### Community 9 - "app.py"
Cohesion: 0.06
Nodes (11): descargar_apk(), _detectar_base_url_default(), dirigente_movilidad(), get_partidos(), health_simple(), _km_haversine(), obtener_permisos_rol(), redirigir_votante() (+3 more)

### Community 10 - "log_auditoria"
Cohesion: 0.11
Nodes (9): crear_tarea(), log_auditoria(), permisos_asignar_multi(), sesiones_cerrar(), usuarios_asignar_rol(), usuarios_perfil(), usuarios_quitar_rol(), usuarios_toggle() (+1 more)

### Community 11 - "normalizar_texto"
Cohesion: 0.09
Nodes (13): candidato_fotos_fans_subir(), conductor_disponibilidad(), crear_cargo_electivo(), crear_gasto_transporte(), crear_lista_partido(), crear_no_voto(), crear_transporte(), crear_ubicacion_gps() (+5 more)

### Community 12 - "init_db"
Cohesion: 0.11
Nodes (8): startup(), _asignar_permisos_default(), completar_nombres_geo_padron(), ensure_padron2026_completo(), init_db(), _migrar_usuacionales_existentes(), _sembrar_permisos(), importar()

### Community 13 - "_require_auth"
Cohesion: 0.10
Nodes (13): admin_estadisticas_generales(), _check_nivel(), delete_pc(), delete_unidad(), _formatear_partido_config(), get_partido_config(), get_partido_unidades(), _nivel_index() (+5 more)

### Community 14 - "normalizar_cedula"
Cohesion: 0.17
Nodes (7): cliente_perfil(), conductor_pendientes(), eliminar_cliente(), eliminar_tarea(), eliminar_usuario(), get_solicitudes_recogida(), normalizar_cedula()

### Community 15 - "recuperar_password"
Cohesion: 0.14
Nodes (9): candidato_notificar(), enviar_bienvenida_cliente(), enviar_contacto(), enviar_email(), enviar_sms(), enviar_whatsapp(), recuperar_password(), _twilio_enviar() (+1 more)

### Community 16 - "Dibujo de Módulo: Página de Candidato"
Cohesion: 0.05
Nodes (39): 10. Notas Finales, 1. Visión General del Módulo, 2.1 `perfil_candidato`, 2.2 `preguntas_encuesta`, 2.3 `respuestas_encuesta`, 2.4 `simpatizantes`, 2.5 `historial_publicaciones`, 2.6 `eventos_en_vivo` (+31 more)

### Community 17 - "server.py"
Cohesion: 0.15
Nodes (6): candidato_exportar_excel(), candidato_exportar_pdf(), banner(), check_dependencies(), init_database(), main()

### Community 18 - "Client Panel Actions"
Cohesion: 0.13
Nodes (14): 1. ANTES de tocar código o leer archivos, 2. NUNCA leer archivos enteros sin ubicar la línea exacta primero, 3. DESPUÉS de modificar código, 4. PENDIENTES y documentación, 5. DOCUMENTOS de especificación (ROADMAP, PLANES, etc.), Comandos útiles, El problema, Estructura del grafo (+6 more)

### Community 19 - "_cliente_de_request"
Cohesion: 0.25
Nodes (4): candidato_perfil(), _cliente_de_cedula(), _cliente_de_request(), _puede_editar_candidato()

### Community 21 - "api_get"
Cohesion: 0.12
Nodes (10): api_get(), buscar_elector_padron_completo(), calcular_dhondt_custom(), _cargos_permitidos_cliente(), contar_padron_completo(), registrar_consulta_publica(), resolver_candidato_por_dominio(), row_to_dict() (+2 more)

### Community 22 - "alcance_por_plan"
Cohesion: 0.13
Nodes (8): alcance_por_plan(), _cliente_de_sesion(), _clientes_visibles(), _css_color(), _es_admin_master(), _estado_certificacion(), get_certificacion(), serve_tema_cliente()

### Community 23 - "autorizar_recogida"
Cohesion: 0.25
Nodes (4): autorizar_recogida(), conductor_asignar(), conductor_sos(), enviar_push()

### Community 24 - "Project Deployment Guide"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 25 - "_alcance_geografico_cliente"
Cohesion: 0.20
Nodes (5): _alcance_geografico_cliente(), mi_dashboard(), mi_dashboard_detalle(), mi_dashboard_encuesta(), mi_dashboard_mesa_detalle()

### Community 27 - "Polling Station Sync"
Cohesion: 0.22
Nodes (8): 1) KPIs esenciales (tarjetas superiores "semáforo"), 2) Gráficos que sirven (y para qué), 3) Tablas de respaldo (el gráfico resume, la tabla prueba), 4) Principios de diseño, 5) Datos — de dónde sale cada KPI en este proyecto, 6) Pitfalls de datos electorales en vivo, Electoral KPI Dashboard — estándar de visualización (DIA D MASTER), serve_page()

### Community 28 - "Knowledge Graph Documentation"
Cohesion: 0.22
Nodes (9): API Actividad Reciente, API Conductor Lista, API Login, API Rutas, API Solicitudes Recogida, API Transportes, API Ubicaciones, Conductor / Logística (+1 more)

### Community 29 - "Territorial Hierarchy Levels"
Cohesion: 0.31
Nodes (9): Sync CSS Processor, PostCSS Warning Logger, Sync CSS Processor Wrapper, Selector Resolver, CSS Objectifier, PostCSS JS API, CSS Property CamelCaser, CSS Parser (+1 more)

### Community 30 - "Client Management UI"
Cohesion: 0.25
Nodes (8): /api, desvincularDirigente, renderCampana, cargarPanel, loginPanel, pintarGrafico, registrarSolicitud, verificarCodigo

### Community 31 - "api_post"
Cohesion: 0.16
Nodes (10): api_post(), auditar_accion(), _certificar(), _ejecutar_desvinculo(), enviar_email_cuenta_nueva(), 1.1 `action=registrar` — ✅ NO ERA BUG (falso positivo), 1.2 `action=solicitar_recogida` — ✅ CORREGIDO, 1.3 conductor.html usa `.length` — ✅ NO ERA BUG (falso positivo) (+2 more)

### Community 32 - "_autenticar_unificado"
Cohesion: 0.12
Nodes (8): _autenticar_unificado(), _cargar_roles_unificado(), generar_session_id(), migrar_legacy_a_unificado(), _migrar_roles_legacy(), registrar_intento_login(), seguridad_estado(), verificar_bloqueo()

### Community 33 - "Credenciales — DIA D MASTER"
Cohesion: 0.33
Nodes (5): 📜 Convenciones y Reglas de Código, 🗳️ DIA D MASTER - APC Agent Guide (AGENTS.md), 🤖 Equipo de Agentes APX Configurados, graphify, 📌 Visión General del Proyecto

### Community 36 - "hash_password"
Cohesion: 0.12
Nodes (8): check_password(), default_password(), hash_password(), transporte_editar(), usuarios_cambiar_password(), usuarios_crear(), usuarios_editar(), usuarios_resetear_password()

### Community 38 - "Voting Interface Actions"
Cohesion: 0.33
Nodes (5): 📱 Despliegue en Celulares de Campo, 🗳️ DIA D MASTER - Sistema Electoral Unificado, 📂 Estructura del Proyecto, 🚀 Inicio Rápido en Windows, 👥 Roles y Credenciales Iniciales

### Community 39 - "post"
Cohesion: 0.40
Nodes (4): /veedores/mesa/:id/estado, apiFetch, syncFromBackend, syncToBackend

### Community 40 - "Global App Styles"
Cohesion: 0.40
Nodes (4): Actualización automática, Consultar (en vez de grep/read masivos), DIA_D_MASTER — grafo de conocimiento (graphify), Exclusiones (`.graphifyignore`)

### Community 41 - "Tailwind Style Generation"
Cohesion: 0.40
Nodes (5): Departamental, Dirigente, Distrital, Nacional, Seccional

### Community 42 - "Electoral Algorithm Specialist"
Cohesion: 0.40
Nodes (5): abrirActividadCliente, buscarClientes, cargarClientes, renderClienteDetalle, renderTabClientes

### Community 43 - "Role Hierarchy API"
Cohesion: 0.40
Nodes (5): Escrutinio General, Escrutinio Intendentes, Gestión Territorial Local, Sistema Electoral Unificado (Dashboard), Mesas Electorales

### Community 44 - "normalizar_texto"
Cohesion: 0.50
Nodes (4): /api/autorizar_recogida, /api/conductor/todas_ubicaciones, registrar_transporte action, Transporte Management

### Community 46 - "conductor_historial"
Cohesion: 0.67
Nodes (4): Autoprefixer, Tailwind JIT Engine, DOM Mutation Observer, Tailwind CSS CDN

### Community 47 - "os"
Cohesion: 0.50
Nodes (4): actualizarMapa, iniciarGPS, recargar, showMainApp

### Community 48 - "delete_pc"
Cohesion: 0.67
Nodes (3): confirmar_participacion action, registrar_veedor action, Veedores Management

### Community 49 - "cliente_dashboard"
Cohesion: 0.67
Nodes (3): padron action, votos action, Votación Interface

### Community 50 - "seed_data"
Cohesion: 0.15
Nodes (6): seed_candidatos_electos(), seed_data(), seed_distritos(), seed_elecciones(), seed_estructura_geografica(), seed_partidos()

### Community 52 - "votante_link_ubicacion"
Cohesion: 0.67
Nodes (3): CSS Property Value Normalizer, Tailwind Stylesheet Generator, Tailwind Context Manager

### Community 55 - "Planes y precios — DIA D MASTER"
Cohesion: 0.25
Nodes (8): Plans and Pricing, Add-on 1: Branding de campaña ("Dónde Votás" con tu marca), Add-on 2: Notificaciones (email + SMS/WhatsApp), Add-on 3: Promoción de candidato por un dirigente independiente, Plan Básico (incluido / gratuito), Planes y precios — DIA D MASTER, Próximos pasos sugeridos, Resumen de paquetes combinados (sugerido para vender más fácil)

### Community 58 - "Credenciales — DIA D MASTER"
Cohesion: 0.33
Nodes (5): Credenciales — DIA D MASTER, Cuentas (todas con contraseña = cédula + `*`), Estado, Importante: reiniciar el servidor, Política de contraseña por defecto (aplicada 2026-10-14)

### Community 61 - "post"
Cohesion: 0.07
Nodes (15): candidato_encuesta_pregunta_crear(), candidato_encuesta_pregunta_eliminar(), candidato_encuesta_responder(), candidato_evento_crear(), candidato_simpatia_eliminar(), candidato_simpatia_registrar(), eliminar_candidato(), eliminar_departamento() (+7 more)

### Community 65 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 70 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground your designs in the subject matter, More on writing in design, Process: plan, review against the brief, build, critique, Restraint and self-critique

### Community 72 - "Frontend Design Plugin"
Cohesion: 0.33
Nodes (5): Authors, Frontend Design Plugin, Learn More, Usage, What It Does

## Knowledge Gaps
- **107 isolated node(s):** `cargarUsuarios`, `guardarUsuario`, `cargarPaquetes`, `guardarPaquete`, `analizarMesas` (+102 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 528 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **130 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `get_connection` to `get`, `armar_viaje_redondo`, `_autenticar_y_verificar_dueno`, `candidato_dashboard`, `Request`, `app.py`, `log_auditoria`, `normalizar_texto`, `init_db`, `_require_auth`, `normalizar_cedula`, `recuperar_password`, `server.py`, `_cliente_de_request`, `candidatos_agrupados`, `api_get`, `alcance_por_plan`, `autorizar_recogida`, `_alcance_geografico_cliente`, `auditoria_lista`, `api_post`, `_autenticar_unificado`, `candidato_simpatia_mapa`, `cargar_masivo_dirigente`, `hash_password`, `permisos_check`, `seed_data`, `cliente_pcs`, `candidato_encuesta`, `actividad_votantes`, `estadisticas_candidatos_electos`, `post`, `auditoria_exportar`, `get_certificacion_resumen`, `cancelar_recogida`, `listar_cargos_electivos`, `listar_elecciones`, `candidato_fotos_fans_listar`, `candidato_historial`, `candidato_simpatia_comparativo`, `candidato_encuesta_resultados`, `get_departamentos`, `cliente_dashboard`, `candidato_publicaciones`, `candidatos_listing`, `get_partido`, `cliente_pc_crear`, `cliente_dirigentes`, `health_check`, `cliente_transporte`, `cliente_logistica`, `conductor_historial`, `cliente_logistica_autorizar`, `conductor_lista`, `cliente_transporte_editar`, `clientes_resumen`, `completar_tarea`, `listar_tipos_eleccion`, `mi_dashboard_resumen_candidatos`, `detalle_transporte`, `listar_listas_todas`, `conductor_confirmar`, `listar_transportes`, `listar_veedores_mesa`, `conductor_register_push`, `conductor_ultima_ubicacion`, `todas_ubicaciones`, `crear_eleccion`, `cliente_transporte_crear`, `viajes_de_mis_votantes`, `tareas_lista`, `conductor_completar`, `encuesta_solicitar_transporte`, `dashboard_stats`, `gamificacion_ranking`, `get_distritos`, `get_votantes_paginados`, `get_candidatos_electos`, `listar_no_voto`, `mapa_datos_geograficos`, `mesas_estado_dirigente`, `mi_dashboard_dirigente_detalle`, `usuarios_lista`, `sesiones_lista`, `votante_publico_ubicacion`, `transporte_reportar_incidencia`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **What connects `cargarUsuarios`, `guardarUsuario`, `cargarPaquetes` to the rest of the system?**
  _107 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `database.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Why does `init_db()` connect `init_db` to `get_connection`, `app.py`, `Dibujo de Módulo: Página de Candidato`, `server.py`, `seed_data`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `get` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Why does `1.4 🔴 NUEVO CRÍTICO: candidato.html enviaba 3 acciones inexistentes al dispatcher` connect `api_post` to `auth.js`, `Request`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `armar_viaje_redondo` be split into smaller, more focused modules?**
  _Cohesion score 0.06401137980085349 - nodes in this community are weakly interconnected._