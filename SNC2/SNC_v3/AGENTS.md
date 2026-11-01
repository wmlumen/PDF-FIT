# PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)

Este repositorio es operado por múltiples agentes de Inteligencia Artificial (Hermes, Claude, Antigravity, OpenCode, etc.). 
**Todo agente que trabaje en este proyecto DEBE seguir obligatoriamente este protocolo por defecto en cada acción.**

---

## ★ Regla de turnos entre IAs (vale para todas, sin excepción)

Las IAs **se turnan**; ninguna corrige ni rehace el trabajo de otra por su cuenta.

1. **Tomar el turno.** Antes de editar, escribir en el bloque "Turno actual" de `docs/TURNOS_IA.md`: IA, fecha/hora, tarea y archivos. Si el bloque ya tiene otra IA con archivos en común, **no se tocan**: se espera o se le pregunta al usuario. (El `cli.mjs` citado en §2 ya existe — `node .opencode/coordination/cli.mjs lock/check/status` — y es un lock real con TTL; aun así, seguí completando `docs/TURNOS_IA.md` al terminar el turno, porque ahí queda el relato legible de qué se hizo y por qué, cosa que el lock por sí solo no da.)
2. **Al terminar el turno** dejar "Turno actual" en `libre` y agregar una entrada en `docs/TURNOS_IA.md`: fecha, IA, tarea, archivos tocados, cómo verificarlo y qué queda pendiente.
3. **No corregir lo ajeno.** Si una IA encuentra un error en el trabajo de otra, **no lo arregla ni lo revierte**: lo anota en `docs/TURNOS_IA.md` (sección "Observaciones para el autor") con archivo:línea y evidencia. Lo corrige el autor en su próximo turno, o otra IA solo si el usuario lo pide explícitamente.
4. **No reescribir por estilo.** Prohibido reformatear, renombrar o "mejorar" código de otra IA fuera de la tarea asignada (incluye CSS y diseño).
5. **Generados no se editan a mano.** `AnalisisTerritorial.html` y `data/analisis/*` salen de `scripts/analisis-territorial.mjs` + su plantilla; se cambia la fuente y se regenera.
6. **Un solo servidor.** No levantar otra instancia en el puerto 5556 ni matar procesos de otra IA: avisar al usuario.
7. **Al empezar el turno** leer las últimas entradas de `docs/TURNOS_IA.md` y respetar lo que otra IA dejó pendiente o en curso.

---

## 0. Contexto obligatorio: auditoría abierta (2026-10-18)

Antes de la primera acción en este repositorio, leer en este orden:

1. [`docs/AUDITORIA_SNC_v3_2026-10-18.md`](docs/AUDITORIA_SNC_v3_2026-10-18.md) — 38 hallazgos (8 críticos) con evidencia `archivo:línea`. Veredicto vigente: **no apto para producción**.
2. [`docs/PLAN_REMEDIACION_AUDITORIA.md`](docs/PLAN_REMEDIACION_AUDITORIA.md) — tareas accionables, criterios de cierre y zonas congeladas.
3. [`README.md`](README.md) — estado del proyecto, bloqueantes y arranque rápido.
4. [`docs/PLAN_MEJORA_PRODUCTO_2026-10-27.md`](docs/PLAN_MEJORA_PRODUCTO_2026-10-27.md) — plan de mejora de producto en 5 carriles paralelos (39 tareas `PM-xx`; versión JSON en `docs/PLAN_MEJORA_PRODUCTO_BACKLOG.json`). Tomar una tarea por vez y respetar el bloqueo por Fase 0.
5. [`docs/PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md`](docs/PLAN_MEJORA_ANALISIS_TERRITORIAL_2026-10-28.md) — revisión experta del panel de análisis territorial y plan para publicar sus datos (fases A a F). La fase A (calidad de datos) va antes que cualquier otra.
6. [`docs/CATALOGO_GRAFICOS.md`](docs/CATALOGO_GRAFICOS.md) — catálogo de tipos de gráfico para SNC v3 (qué dato va en cada uno, qué muestra la vista ampliada y pendientes). Consultarlo antes de crear o cambiar un gráfico.
7. [`docs/PLAN_CAMBIO_CLIMATICO_2026-10-31.md`](docs/PLAN_CAMBIO_CLIMATICO_2026-10-31.md) — módulo nuevo de Cambio Climático (0 % implementado): diagnóstico del research en `Cambio_climatico/` (choca con el stack real del proyecto, ver §1.2), qué de eso ya existe en SNC v3 y no hay que duplicar, y tareas `CC-xx` acotadas por carril. El Carril C (satelital/pesado) no se empieza sin que el usuario decida el stack.
- [`docs/DATOS_OSM_MUNICIPAL.md`](docs/DATOS_OSM_MUNICIPAL.md): datasets OSM (edificios, usos, zonas residenciales) y su vínculo con parcelas y cuentas DNIT.
- [`docs/CONVENCION_DATOS_REPORTES.md`](docs/CONVENCION_DATOS_REPORTES.md): los 5 formatos de datos (CSV, GeoJSON+SVG, Mermaid, SVG+CSV/JSON, YAML de metadatos) que debe producir cualquier generador de informes/libros/artículos (Quarto), para no transcribir resultados a mano. Implementación de referencia: `reportesDatosServicio.js`.

