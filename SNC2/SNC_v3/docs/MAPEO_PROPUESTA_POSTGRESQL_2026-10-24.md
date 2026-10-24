# Mapeo: propuesta de arquitectura PostgreSQL/PostGIS vs. esquema real de SNC_v3

**Fecha:** 2026-10-24
**Qué es esto:** el usuario compartió una propuesta de arquitectura (PostgreSQL + PostGIS, UUID,
`geometry(MultiPolygon,4326)`, índices GIST, 10 dominios de tablas, Data Warehouse separado) para un
"Sistema Nacional Catastral, Ambiental, Notarial y Territorial". Este documento la compara **tabla por
tabla** contra lo que realmente existe hoy en `db.cjs`/`cacheDb.js`, en vez de tratarla como si
arrancara de cero. **No se migró nada a PostgreSQL ni se tocó el esquema de `db.cjs`** — eso queda
como estaba, en el backlog (M-7), por decisión explícita (ver §4).

---

## 0. Lo más importante primero: el principio "no guardar GeoJSON completo en un campo JSON"

Esto ya estaba señalado, con la misma evidencia, en dos documentos previos:
- `AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md`, hallazgo P-04: `expedientes.state_json` guarda
  el GeoJSON completo del expediente, y `SELECT *` lo trae incluso cuando solo hace falta listar
  nombre/fecha.
- `js/vepMetrics.js` y `js/ambientalEngine.js` (comentarios en el código): la tabla `parcelas` de
  Fase 11 **deliberadamente no duplica la geometría** — solo extrae atributos (`CODIGO`, `PADRON`,
  superficie, etc.) a filas direccionables. La geometría real sigue viviendo exclusivamente en
  `expedientes.state_json.geojson`.

Esa fue una decisión de diseño consciente, no un descuido: **SQLite no tiene un tipo `geometry` nativo
ni índices GIST.** Guardar la geometría como columna real, consultable e indexada espacialmente (lo
que la propuesta pide con `geometry(MultiPolygon,4326)` + `USING GIST(geometry)`) **requiere
PostgreSQL+PostGIS de verdad** — no es algo que se pueda simular en el esquema actual. Esto confirma
que el punto más fuerte de la propuesta (parcela con geometría propia, indexada) es exactamente la
razón por la que M-7 (migración a Postgres) sigue en el backlog como su propio proyecto, no como un
parche.

---

## 1. Mapeo dominio por dominio

### 01 Seguridad

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `usuarios` | `users` (`db.cjs`) | ✅ Existe. `password_hash_v2` con bcrypt (no Argon2id, pero hasheado — nunca texto plano) |
| `roles` | `users.role` (string: `member`/`admin`/`admin_municipal`/`admin_notarial`/`superadmin`) | ⚠️ Existe como enum embebido, no como tabla normalizada. Suficiente para el tamaño actual; no escala a permisos finos por dirección municipal |
| `permisos` | — | ❌ Falta. Hoy los permisos son `if (role === 'admin')` hardcodeado en `adminMiddleware`, no datos |
| `auditoria` | `admin_audit_log` (`db.cjs`) | ⚠️ Existe pero solo registra acciones de endpoints `/api/admin/*` explícitamente instrumentados, no un trigger genérico sobre todas las tablas como pide la propuesta ("nunca borrar", todo registrado) |

### 02 Personas

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `personas` (cédula única) | `personas` (Fase 11, `db.cjs`) | ✅ Existe, mismo diseño: `cedula TEXT UNIQUE NOT NULL` |
| `domicilios` | — | ❌ Falta |

### 03 Territorio

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `departamentos` / `distritos` / `barrios` | Columnas de texto sueltas (`parcelas.departamento`, `.distrito`, `.zona`, `.manzana`) | ❌ No son tablas propias — son strings sin catálogo ni FK. No hay forma de preguntar "¿qué distritos existen?" sin agregar sobre texto libre |

