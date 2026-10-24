# Auditoría de arquitectura y rendimiento — SNC_v3 (2026-10-23)

**Fecha:** 2026-10-23
**Alcance:** `SNC2/SNC_v3` — frontend (`js/`), backend Express (`server-api.js`), capas de datos
(`db.cjs`, `cacheDb.js`), configuración de build (`vite.config.js`), caché y rendimiento de carga.
**Modalidad:** auditoría estática orientada a diseño y rendimiento (sin pruebas de carga dinámicas:
no se ejecutó JMeter/k6/Gatling/Locust contra el servidor; ver §7). Complementa, no sustituye, a
[`AUDITORIA_SNC_v3_2026-10-18.md`](AUDITORIA_SNC_v3_2026-10-18.md) (seguridad/IDOR/secretos — **ese
veredicto sigue vigente: NO APTO para producción**). Este informe mira la misma base de código con
el lente del método "validar diseño → arquitectura → BD → APIs → async/caché → carga → código →
infraestructura" y evita repetir hallazgos ya abiertos en el plan de remediación, salvo para
agregarles una dimensión de rendimiento que el informe original no cuantificó.

**Veredicto de esta auditoría:** la arquitectura GIS/catastral es sólida y el cuello de botella no es
la base de datos ni la red — es la ausencia de particionado en tres puntos muy concretos: el estado
del cliente se serializa entero en cada edición (§5), el backend no transacciona inserciones por lote
(§3) y no hay índices en las claves foráneas más consultadas (§3). Ninguno exige reescritura; los
tres son cambios acotados. El riesgo mayor no es de rendimiento sino de **alcance**: el proyecto creció
de ~23.000 a facto >34.000 líneas y de 11 a 36 suites de test en 5 días (§1) sin que la auditoría de
seguridad del 2026-10-18 cubra los módulos nuevos (notarial, mesa de entrada, VEP, MAG-sync,
geoportales, super-admin).

---

## 0. Resumen ejecutivo

| Fase del método | Resultado |
|---|---|
| 1. Validación de diseño funcional | ⚠️ Crecimiento de alcance no auditado (9+ módulos nuevos desde el 2026-10-18) |
| 2. Arquitectura frontend/backend | ⚠️ Monolitos de archivo (`mapEngine.js` 2.717 líneas, `export.js` 2.794), tres capas de datos (ya en M-01) |
| 3. Base de datos | 🔴 Sin índices en `projects.user_id`, `expedientes.project_id`, `payments.user_id/provider_id`; `SELECT *` sistemático sobre columnas JSON grandes |
| 4. Rendimiento de APIs | 🟠 Sin `compression`; healthcheck falso (A-02, ya abierto); sin paginación en listados |
| 5. Operaciones síncronas/asíncronas | 🔴 `state.js` serializa el expediente completo a `localStorage` de forma síncrona en cada edición (bloqueo de hilo principal + riesgo de pérdida silenciosa de datos) |
| 6. Caché | 🟠 R-Tree espacial creado y nunca usado (`cacheDb.js`); inserciones por lote sin transacción (B-07, cuantificado aquí) |
| 7. Carga y concurrencia | ⚪ No ejecutado (fuera de alcance sin entorno de staging); `rateMap`/`sensitiveRateMap` sin límite de memoria (A-05, ya abierto) |
| 8. Código fuente | 🟡 Tabla de atributos reconstruye el DOM completo en cada render; mapa sin clustering de marcadores |
| 9. Infraestructura | 🟡 `sqlite3` (callback, usado) + `better-sqlite3` (dependencia de producción sin uso real fuera de `A_Eliminar/`) |
| 10. Plan de optimización | Ver §9 |

---

## 1. Fase 1 — Validación de diseño funcional

**Evidencia de crecimiento de alcance.** La auditoría del 2026-10-18 inventarió `server-api.js` en
1.694 líneas y `db.cjs` en 458. Hoy son **2.075** y **892** respectivamente (+22 % y +95 %), y
`package.json:7` encadena **36 suites de test** (`npm test`) frente a las 11 que la auditoría
verificó, incorporando módulos no mencionados en el informe de seguridad: `mesa-entrada`,
`vep-client`, `sovereign-vector`, `mag-sync`, `geoportales-modulos`, `escribania-urbanismo`,
`portal-notarial`, `portal-ciudadano`, `super-admin`, `run-forms`, `layer-stacking`,
`osnap-measurement`, `basemap-menu-overlap`, `map-layout-manager`.

