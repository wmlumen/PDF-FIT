# Mejoras P3 Frontend SNC_v3

## Resumen de cambios

### 1) JSDoc mínimo en MapEngine
Se agregó documentación mínima en `js/mapEngine.js` para los puntos de entrada principales:
- `init`
- `loadGeoJSON`
- `toggleSNCReferenceLayer`
- `toggleDeptos`
- `toggleDistritos`
- `toggleMeasureMode`
- `toggleSplitMode`

Además se actualizó el encabezado del módulo para describir responsabilidades y la nota de compatibilidad `window.MapEngine`.

### 2) Centralización de estados globales
Se eliminó el uso disperso de variables en `window` para modos de mapa y se centralizaron en `State`:
- `window._measureMode` → `State.measureMode`
- `window._splitModeActive` → `State.splitModeActive`
- `window._measureCleanup` y `window._splitCleanup` quedaron referenciadas vía `State` para conservar el ciclo de vida del evento sin volver a `window`.

Archivos modificados:
- `js/state.js`: se incorporaron `measureMode` y `splitModeActive` al estado inicial; se agregó JSDoc básico a `get`, `set`, `subscribe`, `constructor`, `BackendMeta` y se eliminó duplicado `_persist()`.
- `js/mapEngine.js`: `toggleMeasureMode` y `toggleSplitMode` ahora leen/escriben `State`.

Verificación: ya no quedan coincidencias de `window._measureMode`, `window._splitModeActive`, `window._measureCleanup` ni `window._splitCleanup` en el proyecto.

### 3) Evaluación de `central.html`
`central.html` es una página estática completa de Wikipedia sin relación con el dominio SNC_v3. No hay imports, rutas ni referencias desde el código del proyecto.
- Decisión recomendada: removerlo del repositorio para evitar ruido, confusiones y aumento innecesario de tamaño.
- Si se requiere conservarlo por histórico, moverlo a `/archive/central.html` y excluirlo del flujo normal.

### 4) Deuda técnica frontend y recomendaciones de bundling

#### Deuda técnica relevante
- Compatibilidad legacy por `window.App`, `window.Workspace`, `window.MapEngine`, `window.Parser`, etc.
- HTML/JS poco modularizado en algunas páginas con dependencias a globals.
- Sin pipeline de bundling formal; uso de módulos ES modernos mezclado con script globals.
- `state.js` tenía `_persist()` duplicado (ya eliminado en esta tanda).
- Falta tipado formal y coverage de JSDoc más allá de MapEngine.

#### Recomendaciones de bundling
- Usar esbuild o Rollup con entrada en `js/app.js`, salida a `dist/app.[hash].js` y CSS.
- Trunk/globs: `js/*.js` excluyendo pruebas; bundle único o por feature.
- Si se usa Node para servir estáticos, servirlos desde `dist/` en `index.html`.
- Agregar `"type": "module"` en package y un script `"build"` + `"watch"`.
- Priorizar tree-shake de Leaflet solo si se migra a una build real; hoy Leaflet viene desde CDN.

## Archivos modificados
- `js/state.js`
- `js/mapEngine.js`

## Archivos evaluados para remover
- `central.html`
