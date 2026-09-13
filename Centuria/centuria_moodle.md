# Campus Virtual Centuria — Prompt Maestro de Instalación Moodle

> **Archivo de referencia para cualquier IA que trabaje en este proyecto.**
> **Última actualización:** 2026-09-13 19:50 (sesión Docker 80/443)
> **Repositorio:** `https://github.com/wmlumen/PDF-FIT.git`
> **Ruta raíz:** `C:\Users\HP 250 G10\Documents\GITHUT\Centuria`

---

## 1. OBJETIVO GENERAL

Crear un **Campus Virtual unificado** para **Instituto Superior Centuria** que sirva como plataforma educativa para:
- **TIC** (Tecnología de la Información y Comunicación) — 10 unidades, 30 alumnos
- **Sociología** — Exámenes, asistencia, seguimiento
- **Maestría** — Gestión Pública, Contabilidad, Planificación Estratégica
- **Cualquier materia futura** — Sistema extensible

**Base tecnológica:** Moodle 5.3dev como plataforma core, con assets del portal web integrados.

---

## 2. ARQUITECTURA DEL SISTEMA

```
Centuria/                              ← Raíz del repositorio
│
├── centuria_moodle.md                 ← ESTE ARCHIVO (prompt maestro)
│
├── CampusVirtual/                     ← Proyecto integrado
│   ├── app/                           ← Código fuente
│   │   ├── moodle/                    ← Moodle 5.3dev (clonado de GitHub)
│   │   │   ├── public/               ← DocumentRoot de Moodle (Web Root)
│   │   │   │   ├── index.php
│   │   │   │   ├── install.php
│   │   │   │   ├── admin/
│   │   │   │   ├── lang/
│   │   │   │   ├── lib/
│   │   │   │   ├── mod/
│   │   │   │   └── ...
│   │   │   ├── lib/                   ← Librería Moodle
│   │   │   ├── config.php             ← (generado por instalador)
│   │   │   └── composer.json
│   │   ├── css/                       ← Estilos del portal
│   │   ├── js/                        ← Scripts del portal
│   │   ├── images/                    ← Logos institucionales
│   │   ├── academic/                  ← Módulos académicos HTML
│   │   ├── admin/                     ← Panel de administración
│   │   ├── Backend_Scripts/           ← Apps Script Google Sheets (legado)
│   │   ├── docs/                      ← Prompts, planes de estudio
│   │   ├── Materiales_Clases/         ← 10 unidades HTML (Unidad_01-10)
│   │   ├── sociologia/                ← Portal de Sociología
│   │   ├── agents/                    ← Scripts de agentes AI
│   │   ├── assets/                    ← Recursos estáticos
│   │   ├── indicators.json            ← 30 indicadores de evaluación
│   │   ├── import_indicators.php      ← Importador de indicadores a Moodle
│   │   └── index.html                 ← Portal de login principal
│   ├── local/                         ← Plugins locales Moodle (por crear)
│   ├── mod/                           ← Módulos personalizados (por crear)
│   └── theme/                         ← Tema Centuria (por crear)
│
├── moodle/                            ← Configuración Docker
│   ├── docker-compose.yml             ← Contenedores Docker
│   ├── moodle/                        ← Clone de Moodle (fuente)
│   ├── theme_custom.bak2/             ← Backup del tema Boost customizado
│   └── agents/                        ← Scripts Python de agentes
│
├── TIC/                               ← Materiales TIC originales
│   └── Portal_TIC_Final/              ← Portal web TIC (versión standalone)
│
├── SOCIOLOGIA/                        ← Materiales Sociología
├── SOCIOLOGIA - COMERCIAL/            ← Sociología grupo comercial
├── SOCIOLOGIA - JUNIO/                ← Sociología grupo junio
├── Maestria/                          ← Materiales de Maestría
└── Asistencia/                        ← Sistema de asistencia web
```

---

## 3. STACK TECNOLÓGICO

