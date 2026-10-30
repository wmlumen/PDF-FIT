"""Clasificación común de las zonas POUT del Área Metropolitana y vínculo con las parcelas SNC.
- Agrega a zonificacion_ama.geojson: categoria (común a los 8 municipios), color, dpto, dist (código SNC).
- Por parcela (centro en la zona): zona, categoría y afectaciones que la tocan → data/pout_ama/parcelas/<dpto>_<dist>.json
- Resumen por municipio y categoría (parcelas, ha, impuesto 2026, edificación declarada) → data/pout_ama/resumen_ama.json"""
import json, re, os
from collections import defaultdict
from shapely.geometry import shape
from shapely.strtree import STRtree
from shapely import make_valid
from shapely.ops import transform
from pyproj import Transformer
R = 'data/pout_ama'
SNC = {'Capiatá': ('L', 2), 'Luque': ('L', 8), 'Limpio': ('L', 7), 'Mariano Roque Alonso': ('L', 9), 'Lambaré': ('L', 19), 'Villa Elisa': ('L', 14), 'San Lorenzo': ('L', 13), 'Fernando de la Mora': ('L', 3)}
CATS = [  # (regex sobre el nombre de la zona, categoría común, color)
  (r'centro hist|casco hist|centro civ', 'Centro histórico / cívico', '#b91c1c'), (r'amortigua', 'Amortiguamiento', '#f97316'),
  (r'industri|log[ií]st|tecnol', 'Mixta logística / industrial', '#7c3aed'), (r'mixta.*alta', 'Mixta alta', '#dc2626'), (r'mixta.*media', 'Mixta media', '#f59e0b'),
  (r'mixta', 'Mixta baja', '#fcd34d'), (r'residencial.*alta|residencial 3', 'Residencial alta', '#2563eb'), (r'residencial.*media|residencial 2', 'Residencial media', '#60a5fa'),
  (r'residencial', 'Residencial baja', '#bfdbfe'), (r'protecci|silvestre|ambiental|bosque|recarga|costera', 'Protección ambiental', '#15803d'),
  (r'espacio p[uú]blico|plaza|parque', 'Espacio público', '#4ade80'), (r'concertada', 'Urbanización concertada', '#a78bfa'), (r'rururbana|rural', 'Rururbana', '#a3e635'),
  (r'seguridad|220|subestaci|alta tensi', 'Seguridad (líneas de alta tensión)', '#6b7280'), (r'ind[ií]gena', 'Comunidad indígena', '#b45309'),
  (r'uso espec|cementer|planta|militar|aeropuerto', 'Uso específico', '#94a3b8')]
def categoria(z):
    for rx, c, col in CATS:
        if re.search(rx, z.lower()): return c, col
    return 'Otra', '#cbd5e1'
a_utm = Transformer.from_crs('EPSG:4326', 'EPSG:32721', always_xy=True).transform
Z = json.load(open(f'{R}/zonificacion_ama.geojson', encoding='utf8'))
for f in Z['features']:
    p = f['properties']; p['categoria'], p['color'] = categoria(p['zona']); p['dpto'], p['dist'] = SNC[p['municipio']]
json.dump(Z, open(f'{R}/zonificacion_ama.geojson', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
A = json.load(open(f'{R}/afectaciones_ama.geojson', encoding='utf8'))['features']
ag = [make_valid(transform(a_utm, shape(f['geometry']))) for f in A]; at = STRtree(ag)
os.makedirs(f'{R}/parcelas', exist_ok=True)
resumen = {}
for mun, (d, n) in SNC.items():
    zf = [f for f in Z['features'] if f['properties']['municipio'] == mun]
    zg = [make_valid(transform(a_utm, shape(f['geometry']))) for f in zf]; zt = STRtree(zg)
    pf = f'data/parcelario/{d}_{n}.geojson'
    if not os.path.exists(pf): print(mun, 'sin parcelario'); continue
    res = defaultdict(lambda: {'parcelas': 0, 'ha': 0.0, 'impuesto': 0, 'edif_m2': 0, 'cuentas': 0, 'afectadas': 0})
    porParcela, afectTot = {}, defaultdict(int)
    for x in json.load(open(pf, encoding='utf8'))['features']:
        if not x.get('geometry'): continue
        g = make_valid(shape(x['geometry'])); pt = g.representative_point(); p = x['properties']
        zi = next((i for i in zt.query(pt) if zg[i].contains(pt)), None)
        if zi is None: continue
        zp = zf[zi]['properties']
        afs = sorted({A[i]['properties']['tipo'] for i in at.query(g) if ag[i].intersects(g)})
        porParcela[p['id_parcela']] = [zp['categoria'], zp['zona'], afs]
        r = res[zp['categoria']]; r['parcelas'] += 1; r['ha'] += g.area / 10000
        r['impuesto'] += p.get('dnit_impuesto') or 0; r['edif_m2'] += p.get('dnit_sup_edif_m2') or 0; r['cuentas'] += 1 if p.get('dnit_ctacte') or p.get('dnit_padron') else 0
        if afs: r['afectadas'] += 1
        for a in afs: afectTot[a] += 1
    json.dump(porParcela, open(f'{R}/parcelas/{d}_{n}.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    resumen[f'{d}|{n}'] = {'municipio': mun, 'parcelas_en_pout': len(porParcela), 'categorias': {k: {**v, 'ha': round(v['ha'], 1)} for k, v in res.items()}, 'afectaciones': dict(afectTot)}
    print(mun, len(porParcela), 'parcelas con zona ·', dict(afectTot))
json.dump({'categorias': [{'categoria': c, 'color': col} for _, c, col in CATS] + [{'categoria': 'Otra', 'color': '#cbd5e1'}], 'distritos': resumen},
          open(f'{R}/resumen_ama.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
from collections import Counter
print(Counter(f['properties']['categoria'] for f in Z['features']))
