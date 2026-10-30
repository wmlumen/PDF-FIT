# Convención de datos para libros, manuales y artículos técnicos (Quarto)

Objetivo: que armar un informe, manual o artículo a partir de lo que calcula el
sistema sea automático (sin copiar y pegar números a mano). Para eso cada
generador de informes separa **datos** (reproducibles, versionables, editables)
de **presentación** (el documento final). Los datos se escriben siempre en
alguno de estos 5 formatos, nunca como texto suelto dentro del documento:

| # | Contenido | Formato | Carpeta de salida |
|---|---|---|---|
| 1 | Tablas y métricas (resultados, mediciones) | `.csv` | `_tablas/` |
| 2 | Mapas y geometrías catastrales | `.geojson` (web) + `.svg` (impresión) | `_figuras/` |
| 3 | Diagramas de flujo / arquitectura | Mermaid `.mmd` | `_diagramas/` |
| 4 | Gráficos estadísticos | `.svg` + datos crudos `.csv`/`.json` | `_figuras/` |
| 5 | Metadatos de la corrida (auditoría/reproducibilidad) | `.yaml` | raíz del paquete |

No se usan capturas de pantalla (`.png`/`.jpg`) para mapas, gráficos o
diagramas: pierden nitidez al imprimir y no se pueden regenerar. El `.svg` y el
`.geojson` sí.

## Implementación de referencia: `reportesDatosServicio.js`

Primer generador que sigue esta convención (prueba de concepto). Expone:

- `tablaCriteriosCsv(criterios)` → CSV de `resultados_criterios.csv`.
- `parcelaGeoJson(feature, propiedades)` → `FeatureCollection` para
  `parcela_resultado.geojson`.
- `flujoExpedienteMermaid(pasos)` → texto Mermaid de
  `flujo_expediente.mmd`.
- `figuraResumenCriteriosSvg(criterios)` → SVG de barras aprobado/observado de
  `resumen_criterios.svg`.
- `metadatosCorridaYaml(metadatos)` → YAML plano de
  `metadatos_corrida.yaml`.
- `generarPaqueteDatos({ expedienteId, criterios, parcela, pasos, metadatos }, directorioSalida)`
  escribe los 5 archivos y devuelve las rutas escritas.

Cualquier otro generador del sistema (análisis territorial, informe del lote,
dictamen, etc.) que necesite producir un paquete de datos para un libro o
artículo reutiliza estas mismas funciones en vez de inventar su propio CSV o
su propio SVG.

## Cómo se incluye en un capítulo Quarto (`.qmd`)

```markdown
### Resultados de la validación

{{< include _tablas/resultados_criterios.md >}}

![Plano oficial generado](_figuras/parcela_resultado.svg){#fig-parcela}
```

Cada vez que el sistema vuelve a calcular algo, se regenera la carpeta de
datos (`_tablas/`, `_figuras/`, `_diagramas/`) y `quarto render` actualiza el
libro completo sin redactar nada de nuevo.

## Ejemplo de metadatos (`metadatos_corrida.yaml`)

```yaml
expediente_id: "EXP-2026-0045"
version_snc: "v3.0.1"
fecha_proceso: "2026-10-30T12:00:00Z"
epsg_proyeccion: 32721
total_vertices: 24
cierre_lineal_error_m: 0.0018
```