### 04 Catastro

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `cuentas_corrientes_territoriales` (CCC) | `cuenta_catastral` (Fase 11) | ✅ Mismo concepto, otro nombre. `codigo_ccc` en vez de `ccc`, pero es la misma entidad (identificador inmutable 1:1 con una parcela) |
| `parcelas` con `geometry(MultiPolygon,4326)` | `parcelas` (Fase 11) **sin geometría** (ver §0) | ⚠️ Existe como entidad direccionable (una fila por feature), pero la geometría sigue en `expedientes.state_json`, no en la fila de `parcelas` |
| `historial_parcelario` | `parcel_lineage` (Fase 11) | ✅ Mismo concepto: `codigo_origen`/`codigo_destino`/`tipo_evento`, persistido server-side (antes solo vivía en `localStorage`, ver P-08) |

### 05 Notarial / Registro Público

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `escrituras` (número, fecha, escribano, protocolo, folio) | — | ❌ Falta por completo. `js/app-notarial.js`/`js/escribania.js` son UI que leen atributos sueltos del GeoJSON (`FINCA_MATRICULA`), no una tabla propia (ver `AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md` §1) |
| `escritura_parcela` (relación) | — | ❌ Falta (depende de que exista `escrituras`) |
| `matriculas` (número, finca, folio, asiento, estado) | `matriculas` (Fase 11) | ✅ Existe, con el agregado de `estado = 'SIN_VERIFICAR' / 'VERIFICADA'` para no dejar que una resincronización automática pise una verificación notarial ya hecha |
| `titulares` | `parcela_propietario` (Fase 11) | ✅ Mismo propósito como relación N:M persona↔parcela con `tipo_relacion`/`porcentaje`/fechas, en vez de una tabla "titulares" separada |

### 06 Ambiental

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `humedales` / `bosques` / `restricciones` (una tabla por tipo) | `restricciones_ambientales` (Fase 11, M-1) | ✅ Cubierto, con una decisión de diseño distinta: **una tabla genérica** con columna `tipo` (`HUMEDAL`, `FAJA_RIBERENIA`, `RESERVA`, `BOSQUE_PROTEGIDO`, `VERTEDERO`, `ZONA_INUNDABLE`, `RIESGO_TECNOLOGICO`, `OTRO`) en vez de una tabla por tipo. Incluye `buffer_metros` y `nivel_restriccion` (`BLOQUEA`/`CONDICIONA`), que la propuesta no contemplaba pero que `js/ambientalEngine.js` necesita para distinguir "no apto" de "condicionado" |

### 07 POUT

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `zonas_pout` / `usos_suelo` | — | ❌ Falta — es exactamente M-2 del backlog, que estaba bloqueado por falta de datos reales. **Ya no lo está**: `docs/pout-manuales/` tiene 13 PDFs de POUT municipal + shapefiles de zonificación + 95 proyectos QGIS (ver nota en la respuesta a este mensaje) |
| `indicadores` | `js/vepMetrics.js` (Fase 11, paso 5) | ⚠️ Existe como motor de cálculo (funciones), no como tabla. La propuesta de "vistas analíticas" (§9 abajo) encajaría mejor con el diseño actual que una tabla `indicadores` materializada |

### 08 Tributario

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `valuaciones` | — | ❌ Falta por completo |
| `obligaciones` | — | ❌ Falta por completo |
| `pagos` | `payments` (`db.cjs`) | ⚠️ **Falso amigo**: `payments` existe, pero es para pagos de **planes/suscripciones de SNC_v3** (el SaaS), no para impuesto inmobiliario ni tasas municipales. No sirve para lo que la propuesta pide sin un diseño nuevo |

### 09 Expedientes

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `expedientes` colgando de `parcela_id` ("los expedientes nunca deben ser el centro") | `expedientes` cuelga de `project_id`, y las `parcelas` de Fase 11 cuelgan *del expediente* (`parcelas.expediente_id`) | ❌ **Jerarquía invertida respecto a la propuesta.** Hoy: `project → expediente → (parcelas extraídas de su geojson)`. La propuesta pide: `parcela → expedientes que le pertenecen`. Esto no es un detalle menor — es la diferencia entre "expediente-céntrico" y "parcela-céntrica" que tanto esta propuesta como la auditoría estratégica previa (punto 1) señalan como el problema arquitectónico de fondo. Corregirlo en SQLite sin romper el flujo de edición actual (un expediente trae un GeoJSON con 1-N parcelas) no es trivial; en Postgres, con la parcela como tabla real desde el día 1, es la forma natural |
| `documentos` | `expedientes.files_json` (array embebido) | ⚠️ Existe pero como JSON embebido, no tabla normalizada — mismo patrón de "no guardar todo en un campo JSON" que señala la propuesta |

