import sys
import sqlite3
import random
from datetime import datetime
from database import get_connection, init_db

# Inicializar base de datos
init_db()
conn = get_connection()
c = conn.cursor()

print("=" * 60)
print("SIMULACION DE ELECCIONES GENERALES 2026")
print("=" * 60)

# 1. Verificar o crear eleccion general
print("\n[1] Configurando eleccion general...")
t_gen_rows = c.execute("SELECT id FROM tipos_eleccion WHERE codigo='generales'").fetchall()
if t_gen_rows:
    t_gen = t_gen_rows[0][0]
else:
    print("   ERROR: No hay tipo 'generales' definido")
    conn.close()
    sys.exit(1)

eleccion_existente = c.execute("SELECT COUNT(*) FROM elecciones WHERE tipo_eleccion_id=" + str(t_gen)).fetchone()[0]
if eleccion_existente == 0:
    c.execute("INSERT INTO elecciones (tipo_eleccion_id, nombre, periodo, fecha_eleccion, estado) VALUES (?, 'Elecciones Nacionales 2026', '2026-2031', '2026-12-15', 'activa')", (t_gen,))
    conn.commit()
    print("   Eleccion general creada: 'Elecciones Nacionales 2026'")
else:
    print("   Using existing election")

# 2. Obtener candidatos de ejemplo
print("\n[2] Cargando candidatos...")
candidatos_presidente = [
    ('1001', 'Mario Abdo', 'presidente', 'ANR'),
    ('1002', 'Efraín Alegre', 'presidente', 'PLRA'),
    ('1003', 'Rafaela', 'presidente', 'PEN'),
]

# Obtener dirigentes para senadores
dir_rows = c.execute("SELECT cedula, nombre FROM dirigentes WHERE activo=1").fetchall()
candidatos_senador = [(r[0], r[1], 'senador', 'ANR') for r in dir_rows[:10]]

# 3. Simular votos del padrón
print("\n[3] Simulando votos del padrón...")
padrón_total = c.execute("SELECT COUNT(*) FROM padron2026_completo WHERE COALESCE(mesa,0)>0 AND COALESCE(orden,0)>0").fetchone()[0]
print("   Padrón total: " + str(padrón_total) + " electores")

votantes_simulados = max(1, padrón_total // 10)
print("   Votantes simulados: " + str(votantes_simulados))

# 4. Registrar votos
print("\n[4] Registrando votos en sistema...")

# Limpiar votos anteriores
c.execute("DELETE FROM registros WHERE origen='simulacion_general'")
conn.commit()

# Simular y registrar votos para Presidente
print("   - Simulando votos para Presidente...")
votos_presidente = {}
for i in range(votantes_simulados):
    candidato = random.choices(
        population=candidatos_presidente,
        weights=[0.45, 0.40, 0.15],
        k=1
    )[0]
    cedula = candidato[0]
    votos_presidente[cedula] = votos_presidente.get(cedula, 0) + 1
    
    mesa = random.randint(1, 1800)
    orden = random.randint(1, 30)
    c.execute("INSERT INTO registros (cedula, nombre, mesa, orden, estado, accion, dirigente, dirigenteNombre, origen) VALUES (?,?,?,?,?,?,?,?,?)",
              (cedula, candidato[1], mesa, orden, 'voto', 'simulacion_general', cedula, candidato[1], 'web'))

# Simular votos para Senadores por partido
print("   - Simulando votos para Senadores...")
votos_senador_partidos = {'ANR': 0, 'PLRA': 0, 'PEN': 0, 'PAC': 0, 'PPQ': 0}
for i in range(votantes_simulados):
    partido = random.choices(
        ['ANR', 'PLRA', 'PEN', 'PAC', 'PPQ'],
        weights=[0.35, 0.30, 0.15, 0.1, 0.1],
        k=1
    )[0]
    votos_senador_partidos[partido] += 1

# 5. Aplicar sistema D'Hondt para Senadores
print("\n[5] Aplicando sistema D'Hondt para Senadores...")
print("   (45 bancas por distribuir)")

votos = votos_senador_partidos
bancas_totales = 45
asignadas = {}

partidos = list(votos.keys())
conteo_votos = list(votos.values())

for i in range(bancas_totales):
    maximo = 0
    ganador = None
    for j, partido in enumerate(partidos):
        cociente = conteo_votos[j] / (asignadas.get(partido, 0) + 1)
        if cociente > maximo:
            maximo = cociente
            ganador = partido
    
    if ganador:
        asignadas[ganador] = asignadas.get(ganador, 0) + 1

print("   Resultado D'Hondt para Senadores:")
for partido, bancitas in sorted(asignadas.items(), key=lambda x: x[1], reverse=True):
    print("   " + partido + ": " + str(bancitas) + " bancas (votos: " + str(votos[partido]) + ")")

# 6. Asignar bancas a candidatos senator
print("\n[6] Asignando bancas a candidatos Senator...")
senadores_elegidos = []
for partido, cant_bancas in asignadas.items():
    for i in range(min(cant_bancas, len(dir_rows))):
        cedula = dir_rows[i % len(dir_rows)][0]
        nombre = c.execute("SELECT nombre FROM dirigentes WHERE cedula=?", (cedula,)).fetchone()[0]
        senadores_elegidos.append((cedula, nombre, partido))
        print("   Senador: " + nombre + " (" + cedula + ") - Partido: " + partido)

# 7. Resumen final
print("\n" + "=" * 60)
print("RESUMEN DE ELECCIONES GENERALES 2026")
print("=" * 60)

print("\nPRESIDENTE:")
for ced, nombre, cargo, partido in candidatos_presidente:
    votos_i = votos_presidente.get(ced, 0)
    pct = str(int(votos_i/votantes_simulados*100)) + "%" if votantes_simulados > 0 else "0.0%"
    print("   " + nombre + " (" + partido + "): " + str(votos_i) + " votos (" + pct + ")")

print("\nSENADORES (Sistema D'Hondt, 45 bancas):")
for partido, bancitas in sorted(asignadas.items(), key=lambda x: x[1], reverse=True):
    print("   " + partido + ": " + str(bancitas) + " senadores")

print("\nSENADORES ELEGIDOS:")
for ced, nombre, partido in senadores_elegidos:
    print("   - " + nombre + " (" + partido + ")")

# Cerrar conexión
conn.commit()
conn.close()

print("\n✅ Simulación completada exitosamente")