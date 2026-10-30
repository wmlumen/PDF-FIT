"""Une las zonas residenciales de OSM por distrito (data/osm/residencial/*.geojson, UTM 21S) en una capa nacional liviana
en WGS84 para el mapa: data/residencial_py_light.geojson. Sin listas de cuentas (solo totales)."""
import json, glob
from shapely.geometry import shape, mapping
from shapely import make_valid
from pyproj import Transformer
from shapely.ops import transform
a_wgs = Transformer.from_crs('EPSG:32721', 'EPSG:4326', always_xy=True).transform
out = []
for f in sorted(glob.glob('data/osm/residencial/*_*.geojson')):
    for x in json.load(open(f, encoding='utf8'))['features']:
        g = make_valid(shape(x['geometry'])).simplify(4, preserve_topology=True)
        if g.geom_type not in ('Polygon', 'MultiPolygon'):
            from shapely.ops import unary_union
            g = unary_union([y for y in getattr(g, 'geoms', []) if y.geom_type in ('Polygon', 'MultiPolygon')])
        if g.is_empty: continue
        g = transform(a_wgs, g)
        p = x['properties']
        out.append({'type': 'Feature', 'geometry': mapping(g), 'properties': {
            'zona': 'Zona residencial (OSM)', 'nombre': p.get('nombre'), 'barrio': p.get('barrio'), 'distrito': p.get('distrito'), 'area_ha': p.get('area_ha'),
            'parcelas': p.get('parcelas'), 'cuentas_urbanas': p.get('cuentas_urbanas'), 'padrones_rurales': p.get('padrones_rurales'),
            'sin_cuenta_dnit': p.get('sin_cuenta_dnit'), 'sin_parcela_snc': p.get('sin_parcela_snc'), 'impuesto_2026': p.get('impuesto_2026'), 'osm_id': p.get('osm_id')}})
def r(c): return [r(v) for v in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 6), round(c[1], 6)]
for o in out: o['geometry'] = {'type': o['geometry']['type'], 'coordinates': r(o['geometry']['coordinates'])}
json.dump({'type': 'FeatureCollection', 'name': 'residencial_py', 'features': out}, open('data/residencial_py_light.geojson', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'zonas')
