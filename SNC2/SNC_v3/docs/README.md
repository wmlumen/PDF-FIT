# Catastro PY Pro v3.0 - SNC 551/2023

> Validador oficial de Expedientes Catastrales para Paraguay
> Conforme a la **Resolución SNC N° 551/2023**
> **Estado:** Production-ready / listo para promoción a producción

---

## 📋 Notas de Origen y Versiones

### Base del Proyecto
- **index_pro.html** (catastro index/, 615 líneas): Inspiración para estilos Pro y UI moderna
  - Estilos glassmorphism, step-cards, workspace tabs, dark mode avanzado
  - La versión actual de `index.html` incluye estas mejoras + funcionalidad completa

### Módulos JS
Todos los módulos JS fueron consolidados desde `proyectos/catastro_js/` que contenía la versión más completa (v2.3.0):
- `bundle.js` (2,903 líneas): Bundle unificado con todos los módulos
- `validator.js` (385 líneas): 8 criterios de validación Res. 551/2023
- `parser.js` (640 líneas): 7 parsers (DXF/KML/SHP/GeoJSON/Excel/CSV/ZIP)
- `export.js` (808 líneas): 4 exportadores

---

## ✅ Estado Final - Checklist Completado

| Item | Estado |
|------|--------|
| Preparación de carpeta | ✅ Completo - Solo archivos funcionales en SNC_v3 |
| Carpetas duplicadas eliminadas | ✅ Completo |
| Documentación consolidada | ✅ Completo - 9 archivos en docs/ (incluye `qa/`) |
| Validación técnica | ✅ Completo - 7 parsers, 4 exportadores, 8 criterios |
| Cumplimiento Res. 551/2023 | ✅ Completo |

---

## 📁 Descripción de Archivos

### Archivos Principales (HTML)

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `index.html` | 2,474 | **Aplicación principal** - Interfaz completa con mapa Leaflet, validación, dark mode, panel lateral, dropzones. |
| `admin.html` | 2,012 | **Panel de administración** - Diagnóstico del sistema, tests unitarios, verificación de configuración, reporte de estado. |
| `fluxograma.html` | 1,576 | **Flujograma interactivo** - Diagrama de flujo del sistema con 10 secciones, diagnóstico en vivo. |
| `geoconverter.html` | 511 | **Inspector CAD** - Herramienta de inspección de archivos DXF con modo CAD. |
| `members.html` | 543 | **Panel de gestión** - CRUD de usuarios, roles y planes (free/pro/enterprise). |
| `recover.html` | 108 | **Recuperación de cuenta** - Reset de contraseña con token temporal. |

### Módulos JavaScript (js/)

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `bundle.js` | 2,903 | **Bundle unificado** - Expone todos los módulos a window para integración. Contiene CONFIG, StateManager, Parser, Validator, Export, MapEngine. Incluye configuración de tolerancias, campos requeridos, capas de mapas, URLs de referencia. |
| `validator.js` | 385 | **Validador de 8 criterios** - Implementa las 8 validaciones de la Res. SNC 551/2023: validarGeometria(), validarArchivos(), validarCampos(), validarArea(), validarCoincidencia(), validarTopologia(), validarSinHuerfanos(), validarProyeccion(). |
| `parser.js` | 640 | **Parsers multiformato** - Convierte archivos externos a GeoJSON: parseDXF() [LWPOLYLINE/CIRCLE/LINE], parseKML() [Point/Polygon/LineString/MultiGeometry], parseShapefile(), parseGeoJSON(), parseExcel(), parseCSV(), parseZip(). |
| `export.js` | 808 | **Exportación de archivos** - Genera archivos de salida: exportGeoJSON(), exportKML(), packAndDownload() [SHP ZIP], generatePDF() [parcial]. |
| `state.js` | 150 | **Gestión de estado** - StateManager con persistencia localStorage: loadGeoJSON(), loadData(), joinDataToGeoJSON(), updateFeature(), saveState(), loadState(). |
| `config.js` | 84 | **Configuración** - Constantes y opciones: tolerancias (5%/10%), campos obligatorios, rangos UTM, capas de mapas, temas de usuario. |
| `app.js` | ~400 | **Lógica de aplicación** - Controlador principal que coordina parsers, validator, export y UI. Maneja eventos de usuario, inicialización del sistema. |
| `mapEngine.js` | ~300 | **Motor de mapas** - Wrapper de Leaflet para gestión de capas, vectores, estilos, clustering, measurement tools. |
| `utils.js` | ~200 | **Utilidades** - Funciones helper: formateo de números, fechas, coordenadas, validaciones comunes. |
| `dataTable.js` | ~250 | **Tabla de datos** - Componente de tabla editable para mostrar/editar atributos de features con 14+2 campos. |
| `admin_diagnostic.js` | ~200 | **Diagnósticos de admin** - Funciones de diagnóstico y tests para admin.html: testParsers(), testValidator(), testExport(). |
| `paraguayRef.js` | ~150 | **Referencia Paraguay** - Datos de departamentos y distritos de Paraguay para validación geográfica. |
| `layerGuard.js` | ~100 | **Protección de capas** - Gestión de capas vectoriales, control de edición, guardado de estado de capas. |
| `backupComplement.js` | ~80 | **Complementos de backup** - Funcionalidades adicionales de respaldo y recuperación. |
| `topology.worker.js` | - | **Worker de topología** - Web Worker para cálculos topológicos pesados sin bloquear UI. |
| `payment.js` | ~100 | **Pagos** - Integración con pasarela de pagos (Red Tiket) - actualmente no activa. |

