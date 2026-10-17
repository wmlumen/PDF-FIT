import sqlite3

def run():
    conn = sqlite3.connect('database/ddia.db')
    c = conn.cursor()
    
    # 1. Diccionario de terminología y colores oficiales por partido
    configs_partidos = {
        'ANR': {
            'nombre_unidad': 'Seccional', 'prefijo': 'Secc', 'pc': 'PC',
            'color': '#DC2626', 'secundario': '#FFFFFF'
        },
        'PLRA': {
            'nombre_unidad': 'Comité', 'prefijo': 'Comité', 'pc': 'PC',
            'color': '#1D4ED8', 'secundario': '#FFFFFF'
        },
        'PEN': {
            'nombre_unidad': 'Comando Zonal', 'prefijo': 'Comando', 'pc': 'PC',
            'color': '#EA580C', 'secundario': '#FFFFFF'
        },
        'PPQ': {
            'nombre_unidad': 'Puesto de Comando', 'prefijo': 'PC', 'pc': 'PC',
            'color': '#7B1FA2', 'secundario': '#E1BEE7'
        },
        'UNACE': {
            'nombre_unidad': 'Seccional Ética', 'prefijo': 'Secc', 'pc': 'PC',
            'color': '#16A34A', 'secundario': '#C8E6C9'
        },
        'PDP': {
            'nombre_unidad': 'Comité Progresista', 'prefijo': 'Comité', 'pc': 'PC',
            'color': '#CA8A04', 'secundario': '#FEF08A'
        },
        'YO CREO': {
            'nombre_unidad': 'Coordinadora Distrital', 'prefijo': 'Coord', 'pc': 'PC',
            'color': '#0284C7', 'secundario': '#BAE6FD'
        },
        'CN': {
            'nombre_unidad': 'Comando Ciudadano', 'prefijo': 'Comando', 'pc': 'PC',
            'color': '#9333EA', 'secundario': '#F3E8FF'
        },
        'PS': {
            'nombre_unidad': 'Comité Popular', 'prefijo': 'Comité', 'pc': 'PC',
            'color': '#E11D48', 'secundario': '#FFE4E6'
        },
        'PRF': {
            'nombre_unidad': 'Comité Febrerista', 'prefijo': 'Comité', 'pc': 'PC',
            'color': '#DC2626', 'secundario': '#FEE2E2'
        },
        'AP': {
            'nombre_unidad': 'Coordinadora Barrial', 'prefijo': 'Coord', 'pc': 'PC',
            'color': '#0D9488', 'secundario': '#CCFBF1'
        },
        'PT': {
            'nombre_unidad': 'Comité Comunitario', 'prefijo': 'Comité', 'pc': 'PC',
            'color': '#854D0E', 'secundario': '#FEF9C3'
        },
        'DC': {
            'nombre_unidad': 'Comité Social', 'prefijo': 'Comité', 'pc': 'PC',
            'color': '#4338CA', 'secundario': '#E0E7FF'
        }
    }
    
    # 2. Obtener partidos de la base de datos
    partidos = c.execute("SELECT id, sigla, codigo_partido, nombre_oficial FROM partidos").fetchall()
    
    # Lista de escuelas reales obtenidas del padrón
    escuelas_muestra = [
        "COL. NAC. DE LA CAPITAL (CNC)",
        "COL. EXPERIM. PARAGUAY BRASIL-FAC.FILOSOFIA",
        "ESC.DE COMERCIO NRO.3 RCA.PERU",
        "COL.NAC. JUAN L. MALLORQUIN",
        "ESC.NAC.N281 LUIS ALBERTO DE HERRERA",
        "COL.JOSE DE ANTEQUERA Y CASTRO",
        "COL.NAC. CORAZON DE JESUS",
        "COL. NAC. ASUNCION ESCALADA"
    ]
    
    # Circuitos y distritos para la estructura base
    circuitos = [
        {'depto_id': 18, 'dist_id': 254, 'nombre_zona': 'Capital - Circuito 1'},
        {'depto_id': 18, 'dist_id': 254, 'nombre_zona': 'Capital - Circuito 2'},
        {'depto_id': 11, 'dist_id': 198, 'nombre_zona': 'Central - San Lorenzo'},
        {'depto_id': 11, 'dist_id': 186, 'nombre_zona': 'Central - Fernando de la Mora'},
        {'depto_id': 10, 'dist_id': 171, 'nombre_zona': 'Alto Paraná - Ciudad del Este'}
    ]

    print("=== 1. POBLANDO CONFIGURACION Y NOMENCLATURA POR PARTIDO ===")
    for pid, sigla, codigo, nombre_oficial in partidos:
        key = sigla if sigla in configs_partidos else codigo
        cfg = configs_partidos.get(key, {
            'nombre_unidad': 'Base Operativa', 'prefijo': 'Base', 'pc': 'PC',
            'color': '#475569', 'secundario': '#F1F5F9'
        })
        
        # Upsert en partidos_config_organizacion
        c.execute("""
            INSERT INTO partidos_config_organizacion (partido_id, nombre_unidad, prefijo_unidad, nombre_pc)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(partido_id) DO UPDATE SET
                nombre_unidad=excluded.nombre_unidad,
                prefijo_unidad=excluded.prefijo_unidad,
                nombre_pc=excluded.nombre_pc
        """, (pid, cfg['nombre_unidad'], cfg['prefijo'], cfg['pc']))
        
        # Actualizar color oficial si correspondía
        if cfg.get('color'):
            c.execute("UPDATE partidos SET color_principal_hex=?, color_secundario_hex=? WHERE id=?", 
                      (cfg['color'], cfg['secundario'], pid))

    conn.commit()

    print("=== 2. POBLANDO UNIDADES OPERATIVAS Y PCs POR PARTIDO ===")
    for pid, sigla, codigo, nombre_oficial in partidos:
        cfg = c.execute("SELECT nombre_unidad, prefijo_unidad, nombre_pc FROM partidos_config_organizacion WHERE partido_id=?", (pid,)).fetchone()
        nombre_u, prefijo_u, nombre_pc = cfg[0], cfg[1], cfg[2]
        
        # Contar cuántas unidades tiene
        u_count = c.execute("SELECT COUNT(*) FROM unidades_organizacion WHERE partido_id=?", (pid,)).fetchone()[0]
        
        # Si tiene menos de 4 unidades, crearle la estructura base territorial
        if u_count < 4:
            for idx, circ in enumerate(circuitos, start=1):
                num_u = u_count + idx
                nom_completo = f"{prefijo_u} Nº {num_u} - {circ['nombre_zona']}"
                
                c.execute("""
                    INSERT INTO unidades_organizacion (departamento_id, distrito_id, partido_id, numero, nombre, descripcion)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (circ['depto_id'], circ['dist_id'], pid, num_u, nom_completo, f"Unidad operativa base en {circ['nombre_zona']}"))
                
                unidad_id = c.lastrowid
                
                # Crear de 2 a 3 PCs bajo esta unidad, asignando escuelas
                esc1 = escuelas_muestra[(idx * 2) % len(escuelas_muestra)]
                esc2 = escuelas_muestra[(idx * 2 + 1) % len(escuelas_muestra)]
                
                pcs_a_crear = [
                    (1, 'intendente', f"{nombre_pc} {num_u:02d}-01", esc1, f"Puesto comando cabecera para {esc1}"),
                    (2, 'concejal', f"{nombre_pc} {num_u:02d}-02", esc2, f"Puesto comando de apoyo en {esc2}"),
                    (3, 'coordinacion', f"{nombre_pc} {num_u:02d}-03", esc1, f"Puesto comando móvil para {esc1}")
                ]
                
                for pc_num, pc_rol, pc_cod, pc_esc, pc_desc in pcs_a_crear:
                    c.execute("""
                        INSERT INTO puestos_comando (unidad_id, numero, rol, codigo, escuela_nombre, descripcion)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (unidad_id, pc_num, pc_rol, pc_cod, pc_esc, pc_desc))

        else:
            # Si ya tiene unidades (como ANR), asegurar que sus PCs tengan escuelas asignadas si están vacías
            pcs_sin_escuela = c.execute("""
                SELECT pc.id, pc.numero FROM puestos_comando pc
                JOIN unidades_organizacion u ON u.id = pc.unidad_id
                WHERE u.partido_id=? AND (pc.escuela_nombre IS NULL OR pc.escuela_nombre = '')
            """, (pid,)).fetchall()
            
            for pc_id, pc_num in pcs_sin_escuela:
                esc = escuelas_muestra[pc_num % len(escuelas_muestra)]
                c.execute("UPDATE puestos_comando SET escuela_nombre=? WHERE id=?", (esc, pc_id))

    conn.commit()

    print("=== 3. POBLANDO VEEDORES DE MESA (SI VACIO) ===")
    v_count = c.execute("SELECT COUNT(*) FROM veedores_mesa").fetchone()[0]
    if v_count == 0:
        # Asignar veedores para las escuelas de las primeras unidades
        unidades_sample = c.execute("SELECT id, partido_id, nombre FROM unidades_organizacion LIMIT 10").fetchall()
        id_veedor_n = 1
        for u_id, p_id, u_nom in unidades_sample:
            for mesa_n in range(1, 4):
                esc = escuelas_muestra[(u_id + mesa_n) % len(escuelas_muestra)]
                ced_v = f"4{id_veedor_n:05d}"
                nom_v = f"Veedor Titular {id_veedor_n} ({esc[:15]})"
                c.execute("""
                    INSERT INTO veedores_mesa (id_veedor, nombre_veedor, cedula_veedor, seccional_id, escuela_id, mesa_id, telefono, estado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')
                """, (f"VEE-{id_veedor_n:04d}", nom_v, ced_v, u_id, (u_id % 5) + 1, mesa_n, f"0981{id_veedor_n:06d}"))
                id_veedor_n += 1
        print(f"Insertados {id_veedor_n - 1} veedores de mesa.")
        conn.commit()

    print("=== 4. POBLANDO MIEMBROS DE MESA (SI VACIO) ===")
    m_count = c.execute("SELECT COUNT(*) FROM miembros_mesa").fetchone()[0]
    if m_count == 0:
        cargos = ['Presidente de Mesa', 'Vocal 1', 'Vocal 2']
        m_id = 1
        for mesa_n in range(1, 11):
            for cargo in cargos:
                ced_m = f"3{m_id:05d}"
                nom_m = f"{cargo} - Mesa {mesa_n}"
                c.execute("""
                    INSERT INTO miembros_mesa (cedula, nombre, contrasena, mesa, horario_inicio, horario_cierre, estado)
                    VALUES (?, ?, '123', ?, '07:00', '17:00', 'Constituida')
                """, (ced_m, nom_m, mesa_n))
                
                # Asistencia de miembros
                c.execute("""
                    INSERT INTO asistencia_miembros (cedula, nombre, mesa, fecha, hora_ingreso, estado, observacion)
                    VALUES (?, ?, ?, date('now','localtime'), '06:45', 'Presente', 'Mesa aperturada en horario')
                """, (ced_m, nom_m, mesa_n))
                m_id += 1
        print(f"Insertados {m_id - 1} miembros de mesa y registros de asistencia.")
        conn.commit()

    print("\n=== RESUMEN FINAL POR PARTIDO ===")
    for p in c.execute("SELECT id, sigla, color_principal_hex FROM partidos").fetchall():
        pid, sigla, color = p
        u_cnt = c.execute("SELECT COUNT(*) FROM unidades_organizacion WHERE partido_id=?", (pid,)).fetchone()[0]
        pc_cnt = c.execute("SELECT COUNT(*) FROM puestos_comando pc JOIN unidades_organizacion u ON u.id = pc.unidad_id WHERE u.partido_id=?", (pid,)).fetchone()[0]
        cfg = c.execute("SELECT nombre_unidad, prefijo_unidad, nombre_pc FROM partidos_config_organizacion WHERE partido_id=?", (pid,)).fetchone()
        u_nom = cfg[0] if cfg else 'Unidad'
        print(f"Partido {pid:2d} | {sigla:8s} ({color}) | {u_cnt:2d} {u_nom}s | {pc_cnt:2d} PCs operativos")

    print("\nTotales globales en base de datos:")
    print("Total Unidades Organizativas:", c.execute("SELECT COUNT(*) FROM unidades_organizacion").fetchone()[0])
    print("Total Puestos de Comando (PCs):", c.execute("SELECT COUNT(*) FROM puestos_comando").fetchone()[0])
    print("Total Veedores:", c.execute("SELECT COUNT(*) FROM veedores_mesa").fetchone()[0])
    print("Total Miembros de Mesa:", c.execute("SELECT COUNT(*) FROM miembros_mesa").fetchone()[0])

    conn.close()

if __name__ == '__main__':
    run()
