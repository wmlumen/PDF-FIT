# Auditoría estratégica de modelo de datos y gobernanza catastral — SNC_v3 (Fase 11)

**Fecha:** 2026-10-23
**Alcance:** modelo de datos y arquitectura de dominio, evaluado contra la propuesta de evolución a
"Sistema Nacional de Catastro Multipropósito" (Cuenta Corriente Catastral, Persona↔Parcela, Registro
Público, BI/Data Warehouse, Ambiental, POUT) recibida del usuario. Complementa, no sustituye, a
[`AUDITORIA_SNC_v3_2026-10-18.md`](AUDITORIA_SNC_v3_2026-10-18.md) (seguridad) y a
[`AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md`](AUDITORIA_RENDIMIENTO_ARQUITECTURA_2026-10-23.md)
(rendimiento).
**Modalidad:** verificación estática contra el código real (esquema SQL efectivo, no la documentación
aspiracional). Cada punto de la propuesta se contrasta con evidencia `archivo:línea` antes de aceptarlo
o corregirlo.

**Veredicto:** la crítica recibida tiene razón en lo esencial — **el modelo de datos de SNC_v3 es
plano y centrado en el expediente/geometría, no relacional y centrado en el inmueble.** No hay una
sola fila de SQL en todo el repositorio para `personas`, `matriculas`, `escrituras`,
`parcela_propietario`, `restricciones_ambientales` o una cuenta catastral como entidad propia. Pero la
magnitud del vacío no es pareja: en indicadores municipales (BI) ya existe una especificación seria
(`docs/INDICADORES_MUNICIPALES_VEP.md`) que la propuesta del usuario no vio, y en topología ya hay
detección de solapes funcionando. Antes de abrir una "Fase 11/12" de 10-12 frentes nuevos, lo que
hace falta no es más diseño de visión: es **convertir dos documentos de visión ya escritos
(indicadores VEP, `parcelLineage`) en tablas reales**, y eso es un esfuerzo acotado, no una
reescritura.

---

## 0. Qué de la propuesta ya existe (parcial o totalmente) — para no reinventar

| Punto de la propuesta | Estado real verificado | Evidencia |
|---|---|---|
| "Falta linaje parcelario" | **Existe el concepto**, no la persistencia: `parcelLineage` es un array en el estado del cliente (`js/state.js:83`), guardado en `localStorage`, no en una tabla con historial server-side | `js/state.js:83` |
| "Falta BI con indicadores municipales" | **Ya hay una especificación** de 20+ indicadores (`IND-CAT-*`, `IND-AMB-*`, `IND-RSG-*`) con fórmula, umbral VEP/MEF y marco legal, pensada para alimentar dashboards por dirección municipal | `docs/INDICADORES_MUNICIPALES_VEP.md:45-80` |
| "Falta integridad geoespacial (solapes)" | **Ya existe** detección de solapes entre features de un mismo dataset vía `turf.intersect` y una acción `REMOVE_OVERLAP` | `js/topologyRepair.js:49-57` |
| "Falta integración con geoservicios externos (MEF/MADES)" | **Ya hay un cliente** (`vepDataClient.js`) con catálogo de 230 capas de MEF/VEP clasificadas por dirección municipal (catastro, ambiente, riesgos, tránsito, equipamientos), vía CARTO SQL API | `js/vepDataClient.js:13-56` |
| "Falta MAG/INDERT" | Existe `magSync.js` con una caché local (`mag_layers_cache`) de capas del MAG | `magSync.js:115` |
| "Falta Portal Notarial" | Existe `js/app-notarial.js`, `js/escribania.js`, `notarial/` — pero (ver §2) como **verificador de atributos sueltos del GeoJSON**, no como módulo registral con tablas propias | `js/app-notarial.js:110-111,183-185` |

El módulo `vepMetrics.js` que el propio diagrama de `docs/INDICADORES_MUNICIPALES_VEP.md:28` da por
existente **no está en el repositorio** (`glob js/vepMetrics.js` → sin resultados): las fórmulas de
indicadores están especificadas pero no hay código que las calcule. Esa es la primera brecha concreta,
no una de las diez de la propuesta: **cerrar la distancia entre el documento de indicadores y el
motor que los produce.**