| Componente | Tecnología | Versión | Estado |
|------------|-----------|---------|--------|
| **Plataforma** | Moodle | 5.3dev (Build: 20260911) | Instalación en progreso (428 tablas) |
| **Servidor Web** | Apache (Docker) | moodlehq/moodle-php-apache:8.3 | Corriendo 80→80, 443→443 |
| **PHP** | PHP | 8.3 (dentro del contenedor) | OK |
| **Base de datos** | MariaDB | 11.4 (Docker) | 428 tablas, upgraderunning activo |
| **Contenedores** | Docker Desktop | 29.7.2 + Compose v5.5.1 | Instalado, daemon requiere reinicio |
| **Sistema OS** | Windows | 10/11 | Host |
| **Control de versiones** | Git/GitHub | remote: PDF-FIT.git | OK |
| **Volumen Moodle** | Bind mount | `../CampusVirtual/app/moodle:/var/www/html` | OK |
| **config.php** | Manual | `CampusVirtual/app/moodle/config.php` | Corregido (mariadb/db/moodle_user) |

---

## 4. CREDENCIALES Y CONFIGURACIÓN

### 4.1 Moodle (Docker)
| Parámetro | Valor |
|-----------|-------|
| URL interna | `http://localhost` (dentro de Docker) |
| URL externa | `http://localhost` o `https://localhost` (puertos 80/443) |
| Admin user | `admin` |
| Admin pass | `Centuria2024*` |
| DB host | `db` (nombre del contenedor Docker) |
| DB name | `moodle` |
| DB user | `moodle_user` |
| DB pass | `moodle_pwd` |
| DB root pass | `moodle_root_pwd` |
| DB charset | `utf8mb4_unicode_ci` |
| wwwroot | `http://localhost` |
| dataroot | `/var/www/moodledata` |

### 4.2 Portal Web (localStorage)
| Parámetro | Valor |
|-----------|-------|
| Users storage | `localStorage` key: `centuria_users` |
| Sociologia users | `localStorage` key: `sociologia_users` |
| Password format | `PrimeraLetraNombre(Mayús) + primeraLetraApellido(minús) + cédula(sin puntos) + *` |
| Ejemplo | Juan Pérez, cédula 1.234.567 → `Jp1234567*` |

### 4.2.1 Paleta institucional
| Color | Hex | Uso |
|-------|-----|-----|
| Texto oscuro | `#2D2D2D` | Texto principal |
| Fondo claro | `#E6F4EA` | Fondos de sección |
| Verde primario | `#00B140` | Botones, acciones |
| Verde principal | `#007A33` | Headers, navegación |
| Verde hover | `#81C784` | Estados hover, acentos |
| Dorado | `#C5A55A` | Etiquetas premium, badges |

### 4.2.2 Tipografía
- **Fuente principal:** Montserrat (200-800 weights)
- **Fallback:** Segoe UI
- **Regla:** Máximo 2 familias tipográficas

---

## 5. ESTADO ACTUAL — CHECKLIST DE TAREAS

### Leyenda de estados
- `[x]` = Completado
- `[ ]` = Pendiente
- `[/]` = En progreso / parcial
- `[!]` = Bloqueado / requiere intervención

---

### FASE 1: Infraestructura Docker
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 1.1 | Docker Desktop instalado | [x] | v29.7.2 + Compose v5.5.1 |
| 1.2 | docker-compose.yml creado | [x] | Puertos **80:80 / 443:443**, volumen `../CampusVirtual/app/moodle:/var/www/html` |
| 1.3 | Moodle 5.3dev clonado | [x] | En `CampusVirtual/app/moodle/` y `moodle/moodle/` |
| 1.4 | MariaDB configurada | [x] | utf8mb4_unicode_ci, healthcheck OK |
| 1.5 | Contenedores Docker arrancados | [x] | `moodle_web` + `moodle_db` (healthy) 2026-09-13 19:10 |
| 1.6 | `docker compose up -d` exitoso | [x] | Network `moodle_default` creada |
| 1.7 | Moodle accesible en navegador | [/] | http://localhost → 302 → /install.php (antes de completar install) |

