# PROMPT MAESTRO CENTURIA — Campus Virtual Unificado v5.0
> **ÚNICO ARCHIVO FUENTE** para generar/validar cualquier módulo del Instituto Superior Centuria.
> Reemplaza todos los prompts anteriores. v5.0: Admin panel completo, multi-roles, APIs REST, vista previa por rol.

---

## CÓMO USAR ESTE PROMPT

1. **Cambia** las variables `[ASIGNATURA]`, `[CODIGO]`, `[NUM_UNIDADES]`, `[CARRERA]` según la materia.
2. **Pega** el contenido oficial de cada unidad.
3. **Ejecuta** el agente con este prompt → genera los HTML validados.
4. **Valida** con el checklist final.

---

## PARTE 1 — ARQUITECTURA DEL SISTEMA (v5.0)

### Estructura de Archivos
```
CampusVirtual/
├── index.php                          ← Router principal (sirve app/ + api/)
├── iniciar.bat / iniciar.ps1          ← Scripts de inicio del servidor
├── app/
│   ├── index.html                     ← Login premium (glassmorphism, 2-fases)
│   ├── favicon.ico                    ← Favicon logo Centuria
│   ├── session-guard.js               ← Logout + timeout 1hr inactividad
│   ├── accesibilidad.js               ← Font/zoom/contraste WCAG AAA
│   ├── js/
│   │   ├── api.js                     ← Cliente API dual (PHP + GAS)
│   │   ├── centuria-plugins.js        ← Alpine.js plugins (theme, notifications)
│   │   ├── marcar_leido.js            ← Marcar lecciones como leídas
│   │   └── view-as-admin.js           ← Botón "Volver al Admin" para vista previa
│   ├── admin/
│   │   ├── index.html                 ← Panel administración (shell SPA)
│   │   ├── js/admin.js                ← Lógica admin (Alpine.js)
│   │   ├── sections/
│   │   │   ├── usuarios.html          ← Gestión usuarios + multi-roles + roles/permisos
│   │   │   ├── catalogos.html         ← CRUD Secciones, Carreras, Grados, Programas, Modalidades
│   │   │   ├── reportes.html          ← Dashboard analítico
│   │   │   ├── config.html            ← Configuración del sistema
│   │   │   └── vistas.html            ← Vista previa por rol (iframe)
│   │   ├── admin_roles.html           ← Redirect → index.html
│   │   └── upload_alumnos.html        ← Importación CSV
│   ├── sociologia/
│   │   ├── teacher_panel.html         ← Panel docente
│   │   ├── planilla.html              ← Planilla calificaciones
│   │   ├── plan_clases.html           ← Planificación docente
│   │   ├── registro_clases.html       ← Registro de clases
│   │   ├── documentos.html            ← Documentos del docente
│   │   └── acta.html                  ← Acta de calificaciones
│   ├── academic/                      ← Módulos académicos
│   │   ├── asistencia_presencial.html
│   │   ├── autoevaluacion_secuencial.html
│   │   ├── criterios_evaluacion.html
│   │   ├── examen_final_escrito.html
│   │   ├── examen_final_virtual.html
│   │   ├── examen_parcial1.html
│   │   ├── examen_parcial2.html
│   │   ├── examen_virtual.html
│   │   ├── glosario.html
│   │   ├── indicadores_por_unidad.html
│   │   └── monografia.html
│   └── Materiales_Clases/             ← Contenido de clases
│       ├── index.html                 ← Menú sidebar interno
│       ├── programa.html              ← Programa de estudios
│       ├── planilla.html              ← Dashboard calificaciones
│       ├── Unidad_01.html ... Unidad_10.html
├── api/
│   ├── config.php                     ← CORS, JWT, helpers
│   ├── db.php                         ← SQLite connection + schema (users, user_roles, roles_config, etc.)
│   ├── centuria.db                    ← Base de datos SQLite
│   ├── auth.php                       ← Login, register, validate, logout, find_user
│   ├── admin.php                      ← Gestión usuarios (CRUD, set_role, delete, import)
│   ├── usuarios.php                   ← NUEVO: CRUD usuarios + multi-roles + aprobación
│   ├── roles.php                      ← NUEVO: Catálogo de roles con permisos JSON
│   ├── catalogos.php                  ← CRUD Secciones, Carreras, Grados, Programas, Modalidades
│   ├── courses.php                    ← CRUD cursos
│   ├── grades.php                     ← Calificaciones
│   ├── attendance.php                 ← Asistencia
│   ├── calendar.php                   ← Eventos calendario
│   ├── documentos.php                 ← Guardar/cargar documentos
│   └── upload.php                     ← Importación CSV
└── Backend_Scripts/
    └── 01_Script_Google_Completo.gs   ← Apps Script (Sheets como backup)
```

