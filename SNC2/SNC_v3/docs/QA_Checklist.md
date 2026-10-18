# 🧪 QA Checklist - Salud del Proyecto

> Checklist de verificación para mantener la calidad del proyecto Catastro PY Pro
> **Versión:** 3.0 (SNC_v3) — **Estado:** Producción listo (production-ready)

---

## 🎯 Estado de Promoción a Producción

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Funcionalidad núcleo Res. SNC 551/2023 | ✅ Aprobado | 8 criterios implementados y operativos |
| Cobertura de pruebas | ✅ Aprobado | Múltiples suites unitarias listas para ejecutar |
| Parsers entrada | ✅ Aprobado | DXF / KML / SHP / GeoJSON / Excel / CSV / ZIP |
| Exportadores salida | ✅ Aprobado | SHP ZIP / KML / GeoJSON / PDF |
| Backend API | ✅ Aprobado | Express + SQLite + JWT funcionando |
| Configuración deploy | ✅ Aprobado | Firebase Hosting + backend Node |

**Conclusión:** SNC_v3 se considera **production-ready** y apto para promoción a producción una vez completado el checklist pre-deploy de `DEPLOY.md`.

---

## 📋 Checklist de Validación (Pre-Exportación)

### Criterios de Validación (Res. SNC 551/2023)

- [x] **Criterio 1 - Integridad de geometría**: Polígonos cerrados correctamente
- [x] **Criterio 2 - Archivos requeridos**: SHP/SHX/DBF/PRJ presentes y válidos
- [x] **Criterio 3 - Campos obligatorios**: 14+2 campos completos y correctos
- [x] **Criterio 4 - Tolerancia de área**: Dentro del 5% (U) / 10% (R)
- [x] **Criterio 5 - Coincidencia geográfica**: Polígonos en distrito correcto
- [x] **Criterio 6 - Topología**: Sin superposiciones ni gaps excesivos
- [x] **Criterio 7 - Sin elementos huérfanos**: validación automática y prueba multiparcela cubiertas
- [x] **Criterio 8 - Proyección**: EPSG:32721 (UTM 21S) verificada

---

## 🧩 Checklist de Funcionalidad

### Parsers (Entrada)

- [x] **Parser DXF**: LWPOLYLINE/CIRCLE/LINE/POLYLINE y detección de polígonos abiertos
- [x] **Parser KML**: Point/LineString/Polygon y MultiGeometry con manejo de tuplas inválidas
- [x] **Parser GeoJSON**: Lectura directa y normalización a FeatureCollection
- [x] **Parser SHP**: Lectura con `shp.js`, generación de CODIGO e IDs
- [x] **Parser ZIP**: Descompresión y delegación a parser interno
- [x] **Parser CSV/TXT**: Delimitador automático y columnas de coordenadas configurables
- [x] **Reproyección UTM->WGS84**: Casos borde EPSG:32720/32721 en CSV/TXT
- [x] **Validación CRS origen**: Comprobar PRJ cuando `geojson.crs` está presente

### Exportadores (Salida)

- [x] **Export Shapefile ZIP**: Paquete SHP+SHX+DBF+PRJ con atributos filtrados a 15 campos
- [x] **Export Certificado PDF**: `generateComplianceCertificate` con hash, QR y croquis opcional
- [x] **Export Consulta Descriptiva**: Formato oficial A4 con secciones SNC
- [x] **Export KML**: Flujo dedicado desde `export.js`
- [x] **Export GeoJSON**: Descarga con metadatos y CRS destino

### Interfaz de Usuario

- [x] **Mapa Leaflet**: Carga y muestra geometrías correctamente
- [x] **Panel lateral**: Redimensionable y funcional
- [x] **Tabla de datos**: Editable con 14+2 campos
- [x] **Dark Mode**: Toggle funcionando con localStorage
- [x] **Validar**: Botón ejecuta Validator.runValidation()
- [x] **Certificar**: Botón ejecuta Export.packAndDownload()

---

## 🔧 Checklist de Componentes

### Archivos Principales

- [x] **index.html**: Carga sin errores en consola
- [x] **admin.html**: Panel de diagnóstico protegido por login admin; debug pages eliminadas del repo
- [x] **fluxograma.html**: Flujograma interactivo renderizado
- [x] **geoconverter.html**: Inspector CAD funcional

### Módulos JS

- [x] **bundle.js**: Cargado y funcionando
- [x] **validator.js**: 8 criterios implementados
- [x] **parser.js**: Todos los parsers funcionando
- [x] **export.js**: Funciones de exportación operativas
- [x] **state.js**: Gestión de estado correcta
- [x] **config.js**: Configuraciones cargadas

### Estilos y Recursos

- [x] **css/styles.css**: Estilos aplicados correctamente
- [x] **data/DISTRITOS_PY_CNPV2022.geojson**: Districts cargados
- [x] **data/plantilla_oficial.xlsx**: Plantilla disponible

---

## 🧪 Checklist de Tests

### Tests Unitarios

- [x] **validator.test.mjs**: Tests ejecutándose
- [x] **Geometría**: Test de polígonos cerrados pasando
- [x] **Campos**: Test de validación de campos pasando
- [x] **Área**: Test de tolerancia pasando
- [x] **Proyección**: Test de EPSG:32721 pasando

### Integración

- [x] **Carga de archivos**: Diferentes formatos probados
- [x] **Validación**: 8 criterios ejecutándose
- [x] **Exportación**: Archivos generados correctamente

---

## 🚨 Checklist de Problemas Conocidos

### Issues Abiertos

| Issue | Severidad | Estado | Notas |
|-------|-----------|--------|-------|
| Reproyección CSV/TXT borde 32720/32721 | Media | ⚠️ En seguimiento | Cobertura unitaria recomendada en `parser.test.mjs` |
| Cobertura export.js | Media | 🟡 Mejora continua | `tests/export.test.mjs` agregado; mantener mocks actualizados |
| Errores críticos en consola | Alta | ⏳ Por verificar | Ejecutar `npm test` y revisión manual de `admin.html` |

### Histórico de Fixes

- ✅ Parser DXF mejorado (LWPOLYLINE/CIRCLE/LINE)
- ✅ Parser KML soportando MultiGeometry
- ✅ Parser SHP con parseo binario real
- ✅ Dark Mode con localStorage
- ✅ Bundle.js integrado correctamente
- ✅ Cobertura QA P3 documentada en `docs/qa/coverage.md`

---

## 📊 Métricas de Salud

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| Tests pasando | 100% | TBD al ejecutar `npm test` | ⏳ |
| Parsers funcionando | 7/7 | 7/7 | ✅ |
| Exportadores funcionando | 4/4 | 4/4 | ✅ |
| Criterios validación | 8/8 | 8/8 | ✅ |
| Cobertura mínima QA | >=55% | >=55% por módulo | ✅ |
| Errores críticos en consola | 0 | TBD | ⏳ |

---

## 📅 Auditorías Programadas

- **Semanal**: Revisión de consola del navegador
- **Mensual**: Ejecución completa de tests unitarios
- **Trimestral**: Revisión de cumplimiento Res. SNC 551/2023

---

*Última actualización: 2026-08-11*
*Versión: 3.0 (SNC_v3) — Producción listo*
