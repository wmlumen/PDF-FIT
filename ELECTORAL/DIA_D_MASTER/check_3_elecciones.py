import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

# 1. Tipos de eleccion
print('=== TIPOS DE ELECCION ===')
rows = c.execute('SELECT * FROM tipos_eleccion WHERE activo=1 ORDER BY id').fetchall()
for r in rows:
    print(f'ID {r[0]}: {r[1]} - {r[2]}')

# 2. Cargos por tipo
print('\n=== CARGOS POR TIPO ===')
for tipo_codigo in ['generales', 'departamentales', 'municipales', 'internas']:
    rows = c.execute(f"SELECT * FROM cargos_electivos WHERE activo=1 AND ambito='{tipo_codigo}' ORDER BY orden_visual").fetchall()
    print(f"\nTipo: {tipo_codigo} - {len(rows)} cargos")
    for r in rows:
        print(f"  ID {r[0]}: {r[1]} (ambito={r[2]}, tipo={r[4]})")

# 3. Reglas por cargo
print('\n=== REGLAS POR CARGO ===')
rows = c.execute("SELECT rc.*, ce.nombre as cargo_nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.activo=1 ORDER BY ce.orden_visual").fetchall()
for r in rows:
    cargo_nombre = r['cargo_nombre']
    bancas = r['cantidad_bancas']
    suplentes = r['cantidad_suplentes']
    sistema = r['sistema_eleccion']
    print(f"Cargo: {cargo_nombre} | Bancas: {bancas} | Suplentes: {suplentes} | Sistema: {sistema}")

conn.close()
print('\n✅ Check completado')