# Coordinación SNC_v3

## Terreno de Juego
- Rama IA-1 (CSS/HTML): ai-css-html
- Rama IA-2 (JS/API): ai-js-api
- Nueva Rama IA-3 (Modulo1 Geo/YGeo): ai-modulo1-ygeo

## IA-1 (CSS/HTML) — Rama: ai-css-html
- [x] css/styles.css — #view-map, #map, .fixed, layout
      ✓ Añadida clase `.footer` reutilizable (aleja estilos inline del Topografo); `#view-map`/`#map` mantienen `flex:1, min-height:0`.
- [x] index.html (Topografo) — layout, header, sidebar, views, modales, footer
      ✓ Footer enlazado a clase `.footer` (se sustituyeron los estilos inline).
- [x] municipal/index.html, admin/index.html, ciudadano/index.html
      ✓ Subapps verificadas: comparten `/css/styles.css`; municipal/admin sin footer propio (intencionado).
- [x] dist/ rebuilt ✅
      ✓ Verificado: dist/index.html referencia `./css/styles.css`; no se modificó (build existente).

## IA-2 (JS/API) — Rama: ai-js-api
- [x] js/app/index.js — wire-up, imports, lógica principal
- [x] js/crs.js, js/layerManager.js, js/workspace.js
- [x] js/layerPanel.js, js/layerDialog.js, js/labels.js
- [x] js/app.js, js/mapEngine.js, js/mapLegend.js
- [x] server-api.js — endpoints
- Verificar: `git status --porcelain` (tests `npm test`: OK)

## IA-3 (Módulo 1 Geo/YGeo) — Rama: ai-modulo1-ygeo
- [ ] js/geodesia.js — módulo central con R1–R10 implementados
- [ ] js/geodesiaUI.js — wrapper para la UI
- [ ] js/validator.js — validación del módulo M1 (depende de geodesia)
- [ ] js/crs.js — ajustes de CRS, atrás
- [ ] js/parser.js — fusión del factor combinado k_c (depende de geodesia)
- [ ] js/export.js, js/cogo.js, js/cogoUI.js — R18–R19 (tolerancia de cierre, Bowditch)
- [ ] server-api.js — endpoints M1 (GET /api/modulo1/...)
- [ ] tests — tests unitarios para M1 (agregar a package.json)
- [ ] integration checks (tests end-to-end)
- Verificar: `git status --porcelain`
