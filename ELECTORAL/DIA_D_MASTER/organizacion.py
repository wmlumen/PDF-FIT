"""
organizacion.py — Jerarquía organizacional del Partido para DIA_D_MASTER.

Modelo (según lo descripto por el cliente):

    CLIENTE (puede ser Partido Político o Candidato o Dirigente)
      └── PARTIDO POLITICO (vinculado por 1..N DIRIGENTES)
            ├── DEPARTAMENTAL      -> departamentos (18)
            ├── DISTRITAL          -> distritos (254)
            ├── SECCIONAL          -> unidades_organizacion  ("Secc Nº N")
            ├── ESCUELA ELECTORAL  -> escuelas_electorales   (NUEVA)
            ├── PC (Puesto Comando)-> puestos_comando
            │     ├── apoya a 1..N CANDIDATOS   -> estructura_politica
            │     └── tiene 1..N CONDUCTORES    -> transportes.pc_id (NUEVA col)
            ├── DIRIGENTE          -> dirigentes (+ grupo_dirigentes)
            └── VOTANTE (votó o no)-> registros / no_voto

IMPORTANTE — no duplicar lo que ya existe:
  * `unidades_organizacion` YA son las seccionales ("Secc Nº 1".."Secc Nº 13").
  * `distritos` ya cuelga de `departamentos`.
  * `puestos_comando` ya cuelga de `unidades_organizacion`.
  Por eso este módulo SOLO crea `escuelas_electorales` y agrega los vínculos
  que faltaban (transportes.pc_id / transportes.cliente_cedula).
"""

import sqlite3
from datetime import datetime


def _now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ══════════════════════════════════════════════════════════════════════════
# TABLAS NUEVAS
# ══════════════════════════════════════════════════════════════════════════
TABLAS = {
    # Escuela Electoral: entidad formativa del partido.
    # Cuelga del partido y opcionalmente de un ámbito territorial.
    "escuelas_electorales": """
        CREATE TABLE IF NOT EXISTS escuelas_electorales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partido_id INTEGER,
            cliente_cedula TEXT DEFAULT '',
            nombre TEXT NOT NULL,
            departamento_id INTEGER,
            distrito_id INTEGER,
            unidad_id INTEGER,
            responsable_cedula TEXT DEFAULT '',
            direccion TEXT DEFAULT '',
            telefono TEXT DEFAULT '',
            activo INTEGER DEFAULT 1,
            creado TEXT,
            actualizado TEXT
        )""",
    # Vínculo explícito partido <-> dirigente (con rol dentro del partido).
    # Complementa dirigentes.cliente_cedula, que es 1:1.
    "partido_dirigentes": """
        CREATE TABLE IF NOT EXISTS partido_dirigentes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partido_id INTEGER NOT NULL,
            dirigente_cedula TEXT NOT NULL,
            rol_partido TEXT DEFAULT 'dirigente',
            activo INTEGER DEFAULT 1,
            creado TEXT,
            UNIQUE(partido_id, dirigente_cedula)
        )""",
    # Vínculo PC <-> candidato que apoya (complementa estructura_politica).
    "pc_candidatos": """
        CREATE TABLE IF NOT EXISTS pc_candidatos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pc_id INTEGER NOT NULL,
            candidato_id INTEGER NOT NULL,
            tipo_apoyo TEXT DEFAULT 'apoyo',
            activo INTEGER DEFAULT 1,
            creado TEXT,
            UNIQUE(pc_id, candidato_id)
        )""",
}

INDICES = [
    ("idx_escuelas_partido", "escuelas_electorales(partido_id)"),
    ("idx_escuelas_depto", "escuelas_electorales(departamento_id)"),
    ("idx_partido_dirigentes_p", "partido_dirigentes(partido_id)"),
    ("idx_partido_dirigentes_d", "partido_dirigentes(dirigente_cedula)"),
    ("idx_pc_candidatos_pc", "pc_candidatos(pc_id)"),
    ("idx_pc_candidatos_cand", "pc_candidatos(candidato_id)"),
    ("idx_transportes_pc", "transportes(pc_id)"),
    ("idx_transportes_cliente", "transportes(cliente_cedula)"),
]


