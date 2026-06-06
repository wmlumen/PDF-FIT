# Logica del Proyecto

## 1. Vision General

Este proyecto es una **aplicacion web monolitica de frontend** (HTML + CSS + JS vanilla) disenada para gestionar tres dominios principales:

1. **Sistema de Evaluacion Academica**: Examenes online, panel docente, seguimiento de intentos, generacion de actas PDF.
2. **Sistema de Registro de Asistencia**: Captura de asistencia de estudiantes con sincronizacion a Google Sheets via Google Apps Script.
3. **Modulo de Consulta Electoral (DDIA)**: Consulta de padrones electorales por cedula, panel de control de mesas, marcado de votos, transferencia de posta via QR.

El proyecto esta pensado para ser desplegado en **GitHub Pages** (hosting estatico) y utiliza **localStorage** para persistencia local, complementado con integraciones a Google Workspace (Forms, Sheets, Apps Script) para persistencia en la nube.

---

## 2. Estructura del Proyecto

```
/
public/
  index.html              # Aplicacion principal (examen + panel docente + consulta electoral)
  asistencia.html         # Pagina publica de registro de asistencia
  script.js               # Logica unificada de toda la aplicacion
  styles.css              # Estilos globales (design system)
  cursos.json             # Catalogo de carreras disponibles
  Datos_Generales.txt     # Archivo de configuracion externa (clave=valor)
```

---

## 3. Sistema de Configuracion Externa

### 3.1 Archivo `Datos_Generales.txt`

La aplicacion soporta configuracion **sin recompilacion** mediante un archivo de texto plano con formato `clave=valor`.

**Claves principales mapeadas:**

| Archivo (txt) | JS (CONFIG) | Proposito |
|---------------|-------------|-----------|
| `name.docente` | `name_docente` | Nombre del docente |
| `cedula.docente` | `cedula_docente` | CI del docente |
| `grupo` | `grupo` | Codigo del grupo/grado |
| `materia` | `materia` | Nombre de la materia |
| `ano` | `ano` | Anio lectivo |
| `tiempo.limite` | `tiempo_limite` | Tiempo maximo del examen (minutos) |
| `intentos.maximos` | `intentos_maximos` | Maximo de intentos por estudiante |
| `preguntas.seleccion.multiple` | `preguntas_seleccion_multiple` | Cantidad de preguntas tipo multiple |
| `preguntas.verdadero.falso` | `preguntas_verdadero_falso` | Cantidad de preguntas V/F |
| `puntaje.total` | `puntaje_total` | Puntaje maximo del examen |
| `puntaje.aprobacion` | `puntaje_aprobacion` | Porcentaje minimo para aprobar |
| `fecha.examen` | `fecha_examen` | Fecha del examen |
| `link.google.forms` | `link_google_forms` | URL del Google Form de asistencia |
| `link.asistencia` | `link_asistencia` | URL de la planilla Sheets de asistencia |
| `link.respuestas` | `link_respuestas` | URL de la planilla Sheets de respuestas |
| `asistencia.api.url` | `asistencia_api_url` | Web App de Google Apps Script (POST) |
| `asistencia.csv.url` | `asistencia_csv_url` | URL CSV publica de la planilla |
| `asistencia.public.url` | `asistencia_public_url` | URL publica de esta pagina de asistencia |
| `asistencia.carreras` | `asistencia_carreras` | Carreras habilitadas (pipe-separated) |
| `api.secret` | `api_secret` | Clave API para validar requests al Apps Script |

### 3.2 Carga de Configuracion

```
1. Al cargar la pagina (DOMContentLoaded), se ejecuta `cargarConfiguracion()`.
2. Se hace fetch a `Datos_Generales.txt`.
3. Si falla, se usan valores por defecto hardcodeados en `script.js`.
4. Se parsea linea por linea, reemplazando puntos por guiones bajos (`tiempo.limite` -> `tiempo_limite`).
5. Se ejecuta `reemplazarPlaceholders()` que recorre todo el DOM buscando `${CONFIG.xxx}` y los sustituye por los valores reales.
```