La matriz de dominios de [`AGENTS.md`](../AGENTS.md) §3 ya no cubre la mitad de estos módulos
(no hay fila para "Portal Notarial", "Mesa de Entrada", "VEP", "MAG-Sync", "Super Admin").

**Impacto:** cada módulo nuevo hereda el mismo backend (`server-api.js`) y la misma capa de datos
(`db.cjs`) que están bajo las zonas congeladas del plan de remediación (§6 del plan). Si crecen al
mismo ritmo que en los últimos 5 días, el costo de cerrar la Fase 0/1 de seguridad crece con ellos
(más endpoints potencialmente sin `assertOwnership`, más tablas sin índice). Esto no es un hallazgo
de rendimiento en sí, sino la razón por la que los hallazgos de abajo (que hoy son pequeños) pueden
dejar de serlo rápido.

**Pregunta abierta para el equipo (no verificable estáticamente):** ¿cada uno de estos módulos
("Notarial", "MAG-Sync", "Sovereign Vector") tiene un caso de uso con usuarios reales, o son
funcionalidades construidas por anticipación? El método de auditoría pide resolver esto antes de
optimizar: no tiene sentido indexar tablas o paralelizar cargas de un módulo que nadie usa.

**Recomendación:** antes de la Fase 2 de rendimiento (abajo), una pasada de 1 página por módulo
nuevo: quién lo usa, qué endpoint golpea, y si entra en el alcance de la próxima auditoría de
seguridad. Añadir las filas que falten a la matriz de `AGENTS.md`.

---

## 2. Fase 2 — Arquitectura (frontend / backend)

### P-01 · Monolitos de archivo sin descomponer

| Archivo | Líneas | Rol |
|---|---:|---|
| [`js/export.js`](../js/export.js) | 2.794 | PDF/SHP/KML/XLSX/DOCX — 6+ formatos en un solo módulo |
| [`js/mapEngine.js`](../js/mapEngine.js) | 2.717 | Leaflet + capas + topología + medición + 8 llamadas a `turf.*` |
| [`server-api.js`](../server-api.js) | 2.075 | Auth, planes, proyectos, expedientes, pagos, admin, estáticos — un solo archivo |
| [`db.cjs`](../db.cjs) | 892 | 10 tablas, callbacks `sqlite3` promisificados a mano |

Ya señalado estructuralmente en M-01/M-04 del informe de seguridad; aquí se agrega la dimensión de
rendimiento: un archivo de 2.700 líneas sin separación por formato de exportación o por capa de mapa
no se puede *code-split* con Vite (`vite.config.js` no declara `manualChunks` reales — ver M-05), así
que **todo el motor de mapas y todos los exportadores se descargan juntos** aunque el usuario solo
abra el visor sin exportar nada.

**Recomendación (bajo esfuerzo, alto impacto en TTI):** separar `export.js` en un archivo por formato
(`exportPdf.js`, `exportShp.js`, …) cargado con `import()` dinámico al pulsar "Exportar a X", no en el
bundle inicial.

### P-02 · Tres capas de datos con contratos divergentes (rendimiento)

Ya documentado como M-01 (seguridad/mantenibilidad). Dimensión de rendimiento no cubierta allí:
`db.cjs` usa `sqlite3` (API callback, async) mientras que el `package.json:31` también declara
`better-sqlite3` (API síncrona, más rápida para lecturas) como dependencia de **producción**, pero
el único consumidor real (`A_Eliminar/js_duplicados/db.js`) está en una carpeta marcada para borrar.
Es decir: se paga el costo de instalar y mantener actualizado un binario nativo (`better-sqlite3`,
compilación específica por plataforma) sin usarlo en el camino caliente. (Relacionado con M-06, que
ya pide `depcheck`; aquí se nombra el paquete concreto a retirar o, si se decide migrar `db.cjs` a
`better-sqlite3` por rendimiento, a adoptar de verdad.)

---

## 3. Fase 3 — Base de datos

### P-03 · Columnas de unión (foreign keys) sin índice 🔴 — ✅ Implementado 2026-10-23

`db.cjs` creaba índices explícitos solo para `expediente_historial(expediente_id, seq)` (línea 150) y
`ip_events(ip)` / `ip_events(user_id)` (líneas 238-239). Ninguna de estas columnas, consultadas en
cada request, tenía índice declarado en el código fuente (ver nota de verificación más abajo):

