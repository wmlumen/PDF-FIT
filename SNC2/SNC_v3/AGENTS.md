# PROTOCOLO DE TRABAJO Y COORDINACIÃ“N MULTI-IA (SNC 551/2023)

Este repositorio es operado por mÃºltiples agentes de Inteligencia Artificial (Hermes, Claude, Antigravity, OpenCode, etc.). 
**Todo agente que trabaje en este proyecto DEBE seguir obligatoriamente este protocolo por defecto en cada acciÃ³n.**

---

## 0. Contexto obligatorio: auditorÃ­a abierta (2026-10-18)

Antes de la primera acciÃ³n en este repositorio, leer en este orden:

1. [`docs/AUDITORIA_SNC_v3_2026-10-18.md`](docs/AUDITORIA_SNC_v3_2026-10-18.md) â€” 38 hallazgos (8 crÃ­ticos) con evidencia `archivo:lÃ­nea`. Veredicto vigente: **no apto para producciÃ³n**.
2. [`docs/PLAN_REMEDIACION_AUDITORIA.md`](docs/PLAN_REMEDIACION_AUDITORIA.md) â€” tareas accionables, criterios de cierre y zonas congeladas.
3. [`README.md`](README.md) â€” estado del proyecto, bloqueantes y arranque rÃ¡pido.

> Espejo para agentes: los mismos documentos estÃ¡n en [`graphify-out/auditoria/`](graphify-out/auditoria/README.md), junto a `auditoria.json` (38 hallazgos con id, severidad, fase y estado) y al plan de remediaciÃ³n.

### Reglas adicionales mientras la auditorÃ­a estÃ© abierta

1. **No desplegar** (`firebase deploy`, `npm run deploy`, `deploy-windows.ps1`) hasta cerrar la Fase 0 del plan.
2. **No introducir, mover ni "arreglar" secretos.** `.env`, `serviceAccountKey.json` y cualquier credencial quedan fuera del repo, de los docs y de los tests.
3. **No cerrar un hallazgo sin verificaciÃ³n.** El criterio estÃ¡ en el plan; si no se demuestra con un test o un `curl` reproducible, la tarea sigue abierta.
4. **Un hallazgo por cambio.** No mezclar correcciones de seguridad con refactors o features.
5. **Zonas congeladas hasta Fase 0:** `firebase.json`, `firebase.scripts.json`, `.env`, `config.env.js`, `serviceAccountKey.json`, y las secciones de auth/IDOR/pagos de `server-api.js` y el esquema de `db.cjs` (ver Â§6 del plan).
6. **Prohibido "arreglar" deshabilitando:** comentar tests, relajar `adminMiddleware`, abrir CORS o desactivar la CSP.
7. **Registrar el resultado** con `pass`/`fail` y marcar la tarea `[x]` en el plan indicando el commit.

> El estado de la auditorÃ­a es parte del contrato: si un cambio altera el veredicto (por ejemplo, se cierran todos los crÃ­ticos), actualizar la cabecera de `README.md` y las tablas del plan **en el mismo cambio**.

---

## 1. Regla Inviolable: Aislamiento de Entornos

* **CLIENTE / FRONTEND (`js/`, `*.html`):**
  * Entorno: **Navegador web puro** (Vite / ESM nativo).
  * âŒ **ESTRICTAMENTE PROHIBIDO:** Importar mÃ³dulos de Node.js (`node:fs`, `node:path`, `node:crypto`, `node:events`), herramientas CLI o cualquier archivo de `.opencode/`.
  * La aplicaciÃ³n web jamÃ¡s debe coordinar agentes; es un cliente para los usuarios finales.

* **COORDINACIÃ“N Y DESARROLLO (`.opencode/`):**
  * Entorno: **Node.js puro / CLI** (terminal, WSL, scripts de mantenimiento).
  * AquÃ­ residen los locks, grafos de conocimiento, registro de errores y evoluciÃ³n de skills.

---

## 1.1 Fuente de la Verdad: `graphify-out/`

