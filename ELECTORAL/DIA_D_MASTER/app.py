import os, re, json, time, hashlib, random, math, io
import json
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from datetime import datetime
from fastapi import Depends, FastAPI, Header, HTTPException, Body, Query, Request, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from database import get_connection, init_db, ALCANCE_CLIENTES, validar_tabla, validar_columna
import herramientas as HERR
import elecciones_ctx
import organizacion as ORG

# ─── VAPID KEYS para Web Push - Cargar desde variables de entorno ──────────────────────────
# FIX: Eliminado default hardcodeado de VAPID_PRIVATE_KEY. Si no hay env var, la app falla al inicio.
VAPID_CLAIMS = {
    "sub": os.getenv("VAPID_CLAIMS_SUB", "mailto:admin@seccional40.com")
}
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
    raise RuntimeError(
        "VAPID_PRIVATE_KEY y VAPID_PUBLIC_KEY deben configurarse como variables de entorno. "
        "Genera un par con: python3 -c \"from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print(v.private_key_b64()); print(v.public_key_b64())\""
    )

# ─── CONFIGURACIÓN DE SEGURIDAD ───────────────────────────────────────
DIRE_API_KEY = os.getenv("DIRE_API_KEY", "")

def verify_dirigente_api_key(x_api_key: str = Header(None)):
    """Verificar API key para endpoints de dirigentes"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API key requerida")
    if x_api_key != DIRE_API_KEY:
        raise HTTPException(status_code=403, detail="API key inválida")
    return x_api_key

app = FastAPI(title="DIA Mesas DB - API Electoral")
# FIX: CORS restringido - evitar que cualquier dominio haga peticiones a la API
# Antes: allow_origins=["*"] (abierto a cualquier dominio)
# Ahora: lista vacia por defecto, se puede configurar via variable de entorno
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
# Permitir Firebase Hosting y localhost para desarrollo
_firebase_origins = [
    "https://yocreo-2570b.web.app",
    "https://yocreo-2570b.firebaseapp.com",
    "http://localhost:8000",
    "http://localhost:5000",
    "http://127.0.0.1:8000",
]
for _origin in _firebase_origins:
    if _origin not in CORS_ORIGINS:
        CORS_ORIGINS.append(_origin)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


# ─── SEGURIDAD: RATE LIMITING Y TOKEN DE VEEDORES ─────────────────────────────
# FIX: Rate limiting simple en memoria para prevenir abuso de endpoints publicos
# Almacena ip -> lista de timestamps de requests
_rate_limit_requests = {}
RATE_LIMIT_MAX_REQUESTS = 10  # Max requests permitidos
RATE_LIMIT_WINDOW_SECONDS = 60  # Ventana de tiempo en segundos

def _check_rate_limit(ip: str, max_requests: int = RATE_LIMIT_MAX_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW_SECONDS):
    """Verifica si una IP ha excedido el limite de requests. Levanta HTTPException 429 si es asi."""
    now = time.time()
    if ip not in _rate_limit_requests:
        _rate_limit_requests[ip] = []
    # Limpiar requests viejos fuera de la ventana
    _rate_limit_requests[ip] = [t for t in _rate_limit_requests[ip] if now - t < window_seconds]
    if len(_rate_limit_requests[ip]) >= max_requests:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intentá más tarde.")
    _rate_limit_requests[ip].append(now)

# FIX: Token simple para endpoints de veedores que modifican datos
# Se puede configurar via variable de entorno VEEDOR_POST_TOKEN
VEEDOR_POST_TOKEN = os.getenv("VEEDOR_POST_TOKEN", "veedor_token_2026")

def _verify_veedor_token(token: str):
    """Verifica el token para operaciones POST de veedores. Levanta HTTPException 401 si es invalido."""
    if not token:
        raise HTTPException(status_code=401, detail="Token de veedor requerido")
    if token != VEEDOR_POST_TOKEN:
        raise HTTPException(status_code=403, detail="Token de veedor inválido")


PLANES_VISIBILIDAD = ('propio', 'partido', 'total')


def _clientes_visibles(conn, cliente):
    """Segun el plan del cliente: None = todo; si no, lista de clientes cuyos datos puede ver."""
    row = conn.execute("SELECT COALESCE(plan_visibilidad,'propio'), partido_id FROM clientes WHERE cedula=?",
                       (cliente,)).fetchone()
    plan, partido_id = (row[0] if row else 'propio'), (row[1] if row else None)
    if plan == 'total':
        return None
    if plan == 'partido' and partido_id:
        return [r[0] for r in conn.execute("SELECT cedula FROM clientes WHERE partido_id=?", (partido_id,)).fetchall()]
    return [cliente]


def _es_admin_master(conn, session_id):
    row = conn.execute("""SELECT u.nivel FROM sesiones s JOIN usuarios u ON u.cedula = s.cedula
                          WHERE s.id=? AND u.activo=1""", (session_id,)).fetchone()
    return bool(row and row[0] == 'master')

def _require_session_nivel(conn, session_id, min_nivel):
    """Valida sesión activa por header sin exponer contraseñas en URLs.

    FIX: antes resolvía el usuario SOLO contra la tabla legacy `usuarios` (apenas
    5 cuentas semilla: master/nacional/departamental/distrital/seccional), así que
    cualquier dirigente/cliente/candidato de verdad (creados en el sistema unificado,
    `cuentas_usuario` + `asignaciones_rol`) tenía sesión activa pero igual recibía
    401 acá. Ahora primero intenta la tabla legacy (compat) y si no está, resuelve
    por el sistema unificado, igual que `_autenticar_unificado`."""
    sid = normalizar_texto(session_id or "")
    if not sid:
        raise HTTPException(status_code=401, detail="Sesión requerida")
    srow = conn.execute("SELECT cedula, activa FROM sesiones WHERE id=?", (sid,)).fetchone()
    if not srow or not srow[1]:
        raise HTTPException(status_code=401, detail="Sesión no válida o vencida")
    cedula_sesion = srow[0]
    row = conn.execute("SELECT cedula, nombre, nivel FROM usuarios WHERE cedula=? AND activo=1", (cedula_sesion,)).fetchone()
    if row:
        user = {"cedula": row[0], "nombre": row[1], "nivel": row[2]}
    else:
        urow = conn.execute("SELECT cedula, nombre FROM cuentas_usuario WHERE cedula=? AND activo=1", (cedula_sesion,)).fetchone()
        if not urow:
            raise HTTPException(status_code=401, detail="Sesión no válida o vencida")
        roles = _cargar_roles_unificado(cedula_sesion, conn)
        if not roles:
            raise HTTPException(status_code=403, detail="Usuario sin roles asignados")
        mejor = max(roles, key=lambda r: _nivel_index(r["rol"]))
        user = {"cedula": urow[0], "nombre": urow[1], "nivel": mejor["rol"]}
    _check_nivel(user, min_nivel)
    return user


@app.middleware("http")
async def alcance_por_plan(request: Request, call_next):
    """En lecturas (GET) hechas por un cliente o su dirigente, limita los datos al alcance de su plan.
    Administradores y peticiones sin sesion de cliente no se filtran."""
    token = None
    if request.method == "GET":
        sid = (request.headers.get("x-session-id") or request.query_params.get("session_id")
               or request.query_params.get("s") or "")
        if sid:
            conn = get_connection()
            try:
                cliente = _cliente_de_sesion(conn, sid)
                ver = normalizar_cedula(request.headers.get("x-ver-cliente") or "")
                if cliente:
                    token = ALCANCE_CLIENTES.set(_clientes_visibles(conn, cliente))
                elif ver and _es_admin_master(conn, sid):
                    # El Admin Master ve los datos de cada cliente por separado
                    token = ALCANCE_CLIENTES.set([ver])
            except Exception:
                pass
            finally:
                conn.close()
    try:
        return await call_next(request)
    finally:
        if token is not None:
            ALCANCE_CLIENTES.reset(token)

STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')
os.makedirs(STATIC_DIR, exist_ok=True)

# Servir assets anidados (vendor/leaflet, vendor/fontawesome, etc.)
VENDOR_DIR = os.path.join(STATIC_DIR, "vendor")
os.makedirs(VENDOR_DIR, exist_ok=True)
app.mount("/vendor", StaticFiles(directory=VENDOR_DIR), name="vendor")


def contar_padron_completo(cursor):
    try:
        return cursor.execute("SELECT COUNT(*) FROM padron2026_completo").fetchone()[0] or 0
    except Exception:
        return 0


def buscar_elector_padron_completo(cursor, cedula_buscada):
    try:
        row = cursor.execute("""
            SELECT cedula, apellido, nombre, mesa, orden,
                   departamento_nombre, distrito_nombre, zona_nombre, local_nombre,
                   vinculo, sec_loc
            FROM padron2026_completo
            WHERE cedula=? LIMIT 1
        """, (cedula_buscada,)).fetchone()
        if not row:
            return None
        return {
            "cedula": row[0], "apellido": str(row[1] or ''), "nombre": str(row[2] or ''),
            "mesa": int(row[3] or 0), "orden": int(row[4] or 0),
            "departamento": str(row[5] or ''),
            "distrito": str(row[6] or ''),
            "zona": str(row[7] or ''),
            "local": str(row[8] or ''),
            "vinculo": str(row[9] or ''),
            "sec_loc": int(row[10] or 0),
            "nombreCompleto": f"{row[2] or ''} {row[1] or ''}".strip()
        }
    except Exception:
        return None

def normalizar_cedula(v):
    return re.sub(r'[.\s,\-]', '', str(v or '')).strip()

def normalizar_texto(v):
    return str(v or '').strip()

def row_to_dict(row, cols):
    return {cols[i]: row[i] for i in range(len(cols))}

# ─── SEGURIDAD: HASH DE CONTRASEÑAS ─────────────────────
import secrets

def hash_password(password):
    """Hashea una contraseña con pbkdf2_hmac_sha256 + salt aleatorio"""
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"$pbkdf2-sha256${salt}${h}"

def default_password(cedula):
    """FIX: Genera contraseña aleatoria segura en lugar de patrón predecible '{cedula}*'.
    El usuario deberá cambiarla en su próximo login (requiere_cambio_clave=1)."""
    return secrets.token_urlsafe(12)

# ─── NOTIFICACIONES: EMAIL + SMS/WHATSAPP ───────────────
# Configuración por variables de entorno (ver .env.example). Si faltan, las
# funciones no rompen la app: solo loguean que no se pudo enviar.
import smtplib
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587") or 587)
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)

def _detectar_base_url_default():
    """Si no se configuro BASE_URL (deploy real con dominio propio), 'localhost' en el link
    que le mandamos al votante por WhatsApp no le sirve a nadie salvo a esta misma maquina.
    Mientras no haya un dominio publico, usar la IP de LAN de esta PC es mejor default: al
    menos funciona para celulares conectados al mismo WiFi (coordinacion de campaña local)."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127."):
            return f"http://{ip}:8000"
    except Exception:
        pass
    return "http://localhost:8000"

BASE_URL = os.environ.get("BASE_URL", "").rstrip("/") or _detectar_base_url_default()

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_SMS = os.environ.get("TWILIO_FROM_SMS", "")
TWILIO_FROM_WHATSAPP = os.environ.get("TWILIO_FROM_WHATSAPP", "")  # ej: "whatsapp:+14155238886"

def enviar_email(destinatario, asunto, cuerpo_texto, cuerpo_html=None):
    """Envía un email por SMTP. No lanza excepción: retorna True/False.
    Si se pasa cuerpo_html, manda un email multipart (texto plano + HTML)."""
    if not destinatario or not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print(f"[EMAIL] No configurado (SMTP_HOST/SMTP_USER/SMTP_PASSWORD faltantes). Destinatario: {destinatario}, asunto: {asunto}")
        return False
    try:
        if cuerpo_html:
            msg = MIMEMultipart("alternative")
            msg.attach(MIMEText(cuerpo_texto, "plain", "utf-8"))
            msg.attach(MIMEText(cuerpo_html, "html", "utf-8"))
        else:
            msg = MIMEText(cuerpo_texto, "plain", "utf-8")
        msg["Subject"] = asunto
        msg["From"] = SMTP_FROM
        msg["To"] = destinatario
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [destinatario], msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL] Error enviando a {destinatario}: {e}")
        return False

def enviar_email_cuenta_nueva(destinatario, nombre, cedula, password, pagina="dirigente.html"):
    """Avisa por mail a alguien recien dado de alta (ej. un sub-dirigente cargado por su
    dirigente) que ya tiene cuenta, con su cedula/contraseña y un enlace de ingreso directo.
    Reutiliza el mismo estilo que el mail de recuperación de contraseña."""
    primer_nombre = (nombre or '').split(' ')[0].title()
    enlace = f"{BASE_URL}/{pagina}?rc={urllib.parse.quote(cedula)}&rp={urllib.parse.quote(password)}"
    cuerpo = (f"Hola {nombre or ''},\n\n"
              f"Te dieron de alta en DIA D MASTER.\n\n"
              f"Usuario (cédula): {cedula}\nContraseña temporal: {password}\n\n"
              f"Ingresá directo acá: {enlace}\n\n"
              f"Por seguridad, te recomendamos cambiarla luego de tu próximo ingreso.\n")
    cuerpo_html = f"""
<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0f;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
    <div style="background:linear-gradient(180deg,#09090b 0%,#1a1d23 100%);padding:28px 28px 24px;text-align:center;">
      <div style="width:56px;height:56px;margin:0 auto 12px;border-radius:16px;background:linear-gradient(135deg,#dfc07b 0%,#c5a059 50%,#997a3a 100%);display:flex;align-items:center;justify-content:center;font-size:26px;">👤</div>
      <p style="margin:0;color:#ffffff;font-weight:900;font-size:18px;letter-spacing:-0.5px;text-transform:uppercase;">DIA D <span style="color:#dfc07b;">MASTER</span></p>
      <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Sistema Electoral Unificado</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px;color:#1a1d23;font-size:15px;">Hola <strong>{primer_nombre or nombre or ''}</strong>,</p>
      <p style="margin:0 0 20px;color:#4b5058;font-size:14px;line-height:1.5;">Te dieron de alta como dirigente en la plataforma. Usá el botón de abajo para entrar directo, ya con tu cuenta lista.</p>
      <div style="background:#f4f5f0;border:1px solid #e3eaf0;border-radius:16px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#8b9099;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Usuario (cédula)</p>
        <p style="margin:0 0 14px;color:#1a1d23;font-size:16px;font-weight:800;">{cedula}</p>
        <p style="margin:0 0 6px;color:#8b9099;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Contraseña temporal</p>
        <p style="margin:0;color:#1a1d23;font-size:16px;font-weight:800;letter-spacing:1px;">{password}</p>
      </div>
      <a href="{enlace}" style="display:block;text-align:center;background:linear-gradient(135deg,#dfc07b 0%,#c5a059 50%,#997a3a 100%);color:#09090b;text-decoration:none;font-weight:900;font-size:15px;padding:16px;border-radius:14px;text-transform:uppercase;letter-spacing:0.5px;">Ingresar ahora →</a>
      <p style="margin:20px 0 0;color:#8b9099;font-size:12px;line-height:1.5;">Por seguridad, te recomendamos cambiar esta contraseña luego de tu próximo ingreso.</p>
    </div>
  </div>
</div>"""
    return enviar_email(destinatario, "Te dieron de alta — DIA D MASTER", cuerpo, cuerpo_html)

def _twilio_enviar(de, para, mensaje):
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not de or not para:
        return False
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        data = urllib.parse.urlencode({"From": de, "To": para, "Body": mensaje}).encode()
        req = urllib.request.Request(url, data=data)
        credenciales = f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
        import base64
        req.add_header("Authorization", "Basic " + base64.b64encode(credenciales).decode())
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print(f"[TWILIO] Error enviando a {para}: {e}")
        return False

def enviar_sms(telefono, mensaje):
    """Envía un SMS vía Twilio. No lanza excepción: retorna True/False."""
    if not telefono or not TWILIO_FROM_SMS:
        print(f"[SMS] No configurado (TWILIO_FROM_SMS faltante) o teléfono vacío. Teléfono: {telefono}")
        return False
    return _twilio_enviar(TWILIO_FROM_SMS, telefono, mensaje)

def enviar_whatsapp(telefono, mensaje):
    """Envía un WhatsApp vía Twilio. No lanza excepción: retorna True/False."""
    if not telefono or not TWILIO_FROM_WHATSAPP:
        print(f"[WHATSAPP] No configurado (TWILIO_FROM_WHATSAPP faltante) o teléfono vacío. Teléfono: {telefono}")
        return False
    para = telefono if telefono.startswith("whatsapp:") else f"whatsapp:{telefono}"
    return _twilio_enviar(TWILIO_FROM_WHATSAPP, para, mensaje)

def obtener_ruta_calles(lat1, lng1, lat2, lng2):
    """Trazado real por calles entre dos puntos (servidor publico de OSRM, sin API key).
    Devuelve {geometria: [[lat,lng],...], distancia_km, duracion_min} o None si no se
    pudo calcular (sin internet, servicio caido, etc.) — en ese caso el que llama puede
    caer a una linea recta entre los dos puntos."""
    try:
        url = (f"https://router.project-osrm.org/route/v1/driving/"
               f"{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson")
        req = urllib.request.Request(url, headers={"User-Agent": "DiaDMaster/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
        if data.get("code") != "Ok" or not data.get("routes"):
            return None
        ruta = data["routes"][0]
        coords = ruta["geometry"]["coordinates"]  # [[lng,lat],...]
        geometria = [[c[1], c[0]] for c in coords]
        return {
            "geometria": geometria,
            "distancia_km": round(ruta["distance"] / 1000, 2),
            "duracion_min": round(ruta["duration"] / 60, 1),
        }
    except Exception as e:
        print(f"[OSRM] Error calculando ruta: {e}")
        return None

def enviar_bienvenida_cliente(cedula, nombre, email, telefono, password_plano):
    """
    Envía el acceso de un cliente/PC nuevo por email, y un mensaje de
    bienvenida por WhatsApp (si está configurado) o SMS (si no).
    Best-effort: nunca rompe el flujo de creación del cliente.
    """
    cuerpo = (
        f"Hola {nombre},\n\n"
        f"Ya tenés acceso a tu proyecto en el sistema.\n\n"
        f"Usuario (cédula): {cedula}\n"
        f"Contraseña: {password_plano}\n\n"
        f"Por seguridad, te recomendamos cambiarla luego de tu primer ingreso.\n"
    )
    try:
        if email:
            enviar_email(email, "Acceso a tu proyecto", cuerpo)
        mensaje_corto = f"¡Bienvenido/a {nombre}! Tu acceso: usuario {cedula}, contraseña {password_plano}."
        if telefono:
            if not enviar_whatsapp(telefono, mensaje_corto):
                enviar_sms(telefono, mensaje_corto)
    except Exception as e:
        print(f"[BIENVENIDA] Error enviando notificaciones a {cedula}: {e}")

def registrar_consulta_publica(cursor, conn, elector, candidato_cedula='', canal='consulta_mesa'):
    """
    Registra una consulta/envío a un votante para estadísticas (por departamento,
    distrito, seccional y, si corresponde, por candidato cuando la consulta llegó
    a través de su dominio propio). Best-effort: nunca debe romper la consulta en sí.
    """
    try:
        cursor.execute("""INSERT INTO consultas_publicas
            (cedula_consultada, departamento, distrito, zona, sec_loc, vinculo, candidato_cedula, canal)
            VALUES (?,?,?,?,?,?,?,?)""",
            (elector.get("cedula", ""), elector.get("departamento", ""), elector.get("distrito", ""),
             elector.get("zona", ""), elector.get("sec_loc", 0), elector.get("vinculo", ""),
             candidato_cedula, canal))
        conn.commit()
    except Exception as e:
        print(f"[CONSULTA_PUBLICA] Error registrando: {e}")

def resolver_candidato_por_dominio(cursor, dominio):
    """Devuelve la cédula del cliente dueño del dominio dado, solo si tiene el branding activo."""
    dom = re.sub(r'^https?://', '', normalizar_texto(dominio or '').lower()).strip('/').split('/')[0]
    dom = re.sub(r'^www\.', '', dom)
    if not dom:
        return ''
    row = cursor.execute("SELECT cedula FROM clientes WHERE dominio=? AND activo=1 AND branding_activo=1", (dom,)).fetchone()
    return row[0] if row else ''

def check_password(password, stored_hash):
    """Verifica contraseña contra hash. Compatible con legacy (plain text)."""
    if not stored_hash:
        return False
    # Si empieza con $, es hash moderno
    if stored_hash.startswith('$'):
        parts = stored_hash.split('$')
        if len(parts) == 4 and parts[1] == 'pbkdf2-sha256':
            salt = parts[2]
            h = parts[3]
            return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() == h
        return False
    # Sin formato de hash reconocido: fallar cerrado (nunca comparar en texto plano)
    return False

def generar_session_id():
    """Genera un ID de sesión único"""
    return secrets.token_urlsafe(32)

# ─── AUDITORÍA ──────────────────────────────────────────
MAX_INTENTOS_FALLIDOS = 5
VENTANA_BLOQUEO_MINUTOS = 15

def log_auditoria(cedula, nombre, accion, detalle='', entidad='', entidad_id='',
                  ip='', user_agent='', severidad='info', session_id=''):
    """Registra un evento en la tabla de auditoría"""
    try:
        conn = get_connection()
        conn.execute("""INSERT INTO auditoria
            (cedula, nombre, accion, detalle, entidad, entidad_id, ip, user_agent, severidad, session_id)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (cedula, nombre, accion, detalle, entidad, entidad_id, ip, user_agent, severidad, session_id))
        conn.commit()
        conn.close()
    except:
        pass  # No romper la aplicación si falla la auditoría

def verificar_bloqueo(cedula, conn):
    """Verifica si una cuenta está bloqueada por demasiados intentos fallidos"""
    if not cedula:
        return False, 0
    c = conn.cursor()
    row = c.execute("""
        SELECT COUNT(*) FROM intentos_login
        WHERE cedula=? AND exitoso=0
        AND timestamp >= datetime('now','localtime', '-' || ? || ' minutes')
    """, (cedula, VENTANA_BLOQUEO_MINUTOS)).fetchone()
    fallos = row[0] if row else 0
    if fallos >= MAX_INTENTOS_FALLIDOS:
        return True, fallos
    return False, fallos

def registrar_intento_login(cedula, exitoso, ip='', user_agent='', conn=None):
    """Registra un intento de login"""
    cerrar = False
    if conn is None:
        conn = get_connection()
        cerrar = True
    try:
        conn.execute(
            "INSERT INTO intentos_login (cedula, exitoso, ip, user_agent) VALUES (?,?,?,?)",
            (cedula, 1 if exitoso else 0, ip, user_agent)
        )
        conn.commit()
    except:
        pass
    finally:
        if cerrar:
            conn.close()

def tiene_permiso(rol, permiso_codigo, conn=None):
    """Verifica si un rol tiene un permiso específico"""
    cerrar = False
    if conn is None:
        conn = get_connection()
        cerrar = True
    try:
        row = conn.execute(
            "SELECT id FROM permisos_rol WHERE rol=? AND permiso_codigo=?",
            (rol, permiso_codigo)
        ).fetchone()
        return row is not None
    finally:
        if cerrar:
            conn.close()

def obtener_permisos_rol(rol, conn=None):
    """Retorna lista de códigos de permiso para un rol"""
    cerrar = False
    if conn is None:
        conn = get_connection()
        cerrar = True
    try:
        rows = conn.execute(
            "SELECT permiso_codigo FROM permisos_rol WHERE rol=?",
            (rol,)
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        if cerrar:
            conn.close()

def auditar_accion(data, accion, detalle='', entidad='', entidad_id='', severidad='info'):
    """Helper para acciones POST autenticadas que registra en auditoría"""
    ced = normalizar_cedula(data.get("cedula_auth", ""))
    nom = normalizar_texto(data.get("nombre_auth", ""))
    ip = normalizar_texto(data.get("ip_auth", ""))
    ua = normalizar_texto(data.get("ua_auth", ""))
    sid = normalizar_texto(data.get("session_id", ""))
    log_auditoria(ced, nom, accion, detalle, entidad, entidad_id, ip, ua, severidad, sid)

# ─── JERARQUÍA DE NIVELES ─────────────────────────────
NIVEL_HIERARCHY = ['dirigente', 'seccional', 'distrital', 'departamental', 'nacional', 'master']
NIVEL_CLIENTE = ['general', 'departamental', 'municipal', 'pc']

def _nivel_index(nivel):
    """Retorna el índice jerárquico del nivel. -1 si es desconocido."""
    if nivel in NIVEL_HIERARCHY:
        return NIVEL_HIERARCHY.index(nivel)
    if nivel in NIVEL_CLIENTE:
        return NIVEL_CLIENTE.index(nivel)
    return -1

def _check_nivel(user, min_nivel):
    """
    Middleware de autorización.
    Verifica que 'user' (dict con clave 'nivel') tenga un nivel >= min_nivel.
    Si no, levanta HTTPException 403.
    min_nivel puede ser un string ('seccional') o un índice entero.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no autenticado")
    nivel_user = user.get('nivel', '')
    idx_user = _nivel_index(nivel_user)
    if idx_user < 0:
        raise HTTPException(status_code=403, detail=f"Nivel '{nivel_user}' no reconocido")
    if isinstance(min_nivel, str):
        idx_min = _nivel_index(min_nivel)
    else:
        idx_min = min_nivel
    if idx_min < 0:
        raise HTTPException(status_code=500, detail=f"min_nivel '{min_nivel}' no válido")
    if idx_user < idx_min:
        raise HTTPException(
            status_code=403,
            detail=f"Acceso denegado: se requiere nivel '{NIVEL_HIERARCHY[idx_min] if idx_min < len(NIVEL_HIERARCHY) else NIVEL_CLIENTE[idx_min - len(NIVEL_HIERARCHY)]}' (tienes '{nivel_user}')"
        )

@app.on_event("startup")
def startup():
    init_db()
    # Inicializar tablas de herramientas extendidas (rate limit, auditoría, etc.)
    try:
        HERR.init_herramientas()
    except Exception as _e:
        print(f"[HERR] No se pudieron inicializar tablas: {_e}")
    # Migrar eleccion_id en votos (soporte de elecciones simultáneas)
    try:
        _c = get_connection()
        print(f"[ELEC] Migración votos: {elecciones_ctx.migrar_eleccion_en_votos(_c)}")
        _c.close()
    except Exception as _e:
        print(f"[ELEC] No se pudo migrar eleccion_id: {_e}")
    # Inicializar tablas de organización (escuelas, vínculos partido/PC)
    try:
        print(f"[ORG] Organización: {ORG.init_organizacion()}")
    except Exception as _e:
        print(f"[ORG] No se pudo inicializar organización: {_e}")
    # Migrate: add cedula_conductor if missing
    try:
        conn_m = get_connection()
        cols = [r[1] for r in conn_m.execute("PRAGMA table_info(rutas)").fetchall()]
        if 'cedula_conductor' not in cols:
            conn_m.execute("ALTER TABLE rutas ADD COLUMN cedula_conductor TEXT DEFAULT ''")
            conn_m.commit()
        cols2 = [r[1] for r in conn_m.execute("PRAGMA table_info(transportes)").fetchall()]
        if 'contrasena' not in cols2:
            conn_m.execute("ALTER TABLE transportes ADD COLUMN contrasena TEXT DEFAULT ''")
            conn_m.commit()
        # Migrate: add telefono (contacto WhatsApp del votante) if missing
        cols3 = [r[1] for r in conn_m.execute("PRAGMA table_info(posible_votos)").fetchall()]
        if 'telefono' not in cols3:
            conn_m.execute("ALTER TABLE posible_votos ADD COLUMN telefono TEXT DEFAULT ''")
            conn_m.commit()
        # Ensure solicitudes_recogida exists (created in init_db via CREATE TABLE IF NOT EXISTS)
        conn_m.close()
    except:
        pass

@app.get("/api/health")
def health_check():
    """Health check endpoint para monitoreo y load balancers"""
    # FIX: No exponer estadisticas del sistema sin autenticacion
    # Antes: devolvia conteos de usuarios, partidos, candidatos, distritos
    # Ahora: solo devuelve estado basico
    try:
        conn = get_connection()
        # Verificar DB accesible (sin exponer conteos)
        conn.execute("SELECT 1")
        conn.close()
        return {"status": "ok"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "detail": str(e)}
        )

# ─── CONTACTO (static/index.html — landing pública) ─────────────
# El destinatario queda fijo en el servidor: la página pública nunca expone el
# email ni el teléfono de contacto en su HTML/JS.
CONTACTO_EMAIL_DESTINO = os.environ.get("CONTACTO_EMAIL_DESTINO", "wmlumen@gmail.com")

@app.post("/api/contacto")
def enviar_contacto(data: dict = Body(...), request: Request = None):
    # FIX: Rate limiting para prevenir abuso del formulario de contacto
    # Antes: cualquier IP podia enviar infinitos mensajes
    # Ahora: maximo 10 requests por minuto por IP
    try:
        ip = request.client.host if request else ""
        if not ip and request:
            ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if ip:
            _check_rate_limit(ip, max_requests=5, window_seconds=60)
    except HTTPException:
        raise
    except Exception:
        pass  # No bloquear si hay error obteniendo la IP
    
    nombre = normalizar_texto(data.get("nombre", ""))
    email_remitente = normalizar_texto(data.get("email", ""))
    mensaje = normalizar_texto(data.get("mensaje", ""))
    if not nombre or not email_remitente or not mensaje:
        return {"success": False, "error": "Completá nombre, email y mensaje"}
    if "@" not in email_remitente or "." not in email_remitente.split("@")[-1]:
        return {"success": False, "error": "Email inválido"}
    cuerpo = (
        f"Nuevo contacto desde la página del Sistema Electoral\n\n"
        f"Nombre: {nombre}\n"
        f"Email: {email_remitente}\n\n"
        f"Mensaje:\n{mensaje}\n"
    )
    enviado = enviar_email(CONTACTO_EMAIL_DESTINO, f"Contacto web: {nombre}", cuerpo)
    if not enviado:
        # SMTP no configurado todavía: igual confirmamos recepción y lo dejamos en el log/auditoría.
        log_auditoria('', nombre, 'contacto_web_sin_smtp',
                      f'{nombre} <{email_remitente}>: {mensaje}', severidad='info')
    return {"success": True}

# ─── PWA DE VEEDORES (static/App.html) ──────────────────
# Rutas dedicadas que consume App.html directamente (no pasan por /api?action=...).
@app.get("/health")
def health_simple():
    """Chequeo liviano de conectividad para la PWA offline-first de veedores."""
    return {"status": "ok"}

@app.post("/veedores/consultar-donde-vota")
def veedores_consultar_donde_vota(data: dict = Body(...), request: Request = None):
    # FIX: Rate limiting para prevenir abuso de consulta de datos de votantes
    # Antes: cualquier IP podia consultar infinitas cedulas
    # Ahora: maximo 20 requests por minuto por IP
    try:
        ip = request.client.host if request else ""
        if not ip and request:
            ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if ip:
            _check_rate_limit(ip, max_requests=20, window_seconds=60)
    except HTTPException:
        raise
    except Exception:
        pass
    
    ced = normalizar_cedula(data.get("cedula", ""))
    if not ced:
        return {"encontrado": False, "cedula": data.get("cedula", ""), "error": "Cédula requerida"}
    conn = get_connection()
    try:
        elector = buscar_elector_padron_completo(conn.cursor(), ced)
    finally:
        conn.close()
    if not elector:
        return {"encontrado": False, "cedula": ced, "error": "Cédula no encontrada en el padrón"}
    return {
        "encontrado": True,
        "cedula": elector["cedula"],
        "nombre_completo": elector["nombreCompleto"],
        "nombre": elector["nombreCompleto"],
        "mesa": elector["mesa"],
        "orden": elector["orden"],
        "departamento": elector["departamento"],
        "distrito": elector["distrito"],
        "local": elector["local"],
        "escuela": elector["local"],
        "seccional": elector["sec_loc"] or None,
    }

@app.get("/veedores/mesa/{mesa_id}/estado")
def veedores_mesa_estado_get(mesa_id: str):
    # FIX: No exponer transfer_log completo sin autenticacion
    # Antes: devolvia transfer_log completo con datos sensibles de transferencias
    # Ahora: solo devuelve conteo de transferencias, no el detalle
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT votos, transfer_log, veedor FROM veedor_mesa_estado WHERE mesa_id=?", (mesa_id,)
        ).fetchone()
    finally:
        conn.close()
    if not row:
        return {"votos": {}, "transferLog": [], "veedor": ""}
    # Parsear transfer_log para contar pero no exponer detalle
    transfer_log = json.loads(row[1] or '[]')
    transfer_count = len(transfer_log) if isinstance(transfer_log, list) else 0
    return {
        "votos": json.loads(row[0] or '{}'),
        "transferLog": [],  # FIX: No exponer detalle de transferencias
        "transferCount": transfer_count,  # Solo conteo
        "veedor": row[2] or ''
    }

@app.post("/veedores/mesa/{mesa_id}/estado")
def veedores_mesa_estado_post(mesa_id: str, data: dict = Body(...)):
    # FIX: Requerir token para modificar resultados electorales
    # Antes: cualquier persona podia modificar resultados sin autenticacion
    # Ahora: requiere token de veedor valido
    token = data.get("token", "")
    _verify_veedor_token(token)
    
    conn = get_connection()
    try:
        conn.execute("""
            INSERT INTO veedor_mesa_estado (mesa_id, votos, transfer_log, veedor, updated_at)
            VALUES (?,?,?,?, datetime('now','localtime'))
            ON CONFLICT(mesa_id) DO UPDATE SET
                votos=excluded.votos, transfer_log=excluded.transfer_log,
                veedor=excluded.veedor, updated_at=excluded.updated_at
        """, (mesa_id, json.dumps(data.get("votos", {})), json.dumps(data.get("transferLog", [])), data.get("veedor", "")))
        conn.commit()
    finally:
        conn.close()
    return {"success": True}

def enviar_push(cedula, title, body, url=None):
    """Envía push notification a un conductor si está suscrito"""
    try:
        conn = get_connection()
        row = conn.execute("SELECT subscription_json FROM push_subscriptions WHERE cedula=?", (cedula,)).fetchone()
        conn.close()
        if not row:
            return False
        sub = json.loads(row[0])
        payload = json.dumps({"title": title, "body": body, "url": url or "/conductor.html"})

        try:
            from pywebpush import webpush
            webpush(subscription_info=sub, data=payload, vapid_private_key=VAPID_PRIVATE_KEY, vapid_claims=VAPID_CLAIMS)
        except ImportError:
            print(f"[Push模拟] → {cedula}: {title} - {body}")
        except Exception as e:
            print(f"[Push Error] {cedula}: {e}")
        return True
    except:
        return False

# ─── API: GET handlers ────────────────────────────────────
@app.get("/api")
def api_get(request: Request, action: str = Query("status"), mesa: int = Query(None), dirigente: str = Query(None),
            cedula: str = Query(None), id: str = Query(None),
            nombre: str = Query(None), horarioInicio: str = Query(None), horarioCierre: str = Query(None),
            estado: str = Query(None), mesa_param: str = Query(None), orden: str = Query(None),
            telefono: str = Query(None), observacion: str = Query(None), dominio: str = Query(None),
            distrito_filtro: str = Query(None), sec_loc_filtro: str = Query(None), local_filtro: str = Query(None),
            local_nombre_filtro: str = Query(None),
            orden_vista: str = Query(None), eleccion_id_filtro: str = Query(None),
            candidato_id: str = Query(None),
            x_api_key: str = Header(None),
            x_password: str = Header(None)):
    """Verificar API key para endpoints sensibles"""
    # FIX: Password ya no se recibe como query parameter (se filtraba en logs)
    # Antes: password: str = Query(None) - inseguro, se expone en URL y logs
    # Ahora: x_password: str = Header(None) - via header, no se loguea
    # Verificar key para acciones de dirigente
    if action in ("dirigentes", "buscar_dirigente", "asignacion_dirigentes"):
        if not x_api_key or x_api_key != DIRE_API_KEY:
            raise HTTPException(status_code=403, detail="API key inválida para acciones de dirigente")
    
    conn = get_connection()
    c = conn.cursor()
    try:
        if action == "whatsapp_plantilla_votacion":
            # Cadena de herencia (más específico gana): dirigente -> candidato -> partido ->
            # general -> default embebido. Cada nivel se devuelve también por separado para que
            # el front le muestre a cada rol si tiene su propia personalización o está heredando.
            pid = int(id or 0)
            cand_id = int(candidato_id or 0)
            dir_ced = normalizar_cedula(dirigente or "")
            general = c.execute("SELECT cuerpo FROM plantillas_whatsapp_votacion WHERE alcance='general'").fetchone()
            partido = c.execute("SELECT cuerpo FROM plantillas_whatsapp_votacion WHERE alcance='partido' AND partido_id=?", (pid,)).fetchone() if pid else None
            candidato = c.execute("SELECT cuerpo FROM plantillas_whatsapp_votacion WHERE alcance='candidato' AND candidato_id=?", (cand_id,)).fetchone() if cand_id else None
            dirig = c.execute("SELECT cuerpo FROM plantillas_whatsapp_votacion WHERE alcance='dirigente' AND dirigente_cedula=?", (dir_ced,)).fetchone() if dir_ced else None
            activa = (
                (dirig[0] if dirig and dirig[0] else None)
                or (candidato[0] if candidato and candidato[0] else None)
                or (partido[0] if partido and partido[0] else None)
                or (general[0] if general and general[0] else None)
                or PLANTILLA_WHATSAPP_VOTACION_DEFAULT
            )
            return {"success": True,
                    "plantilla_general": general[0] if general else PLANTILLA_WHATSAPP_VOTACION_DEFAULT,
                    "plantilla_partido": partido[0] if partido else "",
                    "plantilla_candidato": candidato[0] if candidato else "",
                    "plantilla_dirigente": dirig[0] if dirig else "",
                    "plantilla_activa": activa}
        if action == "status":
            return {"status": "ok", "service": "DIA Mesas DB API", "timestamp": datetime.now().isoformat()}

        if action == "test":
            tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
            return {"success": True, "message": "API funcionando correctamente", "timestamp": datetime.now().isoformat(), "tables": tables}

        if action == "marca_por_dominio":
            # Endpoint público (sin login): permite que la página pública "Dónde Votás"
            # se muestre con la marca de un candidato cuando se accede desde su dominio propio.
            dom = re.sub(r'^https?://', '', normalizar_texto(dominio or '').lower()).strip('/').split('/')[0]
            dom = re.sub(r'^www\.', '', dom)
            if not dom:
                return {"success": False, "error": "Dominio no especificado"}
            row = c.execute("""SELECT cedula, nombre, candidato_nombre, candidato_cargo, css_tema,
                                       mensaje_publicitario, logo_url, color_propio_hex, partido_id
                                FROM clientes WHERE dominio=? AND activo=1 AND branding_activo=1""", (dom,)).fetchone()
            if not row:
                # Dominio no vinculado, o el cliente todavía no contrató el servicio de
                # publicidad/colores: la página pública se muestra genérica, sin marca.
                return {"success": False, "error": "Sin marca para este dominio"}
            # Resuelve el mismo color que usaría su tema (/tema-cliente.css), para que
            # la página pública combine con la identidad visual que ya definió.
            modo = (row[4] or '').lower()
            color_hex = ''
            if modo == 'propio' and row[7]:
                color_hex = row[7]
            elif modo == 'partido' and row[8]:
                p = c.execute("SELECT color_principal_hex FROM partidos WHERE id=?", (row[8],)).fetchone()
                color_hex = (p[0] if p else '') or ''
            return {"success": True, "marca": {
                "candidato_nombre": row[2] or row[1], "candidato_cargo": row[3] or '',
                "css_tema": modo or 'neutral', "color_hex": color_hex,
                "mensaje_publicitario": row[5] or '', "logo_url": row[6] or ''
            }}

        if action == "estadisticas_candidato":
            # Para el panel del propio candidato/cliente: cuánta gente consultó
            # "Dónde Votás" a través de SU dominio (es decir, vio su nombre/publicidad).
            ced_cand = normalizar_cedula(cedula or '')
            if not ced_cand:
                return {"success": False, "error": "Cédula requerida"}
            total = c.execute("SELECT COUNT(*) FROM consultas_publicas WHERE candidato_cedula=?", (ced_cand,)).fetchone()[0]
            por_depto = c.execute("""SELECT departamento, COUNT(*) FROM consultas_publicas
                                      WHERE candidato_cedula=? GROUP BY departamento ORDER BY COUNT(*) DESC""", (ced_cand,)).fetchall()
            por_distrito = c.execute("""SELECT distrito, COUNT(*) FROM consultas_publicas
                                         WHERE candidato_cedula=? GROUP BY distrito ORDER BY COUNT(*) DESC LIMIT 20""", (ced_cand,)).fetchall()
            por_dia = c.execute("""SELECT date(timestamp), COUNT(*) FROM consultas_publicas
                                    WHERE candidato_cedula=? GROUP BY date(timestamp) ORDER BY date(timestamp) DESC LIMIT 30""", (ced_cand,)).fetchall()
            return {"success": True, "total": total,
                    "por_departamento": [{"departamento": r[0] or 'Sin dato', "total": r[1]} for r in por_depto],
                    "por_distrito": [{"distrito": r[0] or 'Sin dato', "total": r[1]} for r in por_distrito],
                    "por_dia": [{"fecha": r[0], "total": r[1]} for r in por_dia]}

        if action == "estadisticas_consultas_admin":
            # Panorama global para roles de administración: desglose por departamento,
            # distrito, seccional y vínculo (ANR u otro), además del ranking de candidatos.
            por_depto = c.execute("""SELECT departamento, COUNT(*) FROM consultas_publicas
                                      GROUP BY departamento ORDER BY COUNT(*) DESC""").fetchall()
            por_distrito = c.execute("""SELECT distrito, COUNT(*) FROM consultas_publicas
                                         GROUP BY distrito ORDER BY COUNT(*) DESC LIMIT 30""").fetchall()
            por_seccional = c.execute("""SELECT sec_loc, COUNT(*) FROM consultas_publicas
                                          WHERE sec_loc != 0 GROUP BY sec_loc ORDER BY COUNT(*) DESC LIMIT 30""").fetchall()
            por_vinculo = c.execute("""SELECT vinculo, COUNT(*) FROM consultas_publicas
                                        GROUP BY vinculo ORDER BY COUNT(*) DESC""").fetchall()
            ranking_candidatos = c.execute("""
                SELECT cp.candidato_cedula, cl.nombre, cl.candidato_nombre, COUNT(*) as total
                FROM consultas_publicas cp
                JOIN clientes cl ON cp.candidato_cedula = cl.cedula
                WHERE cp.candidato_cedula != ''
                GROUP BY cp.candidato_cedula ORDER BY total DESC LIMIT 30
            """).fetchall()
            total_general = c.execute("SELECT COUNT(*) FROM consultas_publicas").fetchone()[0]
            return {"success": True, "total": total_general,
                    "por_departamento": [{"departamento": r[0] or 'Sin dato', "total": r[1]} for r in por_depto],
                    "por_distrito": [{"distrito": r[0] or 'Sin dato', "total": r[1]} for r in por_distrito],
                    "por_seccional": [{"sec_loc": r[0], "total": r[1]} for r in por_seccional],
                    "por_vinculo": [{"vinculo": r[0] or 'Sin dato', "total": r[1]} for r in por_vinculo],
                    "ranking_candidatos": [{"cedula": r[0], "nombre": r[1], "candidato_nombre": r[2] or r[1], "total": r[3]} for r in ranking_candidatos]}

        if action == "votos":
            # FIX: Requerir sesion para ver registros de votos
            # Antes: cualquier persona podia ver todos los registros sin autenticacion
            # Ahora: requiere session_id valido
            sid = request.headers.get("x-session-id") or request.query_params.get("session_id") or ""
            if not sid:
                raise HTTPException(status_code=401, detail="Sesión requerida")
            _require_session_nivel(conn, sid, 'dirigente')
            
            rows = c.execute("SELECT timestamp, cedula, nombre, mesa, orden, estado, accion, dirigente, dirigenteNombre, origen FROM registros ORDER BY timestamp DESC").fetchall()
            cols = ["timestamp", "cedula", "nombre", "mesa", "orden", "estado", "accion", "dirigente", "dirigenteNombre", "origen"]
            registros = [row_to_dict(r, cols) for r in rows]
            return {"registros": registros, "total": len(registros)}

        if action == "no_votos":
            rows = c.execute("SELECT timestamp, cedula, mesa, orden, motivo, observacion FROM no_voto ORDER BY timestamp DESC").fetchall()
            cols = ["timestamp", "cedula", "mesa", "orden", "motivo", "observacion"]
            registros = [row_to_dict(r, cols) for r in rows]
            return {"registros": registros, "total": len(registros)}

        if action == "resumen":
            rows = c.execute("SELECT mesa, estado FROM registros").fetchall()
            stats = {}
            for r in rows:
                m = r[0] or 0
                if m not in stats:
                    stats[m] = {"votos": 0, "ausentes": 0, "controversias": 0, "total": 0}
                est = str(r[1] or '').lower()
                stats[m]["total"] += 1
                if est == "voto": stats[m]["votos"] += 1
                elif est == "ausente": stats[m]["ausentes"] += 1
                elif est == "controversia": stats[m]["controversias"] += 1
            mesas = []
            for k in sorted(stats.keys()):
                s = stats[k]
                pct = f"{((s['votos']/s['total'])*100):.1f}" if s['total'] > 0 else "0.0"
                mesas.append({"mesa": k, "votos": s["votos"], "ausentes": s["ausentes"], "controversias": s["controversias"], "total": s["total"], "participacion": pct + "%"})
            return {"mesas": mesas, "total": len(mesas)}

        if action == "mesa":
            rows = c.execute("SELECT timestamp, cedula, nombre, mesa, orden, estado, accion, dirigente, dirigenteNombre FROM registros WHERE mesa=? ORDER BY timestamp", (mesa or 0,)).fetchall()
            cols = ["timestamp", "cedula", "nombre", "mesa", "orden", "estado", "accion", "dirigente", "dirigenteNombre"]
            registros = [row_to_dict(r, cols) for r in rows]
            return {"mesa": mesa, "registros": registros}

        if action == "dirigentes":
            rows = c.execute("SELECT cedula, nombre, tipo FROM dirigentes").fetchall()
            dirigentes = [{"cedula": r[0], "nombre": r[1], "tipo": r[2]} for r in rows]
            return {"dirigentes": dirigentes, "total": len(dirigentes)}

        if action == "asignacion_dirigentes":
            rows = c.execute("SELECT cedula, dirigente_nombre FROM asignacion_dirigentes").fetchall()
            asignaciones = {r[0]: r[1] for r in rows}
            return {"asignaciones": asignaciones, "total": len(asignaciones)}

        if action == "miembros_mesa_v2":
            rows = c.execute("SELECT cedula, nombre, mesa, horario_inicio, horario_cierre, estado FROM miembros_mesa").fetchall()
            cols = ["cedula", "nombre", "mesa", "horarioInicio", "horarioCierre", "estado"]
            miembros = [row_to_dict(r, cols) for r in rows]
            return {"miembros": miembros, "total": len(miembros)}

        if action == "miembros_mesa":
            rows = c.execute("SELECT cedula, nombre, mesa, horario_inicio, horario_cierre, estado FROM miembros_mesa").fetchall()
            cols = ["cedula", "nombre", "mesa", "horarioInicio", "horarioCierre", "estado"]
            miembros = [row_to_dict(r, cols) for r in rows]
            return {"miembros": miembros, "total": len(miembros)}

        if action == "validar_miembro":
            # FIX: Rate limiting para prevenir fuerza bruta de credenciales
            # Antes: cualquier IP podia intentar infinitas combinaciones de credenciales
            # Ahora: maximo 5 intentos por minuto por IP
            try:
                ip = request.client.host if request else ""
                if not ip and request:
                    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                if ip:
                    _check_rate_limit(ip, max_requests=5, window_seconds=60)
            except HTTPException:
                raise
            except Exception:
                pass
            
            ced = normalizar_cedula(cedula or '')
            # FIX: Password viene via header x_password, no via query parameter
            pw = normalizar_texto(x_password or '')
            row = c.execute("SELECT cedula, nombre, contrasena, mesa, horario_inicio, horario_cierre, estado FROM miembros_mesa WHERE cedula=?", (ced,)).fetchone()
            if not row or not check_password(pw, row[2]):
                return {"success": False, "error": "Credenciales inválidas"}
            if row[6] != "ACTIVO":
                return {"success": False, "error": "Miembro no habilitado", "estado": row[6]}
            return {"success": True, "miembro": {"cedula": row[0], "nombre": row[1], "mesa": row[3], "horarioInicio": row[4], "horarioCierre": row[5], "estado": row[6]}}

        if action == "pendientes_qr":
            # FIX: Requerir sesion para ver pendientes QR
            # Antes: cualquier persona podia ver datos de votantes sin autenticacion
            # Ahora: requiere session_id valido
            sid = request.headers.get("x-session-id") or request.query_params.get("session_id") or ""
            if not sid:
                raise HTTPException(status_code=401, detail="Sesión requerida")
            _require_session_nivel(conn, sid, 'dirigente')
            
            rows = c.execute("SELECT id, timestamp, cedula, nombre, mesa, orden, telefono, observacion, estado, canal, resueltoAt, dirigente_cedula, codigo FROM pendientes_qr ORDER BY timestamp DESC").fetchall()
            cols = ["id", "timestamp", "cedula", "nombre", "mesa", "orden", "telefono", "observacion", "estado", "canal", "resueltoAt", "dirigente_cedula", "codigo"]
            registros = [row_to_dict(r, cols) for r in rows]
            return {"registros": registros, "total": len(registros)}

        if action == "buscar_dirigente":
            ced_busca = normalizar_cedula(cedula or '')
            if not ced_busca:
                return {"success": False, "error": "Cédula de dirigente requerida"}
            row = c.execute("""SELECT d.cedula, d.nombre, d.tipo, d.cliente_cedula,
                                      c.nombre as cliente_nombre, c.candidato_cargo
                               FROM dirigentes d
                               LEFT JOIN clientes c ON d.cliente_cedula = c.cedula
                               WHERE d.cedula=? AND d.activo=1""", (ced_busca,)).fetchone()
            if not row:
                return {"success": False, "error": "Dirigente no encontrado o inactivo"}
            equipo = str(row[5] or '') if row[5] else str(row[4] or 'Sin equipo')
            return {"success": True, "dirigente": {
                "cedula": row[0], "nombre": row[1], "tipo": row[2],
                "cliente_cedula": row[3] or '', "cliente_nombre": row[4] or '',
                "equipo": equipo
            }}

        if action == "verificar_codigo":
            cod = normalizar_texto(cedula or '')  # reuse cedula param for code
            if not cod:
                return {"success": False, "error": "Código requerido"}
            row = c.execute("""SELECT ci.codigo, ci.dirigente_cedula, ci.rol, ci.descripcion, ci.activo,
                                      d.nombre as dirigente_nombre, d.tipo as dirigente_tipo,
                                      c.nombre as cliente_nombre, c.candidato_cargo
                               FROM codigos_invitacion ci
                               JOIN dirigentes d ON ci.dirigente_cedula = d.cedula
                               LEFT JOIN clientes c ON d.cliente_cedula = c.cedula
                               WHERE ci.codigo=? AND ci.activo=1
                               AND (ci.max_usos=0 OR ci.usos < ci.max_usos)""", (cod,)).fetchone()
            if not row:
                return {"success": False, "error": "Código inválido o agotado"}
            equipo = str(row[8] or '') if row[8] else str(row[7] or 'Sin equipo')
            return {"success": True, "codigo": {
                "codigo": row[0], "dirigente_cedula": row[1], "rol": row[2],
                "descripcion": row[3], "dirigente_nombre": row[5],
                "dirigente_tipo": row[6], "equipo": equipo
            }}

        if action == "padron":
            # Search padrón by cedula (lightweight, no full download)
            ced_busca = normalizar_cedula(dirigente or '')  # reuse dirigente param as search
            if ced_busca:
                rows = c.execute("""
                    SELECT cedula, apellido, nombre, mesa, orden, depart, distrito, zona, local
                    FROM padron2026_completo
                    WHERE cedula=? AND vinculo='ANR2026'
                    LIMIT 1
                """, (ced_busca,)).fetchall()
            else:
                # Return empty unless searching
                return {"electores": [], "total": 0, "escuelas": [], "mensaje": "Use el parámetro cedula para buscar"}
            electores = []
            for r in rows:
                electores.append({
                    "cedula": r[0], "apellido": str(r[1] or ''), "nombre": str(r[2] or ''),
                    "mesa": int(r[3] or 0), "orden": int(r[4] or 0),
                    "nombreCompleto": f"{r[2] or ''} {r[1] or ''}".strip(),
                })
            return {"electores": electores, "total": len(electores), "escuelas": []}

        if action == "buscar_elector":
            # FIX: Requerir sesion para buscar electores
            # Antes: cualquier persona podia buscar datos completos sin autenticacion
            # Ahora: requiere session_id valido
            sid = request.headers.get("x-session-id") or request.query_params.get("session_id") or ""
            if not sid:
                raise HTTPException(status_code=401, detail="Sesión requerida")
            _require_session_nivel(conn, sid, 'dirigente')
            
            ced_busca = normalizar_cedula(cedula or '')
            if not ced_busca:
                return {"success": False, "error": "Cédula requerida"}
            elector = buscar_elector_padron_completo(c, ced_busca)
            if not elector:
                return {"success": False, "error": "Elector no encontrado en el padrón"}
            candidato_ced = resolver_candidato_por_dominio(c, dominio) if dominio else ''
            registrar_consulta_publica(c, conn, elector, candidato_cedula=candidato_ced, canal='consulta_mesa')
            return {"success": True, "elector": elector}

        if action == "seguimiento":
            # FIX: Requerir sesion para ver seguimiento por dirigente
            # Antes: cualquier persona podia ver datos por dirigente sin autenticacion
            # Ahora: requiere session_id valido
            sid = request.headers.get("x-session-id") or request.query_params.get("session_id") or ""
            if not sid:
                raise HTTPException(status_code=401, detail="Sesión requerida")
            _require_session_nivel(conn, sid, 'dirigente')
            
            dc = normalizar_cedula(dirigente or '')
            if not dc:
                return {"success": False, "error": "Dirigente requerido"}
            # Get all posible_votos for this dirigente, enriquecidos con el local
            # de votación (local_nombre del padrón TSJE) y el teléfono de contacto.
            rows = c.execute("""
                SELECT pv.id, pv.votante_cedula, pv.votante_nombre, pv.votante_apellido,
                       COALESCE(NULLIF(pv.votante_mesa,0), NULLIF(pad.mesa,0)) AS votante_mesa,
                       COALESCE(NULLIF(pv.votante_orden,0), NULLIF(pad.orden,0)) AS votante_orden,
                       pv.status,
                       COALESCE(NULLIF(pad.departamento_nombre,''),
                                NULLIF(NULLIF(pv.votante_departamento,''),'0'),
                                CASE WHEN COALESCE(pad.depart,0) > 0 THEN CAST(pad.depart AS TEXT) END) AS votante_departamento,
                       COALESCE(NULLIF(pad.distrito_nombre,''),
                                NULLIF(NULLIF(pv.votante_distrito,''),'0'),
                                CASE WHEN COALESCE(pad.distrito,0) > 0 THEN CAST(pad.distrito AS TEXT) END) AS votante_distrito,
                       COALESCE(NULLIF(pad.zona_nombre,''), NULLIF(NULLIF(pv.votante_zona,''),'0')) AS votante_zona,
                       pv.creado, pv.actualizado, pv.confirmado_en, pv.telefono,
                       pad.local_nombre
                FROM posible_votos pv
                LEFT JOIN padron2026_completo pad ON pad.cedula = pv.votante_cedula
                WHERE pv.dirigente_cedula = ?
                ORDER BY pv.creado DESC
            """, (dc,)).fetchall()

            cols = ["id","votante_cedula","votante_nombre","votante_apellido",
                    "votante_mesa","votante_orden","status",
                    "votante_departamento","votante_distrito","votante_zona",
                    "creado","actualizado","confirmado_en","telefono","local_nombre"]
            items = [row_to_dict(r, cols) for r in rows]

            # Cross-reference with actual vote data
            for it in items:
                ced = it["votante_cedula"]
                # Check voto
                v = c.execute("SELECT estado, timestamp, dirigente FROM registros WHERE cedula=? AND estado='voto' ORDER BY timestamp DESC LIMIT 1", (ced,)).fetchone()
                if v:
                    it["voto_real"] = "voto"
                    it["voto_timestamp"] = v[1] or ''
                    it["voto_dirigente"] = v[2] or ''
                else:
                    # Check no_voto
                    nv = c.execute("SELECT timestamp, motivo FROM no_voto WHERE cedula=? ORDER BY timestamp DESC LIMIT 1", (ced,)).fetchone()
                    if nv:
                        it["voto_real"] = "no_voto"
                        it["voto_timestamp"] = nv[0] or ''
                        it["voto_motivo"] = nv[1] or ''
                    else:
                        it["voto_real"] = "pendiente"
                        it["voto_timestamp"] = ''

            # Compute estado_final: voto_real overrides posible_voto status
            for it in items:
                if it["voto_real"] == "voto":
                    it["estado_final"] = "voto"
                elif it["voto_real"] == "no_voto":
                    it["estado_final"] = "no_voto"
                elif it["status"] in ("buscar", "vendra_solo"):
                    it["estado_final"] = "en_proceso"
                elif it["status"] == "no_responde":
                    it["estado_final"] = "no_responde"
                elif it["status"] == "confirmado":
                    it["estado_final"] = "pendiente"
                else:
                    it["estado_final"] = "pendiente"

            # Separate lists
            votaron = [it for it in items if it["estado_final"] == "voto"]
            noVotaron = [it for it in items if it["estado_final"] == "no_voto"]
            enProceso = [it for it in items if it["estado_final"] == "en_proceso"]
            pendientes = [it for it in items if it["estado_final"] == "pendiente"]
            noResponden = [it for it in items if it["estado_final"] == "no_responde"]

            return {
                "success": True,
                "total": len(items),
                "votaron": len(votaron),
                "noVotaron": len(noVotaron),
                "enProceso": len(enProceso),
                "pendientes": len(pendientes),
                "noResponden": len(noResponden),
                "items": items,
                "listas": {
                    "votaron": votaron,
                    "noVotaron": noVotaron,
                    "enProceso": enProceso,
                    "pendientes": pendientes,
                    "noResponden": noResponden
                }
            }

        if action == "candidatos":
            cargo = normalizar_texto(telefono or '')   # reuse telefono param as cargo filter (password ya no es query param)
            lista = normalizar_texto(dirigente or '')  # reuse dirigente param as lista filter
            cliente = normalizar_texto(observacion or '')  # reuse observacion param as cliente filter
            depto_filtro = mesa  # reuse mesa param as departamento_id filter (igual que accion "distritos")
            dist_filtro = distrito_filtro  # reuse distrito_filtro param as distrito_id filter
            where = ["c.activo=1"]
            params = []
            if cargo in ("intendente", "concejal", "representante"):
                where.append("c.cargo=?")
                params.append(cargo)
            if lista and lista.isdigit():
                where.append("c.lista_nro=?")
                params.append(int(lista))
            if cliente:
                where.append("c.cliente_cedula=?")
                params.append(cliente)
            if depto_filtro:
                where.append("c.departamento_id=?")
                params.append(int(depto_filtro))
            if dist_filtro:
                where.append("c.distrito_id=?")
                params.append(int(dist_filtro))
            if not cliente and not depto_filtro:
                # Sin filtro explicito: acotar al departamento del cliente de quien pregunta
                # (de lo contrario un dirigente ve los 300+ candidatos de TODO el pais mezclados,
                # que a simple vista parecen datos duplicados).
                sid = request.headers.get("x-session-id") or ""
                ced_sesion = _cliente_de_sesion(conn, sid) if sid else None
                if ced_sesion:
                    depto = c.execute("SELECT departamento_id FROM clientes WHERE cedula=?", (ced_sesion,)).fetchone()
                    if depto and depto[0]:
                        where.append("c.departamento_id=?")
                        params.append(depto[0])
                    else:
                        # FIX: clientes sin departamento (ej. categoria 'ce' - Centro de
                        # Estudiantes, que no se ubica por departamento/distrito TSJE) caían
                        # sin ningún filtro y veían los 300+ candidatos municipales de TODO el
                        # país. Acotar en cambio a los candidatos propios de ese cliente.
                        where.append("c.cliente_cedula=?")
                        params.append(ced_sesion)
            # Paquete comprado: si el cliente de la sesión tiene paquetes asignados,
            # solo ve candidatos de los cargos incluidos en esos paquetes.
            sid_paq = request.headers.get("x-session-id") or ""
            ced_sesion_paq = _cliente_de_sesion(conn, sid_paq) if sid_paq else None
            cargos_ok = _cargos_permitidos_cliente(c, ced_sesion_paq) if ced_sesion_paq else None
            if cargos_ok is not None:
                if not cargos_ok:
                    return {"candidatos": [], "total": 0}
                ph_cargo = ','.join('?' * len(cargos_ok))
                where.append(f"c.cargo IN ({ph_cargo})")
                params.extend(cargos_ok)
            # Orden de la vista: por lista (default), por partido (agrupa por lista_nro)
            # o por "más votados" (según los votos seguros/posibles cargados por los dirigentes).
            modo_orden = normalizar_texto(orden_vista or 'lista')
            orden_sql = "ORDER BY c.cargo, c.lista_nro, c.orden"
            if modo_orden == 'partido':
                orden_sql = "ORDER BY c.lista_nro, c.cargo, c.orden"
            elif modo_orden == 'mas_votados':
                orden_sql = "ORDER BY votos_posibles DESC, c.cargo, c.lista_nro"
            sql = f"""SELECT c.id, c.nombre, c.cargo, c.lista_nro, c.lista_nombre,
                             c.orden, c.departamento_id, c.distrito_id, c.cliente_cedula,
                             l.nombre as lista_nombre_full, l.color as lista_color,
                             (SELECT COUNT(*) FROM posible_voto_candidatos pvc
                              JOIN posible_votos pv ON pv.id = pvc.posible_voto_id
                              WHERE pvc.candidato_id = c.id AND pv.status='confirmado') as votos_posibles
                      FROM candidatos c
                      LEFT JOIN listas l ON c.lista_nro = l.nro
                      WHERE {' AND '.join(where)}
                      {orden_sql}"""
            rows = c.execute(sql, params).fetchall()
            candidatos = [{"id":r[0], "nombre":r[1], "cargo":r[2], "lista_nro":r[3],
                           "lista_nombre":r[4] or r[9] or '', "orden":r[5],
                           "departamento_id":r[6], "distrito_id":r[7],
                           "cliente_cedula":r[8] or '',
                           "lista_color":r[10] or '#6b7280',
                           "votos_posibles": r[11] or 0} for r in rows]
            return {"success": True, "candidatos": candidatos, "total": len(candidatos)}

        if action == "candidatos_con_dirigentes":
            cargo = normalizar_texto(telefono or '')  # reuse telefono param as cargo filter (password ya no es query param)
            cliente = normalizar_texto(observacion or '')
            where = ["c.activo=1"]
            params = []
            if cargo in ("intendente", "concejal", "representante"):
                where.append("c.cargo=?")
                params.append(cargo)
            if cliente:
                where.append("c.cliente_cedula=?")
                params.append(cliente)
            elif not cargo:
                sid = request.headers.get("x-session-id") or ""
                ced_sesion = _cliente_de_sesion(conn, sid) if sid else None
                if ced_sesion:
                    depto = c.execute("SELECT departamento_id FROM clientes WHERE cedula=?", (ced_sesion,)).fetchone()
                    if depto and depto[0]:
                        where.append("c.departamento_id=?")
                        params.append(depto[0])
                    else:
                        where.append("c.cliente_cedula=?")
                        params.append(ced_sesion)
            rows = c.execute(f"""
                SELECT c.id, c.nombre, c.cargo, c.lista_nro, c.lista_nombre, c.orden,
                       c.departamento_id, c.distrito_id, c.cliente_cedula,
                       l.color as lista_color
                FROM candidatos c
                LEFT JOIN listas l ON c.lista_nro = l.nro
                WHERE {' AND '.join(where)}
                ORDER BY c.cargo, c.lista_nro, c.orden
            """, params).fetchall()

            candidatos = []
            for r in rows:
                cid = r[0]
                # Find linked dirigentes
                dirs = c.execute("""
                    SELECT d.cedula, d.nombre, d.tipo, dc.fecha_asignacion
                    FROM dirigente_candidatos dc
                    JOIN dirigentes d ON dc.dirigente_cedula = d.cedula
                    WHERE dc.candidato_id = ?
                    ORDER BY d.nombre
                """, (cid,)).fetchall()
                dirigentes = [{"cedula":dr[0], "nombre":dr[1], "tipo":dr[2], "fecha_asignacion":dr[3]} for dr in dirs]
                # Votantes que un dirigente destino especificamente a ESTE candidato (un voto
                # puede estar destinado a varios candidatos a la vez, uno por cargo, asi que se
                # cuenta por la tabla de union, no por un unico candidato_id en posible_votos).
                totalVotantes = c.execute(
                    "SELECT COUNT(DISTINCT posible_voto_id) FROM posible_voto_candidatos WHERE candidato_id=?", (cid,)
                ).fetchone()[0] or 0

                candidatos.append({
                    "id": cid, "nombre": r[1], "cargo": r[2], "lista_nro": r[3],
                    "lista_nombre": r[4] or '', "orden": r[5],
                    "departamento_id": r[6], "distrito_id": r[7],
                    "cliente_cedula": r[8] or '',
                    "lista_color": r[9] or '#6b7280',
                    "dirigentes": dirigentes, "total_dirigentes": len(dirigentes),
                    "total_votantes": totalVotantes
                })
            return {"success": True, "candidatos": candidatos, "total": len(candidatos)}

        if action == "afiliados_anr":
            # Consulta de afiliados ANR con filtros (vía query params)
            seccional = request.query_params.get("seccional")
            movimiento = request.query_params.get("movimiento")
            limit = min(int(request.query_params.get("limit", 100)), 1000)
            offset = int(request.query_params.get("offset", 0))
            
            query = "SELECT cedula, fecha_afiliacion, seccional_numero, seccional_nombre, local_interna, movimiento, voto_interna, voto_generales FROM afiliados_anr WHERE 1=1"
            params = []
            if cedula:
                query += " AND cedula = ?"
                params.append(cedula)
            if seccional:
                query += " AND seccional_numero = ?"
                params.append(int(seccional))
            if movimiento:
                query += " AND movimiento = ?"
                params.append(movimiento)
            query += " ORDER BY cedula LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            rows = c.execute(query, params).fetchall()
            items = [{
                "cedula": r[0], "fecha_afiliacion": r[1],
                "seccional_numero": r[2], "seccional_nombre": r[3],
                "local_interna": r[4], "movimiento": r[5],
                "voto_interna": r[6], "voto_generales": r[7]
            } for r in rows]
            return {"success": True, "items": items, "total": len(items)}
        
        if action == "padron_enriquecido":
            # Padrón completo con datos ANR integrados
            seccional = request.query_params.get("seccional")
            partido = request.query_params.get("partido")
            limit = min(int(request.query_params.get("limit", 100)), 1000)
            offset = int(request.query_params.get("offset", 0))
            
            query = """
                SELECT p.cedula, p.nombre, p.apellido, p.mesa, p.orden,
                       p.departamento_nombre, p.distrito_nombre, p.local_nombre,
                       a.fecha_afiliacion, a.seccional_numero, a.seccional_nombre,
                       a.movimiento, a.voto_interna, a.voto_generales,
                       CASE WHEN a.cedula IS NOT NULL THEN 'ANR' ELSE NULL END as partido
                FROM padron2026_completo p
                LEFT JOIN afiliados_anr a ON a.cedula = p.cedula
                WHERE 1=1
            """
            params = []
            if cedula:
                query += " AND p.cedula = ?"
                params.append(cedula)
            if seccional:
                query += " AND a.seccional_numero = ?"
                params.append(int(seccional))
            if partido:
                query += " AND a.cedula IS NOT NULL"
            query += " ORDER BY p.cedula LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            rows = c.execute(query, params).fetchall()
            items = [{
                "cedula": r[0], "nombre": r[1], "apellido": r[2],
                "mesa": r[3], "orden": r[4],
                "departamento": r[5], "distrito": r[6], "local": r[7],
                "fecha_afiliacion": r[8], "seccional_numero": r[9],
                "seccional_nombre": r[10], "movimiento": r[11],
                "voto_interna": r[12], "voto_generales": r[13],
                "partido": r[14]
            } for r in rows]
            return {"success": True, "items": items, "total": len(items)}
        
        if action == "seccionales_anr":
            # Catálogo de seccionales ANR
            rows = c.execute("""
                SELECT codigo_dep, ndepart, codigo_dis, ndistrito, zona, codigo_sec, descripcio, w_seccio, direccion, local_vota
                FROM anr_seccionales ORDER BY codigo_dep, codigo_dis, codigo_sec
            """).fetchall()
            items = [{
                "codigo_dep": r[0], "departamento": r[1], "codigo_dis": r[2],
                "distrito": r[3], "zona": r[4], "codigo_sec": r[5],
                "descripcion": r[6], "w_seccio": r[7], "direccion": r[8],
                "local_vota": r[9]
            } for r in rows]
            return {"success": True, "items": items, "total": len(items)}
        
        if action == "locales_anr":
            # Catálogo de locales ANR
            rows = c.execute("""
                SELECT codigo_dep, codigo_dis, codigo_sec, codigo_loc, nombre_loc, direccion, secc_loc
                FROM anr_locales ORDER BY codigo_dep, codigo_dis, codigo_sec, codigo_loc
            """).fetchall()
            items = [{
                "codigo_dep": r[0], "codigo_dis": r[1], "codigo_sec": r[2],
                "codigo_loc": r[3], "nombre_loc": r[4], "direccion": r[5],
                "secc_loc": r[6]
            } for r in rows]
            return {"success": True, "items": items, "total": len(items)}
        
        if action == "estadisticas_anr":
            # Estadísticas de afiliados ANR
            total = c.execute("SELECT COUNT(*) FROM afiliados_anr").fetchone()[0]
            con_movimiento = c.execute("SELECT COUNT(*) FROM afiliados_anr WHERE movimiento IS NOT NULL AND movimiento != ''").fetchone()[0]
            con_voto_interna = c.execute("SELECT COUNT(*) FROM afiliados_anr WHERE voto_interna = 1").fetchone()[0]
            con_voto_generales = c.execute("SELECT COUNT(*) FROM afiliados_anr WHERE voto_generales = 1").fetchone()[0]
            seccionales = c.execute("SELECT COUNT(DISTINCT seccional_numero) FROM afiliados_anr").fetchone()[0]
            movimientos = c.execute("SELECT COUNT(DISTINCT movimiento) FROM afiliados_anr WHERE movimiento IS NOT NULL AND movimiento != ''").fetchone()[0]
            return {
                "success": True,
                "total_afiliados": total,
                "con_movimiento": con_movimiento,
                "con_voto_interna": con_voto_interna,
                "con_voto_generales": con_voto_generales,
                "seccionales": seccionales,
                "movimientos": movimientos
            }
        
        if action == "partidos":
            # Lista de partidos con conteo de afiliados
            rows = c.execute("""
                SELECT p.id, p.nombre, p.sigla, p.color, p.activo,
                       (SELECT COUNT(*) FROM afiliados_anr) as afiliados_anr
                FROM partidos p ORDER BY p.nombre
            """).fetchall()
            items = [{
                "id": r[0], "nombre": r[1], "sigla": r[2],
                "color": r[3], "activo": r[4], "afiliados_anr": r[5]
            } for r in rows]
            return {"success": True, "items": items, "total": len(items)}
        
        if action == "ce_campana":
            # Datos completos de la campaña del centro de estudiantes
            eleccion = c.execute("SELECT * FROM ce_elecciones ORDER BY id DESC LIMIT 1").fetchone()
            if not eleccion:
                return {"success": False, "error": "No hay campaña activa"}
            
            candidatos = []
            for r in c.execute("SELECT * FROM ce_candidatos WHERE eleccion_id=? ORDER BY id", (eleccion[0],)):
                candidatos.append({
                    "id": r[0], "nombre": r[2], "apellido": r[3],
                    "lista": r[4], "propuesta": r[5], "votos": r[6]
                })
            
            miembros = []
            for r in c.execute("""
                SELECT m.*, c.nombre as cand_nombre, c.apellido as cand_apellido
                FROM ce_miembros m
                JOIN ce_candidatos c ON c.id = m.candidato_id
                WHERE m.eleccion_id=? ORDER BY m.candidato_id, m.id
            """, (eleccion[0],)):
                miembros.append({
                    "id": r[0], "candidato_id": r[2], "nombre": r[3],
                    "apellido": r[4], "rol": r[5], "curso": r[6],
                    "candidato": f"{r[7]} {r[8]}"
                })
            
            logistica = []
            for r in c.execute("SELECT * FROM ce_logistica WHERE eleccion_id=? ORDER BY tipo, id", (eleccion[0],)):
                logistica.append({
                    "id": r[0], "tipo": r[2], "descripcion": r[3],
                    "responsable": r[4], "estado": r[5]
                })
            
            total_votos = c.execute("SELECT COUNT(*) FROM ce_votos WHERE eleccion_id=?", (eleccion[0],)).fetchone()[0]
            
            return {
                "success": True,
                "eleccion": {
                    "id": eleccion[0], "nombre": eleccion[1],
                    "descripcion": eleccion[2], "fecha": eleccion[3],
                    "estado": eleccion[4]
                },
                "candidatos": candidatos,
                "miembros": miembros,
                "logistica": logistica,
                "total_votos": total_votos
            }
        
        if action == "mis_candidatos":
            dc = normalizar_cedula(dirigente or '')
            if not dc:
                return {"success": False, "error": "Dirigente requerido"}
            rows = c.execute("""
                SELECT c.id, c.nombre, c.cargo, c.lista_nro, c.lista_nombre, c.orden, c.departamento_id,
                       pc.partido_id,
                       l.color as lista_color, dc.fecha_asignacion,
                       (SELECT COUNT(*) FROM posible_voto_candidatos pvc
                          JOIN posible_votos pv ON pv.id = pvc.posible_voto_id
                          WHERE pvc.candidato_id = c.id AND pv.dirigente_cedula = dc.dirigente_cedula
                            AND pv.status = 'confirmado') as votos_destinados,
                       (SELECT COUNT(*) FROM posible_voto_candidatos pvc
                          JOIN posible_votos pv ON pv.id = pvc.posible_voto_id
                          WHERE pvc.candidato_id = c.id AND pv.dirigente_cedula = dc.dirigente_cedula) as votos_comprometidos
                FROM dirigente_candidatos dc
                JOIN candidatos c ON dc.candidato_id = c.id
                LEFT JOIN perfil_candidato pc ON pc.candidato_id = c.id
                LEFT JOIN listas l ON c.lista_nro = l.nro
                WHERE dc.dirigente_cedula = ?
                ORDER BY c.cargo, c.lista_nro, c.orden
            """, (dc,)).fetchall()
            items = [{"candidato_id":r[0], "nombre":r[1], "cargo":r[2], "lista_nro":r[3],
                       "lista_nombre":r[4] or '', "orden":r[5], "departamento_id":r[6], "partido_id":r[7],
                       "lista_color":r[8] or '#6b7280', "fecha_asignacion":r[9],
                       "votos_destinados": r[10] or 0, "votos_comprometidos": r[11] or 0} for r in rows]
            intendentes = [i for i in items if i["cargo"] == "intendente"]
            concejales = [i for i in items if i["cargo"] == "concejal"]
            return {"success": True, "items": items, "intendentes": intendentes,
                    "concejales": concejales, "total": len(items)}

        if action == "jerarquia":
            # Full tree: Intendentes → Concejales → PCs (grupos) → Dirigentes
            intRows = c.execute("""
                SELECT c.id, c.nombre, c.lista_nro, c.lista_nombre, l.color
                FROM candidatos c LEFT JOIN listas l ON c.lista_nro = l.nro
                WHERE c.cargo='intendente' AND c.activo=1 ORDER BY c.lista_nro
            """).fetchall()

            arbol = []
            for ir in intRows:
                int_id, int_nom, int_lista, int_lista_nom, int_color = ir[0], ir[1], ir[2], ir[3], ir[4] or '#6b7280'

                # Concejales de esta misma lista por prefijo
                prefijo = str(int_lista)
                conRows = c.execute("""
                    SELECT c.id, c.nombre, c.orden, c.lista_nro, c.lista_nombre
                    FROM candidatos c
                    WHERE c.cargo='concejal' AND c.activo=1
                      AND (CAST(c.lista_nro AS TEXT) LIKE ? OR c.lista_nro = ?)
                    ORDER BY c.lista_nro, c.orden
                """, (prefijo + '%', int_lista)).fetchall()

                concejales = []
                for cr in conRows:
                    con_id, con_nom, con_ord = cr[0], cr[1], cr[2]
                    # PCs/grupos de este concejal
                    grRows = c.execute("""
                        SELECT g.id, g.nombre, g.zona, g.seccional
                        FROM grupos_trabajo g
                        WHERE g.candidato_id=? AND g.activo=1 ORDER BY g.seccional, g.nombre
                    """, (con_id,)).fetchall()

                    grupos = []
                    for gr in grRows:
                        gr_id, gr_nom, gr_zona, gr_secc = gr[0], gr[1], gr[2] or '', gr[3] or ''
                        # Dirigentes de este grupo
                        dirRows = c.execute("""
                            SELECT d.cedula, d.nombre, d.tipo,
                                   (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula=d.cedula) as total_posibles,
                                   (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula=d.cedula AND pv.status='confirmado') as total_confirmados,
                                   (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula=d.cedula AND pv.status IN ('buscar','vendra_solo')) as total_en_proceso
                            FROM grupo_dirigentes gd
                            JOIN dirigentes d ON gd.dirigente_cedula = d.cedula
                            WHERE gd.grupo_id=? ORDER BY d.nombre
                        """, (gr_id,)).fetchall()

                        dirigentes = [{"cedula":dr[0],"nombre":dr[1],"tipo":dr[2],
                                       "posibles":dr[3] or 0,"confirmados":dr[4] or 0,"en_proceso":dr[5] or 0}
                                      for dr in dirRows]
                        total_posibles = sum(d["posibles"] for d in dirigentes)
                        total_confirmados = sum(d["confirmados"] for d in dirigentes)
                        grupos.append({"id":gr_id,"nombre":gr_nom,"zona":gr_zona,"seccional":gr_secc,
                                       "dirigentes":dirigentes,"total_dirigentes":len(dirigentes),
                                       "total_posibles":total_posibles,"total_confirmados":total_confirmados})

                    total_dir = sum(g["total_dirigentes"] for g in grupos)
                    total_pos = sum(g["total_posibles"] for g in grupos)
                    total_conf = sum(g["total_confirmados"] for g in grupos)
                    concejales.append({"id":con_id,"nombre":con_nom,"orden":con_ord,
                                       "grupos":grupos,"total_grupos":len(grupos),
                                       "total_dirigentes":total_dir,"total_posibles":total_pos,"total_confirmados":total_conf})

                total_con = len(concejales)
                total_gr = sum(c["total_grupos"] for c in concejales)
                total_dir = sum(c["total_dirigentes"] for c in concejales)
                total_pos = sum(c["total_posibles"] for c in concejales)
                total_conf = sum(c["total_confirmados"] for c in concejales)
                arbol.append({"id":int_id,"nombre":int_nom,"lista_nro":int_lista,
                              "lista_nombre":int_lista_nom or '',"lista_color":int_color,
                              "concejales":concejales,"total_concejales":total_con,
                              "total_grupos":total_gr,"total_dirigentes":total_dir,
                              "total_posibles":total_pos,"total_confirmados":total_conf})

            return {"success":True,"arbol":arbol,"total_intendentes":len(arbol)}

        if action == "departamentos":
            rows = c.execute("SELECT id, nombre FROM departamentos ORDER BY id").fetchall()
            return {"departamentos": [{"id": r[0], "nombre": r[1]} for r in rows]}

        if action == "distritos":
            dpto_id = mesa  # reuse mesa param as departamento_id
            if dpto_id:
                rows = c.execute("SELECT id, cod_dist, nombre FROM distritos WHERE departamento_id=? ORDER BY cod_dist", (dpto_id,)).fetchall()
            else:
                rows = c.execute("SELECT id, cod_dist, nombre FROM distritos ORDER BY departamento_id, cod_dist").fetchall()
            return {"distritos": [{"id": r[0], "cod_dist": r[1], "nombre": r[2]} for r in rows]}

        if action == "distritos_padron":
            # Distritos tal como figuran en el padrón real (padron2026_completo.distrito),
            # para el drill-down del dashboard: son los mismos códigos usados para filtrar
            # electores/mesas, a diferencia de la tabla normalizada 'distritos'.
            # 'mesa' (reusado) filtra opcionalmente por departamento (pc.depart) — el mismo
            # código que usa buscar_padron, para que el desplegable de Distrito del buscador
            # ofrezca justo lo que después se puede filtrar.
            depto_filtro_dp = int(mesa) if mesa else None
            if depto_filtro_dp is not None:
                rows = c.execute("""SELECT DISTINCT distrito, distrito_nombre FROM padron2026_completo
                                     WHERE distrito != 0 AND depart=? ORDER BY distrito_nombre""", (depto_filtro_dp,)).fetchall()
            else:
                rows = c.execute("""SELECT DISTINCT distrito, distrito_nombre FROM padron2026_completo
                                     WHERE distrito != 0 ORDER BY distrito_nombre""").fetchall()
            return {"success": True, "distritos": [{"codigo": r[0], "nombre": r[1] or f'Distrito {r[0]}'} for r in rows]}

        if action == "seccionales_por_distrito":
            # "Seccional" = sec_loc del padrón. Distrito acá es el CÓDIGO (padron2026_completo.distrito),
            # no el id de la tabla 'distritos' (son numeraciones distintas en este padrón).
            dist_cod = normalizar_texto(distrito_filtro or '')
            if not dist_cod:
                return {"success": False, "error": "Distrito requerido"}
            rows = c.execute("""SELECT DISTINCT sec_loc FROM padron2026_completo
                                 WHERE distrito=? AND sec_loc != 0 ORDER BY sec_loc""", (dist_cod,)).fetchall()
            return {"success": True, "seccionales": [r[0] for r in rows]}

        if action == "locales_por_seccional":
            dist_cod = normalizar_texto(distrito_filtro or '')
            sec = normalizar_texto(sec_loc_filtro or '')
            if not dist_cod or not sec:
                return {"success": False, "error": "Distrito y seccional requeridos"}
            rows = c.execute("""SELECT DISTINCT local, local_nombre FROM padron2026_completo
                                 WHERE distrito=? AND sec_loc=? ORDER BY local_nombre""", (dist_cod, sec)).fetchall()
            return {"success": True, "locales": [{"id": r[0], "nombre": r[1] or f'Local {r[0]}'} for r in rows]}

        # ─── MÓDULO ELECTORAL (GET) ─────────────────────────────────
        if action == "elecciones":
            rows = c.execute("""
                SELECT e.id, e.nombre, e.periodo, e.fecha_eleccion, e.estado, e.activo,
                       te.codigo as tipo_codigo, te.nombre as tipo_nombre
                FROM elecciones e
                JOIN tipos_eleccion te ON te.id = e.tipo_eleccion_id
                ORDER BY e.fecha_eleccion DESC
            """).fetchall()
            cols = ["id","nombre","periodo","fecha_eleccion","estado","activo","tipo_codigo","tipo_nombre"]
            return {"success": True, "elecciones": [row_to_dict(r, cols) for r in rows]}

        if action == "eleccion_activa":
            # Corregido: resolvedor determinista (antes ORDER BY fecha ASC LIMIT 1
            # devolvía la finalizada más antigua y no desempataba simultáneas).
            _e = elecciones_ctx.resolver_eleccion(conn)
            if not _e or _e.get("error"):
                return {"success": False, "error": (_e or {}).get("error", "No hay elección activa")}
            _e = dict(_e)
            _e["requiere_seleccion"] = elecciones_ctx.requiere_seleccion(conn)
            return {"success": True, "eleccion": _e}

        if action == "elecciones_trabajables":
            # Todas las elecciones en las que se puede trabajar (resuelve simultáneas).
            return {"success": True, **elecciones_ctx.contexto_completo(conn)}

        if action == "resolver_eleccion":
            _e = elecciones_ctx.resolver_eleccion(conn, eleccion_id=id, tipo_codigo=mesa_param)
            if not _e or _e.get("error"):
                return {"success": False, "error": (_e or {}).get("error", "No hay elección")}
            return {"success": True, "eleccion": _e}

        if action == "tipos_eleccion":
            rows = c.execute("SELECT * FROM tipos_eleccion WHERE activo=1 ORDER BY id").fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(tipos_eleccion)").fetchall()]
            return {"success": True, "tipos": [row_to_dict(r, cols) for r in rows]}

        if action == "cargos_electivos":
            tipo_eleccion = normalizar_texto(mesa_param or '')  # reuse mesa_param as filtro
            ambito = normalizar_texto(dirigente or '')  # reuse dirigente as ambito
            where = ["ce.activo=1"]
            params = []
            if tipo_eleccion:
                where.append("te.codigo=?")
                params.append(tipo_eleccion)
            if ambito:
                where.append("ce.ambito=?")
                params.append(ambito)
            sid_paq = request.headers.get("x-session-id") or ""
            ced_sesion_paq = _cliente_de_sesion(conn, sid_paq) if sid_paq else None
            cargos_ok = _cargos_permitidos_cliente(c, ced_sesion_paq) if ced_sesion_paq else None
            if cargos_ok is not None:
                if not cargos_ok:
                    return {"success": True, "cargos": []}
                ph_cargo = ','.join('?' * len(cargos_ok))
                where.append(f"ce.codigo IN ({ph_cargo})")
                params.extend(cargos_ok)
            query = f"""
                SELECT ce.*, te.codigo as tipo_eleccion_codigo
                FROM cargos_electivos ce
                LEFT JOIN tipos_eleccion te ON te.codigo = ce.ambito
                WHERE {' AND '.join(where)}
                ORDER BY ce.orden_visual
            """
            rows = c.execute(query, params).fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(cargos_electivos)").fetchall()] + ["tipo_eleccion_codigo"]
            return {"success": True, "cargos": [row_to_dict(r, cols) for r in rows]}

        if action == "verificar_acceso_general":
            # Para gatear Escrutinio/D'Hondt: ¿el cliente de esta sesión tiene acceso a
            # datos generales (nacional/departamental), o su paquete es solo interno?
            sid_gen = request.headers.get("x-session-id") or ""
            ced_sesion_gen = _cliente_de_sesion(conn, sid_gen) if sid_gen else None
            return {"success": True, "acceso": _tiene_dato_general(c, ced_sesion_gen) if ced_sesion_gen else True}

        if action == "cargos_por_eleccion":
            # Todos los cargos que corresponden al tipo de elección de una convocatoria
            # concreta (ej. "Elecciones Nacionales 2026" → presidente, senador, diputado),
            # para auto-completar un paquete en vez de tildarlos uno por uno.
            eleccion_id_cpe = int(eleccion_id_filtro) if (eleccion_id_filtro or '').isdigit() else None
            if not eleccion_id_cpe:
                return {"success": False, "error": "eleccion_id requerido"}
            elec = c.execute("SELECT tipo_eleccion_id FROM elecciones WHERE id=?", (int(eleccion_id_cpe),)).fetchone()
            if not elec:
                return {"success": False, "error": "Elección no encontrada"}
            rows = c.execute("""SELECT DISTINCT ce.id, ce.codigo, ce.nombre
                                 FROM reglas_cargo rc
                                 JOIN cargos_electivos ce ON ce.id = rc.cargo_id
                                 WHERE rc.tipo_eleccion_id=? AND ce.activo=1""", (elec[0],)).fetchall()
            return {"success": True, "cargos": [{"id": r[0], "codigo": r[1], "nombre": r[2]} for r in rows]}

        if action == "elecciones_lista":
            rows = c.execute("""SELECT e.id, e.nombre, e.periodo, e.estado, te.nombre
                                 FROM elecciones e JOIN tipos_eleccion te ON te.id = e.tipo_eleccion_id
                                 WHERE e.activo=1 ORDER BY e.id DESC""").fetchall()
            return {"success": True, "elecciones": [{"id": r[0], "nombre": r[1], "periodo": r[2], "estado": r[3], "tipo_nombre": r[4]} for r in rows]}

        if action == "paquetes_eleccion":
            # Lista todos los paquetes (admin) o, si se pasa cedula, también indica
            # cuáles tiene asignados ese cliente.
            ced_cliente_ver = normalizar_cedula(cedula or '')
            paquetes = c.execute("""
                SELECT p.id, p.nombre, p.descripcion, p.eleccion_id, p.activo, e.nombre as eleccion_nombre
                FROM paquetes_eleccion p
                LEFT JOIN elecciones e ON e.id = p.eleccion_id
                ORDER BY p.id
            """).fetchall()
            asignados = set()
            if ced_cliente_ver:
                asignados = {r[0] for r in c.execute(
                    "SELECT paquete_id FROM cliente_paquetes WHERE cliente_cedula=? AND activo=1", (ced_cliente_ver,)
                ).fetchall()}
            resultado = []
            for p in paquetes:
                cargos = c.execute("""SELECT ce.codigo, ce.nombre FROM paquete_cargos pc
                                       JOIN cargos_electivos ce ON ce.id = pc.cargo_id
                                       WHERE pc.paquete_id=?""", (p[0],)).fetchall()
                resultado.append({
                    "id": p[0], "nombre": p[1], "descripcion": p[2] or '', "eleccion_id": p[3],
                    "eleccion_nombre": p[5] or '', "activo": bool(p[4]),
                    "cargos": [{"codigo": cg[0], "nombre": cg[1]} for cg in cargos],
                    "asignado": p[0] in asignados
                })
            return {"success": True, "paquetes": resultado, "total": len(resultado)}

        if action == "circunscripciones_api":
            tipo = normalizar_texto(mesa_param or '')  # nacional, departamento, municipio
            depto_id = int(dirigente) if (dirigente or '').isdigit() else None
            where = ["c.activo=1"]
            params = []
            if tipo:
                where.append("c.tipo=?")
                params.append(tipo)
            if depto_id:
                where.append("(c.departamento_id=? OR c.tipo='nacional')")
                params.append(depto_id)
            rows = c.execute(f"""
                SELECT c.*, d.nombre as departamento_nombre, di.nombre as distrito_nombre
                FROM circunscripciones c
                LEFT JOIN departamentos d ON d.id = c.departamento_id
                LEFT JOIN distritos di ON di.id = c.distrito_id
                WHERE {' AND '.join(where)}
                ORDER BY c.tipo, c.nombre
            """, params).fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(circunscripciones)").fetchall()]
            extra = ["departamento_nombre","distrito_nombre"]
            items = []
            for r in rows:
                d = {}
                for i, col in enumerate(cols):
                    d[col] = r[i]
                for i, col in enumerate(extra):
                    d[col] = r[len(cols)+i] if len(r) > len(cols)+i else None
                items.append(d)
            return {"success": True, "circunscripciones": items}

        if action == "reglas_cargo":
            cargo_id = int(id) if (id or '').isdigit() else None
            where = ["rc.activo=1"]
            params = []
            if cargo_id:
                where.append("rc.cargo_id=?")
                params.append(cargo_id)
            rows = c.execute(f"""
                SELECT rc.*, ce.nombre as cargo_nombre, ce.codigo as cargo_codigo,
                       c.nombre as circunscripcion_nombre, c.tipo as circunscripcion_tipo
                FROM reglas_cargo rc
                JOIN cargos_electivos ce ON ce.id = rc.cargo_id
                LEFT JOIN circunscripciones c ON c.id = rc.circunscripcion_id
                WHERE {' AND '.join(where)}
                ORDER BY ce.orden_visual, c.nombre
            """, params).fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(reglas_cargo)").fetchall()]
            extra = ["cargo_nombre","cargo_codigo","circunscripcion_nombre","circunscripcion_tipo"]
            items = []
            for r in rows:
                d = {}
                for i, col in enumerate(cols):
                    d[col] = r[i]
                for i, col in enumerate(extra):
                    d[col] = r[len(cols)+i] if len(r) > len(cols)+i else None
                items.append(d)
            return {"success": True, "reglas": items}

        if action == "listas_electorales":
            partido_id = int(id) if (id or '').isdigit() else None
            eleccion_id = int(mesa) if mesa else None
            where = ["lp.activo=1"]
            params = []
            if partido_id:
                where.append("lp.partido_id=?")
                params.append(partido_id)
            if eleccion_id:
                where.append("lp.eleccion_id=?")
                params.append(eleccion_id)
            rows = c.execute(f"""
                SELECT lp.*, ce.nombre as cargo_nombre, ce.codigo as cargo_codigo,
                       c.nombre as circunscripcion_nombre,
                       p.sigla as partido_sigla, p.color_principal_hex as partido_color
                FROM listas_partido lp
                LEFT JOIN cargos_electivos ce ON ce.id = lp.cargo_id
                LEFT JOIN circunscripciones c ON c.id = lp.circunscripcion_id
                LEFT JOIN partidos p ON p.id = lp.partido_id
                WHERE {' AND '.join(where)}
                ORDER BY lp.partido_id, lp.orden, lp.numero_lista
            """, params).fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(listas_partido)").fetchall()]
            extra = ["cargo_nombre","cargo_codigo","circunscripcion_nombre","partido_sigla","partido_color"]
            items = []
            for r in rows:
                d = {}
                for i, col in enumerate(cols):
                    d[col] = r[i]
                for i, col in enumerate(extra):
                    d[col] = r[len(cols)+i] if len(r) > len(cols)+i else None
                items.append(d)
            return {"success": True, "listas": items}

        if action == "candidaturas":
            lista_id = int(id) if (id or '').isdigit() else None
            cargo_id = int(mesa) if mesa else None
            where = ["cl.activo=1"]
            params = []
            if lista_id:
                where.append("cl.lista_id=?")
                params.append(lista_id)
            if cargo_id:
                where.append("cl.cargo_id=?")
                params.append(cargo_id)
            rows = c.execute(f"""
                SELECT cl.*, ce.nombre as cargo_nombre, ce.codigo as cargo_codigo,
                       lp.nombre_lista, lp.numero_lista as nro_lista
                FROM candidatos_lista cl
                LEFT JOIN cargos_electivos ce ON ce.id = cl.cargo_id
                LEFT JOIN listas_partido lp ON lp.id = cl.lista_id
                WHERE {' AND '.join(where)}
                ORDER BY cl.orden_en_lista
            """, params).fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(candidatos_lista)").fetchall()]
            extra = ["cargo_nombre","cargo_codigo","nombre_lista","nro_lista"]
            items = []
            for r in rows:
                d = {}
                for i, col in enumerate(cols):
                    d[col] = r[i]
                for i, col in enumerate(extra):
                    d[col] = r[len(cols)+i] if len(r) > len(cols)+i else None
                items.append(d)
            return {"success": True, "candidaturas": items}

        if action == "estructura_politica":
            partido_id = int(id) if (id or '').isdigit() else None
            eleccion_id = int(mesa) if mesa else None
            where = ["ep.activo=1"]
            params = []
            if partido_id:
                where.append("ep.partido_id=?")
                params.append(partido_id)
            if eleccion_id:
                where.append("ep.eleccion_id=?")
                params.append(eleccion_id)
            rows = c.execute(f"""
                SELECT ep.*,
                       i.nombre_completo as intendente_nombre,
                       c.nombre_completo as concejal_nombre,
                       gt.nombre as pc_nombre,
                       d.nombre as dirigente_nombre
                FROM estructura_politica ep
                LEFT JOIN candidatos_lista i ON i.id = ep.intendente_id
                LEFT JOIN candidatos_lista c ON c.id = ep.concejal_id
                LEFT JOIN grupos_trabajo gt ON gt.id = ep.pc_id
                LEFT JOIN dirigentes d ON d.cedula = ep.dirigente_cedula
                WHERE {' AND '.join(where)}
                ORDER BY ep.id
            """, params).fetchall()
            cols = [d[0] for d in c.execute("PRAGMA table_info(estructura_politica)").fetchall()]
            extra = ["intendente_nombre","concejal_nombre","pc_nombre","dirigente_nombre"]
            items = []
            for r in rows:
                d = {}
                for i, col in enumerate(cols):
                    d[col] = r[i]
                for i, col in enumerate(extra):
                    d[col] = r[len(cols)+i] if len(r) > len(cols)+i else None
                items.append(d)
            return {"success": True, "estructura": items}

        if action == "validar_cedula_candidato":
            ced = normalizar_cedula(cedula or '')
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            ya_es_dirigente = bool(c.execute("SELECT 1 FROM dirigentes WHERE cedula=? AND activo=1", (ced,)).fetchone())
            # Buscar en padron2026_completo
            # El padrón trae departamento_nombre/distrito_nombre vacíos para la mayoría
            # de las filas; cuando falta, se completa con la tabla 'departamentos' (código
            # nacional, siempre disponible) y, si tampoco hay nombre de distrito, se deja
            # el código tal cual en vez de mostrar un campo vacío.
            row = c.execute("""
                SELECT p.cedula, p.nombre, p.apellido, p.mesa, p.orden,
                       COALESCE(NULLIF(p.departamento_nombre,''), d.nombre, CAST(p.depart AS TEXT)),
                       COALESCE(NULLIF(p.distrito_nombre,''), CAST(p.distrito AS TEXT)),
                       p.zona_nombre, p.local_nombre, p.direccion
                FROM padron2026_completo p
                LEFT JOIN departamentos d ON d.id = p.depart
                WHERE p.cedula=?""", (ced,)).fetchone()
            if row:
                return {"success": True, "encontrado": True, "origen": "padron2026_completo",
                        "cedula": row[0], "nombre": row[1], "apellido": row[2], "mesa": row[3], "orden": row[4],
                        "departamento": row[5] or '', "distrito": row[6] or '', "zona": row[7] or '', "local": row[8] or '',
                        "direccion": row[9] or '',
                        "ya_es_dirigente": ya_es_dirigente}
            return {"success": True, "encontrado": False, "mensaje": "Cédula no encontrada en el padrón", "ya_es_dirigente": ya_es_dirigente}

        # ─── FIN MÓDULO ELECTORAL ──────────────────────────────────

        # ─── PANEL DEL CLIENTE (GET actions) ──────────────────────────────
        if action == "perfil":
            ced = normalizar_cedula(cedula or '')
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cl = c.execute("""
                SELECT c.cedula, c.nombre, c.tipo, c.categoria, c.departamento_id, c.distrito_id,
                       c.candidato_nombre, c.candidato_cargo, c.locales, c.activo, c.partido_id
                FROM clientes c WHERE c.cedula=? AND c.activo=1
            """, (ced,)).fetchone()
            if not cl:
                return {"success": False, "error": "Cliente no encontrado o inactivo"}
            cand = c.execute("""
                SELECT ce.id, ce.tipo_cargo, ce.lista_nro, ce.lista_nombre,
                       ce.votos_obtenidos, ce.porcentaje_votos, ce.orden_electo,
                       ce.distrito_nombre, cand.id as cand_id,
                       p.sigla, p.color_principal_hex,
                       COALESCE(d.nombre, '') as depto_nombre
                FROM candidatos_electos_internas ce
                JOIN candidatos cand ON cand.id = ce.candidato_id
                JOIN partidos p ON p.id = ce.partido_id
                LEFT JOIN departamentos d ON d.id = ce.departamento_id
                WHERE cand.cliente_cedula=?
                ORDER BY ce.id DESC LIMIT 1
            """, (ced,)).fetchone()
            candidato = None
            if cand:
                candidato = {
                    'electo_id': cand[0], 'tipo_cargo': cand[1], 'lista_nro': cand[2],
                    'lista_nombre': cand[3], 'votos_obtenidos': cand[4],
                    'porcentaje_votos': cand[5], 'orden_electo': cand[6],
                    'distrito_nombre': cand[7], 'candidato_id': cand[8],
                    'sigla': cand[9], 'color_hex': cand[10], 'departamento_nombre': cand[11]
                }
            return {
                "success": True,
                "cliente": {
                    "cedula": cl[0], "nombre": cl[1], "tipo": cl[2], "categoria": cl[3],
                    "departamento_id": cl[4], "distrito_id": cl[5],
                    "candidato_nombre": cl[6], "candidato_cargo": cl[7],
                    "locales": cl[8], "activo": cl[9], "partido_id": cl[10]
                },
                "candidato": candidato
            }

        if action == "dashboard_cliente":
            ced = normalizar_cedula(cedula or '')
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
            if not cand:
                return {"success": False, "error": "No hay candidato asociado a este cliente"}
            cand_id = cand[0]
            pcs = c.execute("""
                SELECT g.id, g.nombre, g.zona, g.seccional
                FROM grupos_trabajo g WHERE g.candidato_id=? AND g.activo=1
                ORDER BY g.seccional, g.nombre
            """, (cand_id,)).fetchall()
            total_pcs = len(pcs)
            dirs = c.execute("""
                SELECT d.cedula, d.nombre, d.tipo, gd.grupo_id, g.nombre as grupo_nombre
                FROM grupo_dirigentes gd
                JOIN grupos_trabajo g ON g.id = gd.grupo_id
                JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
                WHERE g.candidato_id=? AND g.activo=1 AND d.activo=1
                ORDER BY d.nombre
            """, (cand_id,)).fetchall()
            total_dirigentes = len(dirs)
            dirs_por_tipo = {}
            for d in dirs:
                t = d[2] or 'dirigente'
                dirs_por_tipo[t] = dirs_por_tipo.get(t, 0) + 1
            sols = c.execute("""
                SELECT COUNT(*) FROM solicitudes_recogida s
                JOIN dirigentes d ON d.cedula = s.dirigente_cedula
                JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
                JOIN grupos_trabajo g ON g.id = gd.grupo_id
                WHERE g.candidato_id=? AND s.estado IN ('pendiente','autorizado')
            """, (cand_id,)).fetchone()
            total_solicitudes = sols[0] if sols else 0
            transp = c.execute("SELECT COUNT(*) FROM transportes WHERE estado='disponible'").fetchone()
            total_transporte = transp[0] if transp else 0
            pv = c.execute("""
                SELECT COUNT(*) FROM posible_votos pv
                JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
                JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
                JOIN grupos_trabajo g ON g.id = gd.grupo_id
                WHERE g.candidato_id=?
            """, (cand_id,)).fetchone()
            total_posibles = pv[0] if pv else 0
            pv_conf = c.execute("""
                SELECT COUNT(*) FROM posible_votos pv
                JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
                JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
                JOIN grupos_trabajo g ON g.id = gd.grupo_id
                WHERE g.candidato_id=? AND pv.status='confirmado'
            """, (cand_id,)).fetchone()
            total_confirmados = pv_conf[0] if pv_conf else 0
            return {
                "success": True,
                "dashboard": {
                    "total_pcs": total_pcs, "total_dirigentes": total_dirigentes,
                    "dirs_por_tipo": dirs_por_tipo, "total_solicitudes": total_solicitudes,
                    "total_transporte": total_transporte, "total_posibles": total_posibles,
                    "total_confirmados": total_confirmados,
                },
                "pcs": [{"id": p[0], "nombre": p[1], "zona": p[2], "seccional": p[3], "total_dirigentes": 0} for p in pcs]
            }

        if action == "mis_pcs":
            ced = normalizar_cedula(cedula or '')
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
            if not cand:
                return {"success": False, "error": "No hay candidato asociado"}
            grs = c.execute("""
                SELECT g.id, g.nombre, g.zona, g.seccional
                FROM grupos_trabajo g WHERE g.candidato_id=? AND g.activo=1
                ORDER BY g.seccional, g.nombre
            """, (cand[0],)).fetchall()
            pcs = []
            for gr in grs:
                dirs = c.execute("""
                    SELECT d.cedula, d.nombre, d.tipo
                    FROM grupo_dirigentes gd
                    JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
                    WHERE gd.grupo_id=? AND d.activo=1
                    ORDER BY d.nombre
                """, (gr[0],)).fetchall()
                pv = c.execute("""
                    SELECT COUNT(*) FROM posible_votos pv
                    JOIN grupo_dirigentes gd ON gd.dirigente_cedula = pv.dirigente_cedula
                    WHERE gd.grupo_id=?
                """, (gr[0],)).fetchone()
                pcs.append({
                    'id': gr[0], 'nombre': gr[1], 'zona': gr[2], 'seccional': gr[3],
                    'dirigentes': [{'cedula': d[0], 'nombre': d[1], 'tipo': d[2]} for d in dirs],
                    'total_dirigentes': len(dirs), 'total_posibles': pv[0] if pv else 0
                })
            return {"success": True, "pcs": pcs, "total": len(pcs)}

        if action == "mis_dirigentes":
            ced = normalizar_cedula(cedula or '')
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
            if not cand:
                return {"success": False, "error": "No hay candidato asociado"}
            dirs = c.execute("""
                SELECT d.cedula, d.nombre, d.tipo, d.activo,
                       g.id as grupo_id, g.nombre as grupo_nombre, g.zona, g.seccional
                FROM grupo_dirigentes gd
                JOIN grupos_trabajo g ON g.id = gd.grupo_id
                JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
                WHERE g.candidato_id=? AND g.activo=1
                ORDER BY d.nombre
            """, (cand[0],)).fetchall()
            result = []
            for d in dirs:
                pv = c.execute("SELECT COUNT(*) FROM posible_votos WHERE dirigente_cedula=?", (d[0],)).fetchone()
                pv_conf = c.execute("SELECT COUNT(*) FROM posible_votos WHERE dirigente_cedula=? AND status='confirmado'", (d[0],)).fetchone()
                result.append({
                    'cedula': d[0], 'nombre': d[1], 'tipo': d[2], 'activo': d[3],
                    'grupo_id': d[4], 'grupo_nombre': d[5], 'zona': d[6], 'seccional': d[7],
                    'total_posibles': pv[0] if pv else 0, 'total_confirmados': pv_conf[0] if pv_conf else 0
                })
            return {"success": True, "dirigentes": result, "total": len(result)}

        if action == "mis_solicitudes":
            ced = normalizar_cedula(cedula or '')
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            sols = c.execute("""
                SELECT s.id, s.dirigente_cedula, s.dirigente_nombre, s.votante_cedula,
                       s.votante_nombre, s.hora_recogida, s.ubicacion, s.descripcion,
                       s.estado, s.autorizado_por, s.ruta_id, s.created_at
                FROM solicitudes_recogida s
                JOIN dirigentes d ON d.cedula = s.dirigente_cedula
                JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
                JOIN grupos_trabajo g ON g.id = gd.grupo_id
                JOIN candidatos cand ON cand.id = g.candidato_id
                WHERE cand.cliente_cedula=?
                ORDER BY s.created_at DESC
            """, (ced,)).fetchall()
            cols = ['id','dirigente_cedula','dirigente_nombre','votante_cedula',
                    'votante_nombre','hora_recogida','ubicacion','descripcion',
                    'estado','autorizado_por','ruta_id','created_at']
            items = [row_to_dict(r, cols) for r in sols]
            return {"success": True, "solicitudes": items, "total": len(items)}

        if action == "mis_transportes":
            rows = c.execute("SELECT id, cedula, nombre, tipo, placa, telefono, capacidad, estado, seccional FROM transportes ORDER BY nombre").fetchall()
            cols = ['id','cedula','nombre','tipo','placa','telefono','capacidad','estado','seccional']
            items = [row_to_dict(r, cols) for r in rows]
            return {"success": True, "transportes": items, "total": len(items)}

        if action == "partidos":
            rows = c.execute("SELECT sigla, nombre_completo, color_hex, numero_lista, logo_url, estado FROM partidos_politicos ORDER BY numero_lista").fetchall()
            partidos = [{"sigla": r[0], "nombre": r[1], "color": r[2], "lista": r[3], "logo": r[4], "estado": r[5]} for r in rows]
            return {"partidos": partidos, "total": len(partidos)}

        if action == "listas":
            tipo = normalizar_texto(dirigente or '')  # reuse dirigente param as tipo filter
            if tipo in ("intendente", "junta"):
                rows = c.execute("SELECT nro, nombre, color, tipo FROM listas WHERE tipo=? ORDER BY nro", (tipo,)).fetchall()
            else:
                rows = c.execute("SELECT nro, nombre, color, tipo FROM listas ORDER BY nro").fetchall()
            listas = [{"nro": r[0], "nombre": r[1], "color": r[2], "tipo": r[3]} for r in rows]
            return {"listas": listas, "total": len(listas)}

        if action == "buscar_padron":
            q = normalizar_texto(mesa_param or '')      # general text search
            ced = normalizar_cedula(cedula or '')       # cedula exacta
            apellido = normalizar_texto(dirigente or '') # reusing param as apellido
            nombre_filtro = normalizar_texto(nombre or '')
            depto = int(mesa) if mesa else None
            dist = normalizar_texto(orden or '')
            dist_int = int(dist) if dist.isdigit() else None
            solo_no_votaron = (estado or '').lower() == 'no_votaron'

            where = ["pc.vinculo = 'ANR2026'"]
            params = []
            if ced and len(ced) >= 3:
                where.append("pc.cedula LIKE ?")
                params.append(ced + '%')
            if apellido and len(apellido) >= 2:
                where.append("pc.apellido LIKE ?")
                params.append('%' + apellido + '%')
            if nombre_filtro and len(nombre_filtro) >= 2:
                where.append("pc.nombre LIKE ?")
                params.append('%' + nombre_filtro + '%')
            if depto is not None:
                where.append("pc.depart = ?")
                params.append(depto)
            if dist_int is not None:
                where.append("pc.distrito = ?")
                params.append(dist_int)
            zona_filtro = id
            zona_int = int(zona_filtro) if zona_filtro and str(zona_filtro).isdigit() else None
            if zona_int is not None:
                where.append("pc.zona = ?")
                params.append(zona_int)
            if q and len(q) >= 2:
                where.append("(pc.cedula LIKE ? OR pc.apellido LIKE ? OR pc.nombre LIKE ?)")
                qp = '%' + q + '%'
                params.extend([qp, qp, qp])
            if solo_no_votaron:
                where.append("pc.cedula NOT IN (SELECT cedula FROM registros WHERE estado='voto')")

            sql = f"""
                SELECT pc.cedula, pc.apellido, pc.nombre, pc.mesa, pc.orden,
                       pc.departamento_nombre,
                       pc.distrito_nombre,
                       pc.zona_nombre,
                       pc.local_nombre
                FROM padron2026_completo pc
                WHERE {' AND '.join(where)}
                ORDER BY pc.apellido, pc.nombre LIMIT 50
            """
            rows = c.execute(sql, params).fetchall()
            electores = []
            for r in rows:
                electores.append({
                    "cedula": r[0], "apellido": str(r[1] or ''), "nombre": str(r[2] or ''),
                    "mesa": int(r[3] or 0), "orden": int(r[4] or 0),
                    "nombreCompleto": f"{r[2] or ''} {r[1] or ''}".strip(),
                    "departamento": str(r[5] or ''),
                    "distrito": str(r[6] or ''),
                    "zona": str(r[7] or ''),
                    "local": str(r[8] or '')
                })
            return {"success": True, "electores": electores, "total": len(electores), "solo_no_votaron": solo_no_votaron}

        if action == "mis_posibles":
            dc = normalizar_cedula(dirigente or '')
            if not dc:
                return {"success": False, "error": "Dirigente requerido"}
            rows = c.execute("""
                SELECT pv.id, pv.votante_cedula, pv.votante_nombre, pv.votante_apellido,
                       COALESCE(NULLIF(pv.votante_mesa,0), NULLIF(pad.mesa,0)) AS votante_mesa,
                       COALESCE(NULLIF(pv.votante_orden,0), NULLIF(pad.orden,0)) AS votante_orden,
                       pv.status,
                       COALESCE(NULLIF(pad.departamento_nombre,''),
                                NULLIF(NULLIF(pv.votante_departamento,''),'0'),
                                CASE WHEN COALESCE(pad.depart,0) > 0 THEN CAST(pad.depart AS TEXT) END) AS votante_departamento,
                       COALESCE(NULLIF(pad.distrito_nombre,''),
                                NULLIF(NULLIF(pv.votante_distrito,''),'0'),
                                CASE WHEN COALESCE(pad.distrito,0) > 0 THEN CAST(pad.distrito AS TEXT) END) AS votante_distrito,
                       COALESCE(NULLIF(pad.zona_nombre,''), NULLIF(NULLIF(pv.votante_zona,''),'0')) AS votante_zona,
                       pv.creado, pv.actualizado, pv.confirmado_en, pv.telefono,
                       pad.local_nombre, pad.direccion,
                       (SELECT sr.hora_recogida FROM solicitudes_recogida sr
                        WHERE sr.votante_cedula = pv.votante_cedula
                        ORDER BY sr.created_at DESC LIMIT 1) AS hora_recogida,
                       (SELECT sr.created_at FROM solicitudes_recogida sr
                        WHERE sr.votante_cedula = pv.votante_cedula
                        ORDER BY sr.created_at DESC LIMIT 1) AS fecha_recogida,
                       (SELECT d.nombre FROM viajes v
                        JOIN transportes t ON t.id = v.transporte_id
                        JOIN dirigentes d ON d.cedula = v.cedula_conductor
                        WHERE v.votante_cedula = pv.votante_cedula
                        ORDER BY v.creado DESC LIMIT 1) AS conductor_nombre
                FROM posible_votos pv
                LEFT JOIN padron2026_completo pad ON pad.cedula = pv.votante_cedula
                WHERE pv.dirigente_cedula = ?
                ORDER BY pv.status, pv.creado DESC
            """, (dc,)).fetchall()
            cols = ["id","votante_cedula","votante_nombre","votante_apellido",
                    "votante_mesa","votante_orden","status",
                    "votante_departamento","votante_distrito","votante_zona",
                    "creado","actualizado","confirmado_en","telefono","local_nombre","direccion",
                    "hora_recogida","fecha_recogida","conductor_nombre"]
            items = [row_to_dict(r, cols) for r in rows]
            # Candidato(s) destinados a cada voto, uno por cargo (Intendente Y Concejal, etc.)
            if items:
                ids = [it["id"] for it in items]
                ph = ','.join('?' * len(ids))
                cand_rows = c.execute(f"""
                    SELECT pvc.posible_voto_id, cnd.id, cnd.nombre, cnd.cargo
                    FROM posible_voto_candidatos pvc JOIN candidatos cnd ON cnd.id = pvc.candidato_id
                    WHERE pvc.posible_voto_id IN ({ph})
                """, ids).fetchall()
                por_voto = {}
                for vid, cid, cnom, ccargo in cand_rows:
                    por_voto.setdefault(vid, []).append({"candidato_id": cid, "nombre": cnom, "cargo": ccargo})
                for it in items:
                    it["candidatos"] = por_voto.get(it["id"], [])
            resumen = {"posible": 0, "buscar": 0, "vendra_solo": 0, "no_responde": 0, "confirmado": 0}
            for it in items:
                s = it["status"]
                if s in resumen: resumen[s] += 1
                else: resumen[s] = 1
            return {"success": True, "items": items, "total": len(items), "resumen": resumen}

        if action == "mis_locales_votos":
            # Locales electorales donde el dirigente tiene votos cargados (posible_votos
            # cruzado con el padron por cedula), para poder mostrarle "Mi Local" directo
            # en el local que le corresponde en vez de un buscador nacional.
            # Se identifica cada local por su combinacion real distrito+seccional+local
            # (NO por el nombre: en este padron el nombre del local de votacion NO es
            # unico, se repite para cientos de sitios distintos del pais, asi que agrupar
            # por nombre mezclaria electores de locales que no tienen nada que ver).
            dc = normalizar_cedula(dirigente or cedula or '')
            if not dc:
                return {"success": False, "error": "Dirigente requerido"}
            rows = c.execute("""
                SELECT pad.distrito, pad.distrito_nombre, pad.sec_loc, pad.local, pad.local_nombre,
                       COUNT(*) as votos
                FROM posible_votos pv
                JOIN padron2026_completo pad ON pad.cedula = pv.votante_cedula
                WHERE pv.dirigente_cedula = ? AND pad.local != 0
                GROUP BY pad.distrito, pad.sec_loc, pad.local
                ORDER BY votos DESC
            """, (dc,)).fetchall()
            locales = [{"distrito": r[0], "distrito_nombre": r[1], "sec_loc": r[2], "local": r[3],
                        "local_nombre": r[4] or f"Local {r[3]}", "votos": r[5]} for r in rows]
            return {"success": True, "locales": locales}

        if action == "mis_subdirigentes":
            # Sub-dirigentes reclutados por este dirigente (dirigentes.creado_por_cedula),
            # con su rendimiento (votantes cargados/confirmados) y el local electoral que
            # se les haya delegado, para que el dirigente pueda seguir a su equipo.
            dc = normalizar_cedula(dirigente or cedula or '')
            if not dc:
                return {"success": False, "error": "Dirigente requerido"}
            rows = c.execute("""
                SELECT d.cedula, d.nombre, d.activo, d.telefono,
                       d.local_distrito, d.local_sec_loc, d.local_local, d.local_nombre,
                       (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula = d.cedula) as total_votantes,
                       (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula = d.cedula AND pv.status = 'confirmado') as confirmados
                FROM dirigentes d
                WHERE d.creado_por_cedula = ?
                ORDER BY d.nombre
            """, (dc,)).fetchall()
            subdirigentes = [{
                "cedula": r[0], "nombre": r[1], "activo": bool(r[2]), "telefono": r[3],
                "local_distrito": r[4], "local_sec_loc": r[5], "local_local": r[6], "local_nombre": r[7],
                "total_votantes": r[8], "confirmados": r[9],
                "cumplimiento": round((r[9] / r[8]) * 100) if r[8] else 0
            } for r in rows]
            return {"success": True, "subdirigentes": subdirigentes}

        if action == "local_coordenadas":
            # Ubicacion marcada a mano (GPS) de un local electoral, identificado por su
            # combinacion real distrito+seccional+local.
            distrito = normalizar_texto(distrito_filtro or '')
            sec_loc = normalizar_texto(sec_loc_filtro or '')
            local = normalizar_texto(local_filtro or '')
            if not distrito or not sec_loc or not local:
                return {"success": False, "error": "Local requerido"}
            row = c.execute(
                "SELECT lat, lng, actualizado FROM locales_coordenadas WHERE distrito=? AND sec_loc=? AND local=?",
                (distrito, sec_loc, local)).fetchone()
            if not row:
                return {"success": False, "error": "Sin ubicación marcada"}
            return {"success": True, "lat": row[0], "lng": row[1], "actualizado": row[2]}

        if action == "votos_seguros_pendientes":
            try:
                # Filters: use mesa as departamento_id, orden as distrito_id
                dpto_id = mesa if mesa else None
                dist_id = int(orden) if orden and str(orden).isdigit() else None

                base = """
                    SELECT dv.votante_cedula, dv.votante_nombre, dv.votante_mesa, dv.votante_orden,
                           d.cedula as dirigente_cedula, d.nombre as dirigente_nombre, d.tipo as dirigente_tipo,
                           COALESCE(dv.fecha_asignacion, '') as fecha_asignacion
                    FROM dirigente_votantes dv
                    JOIN dirigentes d ON dv.dirigente_cedula = d.cedula
                    JOIN padron2026_completo pc ON dv.votante_cedula = pc.cedula
                    WHERE dv.activo = 1
                      AND pc.vinculo = 'ANR2026'
                      AND dv.votante_cedula NOT IN (
                          SELECT cedula FROM registros WHERE estado='voto'
                      )
                      AND dv.votante_cedula NOT IN (
                          SELECT cedula FROM no_voto
                      )
                """
                params = {}
                if dpto_id:
                    base += " AND pc.depart = :dpto"
                    params["dpto"] = int(dpto_id)
                if dist_id:
                    base += " AND pc.distrito = :dist"
                    params["dist"] = int(dist_id)
                base += " ORDER BY d.nombre, dv.votante_nombre"

                rows = c.execute(base, params).fetchall()
                cols = ["votante_cedula", "votante_nombre", "votante_mesa", "votante_orden",
                        "dirigente_cedula", "dirigente_nombre", "dirigente_tipo", "fecha_asignacion"]
                pendientes = [row_to_dict(r, cols) for r in rows]
                # Also get summary by dirigente
                by_dirigente = {}
                for p in pendientes:
                    key = p["dirigente_cedula"]
                    if key not in by_dirigente:
                        by_dirigente[key] = {"cedula": key, "nombre": p["dirigente_nombre"], "tipo": p["dirigente_tipo"], "total": 0, "pendientes": []}
                    by_dirigente[key]["total"] += 1
                    by_dirigente[key]["pendientes"].append(p)
                return {
                    "pendientes": pendientes,
                    "total": len(pendientes),
                    "por_dirigente": [v for v in by_dirigente.values()]
                }
            except Exception as e:
                return {"pendientes": [], "total": 0, "por_dirigente": [], "error": str(e)}

        if action == "login":
            ced = normalizar_cedula(cedula or '')
            pw = normalizar_texto(x_password or '')
            ip_cliente = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host if hasattr(request, 'client') and request.client else ''
            ua_cliente = request.headers.get("user-agent", "")
            if not ced or not pw:
                return {"success": False, "error": "Cédula y contraseña requeridas"}
            # Usar autenticación unificada
            try:
                usuario = _autenticar_unificado(ced, pw, conn, ip=ip_cliente, user_agent=ua_cliente)
            except:
                usuario = None
            if not usuario:
                return {"success": False, "error": "Credenciales inválidas o usuario inactivo"}
            # Asegurar nivel_index para compatibilidad
            niveles_orden = ['conductor', 'dirigente', 'seccional', 'distrital', 'departamental', 'nacional', 'master',
                             'general', 'departamental', 'municipal', 'pc']
            try:
                idx = niveles_orden.index(usuario["nivel"])
            except:
                idx = -1
            usuario["nivel_index"] = idx
            return {"success": True, "usuario": usuario}

        if action == "dashboard":
            usuario_dashboard = _require_session_nivel(
                conn, request.headers.get("x-session-id", ""), 'dirigente'
            )
            nivel_dashboard = usuario_dashboard.get("nivel", "")
            ced_sesion = normalizar_cedula(usuario_dashboard.get("cedula", ""))
            alcance = _alcance_geografico_cliente(conn, ced_sesion) if ced_sesion else None
            alcance_global = nivel_dashboard in ("master", "nacional")
            filtros_geo_solicitados = any((distrito_filtro, sec_loc_filtro, local_filtro, local_nombre_filtro))
            if alcance_global:
                alcance = None
                scope_geo = []
                scope_geo_params = []
            elif alcance is not None:
                if filtros_geo_solicitados:
                    raise HTTPException(status_code=403, detail="El filtro geográfico excede el ámbito de la cuenta")
                if not alcance.get("unidad_ids"):
                    raise HTTPException(status_code=403, detail="La cuenta no tiene unidades territoriales asignadas")
                scope_geo = []
                scope_geo_params = []
            elif nivel_dashboard in ("departamental", "distrital", "seccional"):
                usuario_geo = c.execute(
                    "SELECT departamento_id, distrito_id FROM usuarios WHERE cedula=? AND activo=1",
                    (ced_sesion,),
                ).fetchone()
                if not usuario_geo or not usuario_geo[0]:
                    raise HTTPException(status_code=403, detail="La cuenta no tiene ámbito geográfico configurado")
                scope_geo = ["depart=?"]
                scope_geo_params = [usuario_geo[0]]
                if nivel_dashboard in ("distrital", "seccional"):
                    distrito_geo = c.execute(
                        "SELECT cod_dist FROM distritos WHERE id=? AND departamento_id=?",
                        (usuario_geo[1], usuario_geo[0]),
                    ).fetchone() if usuario_geo[1] else None
                    if not distrito_geo or distrito_geo[0] is None:
                        raise HTTPException(status_code=403, detail="La cuenta no tiene distrito válido configurado")
                    scope_geo.append("distrito=?")
                    scope_geo_params.append(distrito_geo[0])
            else:
                raise HTTPException(status_code=403, detail="La cuenta no tiene ámbito territorial autorizado")

            def safe_count(query, params=()):
                try: return c.execute(query, params).fetchone()[0] or 0
                except: return 0

            # Si la peticion viene de un cliente (o su dirigente) con ambito propio
            # (seccional/municipal/departamental/pc), acotar "Electores" y "Mesas" a lo
            # que realmente abarca ese cliente, en vez de mostrar el padron nacional completo
            # a todo el mundo por igual.
            mesas_alcance = None

            # El filtro nunca reemplaza el ámbito de la sesión. Las cuentas globales pueden
            # elegir cualquier territorio; los niveles legacy solo pueden acotar su ámbito.
            filtro_geo = None
            if alcance_global and local_nombre_filtro:
                # Filtro por nombre de local (no por distrito/seccional/local numericos):
                # un mismo local fisico puede tener votantes con distrito/sec_loc
                # inconsistentes en el padron, pero el nombre del local es lo que
                # efectivamente identifica el sitio para el dirigente ("Mi Local" unificado).
                # FIX: SQL injection - where_geo contiene solo columnas fijas con placeholders ?,
                # los valores del usuario se parametrizan vía params_geo.
                where_geo = ["local_nombre=?"]
                params_geo = [local_nombre_filtro]
                sql_geo = f"SELECT COUNT(*), (SELECT GROUP_CONCAT(DISTINCT mesa) FROM padron2026_completo WHERE {' AND '.join(where_geo)} AND mesa>0) FROM padron2026_completo WHERE {' AND '.join(where_geo)}"
                fila = c.execute(sql_geo, params_geo + params_geo).fetchone()
                total_electores_geo = fila[0] or 0
                mesas_geo = [int(x) for x in (fila[1] or '').split(',') if x]
                filtro_geo = {"total_electores": total_electores_geo, "mesas": mesas_geo}
            elif alcance_global and distrito_filtro:
                where_geo = ["distrito=?"]
                params_geo = [normalizar_texto(distrito_filtro)]
                if sec_loc_filtro:
                    where_geo.append("sec_loc=?")
                    params_geo.append(normalizar_texto(sec_loc_filtro))
                if local_filtro:
                    where_geo.append("local=?")
                    params_geo.append(normalizar_texto(local_filtro))
                sql_geo = f"SELECT COUNT(*), (SELECT GROUP_CONCAT(DISTINCT mesa) FROM padron2026_completo WHERE {' AND '.join(where_geo)} AND mesa>0) FROM padron2026_completo WHERE {' AND '.join(where_geo)}"
                fila = c.execute(sql_geo, params_geo + params_geo).fetchone()
                total_electores_geo = fila[0] or 0
                mesas_geo = [int(x) for x in (fila[1] or '').split(',') if x]
                filtro_geo = {"total_electores": total_electores_geo, "mesas": mesas_geo}
            elif scope_geo:
                where_geo = list(scope_geo)
                params_geo = list(scope_geo_params)
                if distrito_filtro:
                    distrito_elegido = normalizar_texto(distrito_filtro)
                    if nivel_dashboard in ("distrital", "seccional") and distrito_elegido != str(scope_geo_params[-1]):
                        raise HTTPException(status_code=403, detail="El distrito seleccionado está fuera del ámbito de la cuenta")
                    where_geo.append("distrito=?")
                    params_geo.append(distrito_elegido)
                if sec_loc_filtro:
                    where_geo.append("sec_loc=?")
                    params_geo.append(normalizar_texto(sec_loc_filtro))
                if local_filtro:
                    where_geo.append("local=?")
                    params_geo.append(normalizar_texto(local_filtro))
                if local_nombre_filtro:
                    where_geo.append("local_nombre=?")
                    params_geo.append(normalizar_texto(local_nombre_filtro))
                sql_geo = f"SELECT COUNT(*), (SELECT GROUP_CONCAT(DISTINCT mesa) FROM padron2026_completo WHERE {' AND '.join(where_geo)} AND mesa>0) FROM padron2026_completo WHERE {' AND '.join(where_geo)}"
                fila = c.execute(sql_geo, params_geo + params_geo).fetchone()
                total_electores_geo = fila[0] or 0
                mesas_geo = [int(x) for x in (fila[1] or '').split(',') if x]
                filtro_geo = {"total_electores": total_electores_geo, "mesas": mesas_geo}

            if filtro_geo is not None:
                total_electores = filtro_geo["total_electores"]
                mesas_alcance = filtro_geo["mesas"]
                total_mesas_padron = len(mesas_alcance)
                total_dirigentes = safe_count("SELECT COUNT(*) FROM dirigentes WHERE activo=1")
            elif alcance is not None and alcance.get('unidad_ids'):
                ph = ','.join('?' * len(alcance['unidad_ids']))
                total_electores = safe_count(
                    f"SELECT COUNT(*) FROM afiliados_partido WHERE unidad_organizacion_id IN ({ph})",
                    alcance['unidad_ids'])
                mesas_alcance = [int(r[0]) for r in c.execute(
                    f"SELECT DISTINCT mesa FROM afiliados_partido WHERE unidad_organizacion_id IN ({ph})",
                    alcance['unidad_ids']).fetchall() if r[0] and int(r[0]) > 0]
                total_mesas_padron = len(mesas_alcance)
                total_dirigentes = safe_count(
                    "SELECT COUNT(*) FROM dirigentes WHERE activo=1 AND cliente_cedula=?", (ced_sesion,))
            elif alcance is not None:
                total_electores = 0
                mesas_alcance = []
                total_mesas_padron = 0
                total_dirigentes = 0
            else:
                total_electores = contar_padron_completo(c)
                total_mesas_padron = safe_count("SELECT COUNT(DISTINCT mesa) FROM padron2026_completo WHERE mesa>0")
                total_dirigentes = safe_count("SELECT COUNT(*) FROM dirigentes WHERE activo=1")

            # Filtrar cada registro por el elector y su territorio, no solo por el
            # número de mesa: los números se repiten entre distritos y mezclarían datos.
            votantes_scope_sql = None
            votantes_scope_params = []
            if filtro_geo is not None:
                votantes_scope_sql = f"SELECT cedula FROM padron2026_completo WHERE {' AND '.join(where_geo)}"
                votantes_scope_params = list(params_geo)
            elif alcance is not None and alcance.get('unidad_ids'):
                ph_scope = ','.join('?' * len(alcance['unidad_ids']))
                votantes_scope_sql = f"SELECT DISTINCT cedula FROM afiliados_partido WHERE unidad_organizacion_id IN ({ph_scope})"
                votantes_scope_params = list(alcance['unidad_ids'])

            def count_dashboard(sql):
                params_scope = []
                if votantes_scope_sql:
                    sql += f" AND cedula IN ({votantes_scope_sql})"
                    params_scope = votantes_scope_params
                return safe_count(sql, params_scope)

            total_votos = count_dashboard("SELECT COUNT(*) FROM registros WHERE estado='voto' AND mesa>0")
            total_no_votos = count_dashboard("SELECT COUNT(*) FROM no_voto WHERE mesa>0")
            total_ausentes = count_dashboard("SELECT COUNT(*) FROM registros WHERE estado='ausente' AND mesa>0")
            total_controversias = count_dashboard("SELECT COUNT(*) FROM registros WHERE estado='controversia' AND mesa>0")
            total_mesas_con_datos = count_dashboard("SELECT COUNT(DISTINCT mesa) FROM registros WHERE mesa>0")
            total_usuarios = safe_count("SELECT COUNT(*) FROM usuarios WHERE activo=1")
            # Recent registrations (acotado a mesas_alcance cuando hay filtro geo/cliente,
            # para que "Actividad Reciente" siga al local/ambito elegido y no muestre
            # siempre el pais entero)
            try:
                sql_recent = "SELECT timestamp, cedula, nombre, mesa, orden, estado FROM registros WHERE mesa>0 AND COALESCE(TRIM(nombre),'')<>''"
                params_recent = []
                if votantes_scope_sql:
                    sql_recent += f" AND cedula IN ({votantes_scope_sql})"
                    params_recent.extend(votantes_scope_params)
                sql_recent += " ORDER BY timestamp DESC LIMIT 20"
                recent = c.execute(sql_recent, params_recent).fetchall()
                cols_r = ["timestamp", "cedula", "nombre", "mesa", "orden", "estado"]
                recientes = [row_to_dict(r, cols_r) for r in recent]
            except:
                recientes = []
            # Top mesas by activity (idem: acotado a mesas_alcance si corresponde)
            try:
                sql_top = "SELECT mesa, COUNT(*) as total, SUM(CASE WHEN estado='voto' THEN 1 ELSE 0 END) as votos FROM registros WHERE mesa>0"
                params_top = []
                if votantes_scope_sql:
                    sql_top += f" AND cedula IN ({votantes_scope_sql})"
                    params_top.extend(votantes_scope_params)
                sql_top += " GROUP BY mesa ORDER BY total DESC LIMIT 15"
                top_mesas = c.execute(sql_top, params_top).fetchall()
                top = [{"mesa": r[0], "total": r[1], "votos": r[2]} for r in top_mesas]
            except:
                top = []
            # Party historical summary
            try:
                partidos_hist = c.execute("SELECT SUM(mesas), SUM(electores) FROM historial_partidos WHERE anio=2026").fetchone()
                hm = partidos_hist[0] or 0 if partidos_hist else 0
                he = partidos_hist[1] or 0 if partidos_hist else 0
            except:
                hm = he = 0
            pct = f"{((total_votos/total_electores)*100):.1f}" if total_electores > 0 else "0.0"
            return {
                "total_electores": total_electores, "total_votos": total_votos,
                "total_no_votos": total_no_votos, "total_ausentes": total_ausentes,
                "total_controversias": total_controversias, "total_dirigentes": total_dirigentes,
                "total_mesas_con_datos": total_mesas_con_datos, "total_mesas_padron": total_mesas_padron,
                "total_usuarios": total_usuarios, "participacion": pct + "%",
                "historial_mesas": hm, "historial_electores": he,
                "recientes": recientes, "top_mesas": top,
                "filtro_activo": bool(filtro_geo)
            }

        if action == "historial_partidos":
            anio = mesa or 2026
            rows = c.execute("SELECT id, nombre, tipo, mesas, electores, anio, eleccion, created_at FROM historial_partidos WHERE anio=? ORDER BY electores DESC", (anio,)).fetchall()
            cols = ["id", "nombre", "tipo", "mesas", "electores", "anio", "eleccion", "created_at"]
            partidos = [row_to_dict(r, cols) for r in rows]
            total_mesas = sum(p["mesas"] for p in partidos)
            total_electores = sum(p["electores"] for p in partidos)
            return {"partidos": partidos, "total": len(partidos), "total_mesas": total_mesas, "total_electores": total_electores}

        if action == "usuarios":
            rows = c.execute("SELECT cedula, nombre, contrasena, nivel, departamento_id, distrito_id, activo FROM usuarios ORDER BY nivel, nombre").fetchall()
            usuarios = [{"cedula": r[0], "nombre": r[1], "nivel": r[3], "departamento_id": r[4], "distrito_id": r[5], "activo": r[6]} for r in rows]
            return {"usuarios": usuarios, "total": len(usuarios)}

        if action == "clientes":
            usuario_clientes = _authenticate(cedula or "", x_password or "", conn=conn)
            if not usuario_clientes:
                raise HTTPException(status_code=401, detail="Autenticación requerida")
            _check_nivel(usuario_clientes, 'master')
            rows = c.execute("""
                SELECT cl.cedula, cl.nombre, cl.contrasena, cl.tipo, COALESCE(cl.categoria, 'partido'),
                       COALESCE(cl.css_tema, 'neutral'),
                       cl.departamento_id, cl.distrito_id, cl.candidato_nombre, cl.candidato_cargo, cl.locales, cl.activo,
                       cl.partido_id, p.sigla, p.color_principal_hex, COALESCE(cl.color_propio_hex, ''),
                       COALESCE(cl.plan_visibilidad, 'propio'),
                       (SELECT COUNT(*) FROM main.dirigentes d WHERE d.cliente_cedula = cl.cedula),
                       (SELECT COUNT(*) FROM main.registros r WHERE r.cliente_cedula = cl.cedula),
                       cl.fecha_inicio_servicio, cl.fecha_fin_servicio
                FROM main.clientes cl LEFT JOIN partidos p ON p.id = cl.partido_id
                ORDER BY cl.tipo, cl.nombre
            """).fetchall()
            clientes = [{
                "cedula": r[0],
                "nombre": r[1],
                "tipo": r[3],
                "categoria": r[4],
                "css_tema": r[5],
                "departamento_id": r[6],
                "distrito_id": r[7],
                "candidato_nombre": r[8],
                "candidato_cargo": r[9],
                "locales": r[10],
                "activo": r[11],
                "partido_id": r[12], "partido_sigla": r[13] or "", "partido_color": r[14] or "",
                "color_propio_hex": r[15], "plan_visibilidad": r[16],
                "total_dirigentes": r[17], "total_votos": r[18],
                "fecha_inicio_servicio": r[19], "fecha_fin_servicio": r[20]
            } for r in rows]
            dirs = [{"cedula": r[0], "nombre": r[1], "cliente_cedula": r[2]}
                    for r in c.execute("SELECT cedula, nombre, cliente_cedula FROM main.dirigentes ORDER BY nombre").fetchall()]
            # Un cliente puede tener varios candidatos (candidatos.cliente_cedula)
            cands = [{"id": r[0], "nombre": r[1], "cargo": r[2], "lista_nro": r[3], "lista_nombre": r[4],
                      "departamento_id": r[5], "distrito_id": r[6], "cliente_cedula": r[7]}
                     for r in c.execute("""SELECT id, nombre, cargo, lista_nro, lista_nombre, departamento_id, distrito_id, cliente_cedula
                                           FROM candidatos WHERE COALESCE(activo,1)=1 ORDER BY nombre""").fetchall()]
            por_cliente = {}
            for x in cands:
                if x["cliente_cedula"]:
                    por_cliente[x["cliente_cedula"]] = por_cliente.get(x["cliente_cedula"], 0) + 1
            for cl in clientes:
                cl["total_candidatos"] = por_cliente.get(cl["cedula"], 0)
            return {"clientes": clientes, "total": len(clientes), "dirigentes": dirs, "candidatos": cands}

        if action == "transportes":
            rows = c.execute("SELECT id, cedula, nombre, tipo, placa, telefono, capacidad, estado, seccional, created_at FROM transportes ORDER BY nombre").fetchall()
            cols = ["id","cedula","nombre","tipo","placa","telefono","capacidad","estado","seccional","created_at"]
            items = [row_to_dict(r, cols) for r in rows]
            cedulas_ya_listadas = {it["cedula"] for it in items if it["cedula"]}
            for it in items:
                it["es_propio_dirigente"] = bool(it.get("cedula")) and it["cedula"] in {
                    r[0] for r in c.execute("SELECT cedula FROM dirigentes WHERE tiene_vehiculo_propio=1").fetchall()}
            # Dirigentes que avisaron que tienen vehiculo propio PERO todavia no tienen su
            # fila real en 'transportes' (cuentas viejas, de antes de que /api/dirigente/movilidad
            # empezara a crearla sola): se listan igual con un id sintetico "dirigente-<cedula>",
            # solo de forma, para que logistica los vea aunque no puedan operar en viajes/optimizar.
            propios = c.execute("""
                SELECT d.cedula, d.nombre, d.telefono, d.ubicacion_lat, d.ubicacion_lng
                FROM dirigentes d WHERE d.tiene_vehiculo_propio=1 AND d.activo=1
            """).fetchall()
            propios = [p for p in propios if p[0] not in cedulas_ya_listadas]
            for ced_d, nom_d, tel_d, lat_d, lng_d in propios:
                items.append({
                    "id": f"dirigente-{ced_d}", "cedula": ced_d, "nombre": f"{nom_d} (vehículo propio)",
                    "tipo": "propio_dirigente", "placa": "", "telefono": tel_d or '',
                    "capacidad": None, "estado": "disponible", "seccional": None,
                    "created_at": None, "es_propio_dirigente": True,
                    "ubicacion_lat": lat_d, "ubicacion_lng": lng_d,
                })
            return {"success": True, "transportes": items, "total": len(items)}

        if action == "ubicaciones":
            transporte_id = mesa  # reuse mesa param
            if transporte_id:
                rows = c.execute("SELECT id, transporte_id, cedula, lat, lng, timestamp, velocidad, direccion FROM ubicaciones_gps WHERE transporte_id=? ORDER BY timestamp DESC LIMIT 50", (transporte_id,)).fetchall()
            else:
                # Return latest location per transport
                rows = c.execute("""
                    SELECT u.id, u.transporte_id, u.cedula, u.lat, u.lng, u.timestamp, u.velocidad, u.direccion
                    FROM ubicaciones_gps u
                    INNER JOIN (SELECT transporte_id, MAX(timestamp) as maxts FROM ubicaciones_gps GROUP BY transporte_id) latest
                    ON u.transporte_id = latest.transporte_id AND u.timestamp = latest.maxts
                    ORDER BY u.timestamp DESC
                """).fetchall()
            cols = ["id","transporte_id","cedula","lat","lng","timestamp","velocidad","direccion"]
            items = [row_to_dict(r, cols) for r in rows]
            return {"success": True, "ubicaciones": items, "total": len(items)}

        if action == "rutas":
            t_id = mesa  # reuse mesa param as transporte_id filter
            if t_id:
                rows = c.execute("SELECT id, transporte_id, origen, destino, estado, salida, llegada, observacion, created_at, cedula_conductor FROM rutas WHERE transporte_id=? ORDER BY created_at DESC", (t_id,)).fetchall()
            else:
                rows = c.execute("SELECT id, transporte_id, origen, destino, estado, salida, llegada, observacion, created_at, cedula_conductor FROM rutas ORDER BY created_at DESC").fetchall()
            cols = ["id","transporte_id","origen","destino","estado","salida","llegada","observacion","created_at","cedula_conductor"]
            items = [row_to_dict(r, cols) for r in rows]
            return {"success": True, "rutas": items, "total": len(items)}

        if action == "veedores":
            filtro_mesa = mesa
            if filtro_mesa:
                rows = c.execute("SELECT id, id_veedor, nombre_veedor, cedula_veedor, seccional_id, escuela_id, mesa_id, telefono, estado, created_at FROM veedores_mesa WHERE mesa_id=? ORDER BY nombre_veedor", (filtro_mesa,)).fetchall()
            else:
                rows = c.execute("SELECT id, id_veedor, nombre_veedor, cedula_veedor, seccional_id, escuela_id, mesa_id, telefono, estado, created_at FROM veedores_mesa ORDER BY nombre_veedor").fetchall()
            cols = ["id","id_veedor","nombre_veedor","cedula_veedor","seccional_id","escuela_id","mesa_id","telefono","estado","created_at"]
            items = [row_to_dict(r, cols) for r in rows]
            return {"success": True, "veedores": items, "total": len(items)}

        if action == "participacion":
            v_id = dirigente  # reuse dirigente param as veedor_id filter
            m_id = mesa
            if v_id:
                rows = c.execute("SELECT id, veedor_id, votante_cedula, votante_nombre, mesa_id, seccional_id, escuela_id, confirmado_por_veedor, confirmado_por_votante, double_check, timestamp_confirmacion, hash_validacion FROM registro_participacion WHERE veedor_id=? ORDER BY timestamp_confirmacion DESC", (v_id,)).fetchall()
            elif m_id:
                rows = c.execute("SELECT id, veedor_id, votante_cedula, votante_nombre, mesa_id, seccional_id, escuela_id, confirmado_por_veedor, confirmado_por_votante, double_check, timestamp_confirmacion, hash_validacion FROM registro_participacion WHERE mesa_id=? ORDER BY timestamp_confirmacion DESC", (m_id,)).fetchall()
            else:
                rows = c.execute("SELECT id, veedor_id, votante_cedula, votante_nombre, mesa_id, seccional_id, escuela_id, confirmado_por_veedor, confirmado_por_votante, double_check, timestamp_confirmacion, hash_validacion FROM registro_participacion ORDER BY timestamp_confirmacion DESC LIMIT 100").fetchall()
            cols = ["id","veedor_id","votante_cedula","votante_nombre","mesa_id","seccional_id","escuela_id","confirmado_por_veedor","confirmado_por_votante","double_check","timestamp_confirmacion","hash_validacion"]
            items = [row_to_dict(r, cols) for r in rows]
            return {"success": True, "participacion": items, "total": len(items)}

        if action == "asistencia":
            fecha_filtro = orden  # reuse orden param as fecha (YYYY-MM-DD)
            if fecha_filtro:
                rows = c.execute("SELECT id, cedula, nombre, mesa, fecha, hora_ingreso, hora_salida, estado, observacion FROM asistencia_miembros WHERE fecha=? ORDER BY hora_ingreso", (fecha_filtro,)).fetchall()
            else:
                rows = c.execute("SELECT id, cedula, nombre, mesa, fecha, hora_ingreso, hora_salida, estado, observacion FROM asistencia_miembros ORDER BY fecha DESC, hora_ingreso LIMIT 100").fetchall()
            cols = ["id","cedula","nombre","mesa","fecha","hora_ingreso","hora_salida","estado","observacion"]
            items = [row_to_dict(r, cols) for r in rows]
            return {"success": True, "asistencia": items, "total": len(items)}

        if action == "padron_unificado":
            filtro_mesa = mesa
            filtro_dirigente = normalizar_texto(dirigente or '') if dirigente else None
            registros_rows = c.execute("SELECT cedula, nombre, mesa, orden, estado, dirigente, dirigenteNombre, timestamp FROM registros ORDER BY timestamp DESC").fetchall()
            no_voto_rows = c.execute("SELECT cedula, timestamp, motivo, observacion FROM no_voto ORDER BY timestamp DESC").fetchall()
            asig_rows = c.execute("SELECT cedula, dirigente_nombre FROM asignacion_dirigentes").fetchall()
            asig_map = {r[0]: r[1] for r in asig_rows}

            votos_por_cedula = {}
            for r in registros_rows:
                ced = normalizar_cedula(r[0])
                if not ced: continue
                est = str(r[4] or '').lower()
                if est not in ("voto", "ausente"): continue
                ts = r[7] or ''
                if ced not in votos_por_cedula or ts > votos_por_cedula[ced]["timestamp"]:
                    votos_por_cedula[ced] = {"estado": est, "timestamp": ts, "dirigenteCedula": str(r[5] or ''), "dirigenteNombre": str(r[6] or '')}

            no_votos_por_cedula = {}
            for r in no_voto_rows:
                ced = normalizar_cedula(r[0])
                if not ced: continue
                ts = r[1] or ''
                if ced not in no_votos_por_cedula or ts > no_votos_por_cedula[ced]["timestamp"]:
                    no_votos_por_cedula[ced] = {"timestamp": ts, "motivo": str(r[2] or ''), "observacion": str(r[3] or '')}

            # Without a mesa filter, limit to first 5000 to avoid timeout
            limit_clause = "" if filtro_mesa else " LIMIT 5000"
            # padron2026_completo con mesa/orden (ANR)
            padron_rows = c.execute("""SELECT cedula, apellido, nombre, mesa, orden
                                        FROM padron2026_completo
                                        WHERE mesa>0
                                        ORDER BY mesa, orden""" + limit_clause).fetchall()
            electores = []
            dirigentes_set = {}
            mesas_set = set()

            for r in padron_rows:
                ced = normalizar_cedula(r[0])
                if not ced: continue
                mesa_val = int(r[3] or 0)
                if filtro_mesa and mesa_val != filtro_mesa: continue
                e = {
                    "cedula": ced, "apellido": str(r[1] or ''), "nombre": str(r[2] or ''),
                    "mesa": mesa_val, "orden": int(r[4] or 0),
                    "nombreCompleto": f"{r[2] or ''} {r[1] or ''}".strip(),
                    "estado": "sin_registro", "dirigenteCedula": "", "dirigenteNombre": "",
                    "dirigenteAsignado": asig_map.get(ced, ""), "timestamp": None
                }
                voto = votos_por_cedula.get(ced)
                nv = no_votos_por_cedula.get(ced)
                if voto:
                    e["estado"] = "voto"; e["dirigenteCedula"] = voto["dirigenteCedula"]
                    e["dirigenteNombre"] = voto["dirigenteNombre"]; e["timestamp"] = voto["timestamp"]
                elif nv:
                    e["estado"] = "no_voto"; e["timestamp"] = nv["timestamp"]
                    e["motivoNoVoto"] = nv["motivo"]; e["observacionNoVoto"] = nv["observacion"]
                if filtro_dirigente:
                    if filtro_dirigente.startswith("ASIG_"):
                        if filtro_dirigente[5:].lower() not in e["dirigenteAsignado"].lower(): continue
                    elif filtro_dirigente.lower() not in e["dirigenteNombre"].lower() and filtro_dirigente not in e["dirigenteCedula"]: continue
                electores.append(e)
                mesas_set.add(mesa_val)
                if e["dirigenteNombre"] and e["dirigenteCedula"]:
                    dirigentes_set[e["dirigenteCedula"]] = e["dirigenteNombre"]

            dirigentes_list = sorted([{"cedula": k, "nombre": v} for k, v in dirigentes_set.items()], key=lambda x: x["nombre"])
            resumen = {"voto": sum(1 for e in electores if e["estado"] == "voto"),
                       "no_voto": sum(1 for e in electores if e["estado"] == "no_voto"),
                       "sin_registro": sum(1 for e in electores if e["estado"] == "sin_registro")}
            return {"electores": electores, "total": len(electores), "dirigentes": dirigentes_list,
                    "mesas": sorted(mesas_set), "resumen": resumen}

        # ─── ESTRUCTURA GEOGRÁFICA ──────────────────────────────
        if action == "partidos_lista":
            rows = c.execute("SELECT id, sigla, nombre_oficial, color_principal_hex FROM partidos WHERE estado_juridico='Activo' ORDER BY sigla").fetchall()
            return {"success": True, "partidos": [{"id": r[0], "sigla": r[1], "nombre": r[2], "color": r[3]} for r in rows]}

        if action == "intendentes_por_distrito":
            did = request.query_params.get("distrito_id", "")
            pid = request.query_params.get("partido_id", "")
            if not did or not pid:
                return {"success": False, "error": "distrito_id y partido_id requeridos"}
            rows = c.execute("""
                SELECT ce.candidato_cedula, ce.candidato_nombre, ce.lista_nombre
                FROM candidatos_electos_internas ce
                WHERE ce.tipo_cargo='intendente' AND ce.distrito_id=? AND ce.partido_id=?
                ORDER BY ce.candidato_nombre
            """, (int(did), int(pid))).fetchall()
            return {"success": True, "intendentes": [{"cedula": r[0], "nombre": r[1], "lista": r[2]} for r in rows]}

        if action == "listas_por_partido":
            pid = request.query_params.get("partido_id", "")
            if not pid:
                return {"success": False, "error": "partido_id requerido"}
            rows = c.execute("""
                SELECT lp.numero_lista, lp.nombre_lista, lp.tipo_lista
                FROM listas_partido lp WHERE lp.partido_id=? AND lp.activo=1
                ORDER BY lp.numero_lista
            """, (int(pid),)).fetchall()
            return {"success": True, "listas": [{"numero": r[0], "nombre": r[1], "tipo": r[2]} for r in rows]}

        if action == "escuelas_electorales":
            did = request.query_params.get("distrito_id", "")
            if not did:
                return {"success": False, "error": "distrito_id requerido"}
            # Usar datos de mesas como proxy de escuelas
            rows = c.execute("""
                SELECT DISTINCT escuela, direccion, lat, lng
                FROM registros WHERE distrito_id=? AND escuela IS NOT NULL AND escuela != ''
            """, (int(did),)).fetchall()
            escuelas = [{"nombre": r[0], "direccion": r[1], "lat": r[2], "lng": r[3]} for r in rows if r[0]]
            return {"success": True, "escuelas": escuelas, "total": len(escuelas)}

        if action == "servicio_cliente":
            ced = normalizar_cedula(request.query_params.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cl = c.execute("""
                SELECT c.cedula, c.nombre, c.tipo, c.fecha_inicio_servicio, c.fecha_fin_servicio,
                       c.tipo_servicio, c.partido_id, c.lista_nro, c.lista_nombre,
                       p.sigla, p.color_principal_hex
                FROM clientes c
                LEFT JOIN partidos p ON c.partido_id = p.id
                WHERE c.cedula=?
            """, (ced,)).fetchone()
            if not cl:
                return {"success": False, "error": "Cliente no encontrado"}
            return {"success": True, "servicio": {
                "cedula": cl[0], "nombre": cl[1], "tipo_cliente": cl[2],
                "fecha_inicio": cl[3], "fecha_fin": cl[4], "tipo_servicio": cl[5],
                "partido_id": cl[6], "lista_nro": cl[7], "lista_nombre": cl[8],
                "partido_sigla": cl[9], "partido_color": cl[10]
            }}

        if action == "perfil_completo":
            ced = normalizar_cedula(request.query_params.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cl = c.execute("""
                SELECT c.cedula, c.nombre, c.apellido, c.email, c.tipo, c.categoria,
                       c.departamento_id, c.distrito_id, c.partido_id, c.intendente_cedula,
                       c.lista_nro, c.lista_nombre, c.candidato_nombre, c.candidato_cargo,
                       c.fecha_inicio_servicio, c.fecha_fin_servicio, c.tipo_servicio,
                       c.registro_completado, c.activo,
                       dep.nombre, d.nombre, p.sigla, p.color_principal_hex,
                       c.telefono, c.dominio, c.mensaje_publicitario, c.logo_url, c.branding_activo
                FROM clientes c
                LEFT JOIN departamentos dep ON c.departamento_id = dep.id
                LEFT JOIN distritos d ON c.distrito_id = d.id
                LEFT JOIN partidos p ON c.partido_id = p.id
                WHERE c.cedula=?
            """, (ced,)).fetchone()
            if not cl:
                return {"success": False, "error": "Cliente no encontrado"}
            return {"success": True, "perfil": {
                "cedula": cl[0], "nombre": cl[1], "apellido": cl[2], "email": cl[3],
                "tipo": cl[4], "categoria": cl[5],
                "departamento_id": cl[6], "distrito_id": cl[7],
                "partido_id": cl[8], "intendente_cedula": cl[9],
                "lista_nro": cl[10], "lista_nombre": cl[11],
                "candidato_nombre": cl[12], "candidato_cargo": cl[13],
                "fecha_inicio": cl[14], "fecha_fin": cl[15],
                "tipo_servicio": cl[16], "registro_completado": cl[17], "activo": cl[18],
                "departamento_nombre": cl[19], "distrito_nombre": cl[20],
                "partido_sigla": cl[21], "partido_color": cl[22],
                "telefono": cl[23], "dominio": cl[24],
                "mensaje_publicitario": cl[25], "logo_url": cl[26],
                "branding_activo": bool(cl[27])
            }}

        if action == "campana_resumen":
            ced = normalizar_cedula(request.query_params.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            cl = c.execute("SELECT partido_id, distrito_id, tipo FROM clientes WHERE cedula=?", (ced,)).fetchone()
            if not cl:
                return {"success": False, "error": "Cliente no encontrado"}
            partido_id, distrito_id, tipo_cliente = cl[0], cl[1], cl[2]
            stats = {}
            # Dirigentes asignados
            dirs = c.execute("SELECT COUNT(*) FROM dirigentes WHERE cliente_cedula=?", (ced,)).fetchone()
            stats['dirigentes'] = dirs[0] if dirs else 0
            # Posibles votos (via dirigentes vinculados a este cliente)
            pv = c.execute("""SELECT COUNT(*) FROM posible_votos pv
                JOIN dirigentes d ON pv.dirigente_cedula = d.cedula
                WHERE d.cliente_cedula=?""", (ced,)).fetchone()
            stats['posibles_votos'] = pv[0] if pv else 0
            pv_conf = c.execute("""SELECT COUNT(*) FROM posible_votos pv
                JOIN dirigentes d ON pv.dirigente_cedula = d.cedula
                WHERE d.cliente_cedula=? AND pv.status='confirmado'""", (ced,)).fetchone()
            stats['votos_confirmados'] = pv_conf[0] if pv_conf else 0
            # Solicitudes pendientes
            sols = c.execute("SELECT COUNT(*) FROM solicitudes_recogida WHERE estado='pendiente'").fetchone()
            stats['solicitudes_pendientes'] = sols[0] if sols else 0
            # Transportes
            trans = c.execute("SELECT COUNT(*) FROM transportes WHERE estado='disponible'").fetchone()
            stats['transportes_disponibles'] = trans[0] if trans else 0
            # PCs / Unidades
            if partido_id:
                unidades = c.execute("SELECT COUNT(*) FROM unidades_organizacion WHERE partido_id=? AND distrito_id=?", (partido_id, distrito_id)).fetchone()
                stats['unidades_distrito'] = unidades[0] if unidades else 0
            else:
                stats['unidades_distrito'] = 0
            # Personas que vieron su nombre/publicidad (consultas por su dominio)
            cons = c.execute("SELECT COUNT(*) FROM consultas_publicas WHERE candidato_cedula=?", (ced,)).fetchone()
            stats['consultas_recibidas'] = cons[0] if cons else 0
            return {"success": True, "stats": stats}

        return {"success": False, "error": "Unknown action"}
    finally:
        conn.close()

# ─── AUTH HELPERS ────────────────────────────────────────
def _cargar_roles_unificado(cedula, conn):
    """Carga todas las asignaciones_rol de un usuario, retorna lista de roles"""
    c = conn.cursor()
    rows = c.execute("""
        SELECT rol, nivel_sistema, tipo_cliente, dirigente_tipo,
               departamento_id, distrito_id, candidato_nombre, candidato_cargo, vehiculo_id
        FROM asignaciones_rol WHERE cedula=? AND activo=1
    """, (cedula,)).fetchall()
    roles = []
    for r in rows:
        rol_obj = {
            "rol": r[0],
            "nivel_sistema": r[1] or '',
            "tipo_cliente": r[2] or '',
            "dirigente_tipo": r[3] or '',
            "departamento_id": r[4],
            "distrito_id": r[5],
            "candidato_nombre": r[6] or '',
            "candidato_cargo": r[7] or '',
            "vehiculo_id": r[8]
        }
        roles.append(rol_obj)
    return roles

def _autenticar_unificado(cedula, password, conn=None, ip='', user_agent=''):
    """
    Autentica primero contra cuentas_usuario (unificado).
    Verifica bloqueo por intentos fallidos.
    Usa hash de contraseña con fallback a legacy.
    Crea sesión en caso de éxito.
    Registra intentos de login en auditoría.
    Retorna dict usuario con 'roles' (lista) y 'nivel' (primer rol para compat).
    """
    cerrar = False
    if conn is None:
        conn = get_connection()
        cerrar = True
    c = conn.cursor()
    ced = normalizar_cedula(cedula)
    pw = normalizar_texto(password)
    if not ced or not pw:
        if cerrar: conn.close()
        return None

    # Verificar bloqueo por intentos fallidos
    bloqueado, fallos = verificar_bloqueo(ced, conn)
    if bloqueado:
        log_auditoria(ced, '', 'login_bloqueado',
                      f'Cuenta bloqueada tras {fallos} intentos fallidos (ventana {VENTANA_BLOQUEO_MINUTOS}min)',
                      ip=ip, user_agent=user_agent, severidad='alta')
        if cerrar: conn.close()
        return None

    # 1) Intentar cuentas_usuario (unificado) con hash
    row = c.execute("SELECT cedula, nombre, contrasena, email, telefono, foto_url, requiere_cambio_clave FROM cuentas_usuario WHERE cedula=? AND activo=1", (ced,)).fetchone()
    if row:
        stored_pw = row[2] or ''
        if check_password(pw, stored_pw):
            roles = _cargar_roles_unificado(ced, conn)
            if not roles:
                registrar_intento_login(ced, False, ip, user_agent, conn)
                if cerrar: conn.close()
                return None
            primer_rol = roles[0]["rol"]
            # Crear sesión
            session_id = generar_session_id()
            c.execute("""INSERT INTO sesiones (id, cedula, rol_activo, ip, user_agent)
                VALUES (?,?,?,?,?)""", (session_id, ced, primer_rol, ip, user_agent))
            # Actualizar último acceso
            c.execute("UPDATE cuentas_usuario SET ultimo_acceso=datetime('now','localtime') WHERE cedula=?", (ced,))
            # Si la contraseña era legacy (plain text), migrar a hash
            if not stored_pw.startswith('$'):
                c.execute("UPDATE cuentas_usuario SET contrasena=? WHERE cedula=?", (hash_password(pw), ced))
            conn.commit()
            registrar_intento_login(ced, True, ip, user_agent, conn)
            log_auditoria(ced, row[1], 'login_exitoso',
                          f'Inicio de sesión ({primer_rol})', ip=ip, user_agent=user_agent, session_id=session_id)

            email_cuenta = row[3] or ''
            telefono_cuenta = row[4] or ''
            # Completar teléfono/email si quedaron vacíos en la cuenta unificada pero
            # sí están cargados en la tabla legacy (ej. dirigente que se registró antes
            # de que la migración automática copiara estos datos).
            if not telefono_cuenta or not email_cuenta:
                for tabla in ("dirigentes", "clientes"):
                    # FIX: SQL injection - validar tabla contra whitelist antes de usar en query dinámica.
                    tabla_segura = validar_tabla(tabla)
                    legacy = c.execute(f"SELECT telefono, email FROM {tabla_segura} WHERE cedula=?", (ced,)).fetchone()
                    if legacy:
                        if not telefono_cuenta and legacy[0]:
                            telefono_cuenta = legacy[0]
                        if not email_cuenta and legacy[1]:
                            email_cuenta = legacy[1]
                        break
                if telefono_cuenta != (row[4] or '') or email_cuenta != (row[3] or ''):
                    c.execute("UPDATE cuentas_usuario SET telefono=?, email=? WHERE cedula=?", (telefono_cuenta, email_cuenta, ced))
                    conn.commit()

            u = {
                "cedula": row[0],
                "nombre": row[1],
                "nivel": primer_rol,
                "roles": roles,
                "email": email_cuenta,
                "telefono": telefono_cuenta,
                "foto_url": row[5] or '',
                "es_unificado": True,
                "session_id": session_id,
                "requiere_cambio_clave": bool(row[6])
            }
            if cerrar: conn.close()
            return u
        registrar_intento_login(ced, False, ip, user_agent, conn)
        if cerrar: conn.close()
        return None

    # FIX: Eliminado fallback de autenticación en texto plano (usuarios, clientes, dirigentes, transportes).
    # Si no existe hash PBKDF2 en cuentas_usuario, devolver error 'migracion pendiente'.
    # Los usuarios legacy deben ser migrados manualmente por un administrador.
    registrar_intento_login(ced, False, ip, user_agent, conn)
    if cerrar: conn.close()
    return None

def migrar_legacy_a_unificado(cedula, nombre, password, conn, telefono='', email=''):
    """Migra un usuario legacy a cuentas_unificadas si aún no existe"""
    try:
        c = conn.cursor()
        existing = c.execute("SELECT cedula, telefono, email FROM cuentas_usuario WHERE cedula=?", (cedula,)).fetchone()
        if existing:
            # Si la cuenta unificada ya existe pero le faltan datos de contacto que sí
            # están en la tabla legacy (ej. quedó migrada antes de que se guardaran
            # teléfono/email), los completamos para que el dirigente los vea.
            if (telefono and not existing[1]) or (email and not existing[2]):
                c.execute("UPDATE cuentas_usuario SET telefono=COALESCE(NULLIF(telefono,''),?), email=COALESCE(NULLIF(email,''),?) WHERE cedula=?",
                          (telefono, email, cedula))
                conn.commit()
            return
        pw_hash = hash_password(password)
        c.execute("INSERT INTO cuentas_usuario (cedula, nombre, contrasena, telefono, email) VALUES (?,?,?,?,?)",
                  (cedula, nombre, pw_hash, telefono, email))
        # Also migrate role assignments
        _migrar_roles_legacy(cedula, nombre, conn)
        conn.commit()
        log_auditoria(cedula, nombre, 'migracion_automatica',
                      'Migrado de tabla legacy a cuentas unificadas', entidad='cuentas_usuario', entidad_id=cedula)
    except Exception as e:
        print(f"[Migracion] Error migrando {cedula}: {e}")

def _migrar_roles_legacy(cedula, nombre, conn):
    """Reasigna roles de tablas legacy a asignaciones_rol"""
    c = conn.cursor()
    # Desde usuarios (admins sistema)
    row = c.execute("SELECT nivel, departamento_id, distrito_id FROM usuarios WHERE cedula=? AND activo=1", (cedula,)).fetchone()
    if row:
        c.execute("""INSERT OR IGNORE INTO asignaciones_rol (cedula, rol, nivel_sistema, departamento_id, distrito_id)
            VALUES (?,?,?,?,?)""", (cedula, row[0], row[0], row[1], row[2]))
        return
    # Dirigentes
    row = c.execute("SELECT tipo FROM dirigentes WHERE cedula=? AND activo=1", (cedula,)).fetchone()
    if row:
        c.execute("""INSERT OR IGNORE INTO asignaciones_rol (cedula, rol, dirigente_tipo)
            VALUES (?,?,'dirigente')""", (cedula, 'dirigente'))
        return
    # Conductores
    row = c.execute("SELECT id FROM transportes WHERE cedula=? AND contrasena!=''", (cedula,)).fetchone()
    if row:
        c.execute("""INSERT OR IGNORE INTO asignaciones_rol (cedula, rol, vehiculo_id)
            VALUES (?,?,'conductor')""", (cedula, 'conductor', row[0]))
        return
    # Clientes (Partido)
    row = c.execute("SELECT tipo, departamento_id, distrito_id, candidato_nombre, candidato_cargo FROM clientes WHERE cedula=? AND activo=1", (cedula,)).fetchone()
    if row:
        c.execute("""INSERT OR IGNORE INTO asignaciones_rol (cedula, rol, tipo_cliente, departamento_id, distrito_id, candidato_nombre, candidato_cargo)
            VALUES (?,?,?,?,?,?,?)""", (cedula, row[0], row[0], row[1], row[2], row[3], row[4]))

def _authenticate(cedula_input, password_input, conn=None):
    """
    Wrapper legacy: usa _autenticar_unificado internamente.
    Retorna dict usuario con al menos 'nivel' para compatibilidad hacia atrás.
    """
    return _autenticar_unificado(cedula_input, password_input, conn)

def _tiene_dato_general(cursor, cliente_cedula):
    """
    'Dato general' = cargos de ámbito nacional/departamental (elecciones generales),
    a diferencia de cargos internos de partido (seccional, convencional, etc.).
    Escrutinio y D'Hondt (herramientas de resultados agregados) requieren esto.
    Sin ningún paquete asignado: sin restricción (ve todo, compatibilidad hacia atrás).
    """
    cargos_ok = _cargos_permitidos_cliente(cursor, cliente_cedula)
    if cargos_ok is None:
        return True
    if not cargos_ok:
        return False
    ph = ','.join('?' * len(cargos_ok))
    row = cursor.execute(
        f"SELECT 1 FROM cargos_electivos WHERE codigo IN ({ph}) AND ambito IN ('nacional','departamental') LIMIT 1",
        list(cargos_ok)
    ).fetchone()
    return bool(row)

def _cargos_permitidos_cliente(cursor, cliente_cedula):
    """
    Devuelve el conjunto de códigos de cargo (cargos_electivos.codigo) que un cliente
    puede ver, según los paquetes que tenga comprados/asignados (cliente_paquetes).
    Si el cliente no tiene NINGÚN paquete asignado, retorna None (sin restricción:
    ve todo, por compatibilidad con clientes previos a este sistema de paquetes).
    """
    if not cliente_cedula:
        return None
    tiene_paquetes = cursor.execute(
        "SELECT 1 FROM cliente_paquetes WHERE cliente_cedula=? AND activo=1", (cliente_cedula,)
    ).fetchone()
    if not tiene_paquetes:
        return None
    rows = cursor.execute("""
        SELECT DISTINCT ce.codigo
        FROM cliente_paquetes cp
        JOIN paquete_cargos pc ON pc.paquete_id = cp.paquete_id
        JOIN cargos_electivos ce ON ce.id = pc.cargo_id
        WHERE cp.cliente_cedula=? AND cp.activo=1
    """, (cliente_cedula,)).fetchall()
    return {r[0] for r in rows}

def _ejecutar_desvinculo(c, conn, ced_cliente, ced_dir, cand):
    """Aplica el desvínculo real entre un cliente y un dirigente, y lleva el
    contador de cuántas veces se desvincularon (para la regla de aceptación
    a partir de la segunda vez)."""
    dir_row = c.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (ced_dir,)).fetchone()
    if dir_row and dir_row[0] == ced_cliente:
        c.execute("UPDATE dirigentes SET cliente_cedula=NULL WHERE cedula=?", (ced_dir,))
    if cand:
        c.execute("""DELETE FROM grupo_dirigentes WHERE dirigente_cedula=? AND grupo_id IN
                     (SELECT id FROM grupos_trabajo WHERE candidato_id=?)""", (ced_dir, cand[0]))
    c.execute("""INSERT INTO vinculo_dirigente_historial (dirigente_cedula, cliente_cedula, desvinculaciones)
                 VALUES (?,?,1)
                 ON CONFLICT(dirigente_cedula, cliente_cedula) DO UPDATE SET desvinculaciones=desvinculaciones+1""",
              (ced_dir, ced_cliente))
    conn.commit()

def _require_auth(data, min_nivel, conn=None):
    """
    Extrae 'cedula_auth' y 'password_auth' del body POST,
    autentica y verifica nivel mínimo.
    Si faltan credenciales, permite la request pero loguea advertencia (modo transición).
    Retorna el usuario autenticado o None.
    """
    ced_auth = normalizar_cedula(data.get("cedula_auth", ""))
    pw_auth = normalizar_texto(data.get("password_auth", ""))
    if not ced_auth or not pw_auth:
        print(f"[AUTH] Advertencia: acción '{data.get('action','')}' sin credenciales (transición)")
        return None
    user = _authenticate(ced_auth, pw_auth, conn=conn)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación fallida")
    _check_nivel(user, min_nivel)
    return user

# ─── Clientes y certificacion cruzada de datos ──────────
TIPOS_DATO_CERTIFICABLE = ('voto', 'acta', 'anomalia')


def _cliente_de_cedula(conn, ced):
    """Cliente (candidato, partido o movimiento) al que pertenece una cedula: el propio cliente o el de su dirigente."""
    ced = normalizar_cedula(ced or "")
    if not ced:
        return None
    if conn.execute("SELECT 1 FROM clientes WHERE cedula=? AND activo=1", (ced,)).fetchone():
        return ced
    d = conn.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (ced,)).fetchone()
    return d[0] if d and d[0] else None


def _puede_editar_candidato(conn, cedula, candidato_id):
    """True si la cédula (el candidato/cliente dueño, o uno de sus dirigentes) puede editar
    el perfil público de este candidato."""
    if not cedula or not candidato_id:
        return False
    row = conn.execute("SELECT cliente_cedula FROM candidatos WHERE id=?", (candidato_id,)).fetchone()
    if not row or not row[0]:
        return False
    cliente_viewer = _cliente_de_cedula(conn, cedula)
    return bool(cliente_viewer) and cliente_viewer == row[0]


def _autenticar_y_verificar_dueno(conn, data, candidato_id):
    """Autentica cedula_auth/password_auth del body y exige que sea dueño (o dirigente del dueño)
    del candidato_id dado. Lanza HTTPException(401/403) si no corresponde."""
    ced_auth = normalizar_cedula(data.get("cedula_auth", ""))
    pw_auth = normalizar_texto(data.get("password_auth", ""))
    if not ced_auth or not pw_auth:
        raise HTTPException(status_code=401, detail="Iniciá sesión para editar este perfil")
    user = _authenticate(ced_auth, pw_auth, conn=conn)
    if not user:
        raise HTTPException(status_code=401, detail="Autenticación fallida")
    if not _puede_editar_candidato(conn, ced_auth, candidato_id):
        raise HTTPException(status_code=403, detail="No tenés permiso para editar este candidato")
    user["cedula"] = ced_auth
    return user


def _cliente_de_request(conn, data, user=None):
    """Resuelve el cliente que carga un dato: usuario autenticado, session_id o dirigente del body."""
    if user and user.get("cedula"):
        cl = _cliente_de_cedula(conn, user["cedula"])
        if cl:
            return cl
    sid = normalizar_texto(data.get("session_id", ""))
    if sid:
        cl = _cliente_de_sesion(conn, sid)
        if cl:
            return cl
    return _cliente_de_cedula(conn, data.get("dirigente", "") or data.get("dirigente_cedula", ""))


def _certificar(conn, tipo_dato, clave, valor, cliente, cargado_por="", origen=""):
    """Registra (o actualiza) lo que un cliente afirma sobre un dato compartido."""
    if not cliente or tipo_dato not in TIPOS_DATO_CERTIFICABLE or not clave:
        return False
    conn.execute("""INSERT INTO certificaciones (tipo_dato, clave, valor, cliente_cedula, cargado_por, origen)
                    VALUES (?,?,?,?,?,?)
                    ON CONFLICT(tipo_dato, clave, cliente_cedula) DO UPDATE SET
                      valor=excluded.valor, cargado_por=excluded.cargado_por, origen=excluded.origen,
                      timestamp=datetime('now','localtime')""",
                 (tipo_dato, str(clave), str(valor), cliente, cargado_por or "", origen or ""))
    return True


def _estado_certificacion(conn, tipo_dato, clave, cliente=None):
    """Solo conteos: nunca revela que clientes certificaron."""
    rows = conn.execute("SELECT valor, cliente_cedula FROM certificaciones WHERE tipo_dato=? AND clave=?",
                        (tipo_dato, str(clave))).fetchall()
    conteo = {}
    for v, _ in rows:
        conteo[v] = conteo.get(v, 0) + 1
    mayoria = max(conteo, key=conteo.get) if conteo else None
    mi_valor = next((v for v, cl in rows if cl == cliente), None) if cliente else None
    confirman = conteo.get(mayoria, 0)
    total = len(rows)
    return {
        "tipo_dato": tipo_dato, "clave": str(clave),
        "valor_mayoritario": mayoria,
        "fuentes": total,                       # clientes distintos que informaron este dato
        "confirmaciones": confirman,            # coinciden con el valor mayoritario
        "discrepancias": total - confirman,
        "nivel": ("sin_datos" if total == 0 else "discrepante" if total - confirman > 0
                  else "certificado" if confirman >= 2 else "una_fuente"),
        "mi_valor": mi_valor,
    }


# ─── API: POST handlers ──────────────────────────────────
@app.post("/api")
def api_post(data: dict = Body(...), request: Request = None):
    conn = get_connection()
    c = conn.cursor()
    action = normalizar_texto(data.get("action", "registrar"))
    try:
        if action == "whatsapp_plantilla_guardar":
            # No usamos _require_auth(..., "dirigente", ...) acá: ese helper exige un nivel de
            # NIVEL_HIERARCHY (dirigente/seccional/.../master), y las cuentas tipo cliente/
            # candidato tienen nivel='cliente' -- ni siquiera el piso más bajo de esa jerarquía
            # las reconoce, así que _require_auth las rechaza siempre con "Nivel no reconocido".
            # Autenticamos directo y cada alcance de abajo ya trae su propio chequeo de permiso
            # (es_master / acceso_partido / _puede_editar_candidato / dueño de su propia cédula).
            ced_auth = normalizar_cedula(data.get("cedula_auth", ""))
            pw_auth = normalizar_texto(data.get("password_auth", ""))
            if not ced_auth or not pw_auth:
                raise HTTPException(status_code=401, detail="Autenticación requerida")
            usuario = _authenticate(ced_auth, pw_auth, conn=conn)
            if not usuario:
                raise HTTPException(status_code=401, detail="Autenticación fallida")
            usuario["cedula"] = ced_auth
            alcance = normalizar_texto(data.get("alcance", "partido"))
            partido_id = int(data.get("partido_id") or 0)
            cand_id = int(data.get("candidato_id") or 0)
            cuerpo = str(data.get("cuerpo") or "").strip()
            if alcance not in ("general", "partido", "candidato", "dirigente") or not cuerpo or len(cuerpo) > 4000:
                return {"success": False, "error": "Plantilla requerida (máximo 4000 caracteres)"}
            usadas = set(re.findall(r"\{([a-z_]+)\}", cuerpo))
            if usadas - {"nombre", "mesa", "orden", "local", "url_consulta", "candidatos"}:
                return {"success": False, "error": "La plantilla contiene variables no permitidas"}
            ced_actor = normalizar_cedula(usuario.get("cedula"))
            niveles = [r.get("rol") for r in (usuario.get("roles", []) or [])]
            es_master = usuario.get("nivel") == "master" or "master" in niveles

            if alcance == "general":
                if not es_master:
                    raise HTTPException(status_code=403, detail="Solo Administración General edita la plantilla institucional")
                partido_id = 0
                conn.execute("""INSERT INTO plantillas_whatsapp_votacion (alcance, cuerpo, actualizado_por, updated_at)
                                 VALUES ('general', ?, ?, datetime('now','localtime'))
                                 ON CONFLICT (alcance) WHERE alcance='general'
                                 DO UPDATE SET cuerpo=excluded.cuerpo, actualizado_por=excluded.actualizado_por, updated_at=datetime('now','localtime')""",
                             (cuerpo, ced_actor))
            elif alcance == "partido":
                if partido_id <= 0:
                    return {"success": False, "error": "Selecciona el partido"}
                cliente = _cliente_de_cedula(conn, ced_actor)
                acceso_partido = bool(cliente and conn.execute("SELECT 1 FROM clientes WHERE cedula=? AND partido_id=?", (cliente, partido_id)).fetchone())
                if not acceso_partido and cliente:
                    acceso_partido = bool(conn.execute("SELECT 1 FROM candidatos ca JOIN clientes cl ON cl.cedula=ca.cliente_cedula WHERE cl.cedula=? AND EXISTS (SELECT 1 FROM perfil_candidato pc WHERE pc.candidato_id=ca.id AND pc.partido_id=?)", (cliente, partido_id)).fetchone())
                if not acceso_partido:
                    raise HTTPException(status_code=403, detail="No tienes acceso administrativo a este partido")
                conn.execute("""INSERT INTO plantillas_whatsapp_votacion (alcance, partido_id, cuerpo, actualizado_por, updated_at)
                                 VALUES ('partido', ?, ?, ?, datetime('now','localtime'))
                                 ON CONFLICT (alcance, partido_id) WHERE alcance='partido'
                                 DO UPDATE SET cuerpo=excluded.cuerpo, actualizado_por=excluded.actualizado_por, updated_at=datetime('now','localtime')""",
                             (partido_id, cuerpo, ced_actor))
            elif alcance == "candidato":
                if cand_id <= 0:
                    return {"success": False, "error": "Falta el candidato"}
                if not _puede_editar_candidato(conn, ced_actor, cand_id):
                    raise HTTPException(status_code=403, detail="No tenés permiso para editar el mensaje de este candidato")
                conn.execute("""INSERT INTO plantillas_whatsapp_votacion (alcance, candidato_id, cuerpo, actualizado_por, updated_at)
                                 VALUES ('candidato', ?, ?, ?, datetime('now','localtime'))
                                 ON CONFLICT (alcance, candidato_id) WHERE alcance='candidato'
                                 DO UPDATE SET cuerpo=excluded.cuerpo, actualizado_por=excluded.actualizado_por, updated_at=datetime('now','localtime')""",
                             (cand_id, cuerpo, ced_actor))
            else:  # 'dirigente' -- cada dirigente edita solo su propio mensaje, con su propia cédula
                conn.execute("""INSERT INTO plantillas_whatsapp_votacion (alcance, dirigente_cedula, cuerpo, actualizado_por, updated_at)
                                 VALUES ('dirigente', ?, ?, ?, datetime('now','localtime'))
                                 ON CONFLICT (alcance, dirigente_cedula) WHERE alcance='dirigente'
                                 DO UPDATE SET cuerpo=excluded.cuerpo, actualizado_por=excluded.actualizado_por, updated_at=datetime('now','localtime')""",
                             (ced_actor, cuerpo, ced_actor))
            conn.commit()
            return {"success": True, "alcance": alcance, "partido_id": partido_id, "candidato_id": cand_id}
        if action == "login":
            ced = normalizar_cedula(data.get("cedula", ""))
            pw = normalizar_texto(data.get("password", ""))
            if not ced or not pw:
                return {"success": False, "error": "Cédula y contraseña requeridas"}
            ip_cliente = ""
            ua_cliente = ""
            try:
                if request is not None:
                    ip_cliente = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                    if not ip_cliente and request.client:
                        ip_cliente = request.client.host
                    ua_cliente = request.headers.get("user-agent", "")
            except Exception:
                pass
            try:
                usuario = _autenticar_unificado(ced, pw, conn, ip=ip_cliente, user_agent=ua_cliente)
            except Exception:
                usuario = None
            if not usuario:
                return {"success": False, "error": "Credenciales inválidas o usuario inactivo"}
            niveles_orden = ['conductor', 'dirigente', 'seccional', 'distrital', 'departamental', 'nacional', 'master',
                             'general', 'departamental', 'municipal', 'pc']
            try:
                usuario["nivel_index"] = niveles_orden.index(usuario["nivel"])
            except Exception:
                usuario["nivel_index"] = -1
            return {"success": True, "usuario": usuario}

        if action == "registrar_miembro":
            _require_auth(data, 'seccional', conn)
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            pw = normalizar_texto(data.get("password", ""))
            mesa = normalizar_texto(data.get("mesa", ""))
            h_ini = normalizar_texto(data.get("horarioInicio", ""))
            h_fin = normalizar_texto(data.get("horarioCierre", ""))
            est = normalizar_texto(data.get("estado", "ACTIVO")).upper() or "ACTIVO"
            if not ced or not nombre or not pw:
                return {"success": False, "error": "Cédula, nombre y contraseña son obligatorios"}
            existing = c.execute("SELECT cedula FROM miembros_mesa WHERE cedula=?", (ced,)).fetchone()
            if existing:
                c.execute("UPDATE miembros_mesa SET nombre=?, contrasena=?, mesa=?, horario_inicio=?, horario_cierre=?, estado=? WHERE cedula=?",
                          (nombre, pw, mesa, h_ini, h_fin, est, ced))
                conn.commit()
                return {"success": True, "accion": "actualizado"}
            c.execute("INSERT INTO miembros_mesa (cedula, nombre, contrasena, mesa, horario_inicio, horario_cierre, estado) VALUES (?,?,?,?,?,?,?)",
                      (ced, nombre, pw, mesa, h_ini, h_fin, est))
            conn.commit()
            return {"success": True, "accion": "creado"}

        if action == "registrar_pendiente_qr":
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            mesa = ''  # removed field, kept for compatibility
            orden = normalizar_texto(data.get("orden", ""))
            telefono = normalizar_texto(data.get("telefono", ""))
            obs = normalizar_texto(data.get("observacion", ""))
            dirigente_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
            codigo = normalizar_texto(data.get("codigo", ""))
            if not ced or not nombre:
                return {"success": False, "error": "Cedula y nombre son obligatorios"}
            pendiente = c.execute("SELECT id FROM pendientes_qr WHERE cedula=? AND estado='pendiente'", (ced,)).fetchone()
            if pendiente:
                return {"success": False, "error": "Ya existe una solicitud pendiente para esta cedula"}
            # If a code was provided, look up dirigente from code
            if codigo and not dirigente_ced:
                ci = c.execute("SELECT dirigente_cedula FROM codigos_invitacion WHERE codigo=? AND activo=1 AND (max_usos=0 OR usos < max_usos)", (codigo,)).fetchone()
                if ci:
                    dirigente_ced = ci[0]
                    c.execute("UPDATE codigos_invitacion SET usos=usos+1 WHERE codigo=?", (codigo,))
            pid = f"qr_{int(time.time()*1000)}_{ced}"
            c.execute("INSERT INTO pendientes_qr (id, cedula, nombre, mesa, orden, telefono, observacion, estado, canal, dirigente_cedula, codigo) VALUES (?,?,?,?,?,?,?,'pendiente','qr',?,?)",
                      (pid, ced, nombre, mesa, orden, telefono, obs, dirigente_ced, codigo))
            conn.commit()
            return {"success": True, "id": pid, "tipo": "pendiente_qr", "dirigente_cedula": dirigente_ced, "codigo": codigo}

        if action == "aprobar_pendiente_qr":
            _require_auth(data, 'seccional', conn)
            pid = normalizar_texto(data.get("id", ""))
            if not pid: return {"success": False, "error": "ID obligatorio"}
            row = c.execute("SELECT id, cedula, nombre, mesa, orden, estado FROM pendientes_qr WHERE id=?", (pid,)).fetchone()
            if not row: return {"success": False, "error": "Solicitud no encontrada"}
            if row[5] != "pendiente": return {"success": False, "error": "La solicitud ya fue procesada"}
            c.execute("INSERT INTO registros (cedula, nombre, mesa, orden, estado, accion, dirigente, dirigenteNombre, origen) VALUES (?,?,?,?,?,'aprobar_qr','Panel QR','Panel QR','qr')",
                      (row[1], row[2], row[3], row[4], "voto"))
            c.execute("UPDATE pendientes_qr SET estado='aprobado', resueltoAt=datetime('now','localtime') WHERE id=?", (pid,))
            conn.commit()
            return {"success": True, "id": pid, "tipo": "aprobado"}

        if action == "rechazar_pendiente_qr":
            pid = normalizar_texto(data.get("id", ""))
            if not pid: return {"success": False, "error": "ID obligatorio"}
            row = c.execute("SELECT estado FROM pendientes_qr WHERE id=?", (pid,)).fetchone()
            if not row: return {"success": False, "error": "Solicitud no encontrada"}
            if row[0] != "pendiente": return {"success": False, "error": "La solicitud ya fue procesada"}
            c.execute("UPDATE pendientes_qr SET estado='rechazado', resueltoAt=datetime('now','localtime') WHERE id=?", (pid,))
            conn.commit()
            return {"success": True, "id": pid, "tipo": "rechazado"}

        if action == "crear_usuario":
            _require_auth(data, 'master', conn)
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            pw = normalizar_texto(data.get("contrasena", ""))
            nivel = normalizar_texto(data.get("nivel", ""))
            dpto = data.get("departamento_id")
            dist = data.get("distrito_id")
            if not ced or not nombre or not pw or nivel not in ('master','nacional','departamental','distrital','seccional'):
                return {"success": False, "error": "Datos incompletos o nivel inválido"}
            existing = c.execute("SELECT cedula FROM usuarios WHERE cedula=?", (ced,)).fetchone()
            if existing:
                c.execute("UPDATE usuarios SET nombre=?, contrasena=?, nivel=?, departamento_id=?, distrito_id=? WHERE cedula=?",
                          (nombre, pw, nivel, dpto, dist, ced))
                conn.commit()
                return {"success": True, "accion": "actualizado"}
            c.execute("INSERT INTO usuarios (cedula, nombre, contrasena, nivel, departamento_id, distrito_id) VALUES (?,?,?,?,?,?)",
                      (ced, nombre, pw, nivel, dpto, dist))
            conn.commit()
            return {"success": True, "accion": "creado"}

        if action == "toggle_usuario":
            _require_auth(data, 'master', conn)
            ced = normalizar_cedula(data.get("cedula", ""))
            if not ced: return {"success": False, "error": "Cédula requerida"}
            row = c.execute("SELECT activo FROM usuarios WHERE cedula=?", (ced,)).fetchone()
            if not row: return {"success": False, "error": "Usuario no encontrado"}
            nuevo = 0 if row[0] == 1 else 1
            c.execute("UPDATE usuarios SET activo=? WHERE cedula=?", (nuevo, ced))
            conn.commit()
            return {"success": True, "activo": nuevo}

        if action == "asignar_candidato_cliente":
            _require_auth(data, 'master', conn)
            cand_id = data.get("candidato_id")
            cli_ced = normalizar_cedula(data.get("cliente_cedula", "")) or None
            if not cand_id:
                return {"success": False, "error": "candidato_id requerido"}
            if cli_ced and not c.execute("SELECT 1 FROM clientes WHERE cedula=?", (cli_ced,)).fetchone():
                return {"success": False, "error": "Cliente inexistente"}
            c.execute("UPDATE candidatos SET cliente_cedula=? WHERE id=?", (cli_ced, int(cand_id)))
            conn.commit()
            return {"success": True, "candidato_id": int(cand_id), "cliente": cli_ced}

        if action == "asignar_dirigente_cliente":
            _require_auth(data, 'master', conn)
            dir_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
            cli_ced = normalizar_cedula(data.get("cliente_cedula", "")) or None
            if not dir_ced:
                return {"success": False, "error": "dirigente_cedula requerido"}
            if cli_ced and not c.execute("SELECT 1 FROM clientes WHERE cedula=?", (cli_ced,)).fetchone():
                return {"success": False, "error": "Cliente inexistente"}
            c.execute("UPDATE dirigentes SET cliente_cedula=? WHERE cedula=?", (cli_ced, dir_ced))
            if data.get("incluir_votos", True) and cli_ced:
                # Los votos ya cargados por ese dirigente pasan a ser del cliente
                c.execute("UPDATE registros SET cliente_cedula=? WHERE dirigente=? AND cliente_cedula IS NULL", (cli_ced, dir_ced))
            conn.commit()
            return {"success": True, "dirigente": dir_ced, "cliente": cli_ced}

        if action == "certificar_dato":
            user_auth = _require_auth(data, 'dirigente', conn)
            cliente_ced = _cliente_de_request(conn, data, user_auth)
            if not cliente_ced:
                return {"success": False, "error": "Solo usuarios de un cliente pueden certificar datos"}
            tipo_dato = normalizar_texto(data.get("tipo_dato", "")).lower()
            clave = normalizar_texto(str(data.get("clave", "")))
            valor = data.get("valor", "")
            valor = json.dumps(valor, sort_keys=True, ensure_ascii=False) if isinstance(valor, (dict, list)) else normalizar_texto(str(valor))
            if tipo_dato not in TIPOS_DATO_CERTIFICABLE or not clave or not valor:
                return {"success": False, "error": "tipo_dato (voto|acta|anomalia), clave y valor son obligatorios"}
            _certificar(conn, tipo_dato, clave, valor, cliente_ced,
                        (user_auth or {}).get("cedula", ""), normalizar_texto(data.get("origen", "web")))
            conn.commit()
            return {"success": True, "certificacion": _estado_certificacion(conn, tipo_dato, clave, cliente_ced)}

        if action == "crear_cliente":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            apellido = normalizar_texto(data.get("apellido", ""))
            pw = normalizar_texto(data.get("contrasena", ""))
            tipo = normalizar_texto(data.get("tipo", ""))
            categoria = normalizar_texto(data.get("categoria", "partido")).lower() or "partido"
            css_tema = normalizar_texto(data.get("css_tema", "neutral")).lower() or "neutral"
            dpto = data.get("departamento_id")
            dist = data.get("distrito_id")
            candidato_nombre = normalizar_texto(data.get("candidato_nombre", ""))
            candidato_cargo = normalizar_texto(data.get("candidato_cargo", ""))
            locales = normalizar_texto(data.get("locales", ""))
            partido_id = data.get("partido_id")
            color_propio = normalizar_texto(data.get("color_propio_hex", ""))
            plan = normalizar_texto(data.get("plan_visibilidad", "propio")).lower() or "propio"
            unidad_organizacion_id = data.get("unidad_organizacion_id") or None
            email_cliente = normalizar_texto(data.get("email", ""))
            telefono_cliente = normalizar_texto(data.get("telefono", ""))
            if plan not in PLANES_VISIBILIDAD:
                return {"success": False, "error": "plan_visibilidad invalido (propio|partido|total)"}
            if not ced or not nombre or len(pw) < 4:
                return {"success": False, "error": "Cedula, nombre y contrasena son obligatorios"}
            if tipo not in ('general','departamental','municipal','seccional','pc','admin'):
                return {"success": False, "error": "Tipo de cliente invalido"}
            if tipo == 'seccional' and not unidad_organizacion_id:
                return {"success": False, "error": "Para ambito 'seccional' debe indicar unidad_organizacion_id"}
            if categoria not in ('partido', 'movimiento', 'candidato'):
                return {"success": False, "error": "Categoria invalida"}
            # 'partido' = adopta el color del partido por el que puja; 'propio' = color_propio_hex
            if css_tema not in ('neutral', 'partido', 'propio', 'anr', 'plra', 'yo_creo'):
                return {"success": False, "error": "Tema CSS invalido"}
            if css_tema == 'propio' and not _css_color(color_propio):
                return {"success": False, "error": "color_propio_hex invalido (formato #RRGGBB)"}
            if css_tema == 'partido' and not partido_id:
                return {"success": False, "error": "Para usar el color del partido indique partido_id"}
            if categoria == 'candidato' and not candidato_nombre:
                candidato_nombre = nombre
            existing = c.execute("SELECT cedula FROM clientes WHERE cedula=?", (ced,)).fetchone()
            if existing:
                c.execute("""
                    UPDATE clientes
                    SET nombre=?, apellido=?, contrasena=?, email=?, telefono=?, tipo=?, categoria=?, css_tema=?, departamento_id=?, distrito_id=?,
                        candidato_nombre=?, candidato_cargo=?, locales=?, partido_id=?, color_propio_hex=?, plan_visibilidad=?,
                        unidad_organizacion_id=?
                    WHERE cedula=?
                """, (nombre, apellido, pw, email_cliente, telefono_cliente, tipo, categoria, css_tema, dpto, dist, candidato_nombre or None, candidato_cargo or None, locales or None, partido_id, color_propio, plan, unidad_organizacion_id, ced))
                conn.commit()
                return {"success": True, "accion": "actualizado"}
            c.execute("""
                INSERT INTO clientes
                (cedula, nombre, apellido, contrasena, tipo, categoria, css_tema, departamento_id, distrito_id, candidato_nombre, candidato_cargo, locales, partido_id, color_propio_hex, plan_visibilidad, unidad_organizacion_id, email, telefono)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (ced, nombre, apellido, pw, tipo, categoria, css_tema, dpto, dist, candidato_nombre or None, candidato_cargo or None, locales or None, partido_id, color_propio, plan, unidad_organizacion_id, email_cliente, telefono_cliente))
            conn.commit()
            if email_cliente or telefono_cliente:
                enviar_bienvenida_cliente(ced, nombre, email_cliente, telefono_cliente, pw)
            return {"success": True, "accion": "creado"}

        if action == "toggle_cliente":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            ced = normalizar_cedula(data.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cedula requerida"}
            row = c.execute("SELECT activo FROM clientes WHERE cedula=?", (ced,)).fetchone()
            if not row:
                return {"success": False, "error": "Cliente no encontrado"}
            nuevo = 0 if row[0] == 1 else 1
            c.execute("UPDATE clientes SET activo=? WHERE cedula=?", (nuevo, ced))
            conn.commit()
            return {"success": True, "activo": nuevo}

        if action == "admin_cliente_editar":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            ced = normalizar_cedula(data.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            campos = {
                "nombre": "nombre", "apellido": "apellido", "email": "email",
                "telefono": "telefono", "tipo": "tipo", "categoria": "categoria",
                "partido_id": "partido_id", "departamento_id": "departamento_id",
                "distrito_id": "distrito_id", "candidato_nombre": "candidato_nombre",
                "candidato_cargo": "candidato_cargo", "locales": "locales",
                "unidad_organizacion_id": "unidad_organizacion_id",
            }
            updates, valores = [], []
            for key, columna in campos.items():
                if key not in data:
                    continue
                valor = data[key]
                if key in ("nombre", "apellido", "email", "telefono", "tipo", "categoria", "candidato_nombre", "candidato_cargo", "locales"):
                    valor = normalizar_texto(str(valor or "")) or None
                elif valor in ("", None):
                    valor = None
                # FIX: SQL injection - validar columna contra whitelist antes de usar en query dinámica.
                columna_segura = validar_columna(columna)
                updates.append(f"{columna_segura}=?")
                valores.append(valor)
            if not updates:
                return {"success": False, "error": "No hay campos para actualizar"}
            if "email" in data and data.get("email") and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', str(data.get("email"))):
                return {"success": False, "error": "El email no es válido"}
            if data.get("tipo") == "seccional" and not data.get("unidad_organizacion_id"):
                return {"success": False, "error": "Para ámbito seccional debe seleccionar la unidad operativa"}
            valores.append(ced)
            cur = conn.execute(f"UPDATE clientes SET {', '.join(updates)} WHERE cedula=?", valores)
            if not cur.rowcount:
                return {"success": False, "error": "Cliente no encontrado"}
            conn.commit()
            log_auditoria(normalizar_cedula(data.get("cedula_auth", "")), "", "cliente_editado",
                          f"Datos administrativos actualizados para cliente #{ced}", "clientes", ced, severidad="info")
            return {"success": True, "accion": "actualizado"}

        if action == "admin_clientes_lista":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            rows = conn.execute("""SELECT cl.cedula,cl.nombre,cl.apellido,cl.email,cl.telefono,cl.tipo,
                COALESCE(cl.categoria,'partido'),cl.activo,cl.partido_id,COALESCE(p.sigla,''),
                cl.candidato_nombre,cl.candidato_cargo,cl.locales,
                (SELECT COUNT(*) FROM dirigentes d WHERE d.cliente_cedula=cl.cedula),
                (SELECT COUNT(*) FROM registros r WHERE r.cliente_cedula=cl.cedula),
                (SELECT COUNT(*) FROM candidatos ca WHERE ca.cliente_cedula=cl.cedula AND COALESCE(ca.activo,1)=1)
                FROM clientes cl LEFT JOIN partidos p ON p.id=cl.partido_id ORDER BY cl.tipo,cl.nombre""").fetchall()
            columns = ("cedula","nombre","apellido","email","telefono","tipo","categoria","activo","partido_id","partido_sigla","candidato_nombre","candidato_cargo","locales","total_dirigentes","total_votos","total_candidatos")
            return {"success":True,"clientes":[dict(zip(columns,row)) for row in rows],"total":len(rows)}

        if action == "admin_cliente_detalle":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            ced = normalizar_cedula(data.get("cedula", ""))
            cliente = conn.execute("""SELECT cl.cedula, cl.nombre, cl.apellido, cl.email, cl.telefono,
                cl.tipo, cl.categoria, cl.activo, cl.partido_id, p.sigla, cl.departamento_id,
                dep.nombre, cl.distrito_id, dis.nombre, cl.candidato_nombre, cl.candidato_cargo,
                cl.locales, cl.fecha_inicio_servicio, cl.fecha_fin_servicio, cl.tipo_servicio,
                cl.registro_completado
                FROM clientes cl LEFT JOIN partidos p ON p.id=cl.partido_id
                LEFT JOIN departamentos dep ON dep.id=cl.departamento_id
                LEFT JOIN distritos dis ON dis.id=cl.distrito_id WHERE cl.cedula=?""", (ced,)).fetchone()
            if not cliente:
                return {"success": False, "error": "Cliente no encontrado"}
            dirigentes = conn.execute("SELECT cedula,nombre,tipo,telefono,email,activo FROM dirigentes WHERE cliente_cedula=? ORDER BY nombre", (ced,)).fetchall()
            candidatos = conn.execute("SELECT id,nombre,cargo,lista_nro,lista_nombre,activo FROM candidatos WHERE cliente_cedula=? ORDER BY nombre", (ced,)).fetchall()
            posibles = conn.execute("SELECT COUNT(*) FROM posible_votos pv JOIN dirigentes d ON d.cedula=pv.dirigente_cedula WHERE d.cliente_cedula=?", (ced,)).fetchone()[0]
            transportes = conn.execute("SELECT COUNT(*) FROM transportes WHERE cedula IN (SELECT cedula FROM dirigentes WHERE cliente_cedula=?)", (ced,)).fetchone()[0]
            solicitudes = conn.execute("SELECT COUNT(*) FROM solicitudes_recogida s JOIN dirigentes d ON d.cedula=s.dirigente_cedula WHERE d.cliente_cedula=?", (ced,)).fetchone()[0]
            detalle = {"cedula":cliente[0],"nombre":cliente[1],"apellido":cliente[2],"email":cliente[3],"telefono":cliente[4],
                "tipo":cliente[5],"categoria":cliente[6],"activo":cliente[7],"partido_id":cliente[8],"partido_sigla":cliente[9],
                "departamento_id":cliente[10],"departamento_nombre":cliente[11],"distrito_id":cliente[12],"distrito_nombre":cliente[13],
                "candidato_nombre":cliente[14],"candidato_cargo":cliente[15],"locales":cliente[16],"fecha_inicio_servicio":cliente[17],
                "fecha_fin_servicio":cliente[18],"tipo_servicio":cliente[19],"registro_completado":cliente[20],
                "dirigentes":[dict(zip(("cedula","nombre","tipo","telefono","email","activo"),r)) for r in dirigentes],
                "candidatos":[dict(zip(("id","nombre","cargo","lista_nro","lista_nombre","activo"),r)) for r in candidatos],
                "total_posibles":posibles,"total_transportes":transportes,"total_solicitudes":solicitudes}
            return {"success": True, "cliente": detalle}

        if action == "asignar_candidato":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            cid = data.get("candidato_id")
            if not dc or not cid:
                return {"success": False, "error": "Dirigente y candidato requeridos"}
            try:
                c.execute("INSERT OR IGNORE INTO dirigente_candidatos (dirigente_cedula, candidato_id) VALUES (?,?)",
                          (dc, int(cid)))
                conn.commit()
                if c.rowcount > 0:
                    return {"success": True, "accion": "asignado"}
                return {"success": False, "error": "El candidato ya está asignado a este dirigente"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        if action == "eliminar_candidato":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            cid = data.get("candidato_id")
            if not dc or not cid:
                return {"success": False, "error": "Dirigente y candidato requeridos"}
            c.execute("DELETE FROM dirigente_candidatos WHERE dirigente_cedula=? AND candidato_id=?",
                      (dc, int(cid)))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "eliminado"}
            return {"success": False, "error": "No se encontró el registro"}

        if action == "crear_candidato":
            """Crea un nuevo candidato vinculado a un cliente/partido"""
            _require_auth(data, 'master', conn)
            nombre = normalizar_texto(data.get("nombre", ""))
            cargo = normalizar_texto(data.get("cargo", "concejal"))
            lista_nro = data.get("lista_nro")
            lista_nombre = normalizar_texto(data.get("lista_nombre", ""))
            orden = int(data.get("orden", 0))
            departamento_id = data.get("departamento_id")
            distrito_id = data.get("distrito_id")
            cliente_cedula = normalizar_cedula(data.get("cliente_cedula", ""))
            if not nombre or not lista_nro:
                return {"success": False, "error": "Nombre y lista requeridos"}
            if cargo not in ("intendente", "concejal"):
                return {"success": False, "error": "Cargo debe ser intendente o concejal"}
            c.execute("""INSERT INTO candidatos
                (nombre, cargo, lista_nro, lista_nombre, orden, departamento_id, distrito_id, cliente_cedula)
                VALUES (?,?,?,?,?,?,?,?)""",
                (nombre, cargo, int(lista_nro), lista_nombre, orden,
                 departamento_id, distrito_id, cliente_cedula or None))
            conn.commit()
            auditar_accion(data, 'candidato_creado',
                          f'Candidato {nombre} ({cargo}, Lista {lista_nro}) creado',
                          'candidatos', str(c.lastrowid))
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "actualizar_candidato":
            """Actualiza datos de un candidato existente"""
            _require_auth(data, 'master', conn)
            cid = data.get("id")
            if not cid:
                return {"success": False, "error": "ID del candidato requerido"}
            updates = []
            params = []
            for campo in ["nombre", "cargo", "lista_nro", "lista_nombre", "orden",
                          "departamento_id", "distrito_id", "cliente_cedula", "activo"]:
                if campo in data:
                    val = data[campo]
                    if campo in ("lista_nro", "orden", "departamento_id", "distrito_id", "activo"):
                        if val is not None:
                            val = int(val)
                    elif campo in ("nombre", "cargo", "lista_nombre"):
                        val = normalizar_texto(str(val))
                    elif campo == "cliente_cedula":
                        val = normalizar_cedula(str(val)) if val else None
                    updates.append(f"{campo}=?")
                    params.append(val)
            if not updates:
                return {"success": False, "error": "No hay campos para actualizar"}
            params.append(int(cid))
            c.execute(f"UPDATE candidatos SET {', '.join(updates)} WHERE id=?", params)
            conn.commit()
            auditar_accion(data, 'candidato_actualizado',
                          f'Candidato ID {cid} actualizado',
                          'candidatos', str(cid))
            return {"success": True, "accion": "actualizado"}

        if action == "eliminar_candidato_completo":
            """Elimina un candidato y sus relaciones"""
            _require_auth(data, 'master', conn)
            cid = data.get("id")
            if not cid:
                return {"success": False, "error": "ID del candidato requerido"}
            # First, remove dirigente relationships
            c.execute("DELETE FROM dirigente_candidatos WHERE candidato_id=?", (int(cid),))
            # Remove from grupos
            c.execute("UPDATE grupos_trabajo SET activo=0 WHERE candidato_id=?", (int(cid),))
            # Remove candidato
            c.execute("DELETE FROM candidatos WHERE id=?", (int(cid),))
            conn.commit()
            if conn.total_changes == 0:
                return {"success": False, "error": "Candidato no encontrado"}
            auditar_accion(data, 'candidato_eliminado',
                          f'Candidato ID {cid} eliminado',
                          'candidatos', str(cid), severidad='media')
            return {"success": True, "accion": "eliminado"}

        if action == "crear_grupo":
            nom = normalizar_texto(data.get("nombre", ""))
            cid = data.get("candidato_id")
            zona = normalizar_texto(data.get("zona", ""))
            secc = normalizar_texto(data.get("seccional", ""))
            if not nom or not cid:
                return {"success": False, "error": "Nombre y candidato requeridos"}
            c.execute("INSERT INTO grupos_trabajo (nombre, candidato_id, zona, seccional) VALUES (?,?,?,?)",
                      (nom, int(cid), zona, secc))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "asignar_dirigente_grupo":
            gid = data.get("grupo_id")
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not gid or not dc:
                return {"success": False, "error": "Grupo y dirigente requeridos"}
            c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)",
                      (int(gid), dc))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "asignado"}
            return {"success": False, "error": "El dirigente ya está en este grupo"}

        if action == "eliminar_dirigente_grupo":
            gid = data.get("grupo_id")
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not gid or not dc:
                return {"success": False, "error": "Grupo y dirigente requeridos"}
            c.execute("DELETE FROM grupo_dirigentes WHERE grupo_id=? AND dirigente_cedula=?",
                      (int(gid), dc))
            conn.commit()
            return {"success": True, "accion": "eliminado"}

        if action == "asignar_local_subdirigente":
            # El dirigente le delega a un sub-dirigente propio (creado por el) el
            # seguimiento de un local electoral especifico.
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            sc = normalizar_cedula(data.get("subdirigente_cedula", ""))
            if not dc or not sc:
                return {"success": False, "error": "Dirigente y sub-dirigente requeridos"}
            es_mio = c.execute(
                "SELECT 1 FROM dirigentes WHERE cedula=? AND creado_por_cedula=?", (sc, dc)).fetchone()
            if not es_mio:
                return {"success": False, "error": "Ese sub-dirigente no es tuyo"}
            distrito = normalizar_texto(data.get("distrito", ""))
            sec_loc = normalizar_texto(data.get("sec_loc", ""))
            local = normalizar_texto(data.get("local", ""))
            local_nombre = normalizar_texto(data.get("local_nombre", ""))
            c.execute("""UPDATE dirigentes SET local_distrito=?, local_sec_loc=?, local_local=?, local_nombre=?
                         WHERE cedula=?""", (distrito, sec_loc, local, local_nombre, sc))
            conn.commit()
            return {"success": True}

        if action == "asignar_seguimiento_subdirigente":
            # El dirigente le pasa a un sub-dirigente propio el seguimiento de SUS votantes
            # (posible_votos) que corresponden al local electoral que le delego a ese
            # sub-dirigente, para que sea quien los siga de ahi en adelante.
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            sc = normalizar_cedula(data.get("subdirigente_cedula", ""))
            if not dc or not sc:
                return {"success": False, "error": "Dirigente y sub-dirigente requeridos"}
            sub = c.execute(
                "SELECT local_distrito, local_sec_loc, local_local FROM dirigentes WHERE cedula=? AND creado_por_cedula=?",
                (sc, dc)).fetchone()
            if not sub:
                return {"success": False, "error": "Ese sub-dirigente no es tuyo"}
            if not sub[0] or not sub[1] or not sub[2]:
                return {"success": False, "error": "Primero asignale un local a ese sub-dirigente"}
            c.execute("""
                UPDATE posible_votos SET dirigente_cedula=?, actualizado=datetime('now','localtime')
                WHERE dirigente_cedula=? AND votante_cedula IN (
                    SELECT cedula FROM padron2026_completo WHERE distrito=? AND sec_loc=? AND local=?)
            """, (sc, dc, sub[0], sub[1], sub[2]))
            transferidos = c.rowcount
            conn.commit()
            return {"success": True, "transferidos": transferidos}

        if action == "guardar_local_coordenadas":
            # Un dirigente que esta fisicamente parado en el local marca su ubicacion con
            # el GPS del celular, para que el resto del equipo (y sus sub-dirigentes) vean
            # donde queda exactamente ese local.
            distrito = normalizar_texto(data.get("distrito", ""))
            sec_loc = normalizar_texto(data.get("sec_loc", ""))
            local = normalizar_texto(data.get("local", ""))
            lat = data.get("lat")
            lng = data.get("lng")
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not distrito or not sec_loc or not local or lat is None or lng is None:
                return {"success": False, "error": "Local y ubicación requeridos"}
            c.execute("""
                INSERT INTO locales_coordenadas (distrito, sec_loc, local, lat, lng, marcado_por_cedula, actualizado)
                VALUES (?,?,?,?,?,?,datetime('now','localtime'))
                ON CONFLICT(distrito, sec_loc, local) DO UPDATE SET
                    lat=excluded.lat, lng=excluded.lng, marcado_por_cedula=excluded.marcado_por_cedula,
                    actualizado=excluded.actualizado
            """, (distrito, sec_loc, local, float(lat), float(lng), dc))
            conn.commit()
            return {"success": True}

        if action == "posible_voto":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            vn = normalizar_texto(data.get("votante_nombre", ""))
            va = normalizar_texto(data.get("votante_apellido", ""))
            vm = int(data.get("votante_mesa", 0))
            vo = int(data.get("votante_orden", 0))
            vdepto = normalizar_texto(data.get("votante_departamento", ""))
            vdist = normalizar_texto(data.get("votante_distrito", ""))
            vzona = normalizar_texto(data.get("votante_zona", ""))
            # Uno o varios candidatos destinados a este votante, uno por cada cargo en juego
            # (ej: Intendente Y Concejal en Municipales). Acepta "candidatos":[id,...] (nuevo,
            # varios cargos a la vez) o "candidato_id": id (forma vieja, un solo candidato).
            cand_ids = data.get("candidatos")
            if cand_ids is None:
                single = data.get("candidato_id")
                cand_ids = [single] if single not in (None, '', 'null') else []
            cand_ids = [int(x) for x in cand_ids if x not in (None, '', 'null')]
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            # Regla: todo votante cargado debe estar en el padron (la unica excepcion
            # del sistema es el conductor de transporte, que no es un votante).
            if not c.execute("SELECT 1 FROM padron2026_completo WHERE cedula=?", (vc,)).fetchone():
                return {"success": False, "error": "El votante no está en el padrón"}
            if cand_ids:
                ph = ','.join('?' * len(cand_ids))
                asignados = {r[0] for r in c.execute(
                    f"SELECT candidato_id FROM dirigente_candidatos WHERE dirigente_cedula=? AND candidato_id IN ({ph})",
                    [dc] + cand_ids).fetchall()}
                no_asignados = [cid for cid in cand_ids if cid not in asignados]
                if no_asignados:
                    return {"success": False, "error": f"Candidato(s) {no_asignados} no estan entre tus candidatos asignados"}
            try:
                c.execute("""INSERT OR IGNORE INTO posible_votos
                    (dirigente_cedula, votante_cedula, votante_nombre, votante_apellido,
                     votante_mesa, votante_orden, votante_departamento, votante_distrito, votante_zona, status, candidato_id)
                    VALUES (?,?,?,?,?,?,?,?,?,'posible',?)""",
                    (dc, vc, vn, va, vm, vo, vdepto, vdist, vzona, cand_ids[0] if cand_ids else None))
                conn.commit()
                if c.rowcount == 0:
                    return {"success": False, "error": "El votante ya está en tu lista de PosiblesVotos"}
                pv_id = c.lastrowid
                for cid in cand_ids:
                    cargo_row = c.execute("SELECT cargo FROM candidatos WHERE id=?", (cid,)).fetchone()
                    if cargo_row:
                        c.execute("""INSERT OR REPLACE INTO posible_voto_candidatos (posible_voto_id, candidato_id, cargo)
                                     VALUES (?,?,?)""", (pv_id, cid, cargo_row[0]))
                conn.commit()
                return {"success": True, "accion": "agregado", "status": "posible"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        if action == "asignar_candidato_votante":
            # Asigna (o reasigna) los candidatos que un dirigente promociona a un votante
            # YA cargado en su lista. Antes solo se podía elegir el candidato al momento de
            # cargar el votante; los cargados sin candidato (o desde otro flujo) quedaban
            # "Sin candidato asignado para promocionar" sin forma de arreglarlo desde la UI.
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            cand_ids = data.get("candidatos")
            if cand_ids is None:
                single = data.get("candidato_id")
                cand_ids = [single] if single not in (None, '', 'null') else []
            cand_ids = [int(x) for x in cand_ids if x not in (None, '', 'null')]
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            pv = c.execute("SELECT id FROM posible_votos WHERE dirigente_cedula=? AND votante_cedula=?",
                           (dc, vc)).fetchone()
            if not pv:
                return {"success": False, "error": "El votante no está en tu lista"}
            pv_id = pv[0]
            # Todos los candidatos deben estar entre los asignados al dirigente.
            if cand_ids:
                ph = ','.join('?' * len(cand_ids))
                asignados = {r[0] for r in c.execute(
                    f"SELECT candidato_id FROM dirigente_candidatos WHERE dirigente_cedula=? AND candidato_id IN ({ph})",
                    [dc] + cand_ids).fetchall()}
                no_asignados = [cid for cid in cand_ids if cid not in asignados]
                if no_asignados:
                    return {"success": False, "error": f"Candidato(s) {no_asignados} no estan entre tus candidatos asignados"}
            # Reemplaza la asignación previa por la nueva (un candidato por cargo).
            c.execute("DELETE FROM posible_voto_candidatos WHERE posible_voto_id=?", (pv_id,))
            for cid in cand_ids:
                cargo_row = c.execute("SELECT cargo FROM candidatos WHERE id=?", (cid,)).fetchone()
                if cargo_row:
                    c.execute("""INSERT INTO posible_voto_candidatos (posible_voto_id, candidato_id, cargo)
                                 VALUES (?,?,?)""", (pv_id, cid, cargo_row[0]))
            # Sincroniza el campo legado posible_votos.candidato_id (primer candidato).
            c.execute("UPDATE posible_votos SET candidato_id=?, actualizado=datetime('now','localtime') WHERE id=?",
                      (cand_ids[0] if cand_ids else None, pv_id))
            conn.commit()
            return {"success": True, "accion": "candidatos_asignados", "total": len(cand_ids)}

        if action == "cambiar_estado_posible":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            nuevo_status = normalizar_texto(data.get("status", ""))
            if nuevo_status not in ("posible", "buscar", "vendra_solo", "no_responde"):
                return {"success": False, "error": "Estado inválido"}
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            c.execute("""UPDATE posible_votos SET status=?, actualizado=datetime('now','localtime')
                WHERE dirigente_cedula=? AND votante_cedula=?""", (nuevo_status, dc, vc))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "actualizado", "status": nuevo_status}
            return {"success": False, "error": "No se encontró el registro"}

        if action == "confirmar_voto_seguro":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            c.execute("""UPDATE posible_votos SET status='confirmado', confirmado_en=datetime('now','localtime'),
                actualizado=datetime('now','localtime')
                WHERE dirigente_cedula=? AND votante_cedula=?""", (dc, vc))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "confirmado", "status": "confirmado"}
            return {"success": False, "error": "No se encontró el registro"}

        if action == "guardar_telefono_votante":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            tel = normalizar_texto(str(data.get("telefono", ""))).strip()
            # Dejar solo dígitos (admite prefijo internacional tipo 595981...)
            tel_dig = re.sub(r"\D", "", tel)
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            if tel_dig and not (8 <= len(tel_dig) <= 15):
                return {"success": False, "error": "Teléfono inválido (8 a 15 dígitos)"}
            c.execute("""UPDATE posible_votos SET telefono=?, actualizado=datetime('now','localtime')
                WHERE dirigente_cedula=? AND votante_cedula=?""", (tel_dig, dc, vc))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "telefono_guardado", "telefono": tel_dig}
            return {"success": False, "error": "No se encontró el registro"}

        if action == "eliminar_posible":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            c.execute("DELETE FROM posible_votos WHERE dirigente_cedula=? AND votante_cedula=?", (dc, vc))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "eliminado"}
            return {"success": False, "error": "No se encontró el registro"}

        if action == "asignar_votante":
            dc = normalizar_cedula(data.get("dirigente_cedula", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            vn = normalizar_texto(data.get("votante_nombre", ""))
            vm = int(data.get("votante_mesa", 0))
            vo = int(data.get("votante_orden", 0))
            if not dc or not vc:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            try:
                c.execute("""INSERT OR IGNORE INTO dirigente_votantes
                    (dirigente_cedula, votante_cedula, votante_nombre, votante_mesa, votante_orden, activo)
                    VALUES (?,?,?,?,?,1)""", (dc, vc, vn, vm, vo))
                conn.commit()
                if c.rowcount > 0:
                    return {"success": True, "accion": "asignado"}
                return {"success": False, "error": "El votante ya estaba asignado a este dirigente"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        if action == "cambiar_contrasena":
            ced = normalizar_cedula(data.get("cedula", ""))
            old = normalizar_texto(data.get("contrasena_actual", ""))
            new = normalizar_texto(data.get("contrasena_nueva", ""))
            if not ced or not old or not new:
                return {"success": False, "error": "Todos los campos requeridos"}
            row = c.execute("SELECT cedula FROM usuarios WHERE cedula=? AND contrasena=?", (ced, old)).fetchone()
            if not row: return {"success": False, "error": "Contraseña actual incorrecta"}
            c.execute("UPDATE usuarios SET contrasena=? WHERE cedula=?", (new, ced))
            conn.commit()
            return {"success": True, "mensaje": "Contraseña actualizada"}

        if action == "registrar_transporte":
            ced = normalizar_cedula(data.get("cedula", ""))
            nom = normalizar_texto(data.get("nombre", ""))
            tipo = normalizar_texto(data.get("tipo", "vehiculo"))
            placa = normalizar_texto(data.get("placa", ""))
            tel = normalizar_texto(data.get("telefono", ""))
            cap = int(data.get("capacidad", 4))
            secc = normalizar_texto(data.get("seccional", ""))
            pw = normalizar_texto(data.get("contrasena", ""))
            if not ced or not nom:
                return {"success": False, "error": "Cédula y nombre requeridos"}
            c.execute("INSERT INTO transportes (cedula, nombre, tipo, placa, telefono, capacidad, seccional, contrasena) VALUES (?,?,?,?,?,?,?,?)",
                      (ced, nom, tipo, placa, tel, cap, secc, pw))
            transporte_id = c.lastrowid
            # Si tiene contraseña, crear cuenta de usuario y rol de conductor
            if pw:
                try:
                    pw_hash = hash_password(pw)
                    c.execute("INSERT OR IGNORE INTO cuentas_usuario (cedula, nombre, contrasena, telefono, activo) VALUES (?,?,?,?,1)",
                              (ced, nom, pw_hash, tel))
                    c.execute("INSERT OR IGNORE INTO asignaciones_rol (cedula, rol, activo) VALUES (?,'conductor',1)",
                              (ced,))
                except Exception:
                    pass
            conn.commit()
            return {"success": True, "accion": "creado", "id": transporte_id}

        if action == "registrar_ubicacion":
            t_id = data.get("transporte_id")
            ced = normalizar_cedula(data.get("cedula", ""))
            lat = data.get("lat")
            lng = data.get("lng")
            vel = float(data.get("velocidad", 0))
            direc = normalizar_texto(data.get("direccion", ""))
            if lat is None or lng is None:
                return {"success": False, "error": "Latitud y longitud requeridas"}
            c.execute("INSERT INTO ubicaciones_gps (transporte_id, cedula, lat, lng, velocidad, direccion) VALUES (?,?,?,?,?,?)",
                      (t_id, ced, float(lat), float(lng), vel, direc))
            conn.commit()
            return {"success": True, "accion": "registrado", "id": c.lastrowid}

        if action == "registrar_ruta":
            t_id = data.get("transporte_id")
            origen = normalizar_texto(data.get("origen", ""))
            destino = normalizar_texto(data.get("destino", ""))
            if not t_id or not destino:
                return {"success": False, "error": "Transporte y destino requeridos"}
            c.execute("INSERT INTO rutas (transporte_id, origen, destino) VALUES (?,?,?)",
                      (int(t_id), origen, destino))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "finalizar_ruta":
            r_id = data.get("ruta_id")
            if not r_id:
                return {"success": False, "error": "Ruta requerida"}
            c.execute("UPDATE rutas SET estado='completada', llegada=datetime('now','localtime') WHERE id=? AND estado IN ('pendiente','en_curso')", (int(r_id),))
            conn.commit()
            if c.rowcount > 0:
                return {"success": True, "accion": "finalizada"}
            return {"success": False, "error": "Ruta no encontrada o ya finalizada"}

        if action == "registrar_veedor":
            id_v = normalizar_texto(data.get("id_veedor", ""))
            nom_v = normalizar_texto(data.get("nombre_veedor", ""))
            ced_v = normalizar_cedula(data.get("cedula_veedor", ""))
            sec_id = data.get("seccional_id", 0)
            esc_id = data.get("escuela_id", 0)
            m_id = data.get("mesa_id", 0)
            tel_v = normalizar_texto(data.get("telefono", ""))
            if not id_v or not nom_v or not ced_v:
                return {"success": False, "error": "ID, nombre y cedula del veedor requeridos"}
            try:
                c.execute("INSERT INTO veedores_mesa (id_veedor, nombre_veedor, cedula_veedor, seccional_id, escuela_id, mesa_id, telefono) VALUES (?,?,?,?,?,?,?)",
                          (id_v, nom_v, ced_v, sec_id, esc_id, m_id, tel_v))
                conn.commit()
                return {"success": True, "accion": "creado"}
            except Exception as e:
                return {"success": False, "error": str(e)}

        if action == "confirmar_participacion":
            v_id = normalizar_texto(data.get("veedor_id", ""))
            vc = normalizar_cedula(data.get("votante_cedula", ""))
            vn = normalizar_texto(data.get("votante_nombre", ""))
            m_id = data.get("mesa_id", 0)
            if not v_id or not vc:
                return {"success": False, "error": "Veedor y votante requeridos"}
            hash_v = hashlib.sha256(f"{v_id}-{vc}-{int(time.time())}".encode()).hexdigest()
            c.execute("""INSERT INTO registro_participacion (veedor_id, votante_cedula, votante_nombre, mesa_id, confirmado_por_veedor, confirmado_por_votante, double_check, hash_validacion)
                         VALUES (?,?,?,?,1,1,1,?)""", (v_id, vc, vn, m_id, hash_v))
            conn.commit()
            return {"success": True, "accion": "confirmado", "hash": hash_v}

        # ─── PARTIDOS POLITICOS: ACCIONES ──────────────────────────
        # ─── MÓDULO ELECTORAL (POST) ──────────────────────────────
        if action == "crear_eleccion":
            _require_auth(data, 'master', conn)
            tipo_id = data.get("tipo_eleccion_id")
            nombre = normalizar_texto(data.get("nombre", ""))
            periodo = normalizar_texto(data.get("periodo", ""))
            if not tipo_id or not nombre:
                return {"success": False, "error": "Tipo de elección y nombre requeridos"}
            c.execute("""INSERT INTO elecciones (tipo_eleccion_id, nombre, periodo, fecha_eleccion, estado)
                VALUES (?,?,?,?,?)""",
                (int(tipo_id), nombre, periodo,
                 data.get("fecha_eleccion", ""),
                 data.get("estado", "previa")))
            conn.commit()
            log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                          'eleccion_creada', f'Elección "{nombre}" creada',
                          'elecciones', str(c.lastrowid))
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "activar_eleccion":
            _require_auth(data, 'master', conn)
            eid = data.get("id")
            if not eid: return {"success": False, "error": "ID requerido"}
            # Desactivar todas, activar una
            c.execute("UPDATE elecciones SET activo=0")
            c.execute("UPDATE elecciones SET activo=1, estado='activa' WHERE id=?", (int(eid),))
            conn.commit()
            return {"success": True, "accion": "activada"}

        if action == "crear_cargo_electivo":
            _require_auth(data, 'master', conn)
            codigo = normalizar_texto(data.get("codigo", "")).upper()
            nombre = normalizar_texto(data.get("nombre", ""))
            ambito = normalizar_texto(data.get("ambito", ""))
            if not codigo or not nombre or not ambito:
                return {"success": False, "error": "Código, nombre y ámbito requeridos"}
            c.execute("""INSERT INTO cargos_electivos
                (codigo, nombre, ambito, tipo_cargo, permite_suplente, permite_lista,
                 permite_voto_preferente, requiere_circunscripcion, permite_chapa,
                 requiere_departamento, requiere_distrito, orden_visual)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (codigo, nombre, ambito,
                 data.get("tipo_cargo", "plurinominal"),
                 int(data.get("permite_suplente", 1)),
                 int(data.get("permite_lista", 1)),
                 int(data.get("permite_voto_preferente", 0)),
                 int(data.get("requiere_circunscripcion", 0)),
                 int(data.get("permite_chapa", 0)),
                 int(data.get("requiere_departamento", 0)),
                 int(data.get("requiere_distrito", 0)),
                 int(data.get("orden_visual", 0))))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "crear_lista_electoral":
            _require_auth(data, 'master', conn)
            eleccion_id = data.get("eleccion_id")
            partido_id = data.get("partido_id")
            cargo_id = data.get("cargo_id")
            circunscripcion_id = data.get("circunscripcion_id")
            numero_lista = data.get("numero_lista")
            nombre_lista = normalizar_texto(data.get("nombre_lista", ""))
            if not eleccion_id or not partido_id or not cargo_id or not numero_lista:
                return {"success": False, "error": "Elección, partido, cargo y número requeridos"}
            # Validar elección activa
            e_row = c.execute("SELECT estado FROM elecciones WHERE id=?", (int(eleccion_id),)).fetchone()
            if not e_row or e_row[0] == 'cerrada':
                return {"success": False, "error": "La elección no está activa"}
            c.execute("""INSERT INTO listas_partido
                (partido_id, numero_lista, nombre_lista, tipo_lista, color_hex, orden,
                 eleccion_id, cargo_id, circunscripcion_id, tipo_postulacion)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (int(partido_id), int(numero_lista), nombre_lista,
                 data.get("tipo_lista", "oficial"),
                 data.get("color_hex", ""),
                 int(data.get("orden", 0)),
                 int(eleccion_id), int(cargo_id),
                 int(circunscripcion_id) if circunscripcion_id else None,
                 data.get("tipo_postulacion", "lista")))
            conn.commit()
            log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                          'lista_creada', f'Lista {numero_lista} "{nombre_lista}" creada',
                          'listas_partido', str(c.lastrowid))
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "agregar_candidatura":
            _require_auth(data, 'master', conn)
            lista_id = data.get("lista_id")
            cargo_id = data.get("cargo_id")
            nombre_completo = normalizar_texto(data.get("nombre_completo", ""))
            cedula = normalizar_cedula(data.get("cedula", ""))
            tipo_postulacion = normalizar_texto(data.get("tipo_postulacion", "titular"))
            orden_en_lista = data.get("orden_en_lista")
            if not lista_id or not nombre_completo or orden_en_lista is None:
                return {"success": False, "error": "Lista, nombre y orden requeridos"}
            # Validar lista existe
            l_row = c.execute("SELECT id, cargo_id, circunscripcion_id FROM listas_partido WHERE id=?", (int(lista_id),)).fetchone()
            if not l_row:
                return {"success": False, "error": "Lista no encontrada"}
            # Si tiene cédula, validar que no esté duplicada en mismo cargo/circunscripción
            if cedula:
                dup = c.execute("""SELECT id FROM candidatos_lista cl
                    JOIN listas_partido lp ON lp.id = cl.lista_id
                    WHERE cl.cedula=? AND cl.activo=1
                    AND lp.cargo_id=? AND lp.circunscripcion_id=?""",
                    (cedula, l_row[1] or cargo_id, l_row[2])).fetchone()
                if dup:
                    return {"success": False, "error": "Esta cédula ya está registrada como candidata en este cargo/circunscripción"}
            # Validar límite de bancas
            if tipo_postulacion in ('titular', 'suplente'):
                tipo_col = 'cantidad_bancas' if tipo_postulacion == 'titular' else 'cantidad_suplentes'
                # FIX: SQL injection - validar columna contra whitelist antes de usar en query dinámica.
                tipo_col_segura = validar_columna(tipo_col)
                regla = c.execute(f"""SELECT SUM({tipo_col_segura}) FROM reglas_cargo
                    WHERE cargo_id=? AND (circunscripcion_id=? OR circunscripcion_id IS NULL)
                    AND activo=1""", (l_row[1] or cargo_id, l_row[2])).fetchone()
                limite = regla[0] if regla and regla[0] else 999
                actual = c.execute("""SELECT COUNT(*) FROM candidatos_lista
                    WHERE lista_id=? AND tipo_postulacion=? AND activo=1""",
                    (int(lista_id), tipo_postulacion)).fetchone()[0]
                if actual >= limite:
                    return {"success": False, "error": f"Límite de {tipo_postulacion}s alcanzado: {limite} (actual: {actual})"}
            c.execute("""INSERT INTO candidatos_lista
                (lista_id, nombre_completo, orden_en_lista, tipo_postulacion, cargo_id,
                 cedula, foto_url, eleccion_id, circunscripcion_id)
                VALUES (?,?,?,?,?,?,?,?,?)""",
                (int(lista_id), nombre_completo, int(orden_en_lista),
                 tipo_postulacion, int(l_row[1]) if l_row[1] else (int(cargo_id) if cargo_id else None),
                 cedula or None, data.get("foto_url", ""),
                 data.get("eleccion_id"), l_row[2]))
            conn.commit()
            log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                          'candidatura_agregada', f'{nombre_completo} ({tipo_postulacion}) agregado',
                          'candidatos_lista', str(c.lastrowid))
            return {"success": True, "accion": "agregado", "id": c.lastrowid}

        if action == "crear_chapa":
            _require_auth(data, 'master', conn)
            eleccion_id = data.get("eleccion_id")
            partido_id = data.get("partido_id")
            cargo_id = data.get("cargo_id")
            nombre_chapa = normalizar_texto(data.get("nombre_chapa", ""))
            presidente_id = data.get("presidente_id")
            vicepresidente_id = data.get("vicepresidente_id")
            if not eleccion_id or not partido_id or not cargo_id or not nombre_chapa:
                return {"success": False, "error": "Elección, partido, cargo y nombre requeridos"}
            if not presidente_id or not vicepresidente_id:
                return {"success": False, "error": "Presidente y Vicepresidente requeridos para la chapa"}
            c.execute("""INSERT INTO chapas
                (eleccion_id, partido_id, cargo_id, nombre_chapa, numero_lista,
                 color_hex, presidente_id, vicepresidente_id)
                VALUES (?,?,?,?,?,?,?,?)""",
                (int(eleccion_id), int(partido_id), int(cargo_id),
                 nombre_chapa, data.get("numero_lista"),
                 data.get("color_hex", ""),
                 int(presidente_id), int(vicepresidente_id)))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "vincular_intendente_concejal":
            _require_auth(data, 'master', conn)
            eleccion_id = data.get("eleccion_id")
            partido_id = data.get("partido_id")
            intendente_id = data.get("intendente_id")
            concejal_id = data.get("concejal_id")
            if not intendente_id or not concejal_id:
                return {"success": False, "error": "Intendente y concejal requeridos"}
            c.execute("""INSERT OR IGNORE INTO estructura_politica
                (eleccion_id, partido_id, intendente_id, concejal_id, tipo_relacion)
                VALUES (?,?,?,?,?)""",
                (int(eleccion_id) if eleccion_id else None,
                 int(partido_id) if partido_id else None,
                 int(intendente_id), int(concejal_id), 'coordina'))
            conn.commit()
            return {"success": True, "accion": "vinculado"}

        if action == "vincular_concejal_pc":
            _require_auth(data, 'master', conn)
            eleccion_id = data.get("eleccion_id")
            partido_id = data.get("partido_id")
            concejal_id = data.get("concejal_id")
            pc_id = data.get("pc_id")
            if not concejal_id or not pc_id:
                return {"success": False, "error": "Concejal y PC requeridos"}
            c.execute("""INSERT OR IGNORE INTO estructura_politica
                (eleccion_id, partido_id, concejal_id, pc_id, tipo_relacion)
                VALUES (?,?,?,?,?)""",
                (int(eleccion_id) if eleccion_id else None,
                 int(partido_id) if partido_id else None,
                 int(concejal_id), int(pc_id), 'coordina'))
            conn.commit()
            return {"success": True, "accion": "vinculado"}

        if action == "vincular_pc_dirigente":
            _require_auth(data, 'master', conn)
            pc_id = data.get("pc_id")
            dirigente_cedula = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not pc_id or not dirigente_cedula:
                return {"success": False, "error": "PC y dirigente requeridos"}
            # Already exists: grupo_dirigentes table
            c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)",
                      (int(pc_id), dirigente_cedula))
            conn.commit()
            return {"success": True, "accion": "vinculado"}

        if action == "vincular_dirigente_elector":
            _require_auth(data, 'dirigente', conn)
            dirigente_cedula = normalizar_cedula(data.get("dirigente_cedula", ""))
            votante_cedula = normalizar_cedula(data.get("votante_cedula", ""))
            if not dirigente_cedula or not votante_cedula:
                return {"success": False, "error": "Dirigente y votante requeridos"}
            # Exists: posible_votos table
            c.execute("""INSERT OR IGNORE INTO posible_votos
                (dirigente_cedula, votante_cedula, status)
                VALUES (?,?,?)""", (dirigente_cedula, votante_cedula, 'posible'))
            conn.commit()
            return {"success": True, "accion": "vinculado"}

        if action == "validar_lista_candidatos":
            _require_auth(data, 'master', conn)
            lista_id = data.get("lista_id")
            if not lista_id:
                return {"success": False, "error": "Lista requerida"}
            # Obtener info de la lista
            lp = c.execute("""SELECT lp.*, ce.codigo as cargo_codigo, ce.nombre as cargo_nombre,
                ce.permite_suplente, c.cantidad_bancas, c.cantidad_suplentes
                FROM listas_partido lp
                JOIN cargos_electivos ce ON ce.id = lp.cargo_id
                LEFT JOIN circunscripciones c ON c.id = lp.circunscripcion_id
                WHERE lp.id=?""", (int(lista_id),)).fetchone()
            if not lp:
                return {"success": False, "error": "Lista no encontrada"}
            titulares = c.execute("SELECT COUNT(*) FROM candidatos_lista WHERE lista_id=? AND tipo_postulacion='titular' AND activo=1", (int(lista_id),)).fetchone()[0]
            suplentes = c.execute("SELECT COUNT(*) FROM candidatos_lista WHERE lista_id=? AND tipo_postulacion='suplente' AND activo=1", (int(lista_id),)).fetchone()[0]
            max_tit = lp['cantidad_bancas'] or 0
            max_sup = lp['cantidad_suplentes'] or 0
            errores = []
            if max_tit > 0 and titulares > max_tit:
                errores.append(f"Excedido: {titulares} titulares (máx {max_tit})")
            if max_sup > 0 and suplentes > max_sup:
                errores.append(f"Excedido: {suplentes} suplentes (máx {max_sup})")
            if titulares == 0:
                errores.append("No hay candidatos titulares")
            ok = len(errores) == 0
            return {"success": True, "valida": ok, "titulares": titulares, "suplentes": suplentes,
                    "max_titulares": max_tit, "max_suplentes": max_sup, "errores": errores}

        # ─── FIN MÓDULO ELECTORAL ──────────────────────────────────

        if action == "crear_partido":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            codigo = normalizar_texto(data.get("codigo_partido", "")).upper()
            nombre_oficial = normalizar_texto(data.get("nombre_oficial", ""))
            sigla = normalizar_texto(data.get("sigla", ""))
            if not codigo or not nombre_oficial:
                return {"success": False, "error": "Código y nombre oficial requeridos"}
            existing = c.execute("SELECT id FROM partidos WHERE codigo_partido=?", (codigo,)).fetchone()
            if existing:
                return {"success": False, "error": f"Ya existe un partido con código {codigo}"}
            c.execute("""INSERT INTO partidos
                (codigo_partido, nombre_oficial, sigla, descripcion_corta,
                 color_principal_hex, color_secundario_hex, logo_url,
                 numero_inscripcion, fecha_inscripcion, estado_juridico,
                 numero_lista, ambito, distrito_id, puede_postular_concejales,
                 cargos_habilitados, visible_en_boleta, prioridad_orden,
                 cliente_cedula, usuario_ultimo_cambio, color_partido)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (codigo, nombre_oficial, sigla or codigo,
                 data.get("descripcion_corta", ""),
                 data.get("color_principal_hex", "#333333"),
                 data.get("color_secundario_hex", "#FFFFFF"),
                 data.get("logo_url", ""),
                 data.get("numero_inscripcion", ""),
                 data.get("fecha_inscripcion", ""),
                 data.get("estado_juridico", "Activo"),
                 data.get("numero_lista"),
                 data.get("ambito", "Nacional"),
                 data.get("distrito_id"),
                 int(data.get("puede_postular_concejales", 1)),
                 data.get("cargos_habilitados", "[]"),
                 int(data.get("visible_en_boleta", 1)),
                 int(data.get("prioridad_orden", 0)),
                 normalizar_cedula(data.get("cliente_cedula", "")),
                 normalizar_texto(data.get("cedula_auth", "")),
                 data.get("color_partido", "")))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "editar_partido":
            if not _require_auth(data, 'master', conn):
                raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
            pid = data.get("id")
            if not pid:
                return {"success": False, "error": "ID del partido requerido"}
            upd_fields = ["codigo_partido", "nombre_oficial", "sigla", "descripcion_corta",
                          "color_principal_hex", "color_secundario_hex", "logo_url",
                          "numero_inscripcion", "fecha_inscripcion", "estado_juridico",
                          "numero_lista", "ambito", "distrito_id", "puede_postular_concejales",
                          "cargos_habilitados", "visible_en_boleta", "prioridad_orden",
                          "cliente_cedula", "color_partido"]
            updates = []
            params = []
            for campo in upd_fields:
                if campo in data:
                    val = data[campo]
                    if campo in ("numero_lista", "distrito_id", "prioridad_orden"):
                        val = int(val) if val is not None else None
                    elif campo in ("puede_postular_concejales", "visible_en_boleta"):
                        val = int(val) if val is not None else 1
                    elif campo == "cliente_cedula":
                        val = normalizar_cedula(str(val)) if val else None
                    elif campo in ("codigo_partido", "sigla", "color_partido"):
                        val = normalizar_texto(str(val)).upper() if val else None
                    else:
                        val = normalizar_texto(str(val))
                    updates.append(f"{campo}=?")
                    params.append(val)
            updates.append("fecha_actualizacion=datetime('now','localtime')")
            params.append(int(pid))
            c.execute(f"UPDATE partidos SET {', '.join(updates)} WHERE id=?", params)
            conn.commit()
            log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                          'partido_actualizado', f'Partido ID {pid} actualizado',
                          'partidos', str(pid), severidad='info')
            return {"success": True, "accion": "actualizado"}

        if action == "crear_lista_partido":
            _require_auth(data, 'master', conn)
            partido_id = data.get("partido_id")
            numero_lista = data.get("numero_lista")
            nombre_lista = normalizar_texto(data.get("nombre_lista", ""))
            tipo_lista = normalizar_texto(data.get("tipo_lista", "Plurinominal"))
            if not partido_id or not numero_lista or not nombre_lista:
                return {"success": False, "error": f"Partido({partido_id}), número({numero_lista}), nombre({nombre_lista}) requeridos"}
            # Verify partido exists
            p_check = c.execute("SELECT id FROM partidos WHERE id=?", (int(partido_id),)).fetchone()
            if not p_check:
                return {"success": False, "error": f"Partido ID {partido_id} no encontrado"}
            c.execute("""INSERT INTO listas_partido
                (partido_id, numero_lista, nombre_lista, tipo_lista, color_hex, orden)
                VALUES (?,?,?,?,?,?)""",
                (int(partido_id), int(numero_lista), nombre_lista, tipo_lista,
                 data.get("color_hex", ""), int(data.get("orden", 0))))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "editar_lista_partido":
            _require_auth(data, 'master', conn)
            lid = data.get("id")
            if not lid:
                return {"success": False, "error": "ID de lista requerido"}
            upd = []
            params = []
            for campo in ["numero_lista", "nombre_lista", "tipo_lista", "color_hex", "orden", "activo"]:
                if campo in data:
                    val = data[campo]
                    if campo in ("numero_lista", "orden", "activo"):
                        val = int(val)
                    else:
                        val = normalizar_texto(str(val))
                    upd.append(f"{campo}=?")
                    params.append(val)
            if not upd:
                return {"success": False, "error": "No hay campos para actualizar"}
            params.append(int(lid))
            c.execute(f"UPDATE listas_partido SET {', '.join(upd)} WHERE id=?", params)
            conn.commit()
            return {"success": True, "accion": "actualizado"}

        if action == "eliminar_lista_partido":
            _require_auth(data, 'master', conn)
            lid = data.get("id")
            if not lid:
                return {"success": False, "error": "ID de lista requerido"}
            c.execute("DELETE FROM candidatos_lista WHERE lista_id=?", (int(lid),))
            c.execute("DELETE FROM listas_partido WHERE id=?", (int(lid),))
            conn.commit()
            return {"success": True, "accion": "eliminado"}

        if action == "agregar_candidato_lista":
            _require_auth(data, 'master', conn)
            lista_id = data.get("lista_id")
            nombre_completo = normalizar_texto(data.get("nombre_completo", ""))
            orden_en_lista = data.get("orden_en_lista")
            cargo = normalizar_texto(data.get("cargo", "Concejal Titular"))
            candidato_id = data.get("candidato_id")
            if not lista_id or not nombre_completo or orden_en_lista is None:
                return {"success": False, "error": f"Lista({lista_id}), nombre({nombre_completo}), orden({orden_en_lista}) requeridos"}
            # Verify lista exists
            l_check = c.execute("SELECT id FROM listas_partido WHERE id=?", (int(lista_id),)).fetchone()
            if not l_check:
                return {"success": False, "error": f"Lista ID {lista_id} no encontrada"}
            c.execute("""INSERT INTO candidatos_lista
                (lista_id, nombre_completo, orden_en_lista, cargo, candidato_id)
                VALUES (?,?,?,?,?)""",
                (int(lista_id), nombre_completo, int(orden_en_lista),
                 cargo, int(candidato_id) if candidato_id else None))
            conn.commit()
            return {"success": True, "accion": "agregado", "id": c.lastrowid}

        if action == "reordenar_candidatos_lista":
            _require_auth(data, 'master', conn)
            lista_id = data.get("lista_id")
            ordenes = data.get("ordenes")  # array de {id, orden_en_lista}
            if not lista_id or not ordenes:
                return {"success": False, "error": "Lista y ordenes requeridos"}
            for item in ordenes:
                c.execute("UPDATE candidatos_lista SET orden_en_lista=? WHERE id=? AND lista_id=?",
                          (int(item['orden_en_lista']), int(item['id']), int(lista_id)))
            conn.commit()
            return {"success": True, "accion": "reordenado"}

        if action == "eliminar_candidato_lista":
            _require_auth(data, 'master', conn)
            clid = data.get("id")
            if not clid:
                return {"success": False, "error": "ID requerido"}
            c.execute("DELETE FROM candidatos_lista WHERE id=?", (int(clid),))
            conn.commit()
            return {"success": True, "accion": "eliminado"}

        if action == "toggle_partido":
            _require_auth(data, 'master', conn)
            pid = data.get("id")
            if not pid:
                return {"success": False, "error": "ID de partido requerido"}
            row = c.execute("SELECT visible_en_boleta FROM partidos WHERE id=?", (int(pid),)).fetchone()
            if not row:
                return {"success": False, "error": "Partido no encontrado"}
            nuevo = 0 if row[0] == 1 else 1
            c.execute("UPDATE partidos SET visible_en_boleta=? WHERE id=?", (nuevo, int(pid)))
            conn.commit()
            return {"success": True, "visible_en_boleta": nuevo}

        # ─── FIN PARTIDOS ──────────────────────────────────────────

        if action == "asistencia_register":
            _require_auth(data, 'dirigente', conn)
            ced = normalizar_cedula(data.get("cedula", ""))
            nom = normalizar_texto(data.get("nombre", ""))
            mesa_val = int(data.get("mesa", 0))
            estado = normalizar_texto(data.get("estado", "presente"))
            obs = normalizar_texto(data.get("observacion", ""))
            accion = normalizar_texto(data.get("accion", "ingreso"))  # ingreso/salida
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            if accion == "salida":
                c.execute("UPDATE asistencia_miembros SET hora_salida=time('now','localtime'), estado='salida' WHERE cedula=? AND fecha=date('now','localtime') AND hora_salida=''", (ced,))
                conn.commit()
                return {"success": True, "accion": "salida_registrada"}
            c.execute("INSERT INTO asistencia_miembros (cedula, nombre, mesa, estado, observacion) VALUES (?,?,?,?,?)",
                      (ced, nom, mesa_val, estado, obs))
            conn.commit()
            return {"success": True, "accion": "ingreso_registrado", "id": c.lastrowid}

        # ─── PANEL DEL CLIENTE: ACCIONES POST ──────────────────────────
        if action == "crear_pc":
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            zona = normalizar_texto(data.get("zona", ""))
            seccional = normalizar_texto(data.get("seccional", ""))
            if not ced or not nombre:
                return {"success": False, "error": "Cédula y nombre del PC requeridos"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
            if not cand:
                return {"success": False, "error": "No hay candidato asociado"}
            c.execute("INSERT INTO grupos_trabajo (nombre, candidato_id, zona, seccional) VALUES (?,?,?,?)",
                      (nombre, cand[0], zona, seccional))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "eliminar_pc":
            ced = normalizar_cedula(data.get("cedula", ""))
            pc_id = data.get("pc_id")
            if not pc_id or not ced:
                return {"success": False, "error": "pc_id y cédula requeridos"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
            if not cand:
                return {"success": False, "error": "No hay candidato asociado"}
            gr = c.execute("SELECT id FROM grupos_trabajo WHERE id=? AND candidato_id=?", (int(pc_id), cand[0])).fetchone()
            if not gr:
                return {"success": False, "error": "PC no encontrado o no pertenece a este candidato"}
            c.execute("UPDATE grupos_trabajo SET activo=0 WHERE id=?", (int(pc_id),))
            c.execute("DELETE FROM grupo_dirigentes WHERE grupo_id=?", (int(pc_id),))
            conn.commit()
            return {"success": True, "accion": "eliminado"}

        if action == "crear_dirigente":
            ced_cliente = normalizar_cedula(data.get("cedula", ""))
            ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
            nombre = normalizar_texto(data.get("dirigente_nombre", ""))
            tipo = normalizar_texto(data.get("dirigente_tipo", "dirigente"))
            grupo_id = data.get("grupo_id")
            if not ced_cliente or not ced_dir or not nombre or not grupo_id:
                return {"success": False, "error": "Cédulas, nombre y PC requeridos"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced_cliente,)).fetchone()
            if not cand:
                return {"success": False, "error": "No hay candidato asociado"}
            gr = c.execute("SELECT id FROM grupos_trabajo WHERE id=? AND candidato_id=?", (int(grupo_id), cand[0])).fetchone()
            if not gr:
                return {"success": False, "error": "PC no encontrado o no pertenece a este candidato"}
            existing = c.execute("SELECT cedula FROM dirigentes WHERE cedula=?", (ced_dir,)).fetchone()
            if not existing:
                c.execute("INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula) VALUES (?,?,?,?,?)",
                          (ced_dir, nombre, default_password(ced_dir), tipo, ced_cliente))
            else:
                c.execute("UPDATE dirigentes SET tipo=?, cliente_cedula=?, nombre=? WHERE cedula=?",
                          (tipo, ced_cliente, nombre, ced_dir))
            c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)",
                      (int(grupo_id), ced_dir))
            conn.commit()
            return {"success": True, "accion": "creado"}

        if action == "dirigente_crear_subdirigente":
            # Un dirigente ya autenticado carga por cédula a un sub-dirigente o colaborador propio.
            # Hereda automáticamente el cliente_cedula y el/los grupo(s) de trabajo (PC) del dirigente padre,
            # para no exponerle ninguna lista de PCs/candidatos (evita fuga de información).
            ced_padre = normalizar_cedula(data.get("cedula_auth", ""))
            pw_padre = normalizar_texto(data.get("password_auth", ""))
            ced_nuevo = normalizar_cedula(data.get("cedula", ""))
            nombre_nuevo = normalizar_texto(data.get("nombre", ""))
            email_nuevo = normalizar_texto(data.get("email", "")).lower()
            tipo_nuevo = normalizar_texto(data.get("tipo", "dirigente")) or "dirigente"
            if not ced_padre or not pw_padre:
                return {"success": False, "error": "Autenticación requerida"}
            padre = _authenticate(ced_padre, pw_padre, conn=conn)
            if not padre:
                raise HTTPException(status_code=401, detail="Autenticación fallida")
            es_dirigente = any(r.get("rol") == "dirigente" for r in padre.get("roles", []))
            if not es_dirigente:
                return {"success": False, "error": "Solo un dirigente puede cargar sub-dirigentes"}
            if not ced_nuevo or not nombre_nuevo:
                return {"success": False, "error": "Cédula y nombre requeridos"}
            if not email_nuevo or '@' not in email_nuevo:
                return {"success": False, "error": "El mail del sub-dirigente es obligatorio, se usa para crearle la cuenta"}
            if ced_nuevo == ced_padre:
                return {"success": False, "error": "No podés cargarte a vos mismo"}
            existing = c.execute("SELECT cedula FROM dirigentes WHERE cedula=?", (ced_nuevo,)).fetchone()
            if existing:
                return {"success": False, "error": "Ya existe un dirigente con esa cédula"}
            row_padre = c.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (ced_padre,)).fetchone()
            cliente_cedula = row_padre[0] if row_padre else None
            pw_default = default_password(ced_nuevo)
            c.execute("INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula, creado_por_cedula, email) VALUES (?,?,?,?,?,?,?)",
                      (ced_nuevo, nombre_nuevo, pw_default, tipo_nuevo, cliente_cedula, ced_padre, email_nuevo))
            grupos_padre = c.execute("SELECT grupo_id FROM grupo_dirigentes WHERE dirigente_cedula=?", (ced_padre,)).fetchall()
            for g in grupos_padre:
                c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)", (g[0], ced_nuevo))
            conn.commit()
            log_auditoria(ced_padre, padre.get('nombre', ''), 'subdirigente_creado',
                          f'Dirigente {ced_padre} cargó a {nombre_nuevo} (#{ced_nuevo}) como {tipo_nuevo}',
                          'dirigentes', ced_nuevo, severidad='info')
            email_enviado = False
            try:
                email_enviado = enviar_email_cuenta_nueva(email_nuevo, nombre_nuevo, ced_nuevo, pw_default, "dirigente.html")
            except Exception as e:
                print(f"[SUBDIRIGENTE] Error enviando mail de cuenta a {ced_nuevo}: {e}")
            return {"success": True, "accion": "creado", "cedula": ced_nuevo, "password_default": pw_default, "email_enviado": email_enviado}

        # ─── VINCULACIÓN SUB-DIRIGENTE: SOLICITUD ───────────────────────────────
        if action == "solicitar_vinculo_subdirigente":
            # El sub-dirigente (ya registrado, sin dirigente asignado) pide
            # vincularse a un dirigente por su cédula. Queda PENDIENTE hasta que
            # el dirigente acepte. No requiere contraseña del dirigente.
            ced_sub = normalizar_cedula(data.get("cedula", ""))
            ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not ced_sub or not ced_dir:
                return {"success": False, "error": "Tu cédula y la del dirigente son requeridas"}
            if ced_sub == ced_dir:
                return {"success": False, "error": "No podés vincularte a vos mismo"}
            sub = c.execute("SELECT cedula, nombre, email FROM dirigentes WHERE cedula=? AND activo=1", (ced_sub,)).fetchone()
            if not sub:
                return {"success": False, "error": "Tu cédula no está registrada como dirigente"}
            dir_padre = c.execute("SELECT cedula, nombre FROM dirigentes WHERE cedula=? AND activo=1", (ced_dir,)).fetchone()
            if not dir_padre:
                return {"success": False, "error": "No existe un dirigente con esa cédula"}
            row_creado = c.execute("SELECT creado_por_cedula FROM dirigentes WHERE cedula=?", (ced_sub,)).fetchone()
            if row_creado and row_creado[0]:
                return {"success": False, "error": "Ya estás vinculado a un dirigente"}
            dup = c.execute(
                "SELECT id FROM solicitudes_vinculo_subdirigente WHERE subdirigente_cedula=? AND estado='pendiente'",
                (ced_sub,)).fetchone()
            if dup:
                return {"success": False, "error": "Ya tenés una solicitud pendiente"}
            c.execute("""INSERT INTO solicitudes_vinculo_subdirigente
                         (subdirigente_cedula, subdirigente_nombre, subdirigente_email, dirigente_cedula, estado)
                         VALUES (?,?,?,?, 'pendiente')""",
                      (ced_sub, sub[1] or '', sub[2] or '', ced_dir))
            conn.commit()
            log_auditoria(ced_sub, sub[1] or '', 'solicitud_vinculo_enviada',
                          f'Sub-dirigente {sub[1]} (#{ced_sub}) solicitó vincularse al dirigente #{ced_dir}',
                          'solicitudes_vinculo_subdirigente', ced_sub, severidad='info')
            return {"success": True, "accion": "solicitud_enviada", "dirigente_nombre": dir_padre[1] or ''}

        # ─── VINCULACIÓN SUB-DIRIGENTE: DIRIGENTE VE SOLICITUDES ────────────────
        if action == "mis_solicitudes_vinculo":
            # El dirigente autenticado ve las solicitudes pendientes que le hicieron.
            ced_dir = normalizar_cedula(data.get("cedula", "") or data.get("cedula_auth", ""))
            if not ced_dir:
                return {"success": False, "error": "Cédula del dirigente requerida"}
            sols = c.execute("""SELECT id, subdirigente_cedula, subdirigente_nombre, subdirigente_email,
                                       creado, estado
                                FROM solicitudes_vinculo_subdirigente
                                WHERE dirigente_cedula=? AND estado='pendiente'
                                ORDER BY creado DESC""", (ced_dir,)).fetchall()
            cols = ['id', 'subdirigente_cedula', 'subdirigente_nombre', 'subdirigente_email', 'creado', 'estado']
            items = [row_to_dict(r, cols) for r in sols]
            return {"success": True, "solicitudes": items, "total": len(items)}

        # ─── VINCULACIÓN SUB-DIRIGENTE: DIRIGENTE ACEPTA/RECHAZA ────────────────
        if action == "responder_vinculo_subdirigente":
            # El dirigente acepta o rechaza una solicitud. Si acepta, setea
            # creado_por_cedula del sub-dirigente y hereda cliente + grupos.
            ced_dir = normalizar_cedula(data.get("cedula", "") or data.get("cedula_auth", ""))
            sol_id = data.get("solicitud_id")
            respuesta = normalizar_texto(data.get("respuesta", "")).lower()
            if not ced_dir or not sol_id or respuesta not in ("aceptar", "rechazar"):
                return {"success": False, "error": "solicitud_id y respuesta ('aceptar'/'rechazar') requeridos"}
            sol = c.execute("SELECT id, subdirigente_cedula, subdirigente_nombre, dirigente_cedula, estado FROM solicitudes_vinculo_subdirigente WHERE id=?",
                            (int(sol_id),)).fetchone()
            if not sol:
                return {"success": False, "error": "Solicitud no encontrada"}
            if sol[3] != ced_dir:
                return {"success": False, "error": "Esta solicitud no te corresponde"}
            if sol[4] != 'pendiente':
                return {"success": False, "error": "La solicitud ya fue resuelta"}
            ced_sub, nom_sub = sol[1], sol[2] or ''
            if respuesta == "rechazar":
                c.execute("UPDATE solicitudes_vinculo_subdirigente SET estado='rechazado', resuelto=datetime('now','localtime'), resuelto_por=? WHERE id=?",
                          (ced_dir, int(sol_id)))
                conn.commit()
                log_auditoria(ced_dir, '', 'vinculo_rechazado',
                              f'Dirigente {ced_dir} rechazó vinculación de {nom_sub} (#{ced_sub})',
                              'solicitudes_vinculo_subdirigente', ced_sub, severidad='info')
                return {"success": True, "accion": "rechazado"}
            # ACEPTAR: vincular
            sub_row = c.execute("SELECT nombre, creado_por_cedula FROM dirigentes WHERE cedula=?", (ced_sub,)).fetchone()
            if not sub_row:
                return {"success": False, "error": "El sub-dirigente ya no existe"}
            if sub_row[1]:
                c.execute("UPDATE solicitudes_vinculo_subdirigente SET estado='aceptado', resuelto=datetime('now','localtime'), resuelto_por=? WHERE id=?",
                          (ced_dir, int(sol_id)))
                conn.commit()
                return {"success": False, "error": "Ese sub-dirigente ya se vinculó a otro dirigente"}
            cliente_row = c.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (ced_dir,)).fetchone()
            cliente_cedula = cliente_row[0] if cliente_row else None
            c.execute("UPDATE dirigentes SET creado_por_cedula=?, cliente_cedula=COALESCE(cliente_cedula, ?) WHERE cedula=?",
                      (ced_dir, cliente_cedula, ced_sub))
            grupos_padre = c.execute("SELECT grupo_id FROM grupo_dirigentes WHERE dirigente_cedula=?", (ced_dir,)).fetchall()
            for g in grupos_padre:
                c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)", (g[0], ced_sub))
            c.execute("UPDATE solicitudes_vinculo_subdirigente SET estado='aceptado', resuelto=datetime('now','localtime'), resuelto_por=? WHERE id=?",
                      (ced_dir, int(sol_id)))
            conn.commit()
            log_auditoria(ced_dir, '', 'vinculo_aceptado',
                          f'Dirigente {ced_dir} aceptó vinculación de {nom_sub} (#{ced_sub})',
                          'dirigentes', ced_sub, severidad='info')
            return {"success": True, "accion": "aceptado", "subdirigente_cedula": ced_sub}


        if action == "quitar_dirigente":
            grupo_id = data.get("grupo_id")
            ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not grupo_id or not ced_dir:
                return {"success": False, "error": "grupo_id y dirigente requeridos"}
            c.execute("DELETE FROM grupo_dirigentes WHERE grupo_id=? AND dirigente_cedula=?",
                     (int(grupo_id), ced_dir))
            conn.commit()
            return {"success": True, "accion": "quitado"}

        if action == "desvincular_dirigente_cliente":
            # El cliente/candidato desvincula a un dirigente de SU campaña: deja de
            # figurar en su panel (conteos, listas), pero la cuenta del dirigente NO
            # se borra ni se desactiva — puede seguir usando la plataforma con su
            # cédula y contraseña, solo que ya no está asociado a este candidato.
            # Regla: la PRIMERA desvinculación de esta pareja cliente-dirigente es
            # unilateral e inmediata. Si el cliente lo vuelve a vincular y luego lo
            # desvincula de nuevo, esa segunda vez queda pendiente de que el propio
            # dirigente la acepte.
            ced_cliente = normalizar_cedula(data.get("cedula", ""))
            ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
            if not ced_cliente or not ced_dir:
                return {"success": False, "error": "Cliente y dirigente requeridos"}
            dir_row = c.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (ced_dir,)).fetchone()
            if not dir_row:
                return {"success": False, "error": "Dirigente no encontrado"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced_cliente,)).fetchone()
            pertenece = (dir_row[0] == ced_cliente)
            if not pertenece and cand:
                en_grupo = c.execute("""SELECT 1 FROM grupo_dirigentes gd
                                         JOIN grupos_trabajo g ON g.id = gd.grupo_id
                                         WHERE gd.dirigente_cedula=? AND g.candidato_id=?""",
                                      (ced_dir, cand[0])).fetchone()
                pertenece = bool(en_grupo)
            if not pertenece:
                return {"success": False, "error": "Ese dirigente no pertenece a tu campaña"}

            hist = c.execute("""SELECT desvinculaciones FROM vinculo_dirigente_historial
                                 WHERE dirigente_cedula=? AND cliente_cedula=?""", (ced_dir, ced_cliente)).fetchone()
            ya_desvinculado_antes = bool(hist and hist[0] > 0)

            if ya_desvinculado_antes:
                pendiente = c.execute("""SELECT id FROM solicitudes_desvinculo
                                          WHERE dirigente_cedula=? AND cliente_cedula=? AND estado='pendiente'""",
                                       (ced_dir, ced_cliente)).fetchone()
                if pendiente:
                    return {"success": True, "accion": "ya_pendiente", "mensaje": "Ya hay una solicitud de desvinculación esperando que el dirigente la acepte."}
                c.execute("""INSERT INTO solicitudes_desvinculo (dirigente_cedula, cliente_cedula, estado)
                             VALUES (?,?,'pendiente')""", (ced_dir, ced_cliente))
                conn.commit()
                log_auditoria(ced_cliente, '', 'desvinculo_solicitado',
                              f'Cliente {ced_cliente} solicitó desvincular al dirigente #{ced_dir} (requiere su aceptación)',
                              'dirigentes', ced_dir, severidad='info')
                return {"success": True, "accion": "pendiente_aceptacion",
                        "mensaje": "Esta pareja ya se había desvinculado antes. Ahora se le pidió aceptación al dirigente; seguirá figurando en tu panel hasta que la acepte."}

            _ejecutar_desvinculo(c, conn, ced_cliente, ced_dir, cand)
            log_auditoria(ced_cliente, '', 'dirigente_desvinculado',
                          f'Cliente {ced_cliente} desvinculó al dirigente #{ced_dir} (cuenta no eliminada)',
                          'dirigentes', ced_dir, severidad='info')
            return {"success": True, "accion": "desvinculado"}

        if action == "responder_desvinculo":
            # El dirigente acepta o rechaza una solicitud de desvinculación (segunda
            # vez en adelante para la misma pareja cliente-dirigente).
            sol_id = data.get("solicitud_id")
            ced_dir_auth = normalizar_cedula(data.get("cedula_auth", "") or data.get("cedula", ""))
            respuesta = normalizar_texto(data.get("respuesta", ""))
            if not sol_id or respuesta not in ("aceptar", "rechazar"):
                return {"success": False, "error": "solicitud_id y respuesta ('aceptar'/'rechazar') requeridos"}
            sol = c.execute("SELECT id, dirigente_cedula, cliente_cedula, estado FROM solicitudes_desvinculo WHERE id=?", (int(sol_id),)).fetchone()
            if not sol:
                return {"success": False, "error": "Solicitud no encontrada"}
            if sol[1] != ced_dir_auth:
                return {"success": False, "error": "Esta solicitud no te corresponde"}
            if sol[3] != 'pendiente':
                return {"success": False, "error": "La solicitud ya fue resuelta"}
            if respuesta == "rechazar":
                c.execute("UPDATE solicitudes_desvinculo SET estado='rechazado', resuelto=datetime('now','localtime') WHERE id=?", (int(sol_id),))
                conn.commit()
                return {"success": True, "accion": "rechazado"}
            cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (sol[2],)).fetchone()
            _ejecutar_desvinculo(c, conn, sol[2], sol[1], cand)
            c.execute("UPDATE solicitudes_desvinculo SET estado='aceptado', resuelto=datetime('now','localtime') WHERE id=?", (int(sol_id),))
            conn.commit()
            log_auditoria(ced_dir_auth, '', 'desvinculo_aceptado',
                          f'Dirigente #{ced_dir_auth} aceptó desvincularse del cliente {sol[2]}',
                          'dirigentes', ced_dir_auth, severidad='info')
            return {"success": True, "accion": "aceptado"}

        if action == "mis_solicitudes_desvinculo":
            ced_dir_consulta = normalizar_cedula(data.get("cedula", "") or data.get("dirigente", ""))
            if not ced_dir_consulta:
                return {"success": False, "error": "Cédula requerida"}
            rows = c.execute("""SELECT sd.id, sd.cliente_cedula, cl.nombre, cl.candidato_nombre, sd.creado
                                 FROM solicitudes_desvinculo sd
                                 LEFT JOIN clientes cl ON cl.cedula = sd.cliente_cedula
                                 WHERE sd.dirigente_cedula=? AND sd.estado='pendiente'
                                 ORDER BY sd.creado DESC""", (ced_dir_consulta,)).fetchall()
            items = [{"id": r[0], "cliente_cedula": r[1], "cliente_nombre": r[3] or r[2] or r[1], "creado": r[4]} for r in rows]
            return {"success": True, "solicitudes": items, "total": len(items)}

        if action == "unirse_a_candidato":
            # Un cliente de nivel inferior (ej. seccional/local) se suma a la campaña
            # de otro candidato que ya está usando el sistema. Todo su equipo
            # (dirigentes y sub-dirigentes) y sus resultados acumulados (consultas/
            # estadísticas) pasan automáticamente a figurar bajo ese candidato.
            ced_propio = normalizar_cedula(data.get("cedula", ""))
            ced_candidato = normalizar_cedula(data.get("candidato_cedula", ""))
            if not ced_propio or not ced_candidato:
                return {"success": False, "error": "Tu cédula y la del candidato son requeridas"}
            if ced_propio == ced_candidato:
                return {"success": False, "error": "No podés sumarte a vos mismo"}
            propio = c.execute("SELECT cedula FROM clientes WHERE cedula=? AND activo=1", (ced_propio,)).fetchone()
            if not propio:
                return {"success": False, "error": "Tu cuenta de cliente no fue encontrada"}
            candidato = c.execute("SELECT cedula, nombre, candidato_nombre FROM clientes WHERE cedula=? AND activo=1", (ced_candidato,)).fetchone()
            if not candidato:
                return {"success": False, "error": "Ese candidato no fue encontrado o está inactivo"}
            padre_de_candidato = c.execute("SELECT padre_cliente_cedula FROM clientes WHERE cedula=?", (ced_candidato,)).fetchone()
            if padre_de_candidato and padre_de_candidato[0] == ced_propio:
                return {"success": False, "error": "Ese candidato ya está sumado a tu campaña: generaría un ciclo"}

            dirs_movidos = c.execute("UPDATE dirigentes SET cliente_cedula=? WHERE cliente_cedula=?", (ced_candidato, ced_propio)).rowcount
            consultas_movidas = c.execute("UPDATE consultas_publicas SET candidato_cedula=? WHERE candidato_cedula=?", (ced_candidato, ced_propio)).rowcount
            c.execute("UPDATE clientes SET padre_cliente_cedula=? WHERE cedula=?", (ced_candidato, ced_propio))
            conn.commit()
            log_auditoria(ced_propio, '', 'cliente_sumado_a_candidato',
                          f'Cliente {ced_propio} se sumó a la campaña de {candidato[2] or candidato[1]} (#{ced_candidato}). '
                          f'Dirigentes transferidos: {dirs_movidos}, consultas transferidas: {consultas_movidas}',
                          'clientes', ced_propio, severidad='info')
            return {"success": True, "accion": "sumado", "candidato_nombre": candidato[2] or candidato[1],
                    "dirigentes_transferidos": dirs_movidos, "consultas_transferidas": consultas_movidas}

        # ─── PAQUETES DE ELECCIÓN (configurables por el admin master) ──
        if action == "crear_paquete":
            _require_auth(data, 'master', conn)
            nombre = normalizar_texto(data.get("nombre", ""))
            descripcion = normalizar_texto(data.get("descripcion", ""))
            eleccion_id = data.get("eleccion_id") or None
            cargo_ids = data.get("cargo_ids") or []
            if eleccion_id and not cargo_ids:
                # "Paquete = todos los cargos de esta convocatoria": si se pasa una
                # elección sin elegir cargos a mano, se auto-completan desde reglas_cargo.
                elec = c.execute("SELECT tipo_eleccion_id FROM elecciones WHERE id=?", (int(eleccion_id),)).fetchone()
                if elec:
                    cargo_ids = [r[0] for r in c.execute(
                        "SELECT DISTINCT cargo_id FROM reglas_cargo WHERE tipo_eleccion_id=?", (elec[0],)
                    ).fetchall()]
            if not nombre or not cargo_ids:
                return {"success": False, "error": "Nombre y al menos un cargo (o una convocatoria con cargos) son requeridos"}
            c.execute("INSERT INTO paquetes_eleccion (nombre, descripcion, eleccion_id) VALUES (?,?,?)",
                      (nombre, descripcion, eleccion_id))
            paquete_id = c.lastrowid
            for cid in cargo_ids:
                c.execute("INSERT OR IGNORE INTO paquete_cargos (paquete_id, cargo_id) VALUES (?,?)", (paquete_id, int(cid)))
            conn.commit()
            return {"success": True, "accion": "creado", "paquete_id": paquete_id}

        if action == "editar_paquete":
            _require_auth(data, 'master', conn)
            paquete_id = data.get("paquete_id")
            if not paquete_id:
                return {"success": False, "error": "paquete_id requerido"}
            if "nombre" in data:
                c.execute("UPDATE paquetes_eleccion SET nombre=? WHERE id=?", (normalizar_texto(data["nombre"]), int(paquete_id)))
            if "descripcion" in data:
                c.execute("UPDATE paquetes_eleccion SET descripcion=? WHERE id=?", (normalizar_texto(data["descripcion"]), int(paquete_id)))
            if "activo" in data:
                c.execute("UPDATE paquetes_eleccion SET activo=? WHERE id=?", (1 if data["activo"] else 0, int(paquete_id)))
            if "cargo_ids" in data:
                c.execute("DELETE FROM paquete_cargos WHERE paquete_id=?", (int(paquete_id),))
                for cid in (data["cargo_ids"] or []):
                    c.execute("INSERT OR IGNORE INTO paquete_cargos (paquete_id, cargo_id) VALUES (?,?)", (int(paquete_id), int(cid)))
            conn.commit()
            return {"success": True, "accion": "actualizado"}

        if action == "eliminar_paquete":
            _require_auth(data, 'master', conn)
            paquete_id = data.get("paquete_id")
            if not paquete_id:
                return {"success": False, "error": "paquete_id requerido"}
            c.execute("DELETE FROM cliente_paquetes WHERE paquete_id=?", (int(paquete_id),))
            c.execute("DELETE FROM paquete_cargos WHERE paquete_id=?", (int(paquete_id),))
            c.execute("DELETE FROM paquetes_eleccion WHERE id=?", (int(paquete_id),))
            conn.commit()
            return {"success": True, "accion": "eliminado"}

        if action == "asignar_paquete_cliente":
            _require_auth(data, 'master', conn)
            ced_cliente_paq = normalizar_cedula(data.get("cliente_cedula", ""))
            paquete_id = data.get("paquete_id")
            if not ced_cliente_paq or not paquete_id:
                return {"success": False, "error": "cliente_cedula y paquete_id son requeridos"}
            if not c.execute("SELECT 1 FROM clientes WHERE cedula=?", (ced_cliente_paq,)).fetchone():
                return {"success": False, "error": "Cliente no encontrado"}
            c.execute("""INSERT INTO cliente_paquetes (cliente_cedula, paquete_id, activo) VALUES (?,?,1)
                         ON CONFLICT(cliente_cedula, paquete_id) DO UPDATE SET activo=1""",
                      (ced_cliente_paq, int(paquete_id)))
            conn.commit()
            log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                          'paquete_asignado', f'Paquete #{paquete_id} asignado a cliente {ced_cliente_paq}',
                          'cliente_paquetes', ced_cliente_paq, severidad='info')
            return {"success": True, "accion": "asignado"}

        if action == "quitar_paquete_cliente":
            _require_auth(data, 'master', conn)
            ced_cliente_paq = normalizar_cedula(data.get("cliente_cedula", ""))
            paquete_id = data.get("paquete_id")
            if not ced_cliente_paq or not paquete_id:
                return {"success": False, "error": "cliente_cedula y paquete_id son requeridos"}
            c.execute("UPDATE cliente_paquetes SET activo=0 WHERE cliente_cedula=? AND paquete_id=?",
                      (ced_cliente_paq, int(paquete_id)))
            conn.commit()
            return {"success": True, "accion": "quitado"}

        if action == "autorizar_solicitud":
            sol_id = data.get("solicitud_id")
            accion_tipo = normalizar_texto(data.get("accion", "autorizado"))
            admin_ced = normalizar_cedula(data.get("admin_cedula", ""))
            if not sol_id or not admin_ced:
                return {"success": False, "error": "solicitud_id y admin_cedula requeridos"}
            if accion_tipo == "autorizado":
                sol = c.execute("SELECT * FROM solicitudes_recogida WHERE id=?", (int(sol_id),)).fetchone()
                if not sol:
                    return {"success": False, "error": "Solicitud no encontrada"}
                transp = c.execute("SELECT id FROM transportes LIMIT 1").fetchone()
                t_id = transp[0] if transp else 1
                c.execute("""INSERT INTO rutas (transporte_id, origen, destino, estado, observacion)
                             VALUES (?,?,?,?,?)""",
                          (t_id, sol["ubicacion"] or '', sol["descripcion"] or "Colegio Electoral",
                           'pendiente', f'Solicitud #{sol_id} - {sol["votante_nombre"]}'))
                ruta_id = c.lastrowid
                c.execute("UPDATE solicitudes_recogida SET estado='autorizado', autorizado_por=?, ruta_id=? WHERE id=?",
                          (admin_ced, ruta_id, int(sol_id)))
                conn.commit()
                return {"success": True, "accion": "autorizado", "ruta_id": ruta_id}
            else:
                c.execute("UPDATE solicitudes_recogida SET estado='rechazado', autorizado_por=? WHERE id=?",
                          (admin_ced, int(sol_id)))
                conn.commit()
                return {"success": True, "accion": "rechazado"}

        if action == "crear_transporte":
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            tipo = normalizar_texto(data.get("tipo", "vehiculo"))
            placa = normalizar_texto(data.get("placa", ""))
            telefono = normalizar_texto(data.get("telefono", ""))
            capacidad = int(data.get("capacidad", 4))
            seccional = normalizar_texto(data.get("seccional", ""))
            if not ced or not nombre:
                return {"success": False, "error": "Cédula y nombre requeridos"}
            c.execute("INSERT INTO transportes (cedula, nombre, tipo, placa, telefono, capacidad, seccional, contrasena) VALUES (?,?,?,?,?,?,?,?)",
                      (ced, nombre, tipo, placa, telefono, capacidad, seccional, default_password(ced)))
            conn.commit()
            return {"success": True, "accion": "creado", "id": c.lastrowid}

        if action == "eliminar_transporte":
            t_id = data.get("id")
            if not t_id:
                return {"success": False, "error": "ID requerido"}
            c.execute("DELETE FROM transportes WHERE id=?", (int(t_id),))
            conn.commit()
            return {"success": True, "accion": "eliminado"}

        # ─── REGISTRO LIBRE DE DIRIGENTE (plan gratuito, sin candidato asignado) ──
        if action == "registrar_dirigente":
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            telefono = normalizar_texto(data.get("telefono", ""))
            email = normalizar_texto(data.get("email", ""))
            pw = normalizar_texto(data.get("password", ""))
            if not ced or not nombre or not pw:
                return {"success": False, "error": "Cédula, nombre y contraseña son obligatorios"}
            if len(pw) < 4:
                return {"success": False, "error": "La contraseña debe tener al menos 4 caracteres"}
            if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
                return {"success": False, "error": "El email no es válido"}
            existing = c.execute("SELECT cedula FROM dirigentes WHERE cedula=?", (ced,)).fetchone()
            if existing:
                return {"success": False, "error": "Ya existe un dirigente registrado con esa cédula"}
            c.execute("""INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula, telefono, email, activo)
                         VALUES (?,?,?,?,NULL,?,?,1)""",
                      (ced, nombre, pw, 'dirigente', telefono, email))
            conn.commit()
            log_auditoria(ced, nombre, 'dirigente_autoregistro',
                          f'Dirigente {nombre} (#{ced}) se registró de forma gratuita, sin candidato asignado',
                          'dirigentes', ced, severidad='info')
            return {"success": True, "accion": "creado", "cedula": ced}

        # ─── EL PROPIO DIRIGENTE COMPLETA/CORRIGE SU TELÉFONO Y EMAIL ──
        if action == "actualizar_contacto_dirigente":
            user_auth = _require_auth(data, 'dirigente', conn)
            if not user_auth:
                raise HTTPException(status_code=401, detail="Autenticación requerida")
            ced = user_auth.get("cedula", "")
            telefono = normalizar_texto(data.get("telefono", ""))
            email = normalizar_texto(data.get("email", ""))
            if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
                return {"success": False, "error": "El email no es válido"}
            if telefono and len(re.sub(r'\D', '', telefono)) < 6:
                return {"success": False, "error": "El teléfono no es válido"}
            if not telefono and not email:
                return {"success": False, "error": "Ingresá al menos un dato para actualizar"}
            if telefono:
                c.execute("UPDATE dirigentes SET telefono=? WHERE cedula=?", (telefono, ced))
            if email:
                c.execute("UPDATE dirigentes SET email=? WHERE cedula=?", (email, ced))
            if c.execute("SELECT 1 FROM cuentas_usuario WHERE cedula=?", (ced,)).fetchone():
                if telefono:
                    c.execute("UPDATE cuentas_usuario SET telefono=? WHERE cedula=?", (telefono, ced))
                if email:
                    c.execute("UPDATE cuentas_usuario SET email=? WHERE cedula=?", (email, ced))
            conn.commit()
            fila = c.execute("SELECT telefono, email FROM dirigentes WHERE cedula=?", (ced,)).fetchone()
            log_auditoria(ced, user_auth.get("nombre", ""), 'dirigente_actualiza_contacto',
                          f'Dirigente {ced} actualizó sus datos de contacto', 'dirigentes', ced, severidad='info')
            return {"success": True, "telefono": fila[0] or '', "email": fila[1] or ''}

        # ─── REGISTRO / PERFIL CLIENTE ────────────────────────────
        if action == "registrar_cliente":
            ced = normalizar_cedula(data.get("cedula", ""))
            nombre = normalizar_texto(data.get("nombre", ""))
            apellido = normalizar_texto(data.get("apellido", ""))
            email = normalizar_texto(data.get("email", ""))
            telefono = normalizar_texto(data.get("telefono", ""))
            pw = normalizar_texto(data.get("password", ""))
            if not ced or not nombre or not pw:
                return {"success": False, "error": "Cédula, nombre y contraseña son obligatorios"}
            existing = c.execute("SELECT cedula FROM clientes WHERE cedula=?", (ced,)).fetchone()
            if existing:
                return {"success": False, "error": "Ya existe un cliente con esta cédula"}
            c.execute("""INSERT INTO clientes (cedula, nombre, apellido, contrasena, email, telefono, tipo, categoria, activo)
                         VALUES (?,?,?,?,?,?,?,?,1)""",
                      (ced, nombre, apellido, pw, email, telefono, 'pc', 'partido'))
            conn.commit()
            if email or telefono:
                enviar_bienvenida_cliente(ced, nombre, email, telefono, pw)
            return {"success": True, "accion": "creado", "cedula": ced}

        if action == "completar_registro":
            ced = normalizar_cedula(data.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            updates = []
            params = []
            campos_map = {
                "nombre": "nombre", "apellido": "apellido", "email": "email",
                "departamento_id": "departamento_id", "distrito_id": "distrito_id",
                "partido_id": "partido_id", "intendente_cedula": "intendente_cedula",
                "lista_nro": "lista_nro", "lista_nombre": "lista_nombre",
                "tipo_servicio": "tipo_servicio",
                "fecha_inicio_servicio": "fecha_inicio_servicio",
                "fecha_fin_servicio": "fecha_fin_servicio",
            }
            for key, col in campos_map.items():
                if key in data and data[key] is not None:
                    updates.append(f"{col}=?")
                    val = data[key]
                    if isinstance(val, str):
                        val = normalizar_texto(val)
                    params.append(val)
            if not updates:
                return {"success": False, "error": "No hay campos para actualizar"}
            updates.append("registro_completado=1")
            params.append(ced)
            c.execute(f"UPDATE clientes SET {', '.join(updates)} WHERE cedula=?", params)
            conn.commit()
            return {"success": True, "accion": "actualizado"}

        if action == "editar_perfil":
            ced = normalizar_cedula(data.get("cedula", ""))
            if not ced:
                return {"success": False, "error": "Cédula requerida"}
            if "dominio" in data and data["dominio"]:
                dominio_norm = normalizar_texto(data["dominio"]).lower()
                dominio_norm = re.sub(r'^https?://', '', dominio_norm).strip('/').split('/')[0]
                dominio_norm = re.sub(r'^www\.', '', dominio_norm)
                if not re.match(r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$', dominio_norm):
                    return {"success": False, "error": "Dominio inválido"}
                choque = c.execute("SELECT cedula FROM clientes WHERE dominio=? AND cedula!=?", (dominio_norm, ced)).fetchone()
                if choque:
                    return {"success": False, "error": "Ese dominio ya está en uso por otro cliente"}
                data["dominio"] = dominio_norm
            updates = []
            params = []
            campos_map = {
                "nombre": "nombre", "apellido": "apellido", "email": "email",
                "telefono": "telefono", "dominio": "dominio",
                "mensaje_publicitario": "mensaje_publicitario", "logo_url": "logo_url",
                "departamento_id": "departamento_id", "distrito_id": "distrito_id",
                "partido_id": "partido_id", "intendente_cedula": "intendente_cedula",
                "lista_nro": "lista_nro", "lista_nombre": "lista_nombre",
                "tipo_servicio": "tipo_servicio",
            }
            for key, col in campos_map.items():
                if key in data and data[key] is not None:
                    updates.append(f"{col}=?")
                    val = data[key]
                    if isinstance(val, str):
                        val = normalizar_texto(val)
                    params.append(val)
            if not updates:
                return {"success": False, "error": "No hay campos para actualizar"}
            params.append(ced)
            c.execute(f"UPDATE clientes SET {', '.join(updates)} WHERE cedula=?", params)
            conn.commit()
            return {"success": True, "accion": "actualizado"}

        if action == "cambiar_contrasena":
            ced = normalizar_cedula(data.get("cedula", ""))
            pw_actual = normalizar_texto(data.get("password_actual", ""))
            pw_nueva = normalizar_texto(data.get("password_nueva", ""))
            if not ced or not pw_nueva:
                return {"success": False, "error": "Cédula y nueva contraseña requeridas"}
            cl = c.execute("SELECT contrasena FROM clientes WHERE cedula=?", (ced,)).fetchone()
            if cl and cl[0] != pw_actual:
                return {"success": False, "error": "Contraseña actual incorrecta"}
            c.execute("UPDATE clientes SET contrasena=? WHERE cedula=?", (pw_nueva, ced))
            conn.commit()
            return {"success": True, "accion": "contrasena_actualizada"}

        if action == "solicitar_recogida":
            # dirigente.html envía action:'solicitar_recogida' al dispatcher POST /api.
            # Sin esta rama explícita caía en el Default (registrar voto/no_voto) y creaba
            # un registro fantasma en `registros` sin crear la solicitud real. Delega a la
            # misma lógica de la ruta dedicada POST /api/solicitar_recogida (app.py).
            d_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
            d_nom = normalizar_texto(data.get("dirigente_nombre", ""))
            v_ced = normalizar_cedula(data.get("votante_cedula", ""))
            v_nom = normalizar_texto(data.get("votante_nombre", ""))
            hora = normalizar_texto(data.get("hora_recogida", ""))
            ubic = normalizar_texto(data.get("ubicacion", ""))
            desc = normalizar_texto(data.get("descripcion", ""))
            if not d_ced or not v_ced:
                return {"success": False, "error": "Cédula del dirigente y del votante requeridas"}
            if not hora or not ubic:
                return {"success": False, "error": "Hora de recogida y ubicación requeridas"}
            existente = c.execute(
                "SELECT id FROM solicitudes_recogida WHERE votante_cedula=? AND estado IN ('pendiente','autorizado')",
                (v_ced,)).fetchone()
            if existente:
                c.execute("""UPDATE solicitudes_recogida SET hora_recogida=?, ubicacion=?, descripcion=?
                             WHERE id=?""", (hora, ubic, desc, existente[0]))
                conn.commit()
                return {"success": True, "accion": "actualizado", "id": existente[0]}
            c.execute("""INSERT INTO solicitudes_recogida
                (dirigente_cedula, dirigente_nombre, votante_cedula, votante_nombre,
                 hora_recogida, ubicacion, descripcion, estado)
                VALUES (?,?,?,?,?,?,?,?)
            """, (d_ced, d_nom, v_ced, v_nom, hora, ubic, desc, 'pendiente'))
            conn.commit()
            return {"success": True, "accion": "solicitado", "id": c.lastrowid}

        # Default: registrar voto/no_voto
        user_auth = _require_auth(data, 'dirigente', conn)
        cliente_ced = _cliente_de_request(conn, data, user_auth)
        cargado_por = (user_auth or {}).get("cedula") or normalizar_texto(data.get("dirigente", ""))
        es_no_voto = data.get("estado") == "no_voto" or action == "no_voto"
        if es_no_voto:
            ced_elector = normalizar_cedula(data.get("cedula", ""))
            c.execute("INSERT INTO no_voto (cedula, mesa, orden, motivo, observacion, cliente_cedula) VALUES (?,?,?,?,?,?)",
                      (ced_elector, int(data.get("mesa", 0)),
                       int(data.get("orden", 0)), normalizar_texto(data.get("motivo", "no_voto")),
                       normalizar_texto(data.get("observacion", "")), cliente_ced))
            _certificar(conn, 'voto', ced_elector, 'no_voto', cliente_ced, cargado_por, normalizar_texto(data.get("origen", "web")))
            conn.commit()
            return {"success": True, "tipo": "no_voto"}

        ced_elector = normalizar_cedula(data.get("cedula", ""))
        estado_voto = normalizar_texto(data.get("estado", ""))

        # ── Resolver EN QUÉ ELECCIÓN se vota (clave para simultáneas) ──
        _elec = elecciones_ctx.resolver_eleccion(
            conn, eleccion_id=data.get("eleccion_id"),
            tipo_codigo=data.get("tipo_eleccion"))
        if _elec and _elec.get("error"):
            return {"success": False, "error": _elec["error"], "eleccion": None}
        if not _elec:
            return {"success": False, "error": "No hay elección activa para registrar el voto"}
        if not data.get("eleccion_id") and not data.get("tipo_eleccion") \
                and elecciones_ctx.requiere_seleccion(conn):
            return {"success": False, "eleccion_requerida": True,
                    "error": "Hay elecciones simultáneas: especifique eleccion_id",
                    "elecciones": elecciones_ctx.elecciones_activas(conn)}
        eleccion_id = _elec["id"]

        # ── Verificación de identidad: 3 preguntas obligatorias ──
        # (nombre completo, cédula, mesa+orden) contra el padrón real.
        _resp = data.get("verificacion", {}) or {}
        _padron = c.execute(
            "SELECT nombre, apellido, mesa, orden FROM padron2026_completo WHERE cedula=? LIMIT 1",
            (ced_elector,)).fetchone()
        if not _padron:
            # Sin padrón (p.ej. afiliados) no se puede verificar: se permite pero se marca.
            _verif_ok = False
            _verif_motivo = "cedula_no_en_padron"
        else:
            import unicodedata as _ud
            def _norm(s):
                s = _ud.normalize('NFD', str(s).upper())
                s = ''.join(ch for ch in s if _ud.category(ch) != 'Mn')
                return ' '.join(s.split())
            def _mismo_nombre(a, b):
                return sorted(_norm(a).split()) == sorted(_norm(b).split())
            _nom_real = ((_padron[0] or '') + ' ' + (_padron[1] or '')).strip()
            _mesa_real = int(_padron[2] or 0)
            _orden_real = int(_padron[3] or 0)
            _errs = []
            if not _mismo_nombre(_resp.get("nombre", ""), _nom_real):
                _errs.append("nombre")
            if normalizar_cedula(_resp.get("cedula", "")) != ced_elector:
                _errs.append("cedula")
            if int(_resp.get("mesa", 0) or 0) != _mesa_real or int(_resp.get("orden", 0) or 0) != _orden_real:
                _errs.append("mesa_orden")
            if _errs:
                return {"success": False, "verificacion": "fallida",
                        "error": "Verificación fallida: " + ", ".join(_errs)}
            _verif_ok = True
            _verif_motivo = ""

        c.execute("""INSERT INTO registros (cedula, nombre, mesa, orden, estado, accion, dirigente, dirigenteNombre, origen, cliente_cedula, eleccion_id)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                  (ced_elector, normalizar_texto(data.get("nombre", "")),
                   int(data.get("mesa", 0)), int(data.get("orden", 0)),
                   normalizar_texto(data.get("estado", "")), normalizar_texto(data.get("accion", "")),
                   normalizar_texto(data.get("dirigente", "Dirigente")),
                   normalizar_texto(data.get("dirigenteNombre", "Dirigente")),
                   normalizar_texto(data.get("origen", "web")), cliente_ced, eleccion_id))
        if estado_voto in ('voto', 'no_voto'):
            _certificar(conn, 'voto', ced_elector, estado_voto, cliente_ced, cargado_por, normalizar_texto(data.get("origen", "web")))
        conn.commit()
        # Auditoría con hash inmutable (herramienta votos_audit)
        _audit = {}
        try:
            _ip_v = ""
            try:
                _ip_v = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
                         or (request.client.host if request and request.client else ""))
            except Exception:
                pass
            _audit = HERR.registrar_voto_auditado(
                conn, ced_elector, int(data.get("mesa", 0)), int(data.get("orden", 0)),
                estado_voto, normalizar_texto(data.get("dirigente", "Dirigente")),
                _ip_v, "", _verif_ok)
            try:
                conn.execute("UPDATE votos_audit SET eleccion_id=? WHERE id=?",
                             (eleccion_id, _audit.get("audit_id")))
                conn.commit()
            except Exception:
                pass
            HERR.event_bus.publicar("voto_registrado",
                                    {"mesa": data.get("mesa"), "cedula": ced_elector,
                                     "eleccion_id": eleccion_id})
        except Exception as _ae:
            _audit = {"error": str(_ae)}
        return {"success": True, "tipo": "registro", "eleccion_id": eleccion_id,
                "eleccion": _elec.get("nombre"), "verificacion": "exitosa" if _verif_ok else _verif_motivo,
                "audit": _audit,
                "certificacion": _estado_certificacion(conn, 'voto', ced_elector, cliente_ced) if cliente_ced else None}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


# ─── CRUD: ELECCIONES ──────────────────────────────────────────

@app.get("/api/elecciones")
def listar_elecciones():
    """Lista todas las elecciones con su tipo"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT e.*, t.nombre as tipo_nombre 
            FROM elecciones e 
            LEFT JOIN tipos_eleccion t ON e.tipo_eleccion_id = t.id
            ORDER BY e.fecha_eleccion DESC
        """).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM elecciones LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        # Agregar tipo_nombre a cada item
        for item in items:
            tipo_id = item.get('tipo_eleccion_id')
            if tipo_id:
                tipo = conn.execute("SELECT nombre FROM tipos_eleccion WHERE id=?", (tipo_id,)).fetchone()
                item['tipo_nombre'] = tipo[0] if tipo else None
        return {"success": True, "elecciones": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al listar elecciones: {e}")
    finally:
        conn.close()

@app.post("/api/elecciones/crear")
def crear_eleccion(data: dict = Body(...)):
    """Crea una nueva elección"""
    conn = get_connection()
    try:
        usuario = _require_auth(data, 'master', conn)
        if not usuario:
            raise HTTPException(status_code=401, detail="Autenticación requerida")
        c = conn.cursor()
        nombre = normalizar_texto(data.get("nombre", ""))
        tipo_id = data.get("tipo_eleccion_id")
        periodo = normalizar_texto(data.get("periodo", ""))
        fecha = normalizar_texto(data.get("fecha_eleccion", ""))
        estado = normalizar_texto(data.get("estado", "planificada"))
        activo = 1 if data.get("activo", True) else 0
        
        if not nombre:
            return {"success": False, "error": "Nombre es obligatorio"}
        if not tipo_id:
            return {"success": False, "error": "Tipo de elección es obligatorio"}
        
        c.execute("""INSERT INTO elecciones 
            (tipo_eleccion_id, nombre, periodo, fecha_eleccion, estado, activo)
            VALUES (?,?,?,?,?,?)""", (tipo_id, nombre, periodo, fecha, estado, activo))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creada"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/elecciones/{eleccion_id}/estado")
def actualizar_estado_eleccion(eleccion_id: int, data: dict = Body(...)):
    """Bloquea o habilita una elección; reservado a Administración General."""
    conn = get_connection()
    try:
        usuario = _require_auth(data, 'master', conn)
        if not usuario:
            raise HTTPException(status_code=401, detail="Autenticación requerida")
        activo = 1 if data.get('activo') else 0
        cur = conn.execute("UPDATE elecciones SET activo=? WHERE id=?", (activo, eleccion_id))
        if not cur.rowcount:
            raise HTTPException(status_code=404, detail="Elección no encontrada")
        conn.commit()
        log_auditoria(usuario.get('cedula'), usuario.get('nombre'), 'eleccion_habilitar' if activo else 'eleccion_bloquear', 'elecciones', 'elecciones', str(eleccion_id))
        return {"success": True, "id": eleccion_id, "activo": bool(activo)}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo actualizar la elección: {e}")
    finally:
        conn.close()

@app.post("/api/elecciones/{eleccion_id}/eliminar")
def eliminar_eleccion(eleccion_id: int, data: dict = Body(...)):
    """Elimina una elección solo cuando no hay estructura electoral vinculada."""
    conn = get_connection()
    try:
        usuario = _require_auth(data, 'master', conn)
        if not usuario:
            raise HTTPException(status_code=401, detail="Autenticación requerida")
        eleccion = conn.execute("SELECT nombre FROM elecciones WHERE id=?", (eleccion_id,)).fetchone()
        if not eleccion:
            raise HTTPException(status_code=404, detail="Elección no encontrada")
        referencias = []
        for tabla in ('paquetes_eleccion', 'chapas', 'estructura_politica', 'partidos_eleccion'):
            existe = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (tabla,)).fetchone()
            if existe:
                # FIX: SQL injection - validar tabla contra whitelist antes de usar en query dinámica.
                tabla_segura = validar_tabla(tabla)
                refs = conn.execute(f"SELECT COUNT(*) FROM {tabla_segura} WHERE eleccion_id=?", (eleccion_id,)).fetchone()[0]
                if refs:
                    referencias.append(tabla)
        if referencias:
            raise HTTPException(status_code=409, detail="No se puede eliminar: tiene datos vinculados en " + ', '.join(referencias) + ". Bloquéala para conservar el historial.")
        conn.execute("DELETE FROM elecciones WHERE id=?", (eleccion_id,))
        conn.commit()
        log_auditoria(usuario.get('cedula'), usuario.get('nombre'), 'eleccion_eliminar', 'elecciones', 'elecciones', str(eleccion_id))
        return {"success": True, "id": eleccion_id, "accion": "eliminada"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"No se pudo eliminar la elección: {e}")
    finally:
        conn.close()

@app.get("/api/tipos_eleccion")
def listar_tipos_eleccion():
    """Lista los tipos de elección disponibles"""
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM tipos_eleccion ORDER BY nombre").fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM tipos_eleccion LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "tipos": items}
    finally:
        conn.close()

# ─── CRUD: TRANSPORTES ─────────────────────────────────────────

@app.get("/api/transportes")
def listar_transportes():
    """Lista todos los transportes con su estado"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT t.*, 
                   (SELECT COUNT(*) FROM rutas r WHERE r.transporte_id = t.id AND r.estado = 'activa') as rutas_activas
            FROM transportes t 
            ORDER BY t.nombre
        """).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM transportes LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "transportes": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/transportes/crear")
def crear_transporte(data: dict = Body(...)):
    """Crea un nuevo transporte"""
    conn = get_connection()
    try:
        c = conn.cursor()
        cedula = normalizar_cedula(data.get("cedula", ""))
        nombre = normalizar_texto(data.get("nombre", ""))
        tipo = normalizar_texto(data.get("tipo", "camioneta"))
        placa = normalizar_texto(data.get("placa", ""))
        telefono = normalizar_texto(data.get("telefono", ""))
        capacidad = int(data.get("capacidad", 0) or 0)
        contrasena = normalizar_texto(data.get("contrasena", ""))
        estado = normalizar_texto(data.get("estado", "disponible"))
        seccional = normalizar_texto(data.get("seccional", ""))
        cliente_cedula = normalizar_cedula(data.get("cliente_cedula", ""))
        
        if not cedula or not nombre:
            return {"success": False, "error": "Cédula y nombre son obligatorios"}
        
        c.execute("""INSERT INTO transportes 
            (cedula, nombre, tipo, placa, telefono, capacidad, contrasena, estado, seccional, cliente_cedula)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (cedula, nombre, tipo, placa, telefono, capacidad, contrasena, estado, seccional, cliente_cedula))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/transportes/{transporte_id}/eliminar")
def eliminar_transporte(transporte_id: int, request: Request):
    """Elimina un transporte sin rutas activas; exclusivo de Administración General."""
    conn = get_connection()
    try:
        usuario = _require_session_nivel(conn, request.headers.get("x-session-id", ""), 'master')
        c = conn.cursor()
        # Verificar rutas activas
        activas = c.execute(
            "SELECT COUNT(*) FROM rutas WHERE transporte_id=? AND estado='activa'", 
            (transporte_id,)).fetchone()[0]
        if activas > 0:
            return {"success": False, "error": f"El transporte tiene {activas} rutas activas"}
        
        c.execute("DELETE FROM transportes WHERE id=?", (transporte_id,))
        if not c.rowcount:
            raise HTTPException(status_code=404, detail="Transporte no encontrado")
        conn.commit()
        log_auditoria(usuario.get('cedula'), usuario.get('nombre'), 'transporte_eliminado',
                      'Transporte eliminado desde Administración General', 'transportes', str(transporte_id))
        return {"success": True, "accion": "eliminado"}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/transportes/{transporte_id}")
def detalle_transporte(transporte_id: int):
    """Detalle de un transporte con sus rutas"""
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM transportes WHERE id=?", (transporte_id,)).fetchone()
        if not row:
            return {"success": False, "error": "Transporte no encontrado"}
        cols = [d[0] for d in conn.execute("SELECT * FROM transportes LIMIT 0").description]
        item = dict(zip(cols, row))
        
        # Rutas del transporte
        rutas = conn.execute(
            "SELECT * FROM rutas WHERE transporte_id=? ORDER BY id DESC", 
            (transporte_id,)).fetchall()
        rutas_cols = [d[0] for d in conn.execute("SELECT * FROM rutas LIMIT 0").description]
        item['rutas'] = [dict(zip(rutas_cols, r)) for r in rutas]
        
        return {"success": True, "transporte": item}
    finally:
        conn.close()

# ─── CRUD: NO_VOTO ─────────────────────────────────────────────

@app.get("/api/no_voto")
def listar_no_voto():
    """Lista todos los registros de no-voto"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT n.*, p.nombre as partido_nombre
            FROM no_voto n
            LEFT JOIN clientes p ON n.cliente_cedula = p.cedula
            ORDER BY n.timestamp DESC
        """).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM no_voto LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "no_votos": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/no_voto/crear")
def crear_no_voto(data: dict = Body(...)):
    """Registra un no-voto"""
    conn = get_connection()
    try:
        c = conn.cursor()
        cedula = normalizar_cedula(data.get("cedula", ""))
        mesa = int(data.get("mesa", 0) or 0)
        orden = int(data.get("orden", 0) or 0)
        motivo = normalizar_texto(data.get("motivo", "no_voto"))
        observacion = normalizar_texto(data.get("observacion", ""))
        cliente_ced = normalizar_cedula(data.get("cliente_cedula", ""))
        
        if not cedula:
            return {"success": False, "error": "Cédula es obligatoria"}
        
        c.execute("""INSERT INTO no_voto 
            (cedula, mesa, orden, motivo, observacion, cliente_cedula)
            VALUES (?,?,?,?,?,?)""", (cedula, mesa, orden, motivo, observacion, cliente_ced))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "registrado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/no_voto/{id}/eliminar")
def eliminar_no_voto(id: int):
    """Elimina un registro de no-voto"""
    conn = get_connection()
    try:
        c = conn.cursor()
        c.execute("DELETE FROM no_voto WHERE id=?", (id,))
        conn.commit()
        return {"success": True, "accion": "eliminado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── CRUD: VEDORES MESA ────────────────────────────────────────

@app.get("/api/veedores_mesa")
def listar_veedores_mesa():
    """Lista todos los veedores de mesa"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT v.*, m.numero as mesa_numero, e.nombre as escuela_nombre
            FROM veedores_mesa v
            LEFT JOIN mesas m ON v.mesa_id = m.id
            LEFT JOIN escuelas e ON v.escuela_id = e.id
            ORDER BY v.nombre_veedor
        """).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM veedores_mesa LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "veedores": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/veedores_mesa/crear")
def crear_veedor_mesa(data: dict = Body(...)):
    """Crea un nuevo veedor de mesa"""
    conn = get_connection()
    try:
        c = conn.cursor()
        nombre = normalizar_texto(data.get("nombre_veedor", ""))
        cedula = normalizar_cedula(data.get("cedula_veedor", ""))
        mesa_id = data.get("mesa_id")
        escuela_id = data.get("escuela_id")
        telefono = normalizar_texto(data.get("telefono", ""))
        seccional_id = data.get("seccional_id")
        estado = normalizar_texto(data.get("estado", "activo"))
        
        if not nombre or not cedula:
            return {"success": False, "error": "Nombre y cédula son obligatorios"}
        
        c.execute("""INSERT INTO veedores_mesa 
            (nombre_veedor, cedula_veedor, mesa_id, escuela_id, telefono, seccional_id, estado)
            VALUES (?,?,?,?,?,?,?)""", (nombre, cedula, mesa_id, escuela_id, telefono, seccional_id, estado))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/veedores_mesa/{id}/eliminar")
def eliminar_veedor_mesa(id: int):
    """Elimina un veedor de mesa"""
    conn = get_connection()
    try:
        c = conn.cursor()
        c.execute("DELETE FROM veedores_mesa WHERE id=?", (id,))
        conn.commit()
        return {"success": True, "accion": "eliminado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── CRUD: CARGOS ELECTIVOS ────────────────────────────────────

@app.get("/api/cargos_electivos")
def listar_cargos_electivos():
    """Lista todos los cargos electivos"""
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM cargos_electivos ORDER BY orden_visual, nombre").fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM cargos_electivos LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "cargos": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/cargos_electivos/crear")
def crear_cargo_electivo(data: dict = Body(...)):
    """Crea un nuevo cargo electivo"""
    conn = get_connection()
    try:
        c = conn.cursor()
        codigo = normalizar_texto(data.get("codigo", ""))
        nombre = normalizar_texto(data.get("nombre", ""))
        ambito = normalizar_texto(data.get("ambito", "nacional"))
        tipo_cargo = normalizar_texto(data.get("tipo_cargo", "titular"))
        orden_visual = int(data.get("orden_visual", 0) or 0)
        activo = 1 if data.get("activo", True) else 0
        
        if not codigo or not nombre:
            return {"success": False, "error": "Código y nombre son obligatorios"}
        
        c.execute("""INSERT INTO cargos_electivos 
            (codigo, nombre, ambito, tipo_cargo, orden_visual, activo)
            VALUES (?,?,?,?,?,?)""", (codigo, nombre, ambito, tipo_cargo, orden_visual, activo))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── CRUD: LISTAS PARTIDO ──────────────────────────────────────

@app.get("/api/listas_partido")
def listar_listas_todas():
    """Lista todas las listas de partido"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT l.*, p.nombre_oficial as partido_nombre, c.nombre as cargo_nombre
            FROM listas_partido l
            LEFT JOIN partidos p ON l.partido_id = p.id
            LEFT JOIN cargos_electivos c ON l.cargo_id = c.id
            ORDER BY p.nombre_oficial, l.numero_lista
        """).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM listas_partido LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "listas": items, "total": len(items)}
    finally:
        conn.close()

@app.get("/api/listas_partido/{partido_id}")
def listar_listas_de_partido(partido_id: int):
    """Lista las listas de un partido específico"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT l.*, c.nombre as cargo_nombre, e.nombre as eleccion_nombre
            FROM listas_partido l
            LEFT JOIN cargos_electivos c ON l.cargo_id = c.id
            LEFT JOIN elecciones e ON l.eleccion_id = e.id
            WHERE l.partido_id = ?
            ORDER BY l.numero_lista
        """, (partido_id,)).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM listas_partido LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "listas": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/listas_partido/crear")
def crear_lista_partido(data: dict = Body(...)):
    """Crea una nueva lista de partido"""
    conn = get_connection()
    try:
        c = conn.cursor()
        partido_id = data.get("partido_id")
        numero_lista = int(data.get("numero_lista", 0) or 0)
        nombre_lista = normalizar_texto(data.get("nombre_lista", ""))
        tipo_lista = normalizar_texto(data.get("tipo_lista", "titular"))
        color_hex = normalizar_texto(data.get("color_hex", "#3B82F6"))
        activo = 1 if data.get("activo", True) else 0
        orden = int(data.get("orden", 0) or 0)
        eleccion_id = data.get("eleccion_id")
        cargo_id = data.get("cargo_id")
        
        if not partido_id or not numero_lista:
            return {"success": False, "error": "Partido y número de lista son obligatorios"}
        
        c.execute("""INSERT INTO listas_partido 
            (partido_id, numero_lista, nombre_lista, tipo_lista, color_hex, activo, orden, eleccion_id, cargo_id)
            VALUES (?,?,?,?,?,?,?,?,?)""", 
            (partido_id, numero_lista, nombre_lista, tipo_lista, color_hex, activo, orden, eleccion_id, cargo_id))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creada"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── CRUD: UBICACIONES GPS ─────────────────────────────────────

@app.get("/api/ubicaciones_gps")
def listar_ubicaciones_gps():
    """Lista las últimas ubicaciones GPS registradas"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT u.*, t.nombre as transporte_nombre, t.placa
            FROM ubicaciones_gps u
            LEFT JOIN transportes t ON u.transporte_id = t.id
            ORDER BY u.timestamp DESC
            LIMIT 200
        """).fetchall()
        cols = [d[0] for d in conn.execute("SELECT * FROM ubicaciones_gps LIMIT 0").description]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "ubicaciones": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/ubicaciones_gps/crear")
def crear_ubicacion_gps(data: dict = Body(...)):
    """Registra una ubicación GPS"""
    conn = get_connection()
    try:
        c = conn.cursor()
        transporte_id = data.get("transporte_id")
        cedula = normalizar_cedula(data.get("cedula", ""))
        lat = float(data.get("lat", 0) or 0)
        lng = float(data.get("lng", 0) or 0)
        velocidad = float(data.get("velocidad", 0) or 0)
        direccion = normalizar_texto(data.get("direccion", ""))
        
        if not lat or not lng:
            return {"success": False, "error": "Latitud y longitud son obligatorias"}
        
        c.execute("""INSERT INTO ubicaciones_gps 
            (transporte_id, cedula, lat, lng, velocidad, direccion)
            VALUES (?,?,?,?,?,?)""", (transporte_id, cedula, lat, lng, velocidad, direccion))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "registrada"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()



# ─── DELETE: CANDIDATOS ────────────────────────────────────────

@app.post("/api/candidatos/{id}/eliminar")
def eliminar_candidato(id: int):
    """Elimina un candidato y sus dependencias (cascada controlada)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        
        # Evaluar dependencias antes de eliminar
        dependencias = {}
        tablas_fk = {
            'candidatos_lista': 'candidato_id',
            'candidatos_electos_internas': 'candidato_id',
            'grupos_trabajo': 'candidato_id',
            'posible_voto_candidatos': 'candidato_id',
            'dirigente_candidatos': 'candidato_id',
        }
        
        for tabla, col in tablas_fk.items():
            # FIX: SQL injection - validar tabla y columna contra whitelist antes de usar en query dinámica.
            tabla_segura = validar_tabla(tabla)
            col_segura = validar_columna(col)
            cnt = c.execute(f"SELECT COUNT(*) FROM {tabla_segura} WHERE {col_segura}=?", (id,)).fetchone()[0]
            if cnt > 0:
                dependencias[tabla] = cnt
        
        if dependencias:
            dep_str = ", ".join(f"{k}({v})" for k,v in dependencias.items())
            return {
                "success": False, 
                "error": f"No se puede eliminar: tiene dependencias en {dep_str}",
                "dependencias": dependencias,
                "accion": "bloqueado"
            }
        
        # Verificar si existe
        row = c.execute("SELECT * FROM candidatos WHERE id=?", (id,)).fetchone()
        if not row:
            return {"success": False, "error": "Candidato no encontrado"}
        
        c.execute("DELETE FROM candidatos WHERE id=?", (id,))
        conn.commit()
        return {"success": True, "accion": "eliminado", "id": id}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── DELETE: CLIENTES ──────────────────────────────────────────

@app.post("/api/clientes/{cedula}/eliminar")
def eliminar_cliente(cedula: str, data: dict = Body(default={})):
    """Elimina un cliente sin dependencias; reservado a Administración General."""
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
        c = conn.cursor()
        
        cedula = normalizar_cedula(cedula)
        
        # Evaluar dependencias por cédula (no FK formal, pero relación lógica)
        dependencias = {}
        tablas_cedula = {
            'asignaciones_rol': 'cedula',
            'clientes': 'cedula',
            'transportes': 'cliente_cedula',
            'no_voto': 'cliente_cedula',
            'registros': 'cliente_cedula',
            'dirigentes': 'creado_por_cedula',
            'cliente_paquetes': 'cliente_cedula',
        }
        
        for tabla, col in tablas_cedula.items():
            try:
                # FIX: SQL injection - validar tabla y columna contra whitelist antes de usar en query dinámica.
                tabla_segura = validar_tabla(tabla)
                col_segura = validar_columna(col)
                cnt = c.execute(f"SELECT COUNT(*) FROM {tabla_segura} WHERE {col_segura}=?", (cedula,)).fetchone()[0]
                if cnt > 0 and tabla != 'clientes':
                    dependencias[tabla] = cnt
            except:
                pass
        
        if dependencias:
            dep_str = ", ".join(f"{k}({v})" for k,v in dependencias.items())
            return {
                "success": False, 
                "error": f"No se puede eliminar: tiene dependencias en {dep_str}",
                "dependencias": dependencias,
                "accion": "bloqueado"
            }
        
        c.execute("DELETE FROM clientes WHERE cedula=?", (cedula,))
        conn.commit()
        log_auditoria(normalizar_cedula(data.get("cedula_auth", "")), "", "cliente_eliminado",
                      f"Cliente #{cedula} eliminado", "clientes", cedula, severidad="alta")
        return {"success": True, "accion": "eliminado", "cedula": cedula}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── DELETE: PARTIDOS ──────────────────────────────────────────

@app.post("/api/partidos/{id}/eliminar")
def eliminar_partido(id: int, data: dict = Body(default={})):
    """Elimina un partido (verifica dependencias)"""
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
        c = conn.cursor()
        
        # Evaluar dependencias
        dependencias = {}
        tablas_fk = {
            'listas_partido': 'partido_id',
            'chapas': 'partido_id',
            'estructura_politica': 'partido_id',
            'partidos_eleccion': 'partido_id',
            'candidatos_electos_internas': 'partido_id',
        }
        
        for tabla, col in tablas_fk.items():
            # FIX: SQL injection - validar tabla y columna contra whitelist antes de usar en query dinámica.
            tabla_segura = validar_tabla(tabla)
            col_segura = validar_columna(col)
            cnt = c.execute(f"SELECT COUNT(*) FROM {tabla_segura} WHERE {col_segura}=?", (id,)).fetchone()[0]
            if cnt > 0:
                dependencias[tabla] = cnt
        
        if dependencias:
            dep_str = ", ".join(f"{k}({v})" for k,v in dependencias.items())
            return {
                "success": False, 
                "error": f"No se puede eliminar: tiene dependencias en {dep_str}",
                "dependencias": dependencias,
                "accion": "bloqueado"
            }
        
        c.execute("DELETE FROM partidos WHERE id=?", (id,))
        conn.commit()
        return {"success": True, "accion": "eliminado", "id": id}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── DELETE: USUARIOS ──────────────────────────────────────────

@app.post("/api/usuarios/{cedula}/eliminar")
def eliminar_usuario(cedula: str):
    """Elimina un usuario (verifica asignaciones de rol)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        
        cedula = normalizar_cedula(cedula)
        
        # Evaluar dependencias
        dependencias = {}
        
        # Verificar si tiene roles asignados
        cnt_roles = c.execute(
            "SELECT COUNT(*) FROM asignaciones_rol WHERE cedula=?", (cedula,)
        ).fetchone()[0]
        if cnt_roles > 0:
            dependencias['asignaciones_rol'] = cnt_roles
        
        # Verificar si tiene cuentas de usuario
        cnt_cuentas = c.execute(
            "SELECT COUNT(*) FROM cuentas_usuario WHERE cedula=?", (cedula,)
        ).fetchone()[0]
        if cnt_cuentas > 0:
            dependencias['cuentas_usuario'] = cnt_cuentas
        
        # Verificar si es dirigido por otro dirigente
        cnt_dirigido = c.execute(
            "SELECT COUNT(*) FROM dirigentes WHERE creado_por_cedula=?", (cedula,)
        ).fetchone()[0]
        if cnt_dirigido > 0:
            dependencias['dirigentes(creado_por)'] = cnt_dirigido
        
        if dependencias:
            dep_str = ", ".join(f"{k}({v})" for k,v in dependencias.items())
            return {
                "success": False, 
                "error": f"No se puede eliminar: tiene dependencias en {dep_str}",
                "dependencias": dependencias,
                "accion": "bloqueado"
            }
        
        c.execute("DELETE FROM usuarios WHERE cedula=?", (cedula,))
        conn.commit()
        return {"success": True, "accion": "eliminado", "cedula": cedula}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── DELETE: DEPARTAMENTOS ─────────────────────────────────────

@app.post("/api/departamentos/{id}/eliminar")
def eliminar_departamento(id: int):
    """Elimina un departamento (verifica distritos y circunscripciones)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        
        # Evaluar dependencias
        dependencias = {}
        tablas_fk = {
            'circunscripciones': 'departamento_id',
            'candidatos_electos_internas': 'departamento_id',
            'distritos': 'departamento_id',
            'unidades_organizacion': 'departamento_id',
        }
        
        for tabla, col in tablas_fk.items():
            # FIX: SQL injection - validar tabla y columna contra whitelist antes de usar en query dinámica.
            tabla_segura = validar_tabla(tabla)
            col_segura = validar_columna(col)
            cnt = c.execute(f"SELECT COUNT(*) FROM {tabla_segura} WHERE {col_segura}=?", (id,)).fetchone()[0]
            if cnt > 0:
                dependencias[tabla] = cnt
        
        if dependencias:
            dep_str = ", ".join(f"{k}({v})" for k,v in dependencias.items())
            return {
                "success": False, 
                "error": f"No se puede eliminar: tiene dependencias en {dep_str}",
                "dependencias": dependencias,
                "accion": "bloqueado"
            }
        
        c.execute("DELETE FROM departamentos WHERE id=?", (id,))
        conn.commit()
        return {"success": True, "accion": "eliminado", "id": id}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── DELETE: DISTRITOS ─────────────────────────────────────────

@app.post("/api/distritos/{id}/eliminar")
def eliminar_distrito(id: int):
    """Elimina un distrito (verifica circunscripciones y unidades)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        
        # Evaluar dependencias
        dependencias = {}
        tablas_fk = {
            'circunscripciones': 'distrito_id',
            'candidatos_electos_internas': 'distrito_id',
            'unidades_organizacion': 'distrito_id',
        }
        
        for tabla, col in tablas_fk.items():
            # FIX: SQL injection - validar tabla y columna contra whitelist antes de usar en query dinámica.
            tabla_segura = validar_tabla(tabla)
            col_segura = validar_columna(col)
            cnt = c.execute(f"SELECT COUNT(*) FROM {tabla_segura} WHERE {col_segura}=?", (id,)).fetchone()[0]
            if cnt > 0:
                dependencias[tabla] = cnt
        
        if dependencias:
            dep_str = ", ".join(f"{k}({v})" for k,v in dependencias.items())
            return {
                "success": False, 
                "error": f"No se puede eliminar: tiene dependencias en {dep_str}",
                "dependencias": dependencias,
                "accion": "bloqueado"
            }
        
        c.execute("DELETE FROM distritos WHERE id=?", (id,))
        conn.commit()
        return {"success": True, "accion": "eliminado", "id": id}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()



# ═══════════════════════════════════════════════════════════════

@app.get("/api/candidatos/listing")
def candidatos_listing():
    """Directorio de todos los candidatos con página pública activa"""
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""
            SELECT ca.id, ca.nombre, ca.cargo, ca.lista_nombre, ca.departamento_id, ca.distrito_id,
                   pc.partido_id, pc.propuestas_clave,
                   (SELECT COUNT(*) FROM simpatizantes s WHERE s.candidato_id = ca.id) as simpatizantes,
                   p.nombre_oficial as partido_nombre, p.sigla as partido_sigla, p.color_principal_hex as partido_color,
                   d.nombre as depto_nombre, dist.nombre as dist_nombre
            FROM candidatos ca
            LEFT JOIN perfil_candidato pc ON pc.candidato_id = ca.id
            LEFT JOIN partidos p ON p.id = pc.partido_id
            LEFT JOIN departamentos d ON ca.departamento_id = d.id
            LEFT JOIN distritos dist ON ca.distrito_id = dist.id
            WHERE ca.activo = 1
            ORDER BY ca.id
        """).fetchall()
        candidatos = []
        for r in rows:
            candidatos.append({
                "id": r[0],
                "nombre": r[1],
                "cargo": r[2],
                "lista": r[3],
                "departamento_id": r[4],
                "distrito_id": r[5],
                "tiene_perfil": r[6] is not None,
                "propuestas_count": len(json.loads(r[7])) if r[7] else 0,
                "simpatizantes": r[8],
                "partido_nombre": r[9],
                "partido_sigla": r[10],
                "partido_color": r[11],
                "departamento": r[12] or '',
                "distrito": r[13] or '',
                "url": f"/candidato.html?id={r[0]}"
            })
        return {"success": True, "candidatos": candidatos, "total": len(candidatos)}
    finally:
        conn.close()


# MÓDULO: PÁGINA DE CANDIDATO
# ═══════════════════════════════════════════════════════════════

@app.post("/api/candidato/foto/actualizar")
def candidato_foto_actualizar(data: dict = Body(...)):
    """Actualizar foto OFICIAL del candidato: de perfil (circular) o de portada (banner ancho),
    según 'tipo' ('perfil', default, o 'portada'). Acepta base64 o URL. Solo el dueño o sus
    dirigentes (ver _autenticar_y_verificar_dueno) — no confundir con el collage de fotos de
    seguidores, que es público y vive en /api/candidato/fotos_fans/*."""
    conn = get_connection()
    try:
        candidato_id = data.get("candidato_id")
        if not candidato_id:
            return {"success": False, "error": "candidato_id es obligatorio"}
        tipo = data.get("tipo", "perfil")
        if tipo not in ("perfil", "portada"):
            return {"success": False, "error": "tipo debe ser 'perfil' o 'portada'"}
        columna = "foto_url" if tipo == "perfil" else "portada_url"
        usuario = _autenticar_y_verificar_dueno(conn, data, candidato_id)
        c = conn.cursor()
        foto_base64 = data.get("foto_base64", "")
        foto_url = data.get("foto_url", "")
        modificado_por = usuario["cedula"]

        # Determinar la fuente de la foto
        if foto_base64:
            # Guardar base64 en la BD (se sirve como data URI)
            foto_valor = foto_base64
        elif foto_url:
            foto_valor = foto_url
        else:
            return {"success": False, "error": "foto_base64 o foto_url es obligatorio"}

        # Verificar si el perfil existe
        existe = c.execute("SELECT id FROM perfil_candidato WHERE candidato_id=?", (candidato_id,)).fetchone()
        # TODO: SQL injection fix - 'columna' puede ser 'foto_url' o 'portada_url', pero 'portada_url'
        # no está en COLUMNAS_PERMITIDAS. Se necesita agregar a la whitelist en database.py o
        # restringir los valores permitidos aquí.
        if existe:
            c.execute(f"UPDATE perfil_candidato SET {columna}=?, updated_at=datetime('now','localtime') WHERE candidato_id=?",
                      (foto_valor, candidato_id))
        else:
            c.execute(f"INSERT INTO perfil_candidato (candidato_id, {columna}, created_at, updated_at) VALUES (?,?, datetime('now','localtime'), datetime('now','localtime'))",
                      (candidato_id, foto_valor))

        # Registrar en historial
        c.execute("""INSERT INTO historial_publicaciones
            (candidato_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por, ip_modificacion)
            VALUES (?,?,?,?,?,?)""",
            (candidato_id, columna, "", f"{tipo} actualizada", modificado_por, ""))

        conn.commit()
        return {"success": True, "accion": "foto_actualizada", "tipo": tipo}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


@app.get("/api/candidato/perfil/{candidato_id}")
def candidato_perfil(candidato_id: int, cedula_viewer: str = ""):
    """Perfil público del candidato: foto, bio, cargo, partido, logo, propuestas, redes sociales"""
    conn = get_connection()
    try:
        c = conn.cursor()
        row = c.execute("""
            SELECT ca.id, ca.nombre, ca.cargo, ca.lista_nombre, ca.departamento_id, ca.distrito_id,
                   pc.foto_url, pc.bio_breve, pc.cargo_postula, pc.partido_id, pc.partido_logo_url,
                   pc.propuestas_clave, p.nombre_oficial as partido_nombre, p.sigla as partido_sigla,
                   p.color_principal_hex as partido_color, pc.redes_sociales, pc.eslogan,
                   d.nombre as departamento_nombre, dist.nombre as distrito_nombre, pc.portada_url
            FROM candidatos ca
            LEFT JOIN perfil_candidato pc ON pc.candidato_id = ca.id
            LEFT JOIN partidos p ON p.id = pc.partido_id
            LEFT JOIN departamentos d ON ca.departamento_id = d.id
            LEFT JOIN distritos dist ON ca.distrito_id = dist.id
            WHERE ca.id = ?
        """, (candidato_id,)).fetchone()
        if not row:
            return {"success": False, "error": "Candidato no encontrado"}
        es_propietario = bool(cedula_viewer) and _puede_editar_candidato(conn, cedula_viewer, candidato_id)
        return {"success": True, "perfil": {
            "id": row[0], "nombre": row[1], "cargo": row[2], "lista": row[3],
            "departamento_id": row[4], "distrito_id": row[5],
            "foto_url": row[6], "bio_breve": row[7], "cargo_postula": row[8],
            "partido_id": row[9], "partido_logo_url": row[10],
            "propuestas_clave": json.loads(row[11]) if row[11] else [],
            "partido_nombre": row[12], "partido_sigla": row[13], "partido_color": row[14],
            "portada_url": row[19] or "",
            "redes_sociales": json.loads(row[15]) if row[15] else {},
            "eslogan": row[16] or "",
            "departamento_nombre": row[17] or "", "distrito_nombre": row[18] or "",
            "es_propietario": es_propietario
        }}
    finally:
        conn.close()

@app.post("/api/candidato/perfil/actualizar")
def candidato_perfil_actualizar(data: dict = Body(...), request: Request = None):
    """Actualizar perfil del candidato (foto, bio, propuestas, eslogan, redes). Solo el dueño o sus
    dirigentes. Registra en historial."""
    conn = get_connection()
    try:
        candidato_id = data.get("candidato_id")
        usuario = _autenticar_y_verificar_dueno(conn, data, candidato_id)
        c = conn.cursor()
        foto_url = data.get("foto_url", "")
        bio_breve = data.get("bio_breve", "")
        propuestas_clave = data.get("propuestas_clave", [])
        eslogan = data.get("eslogan", "")
        redes_sociales = data.get("redes_sociales", {})

        # Obtener valores anteriores
        anterior = c.execute("SELECT foto_url, bio_breve, propuestas_clave, eslogan, redes_sociales FROM perfil_candidato WHERE candidato_id=?", (candidato_id,)).fetchone()
        if not anterior:
            # Crear perfil si no existe
            c.execute("""INSERT INTO perfil_candidato (candidato_id, foto_url, bio_breve, propuestas_clave, eslogan, redes_sociales)
                         VALUES (?,?,?,?,?,?)""",
                      (candidato_id, foto_url, bio_breve, json.dumps(propuestas_clave), eslogan, json.dumps(redes_sociales)))
            historial_cambio = ("(creación)", foto_url, bio_breve, json.dumps(propuestas_clave))
        else:
            historial_cambio = anterior
            c.execute("""UPDATE perfil_candidato SET foto_url=?, bio_breve=?, propuestas_clave=?, eslogan=?,
                         redes_sociales=?, updated_at=datetime('now','localtime') WHERE candidato_id=?""",
                      (foto_url, bio_breve, json.dumps(propuestas_clave), eslogan, json.dumps(redes_sociales), candidato_id))

        # Registrar en historial
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() if request else ""
        c.execute("""INSERT INTO historial_publicaciones
            (candidato_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por, ip_modificacion)
            VALUES (?,?,?,?,?,?)""", (candidato_id, "perfil_completo", str(historial_cambio), str((foto_url, bio_breve, propuestas_clave, eslogan)), usuario["cedula"], ip))

        conn.commit()
        return {"success": True, "accion": "actualizado"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


# ─── Collage de fotos de seguidores ("fotos con el candidato") ──────────
# Público: cualquiera puede subir una foto (queda "pendiente"). Solo el dueño
# del candidato (o sus dirigentes) ve y modera las pendientes.
MAX_FOTO_FAN_BASE64 = 7_000_000  # ~5MB de imagen real en base64 (~1.37x overhead)

@app.post("/api/candidato/fotos_fans/subir")
def candidato_fotos_fans_subir(data: dict = Body(...)):
    """Subida pública de una foto de un seguidor con el candidato. Queda pendiente de aprobación."""
    conn = get_connection()
    try:
        candidato_id = data.get("candidato_id")
        foto_base64 = data.get("foto_base64", "")
        nombre_seguidor = normalizar_texto(data.get("nombre_seguidor", ""))[:120]
        if not candidato_id:
            return {"success": False, "error": "candidato_id es obligatorio"}
        if not foto_base64:
            return {"success": False, "error": "foto_base64 es obligatorio"}
        if len(foto_base64) > MAX_FOTO_FAN_BASE64:
            return {"success": False, "error": "Imagen demasiado grande (máximo ~5MB)"}
        c = conn.cursor()
        if not c.execute("SELECT 1 FROM candidatos WHERE id=?", (candidato_id,)).fetchone():
            return {"success": False, "error": "Candidato no encontrado"}
        c.execute("""INSERT INTO candidato_fotos_fans (candidato_id, foto_url, nombre_seguidor, estado)
                     VALUES (?,?,?,'pendiente')""", (candidato_id, foto_base64, nombre_seguidor))
        conn.commit()
        return {"success": True, "accion": "pendiente_aprobacion"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/candidato/fotos_fans/{candidato_id}")
def candidato_fotos_fans_listar(candidato_id: int):
    """Collage público: solo fotos ya aprobadas por el candidato/dirigente."""
    conn = get_connection()
    try:
        rows = conn.execute("""SELECT id, foto_url, nombre_seguidor, creado FROM candidato_fotos_fans
                                WHERE candidato_id=? AND estado='aprobada'
                                ORDER BY creado DESC LIMIT 60""", (candidato_id,)).fetchall()
        return {"success": True, "fotos": [
            {"id": r[0], "foto_url": r[1], "nombre_seguidor": r[2], "creado": r[3]} for r in rows
        ]}
    finally:
        conn.close()

@app.post("/api/candidato/fotos_fans/pendientes")
def candidato_fotos_fans_pendientes(data: dict = Body(...)):
    """Lista las fotos pendientes de moderación. Solo el dueño del candidato o sus dirigentes."""
    conn = get_connection()
    try:
        candidato_id = data.get("candidato_id")
        _autenticar_y_verificar_dueno(conn, data, candidato_id)
        rows = conn.execute("""SELECT id, foto_url, nombre_seguidor, creado FROM candidato_fotos_fans
                                WHERE candidato_id=? AND estado='pendiente'
                                ORDER BY creado ASC""", (candidato_id,)).fetchall()
        return {"success": True, "fotos": [
            {"id": r[0], "foto_url": r[1], "nombre_seguidor": r[2], "creado": r[3]} for r in rows
        ]}
    finally:
        conn.close()

@app.post("/api/candidato/fotos_fans/moderar")
def candidato_fotos_fans_moderar(data: dict = Body(...)):
    """Aprobar o rechazar una foto pendiente. Solo el dueño del candidato o sus dirigentes."""
    conn = get_connection()
    try:
        foto_id = data.get("foto_id")
        accion = data.get("accion")
        if accion not in ("aprobar", "rechazar"):
            return {"success": False, "error": "accion debe ser 'aprobar' o 'rechazar'"}
        c = conn.cursor()
        foto = c.execute("SELECT candidato_id FROM candidato_fotos_fans WHERE id=?", (foto_id,)).fetchone()
        if not foto:
            return {"success": False, "error": "Foto no encontrada"}
        candidato_id = foto[0]
        usuario = _autenticar_y_verificar_dueno(conn, data, candidato_id)
        nuevo_estado = "aprobada" if accion == "aprobar" else "rechazada"
        c.execute("""UPDATE candidato_fotos_fans SET estado=?, revisado_por=?, revisado_en=datetime('now','localtime')
                     WHERE id=?""", (nuevo_estado, usuario["cedula"], foto_id))
        if accion == "aprobar":
            c.execute("""INSERT INTO historial_publicaciones
                (candidato_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por, ip_modificacion)
                VALUES (?,?,?,?,?,?)""", (candidato_id, "foto_fan_aprobada", "", f"foto_fan#{foto_id}", usuario["cedula"], ""))
        conn.commit()
        return {"success": True, "accion": nuevo_estado}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


@app.get("/api/candidato/partido/{partido_id}")
def candidato_partido(partido_id: int):
    """Datos del partido para mostrar en la página del candidato"""
    conn = get_connection()
    try:
        row = conn.execute("SELECT id, nombre_oficial, sigla, logo_url, color_principal_hex, descripcion_corta FROM partidos WHERE id=?", (partido_id,)).fetchone()
        if not row:
            return {"success": False, "error": "Partido no encontrado"}
        return {"success": True, "partido": {
            "id": row[0], "nombre_oficial": row[1], "sigla": row[2],
            "logo_url": row[3], "color_principal_hex": row[4], "descripcion_corta": row[5]
        }}
    finally:
        conn.close()

@app.get("/api/candidato/encuesta/{candidato_id}")
def candidato_encuesta(candidato_id: int):
    """Preguntas activas de la encuesta programática con opciones"""
    conn = get_connection()
    try:
        rows = conn.execute("SELECT id, pregunta, opciones, orden FROM preguntas_encuesta WHERE candidato_id=? AND activa=1 ORDER BY orden", (candidato_id,)).fetchall()
        preguntas = [{"id": r[0], "pregunta": r[1], "opciones": json.loads(r[2]) if r[2] else [], "orden": r[3]} for r in rows]
        return {"success": True, "preguntas": preguntas}
    finally:
        conn.close()

@app.post("/api/candidato/encuesta/responder")
def candidato_encuesta_responder(data: dict = Body(...)):
    """Registrar respuesta del votante a una pregunta de la encuesta"""
    conn = get_connection()
    try:
        c = conn.cursor()
        pregunta_id = data.get("pregunta_id")
        votante_cedula = data.get("votante_cedula")
        respuesta = data.get("respuesta", "")
        
        if not pregunta_id or not votante_cedula:
            return {"success": False, "error": "pregunta_id y votante_cedula son obligatorios"}
        
        # Verificar que la pregunta existe
        preg = c.execute("SELECT id FROM preguntas_encuesta WHERE id=?", (pregunta_id,)).fetchone()
        if not preg:
            return {"success": False, "error": "Pregunta no encontrada"}
        
        # Insertar o actualizar respuesta (1 por votante por pregunta)
        c.execute("""INSERT OR REPLACE INTO respuestas_encuesta (pregunta_id, votante_cedula, respuesta, created_at)
                     VALUES (?,?,?, datetime('now','localtime'))""", (pregunta_id, votante_cedula, respuesta))
        conn.commit()
        return {"success": True, "accion": "registrada"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/candidato/encuesta/resultados/{candidato_id}")
def candidato_encuesta_resultados(candidato_id: int):
    """Conteo de respuestas por pregunta para el candidato"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT p.id, p.pregunta, p.opciones, r.respuesta, COUNT(r.id) as total
            FROM preguntas_encuesta p
            LEFT JOIN respuestas_encuesta r ON r.pregunta_id = p.id
            WHERE p.candidato_id = ? AND p.activa = 1
            GROUP BY p.id, p.pregunta, r.respuesta
            ORDER BY p.orden
        """, (candidato_id,)).fetchall()
        resultados = {}
        for r in rows:
            if r[0] not in resultados:
                resultados[r[0]] = {"pregunta": r[1], "opciones": json.loads(r[2]) if r[2] else [], "respuestas": {}}
            if r[3]:
                resultados[r[0]]["respuestas"][r[3]] = r[4]
        return {"success": True, "resultados": list(resultados.values())}
    finally:
        conn.close()

@app.get("/api/candidato/lugar-votacion")
def candidato_lugar_votacion(cedula: str = Query(...)):
    """Consulta de lugar de votación por cédula (integración con padrón)"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT p.cedula, p.nombre, p.direccion, p.mesa, p.orden, p.depart, p.local_nombre
            FROM padron2026_completo p WHERE p.cedula = ?
        """, (ced,)).fetchone()
        if not row:
            return {"success": False, "error": "Cédula no encontrada en el padrón"}
        return {"success": True, "lugar": {
            "cedula": row[0], "nombre": row[1], "direccion": row[2],
            "mesa": row[3], "orden": row[4], "departamento": row[5], "local": row[6]
        }}
    finally:
        conn.close()

@app.post("/api/candidato/simpatia/registrar")
def candidato_simpatia_registrar(data: dict = Body(...)):
    """Registrar simpatía del votante por un candidato (con geolocalización opcional)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        candidato_id = data.get("candidato_id")
        votante_cedula = data.get("votante_cedula")
        lat = data.get("lat")
        lng = data.get("lng")
        nivel = data.get("nivel_interes", 1)
        origen = data.get("origen", "web")
        
        if not candidato_id or not votante_cedula:
            return {"success": False, "error": "candidato_id y votante_cedula son obligatorios"}
        
        # Verificar que el candidato existe
        cand = c.execute("SELECT id FROM candidatos WHERE id=?", (candidato_id,)).fetchone()
        if not cand:
            return {"success": False, "error": "Candidato no encontrado"}
        
        # Obtener departamento/distrito del padrón
        padron = c.execute("SELECT depart, distrito FROM padron2026_completo WHERE cedula=?", (votante_cedula,)).fetchone()
        departamento_id = padron[0] if padron else None
        distrito_id = padron[1] if padron else None
        
        # Insert o update (1 simpatía por votante por candidato)
        c.execute("""INSERT OR REPLACE INTO simpatizantes 
            (candidato_id, votante_cedula, departamento_id, distrito_id, lat, lng, nivel_interes, origen, created_at)
            VALUES (?,?,?,?,?,?,?,?, datetime('now','localtime'))""",
            (candidato_id, votante_cedula, departamento_id, distrito_id, lat, lng, nivel, origen))
        conn.commit()
        
        # Registrar consulta pública
        c.execute("""INSERT INTO consultas_publicas 
            (cedula_consultada, departamento, distrito, candidato_cedula, canal)
            VALUES (?,?,?,?,?)""", (votante_cedula, str(departamento_id or ''), str(distrito_id or ''), candidato_id, "simpatia"))
        conn.commit()
        
        return {"success": True, "accion": "registrado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/candidato/simpatia/metricas/{candidato_id}")
def candidato_simpatia_metricas(candidato_id: int):
    """Métricas de simpatía: total, por zona, por nivel de interés"""
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM simpatizantes WHERE candidato_id=?", (candidato_id,)).fetchone()[0]
        
        # Por departamento
        por_depto = conn.execute("""
            SELECT d.nombre, COUNT(s.id) as total
            FROM simpatizantes s
            LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.candidato_id = ?
            GROUP BY s.departamento_id ORDER BY total DESC LIMIT 10
        """, (candidato_id,)).fetchall()
        
        # Por nivel de interés
        por_nivel = conn.execute("""
            SELECT nivel_interes, COUNT(*) as total FROM simpatizantes WHERE candidato_id=? GROUP BY nivel_interes
        """, (candidato_id,)).fetchall()
        
        return {"success": True, "metricas": {
            "total": total,
            "por_departamento": [{"nombre": r[0], "total": r[1]} for r in por_depto],
            "por_nivel": [{"nivel": r[0], "total": r[1]} for r in por_nivel]
        }}
    finally:
        conn.close()

@app.get("/api/candidato/simpatia/mapa/{candidato_id}")
def candidato_simpatia_mapa(candidato_id: int):
    """Puntos GPS de simpatizantes para mapa Leaflet"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT s.lat, s.lng, s.nivel_interes, d.nombre as departamento
            FROM simpatizantes s
            LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.candidato_id = ? AND s.lat IS NOT NULL AND s.lng IS NOT NULL
        """, (candidato_id,)).fetchall()
        puntos = [{"lat": r[0], "lng": r[1], "nivel": r[2], "departamento": r[3]} for r in rows]
        return {"success": True, "puntos": puntos}
    finally:
        conn.close()

@app.get("/api/candidato/historial/{candidato_id}")
def candidato_historial(candidato_id: int):
    """Historial de cambios en publicaciones del candidato (auditoría)"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT id, campo_modificado, valor_anterior, valor_nuevo, modificado_por, ip_modificacion, created_at
            FROM historial_publicaciones WHERE candidato_id=? ORDER BY created_at DESC LIMIT 100
        """, (candidato_id,)).fetchall()
        historial = [{"id": r[0], "campo": r[1], "anterior": r[2], "nuevo": r[3], "por": r[4], "ip": r[5], "fecha": r[6]} for r in rows]
        return {"success": True, "historial": historial}
    finally:
        conn.close()

@app.get("/api/candidato/eventos/{candidato_id}")
def candidato_eventos(candidato_id: int):
    """Eventos programados y en vivo del candidato"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT id, titulo, descripcion, url_stream, fecha_hora, estado
            FROM eventos_en_vivo WHERE candidato_id=? ORDER BY fecha_hora DESC
        """, (candidato_id,)).fetchall()
        eventos = [{"id": r[0], "titulo": r[1], "descripcion": r[2], "url_stream": r[3], "fecha_hora": r[4], "estado": r[5]} for r in rows]
        return {"success": True, "eventos": eventos}
    finally:
        conn.close()

@app.post("/api/candidato/eventos/crear")
def candidato_evento_crear(data: dict = Body(...)):
    """Crear evento en vivo"""
    conn = get_connection()
    try:
        c = conn.cursor()
        candidato_id = data.get("candidato_id")
        titulo = data.get("titulo", "")
        descripcion = data.get("descripcion", "")
        url_stream = data.get("url_stream", "")
        fecha_hora = data.get("fecha_hora", "")
        
        if not candidato_id or not titulo:
            return {"success": False, "error": "candidato_id y titulo son obligatorios"}
        
        c.execute("""INSERT INTO eventos_en_vivo (candidato_id, titulo, descripcion, url_stream, fecha_hora)
                     VALUES (?,?,?,?,?)""", (candidato_id, titulo, descripcion, url_stream, fecha_hora))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/candidato/dashboard/{candidato_id}")
def candidato_dashboard(candidato_id: int):
    """Dashboard completo: métricas + eventos + último historial"""
    conn = get_connection()
    try:
        # Métricas de simpatía
        total_simpatizantes = conn.execute("SELECT COUNT(*) FROM simpatizantes WHERE candidato_id=?", (candidato_id,)).fetchone()[0]
        
        # Encuestas
        preguntas = conn.execute("SELECT COUNT(*) FROM preguntas_encuesta WHERE candidato_id=? AND activa=1", (candidato_id,)).fetchone()[0]
        respuestas = conn.execute("""
            SELECT COUNT(DISTINCT r.votante_cedula) FROM respuestas_encuesta r
            JOIN preguntas_encuesta p ON r.pregunta_id = p.id
            WHERE p.candidato_id = ?
        """, (candidato_id,)).fetchone()[0]
        
        # Consultas
        consultas = conn.execute("SELECT COUNT(*) FROM consultas_publicas WHERE candidato_cedula=?", (str(candidato_id),)).fetchone()[0]
        
        # Eventos
        eventos = conn.execute("SELECT COUNT(*) FROM eventos_en_vivo WHERE candidato_id=? AND estado='programado'", (candidato_id,)).fetchone()[0]
        
        # Último cambio
        ultimo = conn.execute("SELECT campo_modificado, created_at FROM historial_publicaciones WHERE candidato_id=? ORDER BY created_at DESC LIMIT 1", (candidato_id,)).fetchone()
        
        return {"success": True, "dashboard": {
            "simpatizantes": total_simpatizantes,
            "preguntas_activas": preguntas,
            "respuestas_totales": respuestas,
            "consultas_publicas": consultas,
            "eventos_programados": eventos,
            "ultimo_cambio": {"campo": ultimo[0], "fecha": ultimo[1]} if ultimo else None
        }}
    finally:
        conn.close()


# ─── PARTIDOS POLITICOS ──────────────────────────────────


# ═══════════════════════════════════════════════════════════════
# MÓDULO: EXPORTACIÓN PDF/EXCEL, NOTIFICACIÓN, COMPARATIVO
# ═══════════════════════════════════════════════════════════════

@app.get("/api/candidato/exportar/pdf/{candidato_id}")
def candidato_exportar_pdf(candidato_id: int):
    """Genera PDF con historial de cambios + métricas del candidato"""
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import cm
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib import colors
        import io
    except ImportError:
        return {"success": False, "error": "reportlab no disponible"}

    conn = get_connection()
    try:
        c = conn.cursor()

        # Datos del candidato
        cand = c.execute("""
            SELECT ca.nombre, ca.cargo, ca.lista_nombre, p.nombre_oficial as partido
            FROM candidatos ca LEFT JOIN clientes p ON ca.cliente_cedula = p.cedula
            WHERE ca.id = ?""", (candidato_id,)).fetchone()
        if not cand:
            return {"success": False, "error": "Candidato no encontrado"}

        # Métricas
        total_simpatizantes = c.execute("SELECT COUNT(*) FROM simpatizantes WHERE candidato_id=?", (candidato_id,)).fetchone()[0]
        preguntas = c.execute("SELECT COUNT(*) FROM preguntas_encuesta WHERE candidato_id=? AND activa=1", (candidato_id,)).fetchone()[0]
        respuestas = c.execute("""
            SELECT COUNT(DISTINCT r.votante_cedula) FROM respuestas_encuesta r
            JOIN preguntas_encuesta p ON r.pregunta_id = p.id WHERE p.candidato_id = ?
        """, (candidato_id,)).fetchone()[0]

        # Historial
        historial = c.execute("""
            SELECT campo_modificado, valor_anterior, valor_nuevo, modificado_por, created_at
            FROM historial_publicaciones WHERE candidato_id=? ORDER BY created_at DESC LIMIT 50
        """, (candidato_id,)).fetchall()

        # Generar PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=2*cm, leftMargin=2*cm)
        styles = getSampleStyleSheet()
        story = []

        # Título
        story.append(Paragraph(f"Informe del Candidato: {cand[0]}", styles['Title']))
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph(f"Cargo: {cand[1]} | Lista: {cand[2]} | Partido: {cand[3]}", styles['Normal']))
        story.append(Spacer(1, 0.5*cm))

        # Métricas
        story.append(Paragraph("<b>Métricas</b>", styles['Heading2']))
        metricas = [
            ["Simpatizantes", str(total_simpatizantes)],
            ["Preguntas activas", str(preguntas)],
            ["Respuestas recibidas", str(respuestas)],
        ]
        t = Table(metricas, colWidths=[8*cm, 4*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.5*cm))

        # Historial
        story.append(Paragraph("<b>Historial de Cambios</b>", styles['Heading2']))
        if historial:
            hist_data = [["Fecha", "Campo", "Modificado por"]]
            for h in historial:
                hist_data.append([h[4][:10], h[0], h[3] or 'Sistema'])
            t2 = Table(hist_data, colWidths=[4*cm, 6*cm, 4*cm])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
            ]))
            story.append(t2)
        else:
            story.append(Paragraph("Sin cambios registrados", styles['Normal']))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        # Guardar PDF en disco
        pdf_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'exports')
        os.makedirs(pdf_path, exist_ok=True)
        filename = f"candidato_{candidato_id}_informe.pdf"
        filepath = os.path.join(pdf_path, filename)
        with open(filepath, 'wb') as f:
            f.write(pdf_bytes)

        return {"success": True, "filename": filename, "size": len(pdf_bytes)}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/candidato/exportar/excel/{candidato_id}")
def candidato_exportar_excel(candidato_id: int):
    """Genera Excel con métricas + simpatizantes del candidato"""
    try:
        from openpyxl import Workbook
    except ImportError:
        return {"success": False, "error": "openpyxl no disponible"}

    conn = get_connection()
    try:
        wb = Workbook()
        ws = wb.active
        ws.title = f"Candidato_{candidato_id}"

        # Datos del candidato
        cand = c.execute("""
            SELECT ca.nombre, ca.cargo, ca.lista_nombre, p.nombre_oficial as partido
            FROM candidatos ca LEFT JOIN clientes p ON ca.cliente_cedula = p.cedula
            WHERE ca.id = ?""", (candidato_id,)).fetchone()
        if not cand:
            return {"success": False, "error": "Candidato no encontrado"}

        # Encabezado
        ws.append([f"Informe del Candidato: {cand[0]}"])
        ws.append([f"Cargo: {cand[1]} | Lista: {cand[2]} | Partido: {cand[3]}"])
        ws.append([])

        # Métricas
        ws.append(["Métricas"])
        ws.append(["Métrica", "Valor"])
        ws.append(["Simpatizantes", c.execute("SELECT COUNT(*) FROM simpatizantes WHERE candidato_id=?", (candidato_id,)).fetchone()[0]])
        ws.append(["Preguntas activas", c.execute("SELECT COUNT(*) FROM preguntas_encuesta WHERE candidato_id=? AND activa=1", (candidato_id,)).fetchone()[0]])
        ws.append(["Respuestas", c.execute("""
            SELECT COUNT(DISTINCT r.votante_cedula) FROM respuestas_encuesta r
            JOIN preguntas_encuesta p ON r.pregunta_id = p.id WHERE p.candidato_id = ?
        """, (candidato_id,)).fetchone()[0]])
        ws.append([])

        # Historial
        ws.append(["Historial de Cambios"])
        ws.append(["Fecha", "Campo", "Anterior", "Nuevo", "Por"])
        historial = c.execute("""
            SELECT campo_modificado, valor_anterior, valor_nuevo, modificado_por, created_at
            FROM historial_publicaciones WHERE candidato_id=? ORDER BY created_at DESC LIMIT 100
        """, (candidato_id,)).fetchall()
        for h in historial:
            ws.append([h[4][:10], h[0], h[1][:50], h[2][:50], h[3] or 'Sistema'])
        ws.append([])

        # Simpatizantes
        ws.append(["Simpatizantes"])
        ws.append(["Cédula", "Departamento", "Distrito", "Lat", "Lng", "Nivel", "Origen"])
        simps = c.execute("""
            SELECT s.votante_cedula, d.nombre, s.distrito_id, s.lat, s.lng, s.nivel_interes, s.origen
            FROM simpatizantes s LEFT JOIN departamentos d ON s.departamento_id = d.id
            WHERE s.candidato_id=?""", (candidato_id,)).fetchall()
        for s in simps:
            ws.append([s[0], s[1] or '', s[2], s[3], s[4], s[5], s[6]])

        # Guardar
        export_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'static', 'exports')
        os.makedirs(export_path, exist_ok=True)
        filename = f"candidato_{candidato_id}_informe.xlsx"
        filepath = os.path.join(export_path, filename)
        wb.save(filepath)

        return {"success": True, "filename": filename}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/candidato/simpatia/comparativo")
def candidato_simpatia_comparativo():
    """Comparación de simpatizantes entre candidatos (gráfico de barras)"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT ca.id, ca.nombre, ca.cargo, COUNT(s.id) as simpatizantes
            FROM candidatos ca
            LEFT JOIN simpatizantes s ON s.candidato_id = ca.id
            WHERE ca.activo = 1
            GROUP BY ca.id
            ORDER BY simpatizantes DESC
        """).fetchall()
        return {"success": True, "comparativo": [
            {"id": r[0], "nombre": r[1], "cargo": r[2], "simpatizantes": r[3]}
            for r in rows
        ]}
    finally:
        conn.close()

@app.post("/api/candidato/notificar")
def candidato_notificar(data: dict = Body(...)):
    """Enviar notificación (WhatsApp/SMS/email) a simpatizantes del candidato"""
    conn = get_connection()
    try:
        c = conn.cursor()
        candidato_id = data.get("candidato_id")
        mensaje = data.get("mensaje", "")
        canal = data.get("canal", "whatsapp")  # whatsapp, sms, email

        if not candidato_id or not mensaje:
            return {"success": False, "error": "candidato_id y mensaje son obligatorios"}

        # Obtener cédulas de simpatizantes
        cedulas = [r[0] for r in c.execute(
            "SELECT votante_cedula FROM simpatizantes WHERE candidato_id=?", (candidato_id,)
        ).fetchall()]

        if not cedulas:
            return {"success": False, "error": "No hay simpatizantes registrados"}

        enviados = 0
        errores = 0
        for cedula in cedulas:
            try:
                tel_row = c.execute(
                    "SELECT telefono FROM dirigentes WHERE cedula=?", (cedula,)
                ).fetchone()
                if tel_row and tel_row[0]:
                    telefono = tel_row[0]
                    if canal == "whatsapp":
                        if enviar_whatsapp(telefono, mensaje):
                            enviados += 1
                        else:
                            errores += 1
                    else:
                        enviados += 1
                else:
                    errores += 1
            except Exception:
                errores += 1

        return {"success": True, "enviados": enviados, "errores": errores, "canal": canal, "total_simpatizantes": len(cedulas)}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/candidato/encuesta/pregunta/crear")
def candidato_encuesta_pregunta_crear(data: dict = Body(...)):
    """Crear pregunta de encuesta (dirigente/master)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        candidato_id = data.get("candidato_id")
        pregunta = data.get("pregunta", "")
        opciones = data.get("opciones", [])
        orden = data.get("orden", 0)

        if not candidato_id or not pregunta:
            return {"success": False, "error": "candidato_id y pregunta son obligatorios"}

        c.execute("""INSERT INTO preguntas_encuesta (candidato_id, pregunta, opciones, orden)
                     VALUES (?,?,?,?)""", (candidato_id, pregunta, json.dumps(opciones), orden))
        conn.commit()
        return {"success": True, "id": c.lastrowid, "accion": "creada"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/candidato/encuesta/pregunta/eliminar")
def candidato_encuesta_pregunta_eliminar(data: dict = Body(...)):
    """Eliminar pregunta de encuesta"""
    conn = get_connection()
    try:
        c = conn.cursor()
        pregunta_id = data.get("pregunta_id")
        if not pregunta_id:
            return {"success": False, "error": "pregunta_id es obligatorio"}
        c.execute("DELETE FROM preguntas_encuesta WHERE id=?", (pregunta_id,))
        conn.commit()
        return {"success": True, "accion": "eliminada"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/candidato/simpatia/eliminar")
def candidato_simpatia_eliminar(data: dict = Body(...)):
    """Votante elimina su registro de simpatía (derecho al olvido)"""
    conn = get_connection()
    try:
        c = conn.cursor()
        candidato_id = data.get("candidato_id")
        votante_cedula = data.get("votante_cedula")
        if not candidato_id or not votante_cedula:
            return {"success": False, "error": "candidato_id y votante_cedula son obligatorios"}
        c.execute("DELETE FROM simpatizantes WHERE candidato_id=? AND votante_cedula=?",
                  (candidato_id, votante_cedula))
        conn.commit()
        return {"success": True, "accion": "eliminado"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


@app.get("/api/partidos")


@app.get("/api/candidato/publicaciones/{candidato_id}")
def candidato_publicaciones(candidato_id: int):
    """Lista de publicaciones activas del candidato (perfil + propuestas)"""
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT pc.foto_url, pc.bio_breve, pc.cargo_postula, pc.partido_logo_url,
                   pc.propuestas_clave, ca.nombre, ca.cargo, ca.lista_nombre
            FROM perfil_candidato pc
            JOIN candidatos ca ON ca.id = pc.candidato_id
            WHERE pc.candidato_id = ?
        """, (candidato_id,)).fetchone()
        if not row:
            return {"success": False, "error": "Sin publicaciones"}
        return {"success": True, "publicacion": {
            "foto_url": row[0], "bio_breve": row[1], "cargo_postula": row[2],
            "partido_logo_url": row[3], "propuestas": json.loads(row[4]) if row[4] else [],
            "nombre": row[5], "cargo": row[6], "lista": row[7]
        }}
    finally:
        conn.close()

@app.get("/api/candidato/stream/{candidato_id}")
def candidato_stream(candidato_id: int):
    """URL de stream si hay evento en vivo del candidato"""
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT url_stream, titulo, estado FROM eventos_en_vivo
            WHERE candidato_id = ? AND estado = 'en_vivo'
            ORDER BY fecha_hora DESC LIMIT 1
        """, (candidato_id,)).fetchone()
        if not row:
            return {"success": False, "error": "No hay transmisiones en vivo"}
        return {"success": True, "stream": {"url": row[0], "titulo": row[1], "estado": row[2]}}
    finally:
        conn.close()


def get_partidos():
    """Lista todos los partidos con su perfil completo"""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM partidos ORDER BY prioridad_orden, nombre_oficial").fetchall()
    cols = [d[1] for d in conn.execute("PRAGMA table_info(partidos)").fetchall()]
    result = []
    for r in rows:
        d = {col: r[col] for col in cols}
        if d.get('cargos_habilitados'):
            try: d['cargos_habilitados'] = json.loads(d['cargos_habilitados'])
            except: d['cargos_habilitados'] = []
        result.append(d)
    conn.close()
    return {"success": True, "partidos": result}

@app.get("/api/partidos/{partido_id}")
def get_partido(partido_id: int):
    """Obtiene un partido con sus listas y candidatos"""
    conn = get_connection()
    row = conn.execute("SELECT * FROM partidos WHERE id=?", (partido_id,)).fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": "Partido no encontrado"}
    cols = [d[1] for d in conn.execute("PRAGMA table_info(partidos)").fetchall()]
    partido = {col: row[col] for col in cols}
    if partido.get('cargos_habilitados'):
        try: partido['cargos_habilitados'] = json.loads(partido['cargos_habilitados'])
        except: partido['cargos_habilitados'] = []

    # Listas del partido
    listas = conn.execute("""
        SELECT lp.*, COUNT(cl.id) as total_candidatos
        FROM listas_partido lp
        LEFT JOIN candidatos_lista cl ON cl.lista_id = lp.id AND cl.activo=1
        WHERE lp.partido_id=? AND lp.activo=1
        GROUP BY lp.id ORDER BY lp.orden, lp.numero_lista
    """, (partido_id,)).fetchall()
    listas_cols = [d[1] for d in conn.execute("PRAGMA table_info(listas_partido)").fetchall()] + ['total_candidatos']
    partido['listas'] = []
    for lst in listas:
        ld = {col: lst[i] for i, col in enumerate(listas_cols)}
        # Candidatos de esta lista
        cands = conn.execute("""
            SELECT cl.*, c.nombre as candidato_origen, c.cargo as cargo_origen
            FROM candidatos_lista cl
            LEFT JOIN candidatos c ON c.id = cl.candidato_id
            WHERE cl.lista_id=? AND cl.activo=1
            ORDER BY cl.orden_en_lista
        """, (lst[0],)).fetchall()
        cand_cols = [d[1] for d in conn.execute("PRAGMA table_info(candidatos_lista)").fetchall()] + ['candidato_origen', 'cargo_origen']
        ld['candidatos'] = [{col: c[i] for i, col in enumerate(cand_cols)} for c in cands]
        partido['listas'].append(ld)

    conn.close()
    return {"success": True, "partido": partido}

@app.get("/api/partidos/{partido_id}/listas")
def get_listas_partido(partido_id: int):
    """Lista las listas internas de un partido"""
    conn = get_connection()
    rows = conn.execute("""
        SELECT lp.*, COUNT(cl.id) as total_candidatos
        FROM listas_partido lp
        LEFT JOIN candidatos_lista cl ON cl.lista_id = lp.id AND cl.activo=1
        WHERE lp.partido_id=? AND lp.activo=1
        GROUP BY lp.id ORDER BY lp.orden, lp.numero_lista
    """, (partido_id,)).fetchall()
    cols = [d[1] for d in conn.execute("PRAGMA table_info(listas_partido)").fetchall()] + ['total_candidatos']
    result = [{col: r[i] for i, col in enumerate(cols)} for r in rows]
    conn.close()
    return {"success": True, "listas": result}

# ─── CONFIGURACIÓN DINÁMICA DE PARTIDOS Y ESTRUCTURA OPERATIVA ────────
def _obtener_partido_activo_id(conn):
    try:
        r = conn.execute("SELECT valor FROM config_sistema WHERE clave='partido_activo_id'").fetchone()
        if r and r[0] and str(r[0]).isdigit():
            return int(r[0])
    except Exception:
        pass
    return 1  # Fallback ANR (Colorado)

def _formatear_partido_config(row_p, row_c=None):
    pid = row_p[0]
    codigo = str(row_p[1] or '').strip()
    sigla = str(row_p[3] or codigo).strip()
    color = str(row_p[5] or '').strip()
    if not color:
        color = '#DC2626' if codigo.upper() == 'ANR' else ('#1D4ED8' if codigo.upper() == 'PLRA' else '#C5A059')

    if codigo.upper() == 'ANR':
        def_unidad = 'Seccional'
        def_prefijo = 'Secc'
        def_pc = 'PC'
    elif codigo.upper() == 'PLRA':
        def_unidad = 'Comité'
        def_prefijo = 'Comité'
        def_pc = 'PC'
    else:
        def_unidad = 'Seccional'
        def_prefijo = 'Secc'
        def_pc = 'PC'

    nom_u = (row_c[2] if row_c and len(row_c) > 2 and row_c[2] else def_unidad)
    pref_u = (row_c[3] if row_c and len(row_c) > 3 and row_c[3] else def_prefijo)
    nom_pc = (row_c[4] if row_c and len(row_c) > 4 and row_c[4] else def_pc)

    return {
        "id": pid,
        "codigo_partido": codigo,
        "nombre_oficial": str(row_p[2] or ''),
        "sigla": sigla,
        "descripcion_corta": str(row_p[4] or ''),
        "color_principal_hex": color,
        "color_secundario_hex": str(row_p[6] or '#FFFFFF'),
        "logo_url": str(row_p[7] or ''),
        "numero_lista": row_p[11],
        "nombre_unidad": nom_u,
        "prefijo_unidad": pref_u,
        "nombre_pc": nom_pc
    }

@app.get("/api/partido/config")
def get_partido_config(partido_id: int = Query(None)):
    """Obtiene la configuración activa del partido (ANR, PLRA o personalizado), su color y estructura de unidades/PC."""
    conn = get_connection()
    try:
        c = conn.cursor()
        activo_id = _obtener_partido_activo_id(conn)
        target_id = partido_id if partido_id is not None else activo_id

        # Partido seleccionado / activo
        row_p = c.execute("SELECT * FROM partidos WHERE id=?", (target_id,)).fetchone()
        if not row_p:
            # Fallback a primer partido
            row_p = c.execute("SELECT * FROM partidos ORDER BY prioridad_orden, id LIMIT 1").fetchone()
            if row_p: target_id = row_p[0]

        row_c = c.execute("SELECT * FROM partidos_config_organizacion WHERE partido_id=?", (target_id,)).fetchone()
        partido_activo = _formatear_partido_config(row_p, row_c) if row_p else {}

        # Lista de todos los partidos con sus configuraciones
        todos_p = c.execute("SELECT * FROM partidos ORDER BY prioridad_orden, nombre_oficial").fetchall()
        configs = {r[1]: r for r in c.execute("SELECT * FROM partidos_config_organizacion").fetchall()}
        lista_partidos = [_formatear_partido_config(p, configs.get(p[0])) for p in todos_p]

        # Resumen de conteos para el partido activo
        total_unidades = c.execute("SELECT COUNT(*) FROM unidades_organizacion WHERE partido_id=?", (target_id,)).fetchone()[0] or 0
        total_pcs = c.execute("""
            SELECT COUNT(*) FROM puestos_comando pc
            JOIN unidades_organizacion u ON u.id = pc.unidad_id
            WHERE u.partido_id=?
        """, (target_id,)).fetchone()[0] or 0

        return {
            "success": True,
            "activo_id": target_id,
            "es_sistema_activo": (target_id == activo_id),
            "partido_activo": partido_activo,
            "partidos": lista_partidos,
            "metricas": {
                "total_unidades": total_unidades,
                "total_pcs": total_pcs
            }
        }
    finally:
        conn.close()

PLANTILLA_WHATSAPP_VOTACION_DEFAULT = "Hola {nombre}, te compartimos tus datos para la jornada electoral.\n\n*Tu lugar de votación*\n{local}\n\n*Mesa:* {mesa} · *Orden:* {orden}\n\n*Consultá dónde votás:*\n{url_consulta}\n\n{candidatos}\n\nGracias por participar."

@app.post("/api/partido/config")
def post_partido_config(data: dict = Body(...)):
    """
    Permite:
    1. Activar partido: { accion: 'activar', partido_id: 1 } (1: ANR, 2: PLRA, etc.)
    2. Personalizar / renombrar partido: {
         partido_id: 1,
         codigo_partido: 'ANR',
         sigla: 'ANR',
         nombre_oficial: '...',
         color_principal_hex: '#DC2626',
         nombre_unidad: 'Seccional',
         prefijo_unidad: 'Secc',
         nombre_pc: 'PC',
         activar: true
       }
    """
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Requiere autenticacion de Admin Master")
        c = conn.cursor()
        accion = data.get("accion", "guardar")
        partido_id = data.get("partido_id")
        if partido_id is not None:
            partido_id = int(partido_id)

        if accion == "activar":
            if not partido_id:
                return {"success": False, "error": "partido_id requerido para activar"}
            c.execute("""
                INSERT INTO config_sistema (clave, valor, updated_at)
                VALUES ('partido_activo_id', ?, datetime('now','localtime'))
                ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor, updated_at=datetime('now','localtime')
            """, (str(partido_id),))
            conn.commit()
            return {"success": True, "accion": "activado", "partido_id": partido_id}

        # Guardar personalización / Renombrar
        if not partido_id:
            partido_id = _obtener_partido_activo_id(conn)

        nombre_oficial = normalizar_texto(data.get("nombre_oficial"))
        sigla = normalizar_texto(data.get("sigla"))
        codigo = normalizar_texto(data.get("codigo_partido") or sigla)
        color = normalizar_texto(data.get("color_principal_hex"))
        color_sec = normalizar_texto(data.get("color_secundario_hex")) or '#FFFFFF'
        nombre_unidad = normalizar_texto(data.get("nombre_unidad"))
        prefijo_unidad = normalizar_texto(data.get("prefijo_unidad")) or nombre_unidad
        nombre_pc = normalizar_texto(data.get("nombre_pc")) or 'PC'

        # Actualizar partido si se enviaron campos
        updates = []
        params = []
        if nombre_oficial:
            updates.append("nombre_oficial=?"); params.append(nombre_oficial)
        if sigla:
            updates.append("sigla=?"); params.append(sigla)
        if codigo:
            updates.append("codigo_partido=?"); params.append(codigo)
        if color:
            updates.append("color_principal_hex=?"); params.append(color)
        if color_sec:
            updates.append("color_secundario_hex=?"); params.append(color_sec)

        if updates:
            params.append(partido_id)
            c.execute(f"UPDATE partidos SET {', '.join(updates)} WHERE id=?", params)

        # Upsert en partidos_config_organizacion
        if nombre_unidad:
            c.execute("""
                INSERT INTO partidos_config_organizacion (partido_id, nombre_unidad, prefijo_unidad, nombre_pc)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(partido_id) DO UPDATE SET
                    nombre_unidad=excluded.nombre_unidad,
                    prefijo_unidad=excluded.prefijo_unidad,
                    nombre_pc=excluded.nombre_pc
            """, (partido_id, nombre_unidad, prefijo_unidad, nombre_pc))

        # Si se solicita activar o por defecto al personalizar
        activar = data.get("activar", True)
        if activar:
            c.execute("""
                INSERT INTO config_sistema (clave, valor, updated_at)
                VALUES ('partido_activo_id', ?, datetime('now','localtime'))
                ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor, updated_at=datetime('now','localtime')
            """, (str(partido_id),))

        conn.commit()

        # Retornar objeto actualizado
        row_p = c.execute("SELECT * FROM partidos WHERE id=?", (partido_id,)).fetchone()
        row_c = c.execute("SELECT * FROM partidos_config_organizacion WHERE partido_id=?", (partido_id,)).fetchone()
        return {
            "success": True,
            "accion": "guardado",
            "partido_activo": _formatear_partido_config(row_p, row_c) if row_p else {}
        }
    finally:
        conn.close()

@app.get("/api/partido/unidades")
def get_partido_unidades(
    partido_id: int = Query(None),
    distrito_id: int = Query(None),
    departamento_id: int = Query(None)
):
    """Lista las unidades operativas (Seccionales / Comités) y sus PCs dependientes."""
    conn = get_connection()
    try:
        c = conn.cursor()
        pid = partido_id if partido_id is not None else _obtener_partido_activo_id(conn)

        # Configuración del partido para conocer nombres
        row_c = c.execute("SELECT * FROM partidos_config_organizacion WHERE partido_id=?", (pid,)).fetchone()
        row_p = c.execute("SELECT * FROM partidos WHERE id=?", (pid,)).fetchone()
        cfg = _formatear_partido_config(row_p, row_c) if row_p else {
            "nombre_unidad": "Seccional", "prefijo_unidad": "Secc", "nombre_pc": "PC", "color_principal_hex": "#DC2626"
        }

        # Filtrar unidades
        query = "SELECT id, departamento_id, distrito_id, partido_id, numero, nombre, descripcion, created_at FROM unidades_organizacion WHERE partido_id=?"
        params = [pid]
        if departamento_id:
            query += " AND departamento_id=?"
            params.append(departamento_id)
        if distrito_id:
            query += " AND distrito_id=?"
            params.append(distrito_id)

        query += " ORDER BY numero ASC, id ASC"
        unidades_raw = c.execute(query, params).fetchall()

        unidades = []
        total_pcs_count = 0
        for u in unidades_raw:
            uid = u[0]
            pcs_raw = c.execute("""
                SELECT id, unidad_id, numero, rol, codigo, candidato_cedula, descripcion, created_at, escuela_nombre, escuela_id
                FROM puestos_comando
                WHERE unidad_id=?
                ORDER BY numero ASC, id ASC
            """, (uid,)).fetchall()

            pcs = []
            for pc in pcs_raw:
                pcs.append({
                    "id": pc[0],
                    "unidad_id": pc[1],
                    "numero": pc[2],
                    "rol": pc[3],
                    "codigo": pc[4],
                    "candidato_cedula": pc[5],
                    "descripcion": pc[6],
                    "created_at": pc[7],
                    "escuela_nombre": pc[8] if len(pc) > 8 else '',
                    "escuela_id": pc[9] if len(pc) > 9 else None
                })

            total_pcs_count += len(pcs)
            unidades.append({
                "id": u[0],
                "departamento_id": u[1],
                "distrito_id": u[2],
                "partido_id": u[3],
                "numero": u[4],
                "nombre": u[5] or f"{cfg['prefijo_unidad']} Nº {u[4]}",
                "descripcion": u[6] or '',
                "created_at": u[7],
                "total_pcs": len(pcs),
                "pcs": pcs
            })

        return {
            "success": True,
            "partido": cfg,
            "total_unidades": len(unidades),
            "total_pcs": total_pcs_count,
            "unidades": unidades
        }
    finally:
        conn.close()

@app.post("/api/partido/unidades")
def post_crear_unidad(data: dict = Body(...)):
    """Crea una nueva Unidad Operativa (ej. Seccional o Comité)"""
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Requiere autenticacion de Admin Master")
        c = conn.cursor()
        pid = data.get("partido_id")
        if pid is None:
            pid = _obtener_partido_activo_id(conn)
        else:
            pid = int(pid)

        # Config de partido para default de nombre
        row_c = c.execute("SELECT * FROM partidos_config_organizacion WHERE partido_id=?", (pid,)).fetchone()
        row_p = c.execute("SELECT * FROM partidos WHERE id=?", (pid,)).fetchone()
        cfg = _formatear_partido_config(row_p, row_c) if row_p else {"prefijo_unidad": "Unidad"}

        # Calcular siguiente número si no viene
        num = data.get("numero")
        if not num:
            max_num = c.execute("SELECT MAX(numero) FROM unidades_organizacion WHERE partido_id=?", (pid,)).fetchone()[0] or 0
            num = max_num + 1
        else:
            num = int(num)

        nombre = normalizar_texto(data.get("nombre"))
        if not nombre:
            nombre = f"{cfg['prefijo_unidad']} Nº {num}"

        depto_id = int(data.get("departamento_id") or 18)
        dist_id = int(data.get("distrito_id") or 254)
        desc = normalizar_texto(data.get("descripcion") or "")

        c.execute("""
            INSERT INTO unidades_organizacion (departamento_id, distrito_id, partido_id, numero, nombre, descripcion)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (depto_id, dist_id, pid, num, nombre, desc))
        conn.commit()
        nuevo_id = c.lastrowid

        return {
            "success": True,
            "unidad": {
                "id": nuevo_id,
                "partido_id": pid,
                "numero": num,
                "nombre": nombre,
                "descripcion": desc,
                "total_pcs": 0,
                "pcs": []
            }
        }
    finally:
        conn.close()

@app.post("/api/partido/unidades/{unidad_id}/pcs")
def post_crear_pc(unidad_id: int, data: dict = Body(...)):
    """Crea un Puesto de Comando (PC) dependiente de una Unidad Operativa"""
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Requiere autenticacion de Admin Master")
        c = conn.cursor()
        u = c.execute("SELECT id, partido_id, numero, nombre FROM unidades_organizacion WHERE id=?", (unidad_id,)).fetchone()
        if not u:
            return {"success": False, "error": "Unidad operativa no encontrada"}

        row_c = c.execute("SELECT * FROM partidos_config_organizacion WHERE partido_id=?", (u[1],)).fetchone()
        nombre_pc = row_c[4] if row_c and len(row_c) > 4 and row_c[4] else "PC"

        # Calcular número de PC dentro de la unidad
        num = data.get("numero")
        if not num:
            max_n = c.execute("SELECT MAX(numero) FROM puestos_comando WHERE unidad_id=?", (unidad_id,)).fetchone()[0] or 0
            num = max_n + 1
        else:
            num = int(num)

        rol = normalizar_texto(data.get("rol") or "concejal").lower()
        codigo = normalizar_texto(data.get("codigo"))
        if not codigo:
            codigo = f"{nombre_pc} {u[2]:02d}-{num:02d}_{rol}"

        ced = normalizar_cedula(data.get("candidato_cedula")) or None
        escuela_nom = normalizar_texto(data.get("escuela_nombre") or "")
        escuela_id = data.get("escuela_id")
        desc = normalizar_texto(data.get("descripcion") or "")

        c.execute("""
            INSERT INTO puestos_comando (unidad_id, numero, rol, codigo, candidato_cedula, escuela_nombre, escuela_id, descripcion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (unidad_id, num, rol, codigo, ced, escuela_nom, escuela_id, desc))
        conn.commit()
        nuevo_id = c.lastrowid

        return {
            "success": True,
            "pc": {
                "id": nuevo_id,
                "unidad_id": unidad_id,
                "numero": num,
                "rol": rol,
                "codigo": codigo,
                "candidato_cedula": ced,
                "escuela_nombre": escuela_nom,
                "escuela_id": escuela_id,
                "descripcion": desc
            }
        }
    finally:
        conn.close()

@app.delete("/api/partido/pcs/{pc_id}")
def delete_pc(pc_id: int, data: dict = Body(default={})):
    """Elimina un puesto de comando (PC)"""
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Requiere autenticacion de Admin Master")
        c = conn.cursor()
        c.execute("DELETE FROM puestos_comando WHERE id=?", (pc_id,))
        conn.commit()
        return {"success": True, "eliminado": pc_id}
    finally:
        conn.close()

@app.delete("/api/partido/unidades/{unidad_id}")
def delete_unidad(unidad_id: int, data: dict = Body(default={})):
    """Elimina una unidad operativa y sus PCs dependientes"""
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Requiere autenticacion de Admin Master")
        c = conn.cursor()
        c.execute("DELETE FROM puestos_comando WHERE unidad_id=?", (unidad_id,))
        c.execute("DELETE FROM unidades_organizacion WHERE id=?", (unidad_id,))
        conn.commit()
        return {"success": True, "eliminado": unidad_id}
    finally:
        conn.close()

# ─── DEPARTAMENTOS Y DISTRITOS ──────────────────────────
@app.get("/api/departamentos")
def get_departamentos():
    """Lista todos los departamentos"""
    conn = get_connection()
    rows = conn.execute("SELECT id, nombre FROM departamentos ORDER BY nombre").fetchall()
    conn.close()
    return {"success": True, "departamentos": [{"id": r[0], "nombre": r[1]} for r in rows]}

@app.get("/api/distritos")
def get_distritos(departamento_id: int = Query(None)):
    """Lista distritos, opcionalmente filtrados por departamento"""
    conn = get_connection()
    if departamento_id:
        rows = conn.execute("SELECT id, nombre, departamento_id FROM distritos WHERE departamento_id=? ORDER BY nombre", (departamento_id,)).fetchall()
    else:
        rows = conn.execute("SELECT id, nombre, departamento_id FROM distritos ORDER BY nombre").fetchall()
    conn.close()
    return {"success": True, "distritos": [{"id": r[0], "nombre": r[1], "departamento_id": r[2]} for r in rows]}

# ─── CLIENTES: RESUMEN COMPLETO (Concejal → PC → Dirigentes → Logística → Transporte) ──
@app.get("/api/clientes/resumen")
def clientes_resumen(departamento_id: int = Query(None)):
    """
    Resumen completo de clientes (concejales/intendentes) con su equipo:
    - PCs (grupos_trabajo vinculados al candidato)
    - Dirigentes (asignados a cada PC vía grupo_dirigentes)
    - Logística (dirigentes tipo logistica o solicitudes de recogida)
    - Transporte (vehículos vinculados a la seccional/distrito)
    """
    conn = get_connection()
    try:
        c = conn.cursor()

        # 1) Traer todos los candidatos electos con su info base
        where_dept = ""
        params_dept = []
        if departamento_id:
            where_dept = "AND ce.departamento_id = ?"
            params_dept = [departamento_id]

        rows = c.execute(f"""
            SELECT ce.id, ce.tipo_cargo, ce.lista_nro, ce.lista_nombre,
                   ce.votos_obtenidos, ce.porcentaje_votos, ce.orden_electo,
                   ce.distrito_nombre, ce.estado,
                   cand.nombre as candidato_nombre, cand.id as candidato_id,
                   cand.cliente_cedula,
                   p.codigo_partido, p.sigla, p.color_principal_hex,
                   COALESCE(d.nombre, '') as departamento_nombre,
                   COALESCE(di.nombre, '') as distrito_nombre_2,
                   ce.departamento_id, ce.distrito_id
            FROM candidatos_electos_internas ce
            JOIN candidatos cand ON cand.id = ce.candidato_id
            JOIN partidos p ON p.id = ce.partido_id
            LEFT JOIN departamentos d ON d.id = ce.departamento_id
            LEFT JOIN distritos di ON di.id = ce.distrito_id
            WHERE ce.estado='electo' {where_dept}
            ORDER BY d.nombre, ce.distrito_nombre, ce.tipo_cargo, ce.orden_electo
        """, params_dept).fetchall()

        clientes = []
        for r in rows:
            cid = r[0]
            candidato_id = r[10]
            cliente_cedula = r[11]

            # 2) Buscar clientes vinculados a este candidato
            clientes_list = []
            if cliente_cedula:
                cl_row = c.execute("""
                    SELECT c.cedula, c.nombre, c.tipo, c.categoria, c.activo,
                           c.departamento_id, c.distrito_id, c.candidato_nombre, c.candidato_cargo
                    FROM clientes c WHERE c.cedula=? AND c.activo=1
                """, (cliente_cedula,)).fetchone()
                if cl_row:
                    clientes_list.append({
                        'cedula': cl_row[0], 'nombre': cl_row[1], 'tipo': cl_row[2],
                        'categoria': cl_row[3], 'activo': cl_row[4]
                    })

            # 3) Buscar PCs (grupos_trabajo) vinculados a este candidato
            grupos = []
            if candidato_id:
                gr_rows = c.execute("""
                    SELECT g.id, g.nombre, g.zona, g.seccional, g.activo
                    FROM grupos_trabajo g
                    WHERE g.candidato_id=? AND g.activo=1
                    ORDER BY g.seccional, g.nombre
                """, (candidato_id,)).fetchall()

                for gr in gr_rows:
                    # Dirigentes de este PC
                    dir_rows = c.execute("""
                        SELECT d.cedula, d.nombre, d.tipo
                        FROM grupo_dirigentes gd
                        JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
                        WHERE gd.grupo_id=? AND d.activo=1
                        ORDER BY d.nombre
                    """, (gr[0],)).fetchall()

                    dir_list = [{'cedula': d[0], 'nombre': d[1], 'tipo': d[2]} for d in dir_rows]
                    grupos.append({
                        'id': gr[0], 'nombre': gr[1], 'zona': gr[2], 'seccional': gr[3],
                        'dirigentes': dir_list, 'total_dirigentes': len(dir_list)
                    })

            # 4) Dirigentes directos del cliente (por cliente_cedula)
            dir_directos = []
            if cliente_cedula:
                ddir = c.execute("""
                    SELECT d.cedula, d.nombre, d.tipo
                    FROM dirigentes d
                    WHERE d.cliente_cedula=? AND d.activo=1
                    ORDER BY d.nombre
                """, (cliente_cedula,)).fetchall()
                dir_directos = [{'cedula': d[0], 'nombre': d[1], 'tipo': d[2]} for d in ddir]

            # 5) Logística: dirigentes tipo logistica en la misma área
            logistica = []
            if cliente_cedula:
                log_rows = c.execute("""
                    SELECT d.cedula, d.nombre, d.tipo
                    FROM dirigentes d
                    WHERE d.tipo='logistica' AND d.cliente_cedula=? AND d.activo=1
                    ORDER BY d.nombre
                """, (cliente_cedula,)).fetchall()
                logistica = [{'cedula': l[0], 'nombre': l[1], 'tipo': l[2]} for l in log_rows]

            # 6) Transporte: vehículos disponibles en la seccional/distrito
            distrito_id_val = r[18]
            transportes = []
            if distrito_id_val:
                t_rows = c.execute("""
                    SELECT t.id, t.cedula, t.nombre, t.tipo, t.placa, t.telefono,
                           t.capacidad, t.estado, t.seccional
                    FROM transportes t
                    WHERE t.estado='disponible'
                    ORDER BY t.nombre
                """).fetchall()
                transportes = [{
                    'id': t[0], 'cedula': t[1], 'nombre': t[2], 'tipo': t[3],
                    'placa': t[4], 'telefono': t[5], 'capacidad': t[6],
                    'estado': t[7], 'seccional': t[8]
                } for t in t_rows]

            # 7) Solicitudes de recogida del dirigente
            solicitudes = []
            if cliente_cedula:
                s_rows = c.execute("""
                    SELECT s.id, s.votante_cedula, s.votante_nombre, s.hora_recogida,
                           s.ubicacion, s.descripcion, s.estado, s.dirigente_nombre
                    FROM solicitudes_recogida s
                    JOIN dirigentes d ON d.cedula = s.dirigente_cedula
                    WHERE d.cliente_cedula=? AND s.estado IN ('pendiente','autorizado')
                    ORDER BY s.created_at DESC LIMIT 10
                """, (cliente_cedula,)).fetchall()
                solicitudes = [{
                    'id': s[0], 'votante_cedula': s[1], 'votante_nombre': s[2],
                    'hora_recogida': s[3], 'ubicacion': s[4], 'descripcion': s[5],
                    'estado': s[6], 'dirigente_nombre': s[7]
                } for s in s_rows]

            total_dirigentes = len(dir_directos) + sum(g['total_dirigentes'] for g in grupos)
            clientes.append({
                'candidato_id': cid,
                'candidato_nombre': r[9],
                'candidato_id_ref': candidato_id,
                'tipo_cargo': r[1],
                'lista_nro': r[2], 'lista_nombre': r[3],
                'votos_obtenidos': r[4], 'porcentaje_votos': r[5],
                'orden_electo': r[6],
                'distrito_nombre': r[7],
                'estado': r[8],
                'codigo_partido': r[12], 'sigla': r[13], 'color_hex': r[14],
                'departamento_nombre': r[15],
                'departamento_id': r[17], 'distrito_id': r[18],
                'clientes': clientes_list,
                'grupos': grupos, 'total_grupos': len(grupos),
                'dirigentes_directos': dir_directos,
                'total_dirigentes': total_dirigentes,
                'logistica': logistica, 'total_logistica': len(logistica),
                'transportes': transportes, 'total_transportes': len(transportes),
                'solicitudes': solicitudes, 'total_solicitudes': len(solicitudes)
            })

        # Resumen global
        total_int = sum(1 for cl in clientes if cl['tipo_cargo'] == 'intendente')
        total_con = sum(1 for cl in clientes if cl['tipo_cargo'] == 'concejal')
        total_dirs = sum(cl['total_dirigentes'] for cl in clientes)
        total_gps = sum(cl['total_grupos'] for cl in clientes)

        return {
            "success": True,
            "clientes": clientes,
            "total": len(clientes),
            "resumen": {
                "intendentes": total_int, "concejales": total_con,
                "total_dirigentes": total_dirs, "total_grupos": total_gps
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e), "clientes": [], "total": 0}
    finally:
        conn.close()

# ─── CANDIDATOS ELECTOS EN INTERNAS ─────────────────────
@app.get("/api/candidatos_electos")
def get_candidatos_electos(
    partido: str = Query(None),
    distrito: str = Query(None),
    cargo: str = Query(None),
    departamento: str = Query(None)
):
    """Lista candidatos electos en internas, con filtros opcionales"""
    conn = get_connection()
    query = """
        SELECT ce.id, ce.tipo_cargo, ce.lista_nro, ce.lista_nombre,
               ce.votos_obtenidos, ce.porcentaje_votos, ce.orden_electo,
               ce.es_titular, ce.periodo_electoral, ce.fecha_eleccion_interna,
               ce.estado, ce.distrito_nombre,
               c.nombre as candidato_nombre, c.cliente_cedula,
               p.codigo_partido, p.sigla, p.color_principal_hex,
               d.nombre as departamento_nombre
        FROM candidatos_electos_internas ce
        JOIN candidatos c ON c.id = ce.candidato_id
        JOIN partidos p ON p.id = ce.partido_id
        LEFT JOIN departamentos d ON d.id = ce.departamento_id
        WHERE 1=1
    """
    params = []
    if partido:
        query += " AND p.codigo_partido = ?"
        params.append(partido.upper())
    if distrito:
        query += " AND ce.distrito_nombre LIKE ?"
        params.append(f"%{distrito}%")
    if cargo:
        query += " AND ce.tipo_cargo = ?"
        params.append(cargo.lower())
    if departamento:
        query += " AND d.nombre LIKE ?"
        params.append(f"%{departamento}%")
    query += " ORDER BY ce.distrito_nombre, p.prioridad_orden, ce.tipo_cargo, ce.orden_electo"
    rows = conn.execute(query, params).fetchall()
    cols = ['id','tipo_cargo','lista_nro','lista_nombre','votos_obtenidos','porcentaje_votos',
            'orden_electo','es_titular','periodo_electoral','fecha_eleccion_interna',
            'estado','distrito_nombre','candidato_nombre','cliente_cedula',
            'codigo_partido','sigla','color_principal_hex','departamento_nombre']
    result = [dict(zip(cols, r)) for r in rows]
    conn.close()
    return {"success": True, "candidatos": result, "total": len(result)}

@app.get("/api/candidatos_electos/estadisticas")
def estadisticas_candidatos_electos():
    """Resumen de candidatos electos por partido y distrito"""
    conn = get_connection()
    # Por partido
    por_partido = conn.execute("""
        SELECT p.codigo_partido, p.sigla, p.color_principal_hex,
               COUNT(CASE WHEN ce.tipo_cargo='intendente' THEN 1 END) as intendentes,
               COUNT(CASE WHEN ce.tipo_cargo='concejal' THEN 1 END) as concejales,
               SUM(ce.votos_obtenidos) as total_votos
        FROM candidatos_electos_internas ce
        JOIN partidos p ON p.id = ce.partido_id
        GROUP BY p.codigo_partido ORDER BY total_votos DESC
    """).fetchall()
    # Por distrito
    por_distrito = conn.execute("""
        SELECT ce.distrito_nombre,
               COUNT(CASE WHEN ce.tipo_cargo='intendente' THEN 1 END) as intendentes,
               COUNT(CASE WHEN ce.tipo_cargo='concejal' THEN 1 END) as concejales,
               COUNT(DISTINCT ce.partido_id) as partidos_con_candidatos
        FROM candidatos_electos_internas ce
        GROUP BY ce.distrito_nombre ORDER BY ce.distrito_nombre
    """).fetchall()
    conn.close()
    return {
        "success": True,
        "por_partido": [dict(zip(['codigo','sigla','color','intendentes','concejales','total_votos'], r)) for r in por_partido],
        "por_distrito": [dict(zip(['distrito','intendentes','concejales','partidos'], r)) for r in por_distrito],
    }

def _alcance_geografico_cliente(conn, cliente_cedula):
    """Determina hasta donde puede acumular datos un cliente, segun su ambito:
    - pc: solo el/los PC donde esta instalado como candidato.
    - municipal: todas las seccionales de su distrito (su partido).
    - departamental/general: todas las seccionales de su departamento (su partido).
    Sin departamento/distrito (alcance nacional del partido) trae todas las seccionales del partido.
    """
    cl = conn.execute(
        "SELECT tipo, departamento_id, distrito_id, partido_id, unidad_organizacion_id FROM clientes WHERE cedula=?",
        (cliente_cedula,),
    ).fetchone()
    if not cl:
        return None
    tipo, depto_id, distrito_id, partido_id, unidad_organizacion_id = cl

    if tipo == 'seccional' and unidad_organizacion_id:
        rows = [(unidad_organizacion_id,)]
    elif tipo == 'pc':
        rows = conn.execute(
            "SELECT DISTINCT unidad_id FROM puestos_comando WHERE candidato_cedula=?",
            (cliente_cedula,),
        ).fetchall()
    elif tipo == 'municipal' and distrito_id:
        rows = conn.execute(
            "SELECT id FROM unidades_organizacion WHERE partido_id=? AND distrito_id=?",
            (partido_id, distrito_id),
        ).fetchall()
    elif depto_id:
        rows = conn.execute(
            "SELECT id FROM unidades_organizacion WHERE partido_id=? AND departamento_id=?",
            (partido_id, depto_id),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT id FROM unidades_organizacion WHERE partido_id=?",
            (partido_id,),
        ).fetchall()

    return {
        'nivel': tipo, 'partido_id': partido_id,
        'departamento_id': depto_id, 'distrito_id': distrito_id,
        'unidad_ids': [r[0] for r in rows],
    }


@app.get("/api/mi_dashboard")
def mi_dashboard(cedula: str = Query(...)):
    """Panel acumulado segun el alcance real del cliente: solo cuenta lo que viene de
    PCs efectivamente instalados (con escuela electoral asignada) dentro de su ambito."""
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    try:
        alcance = _alcance_geografico_cliente(conn, ced)
        if not alcance:
            return {"success": False, "error": "Cliente no encontrado"}
        unidad_ids = alcance['unidad_ids']

        if unidad_ids:
            ph = ','.join('?' * len(unidad_ids))
            pcs = conn.execute(f"""
                SELECT pc.id, pc.codigo, pc.rol, pc.escuela_nombre, u.numero as seccional_numero, u.nombre as seccional_nombre
                FROM puestos_comando pc
                JOIN unidades_organizacion u ON u.id = pc.unidad_id
                WHERE pc.unidad_id IN ({ph}) AND COALESCE(pc.escuela_nombre,'') <> ''
                ORDER BY u.numero, pc.codigo
            """, unidad_ids).fetchall()
            total_afiliados = conn.execute(f"""
                SELECT COUNT(*) FROM afiliados_partido WHERE unidad_organizacion_id IN ({ph})
            """, unidad_ids).fetchone()[0]
            seccionales = conn.execute(f"""
                SELECT id, numero, nombre FROM unidades_organizacion WHERE id IN ({ph}) ORDER BY numero
            """, unidad_ids).fetchall()
        else:
            pcs, total_afiliados, seccionales = [], 0, []

        total_dirigentes = conn.execute(
            "SELECT COUNT(*) FROM dirigentes WHERE cliente_cedula=? AND activo=1", (ced,)
        ).fetchone()[0]

        return {
            "success": True,
            "alcance": {
                'nivel': alcance['nivel'],
                'departamento_id': alcance['departamento_id'],
                'distrito_id': alcance['distrito_id'],
                'seccionales': [{'id': s[0], 'numero': s[1], 'nombre': s[2]} for s in seccionales],
            },
            "totales": {
                'pcs_instalados': len(pcs),
                'afiliados': total_afiliados,
                'dirigentes': total_dirigentes,
            },
            "pcs": [{'id': p[0], 'codigo': p[1], 'rol': p[2], 'escuela': p[3],
                     'seccional_numero': p[4], 'seccional_nombre': p[5]} for p in pcs],
        }
    finally:
        conn.close()


@app.get("/api/mi_dashboard/detalle")
def mi_dashboard_detalle(cedula: str = Query(...)):
    """Gestion territorial (vista de un cliente de ambito Seccional/local): PCs, votantes y
    mesas por colegio electoral, miembros de mesa y veedores asignados, flota de transporte,
    y dirigentes con su avance de voto seguro."""
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    try:
        c = conn.cursor()
        alcance = _alcance_geografico_cliente(conn, ced)
        if not alcance:
            return {"success": False, "error": "Cliente no encontrado"}
        unidad_ids = alcance['unidad_ids']

        pcs, mesas_alcance = [], []
        if unidad_ids:
            ph = ','.join('?' * len(unidad_ids))
            pcs = c.execute(f"""
                SELECT pc.id, pc.codigo, pc.rol, pc.escuela_nombre
                FROM puestos_comando pc
                WHERE pc.unidad_id IN ({ph}) AND COALESCE(pc.escuela_nombre,'') <> ''
                ORDER BY pc.codigo
            """, unidad_ids).fetchall()
            mesas_alcance = [r[0] for r in c.execute(
                f"SELECT DISTINCT mesa FROM afiliados_partido WHERE unidad_organizacion_id IN ({ph})",
                unidad_ids).fetchall()]

        # Votantes y mesas por colegio electoral (cada PC = un colegio con escuela real).
        # Si hay un solo PC con escuela en el ambito, se le atribuyen todas las mesas del
        # ambito; con varios PCs todavia no hay un mapeo mesa->escuela especifico, asi que
        # se listan las mesas a nivel de ambito aparte.
        colegios = []
        if mesas_alcance:
            ph_m = ','.join('?' * len(mesas_alcance))
            votantes_por_mesa = c.execute(f"""
                SELECT mesa, COUNT(*) FROM afiliados_partido
                WHERE mesa IN ({ph_m}) AND unidad_organizacion_id IN ({','.join('?' * len(unidad_ids))})
                GROUP BY mesa ORDER BY mesa
            """, mesas_alcance + unidad_ids).fetchall()
            cargados_por_mesa = dict(c.execute(f"""
                SELECT votante_mesa, COUNT(*) FROM posible_votos
                WHERE votante_mesa IN ({ph_m}) GROUP BY votante_mesa
            """, mesas_alcance).fetchall())
            confirmados_por_mesa = dict(c.execute(f"""
                SELECT votante_mesa, COUNT(*) FROM posible_votos
                WHERE votante_mesa IN ({ph_m}) AND status='confirmado' GROUP BY votante_mesa
            """, mesas_alcance).fetchall())
            # "Ya votaron" real: cruza contra registros de TODO el sistema (carga del dia D en
            # cualquier mesa/veedor), no solo lo que el dirigente marco a mano como "confirmado".
            votaron_real_por_mesa = dict(c.execute(f"""
                SELECT pv.votante_mesa, COUNT(DISTINCT pv.votante_cedula)
                FROM posible_votos pv
                WHERE pv.votante_mesa IN ({ph_m})
                  AND EXISTS (SELECT 1 FROM registros r WHERE r.cedula = pv.votante_cedula AND r.estado='voto')
                GROUP BY pv.votante_mesa
            """, mesas_alcance).fetchall())
            mesas_detalle = [{"mesa": r[0], "votantes": r[1],
                              "comprometidos": cargados_por_mesa.get(r[0], 0),
                              "confirmados": confirmados_por_mesa.get(r[0], 0),
                              "votaron_real": votaron_real_por_mesa.get(r[0], 0)} for r in votantes_por_mesa]
            if len(pcs) == 1:
                colegios = [{"escuela": pcs[0][3], "codigo_pc": pcs[0][1],
                             "total_votantes": sum(m["votantes"] for m in mesas_detalle),
                             "total_comprometidos": sum(m["comprometidos"] for m in mesas_detalle),
                             "total_confirmados": sum(m["confirmados"] for m in mesas_detalle),
                             "total_votaron_real": sum(m["votaron_real"] for m in mesas_detalle),
                             "mesas": mesas_detalle}]
            else:
                colegios = [{"escuela": p[3], "codigo_pc": p[1], "total_votantes": None, "mesas": []} for p in pcs]
        total_votantes = sum(cg.get("total_votantes") or 0 for cg in colegios) if len(pcs) == 1 else (
            c.execute(f"SELECT COUNT(*) FROM afiliados_partido WHERE unidad_organizacion_id IN ({','.join('?' * len(unidad_ids))})", unidad_ids).fetchone()[0] if unidad_ids else 0)

        # Miembros de mesa y veedores dentro del ambito (por numero de mesa). Se traen para
        # poder contactarlos, pero lo que importa mostrar de entrada es que MESAS quedan sin
        # representacion (ni miembro ni veedor), no el listado completo.
        miembros, veedores = [], []
        mesas_sin_representacion = []
        if mesas_alcance:
            ph_m = ','.join('?' * len(mesas_alcance))
            miembros = c.execute(f"""
                SELECT cedula, nombre, mesa, horario_inicio, horario_cierre, estado, telefono
                FROM miembros_mesa WHERE CAST(mesa AS INTEGER) IN ({ph_m})
                ORDER BY CAST(mesa AS INTEGER)
            """, mesas_alcance).fetchall()
            veedores = c.execute(f"""
                SELECT id_veedor, nombre_veedor, cedula_veedor, mesa_id, telefono, estado
                FROM veedores_mesa WHERE mesa_id IN ({ph_m})
                ORDER BY mesa_id
            """, mesas_alcance).fetchall()
            mesas_con_miembro = {int(m[2]) for m in miembros if str(m[2]).isdigit()}
            mesas_con_veedor = {v[3] for v in veedores}
            for mesa in mesas_alcance:
                tiene_m, tiene_v = mesa in mesas_con_miembro, mesa in mesas_con_veedor
                if not tiene_m or not tiene_v:
                    mesas_sin_representacion.append({"mesa": mesa, "tiene_miembro": tiene_m, "tiene_veedor": tiene_v})
            mesas_sin_representacion.sort(key=lambda x: x["mesa"])

        # Transporte / conductores asignados a este cliente
        conductores = c.execute("""
            SELECT cedula, nombre, tipo, placa, telefono, capacidad, estado
            FROM transportes WHERE cliente_cedula=?
            ORDER BY nombre
        """, (ced,)).fetchall()

        # Dirigentes propios, con su avance de voto seguro (posible_votos) y, aparte, cuantos
        # de SUS votantes YA VOTARON de verdad segun el sistema (tabla registros, cargada en
        # cualquier mesa del pais, no solo lo que el propio dirigente marco a mano).
        dirigentes_rows = c.execute("""
            SELECT d.cedula, d.nombre, d.telefono,
                   (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula=d.cedula) as total_posibles,
                   (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula=d.cedula AND pv.status='confirmado') as confirmados,
                   (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula=d.cedula
                      AND EXISTS (SELECT 1 FROM registros r WHERE r.cedula=pv.votante_cedula AND r.estado='voto')) as votaron_real
            FROM dirigentes d WHERE d.cliente_cedula=? AND d.activo=1
            ORDER BY d.nombre
        """, (ced,)).fetchall()
        dirigentes = []
        total_posibles_g = total_confirmados_g = total_votaron_real_g = 0
        for ced_d, nom_d, tel_d, posibles, confirmados, votaron_real in dirigentes_rows:
            posibles, confirmados, votaron_real = posibles or 0, confirmados or 0, votaron_real or 0
            total_posibles_g += posibles
            total_confirmados_g += confirmados
            total_votaron_real_g += votaron_real
            pct = round(confirmados * 100 / posibles, 1) if posibles else 0.0
            pct_real = round(votaron_real * 100 / posibles, 1) if posibles else 0.0
            dirigentes.append({"cedula": ced_d, "nombre": nom_d, "telefono": tel_d or '', "votos_seguros": confirmados,
                               "votos_posibles": posibles, "pct_cumplimiento": pct,
                               "votaron_real": votaron_real, "pct_votaron_real": pct_real})
        pct_cumplimiento_global = round(total_confirmados_g * 100 / total_posibles_g, 1) if total_posibles_g else 0.0
        pct_votaron_real_global = round(total_votaron_real_g * 100 / total_posibles_g, 1) if total_posibles_g else 0.0

        # Detalle por colegio x dirigente (cruce via mesa del votante comprometido)
        detalle_colegio_dirigente = []
        if mesas_alcance and dirigentes_rows:
            ph_m = ','.join('?' * len(mesas_alcance))
            rows = c.execute(f"""
                SELECT pv.dirigente_cedula, d.nombre, pv.votante_mesa,
                       COUNT(*) as posibles, SUM(CASE WHEN pv.status='confirmado' THEN 1 ELSE 0 END) as confirmados
                FROM posible_votos pv
                JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
                WHERE d.cliente_cedula=? AND pv.votante_mesa IN ({ph_m})
                GROUP BY pv.dirigente_cedula, pv.votante_mesa
                ORDER BY d.nombre, pv.votante_mesa
            """, [ced] + mesas_alcance).fetchall()
            escuela_unica = pcs[0][3] if len(pcs) == 1 else None
            detalle_colegio_dirigente = [{
                "dirigente_cedula": r[0], "dirigente_nombre": r[1], "mesa": r[2],
                "escuela": escuela_unica, "votos_posibles": r[3], "votos_confirmados": r[4] or 0
            } for r in rows]

        return {
            "success": True,
            "pcs": {"total": len(pcs), "detalle": [{"id": p[0], "codigo": p[1], "rol": p[2], "escuela": p[3]} for p in pcs]},
            "votantes": {"total": total_votantes, "colegios": colegios},
            "miembros_mesa": [{"cedula": m[0], "nombre": m[1], "mesa": m[2], "horario_inicio": m[3],
                               "horario_cierre": m[4], "estado": m[5], "telefono": m[6] or ''} for m in miembros],
            "veedores": [{"id_veedor": v[0], "nombre": v[1], "cedula": v[2], "mesa": v[3],
                          "telefono": v[4], "estado": v[5]} for v in veedores],
            "mesas_sin_representacion": mesas_sin_representacion,
            "transporte": {"total_conductores": len(conductores),
                          "detalle": [{"cedula": t[0], "nombre": t[1], "tipo": t[2], "placa": t[3],
                                       "telefono": t[4], "capacidad": t[5], "estado": t[6]} for t in conductores]},
            "dirigentes": dirigentes,
            "votos_seguros": {"total_confirmados": total_confirmados_g, "total_comprometidos": total_posibles_g,
                              "pct_cumplimiento": pct_cumplimiento_global,
                              "total_votaron_real": total_votaron_real_g, "pct_votaron_real": pct_votaron_real_global},
            "detalle_colegio_dirigente": detalle_colegio_dirigente,
        }
    finally:
        conn.close()


@app.get("/api/padron/buscar")
def padron_buscar(cedula: str = Query(...)):
    """Busca una persona por cedula para autocompletar la encuesta publica:
    primero en el padron de afiliados (trae mesa/seccional), si no en el padron nacional."""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cedula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        row = c.execute("""
            SELECT nombre, apellido, mesa, unidad_organizacion_id FROM afiliados_partido WHERE cedula=? LIMIT 1
        """, (ced,)).fetchone()
        if row:
            return {"success": True, "nombre": row[1] and f"{row[1]} {row[0]}".strip() or row[0],
                    "mesa": row[2], "unidad_organizacion_id": row[3], "fuente": "afiliados"}
        row = c.execute("SELECT nombre, apellido, mesa FROM padron2026_completo WHERE cedula=? LIMIT 1", (ced,)).fetchone()
        if row:
            return {"success": True, "nombre": f"{row[1]} {row[0]}".strip(), "mesa": row[2],
                    "unidad_organizacion_id": None, "fuente": "padron_nacional"}
        return {"success": False, "error": "No se encontro esa cedula en el padron"}
    finally:
        conn.close()


@app.get("/api/seccional/candidatos")
def seccional_candidatos(unidad_organizacion_id: int = Query(...)):
    """Candidatos de esta Seccional/unidad para mostrar en la encuesta publica (foto, lista, orden)."""
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""
            SELECT cl.cedula, cl.nombre, cl.apellido, cl.candidato_cargo, cl.candidato_nombre,
                   cl.lista_nro, cl.lista_nombre, cl.color_propio_hex,
                   p.sigla, p.color_principal_hex
            FROM clientes cl
            LEFT JOIN partidos p ON p.id = cl.partido_id
            WHERE cl.unidad_organizacion_id=? AND cl.categoria='candidato' AND cl.activo=1
            ORDER BY cl.nombre
        """, (unidad_organizacion_id,)).fetchall()
        candidatos = [{
            "cedula": r[0], "nombre": f"{r[1]} {r[2]}".strip() if r[2] else r[1],
            "cargo": r[3] or '', "apodo": r[4] or '',
            "lista_nro": r[5], "lista_nombre": r[6] or '',
            "color": r[7] or r[9] or '#C5A059', "partido_sigla": r[8] or '',
            "foto_url": ''
        } for r in rows]
        return {"success": True, "candidatos": candidatos}
    finally:
        conn.close()


@app.post("/api/encuesta/solicitar_transporte")
async def encuesta_solicitar_transporte(request: Request):
    """Pedido de 'voto transportado' desde la encuesta publica (sin dirigente asignado todavia)."""
    data = await request.json()
    v_ced = normalizar_cedula(data.get("cedula", ""))
    v_nom = normalizar_texto(data.get("nombre", ""))
    hora = normalizar_texto(data.get("hora_recogida", ""))
    ubic = normalizar_texto(data.get("ubicacion", ""))
    desc = normalizar_texto(data.get("descripcion", ""))
    d_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
    if not hora or not ubic:
        return {"success": False, "error": "Hora y ubicacion de recogida requeridas"}
    conn = get_connection()
    try:
        c = conn.cursor()
        c.execute("""INSERT INTO solicitudes_recogida
            (dirigente_cedula, dirigente_nombre, votante_cedula, votante_nombre,
             hora_recogida, ubicacion, descripcion, estado)
            VALUES (?,?,?,?,?,?,?,?)
        """, (d_ced, '', v_ced, v_nom, hora, ubic, desc, 'pendiente'))
        conn.commit()
        return {"success": True, "id": c.lastrowid}
    finally:
        conn.close()


@app.post("/api/dirigente/parsear_archivo")
async def parsear_archivo_dirigente(file: UploadFile = File(...)):
    """Lee un .xlsx, .csv o .txt subido (arrastrado) y devuelve las filas (cédula +
    nombre si está) para previsualizar antes de cargarlas. No escribe nada todavía."""
    filename = (file.filename or '').lower()
    contenido = await file.read()
    if len(contenido) > 5 * 1024 * 1024:
        return {"success": False, "error": "El archivo es demasiado grande (máx. 5 MB)"}
    try:
        rows = []
        if filename.endswith('.xlsx') or filename.endswith('.xlsm'):
            from openpyxl import load_workbook
            wb = load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
            ws = wb.active
            for row in ws.iter_rows():
                rows.append([('' if c.value is None else str(c.value).strip()) for c in row])
        else:
            import csv as _csv
            texto = contenido.decode('utf-8-sig', errors='ignore')
            delim = ';' if texto[:2000].count(';') > texto[:2000].count(',') else ','
            rows = [r for r in _csv.reader(io.StringIO(texto), delimiter=delim)]
        rows = [r for r in rows if any((c or '').strip() for c in r)]
        if not rows:
            return {"success": False, "error": "El archivo está vacío"}

        encabezados = {'cedula', 'cédula', 'ci', 'dni', 'documento'}
        encabezados_nombre = {'nombre', 'nombre completo', 'apellido y nombre', 'nombre y apellido'}
        primera = [(c or '').strip().lower() for c in rows[0]]
        idx_cedula, idx_nombre, desde = 0, (1 if len(rows[0]) > 1 else None), 0
        if any(h in encabezados for h in primera):
            idx_cedula = next(i for i, h in enumerate(primera) if h in encabezados)
            idx_nombre = next((i for i, h in enumerate(primera) if h in encabezados_nombre), None)
            desde = 1

        vistos, filas = set(), []
        for row in rows[desde:]:
            if idx_cedula >= len(row):
                continue
            ced = re.sub(r'\D', '', row[idx_cedula] or '')
            if not ced or ced in vistos:
                continue
            vistos.add(ced)
            nombre = (row[idx_nombre].strip() if idx_nombre is not None and idx_nombre < len(row) and row[idx_nombre] else '')
            filas.append({"cedula": ced, "nombre": nombre})
        if not filas:
            return {"success": False, "error": "No se encontraron cédulas válidas en el archivo"}
        return {"success": True, "filas": filas[:1000], "total": len(filas)}
    except Exception as e:
        return {"success": False, "error": f"No se pudo leer el archivo: {e}"}


@app.post("/api/dirigente/cargar_masivo")
async def cargar_masivo_dirigente(request: Request):
    """Carga en lote las filas (cédula + nombre) ya previsualizadas por el dirigente,
    como Voto Seguro, Voto Posible o sub-dirigentes (Mi Dirigente), según 'tipo'.
    Toda fila tiene que estar en el padrón: si no, se marca con error y se sigue
    con la próxima, sin guardar nada para esa cédula."""
    data = await request.json()
    conn = get_connection()
    try:
        c = conn.cursor()
        user_auth = _require_auth(data, 'dirigente', conn)
        if not user_auth:
            raise HTTPException(status_code=401, detail="Autenticación requerida")
        dc = normalizar_cedula(user_auth.get("cedula", ""))
        tipo_in = data.get("tipo")
        tipo = tipo_in if tipo_in in ("voto_seguro", "voto_posible", "sub_dirigente") else "voto_seguro"
        es_votante = tipo in ("voto_seguro", "voto_posible")
        filas = data.get("filas") or []
        if not isinstance(filas, list) or not filas:
            return {"success": False, "error": "No hay filas para cargar"}

        cliente_cedula = None
        grupos_padre = []
        if tipo == "sub_dirigente":
            row_padre = c.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (dc,)).fetchone()
            cliente_cedula = row_padre[0] if row_padre else None
            grupos_padre = c.execute("SELECT grupo_id FROM grupo_dirigentes WHERE dirigente_cedula=?", (dc,)).fetchall()

        # Distribución automática de votos: si el dirigente tiene un único candidato
        # para un cargo (ej. un solo intendente), cada voto cargado se le asigna solo.
        # Si tiene dos o más para ese cargo, en la carga masiva queda sin asignar
        # (se elige persona por persona desde la Lista, no se adivina en bloque).
        candidatos_sin_ambiguedad = []
        if es_votante:
            por_cargo = c.execute("""
                SELECT c.cargo, c.id FROM dirigente_candidatos dc2
                JOIN candidatos c ON dc2.candidato_id = c.id
                WHERE dc2.dirigente_cedula=?""", (dc,)).fetchall()
            conteo_cargo = {}
            for cargo, cid in por_cargo:
                conteo_cargo.setdefault(cargo, []).append(cid)
            candidatos_sin_ambiguedad = [ids[0] for ids in conteo_cargo.values() if len(ids) == 1]

        resultados = []
        for fila in filas[:500]:
            ced = normalizar_cedula(str(fila.get("cedula", "")))
            nombre = normalizar_texto(str(fila.get("nombre", "")))
            if not re.match(r'^\d{5,8}$', ced):
                resultados.append({"cedula": ced, "nombre": nombre, "success": False, "error": "Cédula inválida"})
                continue
            if ced == dc:
                resultados.append({"cedula": ced, "nombre": nombre, "success": False, "error": "No podés cargarte a vos mismo"})
                continue
            # Toda fila tiene que corresponder a alguien del padrón: si no está, se
            # avisa y se sigue con el próximo registro sin guardar nada de esta fila.
            # El padrón trae departamento_nombre/distrito_nombre vacíos para la mayoría
            # de las filas; cuando falta, se completa con la tabla 'departamentos' (código
            # nacional, siempre disponible) y, si tampoco hay nombre de distrito, se deja
            # el código tal cual en vez de mostrar un campo vacío.
            prow = c.execute("""
                SELECT p.nombre, p.apellido, p.mesa, p.orden,
                       COALESCE(NULLIF(p.departamento_nombre,''), d.nombre, CAST(p.depart AS TEXT)),
                       COALESCE(NULLIF(p.distrito_nombre,''), CAST(p.distrito AS TEXT)),
                       p.zona_nombre
                FROM padron2026_completo p
                LEFT JOIN departamentos d ON d.id = p.depart
                WHERE p.cedula=?""", (ced,)).fetchone()
            if not prow:
                resultados.append({"cedula": ced, "nombre": nombre, "success": False, "error": "No está en el padrón"})
                continue
            nombre_p, apellido_p, mesa_p, orden_p, depto_p, dist_p, zona_p = prow
            nombre_final = f"{nombre_p} {apellido_p}".strip() or nombre or f"Cédula {ced}"
            try:
                if es_votante:
                    c.execute("""INSERT OR IGNORE INTO posible_votos
                        (dirigente_cedula, votante_cedula, votante_nombre, votante_apellido,
                         votante_mesa, votante_orden, votante_departamento, votante_distrito, votante_zona, status)
                        VALUES (?,?,?,?,?,?,?,?,?,'posible')""",
                        (dc, ced, nombre_final, apellido_p, mesa_p, orden_p, depto_p, dist_p, zona_p))
                    if tipo == "voto_seguro":
                        c.execute("""UPDATE posible_votos SET status='confirmado', confirmado_en=datetime('now','localtime'),
                            actualizado=datetime('now','localtime') WHERE dirigente_cedula=? AND votante_cedula=?""", (dc, ced))
                    if candidatos_sin_ambiguedad:
                        pv_row = c.execute("SELECT id FROM posible_votos WHERE dirigente_cedula=? AND votante_cedula=?", (dc, ced)).fetchone()
                        if pv_row:
                            for cid in candidatos_sin_ambiguedad:
                                cargo_row = c.execute("SELECT cargo FROM candidatos WHERE id=?", (cid,)).fetchone()
                                if cargo_row:
                                    c.execute("INSERT OR REPLACE INTO posible_voto_candidatos (posible_voto_id, candidato_id, cargo) VALUES (?,?,?)",
                                              (pv_row[0], cid, cargo_row[0]))
                    resultados.append({"cedula": ced, "nombre": nombre_final, "success": True})
                else:
                    existe = c.execute("SELECT cedula FROM dirigentes WHERE cedula=?", (ced,)).fetchone()
                    if existe:
                        resultados.append({"cedula": ced, "nombre": nombre_final, "success": False, "error": "Ya existe un dirigente con esa cédula"})
                        continue
                    pw_default = default_password(ced)
                    c.execute("""INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula, creado_por_cedula)
                                 VALUES (?,?,?,?,?,?)""", (ced, nombre_final, pw_default, 'dirigente', cliente_cedula, dc))
                    for g in grupos_padre:
                        c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)", (g[0], ced))
                    resultados.append({"cedula": ced, "nombre": nombre_final, "success": True})
            except Exception as e:
                resultados.append({"cedula": ced, "nombre": nombre_final, "success": False, "error": str(e)})
        conn.commit()
        ok = sum(1 for r in resultados if r["success"])
        log_auditoria(dc, user_auth.get("nombre", ""), 'carga_masiva',
                      f'Carga masiva ({tipo}): {ok}/{len(resultados)} exitosas de {len(resultados)}',
                      'dirigentes', dc, severidad='info')
        return {"success": True, "resultados": resultados, "ok": ok, "total": len(resultados)}
    finally:
        conn.close()


@app.get("/api/dirigente/exportar_excel")
def exportar_excel_dirigente(cedula: str = Query(...), password: str = Header(None)):
    """Descarga un Excel con 3 hojas separadas, cada una solo con el número de
    cédula: Voto Seguro, Voto Posible y Mi Dirigente (sub-dirigentes a cargo)."""
    conn = get_connection()
    try:
        c = conn.cursor()
        ced = normalizar_cedula(cedula)
        pw = normalizar_texto(password)
        user = _authenticate(ced, pw, conn=conn)
        if not user:
            raise HTTPException(status_code=401, detail="Autenticación fallida")
        es_dirigente = any(r.get("rol") == "dirigente" for r in user.get("roles", [])) or user.get("nivel") == "dirigente"
        if not es_dirigente:
            raise HTTPException(status_code=403, detail="Solo disponible para dirigentes")

        wb = Workbook()
        encabezado_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        encabezado_font = Font(color="FBBF24", bold=True)

        def escribir_hoja(ws, cedulas):
            ws.append(["Cédula"])
            celda = ws.cell(row=1, column=1)
            celda.fill = encabezado_fill
            celda.font = encabezado_font
            for ced_fila in cedulas:
                ws.append([ced_fila])
            ws.column_dimensions["A"].width = 16

        voto_seguro = [r[0] for r in c.execute(
            "SELECT votante_cedula FROM posible_votos WHERE dirigente_cedula=? AND status='confirmado' ORDER BY votante_cedula",
            (ced,)).fetchall()]
        voto_posible = [r[0] for r in c.execute(
            "SELECT votante_cedula FROM posible_votos WHERE dirigente_cedula=? AND status!='confirmado' ORDER BY votante_cedula",
            (ced,)).fetchall()]
        mi_dirigente = [r[0] for r in c.execute(
            "SELECT cedula FROM dirigentes WHERE creado_por_cedula=? AND activo=1 ORDER BY cedula",
            (ced,)).fetchall()]

        ws1 = wb.active
        ws1.title = "Voto Seguro"
        escribir_hoja(ws1, voto_seguro)

        ws2 = wb.create_sheet("Voto Posible")
        escribir_hoja(ws2, voto_posible)

        ws3 = wb.create_sheet("Mi Dirigente")
        escribir_hoja(ws3, mi_dirigente)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        filename = f"mis_datos_{ced}.xlsx"
        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    finally:
        conn.close()


@app.post("/api/recuperar_password")
async def recuperar_password(request: Request):
    """Restablece la contraseña de un cliente/dirigente/conductor verificando cédula + teléfono
    y/o email. Intenta enviar la contraseña temporal por ambas vías (WhatsApp/SMS vía Twilio si
    hay teléfono, email vía SMTP si hay email). Si esos servicios no están configurados en este
    entorno (sin credenciales en .env), el envío real no ocurre pero igual se devuelve la nueva
    contraseña en la respuesta para poder seguir operando/probando sin esos servicios."""
    data = await request.json()
    ced = normalizar_cedula(data.get("cedula", ""))
    tel = re.sub(r'\D', '', data.get("telefono", "") or '')
    email_in = normalizar_texto(data.get("email", "")).lower()
    if not ced or (not tel and not email_in):
        return {"success": False, "error": "Cédula y teléfono o email requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        tabla_encontrada = None
        nombre_cuenta, tel_cuenta, email_cuenta = '', '', ''
        for tabla in ("clientes", "dirigentes", "transportes"):
            tiene_email = tabla != "transportes"
            cols = "telefono, email, nombre" if tiene_email else "telefono, nombre"
            # FIX: SQL injection - validar tabla contra whitelist antes de usar en query dinámica.
            tabla_segura = validar_tabla(tabla)
            row = c.execute(f"SELECT {cols} FROM {tabla_segura} WHERE cedula=?", (ced,)).fetchone()
            if not row:
                continue
            tel_row = re.sub(r'\D', '', row[0] or '')
            email_row = (row[1] or '').strip().lower() if tiene_email else ''
            coincide_tel = bool(tel) and bool(tel_row) and tel_row == tel
            coincide_email = bool(email_in) and bool(email_row) and email_row == email_in
            if coincide_tel or coincide_email:
                tabla_encontrada = tabla
                tel_cuenta = row[0] or ''
                email_cuenta = row[1] if tiene_email else ''
                nombre_cuenta = row[-1] or ''
                break
        if not tabla_encontrada:
            return {"success": False, "error": "No se encontró una cuenta con esa cédula y ese teléfono o email"}

        nueva_pw = ''.join(random.choices('0123456789', k=6))
        # FIX: SQL injection - validar tabla contra whitelist antes de usar en query dinámica.
        tabla_encontrada_segura = validar_tabla(tabla_encontrada)
        c.execute(f"UPDATE {tabla_encontrada_segura} SET contrasena=? WHERE cedula=?", (nueva_pw, ced))
        if c.execute("SELECT 1 FROM cuentas_usuario WHERE cedula=?", (ced,)).fetchone():
            c.execute("UPDATE cuentas_usuario SET contrasena=? WHERE cedula=?", (hash_password(nueva_pw), ced))
        conn.commit()

        enviado_sms = False
        enviado_email = False
        mensaje_corto = f"DIA D MASTER: tu nueva contraseña temporal es {nueva_pw}. Usala para ingresar y podés cambiarla luego."
        if tel_cuenta:
            try:
                enviado_sms = enviar_whatsapp(tel_cuenta, mensaje_corto) or enviar_sms(tel_cuenta, mensaje_corto)
            except Exception as e:
                print(f"[RECUPERAR_PASSWORD] Error enviando SMS/WhatsApp a {ced}: {e}")
        if email_cuenta:
            try:
                pagina_por_tabla = {"dirigentes": "dirigente.html", "clientes": "panel_cliente.html", "transportes": "transporte.html"}
                pagina = pagina_por_tabla.get(tabla_encontrada, "index.html")
                if tabla_encontrada == "dirigentes":
                    enlace = f"{BASE_URL}/{pagina}?rc={urllib.parse.quote(ced)}&rp={urllib.parse.quote(nueva_pw)}"
                else:
                    enlace = f"{BASE_URL}/{pagina}"
                primer_nombre = (nombre_cuenta or '').split(' ')[0].title()
                cuerpo = (f"Hola {nombre_cuenta or ''},\n\n"
                          f"Generamos una contraseña temporal para tu cuenta en DIA D MASTER.\n\n"
                          f"Usuario (cédula): {ced}\nContraseña temporal: {nueva_pw}\n\n"
                          f"Ingresá directo acá (ya con tus datos cargados): {enlace}\n\n"
                          f"Por seguridad, te recomendamos cambiarla luego de tu próximo ingreso.\n")
                cuerpo_html = f"""
<div style="font-family:Arial,Helvetica,sans-serif;background:#0a0a0f;padding:32px 16px;">
  <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3);">
    <div style="background:linear-gradient(180deg,#09090b 0%,#1a1d23 100%);padding:28px 28px 24px;text-align:center;">
      <div style="width:56px;height:56px;margin:0 auto 12px;border-radius:16px;background:linear-gradient(135deg,#dfc07b 0%,#c5a059 50%,#997a3a 100%);display:flex;align-items:center;justify-content:center;font-size:26px;">🔑</div>
      <p style="margin:0;color:#ffffff;font-weight:900;font-size:18px;letter-spacing:-0.5px;text-transform:uppercase;">DIA D <span style="color:#dfc07b;">MASTER</span></p>
      <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Sistema Electoral Unificado</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px;color:#1a1d23;font-size:15px;">Hola <strong>{primer_nombre or nombre_cuenta or ''}</strong>,</p>
      <p style="margin:0 0 20px;color:#4b5058;font-size:14px;line-height:1.5;">Generamos una contraseña temporal para tu cuenta. Usá el botón de abajo para entrar directo, ya con tus datos cargados.</p>
      <div style="background:#f4f5f0;border:1px solid #e3eaf0;border-radius:16px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#8b9099;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Usuario (cédula)</p>
        <p style="margin:0 0 14px;color:#1a1d23;font-size:16px;font-weight:800;">{ced}</p>
        <p style="margin:0 0 6px;color:#8b9099;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Contraseña temporal</p>
        <p style="margin:0;color:#1a1d23;font-size:16px;font-weight:800;letter-spacing:1px;">{nueva_pw}</p>
      </div>
      <a href="{enlace}" style="display:block;text-align:center;background:linear-gradient(135deg,#dfc07b 0%,#c5a059 50%,#997a3a 100%);color:#09090b;text-decoration:none;font-weight:900;font-size:15px;padding:16px;border-radius:14px;text-transform:uppercase;letter-spacing:0.5px;">Ingresar ahora →</a>
      <p style="margin:20px 0 0;color:#8b9099;font-size:12px;line-height:1.5;">Por seguridad, te recomendamos cambiar esta contraseña luego de tu próximo ingreso.</p>
    </div>
  </div>
</div>"""
                enviado_email = enviar_email(email_cuenta, "Tu contraseña temporal — DIA D MASTER", cuerpo, cuerpo_html)
            except Exception as e:
                print(f"[RECUPERAR_PASSWORD] Error enviando email a {ced}: {e}")

        log_auditoria(ced, nombre_cuenta, 'password_recuperada',
                      f'Contraseña temporal generada para {ced} (SMS/WhatsApp: {enviado_sms}, email: {enviado_email})',
                      tabla_encontrada, ced, severidad='info')

        return {"success": True, "telefono": tel_cuenta, "email": email_cuenta,
                "enviado_sms": enviado_sms, "enviado_email": enviado_email,
                "mensaje": "Nueva contraseña generada y enviada por los canales configurados."
                           + (" Se envió por SMS/WhatsApp." if enviado_sms else "")
                           + (" Se envió por email." if enviado_email else "")
                           + ("" if (enviado_sms or enviado_email) else " (No hay credenciales de SMTP/Twilio configuradas en este entorno: no se envió realmente, pero la contraseña ya quedó válida.)")}
    finally:
        conn.close()


@app.post("/api/encuesta/responder")
async def encuesta_responder(request: Request):
    """Registra una respuesta de la encuesta corta de intencion de voto."""
    data = await request.json()
    intencion = normalizar_texto(data.get("intencion", ""))
    if not intencion:
        return {"success": False, "error": "intencion requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        c.execute("""INSERT INTO encuestas_intencion
            (cedula, nombre, mesa, unidad_organizacion_id, dirigente_cedula, intencion, comentario)
            VALUES (?,?,?,?,?,?,?)""",
            (normalizar_cedula(data.get("cedula", "")), normalizar_texto(data.get("nombre", "")),
             int(data.get("mesa") or 0), data.get("unidad_organizacion_id"),
             normalizar_cedula(data.get("dirigente_cedula", "")), intencion,
             normalizar_texto(data.get("comentario", ""))))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


@app.get("/api/mi_dashboard/encuesta")
def mi_dashboard_encuesta(cedula: str = Query(...)):
    """Resultados de la encuesta de intencion de voto dentro del ambito del cliente."""
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    try:
        alcance = _alcance_geografico_cliente(conn, ced)
        if not alcance or not alcance['unidad_ids']:
            return {"success": True, "total": 0, "por_intencion": []}
        ph = ','.join('?' * len(alcance['unidad_ids']))
        rows = conn.execute(f"""
            SELECT intencion, COUNT(*) FROM encuestas_intencion
            WHERE unidad_organizacion_id IN ({ph}) GROUP BY intencion ORDER BY COUNT(*) DESC
        """, alcance['unidad_ids']).fetchall()
        total = sum(r[1] for r in rows)
        return {"success": True, "total": total,
                "por_intencion": [{"intencion": r[0], "total": r[1],
                                    "pct": round(r[1] * 100 / total, 1) if total else 0.0} for r in rows]}
    finally:
        conn.close()


def _km_haversine(lat1, lng1, lat2, lng2):
    """Distancia aproximada en km entre dos puntos (formula de Haversine)."""
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@app.get("/api/dirigente/movilidad")
def dirigente_movilidad(cedula: str = Query(...)):
    """Movilidad de un dirigente: si tiene vehiculo propio o usa uno de la flota del cliente,
    cuantas personas va a buscar, y el km aprox (ida y vuelta) hasta el local electoral de su PC."""
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    try:
        c = conn.cursor()
        dirigente = c.execute("""
            SELECT cedula, nombre, cliente_cedula, tiene_vehiculo_propio, vehiculo_transporte_id,
                   ubicacion_lat, ubicacion_lng
            FROM dirigentes WHERE cedula=?
        """, (ced,)).fetchone()
        if not dirigente:
            return {"success": False, "error": "Dirigente no encontrado"}
        _, nombre, cliente_cedula, tiene_propio, veh_id, lat, lng = dirigente

        personas_a_buscar = c.execute(
            "SELECT COUNT(*) FROM posible_votos WHERE dirigente_cedula=? AND status='buscar'", (ced,)
        ).fetchone()[0] or 0

        vehiculos_disponibles = []
        vehiculo_asignado = None
        if cliente_cedula:
            rows = c.execute("""
                SELECT id, nombre, tipo, placa, telefono, capacidad, estado
                FROM transportes WHERE cliente_cedula=? ORDER BY nombre
            """, (cliente_cedula,)).fetchall()
            vehiculos_disponibles = [{"id": r[0], "nombre": r[1], "tipo": r[2], "placa": r[3],
                                       "telefono": r[4], "capacidad": r[5], "estado": r[6]} for r in rows]
            if veh_id:
                vehiculo_asignado = next((v for v in vehiculos_disponibles if v["id"] == veh_id), None)

        # Local electoral del PC de este dirigente (via el cliente -> unidad -> PC con escuela)
        km_aprox = None
        escuela_nombre = None
        if lat is not None and lng is not None and cliente_cedula:
            pc = c.execute("""
                SELECT pc.escuela_nombre, pc.escuela_lat, pc.escuela_lng
                FROM clientes cl
                JOIN puestos_comando pc ON pc.unidad_id = cl.unidad_organizacion_id
                WHERE cl.cedula=? AND pc.escuela_lat IS NOT NULL
                LIMIT 1
            """, (cliente_cedula,)).fetchone()
            if pc:
                escuela_nombre = pc[0]
                km_ida = _km_haversine(lat, lng, pc[1], pc[2])
                km_aprox = round(km_ida * 2, 1)  # ida y vuelta

        return {
            "success": True, "cedula": ced, "nombre": nombre,
            "tiene_vehiculo_propio": bool(tiene_propio),
            "ubicacion": {"lat": lat, "lng": lng} if lat is not None else None,
            "vehiculo_asignado": vehiculo_asignado,
            "vehiculos_disponibles": vehiculos_disponibles,
            "personas_a_buscar": personas_a_buscar,
            "escuela_nombre": escuela_nombre,
            "km_aprox_ida_vuelta": km_aprox,
        }
    finally:
        conn.close()


@app.post("/api/dirigente/movilidad")
async def dirigente_movilidad_actualizar(request: Request):
    """El dirigente indica si tiene vehiculo propio, elige uno de la flota si no, y marca
    su ubicacion (para el calculo de km)."""
    data = await request.json()
    ced = normalizar_cedula(data.get("cedula", ""))
    if not ced:
        return {"success": False, "error": "Cedula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        if not c.execute("SELECT 1 FROM dirigentes WHERE cedula=?", (ced,)).fetchone():
            return {"success": False, "error": "Dirigente no encontrado"}
        tiene_propio = 1 if data.get("tiene_vehiculo_propio") else 0
        veh_id = data.get("vehiculo_transporte_id")
        veh_id = int(veh_id) if veh_id not in (None, '', 'null') else None
        lat = data.get("lat")
        lng = data.get("lng")
        c.execute("""UPDATE dirigentes SET tiene_vehiculo_propio=?, vehiculo_transporte_id=?,
                     ubicacion_lat=?, ubicacion_lng=? WHERE cedula=?""",
                  (tiene_propio, None if tiene_propio else veh_id, lat, lng, ced))
        # Si tiene vehiculo propio, necesita una fila REAL en 'transportes' (no solo la
        # entrada sintetica "dirigente-<cedula>" que arma el listado de logistica) para
        # poder participar como conductor de verdad en viajes/optimizar_asignaciones,
        # que trabajan con transportes.id numerico.
        if tiene_propio:
            dir_row = c.execute("SELECT nombre, telefono FROM dirigentes WHERE cedula=?", (ced,)).fetchone()
            existente = c.execute("SELECT id FROM transportes WHERE cedula=?", (ced,)).fetchone()
            if existente:
                transporte_id = existente[0]
            else:
                c.execute("""INSERT INTO transportes (cedula, nombre, tipo, telefono, dirigente_propietario_cedula)
                             VALUES (?,?,?,?,?)""",
                          (ced, dir_row[0] if dir_row else ced, 'propio_dirigente', dir_row[1] if dir_row else '', ced))
                transporte_id = c.lastrowid
            if lat is not None and lng is not None:
                c.execute("""INSERT INTO ubicaciones_gps (transporte_id, cedula, lat, lng, direccion)
                             VALUES (?,?,?,?,'Vehículo propio del dirigente')""", (transporte_id, ced, lat, lng))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()


@app.get("/api/mi_dashboard/mesa_detalle")
def mi_dashboard_mesa_detalle(cedula: str = Query(...), mesa: int = Query(...)):
    """Detalle de una mesa puntual dentro del ambito del cliente: quien ya voto,
    quien esta pendiente, y que dirigente se comprometio a hacerle seguimiento."""
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    try:
        c = conn.cursor()
        alcance = _alcance_geografico_cliente(conn, ced)
        if not alcance:
            return {"success": False, "error": "Cliente no encontrado"}
        if alcance['unidad_ids']:
            ph = ','.join('?' * len(alcance['unidad_ids']))
            en_ambito = c.execute(
                f"SELECT 1 FROM afiliados_partido WHERE mesa=? AND unidad_organizacion_id IN ({ph})",
                [mesa] + alcance['unidad_ids']).fetchone()
            if not en_ambito:
                return {"success": False, "error": "Esa mesa no pertenece a tu ambito"}

        rows = c.execute("""
            SELECT pv.votante_cedula, pv.votante_nombre, pv.votante_apellido, pv.status,
                   pv.dirigente_cedula, d.nombre, d.telefono,
                   EXISTS (SELECT 1 FROM registros r WHERE r.cedula=pv.votante_cedula AND r.estado='voto') as voto_real
            FROM posible_votos pv
            JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
            WHERE pv.votante_mesa=? AND d.cliente_cedula=?
            ORDER BY voto_real DESC, pv.status DESC, pv.votante_apellido
        """, (mesa, ced)).fetchall()

        votantes = [{
            "cedula": r[0], "nombre": f"{r[2]} {r[1]}".strip(),
            "confirmado": r[3] == 'confirmado', "voto_real": bool(r[7]),
            "dirigente_cedula": r[4], "dirigente_nombre": r[5], "dirigente_telefono": r[6] or ''
        } for r in rows]

        return {
            "success": True, "mesa": mesa,
            "total": len(votantes),
            "confirmados": sum(1 for v in votantes if v["confirmado"]),
            "votaron_real": sum(1 for v in votantes if v["voto_real"]),
            "votantes": votantes,
        }
    finally:
        conn.close()


@app.get("/api/mi_dashboard/dirigente_detalle")
def mi_dashboard_dirigente_detalle(cedula: str = Query(...), dirigente_cedula: str = Query(...)):
    """Detalle de los compromisos de un dirigente propio: quien ya vino a votar y quien falta."""
    ced = normalizar_cedula(cedula)
    d_ced = normalizar_cedula(dirigente_cedula)
    conn = get_connection()
    try:
        c = conn.cursor()
        pertenece = c.execute(
            "SELECT nombre FROM dirigentes WHERE cedula=? AND cliente_cedula=?", (d_ced, ced)
        ).fetchone()
        if not pertenece:
            return {"success": False, "error": "Ese dirigente no es parte de tu equipo"}

        rows = c.execute("""
            SELECT votante_cedula, votante_nombre, votante_apellido, votante_mesa, status,
                   EXISTS (SELECT 1 FROM registros r WHERE r.cedula=posible_votos.votante_cedula AND r.estado='voto') as voto_real
            FROM posible_votos WHERE dirigente_cedula=?
            ORDER BY voto_real DESC, status DESC, votante_apellido
        """, (d_ced,)).fetchall()

        votantes = [{"cedula": r[0], "nombre": f"{r[2]} {r[1]}".strip(),
                     "mesa": r[3], "confirmado": r[4] == 'confirmado', "voto_real": bool(r[5])} for r in rows]

        return {
            "success": True, "dirigente_nombre": pertenece[0],
            "total": len(votantes), "confirmados": sum(1 for v in votantes if v["confirmado"]),
            "votaron_real": sum(1 for v in votantes if v["voto_real"]),
            "votantes": votantes,
        }
    finally:
        conn.close()


@app.get("/api/admin/estadisticas_generales")
def admin_estadisticas_generales(request: Request, cedula_auth: str = "", password_auth: str = ""):
    """Panel de datos estadisticos de TODA la plataforma (no de un cliente puntual): para que
    el Admin Master pueda mostrarle a un candidato prospecto que es capaz de hacer el sistema."""
    conn = get_connection()
    try:
        session_id = normalizar_texto(request.headers.get("x-session-id", ""))
        if session_id:
            _require_session_nivel(conn, session_id, 'master')
        else:
            usuario = _require_auth({"cedula_auth": cedula_auth, "password_auth": password_auth,
                                     "action": "estadisticas_generales"}, 'master', conn)
            if not usuario:
                raise HTTPException(status_code=401, detail="Autenticación requerida")
        c = conn.cursor()
        total_clientes = c.execute("SELECT COUNT(*) FROM clientes WHERE categoria='candidato' AND activo=1").fetchone()[0]
        total_dirigentes = c.execute("SELECT COUNT(*) FROM dirigentes WHERE activo=1").fetchone()[0]
        total_afiliados = c.execute("SELECT COUNT(*) FROM afiliados_partido").fetchone()[0]
        total_pcs = c.execute("SELECT COUNT(*) FROM puestos_comando WHERE COALESCE(escuela_nombre,'')<>''").fetchone()[0]
        total_comprometidos = c.execute("SELECT COUNT(*) FROM posible_votos").fetchone()[0]
        total_confirmados = c.execute("SELECT COUNT(*) FROM posible_votos WHERE status='confirmado'").fetchone()[0]
        total_votaron_real = c.execute("""
            SELECT COUNT(*) FROM posible_votos pv
            WHERE EXISTS (SELECT 1 FROM registros r WHERE r.cedula=pv.votante_cedula AND r.estado='voto')
        """).fetchone()[0]
        total_encuestas = c.execute("SELECT COUNT(*) FROM encuestas_intencion").fetchone()[0]
        total_transporte_flota = c.execute("SELECT COUNT(*) FROM transportes").fetchone()[0]
        total_transporte_propio = c.execute("SELECT COUNT(*) FROM dirigentes WHERE tiene_vehiculo_propio=1").fetchone()[0]
        total_solicitudes_transporte = c.execute("SELECT COUNT(*) FROM solicitudes_recogida").fetchone()[0]

        por_cliente = c.execute("""
            SELECT cl.cedula, cl.nombre, cl.tipo, p.sigla,
                   (SELECT COUNT(*) FROM dirigentes d WHERE d.cliente_cedula=cl.cedula AND d.activo=1) as dirigentes,
                   (SELECT COUNT(*) FROM posible_votos pv JOIN dirigentes d ON d.cedula=pv.dirigente_cedula WHERE d.cliente_cedula=cl.cedula) as comprometidos,
                   (SELECT COUNT(*) FROM posible_votos pv JOIN dirigentes d ON d.cedula=pv.dirigente_cedula WHERE d.cliente_cedula=cl.cedula AND pv.status='confirmado') as confirmados
            FROM clientes cl LEFT JOIN partidos p ON p.id = cl.partido_id
            WHERE cl.categoria='candidato' AND cl.activo=1
            ORDER BY comprometidos DESC
        """).fetchall()

        return {
            "success": True,
            "totales": {
                "clientes_activos": total_clientes, "dirigentes": total_dirigentes,
                "afiliados_cargados": total_afiliados, "pcs_instalados": total_pcs,
                "votos_comprometidos": total_comprometidos, "votos_confirmados": total_confirmados,
                "votaron_segun_sistema": total_votaron_real, "respuestas_encuesta": total_encuestas,
                "vehiculos_flota": total_transporte_flota, "vehiculos_propios_dirigentes": total_transporte_propio,
                "solicitudes_transporte": total_solicitudes_transporte,
            },
            "por_cliente": [{
                "cedula": r[0], "nombre": r[1], "tipo": r[2], "partido_sigla": r[3] or '',
                "dirigentes": r[4], "comprometidos": r[5], "confirmados": r[6],
                "pct_cumplimiento": round(r[6] * 100 / r[5], 1) if r[5] else 0.0,
            } for r in por_cliente],
        }
    finally:
        conn.close()


@app.get("/api/mi_dashboard/resumen_candidatos")
def mi_dashboard_resumen_candidatos(cedula: str = Query(...)):
    """Resumen: cuantos votos (comprometidos/confirmados) tiene cada candidato, sumando
    a TODOS los dirigentes de este cliente."""
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""
            SELECT cnd.id, cnd.nombre, cnd.cargo, cnd.lista_nro, cnd.lista_nombre,
                   COUNT(*) as comprometidos,
                   SUM(CASE WHEN pv.status='confirmado' THEN 1 ELSE 0 END) as confirmados,
                   SUM(CASE WHEN EXISTS (SELECT 1 FROM registros r WHERE r.cedula=pv.votante_cedula AND r.estado='voto') THEN 1 ELSE 0 END) as votaron_real
            FROM posible_voto_candidatos pvc
            JOIN posible_votos pv ON pv.id = pvc.posible_voto_id
            JOIN candidatos cnd ON cnd.id = pvc.candidato_id
            JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
            WHERE d.cliente_cedula = ?
            GROUP BY cnd.id
            ORDER BY cnd.cargo, comprometidos DESC
        """, (ced,)).fetchall()
        candidatos = [{
            "candidato_id": r[0], "nombre": r[1], "cargo": r[2],
            "lista_nro": r[3], "lista_nombre": r[4] or '',
            "comprometidos": r[5], "confirmados": r[6] or 0,
            "pct_cumplimiento": round((r[6] or 0) * 100 / r[5], 1) if r[5] else 0.0,
            "votaron_real": r[7] or 0,
            "pct_votaron_real": round((r[7] or 0) * 100 / r[5], 1) if r[5] else 0.0,
        } for r in rows]
        return {"success": True, "candidatos": candidatos}
    finally:
        conn.close()


@app.get("/api/dashboard/stats")
def dashboard_stats(departamento_id: int = Query(None)):
    """Estadísticas del dashboard: totales, por departamento, por distrito"""
    conn = get_connection()
    try:
        # Totales globales
        total_dirigentes = conn.execute("SELECT COUNT(*) FROM dirigente_candidatos").fetchone()[0]
        total_intendentes = conn.execute("SELECT COUNT(*) FROM candidatos_electos_internas WHERE tipo_cargo='intendente'").fetchone()[0]
        total_concejales = conn.execute("SELECT COUNT(*) FROM candidatos_electos_internas WHERE tipo_cargo='concejal'").fetchone()[0]
        total_candidatos = total_intendentes + total_concejales
        total_partidos = conn.execute("SELECT COUNT(DISTINCT partido_id) FROM candidatos_electos_internas").fetchone()[0]
        total_distritos = conn.execute("SELECT COUNT(DISTINCT distrito_id) FROM candidatos_electos_internas").fetchone()[0]
        total_deptos = conn.execute("SELECT COUNT(DISTINCT departamento_id) FROM candidatos_electos_internas").fetchone()[0]
        total_usuarios = conn.execute("SELECT COUNT(*) FROM cuentas_usuario").fetchone()[0]
        total_grupos = conn.execute("SELECT COUNT(*) FROM grupos_trabajo").fetchone()[0]

        # Por departamento
        deptos = []
        query_dept = """
            SELECT d.id, d.nombre,
                   COUNT(CASE WHEN ce.tipo_cargo='intendente' THEN 1 END) as intendentes,
                   COUNT(CASE WHEN ce.tipo_cargo='concejal' THEN 1 END) as concejales,
                   COUNT(DISTINCT ce.distrito_id) as distritos_con_candidatos,
                   COUNT(DISTINCT ce.partido_id) as partidos_presentes,
                   COALESCE(SUM(ce.votos_obtenidos), 0) as total_votos
            FROM departamentos d
            LEFT JOIN candidatos_electos_internas ce ON ce.departamento_id = d.id
        """
        params_dept = []
        if departamento_id:
            query_dept += " WHERE d.id = ?"
            params_dept.append(departamento_id)
        query_dept += " GROUP BY d.id ORDER BY d.nombre"
        for r in conn.execute(query_dept, params_dept).fetchall():
            deptos.append({
                'id': r[0], 'nombre': r[1],
                'intendentes': r[2], 'concejales': r[3],
                'distritos_con_candidatos': r[4], 'partidos_presentes': r[5],
                'total_votos': r[6]
            })

        # Por distrito (filtrado por departamento si se especifica)
        query_dist = """
            SELECT dist.id, dist.nombre, dep.nombre as depto_nombre, dep.id as depto_id,
                   COUNT(CASE WHEN ce.tipo_cargo='intendente' THEN 1 END) as intendentes,
                   COUNT(CASE WHEN ce.tipo_cargo='concejal' THEN 1 END) as concejales,
                   COUNT(DISTINCT ce.partido_id) as partidos,
                   COALESCE(SUM(ce.votos_obtenidos), 0) as total_votos
            FROM distritos dist
            JOIN departamentos dep ON dep.id = dist.departamento_id
            LEFT JOIN candidatos_electos_internas ce ON ce.distrito_id = dist.id
        """
        params_dist = []
        where_dist = []
        if departamento_id:
            where_dist.append("dep.id = ?")
            params_dist.append(departamento_id)
        if where_dist:
            query_dist += " WHERE " + " AND ".join(where_dist)
        query_dist += " GROUP BY dist.id ORDER BY dep.nombre, dist.nombre"

        distritos = []
        for r in conn.execute(query_dist, params_dist).fetchall():
            distritos.append({
                'id': r[0], 'nombre': r[1], 'departamento': r[2], 'departamento_id': r[3],
                'intendentes': r[4], 'concejales': r[5], 'partidos': r[6], 'total_votos': r[7]
            })

        # Por partido
        partidos = []
        for r in conn.execute("""
            SELECT p.id, p.sigla, p.color_principal_hex,
                   COUNT(CASE WHEN ce.tipo_cargo='intendente' THEN 1 END) as intendentes,
                   COUNT(CASE WHEN ce.tipo_cargo='concejal' THEN 1 END) as concejales,
                   COUNT(DISTINCT ce.departamento_id) as deptos,
                   COUNT(DISTINCT ce.distrito_id) as distritos,
                   COALESCE(SUM(ce.votos_obtenidos), 0) as total_votos
            FROM partidos p
            LEFT JOIN candidatos_electos_internas ce ON ce.partido_id = p.id
            GROUP BY p.id ORDER BY p.prioridad_orden
        """).fetchall():
            partidos.append({
                'id': r[0], 'sigla': r[1], 'color': r[2],
                'intendentes': r[3], 'concejales': r[4],
                'departamentos': r[5], 'distritos': r[6], 'total_votos': r[7]
            })

        return {
            'success': True,
            'totales': {
                'candidatos': total_candidatos, 'intendentes': total_intendentes,
                'concejales': total_concejales, 'dirigentes': total_dirigentes,
                'grupos': total_grupos, 'partidos': total_partidos,
                'distritos': total_distritos, 'departamentos': total_deptos,
                'usuarios': total_usuarios
            },
            'departamentos': deptos,
            'distritos': distritos,
            'partidos': partidos
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}
    finally:
        conn.close()

@app.get("/api/candidatos_electos/agrupados")
def candidatos_agrupados(
    partido: str = Query(None),
    distrito: str = Query(None),
    cargo: str = Query(None),
    departamento: str = Query(None)
):
    """Retorna candidatos agrupados por departamento → distrito → partido"""
    conn = get_connection()
    query = """
        SELECT ce.id, ce.tipo_cargo, ce.lista_nro, ce.lista_nombre,
               ce.votos_obtenidos, ce.porcentaje_votos, ce.orden_electo,
               ce.es_titular, ce.estado, ce.distrito_nombre,
               c.nombre as candidato_nombre, c.activo as candidato_activo,
               p.codigo_partido, p.sigla, p.color_principal_hex,
               COALESCE(d.nombre, 'Sin departamento') as departamento_nombre,
               d.id as departamento_id
        FROM candidatos_electos_internas ce
        JOIN candidatos c ON c.id = ce.candidato_id
        JOIN partidos p ON p.id = ce.partido_id
        LEFT JOIN departamentos d ON d.id = ce.departamento_id
        WHERE 1=1
    """
    params = []
    if partido:
        query += " AND p.codigo_partido = ?"
        params.append(partido.upper())
    if distrito:
        query += " AND ce.distrito_nombre LIKE ?"
        params.append(f"%{distrito}%")
    if cargo:
        query += " AND ce.tipo_cargo = ?"
        params.append(cargo.lower())
    if departamento:
        query += " AND d.nombre LIKE ?"
        params.append(f"%{departamento}%")
    query += " ORDER BY d.nombre, ce.distrito_nombre, p.prioridad_orden, ce.tipo_cargo, ce.orden_electo"
    rows = conn.execute(query, params).fetchall()
    cols = ['id','tipo_cargo','lista_nro','lista_nombre','votos_obtenidos','porcentaje_votos',
            'orden_electo','es_titular','estado','distrito_nombre','candidato_nombre','candidato_activo',
            'codigo_partido','sigla','color_principal_hex','departamento_nombre','departamento_id']
    candidatos = [dict(zip(cols, r)) for r in rows]
    conn.close()

    # Agrupar: departamento → distrito → partido
    agrupado = {}
    for cand in candidatos:
        dpto = cand['departamento_nombre']
        dist = cand['distrito_nombre']
        partido_key = cand['codigo_partido']

        if dpto not in agrupado:
            agrupado[dpto] = {'departamento': dpto, 'distritos': {}}
        if dist not in agrupado[dpto]['distritos']:
            agrupado[dpto]['distritos'][dist] = {'distrito': dist, 'partidos': {}}
        if partido_key not in agrupado[dpto]['distritos'][dist]['partidos']:
            agrupado[dpto]['distritos'][dist]['partidos'][partido_key] = {
                'sigla': cand['sigla'], 'color': cand['color_principal_hex'], 'candidatos': []
            }
        agrupado[dpto]['distritos'][dist]['partidos'][partido_key]['candidatos'].append(cand)

    return {"success": True, "agrupado": list(agrupado.values()), "total": len(candidatos)}

@app.get("/api/candidatos_electos/{candidato_id}")
def get_candidato_electo(candidato_id: int):
    """Detalle de un candidato electo"""
    conn = get_connection()
    row = conn.execute("""
        SELECT ce.*, c.nombre as candidato_nombre, c.cliente_cedula,
               p.codigo_partido, p.sigla, p.nombre_oficial as partido_nombre,
               p.color_principal_hex, d.nombre as departamento_nombre
        FROM candidatos_electos_internas ce
        JOIN candidatos c ON c.id = ce.candidato_id
        JOIN partidos p ON p.id = ce.partido_id
        LEFT JOIN departamentos d ON d.id = ce.departamento_id
        WHERE ce.id = ?
    """, (candidato_id,)).fetchone()
    if not row:
        conn.close()
        return {"success": False, "error": "Candidato no encontrado"}
    cols = [d[1] for d in conn.execute("PRAGMA table_info(candidatos_electos_internas)").fetchall()]
    conn.close()
    cols += ['candidato_nombre','cliente_cedula','codigo_partido','sigla','partido_nombre','color_principal_hex','departamento_nombre']
    return {"success": True, "candidato": dict(zip(cols, row))}

@app.post("/api/candidatos_electos/crear")
async def crear_candidato_electo(request: Request):
    """Crea un candidato electo manualmente"""
    data = await request.json()
    conn = get_connection()
    try:
        if not _require_auth(data, 'master', conn):
            raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
        if not data.get('nombre') or not data.get('partido_id'):
            return {"success": False, "error": "Nombre y partido son obligatorios"}
        c = conn.cursor()
        # Crear candidato base
        c.execute("""INSERT INTO candidatos (nombre, cargo, lista_nro, lista_nombre, orden, departamento_id, distrito_id, cliente_cedula, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (data['nombre'], data.get('cargo','concejal'), data.get('lista_nro',0),
             data.get('lista_nombre',''), data.get('orden',0),
             data.get('departamento_id'), data.get('distrito_id'),
             data.get('cliente_cedula')))
        cand_id = c.lastrowid
        # Crear registro electo
        c.execute("""INSERT INTO candidatos_electos_internas
            (candidato_id, partido_id, tipo_cargo, departamento_id, distrito_id, distrito_nombre,
             lista_nro, lista_nombre, votos_obtenidos, porcentaje_votos, orden_electo,
             es_titular, periodo_electoral, fecha_eleccion_interna, estado)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (cand_id, data['partido_id'], data.get('cargo','concejal'),
             data.get('departamento_id'), data.get('distrito_id'), data.get('distrito_nombre',''),
             data.get('lista_nro',0), data.get('lista_nombre',''),
             data.get('votos_obtenidos',0), data.get('porcentaje_votos',0),
             data.get('orden_electo',0), data.get('es_titular',1),
             data.get('periodo_electoral','2026-2030'), data.get('fecha_eleccion_interna'),
             data.get('estado','electo')))
        conn.commit()
        return {"success": True, "candidato_id": cand_id, "electo_id": c.lastrowid}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/candidatos_electos/toggle")
async def toggle_candidato_electo(request: Request):
    """Habilita/deshabilita un candidato electo"""
    data = await request.json()
    conn = get_connection()
    if not _require_auth(data, 'master', conn):
        conn.close()
        raise HTTPException(status_code=401, detail="Autenticación de Administración General requerida")
    candidato_id = data.get('candidato_id')
    if not candidato_id:
        conn.close()
        return {"success": False, "error": "candidato_id requerido"}
    try:
        # Obtener estado actual
        row = conn.execute("SELECT activo FROM candidatos WHERE id=?", (candidato_id,)).fetchone()
        if not row:
            return {"success": False, "error": "Candidato no encontrado"}
        nuevo_estado = 0 if row[0] else 1
        conn.execute("UPDATE candidatos SET activo=? WHERE id=?", (nuevo_estado, candidato_id))
        conn.commit()
        estado_texto = "habilitado" if nuevo_estado else "deshabilitado"
        return {"success": True, "activo": nuevo_estado, "mensaje": f"Candidato {estado_texto}"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── CONDUCTOR / LOGISTICA ──────────────────────────────
@app.get("/api/conductor/pendientes")
def conductor_pendientes(cedula: str = Query("")):
    """Viajes pendientes asignados a un conductor, con datos del votante si aplica"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT r.id, r.origen, r.destino, r.estado, r.salida, r.llegada,
                   r.observacion, r.created_at, r.cedula_conductor,
                   t.nombre as vehiculo, t.placa, t.telefono as conductor_telefono,
                   t.estado as conductor_estado,
                   s.votante_cedula, s.votante_nombre, s.hora_recogida,
                   s.ubicacion as solicitud_ubicacion, s.dirigente_cedula, s.dirigente_nombre,
                   s.descripcion as solicitud_desc
            FROM rutas r
            LEFT JOIN transportes t ON r.transporte_id = t.id
            LEFT JOIN solicitudes_recogida s ON s.ruta_id = r.id
            WHERE r.cedula_conductor=? AND r.estado IN ('pendiente','en_curso')
            ORDER BY r.created_at ASC
        """, (ced,)).fetchall()
        items = []
        for r in rows:
            it = dict(zip([
                "id","origen","destino","estado","salida","llegada",
                "observacion","creado","cedula_conductor",
                "vehiculo","placa","conductor_telefono",
                "conductor_estado",
                "votante_cedula","votante_nombre","hora_recogida",
                "solicitud_ubicacion","dirigente_cedula","dirigente_nombre",
                "solicitud_desc"
            ], r))
            # Si no hay votante directo, intentar buscar solicitud por observación
            if not it["votante_cedula"] and it["observacion"]:
                obsv = it["observacion"]
                import re
                m = re.search(r'Solicitud #(\d+)', obsv)
                if m:
                    sol = conn.execute(
                        "SELECT votante_cedula, votante_nombre, hora_recogida, ubicacion, dirigente_cedula, dirigente_nombre FROM solicitudes_recogida WHERE id=?",
                        (int(m.group(1)),)
                    ).fetchone()
                    if sol:
                        it["votante_cedula"] = sol[0]
                        it["votante_nombre"] = sol[1]
                        it["hora_recogida"] = sol[2]
                        it["solicitud_ubicacion"] = sol[3]
                        it["dirigente_cedula"] = sol[4]
                        it["dirigente_nombre"] = sol[5]
            items.append(it)
        return {"success": True, "viajes": items, "total": len(items)}
    finally:
        conn.close()

@app.get("/api/conductor/historial")
def conductor_historial(cedula: str = Query("")):
    """Viajes completados hoy del conductor"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT r.id, r.origen, r.destino, r.estado, r.salida, r.llegada, r.observacion, r.created_at,
                   t.nombre as vehiculo, t.placa
            FROM rutas r
            LEFT JOIN transportes t ON r.transporte_id = t.id
            WHERE r.cedula_conductor=? AND r.estado='completado'
              AND date(r.llegada) = date('now','localtime')
            ORDER BY r.llegada DESC
        """, (ced,)).fetchall()
        cols = ["id","origen","destino","estado","salida","llegada","observacion","creado","vehiculo","placa"]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "historial": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/conductor/confirmar")
def conductor_confirmar(data: dict = Body(...)):
    """Conductor inicia un viaje"""
    ruta_id = data.get("ruta_id")
    ced = normalizar_cedula(data.get("cedula", ""))
    if not ruta_id or not ced:
        return {"success": False, "error": "ruta_id y cedula requeridos"}
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE rutas SET estado='en_curso', salida=datetime('now','localtime')
            WHERE id=? AND cedula_conductor=? AND estado='pendiente'
        """, (int(ruta_id), ced))
        conn.commit()
        if conn.total_changes == 0:
            return {"success": False, "error": "Viaje no encontrado o ya iniciado"}
        # Notificar al dirigente si aplica
        ruta = conn.execute("""
            SELECT r.origen, r.destino, t.nombre, t.placa,
                   s.dirigente_cedula, s.dirigente_nombre
            FROM rutas r
            LEFT JOIN transportes t ON r.transporte_id = t.id
            LEFT JOIN solicitudes_recogida s ON s.ruta_id = r.id
            WHERE r.id=?
        """, (int(ruta_id),)).fetchone()
        if ruta and ruta[4]:  # dirigente_cedula
            conductor_nom = ruta[2] or 'Conductor'
            try:
                conn2 = get_connection()
                # Check if dirigente has a user account for push
                conn2.close()
            except:
                pass
        return {"success": True, "accion": "viaje_iniciado",
                "conductor_nombre": ruta[2] if ruta else "",
                "dirigente_notificado": bool(ruta and ruta[4])}
    finally:
        conn.close()

@app.post("/api/conductor/completar")
def conductor_completar(data: dict = Body(...)):
    """Conductor finaliza un viaje, opcionalmente con observación"""
    ruta_id = data.get("ruta_id")
    ced = normalizar_cedula(data.get("cedula", ""))
    observacion = normalizar_texto(data.get("observacion", ""))
    if not ruta_id or not ced:
        return {"success": False, "error": "ruta_id y cedula requeridos"}
    conn = get_connection()
    try:
        if observacion:
            conn.execute("""
                UPDATE rutas SET estado='completado', llegada=datetime('now','localtime'), observacion=?
                WHERE id=? AND cedula_conductor=? AND estado='en_curso'
            """, (observacion, int(ruta_id), ced))
        else:
            conn.execute("""
                UPDATE rutas SET estado='completado', llegada=datetime('now','localtime')
                WHERE id=? AND cedula_conductor=? AND estado='en_curso'
            """, (int(ruta_id), ced))
        conn.commit()
        if conn.total_changes == 0:
            return {"success": False, "error": "Viaje no encontrado o ya completado"}
        # Obtener datos para respuesta
        ruta = conn.execute("""
            SELECT r.origen, r.destino, t.nombre,
                   s.dirigente_cedula, s.dirigente_nombre
            FROM rutas r
            LEFT JOIN transportes t ON r.transporte_id = t.id
            LEFT JOIN solicitudes_recogida s ON s.ruta_id = r.id
            WHERE r.id=?
        """, (int(ruta_id),)).fetchone()
        return {"success": True, "accion": "viaje_completado",
                "conductor_nombre": ruta[2] if ruta else "",
                "dirigente_notificado": bool(ruta and ruta[3])}
    finally:
        conn.close()

@app.post("/api/conductor/ubicacion")
def conductor_ubicacion(data: dict = Body(...)):
    """Conductor reporta su ubicación GPS. Incluye geocerca automática: si el conductor
    está a menos de 50m del destino de un tramo en curso, se auto-completa y avanza
    el siguiente tramo."""
    ced = normalizar_cedula(data.get("cedula", ""))
    lat = data.get("lat")
    lng = data.get("lng")
    velocidad = float(data.get("velocidad", 0))
    direccion = normalizar_texto(data.get("direccion", ""))
    if not ced or lat is None or lng is None:
        return {"success": False, "error": "cedula, lat y lng requeridos"}
    conn = get_connection()
    try:
        # Find the transporte by cedula
        t = conn.execute("SELECT id FROM transportes WHERE cedula=?", (ced,)).fetchone()
        t_id = t[0] if t else None
        if not t_id:
            return {"success": False, "error": "Transporte no encontrado para esta cédula"}
        conn.execute("""
            INSERT INTO ubicaciones_gps (transporte_id, cedula, lat, lng, velocidad, direccion)
            VALUES (?,?,?,?,?,?)
        """, (t_id, ced, float(lat), float(lng), velocidad, direccion))
        conn.commit()

        # ── GEOCERCA AUTOMÁTICA ──────────────────────────────────────
        # Buscar si el transporte tiene un tramo en curso
        c = conn.cursor()
        tramo_activo = c.execute("""
            SELECT id, tipo, estado, destino_lat, destino_lng, votante_cedula, votante_nombre,
                   origen_lat, origen_lng, origen_nombre, destino_nombre, solicitud_id
            FROM viajes
            WHERE transporte_id=? AND estado='en_curso'
            ORDER BY creado ASC
            LIMIT 1
        """, (t_id,)).fetchone()

        geocerca_disparada = False
        tramo_completado_id = None

        if tramo_activo:
            # Calcular distancia Haversine entre la posición actual y el destino
            dist_km = _distancia_haversine_km(float(lat), float(lng), tramo_activo[3], tramo_activo[4])
            if dist_km <= 0.050:  # 50 metros
                geocerca_disparada = True
                viaje_id = tramo_activo[0]
                tipo_tramo = tramo_activo[1]
                tramo_completado_id = viaje_id

                # Auto-completar el tramo
                c.execute("""UPDATE viajes SET estado='completado', completado_en=datetime('now','localtime')
                             WHERE id=? AND estado='en_curso'""", (viaje_id,))

                # Si era 'busqueda', cambiar el subsiguiente 'ida' a 'en_curso'
                if tipo_tramo == "busqueda":
                    c.execute("""UPDATE viajes SET estado='en_curso'
                                 WHERE votante_cedula=? AND tipo='ida' AND estado='pendiente'
                                 ORDER BY creado ASC LIMIT 1""", (tramo_activo[5],))

                # Si era 'ida', generar tramo 'vuelta' en el pool general (sin conductor)
                if tipo_tramo == "ida":
                    ya_existe_vuelta = c.execute("""
                        SELECT 1 FROM viajes WHERE votante_cedula=? AND tipo='vuelta'
                        AND estado IN ('pendiente','en_curso')
                    """, (tramo_activo[5],)).fetchone()
                    if not ya_existe_vuelta:
                        _crear_tramo(c, tramo_activo[11], None, '', tramo_activo[5], tramo_activo[6],
                                     "vuelta", tramo_activo[3], tramo_activo[4], tramo_activo[10],
                                     tramo_activo[7], tramo_activo[8], tramo_activo[9], estado='pendiente')

                # Registrar en auditoría interna
                log_auditoria(
                    cedula=ced,
                    nombre="",
                    accion="geocerca_auto_completado",
                    detalle=f"Tramo {viaje_id} ({tipo_tramo}) auto-completado por geocerca (dist={dist_km:.4f}km)",
                    entidad="viajes",
                    entidad_id=str(viaje_id),
                    severidad="info"
                )

                conn.commit()

        if geocerca_disparada:
            return {
                "success": True,
                "accion": "ubicacion_reportada",
                "geocerca_disparada": True,
                "tramo_completado_id": tramo_completado_id
            }
        return {"success": True, "accion": "ubicacion_reportada"}
    finally:
        conn.close()

@app.post("/api/conductor/sos")
def conductor_sos(data: dict = Body(...)):
    """Conductor envía alerta de emergencia con su ubicación actual."""
    ced = normalizar_cedula(data.get("cedula", ""))
    lat = data.get("lat")
    lng = data.get("lng")
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        # Verificar que el conductor exista
        t = conn.execute("SELECT id FROM transportes WHERE cedula=?", (ced,)).fetchone()
        if not t:
            return {"success": False, "error": "Conductor no encontrado"}
        t_id = t[0]
        # Registrar la alerta
        conn.execute("""
            INSERT INTO alertas_sos (conductor_cedula, transporte_id, lat, lng, estado, creado)
            VALUES (?, ?, ?, ?, 'activa', datetime('now','localtime'))
        """, (ced, t_id, float(lat) if lat else None, float(lng) if lng else None))
        conn.commit()
        push_enviado = enviar_push(ced, "SOS de conductor", "El conductor solicita asistencia.", "/transporte.html")
        return {"success": True, "accion": "sos_enviado", "canal_notificacion": "push" if push_enviado else "panel_alertas"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/conductor/ultima_ubicacion")
def conductor_ultima_ubicacion(cedula: str = Query("")):
    """Última ubicación conocida de un conductor (para rastreo en vivo)"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT u.lat, u.lng, u.timestamp, u.velocidad, u.direccion,
                   t.nombre, t.placa, r.origen, r.destino, r.estado as viaje_estado
            FROM ubicaciones_gps u
            JOIN transportes t ON u.transporte_id = t.id
            LEFT JOIN rutas r ON r.transporte_id = t.id AND r.estado IN ('pendiente','en_curso')
            WHERE t.cedula=?
            ORDER BY u.timestamp DESC
            LIMIT 1
        """, (ced,)).fetchone()
        if not row:
            return {"success": False, "error": "Sin ubicación disponible"}
        return {"success": True, "ubicacion": {
            "lat": row[0], "lng": row[1], "timestamp": row[2],
            "velocidad": row[3], "direccion": row[4],
            "conductor_nombre": row[5], "placa": row[6],
            "viaje_origen": row[7], "viaje_destino": row[8], "viaje_estado": row[9]
        }}
    finally:
        conn.close()

# ─── ENLACE PÚBLICO DEL VOTANTE (sin login) ──────────────────────────
# El votante al que hay que "ir a buscar" no tiene cuenta en el sistema. Se le genera
# un enlace con un token no adivinable (mi_recogida.html?t=...) para que, desde su
# celular y sin iniciar sesion, comparta su ubicacion y vea la hora de recogida y,
# cuando haya, el conductor asignado y su ubicacion en vivo.

@app.post("/api/votante/link_ubicacion")
async def votante_link_ubicacion(request: Request):
    """El dirigente pide el enlace para un votante propio (lo genera si no existe)."""
    data = await request.json()
    dc = normalizar_cedula(data.get("dirigente_cedula", ""))
    pv_id = data.get("posible_voto_id")
    if not dc or not pv_id:
        return {"success": False, "error": "Dirigente y votante requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        row = c.execute("SELECT token_publico FROM posible_votos WHERE id=? AND dirigente_cedula=?", (pv_id, dc)).fetchone()
        if not row:
            return {"success": False, "error": "Ese votante no es tuyo"}
        token = row[0]
        if not token:
            token = secrets.token_urlsafe(12)
            c.execute("UPDATE posible_votos SET token_publico=? WHERE id=?", (token, pv_id))
            conn.commit()
        link_largo = f"{BASE_URL}/mi_recogida.html?t={token}"
        link_corto = f"{BASE_URL}/r/{token}"
        return {"success": True, "token": token, "link": link_largo, "link_corto": link_corto}
    finally:
        conn.close()

@app.get("/r/{token}")
def redirigir_votante(token: str):
    """Ruta corta que redirige a mi_recogida.html con el token."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/mi_recogida.html?t={token}", status_code=302)

@app.get("/api/votante_publico")
def votante_publico(t: str = Query("")):
    """Datos publicos (sin login) para la pagina del votante, por su token."""
    if not t:
        return {"success": False, "error": "Enlace inválido"}
    conn = get_connection()
    try:
        c = conn.cursor()
        row = c.execute("""
            SELECT pv.id, pv.votante_nombre, pv.votante_apellido, pv.votante_mesa, pv.votante_orden,
                   pv.status, pv.votante_lat, pv.votante_lng,
                   COALESCE(NULLIF(p.local_nombre, ''), ''), d.nombre, pv.votante_cedula
            FROM posible_votos pv
            LEFT JOIN padron2026_completo p ON p.cedula = pv.votante_cedula
            LEFT JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
            WHERE pv.token_publico = ?
        """, (t,)).fetchone()
        if not row:
            return {"success": False, "error": "Enlace inválido o vencido"}
        pv_id = row[0]
        local_lat, local_lng, _ = _resolver_local_votacion(conn, row[10])
        sol = c.execute("""
            SELECT hora_recogida, estado, ruta_id, ubicacion, created_at FROM solicitudes_recogida
            WHERE votante_cedula = (SELECT votante_cedula FROM posible_votos WHERE id=?)
            ORDER BY created_at DESC LIMIT 1
        """, (pv_id,)).fetchone()
        # Fecha de recogida: la del viaje asignado (si existe) o la de la solicitud
        fecha_recogida = None
        if sol and sol[4]:
            fecha_recogida = sol[4][:10]  # YYYY-MM-DD
        v_ced_early = row[10]
        if v_ced_early:
            viaje_fecha = c.execute("""
                SELECT creado FROM viajes WHERE votante_cedula=? AND estado='en_curso'
                ORDER BY creado DESC LIMIT 1
            """, (v_ced_early,)).fetchone()
            if viaje_fecha and viaje_fecha[0]:
                fecha_recogida = viaje_fecha[0][:10]
        # votante_nombre a veces ya trae el nombre completo cargado a mano; no repetir el
        # apellido si ya esta incluido ahi.
        v_nombre, v_apellido = row[1] or '', row[2] or ''
        nombre_completo = v_nombre if (v_apellido and v_apellido in v_nombre) else (v_nombre + ' ' + v_apellido).strip()
        resultado = {
            "success": True,
            "nombre": nombre_completo,
            "mesa": row[3], "orden": row[4], "status": row[5],
            "votante_lat": row[6], "votante_lng": row[7],
            "local_nombre": row[8], "dirigente_nombre": row[9],
            "local_lat": local_lat, "local_lng": local_lng,
            "hora_recogida": sol[0] if sol else None,
            "fecha_recogida": fecha_recogida,
            "estado_recogida": sol[1] if sol else None,
            "ubicacion": sol[3] if sol else None,
            "conductor": None
        }
        # Conductor asignado: primero el sistema NUEVO (`viajes`, el que arma
        # armar_viaje_redondo/optimizar_asignaciones), y solo si no hay nada ahí,
        # el legacy (`rutas` vía solicitud.ruta_id). Antes miraba SOLO `rutas`, así
        # que si el votante fue asignado por el sistema nuevo, veía al conductor
        # equivocado (o a ninguno).
        cond = None
        v_ced_row = c.execute("SELECT votante_cedula FROM posible_votos WHERE id=?", (pv_id,)).fetchone()
        v_ced = v_ced_row[0] if v_ced_row else None
        if v_ced:
            cond = c.execute("""
                SELECT u.lat, u.lng, u.timestamp, t.nombre, t.placa, v.id, v.tipo, v.estado
                FROM viajes v
                JOIN transportes t ON t.id = v.transporte_id
                LEFT JOIN ubicaciones_gps u ON u.id = (
                    SELECT u2.id FROM ubicaciones_gps u2 WHERE u2.transporte_id=t.id ORDER BY u2.timestamp DESC LIMIT 1
                )
                WHERE v.votante_cedula=? AND v.transporte_id IS NOT NULL
                ORDER BY (v.estado='en_curso') DESC, v.creado DESC
                LIMIT 1
            """, (v_ced,)).fetchone()
        if (not cond or cond[0] is None) and sol and sol[2]:
            cond = c.execute("""
                SELECT u.lat, u.lng, u.timestamp, t.nombre, t.placa
                FROM rutas r JOIN transportes t ON t.id = r.transporte_id
                LEFT JOIN ubicaciones_gps u ON u.transporte_id = t.id
                WHERE r.id=? ORDER BY u.timestamp DESC LIMIT 1
            """, (sol[2],)).fetchone()
        if cond and cond[0] is not None:
            resultado["conductor"] = {
                "nombre": cond[3], "placa": cond[4], "lat": cond[0], "lng": cond[1], "timestamp": cond[2],
                "viaje_id": cond[5] if len(cond) > 5 else None,
                "tipo_tramo": cond[6] if len(cond) > 6 else None,
                "estado_tramo": cond[7] if len(cond) > 7 else None,
                "activo": bool(len(cond) > 7 and cond[7] in ("pendiente", "en_curso"))
            }
        track = c.execute("""SELECT lat, lng, timestamp FROM ubicaciones_votantes
                              WHERE votante_cedula=? ORDER BY timestamp DESC LIMIT 1""", (v_ced,)).fetchone()
        if track:
            resultado["votante_track"] = {"lat": track[0], "lng": track[1], "timestamp": track[2]}
        if resultado.get("conductor") and resultado.get("votante_track"):
            conductor = resultado["conductor"]
            votante = resultado["votante_track"]
            antiguedad_s = c.execute("SELECT (julianday('now','localtime')-julianday(?))*86400", (conductor["timestamp"],)).fetchone()[0]
            antiguedad_votante_s = c.execute("SELECT (julianday('now','localtime')-julianday(?))*86400", (votante["timestamp"],)).fetchone()[0]
            d_km = _distancia_haversine_km(votante["lat"], votante["lng"], conductor["lat"], conductor["lng"])
            activo = conductor.get("estado_tramo") in ("pendiente", "en_curso")
            if activo and antiguedad_votante_s is not None and antiguedad_votante_s <= 60 and (antiguedad_s is None or antiguedad_s > 120):
                resultado["seguimiento"] = {"estado": "conductor_sin_senal", "distancia_km": round(d_km, 2),
                                            "atencion": True, "segundos_sin_gps": int(antiguedad_s or 0)}
            elif activo and antiguedad_votante_s is not None and antiguedad_votante_s <= 60 and d_km <= 0.5 and antiguedad_s is not None and antiguedad_s <= 45:
                resultado["seguimiento"] = {"estado": "ubicaciones_coinciden", "distancia_km": round(d_km, 2), "atencion": False}
            elif activo:
                resultado["seguimiento"] = {"estado": "ubicaciones_separadas", "distancia_km": round(d_km, 2), "atencion": False}
            else:
                resultado["seguimiento"] = {"estado": "sin_traslado_activo", "distancia_km": round(d_km, 2), "atencion": False}
        return resultado
    finally:
        conn.close()

@app.post("/api/votante_publico/ubicacion")
async def votante_publico_ubicacion(request: Request):
    """El propio votante (sin login) comparte su ubicacion GPS desde su celular."""
    data = await request.json()
    t = normalizar_texto(data.get("token", ""))
    lat = data.get("lat")
    lng = data.get("lng")
    if not t or lat is None or lng is None:
        return {"success": False, "error": "Datos requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        seguimiento = bool(data.get("seguimiento", False))
        r = c.execute("""UPDATE posible_votos SET votante_lat=?, votante_lng=?,
                          votante_ubicacion_en=datetime('now','localtime') WHERE token_publico=?""",
                      (float(lat), float(lng), t))
        conn.commit()
        if c.rowcount == 0:
            return {"success": False, "error": "Enlace inválido"}
        votante = c.execute("SELECT votante_cedula FROM posible_votos WHERE token_publico=?", (t,)).fetchone()
        if seguimiento:
            c.execute("INSERT INTO ubicaciones_votantes (votante_cedula, lat, lng) VALUES (?,?,?)",
                      (votante[0], float(lat), float(lng)))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

@app.post("/api/votante_publico/editar")
async def votante_publico_editar(request: Request):
    """El propio votante (sin login) cambia la hora y/o el lugar de su recogida."""
    data = await request.json()
    t = normalizar_texto(data.get("token", ""))
    hora = normalizar_texto(data.get("hora_recogida", ""))
    ubic = normalizar_texto(data.get("ubicacion", ""))
    if not t or not hora or not ubic:
        return {"success": False, "error": "Hora y ubicación requeridas"}
    conn = get_connection()
    try:
        c = conn.cursor()
        pv = c.execute("SELECT dirigente_cedula, votante_cedula, votante_nombre FROM posible_votos WHERE token_publico=?", (t,)).fetchone()
        if not pv:
            return {"success": False, "error": "Enlace inválido"}
        dc, vc, vn = pv
        sol = c.execute("""SELECT id FROM solicitudes_recogida WHERE dirigente_cedula=? AND votante_cedula=?
                            ORDER BY created_at DESC LIMIT 1""", (dc, vc)).fetchone()
        if sol:
            c.execute("UPDATE solicitudes_recogida SET hora_recogida=?, ubicacion=? WHERE id=?", (hora, ubic, sol[0]))
        else:
            c.execute("""INSERT INTO solicitudes_recogida
                (dirigente_cedula, votante_cedula, votante_nombre, hora_recogida, ubicacion, estado)
                VALUES (?,?,?,?,?, 'pendiente')""", (dc, vc, vn, hora, ubic))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

def _cargar_fuente(tamano, negrita=False):
    from PIL import ImageFont
    candidatos = [
        r"C:\Windows\Fonts\arialbd.ttf" if negrita else r"C:\Windows\Fonts\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if negrita else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for ruta in candidatos:
        try:
            return ImageFont.truetype(ruta, tamano)
        except Exception:
            continue
    return ImageFont.load_default()

@app.get("/api/votante_publico/imagen")
def votante_publico_imagen(t: str = Query("")):
    """Genera una imagen tipo comprobante con los datos del traslado, para mandar
    junto con el enlace (WhatsApp la muestra como vista previa del link)."""
    if not t:
        raise HTTPException(404)
    conn = get_connection()
    try:
        c = conn.cursor()
        row = c.execute("""
            SELECT pv.votante_nombre, pv.votante_apellido, pv.votante_mesa, pv.votante_orden,
                   COALESCE(NULLIF(p.local_nombre,''), '')
            FROM posible_votos pv
            LEFT JOIN padron2026_completo p ON p.cedula = pv.votante_cedula
            WHERE pv.token_publico = ?
        """, (t,)).fetchone()
        if not row:
            raise HTTPException(404)
        sol = c.execute("""
            SELECT hora_recogida FROM solicitudes_recogida
            WHERE votante_cedula = (SELECT votante_cedula FROM posible_votos WHERE token_publico=?)
            ORDER BY created_at DESC LIMIT 1
        """, (t,)).fetchone()
        v_nombre, v_apellido = row[0] or '', row[1] or ''
        nombre = v_nombre if (v_apellido and v_apellido in v_nombre) else (v_nombre + ' ' + v_apellido).strip()

        from PIL import Image, ImageDraw
        W, H = 1000, 560
        img = Image.new("RGB", (W, H), "#0a0a0f")
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, W, 150], fill="#13141a")
        draw.rectangle([0, 146, W, 150], fill="#dfc07b")
        f_marca = _cargar_fuente(40, negrita=True)
        f_sub = _cargar_fuente(20)
        f_label = _cargar_fuente(18)
        f_valor = _cargar_fuente(32, negrita=True)
        draw.text((48, 38), "DIA D MASTER", font=f_marca, fill="#dfc07b")
        draw.text((48, 96), "Comprobante de traslado", font=f_sub, fill="#9ca3af")
        draw.text((48, 190), nombre or "Votante", font=f_valor, fill="#ffffff")

        filas = [
            ("MESA", str(row[2] or '—')), ("ORDEN", str(row[3] or '—')),
            ("LOCAL", row[4] or 'A confirmar'), ("HORA DE RECOGIDA", (sol[0] if sol else None) or 'A confirmar'),
        ]
        y = 260
        for label, valor in filas:
            draw.text((48, y), label, font=f_label, fill="#8b9099")
            draw.text((48, y + 26), str(valor), font=f_valor, fill="#ffffff")
            y += 78

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    finally:
        conn.close()

@app.get("/mi_recogida.html")
def servir_mi_recogida(t: str = Query("")):
    """Sirve mi_recogida.html, agregando meta og:image dinamico segun el token para
    que, al compartir el enlace por WhatsApp, se vea el comprobante como vista previa."""
    path = os.path.join(STATIC_DIR, "mi_recogida.html")
    with open(path, encoding="utf-8") as f:
        html = f.read()
    if t:
        conn = get_connection()
        try:
            c = conn.cursor()
            existe = c.execute("SELECT 1 FROM posible_votos WHERE token_publico=?", (t,)).fetchone()
        finally:
            conn.close()
        if existe:
            img_url = f"{BASE_URL}/api/votante_publico/imagen?t={urllib.parse.quote(t)}"
            pagina_url = f"{BASE_URL}/mi_recogida.html?t={urllib.parse.quote(t)}"
            meta = (
                f'<meta property="og:title" content="Tu traslado — DIA D MASTER">\n'
                f'<meta property="og:description" content="Compartí tu ubicación para que te vayan a buscar">\n'
                f'<meta property="og:image" content="{img_url}">\n'
                f'<meta property="og:url" content="{pagina_url}">\n'
                f'<meta name="twitter:card" content="summary_large_image">\n'
                f'<meta name="twitter:image" content="{img_url}">\n'
            )
            html = html.replace('</head>', meta + '</head>')
    return Response(content=html, media_type="text/html", headers={"Cache-Control": "no-cache, must-revalidate"})

@app.get("/api/conductor/lista")
def conductor_lista():
    """Lista de conductores únicos (deduplicados por cédula)"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT t.id, t.cedula, t.nombre, t.tipo, t.placa, t.telefono, t.capacidad, t.estado
            FROM transportes t
            INNER JOIN (
                SELECT cedula, MIN(id) as min_id
                FROM transportes
                WHERE contrasena != '' AND contrasena IS NOT NULL
                GROUP BY cedula
            ) dedup ON t.id = dedup.min_id
            ORDER BY t.nombre
        """).fetchall()
        cols = ["id","cedula","nombre","tipo","placa","telefono","capacidad","estado"]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "conductores": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/conductor/asignar")
def conductor_asignar(data: dict = Body(...)):
    """Admin asigna un viaje a un conductor"""
    ruta_id = data.get("ruta_id")
    cedula_conductor = normalizar_cedula(data.get("cedula_conductor", ""))
    if not ruta_id or not cedula_conductor:
        return {"success": False, "error": "ruta_id y cedula_conductor requeridos"}
    conn = get_connection()
    try:
        ruta = conn.execute("SELECT origen, destino FROM rutas WHERE id=?", (int(ruta_id),)).fetchone()
        conn.execute("UPDATE rutas SET cedula_conductor=? WHERE id=?", (cedula_conductor, int(ruta_id)))
        conn.commit()
        if ruta:
            enviar_push(cedula_conductor, "Nuevo viaje asignado",
                        f"Recoger en: {ruta[0]} → Llevar a: {ruta[1]}", "/conductor.html")
        return {"success": True, "accion": "asignado"}
    finally:
        conn.close()

@app.post("/api/conductor/register-push")
def conductor_register_push(data: dict = Body(...)):
    """Guarda la suscripción push del conductor"""
    ced = normalizar_cedula(data.get("cedula", ""))
    subscription = data.get("subscription")
    if not ced or not subscription:
        return {"success": False, "error": "cedula y subscription requeridos"}
    conn = get_connection()
    try:
        # Create push_subscriptions table if not exists
        conn.execute("""CREATE TABLE IF NOT EXISTS push_subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cedula TEXT NOT NULL,
            subscription_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            UNIQUE(cedula)
        )""")
        conn.execute("""
            INSERT OR REPLACE INTO push_subscriptions (cedula, subscription_json)
            VALUES (?, ?)
        """, (ced, json.dumps(subscription)))
        conn.commit()
        return {"success": True, "accion": "suscrito"}
    finally:
        conn.close()

# ─── SOLICITUDES DE RECOGIDA (Dirigente → Logística) ──
@app.post("/api/solicitar_recogida")
def solicitar_recogida(data: dict = Body(...)):
    """Dirigente crea una solicitud de transporte para un votante"""
    d_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
    d_nom = normalizar_texto(data.get("dirigente_nombre", ""))
    v_ced = normalizar_cedula(data.get("votante_cedula", ""))
    v_nom = normalizar_texto(data.get("votante_nombre", ""))
    hora = normalizar_texto(data.get("hora_recogida", ""))
    ubic = normalizar_texto(data.get("ubicacion", ""))
    desc = normalizar_texto(data.get("descripcion", ""))
    if not d_ced or not v_ced:
        return {"success": False, "error": "Cédula del dirigente y del votante requeridas"}
    if not hora or not ubic:
        return {"success": False, "error": "Hora de recogida y ubicación requeridas"}
    conn = get_connection()
    try:
        c = conn.cursor()
        # Ya existe una solicitud activa (pendiente o autorizada) para este votante:
        # en vez de duplicarla (y chocar con la restricción UNIQUE), se actualiza esa
        # misma fila con los datos nuevos. Cubre el caso de tocar "Solicitar" dos veces.
        existente = c.execute(
            "SELECT id FROM solicitudes_recogida WHERE votante_cedula=? AND estado IN ('pendiente','autorizado')",
            (v_ced,)).fetchone()
        if existente:
            c.execute("""UPDATE solicitudes_recogida SET hora_recogida=?, ubicacion=?, descripcion=?
                         WHERE id=?""", (hora, ubic, desc, existente[0]))
            conn.commit()
            return {"success": True, "accion": "actualizado", "id": existente[0]}
        c.execute("""INSERT INTO solicitudes_recogida
            (dirigente_cedula, dirigente_nombre, votante_cedula, votante_nombre,
             hora_recogida, ubicacion, descripcion, estado)
            VALUES (?,?,?,?,?,?,?,?)
        """, (d_ced, d_nom, v_ced, v_nom, hora, ubic, desc, 'pendiente'))
        conn.commit()
        return {"success": True, "accion": "solicitado", "id": c.lastrowid}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/editar_recogida")
def editar_recogida(data: dict = Body(...)):
    """Dirigente edita la hora y/o el lugar de una solicitud propia ya creada."""
    d_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
    sol_id = data.get("solicitud_id")
    hora = normalizar_texto(data.get("hora_recogida", ""))
    ubic = normalizar_texto(data.get("ubicacion", ""))
    desc = normalizar_texto(data.get("descripcion", ""))
    if not d_ced or not sol_id:
        return {"success": False, "error": "Solicitud requerida"}
    if not hora or not ubic:
        return {"success": False, "error": "Hora de recogida y ubicación requeridas"}
    conn = get_connection()
    try:
        c = conn.cursor()
        existe = c.execute("SELECT id FROM solicitudes_recogida WHERE id=? AND dirigente_cedula=?", (sol_id, d_ced)).fetchone()
        if not existe:
            return {"success": False, "error": "Esa solicitud no es tuya"}
        c.execute("""UPDATE solicitudes_recogida SET hora_recogida=?, ubicacion=?, descripcion=?
                     WHERE id=?""", (hora, ubic, desc, sol_id))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

@app.get("/api/solicitudes_recogida")
def get_solicitudes_recogida(estado: str = Query(""), dirigente: str = Query("")):
    """Lista solicitudes de recogida. Filtro opcional por estado o dirigente"""
    conn = get_connection()
    try:
        query = "SELECT * FROM solicitudes_recogida WHERE 1=1"
        params = []
        if estado:
            query += " AND estado=?"
            params.append(estado)
        if dirigente:
            query += " AND dirigente_cedula=?"
            params.append(normalizar_cedula(dirigente))
        query += " ORDER BY created_at DESC"
        rows = conn.execute(query, params).fetchall()
        cols = ["id","dirigente_cedula","dirigente_nombre","votante_cedula","votante_nombre",
                "hora_recogida","ubicacion","descripcion","estado","autorizado_por","ruta_id","created_at"]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "solicitudes": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/cancelar_recogida")
def cancelar_recogida(data: dict = Body(...)):
    """El propio dirigente cancela una solicitud que todavia esta pendiente (antes de que
    logistica la autorice o rechace)."""
    sol_id = data.get("solicitud_id")
    d_ced = normalizar_cedula(data.get("dirigente_cedula", ""))
    if not sol_id or not d_ced:
        return {"success": False, "error": "solicitud_id y dirigente_cedula requeridos"}
    conn = get_connection()
    try:
        sol = conn.execute("SELECT dirigente_cedula, estado FROM solicitudes_recogida WHERE id=?", (int(sol_id),)).fetchone()
        if not sol:
            return {"success": False, "error": "Solicitud no encontrada"}
        if sol[0] != d_ced:
            return {"success": False, "error": "Esta solicitud no te pertenece"}
        if sol[1] != 'pendiente':
            return {"success": False, "error": "Ya fue procesada por logística, no se puede cancelar"}
        conn.execute("DELETE FROM solicitudes_recogida WHERE id=?", (int(sol_id),))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

@app.post("/api/autorizar_recogida")
def autorizar_recogida(data: dict = Body(...)):
    """Logística autoriza o rechaza una solicitud de recogida"""
    sol_id = data.get("solicitud_id")
    accion = normalizar_texto(data.get("accion", "autorizado"))
    admin_ced = normalizar_cedula(data.get("admin_cedula", ""))
    if not sol_id or not admin_ced:
        return {"success": False, "error": "solicitud_id y admin_cedula requeridos"}
    conn = get_connection()
    try:
        if accion == "autorizado":
            sol = conn.execute("SELECT * FROM solicitudes_recogida WHERE id=?", (int(sol_id),)).fetchone()
            if not sol:
                return {"success": False, "error": "Solicitud no encontrada"}
            # Vehículo: el indicado en la solicitud, o el primero con conductor real
            t_id = data.get("transporte_id")
            if not t_id:
                transp = (conn.execute("SELECT id FROM transportes WHERE contrasena!='' ORDER BY id LIMIT 1").fetchone()
                          or conn.execute("SELECT id FROM transportes ORDER BY id LIMIT 1").fetchone())
                t_id = transp[0] if transp else 1
            else:
                t_id = int(t_id)
            # Conductor: el indicado, o el responsable del vehículo (si tiene cuenta)
            ced_cond = normalizar_cedula(data.get("cedula_conductor", ""))
            if not ced_cond:
                tc = conn.execute("SELECT cedula FROM transportes WHERE id=? AND contrasena!=''", (t_id,)).fetchone()
                ced_cond = tc[0] if tc else ""
            origen = sol["ubicacion"] or ''
            destino = sol["descripcion"] or "Colegio Electoral"
            c = conn.cursor()
            c.execute("""INSERT INTO rutas (transporte_id, cedula_conductor, origen, destino, estado, observacion)
                         VALUES (?,?,?,?,?,?)""",
                      (t_id, ced_cond, origen, destino, 'pendiente', f'Solicitud #{sol_id} - {sol["votante_nombre"]}'))
            ruta_id = c.lastrowid
            c.execute("""UPDATE solicitudes_recogida SET estado=?, autorizado_por=?, ruta_id=?
                         WHERE id=?""", ('autorizado', admin_ced, ruta_id, int(sol_id)))
            conn.commit()
            if ced_cond:
                enviar_push(ced_cond, "Solicitud autorizada",
                            f"Recoger a {sol['votante_nombre']} en {sol['ubicacion']} a las {sol['hora_recogida']}",
                            "/conductor.html")
            return {"success": True, "accion": "autorizado", "ruta_id": ruta_id,
                    "transporte_id": t_id, "cedula_conductor": ced_cond}
        else:
            conn.execute("""UPDATE solicitudes_recogida SET estado='rechazado', autorizado_por=?
                         WHERE id=?""", (admin_ced, int(sol_id)))
            conn.commit()
            return {"success": True, "accion": "rechazado"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── TRASLADO IDA Y VUELTA (busqueda + ida + vuelta, por calles) ──────────────────────
def _resolver_casa_votante(conn, votante_cedula, dirigente_cedula=None):
    """Ubicacion de la casa del votante: la que el propio votante compartio por GPS
    desde su enlace publico (posible_votos.votante_lat/lng). Si no hay GPS, intenta
    geocodificar la direccion del padrón o la solicitud de recogida usando Nominatim (OSM)."""
    c = conn.cursor()
    # 1° Intentar GPS directo del votante
    if dirigente_cedula:
        row = c.execute("""SELECT votante_lat, votante_lng FROM posible_votos
                            WHERE votante_cedula=? AND dirigente_cedula=? AND votante_lat IS NOT NULL""",
                         (votante_cedula, dirigente_cedula)).fetchone()
        if row:
            return row[0], row[1]
    row = c.execute("""SELECT votante_lat, votante_lng FROM posible_votos
                        WHERE votante_cedula=? AND votante_lat IS NOT NULL LIMIT 1""", (votante_cedula,)).fetchone()
    if row:
        return row[0], row[1]

    # 2° Fallback: geocodificar direccion del padron2026_completo
    pad = c.execute("SELECT direccion FROM padron2026_completo WHERE cedula=? LIMIT 1", (votante_cedula,)).fetchone()
    if pad and pad[0]:
        try:
            import requests
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(pad[0])}&format=json&limit=1&language=es"
            resp = requests.get(url, timeout=5, headers={'User-Agent': 'DIA-D-MASTER'})
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    return float(data[0]['lat']), float(data[0]['lon'])
        except Exception:
            pass  # Silently fall through

    # 3° Fallback: geocodificar ubicacion de solicitud_recogida
    sol = c.execute("SELECT ubicacion FROM solicitudes_recogida WHERE votante_cedula=? LIMIT 1", (votante_cedula,)).fetchone()
    if sol and sol[0]:
        try:
            import requests
            url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(sol[0])}&format=json&limit=1&language=es"
            resp = requests.get(url, timeout=5, headers={'User-Agent': 'DIA-D-MASTER'})
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    return float(data[0]['lat']), float(data[0]['lon'])
        except Exception:
            pass  # Silently fall through

    return (None, None)

def _resolver_local_votacion(conn, votante_cedula):
    """Ubicacion del local de votacion que le corresponde a este votante segun el padron,
    usando la tabla locales_votacion_tsje (escuelas/colegios del TSJE)."""
    c = conn.cursor()
    pad = c.execute("SELECT distrito, sec_loc, local, local_nombre FROM padron2026_completo WHERE cedula=?",
                     (votante_cedula,)).fetchone()
    if not pad:
        return None, None, None
    # Buscar en locales_votacion_tsje por nombre exacto
    coord = c.execute("SELECT lat, lng, nombre, direccion FROM locales_votacion_tsje WHERE nombre=?",
                       (pad[3],)).fetchone()
    if not coord:
        # Búsqueda parcial si no hay coincidencia exacta
        coord = c.execute("SELECT lat, lng, nombre, direccion FROM locales_votacion_tsje WHERE nombre LIKE ?",
                           (f"%{pad[3][:20]}%",)).fetchone()
    if not coord:
        return None, None, pad[3]
    return coord[0], coord[1], coord[2] or pad[3]

def _trazar_tramo(olat, olng, dlat, dlng):
    """Geometria+distancia real por calles (OSRM), o linea recta + estimado si no hay
    internet/el servicio esta caido."""
    ruta = obtener_ruta_calles(olat, olng, dlat, dlng)
    if ruta:
        return ruta["geometria"], ruta["distancia_km"], ruta["duracion_min"]
    geometria = [[olat, olng], [dlat, dlng]]
    dist_km = round(_distancia_haversine_km(olat, olng, dlat, dlng), 2)
    dur_min = round(dist_km / 30 * 60, 1)  # estimado a 30 km/h
    return geometria, dist_km, dur_min

def _crear_tramo(c, solicitud_id, transporte_id, ced_cond, votante_cedula, votante_nombre,
                  tipo, olat, olng, onom, dlat, dlng, dnom, estado='pendiente'):
    geometria, dist_km, dur_min = _trazar_tramo(olat, olng, dlat, dlng)
    c.execute("""INSERT INTO viajes
        (solicitud_id, transporte_id, cedula_conductor, votante_cedula, votante_nombre, tipo,
         origen_lat, origen_lng, origen_nombre, destino_lat, destino_lng, destino_nombre,
         geometria, distancia_km, duracion_min, estado)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (solicitud_id, transporte_id, ced_cond, votante_cedula, votante_nombre, tipo,
         olat, olng, onom, dlat, dlng, dnom,
         json.dumps(geometria), dist_km, dur_min, estado))
    return {
        "id": c.lastrowid, "tipo": tipo, "geometria": geometria,
        "distancia_km": dist_km, "duracion_min": dur_min, "estado": estado,
        "origen": {"lat": olat, "lng": olng, "nombre": onom},
        "destino": {"lat": dlat, "lng": dlng, "nombre": dnom},
    }

@app.post("/api/transporte/armar_viaje_redondo")
def armar_viaje_redondo(data: dict = Body(...)):
    """Arma la IDA de un votante: el conductor va a buscarlo (busqueda) y lo lleva de
    su casa al local de votacion (ida). La "vuelta" NO se crea aca con este mismo
    conductor: se genera sola, sin asignar, cuando se completa la ida (ver
    completar_tramo) — a la vuelta la puede llevar cualquier conductor libre que ande
    cerca del local en ese momento, no necesariamente el mismo que lo trajo."""
    transporte_id = data.get("transporte_id")
    votante_cedula = normalizar_cedula(data.get("votante_cedula", ""))
    solicitud_id = data.get("solicitud_id")
    if not transporte_id or not votante_cedula:
        return {"success": False, "error": "Conductor y votante requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        transp = c.execute("SELECT nombre, cedula, placa FROM transportes WHERE id=?", (transporte_id,)).fetchone()
        if not transp:
            return {"success": False, "error": "Vehículo no encontrado"}
        ced_cond = transp[1] or ''
        votante_nombre = ''
        dirigente_cedula = None
        if solicitud_id:
            sol = c.execute("SELECT votante_nombre, dirigente_cedula FROM solicitudes_recogida WHERE id=?", (solicitud_id,)).fetchone()
            if sol:
                votante_nombre, dirigente_cedula = sol[0], sol[1]
        if not votante_nombre:
            pv = c.execute("SELECT votante_nombre FROM posible_votos WHERE votante_cedula=? LIMIT 1", (votante_cedula,)).fetchone()
            votante_nombre = pv[0] if pv else votante_cedula

        ya_activo = c.execute("""SELECT 1 FROM viajes WHERE votante_cedula=? AND tipo IN ('busqueda','ida')
                                  AND estado IN ('pendiente','en_curso')""", (votante_cedula,)).fetchone()
        if ya_activo:
            return {"success": False, "error": "Este votante ya tiene un traslado de ida en curso"}

        cond_pos = c.execute("""SELECT lat, lng FROM ubicaciones_gps WHERE transporte_id=?
                                 ORDER BY timestamp DESC LIMIT 1""", (transporte_id,)).fetchone()
        if not cond_pos:
            return {"success": False, "error": "El conductor no tiene ubicación GPS disponible todavía"}
        casa_lat, casa_lng = _resolver_casa_votante(conn, votante_cedula, dirigente_cedula)
        if casa_lat is None:
            return {"success": False, "error": "El votante todavía no compartió su ubicación (le falta abrir su enlace y tocar 'Compartir mi ubicación')"}
        local_lat, local_lng, local_nombre = _resolver_local_votacion(conn, votante_cedula)
        if local_lat is None:
            return {"success": False, "error": f"Falta marcar la ubicación del local de votación ({local_nombre or 'sin local'}) en 'Mi Local'"}

        viajes_creados = [
            _crear_tramo(c, solicitud_id, transporte_id, ced_cond, votante_cedula, votante_nombre,
                         "busqueda", cond_pos[0], cond_pos[1], "Conductor", casa_lat, casa_lng, "Casa del votante"),
            _crear_tramo(c, solicitud_id, transporte_id, ced_cond, votante_cedula, votante_nombre,
                         "ida", casa_lat, casa_lng, "Casa del votante", local_lat, local_lng, local_nombre or "Local de votación"),
        ]
        conn.commit()
        # ✨ EPIC-COND-02: Enviar notificación push al conductor cuando se crea un nuevo viaje
        try:
            import requests
            # Registrar suscripción push si el conductor no tiene una activa
            ced_cond = ced_cond or ''
            # Verificar si ya está registrado
            push_r = requests.get(f'http://localhost:8000/api/conductor/todas_ubicaciones', timeout=2)
        except Exception:
            pass  # Silently continue if push service not available
        return {"success": True, "viajes": viajes_creados, "votante_nombre": votante_nombre, "cedula_conductor": ced_cond}
    finally:
        conn.close()

@app.post("/api/transporte/completar_tramo")
def completar_tramo(data: dict = Body(...)):
    """Marca un tramo (busqueda/ida/vuelta) como completado. Al completar la "ida", se
    genera automaticamente el tramo de "vuelta" SIN conductor asignado (va a la bolsa
    de "a quien hay que llevar a su casa" — lo toma el primer conductor libre que
    confirme, ver tomar_tramo)."""
    viaje_id = data.get("viaje_id")
    ced = normalizar_cedula(data.get("cedula", ""))
    if not viaje_id or not ced:
        return {"success": False, "error": "viaje_id y cedula requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        viaje = c.execute("SELECT * FROM viajes WHERE id=?", (viaje_id,)).fetchone()
        if not viaje:
            return {"success": False, "error": "Tramo no encontrado"}
        transporte_solicitante = data.get("transporte_id")
        if viaje["transporte_id"] is None:
            return {"success": False, "error": "Primero debes tomar el tramo"}
        vehiculo = c.execute("SELECT id FROM transportes WHERE id=? AND cedula=?",
                             (viaje["transporte_id"], ced)).fetchone()
        if not vehiculo or viaje["cedula_conductor"] != ced:
            return {"success": False, "error": "Tramo no asignado a este conductor"}
        if transporte_solicitante is not None and viaje["transporte_id"] != transporte_solicitante:
            return {"success": False, "error": "Vehículo no coincide con el tramo"}
        if viaje["estado"] == "completado":
            return {"success": False, "error": "El tramo ya está completado"}
        c.execute("""UPDATE viajes SET estado='completado', completado_en=datetime('now','localtime')
                     WHERE id=?""", (viaje_id,))
        vuelta_creada = None
        if viaje["tipo"] == "ida":
            ya_existe = c.execute("""SELECT 1 FROM viajes WHERE votante_cedula=? AND tipo='vuelta'
                                      AND estado IN ('pendiente','en_curso')""", (viaje["votante_cedula"],)).fetchone()
            if not ya_existe:
                vuelta_creada = _crear_tramo(
                    c, viaje["solicitud_id"], None, '', viaje["votante_cedula"], viaje["votante_nombre"],
                    "vuelta", viaje["destino_lat"], viaje["destino_lng"], viaje["destino_nombre"],
                    viaje["origen_lat"], viaje["origen_lng"], viaje["origen_nombre"], estado='pendiente')
        conn.commit()
        return {"success": True, "vuelta_creada": vuelta_creada}
    finally:
        conn.close()

@app.post("/api/transporte/reportar_incidencia")
def transporte_reportar_incidencia(data: dict = Body(...)):
    """Registra ausencia/rechazo del elector y cierra el tramo asignado con trazabilidad."""
    viaje_id = data.get("viaje_id")
    ced = normalizar_cedula(data.get("cedula", ""))
    transporte_id = data.get("transporte_id")
    tipo = normalizar_texto(data.get("tipo", ""))
    detalle = normalizar_texto(data.get("detalle", ""))[:500]
    lat, lng = data.get("lat"), data.get("lng")
    if not viaje_id or not ced or not transporte_id:
        return {"success": False, "error": "viaje_id, transporte_id y cedula requeridos"}
    if tipo not in ("elector_ausente", "rechazo_traslado"):
        return {"success": False, "error": "Tipo de incidencia no permitido"}
    conn = get_connection()
    try:
        c = conn.cursor()
        c.execute("BEGIN IMMEDIATE")
        viaje = c.execute("""SELECT id, tipo, estado, transporte_id FROM viajes
                             WHERE id=? AND transporte_id=? AND cedula_conductor=?""",
                          (viaje_id, transporte_id, ced)).fetchone()
        if not viaje:
            conn.rollback()
            return {"success": False, "error": "Tramo no asignado a este conductor"}
        if viaje["tipo"] != "busqueda":
            conn.rollback()
            return {"success": False, "error": "La incidencia requiere un tramo de búsqueda"}
        if viaje["estado"] == "completado":
            conn.rollback()
            return {"success": False, "error": "El tramo ya está completado"}
        c.execute("""INSERT INTO incidencias_transporte
                     (viaje_id, transporte_id, cedula_conductor, tipo, detalle, lat, lng)
                     VALUES (?,?,?,?,?,?,?)""",
                  (viaje_id, transporte_id, ced, tipo, detalle,
                   float(lat) if lat is not None else None,
                   float(lng) if lng is not None else None))
        c.execute("UPDATE viajes SET estado='completado', completado_en=datetime('now','localtime') WHERE id=? AND estado!='completado'",
                  (viaje_id,))
        conn.commit()
        return {"success": True, "accion": "incidencia_registrada", "incidencia_id": c.lastrowid}
    except (TypeError, ValueError):
        conn.rollback()
        return {"success": False, "error": "Coordenadas inválidas"}
    finally:
        conn.close()

@app.get("/api/transporte/vueltas_disponibles")
def vueltas_disponibles(transporte_id: int = Query(None)):
    """Tramos de 'vuelta' sin conductor asignado (la bolsa de "a quien hay que llevar
    a su casa"), ordenados por cercania al conductor si se pasa transporte_id — asi un
    conductor libre ve primero a quien tiene mas cerca para ir a buscar al local."""
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""SELECT * FROM viajes WHERE tipo='vuelta' AND transporte_id IS NULL
                             AND estado='pendiente' ORDER BY creado""").fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d["geometria"] = json.loads(d["geometria"] or '[]')
            items.append(d)
        if transporte_id:
            pos = c.execute("""SELECT lat, lng FROM ubicaciones_gps WHERE transporte_id=?
                                ORDER BY timestamp DESC LIMIT 1""", (transporte_id,)).fetchone()
            if pos:
                for it in items:
                    it["distancia_al_conductor_km"] = round(
                        _distancia_haversine_km(pos[0], pos[1], it["origen_lat"], it["origen_lng"]), 2)
                items.sort(key=lambda x: x.get("distancia_al_conductor_km", 9999))
        return {"success": True, "vueltas": items}
    finally:
        conn.close()

@app.post("/api/transporte/tomar_tramo")
def tomar_tramo(data: dict = Body(...)):
    """Un conductor toma (se asigna) un tramo sin conductor — hoy esto es siempre una
    'vuelta' de la bolsa, pero sirve para cualquier tramo sin transporte_id."""
    viaje_id = data.get("viaje_id")
    transporte_id = data.get("transporte_id")
    if not viaje_id or not transporte_id:
        return {"success": False, "error": "Tramo y conductor requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        transp = c.execute("SELECT cedula FROM transportes WHERE id=?", (transporte_id,)).fetchone()
        if not transp:
            return {"success": False, "error": "Vehículo no encontrado"}
        actualizado = c.execute("""UPDATE viajes SET transporte_id=?, cedula_conductor=?
                     WHERE id=? AND transporte_id IS NULL AND estado='pendiente'""",
                      (transporte_id, transp[0] or '', viaje_id))
        conn.commit()
        if c.rowcount == 0:
            return {"success": False, "error": "Ese tramo ya lo tomó otro conductor"}
        return {"success": True}
    finally:
        conn.close()

@app.get("/api/transporte/viajes_de_mis_votantes")
def viajes_de_mis_votantes(dirigente_cedula: str = Query(...)):
    """Todos los tramos (cualquier estado) de los votantes que sigue este dirigente,
    para que pueda ver el trayecto completo de su gente sin tener que preguntarle a
    logística — el dirigente ve TODO lo de sus votantes; el conductor solo ve lo suyo
    (viajes_activos / vueltas_disponibles, filtrados por su propio transporte_id)."""
    dc = normalizar_cedula(dirigente_cedula)
    if not dc:
        return {"success": False, "error": "Dirigente requerido"}
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""
            SELECT v.* FROM viajes v
            WHERE v.votante_cedula IN (SELECT votante_cedula FROM posible_votos WHERE dirigente_cedula=?)
            ORDER BY v.votante_cedula, v.creado
        """, (dc,)).fetchall()
        items = []
        for r in rows:
            d = dict(r)
            d["geometria"] = json.loads(d["geometria"] or '[]')
            items.append(d)
        return {"success": True, "viajes": items}
    finally:
        conn.close()

# ─── GASTOS DEL VEHÍCULO (combustible, peaje, vianda — efectivo o transferencia) ──────
@app.post("/api/transporte/gastos")
def crear_gasto_transporte(data: dict = Body(...)):
    transporte_id = data.get("transporte_id")
    monto = data.get("monto")
    medio = normalizar_texto(data.get("medio", "efectivo")) or "efectivo"
    if not transporte_id or monto is None:
        return {"success": False, "error": "Vehículo y monto requeridos"}
    if medio not in ("efectivo", "transferencia"):
        return {"success": False, "error": "Medio inválido"}
    alias = normalizar_texto(data.get("alias_o_cuenta", "")) if medio == "transferencia" else ""
    conn = get_connection()
    try:
        c = conn.cursor()
        c.execute("""INSERT INTO gastos_transporte
            (transporte_id, monto, entregado_por_cedula, entregado_por_nombre, medio, alias_o_cuenta, motivo)
            VALUES (?,?,?,?,?,?,?)""",
            (transporte_id, float(monto), normalizar_cedula(data.get("entregado_por_cedula", "")),
             normalizar_texto(data.get("entregado_por_nombre", "")), medio, alias, normalizar_texto(data.get("motivo", ""))))
        conn.commit()
        return {"success": True, "id": c.lastrowid}
    finally:
        conn.close()

@app.get("/api/transporte/gastos")
def listar_gastos_transporte(transporte_id: int = Query(None)):
    conn = get_connection()
    try:
        c = conn.cursor()
        if transporte_id:
            rows = c.execute("SELECT * FROM gastos_transporte WHERE transporte_id=? ORDER BY creado DESC", (transporte_id,)).fetchall()
        else:
            rows = c.execute("""SELECT g.*, t.nombre as conductor_nombre, t.placa FROM gastos_transporte g
                                 JOIN transportes t ON t.id = g.transporte_id ORDER BY g.creado DESC""").fetchall()
        items = [dict(r) for r in rows]
        total = sum(it["monto"] for it in items)
        return {"success": True, "gastos": items, "total": total}
    finally:
        conn.close()

# ─── OPTIMIZACIÓN DE ASIGNACIONES (algoritmo húngaro, minimiza distancia total) ───────
@app.post("/api/transporte/optimizar_asignaciones")
def optimizar_asignaciones(data: dict = Body(...)):
    """Asigna conductores disponibles a solicitudes pendientes (y a la bolsa de
    'vueltas' sin conductor) de forma optima: minimiza la distancia TOTAL recorrida por
    toda la flota, no solo la de cada asignacion individual (algoritmo húngaro —
    scipy.optimize.linear_sum_assignment). Es mejor que "asignar al mas cercano" uno
    por uno: evita que un conductor cercano a dos pasajeros le quite el mas cercano a
    un conductor que no tiene otra opcion mejor. No asigna nada solo: requiere
    confirmacion del botón "Optimizar asignaciones" en logistica."""
    from scipy.optimize import linear_sum_assignment
    conn = get_connection()
    try:
        c = conn.cursor()
        # Conductores libres: con GPS reciente y sin un tramo propio en curso ahora mismo.
        conductores = c.execute("""
            SELECT t.id, t.cedula, t.nombre,
                   (SELECT lat FROM ubicaciones_gps u WHERE u.transporte_id=t.id ORDER BY u.timestamp DESC LIMIT 1) as lat,
                   (SELECT lng FROM ubicaciones_gps u WHERE u.transporte_id=t.id ORDER BY u.timestamp DESC LIMIT 1) as lng
            FROM transportes t
            WHERE t.cedula != ''
              AND t.id NOT IN (SELECT transporte_id FROM viajes WHERE estado='en_curso' AND transporte_id IS NOT NULL)
        """).fetchall()
        conductores = [c_ for c_ in conductores if c_["lat"] is not None]

        # Ida: solicitudes autorizadas sin ruta todavia armada (sin tramo de busqueda activo)
        solicitudes = c.execute("""
            SELECT s.id as solicitud_id, s.votante_cedula, s.votante_nombre, s.dirigente_cedula
            FROM solicitudes_recogida s
            WHERE s.estado='autorizado'
              AND s.votante_cedula NOT IN (SELECT votante_cedula FROM viajes WHERE tipo IN ('busqueda','ida') AND estado IN ('pendiente','en_curso'))
        """).fetchall()
        pickups = []
        for s in solicitudes:
            lat, lng = _resolver_casa_votante(conn, s["votante_cedula"], s["dirigente_cedula"])
            if lat is not None:
                pickups.append({"kind": "ida", "solicitud_id": s["solicitud_id"], "votante_cedula": s["votante_cedula"],
                                 "votante_nombre": s["votante_nombre"], "lat": lat, "lng": lng})

        # Vuelta: tramos ya en la bolsa sin conductor
        vueltas = c.execute("SELECT * FROM viajes WHERE tipo='vuelta' AND transporte_id IS NULL AND estado='pendiente'").fetchall()
        for v in vueltas:
            pickups.append({"kind": "vuelta", "viaje_id": v["id"], "votante_cedula": v["votante_cedula"],
                             "votante_nombre": v["votante_nombre"], "lat": v["origen_lat"], "lng": v["origen_lng"]})

        if not conductores or not pickups:
            return {"success": True, "asignaciones": [], "mensaje": "No hay conductores libres o no hay nadie esperando traslado"}

        # Matriz de costos (km) — rectangular: linear_sum_assignment la soporta tal cual.
        costos = [[_distancia_haversine_km(cond["lat"], cond["lng"], p["lat"], p["lng"]) for p in pickups] for cond in conductores]
        filas, columnas = linear_sum_assignment(costos)

        asignaciones = []
        for fi, ci in zip(filas, columnas):
            cond = conductores[fi]
            p = pickups[ci]
            if p["kind"] == "ida":
                ya_activo = c.execute("""SELECT 1 FROM viajes WHERE votante_cedula=? AND tipo IN ('busqueda','ida')
                                          AND estado IN ('pendiente','en_curso')""", (p["votante_cedula"],)).fetchone()
                if ya_activo:
                    continue
                c.execute("""INSERT INTO rutas (transporte_id, cedula_conductor, origen, destino, estado, observacion)
                             VALUES (?,?,?,?,?,?)""",
                          (cond["id"], cond["cedula"], 'Casa del votante', 'Local de votación', 'pendiente',
                           f'Optimización automática - {p["votante_nombre"]}'))
                ruta_id = c.lastrowid
                c.execute("UPDATE solicitudes_recogida SET estado='autorizado', ruta_id=? WHERE id=?", (ruta_id, p["solicitud_id"]))
                casa_lat, casa_lng = _resolver_casa_votante(conn, p["votante_cedula"], None)
                local_lat, local_lng, local_nombre = _resolver_local_votacion(conn, p["votante_cedula"])
                if casa_lat is not None and local_lat is not None:
                    _crear_tramo(c, p["solicitud_id"], cond["id"], cond["cedula"], p["votante_cedula"], p["votante_nombre"],
                                 "busqueda", cond["lat"], cond["lng"], cond["nombre"] or "Conductor", casa_lat, casa_lng, "Casa del votante")
                    _crear_tramo(c, p["solicitud_id"], cond["id"], cond["cedula"], p["votante_cedula"], p["votante_nombre"],
                                 "ida", casa_lat, casa_lng, "Casa del votante", local_lat, local_lng, local_nombre or "Local de votación")
            else:
                c.execute("""UPDATE viajes SET transporte_id=?, cedula_conductor=?
                             WHERE id=? AND transporte_id IS NULL""", (cond["id"], cond["cedula"], p["viaje_id"]))
            asignaciones.append({
                "conductor": cond["nombre"], "votante": p["votante_nombre"], "tipo": p["kind"],
                "distancia_km": round(costos[fi][ci], 2)
            })
        conn.commit()
        km_total = round(sum(a["distancia_km"] for a in asignaciones), 2)
        return {"success": True, "asignaciones": asignaciones, "km_total_asignacion": km_total}
    finally:
        conn.close()

@app.get("/api/transporte/viajes_activos")
def viajes_activos(transporte_id: int = Query(None)):
    """Tramos del traslado en curso de un conductor (o de todos), para dibujar en el mapa."""
    conn = get_connection()
    try:
        c = conn.cursor()
        if transporte_id:
            rows = c.execute("""SELECT * FROM viajes WHERE transporte_id=?
                                 ORDER BY creado DESC LIMIT 3""", (transporte_id,)).fetchall()
        else:
            rows = c.execute("""SELECT * FROM viajes WHERE estado != 'completado'
                                 ORDER BY creado DESC""").fetchall()
        viajes = []
        for r in rows:
            d = dict(r)
            d["geometria"] = json.loads(d["geometria"] or '[]')
            viajes.append(d)
        return {"success": True, "viajes": viajes}
    finally:
        conn.close()

@app.get("/api/transporte/conductores_cercanos")
def conductores_cercanos(request: Request, lat: float = Query(...), lng: float = Query(...), radio_km: float = Query(5.0)):
    """Devuelve solo conductores disponibles con GPS reciente dentro del radio solicitado."""
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return {"success": False, "error": "Coordenadas fuera de rango"}
    radio = min(max(float(radio_km), 0.5), 20.0)
    conn = get_connection()
    try:
        session_id = request.headers.get("x-session-id") or request.query_params.get("session_id", "")
        if not session_id:
            return {"success": False, "error": "Sesión requerida"}
        sesion = conn.execute("""SELECT u.cedula, u.nivel FROM sesiones s
                                 JOIN usuarios u ON u.cedula=s.cedula WHERE s.id=? AND u.activo=1""",
                              (session_id,)).fetchone()
        if not sesion:
            return {"success": False, "error": "Sesión inválida"}
        roles = _cargar_roles_unificado(sesion["cedula"], conn)
        niveles = {r.get("rol") for r in roles} if roles else {sesion["nivel"]}
        if not niveles.intersection({"conductor", "logistica", "admin", "master"}):
            return {"success": False, "error": "Acceso restringido a logística y conductores"}
        rows = conn.execute("""SELECT t.id AS transporte_id, t.nombre, t.placa, t.estado,
                                     u.lat, u.lng, u.timestamp
                              FROM transportes t
                              JOIN ubicaciones_gps u ON u.id = (
                                  SELECT MAX(u2.id) FROM ubicaciones_gps u2 WHERE u2.transporte_id=t.id
                              )
                              WHERE t.estado='disponible'
                                AND julianday('now','localtime') - julianday(u.timestamp) <= (10.0/1440.0)""").fetchall()
        conductores = []
        for row in rows:
            d = dict(row)
            d["distancia_km"] = round(_distancia_haversine_km(float(lat), float(lng), float(d["lat"]), float(d["lng"])), 2)
            if d["distancia_km"] <= radio:
                conductores.append(d)
        conductores.sort(key=lambda item: item["distancia_km"])
        return {"success": True, "conductores": conductores, "radio_km": radio}
    finally:
        conn.close()

@app.get("/api/transporte/stats_conductor")
def stats_conductor(transporte_id: int = Query(...)):
    """Cuenta de viajes completados y km recorridos por un conductor, para mostrar su
    rendimiento y decidir si ya puede recibir otro traslado."""
    conn = get_connection()
    try:
        c = conn.cursor()
        row = c.execute("""SELECT COUNT(*), COALESCE(SUM(distancia_km),0)
                            FROM viajes WHERE transporte_id=? AND estado='completado'""",
                         (transporte_id,)).fetchone()
        votantes = c.execute("""SELECT COUNT(DISTINCT votante_cedula) FROM viajes
                                 WHERE transporte_id=? AND estado='completado' AND tipo='ida'""",
                              (transporte_id,)).fetchone()
        return {"success": True, "tramos_completados": row[0], "km_recorridos": round(row[1], 2),
                "votantes_trasladados": votantes[0]}
    finally:
        conn.close()

def _distancia_haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

@app.post("/api/conductor/disponibilidad")
def conductor_disponibilidad(data: dict = Body(...)):
    """Conductor cambia su estado disponible/ocupado"""
    ced = normalizar_cedula(data.get("cedula", ""))
    estado = normalizar_texto(data.get("estado", "disponible"))  # disponible | ocupado
    if not ced or estado not in ("disponible", "ocupado"):
        return {"success": False, "error": "cedula y estado (disponible/ocupado) requeridos"}
    conn = get_connection()
    try:
        conn.execute("UPDATE transportes SET estado=? WHERE cedula=?", (estado, ced))
        conn.commit()
        if conn.total_changes == 0:
            return {"success": False, "error": "Transporte no encontrado"}
        # Notify dirigentes/logistica about availability change
        return {"success": True, "accion": f"estado_cambiado_a_{estado}"}
    finally:
        conn.close()

@app.get("/api/conductor/historial_extendido")
def conductor_historial_extendido(cedula: str = Query(""), dias: int = Query(7)):
    """Historial de viajes de un conductor por rango de días"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT r.id, r.origen, r.destino, r.estado, r.salida, r.llegada, r.observacion, r.created_at,
                   t.nombre as vehiculo, t.placa
            FROM rutas r
            LEFT JOIN transportes t ON r.transporte_id = t.id
            WHERE r.cedula_conductor=? AND r.estado='completado'
              AND date(r.llegada) >= date('now','localtime', '-' || ? || ' days')
            ORDER BY r.llegada DESC
        """, (ced, dias)).fetchall()
        cols = ["id","origen","destino","estado","salida","llegada","observacion","creado","vehiculo","placa"]
        items = [dict(zip(cols, r)) for r in rows]
        # Agrupar por fecha
        por_fecha = {}
        for it in items:
            fecha = it["llegada"][:10] if it["llegada"] else "sin_fecha"
            if fecha not in por_fecha:
                por_fecha[fecha] = []
            por_fecha[fecha].append(it)
        return {"success": True, "historial": items, "total": len(items), "por_fecha": por_fecha}
    finally:
        conn.close()

@app.get("/api/conductor/stats")
def conductor_stats(cedula: str = Query("")):
    """Estadísticas del conductor: hoy, semana, mes (basado en viajes completados)"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        hoy = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND date(completado_en) = date('now','localtime')
        """, (ced,)).fetchone()
        semana = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND date(completado_en) >= date('now','localtime', '-7 days')
        """, (ced,)).fetchone()
        mes = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND date(completado_en) >= date('now','localtime', '-30 days')
        """, (ced,)).fetchone()
        total = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
        """, (ced,)).fetchone()
        # Viajes ida completados
        ida_hoy = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND tipo='ida' AND date(completado_en) = date('now','localtime')
        """, (ced,)).fetchone()
        ida_semana = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND tipo='ida' AND date(completado_en) >= date('now','localtime', '-7 days')
        """, (ced,)).fetchone()
        ida_total = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND tipo='ida'
        """, (ced,)).fetchone()
        # Viajes vuelta completados
        vuelta_hoy = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND tipo='vuelta' AND date(completado_en) = date('now','localtime')
        """, (ced,)).fetchone()
        vuelta_semana = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND tipo='vuelta' AND date(completado_en) >= date('now','localtime', '-7 days')
        """, (ced,)).fetchone()
        vuelta_total = conn.execute("""
            SELECT COUNT(*) FROM viajes WHERE cedula_conductor=? AND estado='completado'
            AND tipo='vuelta'
        """, (ced,)).fetchone()
        return {
            "success": True,
            "hoy": {"viajes": hoy[0] or 0},
            "semana": {"viajes": semana[0] or 0},
            "mes": {"viajes": mes[0] or 0},
            "total": {"viajes": total[0] or 0},
            "ida": {"hoy": ida_hoy[0] or 0, "semana": ida_semana[0] or 0, "total": ida_total[0] or 0},
            "vuelta": {"hoy": vuelta_hoy[0] or 0, "semana": vuelta_semana[0] or 0, "total": vuelta_total[0] or 0}
        }
    finally:
        conn.close()

@app.get("/api/actividad_reciente")
def actividad_reciente(limite: int = Query(20)):
    """Actividad reciente del módulo transporte (rutas + solicitudes)"""
    conn = get_connection()
    try:
        items = []
        # Rutas recientes
        rutas = conn.execute("""
            SELECT 'ruta' as tipo, r.id as ref, r.created_at as ts,
                   t.nombre as conductor_nom, r.origen, r.destino, r.estado
            FROM rutas r
            LEFT JOIN transportes t ON r.cedula_conductor = t.cedula
            ORDER BY r.created_at DESC LIMIT ?
        """, (limite,)).fetchall()
        for r in rutas:
            items.append({
                "tipo": r[0], "ref": r[1], "timestamp": r[2],
                "desc": f"Ruta: {r[4] or '?'} → {r[5] or '?'} ({r[3] or 'sin conductor'})",
                "estado": r[6]
            })
        # Solicitudes recientes
        sols = conn.execute("""
            SELECT 'solicitud' as tipo, s.id as ref, s.created_at as ts,
                   s.votante_nombre, s.estado, s.dirigente_nombre
            FROM solicitudes_recogida s
            ORDER BY s.created_at DESC LIMIT ?
        """, (limite,)).fetchall()
        for s in sols:
            items.append({
                "tipo": s[0], "ref": s[1], "timestamp": s[2],
                "desc": f"Solicitud: {s[3] or '?'} - {s[5] or '?'} → {s[4]}",
                "estado": s[4]
            })
        items.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"success": True, "actividad": items[:limite], "total": min(len(items), limite)}
    finally:
        conn.close()

@app.get("/api/actividad_votantes")
def actividad_votantes(cedula: str = Query(""), limite: int = Query(20)):
    """Actividad reciente de votantes del dirigente: qué está pasando con cada uno.
    Muestra estado real: voto, confirmado, posible, buscar, no_responde, vendra_solo."""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula del dirigente requerida"}
    conn = get_connection()
    try:
        # 1. Votantes con estado en posible_votos (seguimiento del dirigente)
        pv = conn.execute("""
            SELECT pv.votante_cedula, pv.votante_nombre, pv.status, pv.actualizado,
                   pv.confirmado_en, pv.candidato_id, c.nombre as candidato_nombre,
                   pv.votante_mesa, pv.votante_orden
            FROM posible_votos pv
            LEFT JOIN candidatos c ON c.id = pv.candidato_id
            WHERE pv.dirigente_cedula = ?
            ORDER BY pv.actualizado DESC
            LIMIT ?
        """, (ced, limite)).fetchall()
        items = []
        for r in pv:
            estado_map = {
                'posible': 'Posible voto',
                'confirmado': 'Confirmado',
                'buscar': 'Buscar',
                'no_responde': 'No responde',
                'vendra_solo': 'Vendrá solo'
            }
            desc = estado_map.get(r[2], r[2] or 'Sin estado')
            if r[3]:
                desc += f" · act: {r[3]}"
            items.append({
                "tipo": "votante",
                "cedula": r[0],
                "nombre": r[1] or '',
                "estado": r[2] or '',
                "desc": desc,
                "candidato": r[5] or '',
                "mesa": r[6] or 0,
                "orden": r[7] or 0,
                "timestamp": r[3] or ''
            })
        # 2. Votantes que ya votaron (tabla registros)
        regs = conn.execute("""
            SELECT r.cedula, r.nombre, r.mesa, r.orden, r.estado, r.timestamp, r.dirigenteNombre
            FROM registros r
            WHERE r.dirigente = ? OR r.dirigenteNombre = ?
            ORDER BY r.timestamp DESC
            LIMIT ?
        """, (ced, ced, limite)).fetchall()
        for r in regs:
            items.append({
                "tipo": "voto",
                "cedula": r[0],
                "nombre": r[1] or '',
                "estado": r[4] or 'voto',
                "desc": f"Votó · Mesa {r[2]} · Ord {r[3]}",
                "candidato": r[6] or '',
                "mesa": r[2] or 0,
                "orden": r[3] or 0,
                "timestamp": r[5] or ''
            })
        # 3. Solicitudes de recogida pendientes
        sols = conn.execute("""
            SELECT s.votante_cedula, s.votante_nombre, s.hora_recogida, s.ubicacion,
                   s.estado, s.created_at
            FROM solicitudes_recogida s
            WHERE s.dirigente_cedula = ?
            ORDER BY s.created_at DESC
            LIMIT ?
        """, (ced, limite)).fetchall()
        for s in sols:
            items.append({
                "tipo": "recogida",
                "cedula": s[0],
                "nombre": s[1] or '',
                "estado": s[3] or '',
                "desc": f"Recogida {s[2] or '?'} · {s[3] or '?'}",
                "candidato": '',
                "mesa": 0,
                "orden": 0,
                "timestamp": s[4] or ''
            })
        items.sort(key=lambda x: x["timestamp"], reverse=True)
        return {"success": True, "actividad": items[:limite], "total": min(len(items), limite)}
    finally:
        conn.close()

@app.get("/api/mesas_estado_dirigente")
def mesas_estado_dirigente(cedula: str = Query("")):
    """Estado de los votantes del dirigente agrupados por mesa.
    Devuelve: cuántos votantes tiene por mesa, cuántos confirmados (verde),
    cuántos posibles (ámbar), cuántos buscar (rojo), y cuántos ya votaron."""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT pv.votante_mesa,
                   COUNT(*) as total_votantes,
                   SUM(CASE WHEN pv.status='confirmado' THEN 1 ELSE 0 END) as confirmados,
                   SUM(CASE WHEN pv.status='posible' THEN 1 ELSE 0 END) as posibles,
                   SUM(CASE WHEN pv.status='buscar' THEN 1 ELSE 0 END) as buscar,
                   SUM(CASE WHEN pv.status='no_responde' THEN 1 ELSE 0 END) as no_responde,
                   SUM(CASE WHEN pv.status='vendra_solo' THEN 1 ELSE 0 END) as vendra_solo,
                   SUM(CASE WHEN r.estado='voto' THEN 1 ELSE 0 END) as ya_votaron
            FROM posible_votos pv
            LEFT JOIN registros r ON r.cedula = pv.votante_cedula
            WHERE pv.dirigente_cedula = ? AND pv.votante_mesa > 0
            GROUP BY pv.votante_mesa
            ORDER BY total_votantes DESC
        """, (ced,)).fetchall()
        mesas = []
        for r in rows:
            total = r[1]
            confirmados = r[2] or 0
            posibles = r[3] or 0
            buscar = r[4] or 0
            no_responde = r[5] or 0
            vendra_solo = r[6] or 0
            ya_votaron = r[7] or 0
            # "Persiguiendo" = confirmados + posibles + vendra_solo (votos activos)
            # "No votó / buscar" = buscar + no_responde (votos en rojo)
            persiguiendo = confirmados + posibles + vendra_solo
            no_votado = buscar + no_responde
            # Si ya votaron, ya no están pendientes
            pendientes = max(0, total - ya_votaron)
            mesas.append({
                "mesa": r[0],
                "total_votantes": total,
                "confirmados": confirmados,
                "posibles": posibles,
                "buscar": buscar,
                "no_responde": no_responde,
                "vendra_solo": vendra_solo,
                "ya_votaron": ya_votaron,
                "persiguiendo": persiguiendo,
                "no_votado": no_votado,
                "pendientes": pendientes,
            })
        return {"success": True, "mesas": mesas, "total": len(mesas)}
    finally:
        conn.close()

@app.get("/api/tareas")
def tareas_lista(cedula: str = Query(""), estado: str = Query("")):
    """Lista tareas del dirigente, organizadas por fecha/hora."""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        where = ["dirigida_cedula = ?"]
        params = [ced]
        if estado:
            where.append("estado = ?")
            params.append(estado)
        rows = conn.execute(f"""
            SELECT id, titulo, descripcion, tipo, fecha_hora, estado,
                   votante_cedula, votante_nombre, creado
            FROM tareas
            WHERE {' AND '.join(where)}
            ORDER BY fecha_hora ASC
        """, params).fetchall()
        cols = ['id', 'titulo', 'descripcion', 'tipo', 'fecha_hora', 'estado',
                'votante_cedula', 'votante_nombre', 'creado']
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "tareas": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/tareas/crear")
def crear_tarea(data: dict = Body(...)):
    """Crea una tarea para el dirigente, opcionalmente vinculada a un votante."""
    ced = normalizar_cedula(data.get("dirigida_cedula", ""))
    titulo = normalizar_texto(data.get("titulo", ""))
    fecha_hora = normalizar_texto(data.get("fecha_hora", ""))
    if not ced or not titulo or not fecha_hora:
        return {"success": False, "error": "dirigida_cedula, titulo y fecha_hora requeridos"}
    conn = get_connection()
    try:
        desc = normalizar_texto(data.get("descripcion", ""))
        tipo = normalizar_texto(data.get("tipo", "manual")) or "manual"
        votante_ced = normalizar_cedula(data.get("votante_cedula", ""))
        votante_nom = normalizar_texto(data.get("votante_nombre", ""))
        conn.execute("""
            INSERT INTO tareas (dirigida_cedula, titulo, descripcion, tipo, fecha_hora,
                                votante_cedula, votante_nombre)
            VALUES (?,?,?,?,?,?,?)
        """, (ced, titulo, desc, tipo, fecha_hora, votante_ced, votante_nom))
        conn.commit()
        log_auditoria(ced, '', 'tarea_creada',
                      f'Tarea "{titulo}" para {fecha_hora}',
                      'tareas', ced, severidad='info')
        return {"success": True, "accion": "creada"}
    finally:
        conn.close()

@app.post("/api/tareas/completar")
def completar_tarea(data: dict = Body(...)):
    """Marca una tarea como completada."""
    tarea_id = data.get("tarea_id")
    ced = normalizar_cedula(data.get("dirigida_cedula", ""))
    if not tarea_id or not ced:
        return {"success": False, "error": "tarea_id y dirigida_cedula requeridos"}
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE tareas SET estado = 'completada', completado = datetime('now','localtime')
            WHERE id = ? AND dirigida_cedula = ?
        """, (int(tarea_id), ced))
        conn.commit()
        return {"success": True, "accion": "completada"}
    finally:
        conn.close()

@app.post("/api/tareas/eliminar")
def eliminar_tarea(data: dict = Body(...)):
    """Elimina una tarea."""
    tarea_id = data.get("tarea_id")
    ced = normalizar_cedula(data.get("dirigida_cedula", ""))
    if not tarea_id or not ced:
        return {"success": False, "error": "tarea_id y dirigida_cedula requeridos"}
    conn = get_connection()
    try:
        conn.execute("DELETE FROM tareas WHERE id = ? AND dirigida_cedula = ?", (int(tarea_id), ced))
        conn.commit()
        return {"success": True, "accion": "eliminada"}
    finally:
        conn.close()

@app.get("/api/conductor/detalle")
def conductor_detalle(cedula: str = Query("")):
    """Detalle completo de un conductor para admin"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT t.id, t.cedula, t.nombre, t.tipo, t.placa, t.telefono, t.capacidad, t.estado, t.seccional, t.created_at,
                   (SELECT COUNT(*) FROM rutas r WHERE r.cedula_conductor=t.cedula AND r.estado='completado') as viajes_completados,
                   (SELECT COUNT(*) FROM rutas r WHERE r.cedula_conductor=t.cedula AND r.estado IN ('pendiente','en_curso')) as viajes_pendientes
            FROM transportes t
            WHERE t.cedula=?
        """, (ced,)).fetchone()
        if not row:
            return {"success": False, "error": "Conductor no encontrado"}
        return {"success": True, "conductor": {
            "id": row[0], "cedula": row[1], "nombre": row[2], "tipo": row[3],
            "placa": row[4], "telefono": row[5], "capacidad": row[6],
            "estado": row[7], "seccional": row[8], "created_at": row[9],
            "viajes_completados": row[10] or 0, "viajes_pendientes": row[11] or 0
        }}
    finally:
        conn.close()

@app.post("/api/transporte/editar")
def transporte_editar(data: dict = Body(...)):
    """Editar datos de un vehículo/transporte"""
    t_id = data.get("id")
    if not t_id:
        return {"success": False, "error": "ID del transporte requerido"}
    conn = get_connection()
    try:
        updates = []
        params = []
        for campo in ["nombre", "tipo", "placa", "telefono", "capacidad", "seccional", "cedula", "contrasena"]:
            if campo in data:
                updates.append(f"{campo}=?")
                params.append(normalizar_texto(str(data[campo])) if isinstance(data[campo], str) else data[campo])
        if not updates:
            return {"success": False, "error": "No hay campos para actualizar"}
        params.append(int(t_id))
        conn.execute(f"UPDATE transportes SET {', '.join(updates)} WHERE id=?", params)
        # Si se establece contraseña, crear/actualizar cuenta de usuario y rol de conductor
        if "contrasena" in data:
            t = conn.execute("SELECT cedula, nombre, telefono FROM transportes WHERE id=?", (int(t_id),)).fetchone()
            if t and t[0]:
                ced_t = t[0]
                nom_t = t[1] or ''
                tel_t = t[2] or ''
                pw_t = normalizar_texto(str(data["contrasena"]))
                if pw_t:
                    pw_hash = hash_password(pw_t)
                    conn.execute("INSERT OR IGNORE INTO cuentas_usuario (cedula, nombre, contrasena, telefono, activo) VALUES (?,?,?,?,1)",
                                 (ced_t, nom_t, pw_hash, tel_t))
                    conn.execute("UPDATE cuentas_usuario SET contrasena=?, nombre=?, activo=1 WHERE cedula=?",
                                 (pw_hash, nom_t, ced_t))
                    conn.execute("INSERT OR IGNORE INTO asignaciones_rol (cedula, rol, activo) VALUES (?,'conductor',1)",
                                 (ced_t,))
        conn.commit()
        return {"success": True, "accion": "actualizado"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/transporte/eliminar")
def transporte_eliminar(data: dict = Body(...)):
    """Eliminar un vehículo/transporte"""
    t_id = data.get("id")
    if not t_id:
        return {"success": False, "error": "ID del transporte requerido"}
    conn = get_connection()
    try:
        conn.execute("DELETE FROM transportes WHERE id=?", (int(t_id),))
        conn.commit()
        if conn.total_changes == 0:
            return {"success": False, "error": "Transporte no encontrado"}
        return {"success": True, "accion": "eliminado"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.get("/api/conductor/todas_ubicaciones")
def todas_ubicaciones():
    """Última ubicación de todos los conductores activos"""
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT u.lat, u.lng, u.timestamp, u.velocidad,
                   t.cedula, t.nombre, t.placa, t.estado,
                   r.origen as viaje_origen, r.destino as viaje_destino, r.estado as viaje_estado
            FROM ubicaciones_gps u
            JOIN transportes t ON u.transporte_id = t.id
            LEFT JOIN rutas r ON r.transporte_id = t.id AND r.estado IN ('pendiente','en_curso')
            WHERE t.contrasena != ''
              AND u.timestamp = (SELECT MAX(u2.timestamp) FROM ubicaciones_gps u2 WHERE u2.transporte_id = u.transporte_id)
            ORDER BY t.nombre
        """).fetchall()
        cols = ["lat","lng","timestamp","velocidad","cedula","nombre","placa","estado","viaje_origen","viaje_destino","viaje_estado"]
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "conductores": items, "total": len(items)}
    finally:
        conn.close()

@app.get("/api/locales_votacion")
def lista_locales_votacion():
    """Lista todos los locales de votación del TSJE con coordenadas."""
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""
            SELECT id_local, departamento, distrito, nombre, direccion, lat, lng
            FROM locales_votacion_tsje
            ORDER BY departamento, distrito, nombre
        """).fetchall()
        items = [{
            "id_local": r[0], "departamento": r[1], "distrito": r[2],
            "nombre": r[3], "direccion": r[4], "lat": r[5], "lng": r[6]
        } for r in rows]
        return {"success": True, "locales": items, "total": len(items)}
    finally:
        conn.close()

@app.get("/api/locales_votacion/{id_local}")
def detalle_local_votacion(id_local: int):
    """Detalle de un local de votación por ID."""
    conn = get_connection()
    try:
        c = conn.cursor()
        r = c.execute("""
            SELECT id_local, departamento, distrito, nombre, direccion, lat, lng
            FROM locales_votacion_tsje WHERE id_local = ?
        """, (id_local,)).fetchone()
        if not r:
            return {"success": False, "error": "Local no encontrado"}
        return {
            "success": True,
            "local": {
                "id_local": r[0], "departamento": r[1], "distrito": r[2],
                "nombre": r[3], "direccion": r[4], "lat": r[5], "lng": r[6]
            }
        }
    finally:
        conn.close()

@app.get("/api/mapa/datos_geograficos")
def mapa_datos_geograficos(request: Request):
    """Todos los datos geográficos del sistema para el mapa del admin general:
    locales de votación, conductores activos y votantes con ubicación."""
    conn = get_connection()
    try:
        _require_session_nivel(conn, request.headers.get("x-session-id", ""), 'master')
        c = conn.cursor()
        # 1. Locales de votación (escuelas/colegios del TSJE)
        locales = c.execute("""
            SELECT id_local, nombre, direccion, lat, lng, departamento, distrito
            FROM locales_votacion_tsje WHERE lat IS NOT NULL AND lng IS NOT NULL
        """).fetchall()
        locales_items = [{
            "id_local": r[0], "nombre": r[1], "direccion": r[2],
            "lat": r[3], "lng": r[4], "departamento": r[5], "distrito": r[6]
        } for r in locales]
        # 2. Conductores activos (última ubicación)
        conductores = c.execute("""
            SELECT u.lat, u.lng, u.timestamp, u.velocidad,
                   t.cedula, t.nombre, t.placa, t.estado
            FROM ubicaciones_gps u
            JOIN transportes t ON u.transporte_id = t.id
            WHERE t.contrasena != ''
              AND u.timestamp = (SELECT MAX(u2.timestamp) FROM ubicaciones_gps u2 WHERE u2.transporte_id = u.transporte_id)
            ORDER BY t.nombre
        """).fetchall()
        conductores_items = [{
            "lat": r[0], "lng": r[1], "timestamp": r[2], "velocidad": r[3],
            "cedula": r[4], "nombre": r[5], "placa": r[6], "estado": r[7]
        } for r in conductores]
        # 3. Votantes con ubicación compartida
        votantes = c.execute("""
            SELECT pv.votante_cedula, pv.votante_nombre, pv.votante_lat, pv.votante_lng,
                   COALESCE(lv.nombre, pad.local_nombre, '')
            FROM posible_votos pv
            LEFT JOIN padron2026_completo pad ON pad.cedula = pv.votante_cedula
            LEFT JOIN locales_votacion lv ON lv.id_local = pad.local
            WHERE pv.votante_lat IS NOT NULL AND pv.votante_lat != 0
        """).fetchall()
        votantes_items = [{
            "cedula": r[0], "nombre": r[1], "lat": r[2], "lng": r[3], "local": r[4]
        } for r in votantes]
        return {
            "success": True,
            "locales": locales_items,
            "conductores": conductores_items,
            "votantes": votantes_items,
            "total_locales": len(locales_items),
            "total_conductores": len(conductores_items),
            "total_votantes": len(votantes_items)
        }
    finally:
        conn.close()

# ─── GESTIÓN DE USUARIOS Y ROLES ─────────────────────────
@app.get("/api/usuarios/lista")
def usuarios_lista(request: Request):
    """Lista todos los usuarios del sistema con sus roles"""
    conn = get_connection()
    try:
        _require_session_nivel(conn, request.headers.get("x-session-id", ""), 'master')
        users = conn.execute("""
            SELECT u.cedula, u.nombre, u.email, u.telefono, u.activo, u.ultimo_acceso, u.created_at
            FROM cuentas_usuario u ORDER BY u.nombre
        """).fetchall()
        result = []
        for u in users:
            roles = conn.execute("""
                SELECT id, rol, nivel_sistema, tipo_cliente, dirigente_tipo,
                       departamento_id, distrito_id, candidato_nombre, candidato_cargo, vehiculo_id, activo
                FROM asignaciones_rol WHERE cedula=? ORDER BY rol
            """, (u[0],)).fetchall()
            roles_list = []
            for r in roles:
                roles_list.append({
                    "id": r[0], "rol": r[1], "nivel_sistema": r[2] or '',
                    "tipo_cliente": r[3] or '', "dirigente_tipo": r[4] or '',
                    "departamento_id": r[5], "distrito_id": r[6],
                    "candidato_nombre": r[7] or '', "candidato_cargo": r[8] or '',
                    "vehiculo_id": r[9], "activo": r[10]
                })
            cl = conn.execute("SELECT dominio, branding_activo FROM clientes WHERE cedula=?", (u[0],)).fetchone()
            result.append({
                "cedula": u[0], "nombre": u[1], "email": u[2] or '',
                "telefono": u[3] or '', "activo": u[4],
                "ultimo_acceso": u[5] or '', "created_at": u[6],
                "roles": roles_list, "total_roles": len(roles_list),
                "es_cliente": bool(cl), "dominio": (cl[0] if cl else '') or '',
                "branding_activo": bool(cl[1]) if cl else False
            })
        return {"success": True, "usuarios": result, "total": len(result)}
    finally:
        conn.close()

@app.post("/api/usuarios/crear")
def usuarios_crear(data: dict = Body(...)):
    """Crea un nuevo usuario con contraseña hasheada y opcionalmente roles"""
    ced = normalizar_cedula(data.get("cedula", ""))
    nombre = normalizar_texto(data.get("nombre", ""))
    password = normalizar_texto(data.get("contrasena", ""))
    email = normalizar_texto(data.get("email", ""))
    telefono = normalizar_texto(data.get("telefono", ""))
    roles_iniciales = data.get("roles", [])
    if not ced or not nombre or not password:
        return {"success": False, "error": "Cédula, nombre y contraseña requeridos"}
    # Política de contraseña
    if len(password) < 4:
        return {"success": False, "error": "La contraseña debe tener al menos 4 caracteres"}
    conn = get_connection()
    try:
        existing = conn.execute("SELECT cedula FROM cuentas_usuario WHERE cedula=?", (ced,)).fetchone()
        if existing:
            return {"success": False, "error": "Ya existe un usuario con esta cédula"}
        pw_hash = hash_password(password)
        conn.execute(
            "INSERT INTO cuentas_usuario (cedula, nombre, contrasena, email, telefono) VALUES (?,?,?,?,?)",
            (ced, nombre, pw_hash, email, telefono)
        )
        # Asignar roles iniciales
        roles_asignados = []
        for rol_data in roles_iniciales:
            rol = normalizar_texto(rol_data.get("rol", ""))
            if not rol: continue
            conn.execute("""INSERT OR IGNORE INTO asignaciones_rol
                (cedula, rol, nivel_sistema, tipo_cliente, dirigente_tipo,
                 departamento_id, distrito_id, candidato_nombre, candidato_cargo, vehiculo_id)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (ced, rol,
                 normalizar_texto(rol_data.get("nivel_sistema", "")),
                 normalizar_texto(rol_data.get("tipo_cliente", "")),
                 normalizar_texto(rol_data.get("dirigente_tipo", "")),
                 rol_data.get("departamento_id"),
                 rol_data.get("distrito_id"),
                 normalizar_texto(rol_data.get("candidato_nombre", "")),
                 normalizar_texto(rol_data.get("candidato_cargo", "")),
                 rol_data.get("vehiculo_id")))
            roles_asignados.append(rol)
        conn.commit()
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'usuario_creado', f'Creado usuario {nombre} (#{ced}) con roles: {",".join(roles_asignados)}',
                      'cuentas_usuario', ced, severidad='info')
        return {"success": True, "accion": "creado", "cedula": ced, "roles_asignados": roles_asignados}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/usuarios/editar")
def usuarios_editar(data: dict = Body(...)):
    """Edita datos básicos del usuario (nombre, email, teléfono, contraseña) con hash y auditoría"""
    ced = normalizar_cedula(data.get("cedula", ""))
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        updates = []
        params = []
        for campo in ["nombre", "email", "telefono", "contrasena"]:
            if campo in data:
                val = data[campo]
                if campo == "contrasena":
                    val = normalizar_texto(str(val))
                    if len(val) < 4:
                        return {"success": False, "error": "La contraseña debe tener al menos 4 caracteres"}
                    val = hash_password(val)  # Hash password
                elif campo in ("nombre", "email", "telefono"):
                    val = normalizar_texto(str(val))
                updates.append(f"{campo}=?")
                params.append(val)
        if not updates:
            return {"success": False, "error": "No hay campos para actualizar"}
        params.append(ced)
        conn.execute(f"UPDATE cuentas_usuario SET {', '.join(updates)} WHERE cedula=?", params)
        conn.commit()
        if conn.total_changes == 0:
            return {"success": False, "error": "Usuario no encontrado"}
        campos = [u.split('=')[0] for u in updates]
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'usuario_editado', f'Editados campos: {",".join(campos)} para #{ced}',
                      'cuentas_usuario', ced, severidad='info')
        return {"success": True, "accion": "actualizado"}
    finally:
        conn.close()

@app.post("/api/usuarios/toggle")
def usuarios_toggle(data: dict = Body(...)):
    """Activa/desactiva un usuario con auditoría"""
    ced = normalizar_cedula(data.get("cedula", ""))
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        row = conn.execute("SELECT cedula, nombre, activo FROM cuentas_usuario WHERE cedula=?", (ced,)).fetchone()
        if not row:
            return {"success": False, "error": "Usuario no encontrado"}
        nuevo = 0 if row[2] == 1 else 1
        conn.execute("UPDATE cuentas_usuario SET activo=? WHERE cedula=?", (nuevo, ced))
        conn.commit()
        accion = 'usuario_activado' if nuevo else 'usuario_desactivado'
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      accion, f'Usuario {row[1]} (#{ced}) → {"ACTIVO" if nuevo else "INACTIVO"}',
                      'cuentas_usuario', ced, severidad='media' if not nuevo else 'info')
        return {"success": True, "activo": nuevo}
    finally:
        conn.close()

@app.post("/api/usuarios/asignar_rol")
def usuarios_asignar_rol(data: dict = Body(...)):
    """Asigna un rol a un usuario existente con auditoría"""
    ced = normalizar_cedula(data.get("cedula", ""))
    rol = normalizar_texto(data.get("rol", ""))
    if not ced or not rol:
        return {"success": False, "error": "Cédula y rol requeridos"}
    conn = get_connection()
    try:
        user = conn.execute("SELECT cedula, nombre FROM cuentas_usuario WHERE cedula=?", (ced,)).fetchone()
        if not user:
            return {"success": False, "error": "Usuario no encontrado. Creá el usuario primero."}
        existing = conn.execute("SELECT id FROM asignaciones_rol WHERE cedula=? AND rol=?", (ced, rol)).fetchone()
        if existing:
            return {"success": False, "error": f"El usuario ya tiene el rol '{rol}'"}
        conn.execute("""INSERT INTO asignaciones_rol
            (cedula, rol, nivel_sistema, tipo_cliente, dirigente_tipo,
             departamento_id, distrito_id, candidato_nombre, candidato_cargo, vehiculo_id)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (ced, rol,
             normalizar_texto(data.get("nivel_sistema", "")),
             normalizar_texto(data.get("tipo_cliente", "")),
             normalizar_texto(data.get("dirigente_tipo", "")),
             data.get("departamento_id"),
             data.get("distrito_id"),
             normalizar_texto(data.get("candidato_nombre", "")),
             normalizar_texto(data.get("candidato_cargo", "")),
             data.get("vehiculo_id")))
        conn.commit()
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'rol_asignado', f'Rol "{rol}" asignado a {user[1]} (#{ced})',
                      'asignaciones_rol', f'{ced}/{rol}', severidad='info')
        return {"success": True, "accion": "rol_asignado", "rol": rol}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

@app.post("/api/usuarios/quitar_rol")
def usuarios_quitar_rol(data: dict = Body(...)):
    """Quita un rol de un usuario con auditoría"""
    ced = normalizar_cedula(data.get("cedula", ""))
    rol = normalizar_texto(data.get("rol", ""))
    if not ced or not rol:
        return {"success": False, "error": "Cédula y rol requeridos"}
    conn = get_connection()
    try:
        user = conn.execute("SELECT nombre FROM cuentas_usuario WHERE cedula=?", (ced,)).fetchone()
        conn.execute("DELETE FROM asignaciones_rol WHERE cedula=? AND rol=?", (ced, rol))
        conn.commit()
        if conn.total_changes == 0:
            return {"success": False, "error": "Rol no encontrado para este usuario"}
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'rol_quitado', f'Rol "{rol}" quitado de {user[0] if user else "#"+ced} (#{ced})',
                      'asignaciones_rol', f'{ced}/{rol}', severidad='info')
        return {"success": True, "accion": "rol_quitado", "rol": rol}
    finally:
        conn.close()

@app.get("/api/usuarios/roles_disponibles")
def roles_disponibles():
    """Lista todos los roles disponibles en el sistema con su metadata configurable"""
    return {"success": True, "roles": [
        {"rol": "master",       "label": "Master (Admin General)",              "grupo": "Sistema",      "campos": ["nivel_sistema"]},
        {"rol": "nacional",     "label": "Nacional",                            "grupo": "Sistema",      "campos": ["nivel_sistema"]},
        {"rol": "departamental","label": "Departamental",                       "grupo": "Sistema",      "campos": ["nivel_sistema", "departamento_id"]},
        {"rol": "distrital",    "label": "Distrital",                           "grupo": "Sistema",      "campos": ["nivel_sistema", "departamento_id", "distrito_id"]},
        {"rol": "seccional",    "label": "Seccional (PC Seccional 40)",         "grupo": "Sistema",      "campos": ["nivel_sistema", "departamento_id", "distrito_id"]},
        {"rol": "general",      "label": "General (Partido)",                   "grupo": "Partido",      "campos": ["tipo_cliente", "departamento_id"]},
        {"rol": "pc",           "label": "PC (Comisión Política)",              "grupo": "Partido",      "campos": ["tipo_cliente", "departamento_id", "distrito_id", "candidato_nombre", "candidato_cargo"]},
        {"rol": "municipal",    "label": "Municipal",                           "grupo": "Partido",      "campos": ["tipo_cliente", "departamento_id", "distrito_id"]},
        {"rol": "dirigente",    "label": "Dirigente (Campo)",                   "grupo": "Territorial",  "campos": ["dirigente_tipo"]},
        {"rol": "conductor",    "label": "Conductor (Transporte)",              "grupo": "Logística",    "campos": ["vehiculo_id"]},
    ]}

# ─── PERMISOS (RBAC) ─────────────────────────────────────
@app.get("/api/permisos/lista")
def permisos_lista(rol: str = Query("")):
    """Lista todos los permisos disponibles y los asignados a cada rol (o a un rol específico)"""
    conn = get_connection()
    try:
        # Todos los permisos disponibles
        todos = conn.execute("SELECT codigo, nombre, descripcion, grupo FROM permisos_disponibles ORDER BY grupo, codigo").fetchall()
        permisos = [{"codigo": r[0], "nombre": r[1], "descripcion": r[2], "grupo": r[3]} for r in todos]

        # Roles y sus permisos
        roles_perms = {}
        if rol:
            rows = conn.execute("""
                SELECT p.rol, p.permiso_codigo, pd.nombre, pd.grupo
                FROM permisos_rol p
                JOIN permisos_disponibles pd ON p.permiso_codigo = pd.codigo
                WHERE p.rol=?
                ORDER BY pd.grupo, pd.codigo
            """, (rol,)).fetchall()
            roles_perms[rol] = [{"codigo": r[1], "nombre": r[2], "grupo": r[3]} for r in rows]
        else:
            # Todos los roles
            roles_rows = conn.execute("""
                SELECT DISTINCT p.rol, p.permiso_codigo, pd.nombre, pd.grupo
                FROM permisos_rol p
                JOIN permisos_disponibles pd ON p.permiso_codigo = pd.codigo
                ORDER BY p.rol, pd.grupo, pd.codigo
            """).fetchall()
            for r in roles_rows:
                if r[0] not in roles_perms:
                    roles_perms[r[0]] = []
                roles_perms[r[0]].append({"codigo": r[1], "nombre": r[2], "grupo": r[3]})

        return {"success": True, "permisos": permisos, "roles_permisos": roles_perms, "total": len(permisos)}
    finally:
        conn.close()

@app.post("/api/permisos/asignar_multi")
def permisos_asignar_multi(data: dict = Body(...)):
    """Asigna múltiples permisos a un rol (reemplaza los existentes)"""
    rol = normalizar_texto(data.get("rol", ""))
    permisos = data.get("permisos", [])  # Lista de códigos
    if not rol or not isinstance(permisos, list):
        return {"success": False, "error": "rol y permisos (lista) requeridos"}
    conn = get_connection()
    try:
        # Validar que los permisos existan
        validos = set()
        for cod in permisos:
            cod = normalizar_texto(cod)
            if cod:
                row = conn.execute("SELECT codigo FROM permisos_disponibles WHERE codigo=?", (cod,)).fetchone()
                if row:
                    validos.add(cod)
        # Reemplazar permisos del rol
        conn.execute("DELETE FROM permisos_rol WHERE rol=?", (rol,))
        for perm in validos:
            conn.execute("INSERT OR IGNORE INTO permisos_rol (rol, permiso_codigo) VALUES (?,?)", (rol, perm))
        conn.commit()
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'permisos_actualizados', f'Permisos del rol "{rol}" actualizados ({len(validos)} permisos)',
                      'permisos_rol', rol, severidad='media')
        return {"success": True, "accion": "permisos_actualizados", "rol": rol, "total": len(validos)}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

# ─── AUDITORÍA ──────────────────────────────────────────
@app.get("/api/auditoria")
def auditoria_lista(request: Request, limite: int = Query(100), offset: int = Query(0),
                    cedula: str = Query(""), accion: str = Query(""),
                    entidad: str = Query(""), severidad: str = Query(""),
                    desde: str = Query(""), hasta: str = Query("")):
    """Consulta el registro de auditoría con filtros"""
    conn = get_connection()
    try:
        _require_session_nivel(conn, request.headers.get("x-session-id", "") if request else "", 'master')
        limite = max(1, min(int(limite), 500))
        offset = max(0, int(offset))
        where = ["1=1"]
        params = []
        if cedula:
            where.append("a.cedula=?")
            params.append(normalizar_cedula(cedula))
        if accion:
            where.append("a.accion LIKE ?")
            params.append(f'%{accion}%')
        if entidad:
            where.append("a.entidad=?")
            params.append(entidad)
        if severidad:
            where.append("a.severidad=?")
            params.append(severidad)
        if desde:
            where.append("a.timestamp >= ?")
            params.append(desde)
        if hasta:
            where.append("a.timestamp <= ?")
            params.append(hasta)

        total_row = conn.execute(f"SELECT COUNT(*) FROM auditoria a WHERE {' AND '.join(where)}", params).fetchone()
        total = total_row[0] if total_row else 0

        rows = conn.execute(f"""
            SELECT a.id, a.timestamp, a.cedula, a.nombre, a.accion, a.detalle,
                   a.entidad, a.entidad_id, a.ip, a.severidad
            FROM auditoria a
            WHERE {' AND '.join(where)}
            ORDER BY a.timestamp DESC
            LIMIT ? OFFSET ?
        """, params + [limite, offset]).fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r[0], "timestamp": r[1], "cedula": r[2], "nombre": r[3] or '',
                "accion": r[4], "detalle": r[5] or '', "entidad": r[6] or '',
                "entidad_id": r[7] or '', "ip": r[8] or '', "severidad": r[9]
            })

        return {"success": True, "items": items, "total": total, "limit": limite, "offset": offset}
    finally:
        conn.close()

@app.get("/api/auditoria/exportar")
def auditoria_exportar(request: Request, cedula: str = Query(""), accion: str = Query(""),
                       entidad: str = Query(""), desde: str = Query(""), hasta: str = Query("")):
    """Exporta auditoría como CSV"""
    conn = get_connection()
    try:
        _require_session_nivel(conn, request.headers.get("x-session-id", "") if request else "", 'master')
        where = ["1=1"]
        params = []
        if cedula:
            where.append("cedula=?")
            params.append(normalizar_cedula(cedula))
        if accion:
            where.append("accion LIKE ?")
            params.append(f'%{accion}%')
        if entidad:
            where.append("entidad=?")
            params.append(entidad)
        if desde:
            where.append("timestamp >= ?")
            params.append(desde)
        if hasta:
            where.append("timestamp <= ?")
            params.append(hasta)

        rows = conn.execute(f"""
            SELECT timestamp, cedula, nombre, accion, detalle, entidad, entidad_id, ip, severidad
            FROM auditoria
            WHERE {' AND '.join(where)}
            ORDER BY timestamp DESC LIMIT 10000
        """, params).fetchall()

        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "Cédula", "Nombre", "Acción", "Detalle", "Entidad", "ID Entidad", "IP", "Severidad"])
        for r in rows:
            writer.writerow([r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8]])

        csv_content = output.getvalue()
        output.close()

        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=auditoria_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                "Content-Type": "text/csv; charset=utf-8-sig"
            }
        )
    finally:
        conn.close()

# ─── SESIONES ───────────────────────────────────────────
@app.get("/api/sesiones")
def sesiones_lista(request: Request, cedula: str = Query(""), activas: int = Query(1)):
    """Lista sesiones activas; requiere sesión de Administración General."""
    conn = get_connection()
    try:
        _require_session_nivel(conn, request.headers.get("x-session-id", ""), 'master')
        filtro_cedula = normalizar_cedula(cedula) if cedula else None
        where = ["s.activa=?"]
        params = [1 if activas else 0]
        if filtro_cedula:
            where.append("s.cedula=?")
            params.append(filtro_cedula)
        rows = conn.execute(f"""
            SELECT s.id, s.cedula, s.rol_activo, s.ip, s.user_agent, s.iniciada, s.ultimo_acceso, s.activa, COALESCE(u.nombre,'')
            FROM sesiones s LEFT JOIN cuentas_usuario u ON u.cedula=s.cedula
            WHERE {' AND '.join(where)} ORDER BY s.ultimo_acceso DESC LIMIT 500
        """, params).fetchall()
        items = []
        for r in rows:
            items.append({
                "id": r[0], "cedula": r[1], "rol_activo": r[2] or '',
                "ip": r[3] or '', "user_agent": r[4] or '',
                "iniciada": r[5], "ultimo_acceso": r[6] or '',
                "activa": bool(r[7]), "nombre": r[8]
            })
        return {"success": True, "sesiones": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/sesiones/cerrar")
def sesiones_cerrar(request: Request, data: dict = Body(...)):
    """Cierra una sesión específica o todas las de un usuario"""
    session_id = data.get("session_id", "")
    cedula = normalizar_cedula(data.get("cedula", ""))
    cerrar_todas = data.get("todas", False)
    conn = get_connection()
    try:
        usuario = _require_session_nivel(conn, request.headers.get("x-session-id", ""), 'master')
        if cerrar_todas and cedula:
            if cedula == usuario.get('cedula'):
                raise HTTPException(status_code=400, detail="No puedes cerrar todas tus sesiones desde esta sesión")
            cur = conn.execute("UPDATE sesiones SET activa=0 WHERE cedula=? AND activa=1", (cedula,))
            cerradas = cur.rowcount
            conn.commit()
            log_auditoria(usuario.get('cedula', ''), usuario.get('nombre', ''),
                          'sesiones_cerradas', f'{cerradas} sesiones de #{cedula} cerradas',
                          'sesiones', cedula, severidad='media')
            return {"success": True, "accion": "todas_cerradas", "total": cerradas}
        elif session_id:
            target = conn.execute("SELECT cedula FROM sesiones WHERE id=? AND activa=1", (session_id,)).fetchone()
            if not target:
                raise HTTPException(status_code=404, detail="Sesión activa no encontrada")
            if target[0] == usuario.get('cedula'):
                raise HTTPException(status_code=400, detail="No puedes cerrar tu sesión actual desde este control")
            cur = conn.execute("UPDATE sesiones SET activa=0 WHERE id=? AND activa=1", (session_id,))
            conn.commit()
            log_auditoria(usuario.get('cedula', ''), usuario.get('nombre', ''),
                          'sesion_cerrada', f'Sesión {session_id[:8]}... cerrada',
                          'sesiones', session_id, severidad='info')
            return {"success": True, "accion": "sesion_cerrada", "total": cur.rowcount}
        return {"success": False, "error": "session_id o cedula requeridos"}
    finally:
        conn.close()

# ─── SEGURIDAD ──────────────────────────────────────────
@app.get("/api/seguridad/estado")
def seguridad_estado(request: Request, cedula: str = Query("")):
    """Estado de seguridad: políticas, bloqueos, intentos"""
    conn = get_connection()
    try:
        usuario = _require_session_nivel(conn, request.headers.get("x-session-id", ""), 'master')
        _, fallos_recientes = verificar_bloqueo(cedula, conn) if cedula else (False, 0)
        # Contar sesiones activas del usuario
        sesiones_activas = 0
        if cedula:
            ses = conn.execute("SELECT COUNT(*) FROM sesiones WHERE cedula=? AND activa=1", (normalizar_cedula(cedula),)).fetchone()
            sesiones_activas = ses[0] if ses else 0
        # Stats globales de seguridad
        ultimo_dia = conn.execute("""
            SELECT COUNT(*), SUM(CASE WHEN exitoso=1 THEN 1 ELSE 0 END),
                   SUM(CASE WHEN exitoso=0 THEN 1 ELSE 0 END)
            FROM intentos_login WHERE timestamp >= datetime('now','localtime','-1 day')
        """).fetchone()
        return {
            "success": True,
            "config": {
                "max_intentos_fallidos": MAX_INTENTOS_FALLIDOS,
                "ventana_bloqueo_minutos": VENTANA_BLOQUEO_MINUTOS,
                "hash_algoritmo": "pbkdf2_sha256",
                "hash_iteraciones": 100000,
            },
            "usuario": {
                "cedula": cedula,
                "bloqueado": fallos_recientes >= MAX_INTENTOS_FALLIDOS if cedula else False,
                "intentos_fallidos_recientes": fallos_recientes if cedula else 0,
                "sesiones_activas": sesiones_activas,
            } if cedula else None,
            "global": {
                "intentos_24h": ultimo_dia[0] or 0 if ultimo_dia else 0,
                "exitosos_24h": ultimo_dia[1] or 0 if ultimo_dia else 0,
                "fallidos_24h": ultimo_dia[2] or 0 if ultimo_dia else 0,
            }
        }
    finally:
        conn.close()

# ─── SELF-SERVICE: CAMBIO DE CONTRASEÑA ─────────────────
@app.post("/api/usuarios/cambiar_password")
def usuarios_cambiar_password(data: dict = Body(...)):
    """Cambio de contraseña con verificación de la actual"""
    cedula = normalizar_cedula(data.get("cedula", ""))
    password_actual = normalizar_texto(data.get("password_actual", ""))
    password_nueva = normalizar_texto(data.get("password_nueva", ""))
    if not cedula or not password_actual or not password_nueva:
        return {"success": False, "error": "Cédula, contraseña actual y nueva requeridas"}
    if len(password_nueva) < 4:
        return {"success": False, "error": "La nueva contraseña debe tener al menos 4 caracteres"}
    if password_actual == password_nueva:
        return {"success": False, "error": "La nueva contraseña debe ser diferente a la actual"}
    conn = get_connection()
    try:
        row = conn.execute("SELECT cedula, nombre, contrasena FROM cuentas_usuario WHERE cedula=? AND activo=1", (cedula,)).fetchone()
        if not row:
            return {"success": False, "error": "Usuario no encontrado o inactivo"}
        # Verificar contraseña actual
        if not check_password(password_actual, row[2]):
            log_auditoria(cedula, row[1] or '', 'cambio_password_fallido',
                          'Intento fallido de cambio de contraseña (actual incorrecta)',
                          'cuentas_usuario', cedula, severidad='media')
            return {"success": False, "error": "Contraseña actual incorrecta"}
        # Actualizar con hash
        pw_hash = hash_password(password_nueva)
        conn.execute("UPDATE cuentas_usuario SET contrasena=?, requiere_cambio_clave=0 WHERE cedula=?", (pw_hash, cedula))
        conn.commit()
        log_auditoria(cedula, row[1] or '', 'password_cambiada',
                      'Contraseña cambiada exitosamente',
                      'cuentas_usuario', cedula, severidad='info')
        return {"success": True, "mensaje": "Contraseña actualizada exitosamente"}
    finally:
        conn.close()

# ─── ADMIN: RESETEAR CONTRASEÑA DE UN USUARIO ───────────
@app.post("/api/usuarios/resetear_password")
def usuarios_resetear_password(data: dict = Body(...)):
    """
    Un admin resetea la contraseña de cualquier usuario al valor por defecto
    (cédula + '*') y lo marca para que deba cambiarla en su próximo login.
    No requiere la contraseña anterior (a diferencia de cambiar_password).
    """
    cedula = normalizar_cedula(data.get("cedula", ""))
    if not cedula:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        nueva_pw = default_password(cedula)
        row = conn.execute("SELECT cedula, nombre FROM cuentas_usuario WHERE cedula=?", (cedula,)).fetchone()
        if not row:
            # Usuario aún no migrado a cuentas_usuario (nunca inició sesión): buscar nombre en tablas legacy
            nombre = ''
            for tabla in ('dirigentes', 'clientes', 'usuarios', 'transportes'):
                # FIX: SQL injection - validar tabla contra whitelist antes de usar en query dinámica.
                tabla_segura = validar_tabla(tabla)
                r = conn.execute(f"SELECT nombre FROM {tabla_segura} WHERE cedula=?", (cedula,)).fetchone()
                if r:
                    nombre = r[0] or ''
                    break
            if not nombre:
                return {"success": False, "error": "Usuario no encontrado"}
            conn.execute("INSERT INTO cuentas_usuario (cedula, nombre, contrasena, requiere_cambio_clave) VALUES (?,?,?,1)",
                         (cedula, nombre, hash_password(nueva_pw)))
        else:
            conn.execute("UPDATE cuentas_usuario SET contrasena=?, requiere_cambio_clave=1 WHERE cedula=?",
                         (hash_password(nueva_pw), cedula))
        conn.commit()
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'password_reseteada', f'Contraseña reseteada a valor por defecto para #{cedula}',
                      'cuentas_usuario', cedula, severidad='media')
        return {"success": True, "mensaje": "Contraseña reseteada", "password_default": nueva_pw}
    finally:
        conn.close()

# ─── ADMIN: ACTIVAR/DESACTIVAR SERVICIO DE BRANDING ─────
@app.post("/api/usuarios/toggle_branding")
def usuarios_toggle_branding(data: dict = Body(...)):
    """
    Activa/desactiva el servicio de publicidad/colores en la página pública
    'Dónde Votás' para un cliente. Solo un admin debe accionar esto (se activa
    cuando el cliente contrata el servicio) — no es self-service.
    """
    ced = normalizar_cedula(data.get("cedula", ""))
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        row = conn.execute("SELECT cedula, nombre, branding_activo, dominio FROM clientes WHERE cedula=?", (ced,)).fetchone()
        if not row:
            return {"success": False, "error": "Este usuario no es un cliente (no tiene cuenta en 'clientes')"}
        if not row[3]:
            return {"success": False, "error": "El cliente todavía no cargó un dominio propio"}
        nuevo = 0 if row[2] == 1 else 1
        conn.execute("UPDATE clientes SET branding_activo=? WHERE cedula=?", (nuevo, ced))
        conn.commit()
        log_auditoria(data.get("cedula_auth", ''), data.get("nombre_auth", ''),
                      'branding_cliente_actualizado',
                      f'Branding de {row[1]} (#{ced}, dominio {row[3]}) → {"ACTIVADO" if nuevo else "DESACTIVADO"}',
                      'clientes', ced, severidad='info')
        return {"success": True, "branding_activo": bool(nuevo)}
    finally:
        conn.close()

@app.post("/api/usuarios/perfil")
def usuarios_perfil(data: dict = Body(...)):
    """Auto-servicio: el usuario edita su propio perfil (email, teléfono)"""
    cedula = normalizar_cedula(data.get("cedula", ""))
    email = normalizar_texto(data.get("email", ""))
    telefono = normalizar_texto(data.get("telefono", ""))
    nombre = normalizar_texto(data.get("nombre", ""))
    if not cedula:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        updates = []
        params = []
        if email:
            updates.append("email=?")
            params.append(email)
        if telefono:
            updates.append("telefono=?")
            params.append(telefono)
        if nombre:
            updates.append("nombre=?")
            params.append(nombre)
        if not updates:
            return {"success": False, "error": "No hay campos para actualizar"}
        params.append(cedula)
        conn.execute(f"UPDATE cuentas_usuario SET {', '.join(updates)} WHERE cedula=?", params)
        conn.commit()
        log_auditoria(cedula, nombre or '', 'perfil_actualizado',
                      'Datos de perfil actualizados por el usuario',
                      'cuentas_usuario', cedula, severidad='info')
        return {"success": True, "accion": "perfil_actualizado"}
    finally:
        conn.close()

# ═══════════════════════════════════════════════════════════════════
# PANEL DEL CLIENTE — API para Concejales/Intendentes
# ═══════════════════════════════════════════════════════════════════

@app.get("/api/cliente/perfil")
def cliente_perfil(cedula: str = Query("")):
    """Perfil completo del cliente: datos de candidato electo + info de usuario"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        # Buscar en clientes
        cl = c.execute("""
            SELECT c.cedula, c.nombre, c.tipo, c.categoria, c.departamento_id, c.distrito_id,
                   c.candidato_nombre, c.candidato_cargo, c.locales, c.activo
            FROM clientes c WHERE c.cedula=? AND c.activo=1
        """, (ced,)).fetchone()
        if not cl:
            return {"success": False, "error": "Cliente no encontrado o inactivo"}
        # Buscar candidato electo asociado (por candidato_cargo o cliente_cedula)
        cand = c.execute("""
            SELECT ce.id, ce.tipo_cargo, ce.lista_nro, ce.lista_nombre,
                   ce.votos_obtenidos, ce.porcentaje_votos, ce.orden_electo,
                   ce.distrito_nombre, cand.id as cand_id,
                   p.sigla, p.color_principal_hex,
                   COALESCE(d.nombre, '') as depto_nombre
            FROM candidatos_electos_internas ce
            JOIN candidatos cand ON cand.id = ce.candidato_id
            JOIN partidos p ON p.id = ce.partido_id
            LEFT JOIN departamentos d ON d.id = ce.departamento_id
            WHERE cand.cliente_cedula=?
            ORDER BY ce.id DESC LIMIT 1
        """, (ced,)).fetchone()
        candidato = None
        if cand:
            candidato = {
                'electo_id': cand[0], 'tipo_cargo': cand[1], 'lista_nro': cand[2],
                'lista_nombre': cand[3], 'votos_obtenidos': cand[4],
                'porcentaje_votos': cand[5], 'orden_electo': cand[6],
                'distrito_nombre': cand[7], 'candidato_id': cand[8],
                'sigla': cand[9], 'color_hex': cand[10], 'departamento_nombre': cand[11]
            }
        return {
            "success": True,
            "cliente": {
                "cedula": cl[0], "nombre": cl[1], "tipo": cl[2], "categoria": cl[3],
                "departamento_id": cl[4], "distrito_id": cl[5],
                "candidato_nombre": cl[6], "candidato_cargo": cl[7],
                "locales": cl[8], "activo": cl[9]
            },
            "candidato": candidato
        }
    finally:
        conn.close()

@app.get("/api/cliente/dashboard")
def cliente_dashboard(cedula: str = Query("")):
    """Dashboard del cliente: resumen de PCs, Dirigentes, Logística, Transporte"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        # Buscar candidato_id del cliente
        cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
        if not cand:
            return {"success": False, "error": "No hay candidato asociado a este cliente"}
        cand_id = cand[0]

        # PCs (grupos_trabajo)
        pcs = c.execute("""
            SELECT g.id, g.nombre, g.zona, g.seccional
            FROM grupos_trabajo g WHERE g.candidato_id=? AND g.activo=1
            ORDER BY g.seccional, g.nombre
        """, (cand_id,)).fetchall()
        total_pcs = len(pcs)

        # Dirigentes (vía grupo_dirigentes → grupo → candidato)
        dirs = c.execute("""
            SELECT d.cedula, d.nombre, d.tipo, gd.grupo_id, g.nombre as grupo_nombre
            FROM grupo_dirigentes gd
            JOIN grupos_trabajo g ON g.id = gd.grupo_id
            JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
            WHERE g.candidato_id=? AND g.activo=1 AND d.activo=1
            ORDER BY d.nombre
        """, (cand_id,)).fetchall()
        total_dirigentes = len(dirs)

        # Dirigentes por tipo
        dirs_por_tipo = {}
        for d in dirs:
            t = d[2] or 'dirigente'
            dirs_por_tipo[t] = dirs_por_tipo.get(t, 0) + 1

        # Solicitudes de recogida de los dirigentes del cliente
        sols = c.execute("""
            SELECT COUNT(*) FROM solicitudes_recogida s
            JOIN dirigentes d ON d.cedula = s.dirigente_cedula
            JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
            JOIN grupos_trabajo g ON g.id = gd.grupo_id
            WHERE g.candidato_id=? AND s.estado IN ('pendiente','autorizado')
        """, (cand_id,)).fetchone()
        total_solicitudes = sols[0] if sols else 0

        # Transporte (global disponible)
        transp = c.execute("""
            SELECT COUNT(*) FROM transportes WHERE estado='disponible'
        """).fetchone()
        total_transporte = transp[0] if transp else 0

        # Posibles votos de los dirigentes del cliente
        pv = c.execute("""
            SELECT COUNT(*) FROM posible_votos pv
            JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
            JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
            JOIN grupos_trabajo g ON g.id = gd.grupo_id
            WHERE g.candidato_id=?
        """, (cand_id,)).fetchone()
        total_posibles = pv[0] if pv else 0

        pv_conf = c.execute("""
            SELECT COUNT(*) FROM posible_votos pv
            JOIN dirigentes d ON d.cedula = pv.dirigente_cedula
            JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
            JOIN grupos_trabajo g ON g.id = gd.grupo_id
            WHERE g.candidato_id=? AND pv.status='confirmado'
        """, (cand_id,)).fetchone()
        total_confirmados = pv_conf[0] if pv_conf else 0

        return {
            "success": True,
            "dashboard": {
                "total_pcs": total_pcs,
                "total_dirigentes": total_dirigentes,
                "dirs_por_tipo": dirs_por_tipo,
                "total_solicitudes": total_solicitudes,
                "total_transporte": total_transporte,
                "total_posibles": total_posibles,
                "total_confirmados": total_confirmados,
            },
            "pcs": [{"id": p[0], "nombre": p[1], "zona": p[2], "seccional": p[3]} for p in pcs]
        }
    finally:
        conn.close()

@app.get("/api/cliente/pcs")
def cliente_pcs(cedula: str = Query("")):
    """Lista de PCs del cliente con sus dirigentes"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
        if not cand:
            return {"success": False, "error": "No hay candidato asociado"}
        cand_id = cand[0]
        grs = c.execute("""
            SELECT g.id, g.nombre, g.zona, g.seccional
            FROM grupos_trabajo g WHERE g.candidato_id=? AND g.activo=1
            ORDER BY g.seccional, g.nombre
        """, (cand_id,)).fetchall()
        pcs = []
        for gr in grs:
            dirs = c.execute("""
                SELECT d.cedula, d.nombre, d.tipo
                FROM grupo_dirigentes gd
                JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
                WHERE gd.grupo_id=? AND d.activo=1
                ORDER BY d.nombre
            """, (gr[0],)).fetchall()
            # Posibles votos
            pv = c.execute("""
                SELECT COUNT(*) FROM posible_votos pv
                JOIN grupo_dirigentes gd ON gd.dirigente_cedula = pv.dirigente_cedula
                WHERE gd.grupo_id=?
            """, (gr[0],)).fetchone()
            total_pv = pv[0] if pv else 0
            pcs.append({
                'id': gr[0], 'nombre': gr[1], 'zona': gr[2], 'seccional': gr[3],
                'dirigentes': [{'cedula': d[0], 'nombre': d[1], 'tipo': d[2]} for d in dirs],
                'total_dirigentes': len(dirs),
                'total_posibles': total_pv
            })
        return {"success": True, "pcs": pcs, "total": len(pcs)}
    finally:
        conn.close()

@app.post("/api/cliente/pcs/crear")
async def cliente_pc_crear(request: Request):
    """Crea un nuevo PC para el cliente"""
    data = await request.json()
    ced = normalizar_cedula(data.get("cedula", ""))
    nombre = normalizar_texto(data.get("nombre", ""))
    zona = normalizar_texto(data.get("zona", ""))
    seccional = normalizar_texto(data.get("seccional", ""))
    if not ced or not nombre:
        return {"success": False, "error": "Cédula y nombre del PC requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
        if not cand:
            return {"success": False, "error": "No hay candidato asociado"}
        c.execute("INSERT INTO grupos_trabajo (nombre, candidato_id, zona, seccional) VALUES (?,?,?,?)",
                  (nombre, cand[0], zona, seccional))
        conn.commit()
        return {"success": True, "accion": "creado", "id": c.lastrowid}
    finally:
        conn.close()

@app.post("/api/cliente/pcs/eliminar")
async def cliente_pc_eliminar(request: Request):
    """Elimina (desactiva) un PC"""
    data = await request.json()
    pc_id = data.get("pc_id")
    ced = normalizar_cedula(data.get("cedula", ""))
    if not pc_id or not ced:
        return {"success": False, "error": "pc_id y cédula requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        # Verificar que el PC pertenece al candidato del cliente
        cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
        if not cand:
            return {"success": False, "error": "No hay candidato asociado"}
        gr = c.execute("SELECT id FROM grupos_trabajo WHERE id=? AND candidato_id=?", (int(pc_id), cand[0])).fetchone()
        if not gr:
            return {"success": False, "error": "PC no encontrado o no pertenece a este candidato"}
        c.execute("UPDATE grupos_trabajo SET activo=0 WHERE id=?", (int(pc_id),))
        # Quitar dirigentes del PC
        c.execute("DELETE FROM grupo_dirigentes WHERE grupo_id=?", (int(pc_id),))
        conn.commit()
        return {"success": True, "accion": "eliminado"}
    finally:
        conn.close()

@app.get("/api/cliente/dirigentes")
def cliente_dirigentes(cedula: str = Query("")):
    """Lista de dirigentes del cliente (asignados a PCs)"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced,)).fetchone()
        if not cand:
            return {"success": False, "error": "No hay candidato asociado"}
        # Todos los dirigentes asignados a PCs de este candidato
        dirs = c.execute("""
            SELECT d.cedula, d.nombre, d.tipo, d.activo,
                   g.id as grupo_id, g.nombre as grupo_nombre, g.zona, g.seccional
            FROM grupo_dirigentes gd
            JOIN grupos_trabajo g ON g.id = gd.grupo_id
            JOIN dirigentes d ON d.cedula = gd.dirigente_cedula
            WHERE g.candidato_id=? AND g.activo=1
            ORDER BY d.nombre
        """, (cand[0],)).fetchall()
        result = []
        for d in dirs:
            # Posibles votos de este dirigente
            pv = c.execute("SELECT COUNT(*) FROM posible_votos WHERE dirigente_cedula=?", (d[0],)).fetchone()
            pv_conf = c.execute("SELECT COUNT(*) FROM posible_votos WHERE dirigente_cedula=? AND status='confirmado'", (d[0],)).fetchone()
            result.append({
                'cedula': d[0], 'nombre': d[1], 'tipo': d[2], 'activo': d[3],
                'grupo_id': d[4], 'grupo_nombre': d[5], 'zona': d[6], 'seccional': d[7],
                'total_posibles': pv[0] if pv else 0,
                'total_confirmados': pv_conf[0] if pv_conf else 0
            })
        return {"success": True, "dirigentes": result, "total": len(result)}
    finally:
        conn.close()

@app.post("/api/cliente/dirigentes/crear")
async def cliente_dirigente_crear(request: Request):
    """Crea un dirigente y lo asigna a un PC"""
    data = await request.json()
    ced_cliente = normalizar_cedula(data.get("cedula", ""))
    ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
    nombre = normalizar_texto(data.get("dirigente_nombre", ""))
    tipo = normalizar_texto(data.get("dirigente_tipo", "dirigente"))
    grupo_id = data.get("grupo_id")
    if not ced_cliente or not ced_dir or not nombre or not grupo_id:
        return {"success": False, "error": "Cédulas, nombre y PC requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        # Verificar que el PC pertenece al candidato del cliente
        cand = c.execute("SELECT id FROM candidatos WHERE cliente_cedula=?", (ced_cliente,)).fetchone()
        if not cand:
            return {"success": False, "error": "No hay candidato asociado"}
        gr = c.execute("SELECT id FROM grupos_trabajo WHERE id=? AND candidato_id=?", (int(grupo_id), cand[0])).fetchone()
        if not gr:
            return {"success": False, "error": "PC no encontrado o no pertenece a este candidato"}
        # Crear dirigente si no existe
        existing = c.execute("SELECT cedula FROM dirigentes WHERE cedula=?", (ced_dir,)).fetchone()
        if not existing:
            c.execute("INSERT INTO dirigentes (cedula, nombre, contrasena, tipo, cliente_cedula) VALUES (?,?,?,?,?)",
                      (ced_dir, nombre, ced_dir, tipo, ced_cliente))
        else:
            # Actualizar tipo y cliente_cedula
            c.execute("UPDATE dirigentes SET tipo=?, cliente_cedula=?, nombre=? WHERE cedula=?",
                      (tipo, ced_cliente, nombre, ced_dir))
        # Asignar al PC
        c.execute("INSERT OR IGNORE INTO grupo_dirigentes (grupo_id, dirigente_cedula) VALUES (?,?)",
                  (int(grupo_id), ced_dir))
        conn.commit()
        return {"success": True, "accion": "creado"}
    finally:
        conn.close()

@app.post("/api/cliente/dirigentes/editar")
async def cliente_dirigente_editar(request: Request):
    """Edita un dirigente existente"""
    data = await request.json()
    ced_cliente = normalizar_cedula(data.get("cedula", ""))
    ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
    nombre = normalizar_texto(data.get("dirigente_nombre", ""))
    tipo = normalizar_texto(data.get("dirigente_tipo", ""))
    if not ced_cliente or not ced_dir:
        return {"success": False, "error": "Cédulas requeridas"}
    conn = get_connection()
    try:
        c = conn.cursor()
        updates = []
        params = []
        if nombre:
            updates.append("nombre=?")
            params.append(nombre)
        if tipo:
            updates.append("tipo=?")
            params.append(tipo)
        if updates:
            params.append(ced_dir)
            c.execute(f"UPDATE dirigentes SET {', '.join(updates)} WHERE cedula=?", params)
        conn.commit()
        return {"success": True, "accion": "actualizado"}
    finally:
        conn.close()

@app.post("/api/cliente/dirigentes/quitar")
async def cliente_dirigente_quitar(request: Request):
    """Quita un dirigente de un PC"""
    data = await request.json()
    grupo_id = data.get("grupo_id")
    ced_dir = normalizar_cedula(data.get("dirigente_cedula", ""))
    if not grupo_id or not ced_dir:
        return {"success": False, "error": "grupo_id y dirigente requeridos"}
    conn = get_connection()
    try:
        conn.execute("DELETE FROM grupo_dirigentes WHERE grupo_id=? AND dirigente_cedula=?",
                     (int(grupo_id), ced_dir))
        conn.commit()
        return {"success": True, "accion": "quitado"}
    finally:
        conn.close()

@app.get("/api/cliente/logistica")
def cliente_logistica(cedula: str = Query("")):
    """Solicitudes de recogida del cliente"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        c = conn.cursor()
        # Solicitudes de los dirigentes del candidato del cliente
        sols = c.execute("""
            SELECT s.id, s.dirigente_cedula, s.dirigente_nombre, s.votante_cedula,
                   s.votante_nombre, s.hora_recogida, s.ubicacion, s.descripcion,
                   s.estado, s.autorizado_por, s.ruta_id, s.created_at
            FROM solicitudes_recogida s
            JOIN dirigentes d ON d.cedula = s.dirigente_cedula
            JOIN grupo_dirigentes gd ON gd.dirigente_cedula = d.cedula
            JOIN grupos_trabajo g ON g.id = gd.grupo_id
            JOIN candidatos cand ON cand.id = g.candidato_id
            WHERE cand.cliente_cedula=?
            ORDER BY s.created_at DESC
        """, (ced,)).fetchall()
        cols = ['id','dirigente_cedula','dirigente_nombre','votante_cedula',
                'votante_nombre','hora_recogida','ubicacion','descripcion',
                'estado','autorizado_por','ruta_id','created_at']
        items = [dict(zip(cols, r)) for r in sols]
        return {"success": True, "solicitudes": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/cliente/logistica/autorizar")
async def cliente_logistica_autorizar(request: Request):
    """Autoriza o rechaza una solicitud de recogida"""
    data = await request.json()
    sol_id = data.get("solicitud_id")
    accion = normalizar_texto(data.get("accion", "autorizado"))
    admin_ced = normalizar_cedula(data.get("admin_cedula", ""))
    if not sol_id or not admin_ced:
        return {"success": False, "error": "solicitud_id y admin_cedula requeridos"}
    conn = get_connection()
    try:
        c = conn.cursor()
        if accion == "autorizado":
            sol = c.execute("SELECT * FROM solicitudes_recogida WHERE id=?", (int(sol_id),)).fetchone()
            if not sol:
                return {"success": False, "error": "Solicitud no encontrada"}
            transp = c.execute("SELECT id FROM transportes LIMIT 1").fetchone()
            t_id = transp[0] if transp else 1
            c.execute("""INSERT INTO rutas (transporte_id, origen, destino, estado, observacion)
                         VALUES (?,?,?,?,?)""",
                      (t_id, sol["ubicacion"] or '', sol["descripcion"] or "Colegio Electoral",
                       'pendiente', f'Solicitud #{sol_id} - {sol["votante_nombre"]}'))
            ruta_id = c.lastrowid
            c.execute("UPDATE solicitudes_recogida SET estado='autorizado', autorizado_por=?, ruta_id=? WHERE id=?",
                      (admin_ced, ruta_id, int(sol_id)))
            conn.commit()
            return {"success": True, "accion": "autorizado", "ruta_id": ruta_id}
        else:
            c.execute("UPDATE solicitudes_recogida SET estado='rechazado', autorizado_por=? WHERE id=?",
                      (admin_ced, int(sol_id)))
            conn.commit()
            return {"success": True, "accion": "rechazado"}
    finally:
        conn.close()

@app.get("/api/cliente/transporte")
def cliente_transporte(cedula: str = Query("")):
    """Lista de vehículos de transporte disponibles"""
    ced = normalizar_cedula(cedula)
    if not ced:
        return {"success": False, "error": "Cédula requerida"}
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT id, cedula, nombre, tipo, placa, telefono, capacidad, estado, seccional
            FROM transportes ORDER BY nombre
        """).fetchall()
        cols = ['id','cedula','nombre','tipo','placa','telefono','capacidad','estado','seccional']
        items = [dict(zip(cols, r)) for r in rows]
        return {"success": True, "transportes": items, "total": len(items)}
    finally:
        conn.close()

@app.post("/api/cliente/transporte/crear")
async def cliente_transporte_crear(request: Request):
    """Crea un nuevo vehículo de transporte"""
    data = await request.json()
    ced = normalizar_cedula(data.get("cedula", ""))
    nombre = normalizar_texto(data.get("nombre", ""))
    tipo = normalizar_texto(data.get("tipo", "vehiculo"))
    placa = normalizar_texto(data.get("placa", ""))
    telefono = normalizar_texto(data.get("telefono", ""))
    capacidad = int(data.get("capacidad", 4))
    seccional = normalizar_texto(data.get("seccional", ""))
    if not ced or not nombre:
        return {"success": False, "error": "Cédula y nombre requeridos"}
    conn = get_connection()
    try:
        conn.execute("INSERT INTO transportes (cedula, nombre, tipo, placa, telefono, capacidad, seccional) VALUES (?,?,?,?,?,?,?)",
                     (ced, nombre, tipo, placa, telefono, capacidad, seccional))
        conn.commit()
        return {"success": True, "accion": "creado", "id": conn.execute("SELECT last_insert_rowid()").fetchone()[0]}
    finally:
        conn.close()

@app.post("/api/cliente/transporte/editar")
async def cliente_transporte_editar(request: Request):
    """Edita un vehículo de transporte"""
    data = await request.json()
    t_id = data.get("id")
    if not t_id:
        return {"success": False, "error": "ID requerido"}
    conn = get_connection()
    try:
        updates = []
        params = []
        for campo in ["nombre", "tipo", "placa", "telefono", "capacidad", "seccional", "estado"]:
            if campo in data:
                updates.append(f"{campo}=?")
                params.append(normalizar_texto(str(data[campo])) if isinstance(data[campo], str) else data[campo])
        if not updates:
            return {"success": False, "error": "No hay campos para actualizar"}
        params.append(int(t_id))
        conn.execute(f"UPDATE transportes SET {', '.join(updates)} WHERE id=?", params)
        conn.commit()
        return {"success": True, "accion": "actualizado"}
    finally:
        conn.close()

@app.post("/api/cliente/transporte/eliminar")
async def cliente_transporte_eliminar(request: Request):
    """Elimina un vehículo de transporte"""
    data = await request.json()
    t_id = data.get("id")
    if not t_id:
        return {"success": False, "error": "ID requerido"}
    conn = get_connection()
    try:
        conn.execute("DELETE FROM transportes WHERE id=?", (int(t_id),))
        conn.commit()
        return {"success": True, "accion": "eliminado"}
    finally:
        conn.close()

# ─── PERMISO CHECK ──────────────────────────────────────
@app.get("/api/permisos/check")
def permisos_check(rol: str = Query(""), permiso: str = Query("")):
    """Verifica si un rol tiene un permiso específico"""
    if not rol or not permiso:
        return {"success": False, "error": "rol y permiso requeridos"}
    tiene = tiene_permiso(rol, permiso)
    return {"success": True, "rol": rol, "permiso": permiso, "tiene": tiene}

# ─── MODULO D'HONDT (Integrado de DDIA) ─────────────────
@app.post("/api/dhondt/calcular")
def calcular_dhondt_custom(data: dict = Body(...), x_session_id: str = Header(None)):
    """Calcula adjudicación de bancas por fórmula D'Hondt."""
    if x_session_id:
        conn_chk = get_connection()
        try:
            ced_chk = _cliente_de_sesion(conn_chk, x_session_id)
            if ced_chk and not _tiene_dato_general(conn_chk.cursor(), ced_chk):
                return {"success": False, "error": "Tu paquete no incluye datos generales (nacional/departamental)."}
        finally:
            conn_chk.close()
    bancas_totales = int(data.get("bancas", 5))
    listas = data.get("listas", [])
    if not listas or bancas_totales <= 0:
        return {"success": False, "error": "Datos incompletos"}

    cocientes = []
    for item in listas:
        nombre = str(item.get("nombre", "Sin nombre"))
        votos = int(item.get("votos", 0))
        for divisor in range(1, bancas_totales + 1):
            cocientes.append({
                "lista": nombre,
                "cociente": votos / divisor,
                "divisor": divisor,
                "votos_origen": votos
            })

    cocientes.sort(key=lambda x: x["cociente"], reverse=True)
    asignadas = {}
    detalle_adjudicaciones = []
    for i in range(min(bancas_totales, len(cocientes))):
        c = cocientes[i]
        nom = c["lista"]
        asignadas[nom] = asignadas.get(nom, 0) + 1
        detalle_adjudicaciones.append({
            "banca_nro": i + 1,
            "lista": nom,
            "cociente": round(c["cociente"], 2),
            "divisor_utilizado": c["divisor"]
        })

    resultados = []
    for item in listas:
        nom = str(item.get("nombre", ""))
        v = int(item.get("votos", 0))
        resultados.append({
            "lista": nom,
            "votos": v,
            "bancas": asignadas.get(nom, 0)
        })

    return {
        "success": True,
        "bancas_totales": bancas_totales,
        "resultados": resultados,
        "detalle_adjudicaciones": detalle_adjudicaciones,
        "cocientes_top": cocientes[:bancas_totales + 5]
    }

# ─── MODULO GAMIFICACION / RANKING DIRIGENTES (Integrado de DDIA) ───
@app.get("/api/gamificacion/ranking")
def gamificacion_ranking():
    """Ranking dinámico de efectividad de dirigentes del Día D."""
    conn = get_connection()
    try:
        c = conn.cursor()
        query = """
            SELECT 
                d.cedula,
                d.nombre,
                COALESCE(d.tipo, 'dirigente') as tipo,
                COALESCE(d.cliente_cedula, 'General') as seccional,
                (SELECT COUNT(*) FROM posible_votos pv WHERE pv.dirigente_cedula = d.cedula) as total_metas,
                (SELECT COUNT(*) FROM registros r WHERE r.dirigente = d.cedula OR r.cedula IN (SELECT votante_cedula FROM posible_votos pv WHERE pv.dirigente_cedula = d.cedula)) as confirmados,
                (SELECT COUNT(*) FROM no_voto nv WHERE nv.cedula IN (SELECT votante_cedula FROM posible_votos pv WHERE pv.dirigente_cedula = d.cedula)) as no_votos
            FROM dirigentes d
            ORDER BY confirmados DESC, total_metas DESC
        """
        rows = c.execute(query).fetchall()
        ranking = []
        for r in rows:
            ced = str(r[0])
            nom = str(r[1])
            tipo = str(r[2])
            sec = str(r[3])
            metas = int(r[4] or 0)
            conf = int(r[5] or 0)
            nov = int(r[6] or 0)
            pendientes = max(0, metas - conf - nov)

            puntos = (conf * 100) - (pendientes * 15) + (nov * 10)
            efectividad = round((conf / metas * 100), 1) if metas > 0 else 0.0

            if puntos >= 1000:
                rango = "Gran Caudillo"
                insignia = "👑"
            elif puntos >= 500:
                rango = "Líder de Zona"
                insignia = "⭐"
            elif puntos >= 100:
                rango = "Dirigente Activo"
                insignia = "🔥"
            else:
                rango = "Promesa Electoral"
                insignia = "🌱"

            ranking.append({
                "cedula": ced,
                "dirigente": nom,
                "tipo": tipo,
                "seccional": sec,
                "total_metas": metas,
                "confirmados": conf,
                "no_votos": nov,
                "pendientes": pendientes,
                "efectividad": efectividad,
                "puntos": max(0, puntos),
                "rango": rango,
                "insignia": insignia
            })

        ranking.sort(key=lambda x: (x["confirmados"], x["puntos"]), reverse=True)
        for i, item in enumerate(ranking):
            item["posicion"] = i + 1

        return {"success": True, "ranking": ranking}
    except Exception as e:
        return {"success": False, "error": str(e), "ranking": []}
    finally:
        conn.close()

# ─── MODULO BUSQUEDA RAPIDA DE PADRON (Integrado de DIA_Mesas_v2) ───
@app.get("/api/votantes_paginados")
def get_votantes_paginados(
    local_id: int = 0,
    mesa: int = 0,
    page: int = 1,
    limit: int = 50,
    q: str = ""
):
    """Búsqueda ultra-rápida paginada por local, mesa y texto"""
    conn = get_connection()
    try:
        c = conn.cursor()
        limit_val = min(max(int(limit), 10), 200)
        page_val = max(int(page), 1)
        offset_val = (page_val - 1) * limit_val

        where_clauses = ["1=1"]
        params = []
        if int(local_id) > 0:
            where_clauses.append("slocal = ?")
            params.append(int(local_id))
        if int(mesa) > 0:
            where_clauses.append("mesa = ?")
            params.append(int(mesa))
        if q and str(q).strip():
            where_clauses.append("(cedula LIKE ? OR apellido LIKE ? OR nombre LIKE ?)")
            pat = f"%{str(q).strip()}%"
            params.extend([pat, pat, pat])

        where_sql = " AND ".join(where_clauses)
        # FIX: SQL injection - where_sql contiene solo columnas fijas con placeholders ?,
        # los valores del usuario se parametrizan vía params.
        total = c.execute(f"SELECT COUNT(*) FROM padron2026_completo WHERE {where_sql}", params).fetchone()[0] or 0

        params.extend([limit_val, offset_val])
        # FIX: SQL injection - where_sql contiene solo columnas fijas con placeholders ?,
        # los valores del usuario se parametrizan vía params.
        rows = c.execute(f"""
            SELECT cedula, apellido, nombre, direccion, mesa, orden, slocal, local_nombre
            FROM padron2026_completo
            WHERE {where_sql}
            ORDER BY mesa ASC, orden ASC, cedula ASC
            LIMIT ? OFFSET ?
        """, params).fetchall()

        data = [{
            "cedula": r[0], "apellido": r[1], "nombre": r[2], "direccion": r[3],
            "mesa": r[4], "orden": r[5], "slocal": r[6], "local_nombre": r[7]
        } for r in rows]

        return {"success": True, "data": data, "total": total, "page": page_val, "limit": limit_val}
    except Exception as e:
        return {"success": False, "error": str(e), "data": [], "total": 0}
    finally:
        conn.close()

@app.get("/api/mesas_conteo")
def get_mesas_conteo(local_id: int = Query(...)):
    """Lista de mesas con recuento de votantes por local"""
    conn = get_connection()
    try:
        c = conn.cursor()
        rows = c.execute("""
            SELECT mesa, COUNT(*) as total
            FROM padron2026_completo
            WHERE slocal = ? AND mesa > 0
            GROUP BY mesa
            ORDER BY mesa
        """, (local_id,)).fetchall()
        return {"success": True, "mesas": [{"mesa": r[0], "total": r[1]} for r in rows]}
    except Exception as e:
        return {"success": False, "error": str(e), "mesas": []}
    finally:
        conn.close()

# ─── DESCARGA DE APKs COMPILADAS (Integrado de DDIA Mobile) ───
APK_DIR = os.path.join(os.path.dirname(__file__), "mobile-apk")

@app.get("/api/descargar/apk/{archivo}")
def descargar_apk(archivo: str):
    """Permite descargar directamente la APK Android al celular"""
    safe_names = {
        "final": "ddia-v2-final.apk",
        "offline": "ddia-exacto-offline.apk"
    }
    target = safe_names.get(archivo, archivo if archivo.endswith(".apk") else f"{archivo}.apk")
    file_path = os.path.join(APK_DIR, target)
    if os.path.isfile(file_path):
        return FileResponse(
            file_path,
            media_type="application/vnd.android.package-archive",
            filename=target
        )
    raise HTTPException(status_code=404, detail="APK no encontrada")

@app.get("/admin_usuarios")
def serve_admin_usuarios():
    return FileResponse(os.path.join(STATIC_DIR, "admin_usuarios.html"))

# ─── ADMIN GENERAL ───────────────────────────────────────
@app.get("/admin_general")
def serve_admin_general():
    return FileResponse(os.path.join(STATIC_DIR, "admin_general.html"))

# ─── STATIC FILES ────────────────────────────────────────
@app.get("/")
def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

TEMAS_DIR = os.path.join(STATIC_DIR, "temas")
os.makedirs(TEMAS_DIR, exist_ok=True)


def _cliente_de_sesion(conn, session_id):
    """Cedula del cliente (candidato) de una sesion: el propio cliente o el cliente del dirigente."""
    row = conn.execute("SELECT cedula FROM sesiones WHERE id=?", (session_id,)).fetchone()
    if not row:
        return None
    ced = row[0]
    if conn.execute("SELECT 1 FROM clientes WHERE cedula=? AND activo=1", (ced,)).fetchone():
        return ced
    d = conn.execute("SELECT cliente_cedula FROM dirigentes WHERE cedula=?", (ced,)).fetchone()
    return d[0] if d and d[0] else None


def _css_color(hex_color):
    h = (hex_color or "").strip().lstrip("#")
    if len(h) != 6 or any(ch not in "0123456789abcdefABCDEF" for ch in h):
        return ""
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    claro = "#%02x%02x%02x" % tuple(min(255, int(v + (255 - v) * 0.35)) for v in (r, g, b))
    oscuro = "#%02x%02x%02x" % tuple(int(v * 0.7) for v in (r, g, b))
    return (f":root {{\n  --party-color: #{h}; --party-color-rgb: {r}, {g}, {b};\n"
            f"  --gold-primary: #{h}; --gold-light: {claro}; --gold-dark: {oscuro};\n"
            f"  --gold-glow: rgba({r}, {g}, {b}, 0.28); --gold-subtle: rgba({r}, {g}, {b}, 0.12);\n"
            f"  --gold-border: rgba({r}, {g}, {b}, 0.38);\n}}\n")


@app.get("/api/certificacion")
def get_certificacion(tipo_dato: str = Query("voto"), clave: str = Query(""), s: str = Query("")):
    """Estado de certificacion de un dato compartido. Devuelve solo conteos, nunca que clientes certificaron."""
    conn = get_connection()
    try:
        cliente = _cliente_de_sesion(conn, s) if s else None
        return _estado_certificacion(conn, tipo_dato, clave, cliente)
    finally:
        conn.close()


@app.get("/api/certificacion/resumen")
def get_certificacion_resumen(tipo_dato: str = Query("voto")):
    """Calidad del dato: cuantos datos tienen 1 fuente, >=2 coincidentes o discrepancias."""
    conn = get_connection()
    try:
        rows = conn.execute("""SELECT clave, COUNT(*) AS fuentes, COUNT(DISTINCT valor) AS valores
                               FROM certificaciones WHERE tipo_dato=? GROUP BY clave""", (tipo_dato,)).fetchall()
        res = {"tipo_dato": tipo_dato, "total": len(rows), "una_fuente": 0, "certificados": 0, "discrepantes": 0}
        for _, fuentes, valores in rows:
            if valores > 1:
                res["discrepantes"] += 1
            elif fuentes >= 2:
                res["certificados"] += 1
            else:
                res["una_fuente"] += 1
        return res
    finally:
        conn.close()


@app.get("/tema-cliente.css")
def serve_tema_cliente(s: str = Query("")):
    """Tema del cliente (candidato) que inicio sesion, cargado despues de styles.css.
    - css_tema='partido': color del partido por el que puja (o temas/<SIGLA>.css si existe).
    - css_tema='propio' : temas/<cedula>.css si existe, si no color_propio_hex.
    Sin sesion o sin tema: CSS vacio (queda styles.css por defecto)."""
    headers = {"Cache-Control": "no-store"}
    css = "/* Tema por defecto (styles.css) */\n"
    conn = get_connection()
    try:
        ced = _cliente_de_sesion(conn, s) if s else None
        if ced:
            cl = conn.execute("SELECT css_tema, color_propio_hex, partido_id FROM clientes WHERE cedula=?", (ced,)).fetchone()
            modo, color_propio, partido_id = (cl[0] or "").lower(), cl[1] or "", cl[2]
            if modo == "propio":
                archivo = os.path.join(TEMAS_DIR, "".join(ch for ch in ced if ch.isalnum()) + ".css")
                if os.path.isfile(archivo):
                    return FileResponse(archivo, media_type="text/css", headers=headers)
                css = _css_color(color_propio) or css
            elif modo in ("anr", "plra", "yo_creo"):
                archivo = os.path.join(TEMAS_DIR, modo.replace("_", "").upper() + ".css")
                if os.path.isfile(archivo):
                    return FileResponse(archivo, media_type="text/css", headers=headers)
            elif modo == "partido" and partido_id:
                p = conn.execute("SELECT codigo_partido, color_principal_hex FROM partidos WHERE id=?", (partido_id,)).fetchone()
                if p:
                    sigla = "".join(ch for ch in str(p[0] or "").upper() if ch.isalnum() or ch in "-_")
                    archivo = os.path.join(TEMAS_DIR, sigla + ".css")
                    if sigla and os.path.isfile(archivo):
                        return FileResponse(archivo, media_type="text/css", headers=headers)
                    css = _css_color(p[1]) or css
    except Exception as e:
        css = f"/* tema-cliente: {e} */\n"
    finally:
        conn.close()
    return Response(css, media_type="text/css", headers=headers)


@app.get("/party_theme.js")
def serve_party_theme():
    """Sin cache: este script controla quien puede ver/usar el selector de partido
    (solo Admin Master) y un navegador con una copia vieja en cache seguiria
    exponiendo ese control a cualquier cliente."""
    return FileResponse(os.path.join(STATIC_DIR, "party_theme.js"),
                         headers={"Cache-Control": "no-cache, must-revalidate"})

@app.get("/App.html")
def serve_app():
    return FileResponse(os.path.join(STATIC_DIR, "App.html"))

# ══════════════════════════════════════════════════════════════════════════
# HERRAMIENTAS EXTENDIDAS — endpoints (rate limit, auditoría, geocerca, etc.)
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/herramientas/catalogo")
def herramientas_catalogo():
    conn = get_connection()
    try:
        c = conn.cursor()
        estado = {}
        for t in ["geocercas", "votos_audit", "webhooks", "api_keys",
                  "alertas_participacion", "reportes_programados", "cola_offline", "usuarios_2fa"]:
            try:
                estado[t] = c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
            except Exception:
                estado[t] = None
        return {"success": True, "herramientas": HERR.catalogo(), "estado_tablas": estado,
                "cache": HERR.cache.stats(), "sse": HERR.event_bus.stats()}
    finally:
        conn.close()


@app.post("/api/herramientas/geocerca/verificar")
def herramientas_geocerca_verificar(data: dict = Body(...)):
    lat = data.get("lat"); lng = data.get("lng")
    if lat is None or lng is None:
        return {"success": False, "error": "lat y lng requeridos"}
    conn = get_connection()
    try:
        return {"success": True, **HERR.verificar_geocerca(conn, str(data.get("cedula", "")),
                                                           float(lat), float(lng))}
    finally:
        conn.close()


@app.post("/api/herramientas/geocerca/crear")
def herramientas_geocerca_crear(data: dict = Body(...)):
    conn = get_connection()
    try:
        gid = HERR.crear_geocerca(conn, data.get("nombre", "Geocerca"),
                                  float(data.get("lat", 0)), float(data.get("lng", 0)),
                                  float(data.get("radio_km", 1)),
                                  data.get("cedula_conductor", ""), data.get("ruta_id"))
        return {"success": True, "id": gid}
    finally:
        conn.close()


@app.post("/api/herramientas/voto/auditar")
def herramientas_voto_auditar(data: dict = Body(...)):
    conn = get_connection()
    try:
        r = HERR.registrar_voto_auditado(
            conn, str(data.get("cedula", "")), int(data.get("mesa", 0)),
            int(data.get("orden", 0)), data.get("estado", "voto"),
            data.get("dirigente", ""), data.get("ip", ""),
            data.get("session_id", ""), bool(data.get("verificacion_ok", True)))
        HERR.event_bus.publicar("voto_registrado", {"mesa": data.get("mesa"),
                                                    "cedula": data.get("cedula")})
        return {"success": True, **r}
    finally:
        conn.close()


@app.get("/api/herramientas/voto/verificar/{audit_id}")
def herramientas_voto_verificar(audit_id: int):
    conn = get_connection()
    try:
        return {"success": True, **HERR.verificar_integridad_voto(conn, audit_id)}
    finally:
        conn.close()


@app.post("/api/herramientas/alertas/generar")
def herramientas_alertas_generar(data: dict = Body(...)):
    conn = get_connection()
    try:
        alertas = HERR.generar_alertas_participacion(
            conn, float(data.get("umbral_pct", 30)), int(data.get("min_registros", 5)))
        return {"success": True, "generadas": len(alertas), "alertas": alertas}
    finally:
        conn.close()


@app.get("/api/herramientas/alertas/lista")
def herramientas_alertas_lista():
    conn = get_connection()
    try:
        rows = conn.execute("""SELECT id, mesa, participacion, votos, total, nivel, creado
                               FROM alertas_participacion WHERE resuelto=0
                               ORDER BY participacion ASC LIMIT 100""").fetchall()
        return {"success": True, "alertas": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.post("/api/herramientas/indices/crear")
def herramientas_indices_crear():
    conn = get_connection()
    try:
        return {"success": True, "padron": HERR.crear_indices_padron(conn),
                "registros": HERR.crear_indices_registros(conn)}
    finally:
        conn.close()


@app.post("/api/herramientas/api-key/crear")
def herramientas_api_key_crear(data: dict = Body(...)):
    conn = get_connection()
    try:
        key = HERR.crear_api_key(conn, data.get("nombre", "Integracion"),
                                 data.get("rol", "lectura"))
        return {"success": True, "api_key": key}
    finally:
        conn.close()


@app.get("/api/herramientas/webhooks")
def herramientas_webhooks_lista():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT id, url, evento, descripcion, activo, creado FROM webhooks").fetchall()
        return {"success": True, "webhooks": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.post("/api/herramientas/webhooks/crear")
def herramientas_webhooks_crear(data: dict = Body(...)):
    conn = get_connection()
    try:
        wid = HERR.registrar_webhook(conn, data.get("url", ""), data.get("evento", ""),
                                     data.get("descripcion", ""))
        return {"success": True, "id": wid}
    finally:
        conn.close()


@app.post("/api/herramientas/cola/encolar")
def herramientas_cola_encolar(data: dict = Body(...)):
    conn = get_connection()
    try:
        cid = HERR.encolar_ubicacion(conn, str(data.get("cedula", "")),
                                     data.get("lat"), data.get("lng"),
                                     data.get("velocidad", 0), data.get("direccion", ""),
                                     data.get("ts_cliente", ""))
        return {"success": True, "id": cid,
                "pendientes": HERR.cola_pendiente(conn, data.get("cedula", ""))}
    finally:
        conn.close()


@app.post("/api/herramientas/cola/sincronizar")
def herramientas_cola_sincronizar(data: dict = Body(...)):
    conn = get_connection()
    try:
        return {"success": True, **HERR.sincronizar_cola(conn, data.get("cedula", ""))}
    finally:
        conn.close()


@app.post("/api/herramientas/2fa/generar")
def herramientas_2fa_generar(data: dict = Body(...)):
    cedula = str(data.get("cedula", "")).strip()
    if not cedula:
        return {"success": False, "error": "cedula requerida"}
    return {"success": True, "codigo": HERR.generar_codigo_2fa(cedula),
            "secreto": HERR.generar_secreto_2fa(cedula)}


@app.post("/api/herramientas/2fa/verificar")
def herramientas_2fa_verificar(data: dict = Body(...)):
    ok = HERR.verificar_codigo_2fa(str(data.get("cedula", "")).strip(),
                                   str(data.get("codigo", "")).strip())
    return {"success": ok, "valido": ok}


@app.post("/api/herramientas/2fa/activar")
def herramientas_2fa_activar(data: dict = Body(...)):
    conn = get_connection()
    try:
        HERR.activar_2fa(conn, str(data.get("cedula", "")), int(data.get("activo", 1)))
        return {"success": True}
    finally:
        conn.close()


@app.get("/api/herramientas/eventos")
def herramientas_eventos(desde: int = 0):
    return {"success": True, "eventos": HERR.event_bus.historial(desde),
            "stats": HERR.event_bus.stats()}


@app.get("/api/herramientas/cache/stats")
def herramientas_cache_stats():
    return {"success": True, **HERR.cache.stats()}


@app.post("/api/herramientas/cache/limpiar")
def herramientas_cache_limpiar(data: dict = Body(default={})):
    HERR.cache.invalidar(data.get("prefijo", ""))
    return {"success": True, **HERR.cache.stats()}


@app.post("/api/herramientas/reportes/programar")
def herramientas_reportes_programar(data: dict = Body(...)):
    conn = get_connection()
    try:
        rid = HERR.programar_reporte(conn, data.get("nombre", "Reporte"),
                                     data.get("tipo", "general"),
                                     data.get("frecuencia", "diario"),
                                     data.get("destinatarios", ""))
        return {"success": True, "id": rid}
    finally:
        conn.close()


@app.get("/api/herramientas/reportes/pendientes")
def herramientas_reportes_pendientes():
    conn = get_connection()
    try:
        return {"success": True, "pendientes": HERR.reportes_pendientes(conn)}
    finally:
        conn.close()


# ══════════════════════════════════════════════════════════════════════════
# ORGANIZACIÓN — jerarquía del Partido
# ══════════════════════════════════════════════════════════════════════════

@app.get("/api/organizacion/partido/{partido_id}/arbol")
def organizacion_arbol(partido_id: int):
    conn = get_connection()
    try:
        a = ORG.arbol_partido(conn, partido_id)
        if a.get("error"):
            return {"success": False, "error": a["error"]}
        return {"success": True, **a}
    finally:
        conn.close()


@app.get("/api/organizacion/partidos")
def organizacion_partidos():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT p.id, p.nombre_oficial, p.sigla, p.cliente_cedula,
                   (SELECT COUNT(*) FROM unidades_organizacion u WHERE u.partido_id=p.id) AS seccionales,
                   (SELECT COUNT(*) FROM escuelas_electorales e WHERE e.partido_id=p.id AND e.activo=1) AS escuelas,
                   (SELECT COUNT(*) FROM partido_dirigentes pd WHERE pd.partido_id=p.id AND pd.activo=1) AS dirigentes
            FROM partidos p ORDER BY p.nombre_oficial
        """).fetchall()
        return {"success": True, "partidos": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.post("/api/organizacion/escuela/crear")
def organizacion_escuela_crear(data: dict = Body(...)):
    conn = get_connection()
    try:
        eid = ORG.crear_escuela(conn, data.get("partido_id"), data.get("nombre", "Escuela"),
                                data.get("departamento_id"), data.get("distrito_id"),
                                data.get("unidad_id"), data.get("responsable_cedula", ""),
                                data.get("direccion", ""), data.get("telefono", ""))
        return {"success": True, "id": eid}
    finally:
        conn.close()


@app.get("/api/organizacion/escuelas")
def organizacion_escuelas(partido_id: int = 0):
    conn = get_connection()
    try:
        if partido_id:
            rows = conn.execute("""SELECT * FROM escuelas_electorales
                                   WHERE partido_id=? AND activo=1 ORDER BY nombre""",
                                (partido_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM escuelas_electorales WHERE activo=1 ORDER BY nombre").fetchall()
        return {"success": True, "escuelas": [dict(r) for r in rows]}
    finally:
        conn.close()


@app.post("/api/organizacion/vincular/partido-dirigente")
def organizacion_vincular_partido_dirigente(data: dict = Body(...)):
    conn = get_connection()
    try:
        ORG.vincular_partido_dirigente(conn, data.get("partido_id"),
                                       data.get("dirigente_cedula", ""),
                                       data.get("rol_partido", "dirigente"))
        return {"success": True, "accion": "vinculado"}
    finally:
        conn.close()


@app.get("/api/organizacion/dirigente/{cedula}/partidos")
def organizacion_dirigente_partidos(cedula: str):
    conn = get_connection()
    try:
        return {"success": True, "partidos": ORG.partidos_del_dirigente(conn, cedula)}
    finally:
        conn.close()


@app.post("/api/organizacion/vincular/pc-candidato")
def organizacion_vincular_pc_candidato(data: dict = Body(...)):
    conn = get_connection()
    try:
        ORG.vincular_pc_candidato(conn, data.get("pc_id"), data.get("candidato_id"),
                                  data.get("tipo_apoyo", "apoyo"))
        return {"success": True, "accion": "vinculado"}
    finally:
        conn.close()


@app.get("/api/organizacion/pc/{pc_id}/candidatos")
def organizacion_pc_candidatos(pc_id: int):
    conn = get_connection()
    try:
        return {"success": True, "candidatos": ORG.candidatos_del_pc(conn, pc_id)}
    finally:
        conn.close()


@app.post("/api/organizacion/vincular/pc-conductor")
def organizacion_vincular_pc_conductor(data: dict = Body(...)):
    conn = get_connection()
    try:
        ok = ORG.vincular_pc_conductor(conn, data.get("pc_id"), data.get("transporte_id"))
        return {"success": ok, "accion": "vinculado" if ok else "no encontrado"}
    finally:
        conn.close()


@app.get("/api/organizacion/pc/{pc_id}/conductores")
def organizacion_pc_conductores(pc_id: int):
    conn = get_connection()
    try:
        return {"success": True, "conductores": ORG.conductores_del_pc(conn, pc_id)}
    finally:
        conn.close()


@app.get("/api/organizacion/conductor/{transporte_id}/pc")
def organizacion_conductor_pc(transporte_id: int):
    conn = get_connection()
    try:
        return {"success": True, "pc": ORG.pcs_del_conductor(conn, transporte_id)}
    finally:
        conn.close()


@app.get("/{page}")
def serve_page(page: str):
    path = os.path.join(STATIC_DIR, page)
    if os.path.isfile(path):
        # Sin cache: los cambios de tema/paleta/html se ven al instante
        # sin depender de Ctrl+F5 en el navegador.
        if path.endswith(".css") or path.endswith(".js"):
            return FileResponse(
                path,
                headers={"Cache-Control": "no-store, must-revalidate"},
            )
        if path.endswith(".html"):
            return FileResponse(
                path,
                headers={"Cache-Control": "no-cache, must-revalidate"},
            )
        return FileResponse(path)
    if os.path.isfile(path + ".html"):
        return FileResponse(
            path + ".html",
            headers={"Cache-Control": "no-cache, must-revalidate"},
        )
    raise HTTPException(404)
