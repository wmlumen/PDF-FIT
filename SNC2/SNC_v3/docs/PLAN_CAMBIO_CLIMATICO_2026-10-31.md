# Plan de incorporación: módulo de Cambio Climático — SNC v3 (2026-10-31)

> **Prompt único para cualquier IA agente (Hermes, Claude, Antigravity, OpenCode, Codex, etc.)**: este
> es el documento maestro del módulo de Cambio Climático. Si vas a operar, desarrollar, integrar o
> extender algo en `Cambio_climatico/`, `climaServicio.js` o cualquier capa climática — leé este
> archivo entero primero, no otro. Unifica dos documentos que nacieron en paralelo el 2026-10-31
> (`docs/PLAN_CAMBIO_CLIMATICO_2026-10-31.md` de Claude y `Cambio_climatico/PROMPT_CAMBIO_CLIMATICO_SNCV3.md`
> de Antigravity, ver el historial de abajo) a pedido explícito del usuario ("unificar el prompt para
> que tenga un solo prompt", 2026-11-01). El archivo de Antigravity quedó como redirección a este.
>
> Documento de trabajo para agentes de IA y personas, mismo formato que
> [`PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md`](PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md) y
> [`PLAN_MEJORA_PRODUCTO_2026-10-27.md`](PLAN_MEJORA_PRODUCTO_2026-10-27.md).
>
> Origen: el usuario pegó una investigación extensa (research de IA, sin verificar) sobre un "Mapa
> Hiperactivo de Cambio Climático" para Paraguay en `Cambio_climatico/2.txt` (31 KB) y
> `Cambio_climatico/Nuevo Documento de texto.txt` (27 KB, subconjunto del anterior). Pidió "el prompt
> para que las IA puedan ver y trabajar, en sintonía con SNC v3" — este documento es ese prompt:
> diagnostica qué de esa investigación es aprovechable tal cual, qué choca con el stack real del
> proyecto, y da una lista de tareas acotada y verificable en vez de las ~150 capas/indicadores
> listados en el research.
>
> **Estado al 2026-11-01: arrancado.** `CC-01` está implementado y verificado (Antigravity): endpoint
> `/api/v3/clima/tiempo` en `server-api.js`, módulo `climaServicio.js`, test en `clima.test.mjs` (raíz
> del repo — debería vivir en `tests/`, ver observación en §1.4). `Cambio_climatico/panel.html` dejó de
> ser una maqueta estática: ahora es un tablero Leaflet interactivo con datos en vivo de Open-Meteo
> (detalle en §1.4). El resto de `CC-xx` sigue sin empezar.
>
> **La auditoría de seguridad del 2026-10-18 sigue vigente.** Nada de este plan toca las zonas
> congeladas (`firebase.json`, `.env`, `config.env.js`, auth/IDOR de `server-api.js`, esquema de
> `db.cjs`), así que ninguna tarea de aquí está bloqueada por la Fase 0 — pero el resto de reglas de
> `AGENTS.md` (ciclo ruteo→check→lock→código+test, UTF-8 sin BOM, un hallazgo por cambio) aplican igual.

---

## 0. Cómo trabajar este plan entre varias IA

1. **Leer primero** `AGENTS.md` completo (protocolo de turnos) y este documento entero antes de tocar nada.
2. **Tomar una tarea `CC-xx` por vez**, de un solo carril (§2). No mezclar carriles en un mismo cambio.
3. **Seguir el ciclo de `AGENTS.md` §2**: `node .opencode/coordination/cli.mjs route/check/lock` antes de
   editar, `pass`/`fail` al terminar, entrada en `docs/TURNOS_IA.md`.
4. **No hay fuente de datos "oficial" todavía decidida para cada capa.** Antes de escribir código que
   descargue de una API externa, dejar una línea en la tarea de qué endpoint exacto se usó (URL, sin
   API key hardcodeada si la API la requiere — usar `.env`, nunca commitear la clave).
5. **Cerrar solo con criterio verificable**: un `curl` reproducible al endpoint nuevo, o una captura del
   dato renderizado en el visor. Nada de "debería funcionar".
6. El Carril C (satelital/pesado) **no se empieza sin que el usuario decida explícitamente** si monta un
   servicio Python aparte o se descarta — ver §2.3.

---

## 1. Diagnóstico del material de partida

### 1.1 Lo que sí es directamente aprovechable

El research (`Cambio_climatico/2.txt`) es una buena lista de **fuentes de datos reales y gratuitas**
(Open-Meteo, NASA FIRMS, CHIRPS, Global Forest Watch, HydroSHEDS, Copernicus CDS, NASA EarthData) y de
**qué indicador calcula cada una**. Esa parte es útil como catálogo de referencia y se cita en §4.

### 1.2 Choque de stack: el research asume una plataforma que SNC v3 no es

El documento (sección "Stack Tecnológico", líneas ~1374-1458 de `2.txt`) propone Python 3.11 +
`xarray`/`rioxarray`/`xclim`/`Dask`, PostgreSQL+PostGIS, FastAPI + Celery/Redis, Airflow/Prefect, y un
frontend React/Next.js aparte. **SNC v3 es otra cosa**: Node.js + Express puro (`server-api.js`, zona
congelada §1.3 de `AGENTS.md`), SQLite (`db.cjs`, `cacheDb.js`), HTML/CSS/JS vanilla servidos
directamente, MapLibre GL ya integrado en `visor-3d.html`/`js/visor3d.js`. Montar el stack completo del
research sería reescribir el proyecto, no agregarle un módulo.

**Decisión de este plan**: no adoptar xarray/Dask/PostGIS/Airflow de entrada. Las primeras tareas
(Carril A y B) se hacen con lo que ya existe — `fetch` simple desde `server-api.js`, caché en
`cacheDb.js` o una tabla nueva de SQLite, capas GeoJSON servidas igual que `/api/v3/hidrografia`
(ver `scripts/osm-hidrografia.mjs`, añadido 2026-10-31). Si eso resulta insuficiente para un indicador
concreto (p. ej. procesar un GRIB/NetCDF de ERA5), se evalúa un servicio Python aparte **para ese
indicador puntual**, no como migración general — y esa decisión es del usuario, no de la IA de turno
(§2.3).

### 1.3 `panel.html`: de maqueta a tablero propio (actualizado 2026-11-01)

Al escribir este plan, `Cambio_climatico/panel.html` era una maqueta estática (13 tarjetas con los
nombres de los indicadores del research, sin datos). Antigravity lo convirtió en un tablero Leaflet
interactivo con datos en vivo de Open-Meteo, estaciones de monitoreo clave y un simulador de escenarios
IPCC AR6 — ver §1.4. **Sigue siendo un panel aparte, no integrado a `visor-3d.html`/MapLibre** (Leaflet
en vez de MapLibre, fuera del árbol de capas `hidro`/`edificios`/`parcelas`). Eso no es un error — es
una decisión de diseño válida para iterar rápido — pero cualquier IA que continúe el módulo debe decidir
explícitamente si este panel queda como herramienta aparte o si sus capas se integran al visor principal,
en vez de asumir una u otra sin decirlo.

### 1.4 Qué de esto YA existe en SNC v3 (no reinventar)

| Lo que pide el research | Lo que ya hay en el repo |
|---|---|
| "Ríos / Arroyos / Humedales" (capa básica §1, §3) | `data/osm/hidrografia/` + `data/1.Paraguay/02.Hidrografia/hidrografia_oficial/`, servidos por `/api/v3/hidrografia` (2026-10-31, ver `docs/TURNOS_IA.md`) |
| "Inundaciones" (riesgo, §4) / simulador de crecida | Simulación de inundación por cotas DEM en `js/visor3d.js` (`contornoSuaveInundacion`, conectividad hidráulica, cuencas calibradas `CUENCAS`), con lluvia **ingresada a mano** en mm — no hay feed en vivo de DINAC todavía (`actualizarDinac()` solo clasifica el mm que escribe el usuario) |
| "Modelos digitales de terreno" / SRTM | Terreno 3D real vía `/api/v3/teselas/terreno/{z}/{x}/{y}` (Terrarium/AWS) ya integrado |
| "Departamentos / Distritos / Parcelas / Zonificación" (§5 territorial) | Catastro completo: `data/parcelario/`, `/api/v3/parcelario/vista`, vínculo DNIT |
| "Cobertura vegetal / uso de suelo / edificios" | `data/osm/usos/`, `data/osm/residencial/`, `data/osm/edificios_py.fgb` (ver `docs/DATOS_OSM_MUNICIPAL.md`) |
| Análisis por distrito con tablas e índices propios | `scripts/analisis-territorial.mjs` + `docs/PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md` (metodología para construir un índice nuevo sin inventar de cero: Gini, normalización por población, etc.) |
| Catálogo de qué gráfico usar para cada dato | `docs/CATALOGO_GRAFICOS.md` — consultarlo antes de diseñar una visualización nueva de clima |

Cualquier tarea `CC-xx` que toque algo de esta tabla debe **extender** el archivo existente, no crear un
paralelo (p. ej. una nueva capa de hidrografía "para clima" sería un duplicado de `/api/v3/hidrografia`).

### 1.5 Índices SNC-DI: nomenclatura única (fusionado del documento de Antigravity)

Si una tarea calcula un índice territorial, usar estos nombres — no inventar otros:

| Índice | Qué combina | Estado |
|---|---|---|
| **ICT** — Climático Territorial | Temperatura, lluvia, viento | **Implementado** en `climaServicio.js` (`calcularIndicesSncDi`): `0,5·temp + 0,3·lluvia + 0,2·viento`, normalizado 0-100, niveles Bajo/Medio/Alto/Crítico. Simplificado respecto a la idea original (anomalía térmica + sequía + pérdida de cobertura) — documentarlo si se amplía. |
| **IRT** — Riesgo Territorial | `Amenaza × Exposición × Vulnerabilidad` | **Implementado** (parcial): usa `ICT` como amenaza, exposición y vulnerabilidad con valores fijos (0,65 / configurable) — no son datos reales de exposición/vulnerabilidad todavía, son placeholders. No citar el resultado como definitivo hasta reemplazarlos por datos reales (población INE, infraestructura). |
| **IST** — Sostenibilidad Territorial | Bosque, agua, biodiversidad, carbono | Nombre definido, **fórmula pendiente** — no inventar pesos sin justificar (regla §3) |
| **IRM** — Resiliencia Municipal | Infraestructura, servicios, gestión ambiental | Nombre definido, **fórmula pendiente** |
| **IPOOT** — Ordenamiento y Ocupación Territorial | Uso de suelo vs. zonificación permitida vs. riesgo | Nombre definido, **fórmula pendiente** |

---

## 2. Tareas

### 2.1 Carril A — Datos climáticos vivos, API simple + caché (puede empezar ya)

Patrón a seguir: el ya usado para el WFS de `catastro.gov.py` (`server-api.js` líneas ~1748-1763,
`responderOficial()` + `Cache-Control`) — `fetch` a la API pública, sin credenciales de usuario, con
caché server-side para no golpear la API externa en cada request del mapa.

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| CC-01 | [x] Endpoint `/api/v3/clima/tiempo?lat=&lng=` — Open-Meteo (gratis, sin API key) para temperatura/precipitación/viento actuales y pronóstico 7 días de un punto | — | `server-api.js`, `climaServicio.js` | Implementado y verificado (4/4 tests en `clima.test.mjs`, caché TTL 10m y fallback regional). Endpoint montado en `server-api.js:499`. |
| CC-02 | [x] Endpoint `/api/v3/clima/incendios?minX=&minY=&maxX=&maxY=` — NASA FIRMS focos de calor activos (CSV público, últimas 24-48h) recortado a Paraguay, cacheado 1h | CC-01 (reusa módulo) | `climaServicio.js`, `server-api.js` | Implementado y verificado (GeoJSON FeatureCollection, filtrado por BBOX, soporte CSV vacío y fallback calibrado). Endpoint montado en `server-api.js`. |
| CC-03 | [ ] Capa "Incendios activos (NASA FIRMS)" en `visor-3d.html`/`js/visor3d.js`, mismo patrón de capa que `hidro` (toggle, `setData`, refetch en `moveend`) | CC-02 | `js/visor3d.js`, `visor-3d.html` | Verificado en el navegador: puntos reales de incendios activos (si los hay esa semana) o, si no hay focos, al menos 0 errores en consola y el toggle funciona |
| CC-04 | [x] Endpoint `/api/v3/clima/lluvia-historica?lat=&lng=&desde=&hasta=` — Open-Meteo Archive (ERA5 / ERA5-Land), para alimentar `actualizarDinac()`/`aplicarLluvia()` con un dato real en vez de que el usuario tipee el mm a mano | CC-01 | `climaServicio.js`, `server-api.js` | Implementado y verificado (serie diaria, acumulado mm, días con lluvia). Endpoint montado en `server-api.js`. |

### 2.2 Carril B — Índices propios reusando lo que ya hay (puede empezar ya, sin APIs externas)

No depende de ninguna integración nueva: combina datos que YA están en el repo (§1.4). Es el carril con
menos riesgo y el más rápido de verificar.

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| CC-05 | [x] Primer borrador de "Índice de Riesgo de Inundación por distrito" combinando solo datos locales: % de área del distrito bajo cierta cota (DEM ya servido) + densidad de hidrografía (`/api/v3/hidrografia`) + cantidad de parcelas/catastro en esa zona | Hidrografía (hecho) | `Cambio_climatico/indice-riesgo-inundacion.mjs` | Procesados los 266 distritos de Paraguay. Sanity check aprobado: distritos de cotas más bajas (Pilar 47m, Alberdi 50m, Bañados Capital 49m) encabezan el ranking con riesgo extremo (IRI 95-97). |
| CC-06 | [x] Documentar el/los gráficos nuevos de CC-05 en `docs/CATALOGO_GRAFICOS.md` siguiendo su convención existente | CC-05 | `docs/CATALOGO_GRAFICOS.md` | Documentado en tabla de `docs/CATALOGO_GRAFICOS.md` (tipo Lollipop / Barras con línea base mediana para los 266 distritos). |

### 2.3 Carril C — Satelital / series climáticas pesadas (NO empezar sin decisión del usuario)

Esto es lo que de verdad requeriría el stack Python/xarray/PostGIS del research (Sentinel, ERA5/CMIP6,
NetCDF). Antes de tocar una sola línea de esto, la IA de turno debe preguntarle al usuario si:

(a) se monta un **servicio Python separado** (otro proceso, otro puerto, consumido por `server-api.js`
    como un microservicio más — no reemplaza nada del Node existente), o
(b) se **descarta** por ahora y se cubre lo posible con APIs REST simples del Carril A (Sentinel Hub y
    Google Earth Engine también tienen endpoints REST sin necesitar xarray local, aunque con más
    límites de cuota).

No hay tarea `CC-xx` numerada aquí todavía — se numera cuando el usuario decida (a) o (b).

---

## 3. Explícitamente fuera de alcance por ahora

Estas ideas del research son visión de largo plazo, no tareas: **no** abrirlas como `CC-xx` sin que el
usuario las pida expresamente.

- Gemelo digital territorial / simulaciones "¿qué pasa si...?" a escala país.
- IA conversacional sobre el territorio (chatbot tipo ChatGPT sobre el SIG).
- Mercado de carbono por inmueble, certificado notarial-ambiental automático.
- App móvil ciudadana de reportes (incendios, basurales, deforestación con geolocalización).
- Cualquiera de los 5 índices "Decision Intelligence" (ICT/IRT/IST/IRM/IPOOT) del research como fórmula
  cerrada — si se construyen, que sea **después** de CC-05 y con la misma rigurosidad que exigió
  `PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md` (normalizar, declarar la fórmula, no inventar pesos
  sin justificar).

## 4. Catálogo de fuentes externas (referencia, no todas se usan en Carril A/B)

De `Cambio_climatico/2.txt`, las que no requieren API key y tienen endpoint REST directo (candidatas a
Carril A): **Open-Meteo** (`api.open-meteo.com`), **NASA FIRMS** (CSV/GeoJSON público),
**CHIRPS** (descarga directa), **Global Forest Watch API**, **Overpass API** (ya usado en el proyecto,
ver `scripts/osm-*.mjs`). Las que requieren cuenta/API key o procesamiento pesado (Carril C):
**Copernicus CDS**, **Sentinel Hub**, **Google Earth Engine**, **NASA EarthData** (MODIS/ERA5 crudo).

## 5. Recomendación de orden (no obligatorio, pero evita trabajo tirado)

CC-01 → CC-02 → CC-03 (demuestra el patrón completo API externa → caché → capa en el visor, con el
menor riesgo) → CC-05/CC-06 en paralelo (no depende de lo anterior) → CC-04 → recién ahí evaluar §2.3.
