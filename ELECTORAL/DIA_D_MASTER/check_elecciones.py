import sqlite3
conn = sqlite3.connect('database/ddia.db')
cur = conn.cursor()
rows = cur.execute('SELECT * FROM elecciones ORDER BY fecha_eleccion').fetchall()
print('=== ELECCIONES ===')
for r in rows:
    print(f"  id={r[0]} nombre={r[1]} periodo={r[2]} fecha={r[3]} estado={r[4]} tipo={r[5]}")
conn.close()