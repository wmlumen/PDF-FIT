import sqlite3

conn = sqlite3.connect('database/ddia.db')
cur = conn.cursor()

# ==========================================
# 1. CREAR CLIENTE DEMO (Centro de Estudiantes)
# ==========================================
ced_cliente = 'CEDEMO1'
nombre_cliente = 'Centro de Estudiantes Demo'
apellido_cliente = 'Estudantil'
pw_cliente = '123456'
tipo_cliente = 'pc'
categoria_cliente = 'ce'
css_tema = 'neutral'
plan_visibilidad = 'propio'

existing = cur.execute("SELECT cedula FROM clientes WHERE cedula=?", (ced_cliente,)).fetchone()
if existing:
    print(f'Cliente {ced_cliente} ya existe, actualizando...')
    cur.execute("UPDATE clientes SET nombre=?, apellido=?, contrasena=?, tipo=?, categoria=?, css_tema=?, plan_visibilidad=? WHERE cedula=?",
               (nombre_cliente, apellido_cliente, pw_cliente, tipo_cliente, categoria_cliente, css_tema, plan_visibilidad, ced_cliente))
else:
    print(f'Creando cliente {ced_cliente}...')
    cur.execute("INSERT INTO clientes (cedula, nombre, apellido, contrasena, tipo, categoria, css_tema, plan_visibilidad) VALUES (?,?,?,?,?,?,?,?)",
               (ced_cliente, nombre_cliente, apellido_cliente, pw_cliente, tipo_cliente, categoria_cliente, css_tema, plan_visibilidad))

conn.commit()
print('Cliente creado/actualizado')

# ==========================================
# 2. CREAR CANDIDATO PARA ESE CLIENTE
# ==========================================
cand_nombre = 'María Fernández'
cargoc = 'Representante'

print('Creando candidato para cliente...')
# El campo lista_nro es NOT NULL, poner valor por defecto
cur.execute("INSERT INTO candidatos (nombre, cargo, cliente_cedula, lista_nro, departamento_id, distrito_id, activo) VALUES (?,?,?,?,?,?,1)",
   (cand_nombre, cargoc, ced_cliente, 1, None, None))

cand_id = cur.lastrowid
conn.commit()
print(f'Candidato creado: id={cand_id}, nombre={cand_nombre}')

# ==========================================
# 3. CREAR GRUPOS TRABAJO (PCs)
# ==========================================
pc_names = [
    ('PC Sección A', 'Urban'),
    ('PC Sección B', 'Rural'),
    ('PC Sección C', 'Mixta'),
]

grupo_ids = []
for i, (nombre, zona) in enumerate(pc_names):
    print(f'Creando grupo trabajo: {nombre}...')
    cur.execute("INSERT INTO grupos_trabajo (nombre, candidato_id, zona, seccional, activo) VALUES (?,?,?,?,1)",
       (nombre, cand_id, zona, f'Sec-{i+1}'))
    grupo_ids.append(cur.lastrowid)

conn.commit()
print(f'{len(grupo_ids)} PC(s) creado(s): {grupo_ids}')

# ==========================================
# 4. CREAR DIRECTORES Y ASIGNAR A PCs
# ==========================================
dir_names = [
    ('88888801', 'Juan Pérez', 'dirigente'),
    ('88888802', 'Laura Gómez', 'dirigente'),
    ('88888803', 'Carlos Ruiz', 'seccional'),
    ('88888804', 'Ana Martínez', 'pc'),
]

dir_ids = []
for i, (ced, nombre, tipo_dir) in enumerate(dir_names):
    print(f'Creando director {nombre} (cedula {ced})...')
    
    pw_default = '123456'
    cur.execute("INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula, activo) VALUES (?,?,?,?,?,1)",
       (ced, nombre, pw_default, tipo_dir, ced_cliente))
    
    dir_new_id = ced
    dir_ids.append(dir_new_id)
    
    # Asignar a un PC
    grupo_idx = i % len(grupo_ids)
    gid = grupo_ids[grupo_idx]
    
    cur.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)",
       (gid, ced))
    
    if tipo_dir in ('seccional', 'pc'):
        cur.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)",
           (gid, ced))

conn.commit()
print(f'{len(dir_names)} director(es) creado(s)')

# ==========================================
# 5. CREAR SUB-DIRECTORES
# ==========================================
print('\nCreando sub-directores...')
sub_dirs = [
    ('88888805', 'Pedro Sub', '88888801', 'dirigente', 'Hijo de Juan Pérez'),
    ('88888806', 'Sofia Sub', '88888802', 'dirigente', 'Hija de Laura Gómez'),
]

for ced, nombre, padre_ced, tipo_sub, desc in sub_dirs:
    print(f'Creando sub-director {nombre} (cedula {ced}, padre={padre_ced})...')
    
    pw_default = '123456'
    cur.execute("INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula, creado_por_cedula, email, activo) VALUES (?,?,?,?,?,?,?,1)",
       (ced, nombre, pw_default, tipo_sub, ced_cliente, padre_ced, f'{ced.lower()}@test.com'))
    
    # Heredar grupos del padre
    grupos_padre = cur.execute("SELECT grupo_id FROM grupo_dirigentes WHERE dirigente_cedula=?", (padre_ced,)).fetchall()
    for (gid,) in grupos_padre:
        cur.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)", (gid, ced))
    
    print(f'  Sub-director creado, heredó {len(grupos_padre)} grupo(s)')

conn.commit()

# ==========================================
# 6. VERIFICACIÓN FINAL
# ==========================================
print('\n' + '='*60)
print('RESUMEN DE DATOS DEMOSTRACIÓN')
print('='*60)

print('\n--- CLIENTES ---')
for row in cur.execute("SELECT cedula, nombre, categoria, plan_visibilidad FROM clientes WHERE cedula LIKE 'CE%' OR cedula LIKE '999%'"):
    print(f'  {row}')

print('\n--- CANDIDATOS ---')
for row in cur.execute("SELECT c.id, c.nombre, c.cargo, cl.nombre FROM candidatos c JOIN clientes cl ON c.cliente_cedula = cl.cedula LIMIT 5"):
    print(f'  Candidato {row[0]}: {row[1]} ({row[2]}) - Cliente: {row[3]}')

print('\n--- GRUPOS TRABAJO (PCs) ---')
for row in cur.execute("SELECT g.id, g.nombre, g.zona, c.nombre FROM grupos_trabajo g JOIN candidatos c ON g.candidato_id = c.id LIMIT 5"):
    print(f'  PC {row[0]}: {row[1]} ({row[2]}) - Para candidato: {row[3]}')

print('\n--- DIRECTORES ---')
for row in cur.execute("SELECT d.cedula, d.nombre, d.tipo, cl.nombre FROM dirigentes d JOIN clientes cl ON d.cliente_cedula = cl.cedula LIMIT 10"):
    print(f'  Director {row[0]}: {row[1]} ({row[2]}) - Cliente: {row[3]}')

print('\n--- GRUPO_DIRIGENTES (asignaciones) ---')
for row in cur.execute("""SELECT gd.grupo_id, d.cedula, d.nombre, cl.nombre 
    FROM grupo_dirigentes gd 
    JOIN dirigentes d ON gd.dirigente_cedula = d.cedula 
    JOIN clientes cl ON d.cliente_cedula = cl.cedula 
    LIMIT 20"""):
    print(f'  Grupo {row[0]}: Director {row[1]} ({row[2]}) - Cliente: {row[3]}')

print('\n' + '='*60)
print('¡Estructura de demo completa!')
print('='*60)

conn.close()