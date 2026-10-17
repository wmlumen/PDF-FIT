import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print('=' * 60)
print('SISTEMA: TITULARES vs SUPLENTES')
print('=' * 60)

# Ejemplo: Senadores (45 titulares, 30 suplentes)
print('\n--- SENADORES (Ejemplo completos) ---')
rules = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=2").fetchall()
for r in rules:
    print(f'  Bancas titulares: {r["cantidad_bancas"]}')
    print(f'  Bancas suplentes: {r["cantidad_suplentes"]}')
    print(f'  Sistema: {r["sistema_eleccion"]}')
    print(f'  Permite suplentes: {c.execute("SELECT permite_suplente FROM cargos_electivos WHERE id=2").fetchone()[0]}')

# Ejemplo: Convencionales (5 titulares, 5 suplentes)
print('\n--- CONVENCIONALES (Internas) ---')
rules = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=8").fetchall()
for r in rules:
    print(f'  Bancas titulares: {r["cantidad_bancas"]}')
    print(f'  Bancas suplentes: {r["cantidad_suplentes"]}')
    print(f'  Sistema: {r["sistema_eleccion"]}')
    print(f'  Permite suplentes: {c.execute("SELECT permite_suplente FROM cargos_electivos WHERE id=8").fetchone()[0]}')

# Ejemplo: Gobernador (1 titular, 0 suplentes)
print('\n--- GOBERNADOR (Mayoria simple) ---')
rules = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=4 LIMIT 1").fetchall()
for r in rules:
    print(f'  Bancas titulares: {r["cantidad_bancas"]}')
    print(f'  Bancas suplentes: {r["cantidad_suplentes"]}')
    print(f'  Sistema: {r["sistema_eleccion"]}')
    print(f'  Permite suplentes: {c.execute("SELECT permite_suplente FROM cargos_electivos WHERE id=4").fetchone()[0]}')

# Ejemplo: Intendente (1 titular, 0 suplentes)
print('\n--- INTENDENTE (Uninominal) ---')
rules = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=5 LIMIT 1").fetchall()
for r in rules:
    print(f'  Bancas titulares: {r["cantidad_bancas"]}')
    print(f'  Bancas suplentes: {r["cantidad_suplentes"]}')
    print(f'  Sistema: {r["sistema_eleccion"]}')
    print(f'  Permite suplentes: {c.execute("SELECT permite_suplente FROM cargos_electivos WHERE id=5").fetchone()[0]}')

# Verificar circunscripciones
print('\n--- CIRCUNSCRIPCIONES (distribución de bancas) ---')
rows = c.execute('SELECT id, tipo, nombre, cantidad_bancas, cantidad_suplentes FROM circunscripciones WHERE activo=1 LIMIT 5').fetchall()
for r in rows:
    print(f'  ID {r[0]}: {r[1]} ({r[2]}) -> Titulares: {r[3]}, Sufrentes: {r[4]}')

conn.close()
print('\n✅ Sistema completo para titulares y suplentes')