---

## 4. Sistema de Evaluacion Academica

### 4.1 Modelo de Datos

Un **record** de estudiante/examen tiene la siguiente estructura:

```javascript
{
  cedula: "1234567",
  nombre: "Juan",
  apellido: "Perez",
  carrera: "Ingenieria Comercial",
  puntaje: 24,
  puntajeTotal: 30,
  intento: 1,
  fecha: "19/05/2026",
  hora: "14:30",
  estado: "Entregado", // o "Rendiendo"
  respuesta: "string con formato pipe-separated de respuestas"
}
```

### 4.2 Persistencia Local

- **Key**: `teacherRecords` (localStorage)
- **Formato**: JSON array de records.
- Las operaciones de lectura/escritura pasan por `loadRecords()` y `saveRecords()`.

### 4.3 Panel Docente

El panel docente (renderizado en `index.html` si se accede con credenciales) muestra:

1. **Estudiantes Activos**: Quienes tienen `estado === "Rendiendo"` (examen en curso).
2. **Estudiantes Entregados**: Quienes completaron el examen.
3. **Detalle de Examen**: Al hacer click en un estudiante, se abre panel lateral con:
   - Historial de intentos (tabla comparativa)
   - Mejor puntaje calculado (`max(puntaje)` por cedula)
   - Porcentaje y estado (APROBADO/REPROBADO)
   - Detalle de respuestas formateadas

### 4.4 Logica de Intentos

```
- Cada estudiante puede tener hasta `CONFIG.intentos_maximos` intentos.
- Para el expediente/acta, se usa el MEJOR intento (max puntaje).
- En la tabla principal se muestran ambos intentos (columna Intento 1, Intento 2).
- Los records se agrupan por `cedula` para evitar duplicados visuales.
```

### 4.5 Generacion de Actas PDF

- No se usa libreria PDF externa.
- Se abre una nueva ventana (`window.open`) con HTML formateado como "Acta de Examen".
- Incluye: datos del estudiante, historial de intentos, detalle de respuestas, firmas.
- El usuario usa `Ctrl+P` / `Imprimir` del navegador para guardar como PDF.
- Estilo formal con bordes, tipografia serif (Times New Roman), y sello de institucion.

### 4.6 Importacion de Datos

El panel docente permite importar desde tres fuentes:

1. **JSON**: Archivos exportados previamente (estructura array de records).
2. **CSV**: Desde Google Forms (separador punto y coma, columnas: Cedula, Nombre Apellido, Puntaje, Marca temporal, Intento, Respuesta).
3. **Archivo de configuracion**: `Datos_Generales.txt` para actualizar parametros en caliente.

Funcion unificada: `procesarTodo()` ejecuta los 4 procesamientos secuencialmente y reporta resultados.

### 4.7 Estadisticas por Carrera

```javascript
computeCareerSummary() // Agrupa por carrera y calcula:
- Cantidad de estudiantes unicos
- Promedio de puntajes
- Aprobados / Reprobados
- Se renderizan como cards en el panel docente
```

---

## 5. Sistema de Asistencia

### 5.1 Arquitectura de Datos

El flujo de asistencia es **bidireccional** entre la app y Google Sheets:

```
Usuario (asistencia.html)
  |
  |-- POST --> Google Apps Script Web App
  |                |
  |                v
  |         Google Sheets (planilla oficial)
  |                |
  |-- GET -- (CSV publico o API) --
  |
  Panel Docente (index.html)
```

### 5.2 Registro de Asistencia (asistencia.html)

**Formulario de campos:**
- Cedula/Matricula
- Nombre y Apellido
- Carrera (botones seleccionables, cargados desde `cursos.json` + `CONFIG.asistencia_carreras`)
- Estado (Presente / Tarde)
- Observacion (opcional)

