# Examen Sociología - Centuria

Sistema de evaluación virtual con panel docente para la cátedra de Sociología del Instituto Superior Centuria.

## Características

- **Examen interactivo** con selección múltiple y verdadero/falso
- **Panel docente** con monitoreo en vivo, resultados, métricas y control de asistencia
- **Importación unificada** de resultados desde JSON, CSV, configuración (Datos_Generales.txt) y asistencia
- **Auditoría del examen** con panel lateral que muestra intentos, puntaje válido y acta detallada
- **Generación de acta** en formato imprimible/PDF con detalle de respuestas
- **Configuración dinámica** desde archivo Datos_Generales.txt (materia, grupo, docente, enlaces, etc.)

## Codificación UTF-8

**IMPORTANTE:** Todos los archivos deben guardarse como **UTF-8 sin BOM** para preservar caracteres especiales (tildes, eñes, signos de puntuación). Incluido en el proyecto hay un script `utils/fix_encoding.py` que recorre toda la carpeta y convierte automáticamente cualquier archivo a UTF-8 sin BOM, corrigiendo también archivos que estén en Latin-1/ANSI. Esto aplica especialmente a:

- `public/Datos_Generales.txt` (contiene la especificación "Guardar como UTF-8")
- `public/index.html` y `public/teacher_panel.html`
- `public/script.js`
- Archivos CSV importados (deben estar en UTF-8 para evitar caracteres corruptos)

## Estructura del proyecto

```
Examen_Virtual/
├── public/
│   ├── index.html              # Examen principal (estudiante)
│   ├── teacher_panel.html      # Panel docente
│   ├── script.js               # Lógica del sistema
│   ├── styles.css              # Estilos personalizados
│   ├── Datos_Generales.txt     # Configuración del examen
│   └── asistencia.txt          # Registro de asistencia (ejemplo)
├── README.md
├── vercel.json
└── package.json
```

## Configuración (Datos_Generales.txt)

Editar `public/Datos_Generales.txt` para personalizar:

- **Docente**: `name.docente`, `cedula.docente`
- **Curso**: `grupo`, `materia`, `año`, `seccion`
- **Examen**: `tiempo.limite`, `intentos.maximos`, `puntaje.total`, `puntaje.aprobacion`
- **Enlaces**: `link.asistencia`, `link.respuestas`, `link.solicitudes.extraordinarias`
- **Fechas**: `fecha.examen`, `fecha.limite`

## Panel Docente

Acceso con C.I. `1340130` (configurable en `cedula.panel.docente`).

### Funcionalidades

1. **Monitoreo en Vivo** — estudiantes en sesión activa
2. **Exámenes Entregados** — tabla con filtros, búsqueda y ordenamiento
3. **Métricas y Carreras** — distribución por carrera
4. **Control de Asistencia** — registro importado desde archivo
5. **Auditoría del Examen** — panel lateral con detalle del alumno:
   - Todos los intentos con puntaje y fecha/hora
   - Puntaje Válido (mejor puntaje + %)
   - Acta del examen formateada con badges OK/MAL
   - Botón EXPEDIENTE para descargar acta en PDF

### Importación de archivos

Usar **Módulo de Carga** para procesar simultáneamente:
- Archivos JSON de respuestas
- Archivos CSV (separador `;`, columnas: Cedula, Nombre Apellido, Carrera, Puntaje, Intento, Marca temporal, Respuesta)
- Configuración desde Datos_Generales.txt
- Asistencia desde asistencia.txt (formato TSV)

## Credenciales

- **Panel Docente**: C.I. `1340130`
- **Modo Prueba**: C.I. `99` (sin guardar resultados)

## Utilidades

### `utils/fix_encoding.py` — Corrector universal de codificación UTF-8

Recorre toda la carpeta del proyecto, detecta archivos en Latin-1/ANSI y los convierte a **UTF-8 sin BOM** automáticamente.

```bash
python utils/fix_encoding.py
```

Soporta extensiones: `.txt`, `.md`, `.html`, `.ini`, `.cfg`, `.js`, `.css`, `.json`. Es seguro ejecutarlo múltiples veces (detecta UTF-8 y no modifica).

## Despliegue

### GitHub Pages

```bash
git init
git add .
git commit -m "Examen Sociología - Centuria"
git remote add origin https://github.com/TU_USUARIO/examen-sociologia-centuria.git
git push -u origin main
```

En Settings → Pages: Source = Deploy from branch main/(root).

### Vercel

```bash
vercel --prod
```

## Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari 13+)
- Conexión a internet (CDN para Tailwind CSS, Font Awesome, Alpine.js, html2canvas, jsPDF)
- Los datos se almacenan en localStorage del navegador

## Últimas mejoras

- Consistencia de codificación UTF-8 en todos los archivos
- Nombres de estudiantes en mayúsculas
- Header dinámico con materia y grupo desde configuración
- Panel lateral de auditoría con apertura/cierre
- Botón EXPEDIENTE para descarga de acta PDF
- Tabla de intentos con puntaje válido y porcentaje
- Búsqueda por Enter o coincidencia exacta de cédula/nombre
- Acta del examen formateada con secciones y badges visuales
- Corrección de sintaxis que impedía el procesamiento de archivos
