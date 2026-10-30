"""POUT del Área Metropolitana: zonificación unificada y afectaciones en WGS84.
Fuente: data/pout_ama/<Municipio>/... (shapefiles de los POUT; ver catalogo.json).
Salidas: data/pout_ama/zonificacion_ama.geojson, data/pout_ama/afectaciones_ama.geojson, data/pout_ama/zonas_ama.json"""
import json, os, re, subprocess, tempfile, glob
from collections import defaultdict
RAIZ = 'data/pout_ama'
OGR = r'C:\Program Files\QGIS 3.44.15\bin\ogr2ogr.exe'
WIN = lambda p: subprocess.check_output(['wslpath', '-w', os.path.abspath(p)]).decode().strip()
ZONIF = {  # municipio: (ruta relativa del shp, campo código, campo nombre)
  'Capiatá': ('CAPIATA_Zonificacion', 'Zonif', None), 'Luque': ('LUQUE_Zonificacion', 'Zonif', None),
  'Limpio': ('Zonificacion_LIM', 'Zonas POUT', None), 'Mariano Roque Alonso': ('Zonificación_MRA', 'Zonas POUT', None),
  'Lambaré': ('LAMBARE_Zonas de Uso de Suelo Urbano', 'Zona_COD', 'Zona_NOM'), 'Villa Elisa': ('VILLA ELISA_Zonas de Uso de Suelo Urbano', 'Zona_COD', 'Zona_NOM'),
  'San Lorenzo': ('POUT SLO_Usos suelo general_Rev MSLO', 'ZONA_POUT', None), 'Fernando de la Mora': ('POUT_FdM', 'USO', None)}
AFECT = [  # (regex sobre el nombre de la capa, tipo de afectación)
  (r'expropi', 'Vía a expropiar'), (r'franja.*220|220.?kv', 'Franja de línea de alta tensión (220 kV)'), (r'zonas? de protecci|protecci.n.*cauce|zona_protecci', 'Zona de protección ambiental'),
  (r'naciente', 'Protección de nacientes'), (r'riesgo.*inund|inundac', 'Riesgo de inundación'), (r'zona.?recarga', 'Zona de recarga de acuífero'), (r'cauces? h[ií]dric', 'Cauce hídrico'),
  (r'zonas de seguridad', 'Zona de seguridad')]
cat = json.load(open(f'{RAIZ}/catalogo.json', encoding='utf8'))['capas']
def a_geojson(rel):
    src = f'{RAIZ}/{rel}'
    tmp = tempfile.NamedTemporaryFile(suffix='.geojson', delete=False, dir='/tmp'); tmp.close(); os.remove(tmp.name)
    out = '/mnt/c/Users/HP 250 G10/AppData/Local/Temp/pout_' + os.path.basename(tmp.name)
    subprocess.run([ '/mnt/c/Program Files/QGIS 3.44.15/bin/ogr2ogr.exe', '-f', 'GeoJSON', '-t_srs', 'EPSG:4326', '-lco', 'COORDINATE_PRECISION=6',
                     '-makevalid', WIN(out), WIN(src)], check=True, capture_output=True,
                   env={**os.environ, 'PROJ_LIB': r'C:\Program Files\QGIS 3.44.15\share\proj', 'WSLENV': 'PROJ_LIB/w'})
    d = json.load(open(out, encoding='utf8', errors='replace')); os.remove(out); return d['features']
def txt(v):
    if v is None: return None
    s = str(v).strip()
    try: s = s.encode('latin-1').decode('utf8')   # dbf UTF-8 leídos como latin-1 (Ã±)
    except Exception: pass
    return s or None
zonas, resumen = [], defaultdict(lambda: defaultdict(lambda: {'manzanas': 0}))
for mun, (nombre, cc, cn) in ZONIF.items():
    capa = next(r for r in cat if r['municipio'] == mun and r['nombre'] == nombre)
    for f in a_geojson(capa['ruta']):
        if not f.get('geometry'): continue
        p = f['properties']; cod = txt(p.get(cc)); nom = txt(p.get(cn)) if cn else None
        if not cod and not nom: continue
        z = {'municipio': mun, 'zona_cod': cod or nom, 'zona': nom or cod, 'manzana': txt(p.get('MANZANA') or p.get('Manz_COD')), 'barrio': txt(p.get('BARLO_DESC')), 'obs': txt(p.get('Zona_OBS'))}
        zonas.append({'type': 'Feature', 'geometry': f['geometry'], 'properties': {k: v for k, v in z.items() if v}})
        resumen[mun][z['zona']]['manzanas'] += 1
    print(mun, sum(1 for z in zonas if z['properties']['municipio'] == mun), 'polígonos de zona')
json.dump({'type': 'FeatureCollection', 'name': 'zonificacion_ama', 'features': zonas}, open(f'{RAIZ}/zonificacion_ama.geojson', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
afect = []
for r in cat:
    tipo = next((t for rx, t in AFECT if re.search(rx, r['nombre'].lower())), None)
    if not tipo or not r['elementos'] or r['elementos'] > 20000: continue
    try: fs = a_geojson(r['ruta'])
    except Exception as e: print('  sin convertir', r['nombre']); continue
    for f in fs:
        if f.get('geometry'):
            afect.append({'type': 'Feature', 'geometry': f['geometry'], 'properties': {'municipio': r['municipio'], 'tipo': tipo, 'capa': r['nombre']}})
# Afectaciones repetidas entre municipios (la misma capa regional copiada): se deja una sola por geometría
vistas, unicas = set(), []
for f in afect:
    k = (f['properties']['tipo'], json.dumps(f['geometry'])[:200])
    if k in vistas: continue
    vistas.add(k); unicas.append(f)
json.dump({'type': 'FeatureCollection', 'name': 'afectaciones_ama', 'features': unicas}, open(f'{RAIZ}/afectaciones_ama.geojson', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
json.dump({m: dict(v) for m, v in resumen.items()}, open(f'{RAIZ}/zonas_ama.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
from collections import Counter
print('afectaciones', len(unicas), Counter(f['properties']['tipo'] for f in unicas))
for m, v in resumen.items(): print(m, len(v), 'zonas:', list(v)[:12])