### FASE 2: Instalación Moodle
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 2.1 | Composer install dentro del contenedor | [x] | 61 paquetes |
| 2.2 | mod_rewrite habilitado | [x] | Apache config |
| 2.3 | Certificado SSL auto-firmado | [x] | Generado |
| 2.4 | config.php generado/corregido | [x] | Manual: mariadb/db/moodle_user/wwwroot http://localhost/dataroot /var/www/moodledata - 2026-09-13 19:25 |
| 2.5 | install_database.php ejecutado | [/] | 1er intento timeout 194s (System OK), 2do intento progresó hasta `mod_data` ~321 tablas, 428 tablas actuales |
| 2.6 | Flag upgraderunning limpiado | [/] | Se limpia pero se recrea mientras upgrade corre - normal |
| 2.7 | upgrade.php --allow-unstable ejecutado | [/] | En progreso PID 147, avanzó hasta `block_social_activities` / `block_recent_activity`, timeout 600s |
| 2.8 | Login admin funcional | [ ] | Bloqueado hasta que upgrade complete (Site is being upgraded) |
| 2.9 | Aceptación de licencia GPL | [ ] | --agree-license ya pasado, falta pantalla final de Moodle |

### FASE 3: Configuración Moodle
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 3.1 | Crear curso "TIC - Centuria" | [ ] | Pendiente |
| 3.2 | Crear curso "Sociología" | [ ] | Pendiente |
| 3.3 | Crear curso "Maestría" | [ ] | Pendiente |
| 3.4 | Importar indicators.json al gradebook | [ ] | Usar import_indicators.php |
| 3.5 | Configurar categorías de evaluación | [ ] | 10% asistencia, 40% parciales, 50% final |
| 3.6 | Registrar usuarios (30 alumnos TIC) | [ ] | csv disponible |
| 3.7 | Registrar docentes y admins | [ ] | Con roles asignados |

### FASE 4: Tema Centuria
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 4.1 | Crear theme/centuria en CampusVirtual/theme/ | [ ] | Child theme de Boost |
| 4.2 | Configurar config.php del tema | [ ] | Nombre: centuria |
| 4.3 | Aplicar paleta institucional | [ ] | Colores de la sección 4.2.1 |
| 4.4 | Aplicar tipografía Montserrat | [ ] | Google Fonts o self-hosted |
| 4.5 | Personalizar login page | [ ] | Glassmorphism, gradientes |
| 4.6 | Activar tema en Moodle | [ ] | Admin > Apariencia > Temas |

### FASE 5: Plugins Moodle
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 5.1 | Plugin local/campusvirtual | [ ] | Exponer assets estáticos |
| 5.2 | Plugin mod/ (módulo personalizado) | [ ] | Si se necesita |
| 5.3 | Integrar "Marcar como leído" | [x] | marcar_leido_moodle.js creado |
| 5.4 | Plugin de asistencia | [ ] | O usar nativo de Moodle |

### FASE 6: Integración del Portal Web
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 6.1 | index.html accesible vía Moodle | [ ] | Requiere plugin o alias |
| 6.2 | sociologia/ accesible | [ ] | teacher_panel.html funcional |
| 6.3 | Documentos imprimibles (acta, planilla, etc.) | [x] | Self-contained, sin deps externas |
| 6.4 | Materiales_Clases/ (10 unidades) accesibles | [ ] | Requiere integración |
| 6.5 | academic/ accesible | [ ] | asistencia, autoevaluación, etc. |
| 6.6 | admin/admin_roles.html accesible | [ ] | Panel de gestión de roles |
| 6.7 | Login unificado (Cédula + Contraseña) | [x] | Funcional en portal standalone |

### FASE 7: Contenido y Datos
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 7.1 | 30 alumnos TIC cargados | [x] | alumnos_cargados.json/csv |
| 7.2 | indicators.json (30 indicadores) | [x] | 3 por unidad, 5 pts c/u |
| 7.3 | Programa de estudios TIC | [x] | Plan_de_Estudio_TIC.md |
| 7.4 | Cronograma TIC | [x] | Sábados + Lunes-Viernes |
| 7.5 | Glosario TIC | [x] | glosario.html |
| 7.6 | Criterios de evaluación | [x] | criterios_evaluacion.html |

