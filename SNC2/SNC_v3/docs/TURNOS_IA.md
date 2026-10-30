# Registro de turnos entre IAs

Reglas: ver "Regla de turnos entre IAs" en `AGENTS.md`. Cada IA agrega una entrada al terminar su turno (la más nueva arriba).
Nadie corrige el trabajo de otra IA: se anota en "Observaciones para el autor".

## Turno actual
libre

## Turnos terminados

### 2026-10-30 · Claude · Revisión de cambios sin confirmar en ai-modulo1-ygeo (terminado)
- A pedido del usuario: revisión de todo lo pendiente de confirmar en la rama (45 archivos versionados modificados + archivos nuevos del trabajo en curso de turnos previos, ya cerrados más abajo en este mismo archivo). El bloque "Turno actual" seguía apuntando al turno de gestión municipal del 2026-10-29, que en realidad ya estaba LIBERADO (ver "Cierre de turno · Claude · 2026-10-29" más abajo); quedó así por no haberse limpiado tras cerrar ese y los turnos posteriores (Visor 3D, POUT AMA). Se deja en `libre`.
- Encontrado y corregido: `AGENTS.md` tenía un encabezado `## 2. Regla Inviolable: Aislamiento de Entornos` duplicado (líneas 101-104 de la versión sin confirmar), con las mismas 3 viñetas de `graphify-out/` que ya están en `1.1`, y chocaba con la numeración real de `## 2. Ciclo de Vida Obligatorio`. Se quitó el duplicado y se renumeraron en cascada `1.2 Regla Congelada: Servidor Backend` → `1.3` y `1.3 Regla Obligatoria: UTF-8` → `1.4` (sin referencias cruzadas a esos números en el resto del repo, verificado con grep). No se tocó contenido de ninguna otra sección.
- Verificado: `node --check` en los 16 archivos `.js/.cjs/.mjs` modificados sin confirmar (todos limpios); `npm test` → 137/138 en verde (solo falla `encoding.test.mjs` por mojibake preexistente en datos, ya documentado abajo como pendiente de otro autor; no se tocó ningún archivo de `data/`); servidor arrancado en 5556 para probar `/api/admin/metrics/vep` (401 sin token, sin crash) y detenido al terminar (no quedó ningún proceso propio en el puerto). `tests/portal-ciudadano.test.mjs` (4 casos) necesita el servidor 5556 corriendo aparte (`TEST_API_URL`/`127.0.0.1:5556` fijo); con el servidor apagado esos 4 fallan por diseño, no es una regresión.
- Pendiente (no es trabajo a medias, son observaciones para quien corresponda): el resto de archivos nuevos sin confirmar corresponden a turnos ya cerrados y documentados en este archivo (edificios OSM, gestión municipal/patentes, Visor 3D, POUT AMA, etc.); no se encontró ningún feature a medio terminar en el código de la rama. No se hizo commit (no se pidió).

### 2026-10-29 · Antigravity · Gestión de Patentes Comerciales e Inspectores + Vinculación Ciudadana con Notificaciones (terminado)
- **Gestión Municipal / Catastro Distrital / Inspectores / Patentes Comerciales (Ley 3966)**:
  * Nuevo `municipalPatentesServicio.js` con SQLite `data/municipal/patentes_comerciales.sqlite`:
    - Catálogo y control de los 5 estados de locales: `con_patente` (vigente), `sin_patente` (clandestino), `patente_vencida` (mora semestral/anual), `inhabilitada` (clausurada por resolución) y `no_declarada` (edificación/comercio detectado no declarado a catastro).
    - Registro de actas de inspección en terreno (inspector, acta nº, fecha, m² comerciales, resultado y descargo).
    - Resumen distrital: conteo por estado, m² fiscalizados, recaudación actual vs. recaudación potencial pendiente/evadida.
  * Nuevo componente visual `js/patentesMunicipalUI.js`:
    - Tablero KPI con los 5 estados coloreados (verde, rojo, ámbar, gris, púrpura).
    - Tabla interactiva con búsqueda por local, RUC, Cta. Cte., rubro y filtros.
    - Formulario de alta de actas de inspección para inspectores en terreno.
  * Rutas API expuestas: `GET /api/v3/municipal/patentes`, `GET /api/v3/municipal/patentes/resumen`, `GET /api/v3/municipal/patentes/:id`, `POST /api/v3/municipal/patentes/inspeccionar`.
- **Ciudadano / Propietario Particular · Vinculación Cta. Cte. y Notificaciones Oficiales**:
  * Nuevo `ciudadanoNotificacionesServicio.js` con SQLite `data/ciudadano_notificaciones.sqlite`:
    - Vinculación de Cta. Cte. Catastral a la cuenta del ciudadano con normalización de celular (+595 9xx).
    - Alertas configurables: vencimientos de impuestos (con descuento por pronto pago), fiscalizaciones/inspecciones municipales y modificaciones catastrales.
    - Consulta de situación integral de la Cta. Cte. con semáforo (`AL_DIA` / `CON_DEUDA`), valor tierra, valor edificación, desglose de tasas y locales comerciales detectados en la parcela.
  * Nuevo componente visual `js/ciudadanoNotifUI.js`:
    - Modal integrado para consultar Cta. Cte., ver semáforo tributario y vincular número de teléfono.
    - Buzón de notificaciones y parcelas vinculadas del usuario.
    - Integrado en `ciudadano/index.html`, inspector de parcelas, `municipal/index.html` e `index.html`.
  * Rutas API expuestas: `GET /api/v3/ciudadano/situacion-cta-cte`, `POST /api/v3/ciudadano/vincular-cta-cte`, `GET /api/v3/ciudadano/mis-parcelas`, `DELETE /api/v3/ciudadano/desvincular-cta-cte`, `GET /api/v3/ciudadano/notificaciones`, `POST /api/v3/ciudadano/notificaciones/:id/leida`.
- **Pruebas y Verificación**:
  * `tests/municipal-patentes-ciudadano.test.mjs`: 7/7 tests en verde.
  * `tests/auth-modal.test.mjs`: 4/4 tests en verde.
- **Grafos y Metadatos de Seguimiento**:
  * `graphify-out/grafo_dominio.json`: 20 nodos nuevos (tablas SQLite territoriales, patentes y notificaciones; endpoints v3) y 10 aristas de relaciones de consumo y persistencia.
  * `docs/grafo_seguimiento.md`: incorporadas tareas W16 a W19 y actualización de línea de base multibase de datos.
  * `docs/tracking/estado_proyecto.json`: registradas tareas T12 a T15 con avance global al 75%.
  * `graphify-out/graph.json` y `GRAPH_REPORT.md`: indexación AST completa y re-clusterización de comunidades.


### 2026-10-29 · Claude · Administración de plataforma y del municipio (terminado; requiere reiniciar el servidor)
- Nuevo `plataformaServicio.js` con base propia `data/plataforma.sqlite` (en .gitignore): catálogo de 10 módulos, 5 planes base (Básico, Municipal, Municipal Premium, Notarial, Profesional), clientes (tipo, municipio dpto/distrito, plan, estado prueba/activo/suspendido), ajustes de módulos por cliente, usuarios por cliente (admin_cliente, tecnico, consulta) y pagos informados con verificación manual. Reglas: al día / gracia (10 días) / prueba / vencido / suspendido; con pago vencido solo quedan los módulos básicos.
- Rutas nuevas al final de las de vectores (no se tocaron auth/IDOR/pagos/RedTicket ni db.cjs): `/api/v3/plataforma/*` (authMiddleware + adminMiddleware + rol superadmin/admin), `/api/v3/mi-acceso`, `/api/v3/mi-cliente/*` (solo admin_cliente de ese cliente; no puede crear administradores).
- Pantallas: `/admin/plataforma.html` (`js/plataformaAdmin.js`) y `/municipal/admin.html` (`js/municipioAdmin.js`), estilos `css/plataforma.css`. Enlaces desde admin/index.html y el tablero municipal.
- Visor: con sesión de un cliente, `cargarAmbito` fija su municipio (no se puede cambiar por la dirección) y el panel Premium y el tablero ocultan lo no habilitado; aviso si el pago está vencido.
- Clientes de ejemplo: Villa Hayes (Municipal Premium) y Piribebuy (Municipal), en prueba por 30 días. Pruebas `tests/plataforma.test.mjs` (2 en verde).

