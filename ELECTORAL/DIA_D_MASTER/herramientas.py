"""
herramientas.py — Módulo de herramientas extendidas para DIA_D_MASTER.

Implementa los "nudos" nuevos identificados en el análisis de flujos por rol:
  1. rate_limit       — limitador de requests por IP (protege /api)
  2. geocerca         — validación de que el conductor está en su ruta
  3. votos_audit      — auditoría con hash de cada voto emitido
  4. cache            — caché en memoria con TTL para consultas frecuentes
  5. webhooks         — notificaciones salientes a sistemas externos
  6. api_publica      — API de lectura pública con API key
  7. alertas_auto     — alertas automáticas de baja participación
  8. indices_padron   — índices para padron2026_completo (2.27M filas)
  9. reportes_prog    — reportes programados
 10. offline_queue    — cola offline para ubicaciones GPS
 11. sse              — eventos en tiempo real (Server-Sent Events)
 12. 2fa              — segundo factor para roles de alto privilegio

Cada herramienta expone funciones puras que reciben `conn` (sqlite3) y datos,
y se registran desde app.py. No importa nada de app.py para evitar ciclos.
"""

import os
import json
import time
import hmac
import hashlib
import sqlite3
from datetime import datetime, timedelta
from threading import Lock

# ─── CONFIGURACIÓN ────────────────────────────────────────────────────────
HERRAMIENTAS_SECRET = os.getenv("HERRAMIENTAS_SECRET", "dia_d_master_tools_secret")


def _now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ══════════════════════════════════════════════════════════════════════════
# 1. RATE LIMIT — limitador por IP en memoria con ventana deslizante
# ══════════════════════════════════════════════════════════════════════════
class RateLimiter:
    """Limitador de requests por IP. Ventana deslizante en memoria."""

    def __init__(self, max_requests=120, window_seconds=60):
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits = {}          # ip -> [timestamps]
        self._lock = Lock()

    def check(self, ip, limite=None):
        """Retorna (permitido: bool, restantes: int, reset_en: int)."""
        limite = limite or self.max_requests
        ahora = time.time()
        with self._lock:
            marcas = self._hits.get(ip, [])
            marcas = [t for t in marcas if ahora - t < self.window]
            permitido = len(marcas) < limite
            if permitido:
                marcas.append(ahora)
            self._hits[ip] = marcas
            restantes = max(0, limite - len(marcas))
            reset_en = int(self.window - (ahora - marcas[0])) if marcas else self.window
        return permitido, restantes, reset_en

    def limpiar(self):
        """Purga IPs sin actividad reciente (llamar periódicamente)."""
        ahora = time.time()
        with self._lock:
            self._hits = {
                ip: [t for t in marcas if ahora - t < self.window]
                for ip, marcas in self._hits.items()
            }
            self._hits = {ip: m for ip, m in self._hits.items() if m}


rate_limiter = RateLimiter(max_requests=180, window_seconds=60)


# ══════════════════════════════════════════════════════════════════════════
# 2. GEOCERCA — validación de conductor dentro de su ruta
# ══════════════════════════════════════════════════════════════════════════
def haversine_km(lat1, lng1, lat2, lng2):
    """Distancia en km entre dos puntos GPS."""
    from math import radians, sin, cos, asin, sqrt
    if None in (lat1, lng1, lat2, lng2):
        return None
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * R * asin(sqrt(a))


def crear_geocerca(conn, nombre, lat_centro, lng_centro, radio_km, cedula_conductor='', ruta_id=None):
    """Crea una geocerca circular."""
    c = conn.cursor()
    c.execute("""INSERT INTO geocercas (nombre, lat_centro, lng_centro, radio_km,
                 cedula_conductor, ruta_id, activo, creado)
                 VALUES (?,?,?,?,?,?,1,?)""",
              (nombre, lat_centro, lng_centro, radio_km, cedula_conductor, ruta_id, _now()))
    conn.commit()
    return c.lastrowid


