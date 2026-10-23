import sys
import json
import os
import argparse
import geopandas as gpd
from shapely.geometry import mapping

# Carpeta nacional "PAIS" de la Fase 1 (1.Paraguay/01. Datos Oficiales DGEEC).
# Ruta absoluta derivada de la ubicacion de este script para no depender del
# cwd con el que el backend lo invoque.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PAIS_DIR = os.path.join(_REPO_ROOT, 'data', '1.Paraguay', '01. Datos Oficiales DGEEC', 'PAIS', 'PAÍS')
_SHP_BARRIOS = os.path.join(_PAIS_DIR, 'Barrios_Localidades_Paraguay.shp')
_SHP_DISTRITOS = os.path.join(_PAIS_DIR, 'Distritos_Paraguay.shp')
_SHP_MANZANAS = os.path.join(_PAIS_DIR, 'Manzanas_Paraguay.shp')

def identify(lat, lng, include_geom=True):
    pt = gpd.points_from_xy([lng], [lat], crs='EPSG:4674')
    # Bbox de búsqueda reducida para lectura espacial instantánea indexada (<20ms)
    box = (lng - 0.0005, lat - 0.0005, lng + 0.0005, lat + 0.0005)
    
    out = {
        'ok': True,
        'lat': lat,
        'lng': lng,
        'departamento': None,
        'cod_dpto': None,
        'distrito': None,
        'cod_dist': None,
        'barrio': None,
        'cod_barrio': None,
        'clave_censal': None,
        'manzana': None
    }

    try:
        # 1. Barrios y Localidades (cubre todo Paraguay)
        gdf_barrios = gpd.read_file(_SHP_BARRIOS, bbox=box)
        if not gdf_barrios.empty:
            match = gdf_barrios[gdf_barrios.intersects(pt[0])]
            if not match.empty:
                r = match.iloc[0]
                out['departamento'] = str(r.get('DPTO_DESC') or '').strip()
                out['cod_dpto'] = str(r.get('DPTO') or '').strip()
                out['distrito'] = str(r.get('DIST_DESC') or '').strip()
                out['cod_dist'] = str(r.get('DISTRITO') or '').strip()
                out['barrio'] = str(r.get('BARLO_DESC') or '').strip()
                out['cod_barrio'] = str(r.get('BAR_LOC') or '').strip()
                out['clave_censal'] = str(r.get('CLAVE') or '').strip()
                
                if include_geom and r.geometry is not None:
                    simp = r.geometry.simplify(0.0001, preserve_topology=True)
                    out['barrio_geometry'] = mapping(simp)
        
        # 2. Si no encontró en barrios, intentar con Distritos
        if not out['distrito']:
            gdf_dist = gpd.read_file(_SHP_DISTRITOS, bbox=box)
            if not gdf_dist.empty:
                m_dist = gdf_dist[gdf_dist.intersects(pt[0])]
                if not m_dist.empty:
                    rd = m_dist.iloc[0]
                    out['departamento'] = str(rd.get('DPTO_DESC') or '').strip()
                    out['cod_dpto'] = str(rd.get('DPTO') or '').strip()
                    out['distrito'] = str(rd.get('DIST_DESC') or '').strip()
                    out['cod_dist'] = str(rd.get('DISTRITO') or '').strip()
                    out['clave_censal'] = str(rd.get('CLAVE') or '').strip()
                    if include_geom and rd.geometry is not None:
                        simp = rd.geometry.simplify(0.0005, preserve_topology=True)
                        out['distrito_geometry'] = mapping(simp)

        # 3. Manzanas (para zonas urbanas)
        try:
            gdf_m = gpd.read_file(_SHP_MANZANAS, bbox=box)
            if not gdf_m.empty:
                m_match = gdf_m[gdf_m.intersects(pt[0])]
                if not m_match.empty:
                    rm = m_match.iloc[0]
                    out['manzana'] = str(rm.get('MANZANA') or '').strip()
        except Exception:
            pass

    except Exception as e:
        out['ok'] = False
        out['error'] = str(e)

    if out.get('departamento') and out['departamento'].upper() in ('ASUNCION', 'ASUNCIÓN', '00'):
        out['departamento'] = 'CAPITAL'

    return out

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--lat', type=float, required=True)
    parser.add_argument('--lng', type=float, required=True)
    parser.add_argument('--no-geom', action='store_true')
    args = parser.parse_args()

    res = identify(args.lat, args.lng, include_geom=not args.no_geom)
    print(json.dumps(res, ensure_ascii=False))
