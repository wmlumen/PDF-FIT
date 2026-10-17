# Dibujo de Módulo: Página de Candidato

**Proyecto:** DIA_D_MASTER  
**Objetivo:** Espacio web auditable, transparente y estratégico que fortalezca la conexión candidato↔votante y genere información útil para planificación institucional.  
**Auditoría:** Cumple Ley 5534/2016 (Transparencia activa), Ley 6534/2020 (Protección de datos personales).

---

## 1. Visión General del Módulo

```
┌─────────────────────────────────────────────────────────────┐
│                    PÁGINA DE CANDIDATO                       │
│  (candidato.html — página pública + panel autorizado)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Presentación│  │  Encuesta   │  │ Consulta    │        │
│  │ Institucional│  │ Programática│  │ Lugar Votación│       │
│  │ (foto,bio,  │  │ (registro   │  │ (cédula →   │        │
│  │  cargo,logo)│  │  respuestas)│  │  local+mesa)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Registro de │  │Transparencia│  │  Panel      │        │
│  │ Simpatía    │  │ y Auditoría │  │ Estratégico │        │
│  │ (métricas)  │  │ (historial, │  │ (métricas,  │        │
│  │             │  │  PDF/Excel) │  │  mapa,whats)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │ Frontend │    │ Backend  │    │  DB SQLite   │
   │ Tailwind │◄──►│ FastAPI  │◄──►│  (6 tablas   │
   │ +Leaflet │    │ 20 endpoints│  │   nuevas)    │
   └──────────┘    └──────────┘    └──────────────┘
```

---

## 2. Esquema de Datos (6 tablas nuevas)

### 2.1 `perfil_candidato`
```sql
CREATE TABLE perfil_candidato (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidato_id INTEGER NOT NULL,           -- FK a candidatos.id
    foto_url TEXT,                           -- URL de foto oficial
    bio_breve TEXT,                          -- Biografía (máx 500 chars)
    cargo_postula TEXT,                      -- Cargo al que postula
    partido_id INTEGER,                      -- FK a partidos.id
    partido_logo_url TEXT,                   -- Logo/emblema
    propuestas_clave TEXT,                   -- JSON array de propuestas
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(candidato_id)
);
```

### 2.2 `preguntas_encuesta`
```sql
CREATE TABLE preguntas_encuesta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidato_id INTEGER NOT NULL,           -- FK a candidatos.id
    pregunta TEXT NOT NULL,                  -- Texto de la pregunta
    opciones TEXT NOT NULL,                  -- JSON array: ["opción A","opción B",...]
    orden INTEGER NOT NULL,                  -- Orden de presentación
    activa INTEGER DEFAULT 1,                -- 0=oculta, 1=visible
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### 2.3 `respuestas_encuesta`
```sql
CREATE TABLE respuestas_encuesta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pregunta_id INTEGER NOT NULL,            -- FK a preguntas_encuesta.id
    votante_cedula TEXT NOT NULL,            -- FK a padron2026_completo.cedula
    respuesta TEXT NOT NULL,                 -- Opción elegida
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(pregunta_id, votante_cedula)      -- 1 respuesta por votante por pregunta
);
```

### 2.4 `simpatizantes`
```sql
CREATE TABLE simpatizantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidato_id INTEGER NOT NULL,           -- FK a candidatos.id
    votante_cedula TEXT NOT NULL,            -- FK a padron2026_completo.cedula
    departamento_id INTEGER,                  -- FK a departamentos.id
    distrito_id INTEGER,                     -- FK a distritos.id
    lat REAL,                                -- Georreferenciación
    lng REAL,                                -- Georreferenciación
    nivel_interes INTEGER DEFAULT 1,         -- 1=bajo, 2=medio, 3=alto
    origen TEXT DEFAULT 'web',               -- web, whatsapp, qr
    created_at TEXT DEFAULT (datetime('now','localtime')),
    UNIQUE(candidato_id, votante_cedula)      -- 1 registro por votante
);
```

### 2.5 `historial_publicaciones`
```sql
CREATE TABLE historial_publicaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidato_id INTEGER NOT NULL,           -- FK a candidatos.id
    campo_modificado TEXT NOT NULL,          -- foto, bio, propuesta_X, etc
    valor_anterior TEXT,                     -- Valor antes del cambio
    valor_nuevo TEXT,                        -- Valor después del cambio
    modificado_por TEXT NOT NULL,            -- cédula del usuario que modificó
    ip_modificacion TEXT,                    -- IP desde que se modificó
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