def verificar_geocerca(conn, cedula, lat, lng):
    """Verifica si el conductor está dentro de alguna de sus geocercas.
    Retorna dict con estado y distancia a la más cercana."""
    c = conn.cursor()
    rows = c.execute("""SELECT id, nombre, lat_centro, lng_centro, radio_km
                        FROM geocercas WHERE activo=1
                        AND (cedula_conductor=? OR cedula_conductor='' OR cedula_conductor IS NULL)""",
                     (cedula,)).fetchall()
    if not rows:
        return {"dentro": True, "motivo": "sin_geocerca_definida", "distancia_km": None}
    mejor = None
    for gid, nombre, glat, glng, radio in rows:
        d = haversine_km(lat, lng, glat, glng)
        if d is None:
            continue
        if mejor is None or d < mejor[1]:
            mejor = (nombre, d, radio)
        if d <= radio:
            return {"dentro": True, "geocerca": nombre, "distancia_km": round(d, 3)}
    if mejor:
        return {"dentro": False, "geocerca": mejor[0],
                "distancia_km": round(mejor[1], 3), "radio_km": mejor[2]}
    return {"dentro": True, "motivo": "sin_datos_gps", "distancia_km": None}


# ══════════════════════════════════════════════════════════════════════════
# 3. VOTOS_AUDIT — auditoría con hash de cada voto
# ══════════════════════════════════════════════════════════════════════════
def hash_voto(cedula, mesa, orden, estado, ts, secret=HERRAMIENTAS_SECRET):
    """Hash determinista e inalterable de un voto."""
    payload = f"{cedula}|{mesa}|{orden}|{estado}|{ts}|{secret}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def registrar_voto_auditado(conn, cedula, mesa, orden, estado, dirigente='',
                            ip='', session_id='', verificacion_ok=True):
    """Registra un voto en registros + su huella en votos_audit.
    Retorna dict con el hash generado."""
    c = conn.cursor()
    ts = _now()
    h = hash_voto(cedula, mesa, orden, estado, ts)
    c.execute("""INSERT INTO votos_audit
                 (cedula, mesa, orden, estado, dirigente, ip, session_id,
                  verificacion_ok, hash_voto, timestamp)
                 VALUES (?,?,?,?,?,?,?,?,?,?)""",
              (cedula, mesa, orden, estado, dirigente, ip, session_id,
               1 if verificacion_ok else 0, h, ts))
    conn.commit()
    return {"hash": h, "timestamp": ts, "audit_id": c.lastrowid}


def verificar_integridad_voto(conn, audit_id):
    """Recomputa el hash y verifica que el registro no fue alterado."""
    c = conn.cursor()
    row = c.execute("""SELECT cedula, mesa, orden, estado, timestamp, hash_voto
                       FROM votos_audit WHERE id=?""", (audit_id,)).fetchone()
    if not row:
        return {"valido": False, "error": "registro no encontrado"}
    cedula, mesa, orden, estado, ts, h_guardado = row
    h_calc = hash_voto(cedula, mesa, orden, estado, ts)
    return {"valido": hmac.compare_digest(h_calc, h_guardado or ""),
            "hash_guardado": h_guardado, "hash_calculado": h_calc}


# ══════════════════════════════════════════════════════════════════════════
# 4. CACHE — caché en memoria con TTL
# ══════════════════════════════════════════════════════════════════════════
class TTLCache:
    def __init__(self, default_ttl=30):
        self.default_ttl = default_ttl
        self._data = {}
        self._lock = Lock()

    def get(self, key):
        with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            valor, expira = item
            if time.time() > expira:
                del self._data[key]
                return None
            return valor

    def set(self, key, valor, ttl=None):
        with self._lock:
            self._data[key] = (valor, time.time() + (ttl or self.default_ttl))

    def invalidar(self, prefijo=''):
        with self._lock:
            if not prefijo:
                self._data.clear()
            else:
                for k in list(self._data.keys()):
                    if k.startswith(prefijo):
                        del self._data[k]

    def stats(self):
        with self._lock:
            return {"entradas": len(self._data), "ttl_default": self.default_ttl}


cache = TTLCache(default_ttl=30)


def cache_o_ejecutar(key, fn, ttl=None):
    """Devuelve el valor cacheado o ejecuta fn() y lo cachea."""
    v = cache.get(key)
    if v is not None:
        return v, True
    v = fn()
    cache.set(key, v, ttl)
    return v, False


# ══════════════════════════════════════════════════════════════════════════
# 5. WEBHOOKS — notificaciones salientes
# ══════════════════════════════════════════════════════════════════════════
def registrar_webhook(conn, url, evento, descripcion='', activo=1):
    c = conn.cursor()
    c.execute("""INSERT INTO webhooks (url, evento, descripcion, activo, creado)
                 VALUES (?,?,?,?,?)""", (url, evento, descripcion, activo, _now()))
    conn.commit()
    return c.lastrowid


