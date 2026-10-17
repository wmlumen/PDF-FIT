import sys
sys.path.insert(0, '.')
from database import init_db, get_connection

init_db()
print('Database initialized OK')

conn = get_connection()
c = conn.cursor()

# Check new indices
indices = [
    'idx_pv_dirigente_status',
    'idx_gd_grupo_dir', 
    'idx_dc_dirigente',
    'idx_dv_dirigente'
]

for idx in indices:
    c.execute("SELECT name FROM sqlite_master WHERE type='index' AND name=?", (idx,))
    result = c.fetchone()
    status = "EXISTS" if result else "MISSING"
    print(f'Index {idx}: {status}')

conn.close()
print('Test completed')