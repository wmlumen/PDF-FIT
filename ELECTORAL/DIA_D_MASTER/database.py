import contextvars
import sqlite3, os
from datetime import datetime
import json
import threading
from typing import Optional, List, Dict, Any, Tuple

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database', 'ddia.db')
SOURCE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'DDIA', 'database', 'ddia.db'))

# Alcance de datos de la peticion actual (lo fija el middleware de app.py segun el plan del cliente).
# None = sin filtro (administradores o plan 'total'); lista = cedulas de clientes visibles.
ALCANCE_CLIENTES = contextvars.ContextVar("alcance_clientes", default=None)

# Tablas filtradas por cliente: directas (columna cliente_cedula) o via el dirigente que las cargo
_TABLAS_POR_CLIENTE = ('dirigentes', 'registros', 'no_voto', 'transportes')
_TABLAS_POR_DIRIGENTE = ('posible_votos', 'dirigente_votantes', 'pendientes_qr', 'solicitudes_recogida')

def _aplicar_alcance(conn: sqlite3.Connection, clientes: List[str]) -> None:
    """Crea vistas TEMP con el mismo nombre que las tablas: las consultas existentes
    ven solo las filas de los clientes permitidos sin modificar cada endpoint."""
    lista = ",".join("'" + "".join(ch for ch in str(x) if ch.isalnum()) + "'" for x in clientes) or "''"
    for t in _TABLAS_POR_CLIENTE:
        conn.execute(f"CREATE TEMP VIEW IF NOT EXISTS {t} AS SELECT * FROM main.{t} WHERE cliente_cedula IN ({lista})")
    for t in _TABLAS_POR_DIRIGENTE:
        conn.execute(f"CREATE TEMP VIEW IF NOT EXISTS {t} AS SELECT * FROM main.{t} WHERE dirigente_cedula IN "
                     f"(SELECT cedula FROM main.dirigentes WHERE cliente_cedula IN ({lista}))")

# ─── PAGINACIÓN ESTÁNDAR ───────────────────────────────────────────────
# FIX: Paginación centralizada con límites seguros para endpoints que antes
# cargaban TODOS los registros en memoria (votos, no_votos, dirigentes, etc.).
# Regla: limit por defecto 100, máximo 1000, offset por defecto 0.
PAG_DEFAULT_LIMIT = 100
PAG_MAX_LIMIT = 1000
PAG_DEFAULT_OFFSET = 0


def _paginar_valores(limit, offset):
    """Normaliza y acota los parámetros de paginación de forma defensiva.

    Acepta int o str (vienen de query params). Ante valores inválidos o
    negativos cae a los defaults seguros. Nunca permite limit > PAG_MAX_LIMIT
    para evitar que una sola petición cargue la tabla completa en memoria."""
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = PAG_DEFAULT_LIMIT
    try:
        offset = int(offset)
    except (TypeError, ValueError):
        offset = PAG_DEFAULT_OFFSET
    if limit <= 0:
        limit = PAG_DEFAULT_LIMIT
    if limit > PAG_MAX_LIMIT:
        limit = PAG_MAX_LIMIT
    if offset < 0:
        offset = PAG_DEFAULT_OFFSET
    return limit, offset


def paginar_query(sql, params=(), limit=PAG_DEFAULT_LIMIT, offset=PAG_DEFAULT_OFFSET):
    """Aplica LIMIT/OFFSET a una consulta ya armada (sin inyectar valores en el SQL).

    Recibe la query como string y los valores como parámetros bindeados, así el
    límite/offset también van por bind (nunca por interpolación) y queda protegido
    contra inyección. Devuelve (sql_con_limit, params_con_limit_offset)."""
    limit, offset = _paginar_valores(limit, offset)
    return sql + " LIMIT ? OFFSET ?", tuple(params) + (limit, offset)


def respuesta_paginada(data, total, limit=PAG_DEFAULT_LIMIT, offset=PAG_DEFAULT_OFFSET):
    """Arma la respuesta paginada estándar: {'data': [...], 'total': N, 'limit': X, 'offset': Y}."""
    limit, offset = _paginar_valores(limit, offset)
    return {"data": data, "total": total, "limit": limit, "offset": offset}


def paginacion_compat(data, total, key, limit=PAG_DEFAULT_LIMIT, offset=PAG_DEFAULT_OFFSET):
    """FIX: Respuesta paginada compatible con los consumidores existentes.

    Devuelve la forma estándar {'data': [...], 'total': N, 'limit': X, 'offset': Y}
    Y además repite la lista bajo la clave histórica del endpoint (ej. 'registros',
    'dirigentes', 'electores') para no romper los front-ends/JS que ya leen esa
    clave. Sin parámetros de paginación explícitos, el límite sube a PAG_MAX_LIMIT
    (1000) para que el comportamiento por defecto siga trayendo casi todo y los
    consumidores actuales no noten cambios."""
    limit, offset = _paginar_valores(limit, offset)
    return {"data": data, key: data, "total": total, "limit": limit, "offset": offset}