---

## 1. La brecha real: modelo plano de atributos, no modelo relacional de inmueble

Esta es la validación concreta del punto más fuerte de la propuesta recibida (su punto 1). Las únicas
tablas SQL que existen en todo el repositorio son:

```
users, plans, projects, expedientes, expediente_historial, payments, usage,
public_reports, recovery_tokens, ip_events, mag_layers_cache (caché), run_formularios,
parcelas (caché catastral con R-Tree, ver AUDITORIA_RENDIMIENTO §6)
```
(verificado con `grep -rn "CREATE TABLE" **/*.{js,cjs}`, excluyendo `A_Eliminar/`). No hay
`personas`, `matriculas`, `escrituras`, `parcela_propietario`, `cuenta_catastral`,
`restricciones_ambientales`, `zonificacion`, ni tablas de hechos/dimensiones.

En cambio, el "propietario" y la "matrícula" de un inmueble son **columnas de texto plano en la tabla
de atributos de cada parcela**, al mismo nivel que la superficie o el uso de tierra:

```js
// js/config.js:32-47
export const CAMPOS_REQUERIDOS = [
    'CODIGO', 'PROPIETARIO', 'USO_TIERRA', 'SUP_TITULO', 'DEPARTAMEN', 'DISTRITO',
    'PADRON', 'ZONA', 'MANZANA', 'LOTE', 'SUP_SIG_M', 'SUP_LEGAL', 'REG_PROF',
    'FINCA', 'MATRICULA', ...
];
```

Y el verificador notarial lee esos mismos campos sueltos del GeoJSON cargado, no de una base registral:

```js
// js/app-notarial.js:110-111
const fincaInput = document.getElementById('inp-finca');
if (fincaInput) fincaInput.value = props.FINCA_MATRICULA || '';
```

**Consecuencia práctica, verificable, de este diseño:**
- `PROPIETARIO` es un string: no se puede modelar copropiedad (dos personas, 50/50), ni un cambio de
  titular sin perder el anterior (no hay historial de transferencias), ni vincular por cédula.
- `FINCA`/`MATRICULA` son strings sin tabla propia: no hay forma de consultar "¿qué parcelas tiene
  una matrícula con litigio?" sin recorrer todos los GeoJSON cargados; no hay alerta automática de
  embargo/hipoteca al intentar fraccionar o transferir, porque no existe la entidad que portaría ese
  estado.
- El "apto para escriturar" de `app-notarial.js:238` es una verificación local sobre esos mismos
  atributos sueltos (superficie coincidente, tributos "al día" como string), no una consulta contra un
  estado jurídico persistido y versionado.

Esto confirma, con evidencia, los puntos 1, 2 y 4 de la propuesta del usuario (Cuenta Corriente
Catastral como entidad ausente, Persona↔Inmueble ausente, Registro Público no modelado). No hace
falta repetir aquí la justificación conceptual que ya trae la propuesta — es correcta — sino señalar
**el camino más corto** desde el estado actual:

### Estado de implementación — 2026-10-23 (misma sesión)

Se implementaron los pasos 1-4 de la ruta sugerida abajo (CCC, personas, matrículas, linaje
server-side), con el diseño que el usuario eligió explícitamente: **una tabla `parcelas` nueva,
poblada al guardar el expediente** (una fila por feature del GeoJSON), con `cuenta_catastral`,
`matriculas`, `personas` y `parcela_propietario` enganchadas a esa fila, no al expediente completo.

- **Esquema** (`db.cjs`): tablas `parcelas`, `cuenta_catastral`, `personas`, `parcela_propietario`,
  `matriculas`, `parcel_lineage`. `parcelas` se upsertea por `(expediente_id, feature_index)` — nunca
  se borra una fila aunque el feature desaparezca en una edición posterior, consistente con el
  principio catastral "nunca eliminar parcelas". `cuenta_catastral` se crea una sola vez por parcela
  y no se vuelve a tocar. `matriculas` se sincroniza desde `FINCA`/`MATRICULA` del GeoJSON solo
  mientras sigue `SIN_VERIFICAR` — en cuanto un escribano la verifica, una resincronización por edición
  de geometría ya no pisa ese trabajo. `personas`/`parcela_propietario` **no se migran
  automáticamente** desde el string `PROPIETARIO` (no hay cédula en ese dato); el alta es explícita.
