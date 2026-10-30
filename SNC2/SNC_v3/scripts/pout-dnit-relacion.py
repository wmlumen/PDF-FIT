"""Relación entre la zona POUT y los valores fiscales DNIT 2026 (Área Metropolitana).
Une cada parcela SNC (data/parcelario/L_<d>.geojson, UTM 21S) con su zona POUT (punto interior en data/pout_ama/zonificacion_ama.geojson)
y con sus cuentas urbanas DNIT (data/dnit_cuentas.sqlite, por zona-manzana-lote). Mide el valor fiscal de la tierra por m²
(valor_tierra / superf_tierra), que la DNIT fija por zona y manzana. Salida: data/snc_estadisticas/pout_dnit_relacion.json"""
import json, math, sqlite3, statistics as st, collections
from shapely.geometry import shape
from shapely.strtree import STRtree
from shapely.ops import transform
import warnings; warnings.filterwarnings('ignore')
from pyproj import Transformer
A_UTM = Transformer.from_crs('EPSG:4326', 'EPSG:32721', always_xy=True).transform
MUNI = {'Capiatá': 2, 'Fernando de la Mora': 3, 'Limpio': 7, 'Luque': 8, 'Mariano Roque Alonso': 9, 'San Lorenzo': 13, 'Villa Elisa': 14, 'Lambaré': 19}
zon = json.load(open('data/pout_ama/zonificacion_ama.geojson', encoding='utf8'))['features']
db = sqlite3.connect('file:data/dnit_cuentas.sqlite?mode=ro', uri=True)
def q(v, p=50):
    v = sorted(v); return v[min(len(v) - 1, int(len(v) * p / 100))] if v else None
salida, filas = {}, []
for mun, dist in MUNI.items():
    zs = [(transform(A_UTM, shape(f['geometry'])), f['properties']) for f in zon if f['properties']['municipio'] == mun]
    zs = [(g if g.is_valid else g.buffer(0), p) for g, p in zs]
    arbol = STRtree([g for g, _ in zs])
    dn = {}
    for z, m, l, vt, st_, ve, se, it in db.execute('SELECT zona, manzana, lote, valor_tierra, superf_tierra_total, valor_edificado, superf_edif_total, impuesto_total FROM cuentas_urbanas WHERE cod_dpto="L" AND cod_distrito=? AND vigente=1', (dist,)):
        try: k = (int(z), int(m), int(l))
        except (TypeError, ValueError): continue
        def num(x):
            try: return float(str(x).replace('.', '').replace(',', '.')) if isinstance(x, str) else float(x or 0)
            except ValueError: return 0.0
        a = dn.setdefault(k, [0, 0, 0, 0, 0])
        for i, x in enumerate((vt, st_, ve, se, it)): a[i] += num(x)
    n = enl = 0
    for f in json.load(open(f'data/parcelario/L_{dist}.geojson', encoding='utf8'))['features']:
        p = f['properties']
        if not f['geometry'] or p.get('zona') is None: continue
        n += 1
        pt = shape(f['geometry']).representative_point()
        zona = next((zs[i][1] for i in arbol.query(pt) if zs[i][0].contains(pt)), None)
        d = dn.get((int(p['zona']), int(p['mz']), int(p['lote'])))
        if not zona or not d or d[1] <= 0 or d[0] <= 0: continue
        enl += 1
        filas.append({'mun': mun, 'cat': zona['categoria'], 'zona': zona['zona'], 'vt_m2': d[0] / d[1], 'ed_m2': d[3] / d[1], 'imp': d[4], 'zdnit': int(p['zona'])})
    print(mun, 'parcelas urbanas', n, 'con zona POUT y DNIT', enl)
    salida[mun] = {'parcelas_urbanas': n, 'enlazadas': enl}