# ─── WHITELIST PARA PREVENIR SQL INJECTION ─────────────────────────────
# FIX: Whitelist de tablas y columnas permitidas para queries dinámicas.
# Antes: se interpolaban variables directamente en f-strings SQL sin validación.
# Ahora: se valida contra un conjunto conocido antes de usar en la query.
TABLAS_PERMITIDAS = {
    'registros', 'no_voto', 'posible_votos', 'candidatos', 'dirigentes',
    'clientes', 'transportes', 'viajes', 'mesas', 'escuelas', 'miembros_mesa',
    'veedores_mesa', 'solicitudes_recogida', 'alertas_sos', 'push_subscriptions',
    'cuentas_usuario', 'usuarios', 'partidos', 'candidatos_lista',
    'consultas_publicas', 'registro_participacion', 'ubicaciones_gps',
    'simpatizantes', 'elecciones', 'tipos_eleccion', 'paquetes',
    'cliente_paquetes', 'alertas', 'intentos_verificacion', 'contactos',
    'grupos', 'grupo_dirigentes', 'posible_votos_historial', 'dashboard_cache',
    'configuraciones', 'log_auditoria'
}

COLUMNAS_PERMITIDAS = {
    'cedula', 'estado', 'nombre', 'apellido', 'departamento', 'distrito',
    'seccional_id', 'escuela_id', 'votante_cedula', 'dirigente_cedula',
    'candidato_id', 'tipo', 'status', 'mesa', 'orden', 'zona', 'sec_loc',
    'vinculo', 'voto_real', 'voto_timestamp', 'voto_dirigente', 'voto_motivo',
    'motivo', 'timestamp', 'activo', 'requiere_cambio_clave', 'rol', 'plan_id',
    'cliente_cedula', 'transporte_id', 'lat', 'lng', 'mensaje', 'resuelta',
    'created_at', 'actualizado', 'local_nombre', 'local', 'cantidad_bancas',
    'cantidad_suplentes', 'partido_id', 'cargo_id', 'circunscripcion_id',
    'departamento_id', 'distrito_id', 'eleccion_id', 'lista_id', 'grupo_id',
    'cedula_consultada', 'candidato_cedula', 'seccional', 'zona_nombre',
    'departamento_nombre', 'distrito_nombre', 'direccion', 'slocal',
    'fecha_afiliacion', 'seccional_numero', 'seccional_nombre', 'local_interna',
    'movimiento', 'voto_interna', 'voto_generales', 'nombre_completo',
    'orden_en_lista', 'tipo_postulacion', 'foto_url', 'lista_nro', 'lista_nombre',
    'color', 'nro', 'email', 'telefono', 'contrasena', 'categoria', 'css_tema',
    'candidato_nombre', 'candidato_cargo', 'locales', 'unidad_organizacion_id',
    'plan_visibilidad', 'dominio', 'branding_activo', 'registro_completado',
    'padre_cliente_cedula', 'fecha_inicio_servicio', 'fecha_fin_servicio',
    'tipo_servicio', 'placa', 'capacidad', 'dirigente_propietario_cedula',
    'id_veedor', 'nombre_veedor', 'cedula_veedor', 'mesa_id', 'horario_inicio',
    'horario_cierre', 'id', 'codigo', 'descripcion', 'titulo', 'updated_at',
    'completado_en', 'ruta_id', 'solicitud_id', 'cedula_conductor', 'origen',
    'destino', 'geometria', 'distancia_km', 'duracion_min', 'hora_recogida',
    'ubicacion', 'autorizado_por', 'canal', 'resueltoAt', 'nombre_chapa',
    'numero_lista', 'color_hex', 'presidente_id', 'vicepresidente_id',
    'nombre_unidad', 'prefijo_unidad', 'intendente_id', 'concejal_id',
    'tipo_relacion', 'nombre_lista', 'nombre_pc', 'depart', 'zona',
    'departamento_nombre', 'distrito_nombre', 'zona_nombre', 'local_nombre',
    'direccion', 'slocal', 'fecha_afiliacion', 'seccional_numero',
    'seccional_nombre', 'local_interna', 'movimiento', 'voto_interna',
    'voto_generales', 'apellido', 'nombre', 'nombre_completo', 'orden_en_lista',
    'tipo_postulacion', 'foto_url', 'lista_nro', 'lista_nombre', 'color', 'nro',
    'email', 'telefono', 'contrasena', 'categoria', 'css_tema', 'candidato_nombre',
    'candidato_cargo', 'locales', 'unidad_organizacion_id', 'plan_visibilidad',
    'dominio', 'branding_activo', 'registro_completado', 'padre_cliente_cedula',
    'fecha_inicio_servicio', 'fecha_fin_servicio', 'tipo_servicio', 'placa',
    'capacidad', 'seccional', 'dirigente_propietario_cedula', 'id_veedor',
    'nombre_veedor', 'cedula_veedor', 'mesa_id', 'horario_inicio',
    'horario_cierre', 'id', 'codigo', 'descripcion', 'titulo', 'created_at',
    'actualizado', 'updated_at', 'completado_en', 'ruta_id', 'solicitud_id',
    'cedula_conductor', 'origen', 'destino', 'geometria', 'distancia_km',
    'duracion_min', 'hora_recogida', 'ubicacion', 'autorizado_por', 'canal',
    'resueltoAt', 'dirigente_cedula', 'codigo', 'nombre_chapa', 'numero_lista',
    'color_hex', 'presidente_id', 'vicepresidente_id', 'nombre_unidad',
    'prefijo_unidad', 'intendente_id', 'concejal_id', 'tipo_relacion',
    'nombre_lista', 'cantidad_bancas', 'cantidad_suplentes', 'nombre_pc'
}