**Proceso de submit:**
```
1. Validacion: nombre, cedula y carrera son obligatorios.
2. Si existe `CONFIG.asistencia_api_url`:
   - Se hace POST con JSON al Google Apps Script Web App.
   - El payload incluye: studentName, studentId, career, notes, estado, timestamp, sourcePage.
   - Si `CONFIG.api_secret` existe, se incluye como `apiKey`.
3. Si no hay API configurada:
   - Se guarda en localStorage (key: `attendanceRecords`).
4. Se muestra mensaje de exito/error.
5. Se refresca la tabla de vista previa.
```

### 5.3 Autocompletado Inteligente

Al perder el foco del campo cedula (`blur`), se busca en:
1. `loadRecords()` (estudiantes que ya rindieron examen)
2. `loadAttendanceRecords()` (asistencias previas)

Si se encuentra coincidencia, se autocompleta:
- Nombre (si el campo esta vacio)
- Carrera (se selecciona el boton correspondiente)

### 5.4 Sincronizacion y Vista Previa

```javascript
refreshAttendanceData()  // Ejecuta en orden:
1. Intenta leer desde API (Apps Script Web App) -> "Fuente: Drive sincronizado"
2. Si falla, intenta leer desde CSV publico de Google Sheets -> "Fuente: Formulario Google (CSV)"
3. Si falla, usa localStorage -> "Fuente: almacenamiento local"

renderAttendance()       // Renderiza tabla en panel docente
renderPublicAttendancePreview() // Renderiza tabla en asistencia.html (ultimos 12 registros)
```

### 5.5 QR de Acceso Rapido

- En `asistencia.html` se genera un QR (libreria `qrcode.js`) con la URL publica de la pagina.
- Permite que estudiantes escaneen desde celular para registrar asistencia.
- El QR es clickeable y se expande para mejor lectura.

### 5.6 Carreras Dinamicas

```javascript
getAttendanceCareers() // Logica:
1. Carga `cursos.json` (array de objetos con nombre, nivel, sede).
2. Carga `CONFIG.asistencia_carreras` (split por pipe/coma).
3. Si alguna carrera en el JSON tiene `*` (asterisco) al inicio, SOLO se muestran esas (filtrado activo).
4. Si no hay asteriscos, se muestran todas.
5. Se eliminan duplicados.
```

---

## 6. Modulo de Consulta Electoral (DDIA)

Este modulo es una **aplicacion SPA dentro de `index.html`** (no requiere script.js), con su propio estado y renderizado.

### 6.1 Estado

```javascript
state = {
  view: 'consulta' | 'grid' | 'history',
  votos: { [idMesa]: { tipo, marcadoPor, timestamp, controversia } },
  transferLog: [],
  selectedElector: null,
  showQR: false,
  currentUserData: { nombre, cedula, telefono, rol: 'veedor' },
  consultaResult: null,
  searching: false
}
```

### 6.2 Vistas

1. **CONSULTA**: Input de cedula -> busqueda en `padronData` (array hardcodeado) -> muestra local, mesa, orden.
2. **PANEL**: Grid de 200 numeros (representan electores/mesa). Cada celda es un boton clickeable.
   - Colores: Blanco (sin marcar), Verde (voto), Indigo (equipo), Rojo (controversia).
   - IDs de equipo predefinidos: `[1, 5, 10, 15, 20, 33, 42, 50, 75, 88, 100, 125, 150, 175, 199, 200]`.
3. **LOGS**: Historial de transferencias de mando (posta).
4. **POSTA**: Genera QR con URL de transferencia.

### 6.3 Logica de Marcado

```
handleMarcar(id, tipo):
  - Si ya existe un voto con tipo DIFERENTE marcado por OTRO veedor:
      -> Se marca como "controversia" = true (celda roja)
  - Se guarda: tipo, quien marco, timestamp.
  - Se recalculan estadisticas globales.
```

### 6.4 Estadisticas

