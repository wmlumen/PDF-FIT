"""
Microservicio público del votante para DIA D MASTER.
Proporciona enlaces seguros e intrabilidosos que permiten a un votante obtener
información pública (nombre, ubicación, estado de recogida) y compartir su GPS sin necesidad de inicio de sesión.

Endpoints:
  GET /                 → Estado de salud simple (útil para pruebas)
  GET /health           → Healthcheck para Render o supervisión externa
  GET /r/{token}        → Redirección (302) a /mi_recogida.html?t={token}
  GET /mi_recogida.html → Página principal del votante (inyecta og:image para WhatsApp)
  GET /ubicacion_votante_compartida.html → Vista de mapa solo para compartir ubicación
  POST /correo          → Punto de entrada (webhook) para CRM/redirectiones externos

Datos protegidos (solo se exponen los estrictamente necesarios):
  - posible_votos (solo filas con token_publico)        → 2 registros (ejemplo real)
  - padron2026_completo (solo esas filas)              → 2 registros (sin columna direccion)
  - locales_votacion_tsje (sin direccion)            → 230 registros (sin column direccion)
  - dirigentes (solo nombre)                           → 1 registro (sin teléfono/email)
  - solicitudes_recogida / viajes / transportes / ubicaciones_* → minimalistas para funcionalidad del conductor

La DB pública se construye con build_public_db.py para garantizar la limpieza de PII.
"""

import io
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Configuración
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "public_votante.db")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Crear la aplicación FastAPI
app = FastAPI(
    title="DIA D MASTER — Enlace del Votante",
    docs_url=None,
    redoc_url=None,
)

# Montar los archivos estáticos (vendor, HTML, etc.)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ---------------------------------------------------------------------------
# Utilidades del backend
# ---------------------------------------------------------------------------

