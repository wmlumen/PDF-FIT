"""
elecciones_ctx.py — Contexto de elección para DIA_D_MASTER.

Resuelve el problema de saber EN QUÉ ELECCIÓN se está trabajando cuando hay
varias simultáneas (ej: Nacionales + Municipales el mismo 2026-12-15).

Problemas que corrige:
  1. `eleccion_activa` usaba `ORDER BY fecha_eleccion ASC LIMIT 1` sin desempate
     -> devolvía la elección FINALIZADA más antigua en vez de la próxima.
  2. No había forma de trabajar con elecciones simultáneas: el sistema forzaba
     una sola "activa" (activar_eleccion desactivaba todas las demás).
  3. La tabla `registros` (votos) NO guardaba eleccion_id -> con elecciones
     simultáneas, el mismo votante vota en varias y era imposible distinguirlas.

Este módulo es la única fuente de verdad para "qué elección aplica".
"""

import sqlite3
from datetime import datetime

# Prioridad de estado: menor = más relevante para trabajar
#   activa   -> la que se está ejecutando ahora
#   previa   -> programada a futuro
#   finalizada -> ya ocurrió (solo consulta)
#   cerrada  -> archivada
PRIORIDAD_ESTADO = {
    "activa": 0,
    "en_curso": 0,
    "previa": 1,
    "programada": 1,
    "finalizada": 2,
    "cerrada": 3,
}


def _prio(estado):
    return PRIORIDAD_ESTADO.get(str(estado or "").strip().lower(), 9)


def _hoy():
    return datetime.now().strftime("%Y-%m-%d")


def listar_elecciones(conn, incluir_inactivas=False):
    """Lista elecciones con su tipo, ordenadas por relevancia de trabajo.

    Orden: estado (activa→previa→finalizada→cerrada), luego fecha más cercana
    a hoy (las futuras primero, luego las pasadas más recientes).
    """
    where = "" if incluir_inactivas else "WHERE e.activo=1"
    rows = conn.execute(f"""
        SELECT e.id, e.nombre, e.periodo, e.fecha_eleccion, e.estado, e.activo,
               te.codigo AS tipo_codigo, te.nombre AS tipo_nombre
        FROM elecciones e
        JOIN tipos_eleccion te ON te.id = e.tipo_eleccion_id
        {where}
    """).fetchall()
    hoy = _hoy()
    out = []
    for r in rows:
        d = dict(r) if hasattr(r, "keys") else {
            "id": r[0], "nombre": r[1], "periodo": r[2], "fecha_eleccion": r[3],
            "estado": r[4], "activo": r[5], "tipo_codigo": r[6], "tipo_nombre": r[7]}
        fecha = str(d.get("fecha_eleccion") or "")
        d["es_futura"] = bool(fecha and fecha >= hoy)
        d["_prio_estado"] = _prio(d.get("estado"))
        # distancia en días a hoy (absoluta) para desempatar por cercanía
        try:
            dd = abs((datetime.strptime(fecha, "%Y-%m-%d") - datetime.strptime(hoy, "%Y-%m-%d")).days)
        except Exception:
            dd = 10 ** 6
        d["_dist_dias"] = dd
        out.append(d)

    out.sort(key=lambda x: (
        x["_prio_estado"],
        0 if x["es_futura"] else 1,     # entre igual estado, futuras antes que pasadas
        x["_dist_dias"],
        x["id"],
    ))
    for d in out:
        d.pop("_prio_estado", None)
        d.pop("_dist_dias", None)
    return out


def elecciones_activas(conn):
    """Devuelve TODAS las elecciones en las que se puede trabajar ahora mismo.

    Esto es lo que resuelve las elecciones SIMULTÁNEAS: si Nacionales y
    Municipales son el mismo día, ambas están activas y el usuario debe elegir.
    """
    todas = listar_elecciones(conn)
    # Trabajables: activas o previas (futuras). Si no hay ninguna, las finalizadas.
    trabajables = [e for e in todas if _prio(e.get("estado")) <= 1]
    if not trabajables:
        trabajables = [e for e in todas if _prio(e.get("estado")) == 2]
    return trabajables


def eleccion_por_defecto(conn):
    """La elección que el sistema elige si el usuario no especifica ninguna.

    Ahora es DETERMINISTA: activa más próxima; si hay empate de fecha, la de
    menor id. Nunca devuelve una finalizada habiendo una futura disponible.
    """
    act = elecciones_activas(conn)
    return act[0] if act else None


