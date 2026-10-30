# Datos de OpenStreetMap para la gestión municipal

Fuente: Geofabrik `data/osm/paraguay-latest.osm.pbf` (licencia ODbL: citar «© colaboradores de OpenStreetMap»). Todo lo del mapa es **indicio**: se verifica en campo.

| Dataset | Cómo se genera | Qué tiene | Cifras (2026-10-29) |
|---|---|---|---|
| `data/osm/edificios_py.fgb` | `data/osm/extraer.cmd` | Edificios (techos) de todo el país | 1 731 273 |
| `data/osm/usos_py.json` | `data/osm/usos.cmd` → `node scripts/osm-usos.mjs` | Usos por sector (comercio por tipo, gastronomía, alojamiento, bancos, combustible, servicios, industria, salud, educación, gobierno, culto, recreación) con distrito y la parcela SNC que los contiene (Cta. Cte. o padrón, impuesto 2026, m² edificados declarados) | 66 735 usos; 39 102 con cuenta |
| `data/osm/residencial/<dpto>_<dist>.geojson` | `data/osm/residencial.cmd` → `node scripts/osm-residencial.mjs` | Zonas residenciales (gris en el mapa) con distrito, barrio (OSM place), parcelas dentro, Cta. Cte., padrones, impuesto, edificación declarada | 7 736 zonas en 264 distritos; 911 664 parcelas; 4 725 zonas (34 670 ha) sin parcela SNC |

## Sectores y habilitación
Definidos en `usosOsm.js` (`SECTORES`). `habilitacion: true` = actividad que normalmente requiere patente municipal: comercio, gastronomía, alojamiento, bancos, combustible, servicios, industria y salud.

## Uso en la aplicación
- `GET /api/v3/gestion/usos?dpto&dist` (usuario del municipio): usos + cruces (sin habilitar, actividad en lote sin edificación declarada).
- `GET /api/v3/gestion/residencial?dpto&dist` (público): zonas en WGS84 con resumen.
- Pantalla `/municipal/gestion.html`, pestañas «Usos y actividades» y «Zonas residenciales».

## Lecturas útiles
- Zona residencial **sin parcela SNC**: asentamiento o loteamiento fuera del catastro.
- Zona residencial con **padrones rurales**: posible urbanización no registrada como urbana.
- Actividad comercial en lote con **0 m² edificados** en DNIT: posible construcción no declarada.
