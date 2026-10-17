import sqlite3
conn = sqlite3.connect('database/ddia.db')
cur = conn.cursor()
# List tipos_eleccion
rows = cur.execute('SELECT * FROM tipos_eleccion ORDER BY id').fetchall()
print('=== TIPOS ELECCION ===')
for r in rows:
    print(f"  id={r[0]} nombre={r[1]} activo={r[2]}")
# List partidos
rows = cur.execute('SELECT * FROM partidos ORDER BY nombre').fetchall()
print('\\n=== PARTIDOS ===')
for r in rows:
    print(f"  id={r[0]} sigla={r[1]} nombre={r[2]} color={r[3]} activo={r[4]}")
# Check ce_elecciones
rows = cur.execute('SELECT * FROM ce_elecciones ORDER BY id DESC LIMIT 1').fetchall()
print('\\n=== CE ELECCIONES (ultima) ===')
for r in rows:
    print(f"  id={r[0]} nombre={r[1]} fecha={r[2]} descripcion={r[3]} estado={r[4]}")
# Check ce_candidatos
rows = cur.execute('SELECT * FROM ce_candidatos ORDER BY id').fetchall()
print('\\n=== CE CANDIDATOS ===')
for r in rows:
    print(f"  id={r[0]} nombre={r[2]} apellido={r[3]} lista={r[4]} votos={r[5]}")
# Check votes sin clasificar
rows = cur.execute("SELECT COUNT(*) FROM registros WHERE eleccion_id IS NULL").fetchone()
print(f"\\n=== Votos sin eleccion_id: {rows[0]} ===")
rows = cur.execute("SELECT COUNT(*) FROM no_voto WHERE eleccion_id IS NULL").fetchone()
print(f"Votos no sin eleccion_id: {rows[0]}")
conn.close()