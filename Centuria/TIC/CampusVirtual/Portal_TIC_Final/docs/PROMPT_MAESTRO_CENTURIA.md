# PROMPT MAESTRO CENTURIA — Campus Virtual Unificado v3.0
> **ÚNICO ARCHIVO FUENTE** para generar/validar cualquier asignatura del Instituto Superior Centuria.
> Reemplaza todos los prompts anteriores. Aplicable a: TIC, Sociología, Contabilidad, Derecho, etc.

---

## CÓMO USAR ESTE PROMPT

1. **Cambia** las variables `[ASIGNATURA]`, `[CODIGO]`, `[NUM_UNIDADES]`, `[CARRERA]` según la materia.
2. **Pega** el contenido oficial de cada unidad (los `.txt` de `Archivos_Respaldo/Oficial/Unidad/`).
3. **Ejecuta** el agente con este prompt → genera los HTML validados.
4. **Valida** con el checklist final (PowerShell).

---

## PARTE 1 — ARQUITECTURA DEL SISTEMA

### Estructura de Archivos
```
Portal_TIC_Final/
├── index.html                    ← Login premium (glassmorphism, multi-rol)
├── admin_roles.html              ← Panel admin: gestión de roles por cédula
├── paleta-oficial.css            ← Variables CSS institucionales
├── session-guard.js              ← Logout + timeout 1hr inactividad
├── accesibilidad.js              ← ⚙ Font/zoom/contraste WCAG AAA
├── accesibilidad.css             ← Estilos panel accesibilidad
├── portal-layout.js              ← Sidebar auto-hide + toggle
├── portal-layout.css             ← Grid sidebar + content
├── marcar_leido_moodle.js        ← Sync con Moodle local
├── prompt_maestro_materiales.md  ← Este archivo
├── indicators.json               ← Estado de indicadores por unidad
├── alumnos_cargados.json         ← 30 alumnos demo
├── Backend_Scripts/
│   └── 01_Script_Google_Completo.gs  ← Apps Script v03 (multi-rol)
├── Materiales_Clases/
│   ├── index.html                ← Menú sidebar interno
│   ├── programa.html             ← Programa de estudios
│   ├── planilla.html             ← Dashboard calificaciones
│   ├── glosario.html             ← Glosario 40+ términos
│   ├── asistencia_presencial.html
│   ├── examen_virtual.html
│   ├── autoevaluacion_secuencial.html
│   ├── criterios_evaluacion.html
│   ├── indicadores_por_unidad.html
│   ├── Unidad_01.html            ← Generados desde .txt oficiales
│   ├── Unidad_02.html
│   ├── ...
│   └── Unidad_10.html
└── Archivos_Respaldo/
    └── Oficial/
        ├── programa.txt          ← Programa oficial de la materia
        └── Unidad/               ← Contenido fuente por unidad
            ├── Unidad 1.txt
            ├── Unidad 2.txt
            └── ...
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

### Sistema Multi-Rol
Una **misma cédula** puede tener múltiples roles:
| Rol | Acceso | Icono |
|-----|--------|-------|
| `alumno` | Unidades de estudio | 🎓 |
| `docente` | Panel docente + planilla | 👨‍🏫 |
| `admin` | Panel administración de roles | ⚙️ |
| `academico` | Acceso académico general | 🏛️ |

**Flujo de login:**
1. Cédula → `verificar_alumno` → si existe, busca `verificar_roles`
2. Si 1 rol → entra directo. Si múltiples → `step-2-roles` selector
3. Si no existe → `step-2-register` (registro con Nombre, Apellido, Grado, Carrera, Sección)
4. Desde cualquier página → badge de rol en header abre dropdown para **cambiar de rol sin salir**

### Hojas Google Sheets (SSOT)
| Hoja | Columnas | Propósito |
|------|----------|-----------|
| `RegistroAlumnos` | Cédula, Nombre, Apellido, Email, Grado, Carrera, Sección | Datos de alumnos |
| `Roles` | Cédula, Nombre, Rol, Carrera, Sección, Asignatura, Estado, FechaAsignación, AsignadoPor | Sistema multi-rol |
| `Asistencias` | Fecha/Hora, Cédula, Unidad/Lugar, Observación | Control de asistencia |
| `ProgresoUnidades` | Fecha/Hora, Cédula, Unidad Terminada, Estado | Progreso por unidad |
| `Notas` | Cédula, Nombre, Asistencia, Parcial1, Parcial2, Final | Calificaciones |

### Regla de Contraseñas (R28)
```
Primera letra Nombre (Mayús) + primera letra Apellido (minús) + cédula(sin puntos) + *
```
Ejemplo: Juan Pérez, cédula 12345678 → `Jp12345678*`

---

## PARTE 2 — VARIABLES PARA PERSONALIZAR

Cambia estas variables al adaptar a otra materia:

```yaml
ASIGNATURA: "TIC"                    # Nombre corto
ASIGNATURA_COMPLETA: "Tecnología de la Información y Comunicación"
CODIGO: "ADE18"                       # Código del plan
CARRERA: "Administración de Empresas"
NUM_UNIDADES: 10                      # 6, 8, 10, etc.
ARCHIVO_GOLD: "Unidad_05.html"       # Archivo referencia para copiar estructura
SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyhfPTAVGGFsry6ueNVGQGZD0dGVbPu8zwJWnQkg6iOBcHx0FVUiAk5y8RJ1ggkIvTC2g/exec"
SHEET_ID: "1TRxrgXIojONTrszwF9cmgJn75qx-zUbacjRzwrT8xeo"