def firmar_payload(payload_json, secret=HERRAMIENTAS_SECRET):
    """Firma HMAC-SHA256 del payload para que el receptor valide origen."""
    return hmac.new(secret.encode(), payload_json.encode(), hashlib.sha256).hexdigest()


def preparar_webhooks(conn, evento, datos):
    """Prepara los webhooks a disparar para un evento dado.
    Devuelve la lista de (url, payload_json, firma) para que el llamador los envíe.
    No realiza I/O de red aquí (mantiene la función testeable)."""
    c = conn.cursor()
    rows = c.execute("SELECT id, url FROM webhooks WHERE activo=1 AND evento=?",
                     (evento,)).fetchall()
    salida = []
    for wid, url in rows:
        payload = json.dumps({"evento": evento, "datos": datos, "timestamp": _now()},
                             ensure_ascii=False)
        salida.append({"webhook_id": wid, "url": url, "payload": payload,
                       "firma": firmar_payload(payload)})
    return salida


def registrar_entrega_webhook(conn, webhook_id, evento, estado, respuesta=''):
    c = conn.cursor()
    c.execute("""INSERT INTO webhooks_log (webhook_id, evento, estado, respuesta, timestamp)
                 VALUES (?,?,?,?,?)""", (webhook_id, evento, estado, respuesta[:500], _now()))
    conn.commit()


# ══════════════════════════════════════════════════════════════════════════
# 6. API PÚBLICA — lectura con API key
# ══════════════════════════════════════════════════════════════════════════
def crear_api_key(conn, nombre, rol='lectura', activo=1):
    import secrets
    key = "dmk_" + secrets.token_hex(24)
    c = conn.cursor()
    c.execute("""INSERT INTO api_keys (key, nombre, rol, activo, creado, ultimo_uso)
                 VALUES (?,?,?,?,?,'')""", (key, nombre, rol, activo, _now()))
    conn.commit()
    return key


def validar_api_key(conn, key):
    if not key:
        return None
    c = conn.cursor()
    row = c.execute("SELECT id, nombre, rol, activo FROM api_keys WHERE key=?", (key,)).fetchone()
    if not row or not row[3]:
        return None
    c.execute("UPDATE api_keys SET ultimo_uso=? WHERE id=?", (_now(), row[0]))
    conn.commit()
    return {"id": row[0], "nombre": row[1], "rol": row[2]}


# ══════════════════════════════════════════════════════════════════════════
# 7. ALERTAS AUTOMÁTICAS — baja participación
# ══════════════════════════════════════════════════════════════════════════
def calcular_participacion_por_mesa(conn, limite_mesas=200):
    """Devuelve participación por mesa desde la tabla registros."""
    c = conn.cursor()
    rows = c.execute("""SELECT mesa,
                          SUM(CASE WHEN estado='voto' THEN 1 ELSE 0 END) as votos,
                          SUM(CASE WHEN estado='ausente' THEN 1 ELSE 0 END) as ausentes
                        FROM registros WHERE mesa > 0
                        GROUP BY mesa ORDER BY mesa LIMIT ?""", (limite_mesas,)).fetchall()
    out = []
    for mesa, votos, ausentes in rows:
        votos = votos or 0
        ausentes = ausentes or 0
        total = votos + ausentes
        pct = (votos / total * 100) if total else 0.0
        out.append({"mesa": mesa, "votos": votos, "ausentes": ausentes,
                    "total": total, "participacion": round(pct, 1)})
    return out


def generar_alertas_participacion(conn, umbral_pct=30.0, min_registros=5):
    """Genera alertas para mesas con participación bajo el umbral.
    Evita duplicados no resueltos. Retorna la lista de alertas creadas."""
    c = conn.cursor()
    creadas = []
    for m in calcular_participacion_por_mesa(conn):
        if m["total"] < min_registros:
            continue
        if m["participacion"] < umbral_pct:
            existente = c.execute("""SELECT id FROM alertas_participacion
                                     WHERE mesa=? AND resuelto=0""", (m["mesa"],)).fetchone()
            if existente:
                continue
            c.execute("""INSERT INTO alertas_participacion
                         (mesa, participacion, votos, total, umbral, nivel, resuelto, creado)
                         VALUES (?,?,?,?,?,?,0,?)""",
                      (m["mesa"], m["participacion"], m["votos"], m["total"],
                       umbral_pct, "alta" if m["participacion"] < umbral_pct/2 else "media", _now()))
            creadas.append({"mesa": m["mesa"], "participacion": m["participacion"]})
    conn.commit()
    return creadas


