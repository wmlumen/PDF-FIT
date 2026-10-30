"""Descarga las capas de un FeatureServer público de ArcGIS a GeoJSON (WGS84), por páginas, con todos sus atributos
salvo los de datos personales (propietario). Uso: python3 scripts/arcgis-capas.py <URL FeatureServer> <carpeta salida>
Escribe un .geojson por capa y capas.json (nombre, geometría, cantidad, campos)."""
import json, os, re, sys, unicodedata, urllib.parse, urllib.request
URL, OUT = sys.argv[1].rstrip('/'), sys.argv[2]
PRIVADOS = {'propiet', 'propietario', 'propietari', 'nombre_pro', 'ci', 'cedula', 'ruc', 'telefono', 'director1', 'docente1'}
os.makedirs(OUT, exist_ok=True)
get = lambda u: json.load(urllib.request.urlopen(u, timeout=120))
slug = lambda t: re.sub(r'[^a-z0-9]+', '_', unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()).strip('_')
srv, resumen = get(f'{URL}?f=json'), []
for l in srv.get('layers', []):
    meta = get(f"{URL}/{l['id']}?f=json"); paso = meta.get('maxRecordCount') or 1000; feats = []
    while True:
        q = urllib.parse.urlencode({'where': '1=1', 'outFields': '*', 'outSR': 4326, 'f': 'geojson', 'resultOffset': len(feats), 'resultRecordCount': paso})
        lote = get(f"{URL}/{l['id']}/query?{q}").get('features', [])
        feats += lote
        if len(lote) < paso: break
    for f in feats: f['properties'] = {k: v for k, v in (f.get('properties') or {}).items() if k.lower() not in PRIVADOS}
    nombre = slug(l['name'])
    json.dump({'type': 'FeatureCollection', 'name': l['name'], 'features': feats}, open(os.path.join(OUT, f'{nombre}.geojson'), 'w', encoding='utf8'), ensure_ascii=False)
    campos = [{'nombre': c['name'], 'alias': c.get('alias'), 'tipo': c['type'].replace('esriFieldType', '')} for c in meta.get('fields', []) if c['name'].lower() not in PRIVADOS]
    resumen.append({'id': l['id'], 'capa': l['name'], 'archivo': f'{nombre}.geojson', 'geometria': meta.get('geometryType', '').replace('esriGeometry', ''), 'cantidad': len(feats), 'campos': campos})
    print(l['id'], l['name'], len(feats))
json.dump({'fuente': URL, 'capas': resumen}, open(os.path.join(OUT, 'capas.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
