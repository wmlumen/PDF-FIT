
## 2026-11-01 - imp_1793573611973_a0c2eibe
**Agent:** Claude
**Type:** task_passed
**Description:** Dos mejoras de visibilidad en panel.html, a pedido explicito del usuario (opcion 1, el fix real): 1) declutterClustersPorPixeles() en agruparMarcadoresPorProximidadYDistrito (niveles 2-5): cuando dos o mas pastillas del MISMO nivel/capa quedarian a menos de 42px de su centro en pantalla, se funden en una sola (ej. 'CAPIATA + SAN LORENZO' o '4 distritos'), reutilizando el click-para-acercar existente (fitBounds) para separarlas al hacer zoom. Reduce el solape severo en zoom 10 (Area Metropolitana) de ~172 pares solapados a 3 (residual: mismo distrito en 2 capas de categoria distintas -salud/educacion/industria- que corren su propio agrupamiento por separado; documentado para Antigravity, no corregido por ser un refactor mayor de 3 pipelines async). 2) 'Modo Oscuro (CartoDB) no funciona': el choropleth de riesgo distrital (IRI, capaDistritosLayer) cubre el pais entero a fillOpacity 0.50-0.65 y tapaba cualquier mapa base; ahora opacidadVisibleSegunBase() la baja ~0.18 cuando el mapa base activo no es el callejero por defecto (listener map.on(baselayerchange)), verificado ida y vuelta con fillOpacity real del layer (0.65 -> 0.47 en oscuro -> 0.65 de nuevo en callejero). npm run lint:encoding OK, node --check OK, sin errores nuevos en consola.

```diff

```