### FASE 8: Verificación y Testing
| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 8.1 | Login → Selección de materia → Curso | [ ] | Flujo e2e |
| 8.2 | Navegación entre unidades | [ ] | Secuencial |
| 8.3 | Exámenes virtuales | [ ] | quiz.js funcional |
| 8.4 | Registro de asistencia | [ ] | asistencia-planilla.js |
| 8.5 | Descarga de documentos | [ ] | PDF/imprimir |
| 8.6 | Roles (alumno/docente/admin/académico) | [x] | Funcional en standalone |

---

## 6. ARCHIVOS CLAVE — UBICACIÓN RÁPIDA

| Archivo | Ruta | Propósito |
|---------|------|-----------|
| `docker-compose.yml` | `moodle/docker-compose.yml` | Configuración Docker |
| `config.php` | `CampusVirtual/app/moodle/config.php` | Config Moodle (generado) |
| `indicators.json` | `CampusVirtual/app/indicators.json` | 30 indicadores evaluación |
| `import_indicators.php` | `CampusVirtual/app/import_indicators.php` | Importador gradebook |
| `index.html` | `CampusVirtual/app/index.html` | Portal login principal |
| `teacher_panel.html` | `CampusVirtual/app/sociologia/teacher_panel.html` | Panel docente Sociología |
| `admin_roles.html` | `CampusVirtual/app/admin/admin_roles.html` | Gestión de roles |
| `Unidad_01-10.html` | `CampusVirtual/app/Materiales_Clases/` | 10 unidades TIC |
| `acta.html` | `CampusVirtual/app/sociologia/acta.html` | Plantilla acta calificaciones |
| `planilla.html` | `CampusVirtual/app/sociologia/planilla.html` | Plantilla planilla calificaciones |
| `estilos.css` | `CampusVirtual/app/css/estilos.css` | Estilos principales |
| `paleta-oficial.css` | `CampusVirtual/app/css/paleta-oficial.css` | Paleta institucional |
| `session-guard.js` | `CampusVirtual/app/js/session-guard.js` | Guard de sesión (1hr) |
| `logo_centuria.png` | `CampusVirtual/app/images/` | Logo institucional |
| `PROMPT_MAESTRO_CENTURIA.md` | `CampusVirtual/app/docs/` | Prompt maestro unificado |
| `prompt_maestro_materiales.md` | `CampusVirtual/app/docs/` | Prompt materiales |
| `alumnos_cargados.json` | `CampusVirtual/alumnos_cargados.json` | 30 alumnos TIC |

---

## 7. COMANDOS ESENCIALES

### 7.1 Docker
```powershell
# Levantar todo
cd "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle"
docker compose up -d

# Ver estado
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ver logs
docker compose logs -f web

# Detener (manteniendo datos)
docker compose down

# Reset completo (borra DB)
docker compose down -v

# Entrar al contenedor web
docker exec -it moodle_web bash

# Ejecutar PHP dentro del contenedor
docker exec moodle_web php /var/www/html/admin/cli/install_database.php --lang=en --adminuser=admin --adminpass="Centuria2024*" --adminemail=admin@centuria.edu.py --agree-license --fullname="Campus Virtual Centuria" --shortname="Centuria"
```

### 7.2 Base de datos
```powershell
# Entrar a MariaDB dentro de Docker
docker exec -it moodle_db mariadb -u root -pmoodle_root_pwd moodle

# Verificar tablas
docker exec moodle_db mariadb -u root -pmoodle_root_pwd moodle -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='moodle';"

# Limpiar flag upgraderunning (si se traba)
docker exec moodle_db mariadb -u root -pmoodle_root_pwd moodle -e "DELETE FROM mdl_config WHERE name='upgraderunning';"
```

### 7.3 Moodle CLI
```powershell
# Instalar base de datos
docker exec moodle_web php /var/www/html/admin/cli/install_database.php \
  --lang=en \
  --adminuser=admin \
  --adminpass="Centuria2024*" \
  --adminemail=admin@centuria.edu.py \
  --agree-license \
  --fullname="Campus Virtual Centuria" \
  --shortname="Centuria"

# Upgrade
docker exec moodle_web php /var/www/html/admin/cli/upgrade.php --non-interactive

# Verificar entorno
docker exec moodle_web php /var/www/html/admin/cli/check_environment.php
```