### 2.6 `eventos_en_vivo`
```sql
CREATE TABLE eventos_en_vivo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidato_id INTEGER NOT NULL,           -- FK a candidatos.id
    titulo TEXT NOT NULL,                    -- Título del evento
    descripcion TEXT,                        -- Descripción
    url_stream TEXT,                         -- URL de stream (YouTube/Facebook Live)
    fecha_hora TEXT,                         -- Fecha y hora del evento
    estado TEXT DEFAULT 'programado',        -- programado, en_vivo, finalizado
    created_at TEXT DEFAULT (datetime('now','localtime'))
);
```

---

## 3. Endpoints del Backend (20 nuevos)

### 3.1 Presentación Institucional (3)
| Método | Ruta | Función | Auth |
|--------|------|---------|------|
| GET | `/api/candidato/perfil/{candidato_id}` | Perfil completo: foto, bio, cargo, partido, logo | Público |
| POST | `/api/candidato/perfil/actualizar` | Actualizar foto, bio, propuestas (registra en historial) | Master |
| GET | `/api/candidato/partido/{partido_id}` | Logo y datos del partido | Público |

### 3.2 Encuesta Interactiva (3)
| Método | Ruta | Función | Auth |
|--------|------|---------|------|
| GET | `/api/candidato/encuesta/{candidato_id}` | Preguntas activas + opciones | Público |
| POST | `/api/candidato/encuesta/responder` | Registrar respuesta (votante + pregunta + opción) | Votante |
| GET | `/api/candidato/encuesta/resultados/{candidato_id}` | Conteo de respuestas por pregunta | Dirigente |

### 3.3 Consulta de Lugar de Votación (1)
| Método | Ruta | Función | Auth |
|--------|------|---------|------|
| GET | `/api/candidato/lugar-votacion?cedula=XXX` | Cédula → local + mesa + dirección + geolocalización | Público |

Este endpoint reutiliza la lógica existente de `buscar_padron` + `consulta_mesa` pero envuelto en candidato.html para darle contexto.

### 3.4 Registro de Simpatía (4)
| Método | Ruta | Función | Auth |
|--------|------|---------|------|
| POST | `/api/candidato/simpatia/registrar` | Votante se marca como simpatizante (1x, idempotent) | Votante |
| GET | `/api/candidato/simpatia/metricas/{candidato_id}` | Total, por zona, por nivel de interés | Dirigente |
| GET | `/api/candidato/simpatia/mapa/{candidato_id}` | Puntos GPS de simpatizantes | Dirigente |
| GET | `/api/candidato/simpatia/comparativo` | Comparación entre candidatos | Master |

### 3.5 Transparencia y Auditoría (4)
| Método | Ruta | Función | Auth |
|--------|------|---------|------|
| GET | `/api/candidato/historial/{candidato_id}` | Historial de cambios | Público |
| GET | `/api/candidato/exportar/pdf/{candidato_id}` | PDF con historial + métricas | Master |
| GET | `/api/candidato/exportar/excel/{candidato_id}` | Excel con métricas + simpatizantes | Master |
| GET | `/api/candidato/publicaciones/{candidato_id}` | Lista de publicaciones activas | Público |

### 3.6 Uso Estratégico (5)
| Método | Ruta | Función | Auth |
|--------|------|---------|------|
| GET | `/api/candidato/eventos/{candidato_id}` | Eventos programados y en vivo | Público |
| POST | `/api/candidato/eventos/crear` | Crear evento | Master |
| POST | `/api/candidato/notificar` | Enviar WhatsApp/SMS/correo a simpatizantes | Master |
| GET | `/api/candidato/dashboard/{candidato_id}` | Dashboard completo (métricas + eventos + simpatía) | Dirigente |
| GET | `/api/candidato/stream/{candidato_id}` | URL de stream si hay evento en vivo | Público |

---

## 4. Frontend: `candidato.html`

### 4.1 Estructura de la Página

