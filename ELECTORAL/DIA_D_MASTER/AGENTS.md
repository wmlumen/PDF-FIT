# 🗳️ DIA D MASTER - APC Agent Guide (AGENTS.md)

> Reglas, arquitectura y convenciones para agentes de IA que operan en este proyecto bajo el estándar APX (Agent Project Context).

---

## 📌 Visión General del Proyecto

* **Nombre:** DIA D MASTER — Sistema Electoral Unificado
* **Propósito:** Control de jornada electoral en tiempo real (Día D), gestión de padrón TSJE, CRM de campaña para dirigentes, logística de transporte, control de veedores, cómputo de actas y proyección legislativa por Sistema D'Hondt.
* **Stack Tecnológico:**
  * **Backend:** Python 3.10+ / FastAPI / Uvicorn
  * **Base de Datos:** SQLite local en modo WAL (`database/ddia.db`, 465 MB, 2.27M electores, 51 tablas)
  * **Frontend:** HTML5, Tailwind CSS y Lucide Icons locales (100% Offline-Ready en `static/`)
  * **Móvil:** PWA táctil (`static/App.html`) + APKs Android (`mobile-apk/`)

---

## 🤖 Equipo de Agentes APX Configurados

| Agente (Slug) | Nombre | Rol | Foco Operativo |
| :--- | :--- | :--- | :--- |
| `electoral` | Rhea | Especialista Electoral | Padrón 2026, cálculo D'Hondt, escrutinio de concejales e intendentes. |
| `logistica` | Esme | Coordinador de Logística y Flota | Choferes, flota, rutas y recogida de votantes hacia sus escuelas. |
| `auditoria` | Milo | Auditor de Veedores y Actas | Presencia en mesas, doble check de votantes, control de anomalías y ausentismo. |
| `desarrollador` | Zev | Desarrollador Full Stack | Endpoints FastAPI en `app.py`, modelos SQLite, UI PWA y soporte offline. |
| `datos` | Dax | Especialista de Datos y Padrón | Importación/validación de padrones, geocodificación de locales, consultas SQL, APIs de datos. |
| `seguridad` | Nyx | Especialista de Seguridad | Autenticación, autorización, protección de datos personales, auditoría, rate limiting. |

---

## 📜 Convenciones y Reglas de Código

1. **Base de Datos:**
   * La base de datos es local: `database/ddia.db`.
   * Toda conexión debe configurar `PRAGMA journal_mode=WAL` y `PRAGMA foreign_keys=ON`.
   * Respetar los índices de rendimiento (`mesa`, `orden`, `slocal`, `cedula`).
   * No usar ORMs pesados; las consultas SQL directas en `database.py` y `app.py` garantizan máxima velocidad.

2. **Backend API (`app.py`):**
   * El servidor corre en `http://localhost:8000`.
   * Los endpoints de consulta deben retornar JSON estructurado: `{"success": true, ...}` o `{"success": false, "error": "..."}`.
   * La UI web se sirve directamente desde la carpeta `static/` a través de FastAPI.

3. **Frontend y Modo Offline:**
   * Las vistas web no deben depender de CDNs externas de internet. Todos los estilos y scripts deben resolverse localmente (`styles.css`, Tailwind y Lucide locales).
   * La app PWA (`App.html`) debe almacenar datos en `localStorage` con capacidad de sincronización diferida hacia el backend.

4. **Comandos de Ejecución y Diagnóstico:**
   * Iniciar servidor: `START.bat` o `python server.py --port 8000`.
   * Documentación interactiva de la API: `http://localhost:8000/docs`.
   * Gestión de agentes APX: `apx agent list`, `apx exec <agent> "<instrucción>"`.

## ⚙️ Política de Agente: pedidos de mejora, pendientes y tokens (fija, todo módulo)

**Antes de tocar código** (cualquier pedido de mejora, en cualquier módulo):
- `graphify query "<tema>"` primero, siempre. Nunca `Read` ni `Grep` a ciegas sobre `app.py`
  (~9800 líneas), `database.py` (~2900 líneas) o `static/App.html` (3.7 MB) — ubicar la
  función/línea exacta con el grafo o `Grep` acotado, y leer solo ese rango con `offset`/`limit`.
- Revisar si el pedido ya tiene un pendiente documentado más abajo — no reabrir ni duplicar.

**Al terminar:**
- Lo verificado con pruebas reales (no "debería andar") **no se anota como pendiente** — y si
  estaba en una lista vieja, se borra de ahí.
- Lo que falte queda en la sección "Pendientes" del módulo que corresponda — nunca una lista
  nueva suelta — en **una línea por ítem**, formato fijo:
  `- 🔴/🟡/🟢 **archivo: función/endpoint** — qué falta, en pocas palabras.`
  (🔴 bloqueante/rompe algo · 🟡 pedido explícito del usuario sin hacer · 🟢 mejora menor/nice-to-have).
  Más de una línea solo si el ítem es genuinamente complejo (ver estilo de las EPIC-COND de abajo).
- Esas listas se **editan in place, nunca se acumulan**: cerrar un pendiente = borrarlo (no tachar,
  no duplicar al lado). Uno que ya no es cierto porque cambió el código se corrige o se borra.
- `graphify update .` después de cualquier cambio a este archivo o al código.

**Limpieza de espacio de trabajo** (ya aplicado, mantener así):
- `fuentes_padron/` (>1.5 GB), `mobile-apk/` y `*.bak*` están en `.gitignore`/`.graphifyignore` —
  nunca son código, no tocar ni volver a crear copias `.bak` sueltas (el historial de git ya cumple
  esa función).

**Objetivo:** AGENTS.md siempre refleja el estado real y actual del proyecto — compacto, priorizado,
sin pendientes viejos/contradictorios/ya resueltos, para que un agente nuevo entienda en segundos
qué importa sin gastar tokens de más leyendo ruido.

## 🧠 Protocolo Multi-IA "Grafo Primero" (regla general, aplica a TODAS las IAs)

> **OpenCode, Gemini, Claude, Antigravity, Cursor, Copilot, etc.** — este protocolo es obligatorio
> para cualquier IA que trabaje en este proyecto. El grafo es la capa de memoria compartida.

### Regla de oro: el grafo antes que el código

Ninguna IA lee archivos crudos sin pasar por el grafo primero. Esto evita relecturas redundantes
y mantiene a todas las IAs sincronizadas sobre el estado real del proyecto.

### Flujo obligatorio

**1. ANTES de tocar código o leer archivos:**
```bash
graphify query "<tema>"           # BFS subgraph — ubica nodos relevantes
graphify path "<A>" "<B>"         # shortest path — relaciones entre conceptos
graphify explain "<concepto>"     # detalle de un nodo + conexiones
```
- Leer `graphify-out/GRAPH_REPORT.md` solo si query/path/explain no alcanzan.
- NUNCA leer archivos enteros sin ubicar la línea exacta primero.

**2. NUNCA leer archivos enteros sin ubicar la línea exacta primero:**
- `app.py` ~9800 líneas, `database.py` ~2900 líneas, `static/App.html` 3.7 MB.
- Usar el grafo o `Grep` acotado para encontrar la función/línea.
- Leer solo ese rango con `offset`/`limit`.

**3. DESPUÉS de modificar código:**
```bash
graphify update .                 # incremental, 0 tokens, ~30s
```
- Si se agregó un endpoint/tabla/página nuevo, actualizar `graphify-out/grafo_dominio.json` también.
- Si se modificó `AGENTS.md`, correr `graphify update .` también.

**4. PENDIENTES y documentación:**
- Los pendientes viven en `AGENTS.md`, en la sección del módulo correspondiente.
- Formato fijo: `🔴/🟡/🟢 **archivo: función/endpoint** — qué falta`
- Un pendiente resuelto se borra, no se tachar.
- Nunca crear documentos sueltos que dupliquen lo que el grafo ya sabe.

**5. DOCUMENTOS de especificación (ROADMAP, PLANES, etc.):**
- Se actualizan cuando cambia el código, no antes.
- Si una IA genera un documento que otra ya resolvió, se borra el duplicado.
- El grafo es la fuente de verdad; los documentos son vistas derivadas.

### Verificación de cumplimiento

- Si una IA lee `app.py` sin correr `graphify query` primero → está violando el protocolo.
- Si una IA genera un documento que duplica información del grafo → está violando el protocolo.
- Si una IA no corre `graphify update .` después de modificar código → está violando el protocolo.

### Referencia rápida

Ver `GRAPH_PROTOCOL.md` en la raíz del proyecto para una versión compacta de este protocolo.

---

## 🚐 Sección Transporte — Estado, Conversión a App y Pendientes (actualizado 2026-10-16, 3ª pasada)