La estructura viva del repositorio y sus relaciones estÃ¡n indexadas en `graphify-out/`:
* **`graphify-out/graph.json`**: Grafo AST de cÃ³digo (funciones, clases, imports y dependencias).
* **`graphify-out/grafo_dominio.json`**: Grafo de dominio (tablas SQLite, schemas, endpoints de API REST).
* **`graphify-out/GRAPH_REPORT.md`**: Reporte arquitectÃ³nico, hubs de navegaciÃ³n y comunidades de cÃ³digo.
* **`graphify-out/graph.html`**: Visor grÃ¡fico interactivo (abrir en navegador para inspecciÃ³n visual).
* **`graphify-out/auditoria/`**: espejo del informe de auditorÃ­a y del plan de remediaciÃ³n, mÃ¡s `auditoria.json` (38 hallazgos con id, severidad, fase y estado). `npm run audit:graph` indexa **todo el corpus indexable** (cÃ³digo, tests, docs, HTML y configuraciÃ³n; excluye credenciales, datos y binarios) en `graph.json`; el espejo se regenera con `npm run audit:sync` y se verifica con `npm run audit:sync -- --check`. No se edita a mano.

La CLI de coordinaciÃ³n (`node .opencode/coordination/cli.mjs route`) consulta automÃ¡ticamente ambos grafos en `graphify-out/` para darte la ruta exacta en milisegundos con 0 costo de tokens.
Al completar cambios estructurales grandes, actualiza el grafo con:
```bash
npm run graph:refresh   # graphify update . + reindexado de auditorÃ­a/plan
```
> `graphify update .` por sÃ­ solo descarta los nodos de documentaciÃ³n: usÃ¡ `graph:refresh` o repetÃ­ `npm run audit:graph` despuÃ©s.

---

## 1.2 Regla Congelada: Servidor Backend y Dependencias del Frontend

* **Servidor Backend Ãšnico e Inmutable:** `server-api.js` (ES Module, puerto 5556). Queda **estrictamente prohibido** alterar el script `"start"` de `package.json` hacia `server-api.cjs` o stubs parciales.
* **Integridad de Dependencias Vendor:** `package.json` DEBE mantener fijas en `dependencies`:
  `leaflet` (^1.9.4), `dom-to-image` (^2.6.0), `jspdf` (^4.2.1), `jspdf-autotable` (^5.0.9), `leaflet-draw` (^1.0.4) y `qrcode` (^1.5.4).
  *Motivo:* `server-api.js` las publica directamente mediante `/vendor/*`. Si son eliminadas o desinstaladas, el frontend en `index.html` colapsa con errores 404 al cargar el visor Leaflet y los exportadores.

---

## 2. Ciclo de Vida Obligatorio para Cada Tarea

Antes de tocar cualquier archivo, cada agente debe ejecutar este flujo estandarizado usando la CLI de coordinaciÃ³n:

```
[1. RUTEO] â”€â”€> [2. PRE-CHECK] â”€â”€> [3. LOCK] â”€â”€> [4. CÃ“DIGO + TEST] â”€â”€> [5. REPORTE]
```

### Paso 1: Identificar la ruta (DÃ³nde tocar)
Si no sabes exactamente quÃ© archivo(s) corresponden al requerimiento del usuario, consulta el grafo:
```bash
node .opencode/coordination/cli.mjs route "descripcion de lo que te pidieron"
```
*Te devolverÃ¡ el dominio, el archivo principal, los archivos de apoyo y el test a ejecutar.*

### Paso 2: Verificar bloqueos y malos aprendizajes previos
```bash
node .opencode/coordination/cli.mjs check "nombre_tarea" js/archivo_objetivo.js
```
* **Verifica si otro agente estÃ¡ editando el archivo.** Si estÃ¡ bloqueado, Â¡no lo toques!
* **Verifica la memoria de errores (`errors.jsonl`):** Si otra IA ya intentÃ³ algo y fallÃ³, verÃ¡s la advertencia para no tropezar con la misma piedra ni malgastar tokens.

### Paso 3: Adquirir el Lock
```bash
node .opencode/coordination/cli.mjs lock js/archivo_objetivo.js
```

### Paso 4: Realizar el cambio y verificar
1. Aplica el cambio quirÃºrgicamente (sin tocar otros archivos no relacionados).
2. Ejecuta los tests:
```bash
npm test
```

### Paso 5: Registrar el aprendizaje (Feedback Loop)
* **Si la soluciÃ³n NO funcionÃ³ o fallÃ³ un enfoque:**
  No inventes parches sintÃ¡cticos sobre la marcha. Registra el mal aprendizaje para que ninguna IA lo vuelva a intentar:
  ```bash
  node .opencode/coordination/cli.mjs fail "nombre_tarea" "Motivo exacto por el que fallÃ³"
  ```