### 10 Inteligencia / Decision Intelligence

| Propuesta | SNC_v3 hoy | Estado |
|---|---|---|
| `vistas` (SQL `VIEW`) | — | ❌ SQLite soporta `VIEW`, simplemente no se usa ninguna; `vepMetrics.js` recalcula todo en JS cada vez en lugar de consultar una vista materializada |
| `indicadores` | `js/vepMetrics.js` | ⚠️ Ver fila de POUT arriba |
| `modelos_ia` / `simulaciones` | — | ❌ Falta por completo — ya confirmado en `AUDITORIA_ESTRATEGICA_MODELO_DATOS_2026-10-23.md` §5 (Apéndice): cero líneas de IA/ML/simulación en el repo |

---

## 2. Lo que la propuesta acierta y que SNC_v3 ya hace bien (no romper)

- **UUID como clave primaria**: ya es el estándar en todo `db.cjs` (`crypto.randomUUID()`), incluidas
  las tablas de Fase 11. No hace falta cambiar nada acá si algún día se migra a Postgres.
- **Password hasheado, nunca texto plano**: ya es así (bcrypt coste 12), confirmado en la auditoría de
  seguridad original (`AUDITORIA_SNC_v3_2026-10-18.md`, "lo que está bien y conviene preservar").
- **Índices en toda FK**: ya es la recomendación cerrada en `AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md`
  (P-03, implementado en el commit `ca2d34e`) y en el propio esquema de Fase 11 (`idx_parcelas_expediente`,
  `idx_ccc_codigo`, `idx_pp_parcela`, etc.).
- **Nunca borrar el historial**: ya es el diseño de `parcel_lineage` y de `expediente_historial` (que
  además tiene cadena de hash SHA-256 para detectar manipulación — más estricto que lo que pide la
  propuesta).

---

## 3. Lo que falta y es barato agregar en SQLite hoy (no requiere Postgres)

Ninguno de estos necesita `geometry`/GIST — son tablas relacionales comunes. Quedan anotados como
nuevos ítems de backlog (ver `PLAN_FASE11_BACKLOG.md`), no implementados en este documento:

| Nuevo ítem | Qué agrega | Esfuerzo |
|---|---|---|
| M-8 | `escrituras` + `escritura_parcela` (notarial real, hoy ausente) | Bajo-medio: mismo patrón que `matriculas` |
| M-9 | `departamentos`/`distritos`/`barrios` como catálogo (hoy texto libre) | Medio: requiere migrar los strings existentes a FK sin romper lo que ya hay |
| M-10 | `auditoria` genérica (hoy `admin_audit_log` es solo para acciones admin) | Medio: decidir qué operaciones instrumentar sin duplicar `expediente_historial`, que ya cubre el caso de expedientes |
| M-11 | Vistas SQL (`CREATE VIEW`) para los indicadores que hoy `vepMetrics.js` calcula recorriendo filas en JS | Bajo: SQLite soporta `VIEW` nativamente, es sintaxis, no una migración |

## 4. Lo que SÍ requiere PostgreSQL+PostGIS (no se empieza ahora)

- Geometría como columna real indexada (GIST) en `parcelas` — el cambio estructural más importante
  de la propuesta, y el que de verdad exige cambiar de motor.
- Parcela como dueña de sus expedientes (jerarquía invertida) — técnicamente posible en SQLite, pero
  tiene mucho más sentido diseñarlo junto con la migración, no dos veces.
- Separación operacional/Data Warehouse con ETL — tiene sentido recién con varias tablas
  operacionales reales y en producción, no antes.

Esto confirma, sin cambiarlo, lo que ya decía `PLAN_FASE11_BACKLOG.md` §2 (M-7): la migración a
PostgreSQL es su propio proyecto, a diseñar *con* las tablas de M-1 a M-5/M-8/M-9 ya resueltas en
SQLite primero (para no migrar un modelo incompleto y tener que rediseñarlo después en Postgres).

---

*Documento de mapeo, no de implementación: no se creó ninguna tabla nueva ni se tocó `db.cjs` al
redactar esto. Los ítems M-8 a M-11 quedan en `PLAN_FASE11_BACKLOG.md` para decidir cuándo abordarlos.*
