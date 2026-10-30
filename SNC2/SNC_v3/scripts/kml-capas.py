"""Convierte un KML (p. ej. Google My Maps: /maps/d/kml?mid=<id>&forcekml=1) en un GeoJSON por carpeta, con nombre,
descripción, atributos (ExtendedData) y el color de su estilo. Agrega las capas a <salida>/capas.json (mismo formato que arcgis-capas.py).
Uso: python3 scripts/kml-capas.py <archivo.kml> <carpeta salida> [prefijo]"""
import json, os, re, sys, unicodedata, html
import xml.etree.ElementTree as ET
KML, OUT = sys.argv[1], sys.argv[2]; PRE = sys.argv[3] if len(sys.argv) > 3 else 'kml_'
N = '{http://www.opengis.net/kml/2.2}'
raiz = ET.parse(KML).getroot(); doc = raiz.find(f'{N}Document')
slug = lambda t: re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()).strip('_') or 'capa'
abgr = lambda c: f'#{c[6:8]}{c[4:6]}{c[2:4]}' if c and len(c) == 8 else None   # KML: aabbggrr
estilos = {}
for s in doc.iter(f'{N}Style'):
    col = {}
    for k, tag in (('linea', 'LineStyle'), ('relleno', 'PolyStyle'), ('icono', 'IconStyle')):
        e = s.find(f'{N}{tag}/{N}color')
        if e is not None: col[k] = abgr(e.text.strip())
    estilos[s.get('id')] = col
for sm in doc.iter(f'{N}StyleMap'):
    par = sm.find(f'{N}Pair/{N}styleUrl')
    if par is not None: estilos[sm.get('id')] = estilos.get(par.text.strip().lstrip('#'), {})
coords = lambda t: [[float(x) for x in c.split(',')[:2]] for c in t.split()]
def geom(pm):
    gs = []
    for p in pm.iter(f'{N}Point'): gs.append({'type': 'Point', 'coordinates': coords(p.find(f'{N}coordinates').text)[0]})
    for l in pm.iter(f'{N}LineString'): gs.append({'type': 'LineString', 'coordinates': coords(l.find(f'{N}coordinates').text)})
    for p in pm.iter(f'{N}Polygon'):
        anillos = [coords(p.find(f'{N}outerBoundaryIs/{N}LinearRing/{N}coordinates').text)] + [coords(i.find(f'{N}LinearRing/{N}coordinates').text) for i in p.findall(f'{N}innerBoundaryIs')]
        gs.append({'type': 'Polygon', 'coordinates': anillos})
    return gs[0] if len(gs) == 1 else {'type': 'GeometryCollection', 'geometries': gs} if gs else None
os.makedirs(OUT, exist_ok=True)
fcap = os.path.join(OUT, 'capas.json')
meta = json.load(open(fcap, encoding='utf8')) if os.path.exists(fcap) else {'capas': []}
meta['capas'] = [c for c in meta['capas'] if not c['archivo'].startswith(PRE)]
for carpeta in doc.findall(f'{N}Folder'):
    nombre = (carpeta.findtext(f'{N}name') or 'Capa').strip(); feats = []
    for pm in carpeta.iter(f'{N}Placemark'):
        g = geom(pm)
        if not g: continue
        pr = {'nombre': (pm.findtext(f'{N}name') or '').strip()}
        for d in pm.iter(f'{N}Data'): pr[d.get('name')] = (d.findtext(f'{N}value') or '').strip()
        desc = pm.findtext(f'{N}description')
        if desc and 'description' not in pr:
            # Tablas exportadas a My Maps: «CAMPO   valor<br>CAMPO   valor» → una columna por campo.
            partes = [re.sub(r'<[^>]+>', ' ', x).strip() for x in re.split(r'<br\s*/?>', html.unescape(desc), flags=re.I)]
            pares = [re.match(r'^([A-Za-z_][\w]*)\s{2,}(.*)$', x) or re.match(r'^([A-Za-z_][\w]*)$', x) for x in partes if x]
            if len(pares) >= 3 and sum(1 for m in pares if m) >= 0.8 * len(pares):
                for m in pares:
                    if m: pr.setdefault(m.group(1), (m.group(2) if m.lastindex and m.lastindex >= 2 else '').strip())
            else: pr['descripcion'] = ' '.join(x for x in partes if x)
        est = estilos.get((pm.findtext(f'{N}styleUrl') or '').lstrip('#'), {})
        pr['color'] = est.get('relleno') or est.get('linea') or est.get('icono')
        feats.append({'type': 'Feature', 'geometry': g, 'properties': pr})
    if not feats: continue
    archivo = f'{PRE}{slug(nombre)}.geojson'
    json.dump({'type': 'FeatureCollection', 'name': nombre, 'features': feats}, open(os.path.join(OUT, archivo), 'w', encoding='utf8'), ensure_ascii=False)
    campos = list(dict.fromkeys(k for f in feats for k in f['properties']))
    tipos = {f['geometry']['type'] for f in feats}
    geo = 'Point' if tipos == {'Point'} else 'Polyline' if tipos <= {'LineString'} else 'Polygon' if tipos <= {'Polygon'} else 'Mixta'
    meta['capas'].append({'capa': f'{nombre} (Google My Maps)', 'archivo': archivo, 'geometria': geo, 'cantidad': len(feats), 'campos': [{'nombre': c, 'alias': c, 'tipo': 'String'} for c in campos], 'fuente': os.path.basename(KML)})
    print(nombre, len(feats), geo)
json.dump(meta, open(fcap, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