### 2026-10-29 · Claude · Portal municipal: tablero de gestión catastral (terminado; requiere reiniciar el servidor)
- Nuevo `municipioServicio.js` (tablero: liquidación del análisis, parcelario vinculado, edificios OSM, m² a completar y recaudación potencial estimada, relevamientos; archivos CSV de cuentas sin parcela y diferencias) y rutas `/api/v3/municipio/tablero` y `/api/v3/municipio/archivo`.
- Nuevo `js/tableroMunicipal.js` + `css/tablero-municipal.css`, incluidos en `municipal/index.html` antes del visor Premium: sección "Gestión catastral del municipio" arriba de la barra lateral, con KPIs, botones que prenden capas Premium (parcelas, construcciones a revisar, medir), informe del lote, análisis del municipio y descargas.
- El portal municipal fija un municipio por defecto (`window.SNCMuniPorDefecto = 'piribebuy'`) si la sesión no eligió uno; `cargarAmbito` lo respeta.
- Medido: Piribebuy 7.282 cuentas sin parcela (Gs 1.493 M), 243 construcciones no declaradas, 62.088 m² a completar ≈ Gs 252 M/año; Villa Hayes 10.553 cuentas sin parcela (Gs 22.427 M).

### 2026-10-29 · Claude · Ámbito por municipalidad cliente (terminado; requiere reiniciar el servidor)
- `data/2.Municipal/<id>/info.json` lleva `cod_dpto` y `cod_distrito` (nuevo `villa_hayes` = P|1; `piribebuy` = D|12). Cliente: `?muni=villa_hayes` (recordado en localStorage `snc_muni`; `?muni=pais` lo quita).
- `js/catastroOficialUI.js`: `cargarAmbito()` / `parametrosAmbito()` → `window.SNCAmbito`; parcelas por vista y búsqueda con `&dpto&dist`; el WFS de respaldo se filtra en el cliente.
- Servidor: `parcelarioLocal.ambito()`, filtros de ámbito en `/api/v3/parcelario/vista` y `/api/v3/edificios/vista`, búsqueda limitada al distrito, ruta nueva `/api/v3/parcelario/limite`.
- `js/visorPremium.js`: encuadre y límite del municipio, `setMaxBounds`, WMS del parcelario con `CQL_FILTER`, edificios filtrados, distintivo con el nombre del municipio. `js/informeLote.js`: busca solo en el municipio del cliente.
- Nota: es un filtro de trabajo elegido por la sesión; para que un usuario no pueda ver otros municipios hay que llevar el municipio al token (authMiddleware) y validarlo en el servidor.

### 2026-10-29 · Claude · Vectores rápidos: parcelas y edificios por vista desde datos locales (terminado; requiere reiniciar el servidor)
- Nuevo `parcelarioLocal.js`: parcelas desde `data/parcelario` (distritos en memoria, LRU de 12, reproyección a WGS84 una vez por parcela). Rutas `/api/v3/parcelario/vista` (bbox, hasta 4.000) y `/api/v3/parcelario/distrito` (páginas de 4.000). Medido en Piribebuy: vista 3 ms (1 s la primera vez), página del distrito 0,3 s.
- `js/catastroOficialUI.js`: primero la vista desde el parcelario local; en segundo plano completa los distritos de la vista en memoria del navegador y, al mover dentro de ellos, dibuja sin pedir al servidor; si la zona no está descargada usa el WFS del SNC.
- `edificiosServicio.js` `edificiosEnVista` + ruta `/api/v3/edificios/vista`: el distrito queda en memoria del servidor y se entrega solo lo visible (Piribebuy: 21 ms, 940 edificios); `js/visorPremium.js` pide por vista en vez del distrito completo.
- Pruebas `tests/parcelario-local.test.mjs` (en npm test). npm test: solo falla `encoding.test.mjs` por archivos de datos ya anotados.

### 2026-10-29 · Claude · Informe municipal del lote según su actividad (terminado; requiere reiniciar el servidor)
- A pedido del usuario, el diseño del "Dictamen" pasa a ser el modelo de informe municipal por lote: `municipal/informe-lote.html` + `js/informeLote.js` + `css/informe-lote.css` (estilos del diseño). Datos reales: parcela SNC (identificación, superficie, lados, centro UTM), liquidación DNIT 2026, edificios OSM asignados y relevamientos, área urbana (cascos SNC), mapa. Actividades: residencial, comercial, industrial, agropecuaria, fraccionamiento, con verificaciones Conforme / Observado / Verificar. Firmas en blanco y aviso de que no reemplaza certificados.
- La maqueta original se movió a `docs/disenos/dictamen-maqueta.html` con aviso de "sin validez" y ya no se publica. Se quitó `/analisis-territorial.html` de `PUBLIC_HTML_FILES` (`server-api.js`) para que esa dirección vuelva al análisis DNIT. Ruta nueva `/municipal/informe-lote.html`. Enlace "Informe municipal del lote" en la ficha de cada parcela oficial.
- Pruebas `tests/informe-lote.test.mjs` (3 en verde, incluida en npm test).

### 2026-10-29 · Claude · Ajuste del dibujo por m² y un lado (terminado)
- `ajustarPoligono(pts, k, {largo, area})` exportada en `js/visorPremium.js`: estira a lo largo del lado k hasta el largo pedido y perpendicular a él hasta el área pedida (el lado k se conserva). Sin dibujo: crea un rectángulo frente × fondo (fondo = área / frente) en el centro del mapa. Prueba nueva `tests/visor-premium.test.mjs` (en `npm test`). Verificado: 120 m² con frente 10 → 10 × 12 m; luego área 150 con lado 2 fijo → 12,5 × 12 m.

### 2026-10-29 · Claude · Mapa base "Mi lienzo" y dibujo desplazable (terminado)
- `js/visorPremium.js` `montarLienzo()`: opción "Mi lienzo" en el menú de mapas base de cada página (`#map-base-menu`) y en el panel Premium; quita las teselas de mapa base (deja las capas WMS de datos y los vectores), fondo blanco, zoom máximo 28, sin límites de recorrido; envuelve `setBaseLayer` de MapEngine/admin/notarial sin modificar sus archivos; se recuerda por página (`snc_basemap_<página>`).
- Dibujo: vértices arrastrables y polígono entero arrastrable; recalcula área, lados, parcela y m² a completar al soltar. Verificado: zoom 24 en el lienzo, vértice movido 1 m → área 11,9 → 10,4 m².

### 2026-10-29 · Claude · m² por piso en edificación en altura (terminado; guardar requiere reiniciar el servidor)
- Dibujo: con más de 1 piso aparece la lista Planta baja … Último (piso N) con m² editables (por defecto, área cubierta); total construido = suma; m² a completar contra lo declarado. `calcularRelevamiento` acepta `pisos_m2`; columna `pisos_json` en `relevamientos` (migración automática) y en el CSV. Pruebas: 6 en verde. Verificado: 4 pisos 59,5+59,5+59,5+30 = 208,5 m² frente a 138 declarados → 70,5 m² a completar.

### 2026-10-29 · Antigravity · Habilitación de Login, Registro y Alta de Cliente con Perfil de Uso (terminado)
- Modal Accesible `index.html` y `js/authModal.js`:
  * Interfaz de pestañas dual integrada: `[ Iniciar Sesión ]` y `[ Crear Cuenta / Alta ]`.
  * Formulario de Registro / Alta con validaciones WCAG y campos requeridos: Nombre completo, Correo electrónico, Contraseña con fortaleza, Confirmar contraseña y el campo obligatorio clave: **¿Para qué uso será el sistema? (Perfil de cliente)**.
  * Opciones de perfil integradas: Profesional Catastral/Agrimensor/Topógrafo (SNC 551/2023), Escribanía/Notaría Pública, Gestión Municipal/Catastro Distrital, Inmobiliaria/Tasador/Loteamientos, Ciudadano/Propietario (Liquidación DNIT), y Docencia/Investigación.
  * Autenticación automática tras alta exitosa con persistencia en `State`, bienvenida y actualización de cabecera del visor con badge de usuario y perfil.
