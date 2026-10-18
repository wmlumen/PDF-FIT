"""
Constructor de la DB PÚBLICA del microservicio del votante.
═══════════════════════════════════════════════════════════════
Toma la DB de producción (database/ddia.db, 1 GB, PII real) y produce
database/public_votante.db, una copia MÍNIMA y SANITIZADA con solo lo
que el votante necesita para abrir su enlace.

Reglas de saneamiento (no negociables):
  1. SOLO se incluyen los votantes que tienen token_publico generado.
     Hoy son 2 de 465. El resto del padrón NO se toca.
  2. Se ELIMINA la columna `direccion` del padrón (1.784.187 direcciones reales).
     El votante solo necesita el nombre del local.
  3. Se ELIMINA `direccion` de locales_votacion_tsje (223 direcciones reales).
  4. Se ELIMINAN las credenciales y datos internos de dirigentes (teléfono, etc.):
     solo se conserva el nombre para mostrar "quién lo busca".
  5. NO se incluyen: usuarios, clientes, contraseñas, log_auditoria, push_subscriptions,
     afiliados_partido, registros del sistema, etc.

Uso:
    python3 build_public_db.py [--origen RUTA] [--destino RUTA] [--forzar]

Salida esperada (ejemplo real, 2026-10-17):
    posible_votos          2
    padron (solo esos)     2
    locales                230
    solicitudes            3
    dirigentes (solo nombre) 2
"""

import argparse
import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROYECTO = os.path.dirname(BASE_DIR)
ORIGEN_DEFAULT = os.path.join(PROYECTO, "database", "ddia.db")
DESTINO_DEFAULT = os.path.join(BASE_DIR, "database", "public_votante.db")

# Columnas de padrón que SÍ hacen falta (el resto se descarta). OJO: `direccion` NO está.
PADRON_COLS = ["cedula", "mesa", "orden", "distrito", "sec_loc", "local", "local_nombre"]
# Columnas de locales: se excluye `direccion` (PII).
LOCALES_COLS = ["id_local", "departamento", "distrito", "nombre", "lat", "lng"]
# Dirigentes: SOLO el nombre (para "tu dirigente X te va a buscar"). Sin teléfono/email/contraseña.
DIRIGENTES_COLS = ["cedula", "nombre"]

DDL = """
CREATE TABLE posible_votos (
    id INTEGER PRIMARY KEY,
    dirigente_cedula TEXT,
    votante_cedula TEXT,
    votante_nombre TEXT,
    votante_apellido TEXT,
    votante_mesa INTEGER,
    votante_orden INTEGER,
    status TEXT,
    telefono TEXT,
    token_publico TEXT,
    votante_lat REAL,
    votante_lng REAL,
    votante_ubicacion_en TEXT
);
CREATE TABLE padron2026_completo (
    cedula TEXT PRIMARY KEY,
    mesa INTEGER,
    orden INTEGER,
    distrito TEXT,
    sec_loc TEXT,
    local TEXT,
    local_nombre TEXT
);
CREATE TABLE locales_votacion_tsje (
    id_local INTEGER PRIMARY KEY,
    departamento TEXT,
    distrito TEXT,
    nombre TEXT,
    lat REAL,
    lng REAL
);
CREATE TABLE dirigentes (
    cedula TEXT PRIMARY KEY,
    nombre TEXT
);
CREATE TABLE solicitudes_recogida (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dirigente_cedula TEXT,
    votante_cedula TEXT,
    votante_nombre TEXT,
    hora_recogida TEXT,
    ubicacion TEXT,
    estado TEXT,
    created_at TEXT
);
CREATE TABLE viajes (
    id INTEGER PRIMARY KEY,
    votante_cedula TEXT,
    votante_nombre TEXT,
    tipo TEXT,
    origen_lat REAL, origen_lng REAL,
    destino_lat REAL, destino_lng REAL,
    estado TEXT,
    creado TEXT
);
CREATE TABLE transportes (
    id INTEGER PRIMARY KEY,
    nombre TEXT,
    placa TEXT,
    estado TEXT
);
CREATE TABLE ubicaciones_gps (
    id INTEGER PRIMARY KEY,
    transporte_id INTEGER,
    lat REAL,
    lng REAL,
    timestamp TEXT
);
CREATE TABLE ubicaciones_votantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    votante_cedula TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_pv_token ON posible_votos(token_publico);
CREATE INDEX idx_padron_cedula ON padron2026_completo(cedula);
CREATE INDEX idx_loc_nombre ON locales_votacion_tsje(nombre);
CREATE INDEX idx_sol_vc ON solicitudes_recogida(votante_cedula);
CREATE INDEX idx_viajes_vc ON viajes(votante_cedula);
CREATE INDEX idx_ugps_tid ON ubicaciones_gps(transporte_id);
CREATE INDEX idx_uv_vc ON ubicaciones_votantes(votante_cedula);
"""