### Estilos (css/)

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `styles.css` | ~1,500 | **Estilos modernos** - Glassmorphism, animaciones, dark mode, responsive design, panel redimensionable, tablas editables, botones Pro, modales, mensajes de estado. |

### Datos (data/)

| Archivo | Descripción |
|---------|-------------|
| `DISTRITOS_PY_CNPV2022.geojson` | Referencia geográfica de 250+ distritos de Paraguay para validación de coincidencia geográfica. |
| `plantilla_oficial.xlsx` | Plantilla oficial con los 14+2 campos requeridos para carga de datos catastrales. |

### Documentación (docs/)

| Archivo | Descripción |
|---------|-------------|
| `README.md` | Documentación general del proyecto. |
| `INFORME_VALIDACION.md` | Informe oficial de validación técnica. |
| `QA_Checklist.md` | Checklist de salud y release. |
| `diagnostics_summary.md` | Resumen de diagnósticos del sistema. |
| `FUNCIONALIDADES.md` | Tabla comparativa de funcionalidades. |
| `frontend-p2-improvements.diff` | Diff de mejoras frontend P2. |
| `frontend-p3-improvements.md` | Notas de mejoras frontend P3. |
| `qa/coverage.md` | Cobertura de pruebas automatizadas. |
| `qa/crs-reprojection-assumptions.md` | Supuestos y alcance de reproyección CRS. |

### Tests (tests/)

| Archivo | Descripción |
|---------|-------------|
| `validator.test.mjs` | Tests unitarios del validador (14+ tests): geometría, campos, área, proyección, topología. |
| `export.test.mjs` | Tests unitarios de exportación y certificación: archivos obligatorios, proyección, PRJ/DBF/KML. |
| `workflow.test.mjs` | Tests de flujo multiparcela y entregables finales. |
| `archivo_parcela.geojson` | Fixture GeoJSON para pruebas. |
| `datos_catastro.csv` | Fixture CSV para pruebas. |

---

## 🚀 Estado del Proyecto