```
┌─────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────┐  │
│  │           HEADER: Logo Partido + Foto Candidato   │  │
│  │           Nombre + Cargo al que postula          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PESTAÑAS:                                         │  │
│  │  [Biografía] [Encuesta] [Lugar Votación] [Simpatía]│  │
│  │  [Transparencia] [Estrategia]                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │  BIOGRAFÍA    │  │  ENCUESTA     │  │  LUGAR     │  │
│  │  - Foto       │  │  - Preguntas  │  │  VOTACIÓN  │  │
│  │  - Texto      │  │  - Opciones   │  │  - Cédula  │  │
│  │  - Propuestas │  │  - Resultados │  │  - Local   │  │
│  └───────────────┘  └───────────────┘  └────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  REGISTRO DE SIMPATÍA                             │  │
│  │  [Botón "Apoyo a este candidato"]                 │  │
│  │  → Confirma cédula → Registra + Geolocalización   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  TRANSPARENCIA                                    │  │
│  │  - Historial de cambios (fecha, campo, autor)     │  │
│  │  - Botón exportar PDF                             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ESTRATEGIA (visible solo con login dirigente)    │  │
│  │  - Métricas comparativas (gráfico barras)         │  │
│  │  - Mapa de simpatizantes (Leaflet)                │  │
│  │  - Botón notificar (WhatsApp/SMS)                 │  │
│ │  - Eventos en vivo (embed YouTube/Facebook)        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Componentes del Frontend

```javascript
// === API HELPER (consistente con páginas existentes) ===
async function apiPostCandidato(action, body) {
    const u = getSessionUser();
    if (u) { body.cedula_auth = u.cedula; body.password_auth = sessionStorage.getItem('user_pw') || ''; }
    const r = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({action, ...body})
    });
    return r.json();
}

// === 1. CARGAR PERFIL ===
async function cargarPerfil(candidatoId) {
    const r = await fetch(`/api/candidato/perfil/${candidatoId}`);
    const d = await r.json();
    if (!d.success) return;
    document.getElementById('foto').src = d.perfil.foto_url || 'default-avatar.png';
    document.getElementById('nombre').textContent = d.perfil.nombre;
    document.getElementById('cargo').textContent = d.perfil.cargo_postula;
    document.getElementById('bio').textContent = d.perfil.bio_breve;
    document.getElementById('logo-partido').src = d.perfil.partido_logo_url;
    // Propuestas clave
    renderPropuestas(d.perfil.propuestas_clave);
}

// === 2. ENCUESTA ===
async function cargarEncuesta(candidatoId) {
    const r = await fetch(`/api/candidato/encuesta/${candidatoId}`);
    const d = await r.json();
    d.preguntas.forEach(p => {
        renderPregunta(p.id, p.pregunta, p.opciones);
    });
}

async function responderEncuesta(preguntaId, opcion) {
    const cedula = prompt('Ingrese su cédula para registrar su respuesta:');
    if (!cedula) return;
    await apiPostCandidato('encuesta_responder', {pregunta_id: preguntaId, respuesta: opcion, cedula});
}

// === 3. LUGAR DE VOTACIÓN ===
async function consultarLugar() {
    const cedula = document.getElementById('cedula-consulta').value.trim();
    if (!cedula) return alert('Ingrese su cédula');
    const r = await fetch(`/api/candidato/lugar-votacion?cedula=${cedula}`);
    const d = await r.json();
    if (d.success) {
        renderLugarVotacion(d.lugar);  // local, mesa, dirección
    } else {
        alert('Cédula no encontrada en el padrón');
    }
}

// === 4. SIMPATÍA ===
async function registrarSimpatia(candidatoId) {
    const cedula = prompt('Ingrese su cédula para registrar su apoyo:');
    if (!cedula) return;
    const geo = await obtenerGeolocalización();
    await apiPostCandidato('simpatia_registrar', {
        candidato_id: candidatoId,
        cedula,
        lat: geo?.lat || null,
        lng: geo?.lng || null
    });
    mostrarMetricas(candidatoId);  // Actualizar contador
}

// === 5. MÉTRICAS ESTRATÉGICAS (panel) ===
async function mostrarMetricas(candidatoId) {
    const r = await fetch(`/api/candidato/dashboard/${candidatoId}`);
    const d = await r.json();
    renderGraficoBarras(d.comparativo);     // Chart.js
    renderMapaSimpatizantes(d.mapa);        // Leaflet
    renderEventos(d.eventos);               // Lista de eventos
}

