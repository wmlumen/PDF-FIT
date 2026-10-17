import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

# 1. Reglas para Intendente (cargo_id=5)
# Sistema de mayoría, 1 banca por municipio
# Vinculado a elección municipal (id=3)
c.execute("INSERT INTO reglas_cargo (cargo_id, circunscripcion_id, tipo_eleccion_id, cantidad_bancas, cantidad_suplentes, sistema_eleccion) VALUES (5, 19, 3, 1, 0, 'mayoria')")

# 2. Reglas para Concejal (cargo_id=6)  
# Sistema D'Hondt, bancas variables por departamento
# Vinculado a elección municipal (id=3)
# Crearemos reglas para los 18 departamentos con cantidades variables
# Basado en la distribución típica: Central(8), AltoParaná(6), Itapúa(5), SanPedro(4), Caaguazú(4), 
# Caazapá(3), Asunción(10), Concepción(4), Cordillera(3), Guairá(3), Misiones(2), Paraguarí(3), 
# Ñeembucú(1), Amambay(1), PresidenteHayes(1), AltoParaguay(1), Boquerón(1)

departamentos_bancas = {
    2: 3, 3: 4, 4: 3, 5: 3, 6: 4, 7: 4, 8: 5, 9: 2, 10: 3,
    11: 8, 12: 8, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 8  # Asunción
}

for depto_id, bancas in departamentos_bancas.items():
    c.execute(f"INSERT INTO reglas_cargo (cargo_id, circunscripcion_id, tipo_eleccion_id, cantidad_bancas, cantidad_suplentes, sistema_eleccion) VALUES (6, {depto_id}, 3, {bancas}, {bancas}, 'd_hondt')")

conn.commit()

# Verificar que se insertaron
rows = c.execute("SELECT COUNT(*) FROM reglas_cargo WHERE cargo_id=6 AND tipo_eleccion_id=3").fetchone()[0]
print(f"Reglas para Concejal (municipales) insertadas: {rows}")

# También verificar Intendente
rows2 = c.execute("SELECT COUNT(*) FROM reglas_cargo WHERE cargo_id=5 AND tipo_eleccion_id=3").fetchone()[0]
print(f"Reglas para Intendente (municipales) insertadas: {rows2}")

# Mostrar un resumen
print("\nResumen reglas municipales:")
int_rules = c.execute("SELECT * FROM reglas_cargo WHERE cargo_id=5 AND tipo_eleccion_id=3").fetchall()
print(f"  Intendente reglas: {len(int_rules)}")

conce_rules = c.execute("SELECT * FROM reglas_cargo WHERE cargo_id=6 AND tipo_eleccion_id=3").fetchall()
print(f"  Concejal reglas: {len(conce_rules)}")

conn.close()
print("\n✅ Reglas municipales agregadas")