# ══════════════════════════════════════════════════════════════════════════
# 8. ÍNDICES PARA PADRÓN — performance en 2.27M filas
# ══════════════════════════════════════════════════════════════════════════
def crear_indices_padron(conn):
    """Crea índices sobre padron2026_completo si no existe uno equivalente. Idempotente.

    Evita duplicados: si ya hay un índice sobre la misma columna (con otro nombre),
    no crea otro."""
    c = conn.cursor()
    # Columnas ya indexadas en la tabla
    existentes = set()
    try:
        for row in c.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='padron2026_completo'"):
            sql = (row[1] or "").lower()
            if "cedula" in sql:
                existentes.add("cedula")
            if "mesa" in sql and "orden" in sql:
                existentes.add("mesa_orden")
            if "depart" in sql and "distrito" in sql:
                existentes.add("dep_dist")
    except Exception:
        pass
    deseados = [
        ("idx_padron_cedula", "cedula", "padron2026_completo(cedula)"),
        ("idx_padron_mesa_orden", "mesa_orden", "padron2026_completo(mesa, orden)"),
        ("idx_padron_dep_dist", "dep_dist", "padron2026_completo(depart, distrito)"),
    ]
    resultado = []
    for nombre, clave, definicion in deseados:
        if clave in existentes:
            resultado.append(f"{nombre}:omitido (ya indexado)")
            continue
        try:
            c.execute(f"CREATE INDEX IF NOT EXISTS {nombre} ON {definicion}")
            resultado.append(nombre)
        except Exception as e:
            resultado.append(f"{nombre}:ERROR {e}")
    try:
        conn.commit()
    except Exception:
        pass
    return resultado


def crear_indices_registros(conn):
    """Índices sobre registros (227K filas). Idempotente, sin duplicados."""
    c = conn.cursor()
    existentes = set()
    try:
        for row in c.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='registros'"):
            sql = (row[0] or "").lower()
            if "cedula" in sql:
                existentes.add("cedula")
            if "mesa" in sql and "estado" in sql:
                existentes.add("mesa_estado")
    except Exception:
        pass
    deseados = [
        ("idx_reg_cedula", "cedula", "registros(cedula)"),
        ("idx_reg_mesa_estado", "mesa_estado", "registros(mesa, estado)"),
    ]
    resultado = []
    for nombre, clave, definicion in deseados:
        if clave in existentes:
            resultado.append(f"{nombre}:omitido (ya indexado)")
            continue
        try:
            c.execute(f"CREATE INDEX IF NOT EXISTS {nombre} ON {definicion}")
            resultado.append(nombre)
        except Exception as e:
            resultado.append(f"{nombre}:ERROR {e}")
    try:
        conn.commit()
    except Exception:
        pass
    return resultado


# ══════════════════════════════════════════════════════════════════════════
# 9. REPORTES PROGRAMADOS
# ══════════════════════════════════════════════════════════════════════════
def programar_reporte(conn, nombre, tipo, frecuencia, destinatarios='', activo=1):
    c = conn.cursor()
    c.execute("""INSERT INTO reportes_programados
                 (nombre, tipo, frecuencia, destinatarios, activo, creado, ultima_ejecucion)
                 VALUES (?,?,?,?,?,?, '')""",
              (nombre, tipo, frecuencia, destinatarios, activo, _now()))
    conn.commit()
    return c.lastrowid


def reportes_pendientes(conn):
    """Devuelve reportes cuya frecuencia ya venció."""
    c = conn.cursor()
    rows = c.execute("""SELECT id, nombre, tipo, frecuencia, ultima_ejecucion
                        FROM reportes_programados WHERE activo=1""").fetchall()
    pendientes = []
    ahora = datetime.now()
    deltas = {"diario": timedelta(days=1), "semanal": timedelta(weeks=1),
              "mensual": timedelta(days=30), "cada_hora": timedelta(hours=1)}
    for rid, nombre, tipo, frec, ultima in rows:
        delta = deltas.get(frec)
        if not delta:
            continue
        if not ultima:
            pendientes.append({"id": rid, "nombre": nombre, "tipo": tipo})
            continue
        try:
            ult = datetime.strptime(ultima, "%Y-%m-%d %H:%M:%S")
            if ahora - ult >= delta:
                pendientes.append({"id": rid, "nombre": nombre, "tipo": tipo})
        except Exception:
            pendientes.append({"id": rid, "nombre": nombre, "tipo": tipo})
    return pendientes