# Contenido fuente (personalizar por materia)
UNIDADES:
  - titulo: "Introducción a los Sistemas de Información Computarizados"
    archivo_fuente: "Unidad/Unidad 1.txt"
  - titulo: "La Estrategia de Negocios a Través de Tecnologías de Información"
    archivo_fuente: "Unidad/Unidad 2.txt"
  # ... agregar según NUM_UNIDADES

BIBLIOGRAFIABasica:
  - "Laudon, K. C., & Laudon, J. P. (2020). Management Information Systems. Pearson."
  - "Turban, E. et al. (2018). Information Technology for Management. Wiley."

BIBLIOGRAFIAComplementaria:
  - "O'Brien, J. A. & Marakas, G. M. (2011). Management Information Systems. McGraw-Hill."
  - "Cohen, L. et al. (2000). Software Project Management. McGraw-Hill."
```

---

## PARTE 3 — REGLAS DE GENERACIÓN HTML (27 Reglas)

### Generales
1. **Bootstrap 5.3** + **Montserrat** + **Bootstrap Icons**. Prohibido otro CSS/ framework.
2. **Archivos CSS:** Solo `<link href="../paleta-oficial.css">` + `<link href="../estilos.css">` (si existe). Prohibido `<style>` inline en `<head>`.
3. **Encoding:** UTF-8. Sin `âž"`, `ðŸ¡`, ni ASCII art.

### Estructura HTML (por cada Unidad_XX.html)
4. **Exactamente 1 `<h2>`** = Título de la unidad. `0` o `>1` = FALLO.
5. **`<h3>`** solo para temas (1-5 por unidad). `<h4>` solo para subtemas A., B., C.
6. Reemplaza TODO `<p class="titulo-falso">`, `<p><b>1. Tema</b></p>` por `<h3>`/`<h4>`.

### Contenido
7. **Resaltado de conceptos:** `<strong>Término:</strong> Definición...` → mínimo 8 por unidad.
8. **Listas:** A., B., C. → `<h4><strong>A. Título</strong></h4>` + `<ul><li>...` inmediatamente.
9. **Tablas:** Texto plano con columnas → `<table class="table table-bordered table-striped table-hover">`. Mínimo 1 por unidad si hay comparativas.
10. **Tarjetas:** `<div class="card shadow-sm border-start border-4 mb-3 col-12">` → mínimo 2 por unidad.
11. **Citas:** Texto entre comillas o >20 palabras copiadas → `<blockquote class="blockquote-clase">`.
12. **Sin ASCII art:** Prohibido `┌ ─ │`. Usar `row>col` + iconos Bootstrap.

