import sys
sys.path.insert(0, '.')
from database import get_connection, init_db

init_db()
conn = get_connection()
c = conn.cursor()

# 1. Tipos de eleccion
print("=== TIPOS DE ELECCIÓN ===")
rows = c.execute("SELECT * FROM tipos_eleccion WHERE activo=1 ORDER BY id").fetchall()
for r in rows:
    print(f"ID {r[0]}: {r[1]} - {r[2]}")

# 2. Cargos electivos
print("\n=== CARGOS ELECTIVOS ===")
rows = c.execute("SELECT id, nombre, ambito, tipo_cargo, orden_visual FROM cargos_electivos WHERE activo=1 ORDER BY orden_visual").fetchall()
for r in rows:
    print(f"ID {r[0]}: {r[1]} (ambito={r[2]}, tipo={r[3]}, orden={r[4]})")

# 3. Reglas por cargo - Presidente
print("\n=== REGLAS CARGO: Presidente ===")
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=1 AND rc.activo=1").fetchall()
for r in rows:
    sys = r["sistema_eleccion"]
    bancas = r["cantidad_bancas"]
    suplentes = r["cantidad_suplentes"]
    print(f"Sistema: {sys}, Bancas: {bancas}, Suplentes: {suplentes}")

# 4. Reglas por cargo - Senadores (nacional)
print("\n=== REGLAS CARGO: Senadores ===")
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=2 AND rc.activo=1").fetchall()
for r in rows:
    sys = r["sistema_eleccion"]
    bancas = r["cantidad_bancas"]
    suplentes = r["cantidad_suplentes"]
    print(f"Sistema: {sys}, Bancas titulares: {bancas}, Suplentes: {suplentes}")

# 5. Reglas por cargo - Diputados (Central)
print("\n=== REGLAS CARGO: Diputados - Central ===")
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=3 AND rc.circunscripcion_id=11 AND rc.activo=1").fetchall()
for r in rows:
    sys = r["sistema_eleccion"]
    bancas = r["cantidad_bancas"]
    suplentes = r["cantidad_suplentes"]
    print(f"Sistema: {sys}, Bancas: {bancas}, Suplentes: {suplentes}")

# 6. Reglas por cargo - Gobernador (Concepción)
print("\n=== REGLAS CARGO: Gobernador - Concepción ===")
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=4 AND rc.circunscripcion_id=2 AND rc.activo=1").fetchall()
for r in rows:
    sys = r["sistema_eleccion"]
    bancas = r["cantidad_bancas"]
    print(f"Sistema: {sys}, Bancas: {bancas}")

# 7. Reglas por cargo - Intendente
print("\n=== REGLAS CARGO: Intendente ===")
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=5 AND rc.activo=1").fetchall()
for r in rows:
    sys = r["sistema_eleccion"]
    bancas = r["cantidad_bancas"]
    print(f"Sistema: {sys}, Bancas: {bancas}")

# 8. Reglas por cargo - Concejal
print("\n=== REGLAS CARGO: Concejal ===")
rows = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=6 AND rc.activo=1").fetchall()
for r in rows:
    sys = r["sistema_eleccion"]
    bancas = r["cantidad_bancas"]
    suplentes = r["cantidad_suplentes"]
    print(f"Sistema: {sys}, Bancas: {bancas}, Suplentes: {suplentes}")

# 9. Circunscripciones por tipo
print("\n=== CIRCUNSCRIPCIONES POR TIPO ===")
for tipo in ["nacional", "departamento"]:
    rows = c.execute(f"SELECT * FROM circunscripciones WHERE activo=1 AND tipo='{tipo}'").fetchall()
    print(f"\nTipo {tipo}: {len(rows)} circunscripciones")
    for r in rows[:3]:
        print(f"  ID {r[0]}: {r[4]} - Bancas: {r[5]}")

conn.close()
print("\n✅ Test de endpoints completado")