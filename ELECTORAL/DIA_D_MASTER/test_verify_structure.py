# -*- coding: utf-8 -*-
import sqlite3

conn = sqlite3.connect('database/ddia.db')
c = conn.cursor()

print("=== REVISIÓN DE ESTRUCTURA Y NOMENCLATURA POR PARTIDO ===")
partidos = c.execute("SELECT id, sigla, nombre_oficial, color_principal_hex FROM partidos").fetchall()

for pid, sigla, nombre_oficial, color in partidos:
    cfg = c.execute("SELECT nombre_unidad, prefijo_unidad, nombre_pc FROM partidos_config_organizacion WHERE partido_id=?", (pid,)).fetchone()
    u_cnt = c.execute("SELECT COUNT(*) FROM unidades_organizacion WHERE partido_id=?", (pid,)).fetchone()[0]
    pc_cnt = c.execute("SELECT COUNT(*) FROM puestos_comando pc JOIN unidades_organizacion u ON u.id = pc.unidad_id WHERE u.partido_id=?", (pid,)).fetchone()[0]
    
    # PCs con escuelas
    pcs_con_escuela = c.execute("SELECT COUNT(*) FROM puestos_comando pc JOIN unidades_organizacion u ON u.id = pc.unidad_id WHERE u.partido_id=? AND pc.escuela_nombre IS NOT NULL AND pc.escuela_nombre != ''", (pid,)).fetchone()[0]

    u_nom = cfg[0] if cfg else 'N/A'
    p_pref = cfg[1] if cfg else 'N/A'
    p_pc = cfg[2] if cfg else 'N/A'
    print(f"[{sigla}] Color: {color} | Unidad: {u_nom} ({p_pref}) | PC: {p_pc} | Unidades: {u_cnt} | PCs: {pc_cnt} (Escuelas: {pcs_con_escuela})")

print("\n=== TOTALES GLOBALES ===")
print("Total Unidades Organizativas:", c.execute("SELECT COUNT(*) FROM unidades_organizacion").fetchone()[0])
print("Total Puestos de Comando (PCs):", c.execute("SELECT COUNT(*) FROM puestos_comando").fetchone()[0])
print("Total Veedores:", c.execute("SELECT COUNT(*) FROM veedores_mesa").fetchone()[0])
print("Total Miembros de Mesa:", c.execute("SELECT COUNT(*) FROM miembros_mesa").fetchone()[0])
print("Total Asistencias Miembros:", c.execute("SELECT COUNT(*) FROM asistencia_miembros").fetchone()[0])

conn.close()
