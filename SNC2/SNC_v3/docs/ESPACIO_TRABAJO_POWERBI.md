# Espacio de Trabajo SNC_v3 — Paradigma Power BI

> **Estado:** IMPLEMENTADO (commit 65ab18b, 2026-10-23).
> **Referencia:** Estructura de Power BI Desktop (3 vistas: Informe, Datos, Modelo).

---

## Evaluación aplicada

| Concepto Power BI | Implementación SNC_v3 | Archivo |
|---|---|---|
| **Vista de Informe** (lienzo) | `tab-map` — canvas Leaflet con KPI strip flotante | `index.html:356` |
| **Vista de Datos** (tablas) | `tab-datos` — dataTable.js (editar, ordenar, exportar) | `js/dataTable.js` |
| **Vista de Modelo** (relaciones) | `tab-modelo` — diagrama ER con 7 entidades | `index.html` (view-modelo) |

## Lo implementado (commit 65ab18b)

### 1. KPI Strip (flotante top-center del mapa)

Métricas del proyecto activo visibles sin salir del mapa:

```
┌────────────────────────────────────────────────────────────┐
│ 📦 1 Parcelas | 📏 81.93 ha | ✏️ 14 Vértices | ✔ Validación │
└────────────────────────────────────────────────────────────┘
```

- **Actualización automática:** al cargar un GeoJSON y tras validar.
- **Turf.js** calcula el área SIG en m²/ha según el tamaño.
- **IDs:** `kpi-parcelas`, `kpi-area`, `kpi-vertices`, `kpi-validacion`.

### 2. Vista Modelo (nuevo tab 🔗)

Diagrama entidad-relación del esquema estrella del sistema:

| Entidad | Color | Relación |
|---|---|---|
| USERS | Azul | 1:N → PROJECTS, PAYMENTS, IP_EVENTS |
| PROJECTS | Verde | 1:N → EXPEDIENTES, 1:1 → PARCELAS |
| EXPEDIENTES | Verde | N:1 → PROJECTS |
| PARCELAS (GeoJSON) | Púrpura | Features del proyecto activo |
| PLANS | Ámbar | 1:N → USERS |
| PAYMENTS | Ámbar | N:1 → USERS, N:1 → PLANS |
| IP_EVENTS | Gris | N:1 → USERS (auditoría) |

- **Contadores dinámicos:** `er-count-parcelas` (del State local), `er-count-users` (de la API).
- **CSS:** clases `.er-entity`, `.er-connector-h/v`, `.er-pk`, `.er-field` en `css/styles.css`.

### 3. Workspace inline (fix crítico)

`window.Workspace.switchTab(tab)` fue **removido por otro agente** y ningún tab funcionaba.
Restaurado como script inline en `index.html`:
- Alterna `.active` y `hidden` en las vistas.
- Actualiza `aria-selected` en los botones.
- Hook: `tab=modelo` → `updateEntityCounts()`, `tab=map` → `updateKpiStrip()`.

## Lo que queda pendiente (evaluado pero no implementado)

| # | Mejora | Esfuerzo | Prioridad |
|---|---|---|---|
| 1 | **Matriz agrupable** en dataTable: agrupar por barrio/uso/estado con subtotales | Medio | Alta |
| 2 | **Columnas calculadas**: fórmulas simples (ej: `área_título − área_sig`) | Bajo | Media |
| 3 | **Filtros visuales** tipo Power BI (slicers en la vista de datos) | Bajo | Media |
| 4 | **Mapa coroplético**: colorear regiones según un valor (ej: densidad por distrito) | Medio | Baja |

## Decisiones de diseño

1. **El mapa es el lienzo principal** (a diferencia de Power BI donde Report View es para consumir, acá es para EDITAR geometría).
2. **KPI strip flotante, no barra fija** — no consume espacio del mapa, se superpone con backdrop-blur.
3. **Vista Modelo estática + contadores dinámicos** — el ER no cambia, los contadores sí.
4. **`window.Workspace` inline en el HTML** — evita que otro agente lo remueva de nuevo (js/workspace.js existe pero no se cargaba).

## Relación con el grafo

- La trazabilidad completa de las 3654 entidades del código está en `graphify-out/graph.json`.
- La Vista Modelo es la **visualización humana** del grafo de dominio (`graphify-out/grafo_dominio.json`).