### 7.4 Git
```powershell
# Ver estado
git status

# Push cambios
git add .
git commit -m "descripción del cambio"
git push origin master

# Clonar
git clone https://github.com/wmlumen/PDF-FIT.git
```

---

## 8. REGLAS PARA IA — CÓMO TRABAJAR EN ESTE PROYECTO

### 8.1 Antes de empezar
1. **Leer este archivo completo** (`centuria_moodle.md`)
2. **Verificar el estado** de las tareas en la sección 5
3. **No repetir trabajo** — si una tarea ya está marcada `[x]`, no volver a hacerla
4. **Actualizar este archivo** al completar cualquier tarea (cambiar `[ ]` a `[x]`)

### 8.2 Al trabajar
1. **No modificar config.php** a menos que sea estrictamente necesario
2. **No borrar la base de datos** sin confirmación explícita del usuario
3. **Siempre hacer commit** después de cambios exitosos
4. **Nombrar commits** descriptivamente: `feat:`, `fix:`, `refactor:`, `docs:`
5. **Respetar la paleta de colores** institucional (sección 4.2.1)
6. **No dependencias externas** — todo self-contained (sin Google Fonts en HTML)

### 8.3 Al terminar
1. **Actualizar este archivo** — marcar tareas completadas
2. **Hacer commit y push** con mensaje descriptivo
3. **Reportar** qué se hizo y qué queda pendiente
4. **Si hay bloqueo**, documentarlo en la sección 9

### 8.4 Convención de nombres
| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Features | `feat: descripción` | `feat: Tema Centuria activado` |
| Fixes | `fix: descripción` | `fix: upgraderunning limpiado` |
| Docs | `docs: descripción` | `docs: actualizar centuria_moodle.md` |
| Refactor | `refactor: descripción` | `refactor: reorganizar carpetas` |

---

## 9. BLOQUEOS CONOCIDOS Y SOLUCIONES

### Bloqueo 1: Puerto 80/443 ocupado
**Causa:** XAMPP Apache o MySQL80 usando los puertos.
**Solución:**
```powershell
# Matar Apache de XAMPP
taskkill /F /IM httpd.exe

# Detener servicio MySQL80 (requiere admin)
Start-Process powershell -Verb RunAs -ArgumentList "-Command `"net stop MySQL80`""
```

### Bloqueo 2: upgraderunning = 1 (Moodle no carga)
**Causa:** Instalación/interrumpida deja flag en DB.
**Solución:**
```powershell
docker exec moodle_db mariadb -u root -pmoodle_root_pwd moodle -e "DELETE FROM mdl_config WHERE name='upgraderunning';"
```

### Bloqueo 3: "Site is being upgraded"
**Causa:** Flag upgraderunning activo.
**Solución:** Ver Bloqueo 2.

### Bloqueo 4: install_database.php timeout
**Causa:** Instalación grande tarda más de 300s.
**Solución:** Ejecutar con timeout mayor o repetir (Moodle es idempotente, puede reanudar).

### Bloqueo 5: XAMPP PHP 7.4 (Moodle 5.3 necesita PHP 8.3)
**Causa:** XAMPP trae PHP 7.4, incompatible.
**Solución:** Usar Docker (ya tiene PHP 8.3) o instalar XAMPP con PHP 8.3+.

### Bloqueo 6: caching_sha2_password.dll no encontrado
**Causa:** MariaDB de XAMPP no encuentra el plugin.
**Solución:** Agregar `default_authentication_plugin=mysql_native_password` a `C:\xampp\mysql\bin\my.ini`.

---

## 10. FLUJO DE INSTALACIÓN PASO A PASO (DESDE CERO)

> **Nota:** Estos pasos son para una instalación limpia. Si ya hay datos, saltar al paso relevante.

### Paso 1: Preparar entorno
```powershell
# Verificar Docker
docker --version          # Debe mostrar Docker version 29.x
docker compose version    # Debe mostrar v5.x

# Verificar puertos libres
netstat -ano | Select-String ":80 |:443 " | Select-String "LISTENING"
# Si algo aparece, matar el proceso (ver Bloqueos)
```

### Paso 2: Limpiar instalación previa (si existe)
```powershell
cd "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle"