```javascript
calculateStats():
  totalVotaron = cantidad de votos registrados
  equipoAsistio = votos donde tipo === 'equipo'
  controversias = votos donde controversia === true

  Participacion % = (totalVotaron / 200) * 100
  Equipo Local % = (equipoAsistio / 16) * 100
```

### 6.5 Registro de Consultas en Google Sheets

Cuando un usuario consulta su cedula en el modulo DDIA y es encontrado en el padron, el sistema **registra automaticamente** los datos en una planilla de Google Sheets:

**Datos registrados:**
- `cedula`: Numero de cedula del elector
- `mesa`: Mesa de votacion asignada
- `orden`: Numero de orden en la mesa
- `nombre`: Nombre completo del elector
- `timestamp`: Fecha y hora de la consulta
- `origen`: Identificador del sistema (DDIA-Consulta)
- `veedor`: Nombre del veedor que realizo la consulta
- `veedorCedula`: Cedula del veedor

**Flujo de registro:**
```
consultarVotante(cedula)
  -> Si encuentra en padron:
     1. Muestra resultado con estado "registrando"
     2. Ejecuta registrarConsulta(cedula, mesa, orden, nombre) async
     3. Intento 1: POST a DDIA_API_URL (Google Apps Script Web App)
     4. Intento 2: Si falla, guarda en localStorage (key: ddia_registros_consulta)
     5. Actualiza UI con estado: 'registrado' (API) o 'pendiente' (local)
```

**Configuracion:**
- `DDIA_API_URL`: URL del Web App de Google Apps Script (hardcodeado en index.html)
- `DDIA_SHEET_URL`: URL de la planilla de referencia (visualizacion)
- En `Datos_Generales.txt`: `link.ddia.sheet` y `ddia.api.url`

**Nota:** Para que el registro funcione en tiempo real, es necesario crear un Google Apps Script vinculado a la hoja de destino con un endpoint `doPost()` que reciba JSON y escriba en la planilla. Si no esta configurado, los registros se acumulan en localStorage.

---

## 7. Seguridad y Autenticacion

### 7.1 Panel Docente

- **Proteccion por sesion**: `sessionStorage` con clave `teacher_session_active`.
- **Contraseña**: Leida de `CONFIG.teacherPassword` o valor por defecto `Centuria2024!`.
- **Funcion `renderTeacherLoginOverlay()`**: Renderiza formulario de login si no hay sesion activa.
- **Funcion `addTeacherLogoutButton()`**: Agrega boton de cerrar sesion en el header.
- **Timeout**: La sesion dura mientras la pestana este abierta (sessionStorage). Al cerrar/reabrir se pierde.

### 7.2 API Secret

- Requests al Google Apps Script incluyen `apiKey` si esta configurado.
- El servidor (Apps Script) debe validar que coincida con `CenturiaApi2024!` (o el valor en `CONFIG.api_secret`).

---

## 8. Flujo de Datos Completo

```
DOCENTE:
  1. Edita Datos_Generales.txt (configuracion)
  2. Sube archivo a GitHub (o actualiza en hosting)
  3. Abre index.html -> Panel Docente
  4. Importa CSV/JSON de respuestas de examen
  5. Revisa estadisticas, genera actas PDF

ESTUDIANTE:
  1. Abre index.html -> Modo Examen
  2. Ingresa cedula
  3. Rinde examen (guardado en localStorage/JSON)
  4. (Opcional) Va a asistencia.html y registra asistencia

ASISTENCIA:
  1. Estudiante escanea QR o accede a asistencia.html
  2. Completa formulario (nombre, cedula, carrera)
  3. Se envia a Google Apps Script -> Google Sheets
  4. Docente refresca panel y ve asistencias en tiempo real

ELECTORAL:
  1. Veedor abre index.html -> Modo Consulta o Panel
  2. Consulta padron por cedula
  3. En panel marca votos (general/equipo)
  4. Detecta controversias si dos veedores marcan diferente
  5. Genera QR de transferencia de posta
```

