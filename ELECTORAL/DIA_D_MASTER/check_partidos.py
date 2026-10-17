import sqlite3
conn = sqlite3.connect('database/ddia.db')
cur = conn.cursor()
cols = [d[0] for d in cur.execute('PRAGMA table_info(partidos)').fetchall()]
print('partidos cols:', cols)
rows = cur.execute('SELECT * FROM partidos').fetchall()
print('partidos rows count:', len(rows))
for r in rows[:5]:
    print(r)
conn.close()