def _solo_existe(c, tabla):
    return c.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", (tabla,)
    ).fetchone()[0] > 0


def _cols_reales(c, tabla):
    return [r[1] for r in c.execute(f"PRAGMA table_info({tabla})")]


def construir(origen: str, destino: str, forzar: bool = False) -> int:
    if not os.path.exists(origen):
        sys.exit(f"[ERROR] No existe la DB de origen: {origen}")
    if os.path.exists(destino) and not forzar:
        sys.exit(f"[ERROR] Ya existe {destino}. Usá --forzar para sobrescribir.")
    if os.path.exists(destino):
        for suf in ("", "-wal", "-shm"):
            try:
                os.remove(destino + suf)
            except FileNotFoundError:
                pass

    os.makedirs(os.path.dirname(destino), exist_ok=True)

    # Abrir la DB de producción en modo inmutable: es enorme y NO se toca.
    src = sqlite3.connect(f"file:{origen}?immutable=1", uri=True)
    sc = src.cursor()

    if not _solo_existe(sc, "posible_votos"):
        src.close()
        sys.exit("[ERROR] La DB de origen no tiene la tabla posible_votos")

    dst = sqlite3.connect(destino)
    dst.executescript(DDL)
    dc = dst.cursor()

    # --- posible_votos: solo las filas con token ---
    cols_pv = _cols_reales(sc, "posible_votos")
    cols_out = [
        c for c in [
            "id", "dirigente_cedula", "votante_cedula", "votante_nombre", "votante_apellido",
            "votante_mesa", "votante_orden", "status", "telefono", "token_publico",
            "votante_lat", "votante_lng", "votante_ubicacion_en",
        ] if c in cols_pv
    ]
    sel = ", ".join(cols_out)
    filas = sc.execute(
        f"SELECT {sel} FROM posible_votos "
        "WHERE token_publico IS NOT NULL AND TRIM(token_publico)<>''"
    ).fetchall()
    dc.executemany(
        f"INSERT INTO posible_votos ({', '.join(cols_out)}) VALUES ({', '.join('?'*len(cols_out))})",
        filas,
    )
    n_tokens = len(filas)
    if n_tokens == 0:
        print("[AVISO] No hay votantes con token_publico: la DB pública queda sin enlaces.")

    # --- padrón: solo esos votantes, SIN la columna direccion ---
    cedulas = sorted({f[cols_out.index("votante_cedula")] for f in filas})
    n_padron = 0
    if cedulas:
        if _solo_existe(sc, "padron2026_completo"):
            cols_ok = [c for c in PADRON_COLS if c in _cols_reales(sc, "padron2026_completo")]
            ph = ",".join("?" * len(cedulas))
            sel_p = ", ".join(cols_ok)
            rows = sc.execute(
                f"SELECT {sel_p} FROM padron2026_completo WHERE cedula IN ({ph})", cedulas
            ).fetchall()
            dc.executemany(
                f"INSERT OR REPLACE INTO padron2026_completo ({', '.join(cols_ok)}) "
                f"VALUES ({', '.join('?'*len(cols_ok))})",
                rows,
            )
            n_padron = len(rows)

    # --- locales: solo coordenadas y nombre (SIN direccion) ---
    n_loc = 0
    if _solo_existe(sc, "locales_votacion_tsje"):
        cols_ok = [c for c in LOCALES_COLS if c in _cols_reales(sc, "locales_votacion_tsje")]
        rows = sc.execute(f"SELECT {', '.join(cols_ok)} FROM locales_votacion_tsje").fetchall()
        dc.executemany(
            f"INSERT OR REPLACE INTO locales_votacion_tsje ({', '.join(cols_ok)}) "
            f"VALUES ({', '.join('?'*len(cols_ok))})",
            rows,
        )
        n_loc = len(rows)

    # --- dirigentes: solo nombre (SIN teléfono/email/contraseña) ---
    n_dir = 0
    if _solo_existe(sc, "dirigentes"):
        cols_ok = [c for c in DIRIGENTES_COLS if c in _cols_reales(sc, "dirigentes")]
        dirs = sorted({f[cols_out.index("dirigente_cedula")] for f in filas})
        dirs = [d for d in dirs if d]
        if dirs:
            ph = ",".join("?" * len(dirs))
            rows = sc.execute(
                f"SELECT {', '.join(cols_ok)} FROM dirigentes WHERE cedula IN ({ph})", dirs
            ).fetchall()
            dc.executemany(
                f"INSERT OR REPLACE INTO dirigentes ({', '.join(cols_ok)}) "
                f"VALUES ({', '.join('?'*len(cols_ok))})",
                rows,
            )
            n_dir = len(rows)

    # --- solicitudes de recogida de esos votantes ---
    n_sol = 0
    if cedulas and _solo_existe(sc, "solicitudes_recogida"):
        ph = ",".join("?" * len(cedulas))
        rows = sc.execute(
            "SELECT id, dirigente_cedula, votante_cedula, votante_nombre, hora_recogida, "
            "ubicacion, estado, created_at FROM solicitudes_recogida "
            f"WHERE votante_cedula IN ({ph})",
            cedulas,
        ).fetchall()
        dc.executemany(
            "INSERT OR REPLACE INTO solicitudes_recogida (id, dirigente_cedula, votante_cedula, "
            "votante_nombre, hora_recogida, ubicacion, estado, created_at) "
            "VALUES (?,?,?,?,?,?,?,?)",
            rows,
        )
        n_sol = len(rows)

    # --- transporte/ubicaciones de esos votantes (para mostrar el conductor) ---
    n_viajes = n_trans = n_gps = 0
    if cedulas and _solo_existe(sc, "viajes"):
        ph = ",".join("?" * len(cedulas))
        cols_v = _cols_reales(sc, "viajes")
        if cols_v:
            rows = sc.execute(
                f"SELECT id, votante_cedula, votante_nombre, tipo, origen_lat, origen_lng, "
                f"destino_lat, destino_lng, estado, creado FROM viajes "
                f"WHERE votante_cedula IN ({ph})",
                cedulas,
            ).fetchall()
            dc.executemany(
                "INSERT OR REPLACE INTO viajes (id, votante_cedula, votante_nombre, tipo, "
                "origen_lat, origen_lng, destino_lat, destino_lng, estado, creado) "
                "VALUES (?,?,?,?,?,?,?,?,?,?)",
                rows,
            )
            n_viajes = len(rows)
            tids = sorted({r[0] for r in sc.execute(
                f"SELECT transporte_id FROM viajes WHERE votante_cedula IN ({ph}) "
                "AND transporte_id IS NOT NULL", cedulas).fetchall()})
            if tids and _solo_existe(sc, "transportes"):
                ph2 = ",".join("?" * len(tids))
                tcols = _cols_reales(sc, "transportes")
                pick = [c for c in ("id", "nombre", "placa", "estado") if c in tcols]
                rows = sc.execute(
                    f"SELECT {', '.join(pick)} FROM transportes WHERE id IN ({ph2})", tids
                ).fetchall()
                dc.executemany(
                    f"INSERT OR REPLACE INTO transportes ({', '.join(pick)}) "
                    f"VALUES ({', '.join('?'*len(pick))})",
                    rows,
                )
                n_trans = len(rows)
                rows = sc.execute(
                    "SELECT id, transporte_id, lat, lng, timestamp FROM ubicaciones_gps "
                    f"WHERE transporte_id IN ({ph2})",
                    tids,
                ).fetchall()
                dc.executemany(
                    "INSERT OR REPLACE INTO ubicaciones_gps (id, transporte_id, lat, lng, timestamp) "
                    "VALUES (?,?,?,?,?)",
                    rows,
                )
                n_gps = len(rows)

    dst.commit()

    # Verificación: no debe quedar ninguna columna de dirección en la DB pública.
    verificacion = {}
    for tabla in ("padron2026_completo", "locales_votacion_tsje"):
        cols = _cols_reales(dc, tabla)
        verificacion[tabla] = "direccion" not in cols
    # Y no debe quedar teléfono de dirigente.
    dcols = _cols_reales(dc, "dirigentes")
    verificacion["dirigentes_sin_telefono"] = "telefono" not in dcols

    totales = {
        "posible_votos": dc.execute("SELECT COUNT(*) FROM posible_votos").fetchone()[0],
        "padron": dc.execute("SELECT COUNT(*) FROM padron2026_completo").fetchone()[0],
        "locales": dc.execute("SELECT COUNT(*) FROM locales_votacion_tsje").fetchone()[0],
        "dirigentes": dc.execute("SELECT COUNT(*) FROM dirigentes").fetchone()[0],
        "solicitudes": dc.execute("SELECT COUNT(*) FROM solicitudes_recogida").fetchone()[0],
        "viajes": dc.execute("SELECT COUNT(*) FROM viajes").fetchone()[0],
        "transportes": dc.execute("SELECT COUNT(*) FROM transportes").fetchone()[0],
        "ubicaciones_gps": dc.execute("SELECT COUNT(*) FROM ubicaciones_gps").fetchone()[0],
    }

    dst.close()
    src.close()

    print(f"  posible_votos            {n_tokens:>8,}")
    print(f"  padron (solo esos)       {n_padron:>8,}")
    print(f"  locales (sin direccion)  {n_loc:>8,}")
    print(f"  dirigentes (solo nombre) {n_dir:>8,}")
    print(f"  solicitudes              {n_sol:>8,}")
    print(f"  viajes                   {n_viajes:>8,}")
    print(f"  transportes              {n_trans:>8,}")
    print(f"  ubicaciones_gps          {n_gps:>8,}")
    print()
    print("  VERIFICACIÓN DE SANEAMIENTO:")
    for k, v in verificacion.items():
        print(f"    {k}: {'OK' if v else 'FALLO'}")
    if not all(verificacion.values()):
        sys.exit("[ERROR] La DB pública conserva PII que debió eliminar. Revisá el script.")
    print(f"\n  DB pública: {destino} ({os.path.getsize(destino)/1024:.0f} KB)")
    print(f"  (la DB de origen de {os.path.getsize(origen)/1024/1024:.0f} MB NO fue modificada)")
    return totales["posible_votos"]


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Construye la DB pública sanitizada del votante")
    ap.add_argument("--origen", default=ORIGEN_DEFAULT)
    ap.add_argument("--destino", default=DESTINO_DEFAULT)
    ap.add_argument("--forzar", action="store_true", help="Sobrescribir si ya existe")
    args = ap.parse_args()
    construir(args.origen, args.destino, args.forzar)
