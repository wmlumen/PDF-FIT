# ESTADO PENDIENTE — SNC_v3

> Guardado 2026-10-20. Leer ANTES de arrancar cualquier trabajo de normativa.
> Los pendientes viven en el grafo de dominio, no solo en este archivo.

## Cómo leer los pendientes

```bash
# Desde el proyecto
cd /mnt/c/Users/HP_250_G10/Documents/GITHUT/SNC2/SNC_v3
python3 - <<'EOF'
import json
g = json.load(open('graphify-out/grafo_dominio.json', encoding='utf-8'))
for n in g['nodos']:
    if n['id'].startswith('pendiente:'):
        d = n['datos']
        print(f"[{d['prioridad']}] {n['id']}  ({d['estado']})")
EOF
```

Cada nodo `pendiente:*` tiene en `datos`:
`estado`, `prioridad`, `modulo`, `contexto`, `evidencia_real`
(`implementado_ok` + `falta` + `causa_raiz`), `pendiente_detalle`,
`api_a_reusar`, `como_retomar`, `riesgos_conocidos`.

**Regla de trabajo:** antes de implementar, leer `evidencia_real` — distingue
lo que YA existe de lo que falta. Varios requisitos están cubiertos parcialmente
y re-implementarlos rompe lo que ya funciona.

## Prioridad 1 — bloqueadores estructurales

### pendiente:modulo-7-firma-digital-juridica [RESUELTO]
Implementado `SignatureAPI` en `js/signatureManager.js`, panel interactivo `SignatureUI` en `js/signatureUI.js`,
generador vectorial de sellos provisorios (circular y rectangular), lista CRL de revocación, circuito gubernamental de 4 slots
y renderizado directo en Consulta Descriptiva PDF. Testeado en `tests/signature-manager.test.mjs`.

### pendiente:modulo-9-mesa-de-entrada-expedientes [RESUELTO]
Implementada Mesa de Entrada Virtual con Número Único Oficial (SNC-AÑO-CORRELATIVO), Ficha Técnica,
Pre-calificación geométrica automática como Gate, Bandeja de revisores con asignación balanceada,
Pila de reingresos con diff geométrico, bitácora inmutable de auditoría (audit hash chain) y
Dictamen Técnico de agrimensura en `js/mesaEntrada.js`. Testeado en `tests/mesa-entrada.test.mjs`.

### pendiente:modulo-10-interoperabilidad-dgrp-mades-indert [RESUELTO]
Implementada integración con DGRP (R186), bloqueo registral preventivo de inmuebles en litigio (R188),
notificación automática municipal de empadronamiento (R187), consulta de restricciones ambientales MADES/INDI/INDERT (R199)
y catálogo de geoservicios OGC WMS/WFS (R193) en `js/interoperabilidad.js`. Testeado en `tests/interoperabilidad.test.mjs`.

## Prioridad 2 — normativa municipal y ambiental

### pendiente:normativa-municipal-perfiles-viales [RESUELTO]
Implementado en `CONFIG_MUNICIPAL` (`js/config.js`) y `ValidadorMunicipal.validarPerfilVial` (`js/municipal.js`).
Controla calles secundarias (mínimo 12 m) y avenidas colectoras (mínimo 24 m). Testeado en `tests/municipal-dxf.test.mjs`.

### pendiente:normativa-municipal-homologacion-junta [RESUELTO]
Implementado en `ValidadorMunicipal.validarHomologacionMunicipal` (`js/municipal.js`).
Exige Resolución de la Junta Municipal + Promulgación del Intendente como condición previa bloqueante para la asignación definitiva de Padrón/CCC. Testeado en `tests/municipal-dxf.test.mjs`.

### pendiente:normativa-ambiental-ley-3239-capas-mades [RESUELTO]
Implementada evaluación espacial de franja de servidumbre hídrica de 30m (Ley 3239/07), áreas silvestres protegidas SINASIP (Ley 352/94),
bosques protectores (Ley 4241/10) y tierras indígenas (INDI/Ley 904/81) en `js/interoperabilidad.js` y catalogado en servicios OGC.