| Tabla.Columna | Consulta que la usa | Línea |
|---|---|---:|
| `projects.user_id` | `SELECT * FROM projects WHERE user_id = ? ORDER BY datetime(created_at) DESC` | `db.cjs:482` |
| `expedientes.project_id` | `SELECT * FROM expedientes WHERE project_id = ? ORDER BY datetime(created_at) DESC` | `db.cjs:502` |
| `payments.user_id` | listados por usuario (checkout, historial) | `server-api.js` (payments) |
| `payments.provider_id` | `SELECT * FROM payments WHERE provider_id = ?` (webhook) | `db.cjs:720` |

`recovery_tokens.token` (línea 751) **no necesita índice adicional**: es `PRIMARY KEY` de la tabla
(línea 225), y SQLite crea un índice único implícito para toda `PRIMARY KEY` declarada sobre una
columna `TEXT`. Se corrige aquí porque la tabla de la versión anterior de este informe la incluía
por error.

**Implementado:** se agregaron `CREATE INDEX IF NOT EXISTS idx_projects_user`,
`idx_expedientes_project`, `idx_payments_user` e `idx_payments_provider` junto a la `CREATE TABLE`
de cada entidad en `db.cjs` (no se tocó el esquema de columnas, solo se agregaron índices — fuera de
la zona congelada del plan de remediación, que protege el esquema, no los índices).

**Verificación de cierre:** `node tests/db-modulo1.test.mjs`, `db-modulo9.test.mjs` y
`workflow.test.mjs` siguen en verde; `sqlite_master` confirma los 4 índices creados sobre
`data/snc.sqlite`. Nota: esa base de datos local ya tenía índices equivalentes
(`idx_projects_user_created`, `idx_expedientes_project_updated`, `idx_payments_user_status`,
`idx_payments_provider_id`) aplicados en algún momento **fuera de `db.cjs`** — es decir, el código
fuente no los declaraba (confirma M-02, "migraciones improvisadas": la base real y el esquema
versionado habían divergido). Con este cambio, una base nueva creada desde cero por `db.cjs` ya
queda con los 4 índices sin depender de ese historial fuera de banda.

Con SQLite y los volúmenes actuales (unos pocos miles de filas) esto no se nota. En cuanto un
municipio cargue su padrón completo (decenas de miles de expedientes), cada `listByProject` y cada
login/checkout hace un **table scan** ordenado (`ORDER BY datetime(...)`, que tampoco puede usar un
índice sobre una expresión sin índice calculado). El propio objetivo que el método fija — `< 100 ms`
por consulta normal — deja de cumplirse de forma silenciosa, sin ningún error que lo señale.

**Fix (no toca `db.cjs` fuera de agregar índices, no cambia el esquema ni está en la lista de
columnas congeladas del plan — solo añade `CREATE INDEX`):**
```sql
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_expedientes_project ON expedientes(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_id);
```
Verificación de cierre: `EXPLAIN QUERY PLAN SELECT * FROM expedientes WHERE project_id = 'x'` deja de
mostrar `SCAN expedientes` y pasa a `SEARCH expedientes USING INDEX idx_expedientes_project`.

### P-04 · `SELECT *` sistemático sobre filas con columnas JSON grandes 🟡

16 de las ~20 consultas de `db.cjs` usan `SELECT *` (líneas 175, 347, 355, 390, 428, 453, 482, 489,
502, 509, 615, 622, 706, 716, 720, 741, 751, 771, 790). Para `expedientes` y `projects` esto trae
`state_json` y `validation_results` — que pueden pesar cientos de KB por fila (contienen el GeoJSON
del expediente) — **incluso cuando el endpoint solo necesita listar `id, name, updated_at`** (p. ej.
el listado de expedientes de un proyecto, `GET /api/projects/:id/expedientes`, que en el cliente
solo muestra nombre y fecha hasta que se abre uno).

**Fix sugerido:** dos variantes por entidad — `listByProject` (columnas ligeras: `id, name,
created_at, updated_at`) y `findById` (`SELECT *`, para el detalle). Esto no cambia el esquema (no
toca la zona congelada de `db.cjs`) ni el contrato público de los endpoints, solo las columnas que
cada consulta pide.

---

## 4. Fase 4 — Rendimiento de APIs

