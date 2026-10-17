import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print("=" * 60)
print("VERIFICACIÓN DE ESTRUCTURA PARA TITULARES Y SUPLENTES")
print("=" * 60)

# 1. Ver estructura de cargos_electivos
print("\n=== ESTRUCTURA DE CARGOS ELECTIVOS ===")
rows = c.execute("SELECT id, nombre, ambito, tipo_cargo, permite_suplente, permite_lista, permite_voto_preferente, requiere_circunscripcion, permite_chapa, orden_visual FROM cargos_electivos WHERE activo=1 ORDER BY orden_visual").fetchall()
for r in rows:
    print(f"ID {r[0]}: {r[1]}")
    print(f"   ambito={r[2]}, tipo_cargo={r[3]}, permite_suplente={r[4]}, permite_lista={r[5]}")
    print(f"   permite_voto_preferente={r[6]}, requiere_circunscripcion={r[7]}, permite_chapa={r[8]}, orden_visual={r[9]}")

# 2. Ver reglas_cargo con info de bancas y suplentes
print("\n\n=== REGLAS CON BANCAS Y SUPLENTES ===")
rows = c.execute("SELECT rc.*, ce.nombre as cargo_nombre, ce.permite_suplente, ce.permite_lista FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.activo=1 ORDER BY ce.orden_visual").fetchall()
for r in rows:
    print(f"Cargo: {r['cargo_nombre']:25s} | Bancas:{r['cantidad_bancas']:3d} | Sufrentes:{r['cantidad_suplentes']:2d} | Sistema:{r['sistema_eleccion']} | Permite suplente:{r['permite_suplente']}")

# 3. Ver circunscripciones con cantidad_bancas y cantidad_suplentes
print("\n\n=== CIRCUNSCRIPCIONES CON BANCAS ===")
rows = c.execute("SELECT id, tipo, nombre, cantidad_bancas, cantidad_suplentes FROM circunscripciones WHERE activo=1 ORDER BY id").fetchall()
for r in rows:
    print(f"ID {r[0]}: {r[1]} ({r[2]}) | Bancas titulares: {r[3]} | Sufrentes: {r[4]}")

# 4. Ver si hay campos para distinguir titulares vs suplentes en votos
print("\n\n=== TABLA REGISTROS ( votos ) ===")
# Revisar columnas de registros
reg_cols = [r[1] for r in c.execute("PRAGMA table_info(registros)").fetchall()]
print(f"Columnas en registros: {[c for c in reg_cols if 'estado' in c.lower or 'dirigente' in c.lower or 'mesa' in c.lower or 'cedula' in c.lower]}")

# Revisar tabla posibles_votos
print("\n=== TABLA POSIBLE_VOTOS ===")
pv_cols = [r[1] for r in c.execute("PRAGMA table_info(posible_votos)").fetchall()]
print(f"Columnas en posibles_votos: {pv_cols}")

# Verificar estructura de elección
print("\n\n=== EJEMPLO DE ELECCIÓN CON BANCAS ===")
rows = c.execute("SELECT * FROM elecciones WHERE activo=1 LIMIT 1").fetchone()
if rows:
    print(f"Elección: ID {rows[0]}, nombre: {rows[1]}, estado: {rows[4]}, fecha: {rows[3]}")

# Reglas por cargo ejemplo
rows2 = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.cargo_id=2").fetchall()
if rows2:
    r = rows2[0]
    print(f"\nRegla Senadores: {r['cantidad_bancas']} bancas titulares, {r['cantidad_suplentes']} suplentes, sistema: {r['sistema_eleccion']}")

conn.close()
print("\n✅ Estructura verificada")