# Estadística por municipio y categoría POUT
res = collections.defaultdict(lambda: collections.defaultdict(list))
for r in filas: res[r['mun']][r['cat']].append(r)
tabla = {}
for mun, cats in res.items():
    med_mun = q([r['vt_m2'] for c in cats.values() for r in c])
    tabla[mun] = {'mediana_municipio_gs_m2': round(med_mun), 'categorias': {}}
    for cat, rs in cats.items():
        if len(rs) < 30: continue
        v = [r['vt_m2'] for r in rs]
        tabla[mun]['categorias'][cat] = {'n': len(rs), 'p25': round(q(v, 25)), 'mediana': round(q(v)), 'p75': round(q(v, 75)), 'indice': round(q(v) / med_mun, 2),
                                         'edif_m2_por_m2_tierra': round(q([r['ed_m2'] for r in rs]), 2), 'impuesto_mediano': round(q([r['imp'] for r in rs]))}
# ¿Cuánto explica la zona POUT? eta² del log(valor/m²) dentro de cada municipio, y lo mismo con la zona DNIT (referencia).
def eta2(grupos):
    todos = [x for g in grupos for x in g]; m = st.fmean(todos)
    sst = sum((x - m) ** 2 for x in todos); ssb = sum(len(g) * (st.fmean(g) - m) ** 2 for g in grupos)
    return round(ssb / sst, 3) if sst else None
for mun in tabla:
    rs = [r for r in filas if r['mun'] == mun]
    por = lambda k: [[math.log(r['vt_m2']) for r in g] for g in collections.defaultdict(list, {}).values()] or None
    gp, gd = collections.defaultdict(list), collections.defaultdict(list)
    for r in rs: gp[r['cat']].append(math.log(r['vt_m2'])); gd[r['zdnit']].append(math.log(r['vt_m2']))
    tabla[mun]['eta2_zona_pout'] = eta2(list(gp.values())); tabla[mun]['eta2_zona_dnit'] = eta2(list(gd.values()))
# Consistencia entre municipios: índice (categoría / mediana del municipio)
cats = sorted({c for t in tabla.values() for c in t['categorias']})
consist = {}
for c in cats:
    ix = {m: t['categorias'][c]['indice'] for m, t in tabla.items() if c in t['categorias']}
    if len(ix) >= 3: consist[c] = {'municipios': len(ix), 'indice_mediano': round(st.median(ix.values()), 2), 'min': min(ix.values()), 'max': max(ix.values()), 'por_municipio': ix}
# Proporción de parcelas por escalón de la escala DNIT (Gs/m²) en cada categoría POUT, por municipio y en conjunto.
ESC = [7895, 14207, 18944, 23679, 31572, 39464, 52094, 63145, 71037]
def escalon(v): return min(ESC, key=lambda e: abs(e - v))
sobre = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0]))
for r in filas:
    for m in (r['mun'], 'AMA (8 municipios)'):
        a = sobre[m][r['cat']]; a[0] += 1; a[1] += escalon(r['vt_m2']) >= 31572
pct_alto = {m: {c: {'n': a[0], 'pct_31572_o_mas': round(100 * a[1] / a[0], 1)} for c, a in cs.items() if a[0] >= 30} for m, cs in sobre.items()}
json.dump({'escala_dnit_gs_m2': ESC, 'pct_escalon_alto': pct_alto, 'metodo': __doc__, 'enlace': salida, 'por_municipio': tabla, 'consistencia_por_categoria': consist}, open('data/snc_estadisticas/pout_dnit_relacion.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(tabla['Mariano Roque Alonso'], ensure_ascii=False, indent=1))
for m, t in tabla.items(): print(m, 'eta2 POUT', t['eta2_zona_pout'], 'eta2 zona DNIT', t['eta2_zona_dnit'], 'mediana', t['mediana_municipio_gs_m2'])
print(json.dumps({c: {k: v for k, v in x.items() if k != 'por_municipio'} for c, x in consist.items()}, ensure_ascii=False, indent=0))

print('--- % parcelas con valor DNIT >= 31.572 Gs/m2 por categoria POUT')
for m in ('Mariano Roque Alonso', 'AMA (8 municipios)'):
    print(m); [print('  ', c, v) for c, v in sorted(pct_alto[m].items(), key=lambda x: -x[1]['pct_31572_o_mas'])]
