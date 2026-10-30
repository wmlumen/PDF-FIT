#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte las capas oficiales de Barrios y Manzanas (DGEEC / INE) a GeoJSON optimizado.
- data/barrios_asuncion_central_light.geojson
- data/manzanas_asuncion_light.geojson
"""
import os
import sys
import json
import geopandas as gpd
from shapely.geometry import mapping

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def round_coords(geom_dict, precision=5):
    if not geom_dict:
        return None
    def _round(coords):
        if isinstance(coords[0], (int, float)):
            return [round(c, precision) for c in coords]
        return [_round(c) for c in coords]
    
    new_geom = dict(geom_dict)
    new_geom['coordinates'] = _round(geom_dict['coordinates'])
    return new_geom

def convert_barrios():
    print("=== Procesando Barrios (Asuncion + Central) ===")
    p_asu = os.path.join('data', '1.Paraguay', '01. Datos Oficiales DGEEC', '00 ASUNCIÓN', 'Barrios_Localidades_Asuncion.shp')
    p_cen = os.path.join('data', '1.Paraguay', '01. Datos Oficiales DGEEC', '11 CENTRAL', 'Barrios_Localidades_Central.shp')
    
    gdf_asu = gpd.read_file(p_asu)
    gdf_cen = gpd.read_file(p_cen)
    
    gdf = gpd.GeoDataFrame(gpd.pd.concat([gdf_asu, gdf_cen], ignore_index=True))
    if gdf.crs != 'EPSG:4326':
        gdf = gdf.to_crs('EPSG:4326')
    
    # Simplificación geométrica suave para navegación web fluida
    gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.0001, preserve_topology=True)
    
    features = []
    for idx, row in gdf.iterrows():
        g = row['geometry']
        if g is None or g.is_empty:
            continue
        g_json = round_coords(mapping(g), precision=5)
        
        props = {
            'dpto': str(row.get('DPTO', '')).strip(),
            'distrito': str(row.get('DISTRITO', '')).strip(),
            'dpto_desc': str(row.get('DPTO_DESC', '')).strip(),
            'dist_desc': str(row.get('DIST_DESC', '')).strip(),
            'barrio': str(row.get('BARLO_DESC', '')).strip(),
            'clave': str(row.get('CLAVE', '')).strip()
        }
        features.append({
            'type': 'Feature',
            'properties': props,
            'geometry': g_json
        })
        
    fc = {
        'type': 'FeatureCollection',
        'name': 'BARRIOS_ASUNCION_CENTRAL',
        'features': features
    }
    
    out_path = os.path.join('data', 'barrios_asuncion_central_light.geojson')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False)
        
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[OK] Generado: {out_path} ({len(features)} barrios, {size_mb:.2f} MB)")

def convert_manzanas_asuncion():
    print("\n=== Procesando Manzanas (Asuncion) ===")
    p_asu = os.path.join('data', '1.Paraguay', '01. Datos Oficiales DGEEC', '00 ASUNCIÓN', 'Manzanas_Asuncion.shp')
    gdf = gpd.read_file(p_asu)
    if gdf.crs != 'EPSG:4326':
        gdf = gdf.to_crs('EPSG:4326')
        
    gdf['geometry'] = gdf['geometry'].simplify(tolerance=0.00004, preserve_topology=True)
    
    features = []
    for idx, row in gdf.iterrows():
        g = row['geometry']
        if g is None or g.is_empty:
            continue
        g_json = round_coords(mapping(g), precision=5)
        
        props = {
            'dpto': str(row.get('DPTO', '')).strip(),
            'distrito': str(row.get('DISTRITO', '')).strip(),
            'barrio': str(row.get('BARLO_DESC', '')).strip(),
            'manzana': str(row.get('MANZANA', '')).strip(),
            'clave': str(row.get('CLAVE', '')).strip()
        }
        features.append({
            'type': 'Feature',
            'properties': props,
            'geometry': g_json
        })
        
    fc = {
        'type': 'FeatureCollection',
        'name': 'MANZANAS_ASUNCION',
        'features': features
    }
    
    out_path = os.path.join('data', 'manzanas_asuncion_light.geojson')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False)
        
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[OK] Generado: {out_path} ({len(features)} manzanas, {size_mb:.2f} MB)")

if __name__ == '__main__':
    convert_barrios()
    convert_manzanas_asuncion()

