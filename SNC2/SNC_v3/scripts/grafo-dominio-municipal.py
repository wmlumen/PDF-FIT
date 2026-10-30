"""Agrega al grafo de dominio (graphify-out/grafo_dominio.json) los endpoints, tablas, páginas y datasets de
Gestión municipal, Ciudadano, Plataforma, Parcelario y Edificios/Usos OSM. Idempotente: reemplaza solo sus nodos/aristas
(datos.origen == 'grafo-dominio-municipal'). Uso: python scripts/grafo-dominio-municipal.py"""
import json, re, shutil, datetime, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
G = R / 'graphify-out' / 'grafo_dominio.json'
ORIGEN = 'grafo-dominio-municipal'
g = json.loads(G.read_text(encoding='utf8'))
shutil.copy(G, G.with_name(f'grafo_dominio.json.bak_{datetime.datetime.now():%Y%m%d_%H%M%S}'))
g['nodos'] = [n for n in g['nodos'] if n.get('datos', {}).get('origen') != ORIGEN]
g['aristas'] = [a for a in g['aristas'] if a.get('origen') != ORIGEN]
ids = {n['id'] for n in g['nodos']}
nodos, aristas = [], []
def nodo(id, tipo, nombre, archivo, linea=0, **datos):
    if id in ids: return
    ids.add(id); nodos.append({'id': id, 'tipo': tipo, 'nombre': nombre, 'archivo': archivo, 'linea': linea, 'datos': {**datos, 'origen': ORIGEN}})
def arista(s, t, tipo, d=''):
    aristas.append({'source': s, 'target': t, 'tipo': tipo, 'descripcion': d, 'origen': ORIGEN})

# Tablas propias (SQLite)
TABLAS = {'gestionMunicipalServicio.js': 'data/gestion_municipal.sqlite', 'ciudadanoServicio.js': 'data/ciudadano.sqlite',
          'plataformaServicio.js': 'data/plataforma.sqlite', 'edificiosServicio.js': 'data/edificios/relevamientos.sqlite'}
tabla_de = {}
for mod, db in TABLAS.items():
    src = (R / mod).read_text(encoding='utf8')
    for m in re.finditer(r'CREATE TABLE IF NOT EXISTS (\w+) \(([^`]*?)\)`', src):
        cols = [c.strip().split()[0] for c in m.group(2).split(',') if c.strip() and not c.strip().upper().startswith(('PRIMARY', 'UNIQUE', 'FOREIGN'))]
        nodo(f'tabla:{m.group(1)}@{db}', 'tabla', m.group(1), db, 0, columnas=cols, modulo=mod)
        tabla_de.setdefault(mod, []).append(f'tabla:{m.group(1)}@{db}')

# Datasets (archivos de datos que alimentan los servicios)
DATASETS = [
    ('data/osm/usos_py.json', 'Usos OSM por sector (comercio, salud, educación…) con cuenta DNIT', 'gestionMunicipalServicio.js', 'scripts/osm-usos.mjs'),
    ('data/osm/residencial/', 'Zonas residenciales OSM con barrio, Cta. Cte. y padrones', 'gestionMunicipalServicio.js', 'scripts/osm-residencial.mjs'),
    ('data/osm/edificios_py.fgb', 'Edificios OSM de todo el país', 'edificiosServicio.js', 'data/osm/extraer.cmd'),
    ('data/parcelario/', 'Parcelario SNC por distrito vinculado a cuentas DNIT', 'parcelarioLocal.js', 'scripts/snc-parcelario-pais.mjs'),
    ('data/mades_pout/', 'Documentos de Planificación (POUT) del MADES', 'gestionMunicipalServicio.js', ''),
    ('data/dnit_cuentas.sqlite', 'Liquidación del Impuesto Inmobiliario DNIT', 'dnitServicio.js', 'scripts/dnit-cuentas.mjs'),
]
for ruta, desc, mod, gen in DATASETS:
    nodo(f'dataset:{ruta}', 'tabla', desc, ruta, 0, tipo_dato='archivo', generador=gen)
    nodo(f'modulo:{mod}', 'clase', mod, mod)
    arista(f'modulo:{mod}', f'dataset:{ruta}', 'usa', 'lee')
    if gen: nodo(f'modulo:{gen}', 'clase', gen, gen); arista(f'modulo:{gen}', f'dataset:{ruta}', 'implementa', 'genera')