---

## 9. Decisiones de Diseno y Arquitectura

### 9.1 Por que no hay backend?

- El proyecto esta disenado para **hosting estatico gratuito** (GitHub Pages).
- Toda la logica de persistencia "seria" se delega a Google Workspace (Apps Script + Sheets).
- localStorage actua como cache/BD local para modo offline y desarrollo.

### 9.2 Por que un solo script.js?

- Simplifica el despliegue en hosting estatico (un solo archivo de logica).
- La inicializacion (`initTeacherPanel`, `initAttendanceRegistrationPage`) detecta en que pagina esta y ejecuta solo lo relevante.
- Facilita el compartir funciones utilitarias (escapeHtml, normalizarNombre, corregirTexto).

### 9.3 Por que placeholders ${CONFIG.xxx}?

- Permite que el mismo codigo HTML funcione con diferentes configuraciones sin recompilar.
- Un solo archivo `Datos_Generales.txt` controla docente, materia, links, examenes, carreras.
- Ideal para docentes no tecnicos: solo editan texto plano.

### 9.4 Correcion de Encoding

- `corregirTexto()` y `corregirRecord()` arreglan el problema de "UTF-8 mal interpretado como Latin-1" (mojibake) comun en archivos importados.
- Reemplaza secuencias como `\u00c3[\u0080-\u00bf]` por los caracteres correctos.

---

## 10. Dependencias Externas

| Libreria | Uso | Carga |
|----------|-----|-------|
| Tailwind CSS (CDN) | Styling utility-first | `index.html` (electoral) |
| Lucide Icons (CDN) | Iconografia SVG | `index.html` |
| Font Awesome (CDN) | Iconografia | `asistencia.html`, panel docente |
| QRCode.js (CDN) | Generacion de QR | `asistencia.html` |
| html2canvas (CDN) | Screenshot para PDF | Panel docente (export) |
| jsPDF (CDN) | Generacion de PDF | Panel docente (export) |

---

## 11. Almacenamiento Local (localStorage)

| Key | Proposito | Pagina |
|-----|-----------|--------|
| `teacherRecords` | Records de examenes | index.html |
| `attendanceRecords` | Registros de asistencia | asistencia.html, index.html |
| `teacher_session_active` | Flag de sesion docente | index.html |
| `teacher_session_timestamp` | Timestamp de login | index.html |
| `ddia_registros_consulta` | Registros de consultas electorales | index.html (DDIA) |

---

## 12. Endpoints de Integracion (Google)

| Configuracion | Metodo | Proposito |
|---------------|--------|-----------|
| `asistencia_api_url` | POST | Enviar asistencia a Sheets via Apps Script |
| `asistencia_csv_url` | GET | Leer asistencias desde CSV publico |
| `link_google_forms` | Redirect | Abrir formulario de Google Forms oficial |
| `link_asistencia` | Redirect | Abrir planilla de Sheets de asistencia |
| `link_respuestas` | Redirect | Abrir planilla de Sheets de respuestas |
| `ddia.api.url` | POST | Enviar registro de consulta electoral a Sheets |
| `link.ddia.sheet` | Redirect | Abrir planilla de registros electorales (DDIA) |

---

## 13. Notas de Mantenimiento

- **Para cambiar carreras**: Editar `cursos.json` o `asistencia.carreras` en `Datos_Generales.txt`.
- **Para cambiar preguntas de examen**: Editar el array `examData` en `index.html` (seccion inline).
- **Para cambiar duracion/intentos**: Modificar `Datos_Generales.txt`.
- **Para activar sincronizacion con Google**: Configurar `asistencia_api_url` y `api_secret` en `Datos_Generales.txt`.
- **Para desplegar**: Push a rama `main` del repo de GitHub Pages.

---

*Documento generado automaticamente a partir del analisis del codigo fuente.*
