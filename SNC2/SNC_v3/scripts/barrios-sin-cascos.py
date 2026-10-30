"""Barrios y localidades de la DGEEC (todo el país) clasificados por el casco urbano del SNC.
Regla: el casco urbano manda. La parte del barrio dentro del casco es «urbana» y la de afuera «rural»; ambas conservan el nombre del barrio.
Entrada: data/tmp_barrios/barrios_py.geojson (ogr2ogr del shapefile nacional, ver data/tmp_barrios/conv.cmd) y data/casco_urbano_snc.geojson.
Salida: data/barrios_py_light.geojson (WGS84, simplificado ~3 m)."""
import json
from shapely.geometry import shape, mapping
from shapely.strtree import STRtree
from shapely import make_valid
from shapely.ops import unary_union

B = json.load(open('data/tmp_barrios/barrios_py.geojson', encoding='utf8'))['features']
C = [make_valid(shape(f['geometry'])) for f in json.load(open('data/casco_urbano_snc.geojson', encoding='utf8', errors='replace'))['features'] if f.get('geometry')]
arbol = STRtree(C)
AREA = {'1': 'urbana', '6': 'rural'}
out, partidos, solo_urb, solo_rur = [], 0, 0, 0
def poligonal(g):
    if g.is_empty: return g
    if g.geom_type in ('Polygon', 'MultiPolygon'): return g
    return unary_union([x for x in getattr(g, 'geoms', []) if x.geom_type in ('Polygon', 'MultiPolygon')])
for f in B:
    if not f.get('geometry'): continue
    g = make_valid(shape(f['geometry']))
    a0 = g.area or 1
    cerca = [C[i] for i in arbol.query(g) if C[i].intersects(g)]
    casco = unary_union(cerca) if cerca else None
    partes = [('urbana', poligonal(make_valid(g.intersection(casco)))), ('rural', poligonal(make_valid(g.difference(casco))))] if casco is not None else [('rural', g)]
    partes = [(t, x.simplify(0.00008, preserve_topology=True)) for t, x in partes if not x.is_empty and x.area > a0 * 0.005]
    if len(partes) == 2: partidos += 1
    elif partes and partes[0][0] == 'urbana': solo_urb += 1
    else: solo_rur += 1
    p = f['properties']
    for t, x in partes:
        out.append({'type': 'Feature', 'geometry': json.loads(json.dumps(mapping(x))),
                    'properties': {'barrio': p['BARLO_DESC'], 'distrito': p['DIST_DESC'], 'departamento': p['DPTO_DESC'], 'clave': p['CLAVE'],
                                   'zona': t, 'parte_pct': round(x.area / a0 * 100, 1), 'area_dgeec': AREA.get(str(p['AREA']), p['AREA'])}})
def redondear(c): return [redondear(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 6), round(c[1], 6)]
for o in out: o['geometry']['coordinates'] = redondear(o['geometry']['coordinates'])
json.dump({'type': 'FeatureCollection', 'name': 'barrios_py', 'fuente': 'DGEEC (barrios y localidades) menos cascos urbanos SNC', 'features': out},
          open('data/barrios_py_light.geojson', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(f'partes: {len(out)} · barrios partidos urbano/rural: {partidos} · solo urbanos: {solo_urb} · solo rurales: {solo_rur}')

# ─── Resumen por distrito SNC (para el análisis territorial) ─────────────────────────────────────
# Cada parte se asigna al distrito del SNC que contiene su punto interior; superficies en UTM 21S.
from pyproj import Transformer
from shapely.ops import transform as transformar
a_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32721', always_xy=True).transform
dist = [(f['properties']['cod_dpto'] + '|' + str(int(f['properties']['cod_dist'])), shape(f['geometry'])) for f in json.load(open('data/snc_estadisticas/ly_dist_utm.geojson', encoding='utf8'))['features'] if f.get('geometry')]
arbol_d = STRtree([g for _, g in dist])
res = {}
for o in out:
    g = transformar(a_utm, shape(o['geometry']))
    pt = g.representative_point()
    k = next((dist[i][0] for i in arbol_d.query(pt) if dist[i][1].contains(pt)), None)
    if not k: continue
    r = res.setdefault(k, {'barrios': {}, 'haUrbana': 0.0, 'haRural': 0.0})
    p = o['properties']; zona = p['zona']
    r['barrios'].setdefault(p['clave'], {'nombre': p['barrio'], 'zonas': set()})['zonas'].add(zona)
    r['haUrbana' if zona == 'urbana' else 'haRural'] += g.area / 10000
salida = {}
for k, r in res.items():
    b = r['barrios'].values()
    partidos = sorted(x['nombre'] for x in b if len(x['zonas']) == 2)
    salida[k] = {'barrios': len(r['barrios']), 'partidos': len(partidos), 'soloUrbanos': sum(1 for x in b if x['zonas'] == {'urbana'}),
                 'soloRurales': sum(1 for x in b if x['zonas'] == {'rural'}), 'haUrbana': round(r['haUrbana'], 1), 'haRural': round(r['haRural'], 1), 'nombresPartidos': partidos}
json.dump({'fuente': 'DGEEC barrios y localidades × cascos urbanos SNC', 'distritos': salida}, open('data/snc_estadisticas/barrios_por_distrito.json', 'w', encoding='utf8'), ensure_ascii=False)
print(f'distritos con barrios: {len(salida)}')
