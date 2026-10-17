# -*- coding: utf-8 -*-
import sqlite3

def fix():
    conn = sqlite3.connect('database/ddia.db')
    c = conn.cursor()

    updates_cfg = [
        (1, 'Seccional', 'Secc', 'PC'),
        (2, 'Comité', 'Comité', 'PC'),
        (3, 'Comando Zonal', 'Comando', 'PC'),
        (4, 'Puesto de Comando', 'PC', 'PC'),
        (5, 'Seccional Ética', 'Secc', 'PC'),
        (6, 'Comité Progresista', 'Comité', 'PC'),
        (7, 'Coordinadora Distrital', 'Coord', 'PC'),
        (8, 'Comando Ciudadano', 'Comando', 'PC'),
        (9, 'Comité Popular', 'Comité', 'PC'),
        (10, 'Comité Febrerista', 'Comité', 'PC'),
        (11, 'Coordinadora Barrial', 'Coord', 'PC'),
        (12, 'Comité Comunitario', 'Comité', 'PC'),
        (13, 'Comité Social', 'Comité', 'PC'),
    ]

    for pid, nu, pu, npc in updates_cfg:
        c.execute('''UPDATE partidos_config_organizacion 
                     SET nombre_unidad=?, prefijo_unidad=?, nombre_pc=? 
                     WHERE partido_id=?''', (nu, pu, npc, pid))

    # Recorrer todas las unidades y asegurar nombres limpios sin caracteres corruptos
    unidades = c.execute("SELECT u.id, u.partido_id, u.numero, cfg.prefijo_unidad FROM unidades_organizacion u JOIN partidos_config_organizacion cfg ON cfg.partido_id = u.partido_id").fetchall()
    for uid, pid, num, prefijo in unidades:
        nombre_limpio = f"{prefijo} Nº {num}"
        # Si tiene depto o circuito
        zona = ""
        if pid == 1 and num <= 13:
            zona = " - Asunción"
        elif pid == 1 and num <= 18:
            zona = " - Luque"
        elif pid == 1 and num <= 22:
            zona = " - Capiatá"
        elif pid == 1 and num <= 28:
            zona = " - San Lorenzo"
        elif pid == 1:
            zona = " - Fernando de la Mora"
        elif pid == 2 and num <= 4:
            zona = " - Asunción"
        else:
            circuitos = [
                "Capital - Circuito 1",
                "Capital - Circuito 2",
                "Central - San Lorenzo",
                "Central - Fernando de la Mora",
                "Alto Paraná - Ciudad del Este"
            ]
            idx = (num - 1) % len(circuitos)
            zona = f" - {circuitos[idx]}"

        nombre_final = f"{prefijo} Nº {num}{zona}"
        c.execute("UPDATE unidades_organizacion SET nombre=? WHERE id=?", (nombre_final, uid))

    conn.commit()
    print("Codificación UTF-8 normalizada con éxito en ddia.db.")
    conn.close()

if __name__ == '__main__':
    fix()