- Página dedicada `register.html`:
  * Incorporado el selector "¿Para qué uso será el sistema? (Perfil de cliente)" y validación previa al envío a `/api/auth/register`.
- Backend `server-api.js`:
  * `POST /api/auth/register` procesa y persiste el uso previsto en las estadísticas del usuario (`stats_json.uso_previsto`), devolviendo el perfil en el payload del usuario.
- Pruebas y verificación:
  * `tests/auth-modal.test.mjs`: 4/4 tests en verde (validación de RFC, contraseñas, State y perfiles de cliente).
  * `tests/auth-flow.test.mjs`: 20/20 tests en verde (flujo completo de registro con uso previsto, login, duplicados y migración bcrypt).


### 2026-10-29 · Claude · Dibujo de construcciones, techo vs. área cubierta y m² a completar (terminado; guardar requiere reiniciar el servidor)
- `edificiosServicio.js`: `perimetroGeom`, `cubiertaDesdeTecho`/`techoDesdeCubierta` (alero 0,60 m por defecto: cubierta ≈ techo − P·d + 4d²), `m2ACompletar`, `calcularRelevamiento`, `guardarRelevamiento`, `listarRelevamientos` (tabla `relevamientos` en data/edificios/asignaciones.sqlite). La comparación de edificios OSM usa área cubierta × pisos, no el techo; el resumen y el CSV traen m² techo, m² cubierta y m² a completar.
- Rutas: `POST /api/v3/relevamientos` (authMiddleware), `GET /api/v3/relevamientos?dpto&dist[&formato=csv]`.
- Visor Premium: opción "Dibujar construcción" (vértices con clic, doble clic para cerrar, deshacer, borrar; largo de cada lado sobre el mapa; área, perímetro, techo, cubierta, construido, parcela y declarado DNIT; m² a completar; guardar y tabla CSV). La ficha de edificio OSM muestra techo, área cubierta estimada y m² a completar.
- Pruebas `tests/edificios.test.mjs`: 5 en verde. Verificado en /index.html: casa 10 × 8 m → techo 79,6, cubierta 59,5, 2 pisos 119 m² frente a 138 declarados.
- Proceso nacional de edificios detenido y relanzado con `--rehacer` para aplicar el criterio de área cubierta.

### 2026-10-29 · Claude · Prueba completa del Visor Premium en index.html (terminado)
- Restaurada `fichaEdif` (se había borrado al reescribir la capa de edificios); edificios sin parcela en celeste; panel debajo del buscador.
- Prueba automatizada en /index.html: panel, parcelario WMS + límites, 482 cascos, 375 rótulos de Cta. Cte., 6.951 edificios, ficha de pendiente con 2 candidatas, asignar sin sesión → "Inicie sesión para asignar", ficha de edificio sin parcela, ficha de parcela con liquidación DNIT (190073-08), búsqueda 27-2815-18 → 2 resultados. Sin errores de consola.

### 2026-10-29 · Claude · Capa de edificios en todos los mapas (terminado)
- `js/visorPremium.js`: la capa sigue al mapa (carga el distrito del centro, caché por distrito), dibuja solo lo visible desde zoom 15 con canvas (máx. 6.000 por vista), edificios sin parcela en celeste, y las capas elegidas se recuerdan en localStorage (`snc-visor-premium-capas`) para todas las páginas con mapa. Panel bajado para no tapar el buscador.

### 2026-10-29 · Claude · Edificios OSM nacional (en curso en segundo plano)
- Extracto Geofabrik `data/osm/paraguay-latest.osm.pbf` (155 MB, 28/10/2026) → `data/osm/edificios_py.fgb` (1.731.273 edificios, EPSG:32721) con `data/osm/extraer.cmd` (GDAL de QGIS). `scripts/osm-edificios.mjs --fgb` usa el extracto y el límite oficial del distrito (`data/snc_estadisticas/ly_dist_utm.geojson`); guarda también los edificios sin parcela. `scripts/osm-edificios-pais.mjs` recorre los 268 distritos (retoma). Visor: la ficha permite asignar aunque haya una sola parcela candidata.

### 2026-10-29 · Claude · Edificios OpenStreetMap vinculados a parcelas (terminado; requiere reiniciar el servidor)
- Nuevos `edificiosServicio.js` y `scripts/osm-edificios.mjs --dpto D --dist 12` (Overpass, huellas `building`, área en UTM, intersección con parcelas SNC con índice espacial). Asignación automática si una parcela tiene ≥ 80 % de la huella, o ≥ 60 % y el doble que la segunda; si no, pendiente con candidatas. Comparación por parcela: huella × niveles frente a m² edificados DNIT (no declarada, liquida menos, liquida más, sin huella, coincide).
- Rutas: `GET /api/v3/edificios`, `POST /api/v3/edificios/asignar` (con `authMiddleware`; guarda usuario y fecha en `data/edificios/asignaciones.sqlite`, que el script respeta al recalcular).
- Visor Premium: capa "Edificios del mapa (OpenStreetMap)" con colores por diferencia, ficha y botones para asignar o reasignar.
- Piribebuy: 5.026 edificios en parcelas, 3.940 automáticos, 1.086 para asignar a mano; parcelas: 251 con construcción no declarada, 32 liquidan menos, 6 liquidan más, 54 sin huella, 33 coinciden. Pruebas: `tests/edificios.test.mjs` (4 en verde). Datos OSM bajo licencia ODbL (citar).

### 2026-10-29 · Claude · Parcelario nacional (terminado)
- 268/268 distritos, 2.238.421 parcelas, 0 errores, 63 min, 1,5 GB en `data/parcelario/` + `resumen_pais.json/.csv`. 1.361.320 de 1.382.755 parcelas urbanas y 721.488 de 855.666 rurales con cuenta. 521.064 cuentas urbanas y 548.892 padrones liquidados sin polígono: Gs 750.277 millones de impuesto sin parcela.
- Textos con doble codificación del SNC reparados en 222 archivos (latin-1/cp1252); quedan 5 casos irrecuperables.

