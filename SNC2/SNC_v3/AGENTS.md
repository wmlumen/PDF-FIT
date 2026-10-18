# PROTOCOLO DE TRABAJO Y COORDINACIÓN MULTI-IA (SNC 551/2023)

Este repositorio es operado por múltiples agentes de Inteligencia Artificial (Hermes, Claude, Antigravity, OpenCode, etc.). 
**Todo agente que trabaje en este proyecto DEBE seguir obligatoriamente este protocolo por defecto en cada acción.**

---

## 0. Contexto obligatorio: auditoría abierta (2026-10-18)

Antes de la primera acción en este repositorio, leer en este orden:

1. [`docs/AUDITORIA_SNC_v3_2026-10-18.md`](docs/AUDITORIA_SNC_v3_2026-10-18.md) — 38 hallazgos (8 críticos) con evidencia `archivo:línea`. Veredicto vigente: **no apto para producción**.
2. [`docs/PLAN_REMEDIACION_AUDITORIA.md`](docs/PLAN_REMEDIACION_AUDITORIA.md) — tareas accionables, criterios de cierre y zonas congeladas.
3. [`README.md`](README.md) — estado del proyecto, bloqueantes y arranque rápido.

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

La CLI de coordinación (`node .opencode/coordination/cli.mjs route`) consulta automáticamente ambos grafos en `graphify-out/` para darte la ruta exacta en milisegundos con 0 costo de tokens.
Al completar cambios estructurales grandes, actualiza el grafo con:
```bash
npm run graph:refresh   # graphify update . + reindexado de auditoría/plan
```
> `graphify update .` por sí solo descarta los nodos de documentación: usá `graph:refresh` o repetí `npm run audit:graph` después.

---

## 2. Ciclo de Vida Obligatorio para Cada Tarea

Antes de tocar cualquier archivo, cada agente debe ejecutar este flujo estandarizado usando la CLI de coordinación:

```
[1. RUTEO] ──> [2. PRE-CHECK] ──> [3. LOCK] ──> [4. CÓDIGO + TEST] ──> [5. REPORTE]
```

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
| **Frontend Entry Point** | `js/app.js` | `js/app/index.js`, `index.html` | `npm run build` |

---

## 4. Consulta Rápida de Estado
Para ver qué agentes están activos, qué archivos están bloqueados y qué errores siguen abiertos:
```bash
node .opencode/coordination/cli.mjs status
```
