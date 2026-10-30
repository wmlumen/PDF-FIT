"""Carga en snc.sqlite → zonas_pout los polígonos POUT de los municipios del AMA que faltan (Capiatá ya estaba,
cargado por scripts/import-pout-zonas.mjs). Misma regla que ese importador: el código del catálogo de 13 zonas
(usos_suelo) se asigna solo si el nombre corresponde con certeza; si no, codigo_zona = NULL.
Fuente: data/pout_ama/zonificacion_ama.geojson (scripts/pout-ama.py)."""
import json, sqlite3, uuid, re, unicodedata
norm = lambda t: re.sub(r'\s+', ' ', unicodedata.normalize('NFD', str(t)).encode('ascii', 'ignore').decode().lower()).strip()
def codigo(nombre):
    z = re.sub(r'^zona (de |del )?', '', norm(nombre))
    exactos = {'residencial media': 'ZRM', 'residencial baja': 'ZRB1', 'residencial baja 1': 'ZRB1', 'mixta alta 1': 'ZMA1', 'mixta alta 2': 'ZMA2',
               'mixta media': 'ZMM', 'mixta baja': 'ZMB', 'mixta y logistica': 'ZML', 'industrial tecnologica': 'ZIT', 'costera rio py': 'ZBC'}
    return exactos.get(z)
Z = json.load(open('data/pout_ama/zonificacion_ama.geojson', encoding='utf8'))['features']
c = sqlite3.connect('data/snc.sqlite')
ya = {r[0] for r in c.execute('select distinct municipio from zonas_pout')}
filas, conCodigo, porMun = [], 0, {}
for f in Z:
    p = f['properties']; mun = norm(p['municipio'])
    if mun in ya: continue
    cod = codigo(p['zona']); conCodigo += bool(cod); porMun[mun] = porMun.get(mun, 0) + 1
    filas.append((str(uuid.uuid4()), mun, cod, p['zona'], json.dumps({'type': 'Feature', 'geometry': f['geometry'], 'properties': {'zona': p['zona'], 'categoria': p.get('categoria'), 'manzana': p.get('manzana')}}, ensure_ascii=False),
                  f"Shapefile POUT {p['municipio']} (PY-IA/SIG, oct-2026)"))
c.executemany('INSERT INTO zonas_pout (id, municipio, codigo_zona, nombre_zona_fuente, geojson, fuente) VALUES (?,?,?,?,?,?)', filas)
c.commit()
print('insertados', len(filas), 'con código del catálogo', conCodigo, porMun)
print(c.execute('select municipio, count(*), sum(codigo_zona is not null) from zonas_pout group by 1').fetchall())
