# SECCIONAL 40 - Sistema de Control Electoral

Sistema web completo para control de votación electoral - Seccional 40.

## 🏛️ Matriz de Acceso por Roles

| Página | Dirigente | Miembro de Mesa | PC |
|--------|-----------|-----------------|-----|
| **index.html** (Votación) | ❌ NO | ✅ SÍ (habilitado) | ❌ NO |
| **dirigente.html** (Panel Dirigente) | ✅ SÍ | ❌ NO | ❌ NO |
| **No_voto.html** (Registro No Voto) | ✅ SÍ | ❌ NO | ✅ SÍ |
| **mesas.html** (Estado Mesas) | ✅ SÍ | ❌ NO | ✅ SÍ |
| **padron_unificado.html** (Padrón Unificado) | ✅ SÍ | ❌ NO | ✅ SÍ |
| **asistencia.html** (Seguimiento) | ❌ NO | ❌ NO | ✅ SÍ |
| **anomalias.html** (Monitoreo) | ❌ NO | ❌ NO | ✅ SÍ |
| **registro_qr.html** (QR) | ❌ NO | ❌ NO | ✅ SÍ |

## 🔑 Acceso por Rol

- **Miembro de Mesa:** Acceso restringido a operadores habilitados
- **Dirigente:** Acceso restringido a usuarios habilitados
- **PC:** Acceso restringido a vistas de monitoreo y soporte

## 🔗 Enlaces del Proyecto

### Colegio Electoral (Operativos)