> Espejo para agentes: los mismos documentos están en [`graphify-out/auditoria/`](graphify-out/auditoria/README.md), junto a `auditoria.json` (38 hallazgos con id, severidad, fase y estado) y al plan de remediación.

### Reglas adicionales mientras la auditoría esté abierta

1. **No desplegar** (`firebase deploy`, `npm run deploy`, `deploy-windows.ps1`) hasta cerrar la Fase 0 del plan.
2. **No introducir, mover ni "arreglar" secretos.** `.env`, `serviceAccountKey.json` y cualquier credencial quedan fuera del repo, de los docs y de los tests.
3. **No cerrar un hallazgo sin verificación.** El criterio está en el plan; si no se demuestra con un test o un `curl` reproducible, la tarea sigue abierta.
4. **Un hallazgo por cambio.** No mezclar correcciones de seguridad con refactors o features.
5. **Zonas congeladas hasta Fase 0:** `firebase.json`, `firebase.scripts.json`, `.env`, `config.env.js`, `serviceAccountKey.json`, y las secciones de auth/IDOR/pagos de `server-api.js` y el esquema de `db.cjs` (ver §6 del plan).
6. **Prohibido "arreglar" deshabilitando:** comentar tests, relajar `adminMiddleware`, abrir CORS o desactivar la CSP.
7. **Registrar el resultado** con `pass`/`fail` y marcar la tarea `[x]` en el plan indicando el commit.

> El estado de la auditoría es parte del contrato: si un cambio altera el veredicto (por ejemplo, se cierran todos los críticos), actualizar la cabecera de `README.md` y las tablas del plan **en el mismo cambio**.

---

## 1. Regla Inviolable: Aislamiento de Entornos

* **CLIENTE / FRONTEND (`js/`, `*.html`):**
  * Entorno: **Navegador web puro** (Vite / ESM nativo).
  * ❌ **ESTRICTAMENTE PROHIBIDO:** Importar módulos de Node.js (`node:fs`, `node:path`, `node:crypto`, `node:events`), herramientas CLI o cualquier archivo de `.opencode/`.
  * La aplicación web jamás debe coordinar agentes; es un cliente para los usuarios finales.

* **COORDINACIÓN Y DESARROLLO (`.opencode/`):**
  * Entorno: **Node.js puro / CLI** (terminal, WSL, scripts de mantenimiento).
  * Aquí residen los locks, grafos de conocimiento, registro de errores y evolución de skills.

---

## 1.1 Fuente de la Verdad: `graphify-out/`