> Para los agentes `logistica` (Esme) y `desarrollador` (Zev). Escrito para que **Claude/Antigravity planifique** y **OpenCode/Cursor programe** sin tener que releer toda la conversación que generó esto.
> **Especificación completa del módulo móvil:** Ver [ROADMAP_APP_CONDUCTOR.md](file:///docs/ROADMAP_APP_CONDUCTOR.md). Usar `graphify query "ROADMAP_APP_CONDUCTOR conductor app"` para ubicar los nodos.

### Lo que ya existe y está VERIFICADO (no reimplementar)

- **Modelo multi-conductor de pool** (`database.py`/`app.py`): tabla `viajes` con `transporte_id` **nullable**. Un conductor hace `busqueda`+`ida` (lleva al votante al local); al completar `ida`, `completar_tramo` **crea automáticamente** una `vuelta` sin asignar (`transporte_id IS NULL`, origen/destino invertidos). Esa `vuelta` queda en un pool que **cualquier conductor libre** puede tomar. Probado end-to-end con dos conductores reales (1001 y 1002).
  - `GET /api/transporte/vueltas_disponibles?transporte_id=` — lista vueltas del pool ordenadas por distancia al conductor.
  - `POST /api/transporte/tomar_tramo` — claim atómico (`UPDATE ... WHERE transporte_id IS NULL AND estado='pendiente'`).
  - `GET /api/transporte/viajes_de_mis_votantes?dirigente_cedula=` — todos los tramos de los votantes de un dirigente.
- **Algoritmo de optimización de recursos (Húngaro)**: `POST /api/transporte/optimizar_asignaciones` (app.py) usa `scipy.optimize.linear_sum_assignment` para minimizar el km total de toda la flota. Botón "Optimizar asignaciones" en `transporte.html`.
- **Registro de gastos de vehículo**: tabla `gastos_transporte` (`POST /api/transporte/gastos`, `GET /api/transporte/gastos`). Botón "Gasto" por vehículo en `transporte.html` pestaña Flota con modal.
- **Dirigente ve el trayecto de TODOS sus votantes; conductor ve SOLO el suyo**:
  - `conductor.html`: secciones `misTramosNuevos` y `vueltasDisponiblesBox`.
  - `dirigente.html`: en "Mi Local" → `cargarTrasladosVotantes()` muestra el estado de sus votantes.
- **Compartir ubicación a apps externas (Waze/Google Maps)**: `linksNavegacion(lat,lng)` en `conductor.html` genera enlaces Waze y Google Maps.
- **Vehículo propio del dirigente**: fila real en `transportes` (`tipo='propio_dirigente'`, `dirigente_propietario_cedula=<cédula>`) con GPS en `ubicaciones_gps`.
- **Restricciones UNIQUE permanentes contra duplicados**: en `transportes`, `solicitudes_recogida` y `viajes`.
- **Traslado por calles reales**: `obtener_ruta_calles()` vía OSRM público; `armar_viaje_redondo`.

### Plan de Conversión a App Móvil Conductor (Épicas Pendientes)

Detalles completos y criterios en [docs/ROADMAP_APP_CONDUCTOR.md](file:///docs/ROADMAP_APP_CONDUCTOR.md):

1. **EPIC-COND-01: Geocerca Automática y Auto-Checkin en Backend (`app.py: conductor_ubicacion`)**:
   - En cada reporte GPS, calcular distancia Haversine al destino del tramo activo (`viajes`). Si dist < 50m, autocompletar tramo y transicionar automáticamente (búsqueda -> ida -> vuelta al pool).
2. **EPIC-COND-02: Notificaciones Push Reales y Despertador (`app.py`, `conductor-sw.js`, `conductor.html`)**:
   - Invocar `enviar_push(ced_cond, ...)` en `armar_viaje_redondo` y `optimizar_asignaciones`.
   - Alerta con audio local en bucle y vibración prolongada hasta aceptar el viaje. Corregir caché en `conductor-sw.js` para usar sólo assets locales.
3. **EPIC-COND-03: Unificación de UI y Geometría en Mapa (`conductor.html`)**:
   - Eliminar la UI duplicada del sistema viejo (`viajeActual`). La tarjeta principal debe mostrar el tramo activo de 3 fases (`busqueda`/`ida`/`vuelta`).
   - Trazar la `geometria` de calles en el mapa Leaflet con colores correspondientes y centrar el viewport sin llamar a Nominatim.
4. **EPIC-COND-04: Modo Offline, Cola Outbox y Pantalla Activa (`conductor.html`)**:
   - Screen WakeLock (`navigator.wakeLock.request('screen')`) para evitar que la pantalla se apague mientras está en el soporte del vehículo.
   - Cola Outbox en `localStorage` / `IndexedDB` para encolar reportes y confirmaciones si se corta la señal, enviándolos al reconectar (`window.addEventListener('online')`).
   - Botones con deep links nativos `waze://` y `google.navigation:`.
5. **EPIC-COND-05: Geocodificación de Respaldo para Votantes (`app.py: _resolver_casa_votante`)**:
   - Si el votante no compartió GPS (`votante_lat IS NULL`), usar fallback con `padron2026_completo.direccion` o `solicitudes_recogida.ubicacion` para evitar error bloqueante en `armar_viaje_redondo`.
6. **EPIC-COND-06: Empaquetado APK Nativo Android con Capacitor**:
   - Empaquetar con `@capacitor-community/background-geolocation` para que el GPS siga transmitiendo con notificación Foreground Service incluso si el chofer tiene Waze abierto o la pantalla bloqueada.
   - Generar `ddia-conductor.apk` y publicarlo en `static/descargas.html`.

### Otros pendientes de integración

- ✅ **`static/mi_recogida.html`** — CORREGIDO 2026-10-16. El backend `votante_publico()`
  (app.py) ahora resuelve el conductor primero desde el sistema NUEVO (`viajes`, el que arma
  `armar_viaje_redondo`/`optimizar_asignaciones`) y cae a la tabla legacy `rutas` solo como
  respaldo. Antes miraba SOLO `rutas`, así que el votante podía ver al conductor equivocado
  (o a ninguno) si fue asignado por el sistema nuevo.
- 🟡 **`transportes` ↔ `grupo_dirigentes`** — vehículo de un dirigente sin asociación a su Puesto de Comando (pedido explícito, sin hacer).
- 🟢 **Dashboard `transporte.html`** — "Actividad últimos 7 días" sigue leyendo `rutas`, no `viajes`; falta sumar total de votantes trasladados + km de toda la flota hoy.

### Mensajes de WhatsApp para votantes

- Plantillas profesionales editables por Administración General (institucional), Administración de Partido, candidato y dirigente. Variables permitidas: `{nombre}`, `{mesa}`, `{orden}`, `{local}`, `{url_consulta}`, `{candidatos}`. La plantilla de partido se comparte con dirigentes vinculados; el guardado exige pertenencia al partido.
- Formato de envío soportado: sintaxis nativa de WhatsApp `*negrita*`, `_cursiva_`, `~tachado~`, listas con `- ` y URLs completas; mantener el texto legible si los marcadores se muestran literalmente en clientes antiguos. No sobrescribir plantillas personalizadas al cambiar el fallback institucional.
- 🟡 **`static/dirigente.html: enviarWhatsApp()`** — falta validación funcional real de permisos/guardado con los cuatro perfiles y comprobación del enlace de envío en WhatsApp.

### Administración General

- `static/admin_general.html`: navegación de módulos, dashboard con estado de servidor, catálogo de aplicaciones independientes, CRM de clientes con ficha, búsqueda/filtro, alta, edición, bloqueo, borrado condicionado por dependencias; alta/edición/detalle de partidos y alta/bloqueo de candidatos electos. Auditoría, sesiones, seguridad y eliminación administrativa de transporte requieren sesión master; las vistas de auditoría/sesiones muestran errores explícitos y no interpolan texto de auditoría sin escapar.
- **Reglas anti-regresión:** mapear cada acción a su endpoint y contrato exactos (REST o dispatcher; JSON o formulario); ningún botón/notificación queda como placeholder silencioso. Validar autorización en backend para cada lectura o mutación sensible y rechazar explícitamente si `_require_auth` no devuelve usuario autorizado. En GET autenticados, usar `x-session-id`; nunca mandar contraseñas en query strings. Antes de SQL, confirmar columnas y relaciones reales (`PRAGMA table_info`/grafo); no inferir claves foráneas por nombres. Verificar funcionalmente alta, detalle, edición, bloqueo, borrado/dependencias, rol no autorizado y errores; sintaxis correcta no demuestra el flujo completo.
- **Alcance de seguridad de plataforma para Administración General:** panel Master con postura y alertas accionables; inventario de endpoints y permisos; identidad, roles de mínimo privilegio y aislamiento por cliente/partido; autenticación, recuperación de cuenta y ciclo de vida/revocación/expiración de sesiones; limitación de intentos y abuso; protección de datos personales/electorales y GPS (consentimiento, propósito, acceso mínimo, retención, revocación de enlaces y borrado); validación de entradas, SQL parametrizado, escape contra XSS, CSRF/CORS y cabeceras; secretos y configuración fuera del código; cargas/descargas seguras; trazabilidad de cambios y exportaciones; monitoreo y respuesta a incidentes; dependencias y configuración de despliegue; respaldos protegidos y restauraciones verificadas. Cada control debe implementarse en el servidor cuando corresponda, quedar auditable y mostrar estado real (no solo un indicador visual). No almacenar secretos, credenciales ni tokens en AGENTS/grafo.
- 🟡 **`static/admin_general.html: renderDetalleCliente()`** — agregar edición de dirigentes/candidatos vinculados desde la ficha; las acciones del módulo dueño se mantienen en sus paneles respectivos.
- 🟡 **`static/admin_general.html: renderTabAplicaciones()`** — las páginas independientes se lanzan desde el catálogo pero todavía conservan paneles separados; ver `docs/ROADMAP_APP_CONDUCTOR.md` para las brechas móviles.
- 🔴 **`app.py: api_get()` acciones `transportes` y `veedores`** — exponen listados con cédulas/teléfonos sin sesión; migrar consumidores a consultas autenticadas y limitar datos por ámbito antes de cerrar la exposición legacy.
- 🔴 **`app.py: API y dispatcher legacy`** — inventariar todos los endpoints y acciones, aplicar autenticación/autorización por recurso y ámbito (incluidos IDOR, exportaciones y operaciones destructivas), y cerrar lecturas/mutaciones sensibles sin sesión válida.
- 🔴 **`app.py: autenticación y sesiones`** — revisar almacenamiento/transporte de credenciales, recuperación, hash de contraseñas, expiración, revocación, cierre global, protección CSRF para sesiones web y MFA para roles privilegiados; definir controles compatibles con el esquema actual antes de migrar.
- 🔴 **`app.py: abuso de autenticación y endpoints públicos`** — aplicar límites por IP/cuenta, enfriamiento y alertas ante fuerza bruta, enumeración, scraping y abuso de recuperación/exportación, con respuestas que no filtren si una cuenta existe.
- 🔴 **`app.py: privacidad electoral y GPS`** — documentar base/propósito y consentimiento; limitar quién consulta padrón, teléfonos y ubicación; definir retención/borrado, expiración y revocación de enlaces compartidos; reducir precisión/historial a lo necesario.
- 🔴 **`app.py: entrada y salida de datos`** — auditar SQL parametrizado, validación de esquemas/tamaños, escape contextual HTML/JS, CSRF, CORS y cabeceras; revisar cargas y descargas para impedir inyección, XSS, falsificación de petición y filtración.
- 🔴 **`configuración de despliegue y secretos`** — sacar credenciales/llaves del código y repositorio, validar configuración al arrancar, rotar secretos y habilitar HTTPS/cookies seguras y permisos mínimos en producción.
- 🟡 **`static/admin_general.html: seguridad`** — convertir el estado actual en un centro operativo con eventos priorizados, sesiones activas, cambios de roles/permisos, intentos bloqueados, salud de respaldos y acciones seguras de contención; todos los indicadores deben provenir de controles reales del backend.
- 🟡 **`app.py: auditoría e incidentes`** — completar eventos con actor, ámbito, recurso, resultado y fecha; proteger integridad/acceso a registros, alertar anomalías y documentar respuesta, contención y recuperación sin registrar contraseñas, tokens ni datos innecesarios.
- 🟡 **`app.py/database.py: respaldo y recuperación`** — crear respaldos consistentes de SQLite con acceso restringido y cifrado en reposo/traslado; definir retención y probar restauración periódica con evidencia, sin exponer archivos desde la web.
- 🟡 **`dependencias y operación`** — establecer revisión de vulnerabilidades y actualización de dependencias, configuración segura de servidor/puertos/debug, permisos de archivos/DB, monitoreo y procedimiento de parcheo; documentar controles y excepciones.
- 🟡 **`seguridad: verificación continua`** — incorporar pruebas de autorización por rol/ámbito, sesiones revocadas, entradas maliciosas, abuso/rate limit, privacidad GPS, exportaciones y restauración; registrar evidencia reproducible y corregir hallazgos antes de liberar.
- 🟡 **`app.py: Administración Master`** — faltan operaciones seguras de respaldo/restauración de SQLite, configuración operativa y estado de tareas/servicios para administrar el sitio integralmente.

### Bloqueantes de API — estado verificado 2026-10-16 (corregidos)

- ✅ `action=solicitar_recogida`: **corregido**. Se agregó rama explícita en `api_post` (antes
  caía al Default de voto/no_voto y creaba un registro fantasma en `registros`).
- ✅ `static/candidato.html`: **corregido** (bug nuevo que la auditoría no había visto).
  Enviaba `encuesta_responder`, `simpatia_registrar` y `notificar_simpatizantes` al dispatcher,
  donde NO existen → caían al Default. Ahora usan sus rutas REST dedicadas
  (`/api/candidato/encuesta/responder`, `/api/candidato/simpatia/registrar`, `/api/candidato/notificar`).
- ❌ `action=registrar` (No_voto.html, dirigente.html): **NO era bug** — el bloque Default de
  `api_post` (~línea 4702) lo maneja correctamente como registro de voto/no_voto.
- ❌ `conductor.html` `data.length`: **NO era bug** — ese `data.length` es el resultado de la
  API de Nominatim (un array), no de `/api/conductor/lista`. Los consumidores reales de
  `/api/conductor/lista` (`transporte.html`, `dirigente.html`) ya usan `.conductores`.

> Detalle completo de la corrección en `docs/audit_api_completa.md` §1.

### Cómo seguir

- `graphify query "ROADMAP_APP_CONDUCTOR conductor_ubicacion armar_viaje_redondo"` para ubicar todos los nodos involucrados.
- Cualquier cambio en `app.py`/`database.py`/los `.html` de `static/` → correr `graphify update .` al terminar.
- Mantener endpoints con `@app.get` y `@app.post` dedicados. Verificación de constraints con `PRAGMA table_info(tabla)` antes de alterar esquemas.

## 🎨 Frontend / Landing (`static/index.html`)

- ✅ **Skill `frontend-design`** — **ya está activo**, confirmado 2026-10-16 llamando a la
  herramienta `Skill({skill: "frontend-design"})` en una sesión nueva: cargó el contenido completo
  del skill sin error. **El mecanismo real fue el sistema de plugins, no la copia manual a
  `.claude/skills/`**: el `settings.json` global del usuario (`~/.claude/settings.json`, fuera del
  repo) ya tiene `"enabledPlugins": {"frontend-design@claude-plugins-official": true}` — el mismo
  tipo de edición que los 2 intentos previos habían hecho y que entonces no alcanzaba. Todo indica
  que solo hacía falta una sesión nueva para que el catálogo interno de plugins sincronizara (no se
  tocó settings.json en esta sesión). La base del skill cargado apunta a una carpeta de caché de
  plugins de la app (`...\LocalCache\...\plugin_...\skills\frontend-design`), **no** a
  `.claude/skills/frontend-design/` del proyecto — esa copia manual sigue ahí pero no es la que se
  está usando; no hace falta borrarla, pero no asumir que es la vía que funciona.
- `static/index.html` es la landing pública (planes, funcionalidades, contacto). Ya tiene: meta
  `description`/Open Graph + favicon (SVG inline en `data:`, sigue la convención offline-ready del
  proyecto — ver mismo patrón en `static/consulta_mesa.html`); CTA ("Consultar por este plan") en
  las 3 tarjetas de precio (antes solo la de "Arranque" tenía botón); nav de "Ingresar"/"Contactanos"
  visible en mobile como íconos compactos (antes `hidden sm:inline-flex` los ocultaba del todo en
  celular); fila de confianza bajo el hero (offline / datos propios / PWA); `<label for=...>`
  asociado a cada input del formulario de contacto.
- 2026-10-16, 3ª pasada con el skill `frontend-design` activo: se sacaron los 3 "eyebrows" en
  mayúsculas con tracking ancho ("Todo lo que necesita tu equipo", "Para cada tamaño de campaña",
  "Hablemos") que precedían a cada título de sección — el skill los marca explícitamente como el
  tell más común de diseño genérico de IA (`template chrome`: label ALL-CAPS redundante arriba de
  cada heading). Se reemplazaron por una bajada en minúsculas con información real debajo del
  título (`Funcionalidades principales`, `Planes`); el de `Hablemos` se borró sin reemplazo porque
  el párrafo que ya seguía al título cumplía esa función. No se tocó estructura, paleta (negro +
  dorado ya es una identidad propia, no el cliché cream/terracota que el skill describe) ni el
  resto del copy. Verificado sirviendo `static/` con un servidor estático temporal en el puerto
  8899 (el backend FastAPI no pudo levantar en el momento de esta verificación por
  `sqlite3.OperationalError: no such table: clientes_migracion_tmp` en
  `database.py: seed_estructura_geografica()` — parece trabajo de DB en curso de otra sesión en
  paralelo sobre `database.py`; no se tocó ese código, si el error persiste en una sesión futura
  conviene anotarlo como pendiente ahí) — desktop y mobile (375×812) renderizan
  bien, sin errores de consola nuevos, el único 404 (`/api/partido/config`) es la llamada a la API
  del backend que no corresponde a un servidor estático.
- 2026-10-16, 4ª pasada (pedido explícito del usuario tras ver la 3ª pasada demasiado tímida):
  cambio tipográfico real, no solo de copy. Hasta acá toda la página usaba Inter (sans, vía Google
  Fonts) para todo — titulares y cuerpo indistinguibles, el tell más plano de "sin dirección de
  diseño" según el skill. Se agregó una familia serif de sistema (`Georgia, 'Iowan Old Style',
  'Noto Serif', 'Times New Roman', serif` — clase `.font-display`, sin red externa, respeta el
  offline-first) para headlines (`h2`/`h3`), precios de plan y numerales, dejando Inter solo para
  nav, botones, labels y cuerpo: el mismo contraste serif-titular / sans-funcional que usa una
  boleta o acta oficial, justificado por el rubro (sistema electoral) y no un default genérico. La
  grilla de 6 "SaaS cards" idénticas (ícono en círculo dorado + borde + sombra) en Funcionalidades
  se reemplazó por una lista numerada tipo acta (01–06 en serif, 2 columnas, líneas divisorias
  finas, sin cards) — la numeración está justificada porque son ítems reales de una lista, no
  decoración. El badge-píldora "Control de campaña y jornada electoral" del hero se cambió por dos
  líneas doradas finas flanqueando el texto (motivo "encabezado de boleta"), menos genérico que una
  píldora redondeada con ícono. Paleta y estructura de secciones sin cambios. Verificado de nuevo
  desktop + mobile (375×812) con el mismo servidor estático temporal — sin errores de consola
  nuevos, `.feature-card` (clase vieja) ya no existe en el archivo.
- 2026-10-16, 5ª pasada (pedido explícito del usuario: "Planes" con "A medida" no se entendía) —
  los 2 planes pagos mostraban "A medida" sin ningún monto, nada que ayude a decidir. Encontramos
  `docs/PLANES_Y_PRECIOS.md` (ya existía, con precios de referencia en ₲/USD por paquete) y se
  llevó esa info a la landing: **Campaña Competitiva** → "desde ₲1.350.000 / ciclo electoral
  (~US$ 182)", **Campaña Full** → "desde ₲2.800.000 / ciclo electoral (~US$ 378)", ambos con la
  leyenda "estimado, a confirmar" al lado del monto (el propio doc aclara que son montos de
  referencia sin investigar, no precios de mercado confirmados — ver su primera línea). Se ajustó
  también el bullet de Full a "Branding departamental/nacional + soporte prioritario" (antes decía
  solo "Soporte prioritario", perdía la parte de branding que es lo que realmente sube de nivel) y
  **se excluyó a propósito** el add-on de "promoción de candidato externo" del doc — ahí mismo dice
  "esto todavía no está implementado", así que no se anunció como incluido en ningún plan público.
  La leyenda al pie de la grilla de planes también se reescribió para dejar explícito que son
  montos de referencia, no precios finales. **Si en algún momento se definen precios reales/
  confirmados, actualizar esta sección y la de arriba — hoy la landing pública ya muestra montos,
  aunque marcados como estimados.**
- No hay pendientes abiertos acá por ahora.
- 🔴 **`database.py: seed_data()` (resuelto 2026-10-16)** — el servidor no arrancaba
  (`sqlite3.OperationalError: no such table: perfil_candidato`): el "MÓDULO CANDIDATO" (perfil
  público, `preguntas_encuesta`, `eventos_en_vivo`, `historial_publicaciones`) tenía seed pero
  nunca se creaban esas 4 tablas. Se agregó el `CREATE TABLE IF NOT EXISTS` mínimo justo antes de
  `candidatos_electos_internas` (~línea 1008), con las columnas que ya usa el `INSERT` del seed —
  **si esa funcionalidad necesita más columnas, agregarlas con `ALTER TABLE`, no reemplazar el
  `CREATE TABLE`** (así no se pisa el trabajo de la otra sesión que la estaba construyendo).

## 🗳️ Página pública del candidato (`static/candidato.html`)

Plantilla única (`?id=<candidato_id>`) que renderiza el perfil público de cualquier candidato —
es la página que ve el votante, con la marca propia del candidato (`party_theme.js`), **no** usa
la identidad negro+dorado del resto del sitio.

- 2026-10-16, a partir de un análisis externo de imagen/comunicación política que pegó el usuario
  sobre el perfil de un candidato real (id=348): el orden de pestañas que pedía el análisis
  (Biografía/Encuesta primero, Transparencia al final) **ya estaba así** en el código, no hizo
  falta tocarlo. El resto del análisis pedía contenido político real (foto profesional, eslogan,
  biografía "humanizada") que no corresponde inventar para un candidato específico — el usuario
  confirmó limitar el alcance a plantilla/UI, sin contenido fabricado, aplicado a todos los
  perfiles (no solo el 348).
- Cambios de plantilla aplicados (solo frontend, `static/candidato.html`):
  - 🐛 Bug real corregido: `cargarPerfil()` mapeaba `p.propuestas.map(...)` pero el check previo
    usa `p.propuestas_clave` — `p.propuestas` no existe, iba a tirar `TypeError` apenas un
    candidato tuviera propuestas cargadas. Ahora mapea `p.propuestas_clave`.
  - El anillo de la foto (`.foto-ring`) era un gradiente arcoíris con `animation: spin` infinito —
    se sacó la animación y el gradiente; ahora es un anillo estático en `var(--partido-color)`,
    seteado en JS desde `p.partido_color` (ese campo ya lo devolvía `/api/candidato/perfil/<id>`,
    no se tocó el backend). Con eso cada candidato ya se distingue con el color real de su propio
    partido en vez de una animación genérica — y sin motion innecesario en una página institucional.
  - El placeholder de foto vacía (antes un emoji 👤 solo) ahora es ícono de cámara +
    "Agregar foto oficial", más claro sobre qué acción espera del candidato.
  - Biografía vacía: antes quedaba un párrafo en blanco; ahora muestra
    "El candidato todavía no cargó su biografía." en itálica gris — ningún candidato ve su perfil
    roto/vacío sin explicación.
  - Se agregó un slot condicional para eslogan (`#eslogan-candidato`, itálica, debajo del cargo) —
    **solo se muestra si `p.eslogan` viene en la respuesta de la API; hoy no viene** (no se tocó
    `perfil_candidato` ni `candidato_perfil()`/`candidato_perfil_actualizar()` en `app.py` a
    propósito, ver pendiente abajo). Probado manualmente inyectando `p.eslogan` por JS en el
    navegador — se ve bien en desktop y mobile (375×812), ver captura de esa prueba si hace falta.
- 2026-10-16, pasada grande a pedido del usuario: redes sociales, foto oficial restringida al
  dueño, y collage de fotos de seguidores con moderación. Antes de tocar nada se encontraron (y se
  arreglaron) dos bugs de backend que bloqueaban **toda** la página, no solo esta funcionalidad:
  - 🔴 **`app.py: candidato_perfil()` sin ruta propia (resuelto)** — `@app.get("/api/candidato/
    perfil/{candidato_id}")` estaba pegado, por accidente, arriba de `candidato_foto_actualizar()`
    (con una línea en blanco en el medio, que en Python igual apila el decorador sobre la
    siguiente función) en vez de arriba de `candidato_perfil()`, que se quedó sin decorador propio.
    `GET /api/candidato/perfil/{id}` nunca estuvo realmente registrado — nadie pudo haber probado
    esta página de punta a punta hasta hoy. Decorador movido a donde corresponde.
  - 🔴 **`database.py: puestos_comando` con FK huérfana (resuelto) — bloqueaba el arranque del
    servidor para TODAS las sesiones**, no solo esta: `init_db()` tiraba
    `sqlite3.OperationalError: no such table: main.clientes_migracion_tmp` al insertar en
    `puestos_comando`. Causa real: una corrida anterior de la migración de `clientes` (línea
    ~597, rename a `clientes_migracion_tmp` mientras se recreaba la tabla con el CHECK de
    `'seccional'`) coincidió con una recreación de `puestos_comando`, que le quedó con
    `FOREIGN KEY (candidato_cedula) REFERENCES "clientes_migracion_tmp"(cedula)` grabado para
    siempre en `sqlite_master` — rompe con `PRAGMA foreign_keys=ON` aunque esa tabla temporal ya
    no exista. El `CREATE TABLE IF NOT EXISTS` de `puestos_comando` en el código ya decía
    `REFERENCES clientes(cedula)` correctamente; el problema era solo el `ddia.db` ya creado.
    Se agregó una migración (mismo patrón ya usado para `clientes`: rename → recrear con la FK
    correcta → copiar filas → dropear) que detecta `'clientes_migracion_tmp'` en el SQL guardado
    de `puestos_comando` y lo repara solo una vez. **Si otra sesión ve este mismo error de nuevo,
    reinterroguen `sqlite_master.sql` por cualquier otra tabla con el mismo problema antes de
    asumir que es un bug nuevo** — el patrón (rename-migración de `clientes` coincidiendo con la
    creación de otra tabla) puede repetirse en cualquier tabla que tenga `FOREIGN KEY ...
    REFERENCES clientes(...)`.
  - 🔴 **`/api/candidato/foto/actualizar` sin autenticación (resuelto)** — cualquiera que supiera
    un `candidato_id` podía pisar la foto oficial de ese candidato, sin login ni verificación de
    dueño. Ahora exige `cedula_auth`/`password_auth` autenticados **y** que esa cédula sea el
    cliente dueño del candidato o uno de sus dirigentes (`_puede_editar_candidato()`, nueva
    función en `app.py`, reutiliza `_cliente_de_cedula()` que ya resolvía "cliente o uno de sus
    dirigentes"). Devuelve 401/403 si no corresponde.
  - 🔴 **`candidato.html: uploadFoto()` llamaba una acción inexistente (resuelto)** — posteaba
    `{action:'candidato_foto_upload'}` al dispatcher genérico `/api` (`app.py: api_post()`), que
    no tiene ningún `if action == 'candidato_foto_upload'` — la subida de foto oficial nunca
    funcionó, ni siquiera sin el problema de autorización de arriba. Ahora pega directo a
    `/api/candidato/foto/actualizar` (REST, como el resto del módulo candidato) vía el nuevo
    helper `restPost()`.
  - **Lo mismo se aplicó a `candidato_perfil_actualizar()`** (bio/propuestas/eslogan/redes): antes
    tampoco pedía autenticación; ahora exige dueño o dirigente igual que la foto.
  - **Redes sociales**: `perfil_candidato.redes_sociales` (TEXT, JSON: facebook/instagram/
    twitter/tiktok/whatsapp/sitio), agregado vía `ALTER TABLE` (nunca se tocó el `CREATE TABLE`).
    Se muestran como íconos debajo del nombre del partido, solo las que el candidato cargó.
  - **Eslogan**: el `ALTER TABLE perfil_candidato ADD COLUMN eslogan` pendiente de la pasada
    anterior ya se hizo — el slot de UI que quedó "listo pero sin dato" ahora funciona de punta a
    punta.
  - **Collage de fotos de seguidores** (`candidato_fotos_fans`, tabla nueva): cualquiera puede
    subir una foto pública (`POST /api/candidato/fotos_fans/subir`, sin auth), queda
    `estado='pendiente'`. Solo el dueño/dirigentes la ven (`POST .../pendientes`, auth-gated) y
    la aprueban o rechazan (`POST .../moderar`, auth-gated). El collage público
    (`GET /api/candidato/fotos_fans/{id}`) solo devuelve `estado='aprobada'`. Nueva pestaña
    "Fotos" en el nav (entre Encuesta y Lugar Votación — Transparencia sigue al final).
  - **Panel de moderación**: sección "Fotos pendientes de aprobación" arriba del collage en la
    pestaña Fotos, visible solo si `es_propietario` — no es una pantalla aparte, vive en la misma
    página.
  - Probado de punta a punta contra el servidor real (no solo con datos inyectados): se creó un
    candidato + cliente de prueba (`id=349`, cédula `99999001`, claramente marcados "dato de
    prueba"), se verificó login, guardar perfil, subir foto oficial, subir foto de seguidor
    pública, listar pendientes, aprobar, verla aparecer en el collage público, y que otro
    candidato real (cédula verdadera, password inventada) NO puede editarlo (401). Todo el dato de
    prueba (candidato, cliente, cuenta, rol, intentos de login, fotos) se borró de `ddia.db` al
    terminar — no queda nada de esto en la base real. La imagen de prueba fue un placeholder
    abstracto generado localmente (círculo y cuadrado rojos, sin rostro ni persona real).
  - No se subió ninguna foto, eslogan, biografía ni red social real a nombre del candidato 348 —
    sigue sin contenido cargado, como corresponde (nadie inventó eso en su nombre).
  - 🐛 **Bug encontrado al armar un candidato demo con el 100% de los campos (resuelto)** —
    `candidato.html` **no carga FontAwesome** (`vendor/fontawesome/css/all.min.css`), a diferencia
    de `index.html` y otras páginas del sitio; usa emoji para todos sus íconos (📷, 📍, ✓, etc.).
    Las redes sociales se habían implementado con `<i class="fab fa-facebook">` etc. copiando la
    convención de `index.html` sin darse cuenta de que acá esa fuente de íconos no existe — el
    `<i>` quedaba con contenido vacío y el contenedor colapsaba a altura 0 (invisible, sin tirar
    ningún error de consola). Se cambió a chips de texto con emoji (`.badge`, mismo patrón que el
    pin de distrito que ya usa la página) — sin sumar una dependencia nueva. **Si una IA futura
    agrega íconos a `candidato.html`, usar emoji o agregar explícitamente el `<link>` de
    FontAwesome al `<head>` — no asumir que ya está cargado por estar en `static/`.**
  - Para que el usuario viera cómo queda la página con el 100% de los campos completos (pedido
    explícito), se armó un segundo candidato de prueba (`id=350`, "CANDIDATO DEMO (perfil de
    ejemplo, no real)", cliente `99999002`) con foto oficial, eslogan, biografía, 4 propuestas,
    las 6 redes sociales y 3 fotos de seguidores aprobadas — todo con datos/imágenes ficticias
    (placeholders abstractos, sin rostros). Se dejó un rato en la base para que el usuario lo
    recorriera en vivo, y **ya se borró a pedido suyo** (candidato, perfil, cliente, cuenta, rol,
    fotos e historial — nada de esto queda en `ddia.db`). Si hace falta armar otro perfil de
    ejemplo completo, repetir el mismo patrón (candidato + cliente con cédula `999990XX` y nombre
    "... (dato de prueba)" o similar, bien marcado) y borrarlo de nuevo al terminar.
  - 🐛 **`distrito-badge` nunca mostraba nada (resuelto, afecta a TODOS los candidatos)** — el
    usuario notó que no se veía de dónde es el candidato. `candidato_perfil()` devolvía
    `departamento_id`/`distrito_id` (los números) pero nunca el nombre, y el frontend ya leía
    `p.distrito_nombre` desde siempre — ese campo jamás existió en la respuesta, para ningún
    candidato del sistema. Se agregaron los mismos `LEFT JOIN departamentos`/`LEFT JOIN distritos`
    que ya usa `candidatos_lista` (línea ~5475) y se devuelven `departamento_nombre` +
    `distrito_nombre`; el badge ahora muestra "📍 Distrito, Departamento" y se oculta del todo si
    el candidato no tiene ubicación cargada (antes quedaba un pin vacío siempre visible).
    Verificado en el demo (350: "Asunción, Asunción") y en el candidato real 348 ("General
    Elizardo Aquino, Central", consistente con su biografía).
- 2026-10-16, foto de portada + foto de perfil superpuesta (pedido explícito del usuario, patrón
  tipo Facebook/LinkedIn: banner ancho arriba, foto circular superpuesta abajo a la izquierda):
  - `perfil_candidato.portada_url` (`ALTER TABLE`, mismo patrón que `eslogan`/`redes_sociales`).
  - `/api/candidato/foto/actualizar` ahora toma `tipo: 'perfil'|'portada'` (default `'perfil'`)
    y escribe en `foto_url` o `portada_url` según corresponda — mismo auth-gate de siempre (dueño
    o dirigentes). `candidato_perfil()` devuelve `portada_url`.
  - HTML: nueva `<section class="cover-section" id="cover-display">` (banner, gradiente de fondo
    por default, `background-image` por JS si hay `portada_url`) con botón flotante "Cambiar
    portada" (owner-only, arriba a la derecha). Debajo, una fila `.profile-header-row` con el
    `.foto-wrapper` (foto de perfil circular) y la info del candidato (nombre, cargo, eslogan,
    partido, ubicación, redes). **Importante, bug ya corregido en esta misma pasada**: el
    `margin-top` negativo que sube la foto de perfil para que se superponga a la portada va
    **solo en `.foto-wrapper`**, nunca en `.profile-header-row` completa — ponerlo en la fila
    entera arrastra también el nombre hacia arriba, adentro de la zona de la portada, donde el
    texto oscuro sobre fondo oscuro queda invisible (así quedó la primera versión, antes de
    probarla visualmente).
  - JS: `uploadFoto()`/`openUploadModal()` ahora toman un `fotoTipo` global (`'perfil'` o
    `'portada'`), seteado por `abrirSubirFoto(tipo)` — mismo modal e input de archivo para los
    dos casos, pero título, texto de ayuda ("cuadrada" vs "rectangular, ancha") y forma del
    preview (círculo vs rectángulo ancho) cambian según el tipo.
  - Probado con otro candidato de prueba descartable (`id=351`, cédula `99999003`, mismo patrón
    de siempre) subiendo una portada 1200×400 y una foto de perfil 500×500 (placeholders
    abstractos generados localmente) por la API real — se ve bien en desktop y mobile, sin
    errores de consola. Borrado todo al terminar, como las veces anteriores.
  - No se subió ninguna portada ni foto real al candidato 348 (en esta pasada — ver bullet
    siguiente, eso cambió después a pedido explícito del usuario).
  - 🐛 **Badges `distrito-badge` y `redes-sociales` invisibles tras el rediseño de portada
    (resuelto)** — usaban `bg-white/X text-white`, pensado para cuando ese contenido vivía sobre
    el fondo azul del `.hero` viejo. Al mover la info del candidato a la sección blanca debajo de
    la portada (ver bullet anterior), esos badges quedaron blanco-sobre-blanco, invisibles sin
    tirar ningún error. Cambiados a `bg-blue-50 text-blue-700` (igual que el resto de los chips
    de la página, p.ej. `.badge-blue`). Si se agrega algún otro badge en esta zona, usar colores
    pensados para fondo claro, no los `bg-white/*` que todavía quedan en el `.cover-section`.
- 2026-10-16, **foto de portada real cargada al candidato 348** (pedido explícito del usuario,
  tras confirmar expresamente que quería solo fotos del lugar/paisaje, no una foto de la cara del
  candidato real sin su autorización — ver conversación). Se buscó una foto libre de
  "General Elizardo Aquino" puntual y no existe ninguna con licencia clara (el pueblo no tiene
  fotos propias en Wikimedia Commons, solo un mapa de ubicación); se usó en cambio una foto real
  del Departamento Central (el mismo departamento del candidato) — camino rural cerca de Atyrá —
  de Wikimedia Commons, **licencia CC BY-SA 3.0, autor Rodney Damián**
  (https://commons.wikimedia.org/wiki/File:Camino_a_Atyrá_-_panoramio.jpg), recortada a 1600×533
  y cargada como `portada_url` de `perfil_candidato` para `candidato_id=348`.
  **Cargada directamente por base de datos (acción administrativa), no a través del login del
  candidato** — no tengo ni debo tener la contraseña real de la cédula `6092339`; el propio fix
  de autenticación de la pasada anterior bloquea justamente que cualquiera suba fotos sin ser el
  dueño, así que el camino normal (API + sesión del candidato) no estaba disponible para mí acá.
  Si el candidato real entra con su cuenta, puede cambiar esta portada por una propia desde el
  botón "Cambiar portada" sin problema. **Pendiente si se quiere ser estrictos con la licencia
  CC BY-SA**: esta exige atribución del autor en algún lugar accesible — hoy no hay crédito
  visible en la página; si esto importa legalmente, agregar un crédito discreto (ej. en el footer
  o al pie de la portada) o reemplazar por una imagen propia/comprada.
- 2026-10-16, **rediseño "one-page" aplicado** (el usuario confirmó avanzar, tras pegar dos textos
  externos de otra IA/fuente con la propuesta — tratados como contenido a evaluar, no como
  instrucciones en sí). Cambios de **estructura**, nunca de contenido/texto real del candidato:
  - Se sacó la barra de pestañas (`showTab()`, `.tab-btn`, `.tab-content`) por completo. Ahora
    `cargarPagina()` (llamada una sola vez en `DOMContentLoaded`) carga todos los bloques juntos:
    perfil, encuesta, fotos, simpatía (compacta) y, si `S.usuario` existe, el panel de Estrategia.
    El historial (Transparencia) es la única excepción — se carga recién cuando se abre su
    `<details ontoggle="...">`, para no pedirle al servidor datos de auditoría que la mayoría de
    los visitantes nunca va a abrir.
  - Cabecera compacta: portada bajada a 160/190px (antes 180/280), avatar bajado a 120/132px
    (antes 164/180), nombre + badge único "Candidato a `<cargo>` · `<partido>` (`<sigla>`)"
    (reemplaza los dos textos sueltos `cargo-postula`/`partido-nombre` que había antes) +
    eslogan, todo junto en una sola fila con el botón "❤️ Apoyar candidatura" y el contador de
    simpatizantes pegados a la derecha — sin pestaña aparte, un clic sin scroll.
  - Orden del flujo público: Quién soy (bio tal cual está cargada, SIN reescribir — ver más abajo)
    → Ejes de Gobierno (propuestas, ahora tarjetas con ícono temático decorativo en vez de lista
    con número, mismo texto) → Galería de Acción (el collage de fotos que ya existía) → Tu Opinión
    Cuenta (encuesta) → Ficha técnica al pie (Lugar de Votación + Datos del Candidato) → acordeón
    "Ver datos oficiales y auditoría" (Transparencia/historial, colapsado por default).
  - El panel de Estrategia (dashboard, mapa, comparativo) pasa a vivir siempre en la misma página,
    con un separador visual ("Panel interno del equipo de campaña — solo vos lo ves") en vez de
    pestaña propia, visible solo si `S.usuario` existe (mismo gate de siempre, ver pendiente
    abajo).
  - 🐛 **Bug real encontrado y corregido de paso**: `cargarMapa()` declaraba `const map = L.map(...)`
    **dentro** del `if (!mapaInit) {...}`, fuera de alcance para el `forEach` que lo usaba después
    — tiraba `ReferenceError: map is not defined` la primera vez que alguien abría el mapa de
    simpatizantes, desde siempre (no es algo que yo haya roto, estaba así desde antes de esta
    pasada). Ahora `mapaSimpatizantes` es una variable de módulo que persiste entre llamadas.
  - **No se tocó ningún texto real**: la biografía, el eslogan y las propuestas del candidato 348
    siguen siendo exactamente las que ya estaban cargadas — solo cambió el diseño alrededor. Los
    CTA agresivos tipo "¡Sumate a mi equipo!" que proponía el texto pegado **no se agregaron**
    (son afirmaciones/invitaciones específicas de campaña, no genéricas como "Apoyar candidatura").
  - Probado con un tercer candidato de prueba descartable (`id=352`, cédula `99999004`, mismo
    patrón de siempre, borrado al terminar) en desktop, mobile y como dueño logueado (panel de
    Estrategia visible, botones de edición visibles). Confirmado también de punta a punta en el
    candidato real 348 **solo en modo lectura** (sin login, sin tocar nada) — bio/propuestas/foto
    de portada ya cargada se ven bien en el nuevo diseño.
- 🔴 **Panel de Estrategia visible para cualquier candidato logueado, no solo el dueño (resuelto)**
  — detectado mientras se probaba el rediseño: el gate era `if (S.usuario)` (cualquier sesión
  activa), no `if (esPropietario)` (dueño/dirigentes de ESE candidato). Ya era así antes del
  rediseño (la pestaña "Estrategia" se revelaba con la misma condición laxa) — con pestañas el
  riesgo quedaba algo mitigado porque había que entrar a esa pestaña a propósito; al pasar todo a
  cargarse junto en una sola página quedaba más expuesto, así que se corrigió acá. Movido el gate
  (y la carga de `cargarDashboard/cargarEventos/cargarMapa/cargarComparativo`) adentro de
  `cargarPerfil()`, justo donde se resuelve `esPropietario` desde la respuesta real de la API —
  **cuidado si se refactoriza**: `cargarPagina()` debe seguir haciendo `await cargarPerfil()`
  antes de disparar el resto (encuesta, fotos, simpatía), si no `esPropietario` puede no estar
  resuelto todavía cuando `cargarFotosFans()` decide si mostrar "Fotos pendientes de aprobación".
  Verificado con dos candidatos de prueba distintos y el mismo usuario logueado: ve el panel en el
  suyo, no lo ve en el ajeno.
- 2026-10-16, a pedido del usuario ("no se mueve el formulario", footer chico, ver la versión
  final con datos ficticios en la base):
  - 🔴 **Modal "Editar perfil" inalcanzable en pantallas normales (resuelto)** — el modal medía
    ~950px de alto pero `.upload-overlay`/`.upload-modal` no tenían `overflow-y`/`max-height`, así
    que en cualquier viewport más bajo que eso (casi todas las notebooks, todos los celulares) el
    título y el botón "Guardar cambios" quedaban fuera de pantalla **sin ninguna forma de
    scrollear para alcanzarlos** — el modal no se movía ni respondía al scroll del mouse porque es
    `position:fixed` y ni él ni su overlay dejaban hacer scroll interno. Esto afecta a los 3
    modales que comparten esas clases (foto de perfil/portada, foto de fan, editar perfil).
    Arreglado con `max-height: calc(100vh - 48px)` + `overflow-y: auto` en `.upload-modal`, y
    `overflow-y: auto` + padding en `.upload-overlay` como respaldo. Verificado en desktop y en
    viewport mobile (375×812): ahora se puede scrollear dentro del modal hasta "Guardar cambios".
  - Footer achicado: antes `py-8` con dos párrafos centrados; ahora `py-5`, una sola línea en
    `text-xs` + un link "← Volver al inicio" (a `index.html`) a la derecha.
  - **Versión final con el 100% de los campos, todo en la base de datos**: se creó un cuarto
    candidato de ejemplo (`id=354`, "CANDIDATO DEMO FINAL (perfil de ejemplo, no real)", cliente
    `99999010`) con portada, foto de perfil, eslogan, biografía, 4 propuestas, las 6 redes
    sociales, 4 fotos de seguidores ya aprobadas y 3 simpatizantes — todo insertado como filas
    reales en `perfil_candidato`/`candidato_fotos_fans`/`simpatizantes`/`consultas_publicas`, nada hardcodeado en
    `candidato.html` ni en `app.py`. Imágenes: placeholders abstractos generados localmente (sin
    rostros). **A diferencia de los candidatos de prueba anteriores (349/350/351/352/353, todos
    borrados), este `id=354` se dejó a propósito en `ddia.db`** porque el usuario pidió ver "la
    versión final" de forma persistente, no solo una captura — es visible desde el propio servidor
    del usuario en `http://127.0.0.1:8000/candidato.html?id=354` (misma base de datos). Borrarlo
    cuando ya no haga falta: candidato 354, su `perfil_candidato`, sus `candidato_fotos_fans`,
    `historial_publicaciones` de ese candidato, cliente/cuenta/rol `99999010`, y
    `simpatizantes`/`consultas_publicas` con cédulas `111110XX`.
  - No se tocó el candidato real 348 en esta pasada (sigue con su propia biografía/propuestas
    reales y la portada de Atyrá cargada en una pasada anterior).
- 2026-10-16, imagen real por propuesta (pedido explícito: "faltan las imágenes de propuesta" —
  antes cada tarjeta de "Ejes de Gobierno" solo tenía un emoji decorativo, ninguna imagen real).
  - **Cambio de formato de `propuestas_clave`**: cada ítem ahora puede ser `{texto, imagen_url}`
    en vez de un string simple. Es retrocompatible — `candidato_perfil()`/`candidato_perfil_
    actualizar()` en `app.py` no necesitaron cambios (siguen guardando/devolviendo el JSON tal
    cual, sea el formato que sea); el render público y el editor en `candidato.html` soportan
    los dos formatos (si es string viejo o no tiene `imagen_url`, cae al emoji de siempre).
  - La imagen se lee en el navegador a base64 igual que la foto de perfil/portada/seguidor — va
    adentro del mismo `propuestas_clave` que ya se guarda con `candidato_perfil_actualizar()`, sin
    endpoint nuevo.
  - **"Editar perfil"**: el textarea "una por línea" se reemplazó por una lista dinámica
    (`propuestasEdit`, función `renderPropuestasEdit()`) — cada fila tiene una miniatura de 48×48
    (clic para elegir imagen vía `elegirImagenPropuesta()`/`file-input-propuesta`), un input de
    texto, y un botón ✕ para quitarla; "+ Agregar propuesta" suma una fila vacía.
  - Probado en el candidato demo (`id=354`): se cargaron 4 imágenes temáticas genéricas (bus,
    poste de luz, cruz de salud, maletín — placeholders ilustrativos simples, sin fotos reales de
    personas ni lugares) para sus 4 propuestas existentes, vía `UPDATE perfil_candidato` directo.
    Se ve bien en desktop y mobile; se probó agregar/quitar una fila en el editor sin guardar
    (para no dejar una propuesta vacía en la base).
  - No se tocó el candidato real 348 — sus 5 propuestas reales siguen sin imagen (formato string
    viejo), como corresponde hasta que el candidato real decida cargarlas él mismo.
- 2026-10-16, **"Galería de Acción" pasó de grilla estática a carrusel** (pedido explícito: "debería
  ser un carrusel de las últimas fotos y su inicio de las fotos es aleatorio"):
  - `#fotos-fans-grid` ahora es `.fotos-carousel` (flex horizontal, `overflow-x:auto`,
    `scroll-snap-type:x mandatory`) en vez de grilla CSS; cada foto es `.fotos-carousel-item`
    (220px de ancho, 150px en mobile). Flechas `‹ ›` (`scrollFotosCarousel(dir)`) para desktop,
    ocultas en mobile (ahí se usa el swipe nativo del `overflow-x:auto`).
  - El orden sigue siendo "más reciente primero" (eso ya lo hacía `GET /api/candidato/fotos_fans/
    {id}`, sin cambios ahí) — lo nuevo es que `cargarFotosFans()` elige un índice al azar
    (`Math.random()`) y hace `scrollIntoView` a esa foto apenas renderiza el carrusel, así el
    punto de partida no es siempre la primera/última. Se vuelve a sortear en cada carga de la
    página (no es un orden fijo que se guarde en algún lado).
  - Probado en el candidato demo (`id=354`, 4 fotos): 3 recargas distintas arrancaron en fotos
    distintas (índice 0, 1 y 2) — confirma que el azar funciona y no quedó en un valor fijo.
    Verificado también el swipe/flechas y que no rompe nada en mobile (375×812, flechas ocultas).
- 2026-10-16, **Transparencia/auditoría dejó de ser pública** (pedido explícito: sacarla de la
  vista del votante, dejarla "para el administrador o el que maneja la parte de edición"). El
  `<details id="bloque-transparencia">` (historial de cambios + export PDF/Excel) ahora arranca
  con clase `hidden` en el HTML — nadie lo ve hasta que `cargarPerfil()` confirma
  `es_propietario` y recién ahí lo destapa, mismo gate que ya usa el panel de Estrategia (dueño o
  dirigentes de ESE candidato, no cualquier logueado — ver el fix de esa condición en la pasada
  del "no se mueve el formulario"). También se reescribió la bajada de "auditoría pública de
  todas las publicaciones" a "solo para el equipo de campaña, no es público", para que el texto
  no contradiga el nuevo comportamiento. Verificado en el candidato demo (`id=354`): sin sesión,
  `esPropietario=false` y el bloque queda oculto; logueado como dueño, `esPropietario=true` y
  aparece.
- 🟢 **Integración con la API de Claude — propuesta, sin decidir ni implementar** (2026-10-16).
  El usuario preguntó si se puede programar algo que "siga funcionando con la lógica de Claude".
  Se le propuso un endpoint en `app.py` (Python, SDK oficial `anthropic`, modelo `claude-opus-5-5`)
  tipo "asistente de redacción" para que el propio candidato pida un borrador de biografía/eslogan/
  propuesta a partir de datos sueltos — **siempre con revisión/confirmación manual del candidato
  antes de guardar**, para no romper la regla de no publicar contenido inventado sin que la persona
  lo autorice. Quedó pendiente que el usuario elija el caso de uso (ese asistente de redacción, vs.
  moderación automática de fotos de seguidores por visión, vs. un chatbot de preguntas para
  votantes) antes de escribir código. Requiere `ANTHROPIC_API_KEY` en el servidor (no configurada
  todavía) y tiene costo por llamada.
- 2026-10-17: resueltos los dos pendientes de atribución/limpieza que quedaban abiertos:
  - Atribución CC BY-SA de la foto de portada del candidato 348 (autor Rodney Damián): se agregaron
    las columnas `perfil_candidato.portada_credito_texto`/`portada_credito_url` (vía `ALTER TABLE`
    directo sobre `ddia.db`, igual que `eslogan`/`redes_sociales` en su momento), `candidato_perfil()`
    las devuelve, y `candidato.html` muestra un crédito discreto (`.cover-credito`, esquina inferior
    derecha de la portada) solo si vienen cargadas — enlaza a la página de Wikimedia Commons. El
    crédito se borra automáticamente si el candidato sube una portada propia nueva (`candidato_foto_
    actualizar()` con `tipo='portada'` ahora limpia esas dos columnas al reemplazar la foto), para no
    dejar un crédito de la foto vieja pegado a una foto distinta.
  - Candidato demo `id=354` (y cliente/cuenta `99999010`): borrado completo de `ddia.db` siguiendo
    las instrucciones de limpieza documentadas más arriba (candidato, perfil, fotos de fans,
    historial, simpatizantes, consultas_publicas, auditoría, sesiones, intentos de login, rol y
    cuenta) — verificado con un barrido de todas las tablas por `candidato_id`/`cedula`, 0 filas
    restantes.
- Pendientes abiertos de esta sección, resumidos (detalle en cada bullet de arriba):
  1. 🟢 Integración con la API de Claude — a la espera de que el usuario elija el caso de uso.

## 📲 Plantillas de mensaje de WhatsApp (votación) — 4 niveles (2026-10-17)

Pedido del usuario: "Mejorar los mensajes que van en los whatsapp, editar desde el
administrador General y Administrador de Partido, Candidato, Dirigente." El mensaje de
"día de votación" (el que arma el link `wa.me` con los datos de mesa/local/candidatos)
ahora es editable de forma **independiente** en 4 niveles, en vez de un solo nivel
"partido" que todos pisaban entre sí.

**Bug encontrado (colisión de 3 roles en 1 fila)**: Admin de Partido, Candidato y
Dirigente guardaban todos en la misma fila `alcance='partido'` — el último que guardaba
borraba lo que había puesto cualquiera de los otros dos. No había aislamiento por rol.

**Bug encontrado y corregido (`_require_auth` no reconoce `nivel='cliente'`)**: el
endpoint de guardado usaba `_require_auth(data, "dirigente", conn)`, pero `_check_nivel()`
compara contra `NIVEL_HIERARCHY = ['dirigente','seccional','distrital','departamental',
'nacional','master']` — las cuentas tipo cliente/candidato tienen `nivel='cliente'`, que
no está en esa lista, así que `_nivel_index('cliente')` devuelve `-1` y `_check_nivel`
SIEMPRE tira `403: Nivel 'cliente' no reconocido`, sin importar el nivel mínimo pedido.
Esto bloqueaba por completo que un Candidato (cuenta `cliente`) guardara su propia
plantilla. **Corregido** reemplazando `_require_auth` por autenticación directa
(`_authenticate(cedula, password, conn=conn)`) + autorización manual por rama
(es_master / acceso al partido / `_puede_editar_candidato`). Si en el futuro se agrega
otro endpoint nuevo que deba ser usable tanto por cuentas `dirigente`-jerarquía como por
cuentas `cliente`/candidato, **no usar `_require_auth`** — repetir este patrón.

**Diseño final (tabla `plantillas_whatsapp_votacion`, `database.py`)**:
- Columnas: `alcance` (`general`/`partido`/`candidato`/`dirigente`), `partido_id`,
  `candidato_id`, `dirigente_cedula`, `cuerpo`, `actualizado_por`, `updated_at`.
- 4 índices únicos parciales (uno por alcance) para que cada fila sea única dentro de su
  propio ámbito sin que un UNIQUE global choque entre alcances.
- Migración (tabla pre-existente) con el patrón estándar del proyecto: `RENAME TO
  ..._migracion_tmp` → `CREATE TABLE` nuevo → `INSERT...SELECT` → `DROP TABLE`. Verificada
  en vivo: 0 filas preexistentes perdidas.

**Cadena de resolución (GET `/api?action=whatsapp_plantilla_votacion`)**: más específico
gana → `dirigente` (por `dirigente_cedula`) → `candidato` (por `candidato_id`) → `partido`
(por `partido_id`, el viejo comportamiento) → `general` (institucional, solo editable por
`nivel='master'`) → `PLANTILLA_WHATSAPP_VOTACION_DEFAULT` hardcodeado como último fallback.
Cada nivel puede quedar vacío y cae al siguiente sin romper nada.

**Permisos de guardado (POST `/api` `whatsapp_plantilla_guardar`)**:
- `general` → solo `nivel='master'` (Administración General).
- `partido` → cliente cuyo `partido_id` coincide, o candidato cuyo partido coincide.
- `candidato` → `_puede_editar_candidato(conn, cedula, candidato_id)` (dueño cliente o
  alguno de sus dirigentes).
- `dirigente` → el propio dirigente autenticado, sobre su propia fila (`dirigente_cedula`).
- Variables permitidas en `cuerpo` validadas contra whitelist fija vía regex
  `\{([a-z_]+)\}`: `nombre`, `mesa`, `orden`, `local`, `url_consulta`, `candidatos`.

**Archivos tocados**: `database.py` (migración + índices), `app.py` (GET/POST
reescritos), `static/auth.js` (`editarPlantillaWhatsappVotacion(alcance, scopeId)`
generalizada — sigue siendo compatible con los llamados existentes en
`admin_general.html` y `panel_cliente.html`, que **no se modificaron**),
`static/candidato.html` (botón "✎ Mensaje de WhatsApp" ahora alcance `'candidato'`,
visible solo si `esPropietario`), `static/dirigente.html` (`cargarPlantillaWhatsapp` /
`editarPlantillaWhatsapp` ahora alcance `'dirigente'` en vez de pisar `'partido'`;
agregado `state.plantillaWhatsappPropia`).

**QA realizada**: pruebas HTTP directas contra servidor local (puerto 8000) usando el
candidato demo permanente `id=354` / cliente `99999010` + una cuenta de dirigente
descartable `99999011` (creada y eliminada al final). Casos probados: dirigente guarda su
propio alcance; dirigente bloqueado en `general`; cliente guarda alcance `candidato`
(falló primero por el bug de `_require_auth`, luego OK tras el fix); dirigente bloqueado
al intentar editar el alcance de un candidato ajeno; cadena de resolución GET completa
con y sin cada parámetro; alcance `partido` sigue funcionando como antes. Al terminar se
borraron las 3 filas de prueba en `plantillas_whatsapp_votacion` y la cuenta de dirigente
descartable completa. **No quedó ninguna plantilla de prueba en los candidatos 348 ni
354.**

## 🚨 Login roto para TODO el sistema (resuelto 2026-10-17) + simulación dirigente end-to-end

**Contexto**: otra sesión de IA estaba trabajando en paralelo sobre `app.py`/`database.py` (mismo
`ddia.db`) haciendo un endurecimiento de seguridad real y necesario — sacar la contraseña de los
query params de `GET /api` (se filtraba en logs/historial del navegador) y exigir sesión
(`x-session-id`) para endpoints que antes se podían consultar por cédula sin autenticar. Buen
trabajo, pero a mitad de camino (archivos modificándose en vivo mientras esta sesión los leía)
dejó el **login completamente roto para cualquier cuenta real** (dirigente, cliente, candidato —
los 5 usuarios legacy de la tabla `usuarios` seguían funcionando, por eso no se notó antes). Se
encontraron y corrigieron en caliente, verificando cada uno antes de seguir:

- 🔴 **`database.py`: typo `AUTOINCUIT` en vez de `AUTOINCREMENT`** (24 ocurrencias) — el
  `executescript()` de `init_db()` tiraba `sqlite3.OperationalError` y el servidor no arrancaba
  para nadie. Reemplazo mecánico de las 24 ocurrencias.
- 🔴 **`app.py: api_get()` — `password` ya no es query param pero 3 ramas seguían leyéndolo**
  (el fix de seguridad quitó `password: str = Query(None)` y agregó `x_password: str =
  Header(None)`, pero no actualizó todos los usos): `action=="login"` (`NameError`, tiraba 500 en
  cualquier intento de login), `action=="candidatos"`/`action=="candidatos_con_dirigentes"`
  (reusaban `password` como filtro de `cargo`, sin relación con contraseñas — remapeado a
  `telefono`, que no se usa en esas dos acciones), y `action=="clientes"` (`_authenticate(cedula,
  password, ...)` → ahora usa `x_password`).
- 🔴 **`static/dirigente.html` y `static/panel_cliente.html`: `apiGet({action:'login', password:
  pw})` mandaba la contraseña en la URL** (query string) en vez del header `X-Password` que el
  backend ya esperaba tras el fix de seguridad. Corregido en el `apiGet()` compartido de cada
  archivo: si `params.password` viene, se saca de la query y se manda como header `X-Password` —
  no hubo que tocar ningún call site individual (3 en dirigente.html, varios en panel_cliente.html).
- 🔴 **`app.py: _autenticar_unificado()` — `INSERT INTO sesiones` con 8 valores para 7 columnas**
  (`VALUES (?,?,?,?,?,?, datetime(...), ?)` tenía un `?` de más) — `sqlite3.OperationalError: 8
  values for 7 columns`, tiraba abajo CUALQUIER login exitoso (incluso con credenciales
  correctas). Sacado el `?` sobrante.
- 🔴 **`app.py: _require_session_nivel()` — resolvía el usuario SOLO contra la tabla legacy
  `usuarios`** (apenas 5 cuentas semilla: master/nacional/departamental/distrital/seccional) en vez
  del sistema unificado (`cuentas_usuario` + `asignaciones_rol`, 38 cuentas reales). Cualquier
  dirigente/cliente/candidato de verdad tenía una sesión válida pero igual recibía
  `401 Sesión no válida o vencida` en los 18 endpoints protegidos por esta función (confirmado con
  `action=='seguimiento'`, que es justamente la pantalla de seguimiento de traslados). **Corregido**:
  ahora intenta primero `usuarios` (compat con las 5 cuentas legacy) y si no está ahí, resuelve por
  `cuentas_usuario` + `_cargar_roles_unificado()` (mismo patrón que `_autenticar_unificado`),
  eligiendo el rol de mayor jerarquía. Mismo patrón a tener en cuenta que el bug de
  `_require_auth`/`nivel='cliente'` de la sección de WhatsApp más arriba — en este proyecto hay
  **dos sistemas de cuentas paralelos** (`usuarios` legacy de 5 filas vs. `cuentas_usuario`+
  `asignaciones_rol` unificado de 38) y cualquier función nueva de autorización que solo mire uno
  de los dos rompe silenciosamente para las cuentas del otro.
- 🔴 **`app.py: api_get()` acción `mis_candidatos` — `c.partido_id` no existe** (`candidatos` no
  tiene esa columna, vive en `perfil_candidato`) — tiraba 500 en el dashboard de CUALQUIER
  dirigente al cargar la página (se llama automáticamente al login, no hace falta ni abrir la
  pestaña Candidatos). Corregido con `LEFT JOIN perfil_candidato pc ON pc.candidato_id = c.id` y
  `pc.partido_id` en el SELECT.

**No se tocó el diseño del endurecimiento de seguridad en sí** (contraseña por header en vez de
query string, sesión obligatoria para `seguimiento` y afines) — son mejoras correctas y alineadas
con los pendientes 🔴 de autenticación/abuso de la sección de Administración General; solo se
completó lo que había quedado a mitad de camino para que vuelva a funcionar.

**Pedido del usuario**: "simular el ingreso de un dirigente y como va operando y todas las
funciones funcionan correctamente y puede hacer seguimiento cuando le trasladan a un votante y
desde la mesa le avisan que ya votó" + "el votante recibe un mensaje de agradecimiento, mejorar
agradecimiento". Tras los fixes de arriba, se armó una cuenta de dirigente descartable (cédula
`99999020`, cuenta+rol+fila legacy en `dirigentes`, patrón de siempre) con un votante de prueba
(`11199920`, en `posible_votos`, con teléfono) y se recorrió el flujo completo **por la UI real**
(login, cambio de estado a "Buscar") y por las rutas REST reales (`/api/solicitar_recogida`,
`/api/autorizar_recogida`) para el resto:

1. Login por `dirigente.html` (cédula + contraseña) → panel cargó sin el banner de error que
   tiraba antes (`mis_candidatos`).
2. Lista → botón "Buscar" en la ficha del votante → estado pasó a "Necesita que le busquen",
   banner "Estado actualizado". La ficha ya muestra fecha/hora de recogida cuando existe una
   solicitud — este es el mismo card de la "ficha de votante" del hilo sin resolver de una pasada
   anterior (pendiente de otra sesión, nunca se había identificado el archivo: es este, en
   `dirigente.html`, la fila de recogida+conductor ~línea 2322-2335).
3. `POST /api/solicitar_recogida` (como el dirigente) → la ficha mostró "17/10/2026 🕐 09:30".
4. `POST /api/autorizar_recogida` (como logística, asignando el vehículo 1001/Carlos López) → acá
   se encontró que **el "Pendiente de asignar" no se actualiza con solo autorizar la solicitud**:
   `autorizar_recogida()` todavía escribe en la tabla legacy `rutas` (no en `viajes`, el sistema
   nuevo de traslados), y la ficha del dirigente lee `conductor_nombre` con un JOIN contra `viajes`.
   **No es un bug nuevo** — es exactamente la brecha `rutas` vs `viajes` ya documentada en
   "🚐 Sección Transporte" más arriba (dashboard de `transporte.html` con el mismo problema). Para
   la simulación se insertó directamente una fila de `viajes` (tipo `ida`, como la crearía
   `armar_viaje_redondo()` si el conductor ya tuviera GPS reportado) — con eso la ficha pasó a
   mostrar "🚗 Carlos Dirigente" en vez de "Pendiente de asignar", confirmando que el **frontend
   lee bien la info de traslado una vez que existe**, el problema es solo que `autorizar_recogida`
   no crea ese registro todavía.
5. `POST /api action=registrar` con `estado='voto'` (simulando que la mesa avisa que el votante ya
   votó) → la pestaña **Seguimiento** (pipeline de cumplimiento) pasó de 0/1 a **1/1, 100% Votó**
   en tiempo real al recargar. El estado individual de la ficha en "Lista" (`posible_votos.status`)
   no se sincroniza automáticamente con el voto confirmado — sigue mostrando "Buscar" aunque el
   votante ya votó; 🟢 pendiente menor, no bloqueante (el tablero de Seguimiento, que es la fuente
   de verdad para "quién falta votar", sí es correcto).
6. Log del servidor confirmó que el agradecimiento por WhatsApp se intentó enviar al teléfono
   cargado del votante (`[WHATSAPP] No configurado... Teléfono: 0994340472` — esperado, Twilio no
   tiene credenciales en este entorno de desarrollo).

**Mensaje de agradecimiento al votante (nuevo, `app.py`)**: cuando `api_post()` registra un voto
(`estado=='voto'`, rama "Default: registrar voto/no_voto"), busca el teléfono del votante en
`posible_votos` (el que haya cargado su dirigente) y, si existe, dispara `enviar_whatsapp()` con
`MENSAJE_AGRADECIMIENTO_VOTO_DEFAULT` (constante nueva junto a `PLANTILLA_WHATSAPP_VOTACION_
DEFAULT`): "¡Gracias, {nombre}! 🗳️ Ya registramos tu voto en esta jornada electoral...". Envuelto
en `try/except` — si falla o no hay teléfono, no rompe el registro del voto. **Deliberadamente NO
se le agregó edición por rol** (a diferencia de la plantilla de día de votación) — es un mensaje
institucional corto, de agradecimiento, no debería variar por partido/candidato/dirigente; si se
pide que sí sea editable, replicar el patrón de `plantillas_whatsapp_votacion` de la sección de
arriba.

**Otros cambios de esta pasada**:
- `.env`/`.env.example`: se agregó `VEEDOR_POST_TOKEN` (requerido para que el servidor arranque,
  lo exige otro fix de seguridad en curso de la sesión paralela — token para operaciones POST de
  veedores). Generado un valor local aleatorio en `.env`; placeholder en `.env.example`.
- Limpieza de todos los datos de prueba (cuenta `99999020`, votante `11199920`, solicitud,
  viaje, registro de voto, auditoría) — verificado con barrido completo de tablas, 0 filas
  restantes.

**Pendientes nuevos de esta pasada**:
- 🟢 **`static/dirigente.html`: ficha de votante en "Lista"** — `posible_votos.status` no se
  actualiza solo al confirmarse el voto (queda en "buscar"/etc. aunque ya votó); usar el tablero
  de "Seguimiento" como fuente de verdad mientras tanto.
- 🟡 **`app.py: autorizar_recogida()`** — sigue escribiendo en la tabla legacy `rutas` en vez de
  crear el `viaje` real en el sistema nuevo; es la misma brecha `rutas`/`viajes` ya anotada en
  "🚐 Sección Transporte", no un pendiente nuevo — consolidar ahí cuando se aborde esa migración.

## 🚨 `database.py: DB_PATH` apuntaba a `/tmp/ddia.db` vacío (resuelto 2026-10-17, crítico)

Encontrado mientras se investigaba el reporte del usuario de candidatos no vinculados al
"Centro de Estudiantes": otra sesión en paralelo dejó `DB_PATH = '/tmp/ddia.db'` hardcodeado
(en vez del `os.path.join(os.path.dirname(__file__), 'database', 'ddia.db')` de siempre) —
probablemente de una prueba propia en un archivo aislado, sin revertir. Con eso, **el servidor
arrancaba contra una base vacía** (`init_db()` la creaba sola vía `CREATE TABLE IF NOT EXISTS`,
70 tablas, 0 filas: 0 candidatos, 0 padrón) en vez de la real `database/ddia.db` (1GB, 2.27M
electores) — sin tirar ningún error, todo respondía `200 OK` con listas vacías o "credenciales
inválidas" para cuentas que sí existen. **La base real nunca se tocó ni se perdió** (se verificó
intacta en disco, 1031606272 bytes, con todos los candidatos/padrón) — el problema era solo a
qué archivo apuntaba la próxima conexión nueva. Revertido a la ruta relativa de siempre.
**Si una sesión futura ve login o listados fallando "sin razón" con credenciales que deberían
funcionar, lo primero a chequear es `database.DB_PATH` y si el archivo al que apunta tiene datos
reales** (`SELECT COUNT(*) FROM candidatos`) antes de asumir que el bug está en la lógica de auth.

## 🏫 Candidatos "Centro de Estudiantes" (categoria `ce`) no filtraban por cliente (resuelto 2026-10-17)

Pedido del usuario: "los candidatos no están vinculados, no corresponde a las elecciones del
centro de estudiante" — visto en la pestaña **Candidatos** de `dirigente.html`.

Causa: `clientes` tiene una `categoria='ce'` (Centro de Estudiantes, clientes reales `CE001`/
`CE002`, tipo `pc`, candidatos propios `cargo='representante'`) que, a diferencia de los clientes
de partido/municipales, **no tiene `departamento_id`/`distrito_id`** (una elección de centro de
estudiantes no se ubica por departamento TSJE). La acción `candidatos` de `api_get()`
(`app.py`), cuando no hay filtro explícito, acota "al departamento del cliente de la sesión" —
pero si ese cliente no tiene departamento (como `CE001`/`CE002`), el filtro simplemente no se
aplicaba y el dirigente veía los 300+ candidatos municipales de **todo el país**, sin relación
con su propia elección. Encontrado también: el filtro de `cargo` estaba hardcodeado a
`("intendente", "concejal")` — `"representante"` (el único cargo de los candidatos `ce`) nunca
entraba, así que ni filtrando por cargo a mano funcionaba.

**Corregido** en `app.py`, acciones `candidatos` y `candidatos_con_dirigentes`:
- Si el cliente de la sesión no tiene `departamento_id`, el fallback ahora acota por
  `c.cliente_cedula = <cédula del cliente de la sesión>` en vez de no acotar nada — el dirigente
  ve solo los candidatos propios de su cliente (p. ej. un dirigente de `CE001` ve solo al
  candidato 355, no a los 356 ni a ningún intendente/concejal).
- Se agregó `"representante"` a la whitelist de cargos filtrables (antes solo
  `intendente`/`concejal`).
- Verificado con una cuenta de dirigente descartable (`99999021`, cédula de prueba, vinculada a
  `cliente_cedula='CE001'` igual que un dirigente real de esa elección, borrada al terminar):
  antes de este fix la consulta devolvía candidatos municipales ajenos; después, solo el 355
  (María Fernanda González Ríos, candidata propia de CE001).

## 🔁 Guerra de ediciones concurrentes con otra sesión de IA (2026-10-17, contexto)

Mientras se investigaban los pendientes de arriba, se detectó que otra sesión ("Mejora registro
del Dirigente") estaba editando `app.py`/`database.py` **al mismo tiempo**, en una refactorización
de seguridad real (passwords fuera de query params → header `X-Password`, sesión obligatoria por
`x-session-id`, etc.). Resultado: varios fixes de esta sesión (`candidatos`/`candidatos_con_
dirigentes` con `cargo`/`cliente_cedula`, `mis_candidatos` con `pc.partido_id`, `distritos_padron`
con filtro por departamento, `_require_session_nivel`) se **perdieron y tuvieron que reaplicarse
2-3 veces** porque la otra sesión guardaba versiones más viejas por encima. Se coordinó por
mensaje directo entre sesiones (pausó sus guardados a esos dos archivos mientras se terminaba) —
ya se le avisó que puede seguir. **Si una sesión futura ve que un fix "desaparece" sin que nadie
lo haya tocado a propósito, antes de asumir que está loco/a, revisar si hay otra sesión de IA
activa sobre el mismo archivo** (`ListAgents`/sesiones del mismo proyecto) y coordinar en vez de
pisarse en silencio.

## 🏛️ `padron2026_completo.depart`: filas de "CAPITAL" mezcladas en TODOS los códigos de departamento (🔴 nuevo, sin resolver)

Encontrado como efecto colateral al filtrar distritos por departamento para el buscador de
`dirigente.html`: el código `depart` del padrón real tiene **electores marcados "CAPITAL"
repartidos en los 17 códigos de departamento** (`depart=0` hasta `depart=17`), en vez de tener su
propio código consistente. Ejemplo verificado: `depart=1` (que en la tabla normalizada
`departamentos` es "Concepción") devuelve tanto distritos reales de Concepción (Belén, Horqueta)
como nombres de distrito de Asunción/Capital o de otros departamentos revueltos. Esto **no es un
bug de código, es un problema del dato importado** (`padron2026_completo`, 2.27M filas) — probablemente
del script/proceso que cargó el padrón (candidatos: `importar_afiliados.py`, `seed_default_
structure.py`, o el import original). No se tocó: arreglarlo bien implica decidir cómo re-mapear
o limpiar las filas de Capital en una tabla de 2.27M filas, que es un trabajo aparte, no algo para
resolver de paso. **Pendiente para una sesión dedicada**: 🔴 auditar `SELECT depart, COUNT(DISTINCT
departamento_nombre) FROM padron2026_completo GROUP BY depart HAVING COUNT(DISTINCT
departamento_nombre)>1` (16 de 18 códigos de depart están afectados) y decidir cómo corregir el
código de Capital en el padrón real.

## 🏛️ `padron2026_completo.local_nombre`: solo 6 nombres de local en TODO el país, uno cubre el 93% del padrón (🔴 nuevo, sin resolver, crítico — más grave que el bug de `depart` de arriba)

Encontrado a pedido del usuario, buscando qué datos pertenecen al "Colegio Luis Alberto de
Herrera" de Asunción Capital (`SELECT ... WHERE local_nombre LIKE '%Herrera%'`). Resultado:
**`SELECT COUNT(DISTINCT local_nombre) FROM padron2026_completo` devuelve solo 6** para las
2.27M filas de todo el padrón nacional — Paraguay tiene miles de locales de votación reales.
`'ESC.NAC.N281 LUIS ALBERTO DE HERRERA'` por sí solo aparece en **2.106.839 filas (92.8% del
padrón completo)**, repartido en 15 de los ~18 códigos de `depart` (casi todo el país, no solo
Asunción) — incluidas 203.103 filas bajo `depart=0` ('CAPITAL'/'ASUNCION'), lo que implicaría
un solo colegio con 200 mil electores, imposible. Los otros 5 nombres que sí existen:
`COL.EXPERIM.PARAGUAY BRASIL-FAC.FILOSOFIA` (121.012), `ESC.DE COMERCIO NRO.3 RCA.PERU`
(29.463), `COL.NAC. JUAN L. MALLORQUIN` (12.029), `COL.NAC. CORAZON DE JESUS` (485), y uno
vacío (`''`). **Causa raíz identificada (investigación 2026-10-17)**: `local`/`slocal` tienen
**solo 6 valores distintos en todo el padrón (1 al 6)**, cada uno mapeado 1:1 a uno de esos 6
nombres (`local=1,slocal=1` → Herrera, `local=2,slocal=2` → Paraguay-Brasil, etc., con ~9 filas
de ruido menor donde no coincide). El campo `direccion` del elector sí varía normalmente
(direcciones reales distintas por persona) — el problema es específico a `local`/`slocal`/
`local_nombre`, no a toda la fila. **No hay script de import en el código ni en el historial de
git** (`git log --all -- "*padron*"` no devuelve nada, y ningún `.py` del repo tiene `INSERT
INTO padron2026_completo`; el único rastro es el `CREATE TABLE IF NOT EXISTS` de `database.py`
línea ~995, que ni siquiera coincide con el esquema real de la tabla — le faltan `direccion`,
`zona`, `local` y `slocal`, que si existen en `ddia.db`) — la tabla se cargó una vez con una
herramienta externa que no quedó versionada, antes de esta sesión. **Hipótesis mejor fundada**:
el import cruzó cada elector contra un catálogo de locales que solo tenía 6 filas (quizás una
prueba o un catálogo truncado), y cuando el cruce fallaba para el resto, cayó en
local=1/slocal=1 (el primero del catálogo) en vez de dejarlo vacío o fallar — de ahí que un
solo colegio absorba el 93%. Efecto práctico: **ninguna función que agrupe o filtre por local
electoral real (nombre de colegio) es confiable hoy** — `escuelas_electorales` (la tabla de
locales reales por cliente) y `escuelas` están vacías (0 filas), así que no hay ninguna fuente
alternativa ya cargada para re-mapear por nombre/dirección real. No se tocó: requiere conseguir
el archivo fuente real del TSJE con `local`/`slocal` correctos por elector y re-importar, no es
un fix de código. Revisados los candidatos en `fuentes_padron/`
(no versionado, `.gitignore`) que podrían tener el dato real: **`locales de votacion.xlsx`**
(225 filas — código `REF_MAP`/`L_VOTACION_2`, departamento "11 Central", nombre de escuela,
dirección, electores, mesas, coordenadas GPS) y **`CATALOGO_SECCIONALES_LOCALES.dbf`** (512
registros) **sí tienen datos reales de locales con coordenadas**, pero ninguno de los dos
alcanza para remapear las 2.27M filas de `padron2026_completo`: parecen catálogos internos
del cliente/partido (ANR, a juzgar por `CATALOGO_SECCIONALES` y `PADRON_AFILIADOS_ANR_*`), no
el padrón nacional completo con `local`/`slocal` por elector. **Pendiente para una sesión
dedicada**: confirmar con el usuario si existe en algún lado el archivo fuente original del
TSJE (padrón nacional con local/slocal por elector, no catálogo de locales) antes de intentar
cualquier remapeo — sin eso, lo máximo que se puede hacer es usar estos dos archivos para
corregir a mano el departamento "Central" (225 locales) si ese es el ámbito real del cliente.

## 🏫 Candidatos "Centro de Estudiantes" (categoria `ce`) no filtraban por cliente (resuelto 2026-10-17)

Pedido del usuario: "los candidatos no están vinculados, no corresponde a las elecciones del
centro de estudiante" — visto en la pestaña **Candidatos** de `dirigente.html`.

Causa: `clientes` tiene una `categoria='ce'` (Centro de Estudiantes, clientes reales `CE001`/
`CE002`, tipo `pc`, candidatos propios `cargo='representante'`) que, a diferencia de los clientes
de partido/municipales, **no tiene `departamento_id`/`distrito_id`** (una elección de centro de
estudiantes no se ubica por departamento TSJE). La acción `candidatos` de `api_get()`
(`app.py`), cuando no hay filtro explícito, acota "al departamento del cliente de la sesión" —
pero si ese cliente no tiene departamento (como `CE001`/`CE002`), el filtro simplemente no se
aplicaba y el dirigente veía los 300+ candidatos municipales de **todo el país**, sin relación
con su propia elección. Encontrado también: el filtro de `cargo` estaba hardcodeado a
`("intendente", "concejal")` — `"representante"` (el único cargo de los candidatos `ce`) nunca
entraba, así que ni filtrando por cargo a mano funcionaba.

**Corregido** en `app.py`, acciones `candidatos` y `candidatos_con_dirigentes`:
- Si el cliente de la sesión no tiene `departamento_id`, el fallback ahora acota por
  `c.cliente_cedula = <cédula del cliente de la sesión>` en vez de no acotar nada — el dirigente
  ve solo los candidatos propios de su cliente (p. ej. un dirigente de `CE001` ve solo al
  candidato 355, no a los 356 ni a ningún intendente/concejal).
- Se agregó `"representante"` a la whitelist de cargos filtrables (antes solo
  `intendente`/`concejal`).
- También corregido `mis_candidatos` (ver sección "Login roto" más arriba, bug relacionado del
  mismo día) y `distritos_padron` (nuevo filtro opcional `mesa`=departamento, mismo código que usa
  `buscar_padron`, para que el buscador de `dirigente.html` ofrezca solo distritos reales).
- Verificado end-to-end con una cuenta de dirigente descartable (`99999022`, vinculada a
  `cliente_cedula='CE001'`, borrada al terminar): login OK, `action=candidatos` devuelve
  exactamente 1 resultado (355, María Fernanda González Ríos, CE001) en vez de los 300+ de antes,
  `action=seguimiento` también OK (confirma que `_require_session_nivel` quedó bien).

## 🔎 Buscador de `dirigente.html`: Distrito por nombre, Zona eliminada (resuelto 2026-10-17)

Pedido del usuario sobre la pestaña **Buscar**: "Distrito" pedía un código a mano (sin ayuda de
qué poner) y "Zona" decía "Número" pero no filtraba nada útil.

- **Distrito**: era un `<input>` de texto libre pidiendo el código TSJE a mano. Ahora es un
  `<select>` (mismo patrón que Departamento) poblado por la acción `distritos_padron` (nueva:
  acepta `mesa`=departamento_id opcional) — se recarga cada vez que se cambia el Departamento
  (`onDepartamentoBuscarChange()`, nuevo en `dirigente.html`), mostrando solo los distritos reales
  de ese departamento, por nombre.
- **Zona**: se sacó del formulario. Verificado en la base: `padron2026_completo.zona` es **siempre
  0** y `zona_nombre` **siempre vacío** en las 2.27M filas — nunca se cargó ese dato. Tampoco
  existe ninguna clasificación urbano/rural en ningún lado del sistema (se buscó en todas las
  tablas). El campo filtraba contra una columna sin datos reales — dejarlo hubiera sido peor que
  sacarlo. Si en el futuro se consigue esa clasificación (otro archivo del TSJE o una fuente
  nueva), hay que importarla antes de poder ofrecer un filtro de Zona que funcione.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

> La política de ahorro de tokens y el formato de pendientes están arriba, en
> "⚙️ Política de Agente: pedidos de mejora, pendientes y tokens" — no repetir acá.
