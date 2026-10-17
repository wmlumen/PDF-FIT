import sqlite3
conn = sqlite3.connect('database/ddia.db')
cur = conn.cursor()
# Check registros with eleccion_id
rows = cur.execute("SELECT eleccion_id, COUNT(*) FROM registros GROUP BY eleccion_id").fetchall()
print("=== REGISTROS por eleccion_id ===")
for r in rows:
    print(f"  eleccion_id={r[0]} count={r[1]}")
# Check no_voto
rows = cur.execute("SELECT eleccion_id, COUNT(*) FROM no_voto GROUP BY eleccion_id").fetchall()
print("=== NO VOTO por eleccion_id ===")
for r in rows:
    print(f"  eleccion_id={r[0]} count={r[1]}")
# Check ce_votos
rows = cur.execute("SELECT eleccion_id, COUNT(*) FROM ce_votos GROUP BY eleccion_id").fetchall()
print("=== CE VOTOS por eleccion_id ===")
for r in rows:
    print(f"  eleccion_id={r[0]} count={r[1]}")
# Check posible_votos with status
rows = cur.execute("SELECT status, COUNT(*) FROM posible_votos GROUP BY status").fetchall()
print("=== POSIBLE VOTOS por status ===")
for r in rows:
    print(f"  status={r[0]} count={r[1]}")
# Check what election the ce system uses
rows = cur.execute("SELECT eleccion_id FROM ce_votos LIMIT 5").fetchall()
print("=== CE Votos eleccion_ids ===")
for r in rows:
    print(f"  eleccion_id={r[0]}")
conn.close()