La estructura viva del repositorio y sus relaciones están indexadas en `graphify-out/`:
* **`graphify-out/graph.json`**: Grafo AST de código (funciones, clases, imports y dependencias).
* **`graphify-out/grafo_dominio.json`**: Grafo de dominio (tablas SQLite, schemas, endpoints de API REST).
* **`graphify-out/GRAPH_REPORT.md`**: Reporte arquitectónico, hubs de navegación y comunidades de código.
* **`graphify-out/graph.html`**: Visor gráfico interactivo (abrir en navegador para inspección visual).
* **`graphify-out/auditoria/`**: espejo del informe de auditoría y del plan de remediación, más `auditoria.json` (38 hallazgos con id, severidad, fase y estado). `npm run audit:graph` indexa **todo el corpus indexable** (código, tests, docs, HTML y configuración; excluye credenciales, datos y binarios) en `graph.json`; el espejo se regenera con `npm run audit:sync` y se verifica con `npm run audit:sync -- --check`. No se edita a mano.

## 1.2 Grafo de Seguimiento — `docs/grafo_seguimiento.md`

Documenta el estado del proyecto (2026-10-28) y el progreso del trabajo de actualización catastral.

| Estado del proyecto | Detalle |
|---|---|
| **Actividad** | 2026-10-28 · 11 tareas · 6 avanzadas |
| **Tareas completadas** | 3 (T09 PDF · T11 Seguimiento · Validaciones parciales) |
| **Tareas en curso** | 2 (T01 API DNIT · T10 Validaciones) |
| **Tareas bloqueadas** | 5 (T02–T04, T06–T08, T05) |
| **Tareas pendientes** | 1 (T04 Mapa Leaflet) |
| **Progreso global** | 63% |

### Desglose por carril

| Carril | Tareas | Estado |
|---|---|---|
| **Baseline**: HTML/CSS/JS + API | T09, T11, T01 | En progreso / Completado |
| **Expansión FODA** | T02, T03 | Bloqueadas (fuente de datos) |
| **Mapa** | T04 | Pendiente |
| **Arquitectura SNC v4** | T05–T08 | Bloqueadas (requiere PostGIS/GeoServer + fuentes externas) |

### Reglas de actualización

1. **Cada cambio** en `scripts/analisis-territorial.mjs` o `data/analisis/` actualiza `docs/tracking/estado_proyecto.json` con la nueva fecha y estado.
2. **Las tareas no pueden cerrarse** sin un test o un `curl` reproducible (criterio de la Fase 0).
3. **Las líneas de base congeladas**: `firebase.json`, `.env`, `config.env.js`, `serviceAccountKey.json`, salvo autorización expresa.
4. **Nueva sección** en `AGENTS.md` para cada carril crítico: `docs/grafo_seguimiento.md`.

La CLI de coordinación (`node .opencode/coordination/cli.mjs route`) consulta automáticamente ambos grafos en `graphify-out/` para darte la ruta exacta en milisegundos con 0 costo de tokens.
Al completar cambios estructurales grandes, actualiza el grafo con:
```bash
npm run graph:refresh   # graphify update . + reindexado de auditoría/plan
```
> `graphify update .` por sí solo descarta los nodos de documentación: usá `graph:refresh` o repetí `npm run audit:graph` después.

---

## 1.3 Regla Congelada: Servidor Backend y Dependencias del Frontend

* **Servidor Backend Único e Inmutable:** `server-api.js` (ES Module, puerto 5556). Queda **estrictamente prohibido** alterar el script `"start"` de `package.json` hacia `server-api.cjs` o stubs parciales.
* **Integridad de Dependencias Vendor:** `package.json` DEBE mantener fijas en `dependencies`:
  `leaflet` (^1.9.4), `dom-to-image` (^2.6.0), `jspdf` (^4.2.1), `jspdf-autotable` (^5.0.9), `leaflet-draw` (^1.0.4) y `qrcode` (^1.5.4).
  *Motivo:* `server-api.js` las publica directamente mediante `/vendor/*`. Si son eliminadas o desinstaladas, el frontend en `index.html` colapsa con errores 404 al cargar el visor Leaflet y los exportadores.

