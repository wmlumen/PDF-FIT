import sqlite3
import time
import os

sqlite_path = os.path.join('data', 'catastro_territorio.sqlite')
parquet_path = os.path.join('data', 'parquet', 'cascos_urbanos.parquet')
manzanas_parquet = os.path.join('data', 'parquet', 'manzanas_asuncion.parquet')

# Check if duckdb is installed
has_duckdb = False
try:
    import duckdb
    has_duckdb = True
except ImportError:
    pass

import pandas as pd

print("=========================================================")
print("BENCHMARK DE VELOCIDAD: SQLite Indexado vs Apache Parquet")
print("=========================================================")

# 1. SQLite Búsqueda puntual (con índice B-Tree)
conn = sqlite3.connect(sqlite_path)
c = conn.cursor()

# Calentamiento
c.execute("SELECT distrito, superficie_ha FROM cascos_urbanos WHERE dpto = ? AND dist = ?", ('D', '12'))
_ = c.fetchall()

N_PUNTUAL = 2000
t0 = time.perf_counter()
for _ in range(N_PUNTUAL):
    c.execute("SELECT distrito, superficie_ha FROM cascos_urbanos WHERE dpto = ? AND dist = ?", ('D', '12'))
    _ = c.fetchall()
t_sql_point = ((time.perf_counter() - t0) / N_PUNTUAL) * 1000  # ms

# 2. SQLite Búsqueda en 5.851 manzanas con índice
c.execute("SELECT clave, barrio, manzana FROM manzanas_asuncion WHERE clave = ?", ('1|1|4|15',))
_ = c.fetchall()

t0 = time.perf_counter()
for _ in range(N_PUNTUAL):
    c.execute("SELECT clave, barrio, manzana FROM manzanas_asuncion WHERE clave = ?", ('1|1|4|15',))
    _ = c.fetchall()
t_sql_point_mz = ((time.perf_counter() - t0) / N_PUNTUAL) * 1000  # ms

# 3. SQLite Agregación masiva
N_AGG = 200
t0 = time.perf_counter()
for _ in range(N_AGG):
    c.execute("SELECT dpto, count(1), sum(superficie_ha) FROM cascos_urbanos GROUP BY dpto")
    _ = c.fetchall()
t_sql_agg = ((time.perf_counter() - t0) / N_AGG) * 1000  # ms

# 4. Parquet con DuckDB (si existe) o con PyArrow / Pandas
t_duck_point = None
t_duck_point_mz = None
t_duck_agg = None

if has_duckdb:
    con_duck = duckdb.connect()
    # Calentamiento
    con_duck.execute(f"SELECT distrito, superficie_ha FROM '{parquet_path}' WHERE dpto = 'D' AND dist = '12'").fetchall()
    
    N_P = 200
    t0 = time.perf_counter()
    for _ in range(N_P):
        con_duck.execute(f"SELECT distrito, superficie_ha FROM '{parquet_path}' WHERE dpto = 'D' AND dist = '12'").fetchall()
    t_duck_point = ((time.perf_counter() - t0) / N_P) * 1000

    t0 = time.perf_counter()
    for _ in range(N_P):
        con_duck.execute(f"SELECT clave, barrio, manzana FROM '{manzanas_parquet}' WHERE clave = '1|1|4|15'").fetchall()
    t_duck_point_mz = ((time.perf_counter() - t0) / N_P) * 1000

    t0 = time.perf_counter()
    for _ in range(N_P):
        con_duck.execute(f"SELECT dpto, count(1), sum(superficie_ha) FROM '{parquet_path}' GROUP BY dpto").fetchall()
    t_duck_agg = ((time.perf_counter() - t0) / N_P) * 1000

# 5. Parquet con PyArrow / Pandas (filtro columnar en memoria)
import pyarrow.parquet as pq
df_arrow = pq.read_table(manzanas_parquet).to_pandas()
t0 = time.perf_counter()
for _ in range(N_PUNTUAL):
    _ = df_arrow[df_arrow['clave'] == '1|1|4|15']
t_pandas_filter = ((time.perf_counter() - t0) / N_PUNTUAL) * 1000

conn.close()

print(f"\n1. Búsqueda PUNTUAL por Clave / Código (ej. Buscar 1 Manzana o 1 Casco Urbano):")
print(f"   -> SQLite (B-Tree Index):          {t_sql_point_mz:.3f} ms  <-- [EL MAS RAPIDO PARA APIs / VISOR]")
if has_duckdb:
    print(f"   -> DuckDB sobre Parquet:           {t_duck_point_mz:.3f} ms")
print(f"   -> Pandas DataFrame en memoria:    {t_pandas_filter:.3f} ms")

print(f"\n2. Agregación y Análisis Estadístico (ej. GROUP BY dpto, SUM hectáreas):")
print(f"   -> SQLite:                         {t_sql_agg:.3f} ms")
if has_duckdb:
    print(f"   -> DuckDB sobre Parquet Columnar:  {t_duck_agg:.3f} ms  <-- [EL MAS RAPIDO PARA BIG DATA / ANALITICA]")

print("\n=========================================================")
