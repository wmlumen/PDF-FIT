# 🧭 Supuestos CRS y Reproyección - Parser/Export

> Documento de trazabilidad para flujos de importación, validación y exportación en SNC_v3.
> Objetivo: eliminar ambigüedades sobre CRS origen y destino, y garantizar cumplimiento de la Res. SNC N° 551/2023.

---

## 1. Principios generales
- **Formato final exigido:** EPSG:32721 (WGS 84 / UTM Zona 21 Sur) para entrega oficial.
- **Formato de visualización admitido:** EPSG:4326 / WGS84 para preview en mapa.
- **Regla de pre-exportación:** `runExportValidation()` bloquea la exportación si la proyección detectada no es EPSG:32721.
- **Reproyección automática:** si la geometría llega en WGS84, `export.js` la reproyecta a UTM 21S antes de generar el shapefile.

## 2. Supuestos en `js/parser.js`
- **KML/GeoJSON:** se asume CRS WGS84 (`EPSG:4326`) cuando el archivo no declara CRS explícito.
- **SHP:** se respeta `geojson.crs.properties.name` si está presente; en ausencia se mantiene WGS84 como default y se documenta en logs.
- **DXF:** se marca como `PLANAR/LOCAL`; no se asume sistema geodésico.
- **CSV/TXT:** columnas numéricas con magnitud UTM (>180 o >90) se interpretan como coordenadas planas y se reproyectan a WGS84 según la zona declarada:
  - Zona 20S/EPSG:32720 -> `PROJ_32720`
  - Zona 21S/EPSG:32721 -> `PROJ_32721`
  - Zona ausente -> se fuerza zona 21S (sistema SNC Paraguay Oriental).
- **Trazabilidad:** errores de reproyección se registran en `parsingLogs` y se exponen en `getParsingLogs()`.

## 3. Supuestos en `js/export.js`
- `reprojectToUTM()` opera sobre coordenadas WGS84 (`[lng, lat]`) y produce UTM 21S (`[x, y]`) mediante `proj4('EPSG:32721').forward()`.
- El `.prj` generado usa el WKT oficial almacenado en `WKT_32721`; no se escribe código EPSG textual.
- En modo certificación, se registra la proyección final en el documento y se expone el mensaje de conformidad normativa.
- Si `proj4` no está disponible, `reprojectToUTM()` no falla: retorna el GeoJSON original y deja trazabilidad al llamador.

## 4. Supuestos en `js/validator.js`
- `validarProyeccion(mode='export')` exige EPSG:32721; en modo `'view'` tolera WGS84 con mensaje informativo.
- `validarZonasUTM()` valida que el bbox del GeoJSON esté dentro de límites nacionales usando `UTM_ZONE_RANGES` y reporta región (Chaco/Oriental/Transición).
- El área se calcula en coordenadas planas UTM 21S cuando están disponibles; si no, se usa cálculo geodésico como fallback.

## 5. Matriz de responsabilidad CRS

| Módulo | Entrada | Default | Reproyección | Salida |
|--------|---------|---------|--------------|--------|
| `parser.js` (KML/GeoJSON) | WGS84 declarado o ausente | EPSG:4326 | No | WGS84 en `State.geojson` |
| `parser.js` (SHP) | `geojson.crs` si existe | EPSG:4326 | No | tal cual SHP |
| `parser.js` (DXF) | Sin CRS | PLANAR/LOCAL | No | PLANAR/LOCAL |
| `parser.js` (CSV/TXT) | Zona declarada o ausente | EPSG:4326 o UTM | A WGS84 | WGS84 en `State.geojson` |
| `export.js` | `State.geojson` | WGS84 o UTM | A UTM 21S | Shapefile ZIP + PRJ UTM 21S |
| `validator.js` | `State.projection` | EPSG:4326 | No | Mensajes informativos |
| `validator.js` (export mode) | `runExportValidation()` | EPSG:4326 | No | Bloqueo si no es UTM 21S |

## 6. Trazabilidad y riesgos
- **Riesgo 1:** CSV/TXT con zona mal declarada pueden generar coordenadas erróneas.
  - Mitigación: rango 32720/32721 definido por regex; logs visibles en `getParsingLogs()`.
- **Riesgo 2:** DXF en coordenadas UTM sin declaración de zona.
  - Mitigación: documentar como PLANAR/LOCAL; exigir usuario ingrese sistema destino.
- **Riesgo 3:** Cambio de WKT en `WKT_32721` sin control de versiones.
  - Mitigación: cualquier cambio debe reflejarse en este documento y en `docs/qa/coverage.md`.

## 7. Cambios asociados
- `tests/export.test.mjs`: agrega verificación de exportación con `.prj` y sanitización de atributos.
- `docs/qa/coverage.md`: registra umbrales y supuestos.
- `docs/QA_Checklist.md`: alinea items abiertos a implementación actual.