def validar_tabla(tabla):
    """FIX: Valida que la tabla esté en la whitelist antes de usar en SQL dinámico."""
    if tabla not in TABLAS_PERMITIDAS:
        raise ValueError(f'Tabla no permitida: {tabla}')
    return tabla


def validar_columna(col):
    """FIX: Valida que la columna esté en la whitelist antes de usar en SQL dinámico."""
    if col not in COLUMNAS_PERMITIDAS:
        raise ValueError(f'Columna no permitida: {col}')
    return col


# ─── THREAD POOL para I/O bloqueante ──────────────────────────────────
# FIX: Las operaciones de red (SMTP/Twilio/OSRM) son síncronas y bloqueaban el
# event loop de asyncio (~8-10s cada una). Se ejecutan en un thread pool propio
# para no congelar el servidor mientras se envía una notificación.
import concurrent.futures

_blocking_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=8, thread_name_prefix="blocking_io"
)


def run_blocking(func, *args, **kwargs):
    """Ejecuta una función bloqueante (red/SMTP) en un thread separado y espera
    el resultado de forma síncrona. Uso desde endpoints `def` (sync).

    Retorna el resultado de la función; si el thread pool está saturado o hay
    un error, propaga la excepción para que el llamador la maneje como antes."""
    return _blocking_executor.submit(func, *args, **kwargs).result()


# Simple connection pool implementation for SQLite
_connection_pool: List[sqlite3.Connection] = []
_pool_lock = threading.Lock()
_pool_max_size = 5

# FIX: timeouts de SQLite para evitar "database is locked" bajo concurrencia
_BUSY_TIMEOUT_MS = 10000  # espera hasta 10s a que se libere el lock
_CONN_TIMEOUT = 10.0


def _create_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=_CONN_TIMEOUT)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    # FIX: espera activa ante "database is locked" en lugar de fallar al instante
    conn.execute(f"PRAGMA busy_timeout={_BUSY_TIMEOUT_MS}")
    return conn

def get_connection() -> sqlite3.Connection:
    """Get a connection from the pool or create a new one"""
    global _connection_pool
    conn = None
    with _pool_lock:
        if _connection_pool:
            conn = _connection_pool.pop()
            # Verify connection is still valid
            try:
                conn.execute("SELECT 1")
            except:
                # Connection is dead, close it and create new one
                conn.close()
                conn = None
        if conn is None:
            # Create new connection
            conn = _create_connection()
    
    alcance = ALCANCE_CLIENTES.get()
    if alcance is not None:
        _aplicar_alcance(conn, alcance)
    
    return conn

def release_connection(conn: Optional[sqlite3.Connection]) -> None:
    """Return connection to pool"""
    global _connection_pool
    if conn is None:
        return
    
    try:
        conn.execute("SELECT 1")
        with _pool_lock:
            if len(_connection_pool) < _pool_max_size:
                _connection_pool.append(conn)
    except:
        conn.close()

