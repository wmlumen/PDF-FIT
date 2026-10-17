import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

# Reglas para Convencional Partidario (cargo_id=8)
#tipo_eleccion_id=4 (internas), circunscripcion_id=1 (interna), sistema='internos'
query1 = "INSERT INTO reglas_cargo (cargo_id, circunscripcion_id, tipo_eleccion_id, cantidad_bancas, cantidad_suplentes, sistema_eleccion) VALUES (8, 1, 4, 5, 5, 'internos')"
c.execute(query1)

# Agregamos la regla para Autoridad Partidaria  
query2 = "INSERT INTO reglas_cargo (cargo_id, circunscripcion_id, tipo_eleccion_id, cantidad_bancas, cantidad_suplentes, sistema_eleccion) VALUES (9, 1, 4, 3, 3, 'internos')"
c.execute(query2)

conn.commit()

# Verificar que se insertaron
rows = c.execute('SELECT * FROM reglas_cargo WHERE cargo_id IN (8,9)').fetchall()
print(f'Reglas insertadas: {len(rows)}')
for r in rows:
    print(f'ID {r[0]}: cargo_id={r[1]}, bancas={r[4]}, sistema={r[5]}')

conn.close()
print('✅ Reglas para internas agregadas')