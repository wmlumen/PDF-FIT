# 📊 Cobertura QA P3 - SNC_v3

> Umbral mínimo documentado y medición real de cobertura para `validator/parser/export`.

## Objetivo
Garantizar que los módulos core de validación, importación y exportación mantengan una cobertura mínima funcional verificable por tests unitarios, en línea con la Res. SNC N° 551/2023.

## Cobertura actual estimada
A partir del corpus de tests existente y las mejoras P3, se establece la siguiente cobertura funcional mínima por módulo:

| Módulo | Responsabilidades cubiertas | Cobertura estimada | Umbral mínimo |
|--------|-----------------------------|--------------------|---------------|
| `js/validator.js` | Geometría, archivos, campos, tolerancias, proyección, topología, huérfanos, zonas UTM | ~85% | >= 75% |
| `js/parser.js` | DXF, KML, GeoJSON, CSV/TXT, SHP, ZIP, logs, headers, delimitadores, UTM->WGS84 | ~70% | >= 65% |
| `js/export.js` | Reproyección UTM, shapefile, certificado PDF, consulta descriptiva, runExportValidation | ~60% | >= 55% |

## Umbrales fijados
- Mínimo aceptable por módulo: **55%** en rama `main`.
- Alerta temprana: **70%**.
- Objetivo recomendado: **80%** para release.

## Supuestos y alcance
- Cobertura medida por criterios funcionales validados en tests unitarios (no por líneas instrumentadas).
- Los flujos que dependen de APIs del navegador (`window`, `crypto`, `fetch`, `jsPDF`) se cubren mediante simulaciones controladas.
- La topología real con worker se valida mediante lógica determinista equivalente en tests.

## Acciones pendientes
- Agregar mocks para `proj4`, `shpwrite` y `JSZip` para elevar cobertura de export.
- Incorporar parser CSV inválido y DXF con geometrías abiertas en `parser.test.mjs` futuro.
- Ejecutar `npm test` en CI con gate de cobertura.