def resolver_eleccion(conn, eleccion_id=None, tipo_codigo=None, usuario=None):
    """Resuelve qué elección aplica para una operación.

    Prioridad:
      1. eleccion_id explícito (validado: debe existir y estar activa)
      2. tipo_codigo explícito (ej: 'internas', 'municipales')
      3. elección por defecto del sistema

    Devuelve dict con la elección + campo 'origen' indicando cómo se resolvió,
    o None si no hay ninguna disponible.
    """
    todas = listar_elecciones(conn)

    # 1. Por ID explícito
    if eleccion_id:
        try:
            eid = int(eleccion_id)
        except (TypeError, ValueError):
            return {"error": "eleccion_id inválido"}
        for e in todas:
            if e["id"] == eid:
                if not e.get("activo"):
                    return {"error": f"La elección {eid} está inactiva"}
                e = dict(e); e["origen"] = "id_explicito"
                return e
        return {"error": f"La elección {eid} no existe"}

    # 2. Por tipo
    if tipo_codigo:
        tc = str(tipo_codigo).strip().lower()
        cand = [e for e in todas if str(e.get("tipo_codigo", "")).lower() == tc]
        cand = [e for e in cand if _prio(e.get("estado")) <= 1] or cand
        if cand:
            e = dict(cand[0]); e["origen"] = "tipo_explicito"
            return e
        return {"error": f"No hay elección de tipo '{tipo_codigo}'"}

    # 3. Por defecto
    d = eleccion_por_defecto(conn)
    if d:
        d = dict(d); d["origen"] = "defecto"
        return d
    return None


def requiere_seleccion(conn):
    """True si hay más de una elección trabajable y el usuario DEBE elegir.

    Es el caso de las simultáneas: no se puede asumir una.
    """
    return len(elecciones_activas(conn)) > 1


def contexto_completo(conn, usuario=None):
    """Contexto completo para el frontend: qué elección está activa, cuáles
    son simultáneas y si hay que pedir selección."""
    activas = elecciones_activas(conn)
    defecto = eleccion_por_defecto(conn)
    return {
        "elecciones_trabajables": activas,
        "eleccion_por_defecto": defecto,
        "total_trabajables": len(activas),
        "requiere_seleccion": len(activas) > 1,
        "simultaneas": len(activas) > 1,
        "mensaje": (
            f"Hay {len(activas)} elecciones simultáneas. Debe elegir en cuál trabaja."
            if len(activas) > 1 else
            (f"Elección activa: {defecto['nombre']}" if defecto else "No hay elección activa")
        ),
    }


# ══════════════════════════════════════════════════════════════════════════
# MIGRACIÓN: agregar eleccion_id a registros y no_voto
# ══════════════════════════════════════════════════════════════════════════
def migrar_eleccion_en_votos(conn):
    """Agrega columna eleccion_id a registros y no_voto si no existe.

    Los votos existentes quedan con eleccion_id NULL = 'sin clasificar'
    (histórico anterior a elecciones simultáneas). NO se inventa una asignación.
    """
    resultado = {}
    for tabla in ("registros", "no_voto", "votos_audit"):
        try:
            cols = [r[1] for r in conn.execute(f"PRAGMA table_info({tabla})")]
        except Exception:
            resultado[tabla] = "tabla no existe"
            continue
        if not cols:
            resultado[tabla] = "tabla no existe"
            continue
        if "eleccion_id" not in cols:
            conn.execute(f"ALTER TABLE {tabla} ADD COLUMN eleccion_id INTEGER DEFAULT NULL")
            resultado[tabla] = "columna agregada"
        else:
            resultado[tabla] = "ya existía"
    # Índices para filtrar por elección
    for nombre, definicion in [
        ("idx_registros_eleccion", "registros(eleccion_id)"),
        ("idx_no_voto_eleccion", "no_voto(eleccion_id)"),
        ("idx_registros_eleccion_mesa", "registros(eleccion_id, mesa, estado)"),
    ]:
        try:
            conn.execute(f"CREATE INDEX IF NOT EXISTS {nombre} ON {definicion}")
        except Exception:
            pass
    conn.commit()
    return resultado


def votos_sin_clasificar(conn):
    """Cuántos votos hay sin eleccion_id asignada."""
    out = {}
    for tabla in ("registros", "no_voto"):
        try:
            out[tabla] = conn.execute(
                f"SELECT COUNT(*) FROM {tabla} WHERE eleccion_id IS NULL").fetchone()[0]
        except Exception:
            out[tabla] = None
    return out


if __name__ == "__main__":
    import sys
    db = sys.argv[1] if len(sys.argv) > 1 else "database/ddia.db"
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    print("=== Elecciones trabajables ===")
    for e in elecciones_activas(conn):
        print(f"  [{e['estado']:10s}] id={e['id']} {e['nombre']} ({e['tipo_codigo']}) {e['fecha_eleccion']}")
    print("\n=== ¿Requiere selección? ===", requiere_seleccion(conn))
    print("\n=== Migración ===", migrar_eleccion_en_votos(conn))
    print("=== Votos sin clasificar ===", votos_sin_clasificar(conn))
    conn.close()