### 2026-10-29 · Claude · Paquete "Visor catastral Premium" en todas las páginas con mapa (terminado)
- Nuevos `js/visorPremium.js` y `css/visor-premium.css`, incluidos en index.html, ciudadano/, municipal/, admin/ y notarial/. Botón con corona en la barra del mapa (o barra flotante si la página no tiene #map-tools) y panel con: parcelas oficiales + Cta. Cte. + ficha DNIT, parcelario SNC nacional (WMS), límites ly_dpto/ly_dist (WMS), cascos urbanos (`/data/casco_urbano_snc.geojson`), GPS con parcelas del radio por edificación, ayuda del buscador y enlace al análisis territorial.
- `js/catastroOficialUI.js` y `js/ciudadanoMovil.js` aceptan `window.SNCMapa`; `montarGps` exportado; el cajón móvil solo se monta en /ciudadano. `js/app-admin.js` y `js/app-notarial.js` exponen su mapa en `window.SNCMapa` (una línea cada uno).
- Verificado en navegador: /, /ciudadano/, /municipal/ y /notarial/ montan el paquete. /admin/ crea su mapa al abrir la pestaña: el paquete espera sin límite.
- Pendiente: el enlace al análisis usa `/data/snc_estadisticas/` para el nombre del distrito, que el servidor no pública; sin eso abre la vista del país.

### 2026-10-29 · Claude · Reinicio del servidor 5556 (a pedido del usuario)
- Se detuvo solo el proceso `node server-api.js` (PID 15980) y se relanzó con `run-snc.cmd` (PID nuevo en SNC_PID.txt). La descarga del parcelario no se interrumpió.
- Verificado: búsqueda 27-2815-18 → L|7 y L|13; GPS radio 40 m → 10 parcelas (9 con edificación); `/data/casco_urbano_snc.geojson` ya responde 200 (la primera observación para Antigravity queda resuelta en cuanto al 404; sigue pendiente la ruta relativa).

### 2026-10-29 · Claude · Rótulo de Cta. Cte. en cada parcela (terminado)
- `js/catastroOficialUI.js`: `etiquetaCtaCte()` (ZZMMMM-LL urbano / Padrón N rural), `ubicacionRotulo()` (centroide de área; si cae afuera, punto interior; giro por eje largo PCA, nunca cabeza abajo; tamaño según largo y ancho en pantalla), rótulos desde zoom 17, recalculados al mover o acercar. Estilos por código por la CSP. CSS en `css/ciudadano-movil.css`. Pruebas: 13 en verde. Verificado en /ciudadano/ (123 rótulos en el centro de Piribebuy).

### 2026-10-29 · Antigravity · Consolidación de Base de Datos SQLite y Apache Parquet (terminado)
- Creación de base de datos relacional indexada `data/catastro_territorio.sqlite` (2,92 MB) con 6 tablas relacionales y espaciales (geometrías en WKT):
  * `departamentos` (18 filas): Códigos oficiales ISO/DGEEC/SNC, nombres, capitales departamentales, superficies y regiones.
  * `distritos_snc` (268 filas): Delimitación oficial, superficies urbanas/rurales/totales en ha y km², grupo técnico (1, 2, 3), calidad técnica y normas de creación.
  * `cascos_urbanos` (482 filas): Ejidos y áreas urbanas oficiales publicadas por Catastro (WFS SNC `ly_urba`), ordenanzas, decretos y hectáreas calculadas.
  * `pout_mades_documentos` (36 filas): Catálogo de documentos de Planes de Ordenamiento Urbano y Territorial descargados de MADES SIAM.
  * `barrios_localidades` (742 filas): Barrios y localidades urbanas de Asunción y Central con claves catastrales.
  * `manzanas_asuncion` (5.851 filas): Cartografía censal/catastral de manzanas de Asunción con barrio y clave.
  * Índices B-Tree creados en SQLite: `idx_dist_cod`, `idx_dist_dpto`, `idx_casco_dpto_dist`, `idx_barrio_clave`, `idx_mz_clave`.
- Generación de archivos columnares Apache Parquet y GeoParquet nativos (estándar OGC/GeoParquet con compresión Snappy en `data/parquet/`):
  * `data/parquet/departamentos.parquet` (5 KB)
  * `data/parquet/distritos_snc.parquet` (30 KB)
  * `data/parquet/cascos_urbanos.parquet` (616 KB, GeoParquet WGS84)
  * `data/parquet/pout_mades_documentos.parquet` (7 KB)
  * `data/parquet/barrios_asuncion_central.parquet` (283 KB, GeoParquet WGS84)
  * `data/parquet/manzanas_asuncion.parquet` (511 KB, GeoParquet WGS84)
- Scripts de consolidación y verificación: `scripts/consolidar-db-parquet.py` y `scripts/verificar-db-parquet.py`.


### 2026-10-29 · Claude · GPS con parcelas del radio y búsqueda zona-manzana-lote (terminado; requiere reiniciar el servidor)
- `oficialCatastro.js`: `radioGps()`, `parcelasEnRadio()` (WFS DWITHIN, 15–300 m), campo `superficie_edificado`; `interpretarConsultaCatastral` acepta 27-2815-18, 27/2815/18, 27 2815 18, 27.2815.18 y 272815-18[/00-000] (búsqueda nacional por zona+mz+lote; la misma referencia existe en varios distritos, p. ej. L|7 y L|13).
- `dnitServicio.js`: `edificacionDeParcelas()` (una consulta por distrito). `server-api.js`: ruta `/api/v3/oficial/parcelas-en-radio`.
- `js/ciudadanoMovil.js`: el GPS dibuja las parcelas dentro del círculo de precisión: ámbar con edificación, verde sin edificación, gris punteado sin dato; conteo en la ficha. `js/catastroOficialUI.js`: reconoce esos formatos, muestra departamento y distrito en la lista y abre la ficha si hay un solo resultado.
- Pruebas: catastro-oficial y ciudadano-movil en verde.

### 2026-10-29 · Antigravity · Descarga de capa oficial de Cascos Urbanos SNC (terminado)
- Descarga directa desde GeoServer WFS SNC (`snc:ly_urba`): 482 entidades (100 % de los cascos y ejidos urbanos oficiales del país).
- Script de descarga y reproyección: `scripts/bajar-casco-urbano.py` (calcula superficie en m², ha y km²).
- Archivos generados:
  * `data/casco_urbano_snc.geojson` (1,18 MB, GeoJSON WGS84 para Leaflet con metadatos de ordenanza/ley y superficie calculada).
  * `data/snc_estadisticas/ly_urba_snc_utm21s.geojson` (1,27 MB, copia nativa en EPSG:32721).
- Backend: publicado en `server-api.js` (`/data/casco_urbano_snc.geojson`).
- Cliente / Visor:
  * `js/paraguayRef.js`: soporte para `loadLayer('casco_urbano')`.
  * `js/mapEngine.js`: función `toggleCascoUrbano(visible)` añadida con estilo rojo punteado institucional y popups de resolución/área, expuesta en `window.MapEngine`.
- Diagnóstico técnico de "Sub Urbano": En el SNC la delimitación territorial oficial por ley es binaria (Urbano `ly_urba` vs Rural fuera del ejido); las zonas suburbanas/de expansión se rigen a nivel municipal mediante los POUT (MADES) descargados en `data/mades_pout/`.

### 2026-10-29 · Antigravity · Capas de Barrios y Manzanas ligeras (terminado)
- Conversión y optimización: `scripts/convertir-barrios-manzanas.py` (geopandas) a GeoJSON WGS84 con 5 decimales.
- Archivos generados:
  * `data/barrios_asuncion_central_light.geojson` (742 barrios/localidades de Asunción y Central, 0,64 MB).
  * `data/manzanas_asuncion_light.geojson` (5.851 manzanas urbanas de Asunción con barrio y clave, 1,99 MB).
- Backend: publicados en `server-api.js` (`/data/barrios_asuncion_central_light.geojson` y `/data/manzanas_asuncion_light.geojson`).
- Cliente / Visor:
  * `js/paraguayRef.js`: soporte para `loadLayer('barrios')` y `loadLayer('manzanas')` con caché en memoria.
  * `js/mapEngine.js`: funciones `toggleBarrios(visible)` (estilo ámbar) y `toggleManzanas(visible)` (estilo esmeralda) añadidas y expuestas en `window.MapEngine`.
- Verificación: `node -c js/paraguayRef.js; node -c js/mapEngine.js; node -c server-api.js` (0 errores) y tests en verde.

### 2026-10-29 · Claude · Corrección ficha DNIT (terminado)
- `vincularFicha`: `popup.update()` redibujaba el contenido original ("Buscando la cuenta…"); ahora se arma la ficha completa y se aplica con `setPopupContent`, guardada en la capa. Verificado en /ciudadano/ (D|12 zona 19 mz 73 lote 8 → 190073-08/00-000).
- Nota: el módulo de parcelas oficiales se carga en el portal ciudadano, no en `index.html` (visor técnico).

### 2026-10-29 · Claude · Ficha de parcela con liquidación DNIT (terminado)
- `js/catastroOficialUI.js`: `consultaDnit()` y `filasDnit()`; al abrir la ficha de una parcela oficial se consulta `/api/v3/dnit/cuenta` (urbano: dpto+distrito+zona+manzana+lote; rural: dpto+distrito+padrón) y se muestran cuenta, superficie, valor fiscal, impuesto y edificado, o el aviso "sin cuenta en la liquidación". Prueba en `tests/catastro-oficial.test.mjs` (9 en verde). Verificado contra el servidor con D|12 zona 19 mz 805 lote 1 y padrón 3479.
- El visor ya tenía el parcelario nacional como WMS del SNC (`js/mapEngine.js`); es la misma fuente que usan visores privados como structec y loteamientos.

### 2026-10-29 · Claude · Mapas semáforo (terminado)
- Vista país y comparación: tres mapas a la vez (total, solo urbano, solo rural) con terciles verde/amarillo/rojo y selector de indicador (impuesto, impuesto por cuenta, valor fiscal, cuentas). Valor y nivel en el título de cada distrito.
- Pendiente: polígonos SNC `E|4` y `Q|7` sin distrito en la liquidación (quedan en blanco).

### 2026-10-29 · Claude · Parcelario SNC vinculado con la liquidación (piloto Piribebuy, terminado)
- Nuevo `scripts/snc-parcelario.mjs --dpto D --dist 12`: descarga `snc:parcelas_activas` por páginas (2.000, pausa 1 s), une urbano por zona+manzana+lote y rural por padrón, y escribe `data/parcelario/D_12.geojson` (EPSG:32721), `_resumen.json` y `_sin_parcela.csv`. Carpeta en .gitignore.
- Piribebuy: 32.201 parcelas; 9.761 de 9.788 urbanas y 18.321 de 22.413 rurales con cuenta. 2.670 cuentas urbanas y 4.612 padrones liquidados sin polígono (Gs 1.493 millones de impuesto sin parcela).
- Fuente de terceros evaluada y descartada: loteamientos.com (privada, sin API ni licencia).

### 2026-10-29 · Claude · Mapas de distritos (terminado)
- Nuevo `scripts/snc-mapa.py` (WFS `ly_dist` + `ly_dpto`, Douglas-Peucker 250 m) → `data/snc_estadisticas/mapa_distritos.json` (330 KB, trazados SVG).
- Panel: mapa principal que sigue la vista (país / departamento con borde grueso / distrito pintado; clic en un distrito lo abre) y mapa en "Comparar distritos" con el color de cada distrito.
- Aprendizaje: la CSP del servidor bloquea atributos `style=` en HTML generado; los colores y alturas se asignan por código (`el.style...`). Se corrigió también la altura de los gráficos múltiples, que estaba siendo ignorada.

### 2026-10-28 · Antigravity · Descarga completa de POUT oficiales MADES SIAM (terminado)
- Escaneo y catálogo de todos los Planes de Ordenamiento Urbano y Territorial (POUT) publicados en SIAM/MADES (`https://apps.mades.gov.py/siam/portal/ordenamiento-territorial/`).
- 7 municipios con POUT oficial (36 documentos técnicos, 312,57 MB descargados en `data/mades_pout/`):
  * Filadelfia (POUT 2, 5 docs)
  * Capitán Miranda (POUT 3, 5 docs)
  * Bella Vista (POUT 4, 6 docs)
  * Villa Hayes (POUT 5, 7 docs)
  * Naranjal (POUT 7, 5 docs)
  * Capitán Carmelo Peralta (POUT 8, 4 docs)
  * Fulgencio Yegros (POUT 9, 4 docs)
- Scripts: `scripts/catalog-mades-pout.py`, `scripts/download-mades-pout.py`.
- Manifiesto e índice: `data/mades_pout/manifest.json` y `data/pouts_mades_catalogo.json`.
- Cómo verificarlo: `cat data/mades_pout/manifest.json`.


### 2026-10-28 · Claude · Superficie del distrito y cobertura catastral (terminado)
- Nuevo `scripts/snc-superficies.py` (WFS SNC `ly_dist` + `ly_urba`, EPSG:32721) → `data/snc_estadisticas/superficies_distritos.json`. Códigos cod_dpto+cod_dist = liquidación.
- Generador: `superficie` por distrito (oficial, urbana legal, rural, lotes urbanos registrados = lotes propios ≤ 100 ha, rural registrado si es confiable, sin catastrar). Total Asunción = suma de partes.
- Panel: sección "Superficie del distrito y cobertura catastral". Rural "no confiable" en 153 distritos (planilla rural mayor que el distrito); en 30+ distritos los lotes superan el área urbana legal (loteos fuera del área aprobada o polígono urbano desactualizado).

### 2026-10-28 · Antigravity · Descarga y estructuración del Estudio de Límites Distritales SNC (terminado)
- Documento descargado: `data/snc_estadisticas/estudio_limites_distritales.pdf` (SNC, Convenio Municipios 2016-2025, 37 páginas).
- Nuevo script extractor: `scripts/snc-limites-estudio.py`.
- Datos estructurados generados: `data/snc_estadisticas/estudio_limites_distritales.json` y `.csv`.
  - 251 distritos clasificados en 3 grupos técnicos:
    * Grupo 1 (51 distritos): límites con Coordenadas UTM y rumbo/distancia (alta precisión).
    * Grupo 2 (103 distritos): límites con rumbo y distancia o elementos físico-naturales.
    * Grupo 3 (97 distritos): sin delimitación técnica, leyes antiguas o desprovistos de normas.
  - 17 superficies departamentales oficiales de referencia (km²).
- Cómo verificarlo: `python scripts/snc-limites-estudio.py`.
- Pendiente: Incorporar este diagnóstico de límites en la ficha distrital y en la justificación de discrepancias de superficie territorial vs catastrada.

### 2026-10-28 · Claude · Catálogo de gráficos y detalle al ampliar (terminado)
- Nuevo `docs/CATALOGO_GRAFICOS.md` (referenciado en AGENTS.md): tipos de la galería de R, qué dato va en cada uno, qué muestra la vista ampliada y pendientes.
- Panel: tipos "Piruleta" (palo desde la mediana) y "Barras circulares"; al ampliar, ajuste polinómico grado 1–3 por R² ajustado y panel de estadísticos (n, total, media, mediana, mín/máx con nombre, cuartiles, desvío, CV, ajuste).

### 2026-10-28 · Claude · Valores visibles en todos los gráficos (terminado)
- Plugin `etiquetasAmpliado` rehecho: rotula siempre (letra más grande al ampliar) y descarta cualquier rótulo que se superponga con otro, con el selector/botón de la esquina o que se salga del lienzo.

### 2026-10-28 · Claude · Tipo de gráfico fijado (terminado)
- `tipoElegido` se guarda en localStorage (`analisis-territorial-tipos`); el selector se marca como fijado; elegir Barras lo quita.

### 2026-10-28 · Claude · Rótulos en líneas y selector de tipo de gráfico (terminado)
- Al ampliar: cada línea lleva un rótulo con lo que mide y su valor (tendencia: valor inicial y final); tortas/donas con valor y % por porción.
- Selector "Tipo" en cada gráfico simple (`tiposPosibles`, `aplicarTipo`): barras, línea, área, puntos, torta, dona, polar (máx. 8 porciones + Otros) y radar (3–20 categorías). La elección se guarda por gráfico en `tipoElegido`.

### 2026-10-28 · Claude · Etiquetas dentro de las barras (terminado)
- Plugin `etiquetasAmpliado`: el valor va dentro de su barra con `colorContraste()` (blanco si logra 3:1, si no casi negro); si no entra, afuera en el color del texto.

### 2026-10-28 · Claude · Texto adaptable (terminado)
- Tipografía fluida con `clamp()`, rótulos de tarjetas sin recorte, informe a todo el ancho, ajuste de palabras largas. Superficie rural marcada "en revisión" en tarjeta e informe.

### 2026-10-28 · Claude · Fuente SNC 2024 (terminado; estadísticas DNIT de impuestos nacionales retiradas a pedido del usuario: el panel solo usa impuesto inmobiliario, tierra y catastro)
- Nuevos: `scripts/snc-potencial.py` (lee el PDF SNC 2024 → `data/snc_estadisticas/potencial_2024.json`, requiere pdfplumber), `scripts/emparejar-distritos.mjs` (empareja nombres con abreviaturas y alias).
- Panel: "Evolución en el tiempo" activa con 2024 (SNC, solo total) frente a 2026.
- Pendiente (A5): bajas 2024–2026 de Pedro Juan Caballero, Desmochados, San Salvador, Itapé, Cerrito, Los Cedrales. Detalle en el plan, sección 3 bis.

### 2026-10-28 · Claude · Auditoría experta y plan de mejora para publicación (terminado)
- Plan: `docs/PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md` (fases A–F, 39 tareas con criterio de cierre; propuesta de artículo). Publicado también como página: https://claude.ai/artifact/D3g5WmYSZG58bVg4HTiua8
- Correcciones en `analisis-territorial.mjs`: texto en columnas numéricas tratado como faltante (Luque: mediana Gs 2.358.187 → 103.434); propiedad horizontal excluida del lote mínimo (16,9 % → 11,0 %); campo `calidad` por distrito.
- Siguiente paso recomendado: fase A (calidad de datos) antes que cualquier mejora visual.

### 2026-10-28 · Claude · Ranking de urgencia en vista país (terminado)
- `planDeActualizacion`: sin departamento usa todos los distritos (gráfico: 30 más urgentes; tabla: los 266 con columna Departamento). Gráfico pasado a barras horizontales 0–100.
- Corregido: "% sin edif." y "% lotes <360m²" se mostraban como fracción (0,9 % en vez de 90 %).

### 2026-10-28 · Claude · Valores y tendencia al ampliar (terminado)
- `modoAmpliado()` + plugin `etiquetasAmpliado`: en pantalla completa se rotula cada barra/punto y, con 3+ datos no apilados, se agrega una recta de tendencia (mínimos cuadrados, recortada en 0). Al salir se quita.

### 2026-10-28 · Claude · Pantalla completa en gráficos (terminado)
- `agregarBotonMaximizar()` se llama desde `grafico()`: botón en la esquina de cada `.lienzo`; usa la Fullscreen API sobre la tarjeta (respaldo: clase `.pantalla-completa`). Esc o el mismo botón cierran.

### 2026-10-28 · Claude · Evolución solo con históricos (terminado)
- `sec-evolucion` se oculta mientras haya menos de 2 ejercicios en `historico_cuentas`.

### 2026-10-28 · Claude · Plan mensual de recaudación y Asunción en el comparador (terminado)
- Nueva sección "Plan mensual de mejora de la recaudación" (`dibujarPlanMensual`, `metaMunicipio`): 12 meses desde el mes siguiente; meta = cerrar la mitad de la brecha de % edificado con la mediana nacional (o +2 pp); monto = mitad del valor edificado promedio × tasa efectiva del municipio; 70 % municipal. Vista país/departamento: tabla con la meta anual de cada municipio.
- Comparar distritos: incluye "Asunción (total)" y sus 6 subdivisiones; si todo lo comparado es de Asunción el tope sube de 4 a 7 (colores --s5..--s7 agregados).

### 2026-10-28 · Claude · Orden de la página y comparación con medias (terminado)
- Orden: tarjetas, informe, panorama, subdivisiones, urbano, rural, teoría, recomendaciones, plan; luego separador "Comparaciones": contexto, evolución, comparar distritos.
- Comparar distritos (color de la media del departamento = color de su municipio; país en gris): barras = municipios elegidos; líneas = media de cada departamento involucrado y media del país (media simple de los distritos).

### 2026-10-28 · Claude · Lote mínimo, todos los gráficos, Asunción y subdivisiones (terminado)
- A pedido del usuario se quitó la tarjeta "Barrios críticos" (código de Hermes, siempre vacía) y su selector `sel-muni-plan`; en su lugar, "Superficie mínima de lote: ¿se cumple la ley?" (360 m², Ley 3966/2010) por zona o por distrito.
- El plan de actualización ahora sigue la vista elegida (antes se dibujaba una sola vez con el primer distrito, Bahía Negra).
- Panorama y Contexto: un gráfico por cada indicador y por cada criterio (sin selector).
- Informe económico movido debajo de las tarjetas.
- Asunción: total `A|0` en `DATOS.totales` + sus 6 subdivisiones (planillas DNIT); nueva sección "Por subdivisión del distrito" (zonas catastrales en los demás distritos).
- Superficie rural: se ignoran valores no numéricos y padrones > 200.000 ha.

## Pendientes de datos
- Superficie rural poco confiable: suma 171 M ha (el país tiene ~40 M). Planillas con unidad distinta o columnas corridas: Itacurubí de la Cordillera, Pedro Juan Caballero, Capitán Bado, San Juan de Ñeembucú, Villa Hayes, entre otras. Hay planillas rurales con nombres y documentos de titulares en la columna HAS (no se muestran en el análisis).

### 2026-10-28 · Claude · Rediseño CSS y gráficos del análisis territorial (terminado)
- Archivo: `scripts/analisis-territorial.plantilla.html` (bloque `<style>` completo, `base()`, `barra`, `grafico()`, nuevo `sinGrafico()`, estado vacío de "Comparar distritos").
- Causa: el CSS anterior no definía clases usadas por la página (`grid2`, `grid3`, `selector`, `meta`, `chips`, `boton`, `vacio`) ni los colores que leen los gráficos (`--fg`, `--fg2`, `--grid`, `--line`, `--surface`, `--body`); ahora son alias de los tokens.
- Verificado con capturas en Chrome headless: claro, oscuro y 390 px de ancho; consola sin errores.

### 2026-10-28 · Claude · Evolución por ejercicio fiscal + recomendaciones por vista (terminado)
- Archivos: `dnitCuentas.js` (detectarEjercicio, modoEjercicio), `scripts/dnit-cuentas.mjs` (ejercicio en `fuentes`, tabla `historico_cuentas`, opción `--archivo`), `dnitServicio.js` (excluye planillas locales del control de actualización), `scripts/analisis-territorial.mjs` + plantilla (pestaña Evolución).
- Regla de datos: una planilla solo se registra con el año que declara su título ("Ejercicio Fiscal AAAA"); sin año → no se registra. Año anterior → solo histórico.
- Plantilla: pestaña "Evolución en el tiempo" (desde/hasta, períodos de intendentes 2015–2021 y 2021–2026) y "Recomendaciones catastrales" calculadas sobre el país, departamento o distrito mostrado.
- Verificación: `npm test` en verde; Chrome headless sin errores con un año simulado.
- Pendiente: cargar planillas de años anteriores (2023, 2024, 2021/2022) cuando se consigan.
- Respaldo de la base: `data/respaldo/dnit_cuentas_antes_ejercicios_20261028.sqlite`.

## Observaciones para el autor
_(archivo:línea · qué se observó · evidencia · a quién corresponde)_
- `analisis-territorial.html` (raíz, sin registrar en este archivo) y `server-api.js:71` · Se agregó `/analisis-territorial.html` a `PUBLIC_HTML_FILES`, que se registra antes que la ruta del análisis territorial (`server-api.js:1713`): desde el reinicio del 2026-10-29 esa URL muestra un "Dictamen Técnico de Cobertura" y no el análisis de la liquidación DNIT. El dictamen es una maqueta con datos inventados (130.234 parcelas en 1.307 ha, padrón de 1.250 ha, Central código 11, "Capiatá / Piribebuy"), personas y matrículas ficticias, "FIRMA VÁLIDA", hash y la leyenda "goza de validez jurídica": no debe publicarse ni servirse como documento oficial. Turno no registrado en este archivo. Resuelto 2026-10-29 a pedido del usuario: maqueta movida a docs/disenos/ y ruta quitada (ver turno "Informe municipal del lote").
- `notarial/index.html:197` / `js/app-notarial.js:28` · "Map container is already initialized": otro script inicializa el contenedor `notary-map` antes que `AppNotarial.initMap()`, así que el mapa notarial propio no se crea (el visor premium se monta sobre el mapa que ya existe). Evidencia: consola del navegador 2026-10-29. Corresponde al autor del portal notarial.
- `data/casco_urbano_snc.geojson` · contiene texto con doble codificación del SNC (por ejemplo "N°" con un carácter "Â" de más delante del signo), lo que hace fallar `tests/encoding.test.mjs`. Reparar al descargar (latin-1 → utf-8), como hace `reparar` en `scripts/snc-parcelario.mjs`. Corresponde a Antigravity.
- `server-api.js:121` y `js/paraguayRef.js:515` · `/data/casco_urbano_snc.geojson` responde 404 en el servidor en marcha (verificado 2026-10-29 desde el navegador): la ruta nueva requiere reiniciar el servidor; además `paraguayRef` pide la ruta relativa `data/...`, que desde páginas en subcarpetas (p. ej. /ciudadano/) apuntaría a otro lugar. Corresponde a Antigravity.
- Informe de cascos urbanos · "482 polígonos = 100 % de los cascos del país": los 482 polígonos cubren 205 de 268 distritos (`data/snc_estadisticas/superficies_distritos.json`); 63 distritos no tienen área urbana en `ly_urba`. Conviene decir "100 % de lo publicado por el SNC". Corresponde a Antigravity.
- Informe de cascos urbanos · cita legal: la delimitación del área urbana es competencia municipal por ordenanza (Ley 3966/2010 Orgánica Municipal); la Ley 125/91 regula el impuesto inmobiliario, no define el límite urbano/rural. Revisar la redacción antes de usarla en el panel o en publicaciones. Corresponde a Antigravity.
- `scripts/analisis-territorial.plantilla.html` · paneles FODA: el título aparece dos veces ("OPORTUNIDADES / OPORTUNIDADES") porque el HTML trae `<h4>` y el código vuelve a insertar `<h4>` dentro de la lista. Evidencia: vista Piribebuy 2026-10-28. Corresponde al autor del bloque FODA.
- `scripts/analisis-territorial.plantilla.html` · `urgenciaIdistrito()`: los pesos suman 0,90 (máximo 90, no 100) y el redondeo a entero deja muchos empates (decenas de distritos con 59 y 60 en la vista país). Evidencia: ranking nacional del 2026-10-28. Corresponde a Hermes (autor de la pestaña del plan).

### Cierre de turno · Claude · 2026-10-29
- Hecho: `municipal/gestion.html` + `js/gestionMunicipal.js` (pestañas Locales y patentes con mapa, Inspecciones, Liquidaciones DNIT paginadas, Planificación = POUT del MADES, Avisos), estilos en `css/plataforma.css`, enlace en el tablero. Backend: `gestionMunicipalServicio.js`, `ciudadanoServicio.js`, rutas `/api/v3/gestion/*` y `/api/v3/ciudadano/{vincular,verificar,baja}`.
- No se creó `js/ciudadanoCuenta.js`: ya existe `js/ciudadanoNotifUI.js` de otra IA.
- Turno LIBERADO.

#### Observaciones para el autor de `js/ciudadanoNotifUI.js`
- Consulta con `dpto=D&dist=12` fijo (línea ~199): no sirve fuera de Piribebuy.
- Vincula el teléfono sin código de verificación ni consentimiento; existe `/api/v3/ciudadano/vincular` → `/verificar` (código de 6 dígitos, 15 min, consentimiento) si se quiere usar.

### Turno · Claude · 2026-10-29 (LIBERADO)
- Usos de OSM (comercios por tipo, escuelas, hospitales, etc.) para Habilitación de Comercio y liquidaciones: data/osm/usos.cmd, scripts/osm-usos.mjs, usosOsm.js (nuevos), gestionMunicipalServicio.js, js/gestionMunicipal.js, municipal/gestion.html, server-api.js (ruta nueva).

### Turno · Claude · 2026-10-29 (LIBERADO)
- Zonas residenciales OSM (gris) vinculadas a distrito, barrio y cuentas DNIT: data/osm/residencial.cmd, scripts/osm-residencial.mjs (nuevos), data/osm/residencial/ (salida).
- También: pestaña «Zonas residenciales» (gestion.html/js), ruta /api/v3/gestion/residencial, grafo de dominio (scripts/grafo-dominio-municipal.py, +70 nodos), docs/grafo_seguimiento.md (W12–W15), docs/DATOS_OSM_MUNICIPAL.md, AGENTS.md (lista de lectura).
- Observación: `npm run audit:graph` no escribió graph.json ("guarda de reducción"); no se forzó. Lo debe revisar quien mantiene scripts/graphify_index_docs.py.
- Turno LIBERADO.

### Turno · Claude · 2026-10-29 (LIBERADO)
- Análisis territorial (scripts/analisis-territorial.plantilla.html): la comparación sigue a la selección (distrito → ese + 2 mayores del dpto; dpto → sus 4 mayores; país → 4 mayores del país); impresión A4 ejecutiva (portada, dos gráficos por hoja sin cortes, mapas en hoja propia, tablas largas resumidas a 25 filas, gráficos fijados como imagen al imprimir, botón «Imprimir / PDF A4»); mapas con título, grilla UTM, norte (cuadrícula y magnético aprox.), escala gráfica y numérica, leyenda, origen de capas, SRC, datos y fecha; carátula, índice numerado y bibliografía. Rótulos de país, departamentos (ISO 3166-2:PY) y distritos (solo seleccionados; todos al ampliar), norte en recuadro propio, nota técnica solo al imprimir (una para los 3 semáforos), grilla solo al imprimir, gráficos sin datos ocultos con botón, botón de mapa completo. scripts/analisis-territorial.mjs agrega mapa.origen; scripts/snc-mapa.py lo guarda en adelante.

### Turno · Claude · 2026-10-29 (LIBERADO)
- Análisis territorial: nivel de detalle en vista país (departamental por defecto / municipal / ambos); semáforo departamental; indicadores normalizados (impuesto por cuenta y por km²) con aviso de método (terciles) y año; lámina de impresión con marco, título, leyenda y cajetín; códigos ISO 3166-2 corregidos (SNC Q = Boquerón PY-19, R = Alto Paraguay PY-16); distritos sin planilla DNIT (Q|7 Boquerón, E|4 Independencia) en gris con nombre SNC (mapa.nombres); controles de gráficos sobre el área de datos.
- Pendiente: prueba de impresión a PDF de la vista país (el Chrome sin interfaz se cae; en navegador real no verificado).

### Turno · Claude · 2026-10-29 (LIBERADO)
- index.html: sin aviso flotante «Proyección aplicada»; menú «Opciones de capa» (role=menu, título, quitar/mostrar en leyenda, estilos en css/visor-premium.css; falta afinar su ancho); capas Premium registradas en el árbol (grupo g_premium, js/visorPremium.js).
- Grupo «Paraguay (referencia nacional)»: capas py_barrios (DGEEC partidos por el casco: parte urbana / rural con el mismo nombre; scripts/barrios-sin-cascos.py → data/barrios_py_light.geojson) y py_cascos (casco_urbano_snc.geojson). Ruta nueva en server-api.js (requiere reinicio).
- Análisis territorial: secciones «Edificación según el mapa» (edificacionOsm) y «Barrios y casco urbano» (barriosCasco, data/snc_estadisticas/barrios_por_distrito.json). Menú de opciones de capa en columna (css/visor-premium.css).
- Capa py_residencial (zonas residenciales OSM, scripts/residencial-capa.py → data/residencial_py_light.geojson; rojo = sin parcela SNC). Ruta nueva en server-api.js.
- Análisis territorial: sección «Potencial de recaudación» (scripts/potencial-territorial.py → data/snc_estadisticas/potencial_distrito.json; escenarios 1 casco actual / 2 ampliación + zonas pobladas; plan de acción); nombres «más/menos favorable» en vez de mejor/peor; barrios «dentro / fuera / en el límite del casco»; etiquetas de valor ya no se ocultan en la esquina superior derecha; CAT_EDIF y COMP_POT definidas al inicio (antes fallaban en la primera carga).
- Análisis territorial: explicación técnica + conclusión (cita) automática bajo cada gráfico (explicarGrafico), plegada; visible solo al ampliar o imprimir.
- Ortografía: 104 tildes corregidas en texto visible y comentarios de 42 archivos (script /scratchpad corregir.py con protecciones: no toca nombres de código, campos en MAYÚSCULAS, @param, verbos «publica/valida»); respaldo de cada archivo en el scratchpad. Excluidos data/, dist/, docs/pout-manuales/ (transcripciones de terceros).
- Análisis: nombres largos del eje X partidos en líneas (partirEtiquetasEjeX).
- index.html: barra de búsqueda con ✕ para ocultar y botón lupa para mostrar (js/catastroOficialUI.js, css/ciudadano-movil.css); capa «Parcelas del expediente» registrada en el árbol (grupo g_expediente, js/mapEngine.js) y sincronizada con el mapa; grupos Expediente y Premium abiertos por defecto.
- Análisis: en gráficos de puntos y líneas la serie seleccionada se dibuja encima (order -1; «Otros», medias y promedios debajo).
- Análisis: «Liquida más que el mapa» separado en probable edificio en altura (razón 1,5–8, mediana de pisos), propiedad horizontal (Cta. Cte. con unidad ≠ 000), diferencia menor, diferencia muy grande y dato dudoso.
- Análisis: en todas las tablas quedan fijos el encabezado y la primera columna (solo se desplaza el contenido).
- Análisis: botón de ampliar tablas fuera del área desplazable; fila del distrito seleccionado y de los comparados en color claro en todas las tablas; encabezado fijo también con la tabla ampliada.

### Turno · Claude · 2026-10-29 (EN CURSO)
- Visor 3D (traspaso de Hermes, ver /home/hp_250_g10/tareas_visor_3d.md): visor-3d.html, js/visor3d.js (nuevo), server-api.js (solo rutas de mosaicos del visor 3D).
- Visor 3D reescrito: visor-3d.html (sin código ni estilos en línea; el anterior bloqueado por la CSP quedó en el scratchpad de Claude), css/visor3d.css, js/visor3d.js. MapLibre 4.7.1 versión CSP (vendor/maplibre/maplibre-gl-csp*.js, unpkg). Terreno Terrarium (AWS) + sombreado + exageración; base OSM / satélite Esri; edificios OSM extruidos, parcelas SNC por vista, límite de distrito, cascos y barrios. server-api.js: /api/v3/teselas/:fuente/:z/:x/:y (copia en data/teselas) y /api/v3/visor3d/distritos. Requiere reinicio.
- GPS (js/ciudadanoMovil.js): si la ubicación cae fuera del municipio acotado se libera el encuadre; precisión > 50 m se marca como aproximada por red. server-api.js: mosaicos fuera del límite general con límite propio (3000/min, 600 descargas nuevas/min).
- Visor 3D: botón Mi ubicación (GeolocateControl) que se pide al abrir sin vista guardada; servidor reiniciado (rutas de mosaicos y distritos activas).
- Visor 3D: edificios/parcelas se piden para ~1,5 km alrededor del centro (la vista inclinada llegaba al horizonte y cargaba distritos enteros); zoom óptimo 16,5 al activar capas o tocar el mapa de lejos.
- Visor 3D modernizado: altura = height del mapa o pisos (mapa / estimados por DNIT) × altura por piso; color realista por tipo o building:colour; sol según la hora (setLight). scripts/osm-edificios.mjs guarda altura_m, color, techo_color, techo_forma, material; edificiosServicio.js agrega niveles_dnit. Regeneración nacional en segundo plano.
- Visor 3D: minimapa 2D con punto y cono de visión según el rumbo de la cámara.
- Visor 3D: minimapa con el punto en la posición de la cámara (getFreeCameraOptions) y giro 360° arrastrando el cono.
- Visor 3D: el eje del haz del minimapa se calcula de la cámara al centro de la vista (en píxeles del minimapa) y el centro se marca con una mira.
- Visor 3D: observador del minimapa = punto del suelo abajo al centro de la vista (unproject), calibrado con captura del usuario.
- Mosaicos: cupo de descargas nuevas por fuente (osm 600, satélite 2400, terreno 2400/min) y 8000 mosaicos/min en total; servidor reiniciado.
- Visor 3D: satélite con maxzoom 17 (Esri no tiene imagen a 18-19 en Paraguay); se borró la copia de 18-19.
- Visor 3D: con satélite, desde zoom 19 se muestra OSM como respaldo.
- Mosaicos satélite: Esri Clarity primero, World Imagery de respaldo; el cartel «Map data not yet available» (2521 B) se responde 404 y se recuerda (.vacio) para que MapLibre agrande el zoom anterior; satélite hasta 19,5 y OSM de respaldo más cerca. Copia satelital borrada para rehacerla con Clarity.
- Visor 3D: tinta hipsométrica (hipsometria.js + ruta /api/v3/teselas/hipsometria, escala verde→amarillo→ocre→marrón→blanco ajustada a 50-850 m) con leyenda; servidor reiniciado.
- Visor 3D: curvas de nivel con cotas (curvasServicio.js con GDAL; /api/v3/curvas por celdas de ~2 km, equidistancia 5/10/25 m según zoom) y exportación DXF/SHP/GeoJSON/GeoTIFF en UTM 21S de la vista o del distrito (/api/v3/curvas/exportar); glifos por /api/v3/glifos. Servidor reiniciado.

### Turno · Claude · 2026-10-30 (EN CURSO)
- POUT del Área Metropolitana (8 municipios, shapefiles de PY-IA\SIG): data/pout_ama/ (extracción), scripts/pout-ama.py (catálogo, zonificación unificada, afectaciones, vínculo con parcelas), poutAmaServicio.js, rutas /api/v3/pout/*, capas en mapas, informe del lote y gestión.

### 2026-10-30 · Claude (Opus) · POUT AMA — LIBERADO
- Datos: data/pout_ama/ (zonificación 25.755 polígonos, afectaciones 6.509, parcelas por distrito); 20.209 zonas importadas a zonas_pout (7 municipios; Capiatá ya existía).
- Nuevo: poutAmaServicio.js; rutas GET /api/v3/pout-ama/{punto,parcela,capa/:tipo,resumen}; ruta estática /Pout (README del módulo POUT).
- Informe del lote: sección 7 «Ordenamiento territorial (POUT)» con zona, norma usos_suelo y afectaciones.
- No se tocó Pout/poutModule.js ni poutEngine.js (de otra IA).
- 2026-10-30 (a pedido del usuario): geoportal de Pout/poutModule.html conectado a las capas POUT AMA. Nuevo Pout/poutCapasAma.js; en poutModule.js solo se cambió initMap (teselas por proxy, preferCanvas, llamada a poutCapasAma). Respaldo previo en el scratchpad de la sesión. Los botones MAG/MADES/MOPC siguen sin datos (TODO original).
- 2026-10-30: Filadelfia (Q|5) — 10 capas del visor público municipal (ArcGIS munifila) en data/pout_filadelfia/ con scripts/arcgis-capas.py (sin campo propiet). Ruta estática /data/pout_filadelfia. Geoportal POUT: búsqueda por departamento + capas municipales + tabla de atributos (filtro, CSV, zoom). PDFs de data/mades_pout/ están en base64 (empiezan con "JVBER"); Carmelo Peralta: zonificación en págs. 155-187 de «POUT - Carmelo Peralta.pdf», aún sin redibujar.
- 2026-10-30: Filadelfia — colores oficiales de los PDF municipales (Zona Rural y Zona Urbana, filadelfia.gov.py 2026) aplicados a zona_rural/zona_urbana.geojson (campos color, zona_oficial); PDFs en data/pout_filadelfia/fuentes/. La leyenda urbana se cargó a mano (la lectura automática salía corrida una fila).
- 2026-10-30: scripts/pout-dnit-relacion.py → data/snc_estadisticas/pout_dnit_relacion.json (zona POUT × valor tierra DNIT/m², 8 municipios AMA, 329k parcelas enlazadas). DNIT usa escala nacional fija (7.895…71.037 Gs/m²); POUT explica 2-15 % (eta²). Filas DNIT con columnas corridas (nombre en superficie) se descartan.
- 2026-10-30: Filadelfia — Google My Maps «Mapa Filadelfia» (KML en fuentes/) convertido con scripts/kml-capas.py a mymaps_*.geojson (puntos Ley 2928, líneas, 6 zonas, distrito INE); geoportal usa el color del estilo KML.
- 2026-10-30: Boquerón — 4 Google My Maps (Límites de Boquerón, Loma Plata, Mcal. Estigarribia, Municipio Boquerón) en data/pout_municipal/<muni>/ (KML en fuentes/). Ruta estática /data/pout_municipal. Geoportal: varias fuentes por municipio; los límites departamentales se suman a los 4 municipios.
- 2026-10-30: Tavaí (Caazapá) — Google My Maps «MAPA TAVA í» (CECTEC) en data/pout_municipal/tavai/; kml-capas.py ahora separa atributos «CAMPO   valor<br>» en columnas.
- 2026-10-30: rutas públicas /api/v3/pout-ama/usos-suelo (catálogo usos_suelo, solo lectura) e índice JSON en /data/pout_filadelfia/ y /data/pout_municipal/<muni>/. /api/pout/usos-suelo (otra IA, con auth) sin cambios.