### P-05 · Sin compresión HTTP 🟠 — ✅ Implementado 2026-10-23

`server-api.js` no monta `compression` (`npm ls compression` → no está en `package.json`; ya
señalado en M-08 junto con `helmet`, pero sin cuantificar). Las respuestas con más impacto son
exactamente las que llevan GeoJSON: `GET /api/expedientes/:id` (trae `state_json` completo) y los
`express.static` de `/data/municipal/*.geojson`. `distritos_py_light.geojson` (865 KB, según
`README.md:150`) se sirve hoy sin gzip/brotli — en una conexión 3G/4G rural (el caso de uso típico de
un municipio del interior) eso son varios segundos solo de transferencia.

**Fix:** `app.use(compression())` antes de las rutas (una línea; no toca zonas congeladas).

**Implementado:** se agregó la dependencia `compression@^1.8.1` y `app.use(compression())`
inmediatamente después de `const app = express();`, antes de cualquier ruta estática o de API.
**Verificación de cierre:** `curl --compressed http://127.0.0.1:5556/data/distritos_py_light.geojson`
devuelve `Content-Encoding: br`; `GET /api/health` mantiene `Vary: Accept-Encoding`. `npm test` sigue
en verde en las suites que no dependen de un servidor HTTP levantado (ver nota en §7 sobre las
suites que sí lo requieren y ya fallaban antes de este cambio).

### P-06 · Healthcheck no falla nunca (ya abierto como A-02)

Confirmado en este corte: `server-api.js` sigue sin `await` en la verificación de DB del health
check. Se repite aquí solo para la métrica del método: un healthcheck que no detecta una base caída
hace que cualquier medición de disponibilidad/latencia hecha "porque el health check decía OK" sea
inválida. No se abre un hallazgo nuevo — se referencia A-02/A1-5 del plan de remediación.

### P-07 · Sin paginación en listados que pueden crecer sin límite 🟡

`dbAPI.payments.list` (`db.cjs:716`, sin `LIMIT`) y `dbAPI.projects.listByUser` (`db.cjs:482`, sin
`LIMIT`) devuelven todas las filas. Para un usuario con muchos proyectos o para el panel admin que
lista todos los pagos, la respuesta crece linealmente sin tope — a diferencia de
`admin_audit_log` (`db.cjs:790`), que sí tiene `LIMIT ?` con default 50. Alinear los demás listados al
mismo patrón (`LIMIT`/`OFFSET` o cursor por `created_at`).

---

## 5. Fase 5 — Operaciones síncronas vs. asíncronas

### P-08 · El estado completo del expediente se serializa a `localStorage` de forma síncrona en cada edición 🔴 — ✅ Implementado 2026-10-23

`js/state.js:126-133` (`_persist()`) hace `JSON.stringify` de `{ geojson, excelData, projection,
currentDisplayProjection, sourceGeoFileName, sourceDataFileName, parcelLineage, projectVersions }` —
es decir, **el GeoJSON completo del expediente y todas sus versiones históricas (`projectVersions`,
`parcelLineage`)** — y lo escribe con `localStorage.setItem`, una API **síncrona y bloqueante**, del
hilo principal del navegador.

`_persist()` se llama en cada `set()` sobre esas claves (`js/state.js:163`) y en al menos 4 puntos más
(líneas 296, 361, 381, 497): cada edición de atributo, cada paso de COGO, cada corrección de topología
dispara una re-serialización completa. Con un expediente de tamaño municipal (miles de parcelas +
historial de versiones), esto es:

1. **Bloqueo de UI perceptible** en cada acción del usuario (serializar varios MB de JSON en el hilo
   principal, no en un Worker), justo en las pantallas de validación/topología donde la auditoría
   original (B-07) ya señaló que `js/topology.worker.js` sí usa un Worker — pero el *guardado* del
   resultado no.
2. **Pérdida silenciosa de datos:** si `JSON.stringify(...)` supera la cuota de `localStorage`
   (~5-10 MB según navegador), `_persist()` lo atrapa en el `catch` (línea 130) y solo hace
   `logger.warn` — el usuario sigue trabajando creyendo que su expediente se guarda localmente, y no
   es así. Esto no es un hallazgo exclusivamente de rendimiento: es un riesgo de integridad de datos
   catastrales, que es justo el activo que este sistema protege.

**Fix sugerido (sin tocar el contrato de `state.js` hacia el resto del frontend):**
- *debounce* de `_persist()` (p. ej. 500 ms tras la última mutación) en lugar de guardar en cada
  `set()`.