## Prioridad 1 — Módulo Cartográfico de Análisis Territorial (Pendiente Abierto)

### pendiente:analisis-territorial-mapa-visor [ABIERTO]
- **Módulo:** Análisis Territorial y Cartografía Municipal (`data/analisis/AnalisisTerritorial.html`).
- **Contexto:** El informe de Análisis Territorial cuenta con indicadores estadísticos y económicos del Impuesto Inmobiliario 2026 y CSS 10x institucional (`data/analisis/analisis.css`), pero requiere un mapa interactivo (Leaflet) integrado que renderice espacialmente el distrito seleccionado, las parcelas con edificación/baldías, las zonas POUT y las franjas de restricción hídrica MADES.
- **Implementado OK:**
  - CSS institucional 10x en `data/analisis/analisis.css` (tokens Navy/Gold/Slate, KPI cards, reporte editorial, matrices FODA, tablas y modo print A4).
  - Enrutamiento Express en `server-api.js:1673` para servir `data/analisis/AnalisisTerritorial.html` en `/analisis-territorial.html`.
- **Falta para continuar el mapa:**
  1. Contenedor `<div id="mapa-territorial" class="lienzo alto">` en `AnalisisTerritorial.html`.
  2. Inicialización reactiva de `L.map()` en `data/analisis/analisis-app.js` enlazada al evento `change` del selector de distritos (`sel-dist`).
  3. Carga y renderizado de geometrías GeoJSON distritales (`/data/distritos_py_light.geojson` o capas locales `/data/municipal/<distrito>`).
  4. Capas temáticas: franja hídrica de 30m (Ley 3239/07), zonas POUT de uso de suelo y parcelas con/sin edificación.
  5. Controles de mapa: capa base (OSM/Carto), escala métrica, norte y leyenda interactiva.
- **Cómo retomar:** Cargar `/vendor/leaflet.js` y `/vendor/leaflet.css` en `AnalisisTerritorial.html` (respetando la CSP de `server-api.js`), y agregar la función `dibujarMapa(distrito)` en `analisis-app.js` dentro del ciclo `dibujar(d)`.
- **APIs a reusar:**
  - `server-api.js:1673` (`/analisis-territorial.html`)
  - `server-api.js:113` (`/data/distritos_py_light.geojson`)
  - `server-api.js:117` (`/data/municipal`)
  - `server-api.js:1680` (`/api/spatial-identify`)
  - `js/mapEngine.js` (patrón de inicialización Leaflet y CRS UTM 21S)

## Orden de arranque sugerido

1. **PostGIS** — desbloquea perfiles viales, franja hídrica y gaps.
   PostgreSQL 15 ya corre en Windows; falta la extensión.
2. **Módulo 7 (firma)** — requisito transversal de módulos 9 y 8.
3. **Módulo 9 (expedientes)** — flujo registral.
4. **Módulo 10 (interoperabilidad)** — cierra con DGRP/MADES/INDERT.
5. **Módulo 3.G/4.H** — normativa municipal y ambiental.

## Pitfalls que van a morder

- **PostgreSQL corre desde Windows.** `sqlite3` es PE32+ → da
  `invalid ELF header` si se intenta desde WSL. No migrar desde WSL.
- **EPSG hardcodeado a 32721** (`ST_Transform`). Para el Chaco corresponde
  **32720** (UTM 20S). Los cruces en zona chaqueña fallan en silencio.
- **`server-api.js` usa CRLF.** Un patch con LF puro mezcla finales de línea.
- **`state_json` ya está en uso** en `tabla:expedientes`. Migrar a columnas
  sin romper los lectores actuales.
- **Dato sensible:** capas MADES/DGRP son información oficial. **No subir a
  Firebase ni a repos públicos.**
- **Regla del proyecto:** SNC_v3 es 100% local. NUNCA deploy a Firebase.
