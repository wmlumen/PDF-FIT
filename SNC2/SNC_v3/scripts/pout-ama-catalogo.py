"""Catálogo de los shapefiles de los POUT del Área Metropolitana (data/pout_ama/<Municipio>/...).
Lee solo encabezados (.shp tipo y recuadro, .dbf cantidad y campos, .prj sistema) y elimina duplicados por nombre y tamaño.
Salida: data/pout_ama/catalogo.json"""
import os, struct, json, re, hashlib
RAIZ = 'data/pout_ama'
TIPOS = {1: 'Punto', 3: 'Línea', 5: 'Polígono', 8: 'MultiPunto', 11: 'PuntoZ', 13: 'LíneaZ', 15: 'PolígonoZ', 21: 'PuntoM', 23: 'LíneaM', 25: 'PolígonoM'}
def dbf(p):
    try:
        with open(p, 'rb') as f:
            h = f.read(32); n = struct.unpack('<I', h[4:8])[0]; lh = struct.unpack('<H', h[8:10])[0]
            campos = []
            for _ in range((lh - 33) // 32):
                c = f.read(32)
                if not c or c[0] == 0x0D: break
                campos.append(c[:11].split(b'\0')[0].decode('latin-1'))
            return n, campos
    except Exception: return None, []
out, vistos = [], {}
for dp, dn, fn in os.walk(RAIZ):
    for f in fn:
        if not f.lower().endswith('.shp'): continue
        p = os.path.join(dp, f); base = p[:-4]
        try:
            with open(p, 'rb') as s: h = s.read(100)
            tipo = struct.unpack('<i', h[32:36])[0]; bbox = struct.unpack('<4d', h[36:68])
        except Exception: continue
        n, campos = dbf(base + '.dbf')
        prj = open(base + '.prj', encoding='latin-1').read() if os.path.exists(base + '.prj') else ''
        crs = 'UTM21S' if '21S' in prj or 'Zone_21S' in prj or ('UTM' in prj and '21' in prj) else 'WGS84' if 'GEOGCS' in prj and 'PROJCS' not in prj else ('desconocido' if not prj else prj[:40])
        municipio = os.path.relpath(p, RAIZ).split(os.sep)[0]
        clave = (municipio, f.lower(), os.path.getsize(p))
        if clave in vistos: vistos[clave]['copias'] += 1; continue
        rel = os.path.relpath(p, RAIZ).replace(os.sep, '/')
        nombre = f[:-4]
        tema = next((t for t, rx in [
            ('zonificacion', r'zonif|zonas?_|zona |uso.?suelo|usos'), ('vialidad', r'v[ií]a|vial|calle|circunval|jerarq|ruta|avenida'),
            ('expropiacion', r'expropi|afectaci'), ('ambiental', r'ambient|protecc|cauce|arroyo|humedal|verde|bosque|inund|franja'),
            ('limites', r'l[ií]mite|distrito|barrio|ejido|casco'), ('servicios', r'agua|alcantar|basura|recolec|reciclaj|energ|ande|cobertura'),
            ('equipamiento', r'escuel|educa|salud|plaza|equipam|hospital|comisar'), ('social', r'asentam|vulnerab|densidad|poblaci|censo|vivienda'),
            ('economia', r'industr|comerc|log[ií]st'), ('transporte', r'transporte|bus|parada|bici|movilid')]
            if re.search(rx, (nombre + ' ' + rel).lower())), 'otros')
        r = {'municipio': municipio, 'ruta': rel, 'nombre': nombre, 'tema': tema, 'geometria': TIPOS.get(tipo, str(tipo)), 'elementos': n,
             'campos': campos, 'crs': crs, 'recuadro': [round(v, 1) for v in bbox], 'mb': round(os.path.getsize(p) / 1e6, 2), 'copias': 1}
        vistos[clave] = r; out.append(r)
out.sort(key=lambda r: (r['municipio'], r['tema'], r['nombre']))
json.dump({'capas': out}, open(os.path.join(RAIZ, 'catalogo.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
from collections import Counter
print('capas únicas', len(out), 'de', sum(r['copias'] for r in out), 'archivos')
print(Counter(r['municipio'] for r in out)); print(Counter(r['tema'] for r in out)); print(Counter(r['crs'] for r in out).most_common(5))
for m in sorted({r['municipio'] for r in out}):
    print(m, '→', [ (r['nombre'], r['elementos'], r['campos'][:6]) for r in out if r['municipio'] == m and r['tema'] == 'zonificacion'][:6])
