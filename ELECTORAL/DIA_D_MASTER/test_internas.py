import sys
sys.path.insert(0, '.')
from database import get_connection, init_db

init_db()
conn = get_connection()
c = conn.cursor()

# 1. Verificar tipos de elección
print('=== TIPOS DE ELECCIÓN ===')
rows = c.execute("SELECT * FROM tipos_eleccion WHERE activo=1 ORDER BY id").fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} - {r[2]}')

# 2. Verificar cargos electivos
print('\n=== CARGOS ELECTIVOS ===')
rows = c.execute("SELECT id, nombre, ambito, tipo_cargo, orden_visual FROM cargos_electivos WHERE activo=1 ORDER BY orden_visual").fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} (ambito={r[2]}, tipo={r[3]}, orden={r[4]})')

# 3. Verificar reglas por cargo - convencional
print('\n=== REGLAS CARGO: Convencional ===')
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=8 AND rc.activo=1").fetchall()
for r in rows:
    print(f'Sistema: {r["sistema_eleccion"]}, Bancas: {r["cantidad_bancas"]}, Suplentes: {r["cantidad_suplentes"]}')

print('\n=== REGLAS CARGO: Autoridad Partidaria ===')
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=9 AND rc.activo=1").fetchall()
for r in rows:
    print(f'Sistema: {r["sistema_eleccion"]}, Bancas: {r["cantidad_bancas"]}, Suplentes: {r["cantidad_suplentes"]}')

# 4. Verificar elecciones internas
print('\n=== ELECCIONES ===')
rows = c.execute("SELECT * FROM elecciones WHERE tipo_eleccion_id IN (SELECT id FROM tipos_eleccion WHERE codigo='internas')").fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} - Estado: {r["estado"]} - Fecha: {r["fecha_eleccion"]}')

# 5. Verificar structure de convención/autoridad
print('\n=== CARGOS PARA INTERNAS ===')
rows = c.execute("SELECT * FROM cargos_electivos WHERE codigo IN ('convencional', 'autoridad_partidaria') AND activo=1").fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} (ambito={r[3]}, tipo={r[4]})')

conn.close()
print('\n✅ Test de internas completado')