def marcar_reporte_ejecutado(conn, rid):
    c = conn.cursor()
    c.execute("UPDATE reportes_programados SET ultima_ejecucion=? WHERE id=?", (_now(), rid))
    conn.commit()


# ══════════════════════════════════════════════════════════════════════════
# 10. COLA OFFLINE — ubicaciones GPS sin señal
# ══════════════════════════════════════════════════════════════════════════
def encolar_ubicacion(conn, cedula, lat, lng, velocidad=0, direccion='', ts_cliente=''):
    c = conn.cursor()
    c.execute("""INSERT INTO cola_offline (tipo, cedula, payload, sincronizado, creado)
                 VALUES ('ubicacion', ?, ?, 0, ?)""",
              (cedula, json.dumps({"lat": lat, "lng": lng, "velocidad": velocidad,
                                   "direccion": direccion, "ts_cliente": ts_cliente}),
               ts_cliente or _now()))
    conn.commit()
    return c.lastrowid


def sincronizar_cola(conn, cedula='', limite=200):
    """Procesa la cola offline: inserta en ubicaciones_gps y marca sincronizado."""
    c = conn.cursor()
    q = "SELECT id, cedula, payload FROM cola_offline WHERE sincronizado=0"
    params = []
    if cedula:
        q += " AND cedula=?"
        params.append(cedula)
    q += " ORDER BY id LIMIT ?"
    params.append(limite)
    rows = c.execute(q, params).fetchall()
    procesados = 0
    for cid, ced, payload in rows:
        try:
            d = json.loads(payload)
            c.execute("""INSERT INTO ubicaciones_gps (transporte_id, cedula, lat, lng, timestamp, velocidad, direccion)
                         VALUES (NULL, ?, ?, ?, ?, ?, ?)""",
                      (ced, d.get("lat"), d.get("lng"), d.get("ts_cliente") or _now(),
                       d.get("velocidad", 0), d.get("direccion", "")))
            c.execute("UPDATE cola_offline SET sincronizado=1 WHERE id=?", (cid,))
            procesados += 1
        except Exception:
            continue
    conn.commit()
    return {"procesados": procesados, "pendientes": len(rows) - procesados}


def cola_pendiente(conn, cedula=''):
    c = conn.cursor()
    if cedula:
        n = c.execute("SELECT COUNT(*) FROM cola_offline WHERE sincronizado=0 AND cedula=?",
                      (cedula,)).fetchone()[0]
    else:
        n = c.execute("SELECT COUNT(*) FROM cola_offline WHERE sincronizado=0").fetchone()[0]
    return n


# ══════════════════════════════════════════════════════════════════════════
# 11. SSE — eventos en tiempo real
# ══════════════════════════════════════════════════════════════════════════
class EventBus:
    """Bus de eventos simple para Server-Sent Events (en memoria)."""

    def __init__(self, max_historial=100):
        self._suscriptores = []   # listas de colas (se usan como deque simple)
        self._historial = []
        self._max = max_historial
        self._lock = Lock()
        self._seq = 0

    def publicar(self, evento, datos):
        with self._lock:
            self._seq += 1
            msg = {"id": self._seq, "evento": evento, "datos": datos, "ts": _now()}
            self._historial.append(msg)
            if len(self._historial) > self._max:
                self._historial.pop(0)
            for q in list(self._suscriptores):
                q.append(msg)
            return msg

    def suscribir(self):
        q = []
        with self._lock:
            self._suscriptores.append(q)
        return q

    def desuscribir(self, q):
        with self._lock:
            if q in self._suscriptores:
                self._suscriptores.remove(q)

    def historial(self, desde_id=0):
        with self._lock:
            return [m for m in self._historial if m["id"] > desde_id]

    def stats(self):
        with self._lock:
            return {"suscriptores": len(self._suscriptores), "eventos": self._seq}


