# MEMORY.md — Entorno de operación (SNC_v3)

## Proyecto
- **SNC_v3**: Plataforma catastral geopolítica de Paraguay (SNC N° 551/2023).
- **Coord:** SIRGAS-Cono Sur/WGS84, UTM 20S/21S (EPSG:32720/32721).
- **Repo:** `/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3` — git HEAD `1f89973a3342a3ae477e595dc582aa8eea38bc1d`.
- **Server:** Express en `http://localhost:5556/`, API `/api/v3/dnit/*`. `node server-api.js`.
- **DNIT SQLite:** `data/dnit_cuentas.sqlite` — cuentas_urbanas 1,862,698 · cuentas_rurales 1,258,173 · fuentes 541 · cambios 3,122,243. El generador usa SQLite; la API es alternativa.

## Stack
- Node/JS + Firebase + Vite + Tailwind + Leaflet + proj4 + Turf + Express (server-api.js, port 5556).
- Archivos principales: `index.html`, `js/app/index.js` (markers), `js/mapEngine.js` (labels/measures), `css/styles.css`, `js/crs.js`, `js/config.js`, `js/layerPanel.js`, `js/layerManager.js`, `js/workspace.js`, `js/app.js`.

## Convenciones clave (Tarea A: label/vertex style)
- `import Workspace from '/js/workspace.js'` (por defecto, no named).
- `const piriDefs = PIRI_DEFS || {}` (PIRI_DEFS como global).
- `catch(() => {})` no `catch(() -> {})`.
- `console.warn('WIREUP_MODULE_STARTED')` antes del CRS import; `toggleLayerVisibility` cierra temprano (extra `}` eliminado).
- Distancia labels (**.segment-length-marker**): bg semi-transparente `rgba(15,23,42,.78)`, halo `box-shadow inset`, font `.62rem`, rotar con `--segment-angle`.
- Parcel markers: iconSize 16×16, iconAnchor [8,8] (antes 46×46).
- Vertex markers: iconSize 16×16, iconAnchor [8,8], circular (`border-radius:50%`), blue `#1d4ed8` bg.

## Estructuras de dato críticas
- **DATOS_ANALISIS** (global en `analytic-app.js`): 266 distritos; campos: `id`, `dpto`, `distrito`, `urbano`, `rural`, `indice_urgencia`, etc.
- FODA dinámica por distrito: 26 reglas, 4 paneles `foda-panel`.
- `planDeActualizacion(d)`, `distritoPorId(id)`, `distritosDepartamento(dpto)`, `urgenciaIdistrito(d)`, `dibujar()`, `tabla()`, `grafico()`.

## Plataformas y servicios externos
- **Telegram:** `scripts/telegram.mjs` (notificaciones + comandos, modo full — opción 3). Archivo `.env` con `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`. Para conectar, enviar `/setmycommands` a BotFather y crear el bot con BotFather, luego usar el token de la sección 3. Para guardar token, verificar que pueda leer el archivo `.env` y que no esté protegido. **IMPORTANTE: Nunca guardar el token de Telegram.**
- **Censos 2022:** Datos censales a nivel de manzana no disponibles confiablemente; población por distrito a través de `DISTRITOS_PY_CNPV2022.geojson` sin valores de población (bloqueo de fuente de datos, no código).
- **Sindicado:** N/A — no se utiliza en el stack actual.

## Enlaces y endpoints
- **Homepage:** `http://localhost:5556/analisis-territorial/`
- **Template:** `scripts/analisis-territorial.plantilla.html`
- **Generador:** `node scripts/analisis-territorial.mjs` (regenera todos los artefactos; exit 0)
- **Archivos generados** (en `data/analisis/`): `AnalisisTerritorial.html`, `analisis-app.js`, `analisis-datos.js`, `analisis.css`
- **Verificación:** `node --check <archivo>` (solo JS, no HTML)
- **Prueba:** `node --test tests/dnit-cuentas.test.mjs` (14/14 passing)

## Rastreo y seguimiento
- **Grafo de seguimiento:** `docs/grafo_seguimiento.md` (116 lines, 11 tareas, 3 completadas, 2 en progreso, 5 bloqueadas, 1 pendiente, 63%)
- **Estado del proyecto:** `docs/tracking/estado_proyecto.json` (174 lines, version 0.9.0, 11 tareas)
- **Archivo de coordinación:** `AGENTS.md` (sección 1.2 grafo) y `README.md` actualizados.

## Notas de entorno de Windows / shell
- Windows 10 (HP 250 G10); Asumir: `C:/Users/HP 250 G10/`.
- `terminal` = bash (git-bash/MSYS). `terminal` commands run through bash, no PowerShell.
- MSYS paths like `/c/Users/<user>/` work alongside `C:\Users\<user>\` paths.
- Native Windows program paths (git, rg, node, python, etc.) pass through WITHOUT translation: `git -C /c/Users/x` fails; use `C:/Users/x` style forward-slash paths to native tools.
- `python3` not found; use `/c/Python314/python.exe`. `patch` file writes with write_file often fail on existing files — use `patch` against existing files instead.
- `read_file` on `.env` fails repeatedly — use `cat .env` via terminal instead.
- Browser check: `browser_exec` with `goto_url('http://localhost:5556/analisis-territorial/')` then `wait_for_load(15000)` then `js("var r=...; r;")` pattern.
