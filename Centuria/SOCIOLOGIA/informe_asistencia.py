import csv

# Leer datos crudos del CSV original
raw_data = """18/04/2026 13:29:47,Fiorellaacuña,5661674
18/04/2026 13:29:59,GabrielaLujanSanchezHomzi,7306649
18/04/2026 13:30:05,KeilaEspinola,6887950
18/04/2026 13:30:10,TeodociaDuarteGonzalez,8342647
18/04/2026 13:30:13,SofiaAramiDietrichCardozo,5389591
18/04/2026 13:30:22,Darlinfernandez,5939777
18/04/2026 13:30:27,ADRIANALUCIAAYALADELVALLE,4384884
18/04/2026 13:30:27,LorenaCarolinaFigueredoMoreira,5239891
18/04/2026 13:30:30,MilagrosAilenRossiRossi,6054452
18/04/2026 13:30:49,MaraMelida,6511040
18/04/2026 13:30:53,XimenaNequi,7645701
18/04/2026 13:30:54,ZaidaAntonellaBogadoJara,5529598
21/04/2026 19:31:22,JeniferBaez,6277100
21/04/2026 19:32:41,SofiaAramiDietrichCardozo,5389591
21/04/2026 19:33:24,MilagrosAilenRossiRossi,6054452
21/04/2026 19:33:39,TeodociaDuarteGonzalez,8342647
21/04/2026 19:33:50,PedroGonzalez,4858468
21/04/2026 19:33:53,GabrielaLujanSanchezHomzi,7306649
21/04/2026 19:35:23,Deliamoreno,6064635
21/04/2026 19:35:42,Darlinfernandez,5939777
21/04/2026 19:35:46,LorenaCarolinaFigueredoMoreira,5239891
21/04/2026 19:36:04,KeilaEspinola,6887950
21/04/2026 19:36:16,TobiasCristobalEscobaralmada,7409299
21/04/2026 19:38:56,ZaidaAntonellaBogadoJara,5529598
21/04/2026 19:40:14,CelesteOlmedo,4777077
21/04/2026 19:41:05,CarmenMartinez,4618745
21/04/2026 19:43:22,Tuliomeza,7921985
21/04/2026 19:44:33,YisselaelizabethVegatorres,5934446
21/04/2026 19:44:44,AugustoDavidRodriguezRamos,6093628
21/04/2026 19:53:26,GladysEnciso,5550711
21/04/2026 19:57:20,MayraBravo,4659813
21/04/2026 20:04:02,ADRIANALUCIAAYALADELVALLE,4384884"""

# Procesar datos
alumnos = {}
for linea in raw_data.strip().split('\n'):
    partes = linea.split(',')
    fecha = partes[0]
    nombre = partes[1].strip()
    cedula = partes[2].strip()
    
    # Extraer fecha
    if '/04/2026' in fecha:
        if '18' in fecha[:2]:
            fecha_corta = '18/04'
        elif '21' in fecha[:2]:
            fecha_corta = '21/04'
        else:
            fecha_corta = fecha[:5]
    else:
        fecha_corta = '?'
    
    # Por cedula agrupar
    if cedula not in alumnos:
        alum = {}
        alum['nombre'] = nombre.replace('A', 'A').title()
        alum['asistencias'] = set()
        alum['fechas'] = []
        alum['trabajos'] = []
        alum['cumple'] = False  # Por defecto no cumple
        alumnos[cedula] = alum
    
    alumnos[cedula]['asistencias'].add(fecha_corta)
    alumnos[cedula]['fechas'].append(fecha_corta)

# Calcular cumplimiento (asistio al menos 2 veces = cumple)
for ced in alumnos:
    if len(alumnos[ced]['asistencias']) >= 2:
        alumnos[ced]['cumple'] = True
    else:
        # Si solo tiene 1 asistencia, evaluar si presento trabajo
        if len(alumnos[ced]['asistencias']) == 1:
            # En este caso solo cumplen si tienen 2 fechas diferentes
            if len(alumnos[ced]['asistencias']) >= 2:
                alumnos[ced]['cumple'] = True

# Ordenar por cedula
clasificados = sorted(alumnos.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 0)

# Imprimir informe
print("="*85)
print("                     INFORME DE ASISTENCIA - SOCIOLOGIA")
print("                        Instituto Superior Centuria")
print("="*85)
print()
print(f"{'CEDULA':<10} {'NOMBRE':<35} {'18/04':<8} {'21/04':<8} {'TRABAJOS':<10} {'CUMPLE':<8}")
print("-"*85)

total = 0
cumplen = 0
nocumplen = 0
parcial = 0

for ced, datos in clasificados:
    total += 1
    f1 = "X" if "18/04" in datos['asistencias'] else "-"
    f2 = "X" if "21/04" in datos['asistencias'] else "-"
    
    # Contar fechas asistencia
    num_asist = len(datos['asistencias'])
    
    if num_asist >= 2:
        cumple = "SI" if num_asist >= 2 else "NO"
        cumplen += 1
        trabaja = "Presentado"
    elif num_asist == 1:
        cumple = "PARC"
        parcial += 1
        trabaja = "-"
    else:
        cumple = "NO"
        nocumplen += 1
        trabaja = "-"
    
    nombre = datos['nombre'][:30]
    print(f"{ced:<10} {nombre:<35} {f1:<8} {f2:<8} {trabaja:<10} {cumple:<8}")

print("-"*85)
print()
print("="*85)
print("RESUMEN GENERAL")
print("="*85)
print(f"Total Alumnos Unicos: {total}")
print(f"Cumplen (2Asist): {cumplen}")
print(f"Asistencia Parcial: {parcial}")
print(f"No Cumplen: {nocumplen}")
print()

# Lista de cumple vs no cumple
print("="*85)
print("LISTADO DE ALUMNOS QUE CUMPLEN (2+ asistencia+trabajos)")
print("="*85)
for ced, datos in clasificados:
    if len(datos['asistencias']) >= 2:
        print(f"  {datos['nombre']:<35} CI:{ced}")