@contextmanager
def _db():
    conn = sqlite3.connect(DB_PATH, timeout=10.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        yield conn
    finally:
        conn.close()


def _limpiar_token(t: Optional[str]) -> str:
    return t.strip() if t else ""

# ---------------------------------------------------------------------------
# Healthchecks
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "message": "DIA D MASTER — Healthcheck del Endpoint del Votante",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/health")
async def health_check():
    try:
        with _db() as conn:
            n = conn.execute("SELECT COUNT(*) FROM posible_votos WHERE token_publico<>''").fetchone()[0]
        return JSONResponse(
            {
                "status": "healthy",
                "service": "votante_publico",
                "tokens_activos": n,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
    except Exception as e:
        return JSONResponse(
            {"status": "error", "detalle": str(e)}, status_code=500
        )

# ---------------------------------------------------------------------------
# Utilidad de correo (inbound) para sistemas externos
# ---------------------------------------------------------------------------

class CorreoEntrada(BaseModel):
    campo_reclamado: str
    mensaje: Optional[str] = None
    prioridad: str = "media"

@app.post("/correo")
async def correo_en(r: CorreoEntrada, request: Request):
    redirecciones = {
        "cedula": "/mi_recogida.html?t=cedula_token",
        "telefono": "/mi_recogida.html?t=telefono_token",
        "email": "/mi_recogida.html?t=email_token",
        "chat": "/mi_recogida.html?t=chat_token",
    }
    ruta = redirecciones.get(r.campo_reclamado, redirecciones["cedula"])

    ua = str(request.headers.get("user-agent", "")).lower()
    suspected_bot = "bot" in ua or "curl" in ua
    if suspected_bot:
        import time
        time.sleep(0.5)

    return {"redireccion": ruta, "prioridad": r.prioridad}

# ---------------------------------------------------------------------------
# Redirección corta (/r/{token})
# ---------------------------------------------------------------------------

@app.get("/r/{token}")
def redirigir(token: str):
    return Response(
        status_code=302,
        headers={"Location": f"/mi_recogida.html?t={token}"},
    )

# ---------------------------------------------------------------------------
# Endpoint del votante (público, por token)
# ---------------------------------------------------------------------------

@app.get("/api/votante_publico")
async def votante_publico(token_param: Optional[str] = None, request: Optional[Request] = None):
    token = _limpiar_token(token_param)
    if not token:
        return {"success": False, "error": "Token inválido"}

    try:
        with _db() as conn:
            row = conn.execute(
                "SELECT pv.id, pv.votante_nombre, pv.votante_apellido, pv.votante_mesa, "
                "pv.votante_orden, pv.status, pv.votante_lat, pv.votante_lng, "
                "COALESCE(NULLIF(p.local_nombre,''),''), d.nombre, pv.votante_cedula, pv.token_publico "
                "FROM posible_votos pv "
                "LEFT JOIN padron2026_completo p ON p.cedula = pv.votante_cedula "
                "LEFT JOIN dirigentes d ON d.cedula = pv.dirigente_cedula "
                "WHERE pv.token_publico = ?",
                (token,),
            ).fetchone()
            if not row:
                return {"success": False, "error": "Token no válido o vencido"}

            local_lat = local_lng = None
            try:
                local_row = conn.execute(
                    "SELECT lat, lng, nombre FROM locales_votacion_tsje WHERE nombre=?",
                    (row[8] or "",),
                ).fetchone()
                if local_row:
                    local_lat, local_lng, _ = local_row[0], local_row[1], local_row[2]
            except Exception:
                pass

            votante_lat, votante_lng = row[6], row[7]

            sol = conn.execute(
                "SELECT hora_recogida, estado, ubicacion FROM solicitudes_recogida "
                "WHERE votante_cedula = ? ORDER BY created_at DESC LIMIT 1",
                (row[10] or "",),
            ).fetchone()

            nombre_completo = row[1]
            if nombre_completo:
                pass

            res = {
                "success": True,
                "nombre": nombre_completo,
                "mesa": row[3],
                "orden": row[4],
                "status": row[5],
                "votante_lat": votante_lat,
                "votante_lng": votante_lng,
                "local_lat": local_lat,
                "local_lng": local_lng,
                "hora_recogida": sol[0] if sol else None,
                "ubicacion": sol[2] if sol else None,
                "estado_recogida": sol[1] if sol else None,
            }
            return res
    except sqlite3.Error:
        return {"success": False, "error": "Servicio no disponible"}

# ---------------------------------------------------------------------------
# Editar recogida (sin login)
# ---------------------------------------------------------------------------

@app.post("/api/votante_publico/editar")
async def votante_editar(request: Request):
    data = await request.json()
    token = _limpiar_token(data.get("token"))
    hora = data.get("hora_recogida")
    ubic = data.get("ubicacion")
    if not token or not hora or not ubic:
        return {"success": False, "error": "Hora y ubicación requeridas"}

    try:
        with _db() as conn:
            pv = conn.execute(
                "SELECT dirigente_cedula, votante_cedula FROM posible_votos WHERE token_publico=?",
                (token,),
            ).fetchone()
            if not pv:
                return {"success": False, "error": "Token inválido"}
            dc, vc = pv

            sol = conn.execute(
                "SELECT id FROM solicitudes_recogida WHERE dirigente_cedula=? AND votante_cedula=?",
                (dc, vc),
            ).fetchone()
            if sol:
                conn.execute(
                    "UPDATE solicitudes_recogida SET hora_recogida=?, ubicacion=? WHERE id=?",
                    (hora, ubic, sol[0]),
                )
            else:
                conn.execute(
                    "INSERT INTO solicitudes_recogida (dirigente_cedula, votante_cedula, hora_recogida, ubicacion, estado)"
                    " VALUES (?,?,?,?,?,'pendiente')",
                    (dc, vc, hora, ubic),
                )
            conn.commit()
            return {"success": True}
    except sqlite3.Error:
        return {"success": False, "error": "No se pudo actualizar"}

# ---------------------------------------------------------------------------
# Compartir ubicación (sin login)
# ---------------------------------------------------------------------------

@app.post("/api/votante_publico/ubicacion")
async def votante_ubicacion(request: Request):
    data = await request.json()
    token = _limpiar_token(data.get("token"))
    lat = data.get("lat")
    lng = data.get("lng")
    if not token or lat is None or lng is None:
        return {"success": False, "error": "Datos requeridos"}

    try:
        with _db() as conn:
            cur = conn.execute(
                "UPDATE posible_votos SET votante_lat=?, votante_lng=? WHERE token_publico=?",
                (lat, lng, token),
            )
            conn.commit()
            if cur.rowcount == 0:
                return {"success": False, "error": "Token inválido"}

            vc = conn.execute(
                "SELECT votante_cedula FROM posible_votos WHERE token_publico=?", (token,)
            ).fetchone()
            if vc and data.get("seguimiento"):
                conn.execute(
                    "INSERT INTO ubicaciones_votantes (votante_cedula, lat, lng) VALUES (?,?,?)",
                    (vc[0], lat, lng),
                )
                conn.commit()
            return {"success": True}
    except sqlite3.Error:
        return {"success": False, "error": "No se pudo guardar la ubicación"}

# ---------------------------------------------------------------------------
# Comprobante PNG (para WhatsApp)
# ---------------------------------------------------------------------------

@app.get("/api/votante_publico/imagen")
def imagen_votante(token: Optional[str] = None):
    if not token:
        return Response(status_code=404)

    try:
        with _db() as conn:
            row = conn.execute(
                "SELECT pv.votante_nombre, pv.votante_apellido, pv.votante_mesa, "
                "pv.votante_orden, p.local_nombre FROM posible_votos pv "
                "LEFT JOIN padron2026_completo p ON p.cedula = pv.votante_cedula "
                "WHERE pv.token_publico = ?",
                (token,),
            ).fetchone()
            if not row:
                return Response(status_code=404)

            nombre = row[0] or (f"{row[1]} {row[2]}" if row[2] else "")
            nombre = nombre.strip() or "Votante"

            try:
                from PIL import Image, ImageDraw, ImageFont
                W, H = 1000, 560
                img = Image.new("RGB", (W, H), "#0a0a0f")
                draw = ImageDraw.Draw(img)

                draw.rectangle([0, 0, W, 150], fill="#13141a")
                draw.rectangle([0, 146, W, 150], fill="#dfc07b")

                try:
                    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
                except Exception:
                    f = ImageFont.load_default()
                draw.text((48, 90), nombre, font=f, fill="#ffffff")

                buf = io.BytesIO()
                img.save(buf, format="PNG")
                buf.seek(0)
                from fastapi.responses import StreamingResponse
                return StreamingResponse(buf, media_type="image/png")
            except Exception:
                return Response(content="Imágen no disponible", status_code=503)
    except sqlite3.Error:
        return Response(status_code=404)

# ---------------------------------------------------------------------------
# Páginas para el votante (HTML)
# ---------------------------------------------------------------------------

@app.get("/mi_recogida.html")
def servir_mi_recogida(token: Optional[str] = None, request: Optional[Request] = None):
    html_path = os.path.join(STATIC_DIR, "mi_recogida.html")
    try:
        with open(html_path, encoding="utf-8") as f:
            html = f.read()
    except OSError:
        return {"error": "Página no encontrada"}, 404

    og_image_url = None
    share_link_token = None
    if token:
        share_link_token = token
        host = str(request.base_url).rstrip("/") if request else ""
        og_image_url = f"{host}/api/votante_publico/imagen?t={token}"

    if og_image_url:
        og_block = f'''
        <meta property="og:title" content="Tu recogida — DIA D MASTER">
        <meta property="og:description" content="Compartí tu ubicación para que te vayan a buscar">
        <meta property="og:image" content="{og_image_url}">
        <meta property="og:image:width" content="1000">
        <meta property="og:image:height" content="560">
        '''
        html = html.replace("</head>", og_block + "</head>", 1)

    if share_link_token:
        html = html.replace(
            "https://tu-sitio.com/compartir",
            f"/r/{share_link_token}",
        )
    return HTMLResponse(html)

@app.get("/ubicacion_votante_compartida.html")
def servir_ubicacion_compartida(token: Optional[str] = None):
    token = _limpiar_token(token)
    html_path = os.path.join(STATIC_DIR, "ubicacion_votante_compartida.html")
    try:
        with open(html_path, encoding="utf-8") as f:
            html = f.read()
    except OSError:
        return {"error": "Página no encontrada"}, 404
    if token:
        html = html.replace("TOKEN_PLACEHOLDER", token)
    return HTMLResponse(html)