for mod, ts in tabla_de.items():
    nodo(f'modulo:{mod}', 'clase', mod, mod)
    for t in ts: arista(f'modulo:{mod}', t, 'usa', 'lee/escribe')
arista('dataset:data/osm/usos_py.json', 'dataset:data/parcelario/', 'fk', 'punto en parcela → Cta. Cte./padrón')
arista('dataset:data/osm/residencial/', 'dataset:data/parcelario/', 'fk', 'parcelas dentro de la zona')
arista('dataset:data/parcelario/', 'dataset:data/dnit_cuentas.sqlite', 'fk', 'Cta. Cte./padrón')

# Endpoints y páginas de server-api.js
SERVICIO = {'gestion': 'gestionMunicipalServicio.js', 'ciudadano': 'ciudadanoServicio.js', 'plataforma': 'plataformaServicio.js', 'dnit': 'dnitServicio.js',
            'parcelario': 'parcelarioLocal.js', 'edificios': 'edificiosServicio.js', 'municipio': 'municipioServicio.js'}
PREF = re.compile(r"app\.(get|post|put|delete)\('(/api/v3/(?:gestion|ciudadano/(?:vincular|verificar|baja)'|plataforma|mi-acceso|mi-cliente|municipio|parcelario|edificios|relevamientos)[^']*|/municipal/[^']+\.html|/admin/plataforma\.html)")
for i, linea in enumerate((R / 'server-api.js').read_text(encoding='utf8').splitlines(), 1):
    m = PREF.search(linea)
    if not m: continue
    metodo, ruta = m.group(1).upper(), m.group(2).rstrip("'")
    if ruta.endswith('.html'):
        nodo(f'pagina:{ruta}', 'pagina', ruta.split('/')[-1], ruta.lstrip('/')); continue
    id = f'api:{metodo}:{ruta}'
    nodo(id, 'endpoint', f'{metodo} {ruta}', 'server-api.js', i, metodo=metodo, ruta=ruta, auth='authMiddleware' in linea,
         admin='adminMiddleware' in linea, ambito_distrito='enSuDistrito' in linea)
    for k, mod in SERVICIO.items():
        if re.search(rf'\b{k}\.\w+\(', linea): nodo(f'modulo:{mod}', 'clase', mod, mod); arista(id, f'modulo:{mod}', 'usa')
    arista(id, 'rol:publico' if 'authMiddleware' not in linea else 'rol:admin' if 'adminMiddleware' in linea else 'rol:municipal', 'sirve_a')
nodo('rol:municipal', 'rol', 'municipal', '')
nodo('rol:admin', 'rol', 'admin', '')
# Páginas → endpoints que consumen (por fetch en su JS)
PAGINAS = {'/municipal/gestion.html': 'js/gestionMunicipal.js', '/municipal/informe-lote.html': 'js/informeLote.js',
           '/municipal/admin.html': 'js/municipioAdmin.js', '/admin/plataforma.html': 'js/plataformaAdmin.js'}
eps = [n for n in nodos if n['tipo'] == 'endpoint']
for pag, js in PAGINAS.items():
    f = R / js
    if not f.exists(): continue
    src = f.read_text(encoding='utf8')
    for e in eps:
        base = re.sub(r'/:\w+.*$', '', e['datos']['ruta'])
        if base in src: arista(f'pagina:{pag}', e['id'], 'consumo', js)

g['nodos'] += nodos; g['aristas'] += aristas
G.write_text(json.dumps(g, ensure_ascii=False, indent=2), encoding='utf8')
print(f'nodos agregados: {len(nodos)} · aristas: {len(aristas)} · total {len(g["nodos"])} nodos / {len(g["aristas"])} aristas')
