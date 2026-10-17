import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print('=== ESTRUCTURA DE TABLAS DE TRANSPORTE ===')
print()

# Ver tabla transportes
print('1. TABLA transportes:')
trans_cols = c.execute('PRAGMA table_info(transportes)').fetchall()
for col in trans_cols:
    print(f'   {col[1]}: type={col[2]}, notnull={col[3]}, default={col[4]}')

print()
transportes = c.execute('SELECT * FROM transportes LIMIT 5').fetchall()
if transportes:
    print(f'   Registros: {len(transportes)}')
    for t in transportes[:3]:
        print(f'   ID {t[0]}: {t[1]} - {t[2]} - Placa: {t[4]} - Estado: {t[8] if len(t)>8 else "N/A"}')
else:
    print('   (vacía)')

print()

# Ver tabla ubicaciones_gps
print('2. TABLA ubicaciones_gps:')
gps_cols = c.execute('PRAGMA table_info(ubicaciones_gps)').fetchall()
for col in gps_cols:
    print(f'   {col[1]}: type={col[2]}, notnull={col[3]}, default={col[4]}')

print()
gps = c.execute('SELECT * FROM ubicaciones_gps LIMIT 5').fetchall()
if gps:
    print(f'   Registros: {len(gps)}')
    for g in gps[:3]:
        print(f'   ID {g[0]}: transporte_id={g[1]}, lat={g[2]}, lng={g[3]}, vel={g[5]}, dir={g[6]}')
else:
    print('   (vacía)')

print()

# Ver tabla rutas
print('3. TABLA rutas:')
rutas_cols = c.execute('PRAGMA table_info(rutas)').fetchall()
for col in rutas_cols:
    print(f'   {col[1]}: type={col[2]}, notnull={col[3]}, default={col[4]}')

print()
rutas = c.execute('SELECT * FROM rutas LIMIT 5').fetchall()
if rutas:
    print(f'   Registros: {len(rutas)}')
    for r in rutas[:3]:
        print(f'   ID {r[0]}: transporte_id={r[1]}, origen={r[2]}, destino={r[3]}, estado={r[4]}')
else:
    print('   (vacía)')

conn.close()
print('\n✅ Estructura verificada')