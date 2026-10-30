"""
Geometría simplificada de distritos y departamentos para los mapas del análisis territorial.
Fuente: servicio WFS del SNC (snc:ly_dist, snc:ly_dpto) en EPSG:32721 (UTM 21S).
Salida: data/snc_estadisticas/mapa_distritos.json con trazados SVG ya proyectados
(1 unidad = 100 m, eje y invertido), simplificados con Douglas-Peucker.
Uso: python3 scripts/snc-mapa.py
"""
import json, os, sys, urllib.request
sys.setrecursionlimit(50000)
URL = 'https://www.catastro.gov.py/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:32721&typeNames=snc:'
SALIDA = os.path.join(os.path.dirname(__file__), '..', 'data', 'snc_estadisticas', 'mapa_distritos.json')
TOL = 250.0     # metros
ESC = 100.0     # metros por unidad SVG

def bajar(capa):
    req = urllib.request.Request(URL + capa, headers={'User-Agent': 'CatastroPYPro/3 (SNC v3)'})
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.load(r)

def dp(pts, tol):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = (dx * dx + dy * dy) ** 0.5 or 1e-9
    imax, dmax = 0, -1
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L
        if d > dmax: imax, dmax = i, d
    if dmax > tol: return dp(pts[:imax + 1], tol)[:-1] + dp(pts[imax:], tol)
    return [pts[0], pts[-1]]

limites = [1e18, 1e18, -1e18, -1e18]
def trazado(g):
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    partes = []
    for p in polys:
        for anillo in p[:1]:   # solo el borde exterior
            pts = [tuple(c[:2]) for c in anillo]
            # Anillo cerrado: se parte en el punto más lejano al inicio y se simplifica cada mitad.
            lejos = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
            r = dp(pts[:lejos + 1], TOL)[:-1] + dp(pts[lejos:], TOL)
            if len(r) < 4: continue
            for x, y in r:
                limites[0] = min(limites[0], x); limites[1] = min(limites[1], y); limites[2] = max(limites[2], x); limites[3] = max(limites[3], y)
            partes.append(r)
    return partes

dist = {}
for f in bajar('ly_dist')['features']:
    p = f['properties']
    if f.get('geometry'): dist[f"{p['cod_dpto']}|{int(p['cod_dist'])}"] = trazado(f['geometry'])
dpto = {}
for f in bajar('ly_dpto')['features']:
    p = f['properties']
    cod = p.get('cod_dpto') or p.get('dpto') or p.get('codigo')
    if f.get('geometry') and cod: dpto[str(cod)] = trazado(f['geometry'])
x0, y1 = limites[0], limites[3]
def svg(partes):
    out = []
    for r in partes:
        pts = [(round((x - x0) / ESC), round((y1 - y) / ESC)) for x, y in r]
        out.append('M' + 'L'.join(f'{a},{b}' for a, b in pts) + 'Z')
    return ''.join(out)
def caja(partes):
    xs = [round((x - x0) / ESC) for r in partes for x, _ in r]; ys = [round((y1 - y) / ESC) for r in partes for _, y in r]
    return [min(xs), min(ys), max(xs), max(ys)] if xs else None
res = {'fuente': 'SNC, servicio WFS (snc:ly_dist, snc:ly_dpto), EPSG:32721', 'escala_m': ESC, 'origen': [round(x0), round(y1)],
       'ancho': round((limites[2] - limites[0]) / ESC), 'alto': round((limites[3] - limites[1]) / ESC),
       'distritos': {k: {'d': svg(v), 'caja': caja(v)} for k, v in dist.items()},
       'departamentos': {k: {'d': svg(v), 'caja': caja(v)} for k, v in dpto.items()}}
os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
json.dump(res, open(SALIDA, 'w', encoding='utf-8'), separators=(',', ':'))
print(len(res['distritos']), 'distritos,', len(res['departamentos']), 'departamentos ->', SALIDA, os.path.getsize(SALIDA) // 1024, 'KB')
