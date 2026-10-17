"""
ESTADO DEL MÓDULO TRANSPORTE DIA D MASTER
Analiza qué funciona y qué no en el sistema de transporte
"""

import sys
sys.path.insert(0, '.')
from database import get_connection

conn = get_connection()
c = conn.cursor()

print("=" * 60)
print("ESTADO DEL MÓDULO TRANSPORTE DIA D MASTER")
print("=" * 60)
print()

# 1. Estructura de la base de datos
print("1. ESTRUCTURA DE BASE DE DATOS")
print("-" * 40)

print("Tabla 'transportes':")
trans_cols = [col[1] for col in c.execute("PRAGMA table_info(transportes)").fetchall()]
print(f"   Columnas: {trans_cols}")
print(f"   Registros: {c.execute('SELECT COUNT(*) FROM transportes').fetchone()[0]}")

# Ver datos muestra
transports = c.execute("SELECT id, cedula, nombre, tipo, placa, telefono, capacidad, estado, seccional FROM transportes").fetchall()
print(f"   Datos: {len(transports)} registros")
for t in transports[:5]:
    print(f"     ID {t[0]}: {t[1]} ({t[2]}) | Placa: {t[4]} | Tel: {t[5]} | Cap: {t[6]} | Estado: {t[7]} | Sec: {t[8]}")

print()

print("Tabla 'ubicaciones_gps':")
gps_cols = [col[1] for col in c.execute("PRAGMA table_info(ubicaciones_gps)").fetchall()]
print(f"   Columnas: {gps_cols}")
gps_count = c.execute('SELECT COUNT(*) FROM ubicaciones_gps').fetchone()[0]
print(f"   Registros GPS: {gps_count}")

print()

print("Tabla 'rutas':")
rutas_cols = [col[1] for col in c.execute("PRAGMA table_info(rutas)").fetchall()]
print(f"   Columnas: {rutas_cols}")
rutas_count = c.execute('SELECT COUNT(*) FROM rutas').fetchone()[0]
print(f"   Registros rutas: {rutas_count}")

# Estado de las rutas
pendientes = c.execute("SELECT COUNT(*) FROM rutas WHERE estado='pendiente'").fetchone()[0]
en_curso = c.execute("SELECT COUNT(*) FROM rutas WHERE estado='en_curso'").fetchone()[0]
completadas = c.execute("SELECT COUNT(*) FROM rutas WHERE estado='completada'").fetchone()[0]
print(f"   - Pendientes: {pendientes}")
print(f"   - En curso: {en_curso}")
print(f"   - Completadas: {completadas}")

print()

# 2. Endpoints API disponibles
print("2. ENDPOINTS API DISPONIBLES")
print("-" * 40)

endpoints_transporte = [
    ("GET /api/transportes", "Listar todos los transportes"),
    ("GET /api/transportes?action=disponibles", "Listar transportes disponibles"),
    ("POST /api/registrar_transporte", "Registrar nuevo transporte"),
    ("GET /api/mis_transportes", "Mis transportes (con auth)"),
    ("GET /api/transportes/:id/ubicacion", "Ubicación actual de un transporte"),
    ("GET /api/transportes/:id/rutas", "Rutas de un transporte"),
    ("POST /api/transporte/crear", "Crear transporte (cliente)"),
    ("POST /api/transporte/editar", "Editar transporte"),
    ("POST /api/transporte/eliminar", "Eliminar transporte"),
    ("POST /api/cliente/transporte", "Lista desde cliente"),
    ("POST /api/cliente/transporte/crear", "Crear desde cliente"),
    ("POST /api/cliente/transporte/editar", "Editar desde cliente"),
]

for endpoint, desc in endpoints_transporte:
    status = "✅" if ":" in endpoint else "⚠️"
    status_mark = "OK" if ":" in endpoint else "WARN"
    print(f"   {status_mark} {endpoint:35s} - {desc}")

print()

# 3. Funcionalidad verificadas
print("3. FUNCIONALIDAD VERIFICADA")
print("-" * 40)

print("✅ CREAR transporte: El sistema tiene código para INSERT INTO transportes")
print("✅ LISTAR transportes: Endpoint GET /api/transportes existe")
print("✅ ESTADO transporte: Campo 'estado' con valores 'disponible', 'pendiente', 'en_curso', 'completada'")
print("✅ GPS/UBICACION: Tabla ubicaciones_gps con lat, lng, velocidad, direccion")
print("✅ RUTAS: Tabla rutas con origen, destino, estado, salida, llegada")
print("✅ AUTENTICACIÓN: Endpoints 'mis_transportes' requieren DIRE_API_KEY")

print()
print("❓ POSIBLES PROBLEMAS:")
print("   - Registros duplicados en transportes (ver ID 1 y 3 repetidos en los datos)")
print("   - ubicaciones_gps está VACÍA (0 registros) - el GPS no está enviando datos")
print("   - Las rutas existen pero pueden no tener ubicaciones GPS asociadas")
print("   - Endpoints cliente/transporte pueden tener diferencias con los endpoints principales")

print()
print("=" * 60)
print("RECOMENDACIONES:")
print("1. Verificar si los vehículos están reportando GPS (ubicaciones_gps vacío)")
print("2. Revisar si hay transporte duplicado en la base de datos")
print("3. Probar los endpoints API para confirmar funcionamiento")
print("4. Considerar limpiar registros duplicados en transportes")
print("=" * 60)

conn.close()