# -*- coding: utf-8 -*-
"""
Importa un padron de afiliados de partido (formato TSJE/ANR: nroreg, cod_dpto,
desc_dep, cod_dist, desc_dis, codigo_sec, desc_sec, slocal, desc_locanr, mesa,
orden, numero_ced, apellido, nombre, fecha_naci, direccion, fecha_afil) a la
tabla afiliados_partido, vinculado a su unidad_organizacion (Seccional/Comite).

Uso:
  python importar_afiliados.py <ruta.xls> <partido_id> <numero_unidad> [--crear-unidad]
"""
import sys
import pandas as pd
from database import get_connection, init_db


def importar(xls_path, partido_id, numero_unidad, crear_unidad=False):
    init_db()
    conn = get_connection()
    c = conn.cursor()

    unidad = c.execute(
        "SELECT id FROM unidades_organizacion WHERE partido_id=? AND numero=?",
        (partido_id, numero_unidad),
    ).fetchone()
    if not unidad:
        if not crear_unidad:
            raise SystemExit(
                f"No existe unidad_organizacion para partido_id={partido_id} numero={numero_unidad}. "
                f"Usa --crear-unidad para crearla."
            )
        c.execute(
            "INSERT INTO unidades_organizacion (partido_id, numero, nombre) VALUES (?,?,?)",
            (partido_id, numero_unidad, f"Seccional N° {numero_unidad}"),
        )
        unidad_id = c.lastrowid
    else:
        unidad_id = unidad[0]

    df = pd.read_excel(xls_path)
    df["numero_ced"] = df["numero_ced"].astype(int).astype(str)

    rows = []
    for _, r in df.iterrows():
        fecha_afil = r["fecha_afil"]
        fecha_afil = fecha_afil.strftime("%Y-%m-%d") if pd.notna(fecha_afil) else None
        rows.append((
            r["numero_ced"], partido_id, unidad_id, int(r["codigo_sec"]),
            r["apellido"], r["nombre"], int(r["mesa"]), int(r["orden"]),
            fecha_afil, xls_path,
        ))

    c.executemany("""
        INSERT INTO afiliados_partido
            (cedula, partido_id, unidad_organizacion_id, codigo_sec_origen,
             apellido, nombre, mesa, orden, fecha_afiliacion, fuente_archivo)
        VALUES (?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(cedula, partido_id) DO UPDATE SET
            unidad_organizacion_id=excluded.unidad_organizacion_id,
            codigo_sec_origen=excluded.codigo_sec_origen,
            apellido=excluded.apellido,
            nombre=excluded.nombre,
            mesa=excluded.mesa,
            orden=excluded.orden,
            fecha_afiliacion=excluded.fecha_afiliacion,
            fuente_archivo=excluded.fuente_archivo
    """, rows)
    conn.commit()

    total = c.execute(
        "SELECT COUNT(*) FROM afiliados_partido WHERE unidad_organizacion_id=?", (unidad_id,)
    ).fetchone()[0]
    matcheados = c.execute("""
        SELECT COUNT(*) FROM afiliados_partido a
        WHERE a.unidad_organizacion_id=?
          AND EXISTS (SELECT 1 FROM padron2026_completo p WHERE p.cedula = a.cedula)
    """, (unidad_id,)).fetchone()[0]

    print(f"Unidad organizacion id={unidad_id} (partido {partido_id}, numero {numero_unidad})")
    print(f"Filas en archivo: {len(rows)}")
    print(f"Afiliados cargados para esta unidad: {total}")
    print(f"Con match en padron nacional (padron2026_completo): {matcheados} ({matcheados*100//total if total else 0}%)")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    xls_path = sys.argv[1]
    partido_id = int(sys.argv[2])
    numero_unidad = int(sys.argv[3])
    crear_unidad = "--crear-unidad" in sys.argv
    importar(xls_path, partido_id, numero_unidad, crear_unidad)
