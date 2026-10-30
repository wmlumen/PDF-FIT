import urllib.request
import json
import os
import sys
from pyproj import Transformer

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def area_anillo(r):
    a = 0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i + 1][1]
    return abs(a) / 2.0

def calcular_sup_utm(geom):
    if not geom:
        return 0
    gtype = geom.get('type')
    coords = geom.get('coordinates', [])
    pols = [coords] if gtype == 'Polygon' else coords if gtype == 'MultiPolygon' else []
    total = 0.0
    for p in pols:
        if not p: continue
        ext = area_anillo(p[0])
        huecos = sum(area_anillo(h) for h in p[1:]) if len(p) > 1 else 0
        total += (ext - huecos)
    return total

def main():
    url = "https://www.catastro.gov.py/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=snc:ly_urba&count=1000&outputFormat=application/json"
    print("Descargando capa oficial 'snc:ly_urba' del GeoServer de Catastro...")
    
    req = urllib.request.Request(url, headers={'User-Agent': 'CatastroPYPro/3'})
    with urllib.request.urlopen(req, timeout=60) as res:
        raw_json = res.read().decode('utf-8')
        data = json.loads(raw_json)

    features = data.get('features', [])
    print(f"Total entidades descargadas: {len(features)}")
    
    # Transformer de UTM 21S (EPSG:32721) a WGS84 (EPSG:4326)
    trans = Transformer.from_crs("EPSG:32721", "EPSG:4326", always_xy=True)

    def reproject_coords(c):
        if isinstance(c[0], (int, float)):
            lon, lat = trans.transform(c[0], c[1])
            return [round(lon, 6), round(lat, 6)]
        return [reproject_coords(sub) for sub in c]

    # Analizar si hay mención de suburbano o zonas
    menciones_suburbano = []
    
    wgs84_features = []
    for f in features:
        props = f.get('properties', {})
        geom = f.get('geometry')
        
        sup_m2 = calcular_sup_utm(geom)
        sup_ha = round(sup_m2 / 10000.0, 2)
        sup_km2 = round(sup_m2 / 1000000.0, 4)
        
        props['superficie_calculada_m2'] = round(sup_m2, 1)
        props['superficie_ha'] = sup_ha
        props['superficie_km2'] = sup_km2
        
        # Check text
        todo_texto = f"{props.get('distrito', '')} {props.get('situacion', '')} {props.get('obs', '')}".lower()
        if 'sub' in todo_texto or 'trans' in todo_texto or 'expans' in todo_texto:
            menciones_suburbano.append({
                'id': props.get('id'),
                'dpto': props.get('dpto'),
                'dist': props.get('dist'),
                'distrito': props.get('distrito'),
                'situacion': props.get('situacion'),
                'obs': props.get('obs')
            })
            
        geom_wgs84 = None
        if geom and geom.get('coordinates'):
            geom_wgs84 = {
                'type': geom['type'],
                'coordinates': reproject_coords(geom['coordinates'])
            }
            
        wgs84_features.append({
            'type': 'Feature',
            'id': f.get('id'),
            'properties': props,
            'geometry': geom_wgs84
        })

    # Guardar en data/
    out_dir = os.path.join('data', 'snc_estadisticas')
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Guardar copia WGS84 para visor web y análisis
    out_wgs84 = os.path.join('data', 'casco_urbano_snc.geojson')
    with open(out_wgs84, 'w', encoding='utf-8') as f:
        json.dump({'type': 'FeatureCollection', 'name': 'CASCO_URBANO_SNC', 'features': wgs84_features}, f, ensure_ascii=False)
    print(f"[OK] Guardado GeoJSON WGS84: {out_wgs84} ({len(wgs84_features)} polígonos, {os.path.getsize(out_wgs84)/(1024*1024):.2f} MB)")

    # 2. Guardar copia nativa UTM 21S original
    out_utm = os.path.join(out_dir, 'ly_urba_snc_utm21s.geojson')
    with open(out_utm, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print(f"[OK] Guardado GeoJSON UTM 21S nativo: {out_utm} ({os.path.getsize(out_utm)/(1024*1024):.2f} MB)")

    print(f"\nPolígonos con menciones de zona suburbana/expansión/transición: {len(menciones_suburbano)}")
    for m in menciones_suburbano[:10]:
        print(f"  - [{m['dpto']}{m['dist']}] {m['distrito']}: situacion='{m['situacion']}' | obs='{m['obs']}'")

if __name__ == '__main__':
    main()
