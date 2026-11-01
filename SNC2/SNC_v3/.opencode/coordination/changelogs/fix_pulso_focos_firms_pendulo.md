
## 2026-11-01 - imp_1793571987930_8fpui9nf
**Agent:** Claude
**Type:** task_passed
**Description:** Focos FIRMS en panel.html hacian 'pendulo' al pulsar: L.circleMarker se renderiza como <path> SVG dentro de un <svg> compartido por todo el mapa, y la animacion pulse-fire (transform:scale) no tenia transform-box:fill-box, asi que el scale pivotaba sobre el origen del <svg> compartido en vez del centro propio de cada marcador. Fix: transform-box:fill-box + transform-origin:center en .pulse-fire-icon (css/panel-clima.css). Verificado en vivo: transformOrigin paso de 0px 0px (origen compartido) a 6px 6px (centro propio del marcador de ~12px). npm run lint:encoding OK.

```diff

```