---

## 1.4 Regla Obligatoria: Codificación UTF-8 Estricta (Cero Mojibake)

* **Todos los archivos** (`.html`, `.js`, `.mjs`, `.cjs`, `.json`, `.md`, `.css`, `.geojson`) DEBEN ser guardados exclusivamente en **UTF-8 sin BOM**.
* ❌ **ESTRICTAMENTE PROHIBIDO:** Usar editores o scripts de PowerShell que graben en `Windows-1252` o `ISO-8859-1`, lo que corrompe caracteres en mojibake (doble codificación de tildes, eñes o guiones).
* Las directivas de codificación y fin de línea residen en `.editorconfig` y `.gitattributes`.
* Verificación obligatoria: `npm run lint:encoding` (integrado en el pipeline de tests). Corrección automática: `npm run fix:encoding`.

---

## 2. Ciclo de Vida Obligatorio para Cada Tarea

Antes de tocar cualquier archivo, cada agente debe ejecutar este flujo estandarizado usando la CLI de coordinación:

```
[1. RUTEO] ──> [2. PRE-CHECK] ──> [3. LOCK] ──> [4. CÓDIGO + TEST] ──> [5. REPORTE]
```

En todos los comandos de abajo agregá `--agent=TuNombre` (Claude, Antigravity, Hermes, OpenCode, Codex...).
Sin eso el lock queda a nombre de "agente-sin-nombre" y pierde sentido para las demás IAs.

### Paso 1: Identificar la ruta (Dónde tocar)
Si no sabes exactamente qué archivo(s) corresponden al requerimiento del usuario, consulta el grafo:
```bash
node .opencode/coordination/cli.mjs route "descripcion de lo que te pidieron"
```
*Te devolverá el dominio, el archivo principal, los archivos de apoyo y el test a ejecutar.*

### Paso 2: Verificar bloqueos y malos aprendizajes previos
```bash
node .opencode/coordination/cli.mjs check "nombre_tarea" js/archivo_objetivo.js
```
* **Verifica si otro agente está editando el archivo.** Si está bloqueado, ¡no lo toques!
* **Verifica la memoria de errores (`errors.jsonl`):** Si otra IA ya intentó algo y falló, verás la advertencia para no tropezar con la misma piedra ni malgastar tokens.

### Paso 3: Adquirir el Lock
```bash
node .opencode/coordination/cli.mjs lock js/archivo_objetivo.js
```

### Paso 4: Realizar el cambio y verificar
1. Aplica el cambio quirúrgicamente (sin tocar otros archivos no relacionados).
2. Ejecuta los tests:
```bash
npm test
```

### Paso 5: Registrar el aprendizaje (Feedback Loop)
* **Si la solución NO funcionó o falló un enfoque:**
  No inventes parches sintácticos sobre la marcha. Registra el mal aprendizaje para que ninguna IA lo vuelva a intentar:
  ```bash
  node .opencode/coordination/cli.mjs fail "nombre_tarea" "Motivo exacto por el que falló"
  ```
* **Si los tests pasaron exitosamente (`npm test` en verde):**
  Registra el acierto en `skills.json` y libera automáticamente el lock:
  ```bash
  node .opencode/coordination/cli.mjs pass "nombre_tarea" "Descripción de la solución aplicada" js/archivo_objetivo.js
  ```

---

## 3. Matriz Rápida de Dominios y Archivos Responsables