# Detener y borrar volúmenes
docker compose down -v

# Eliminar config.php si existe
Remove-Item "../CampusVirtual/app/moodle/config.php" -Force -ErrorAction SilentlyContinue
```

### Paso 3: Arrancar Docker
```powershell
cd "C:\Users\HP 250 G10\Documents\GITHUT\Centuria\moodle"
docker compose up -d

# Esperar a que DB esté healthy
docker ps  # Esperar STATUS: "healthy" en moodle_db
```

### Paso 4: Instalar Moodle
```powershell
# Opción A: Instalación automática (CLI)
docker exec moodle_web php /var/www/html/admin/cli/install_database.php `
  --lang=en `
  --adminuser=admin `
  --adminpass="Centuria2024*" `
  --adminemail=admin@centuria.edu.py `
  --agree-license `
  --fullname="Campus Virtual Centuria" `
  --shortname="Centuria"

# Opción B: Instalación vía navegador
# Abrir http://localhost en el navegador
# Seguir el wizard: idioma → DB → admin → finalizar
```

### Paso 5: Verificar instalación
```powershell
# Login exitoso
curl.exe -s -o NUL -w "%{http_code}" "http://localhost/"
# Debe retornar 200 o 302 (redirect a login)

# DB con tablas
docker exec moodle_db mariadb -u root -pmoodle_root_pwd moodle -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='moodle';"
# Debe mostrar ~430 tablas (428 al 2026-09-13)
```

### Paso 6: Crear cursos e importar indicadores
```powershell
# Crear curso en Moodle vía UI o CLI
# Anotar course_id de la URL (ej: ?id=3 → course_id = 3)

# Importar indicadores
docker exec -i moodle_web php /var/www/html/import_indicators.php 3
```

### Paso 7: Activar tema (cuando esté listo)
```powershell
# En Moodle UI: Administración > Apariencia > Temas
# Seleccionar "centuria" como tema default
```

---

## 11. MATERIALES DISPONIBLES

### TIC — 10 Unidades
| Unidad | Archivo | Tema |
|--------|---------|------|
| 01 | Unidad_01.html | Introducción a Sistemas de Información |
| 02 | Unidad_02.html | Estrategia de Negocios a través de TIC |
| 03 | Unidad_03.html | Bases de Datos |
| 04 | Unidad_04.html | ERP |
| 05 | Unidad_05.html | Hardware y Software |
| 06 | Unidad_06.html | Redes |
| 07 | Unidad_07.html | Seguridad Informática |
| 08 | Unidad_08.html | Desarrollo Web |
| 09 | Unidad_09.html | Inteligencia Artificial |
| 10 | Unidad_10.html | Tendencias Tecnológicas |

### Sociología
- `teacher_panel.html` — Panel del docente (login, sidebar, secciones)
- `documentos.html` — Hub de documentos imprimibles
- `acta.html` — Plantilla acta de calificaciones
- `planilla.html` — Plantilla planilla de calificaciones
- `plan_clases.html` — Plan de clases modular
- `registro_clases.html` — Registro de asistencia

### Maestría
- `Maestria/Clase1_Fundamentos_ContabilidadPublica.md`
- `Maestria/Clase2_EstadosFinancieros_NICSP.md`
- `Maestria/Clase3_Gestion_Publica_SIAF.md`
- `Maestria/Clase4_PlanDeCuentas_RegistroContable.md`
- `Maestria/TAREAS/` — Trabajos prácticos

---

## 12. HISTORIAL DE CAMBIOS (COMMITS)

| Hash | Fecha | Descripción |
|------|-------|-------------|
| `3826930` | 2026-09-13 | fix: Moodle - Composer + Router + HTTPS configurados |
| `4a8304b` | 2026-09-13 | refactor: Organizar estructura de carpetas para Moodle |
| `3a7158b` | 2026-09-13 | fix: Mover formato de contraseña al modal recuperar contraseña |
| `fc3ca36` | 2026-09-13 | feat: Sociologia 100% local (sin nube) + listo para Moodle |
| `d13aa46` | 2026-09-13 | fix: Registro docente busca datos existentes en localStorage |
| `43c301d` | 2026-09-13 | feat: Formulario unificado + diseño premium + secciones de perfil |
| `ddfd1e8` | 2026-09-13 | fix: index.html usa localStorage (sin Google Sheets) |
| `712445d` | 2026-09-13 | fix: Recuperar contraseña busca en RegistroAlumnos Y Roles |
| `6526be2` | 2026-09-12 | fix: Login busca docentes/admins en hoja Roles |