- **Sincronización**: `syncParcelasFromGeojson(expedienteId, geojson)` se llama desde
  `POST /api/projects/:projectId/expedientes` y `PUT /api/expedientes/:id` en `server-api.js`, con el
  objeto ya sanitizado (no releído de la columna `state_json`, para no depender de cómo quede
  codificada — ver nota abajo).
- **Endpoints nuevos** (todos con verificación de propiedad expediente→proyecto→usuario, para no
  sumar una IDOR nueva mientras C-04 sigue abierto en el resto del archivo):
  `GET /api/expedientes/:id/parcelas`, `GET /api/parcelas/:id`,
  `POST /api/parcelas/:id/propietarios` (alta de persona + relación por cédula),
  `GET`/`POST /api/expedientes/:id/lineage`.
- **Test de regresión:** `tests/fase11-ccc.test.mjs` (11 casos, sumado a `npm test`), más verificación
  manual end-to-end por HTTP (registro, proyecto, expediente con GeoJSON, lectura de parcelas con CCC
  y matrícula, alta de propietario por cédula, linaje, y aislamiento: un segundo usuario recibe 404 al
  intentar leer la parcela del primero).
- **Paso 5 (motor de indicadores):** `js/vepMetrics.js` implementado — el módulo que
  `docs/INDICADORES_MUNICIPALES_VEP.md` nombraba en su diagrama pero no existía en el repo (§0 de este
  informe). Calcula de verdad el reporting básico (Nivel 1: totales, superficie, matrículas,
  propietarios únicos) y `IND-CAT-01` (con la aproximación explícita de usar `matricula.estado =
  VERIFICADA` como proxy de título inscripto, documentada en el propio código), más un helper espacial
  genérico (`calcularInterseccionEspacial`, `calcularAfectacionPorBuffer`) que resuelve `IND-AMB-04` ya
  mismo y queda listo para `IND-AMB-02`/`IND-RSG-01`/`IND-RSG-03` en cuanto haya una capa de referencia
  cargada. Los otros 14 indicadores de la especificación (recaudación, red vial, censo, RSU, patentes)
  devuelven `{ disponible: false, motivo: '...' }` en vez de un número simulado — ninguno de esos
  tiene la fuente de datos integrada en SNC_v3 todavía. Test: `tests/vep-metrics.test.mjs`. Sigue
  pendiente: conectarlo a un panel/dashboard en la UI (este paso fue solo el motor de cálculo).

**Hallazgo colateral (no corregido en este cambio, fuera de alcance):** al probar contra una base de
datos nueva se detectó que el arranque de `db.cjs` (bloque "Mesa de entrada", migración de columnas
`entrada_nro` y afines) tiene una condición de carrera real: la creación del índice
`idx_expedientes_entrada_nro` puede ejecutarse antes de que el `ALTER TABLE ADD COLUMN entrada_nro`
correspondiente termine, lo que lanza `SQLITE_ERROR: no such column: entrada_nro` como una excepción
no capturada (`db.run` sin callback de error) que **tumba el proceso**. Es intermitente (no se
reprodujo en todas las corridas) y toca una sección de `db.cjs` que el plan de remediación mantiene
congelada hasta A1-2/A1-6, así que no se tocó aquí — se deja constancia para que se audite como su
propio hallazgo de seguridad/estabilidad, no de rendimiento.

### Recomendación de implementación incremental (no "reescribir SNC_v3")

