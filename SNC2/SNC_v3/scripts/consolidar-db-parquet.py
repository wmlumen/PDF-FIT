#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Consolida todos los datos recopilados en:
1. Base de datos SQLite: data/catastro_territorio.sqlite
2. Archivos Apache Parquet y GeoParquet: data/parquet/*.parquet

Datasets consolidados:
- Departamentos de Paraguay (17 deptos + Asunción: superficie, capital, población Censo 2022)
- Distritos (Límites jurídicos, calidad técnica SNC, superficies oficiales y catastro)
- Cascos y Ejidos Urbanos Oficiales SNC (482 polígonos, resoluciones, leyes y áreas)
- Planes de Ordenamiento Territorial POUT MADES (7 municipios, 36 documentos)
- Barrios y Localidades (Asunción y Central, 742 entidades)
- Manzanas Urbanas (Asunción, 5.851 manzanas con clave catastral)
"""
import os
import sys
import json
import sqlite3
import pandas as pd
import geopandas as gpd

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

DATA_DIR = 'data'
PARQUET_DIR = os.path.join(DATA_DIR, 'parquet')
SQLITE_PATH = os.path.join(DATA_DIR, 'catastro_territorio.sqlite')

DEPARTAMENTOS_DATA = [
    {"codigo": "A", "departamento": "DISTRITO CAPITAL", "capital": "ASUNCION", "superficie_km2": 117.0, "poblacion_censo_2022": 462241, "densidad_hab_km2": 3950.8},
    {"codigo": "B", "departamento": "CONCEPCION", "capital": "CONCEPCION", "superficie_km2": 18051.0, "poblacion_censo_2022": 206181, "densidad_hab_km2": 11.4},
    {"codigo": "C", "departamento": "SAN PEDRO", "capital": "SAN PEDRO DE YCUAMANDYYU", "superficie_km2": 20002.0, "poblacion_censo_2022": 355175, "densidad_hab_km2": 17.8},
    {"codigo": "D", "departamento": "CORDILLERA", "capital": "CAACUPE", "superficie_km2": 4948.0, "poblacion_censo_2022": 268037, "densidad_hab_km2": 54.2},
    {"codigo": "E", "departamento": "GUAIRA", "capital": "VILLARRICA", "superficie_km2": 3846.0, "poblacion_censo_2022": 179555, "densidad_hab_km2": 46.7},
    {"codigo": "F", "departamento": "CAAGUAZU", "capital": "CORONEL OVIEDO", "superficie_km2": 11474.0, "poblacion_censo_2022": 431519, "densidad_hab_km2": 37.6},
    {"codigo": "G", "departamento": "CAAZAPA", "capital": "CAAZAPA", "superficie_km2": 9496.0, "poblacion_censo_2022": 139479, "densidad_hab_km2": 14.7},
    {"codigo": "H", "departamento": "ITAPUA", "capital": "ENCARNACION", "superficie_km2": 16525.0, "poblacion_censo_2022": 449642, "densidad_hab_km2": 27.2},
    {"codigo": "I", "departamento": "MISIONES", "capital": "SAN JUAN BAUTISTA", "superficie_km2": 9556.0, "poblacion_censo_2022": 111142, "densidad_hab_km2": 11.6},
    {"codigo": "J", "departamento": "PARAGUARI", "capital": "PARAGUARI", "superficie_km2": 8705.0, "poblacion_censo_2022": 200472, "densidad_hab_km2": 23.0},
    {"codigo": "K", "departamento": "ALTO PARANA", "capital": "CIUDAD DEL ESTE", "superficie_km2": 14895.0, "poblacion_censo_2022": 763702, "densidad_hab_km2": 51.3},
    {"codigo": "L", "departamento": "CENTRAL", "capital": "AREGUA", "superficie_km2": 2465.0, "poblacion_censo_2022": 1883927, "densidad_hab_km2": 764.3},
    {"codigo": "M", "departamento": "NEEMBUCU", "capital": "PILAR", "superficie_km2": 12147.0, "poblacion_censo_2022": 76719, "densidad_hab_km2": 6.3},
    {"codigo": "N", "departamento": "AMAMBAY", "capital": "PEDRO JUAN CABALLERO", "superficie_km2": 12933.0, "poblacion_censo_2022": 179412, "densidad_hab_km2": 13.9},
    {"codigo": "S", "departamento": "CANINDEYU", "capital": "SALTOS DEL GUAIRA", "superficie_km2": 14667.0, "poblacion_censo_2022": 191114, "densidad_hab_km2": 13.0},
    {"codigo": "P", "departamento": "PRESIDENTE HAYES", "capital": "VILLA HAYES", "superficie_km2": 72907.0, "poblacion_censo_2022": 123313, "densidad_hab_km2": 1.7},
    {"codigo": "Q", "departamento": "BOQUERON", "capital": "FILADELFIA", "superficie_km2": 91669.0, "poblacion_censo_2022": 71078, "densidad_hab_km2": 0.8},
    {"codigo": "R", "departamento": "ALTO PARAGUAY", "capital": "FUERTE OLIMPO", "superficie_km2": 82349.0, "poblacion_censo_2022": 17195, "densidad_hab_km2": 0.2}
]

def main():
    os.makedirs(PARQUET_DIR, exist_ok=True)
    if os.path.exists(SQLITE_PATH):
        try: os.remove(SQLITE_PATH)
        except Exception: pass
    
    conn = sqlite3.connect(SQLITE_PATH)
    print(f"=== Creando base de datos consolidada: {SQLITE_PATH} ===")

    # 1. Departamentos
    print("\n1. Consolidando Departamentos...")
    df_deptos = pd.DataFrame(DEPARTAMENTOS_DATA)
    df_deptos.to_sql('departamentos', conn, if_exists='replace', index=False)
    p_deptos = os.path.join(PARQUET_DIR, 'departamentos.parquet')
    df_deptos.to_parquet(p_deptos, index=False)
    print(f"   [OK] {len(df_deptos)} departamentos guardados en SQLite y Parquet ({os.path.getsize(p_deptos):,} bytes)")

    # 2. Distritos (Uniendo Límites SNC + Superficies SNC)
    print("\n2. Consolidando Distritos (Límites + Superficies)...")
    limites_path = os.path.join('data', 'snc_estadisticas', 'estudio_limites_distritales.json')
    superficies_path = os.path.join('data', 'snc_estadisticas', 'superficies_distritos.json')
    
    dict_limites = {}
    if os.path.exists(limites_path):
        with open(limites_path, 'r', encoding='utf-8') as f:
            d = json.load(f)
            for dist in d.get('distritos', []):
                dict_limites[f"{dist['cod_dpto']}{dist['cod_distrito']:02d}"] = dist
                dict_limites[f"{dist['cod_dpto']}{dist['cod_distrito']}"] = dist

    distritos_filas = []
    if os.path.exists(superficies_path):
        with open(superficies_path, 'r', encoding='utf-8') as f:
            sup_data = json.load(f)
            dist_dict = sup_data.get('distritos', sup_data)
            for k, s in dist_dict.items():
                if '|' not in k:
                    continue
                dpto, dist_s = k.split('|')
                dist_n = int(dist_s)
                code_std = f"{dpto}{dist_n:02d}"
                lim = dict_limites.get(code_std) or dict_limites.get(f"{dpto}{dist_n}") or {}
                
                ha_oficial = s.get('ha_oficial')
                ha_urbana = s.get('ha_urbana')
                ha_rural = (ha_oficial - ha_urbana) if (ha_oficial is not None and ha_urbana is not None) else None
                
                distritos_filas.append({
                    'id_distrito': k,
                    'codigo': code_std,
                    'cod_dpto': dpto,
                    'cod_distrito': dist_n,
                    'departamento': lim.get('departamento', dpto),
                    'distrito': s.get('nombre') or lim.get('distrito', f"DISTRITO {dist_n}"),
                    'superficie_oficial_ha': ha_oficial,
                    'superficie_oficial_km2': round(ha_oficial / 100.0, 2) if ha_oficial else None,
                    'superficie_poligono_ha': s.get('ha_poligono'),
                    'superficie_urbana_legal_ha': ha_urbana,
                    'superficie_rural_ha': round(ha_rural, 2) if ha_rural is not None else None,
                    'cantidad_areas_urbanas': s.get('areas_urbanas', 0),
                    'grupo_tecnico': lim.get('grupo_tecnico'),
                    'calidad_tecnica': lim.get('calidad_tecnica', 'No evaluado en estudio'),
                    'tipo_creacion': lim.get('tipo_creacion'),
                    'anio_creacion': lim.get('anio_creacion'),
                    'doc_normativa': lim.get('doc_normativa'),
                    'anio_normativa': lim.get('anio_normativa'),
                    'observaciones_limites': lim.get('observaciones')
                })

    if not distritos_filas and dict_limites:
        # Fallback de solo estudio_limites
        for k, lim in dict_limites.items():
            distritos_filas.append(lim)

    df_dist = pd.DataFrame(distritos_filas)
    df_dist.to_sql('distritos_snc', conn, if_exists='replace', index=False)
    p_dist = os.path.join(PARQUET_DIR, 'distritos_snc.parquet')
    df_dist.to_parquet(p_dist, index=False)
    print(f"   [OK] {len(df_dist)} distritos guardados en SQLite y Parquet ({os.path.getsize(p_dist):,} bytes)")

    # 3. Cascos Urbanos SNC
    print("\n3. Consolidando Cascos Urbanos Oficiales SNC...")
    casco_geojson = os.path.join('data', 'casco_urbano_snc.geojson')
    if os.path.exists(casco_geojson):
        gdf_casco = gpd.read_file(casco_geojson)
        # SQLite: guardar atributos + WKT de geometría
        df_casco_sql = gdf_casco.copy()
        df_casco_sql['geometria_wkt'] = df_casco_sql['geometry'].apply(lambda g: g.wkt if g else None)
        df_casco_sql = df_casco_sql.drop(columns=['geometry'], errors='ignore')
        df_casco_sql.to_sql('cascos_urbanos', conn, if_exists='replace', index=False)
        
        # Parquet: GeoParquet nativo con geometría vectorial
        p_casco = os.path.join(PARQUET_DIR, 'cascos_urbanos.parquet')
        gdf_casco.to_parquet(p_casco, index=False)
        print(f"   [OK] {len(gdf_casco)} cascos urbanos guardados en SQLite y GeoParquet ({os.path.getsize(p_casco):,} bytes)")

    # 4. POUT MADES
    print("\n4. Consolidando Planes de Ordenamiento Territorial (POUT MADES)...")
    manifest_pout = os.path.join('data', 'mades_pout', 'manifest.json')
    if os.path.exists(manifest_pout):
        with open(manifest_pout, 'r', encoding='utf-8') as f:
            pout_docs = json.load(f)
        df_pout = pd.DataFrame(pout_docs)
        df_pout.to_sql('pout_mades_documentos', conn, if_exists='replace', index=False)
        p_pout = os.path.join(PARQUET_DIR, 'pout_mades_documentos.parquet')
        df_pout.to_parquet(p_pout, index=False)
        print(f"   [OK] {len(df_pout)} documentos POUT guardados en SQLite y Parquet ({os.path.getsize(p_pout):,} bytes)")

    # 5. Barrios y Localidades (Asunción y Central)
    print("\n5. Consolidando Barrios y Localidades...")
    barrios_geojson = os.path.join('data', 'barrios_asuncion_central_light.geojson')
    if os.path.exists(barrios_geojson):
        gdf_b = gpd.read_file(barrios_geojson)
        df_b_sql = gdf_b.copy()
        df_b_sql['geometria_wkt'] = df_b_sql['geometry'].apply(lambda g: g.wkt if g else None)
        df_b_sql = df_b_sql.drop(columns=['geometry'], errors='ignore')
        df_b_sql.to_sql('barrios_localidades', conn, if_exists='replace', index=False)
        
        p_barrios = os.path.join(PARQUET_DIR, 'barrios_asuncion_central.parquet')
        gdf_b.to_parquet(p_barrios, index=False)
        print(f"   [OK] {len(gdf_b)} barrios guardados en SQLite y GeoParquet ({os.path.getsize(p_barrios):,} bytes)")

    # 6. Manzanas Urbanas (Asunción)
    print("\n6. Consolidando Manzanas Urbanas...")
    mz_geojson = os.path.join('data', 'manzanas_asuncion_light.geojson')
    if os.path.exists(mz_geojson):
        gdf_mz = gpd.read_file(mz_geojson)
        df_mz_sql = gdf_mz.copy()
        df_mz_sql['geometria_wkt'] = df_mz_sql['geometry'].apply(lambda g: g.wkt if g else None)
        df_mz_sql = df_mz_sql.drop(columns=['geometry'], errors='ignore')
        df_mz_sql.to_sql('manzanas_asuncion', conn, if_exists='replace', index=False)
        
        p_mz = os.path.join(PARQUET_DIR, 'manzanas_asuncion.parquet')
        gdf_mz.to_parquet(p_mz, index=False)
        print(f"   [OK] {len(gdf_mz)} manzanas guardadas en SQLite y GeoParquet ({os.path.getsize(p_mz):,} bytes)")

    # Crear índices en SQLite
    print("\nCreando índices de optimización en SQLite...")
    cursor = conn.cursor()
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dist_cod ON distritos_snc(codigo);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_dist_dpto ON distritos_snc(cod_dpto);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_casco_dpto_dist ON cascos_urbanos(dpto, dist);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_barrio_clave ON barrios_localidades(clave);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_mz_clave ON manzanas_asuncion(clave);")
    conn.commit()
    conn.close()

    print(f"\n==========================================")
    print(f"✅ CONSOLIDACIÓN EXITOSA")
    print(f"Base de datos SQLite: {SQLITE_PATH} ({os.path.getsize(SQLITE_PATH)/(1024*1024):.2f} MB)")
    print(f"Archivos Parquet generados en: {PARQUET_DIR}/")
    for f in os.listdir(PARQUET_DIR):
        fp = os.path.join(PARQUET_DIR, f)
        print(f"  - {f}: {os.path.getsize(fp)/(1024*1024):.2f} MB")
    print(f"==========================================")

if __name__ == '__main__':
    main()