| Dominio | Archivo Principal | Archivos Secundarios | Test Unitario |
| :--- | :--- | :--- | :--- |
| **Validación Catastral SNC** | `js/validator.js` | `js/topology.worker.js`, `js/config.js` | `npm test` (tests/validator.test.mjs) |
| **Módulo Municipal (Ley 3966)** | `js/municipal.js` | `js/municipalClient.js`, `index-municipal.html` | `tests/workflow.test.mjs` |
| **Motor de Mapas / Leaflet** | `js/mapEngine.js` | `js/layerGuard.js`, `js/paraguayRef.js` | `tests/geometry-history.test.mjs` |
| **Importación / Parsers** | `js/parser.js` | `js/config.js` | `tests/workflow.test.mjs` |
| **Exportación (PDF/SHP/KML)** | `js/export.js` | `js/exportFormats.js` | `tests/export.test.mjs` |
| **Tabla de Atributos** | `js/dataTable.js` | `js/state.js` | `tests/workflow.test.mjs` |
| **Topología y COGO** | `js/geoprocessing.js` | `js/cogo.js`, `js/topologyRepair.js` | `tests/geoprocessing.test.mjs` |
| **Backend API y Base de Datos** | `server-api.js` | `db.cjs`, `cacheDb.js` | `tests/api-security.test.mjs` |
| **Portal Ciudadano (compartir datos municipales)** | `ciudadano/index.html` | `js/app-ciudadano.js`, `server-api.js` | Ver `docs/PLAN_PORTAL_CIUDADANO.md` |
| **Frontend Entry Point** | `js/app.js` | `js/app/index.js`, `index.html` | `npm run build` |
| **Paquetes de datos para informes/libros (Quarto)** | `reportesDatosServicio.js` | `docs/CONVENCION_DATOS_REPORTES.md` | `tests/reportes-datos.test.mjs` |

---

## 3.1 Estructura de Datos (`data/`) — Regla Obligatoria

**Todo archivo de datos (`.geojson`, `.csv`, `.xlsx`, `.db`, `.shp`, `.sqlite`) DEBE vivir dentro de `data/`.** Ningún dato puede quedar en la raíz del proyecto ni en carpetas de build (`dist/`, `public/`).

```
data/
├── 1.Paraguay/              # SHP nacionales (3.5 GB, 1607 archivos)
├── 2.Municipal/             # Datos municipales + plantilla oficial SNC 551/2023
├── 3.Usuario/               # Datos cargados por usuarios (vacío)
├── 4.Prueba/                # Datos de test y muestras
├── municipal/               # ÚNICA carpeta de capas municipales (por municipio)
│   ├── piribebuy/           # Capas de Piribebuy por carpeta de grupo (subgrupos del panel)
│   │   ├── base/            # Base territorial: barrios, vias, hidro, zona_influencia
│   │   ├── vertedero/       # Vertedero y entorno: vertedero, vertedero_500/1000, vertedero_integrado, centro
│   │   └── casco/           # Casco histórico: casco_historico, vuelo_casco
│   └── test_muni/           # Municipio de prueba (info.json + parcelas.geojson)
├── DISTRITOS_PY_CNPV2022.geojson  # 40 MB — distritos oficiales CNPV 2022
├── distritos_py_light.geojson     # versión ligera (865 KB)
├── snc.sqlite                # Base de datos del sistema (users, projects, expedientes)
├── catastro_cache.db         # Cache WMS/WFS del catastro
└── readme.txt                # Registro local de tareas (no subir a git)
```

**Reglas:**
- **NO existe `data/piribebuy/`**: las capas de cada municipio viven en `data/municipal/<municipio>/`.
- Ruta HTTP canónica: `/data/municipal/piribebuy/*.geojson` (alias retrocompatible: `/data/piribebuy/*`).
- Los GeoJSON de `municipal/piribebuy/` se regeneran con `node scripts/convert-piribebuy.mjs` (fuente: SHP externos).
- Los logs (`db.log`, `cacheDb.log`) los escribe el servidor en ejecución; no eliminar mientras corre.
- `dist/` y `public/` son artefactos de build: NO deben contener copias de datos de `data/`.

---

## 4. Consulta Rápida de Estado
Para ver qué agentes están activos, qué archivos están bloqueados y qué errores siguen abiertos:
```bash
node .opencode/coordination/cli.mjs status
```