### Navegación
13. **Sidebar:** 10 enlaces `<a href="Unidad_XX.html" class="menu-clase" data-clase="N">Unidad N</a>`. Siempre visibles: `programa.html`, `planilla.html`, `glosario.html`.
14. **Navegación lineal:** Solo iconos — `<a href="Unidad_XX.html" class="btn btn-outline-secondary" title="Unidad anterior"><i class="bi bi-chevron-left"></i></a>` y `<a href="Unidad_XX.html" class="btn btn-primary" title="Siguiente unidad"><i class="bi bi-chevron-right"></i></a>`. Prohibido texto "Unidad Anterior" / "Siguiente Unidad".
15. **Header:** Logo + Nombre Instituto + Carrera/Asignatura + Progreso inline (X/N ▓░░ %) + Badge de rol (clickeable para cambiar) + Botón Salir.

### Interactividad
16. **Marcar como Leído:** Botón por cada card/sección. Al final: `Confirmar Lección como Completada` (solo se habilita cuando todos leídos).
17. **Progreso inline:** Barra en header `✅ X/8 ▓▓▓░░ 38%`. Se actualiza al marcar leído.
18. **Bloqueo secuencial:** Unidad N+1 bloqueada hasta completar Unidad N (localStorage).
19. **Tooltip siglas:** `<span class="sigla" data-bs-toggle="tooltip" title="Significado completo">SIGLA</span>` → mínimo 5 por unidad.

### Accesibilidad
20. **Panel ⚙:** Botón junto a "Salir" → fuente (A-/A), zoom (-/+) , contraste alto WCAG AAA.
21. **Alto contraste:** Fondo negro, texto amarillo `#ffeb3b`, links cyan `#00e5ff`.
22. **Persistencia:** Preferencias guardadas en `localStorage`.

### Sesión y Seguridad
23. **Guard de sesión:** Primera línea después de `<body>`: `if(!sessionStorage.getItem('current_cedula')){location.replace('../index.html');}`
24. **Logout:** `sessionStorage.removeItem('current_cedula'); location.replace('../index.html');` Prohibido `localStorage.clear()`.
25. **Session guard externo:** `session-guard.js` inyectado en todas las páginas. 1hr inactividad → modal → 1min → auto-logout.
26. **Solo `sessionStorage`** para sesión. `localStorage` solo para progreso y preferencias.

### Calificaciones
27. **Escala:** Asistencia 10% + Parciales 40% (20+20) + Final 50% = 100%.
28. **Escala numérica:** 1 (0-69%) = Insuficiente, 2 (70-77%) = Aprobado, 3 (78-85%) = Bueno, 4 (86-93%) = Distinguido, 5 (94-100%) = Sobresaliente.
29. **Derecho a examen:** 80% asistencia + parciales aprobados.

---

## PARTE 4 — PLANTILLA HTML MAESTRA

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unidad [N]: [TITULO] — [ASIGNATURA]</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="../paleta-oficial.css" rel="stylesheet">
    <style>
        /* Estilos específicos de la unidad si los hay */
    </style>
    <script>if(!sessionStorage.getItem('current_cedula')){location.replace('../index.html');}</script>