def init_organizacion(conn=None):
    """Crea tablas e índices. Idempotente.

    OJO (GITHUT): `transportes` YA tiene cliente_cedula, y `dirigentes` YA tiene
    cliente_cedula/tiene_vehiculo_propio/vehiculo_transporte_id. NO se duplican.
    """
    cerrar = False
    if conn is None:
        import database
        conn = database.get_connection()
        cerrar = True
    c = conn.cursor()
    creadas = []
    for nombre, ddl in TABLAS.items():
        try:
            c.execute(ddl)
            creadas.append(nombre)
        except Exception as e:
            creadas.append(f"{nombre}:ERROR {e}")
    # Columnas nuevas en transportes (conductor -> PC). cliente_cedula ya existe en GITHUT.
    cols_t = [r[1] for r in c.execute("PRAGMA table_info(transportes)")]
    if "pc_id" not in cols_t:
        c.execute("ALTER TABLE transportes ADD COLUMN pc_id INTEGER DEFAULT NULL")
        creadas.append("transportes.pc_id")
    # Columnas nuevas en dirigentes (partido directo). cliente_cedula ya existe en GITHUT.
    cols_d = [r[1] for r in c.execute("PRAGMA table_info(dirigentes)")]
    if "partido_id" not in cols_d:
        c.execute("ALTER TABLE dirigentes ADD COLUMN partido_id INTEGER DEFAULT NULL")
        creadas.append("dirigentes.partido_id")
    for nombre, definicion in INDICES:
        try:
            c.execute(f"CREATE INDEX IF NOT EXISTS {nombre} ON {definicion}")
        except Exception:
            pass
    conn.commit()
    if cerrar:
        conn.close()
    return creadas