def init_db() -> None:
    """Inicializa la base de datos con las tablas y datos semilla necesarios."""
    conn = get_connection()
    try:
        # Tablas principales
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS cuentas_usuario (
                cedula TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                contrasena TEXT NOT NULL,
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                foto_url TEXT DEFAULT '',
                activo INTEGER DEFAULT 1,
                ultimo_acceso TEXT,
                requiere_cambio_clave INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS sesiones (
                id TEXT PRIMARY KEY,
                cedula TEXT NOT NULL,
                rol_activo TEXT DEFAULT '',
                ip TEXT DEFAULT '',
                user_agent TEXT DEFAULT '',
                activa INTEGER DEFAULT 1,
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS asignaciones_rol (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT NOT NULL,
                rol TEXT NOT NULL,
                nivel_sistema TEXT DEFAULT '',
                tipo_cliente TEXT DEFAULT '',
                dirigente_tipo TEXT DEFAULT '',
                departamento_id INTEGER,
                distrito_id INTEGER,
                candidato_nombre TEXT DEFAULT '',
                candidato_cargo TEXT DEFAULT '',
                vehiculo_id INTEGER,
                activo INTEGER DEFAULT 1,
                UNIQUE(cedula, rol)
            );
            
            CREATE TABLE IF NOT EXISTS intentos_login (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT NOT NULL,
                exitoso INTEGER DEFAULT 0,
                ip TEXT DEFAULT '',
                user_agent TEXT DEFAULT '',
                timestamp TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS auditoria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT DEFAULT '',
                nombre TEXT DEFAULT '',
                accion TEXT NOT NULL,
                detalle TEXT DEFAULT '',
                entidad TEXT DEFAULT '',
                entidad_id TEXT DEFAULT '',
                ip TEXT DEFAULT '',
                user_agent TEXT DEFAULT '',
                severidad TEXT DEFAULT 'info',
                session_id TEXT DEFAULT '',
                timestamp TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS clientes (
                cedula TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                apellido TEXT DEFAULT '',
                contrasena TEXT NOT NULL,
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                tipo TEXT DEFAULT 'pc',
                categoria TEXT DEFAULT 'partido',
                css_tema TEXT DEFAULT 'neutral',
                departamento_id INTEGER,
                distrito_id INTEGER,
                candidato_nombre TEXT DEFAULT '',
                candidato_cargo TEXT DEFAULT '',
                locales TEXT DEFAULT '',
                partido_id INTEGER,
                color_propio_hex TEXT DEFAULT '',
                plan_visibilidad TEXT DEFAULT 'propio',
                unidad_organizacion_id INTEGER,
                dominio TEXT DEFAULT '',
                branding_activo INTEGER DEFAULT 0,
                activo INTEGER DEFAULT 1,
                registro_completado INTEGER DEFAULT 0,
                padre_cliente_cedula TEXT,
                fecha_inicio_servicio TEXT,
                fecha_fin_servicio TEXT,
                tipo_servicio TEXT DEFAULT ''
            );
            
            CREATE TABLE IF NOT EXISTS dirigentes (
                cedula TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                contrasena TEXT DEFAULT '',
                tipo TEXT DEFAULT 'dirigente',
                cliente_cedula TEXT,
                telefono TEXT DEFAULT '',
                email TEXT DEFAULT '',
                activo INTEGER DEFAULT 1,
                creado_por_cedula TEXT,
                local_distrito TEXT DEFAULT '',
                local_sec_loc TEXT DEFAULT '',
                local_local TEXT DEFAULT '',
                local_nombre TEXT DEFAULT ''
            );
            
            CREATE TABLE IF NOT EXISTS candidatos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                cargo TEXT DEFAULT 'concejal',
                lista_nro INTEGER,
                lista_nombre TEXT DEFAULT '',
                orden INTEGER DEFAULT 0,
                departamento_id INTEGER,
                distrito_id INTEGER,
                cliente_cedula TEXT,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS partidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo_partido TEXT UNIQUE,
                nombre_oficial TEXT NOT NULL,
                sigla TEXT DEFAULT '',
                descripcion_corta TEXT DEFAULT '',
                color_principal_hex TEXT DEFAULT '#333333',
                color_secundario_hex TEXT DEFAULT '#FFFFFF',
                logo_url TEXT DEFAULT '',
                numero_inscripcion TEXT DEFAULT '',
                fecha_inscripcion TEXT DEFAULT '',
                estado_juridico TEXT DEFAULT 'Activo',
                numero_lista INTEGER,
                ambito TEXT DEFAULT 'Nacional',
                distrito_id INTEGER,
                puede_postular_concejales INTEGER DEFAULT 1,
                cargos_habilitados TEXT DEFAULT '[]',
                visible_en_boleta INTEGER DEFAULT 1,
                prioridad_orden INTEGER DEFAULT 0,
                cliente_cedula TEXT,
                usuario_ultimo_cambio TEXT DEFAULT '',
                color_partido TEXT DEFAULT '',
                fecha_actualizacion TEXT
            );
            
            CREATE TABLE IF NOT EXISTS registros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT NOT NULL,
                nombre TEXT DEFAULT '',
                mesa INTEGER DEFAULT 0,
                orden INTEGER DEFAULT 0,
                estado TEXT DEFAULT '',
                accion TEXT DEFAULT '',
                dirigente TEXT DEFAULT '',
                dirigenteNombre TEXT DEFAULT '',
                origen TEXT DEFAULT 'web',
                cliente_cedula TEXT,
                timestamp TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS no_voto (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT NOT NULL,
                mesa INTEGER DEFAULT 0,
                orden INTEGER DEFAULT 0,
                motivo TEXT DEFAULT 'no_voto',
                observacion TEXT DEFAULT '',
                cliente_cedula TEXT,
                timestamp TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS posible_votos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT NOT NULL,
                votante_cedula TEXT NOT NULL,
                votante_nombre TEXT DEFAULT '',
                votante_apellido TEXT DEFAULT '',
                votante_mesa INTEGER DEFAULT 0,
                votante_orden INTEGER DEFAULT 0,
                votante_departamento TEXT DEFAULT '',
                votante_distrito TEXT DEFAULT '',
                votante_zona TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                status TEXT DEFAULT 'posible',
                candidato_id INTEGER,
                confirmado_en TEXT,
                actualizado TEXT,
                creado TEXT DEFAULT (datetime('now','localtime')),
                UNIQUE(dirigente_cedula, votante_cedula)
            );
            
            CREATE TABLE IF NOT EXISTS posible_voto_candidatos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                posible_voto_id INTEGER NOT NULL,
                candidato_id INTEGER NOT NULL,
                cargo TEXT DEFAULT '',
                UNIQUE(posible_voto_id, candidato_id)
            );
            
            CREATE TABLE IF NOT EXISTS dirigente_candidatos (
                dirigente_cedula TEXT NOT NULL,
                candidato_id INTEGER NOT NULL,
                PRIMARY KEY (dirigente_cedula, candidato_id)
            );
            
            CREATE TABLE IF NOT EXISTS grupos_trabajo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                candidato_id INTEGER,
                zona TEXT DEFAULT '',
                seccional TEXT DEFAULT '',
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS grupo_dirigentes (
                grupo_id INTEGER NOT NULL,
                dirigente_cedula TEXT NOT NULL,
                PRIMARY KEY (grupo_id, dirigente_cedula)
            );
            
            -- FIX: Tabla transportes con UNIQUE (cedula) WHERE cedula != '' 
            -- para permitir multiples vehiculos del mismo conductor
            CREATE TABLE IF NOT EXISTS transportes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT NOT NULL,
                nombre TEXT NOT NULL,
                tipo TEXT DEFAULT 'vehiculo',
                placa TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                capacidad INTEGER DEFAULT 4,
                seccional TEXT DEFAULT '',
                contrasena TEXT DEFAULT '',
                estado TEXT DEFAULT 'disponible',
                dirigente_propietario_cedula TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_transportes_cedula_unica ON transportes(cedula) WHERE cedula != '';
            
            -- FIX: FK a transportes en ubicaciones_gps para evitar transporte_id huerfano
            CREATE TABLE IF NOT EXISTS ubicaciones_gps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transporte_id INTEGER,
                cedula TEXT DEFAULT '',
                lat REAL,
                lng REAL,
                velocidad REAL DEFAULT 0,
                direccion TEXT DEFAULT '',
                timestamp TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (transporte_id) REFERENCES transportes(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS rutas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transporte_id INTEGER,
                cedula_conductor TEXT DEFAULT '',
                origen TEXT DEFAULT '',
                destino TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente',
                observacion TEXT DEFAULT '',
                salida TEXT,
                llegada TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (transporte_id) REFERENCES transportes(id) ON DELETE SET NULL
            );
            
            -- FIX: FK a transportes en viajes para validar que el transporte existe
            CREATE TABLE IF NOT EXISTS viajes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ruta_id INTEGER,
                solicitud_id INTEGER,
                transporte_id INTEGER,
                cedula_conductor TEXT DEFAULT '',
                votante_cedula TEXT DEFAULT '',
                votante_nombre TEXT DEFAULT '',
                tipo TEXT DEFAULT 'ida',
                estado TEXT DEFAULT 'pendiente',
                origen_lat REAL,
                origen_lng REAL,
                destino_lat REAL,
                destino_lng REAL,
                origen TEXT DEFAULT '',
                destino TEXT DEFAULT '',
                geometria TEXT DEFAULT '[]',
                distancia_km REAL DEFAULT 0,
                duracion_min REAL DEFAULT 0,
                creado TEXT DEFAULT (datetime('now','localtime')),
                completado_en TEXT,
                FOREIGN KEY (transporte_id) REFERENCES transportes(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS solicitudes_recogida (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT DEFAULT '',
                dirigente_nombre TEXT DEFAULT '',
                votante_cedula TEXT NOT NULL,
                votante_nombre TEXT DEFAULT '',
                hora_recogida TEXT DEFAULT '',
                ubicacion TEXT DEFAULT '',
                descripcion TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente',
                autorizado_por TEXT DEFAULT '',
                ruta_id INTEGER,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_recogida(estado);
            CREATE INDEX IF NOT EXISTS idx_solicitudes_dirigente ON solicitudes_recogida(dirigente_cedula);
            -- FIX: UNIQUE parcial para evitar duplicados de solicitudes activas
            CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitud_votante_activa
                     ON solicitudes_recogida(votante_cedula)
                     WHERE estado IN ('pendiente','autorizado');
            
            CREATE TABLE IF NOT EXISTS pendientes_qr (
                id TEXT PRIMARY KEY,
                cedula TEXT NOT NULL,
                nombre TEXT DEFAULT '',
                mesa TEXT DEFAULT '',
                orden TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                observacion TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente',
                canal TEXT DEFAULT 'qr',
                dirigente_cedula TEXT DEFAULT '',
                codigo TEXT DEFAULT '',
                resueltoAt TEXT
            );
            
            CREATE TABLE IF NOT EXISTS miembros_mesa (
                cedula TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                contrasena TEXT DEFAULT '',
                mesa TEXT DEFAULT '',
                horario_inicio TEXT DEFAULT '',
                horario_cierre TEXT DEFAULT '',
                estado TEXT DEFAULT 'ACTIVO'
            );
            
            -- FIX: FKs a mesas y escuelas en veedores_mesa
            CREATE TABLE IF NOT EXISTS veedores_mesa (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                id_veedor TEXT UNIQUE NOT NULL,
                nombre_veedor TEXT NOT NULL,
                cedula_veedor TEXT UNIQUE NOT NULL,
                seccional_id INTEGER DEFAULT 0,
                escuela_id INTEGER DEFAULT 0,
                mesa_id INTEGER DEFAULT 0,
                telefono TEXT DEFAULT '',
                estado TEXT DEFAULT 'Activo',
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (mesa_id) REFERENCES miembros_mesa(id) ON DELETE SET NULL,
                FOREIGN KEY (escuela_id) REFERENCES escuelas(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS veedor_mesa_estado (
                mesa_id TEXT PRIMARY KEY,
                votos TEXT DEFAULT '{}',
                transfer_log TEXT DEFAULT '[]',
                veedor TEXT DEFAULT '',
                updated_at TEXT
            );
            
            CREATE TABLE IF NOT EXISTS escuelas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                direccion TEXT DEFAULT '',
                distrito_id INTEGER,
                seccional_id INTEGER,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS mesas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero INTEGER NOT NULL,
                escuela_id INTEGER,
                seccional_id INTEGER,
                activo INTEGER DEFAULT 1,
                FOREIGN KEY (escuela_id) REFERENCES escuelas(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS alertas_sos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conductor_cedula TEXT,
                transporte_id INTEGER,
                lat REAL,
                lng REAL,
                mensaje TEXT,
                estado TEXT DEFAULT 'activa',
                creado TEXT DEFAULT (datetime('now','localtime')),
                resuelta INTEGER DEFAULT 0,
                FOREIGN KEY (transporte_id) REFERENCES transportes(id) ON DELETE SET NULL
            );
            
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT NOT NULL,
                subscription_json TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                UNIQUE(cedula)
            );
            
            CREATE TABLE IF NOT EXISTS consultas_publicas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT DEFAULT (datetime('now','localtime')),
                cedula_consultada TEXT NOT NULL,
                departamento TEXT DEFAULT '',
                distrito TEXT DEFAULT '',
                zona TEXT DEFAULT '',
                sec_loc INTEGER DEFAULT 0,
                vinculo TEXT DEFAULT '',
                candidato_cedula TEXT DEFAULT '',
                canal TEXT DEFAULT 'consulta_mesa'
            );
            
            CREATE TABLE IF NOT EXISTS registro_participacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                veedor_id TEXT,
                votante_cedula TEXT,
                votante_nombre TEXT DEFAULT '',
                mesa_id INTEGER DEFAULT 0,
                seccional_id INTEGER DEFAULT 0,
                escuela_id INTEGER DEFAULT 0,
                confirmado_por_veedor INTEGER DEFAULT 0,
                confirmado_por_votante INTEGER DEFAULT 0,
                double_check INTEGER DEFAULT 0,
                timestamp_confirmacion TEXT DEFAULT (datetime('now','localtime')),
                hash_validacion TEXT DEFAULT ''
            );
            
            CREATE TABLE IF NOT EXISTS elecciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_eleccion_id INTEGER,
                nombre TEXT NOT NULL,
                periodo TEXT DEFAULT '',
                fecha_eleccion TEXT DEFAULT '',
                estado TEXT DEFAULT 'previa',
                activo INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS tipos_eleccion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT DEFAULT '',
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS cargos_electivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                ambito TEXT DEFAULT 'nacional',
                permite_suplente INTEGER DEFAULT 1,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS listas_partido (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partido_id INTEGER NOT NULL,
                eleccion_id INTEGER,
                cargo_id INTEGER,
                circunscripcion_id INTEGER,
                numero_lista INTEGER,
                nombre_lista TEXT DEFAULT '',
                color_hex TEXT DEFAULT '',
                FOREIGN KEY (partido_id) REFERENCES partidos(id),
                FOREIGN KEY (cargo_id) REFERENCES cargos_electivos(id)
            );
            
            -- FIX: Tabla candidatos_lista con todos los campos necesarios (14 columnas)
            CREATE TABLE IF NOT EXISTS candidatos_lista (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lista_id INTEGER NOT NULL,
                candidato_id INTEGER DEFAULT NULL,
                nombre_completo TEXT NOT NULL,
                orden_en_lista INTEGER NOT NULL,
                cargo TEXT DEFAULT 'Concejal Titular',
                activo INTEGER DEFAULT 1,
                tipo_postulacion TEXT DEFAULT 'titular',
                cedula TEXT DEFAULT '',
                foto_url TEXT DEFAULT '',
                eleccion_id INTEGER,
                circunscripcion_id INTEGER,
                cargo_id INTEGER,
                FOREIGN KEY (lista_id) REFERENCES listas_partido(id),
                FOREIGN KEY (candidato_id) REFERENCES candidatos(id)
            );
            
            CREATE TABLE IF NOT EXISTS circunscripciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                cantidad_bancas INTEGER DEFAULT 0,
                cantidad_suplentes INTEGER DEFAULT 0,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS reglas_cargo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cargo_id INTEGER,
                circunscripcion_id INTEGER,
                cantidad_bancas INTEGER DEFAULT 0,
                cantidad_suplentes INTEGER DEFAULT 0,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS paquetes_eleccion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleccion_id INTEGER,
                nombre TEXT NOT NULL,
                descripcion TEXT DEFAULT '',
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS paquete_cargos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paquete_id INTEGER,
                cargo_id INTEGER,
                cantidad_bancas INTEGER DEFAULT 0,
                cantidad_suplentes INTEGER DEFAULT 0
            );
            
            CREATE TABLE IF NOT EXISTS cliente_paquetes (
                cliente_id TEXT,
                paquete_id INTEGER,
                activo INTEGER DEFAULT 1,
                PRIMARY KEY (cliente_id, paquete_id)
            );
            
            CREATE TABLE IF NOT EXISTS chapas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleccion_id INTEGER,
                partido_id INTEGER,
                cargo_id INTEGER,
                nombre_chapa TEXT NOT NULL,
                numero_lista INTEGER,
                color_hex TEXT DEFAULT '',
                presidente_id INTEGER,
                vicepresidente_id INTEGER,
                FOREIGN KEY (partido_id) REFERENCES partidos(id),
                FOREIGN KEY (cargo_id) REFERENCES cargos_electivos(id)
            );
            
            CREATE TABLE IF NOT EXISTS estructura_politica (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partido_id INTEGER,
                nombre_unidad TEXT DEFAULT '',
                prefijo_unidad TEXT DEFAULT '',
                FOREIGN KEY (partido_id) REFERENCES partidos(id)
            );
            
            CREATE TABLE IF NOT EXISTS partidos_eleccion (
                partido_id INTEGER,
                eleccion_id INTEGER,
                numero_lista INTEGER,
                PRIMARY KEY (partido_id, eleccion_id)
            );
            
            CREATE TABLE IF NOT EXISTS certificaciones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT,
                tipo TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS vinculo_dirigente_historial (
                dirigente_cedula TEXT NOT NULL,
                cliente_cedula TEXT NOT NULL,
                desvinculaciones INTEGER DEFAULT 0,
                PRIMARY KEY (dirigente_cedula, cliente_cedula)
            );
            
            CREATE TABLE IF NOT EXISTS solicitudes_desvinculo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT NOT NULL,
                cliente_cedula TEXT NOT NULL,
                motivo TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS codigos_invitacion (
                codigo TEXT PRIMARY KEY,
                dirigente_cedula TEXT,
                usado INTEGER DEFAULT 0,
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS solicitudes_vinculo_subdirigente (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT,
                sub_dirigente_cedula TEXT,
                estado TEXT DEFAULT 'pendiente',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS tareas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT,
                titulo TEXT NOT NULL,
                descripcion TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS asignacion_dirigentes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dirigente_cedula TEXT,
                candidato_id INTEGER,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS alertas_veedores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_alerta TEXT NOT NULL,
                nivel TEXT DEFAULT 'Informativa',
                veedor_id TEXT,
                mesa_id INTEGER DEFAULT 0,
                descripcion TEXT DEFAULT '',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS incidencias_transporte (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                viaje_id INTEGER NOT NULL,
                tipo TEXT DEFAULT '',
                descripcion TEXT DEFAULT '',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS simpatizantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidato_id INTEGER,
                votante_cedula TEXT,
                departamento_id INTEGER,
                distrito_id INTEGER,
                lat REAL,
                lng REAL,
                nivel_interes TEXT DEFAULT '',
                origen TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now','localtime')),
                UNIQUE(candidato_id, votante_cedula)
            );
            
            CREATE TABLE IF NOT EXISTS ubicaciones_votantes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                votante_cedula TEXT,
                lat REAL,
                lng REAL,
                origen TEXT DEFAULT '',
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS perfil_candidato (
                candidato_id INTEGER PRIMARY KEY,
                bio TEXT DEFAULT '',
                propuestas TEXT DEFAULT '',
                facebook TEXT DEFAULT '',
                instagram TEXT DEFAULT '',
                twitter TEXT DEFAULT '',
                FOREIGN KEY (candidato_id) REFERENCES candidatos(id)
            );
            
            CREATE TABLE IF NOT EXISTS candidato_fotos_fans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidato_id INTEGER,
                foto_url TEXT,
                FOREIGN KEY (candidato_id) REFERENCES candidatos(id)
            );
            
            CREATE TABLE IF NOT EXISTS preguntas_encuesta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pregunta TEXT NOT NULL,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS eventos_en_vivo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                descripcion TEXT DEFAULT '',
                fecha TEXT,
                activo INTEGER DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS respuestas_encuesta (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pregunta_id INTEGER,
                respuesta TEXT,
                creado TEXT DEFAULT (datetime('now','localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS historial_partidos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT,
                mesas INTEGER,
                electores INTEGER,
                anio INTEGER,
                eleccion TEXT
            );
            
            CREATE TABLE IF NOT EXISTS unidades_organizacion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                partido_id INTEGER,
                numero INTEGER,
                nombre TEXT DEFAULT '',
                descripcion TEXT DEFAULT '',
                departamento_id INTEGER,
                distrito_id INTEGER,
                FOREIGN KEY (partido_id) REFERENCES partidos(id)
            );
            
            CREATE TABLE IF NOT EXISTS puestos_comando (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                unidad_id INTEGER,
                numero INTEGER,
                rol TEXT DEFAULT '',
                codigo TEXT DEFAULT '',
                escuela_nombre TEXT DEFAULT '',
                descripcion TEXT DEFAULT '',
                FOREIGN KEY (unidad_id) REFERENCES unidades_organizacion(id)
            );
            
            CREATE TABLE IF NOT EXISTS partidos_config_organizacion (
                partido_id INTEGER PRIMARY KEY,
                nombre_unidad TEXT DEFAULT '',
                prefijo_unidad TEXT DEFAULT '',
                nombre_pc TEXT DEFAULT '',
                FOREIGN KEY (partido_id) REFERENCES partidos(id)
            );
            
            CREATE TABLE IF NOT EXISTS config_sistema (
                clave TEXT PRIMARY KEY,
                valor TEXT,
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            );
            
            CREATE TABLE IF NOT EXISTS listas (
                nro INTEGER PRIMARY KEY,
                nombre TEXT NOT NULL,
                color TEXT DEFAULT '#6b7280',
                tipo TEXT DEFAULT 'junta'
            );
            
            CREATE TABLE IF NOT EXISTS padron2026_completo (
                cedula TEXT PRIMARY KEY,
                apellido TEXT DEFAULT '',
                nombre TEXT DEFAULT '',
                mesa INTEGER DEFAULT 0,
                orden INTEGER DEFAULT 0,
                depart INTEGER,
                distrito INTEGER,
                zona_nombre TEXT DEFAULT '',
                local_nombre TEXT DEFAULT '',
                vinculo TEXT DEFAULT '',
                sec_loc INTEGER DEFAULT 0,
                departamento_nombre TEXT DEFAULT '',
                distrito_nombre TEXT DEFAULT ''
            );
            
            CREATE TABLE IF NOT EXISTS afiliados_partido (
                cedula TEXT,
                partido_id INTEGER,
                unidad_organizacion_id INTEGER,
                codigo_sec_origen INTEGER,
                apellido TEXT DEFAULT '',
                nombre TEXT DEFAULT '',
                mesa INTEGER DEFAULT 0,
                orden INTEGER DEFAULT 0,
                fecha_afiliacion TEXT,
                fuente_archivo TEXT DEFAULT '',
                PRIMARY KEY (cedula, partido_id)
            );
            
            CREATE TABLE IF NOT EXISTS dirigente_votantes (
                dirigente_cedula TEXT,
                votante_cedula TEXT,
                PRIMARY KEY (dirigente_cedula, votante_cedula)
            );
            
            CREATE INDEX IF NOT EXISTS idx_dirigentes_cliente ON dirigentes(cliente_cedula);
            -- FIX: indices faltantes pedidos en el plan de rendimiento (N+1/estado).
            -- idx_registros_estado acelera los "WHERE estado='voto'" sobre 454k filas.
            CREATE INDEX IF NOT EXISTS idx_registros_estado ON registros(estado);
            -- idx_no_voto_cedula: lookup por votante en la tabla no_voto.
            CREATE INDEX IF NOT EXISTS idx_no_voto_cedula ON no_voto(cedula);
            -- idx_posible_votos_votante: cruces por votante_cedula (seguimiento).
            CREATE INDEX IF NOT EXISTS idx_posible_votos_votante ON posible_votos(votante_cedula);
            -- idx_transportes_estado: filtros de flota por estado.
            CREATE INDEX IF NOT EXISTS idx_transportes_estado ON transportes(estado);
            -- idx_viajes_votante_cedula: viajes por votante.
            CREATE INDEX IF NOT EXISTS idx_viajes_votante_cedula ON viajes(votante_cedula);
            CREATE INDEX IF NOT EXISTS idx_registros_cliente ON registros(cliente_cedula);
            CREATE INDEX IF NOT EXISTS idx_no_voto_cliente ON no_voto(cliente_cedula);
            CREATE INDEX IF NOT EXISTS idx_transportes_cliente ON transportes(cedula);
            CREATE INDEX IF NOT EXISTS idx_posible_votos_dirigente ON posible_votos(dirigente_cedula);
            CREATE INDEX IF NOT EXISTS idx_posible_votos_status ON posible_votos(status);
            CREATE INDEX IF NOT EXISTS idx_pv_candidato ON posible_votos(candidato_id);
            CREATE INDEX IF NOT EXISTS idx_cl_lista ON candidatos_lista(lista_id);
            CREATE INDEX IF NOT EXISTS idx_cp_candidato ON consultas_publicas(candidato_cedula);
            CREATE INDEX IF NOT EXISTS idx_cp_cedula ON consultas_publicas(cedula_consultada);
            CREATE INDEX IF NOT EXISTS idx_cp_depart ON consultas_publicas(departamento);
            -- idx_registros_timestamp: acelera "Actividad Reciente" del dashboard
            -- (ORDER BY timestamp DESC LIMIT 20 sobre 454k filas tardaba ~2s por
            -- "USE TEMP B-TREE FOR ORDER BY" al no haber indice sobre timestamp).
            CREATE INDEX IF NOT EXISTS idx_registros_timestamp ON registros(timestamp);
            -- idx_registros_mesa_estado: covering index para "Top mesas" del dashboard
            -- (GROUP BY mesa + SUM(estado='voto') sobre 454k filas tardaba ~4s; con este
            -- indice compuesto, mesa+estado se resuelven sin tocar la tabla completa).
            CREATE INDEX IF NOT EXISTS idx_registros_mesa_estado ON registros(mesa, estado);
        """)
        conn.commit()
    finally:
        conn.close()