### Almacenamiento Dual
| Capa | Tecnología | Velocidad | Uso |
|------|-----------|-----------|-----|
| **Primaria** | PHP + SQLite (`api/`) | <200ms | Login, registro, roles, notas, asistencia, catálogos |
| **Secundaria** | Google Apps Script + Sheets | ~3-4s | Backup/sync silenciosa (fire-and-forget) |

### Router `index.php`
```
/api/*     → sirve archivos PHP del directorio api/
/          → sirve app/index.html
/static    → sirve archivos estáticos desde app/
/*         → fallback a archivos root
```

### Paleta Institucional Oficial
| Variable | Valor | Uso |
|----------|-------|-----|
| `--c-dark` | `#2D2D2D` | Texto principal |
| `--c-light` | `#E6F4EA` | Fondos suaves |
| `--c-primary` | `#007A33` | Verde principal |
| `--c-accent` | `#00B140` | Botones/links |
| `--c-hover` | `#81C784` | Hover/acento |
| `--c-gold` | `#C5A55A` | Labels premium (login) |

---

## PARTE 2 — SISTEMA MULTI-ROLES (v5.0)

### Roles del Sistema
Una **misma cédula** puede tener **múltiples roles** simultáneamente:

| Rol DB | Rol Español | Acceso | Icono |
|--------|-------------|--------|-------|
| `student` | Alumno | Unidades de estudio, progreso | `bi-mortarboard-fill` |
| `teacher` | Docente | Panel docente, asistencia, notas, actas | `bi-person-badge-fill` |
| `academic` | Académico | Coordinación académica, indicadores | `bi-building` |
| `admin` | Administrador | Control total del sistema | `bi-shield-fill-check` |

### Tablas de Base de Datos

#### `users` — Usuarios principales
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,        -- cédula
    password TEXT NOT NULL,               -- hash bcrypt
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    email TEXT DEFAULT '',
    course_id INTEGER,
    role TEXT DEFAULT 'student',          -- role_sistema (el más alto)
    telefono TEXT DEFAULT '',
    grado TEXT DEFAULT '',
    carrera TEXT DEFAULT '',
    seccion TEXT DEFAULT '',
    foto TEXT DEFAULT '',
    estado TEXT DEFAULT 'activo',         -- activo | pendiente | inactivo
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_roles` — Multi-rol por usuario
```sql
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    rol TEXT NOT NULL,                    -- alumno, docente, academico, admin
    carrera TEXT DEFAULT '',
    seccion TEXT DEFAULT '',
    asignatura TEXT DEFAULT '',
    estado TEXT DEFAULT 'activo',         -- activo | inactivo | pendiente
    asignado_por TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### `roles_config` — Catálogo de roles con permisos