// === 6. NOTIFICACIÓN WHATSAPP ===
async function notificarSimpatizantes(candidatoId, mensaje) {
    if (!confirm(`¿Enviar mensaje a ${mensaje.simpatizantes} simpatizantes?`)) return;
    await apiPostCandidato('notificar_simpatizantes', {
        candidato_id: candidatoId,
        mensaje: mensaje.texto,
        canal: mensaje.canal  // whatsapp, sms, email
    });
}

// === 7. EXPORTAR ===
async function exportarPDF(candidatoId) {
    window.open(`/api/candidato/exportar/pdf/${candidatoId}`, '_blank');
}
```

---

## 5. Seguridad y Auditoría

### 5.1 Control de Acceso
- **Público (sin login):** Perfil, encuesta, lugar de votación, historial, eventos
- **Votante (login):** Responder encuesta, registrar simpatía
- **Dirigente:** Métricas, mapa, dashboard
- **Master:** Actualizar perfil, exportar PDF/Excel, notificar, eventos

### 5.2 Auditoría de Cambios
Cada modificación de perfil se registra automáticamente:
```python
# En el endpoint de actualización:
def _registrar_cambio(candidato_id, campo, valor_anterior, valor_nuevo, usuario, ip):
    c.execute("""INSERT INTO historial_publicaciones 
        (candidato_id, campo_modificado, valor_anterior, valor_nuevo, modificado_por, ip_modificacion)
        VALUES (?,?,?,?,?,?)""", (candidato_id, campo, valor_anterior, valor_nuevo, usuario, ip))
```

### 5.3 Rate Limiting
- Simpatía: 1 registro por cédula (UNIQUE constraint)
- Encuesta: 1 respuesta por pregunta por votante (UNIQUE constraint)
- Lugar de votación: rate limit 10 req/min por IP (para evitar scraping de padrón)

### 5.4 Protección de Datos (Ley 6534/2020)
- Solo se almacena cédula, opción de respuesta y geoloc aproximada
- NO se almacena: nombre, dirección, teléfono del votante en estas tablas
- El votante puede solicitar eliminación de su simpatía (derecho al olvido)

### 5.5 CORS y Headers
```python
headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:;"
}
```

---

## 6. Integración con Sistema Existente

### 6.1 Reutilización de Componentes
| Componente | Uso | Fuente |
|-----------|-----|--------|
| apiPost() | Llamadas al backend | auth.js (existente) |
| getSessionUser() | Obtener cédula del votante | auth.js (existente) |
| Leaflet | Mapa de simpatizantes | vendor/leaflet/ (local) |
| Chart.js | Gráficos de métricas | vendor/chart.umd.js (local) |
| apiPadron() | Consulta lugar de votación | api/padron/buscar (existente) |
| Tailwind CSS | Estilos | tailwind.min.js (local) |

### 6.2 Integración con Padrón
El endpoint `/api/candidato/lugar-votacion` reutiliza la lógica de `buscar_padron`:
```python
@app.get("/api/candidato/lugar-votacion")
def lugar_votacion(cedula: str = Query(...)):
    ced = normalizar_cedula(cedula)
    conn = get_connection()
    # Buscar en padron2026_completo
    row = conn.execute("""
        SELECT p.cedula, p.nombre, p.direccion, p.mesa, p.orden, p.depart
        FROM padron2026_completo p WHERE p.cedula=?
    """, (ced,)).fetchone()
    if not row:
        return {"success": False, "error": "Cédula no encontrada"}
    return {"success": True, "lugar": {
        "cedula": row[0], "nombre": row[1], "direccion": row[2],
        "mesa": row[3], "orden": row[4], "departamento": row[5]
    }}
```

### 6.3 Integración WhatsApp
Usa el patrón existente de Twilio/twilio.txt ya configurado:
```python
@app.post("/api/candidato/notificar")
def notificar_simpatizantes(data: dict = Body(...)):
    candidato_id = data.get("candidato_id")
    mensaje = data.get("mensaje")
    canal = data.get("canal", "whatsapp")  # whatsapp, sms, email
    
    conn = get_connection()
    cedulas = [r[0] for r in conn.execute(
        "SELECT votante_cedula FROM simpatizantes WHERE candidato_id=?", (candidato_id,)
    )]
    
    if canal == "whatsapp":
        # Usar WhatsApp Business API (patrón existente con twilio.txt)
        for ced in cedulas:
            numero = _obtenir_telefono_por_cedula(ced, conn)
            if numero:
                _enviar_whatsapp(numero, mensaje)
    
    return {"success": True, "enviados": len(cedulas), "canal": canal}
