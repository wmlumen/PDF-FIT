"""Insumos espaciales del potencial de recaudación por distrito (para el análisis territorial).
Cruza las zonas residenciales de OSM (data/osm/residencial/*.geojson, UTM 21S) con los cascos urbanos del SNC y los barrios DGEEC:
 - ha residenciales dentro y fuera del casco (candidatas a ampliación del casco urbano),
 - ha residenciales sin ninguna parcela SNC (viviendas fuera del catastro),
 - parcelas sin cuenta DNIT y padrones rurales dentro de zonas residenciales,
 - todo por barrio (DGEEC) para saber dónde actuar.
Salida: data/snc_estadisticas/potencial_distrito.json"""
import json, glob, os
from shapely.geometry import shape
from shapely.strtree import STRtree
from shapely import make_valid
from shapely.ops import unary_union, transform
from pyproj import Transformer
a_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32721', always_xy=True).transform
cascos = [make_valid(transform(a_utm, shape(f['geometry']))) for f in json.load(open('data/casco_urbano_snc.geojson', encoding='utf8', errors='replace'))['features'] if f.get('geometry')]
t_c = STRtree(cascos)
barrios = []
for f in json.load(open('data/barrios_py_light.geojson', encoding='utf8'))['features']:
    barrios.append((f['properties']['barrio'], f['properties']['zona'], make_valid(transform(a_utm, shape(f['geometry'])))))
t_b = STRtree([b[2] for b in barrios])
salida = {}
for archivo in sorted(glob.glob('data/osm/residencial/*_*.geojson')):
    k = os.path.basename(archivo)[:-8].replace('_', '|')
    r = {'zonas': 0, 'haResidencial': 0.0, 'haDentroCasco': 0.0, 'haFueraCasco': 0.0, 'haSinParcela': 0.0, 'haSinParcelaFuera': 0.0,
         'parcelasSinCuenta': 0, 'padronesEnResidencialFuera': 0, 'padronesEnResidencial': 0, 'barrios': {}}
    for f in json.load(open(archivo, encoding='utf8'))['features']:
        g = make_valid(shape(f['geometry'])); p = f['properties']
        if g.is_empty: continue
        a = g.area / 10000
        cerca = [cascos[i] for i in t_c.query(g) if cascos[i].intersects(g)]
        dentro = g.intersection(unary_union(cerca)).area / 10000 if cerca else 0.0
        fuera = max(0.0, a - dentro)
        sin = a if p.get('sin_parcela_snc') else 0.0
        r['zonas'] += 1; r['haResidencial'] += a; r['haDentroCasco'] += dentro; r['haFueraCasco'] += fuera
        r['haSinParcela'] += sin; r['haSinParcelaFuera'] += sin * (fuera / a if a else 0)
        r['parcelasSinCuenta'] += p.get('sin_cuenta_dnit') or 0
        pad = p.get('padrones_rurales') or 0
        r['padronesEnResidencial'] += pad
        if fuera > dentro: r['padronesEnResidencialFuera'] += pad
        # Reparto por barrio DGEEC (por superficie de intersección)
        for i in t_b.query(g):
            nom, zona, bg = barrios[i]
            if not bg.intersects(g): continue
            x = g.intersection(bg).area / 10000
            if x < 0.05: continue
            b = r['barrios'].setdefault(nom, {'ha': 0.0, 'haFueraCasco': 0.0, 'haSinParcela': 0.0})
            b['ha'] += x
            if zona == 'rural': b['haFueraCasco'] += x
            if p.get('sin_parcela_snc'): b['haSinParcela'] += x
    r['barrios'] = sorted(({'barrio': n, **{c: round(v, 1) for c, v in b.items()}} for n, b in r['barrios'].items()), key=lambda b: -(b['haFueraCasco'] + b['haSinParcela']))[:40]
    for c in list(r):
        if c.startswith('ha'): r[c] = round(r[c], 1)
    salida[k] = r
json.dump({'fuente': 'Zonas residenciales OSM × cascos urbanos SNC × barrios DGEEC × parcelario SNC', 'distritos': salida},
          open('data/snc_estadisticas/potencial_distrito.json', 'w', encoding='utf8'), ensure_ascii=False)
print(len(salida), 'distritos'); print(json.dumps(salida.get('D|12'), ensure_ascii=False)[:900])
