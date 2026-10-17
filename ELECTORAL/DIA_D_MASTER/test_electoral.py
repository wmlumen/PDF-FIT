import sys
sys.path.insert(0, '.')
from database import get_connection, init_db

init_db()
conn = get_connection()
c = conn.cursor()

# 1. Verificar tipos de elección
print('=== TIPOS DE ELECCIÓN ===')
rows = c.execute('SELECT * FROM tipos_eleccion WHERE activo=1 ORDER BY id').fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} - {r[2]}')

# 2. Verificar cargos electivos
print('\n=== CARGOS ELECTIVOS ===')
rows = c.execute('SELECT id, nombre, ambito, tipo_cargo, orden_visual FROM cargos_electivos WHERE activo=1 ORDER BY orden_visual').fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} (ambito={r[2]}, tipo={r[3]}, orden={r[4]})')

# 3. Verificar circunscripciones
print('\n=== CIRCUNSCRIPCIONES ===')
rows = c.execute('SELECT * FROM circunscripciones WHERE activo=1 ORDER BY id').fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} ({r[4]}) - Bancas: {r[5]}, Suplentes: {r[6]}')

# 4. Verificar reglas por cargo
print('\n=== REGLAS POR CARGO ===')
rows = c.execute('''SELECT rc.id, ce.nombre as cargo_nombre, ce.codigo as cargo_codigo,
c.nombre as circuns_nombre, rc.cantidad_bancas, rc.cantidad_suplentes, rc.sistema_eleccion
FROM reglas_cargo rc 
JOIN cargos_electivos ce ON ce.id=rc.cargo_id 
LEFT JOIN circunscripciones c ON c.id=rc.circunscripcion_id 
WHERE rc.activo=1 ORDER BY ce.orden_visual, c.nombre''').fetchall()
for r in rows:
    print(f'Cargo: {r[0]} ({r[1]}, {r[1]}) | Circ: {r[2]} | Bancas: {r[3]}, Suplentes: {r[4]}, Sistema: {r[5]}')

conn.close()
print('\n✅ Análisis completado')