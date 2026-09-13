import csv

alumnos = {}
with open('asistencia_temp.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        ced = row['Cedula de Identidad']
        nombre = row['Nombre y Apellido']
        estado = row['Estado']
        if ced not in alumnos:
            alum = {}
            alum['nombre'] = nombre
            alum['F1'] = False
            alum['F2'] = False
            alumnos[ced] = alum
        if estado == 'F1':
            alumnos[ced]['F1'] = True
        if estado == 'F2':
            alumnos[ced]['F2'] = True

print("="*60)
print("      INFORME DE ASISTENCIA - SOCIOLOGIA")
print("="*60)
print()
print("NRO  CEDULA     NOMBRE                              18/04  21/04")
print("-"*60)

total = 0
dos = 0
uno = 0
cero = 0

i = 1
for ced in sorted(alumnos.keys()):
    datos = alumnos[ced]
    f1 = "X" if datos['F1'] else "-"
    f2 = "X" if datos['F2'] else "-"
    if datos['F1'] and datos['F2']:
        dos = dos + 1
    elif datos['F1'] or datos['F2']:
        uno = uno + 1
    else:
        cero = cero + 1
    total = total + 1
    
    nombre = datos['nombre'][:30]
    print(str(i).ljust(4), ced.ljust(10), nombre.ljust(32), f1.ljust(6), f2)
    i = i + 1

print()
print("="*60)
print("TOTAL ALUMNOS UNICOS:", total)
print("Asistencia perfecta (2/2):", dos)
print("Asistencia parcial (1/2):", uno)
print("Sin asistencia (0/2):", cero)