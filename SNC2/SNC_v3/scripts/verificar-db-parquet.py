import sqlite3
import pandas as pd
import geopandas as gpd
import os

SQLITE_PATH = os.path.join('data', 'catastro_territorio.sqlite')
PARQUET_DIR = os.path.join('data', 'parquet')

conn = sqlite3.connect(SQLITE_PATH)
tables = pd.read_sql("SELECT name FROM sqlite_master WHERE type='table'", conn)
print("=== TABLAS EN SQLITE ===")
for tbl in tables['name']:
    cnt = pd.read_sql(f"SELECT count(*) as total FROM {tbl}", conn)['total'].iloc[0]
    print(f" - {tbl}: {cnt} registros")

print("\n=== VERIFICANDO PARQUET ===")
for f in os.listdir(PARQUET_DIR):
    if f.endswith('.parquet'):
        fp = os.path.join(PARQUET_DIR, f)
        if 'barrios' in f or 'cascos' in f or 'manzanas' in f:
            gdf = gpd.read_parquet(fp)
            print(f" - {f} (GeoParquet): {len(gdf)} registros, CRS={gdf.crs}, cols={list(gdf.columns[:4])}")
        else:
            df = pd.read_parquet(fp)
            print(f" - {f} (Parquet): {len(df)} registros, cols={list(df.columns[:4])}")

conn.close()
