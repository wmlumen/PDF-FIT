# 🗳️ DIA D MASTER - Sistema Electoral Unificado

**DIA D MASTER** es la consolidación definitiva de los desarrollos electorales previos
(`DIA_D_Pro`, `DIA_Mesas_DB`, `DDIA`, `DIA_Mesas` y `DIA_Mesas_v2`). Reúne en una sola
solución lista para producción:

1. **Backend FastAPI robusto y 100% autónomo** — sin dependencias de Google Sheets ni Redis.
2. **Padrón Electoral Real (TSJE)** — base SQLite local con **2.270.000 electores** del
   Registro Cívico Permanente, organizada en **63 tablas relacionales**.
3. **Algoritmo D'Hondt** — calculadora y simulador visual de adjudicación de bancas para
   concejales y diputados (`/dhondt`).
4. **Motor de Gamificación** — tablero de dirigentes con podio, rangos y métricas de
   efectividad (votos comprometidos vs. confirmados) (`/ranking`).
5. **APKs Android** — instaladores `.apk` listos para distribuir en celulares de dirigentes
   y veedores, con soporte offline (`/descargas`).
6. **Buscador optimizado de mesas y electores** — consultas paginadas por local, mesa y texto.

---

## 🚀 Inicio Rápido en Windows

Haz doble clic en `START.bat`. El script libera el puerto 8000 si está ocupado, verifica
Python y las dependencias, y abre el navegador en:

- **Panel Principal:** http://localhost:8000
- **Documentación OpenAPI:** http://localhost:8000/docs

Configuración opcional por variables de entorno (ver `.env.example`): `HOST`, `PORT`,
`DATABASE_PATH`, `SECRET_KEY`, `HASH_ITERATIONS`.

---

## 📂 Estructura del Proyecto

```text
DIA_D_MASTER/
├── START.bat                  # Lanzador Windows en 1 clic
├── server.py                  # Servidor de ejecución Uvicorn
├── app.py                     # API FastAPI unificada (119 rutas / 147 acciones)
├── database.py                # Capa de datos y esquema SQLite
├── requirements.txt           # Dependencias Python (fastapi, uvicorn, pandas, openpyxl…)
├── .env.example               # Plantilla de variables de entorno
├── database/
│   └── ddia.db                # Base de datos operativa (~480 MB, 63 tablas)
├── static/                    # Frontend Web & PWA 100% Offline (27 páginas HTML)
│   ├── index.html             # Portal central / tablero general
│   ├── App.html               # PWA táctil para veedores
│   ├── bienvenida.html        # Pantalla de bienvenida
│   ├── dirigente.html         # CRM de campaña (votos, metas, wizard de candidatos)
│   ├── dhondt.html            # Simulador y calculadora D'Hondt
│   ├── ranking.html           # Gamificación y efectividad de dirigentes
│   ├── admin_general.html     # Administración de clientes y temas
│   ├── admin_usuarios.html    # Roles y permisos (RBAC)
│   ├── roles.html             # Jerarquía territorial (Seccional/PC/…)
│   ├── panel_cliente.html     # Panel del cliente (intendente/concejal)
│   ├── panel_distrital.html   # Panel distrital
│   ├── gestion_territorial.html # Gestión territorial por alcance
│   ├── transporte.html        # Flota, choferes y GPS en tiempo real
│   ├── conductor.html         # App del conductor (viajes, disponibilidad)
│   ├── votacion.html          # Interfaz de votación
│   ├── encuesta_voto.html     # Encuesta pública de intención de voto
│   ├── padron_unificado.html  # Padrón electoral unificado
│   ├── escrutinio.html        # Cómputo de concejales y actas
│   ├── escrutinio_intendentes.html # Cómputo de actas para intendentes
│   ├── veedores.html          # Panel de veedores de mesa
│   ├── consulta_mesa.html     # Búsqueda puntual de mesa y orden
│   ├── mesas.html             # Monitoreo del estado de mesas
│   ├── asistencia.html        # Control horario de miembros de mesa
│   ├── anomalias.html         # Libro de incidencias y denuncias
│   ├── No_voto.html           # Registro de ausentismo / no voto
│   ├── registro_qr.html       # Vinculación rápida de electores por QR
│   ├── descargas.html         # Descarga directa de APKs Android
│   └── vendor/                # Tailwind, Font Awesome, Leaflet, Chart.js (offline)
└── mobile-apk/                # Aplicaciones Android compiladas
    ├── ddia-v2-final.apk      # APK con sincronización + caché local
    └── ddia-exacto-offline.apk# APK 100% offline (modo avión)
```

---

## 🗄️ Base de Datos

SQLite (`database/ddia.db`, ~480 MB) con **63 tablas**. Conteos principales:

| Tabla | Registros | Descripción |
|---|---:|---|
| `padron2026_completo` | 2.270.000 | Padrón electoral TSJE |
| `distritos` | 254 | Distritos del país |
| `candidatos` | 347 | Candidatos a cargos electivos |
| `transportes` | 343 | Registro de flota/choferes |
| `posible_votos` | 314 | Votos comprometidos (pre-electoral) |
| `asignaciones_rol` | 26 | Asignación de roles a usuarios |
| `cuentas_usuario` | 24 | Cuentas de acceso al sistema |
| `departamentos` | 18 | Departamentos |
| `partidos` | 13 | Partidos políticos |

> ⚠️ La base contiene **datos personales reales (PII)**. No subir a repositorios públicos.

---

## 👥 Roles y Autenticación

La autenticación es por **cédula + contraseña**. La política de contraseña por defecto es
**la cédula seguida de un asterisco** (ej.: cédula `1001` → contraseña `1001*`). Las
contraseñas se guardan hasheadas con PBKDF2-SHA256.

Roles disponibles (RBAC jerárquico): `master`, `nacional`, `departamental`, `distrital`,
`seccional`, `general`, `municipal`, `pc`, `dirigente`, `conductor`. Un usuario puede tener
varios roles a la vez. La consulta pública de padrón y mesas está abierta sin login.

---

## 📱 Despliegue en Celulares de Campo

1. Los dirigentes o veedores se conectan al WiFi del PC e ingresan a
   `http://[IP-DEL-PC]:8000/App.html` (PWA responsiva).
2. O descargan e instalan la APK Android desde `http://[IP-DEL-PC]:8000/descargas`.

El frontend funciona **100% offline**: Tailwind, Font Awesome, Leaflet y Chart.js se sirven
localmente desde `static/vendor/`.

---

## 🔎 Grafo de Conocimiento (graphify)

El código del proyecto está indexado en un grafo de conocimiento local (`graphify-out/`,
tree-sitter, 0 tokens) para consultar arquitectura sin releer archivos:

```bash
export PATH="$HOME/.venvs/graphify/bin:$PATH"
cd DIA_D_MASTER
graphify query "autenticación login y sesiones"   # subgrafo acotado (BFS)
graphify path "app.py" "database"                 # cómo conectan dos conceptos
```

Se actualiza automáticamente cada 2h vía cron. Detalle en `GRAFOS.md`.