| Enlace | Descripción | Acceso |
|--------|-------------|--------|
| 🗳️ **Votación** | [index.html](https://wmlumen.github.io/seccional40/index.html) | Sistema principal de votación con grilla ajustable por mesa |
| 👤 **Dirigente** | [dirigente.html](https://wmlumen.github.io/seccional40/dirigente.html) | Panel privado del dirigente con estadísticas y registro |
| 🏛️ **Mesas** | [mesas.html](https://wmlumen.github.io/seccional40/mesas.html) | Vista general de todas las mesas con estadísticas |
| 🚫 **No Voto** | [No_voto.html](https://wmlumen.github.io/seccional40/No_voto.html) | Registro de personas que no votarán |
| 📋 **Padrón Unificado** | [padron_unificado.html](https://wmlumen.github.io/seccional40/padron_unificado.html) | Padrón completo con estado (voto/no_voto/sin_registro), filtros por mesa y dirigente, ordenable |

### Panel de Control (PC - Monitoreo)

| Enlace | Descripción | Acceso |
|--------|-------------|--------|
| 📊 **Seguimiento** | [asistencia.html](https://wmlumen.github.io/seccional40/asistencia.html) | Reporte por dirigente y mesa en tiempo real |
| 🚨 **Anomalías** | [anomalias.html](https://wmlumen.github.io/seccional40/anomalias.html) | Detección de intervalos voto-a-voto anómalos |
| 📱 **QR** | [registro_qr.html](https://wmlumen.github.io/seccional40/registro_qr.html) | Registro de asistencia por código QR |

## 📝 Acceso

- Todas las vistas operan con acceso restringido
- Las credenciales se administran fuera de esta documentación
- El panel consulta los datos operativos directamente desde Google Sheets

## 🔗 Navegación entre Páginas

Todos los archivos incluyen un **menú de navegación** en el header que permite moverse entre:
- **Colegio:** Votación → Dirigente → Mesas → No Voto → Padrón
- **PC:** Anomalías → Seguimiento

## 📊 Funcionalidades por Módulo

### 🗳️ index.html (Votación)
- Acceso restringido a miembros de mesa habilitados
- Carga automática del padrón electoral desde Google Sheets
- Consulta por cédula con nombre del elector
- Panel de votación con botones dinámicos por mesa
- Registro de votos, ausentes y controversias
- Código QR para transferencia de posta
- Envía datos a Google Sheets en tiempo real

### 🏛️ mesas.html (Mesas)
- Vista general de todas las mesas
- Total de electores por mesa
- Votos registrados y participación
- Gráfico de barras por mesa
- Actualiza cada 30 segundos

### 👤 dirigente.html (Panel del Dirigente)
- Acceso con cédula y contraseña desde hoja Dirigentes
- Estadísticas de votos, ausentes, controversias y no votos
- Registro de comunicaciones por elector
- Registro de No Voto
- Tablas filtrables por estado
- Actualiza cada 10 segundos

### 📋 padron_unificado.html (Padrón Unificado)
- Aglutina datos de **Padron** + **Registros** (votos) + **No_voto**
- Prioridad: si aparece como voto → muestra VOTO (aunque también esté en No_voto)
- **Filtros:** por Mesa, por Dirigente, por Estado, búsqueda por cédula/nombre
- **Ordenamiento:** Sin registro primero, Voto primero, No voto primero
- Resumen visual con totales
- Tabla con código de colores por estado
- Sincronizado con sesión unificada del sistema

### 🚫 No_voto.html (No Voto)
- Registro de personas que no votarán
- Búsqueda por cédula con autocompletado
- Campo: Dirigente, Motivo (Enfermedad, Viaje, Fallecido, Trabajo, Desinterés, Otro)
- Observación opcional
- **Guarda en hoja "No_voto"** con columnas: CEDULA, APELLIDO, NOMBRE, DIRIGENTE, No_VOTO

### 📊 asistencia.html (Seguimiento del Dirigente - PC)
- Reporte por Mesa y por Dirigente
- Progreso por mesa con barras
- Reporte de No Votos en tiempo real
- Actualiza cada 5 segundos

### 🚨 anomalias.html (Anomalías - PC)
- Detección de intervalos voto-a-voto anómalos
- Media calculada a partir de 10 votos por mesa
- Alerta por votos muy rápidos (< 35%) o muy lentos (> 300%)
- Alarma cuando hay 3+ votos rápidos consecutivos
- Detección de No Votos que luego votaron (anomalía crítica)
- Actualiza cada 5 segundos

## ⚙️ Configuración

### 1. **Configurar Google Apps Script (CRÍTICO)**

⚠️ **Si la API responde con HTML de login de Google, la web app NO está pública.**

**Pasos para redeploy:**
1. Abrir el editor: `Extensiones` → `Apps Script` en tu Google Sheet
2. Copiar el código completo de `Código.gs`
3. Guardar (Ctrl+S)
4. `Implementar` → `Nueva implementación` → `Aplicación web`
5. **Ejecutar como:** Tu cuenta
6. **Quién tiene acceso:** `Cualquiera` o `Cualquiera, incluso anónimo`
7. **Copiar la URL** generada

**Verificación de publicación:**
- Abrir en navegador: `https://script.google.com/macros/s/ID/exec?action=test`
- Si ves **JSON** ✅ → La API está pública y funcionando
- Si ves **HTML de login de Google** ❌ → La web app NO está pública, repetir pasos 4-6

### 2. **Configurar URL del API**

**URL configurada en todos los archivos:**
```javascript
const API_URL = 'https://script.google.com/macros/s/AKfycbwMR773AI2CXSjokD7lEbjhbWSny3I4Pi8SzyuDDp0HQ-sK8UCAueu5uBRrL18K4eG_tg/exec';
```

**IMPORTANTE:** Después del redeploy, actualizar esta URL en todos los archivos HTML si cambia.

## 💾 Estructura de Google Sheets

**URL:** [https://docs.google.com/spreadsheets/d/1tDtXxCqV5L70-w5wAXBkb73e3ZKtTu7ni8lJ_AUg73I/edit](https://docs.google.com/spreadsheets/d/1tDtXxCqV5L70-w5wAXBkb73e3ZKtTu7ni8lJ_AUg73I/edit)

### Hojas del Sistema

| Hoja | Propósito | Columnas |
|------|-----------|----------|
| **Registros** | Todos los votos marcados | `timestamp`, `cedula`, `nombre`, `mesa`, `orden`, `estado`, `accion`, `dirigente`, `dirigenteNombre`, `origen` |
| **Resumen** | Estadísticas por mesa | `Mesa`, `Votos`, `Ausentes`, `Controversias`, `Total`, `Participacion %` |
| **Dirigentes** | Lista de dirigentes habilitados | `Cédula`, `Nombre`, `Datos operativos` |
| **Miembros_mesa** | Miembros de mesa/veedores | `Cédula`, `Nombre`, `Datos operativos`, `Mesa`, `Horario de Inicio`, `Horario de Cierre`, `Estado` |
| **No_voto** | Personas que no votarán | `CEDULA`, `APELLIDO`, `NOMBRE`, `DIRIGENTE`, `No_VOTO` |

### Endpoints del API

| Endpoint | Descripción |
|----------|-------------|
| `POST` | Registrar voto (va a Registros) o no-voto (va a No_voto) |
| `?action=votos` | Obtener todos los votos (desde hoja Registros) |
| `?action=no_votos` | Obtener todos los no-votos desde hoja No_voto |
| `?action=padron_unificado` | Obtener padrón completo fusionado (Padron + Registros + No_voto). Parámetros opcionales: `&mesa=N`, `&dirigente=CEDULA` |
| `?action=dirigentes` | Obtener lista de dirigentes desde hoja Dirigentes |
| `?action=miembros_mesa` | Obtener lista de miembros de mesa desde hoja Miembros_mesa |
| `?action=miembros_mesa_v2` | Obtener lista normalizada de miembros con estado y horarios |
| `?action=registrar_miembro&cedula=...&nombre=...&credencial=...&mesa=...&estado=ACTIVO` | Alta/actualización de miembro de mesa |
| `?action=resumen` | Obtener resumen por mesa |
| `?action=mesa&mesa=N` | Obtener votos de una mesa específica |

## 🚀 Tecnologías

- HTML5 / JavaScript / CSS3
- Tailwind CSS (CDN)
- Font Awesome (CDN)
- Google Apps Script (backend)
- Google Sheets (base de datos)

## 🔄 Flujo de Datos

```
┌──────────────────────────────────────────────┐
│           Google Sheets (Votacion)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │  Padron  │ │Registros│ │   No_voto    │ │
│  │(electores)│ │ (votos)  │ │ (no votarán) │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │Dirigentes│ │ Miembros │ │   Resumen    │ │
│  │          │ │  _mesa   │ │              │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
└──────────────────────────────────────────────┘
                      │
                      │ API (Google Apps Script)
                      │
       ┌──────────────┼──────────────────┐
       │              │                  │
   ┌───▼────┐   ┌────▼────┐       ┌────▼──────┐
   │ index  │   │dirigente│       │padron_uni │
   │ .html  │   │ .html   │       │ficado.html│
   │(votación│   │(dirigente)      │(PC/Dirig.)│
   └───┬────┘   └────┬────┘       └────┬──────┘
       │             │                 │
       │    ┌────────▼────────┐        │
       │    │  No_voto.html   │        │
       │    │  mesas.html     │        │
       │    │  anomalias.html │        │
       │    │ asistencia.html │        │
       │    │ registro_qr.html│        │
       │    └─────────────────┘        │
       └───────────────┬───────────────┘
                       │
              ┌────────▼─────────┐
              │  Google Sheets   │
              │  (escritura)     │
              │  Registros       │
              │  No_voto         │
              │  Resumen         │
              └──────────────────┘
```

---

**Repositorio:** [wmlumen/seccional40](https://github.com/wmlumen/seccional40)
