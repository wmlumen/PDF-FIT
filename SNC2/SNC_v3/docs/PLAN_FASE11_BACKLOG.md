# Backlog — Fase 11 (modelo de datos/BI) y pendientes de rendimiento

> Documento de trabajo para agentes de IA y personas, mismo formato que
> [`PLAN_REMEDIACION_AUDITORIA.md`](PLAN_REMEDIACION_AUDITORIA.md) pero para el trabajo que se abrió con
> [`AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md`](AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md) y
> [`AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md`](AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md).
> La auditoría de seguridad del 2026-10-18 y su plan de remediación siguen siendo la prioridad — este
> backlog es independiente y no la reemplaza ni la retrasa (ver §4 "Orden con la Fase 0/1 de seguridad").

---

## 0. Qué ya está hecho (no repetir)

| Commit | Qué | Doc |
|---|---|---|
| `ca2d34e` | Índices FK (P-03), `compression` HTTP (P-05), debounce de `localStorage` (P-08) | AUDITORIA_RENDIMIENTO_ARQUITECTURA §3,4,5 |
| `6540155` | Parcela como entidad direccionable: tablas `parcelas`/`cuenta_catastral`/`personas`/`parcela_propietario`/`matriculas`/`parcel_lineage`, sync automático, 4 endpoints nuevos (todos con ownership) | AUDITORIA_ESTRATEGICA_MODELO_DATOS §1 "Estado de implementación" |
| `60fb9ed` | `js/vepMetrics.js`: reporting básico + `IND-CAT-01` real, helpers espaciales (`IND-AMB-04` resuelto), los otros 14 indicadores devuelven `disponible: false` con motivo | AUDITORIA_ESTRATEGICA_MODELO_DATOS §1 "Paso 5" |
| *(este commit)* | M-3: tab "Indicadores VEP" en `admin/index.html` + `GET /api/admin/metrics/vep` | §2 "M-3" abajo |

---

## 1. Rendimiento — pendientes de AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md

| # | Acción | Hallazgo | Archivos | Criterio de cierre |
|---|---|---|---|---|
| R-1 | Transacción en `saveFeaturesBatch` (BEGIN/COMMIT en vez de N inserts sueltos) | P-09 | `cacheDb.js` | Carga de 1.000 features hace 1 transacción, no 1.000; test con conteo de queries |
| R-2 | `SELECT` con columnas acotadas en listados (`listByProject`/`listByUser` sin `state_json`/`validation_results` completos) | P-04 | `db.cjs` | Listado de expedientes no trae el GeoJSON completo; detalle (`findById`) sigue trayendo todo |
| R-3 | `Cache-Control`/`immutable` en los 3 datasets estáticos servidos con `res.sendFile` directo | P-11 | `server-api.js` (líneas de `DISTRITOS_PY_CNPV2022.geojson`, `deptos_py_light.geojson`, `distritos_py_light.geojson`) | Header `Cache-Control: max-age=86400, immutable` presente; navegador no re-descarga en la misma sesión |
| R-4 | Conectar el índice R-Tree espacial a `getFeaturesByBbox`/`getFeatureContainingPoint`, o eliminarlo si no se va a usar | P-10 | `cacheDb.js` | `EXPLAIN QUERY PLAN` usa el R-Tree, o la tabla virtual y el comentario que promete "<3ms" se borran |
| R-5 | Virtualización de `js/dataTable.js` (no reconstruir todo el `tbody` en cada edición) | P-12 | `js/dataTable.js` | Edición de 1 celda en una tabla de 1.000 filas no reescribe las 1.000 filas del DOM |
| R-6 | `markerClusterGroup` para capas de puntos en el mapa | P-13 | `js/mapEngine.js` | Capa de puntos con >500 elementos no degrada el pan/zoom en una laptop modesta |
| R-7 | Code-splitting de `js/export.js` por formato (`import()` dinámico al pulsar "Exportar a X") | P-01 | `js/export.js`, `vite.config.js` | El bundle inicial no incluye jsPDF/docx/shp-write hasta que el usuario exporta |
| R-8 | Retirar `better-sqlite3` (no usado fuera de `A_Eliminar/`) o migrar `db.cjs` a usarlo de verdad | P-02 | `package.json`, `db.cjs` | `depcheck` no lo marca como huérfano, o deja de estar en `dependencies` |