# ══════════════════════════════════════════════════════════════════════════
# ÁRBOL JERÁRQUICO DEL PARTIDO
# ══════════════════════════════════════════════════════════════════════════
def arbol_partido(conn, partido_id):
    """Devuelve el árbol completo de un partido con todos sus niveles.

    Estructura:
      partido
        departamentos -> distritos -> seccionales -> PCs -> (candidatos, conductores)
        escuelas
        dirigentes
        votantes (resumen: votó / no votó / pendiente)
    """
    c = conn.cursor()

    p = c.execute("""SELECT id, nombre_oficial, sigla, ambito, cliente_cedula
                     FROM partidos WHERE id=?""", (partido_id,)).fetchone()
    if not p:
        return {"error": f"Partido {partido_id} no existe"}
    partido = {"id": p[0], "nombre": p[1], "sigla": p[2], "ambito": p[3],
               "cliente_cedula": p[4]}

    # Seccionales (unidades_organizacion) con su ubicación
    seccionales = []
    for r in c.execute("""
        SELECT u.id, u.numero, u.nombre, u.departamento_id, u.distrito_id,
               d.nombre AS depto_nombre, di.nombre AS dist_nombre
        FROM unidades_organizacion u
        LEFT JOIN departamentos d ON d.id = u.departamento_id
        LEFT JOIN distritos di ON di.id = u.distrito_id
        WHERE u.partido_id=? ORDER BY u.numero""", (partido_id,)):
        seccionales.append({
            "id": r[0], "numero": r[1], "nombre": r[2],
            "departamento_id": r[3], "distrito_id": r[4],
            "departamento": r[5], "distrito": r[6], "pcs": []})

    # PCs por seccional (con candidatos que apoyan y conductores)
    secc_por_id = {s["id"]: s for s in seccionales}
    for r in c.execute("""
        SELECT pc.id, pc.unidad_id, pc.numero, pc.rol, pc.codigo, pc.candidato_cedula
        FROM puestos_comando pc
        JOIN unidades_organizacion u ON u.id = pc.unidad_id
        WHERE u.partido_id=? ORDER BY pc.unidad_id, pc.numero""", (partido_id,)):
        pc = {"id": r[0], "numero": r[2], "rol": r[3], "codigo": r[4],
              "candidato_cedula": r[5], "candidatos": [], "conductores": []}
        # candidatos que apoya este PC
        for cc in c.execute("""
            SELECT cand.id, cand.nombre, cand.cargo, pcc.tipo_apoyo
            FROM pc_candidatos pcc
            JOIN candidatos cand ON cand.id = pcc.candidato_id
            WHERE pcc.pc_id=? AND pcc.activo=1""", (r[0],)):
            pc["candidatos"].append({"id": cc[0], "nombre": cc[1],
                                     "cargo": cc[2], "tipo_apoyo": cc[3]})
        # conductores (transportes) de este PC
        for t in c.execute("""SELECT id, cedula, nombre, placa, tipo
                              FROM transportes WHERE pc_id=?""", (r[0],)):
            pc["conductores"].append({"id": t[0], "cedula": t[1], "nombre": t[2],
                                      "placa": t[3], "tipo": t[4]})
        if r[1] in secc_por_id:
            secc_por_id[r[1]]["pcs"].append(pc)

    # Departamentos con sus distritos (solo los que tienen seccionales)
    deptos = {}
    for s in seccionales:
        dk = s["departamento_id"]
        if dk not in deptos:
            deptos[dk] = {"id": dk, "nombre": s["departamento"], "distritos": {}}
        dk2 = s["distrito_id"]
        if dk2 not in deptos[dk]["distritos"]:
            deptos[dk]["distritos"][dk2] = {"id": dk2, "nombre": s["distrito"],
                                            "seccionales": []}
        deptos[dk]["distritos"][dk2]["seccionales"].append(s)
    for d in deptos.values():
        d["distritos"] = list(d["distritos"].values())

    # Escuelas electorales
    escuelas = []
    for r in c.execute("""SELECT e.id, e.nombre, e.departamento_id, e.distrito_id,
                                 e.responsable_cedula, e.direccion, e.telefono
                          FROM escuelas_electorales e
                          WHERE e.partido_id=? AND e.activo=1
                          ORDER BY e.nombre""", (partido_id,)):
        escuelas.append({"id": r[0], "nombre": r[1], "departamento_id": r[2],
                         "distrito_id": r[3], "responsable_cedula": r[4],
                         "direccion": r[5], "telefono": r[6]})

    # Dirigentes del partido
    dirigentes = []
    for r in c.execute("""
        SELECT DISTINCT d.cedula, d.nombre, d.tipo, pd.rol_partido
        FROM dirigentes d
        LEFT JOIN partido_dirigentes pd
               ON pd.dirigente_cedula = d.cedula AND pd.partido_id = ?
        WHERE d.cliente_cedula IN (SELECT cedula FROM partidos WHERE id=?)
           OR d.partido_id = ?
           OR pd.partido_id = ?
        ORDER BY d.nombre""", (partido_id, partido_id, partido_id, partido_id)):
        dirigentes.append({"cedula": r[0], "nombre": r[1], "tipo": r[2],
                           "rol_partido": r[3] or "dirigente"})

    # Votantes: votó / no votó / pendiente (solo si hay seccionales)
    votantes = _resumen_votantes(conn, partido_id)

    return {
        "partido": partido,
        "departamentos": list(deptos.values()),
        "seccionales": seccionales,
        "escuelas": escuelas,
        "dirigentes": dirigentes,
        "votantes": votantes,
        "totales": {
            "departamentos": len(deptos),
            "distritos": sum(len(d["distritos"]) for d in deptos.values()),
            "seccionales": len(seccionales),
            "pcs": sum(len(s["pcs"]) for s in seccionales),
            "escuelas": len(escuelas),
            "dirigentes": len(dirigentes),
        },
    }


def _resumen_votantes(conn, partido_id):
    """Resumen de votantes: votó / no votó / pendiente para el partido.

    Los votos (registros) no tienen partido directo, así que se acota por las
    mesas/órdenes que cubren las seccionales del partido. Si no hay
    seccionales, devuelve el global.
    """
    c = conn.cursor()
    try:
        total_padron = c.execute("SELECT COUNT(*) FROM padron2026_completo").fetchone()[0] or 0
    except Exception:
        total_padron = 0
    try:
        votaron = c.execute("SELECT COUNT(*) FROM registros WHERE estado='voto'").fetchone()[0] or 0
    except Exception:
        votaron = 0
    try:
        no_votaron = c.execute("SELECT COUNT(*) FROM no_voto").fetchone()[0] or 0
    except Exception:
        no_votaron = 0
    return {
        "total_padron": total_padron,
        "votaron": votaron,
        "no_votaron": no_votaron,
        "pendientes": max(0, total_padron - votaron - no_votaron),
    }


