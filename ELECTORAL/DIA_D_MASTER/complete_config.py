import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print("=" * 60)
print("CONFIGURACIÓN COMPLETA PARA LOS 3 TIPOS DE ELECCIÓN")
print("=" * 60)

# 1. Verificar qué cargos existen por ambito
print("\n=== CARGOS POR AMBITO ===")
ambitos = ['nacional', 'departamental', 'municipal', 'interno']
for ambito in ambitos:
    rows = c.execute(f"SELECT id, nombre, tipo_cargo, orden_visual FROM cargos_electivos WHERE activo=1 AND ambito='{ambito}' ORDER BY orden_visual").fetchall()
    print(f"\nAmbitos '{ambito}': {len(rows)} cargos")
    for r in rows:
        print(f"  ID {r[0]}: {r[1]} (tipo={r[2]}, orden={r[3]})")

# 2. Reglas existentes
print("\n\n=== REGLAS ACTUALES ===")
rows = c.execute("SELECT rc.*, ce.nombre as cargo_nombre FROM reglas_cargo rc JOIN cargos_electivos ce ON ce.id=rc.cargo_id WHERE rc.activo=1 ORDER BY ce.orden_visual").fetchall()
for r in rows:
    print(f"  {r['cargo_nombre']:25s} | Bancas:{r['cantidad_bancas']:3d} | Sufrentes:{r['cantidad_suplentes']:2d} | Sistema:{r['sistema_eleccion']}")

# 3. Verificar qué tipos de elección tienen reglas asociadas
print("\n\n=== REGLAS POR TIPO DE ELECCIÓN ===")
for tipo_codigo in ['generales', 'departamentales', 'municipales', 'internas']:
    t_id = c.execute(f"SELECT id FROM tipos_eleccion WHERE codigo='{tipo_codigo}'").fetchone()
    if t_id:
        t_id = t_id[0]
        reglas = c.execute(f"SELECT COUNT(*) FROM reglas_cargo WHERE tipo_eleccion_id={t_id}").fetchone()[0]
        print(f"{tipo_codigo:15s}: {reglas} reglas asociadas")
    else:
        print(f"{tipo_codigo:15s}: TIPO NO ENCONTRADO")

conn.close()
print("\n✅ Configuración verificada")