---

## 2. Modelo de datos / BI — pendientes de AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md

| # | Acción | Depende de | Archivos (nuevos) | Criterio de cierre |
|---|---|---|---|---|
| M-1 | **Ambiental**: tabla `restricciones_ambientales` (parcela_id, tipo, fuente, geometria_buffer) + regla que la consulte al fraccionar/mensurar | Fase 11 (parcelas) ✅ | `db.cjs`, `server-api.js` | `POST` de fraccionamiento devuelve `apto`/`condicionado`/`no_apto` según intersección real, no hardcodeado |
| M-2 | **POUT / zonificación**: tabla `zonificacion` (polígono + uso permitido) + chequeo de compatibilidad de uso en alta de expediente | Capas de POUT del usuario (Drive, ver §3) | `db.cjs`, `server-api.js` | Cargar un proyecto incompatible con la zona devuelve advertencia, no 200 silencioso |
| M-3 | ✅ **Hecho.** Dashboard de indicadores: tab "Indicadores VEP" en `admin/index.html` + `js/app-admin.js`, consumiendo `GET /api/admin/metrics/vep` | `js/vepMetrics.js` ✅ | `admin/index.html`, `js/app-admin.js`, `server-api.js`, `db.cjs` (`parcelas.listAll`) | Cerrado: verificado con captura de pantalla (12 parcelas, `IND-CAT-01 = 100%`, catálogo completo) y `403` para no-admin |
| M-4 | **Capas espaciales reales para IND-AMB-02/IND-RSG-01/IND-RSG-03**: cargar en el visor una capa VEP/MADES (vía `vepDataClient.js`) simultánea a la capa de parcelas, y llamar `calcularInterseccionEspacial()` | `js/vepMetrics.js` ✅, `js/vepDataClient.js` (ya existe) | `js/mapEngine.js` o nuevo controlador | Los 3 indicadores dejan de estar en `INDICADORES_NO_DISPONIBLES` |
| M-5 | **Modelo registral más allá de `matriculas`**: cadena dominial (transferencias históricas), alertas de embargo/hipoteca | Fase 11 (`matriculas`) ✅ | tabla nueva `transferencias_dominio` o similar | Un intento de transferir/fraccionar una parcela con `matriculas.estado = 'EMBARGADA'` (nuevo valor de `estado`) se bloquea o advierte |
| M-6 | **Data Warehouse / modelo estrella**: `FactExpedientes`, `DimParcela`, `DimPropietario`, `DimDistrito`, `DimTiempo` | M-1 a M-5 (tiene sentido con datos operacionales reales) | — | Explícitamente de backlog largo: no empezar sin al menos 4-5 tablas operacionales pobladas con datos reales de un municipio |
| M-7 | **Migración SQLite → PostgreSQL/PostGIS** | — (proyecto de infraestructura aparte) | — | Fuera de alcance de este backlog; diseñar el esquema de destino incorporando M-1 a M-5 antes de migrar, no migrar el modelo plano actual |

---

## 3. Externo — capas de POUT compartidas por el usuario (Google Drive)

El usuario compartió `https://drive.google.com/drive/u/0/folders/16LybYGh2jO-iGb9uzGpxZC4b0wKCMjvX` con
capas e información de POUT de varios municipios. El conector de Google Drive de esta sesión devolvió
"requiere autenticación" al intentar leerlo. **Pendiente:** reautenticar el conector (`/mcp` en una
sesión de Claude Code) y revisar esas capas contra `js/vepDataClient.js` y `data/2.Municipal/<municipio>/`
para decidir el esquema de M-2 (zonificación) con datos reales en vez de supuestos.

---