* **Si los tests pasaron exitosamente (`npm test` en verde):**
  Registra el acierto en `skills.json` y libera automÃ¡ticamente el lock:
  ```bash
  node .opencode/coordination/cli.mjs pass "nombre_tarea" "DescripciÃ³n de la soluciÃ³n aplicada" js/archivo_objetivo.js
  ```

---

## 3. Matriz RÃ¡pida de Dominios y Archivos Responsables

| Dominio | Archivo Principal | Archivos Secundarios | Test Unitario |
| :--- | :--- | :--- | :--- |
| **ValidaciÃ³n Catastral SNC** | `js/validator.js` | `js/topology.worker.js`, `js/config.js` | `npm test` (tests/validator.test.mjs) |
| **MÃ³dulo Municipal (Ley 3966)** | `js/municipal.js` | `js/municipalClient.js`, `index-municipal.html` | `tests/workflow.test.mjs` |
| **Motor de Mapas / Leaflet** | `js/mapEngine.js` | `js/layerGuard.js`, `js/paraguayRef.js` | `tests/geometry-history.test.mjs` |
| **ImportaciÃ³n / Parsers** | `js/parser.js` | `js/config.js` | `tests/workflow.test.mjs` |
| **ExportaciÃ³n (PDF/SHP/KML)** | `js/export.js` | `js/exportFormats.js` | `tests/export.test.mjs` |
| **Tabla de Atributos** | `js/dataTable.js` | `js/state.js` | `tests/workflow.test.mjs` |
| **TopologÃ­a y COGO** | `js/geoprocessing.js` | `js/cogo.js`, `js/topologyRepair.js` | `tests/geoprocessing.test.mjs` |
| **Backend API y Base de Datos** | `server-api.js` | `db.cjs`, `cacheDb.js` | `tests/api-security.test.mjs` |
| **Portal Ciudadano (compartir datos municipales)** | `ciudadano/index.html` | `js/app-ciudadano.js`, `server-api.js` | Ver `docs/PLAN_PORTAL_CIUDADANO.md` |
| **Frontend Entry Point** | `js/app.js` | `js/app/index.js`, `index.html` | `npm run build` |

---

## 3.1 Estructura de Datos (`data/`) — Regla Obligatoria

**Todo archivo de datos (`.geojson`, `.csv`, `.xlsx`, `.db`, `.shp`, `.sqlite`) DEBE vivir dentro de `data/`.** Ningún dato puede quedar en la raíz del proyecto ni en carpetas de build (`dist/`, `public/`).

```
data/
├── 1.Paraguay/              # SHP nacionales (3.5 GB, 1607 archivos)
├── 2.Municipal/             # Datos municipales + plantilla oficial SNC 551/2023
├── 3.Usuario/               # Datos cargados por usuarios (vacío)
├── 4.Prueba/                # Datos de test y muestras
├── municipal/               # Publicaciones municipales (info.json + parcelas.geojson)
├── piribebuy/               # Capas de Piribebuy convertidas de SHP (11 archivos, 2.1 MB)
│   ├── barrios.geojson      # 34 barrios
│   ├── vias.geojson         # 2171 vías
│   ├── hidro.geojson        # 110 cursos de agua
│   ├── vertedero*.geojson   # 4 capas de vertedero (incluye buffers 500m/1000m)
│   ├── casco_historico.geojson
│   └── centro.geojson
├── DISTRITOS_PY_CNPV2022.geojson  # 40 MB — distritos oficiales CNPV 2022
├── distritos_py_light.geojson     # versión ligera (865 KB)
├── snc.sqlite                # Base de datos del sistema (users, projects, expedientes)
├── catastro_cache.db         # Cache WMS/WFS del catastro
└── readme.txt                # Registro local de tareas (no subir a git)
```

**Reglas:**
- Los GeoJSON de `piribebuy/` se regeneran con `node scripts/convert-piribebuy.mjs` (fuente: SHP externos).
- Los logs (`db.log`, `cacheDb.log`) los escribe el servidor en ejecución; no eliminar mientras corre.
- `dist/` y `public/` son artefactos de build: NO deben contener copias de datos de `data/`.

---

## 4. Consulta RÃ¡pida de Estado
Para ver quÃ© agentes estÃ¡n activos, quÃ© archivos estÃ¡n bloqueados y quÃ© errores siguen abiertos:
```bash
node .opencode/coordination/cli.mjs status
```