---

## 13. PREGUNTAS ABIERTAS (DECISIONES PENDIENTES)

1. **¿Usar Docker o XAMPP?** → Docker es la opción actual (PHP 8.3). XAMPP solo sirve si se actualiza a PHP 8.3+.
2. **¿Tema Centuria self-hosted o con Google Fonts?** → Self-hosted recomendado (regla del proyecto).
3. **¿Plugin local_campusvirtual o archivos directos en public/?** → Plugin es más limpio para upgrades.
4. **¿Cuántos cursos crear por materia?** → Un curso por materia principal (TIC, Sociología, Maestría).
5. **¿Integrar portal standalone完全mente en Moodle o mantener separado?** → Decisión del usuario.

---

## 14. CONTACTO Y REPOSITORIO

- **GitHub:** `https://github.com/wmlumen/PDF-FIT.git`
- **Rama principal:** `master`
- **Usuario GitHub:** `wmlumen`

---

## 15. SESIÓN 2026-09-13 — AVANCES Y PENDIENTE INMEDIATO

### ✅ Completado hoy (2026-09-13 tarde)
- **XAMPP descartado para Moodle**: PHP 7.4 incompatible con Moodle 5.3 (requiere 8.3). Se vuelve a Docker (moodlehq/moodle-php-apache:8.3).
- **docker-compose.yml reescrito**: `80:80 / 443:443`, volumen `../CampusVirtual/app/moodle:/var/www/html`, `MOODLE_SITENAME="Campus Virtual Centuria"`, `MOODLE_PASSWORD=Centuria2024*`.
- **Puertos liberados**: `taskkill httpd` + `net stop MySQL80` + `docker compose down -v` (volúmenes borrados).
- **config.php corregido**: Fix de escaping `\$CFG` (heredoc falló), reescrito vía Write tool a `CampusVirtual/app/moodle/config.php` con `dbhost=db`, `wwwroot=http://localhost`.
- **DB recreada**: 0 → 428 tablas (utf8mb4_unicode_ci). Dos installs paralelos detectados (`install.php` PID 38 + `install_database.php` PID 83) → `kill 38 83`.
- **DocumentRoot Moodle 5.3**: confirmado `public/` como web root. Apache alias `/CampusVirtual` probado en XAMPP, ahora Docker sirve directo en `http://localhost/`.
- **centuria_moodle.md creado** en raíz (14 secciones, 64 tareas) y pusheado `bdf7043`.

### ⚠️ Pendiente inmediato (próxima IA / próxima sesión)
1. **Re-arrancar Docker daemon** (ahora `failed to connect to docker API` — reiniciar Docker Desktop).
2. `cd moodle && docker compose up -d` y esperar `healthy`.
3. **Reintentar upgrade**: `docker exec moodle_web php /var/www/html/admin/cli/upgrade.php --non-interactive --allow-unstable` con timeout 900s+ o `--timeout 0`. Si vuelve a timeout, repetir (es idempotente) hasta que retorne `Upgrade completed`.
4. Limpiar flag si queda: `docker exec moodle_db mariadb -u root -pmoodle_root_pwd moodle -e "DELETE FROM mdl_config WHERE name='upgraderunning';"`
5. **Verificar**: `curl -k http://localhost/` → 200, login `admin / Centuria2024*`, versión `2026091100`.
6. Crear cursos + `import_indicators.php 3`.
7. Marcar FASE 2.7-2.9 como [x] en este archivo y pushear.

### 🔴 Bloqueo actual
- Docker daemon apagado al final de sesión. No es error de config, solo reiniciar Docker Desktop.

*Este documento es la fuente de verdad para el proyecto Campus Virtual Centuria. Cualquier IA que trabaje aquí debe consultarlo primero y actualizarlo al finalizar.*