- mover la serialización a un Web Worker o usar `requestIdleCallback`.
- si el tamaño supera un umbral (p. ej. 2 MB), omitir `localStorage` y confiar en el guardado contra
  el backend (`PUT /api/expedientes/:id`, que ya existe), avisando al usuario en la UI en vez de solo
  loguear una advertencia que nadie ve.

**Implementado:** `_persist()` ahora debounca 400 ms (`clearTimeout`/`setTimeout`) y expone
`flushPersist()`, llamado desde `beforeunload`/`pagehide` para no perder la última edición al cerrar
o recargar la pestaña. En entorno Node (`this._isNode`, usado por los tests) se mantiene el guardado
síncrono inmediato — ahí no hay hilo de UI que proteger ni evento `beforeunload`, y así se evita que
un `setTimeout` pendiente retrase el cierre de los scripts de test. El umbral de tamaño/aviso al
usuario ante cuota excedida queda pendiente (no implementado en este cambio: el debounce resuelve el
bloqueo del hilo principal, pero no la pérdida silenciosa si el expediente supera la cuota del
navegador).
**Verificación de cierre:** `node tests/workflow.test.mjs` (14/14) y el resto de las suites que
ejercitan `js/state.js` siguen en verde sin modificaciones.

### P-09 · Inserciones por lote sin transacción (cuantificación de B-07)

`cacheDb.js:145-150` (`saveFeaturesBatch`): `for (const feature of validFeatures) await saveFeature(feature)`
— un `INSERT ... ON CONFLICT` por feature, cada uno con su propio viaje a SQLite, en lugar de una
transacción (`BEGIN`/`COMMIT`) o un `db.serialize()` con los inserts en lote. Para una carga de 1.000
parcelas (un municipio chico), son 1.000 round-trips secuenciales al motor SQLite en vez de 1; con
`journal_mode = WAL` (línea 13) cada `INSERT` individual aun así implica su propio `fsync` de página
de WAL salvo que estén agrupados en una transacción explícita.

**Fix:**
```js
export async function saveFeaturesBatch(features) {
  const validFeatures = (features || []).filter(f => f?.geometry);
  await promisifyRun('BEGIN TRANSACTION');
  try {
    for (const feature of validFeatures) await saveFeature(feature);
    await promisifyRun('COMMIT');
  } catch (err) {
    await promisifyRun('ROLLBACK');
    throw err;
  }
  await pruneCache();
  return { saved: validFeatures.length };
}
```

---

## 6. Fase 6 — Caché

### P-10 · Índice espacial R-Tree creado y nunca consultado 🟠

`cacheDb.js:30-38` crea una tabla virtual `idx_parcelas_geometria USING rtree(id, minX, maxX, minY,
maxY)` con el comentario "búsqueda < 3ms" (línea 29). Ninguna de las funciones de lectura
(`getFeaturesByBbox`, línea 138; `getFeatureContainingPoint`, línea 152) consulta esa tabla: ambas
hacen el filtro de bbox directamente sobre `parcelas` usando el índice B-tree compuesto `idx_bbox`
(línea 28, sobre `minX, maxX, minY, maxY` — que para un filtro de rango en 2 dimensiones es
subóptimo frente al R-Tree que sí se creó pero no se usa). El R-Tree se mantiene vacío e inútil en
cada escritura (`INSERT`/`UPDATE` de `parcelas` no inserta la fila correspondiente en
`idx_parcelas_geometria`).

**Fix:** o se conecta el R-Tree de verdad (insertar en `idx_parcelas_geometria` dentro de
`saveFeature()` y reescribir `getFeaturesByBbox`/`getFeatureContainingPoint` para hacer
`JOIN idx_parcelas_geometria` en vez de comparar columnas sueltas), o se elimina la tabla virtual y el
comentario que promete una latencia que no se está midiendo ni entregando.

### P-11 · Caché de frontend inexistente para capas estáticas repetidas