```

---

## 7. Panel de Métricas Detallado

### 7.1 Dashboard del Candidato (vista Dirigente)
```
┌─────────────────────────────────────────────────────────┐
│  DASHBOARD: Candidato X                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Simpatizantes│  │ Encuestas   │  │ Consultas   │   │
│  │   1,234     │  │   567 resp  │  │   890 cons  │   │
│  │   ↑ 12%     │  │   ↑ 8%      │  │   ↑ 23%     │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  COMPARATIVO ENTRE CANDIDATOS (Chart.js)          │  │
│  │  Candidato A: ████████████ 1,234                 │  │
│  │  Candidato B: ████████ 890                       │  │
│  │  Candidato C: ██████ 567                         │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  MAPA DE SIMPATIZANTES (Leaflet)                  │  │
│  │  ● ● ●  (puntos agrupados por zona)               │  │
│  │    ● ●                                             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  EVENTOS EN VIVO                                 │  │
│  │  [▶ Ver transmisión]                              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [Notificar via WhatsApp] [Exportar PDF] [Exportar Excel]│
└─────────────────────────────────────────────────────────┘
```

### 7.2 Métricas Clave
| Métrica | Descripción | Uso Estratégico |
|---------|-------------|-----------------|
| Total simpatizantes | Registros únicos | Medir base de apoyo |
| Tasa de crecimiento | Nuevos / día | Identificar momentum |
| Zonas de mayor apoyo | Top 5 distritos | Focalizar recursos |
| Nivel de interés | 1-3 (bajo-medio-alto) | Priorizar engagement |
| Encuestas respondidas | % de simpatizantes | Medir participación |
| Consultas lugar votación | Total | Medir interés electoral |
| Eventos en vivo | Reproducciones | Medir alcance |
| Comparativo candidatos | Ranking | Evaluar posición |

---

## 8. Plan de Implementación

### Fase 1: Esquema + Endpoints Core (2-3 días)
1. Crear 6 tablas en `database.py` (función `init_db`)
2. Implementar 20 endpoints en `app.py`
3. Verificar import + py_compile

### Fase 2: Frontend Básico (2-3 días)
1. Crear `candidato.html` con Tailwind + Leaflet + Chart.js
2. Implementar carga de perfil, encuesta, lugar de votación
3. Implementar registro de simpatía

### Fase 3: Métricas y Transparencia (2 días)
1. Implementar dashboard con Chart.js
2. Implementar mapa con Leaflet
3. Implementar historial de cambios
4. Implementar exportación PDF/Excel

### Fase 4: Estrategia y Comunicación (2 días)
1. Integración WhatsApp (patrón Twilio existente)
2. Eventos en vivo (embed stream)
3. Notificaciones masivas
4. Panel comparativo entre candidatos

---

## 9. Verificación

```bash
# Import check
python3 -c "import app"

# py_compile
python3 -m py_compile app.py

# Contar endpoints
grep -cE '@app\.(get|post|put|delete)' app.py

# Verificar tablas
python3 -c "
import sqlite3
con = sqlite3.connect('database/ddia.db')
for t in ['perfil_candidato','preguntas_encuesta','respuestas_encuesta','simpatizantes','historial_publicaciones','eventos_en_vivo']:
    try:
        cnt = con.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        print(f'{t}: {cnt} filas')
    except: print(f'{t}: NO EXISTE')
"
```

---

## 10. Notas Finales

- **Auditable:** Todo cambio queda registrado en `historial_publicaciones` con usuario + IP + timestamp.
- **Transparente:** El historial es público; cualquier ciudadano puede ver qué se modificó y cuándo.
- **Estratégico:** Métricas accionables para planificación de campaña (zonas, momentum, engagement).
- **Cumplimiento legal:** No almacena datos personales sensibles; geoloc solo aproximada; votante puede eliminar su registro.
- **Reutilización:** 100% de componentes (auth.js, Leaflet, Chart.js, apiPadron) ya existen en el proyecto.
