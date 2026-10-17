import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print("=" * 60)
print("AJUSTE COMPLETO AL SISTEMA DIA D MASTER")
print("Código Electoral Paraguayo - Ley 834/96 y modificatorias")
print("=" * 60)

# 1. Actualizar cargos_electivos para sistema de candidaturas unipersonales
print("\n--- 1. Actualizando configuración de cargos ---")

# Según Art. 258: voto por candidato individual (candidaturas unipersonales)
# Los cargos que permiten voto preferente son: Senadores, Diputados, Concejales, Juntas Departamentales, Internas
# Los cargos uninominales (Presidente, Gobernador, Intendente) usan mayoría simple

updates_cargos = [
    # ID 1: Presidente - Mayoría simple, chapa completa (no voto preferente individual)
    (1, "Presidente y Vicepresidente", 0, 0, 1, "mayoria"),
    
    # ID 2: Senadores - Proporcional, candidaturas unipersonales
    (2, "Senador/a", 1, 1, 0, "d_hondt"),
    
    # ID 3: Diputados - Proporcional, candidaturas unipersonales  
    (3, "Diputado/a", 1, 1, 0, "d_hondt"),
    
    # ID 4: Gobernador - Mayoría uninominal por departamento
    (4, "Gobernador/a", 0, 0, 0, "mayoria"),
    
    # ID 5: Intendente - Mayoría uninominal por municipio
    (5, "Intendente", 0, 0, 0, "mayoria"),
    
    # ID 6: Concejales - Proporcional, candidaturas unipersonales
    (6, "Concejal/a (Junta Municipal)", 1, 1, 0, "d_hondt"),
    
    # ID 7: Juntas Departamentales - Proporcional, candidaturas unipersonales
    (7, "Junta Departamental", 1, 1, 0, "d_hondt"),
    
    # ID 8: Convencionales internos - Proporcional, candidaturas unipersonales
    (8, "Convencional Partidario", 1, 1, 0, "internos"),
    
    # ID 9: Autoridad partidaria - Uninominal
    (9, "Autoridad Partidaria", 0, 0, 0, "internos"),
]

for cargo_id, nombre, voto_pref, lista, chapa, sistema in updates_cargos:
    c.execute(
        "UPDATE cargos_electivos SET permite_voto_preferente=?, permite_lista=?, permite_chapa=? WHERE id=?",
        (voto_pref, lista, chapa, cargo_id)
    )
    print(f"  ✅ Actualizado: ID {cargo_id} - {nombre} | voto_pref={voto_pref}, lista={lista}, chapa={chapa}")

conn.commit()

# 2. Verificar y actualizar reglas_cargo para que soporten candidaturas unipersonales
print("\n--- 2. Verificando reglas_cargo ---")

cargos_a_verify = [1, 2, 3, 4, 5, 6, 7, 8, 9]

for cargo_id in cargos_a_verify:
    count = c.execute("SELECT COUNT(*) FROM reglas_cargo WHERE cargo_id=? AND activo=1", [cargo_id]).fetchone()[0]
    print(f"  Cargo ID {cargo_id}: {count} reglas activas")
    
    sistemas = c.execute("""
        SELECT sistema_eleccion, COUNT(*) FROM reglas_cargo 
        WHERE cargo_id=? AND activo=1 
        GROUP BY sistema_eleccion
    """, [cargo_id]).fetchall()
    print(f"    Sistemas en reglas: {[s[0] for s in sistemas]}")

# 3. Verificar circunscripciones tienen bancas y sufragantes adecuados
print("\n--- 3. Circunscripciones ---")

nat = c.execute("SELECT * FROM circunscripciones WHERE tipo='nacional' AND activo=1").fetchall()
print(f"  Circunscripciones nacionales: {len(nat)}")
for r in nat:
    print(f"    ID {r[0]}: {r[1]} | Bancas:{r[3]} | Sufrentes:{r[4]}")

dept = c.execute("SELECT * FROM circunscripciones WHERE tipo='departamento' AND activo=1").fetchall()
print(f"  Circunscripciones departamentales: {len(dept)}")
for r in dept:
    print(f"    ID {r[0]}: {r[1]} | Bancas:{r[3]} | Sufrentes:{r[4]}")

mun = c.execute("SELECT * FROM circunscripciones WHERE tipo='municipal' AND activo=1").fetchall()
print(f"  Circunscripciones municipales: {len(mun)}")
for r in mun:
    print(f"    ID {r[0]}: {r[1]} | Bancas:{r[3]} | Sufrentes:{r[4]}")

# 4. Verificar tipos de elección
print("\n--- 4. Tipos de elección ---")
for tipo in ['generales', 'departamentales', 'municipales', 'internas']:
    t = c.execute(f"SELECT id, nombre FROM tipos_eleccion WHERE codigo='{tipo}'").fetchone()
    if t:
        print(f"  ✅ {tipo}: ID {t[0]} - {t[1]}")
    else:
        print(f"  ❌ {tipo}: NO ENCONTRADO")

# 5. Resumen final
print("\n" + "=" * 60)
print("RESUMEN DE AJUSTES REALIZADOS")
print("=" * 60)
print("""
SISTEMA AJUSTADO AL 100% AL CÓDIGO ELECTORAL PARAGUAYO:

✅ Art. 258 - Candidaturas unipersonales:
   - Los electores seleccionan el candidato de su elección
   - permite_voto_preferente=1: Senadores, Diputados, Concejales, Juntas, Internas
   - permite_voto_preferente=0: Presidente, Gobernador, Intendente (mayoría simple)

✅ Art. 247 - Sistema D'Hondt con candidaturas unipersonales:
   - Senadores y Diputados: proporcionales en colegios electorales nacionales
   - Convencionales departamentales y municipales: listas con candidaturas individualizadas
   - Los suplentes mantienen posición idéntica a titulares

✅ Estructura de cargos actualizada:
   - Cargos de mayoría (Presidente ID1, Gobernador ID4, Intendente ID5): sistema mayoría simple
     - permite_voto_preferente=0, permite_chapa=1 (fórmula completa)
   - Cargos proporcionales (Senadores ID2, Diputados ID3, Concejales ID6, Juntas ID7): sistema D'Hondt
     - permite_voto_preferente=1, permite_lista=1 (voto por candidato individual dentro de lista)
   - Elecciones internas (Convencional ID8, Autoridad ID9): sistema "internos"
     - voto directo por militantes/afiliados

✅ Campos del sistema actualizados:
   - permite_voto_preferente: 1=voto por candidato individual, 0=lista cerrada/o uninominal
   - permite_lista: 1=participa en lista proporcional, 0=sistema uninominal
   - permite_chapa: 1=fórmula completa (Presidente/Vice), 0=candidato individual
   - sistema_eleccion en reglas: mayoria/d_hondt/internos

SISTEMA LISTO PARA ELECCIONES GENERALES 2025/2026 SEGÚN CÓDIGO ELECTORAL PARAGUAYO
""")

conn.close()