`js/mapEngine.js` y `server-api.js` no usan ningún mecanismo de caché HTTP (`Cache-Control`,
`ETag`) para las capas GeoJSON de referencia servidas por `express.static` con `STATIC_OPTIONS`
(`server-api.js:44`), salvo el `maxAge: '1h'` ya presente en producción — correcto para
`/data/municipal/**`, pero ausente para los endpoints `/api/expedientes/:id` (dinámicos, no deberían
cachearse) y para los `GET` de datasets fijos servidos con `res.sendFile` directo sin `STATIC_OPTIONS`
(`DISTRITOS_PY_CNPV2022.geojson`, `deptos_py_light.geojson`, `distritos_py_light.geojson`,
líneas 88-98): estos tres son archivos inmutables entre despliegues y no llevan ningún header de
caché, por lo que el navegador los re-descarga en cada sesión.

**Fix:** `res.sendFile(path, { maxAge: '1d', immutable: true })` para esos tres datasets, o moverlos
al mismo `express.static(..., STATIC_OPTIONS)` que ya usa `/data/municipal`.

---

## 7. Fase 7 — Carga y concurrencia (no ejecutado)

Consistente con la modalidad declarada por la auditoría de seguridad original ("sin pruebas de
intrusión dinámicas"), esta auditoría tampoco ejecutó pruebas de carga (JMeter/k6/Gatling/Locust)
contra una instancia corriendo: no hay entorno de staging separado de la máquina de desarrollo, y
hacerlo contra `localhost` con la base real no es representativo ni seguro (abriría C-04/IDOR como
superficie de ataque mientras corre). Se deja como tarea explícita del plan (§9) y se señalan los
dos factores que ya se sabe que van a limitar cualquier prueba de carga real, ambos ya abiertos como
hallazgos de seguridad con una cara de rendimiento:

- **A-05** (`rateMap`/`sensitiveRateMap` en memoria, sin purgar): bajo una prueba de carga sostenida
  con múltiples IPs/usuarios, estos `Map` crecen sin límite — antes de medir rendimiento del backend,
  se mediría el crecimiento de memoria del propio limitador.
- **`tempProjects` en memoria sin TTL** (M-09): cualquier prueba de carga que ejercite el flujo de
  "proyecto sin cuenta" acumula objetos en memoria del proceso Node sin que nada los libere.

**Recomendación:** una vez cerrada la Fase 0/1 de seguridad (prerrequisito: no tiene sentido cargar un
servidor con IDOR abierto), levantar un entorno de staging con datos sintéticos y correr k6 con los
escenarios de la tabla del método (10/50/100/500/1000 usuarios) sobre `GET /api/expedientes/:id`,
`POST /api/projects/:id/expedientes` y el login.

---

## 8. Fase 8 — Código fuente (frontend)

### P-12 · Tabla de atributos sin virtualización 🟡

`js/dataTable.js:40`: `tbody.innerHTML = orderedRows.map(...).join('')` reconstruye **todas** las
filas del `<tbody>` en cada render, para cualquier cambio (editar una celda, reordenar, filtrar). No
hay virtualización (renderizar solo las filas visibles). Para un expediente con miles de parcelas
(el caso de uso objetivo: catastro municipal completo), cada edición de celda reconstruye miles de
nodos DOM.

**Fix:** virtualización simple (renderizar solo las ~50 filas visibles + buffer, con scroll
sintético) o, como primer paso de bajo esfuerzo, delegar el render incremental: reemplazar solo la
`<tr>` afectada en lugar de todo `tbody.innerHTML`.

### P-13 · Mapa sin agrupación de marcadores (`markerClusterGroup`)

`js/mapEngine.js` usa `L.marker(...)` (5 apariciones) sin `leaflet.markercluster` ni agrupación
manual. Para capas de puntos con volumen (mojones, puntos de control, direcciones), Leaflet sin
clustering renderiza un nodo SVG/DOM por marcador — a partir de unos pocos miles de puntos el
`pan`/`zoom` del mapa se degrada de forma notable en equipos modestos (el perfil de hardware
esperable en una oficina municipal del interior).

**Fix:** adoptar `leaflet.markercluster` (ya hay `leaflet-draw` como dependencia — está en la misma
familia de plugins) para las capas de puntos, no para los polígonos de parcelas.

---

## 9. Fase 9/10 — Infraestructura y plan de optimización

No hay infraestructura de servidor desplegada a auditar hoy (`npm run deploy` falla, ver A-09 /
`docs/AUDITORIA_SNC_v3_2026-10-18.md` §5): toda observación de "infraestructura" de esta auditoría
se reduce a lo que ya aparece en §2 (dependencias duplicadas) y §4-6 (lo que correría en cualquier
infraestructura, buena o mala, por venir de la propia app).

### Priorización (impacto / esfuerzo, igual que el método pide)

| Acción | Hallazgo | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|
| Índices en FKs consultadas | P-03 | Muy alto | Muy bajo (solo `CREATE INDEX`) | ✅ Implementado |
| `debounce`/Worker para `_persist()` | P-08 | Muy alto (evita bloqueo + pérdida de datos) | Bajo | ✅ Implementado (debounce; Worker queda pendiente) |
| Transacción en `saveFeaturesBatch` | P-09 | Alto | Bajo | Pendiente |
| `compression` en Express | P-05 | Alto | Muy bajo | ✅ Implementado |
| `SELECT` con columnas acotadas en listados | P-04 | Medio-alto | Medio | Pendiente |
| Virtualización de `dataTable.js` | P-12 | Alto (UX en expedientes grandes) | Medio | Pendiente |
| `Cache-Control` en datasets estáticos fijos | P-11 | Medio | Muy bajo | Pendiente |
| Conectar o eliminar el R-Tree | P-10 | Medio | Bajo | Pendiente |
| Code-splitting de `export.js` por formato | P-01 | Medio (TTI) | Medio | Pendiente |
| `markerClusterGroup` para capas de puntos | P-13 | Medio | Medio | Pendiente |
| Retirar `better-sqlite3` no usado o migrar de verdad | P-02 | Bajo (higiene) | Bajo | Pendiente |
| Pruebas de carga reales (k6) en staging | §7 | — (habilita medir todo lo anterior) | Alto — requiere entorno nuevo | Pendiente |

**Orden recomendado**, siguiendo el método: ninguno de estos ítems requiere resolver primero los
hallazgos de seguridad (son independientes), **pero el plan de remediación de seguridad sí debe ir
primero en el calendario del equipo** porque comparte los mismos archivos (`server-api.js`, `db.cjs`)
y el protocolo del repo pide un hallazgo por cambio: mezclar un `CREATE INDEX` con el próximo fix de
IDOR en el mismo commit violaría esa regla. Sugerencia concreta: P-03, P-05 y P-11 (los tres de
esfuerzo "muy bajo") se pueden ejecutar ya, en paralelo a la Fase 0 de seguridad, porque no tocan
ninguna de las zonas congeladas (§6 del plan de remediación) ni las secciones de auth/IDOR/pagos.
P-08 y P-09 son frontend/caché puros y tampoco tocan zonas congeladas.

---

## 10. Qué no se tocó y por qué

Respetando `AGENTS.md` y el plan de remediación vigente. **Actualización 2026-10-23:** a pedido
explícito, se implementaron los 3 fixes de esfuerzo muy bajo/bajo (P-03, P-05, P-08) sobre esta
misma base — ver las notas "Implementado" en cada hallazgo (§3, §4, §5) y la tabla de §9. El resto
de este informe sigue siendo solo análisis.

- Los únicos archivos de código modificados fueron `db.cjs` (índices aditivos, P-03),
  `server-api.js` (import + `app.use(compression())`, P-05), `js/state.js` (debounce de
  `_persist()`, P-08) y `package.json`/`package-lock.json` (dependencia `compression`). Cada cambio
  es aditivo: ninguno altera un contrato existente ni requiere tocar otro código para funcionar.
- No se propuso ni se aplicó ningún cambio en `firebase.json`, `firebase.scripts.json`, `.env`,
  `config.env.js`, `serviceAccountKey.json`, ni en las secciones de auth/IDOR/pagos de
  `server-api.js` o el esquema (columnas) de `db.cjs` (zonas congeladas hasta cerrar la Fase 0 de
  seguridad). Los `CREATE INDEX` de P-03 son aditivos y no alteran el esquema existente — no están
  cubiertos por el congelamiento, que protege columnas/tipos, no índices.
- No se ejecutaron pruebas de carga contra ningún entorno (§7).
- No se registró este informe como tarea cerrada en `graphify-out/auditoria/auditoria.json`: ese
  archivo es el espejo de los 38 hallazgos de la auditoría de seguridad del 2026-10-18 y se
  regenera con `npm run audit:sync`; este documento es un informe nuevo y complementario, no una
  actualización de esos 38 hallazgos.

---

*Informe generado mediante análisis estático y lectura directa de código (`archivo:línea`). No
incluye pruebas de carga dinámicas ni acceso a un entorno de staging/producción.*
