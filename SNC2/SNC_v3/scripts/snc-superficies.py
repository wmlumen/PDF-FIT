"""
Superficie oficial de cada distrito y de su área urbana, desde el servicio de mapas del SNC.
  - snc:ly_dist  : límites distritales (atributo area_km2 y polígono), códigos cod_dpto + cod_dist (= liquidación DNIT)
  - snc:ly_urba  : áreas urbanas delimitadas por ley u ordenanza (atributo situacion)
Se piden en EPSG:32721 (UTM 21S, metros) y el área se calcula en el plano.
Uso: python3 scripts/snc-superficies.py   ->  data/snc_estadisticas/superficies_distritos.json
"""
import json, collections, os, urllib.request
URL = 'https://www.catastro.gov.py/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:32721&typeNames=snc:'
SALIDA = os.path.join(os.path.dirname(__file__), '..', 'data', 'snc_estadisticas', 'superficies_distritos.json')

def bajar(capa):
    req = urllib.request.Request(URL + capa, headers={'User-Agent': 'CatastroPYPro/3 (SNC v3)'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)

def area_m2(g):
    def anillo(r): return sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1)) / 2
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    return sum(abs(anillo(p[0])) - sum(abs(anillo(h)) for h in p[1:]) for p in polys)

def limpiar(t):
    t = (t or 'sin dato').replace('\ufffd', '°').strip()
    # Doble codificación del SNC ("NÂ°" -> "N°")
    if 'Ã' in t or 'Â' in t:
        try: t = t.encode('latin-1').decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError): pass
    return t

dist = bajar('ly_dist'); urba = bajar('ly_urba')
urb = collections.defaultdict(lambda: {'ha': 0.0, 'n': 0, 'normas': collections.Counter()})
for f in urba['features']:
    p = f['properties']
    if not f.get('geometry') or p.get('dpto') is None: continue
    u = urb[f"{p['dpto']}|{int(p['dist'])}"]
    u['ha'] += area_m2(f['geometry']) / 1e4; u['n'] += 1; u['normas'][limpiar(p.get('situacion'))] += 1
out = {}
for f in dist['features']:
    p = f['properties']; k = f"{p['cod_dpto']}|{int(p['cod_dist'])}"
    u = urb.get(k)
    out[k] = {'nombre': p['nom_dist'], 'ha_oficial': round((p.get('area_km2') or 0) * 100, 1),
              'ha_poligono': round(area_m2(f['geometry']) / 1e4, 1) if f.get('geometry') else None,
              'ha_urbana': round(u['ha'], 1) if u else None, 'areas_urbanas': u['n'] if u else 0,
              'normas_urbanas': dict(u['normas']) if u else {}}
os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
json.dump({'fuente': 'SNC, servicio WFS (snc:ly_dist, snc:ly_urba)', 'distritos': out}, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False)
print(len(out), 'distritos;', sum(1 for v in out.values() if v['ha_urbana']), 'con área urbana ->', SALIDA)