```sql
CREATE TABLE roles_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT DEFAULT '',
    permisos TEXT DEFAULT '{}',           -- JSON array de permisos
    color TEXT DEFAULT '#64748b',
    icono TEXT DEFAULT 'bi-person',
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `usuarios_pendientes` — Cola de aprobación
```sql
CREATE TABLE usuarios_pendientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cedula TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    grado TEXT DEFAULT '',
    carrera TEXT DEFAULT '',
    seccion TEXT DEFAULT '',
    foto TEXT DEFAULT '',
    estado TEXT DEFAULT 'pendiente',      -- pendiente | aprobado | rechazado
    observaciones TEXT DEFAULT '',
    revisado_por TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME
);
```

### Permisos Disponibles
```javascript
permisos = [
    'ver_cursos', 'editar_cursos',
    'ver_notas', 'editar_notas',
    'ver_asistencia', 'editar_asistencia',
    'ver_calendario', 'editar_calendario',
    'ver_documentos', 'editar_documentos',
    'gestionar_usuarios', 'gestionar_roles',
    'ver_reportes', 'ver_config'
]
```

### Jeraría de Roles (para role_sistema en tabla users)
```
admin (4) > academico (3) > docente (2) > alumno (1)
```
Cuando se asigna/quita un role, se recalcula automáticamente el `role` en la tabla `users`.

### Flujo de Registro (v5.0)
1. Usuario se registra en `index.html` → cédula + nombre + apellido + contraseña
2. Si es registro nuevo → se guarda en `usuarios_pendientes` (estado: pendiente)
3. Admin ve la cola de pendientes en el panel
4. Admin **aprueba** → se crea en `users` + `user_roles` con la contraseña generada
5. Admin puede **rechazar** → se marca como rechazado
6. Admin también puede **registrar directo** (sin cola de pendientes)

### Flujo de Login (v5.0)
1. Cédula → `api/auth.php?action=find_user` → ¿existe?
2. Si NO existe → mostrar "no registrado" + link a registro
3. Si existe → mostrar campo contraseña + "Bienvenido, [Nombre]"
4. Contraseña → `api/auth.php?action=login` → token
5. Obtener roles → si 1 rol → entra directo; si múltiples → selector
6. Sync silenciosa con Google Sheets (fire-and-forget)

### Regla de Contraseñas
```
Primera letra Nombre (Mayús) + primera letra Apellido (minús) + cédula(sin puntos) + *
```
Ejemplo: Juan Pérez, cédula 12345678 → `Jp12345678*`

### Usuarios Demo
| Cédula | Nombre | Contraseña | Rol |
|--------|--------|------------|-----|
| `1340130` | Christhian Keim | `Ck1340130*` | admin |
| `1340125` | Natalie Keim | `Nk1340125*` | docente |

---

## PARTE 3 — APIs REST (v5.0)

### Base URL
```
http://127.0.0.1:8080/api/
```

### Autenticación
Todas las escrituras requieren `Authorization: Bearer <token>`.

### Endpoints Disponibles

#### `auth.php` — Autenticación
| Método | Action | Descripción |
|--------|--------|-------------|
| POST | `login` | Login con cédula + contraseña |
| POST | `register` | Registrar usuario |
| GET | `validate` | Validar token de sesión |
| POST | `logout` | Cerrar sesión |
| GET | `find_user` | Buscar usuario por cédula |

#### `usuarios.php` — Gestión de Usuarios (NUEVO)
| Método | Action | Descripción | Auth |
|--------|--------|-------------|------|
| GET | `list` | Listar todos los usuarios con roles | Sí |
| GET | `pendientes` | Usuarios pendientes de aprobación | Sí |
| GET | `get&id=X` | Detalle de usuario + roles | Sí |
| POST | `update` | Editar datos de usuario | Admin |
| POST | `aprobar` | Aprobar pendiente → crear user + role | Admin |
| POST | `rechazar` | Rechazar pendiente | Admin |
| POST | `add_role` | Asignar rol adicional | Admin |
| POST | `remove_role` | Quitar rol | Admin |
| POST | `update_role` | Editar rol asignado | Admin |
| POST | `registrar_directo` | Admin registra usuario directo | Admin |

#### `roles.php` — Catálogo de Roles (NUEVO)
| Método | Action | Descripción | Auth |
|--------|--------|-------------|------|
| GET | `list` | Listar roles del catálogo | Sí |
| POST | `create` | Crear nuevo rol | Admin |
| POST | `update` | Editar rol | Admin |
| POST | `delete` | Desactivar rol | Admin |

#### `catalogos.php` — Catálogos Académicos
| Método | Action | Descripción | Auth |
|--------|--------|-------------|------|
| GET | `list` | Listar todos los catálogos (o uno específico con `?tipo=X`) | No |
| POST | `create` | Crear registro | Admin |
| POST | `update` | Editar registro | Admin |
| POST | `delete` | Desactivar registro | Admin |

**Tipos:** `secciones`, `carreras`, `grados`, `programas`, `modalidades`

#### `admin.php` — Admin Legacy
| Método | Action | Descripción |
|--------|--------|-------------|
| GET | `list` | Listar usuarios |
| GET | `get&id=X` | Detalle usuario |
| POST | `set_role` | Asignar role_sistema |
| POST | `delete` | Eliminar usuario |
| POST | `import` | Importar CSV |

#### Otros Endpoints
| Archivo | Función |
|---------|---------|
| `courses.php` | CRUD cursos |
| `grades.php` | Calificaciones |
| `attendance.php` | Asistencia |
| `calendar.php` | Eventos calendario |
| `documentos.php` | Documentos docente |
| `upload.php` | Importación CSV |

---

## PARTE 4 — PANEL ADMINISTRATIVO (v5.0)

### Arquitectura SPA
El admin es un **Single Page Application** que carga módulos dinámicamente:
- **Shell:** `admin/index.html` (header + sidebar + loader)
- **Lógica:** `admin/js/admin.js` (Alpine.js, 550+ líneas)
- **Secciones:** `admin/sections/*.html` (cargadas vía `fetch()` + `Alpine.initTree()`)

### Módulos del Admin

#### 1. Alta y Roles (`sections/usuarios.html`)
**3 sub-pestañas:**
- **Pendientes:** Cola de registros pendientes, aprobar/rechazar, registrar directo
- **Todos los Usuarios:** Tabla con búsqueda/filtros, editar perfil, multi-roles
- **Roles y Permisos:** Catálogo de roles con permisos JSON, crear/editar/eliminar

#### 2. Catálogos (`sections/catalogos.html`)
**5 sub-pestañas:** Secciones, Carreras, Grados, Programas, Modalidades
- CRUD completo para cada tipo
- Formulario contextual (cambia según la pestaña activa)
- Búsqueda en tabla

#### 3. Reportes (`sections/reportes.html`)
- Tarjetas resumen (usuarios, alumnos, docentes, secciones)
- Distribución por roles (barras de progreso)
- Carreras más asignadas
- Accesos recientes
- Resumen de catálogos

#### 4. Configuración (`sections/config.html`)
- Info institucional
- Formato de contraseña
- Estado de conexiones backend
- Acciones del sistema

#### 5. Vista Previa por Rol (`sections/vistas.html`)
- **3 roles previsualizables:** Alumno, Docente, Acceso Académico
- **Iframe preview** dentro del admin
- **Abrir en pestaña nueva** para vista completa
- **Botón flotante** "Volver al Admin" en cada página vista

### Métodos de Carga Dinámica
```javascript
// admin.js carga secciones vía fetch
async loadSection(tab) {
    const urls = {
        usuarios:  'sections/usuarios.html',
        cursos:    'sections/catalogos.html',
        reportes:  'sections/reportes.html',
        config:    'sections/config.html',
        vistas:    'sections/vistas.html'
    };
    container.innerHTML = await (await fetch(urls[tab])).text();
    Alpine.initTree(container);  // Inicializar Alpine en el nuevo DOM
}
```

---

## PARTE 5 — VARIABLES PARA PERSONALIZAR

```yaml
ASIGNATURA: "TIC"
ASIGNATURA_COMPLETA: "Tecnología de la Información y Comunicación"
CODIGO: "ADE18"
CARRERA: "Administración de Empresas"
NUM_UNIDADES: 10
ARCHIVO_GOLD: "Unidad_05.html"
SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyhfPTAVGGFsry6ueNVGQGZD0dGVbPu8zwJWnQkg6iOBcHx0FVUiAk5y8RJ1ggkIvTC2g/exec"
SHEET_ID: "1TRxrgXIojONTrszwF9cmgJn75qx-zUbacjRzwrT8xeo"
```

---

## PARTE 6 — REGLAS DE GENERACIÓN HTML

### Generales
1. **Tailwind CSS** (vía CDN) + **Bootstrap Icons** + **Montserrat**. Prohibido otro framework.
2. **Alpine.js** para interactividad. Vanilla JS solo para helpers externos.
3. **Encoding:** UTF-8. Sin caracteres rotos.

### Estructura HTML
4. **`<h2>`** = Título principal. **`<h3>`** = Temas. **`<h4>`** = Subtemas.
5. **Tarjetas:** `class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"`
6. **Botones:** `class="btn-primary"` (gradiente verde) o Tailwind equivalentes.

### Navegación
7. **Sidebar:** Siempre visible con enlaces a unidades + programa + planilla + glosario.
8. **Header:** Logo + Nombre + Progreso inline + Badge rol + Botón Salir.

### Interactividad
9. **Marcar como Leído:** Botón por card. Al final: Confirmar Lección.
10. **Progreso inline:** Barra `✅ X/10 ▓▓▓░░ 38%`.
11. **Bloqueo secuencial:** Unidad N+1 bloqueada hasta completar N.

### Sesión
12. **Guard:** `if(!sessionStorage.getItem('current_cedula')){location.replace('../index.html');}`
13. **Logout:** `sessionStorage.clear(); location.replace('../index.html');`
14. **Solo `sessionStorage`** para sesión. `localStorage` para progreso/preferencias.

### Calificaciones
15. **Escala:** Asistencia 10% + Parciales 40% + Final 50% = 100%.
16. **Numérica:** 1 (0-69%), 2 (70-77%), 3 (78-85%), 4 (86-93%), 5 (94-100%).

---

## PARTE 7 — HOJAS GOOGLE SHEETS (Backup)

| Hoja | Columnas | Propósito |
|------|----------|-----------|
| `RegistroAlumnos` | Cédula, Nombre, Apellido, Email, Grado, Carrera, Sección | Datos de alumnos |
| `Roles` | Cédula, Nombre, Rol, Carrera, Sección, Asignatura, Estado | Sistema multi-rol |
| `Asistencias` | Fecha/Hora, Cédula, Unidad/Lugar, Observación | Control de asistencia |
| `ProgresoUnidades` | Fecha/Hora, Cédula, Unidad Terminada, Estado | Progreso por unidad |
| `Notas` | Cédula, Nombre, Asistencia, Parcial1, Parcial2, Final | Calificaciones |
| `Pagos` | Cédula, Monto, Fecha, Concepto, Estado | Control de pagos |
| `Accesos` | Fecha/Hora, Cédula, Dispositivo, IP | Log de accesos |
| `ProgresoDetalle` | Fecha/Hora, Cédula, Unidad, Calificación, Observación | Detalle progreso |

---

## PARTE 8 — SERVIDOR Y DESPLIEGUE

### Inicio del Servidor
```bash
# Windows (desde la raíz del proyecto)
iniciar.bat
# o
powershell -ExecutionPolicy Bypass -File iniciar.ps1

# Manual
php -S 0.0.0.0:8080 -t . index.php
```

### CORS
- Headers: `Access-Control-Allow-Origin: *` en `config.php`
- OPTIONS preflight: Retorna 204

### PHP Requerido
- PHP 7.4+ con extensiones: `pdo_sqlite`, `json`, `mbstring`

---

## v5.0 Changelog
- **Admin panel reconstruido como SPA** con carga dinámica de secciones
- **Sistema multi-roles completo:** `user_roles` table, agregar/quitar roles por usuario
- **Catálogo de roles con permisos JSON** (`roles_config` table)
- **Cola de aprobación** para nuevos registros (`usuarios_pendientes` table)
- **APIs REST nuevas:** `usuarios.php` (10 endpoints), `roles.php` (4 endpoints), `catalogos.php` (4 endpoints)
- **Vista previa por rol:** iframe + redirect con `?view_as=admin`
- **Botón "Volver al Admin"** en todas las páginas cuando se accede en modo vista previa
- **Profile editing** completo en el admin (nombre, email, teléfono, grado, carrera, sección, estado)
- **Dashboard de reportes** con distribución por roles, carreras, accesos recientes
- **Configuración del sistema** visible en el admin
