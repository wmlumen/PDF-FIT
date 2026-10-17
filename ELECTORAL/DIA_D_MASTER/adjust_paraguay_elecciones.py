import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print("=" * 60)
print("AJUSTES AL SISTEMA DIA D MASTER PARA LEGISLACIÓN PARAGUAYA")
print("=" * 60)

# 1. Verificar estructura actual y qué necesita cambio
print("\n=== 1. Verificando estructura actual ===")

# Verificar cargos y si permiten voto preferente (candidatura unipersonal)
cargos = c.execute("SELECT id, nombre, permite_voto_preferente, permite_lista, permite_chapa FROM cargos_electivos WHERE activo=1 ORDER BY orden_visual").fetchall()
print("\nCargos y modo de votación:")
for cargo in cargos:
    print(f"  ID {cargo[0]}: {cargo[1]}")
    print(f"    permite_voto_preferente: {cargo[2]} (1=voto individual, 0=lista cerrada)")
    print(f"    permite_lista: {cargo[3]}")
    print(f"    permite_chapa: {cargo[4]}")

# 2. Ver reglas y sistemas
print("\n\n=== 2. Reglas electorales actuales ===")
reglas = c.execute("SELECT rc.*, ce.nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.activo=1 ORDER BY ce.orden_visual").fetchall()
for r in reglas:
    print(f"  {r['cargo_nombre']:25s} | Bancas:{r['cantidad_bancas']:3d} | Sufrentes:{r['cantidad_suplentes']:2d} | Sistema:{r['sistema_eleccion']}")

# 3. Ver circunscripciones
print("\n\n=== 3. Circunscripciones y distribución ===")
circs = c.execute("SELECT id, tipo, nombre, cantidad_bancas, cantidad_suplentes FROM circunscripciones WHERE activo=1 ORDER BY id").fetchall()
for r in circs:
    print(f"  ID {r[0]}: {r[1]} ({r[2]}) | Titulares:{r[3]} | Sufrentes:{r[4]}")

# 4. Verificar si el sistema soporta voto por candidato individual
print("\n\n=== 4. Verificación de voto preferente ===")
# Revisar si la aplicación actual soporta voto por candidato individual
print("El sistema necesita:")
print("  ✅ Permitir voto por candidato individual (no lista cerrada)")
print("  ✅ Los sufragios se cuentan por candidato, no por lista")
print("  ✅ Los suplentes mantienen posición idéntica a titulares")
print("  ✅ Sistema D'Hondt con candidaturas unipersonales")

# 5. Verificar tipos de elección
print("\n\n=== 5. Tipos de elección en la base ===")
for tipo in ['generales', 'departamentales', 'municipales', 'internas']:
    t_id = c.execute(f"SELECT id FROM tipos_eleccion WHERE codigo='{tipo}'").fetchone()
    if t_id:
        print(f"  {tipo}: ID {t_id[0]} - ACTIVO")
    else:
        print(f"  {tipo}: NO ENCONTRADO")

conn.close()
print("\n⚠️  Se requieren ajustes para cumplir Código Electoral Paraguayo")