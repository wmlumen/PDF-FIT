# Catálogo de gráficos para SNC v3

Guía de referencia para todas las IA que trabajan en SNC v3 (panel de análisis territorial, portal ciudadano, reportes). Inspirada en la galería de R (https://r-graph-gallery.com/), adaptada a Chart.js 4.4.1, que es la librería ya incluida en el proyecto (`scripts/vendor/chart.umd.min.js`). Antes de agregar una librería nueva, comprobar si el gráfico se puede dibujar con Chart.js y un plugin propio.

Reglas generales (ver también la regla de turnos en `AGENTS.md`):

- Un mismo dato puede verse con varios tipos: el selector "Tipo" de cada gráfico solo ofrece los que tienen sentido para ese dato (`tiposPosibles()` en `scripts/analisis-territorial.plantilla.html`).
- Vista normal: sencilla, con valores solo donde no se superponen.
- Vista ampliada (pantalla completa): más detalle: valores, rótulos de líneas, estadísticos y ajuste de curva.
- Colores: serie `--s1` a `--s7` en orden fijo, nunca generados; el color del municipio se repite en su media departamental; texto con contraste calculado (`colorContraste()`).

## Tipos y cuándo usarlos

| Tipo (galería R) | Enlace de referencia | Dato del panel donde encaja | Estado |
|---|---|---|---|
| Barras (horizontal/vertical) | — | Rankings por departamento o distrito, histogramas de impuesto y lote | Hecho |
| Piruleta con línea base (lollipop) | https://r-graph-gallery.com/301-custom-lollipop-chart.html#baseline | Rankings largos (266 distritos) y desvíos respecto de una media: el palo sale de la mediana nacional y el punto marca el distrito | Hecho (tipo "Piruleta"; línea base = mediana) |
| Radar | https://r-graph-gallery.com/142-basic-radar-chart.html | Perfil de un distrito en 5–8 indicadores normalizados 0–100 (% edificado, lote mínimo, Gini, impuesto por cuenta, valor m²) frente a su departamento y al país | Parcial (tipo "Radar" sobre un indicador); falta el perfil multiindicador |
| Barras circulares | https://r-graph-gallery.com/web-circular-barplot-with-R-and-ggplot2.html | Los 266 distritos en una sola vista, ordenados por impuesto por cuenta | Hecho (tipo "Barras circulares": área polar ordenada, nombres girados por fuera; con valor al ampliar) |
| Barras circulares agrupadas | https://r-graph-gallery.com/297-circular-barplot-with-groups.html | Distritos agrupados por departamento (18 sectores) con un hueco entre grupos | Pendiente: igual que el anterior, con grupos y rótulo de departamento |
| Densidad en espejo | https://r-graph-gallery.com/density_mirror_ggplot2.html | Comparar dos distribuciones: impuesto por cuenta urbana de dos distritos, o lotes propios frente a propiedad horizontal | Pendiente: requiere la distribución por cuenta (hoy se exportan histogramas por tramos) |
| Ajuste de curva polinómica | https://r-graph-gallery.com/44-polynomial-curve-fitting.html | Al ampliar: ajuste de grado 1 a 3 sobre la serie, con R² | Hecho (se elige el grado con mejor R² ajustado) |
| Densidad 2D | https://r-graph-gallery.com/2d-density-chart.html | Relación entre superficie del lote y valor del m² (o valor fiscal y edificación) con miles de cuentas | Pendiente: requiere una muestra de cuentas exportada por el generador y un plugin de densidad (rejilla hexagonal) |
| Torta, dona, polar | — | Composición (participación de departamentos en el impuesto) | Hecho (máximo 8 porciones + "Otros") |
| Línea, área, puntos | — | Series y evolución 2024–2026 | Hecho |
| Ranking de Riesgo de Inundación (Lollipop / Barras) | https://r-graph-gallery.com/301-custom-lollipop-chart.html#baseline | Índice de Riesgo de Inundación (IRI 0–100) en 266 distritos (CC-05/06): ordenados por vulnerabilidad combinando cota DEM, hidrografía y catastro | Hecho (`Cambio_climatico/indice-riesgo-inundacion.mjs`) |

## Qué muestra la vista ampliada

1. Valor de cada barra, punto o porción, con contraste según el color.
2. Rótulo en cada línea: qué mide y su valor (medias, curvas).
3. Curva de ajuste con su ecuación resumida y R² cuando hay al menos 4 datos no apilados.
4. Panel de estadísticos de la serie: cantidad, total, media, mediana, mínimo y máximo con su categoría, desvío estándar, coeficiente de variación y cuartiles.

## Pendientes para implementar (en este orden)

1. Perfil radar multiindicador del distrito (distrito, mediana departamental, mediana nacional).
2. Versión agrupada por departamento de las barras circulares (sectores con hueco y rótulo de departamento).
3. Exportar desde `scripts/analisis-territorial.mjs` una muestra de cuentas por distrito (sin datos personales) para densidad en espejo y densidad 2D.
4. Mapa coroplético por distrito (plan de mejora, tarea E4).