## 4. Hallazgos colaterales encontrados al implementar — auditar aparte, no corregidos aquí

Ninguno de estos se tocó: tocan zonas congeladas o son hallazgos nuevos que merecen su propio análisis,
no un fix de paso mientras se hacía otra cosa (regla "un hallazgo por cambio" de `AGENTS.md`).

| # | Hallazgo | Evidencia | Por qué no se tocó aquí |
|---|---|---|---|
| H-1 | Condición de carrera en el arranque de `db.cjs` (migración de columnas de Mesa de Entrada) puede tumbar el proceso con `SQLITE_ERROR: no such column: entrada_nro` contra una base nueva o parcialmente migrada | Reproducido 2 de 3 veces en esta sesión con `data/` vacío; ver AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md, sección "Hallazgo colateral" | Toca la sección de `db.cjs` que el plan de remediación mantiene congelada hasta A1-2/A1-6 |
| H-2 | `package.json` declara `graphify` (`^1.0.0`) como dependencia npm, pero es un paquete **sin relación** ("RGG — Random Graph Generator" para jQuery/documentos, sin CLI). La herramienta real que `npm run audit:graph` usa es un paquete **Python** del mismo nombre, instalado aparte (no en `package.json`/`requirements.txt` de este repo). `npm run graph:refresh` (que hace `graphify update .`) falla por esto — se verificó en esta sesión y se usó `npm run audit:graph` solo, que sí funciona | `npm error could not determine executable to run` al intentar `npx graphify`; `node_modules/graphify/package.json` confirma el paquete equivocado | Es un hallazgo de higiene de dependencias (ya hay un M-06 similar en la auditoría de seguridad) — corregirlo (sacar el npm package falso, documentar la dependencia Python real, o arreglar `graph:refresh`) es su propio cambio, no parte de Fase 11 |

---

## 5. Orden recomendado y relación con la Fase 0/1 de seguridad

La Fase 0/1 de seguridad (`PLAN_REMEDIACION_AUDITORIA.md`) sigue siendo lo primero: ningún ítem de este
backlog es bloqueante para cerrarla, y ninguno de los commits de Fase 11 tocó las zonas congeladas
(`firebase.json`, `.env`, `config.env.js`, columnas de `expedientes`/`projects`, secciones de
auth/IDOR/pagos). Dentro de este backlog, el orden sugerido por impacto/esfuerzo:

1. **R-1, R-3, R-4** (esfuerzo bajo, de rendimiento) — se pueden hacer en paralelo a cualquier otra cosa.
2. **M-3** (dashboard de `vepMetrics.js`) — hace visible el trabajo ya hecho, antes de seguir agregando motor sin UI.
3. **M-1** (ambiental) — es el siguiente paso natural de Fase 11, reusa `parcelas`/`cuenta_catastral`.
4. **§3** (capas de Drive) y luego **M-2** (POUT) — depende de que el usuario reautentique el conector.
5. **H-1, H-2** — proponer como tareas propias (no mezclar con lo anterior).
6. **R-5, R-6, R-7, R-2, R-8** — resto de rendimiento, cuando convenga.
7. **M-4, M-5** — profundización registral/ambiental, después de M-1/M-2.
8. **M-6, M-7** — backlog largo, no antes de tener M-1 a M-5 con datos reales de al menos un municipio.

---

## 6. Cómo retomar cualquier ítem

Mismo ciclo que `AGENTS.md` §2 (`route → check → lock → código + test → pass|fail`). Nota: el
`cli.mjs` que `AGENTS.md` documenta no existe en este checkout (`.opencode/coordination/` tiene
`orchestrator.mjs` y `coordinator.mjs`, no `cli.mjs`) — verificar cuál es el entrypoint vigente antes
de asumir los comandos de ese documento tal cual. Después de cualquier ítem con cambios estructurales
(tablas, endpoints, módulos nuevos): `npm run audit:graph` como mínimo (`npm run graph:refresh` está
roto por H-2) para que el grafo (`graphify-out/`) refleje el cambio.