event_bus = EventBus()


# ══════════════════════════════════════════════════════════════════════════
# 12. 2FA — segundo factor (TOTP simplificado con HMAC)
# ══════════════════════════════════════════════════════════════════════════
def generar_secreto_2fa(cedula):
    """Genera un secreto base32 determinista para el usuario."""
    import base64
    raw = hashlib.sha256(f"{cedula}:{HERRAMIENTAS_SECRET}".encode()).digest()
    return base64.b32encode(raw).decode().rstrip("=")


def generar_codigo_2fa(cedula, intervalo=30, offset=0):
    """Genera el código TOTP de 6 dígitos para la ventana temporal actual."""
    import base64
    secreto = generar_secreto_2fa(cedula)
    pad = "=" * (-len(secreto) % 8)
    key = base64.b32decode(secreto + pad)
    contador = int(time.time() // intervalo) + offset
    msg = contador.to_bytes(8, "big")
    h = hmac.new(key, msg, hashlib.sha1).digest()
    o = h[-1] & 0x0F
    codigo = (int.from_bytes(h[o:o+4], "big") & 0x7FFFFFFF) % 1000000
    return f"{codigo:06d}"


def verificar_codigo_2fa(cedula, codigo, ventana=1):
    """Verifica el código aceptando ±ventana intervalos (tolerancia de reloj)."""
    codigo = str(codigo).strip()
    for off in range(-ventana, ventana + 1):
        if hmac.compare_digest(generar_codigo_2fa(cedula, offset=off), codigo):
            return True
    return False


def activar_2fa(conn, cedula, activo=1):
    c = conn.cursor()
    c.execute("""INSERT INTO usuarios_2fa (cedula, secreto, activo, creado)
                 VALUES (?,?,?,?)
                 ON CONFLICT(cedula) DO UPDATE SET activo=excluded.activo""",
              (cedula, generar_secreto_2fa(cedula), activo, _now()))
    conn.commit()


def requiere_2fa(conn, cedula):
    c = conn.cursor()
    try:
        row = c.execute("SELECT activo FROM usuarios_2fa WHERE cedula=?", (cedula,)).fetchone()
        return bool(row and row[0])
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════════
# INICIALIZACIÓN DE TABLAS
# ══════════════════════════════════════════════════════════════════════════
TABLAS = {
    "geocercas": """
        CREATE TABLE IF NOT EXISTS geocercas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT, lat_centro REAL, lng_centro REAL, radio_km REAL,
            cedula_conductor TEXT DEFAULT '', ruta_id INTEGER,
            activo INTEGER DEFAULT 1, creado TEXT
        )""",
    "votos_audit": """
        CREATE TABLE IF NOT EXISTS votos_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cedula TEXT, mesa INTEGER, orden INTEGER, estado TEXT,
            dirigente TEXT DEFAULT '', ip TEXT DEFAULT '', session_id TEXT DEFAULT '',
            verificacion_ok INTEGER DEFAULT 1, hash_voto TEXT, timestamp TEXT,
            eleccion_id INTEGER DEFAULT NULL
        )""",
    "webhooks": """
        CREATE TABLE IF NOT EXISTS webhooks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT, evento TEXT, descripcion TEXT DEFAULT '',
            activo INTEGER DEFAULT 1, creado TEXT
        )""",
    "webhooks_log": """
        CREATE TABLE IF NOT EXISTS webhooks_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            webhook_id INTEGER, evento TEXT, estado TEXT,
            respuesta TEXT DEFAULT '', timestamp TEXT
        )""",
    "api_keys": """
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE, nombre TEXT, rol TEXT DEFAULT 'lectura',
            activo INTEGER DEFAULT 1, creado TEXT, ultimo_uso TEXT DEFAULT ''
        )""",
    "alertas_participacion": """
        CREATE TABLE IF NOT EXISTS alertas_participacion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mesa INTEGER, participacion REAL, votos INTEGER, total INTEGER,
            umbral REAL, nivel TEXT, resuelto INTEGER DEFAULT 0, creado TEXT
        )""",
    "reportes_programados": """
        CREATE TABLE IF NOT EXISTS reportes_programados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT, tipo TEXT, frecuencia TEXT,
            destinatarios TEXT DEFAULT '', activo INTEGER DEFAULT 1,
            creado TEXT, ultima_ejecucion TEXT DEFAULT ''
        )""",
    "cola_offline": """
        CREATE TABLE IF NOT EXISTS cola_offline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT, cedula TEXT, payload TEXT,
            sincronizado INTEGER DEFAULT 0, creado TEXT
        )""",
    "usuarios_2fa": """
        CREATE TABLE IF NOT EXISTS usuarios_2fa (
            cedula TEXT PRIMARY KEY, secreto TEXT,
            activo INTEGER DEFAULT 1, creado TEXT
        )""",
}


def init_herramientas(conn=None):
    """Crea todas las tablas de herramientas. Idempotente."""
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
    try:
        conn.commit()
    except Exception:
        pass
    if cerrar:
        conn.close()
    return creadas


# ─── REGISTRO DE HERRAMIENTAS (metadatos para el diagrama) ────────────────
CATALOGO = [
    {"id": "rate_limit", "nombre": "Rate Limiting", "icono": "🛡️", "color": "#dc2626",
     "nivel": "critica", "roles": ["master", "general"],
     "desc": "Limita requests por IP en /api (180/min) para frenar fuerza bruta."},
    {"id": "geocerca", "nombre": "Geocerca de Conductores", "icono": "📍", "color": "#2563eb",
     "nivel": "critica", "roles": ["conductor", "seccional"],
     "desc": "Valida que el conductor esté dentro de su ruta asignada (Haversine)."},
    {"id": "votos_audit", "nombre": "Auditoría de Votos", "icono": "🔒", "color": "#16a34a",
     "nivel": "critica", "roles": ["dirigente", "master"],
     "desc": "Huella SHA-256 inmutable por voto, con verificación de integridad."},
    {"id": "cache", "nombre": "Caché TTL", "icono": "⚡", "color": "#ca8a04",
     "nivel": "baja", "roles": ["general", "nacional", "departamental", "municipal"],
     "desc": "Caché en memoria con TTL para consultas repetidas (padrón, resumen)."},
    {"id": "webhooks", "nombre": "Webhooks", "icono": "🔔", "color": "#7c3aed",
     "nivel": "baja", "roles": ["master", "pc"],
     "desc": "Notificaciones salientes firmadas (HMAC) a sistemas externos."},
    {"id": "api_publica", "nombre": "API Pública", "icono": "🌐", "color": "#0891b2",
     "nivel": "baja", "roles": ["pc", "general", "municipal"],
     "desc": "API de lectura con API key para integraciones externas."},
    {"id": "alertas_auto", "nombre": "Alertas Automáticas", "icono": "🚨", "color": "#ea580c",
     "nivel": "media", "roles": ["seccional", "distrital", "departamental", "nacional"],
     "desc": "Detecta mesas con participación bajo umbral y genera alertas."},
    {"id": "indices_padron", "nombre": "Índices de Padrón", "icono": "🗄️", "color": "#4f46e5",
     "nivel": "media", "roles": ["master", "municipal"],
     "desc": "Índices en padron2026_completo (2.27M) y registros (227K)."},
    {"id": "reportes_prog", "nombre": "Reportes Programados", "icono": "📅", "color": "#db2777",
     "nivel": "media", "roles": ["general", "master", "departamental", "municipal"],
     "desc": "Reportes automáticos por frecuencia (diario/semanal/mensual)."},
    {"id": "offline_queue", "nombre": "Cola Offline", "icono": "📴", "color": "#9333ea",
     "nivel": "media", "roles": ["conductor"],
     "desc": "Encola ubicaciones GPS sin señal y las sincroniza al reconectar."},
    {"id": "sse", "nombre": "Eventos SSE", "icono": "📡", "color": "#0d9488",
     "nivel": "media", "roles": ["general", "nacional", "seccional", "departamental"],
     "desc": "Bus de eventos en tiempo real (reemplaza polling cada 10s)."},
    {"id": "dos_fa", "nombre": "Doble Factor (2FA)", "icono": "🔑", "color": "#be185d",
     "nivel": "critica", "roles": ["master", "nacional"],
     "desc": "TOTP de 6 dígitos para roles de alto privilegio."},
]


def catalogo():
    return CATALOGO


if __name__ == "__main__":
    print("Inicializando herramientas...")
    print("Tablas:", init_herramientas())
    print("Herramientas:", len(CATALOGO))