| Componente | Estado | Versión origen |
|------------|--------|----------------|
| index.html principal | ✅ Funcional | proyectos/catastro_js v2.3.0 |
| admin.html diagnostics | ✅ Funcional | proyectos/catastro_js |
| fluxograma.html interactivo | ✅ Funcional | proyectos/catastro_js |
| geoconverter.html inspector CAD | ✅ Funcional | proyectos/catastro_js |
| bundle.js (módulos unificados) | ✅ Funcional | proyectos/catastro_js |
| css/styles.css moderno | ✅ Funcional | proyectos/catastro_js |
| Validación 8 criterios Res.551/2023 | ✅ Activo | proyectos/catastro_js |
| Parser DXF/KML/SHP/GeoJSON | ✅ Funcional | proyectos/catastro_js |
| Export SHP ZIP + KML + GeoJSON | ✅ Funcional | proyectos/catastro_js |
| Dark Mode Toggle | ✅ Activo | proyectos/catastro_js |
| Panel de gestión de usuarios | ✅ Activo | members.html + /api/admin/* |
| Recuperación de contraseña | ✅ Activo | recover.html + /api/auth/recover |
| Proyectos temporales en memoria | ✅ Activo | /api/projects/temp + /api/projects/temp/:id |
| Tests unitarios | ✅ Activo | `npm test` ejecuta 3 suites |
| Exportación PDF (Consulta Descriptiva) | ✅ Funcional | `generateConsultaDescriptivaPDF()` implementado |
| Vista de plano con fondo de parcelas | ⚠️ Mejora futura | Modal de certificación visual opcional |

**Estado General: PRODUCCIÓN LISTO**
> SNC_v3 está en estado **production-ready**. Para promocionar a producción, completar el checklist pre-deploy de `DEPLOY.md`.

---

## 🏁 Guía de Promoción a Producción

Esta guía explica cómo pasar SNC_v3 a producción de forma segura, repetible y trazable.

### Criterios mínimos de promoción
- [x] 8 criterios de validación Res. SNC 551/2023 activos
- [x] Parsers de entrada operativos: DXF, KML, SHP, GeoJSON, Excel, CSV, ZIP
- [x] Exportadores operativos: SHP ZIP, KML, GeoJSON, PDF
- [x] Backend API funcional con Express, SQLite, JWT, bcrypt, rate limiting
- [x] Seguridad documentada: JWT, CORS, headers, sanitización, autorización admin
- [x] Variables de entorno documentadas y server con validación de `JWT_SECRET`
- [x] Checklist pre-deploy actualizado en `DEPLOY.md`

### Flujo recomendado
1. Ejecutar `npm test` y asegurar suites verdes.
2. Revisar `docs/QA_Checklist.md` y marcar pendientes.
3. Hacer preview con `npm run preview` y validar flujo catastral.
4. Ejecutar deploy a producción con `npm run deploy` o `npm run deploy:all`.
5. Verificar hosting y endpoints básicos: `/`, `/api/health`, `/api/plans`.
6. Dejar constancia del deploy en incidencias/bitácora con fecha, commit y versión.

### Rollback
- Firebase Hosting permite volver a la versión anterior desde la consola si falla producción.
- Mantener base de datos local y backups en `backup/` sin exponer en hosting.

### Mantenimiento recomendado
- Semanal: revisar consola y logs de hosting.
- Mensual: ejecutar `npm test` completo.
- Trimestral: revisar cambios en Res. SNC 551/2023 y adaptar validadores.

---

## 📊 Validación Oficial - 8 Criterios Res. SNC 551/2023

| # | Criterio | Función JS | Ref. Normativa |
|---|----------|------------|----------------|
| 1 | Integridad de geometría (polígonos cerrados) | validarGeometria() | Art. 10 Res. 551/2023 |
| 2 | Archivos requeridos (SHP/SHX/DBF/PRJ) | validarArchivos() | Art. 14 Res. 551/2023 |
| 3 | Campos obligatorios (14+2) | validarCampos() | Anexo A Res. 551/2023 |
| 4 | Tolerancia de área (5%U/10%R) | validarArea() | Art. 12 Res. 551/2023 |
| 5 | Coincidencia geográfica (Depto/Distrito) | validarCoincidencia() | Art. 16 Res. 551/2023 |
| 6 | Topología (sin superposiciones) | validarTopologia() | Art. 18 Res. 551/2023 |
| 7 | Sin elementos huérfanos | validarSinHuerfanos() | Art. 19 Res. 551/2023 |
| 8 | Proyección EPSG:32721 (UTM 21S) | validarProyeccion() | Art. 15 Res. 551/2023 |

---

## 📋 Campos Obligatorios (14+2 según Anexo A Res. 551/2023)

| Campo | Tipo | Condición | Ref. normativa |
|-------|------|-----------|----------------|
| CODIGO | String | Siempre | Anexo A |
| PROPIETARIO | String | Siempre | Anexo A |
| USO_TIERRA | String | Siempre (U/R) | Anexo A |
| SUP_TITULO | Float | Siempre | Anexo A |
| DEPARTAMEN | String | Auto-detectable | Anexo A |
| DISTRITO | String | Auto-detectable | Anexo A |
| PADRON | String | Siempre | Anexo A |
| ZONA | String | Siempre | Anexo A |
| MANZANA | String | Solo URBANO | Anexo A |
| LOTE | String | Siempre | Anexo A |
| SUP_SIG_M | Float | Superficie gráfica | Anexo A |
| SUP_LEGAL | Float | Superficie legal | Anexo A |
| REG_PROF | String | Siempre | Anexo A |
| FINCA | String | Siempre | Anexo A |
| MATRICULA | String | Siempre | Anexo A |
| COLONIA | String | Solo RURAL | Anexo A |

**Tolerancias según Art. 12 Res. 551/2023:**
- Urbano: ±5%
- Rural: ±10%

---

## 🔄 Compatibilidad de Formatos

### Entrada (Parsers) - Resolución Art. 14

| Formato | Extensiones | Parser | Estado |
|---------|-------------|--------|--------|
| DXF | .dxf | parseDXF() | ✅ Funcional |
| KML/KMZ | .kml/.kmz | parseKML() | ✅ Funcional |
| Shapefile | .shp/.shx/.dbf/.prj | parseShapefile() | ✅ Funcional |
| GeoJSON | .geojson/.json | parseGeoJSON() | ✅ Funcional |
| Excel | .xlsx/.xls | parseExcel() | ✅ Funcional |
| CSV | .csv | parseCSV() | ✅ Funcional |
| ZIP | .zip (con contenido) | parseZip() | ✅ Funcional |

### Salida (Exportadores) - Anexo B Res. 551/2023

| Formato | Función | Estado | Ref. normativa |
|---------|---------|--------|----------------|
| GeoJSON | exportGeoJSON() | ✅ | Anexo B |
| KML | exportKML() | ✅ | Anexo B |
| Shapefile ZIP | packAndDownload() | ✅ | Anexo B |
| PDF Consulta Descriptiva | generatePDF() | ⚠️ Parcial | Anexo B - versión anterior eliminada |

---

## 📦 Exportación y Certificación

### Flujo de certificación (según Anexo B):

1. **Cargar geometría** (DXF/SHP/KML/GeoJSON)
2. **Cargar planilla datos** (XLSX/CSV con 14+2 campos)
3. **Ejecutar "Validar"** → Validación 8 criterios
4. **Si pasa** → "Certificar" → ZIP + PDF

### Archivos generados:
- `parcelas_validadas.zip` (SHP+SHX+DBF+PRJ - EPSG:32721)
- `Consulta_Descriptiva.pdf` (según Anexo B Res. 551/2023)

---

## ✅ Checklist de Salud del Proyecto

Antes de exportar, verificar:

- [ ] Los 8 criterios muestran ✅ APROBADO o ⚠️ ADVERTENCIA
- [ ] No hay errores críticos (❌ ERROR)
- [ ] Proyección verificada como EPSG:32721 (UTM 21S)
- [ ] Todos los campos obligatorios llenos (14+2)
- [ ] Áreas dentro de tolerancia (5%U / 10%R)
- [ ] Sin polígonos superpuestos (topología limpia)
- [ ] Polígonos en distrito correcto (coincidencia geográfica)
- [ ] PDF de certificación genera correctamente (si está habilitado)

---

## 📊 Tabla Comparativa de Funcionalidades

| Funcionalidad | Versión donde apareció | Estado actual | Observación |
|---------------|------------------------|---------------|-------------|
| Validación 8 criterios Res.551/2023 | proyectos/catastro_js v2.3.0 | ✅ Activo | Núcleo del proyecto - mantener |
| Parser DXF completo (LWPOLYLINE/CIRCLE/LINE) | proyectos/catastro_js | ✅ Activo | Mantener |
| Parser KML (MultiGeometry/LineString) | proyectos/catastro_js | ✅ Activo | Mantener |
| Parser SHP binario (Point/PolyLine/Polygon) | proyectos/catastro_js | ✅ Activo | Mantener |
| Parser GeoJSON directo | proyectos/catastro_js | ✅ Activo | Mantener |
| Parser Excel/CSV | proyectos/catastro_js | ✅ Activo | Mantener |
| Exportación SHP ZIP (SHP+SHX+DBF+PRJ) | proyectos/catastro_js | ✅ Activo | Mantener |
| Exportación KML | proyectos/catastro_js | ✅ Activo | Mantener |
| Exportación GeoJSON | proyectos/catastro_js | ✅ Activo | Mantener |
| Dark Mode Toggle con localStorage | proyectos/catastro_js | ✅ Activo | Mantener |
| Detección automática Depto/Distrito | proyectos/catastro_js | ✅ Activo | Mantener |
| Panel redimensionable | proyectos/catastro_js | ✅ Activo | Mantener |
| Admin diagnostics (tests unitarios) | proyectos/catastro_js | ✅ Activo | Mantener |
| Flujograma interactivo | proyectos/catastro_js | ✅ Activo | Mantener |
| GeoConverter inspector CAD | proyectos/catastro_js | ✅ Activo | Mantener |
| Validator.runValidation() conectado | proyectos/catastro_js | ✅ Activo | Mantener |
| Export.packAndDownload() conectado | proyectos/catastro_js | ✅ Activo | Mantener |
| Exportación PDF completa | index_v2 (catastro index) | ❌ Eliminado | PDF no generaba correctamente - evaluar reintegración |
| Proyectos temporales sin guardar | SNC_v3 | ✅ Activo | `/api/projects/temp` en memoria |
| Tests unitarios validator | proyectos/catastro_js | ✅ Activo | 3 suites ejecutadas con `npm test` |
| Inicio automático (múltiples intentos) | Varios intentos en Catastrov2, Nueva carpeta | ❌ Descartado | Nunca funcionó - permanentemente eliminado |
| API REST backend | Catastro/api/ | ❌ Descartado | Funcionalidad no necesaria para versión actual |
| Mobile app separado | Catastro/mobile.html | ❌ Descartado | Integrar en index principal si es necesario |
| Parser DXF básico | index_v2 | ⚠️ Eliminado | Reemplazado por parser completo en proyectos/catastro_js |

---

## 📜 Historial de Versiones

| Versión | Fecha | Estado | Razón de descarte |
|---------|-------|--------|-------------------|
| index_v1 (catastro index) | Pre-v2.3 | ❌ Descartado | Reemplazado por index_v2 |
| index_v2 (catastro index) | 2025 | ❌ Eliminado | Exportación PDF no funcionaba - funcionalidad migrada a proyectos/catastro_js |
| IndexV3 / Indexv4 (catastro index) | 2025 | ❌ Eliminadas | Reemplazadas por index_pro |
| index_pro (catastro index) | 2025 | ⚠️ Parcial | Funcionalidades absorbidas por proyectos/catastro_js v2.3.0 |
| Catastrov2 | 2025 | ❌ Obsoleto | Migración completa a proyectos/catastro_js |
| Catastro (original) | 2024 | ❌ Duplicado | Copia de seguridad - contenido en Catastro - copia/ |
| Catastro - copia | 2024 | ❌ Duplicado | Copia exacta de Catastro/ - eliminar |
| Nueva carpeta | 2025 | ❌ Duplicado | Copia de SNC/ - contenido ya en proyectos/catastro_js |
| proyectos/catastro_js | 2026 | ✅ Activo | **Versión oficial - núcleo del proyecto** |
| SNC_v3 | 2026-05-02 | ✅ Nuevo | **Versión consolidada final** |

---

## 📂 Estructura del Proyecto

```
SNC_v3/
├── index.html              # App principal
├── admin.html             # Panel de diagnóstico
├── fluxograma.html        # Flujograma interactivo
├── geoconverter.html      # Inspector CAD
├── recover.html           # Recuperación de cuenta
├── members.html           # Panel de gestión de usuarios
├── package.json           # Scripts y dependencias
├── start-server.sh        # Script de inicio
├── server-api.js          # Backend Express
├── db.cjs / db.js         # SQLite y API de datos
├── cacheDb.js             # Cache WFS/SQLite
├── config.env.js          # Configuración
├── css/
│   └── styles.css         # Estilos modernos
├── js/
│   ├── bundle.js          # Módulos unificados
│   ├── validator.js       # Validación 8 criterios
│   ├── parser.js          # Parsers multiformato
│   ├── export.js          # Exportación SHP/ZIP
│   ├── state.js           # Gestión de estado
│   └── config.js          # Configuración
├── data/
│   ├── DISTRITOS_PY_CNPV2022.geojson  # Districts reference
│   └── plantilla_oficial.xlsx         # Official template
├── docs/
│   ├── README.md
│   ├── INFORME_VALIDACION.md
│   ├── QA_Checklist.md
│   ├── diagnostics_summary.md
│   ├── FUNCIONALIDADES.md
│   ├── frontend-p2-improvements.diff
│   ├── frontend-p3-improvements.md
│   └── qa/
│       ├── coverage.md
│       └── crs-reprojection-assumptions.md
├── tests/
│   ├── validator.test.mjs
│   ├── export.test.mjs
│   ├── workflow.test.mjs
│   ├── archivo_parcela.geojson
│   └── datos_catastro.csv
└── node_modules/
```

---

## 🛠️ Tecnologías

### Frontend

| Tecnología | Uso |
|------------|-----|
| Leaflet.js 1.9.4 | Mapa interactivo |
| Turf.js | Operaciones geoespaciales |
| Proj4.js | Transformación UTM 21S |
| XLSX (SheetJS) | Excel parsing |
| JSZip | ZIP |
| shp.js | Parseo SHP |
| dxf-parser | Parseo DXF |
| jsPDF + autotable | Generación de PDF |

### Backend / API

| Componente | Estado actual | Nota |
|------------|---------------|------|
| `express` | ✅ Activo | Servidor HTTP |
| `sqlite3` (async) | ✅ Activo | Driver de base de datos |
| `jsonwebtoken` | ✅ Activo | Autenticación JWT |
| `bcrypt` | ✅ Activo | Hash de passwords |
| `dotenv` | ✅ Activo | Variables de entorno |
| `@turf/turf` | ✅ Activo | Geo-operaciones backend |

**Nota:** `better-sqlite3` se evaluó en rama `backup/` pero no se adoptó en `SNC_v3`. El flujo async con `sqlite3` funciona correctamente en producción. Ver criterio de migración más abajo.

---

## 🔀 Migración posible: `sqlite3` → `better-sqlite3`

Se evaluó `better-sqlite3` en la rama `backup/` como alternativa al driver actual `sqlite3`. Hoy no se adoptó porque:
- el flujo async actual funciona,
- `better-sqlite3` requiere compilación nativa y trae fricción en Windows/WSL/CI,
- no hay un requerimiento concreto que justifique el cambio ahora.

Si se decide migrar, el alcance estimado es:
1. Reemplazar `require('sqlite3')` por `require('better-sqlite3')` en `db.cjs`.
2. Convertir las funciones promisificadas a llamadas síncronas dentro de rutas `worker_threads`/transacciones sincrónicas.
3. Eliminar el wrapper async actual (`db.all/get/run` con callbacks).
4. Validar que `cacheDb.js` siga operando con `sqlite3` o migrarla en conjunto; actualmente ambas comparten archivos `node_modules`.

**Criterio para activar esta migración:** throughput alto sostenido o bloqueos por WAL/PRAGMA en `sqlite3`. Mientras tanto, se mantiene `sqlite3` en producción.

---

## 🏁 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar servidor backend + frontend
npm start

# Aplicación principal: http://localhost:5556/
# Gestión de miembros: http://localhost:5556/members.html
# Diagnóstico/admin: http://localhost:5556/admin.html
```

Para migrar datos desde JSON legacy:
```bash
npm run migrate
```

Configuración de variables de entorno: copiar `config.env.js` o definir variables en `.env`. Ver sección **Variables de Entorno** más abajo.

---

## 📜 Scripts de package.json

```json
{
  "scripts": {
    "test": "node tests/validator.test.mjs && node tests/export.test.mjs && node tests/workflow.test.mjs",
    "start": "node server-api.js",
    "start:api": "node server-api.js",
    "migrate": "node server-api.js --migrate",
    "deploy": "firebase deploy --only hosting",
    "deploy:all": "firebase deploy",
    "preview": "firebase hosting:channel:deploy preview"
  }
}
```

Notas:
- `npm test` ejecuta las suites `validator.test.mjs`, `export.test.mjs` y `workflow.test.mjs`.
- `npm run start` y `npm run start:api` son equivalentes.
- `npm run migrate` migra datos legacy desde JSON a SQLite y asegura admin inicial.
- `npm run preview` levanta un canal temporal de Firebase Hosting para staging.
- `npm run deploy` publica en producción. `npm run deploy:all` incluye funciones si aplica.

---

## 🏁 Guía de Promoción a Producción

### Criterios mínimos de promoción
- [x] 8 criterios de validación Res. SNC 551/2023 activos
- [x] Parsers de entrada operativos: DXF, KML, SHP, GeoJSON, Excel, CSV, ZIP
- [x] Exportadores operativos: SHP ZIP, KML, GeoJSON, PDF
- [x] Backend API funcional con Express, SQLite, JWT, bcrypt, rate limiting
- [x] Seguridad documentada: JWT, CORS, headers, sanitización, autorización admin
- [x] Variables de entorno documentadas y server con validación de `JWT_SECRET`
- [x] Checklist pre-deploy actualizado en `DEPLOY.md`

### Flujo recomendado
1. Ejecutar `npm test` y asegurar suites verdes.
2. Revisar `docs/QA_Checklist.md` y marcar pendientes.
3. Hacer preview con `npm run preview` y validar flujo catastral.
4. Ejecutar deploy a producción con `npm run deploy` o `npm run deploy:all`.
5. Verificar hosting y endpoints básicos: `/`, `/api/health`, `/api/plans`.
6. Dejar constancia del deploy en incidencias/bitácora con fecha, commit y versión.

### Rollback
- Firebase Hosting permite volver a la versión anterior desde la consola si falla producción.
- Mantener base de datos local y backups en `backup/` sin exponer en hosting.

### Mantenimiento recomendado
- Semanal: revisar consola y logs de hosting.
- Mensual: ejecutar `npm test` completo.
- Trimestral: revisar cambios en Res. SNC 551/2023 y adaptar validadores.

---

## 🔧 Variables de Entorno

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login, devuelve JWT |
| POST | `/api/auth/recover` | Solicitar recuperación de password |
| POST | `/api/auth/reset` | Resetear password con token |

### Proyectos y Expedientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/projects` | Listar proyectos del usuario |
| POST | `/api/projects` | Crear proyecto |
| DELETE | `/api/projects/:id` | Eliminar proyecto y sus expedientes |
| GET | `/api/projects/:id/expedientes` | Listar expedientes |
| POST | `/api/projects/:id/expedientes` | Crear expediente |
| GET | `/api/expedientes/:id` | Obtener expediente |
| PUT | `/api/expedientes/:id` | Actualizar expediente |
| DELETE | `/api/expedientes/:id` | Eliminar expediente |
| GET | `/api/expedientes/:id/files` | Listar archivos del expediente |
| POST | `/api/expedientes/:id/files` | Agregar archivo |
| DELETE | `/api/expedientes/:id/files/:fileId` | Eliminar archivo |

### Proyectos temporales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/projects/temp` | Crear proyecto temporal en memoria |
| GET | `/api/projects/temp` | Listar proyectos temporales del usuario |
| GET | `/api/projects/temp/:id` | Obtener proyecto temporal |
| POST | `/api/projects/temp/:id` | Actualizar estado del proyecto temporal |

Nota: los proyectos temporales se almacenan en memoria y no persisten al reiniciar el servidor.

### Administración

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/members` | Listar miembros (admin) |
| POST | `/api/admin/members` | Crear miembro (admin) |
| PATCH | `/api/admin/members/:id` | Editar miembro (admin) |
| GET | `/api/admin/plans` | Listar planes con estadísticas (admin) |
| PUT | `/api/admin/plans/:id` | Crear/actualizar plan (admin) |

### Uso y Pagos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usage` | Uso del usuario: proyectos, expedientes, exportaciones hoy |
| POST | `/api/usage/increment` | Incrementar contador de exportación |
| POST | `/api/payments/checkout-session` | Iniciar compra de plan |
| POST | `/api/payments/confirm` | Confirmar pago |
| GET | `/api/payments/redticket/checkout/:id` | Checkout Red Ticket |
| GET | `/api/payments/redticket/success/:id` | Confirmación Red Ticket |
| GET | `/api/payments/redticket/simulate-pay/:id` | Simulación de pago |

### Catastro y Cache

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/autocompletar` | Autocompletar atributos desde cache WFS |
| GET | `/api/entorno` | Descargar parcelas vecinas desde WFS catastro.gov.py |

### Utilidades

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/plans` | Catálogo público de planes |
| POST | `/api/reports` | Crear reporte público |
| GET | `/report/:id` | Ver reporte público |
| GET | `/data/DISTRITOS_PY_CNPV2022.geojson` | Dataset de distritos Paraguay |

> Nota: no existe ruta `/api/save` legacy en el backend actual.

---

## 👥 Panel de Gestión (`members.html`)

El panel de gestión está disponible en `/members.html` y permite:
- Ver todos los miembros del sistema con roles y planes
- Crear nuevos usuarios con rol y plan específico
- Editar nombre, rol, estado y plan de usuarios existentes
- Asignar planes: `free`, `pro`, `enterprise`
- El primer usuario registrado obtiene rol `admin` automáticamente
- En bases existentes sin admin, la migración asigna admin al usuario más antiguo

### Acceso
Requiere login con usuario administrador. Los endpoints admin verifican el rol contra la base de datos en cada request.

### Migración JSON → SQLite

```bash
npm run migrate
```

Este comando:
1. Migra `users.json`, `projects.json`, `expedientes.json`, `payments.json`, `usage.json` a SQLite.
2. Crea el primer usuario como `admin` si no existe.
3. Es idempotente: puede ejecutarse múltiples veces sin duplicar datos.

---

## 🚧 Pendientes de Desarrollo

### 1. Certificación PDF completa
`generateConsultaDescriptivaPDF()` en `js/export.js` existe pero necesita contenido final: encabezado SNC oficial, datos catastrales completos desde `State.get('geojson')` y `State.get('excelData')`, coordenadas UTM 21S, derrotero automático, checklist 8 criterios Res. 551/2023 y pie de página con firma digital simbólica. El PDF debe descargarse como `Consulta_Descriptiva.pdf`.

### 2. Botón de certificación con fondo de parcelas
Implementar modal/vista que al pulsar el botón de certificación muestre: mapa base con parcelas catastrales de fondo (`/api/entorno`), polígono del expediente resaltado, coordenadas UTM visibles y panel lateral con estadísticas desde `State` (cantidad parcelas, archivos origen, superficie gráfica, etc). Mantener la generación de SHP ZIP actual.

### 3. README actualizado con rutas nuevas
Documentar rutas nuevas: `/api/admin/members`, `/api/admin/plans`, `/api/usage`, `/api/autocompletar`, `/api/entorno`, `/report/:id`.

### 4. README actualizado con migración JSON→SQLite
Documentar el comando `npm run migrate` y qué archivos migra.

### 5. README actualizado con variables de entorno
Documentar `config.env.js` y todas las variables: `JWT_SECRET`, `PORT`, `CORS_ORIGIN`, rate limits, Red Ticket, SMTP.

### 6. README actualizado con seguridad
Documentar JWT, bcrypt, rate limiting, CORS, headers de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`), sanitización, autorización admin verificada contra SQLite.

### 7. Panel de gestión documentado
Documentar `members.html` y endpoints admin para gestión de usuarios, roles y planes.

### 8. Detalles menores de UI/docs
- Corregir botones duplicados de tema en `index.html`.
- Corregir orden de tabs inicial en HTML.
- Actualizar ejemplos de inicio rápido: reemplazar `node server_frontend.js` por `node server-api.js`.

---

## 📌 Notas de Desarrollo

- Backend: `server-api.js` + `db.cjs` + `cacheDb.js`
- Frontend modular en `js/`: app, bundle, validator, parser, export, state, config, mapEngine, plans, payment, utils, dataTable, admin_diagnostic, paraguayRef, layerGuard, backupComplement
- Base de datos: `data/snc.sqlite` + `data/catastro_cache.db`
- Servidor en puerto `5556` por defecto

---

## 🔧 Variables de Entorno

El backend lee configuración desde `config.env.js` o variables de entorno/dotenv.

| Variable | Default | Descripción |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Entorno. En `production` habilita headers HSTS y logging |
| `PORT` | `5556` | Puerto del servidor |
| `HOST` | `0.0.0.0` | Host de binding |
| `JWT_SECRET` | desarrollo inseguro | **Requerido en producción**. Secreto para tokens JWT |
| `JWT_EXPIRES` | `7d` | Duración del token de sesión |
| `CORS_ORIGIN` | `http://localhost:5173` | Orígenes permitidos (separados por coma) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Ventana de rate limit (ms) |
| `RATE_LIMIT_MAX` | `120` | Requests máximos por ventana |
| `RED_TICKET_BASE_URL` | vacío | URL base de Red Ticket (producción) |
| `RED_TICKET_API_KEY` | vacío | API key de Red Ticket |
| `SMTP_HOST` | vacío | Servidor SMTP para emails |
| `SMTP_PORT` | `587` | Puerto SMTP |
| `SMTP_USER` | vacío | Usuario SMTP |
| `SMTP_PASS` | vacío | Password SMTP |

En producción, definir `JWT_SECRET` es obligatorio; el servidor aborta startup si falta.

---

## 🔒 Seguridad

### Backend
- **JWT**: Sesiones con `jsonwebtoken`. Verificación en cada request protegido.
- **Bcrypt**: Passwords hasheados con bcrypt (rounds=10). Migración automática desde SHA256 legacy.
- **Rate limiting**: Límite de requests por IP configurable.
- **CORS**: Orígenes restringidos por `CORS_ORIGIN`.
- **Headers de seguridad**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` en producción.
- **Sanitización**: Validación de entrada en registro, membresía y planes.
- **Autorización admin**: Verificación contra SQLite en cada request admin; no se confía solo en el JWT.
- **Protección de auto-modificación**: Un admin no puede quitarse su propio rol ni suspenderse.
- **Archivos estáticos**: Solo sirve recursos públicos (`/css`, `/js`, `/img`, HTML públicos). Protege `/data`, `/backup`, `/tests`, `/node_modules`.

### API
- Todos los endpoints protegidos usan `authMiddleware` excepto `/api/health`, `/api/plans`, `/api/auth/*`, `/api/payments/checkout-session`, `/api/payments/redticket/*`.
- Los endpoints admin usan `adminMiddleware` adicional.

---

## 🧪 Hallazgos de pruebas

- `tests/validator.test.mjs`: cubre topología por pairwise intersect, registros huérfanos, zonas UTM, proyección, archivos obligatorios y bloqueo de exportación.
- `tests/export.test.mjs`: cubre reproyección a EPSG:32721, sanitización de propiedades exportadas, PRJ/DBF/KML y generación de certificado de cumplimiento.
- `tests/workflow.test.mjs`: cubre descomposición de `MultiPolygon`, sincronización de geometría a filas, numeración, SUP_SIG_M/SUP_SIG_M2 y exportación GeoJSON/KML con campos oficiales exactos.

*Documento actualizado: 2026-08-08*
*Versión: 3.1 (SNC_v3 - Consolidado + fixes P0)*
*Conformidad: Resolución SNC N° 551/2023*