El punto 10 de la propuesta ("modelo estrella / Power BI") y el punto 1 ("Cuenta Corriente Catastral")
no son dos proyectos separados: la CCC *es* la dimensión central de ese modelo estrella. Orden
sugerido, cada paso cerrable y testeable por separado (consistente con la regla "un hallazgo por
cambio" de `AGENTS.md`):

1. **Tabla `cuenta_catastral`** (id, código CCC inmutable, distrito, zona, manzana, lote, padron_nro)
   — se puede poblar desde los `PADRON`/`CODIGO` que YA están en cada feature GeoJSON, sin perder nada.
2. **Tabla `personas`** (cédula única) y **`parcela_propietario`** (parcela_id, persona_id,
   tipo_relación, porcentaje, fecha_desde/hasta) — migración que parsea el string `PROPIETARIO`
   actual a una primera fila por parcela (relación 1:1 de arranque, ampliable a copropiedad después).
3. **Tabla `matriculas`** (matrícula, finca, folio, protocolo, estado) — misma lógica: arranca
   poblada desde el string `FINCA`/`MATRICULA` actual, y de ahí en adelante el notarial escribe contra
   la tabla, no contra el atributo del GeoJSON.
4. **Persistir `parcelLineage`** (hoy solo en `localStorage`, `js/state.js:83`) como tabla
   `parcel_lineage` server-side, con los mismos campos que ya definió la propuesta (origen, destino,
   fecha, expediente) — es elevar algo que ya existe, no inventarlo.
5. Con 1-4 en pie, recién ahí tiene sentido construir `vepMetrics.js` (hoy inexistente) como motor que
   calcule los indicadores ya especificados en `docs/INDICADORES_MUNICIPALES_VEP.md` contra las tablas
   reales, en vez de contra GeoJSON cargado en memoria.

Cada uno de estos 5 pasos es, en esfuerzo, comparable a lo que ya se hizo en la auditoría de
rendimiento (agregar tablas e índices sin tocar el esquema congelado de `expedientes`/`projects`). El
riesgo no es técnico: es de alcance — intentar los 10-12 frentes de la propuesta a la vez, sobre una
base de código que todavía tiene 8 hallazgos críticos de seguridad sin cerrar (ver
`AUDITORIA_SNC_v3_2026-10-18.md`), dispersaría el esfuerzo. Mi recomendación es secuenciar: Fase 0/1 de
seguridad → pasos 1-4 de este documento (CCC + personas + matrículas + linaje, que no tocan ninguna
zona congelada) → motor de indicadores (paso 5) → ambiental/POUT/riesgos (que dependen de 1-4 para
tener algo a qué atar las restricciones).

---

## 2. Puntos de la propuesta que corresponden a datos externos, no a código de SNC_v3

Varios de los "vacíos" señalados (MADES, INFONA, ERSSAN, DGRP/Registro Público, INE, capas POUT
municipales) no son código que SNC_v3 deba construir desde cero: son **fuentes de datos
institucionales externas** que `vepDataClient.js` ya está diseñado para consumir (vía geoservicios
WMS/WFS/CARTO) y que, igual que el catálogo VEP, requieren que alguien cargue/sincronice las capas
concretas de cada municipio. Es en este punto donde entran las capas de POUT que el usuario
mencionó tener en Drive:

> **Nota sobre el enlace de Google Drive compartido en esta conversación:** el conector de Google
> Drive de esta sesión está "conectado" a nivel de servidor pero las llamadas devuelven "requiere
> autenticación" — no pude leer la carpeta (`16LybYGh2jO-iGb9uzGpxZC4b0wKCMjvX`) todavía. Para que
> pueda inspeccionar esas capas de POUT y decirte exactamente qué formato traen y cómo encajan con
> `vepDataClient.js`/`data/municipal/<municipio>/`, necesitás volver a autenticar el conector: `/mcp`
> en esta sesión (o en Conectores, en la web) y volver a iniciar sesión en Google Drive. Avisame
> cuando esté y lo reviso; si preferís no esperar, también podés decirme directamente qué municipios y
> qué tipo de archivo son (shapefile, GeoJSON, Excel con ordenanzas) y te digo dónde encajarían hoy.

---

## 3. Qué de la propuesta NO recomiendo hacer ahora (y por qué)

- **Migrar SQLite → PostgreSQL/PostGIS (punto "Lo que cambiaría", ítem 1 de la propuesta):** es la
  recomendación correcta a mediano plazo (SQLite no tiene tipo `geometry` nativo ni concurrencia de
  escritura real), pero es una migración de infraestructura, no un hallazgo cerrable como los de este
  informe. Debería ser su propio proyecto, con los pasos 1-4 de §1 ya diseñados *para el esquema de
  destino* (evita migrar un modelo plano y después tener que remodelarlo en Postgres).
- **Gemelo digital municipal / IA territorial (detección automática por imágenes satelitales/drones):**
  son capacidades reales y valiosas, pero no auditables contra código que no existe ni está
  planificado en ningún archivo del repo (no hay huella de visión computacional, drones ni
  fotogrametría en `js/` o `package.json`). Quedan fuera de esta auditoría por falta de superficie a
  verificar, no por descartarlas.

---

## 4. Resumen para decidir

| Frente de la propuesta | Esfuerzo para el primer paso cerrable | Depende de |
|---|---|---|
| Cuenta Corriente Catastral | Bajo (1 tabla + migración desde `PADRON`/`CODIGO` existentes) | — |
| Persona↔Parcela (cédula) | Bajo-medio (2 tablas + migración desde `PROPIETARIO`) | CCC |
| Modelo registral (matrícula/finca) | Bajo-medio (1 tabla + migración desde `FINCA`/`MATRICULA`) | CCC |
| Linaje parcelario persistente | Bajo (elevar `parcelLineage` de `localStorage` a tabla) | Expedientes (ya existe) |
| Motor de indicadores BI (`vepMetrics.js`) | Medio (el documento de fórmulas ya existe) | CCC + las 3 anteriores |
| Ambiental (restricciones automáticas) | Medio (hay catálogo VEP de capas ambientales; falta la tabla `restricciones_ambientales` y la regla de intersección) | CCC |
| POUT/zonificación | Medio (depende de qué traigan las capas de Drive, pendiente §2) | CCC |
| Data Warehouse / modelo estrella | Alto (tiene sentido recién con 4-5 tablas operacionales reales) | Todo lo anterior |
| Migración a PostgreSQL/PostGIS | Alto (proyecto de infraestructura aparte) | — |
| Gemelo digital / IA territorial | No evaluable hoy (sin superficie de código) | Todo lo anterior |

---

## 5. Apéndice — Dónde cae la "escalera de madurez" (Reporting → BI → GEOINT → DI → Gemelo Digital → IA Territorial) sobre el código real

Se recibió una segunda propuesta que encuadra el crecimiento de SNC_v3 en 7 niveles de madurez
analítica, cerrando en una "Plataforma Territorial Inteligente" (PTIT) con IA territorial y gemelo
digital. Es un marco conceptual razonable para ordenar una visión a 2030, pero **no es auditable
contra este repositorio**: no hay una sola línea de código de machine learning, visión por
computadora, simulación o motor de reglas de decisión en `package.json` ni en `js/`. Para no diluir
este informe en visión no verificable, se deja una sola observación operativa:

**los Niveles 1-3 (Reporting, BI, GEOINT) son exactamente los 5 pasos de §1 de este documento** — una
tabla de hechos sin CCC/personas/matrículas no soporta ni el Nivel 1. Los Niveles 4-7 (Decision
Intelligence, Territorial Intelligence, Gemelo Digital, IA Territorial) dependen en su totalidad de
que existan los Niveles 1-3 primero: un "índice de riesgo territorial 0-100" calculado por un escribano
al cargar una transferencia (el ejemplo de la propuesta) necesita, como mínimo, las tablas
`cuenta_catastral`, `matriculas`, `restricciones_ambientales` y `zonificacion` ya operando con datos
reales — ninguna existe hoy (§1). Por eso este informe no abre una fase separada para los Niveles 4-7:
serían prematuros antes de cerrar §1, y su diseño concreto (motor de reglas, qué modelo de IA, con qué
datos de entrenamiento) excede lo que un análisis estático de este código puede acotar hoy en hallazgos
verificables.

---

*Informe generado mediante análisis estático del esquema SQL efectivo y del código de los módulos
notarial/VEP/MAG, contrastado punto por punto contra las propuestas recibidas del usuario. No incluye
las capas de POUT compartidas por Drive (pendiente de autenticación del conector, ver §2).*