# ══════════════════════════════════════════════════════════════════════════
# VÍNCULOS (CRUD)
# ══════════════════════════════════════════════════════════════════════════
def vincular_partido_dirigente(conn, partido_id, dirigente_cedula, rol_partido="dirigente"):
    """Vincula un dirigente a un partido (N:M)."""
    c = conn.cursor()
    c.execute("""INSERT OR IGNORE INTO partido_dirigentes
                 (partido_id, dirigente_cedula, rol_partido, activo, creado)
                 VALUES (?,?,?,1,?)""",
              (int(partido_id), str(dirigente_cedula), rol_partido, _now()))
    # Reflejar también en dirigentes.partido_id (1:1 de conveniencia)
    try:
        c.execute("UPDATE dirigentes SET partido_id=? WHERE cedula=?",
                  (int(partido_id), str(dirigente_cedula)))
    except Exception:
        pass
    conn.commit()
    return c.rowcount >= 0


def vincular_pc_candidato(conn, pc_id, candidato_id, tipo_apoyo="apoyo"):
    """Vincula un PC al candidato que apoya (N:M)."""
    c = conn.cursor()
    c.execute("""INSERT OR IGNORE INTO pc_candidatos
                 (pc_id, candidato_id, tipo_apoyo, activo, creado)
                 VALUES (?,?,?,1,?)""",
              (int(pc_id), int(candidato_id), tipo_apoyo, _now()))
    conn.commit()
    return True


def vincular_pc_conductor(conn, pc_id, transporte_id):
    """Asigna un conductor (transporte) a un PC."""
    c = conn.cursor()
    c.execute("UPDATE transportes SET pc_id=? WHERE id=?", (int(pc_id), int(transporte_id)))
    conn.commit()
    return c.rowcount > 0


def crear_escuela(conn, partido_id, nombre, departamento_id=None, distrito_id=None,
                  unidad_id=None, responsable_cedula="", direccion="", telefono=""):
    c = conn.cursor()
    c.execute("""INSERT INTO escuelas_electorales
                 (partido_id, nombre, departamento_id, distrito_id, unidad_id,
                  responsable_cedula, direccion, telefono, activo, creado, actualizado)
                 VALUES (?,?,?,?,?,?,?,?,1,?,?)""",
              (int(partido_id), nombre, departamento_id, distrito_id, unidad_id,
               responsable_cedula, direccion, telefono, _now(), _now()))
    conn.commit()
    return c.lastrowid


# ══════════════════════════════════════════════════════════════════════════
# CONSULTAS DE APOYO
# ══════════════════════════════════════════════════════════════════════════
def partidos_del_dirigente(conn, dirigente_cedula):
    """Qué partidos están vinculados a un dirigente."""
    c = conn.cursor()
    out = []
    for r in c.execute("""
        SELECT p.id, p.nombre_oficial, p.sigla, pd.rol_partido
        FROM partido_dirigentes pd
        JOIN partidos p ON p.id = pd.partido_id
        WHERE pd.dirigente_cedula=? AND pd.activo=1""", (str(dirigente_cedula),)):
        out.append({"id": r[0], "nombre": r[1], "sigla": r[2], "rol_partido": r[3]})
    return out


def candidatos_del_pc(conn, pc_id):
    c = conn.cursor()
    return [{"id": r[0], "nombre": r[1], "cargo": r[2], "tipo_apoyo": r[3]}
            for r in c.execute("""
                SELECT cand.id, cand.nombre, cand.cargo, pcc.tipo_apoyo
                FROM pc_candidatos pcc
                JOIN candidatos cand ON cand.id = pcc.candidato_id
                WHERE pcc.pc_id=? AND pcc.activo=1""", (int(pc_id),))]


def conductores_del_pc(conn, pc_id):
    c = conn.cursor()
    return [{"id": r[0], "cedula": r[1], "nombre": r[2], "placa": r[3]}
            for r in c.execute("""SELECT id, cedula, nombre, placa
                                  FROM transportes WHERE pc_id=?""", (int(pc_id),))]


def pcs_del_conductor(conn, transporte_id):
    c = conn.cursor()
    r = c.execute("""SELECT pc.id, pc.codigo, u.nombre
                     FROM transportes t
                     JOIN puestos_comando pc ON pc.id = t.pc_id
                     LEFT JOIN unidades_organizacion u ON u.id = pc.unidad_id
                     WHERE t.id=?""", (int(transporte_id),)).fetchone()
    return {"pc_id": r[0], "codigo": r[1], "seccional": r[2]} if r else None


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "database/ddia.db"
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    print("init:", init_organizacion(conn))
    print("\nÁrbol del partido 1 (ANR):")
    a = arbol_partido(conn, 1)
    print(f"  totales: {a.get('totales')}")
    conn.close()