</head>
<body>
    <div class="d-flex" style="min-height:100vh;">
        <!-- SIDEBAR -->
        <aside id="portal-menu" class="portal-sidebar d-flex flex-column" style="width:260px; background:var(--c-primary); color:white;">
            <div class="p-3 border-bottom border-white/10">
                <img src="../logo_centuria.png" alt="Centuria" style="height:40px; margin-bottom:8px;">
                <div style="font-size:.85rem; font-weight:700;">[ASIGNATURA_COMPLETA]</div>
                <div style="font-size:.7rem; opacity:.7;">[CARRERA] • [CODIGO]</div>
            </div>
            <nav class="flex-grow-1 p-2" style="overflow-y:auto;">
                <a href="Unidad_01.html" class="menu-clase" data-clase="1">Unidad 1</a>
                <!-- ... 10 enlaces ... -->
                <hr style="border-color:rgba(255,255,255,.15); margin:8px 0;">
                <a href="programa.html"><i class="bi bi-book me-2"></i>Programa</a>
                <a href="planilla.html"><i class="bi bi-table me-2"></i>Planilla</a>
                <a href="glosario.html"><i class="bi bi-bookmark me-2"></i>Glosario</a>
            </nav>
        </aside>

        <!-- CONTENT -->
        <main class="flex-grow-1 p-4">
            <!-- HEADER -->
            <div id="top-user-bar" class="d-flex justify-content-between align-items-center gap-2 py-2 px-3 mb-3 bg-white rounded-3 shadow-sm border" style="position:sticky; top:0; z-index:10;">
                <div class="d-flex align-items-center gap-3">
                    <img src="../logo_centuria.png" alt="Centuria" style="height:36px;">
                    <div>
                        <div class="fw-bold" style="color:var(--c-primary); font-size:.85rem;">INSTITUTO SUPERIOR CENTURIA</div>
                        <small class="text-muted" style="font-size:.7rem;">[ASIGNATURA] • [CODIGO]</small>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <!-- Progreso inline -->
                    <div id="progreso-inline" class="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style="background:var(--c-light); border:1px solid rgba(0,122,51,.15);">
                        <i class="bi bi-check2-square" style="color:var(--c-primary); font-size:.85rem;"></i>
                        <span id="progreso-texto-inline" class="fw-bold small" style="color:var(--c-primary); font-size:.75rem;">0/[NUM]</span>
                        <div style="width:60px; height:6px; background:#dee2e6; border-radius:10px; overflow:hidden;">
                            <div id="progreso-bar-inline" style="width:0%; height:100%; background:linear-gradient(90deg,var(--c-primary),var(--c-accent)); border-radius:10px; transition:width .4s;"></div>
                        </div>
                        <span id="progreso-pct-inline" class="fw-bold small" style="color:var(--c-primary); font-size:.7rem;">0%</span>
                    </div>
                    <!-- Usuario + Selector de Rol -->
                    <div class="text-end d-none d-md-block" style="position:relative;">
                        <div id="sidebar-user-name" class="fw-bold small" style="color:var(--c-primary); line-height:1.1;"></div>
                        <small id="sidebar-user-id" class="text-muted" style="font-size:.7rem;"></small>
                        <div id="rol-activo-badge" style="font-size:.6rem; margin-top:2px; cursor:pointer;" onclick="toggleRolSelector()" title="Clic para cambiar de rol">
                            <span class="badge" id="rol-badge-text" style="background:var(--c-primary); color:white; font-size:.55rem; padding:2px 6px; border-radius:10px; text-transform:uppercase; letter-spacing:.5px;">🎓 ALUMNO</span>
                            <i class="bi bi-chevron-down" style="font-size:.5rem; color:#999; margin-left:2px;"></i>
                        </div>
                        <div id="rol-selector-dropdown" style="display:none; position:absolute; right:0; top:100%; background:white; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,.15); border:1px solid #e0e0e0; min-width:260px; z-index:999; padding:8px 0; margin-top:4px;">
                            <div style="padding:8px 14px; font-size:.65rem; color:#999; text-transform:uppercase; letter-spacing:1px; font-weight:600; border-bottom:1px solid #f0f0f0;">
                                <i class="bi bi-arrow-repeat me-1"></i>Cambiar de rol
                            </div>
                            <div id="rol-selector-lista"></div>
                            <div style="border-top:1px solid #f0f0f0; padding:6px 14px;">
                                <a href="../index.html" style="font-size:.7rem; color:#dc3545; text-decoration:none;" onclick="sessionStorage.clear();"><i class="bi bi-box-arrow-right"></i> Salir completamente</a>
                            </div>
                        </div>
                    </div>
                    <button id="btn-logout" class="btn btn-sm btn-outline-secondary" title="Cerrar sesión"><i class="bi bi-box-arrow-right"></i> Salir</button>
                </div>
            </div>

            <!-- CONTENIDO DE LA UNIDAD -->
            <h2>[N] TÍTULO DE LA UNIDAD</h2>

            <!-- Cards, tablas, blockquotes, listas según reglas 4-11 -->

            <!-- BIBLIOGRAFÍA -->
            <div class="seccion-bibliografia">
                <h4>Bibliografía Básica</h4><ul><!-- ... --></ul>
                <h4>Bibliografía Complementaria</h4><ul><!-- ... --></ul>
            </div>

            <!-- NAVEGACIÓN LINEAL (solo iconos) -->
            <div class="navegacion-unidades d-flex justify-content-between border-top pt-3">
                <a href="Unidad_[N-1].html" class="btn btn-outline-secondary" title="Unidad anterior"><i class="bi bi-chevron-left"></i></a>
                <a href="Unidad_[N+1].html" class="btn btn-primary" title="Siguiente unidad"><i class="bi bi-chevron-right"></i></a>
            </div>

            <!-- CONFIRMAR LECCIÓN -->
            <button id="btn-confirmar" class="btn btn-secondary w-100 mt-3" disabled onclick="confirmarLeccion()">
                <i class="bi bi-check-all me-2"></i>Confirmar Lección como Completada
            </button>
        </main>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../portal-layout.js"></script>
    <script>
        // === LÓGICA DE UNIDAD ===
        const UNIDAD_ACTUAL = [N];
        const TOTAL_UNIDADES = [NUM];
        const SCRIPT_URL = '[SCRIPT_URL]';

        // Mostrar usuario + badge rol
        const n = sessionStorage.getItem('current_nombre');
        const c = sessionStorage.getItem('current_cedula');
        const rol = sessionStorage.getItem('rol') || 'alumno';
        if(n) document.getElementById('sidebar-user-name').textContent = n;
        if(c) document.getElementById('sidebar-user-id').textContent = 'C.I: ' + c;

        // Badge de rol + selector
        (function(){
            const badgeTexto = document.getElementById('rol-badge-text');
            if(!badgeTexto) return;
            const colores = {alumno:'#007A33',docente:'#0097A7',admin:'#5C6BC0',academico:'#8E24AA'};
            const emojis = {alumno:'🎓',docente:'👨\u200d🏫',admin:'⚙️',academico:'🏛️'};
            const etiquetas = {alumno:'ALUMNO',docente:'DOCENTE',admin:'ADMIN',academico:'ACADÉMICO'};
            badgeTexto.style.background = colores[rol] || '#007A33';
            badgeTexto.textContent = (emojis[rol]||'🎓') + ' ' + (etiquetas[rol]||rol.toUpperCase());
            cargarRolesDisponibles();
        })();

        function toggleRolSelector(){
            const dd = document.getElementById('rol-selector-dropdown');
            dd.style.display = dd.style.display==='none' ? 'block' : 'none';
        }
        document.addEventListener('click', function(e){
            const dd = document.getElementById('rol-selector-dropdown');
            const badge = document.getElementById('rol-activo-badge');
            if(dd && !dd.contains(e.target) && badge && !badge.contains(e.target)) dd.style.display = 'none';
        });

        async function cargarRolesDisponibles(){
            const cedula = sessionStorage.getItem('current_cedula');
            if(!cedula) return;
            try {
                const r = await fetch(SCRIPT_URL+'?action=verificar_roles&cedula='+encodeURIComponent(cedula));
                const data = await r.json();
                sessionStorage.setItem('roles', JSON.stringify(data.roles||[]));
                renderizarRolesDisponibles(data.roles||[]);
            } catch(e) { console.error(e); }
        }

        function renderizarRolesDisponibles(roles){
            const lista = document.getElementById('rol-selector-lista');
            if(!lista || !roles.length) return;
            const colores = {alumno:'#007A33',docente:'#0097A7',admin:'#5C6BC0',academico:'#8E24AA'};
            const emojis = {alumno:'🎓',docente:'👨\u200d🏫',admin:'⚙️',academico:'🏛️'};
            const etiquetas = {alumno:'Alumno',docente:'Docente',admin:'Administrador',academico:'Académico'};
            const rolActual = sessionStorage.getItem('rol') || 'alumno';
            let html = '';
            roles.forEach(function(r){
                if(r.estado !== 'activo') return;
                const esActual = r.rol === rolActual;
                const color = colores[r.rol] || '#007A33';
                const info = [r.asignatura||r.carrera||'', r.seccion?'Sec. '+r.seccion:''].filter(Boolean).join(' · ');
                html += '<div onclick="cambiarRol(\''+r.rol+'\',\''+encodeURIComponent(r.carrera||'')+'\',\''+encodeURIComponent(r.seccion||'')+'\')" style="padding:10px 14px; cursor:pointer; display:flex; align-items:center; gap:10px; border-radius:8px; margin:2px 8px; border:2px solid '+(esActual?color:'transparent')+';">';
                html += '<span style="width:28px; height:28px; border-radius:50%; background:'+color+'20; color:'+color+'; display:flex; align-items:center; justify-content:center; font-size:.8rem;">'+(emojis[r.rol]||'🎓')+'</span>';
                html += '<div style="flex:1;"><div style="font-size:.78rem; font-weight:600;">'+(etiquetas[r.rol]||r.rol)+'</div><div style="font-size:.65rem; color:#999;">'+info+'</div></div>';
                if(esActual) html += '<i class="bi bi-check-circle-fill" style="color:'+color+';"></i>';
                html += '</div>';
            });
            lista.innerHTML = html;
        }

        function cambiarRol(nuevoRol, carrera, seccion){
            carrera = decodeURIComponent(carrera||'');
            seccion = decodeURIComponent(seccion||'');
            sessionStorage.setItem('rol', nuevoRol);
            if(carrera) sessionStorage.setItem('current_carrera', carrera);
            if(seccion) sessionStorage.setItem('current_seccion', seccion);
            if(nuevoRol === 'admin'){ window.location.href = '../admin_roles.html'; return; }
            window.location.reload();
        }

        // Progreso inline
        function actualizarProgresoInline(leidos, total){
            if(leidos === undefined){
                const textoEl = document.getElementById('progreso-texto');
                if(textoEl){
                    const match = textoEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
                    if(match){ leidos = parseInt(match[1]); total = parseInt(match[2]); }
                }
                if(leidos === undefined){ leidos = 0; total = 1; }
            }
            const pct = total > 0 ? Math.round((leidos / total) * 100) : 0;
            const elTexto = document.getElementById('progreso-texto-inline');
            const elBar = document.getElementById('progreso-bar-inline');
            const elPct = document.getElementById('progreso-pct-inline');
            if(elTexto) elTexto.textContent = leidos + '/' + total;
            if(elBar) elBar.style.width = pct + '%';
            if(elPct) elPct.textContent = pct + '%';
        }

        // Marcar leído
        const leidos = new Set();
        const totalSecciones = document.querySelectorAll('.btn-marcar-leido').length;
        function marcarLeido(slug){
            leidos.add(slug);
            const btn = document.querySelector('[data-section="'+slug+'"]');
            if(btn){ btn.classList.add('btn-success'); btn.classList.remove('btn-outline-success'); btn.innerHTML='<i class="bi bi-check-circle-fill me-1"></i>Leído'; }
            actualizarProgresoInline(leidos.size, totalSecciones);
            const confirmar = document.getElementById('btn-confirmar');
            if(leidos.size === totalSecciones){ confirmar.disabled = false; confirmar.classList.remove('btn-secondary'); confirmar.classList.add('btn-success'); }
        }

        function confirmarLeccion(){
            localStorage.setItem('tic_progress_'+location.pathname.split('/').pop().replace('.html',''), 'finished');
            alert('¡Lección confirmada!');
            // Ir a siguiente unidad
            const next = UNIDAD_ACTUAL < TOTAL_UNIDADES ? 'Unidad_' + String(UNIDAD_ACTUAL+1).padStart(2,'0')+'.html' : 'programa.html';
            location.href = next;
        }

        // Init
        window.addEventListener('load', function(){
            actualizarProgresoInline();
            new bootstrap.Tooltip(document.body, {selector:'[data-bs-toggle="tooltip"]'});
        });
    </script>
    <script src="../marcar_leido_moodle.js"></script>
    <script src="../accesibilidad.js"></script>
    <script src="../session-guard.js"></script>
</body>
</html>
```

---

## PARTE 5 — CHECKLIST DE VALIDACIÓN (PowerShell)

Antes de cada entrega, ejecutar:

```powershell
$c = Get-Content Unidad_0N.html -Raw; @(
  ("R4 h2==1",          ([regex]::Matches($c,"<h2")).Count -eq 1),
  ("R7 strong: >=8",    ([regex]::Matches($c,"<strong>[^<]*:</strong>")).Count -ge 8),
  ("R9 table>=1",       ([regex]::Matches($c,"<table")).Count -ge 1),
  ("R10 card>=2",       ([regex]::Matches($c,"card shadow-sm border-start border-4")).Count -ge 2),
  ("R11 bib SI/SI",     ($c -match "Bibliografía Básica") -and ($c -match "Bibliografía Complementaria")),
  ("R19 tooltip>=5",    ([regex]::Matches($c,'data-bs-toggle="tooltip"')).Count -ge 5),
  ("R12 menu==10",      ([regex]::Matches($c,"menu-clase")).Count -eq 10),
  ("R14 nav-iconos",    $c -match 'bi bi-chevron-left' -and $c -match 'bi bi-chevron-right'),
  ("R16 ML>=8",         ([regex]::Matches($c,"Marcar como Leído")).Count -ge 8),
  ("R16 Confirmar",     $c -match "Confirmar Lección"),
  ("R23 Guard-sesion",  $c -match "sessionStorage.getItem.*current_cedula"),
  ("R25 SessionGuard",  $c -match "session-guard.js"),
  ("R05 Accesibilidad", $c -match "accesibilidad.js")
) | ForEach-Object { "$($_[0]): $(if($_[1]){'✓'}else{'✗ FALLO'})" }
```

**Todos deben ser ✓. Si uno es ✗ → RECHAZADO.**

---

## PARTE 6 — APPS SCRIPT v03 (Backend Multi-Rol)

El archivo `01_Script_Google_Completo.gs` debe soportar estas acciones:

| Método | Action | Parámetros | Retorna |
|--------|--------|------------|---------|
| GET | `verificar_alumno` | `cedula` | `{existe, nombre, nombre_separado, email, grado, carrera, seccion}` |
| GET | `verificar_roles` | `cedula` | `{roles: [{cedula, nombre, rol, carrera, seccion, asignatura, estado}]}` |
| GET | `listar_cursos` | `cedula, rol, carrera` | `{cursos: [{id, nombre, codigo, seccion, color, icono, rol}]}` |
| POST | `registrar_alumno` | `cedula, nombre, nombre_separado, email, grado, carrera, seccion` | `{status, mensaje}` |
| POST | `asignar_rol` | `cedula, nombre, rol, carrera, seccion, estado, asignado_por` | `{status, mensaje}` |
| POST | `desactivar_rol` | `cedula, rol, carrera` | `{status, mensaje}` |
| POST | `marcar_asistencia` | `cedula, unidad, observacion` | `{status}` |
| POST | `registrar_progreso` | `cedula, unidad` | `{status}` |
| POST | `guardar_nota` | `cedula, evaluacion, puntaje` | `{status}` |

---

## PARTE 7 — PASOS PARA NUEVA ASIGNATURA

1. **Crear carpeta** `Archivos_Respaldo/Oficial/Unidad/` con los `.txt` de cada unidad.
2. **Editar variables** en PARTE 2 de este prompt.
3. **Generar HTML** usando el agente con este prompt.
4. **Copiar `01_Script_Google_Completo.gs`** y ajustar la hoja `Roles` si es necesario.
5. **Actualizar `indicators.json`** con las nuevas unidades.
6. **Actualizar `programa.html`** con el contenido de `programa.txt`.
7. **Validar** con el checklist PowerShell (PARTE 5).
8. **Probar login** con cédula de ejemplo → selector de roles → acceso a unidades.

---

*Prompt Maestro Centuria v3.0 — Consolidación de todas las mejoras del Campus Virtual.*
*Aplicable a cualquier asignatura del Instituto Superior Centuria.*
