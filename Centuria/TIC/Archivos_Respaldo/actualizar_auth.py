import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\generar_htmls.py"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of template_html
split_idx = content.find('template_html = """<!DOCTYPE html>')

if split_idx == -1:
    print("No se encontró template_html")
    exit(1)

# Keep everything up to template_html (which includes the classes dict)
base_code = content[:split_idx]

new_code = '''template_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{titulo_pagina} - TIC Centuria</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        body {{ background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.7; }}
        body.locked {{ overflow: hidden; }}
        #login-mask {{ position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(30,43,60,0.98); z-index: 9999; display: flex; align-items: center; justify-content: center; }}
        .login-box {{ background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); max-width: 450px; width: 95%; }}
        .sidebar {{ background-color: #1e2b3c; min-height: 100vh; color: white; padding-top: 0; }}
        .sidebar h5 {{ color: #ecf0f1; font-weight: bold; padding: 15px; margin-bottom: 0; text-align: center; background: #16202c; }}
        .sidebar a {{ color: #bdc3c7; text-decoration: none; display: block; padding: 12px 20px; border-bottom: 1px solid #2c3e50; transition: 0.2s; }}
        .sidebar a:hover, .sidebar a.active {{ background-color: #2c3e50; color: white; padding-left: 25px; border-left: 4px solid #3498db; }}
        .content {{ padding: 50px 8%; background-color: white; min-height: 100vh; }}
        h1.page-title {{ color: #2c3e50; font-weight: 800; border-bottom: 4px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; font-size: 2.2rem; }}
        
        .section-card {{ background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 25px; margin-bottom: 35px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border-left: 5px solid; position: relative; }}
        .border-def {{ border-left-color: #3498db; }}
        .border-casos {{ border-left-color: #e74c3c; }}
        .border-comp {{ border-left-color: #9b59b6; }}
        .border-ej {{ border-left-color: #f1c40f; }}
        .border-bib {{ border-left-color: #2ecc71; }}
        
        .section-title {{ font-size: 1.4rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }}
        .text-def {{ color: #2980b9; }}
        .text-casos {{ color: #c0392b; }}
        .text-comp {{ color: #8e44ad; }}
        .text-ej {{ color: #f39c12; }}
        .text-bib {{ color: #27ae60; }}
        
        table {{ font-size: 1.1rem; }}
        p {{ font-size: 1.15rem; color: #444; text-align: justify; margin-bottom: 15px; }}
        
        .badge-presencial {{ background-color: #e74c3c; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }}
        .badge-virtual {{ background-color: #2980b9; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }}
        .badge-asincronica {{ background-color: #27ae60; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }}
    </style>
</head>
<body class="locked">
    <div id="login-mask">
        <div class="login-box">
            <h3 class="mb-4 text-center text-dark fw-bold"><i class="bi bi-mortarboard-fill text-primary"></i> Portal Estudiantil</h3>
            
            <ul class="nav nav-pills nav-justified mb-4" id="authTabs">
                <li class="nav-item"><a class="nav-link active fw-bold" id="tab-login" href="#" style="cursor:pointer;">Ingreso</a></li>
                <li class="nav-item"><a class="nav-link fw-bold" id="tab-register" href="#" style="cursor:pointer;">Registro</a></li>
            </ul>
            
            <div id="form-login">
                <input type="text" id="login-cedula" class="form-control form-control-lg mb-3" placeholder="Número de Cédula">
                <button id="btn-login" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm">Ingresar a Clases</button>
                <p id="login-error" class="text-danger mt-3 text-center fs-5" style="display:none; font-weight:bold;">Cédula no registrada.</p>
            </div>
            
            <div id="form-register" style="display:none;">
                <input type="text" id="reg-nombre" class="form-control mb-2" placeholder="Nombre">
                <input type="text" id="reg-apellido" class="form-control mb-2" placeholder="Apellido">
                <input type="text" id="reg-cedula" class="form-control mb-2" placeholder="Cédula de Identidad">
                <input type="text" id="reg-telefono" class="form-control mb-2" placeholder="Teléfono">
                <input type="email" id="reg-email" class="form-control mb-4" placeholder="Correo Electrónico">
                <button id="btn-register" class="btn btn-success w-100 fw-bold shadow-sm">Completar Registro</button>
                <p id="reg-msg" class="text-center mt-3 fs-5 fw-bold"></p>
            </div>
        </div>
    </div>
    
    <div class="container-fluid">
        <div class="row">
            <nav class="col-md-3 col-lg-2 sidebar px-0 fixed-top" style="position: sticky; top: 0;">
                <h5>CENTURIA ADE18</h5>
                <div class="text-center p-3 border-bottom border-secondary" style="background-color: #1a2533;">
                    <i class="bi bi-person-circle fs-1 text-light"></i>
                    <div id="sidebar-user-name" class="fw-bold text-white mt-2 fs-5"></div>
                    <div id="sidebar-user-id" class="text-info mb-3"></div>
                    <button id="btn-logout" class="btn btn-sm btn-outline-danger w-100 fw-bold"><i class="bi bi-box-arrow-left"></i> Salir de Sesión</button>
                </div>
                <a href="index.html"><i class="bi bi-house-door me-2"></i>Inicio - Programa</a>
                <a href="planilla.html" class="text-warning fw-bold"><i class="bi bi-table me-2"></i>Planilla de Progreso</a>
                <div class="px-3 pt-4 pb-2 text-uppercase small fw-bold" style="color:#95a5a6; letter-spacing: 1px;">Material de Clases</div>
                {menu_links}
            </nav>
            <main class="col-md-9 col-lg-10 content">
                {contenido_principal}
            </main>
        </div>
    </div>
    
    <script>
        let currentUser = null;
        
        document.addEventListener("DOMContentLoaded", function() {{
            const mask = document.getElementById('login-mask');
            const btnLogout = document.getElementById('btn-logout');
            
            // Auth UI toggle
            document.getElementById('tab-login').onclick = (e) => {{ e.preventDefault(); document.getElementById('form-login').style.display='block'; document.getElementById('form-register').style.display='none'; document.getElementById('tab-login').classList.add('active'); document.getElementById('tab-register').classList.remove('active'); }};
            document.getElementById('tab-register').onclick = (e) => {{ e.preventDefault(); document.getElementById('form-register').style.display='block'; document.getElementById('form-login').style.display='none'; document.getElementById('tab-register').classList.add('active'); document.getElementById('tab-login').classList.remove('active'); }};
            
            function loadUsers() {{ return JSON.parse(localStorage.getItem('tic_users')) || {{}}; }}
            function saveUsers(u) {{ localStorage.setItem('tic_users', JSON.stringify(u)); }}
            
            // Register Logic
            document.getElementById('btn-register').onclick = () => {{
                let nom = document.getElementById('reg-nombre').value.trim();
                let ape = document.getElementById('reg-apellido').value.trim();
                let ced = document.getElementById('reg-cedula').value.trim();
                let tel = document.getElementById('reg-telefono').value.trim();
                let ema = document.getElementById('reg-email').value.trim();
                
                if(!nom || !ape || !ced) return alert("Nombre, Apellido y Cédula son obligatorios.");
                
                let users = loadUsers();
                users[ced] = {{ nombre: nom, apellido: ape, cedula: ced, telefono: tel, email: ema }};
                saveUsers(users);
                
                let msg = document.getElementById('reg-msg');
                msg.className = "text-success text-center mt-2 fw-bold";
                msg.innerText = "¡Registro exitoso! Ya puedes ingresar.";
                setTimeout(() => {{ document.getElementById('tab-login').click(); document.getElementById('login-cedula').value = ced; }}, 1500);
            }};
            
            // Login Logic
            function doLogin(ced) {{
                let users = loadUsers();
                if(users[ced]) {{
                    sessionStorage.setItem('current_cedula', ced);
                    sessionStorage.setItem('current_nombre', users[ced].nombre + ' ' + users[ced].apellido);
                    applySession();
                }} else {{
                    document.getElementById('login-error').style.display = 'block';
                }}
            }}
            
            document.getElementById('btn-login').onclick = () => doLogin(document.getElementById('login-cedula').value.trim());
            document.getElementById('login-cedula').addEventListener('keypress', function(e) {{ if(e.key === 'Enter') doLogin(this.value.trim()); }});
            
            // Apply Session
            function applySession() {{
                let c = sessionStorage.getItem('current_cedula');
                if(c) {{
                    currentUser = c;
                    mask.style.display = 'none';
                    document.body.classList.remove('locked');
                    document.getElementById('sidebar-user-name').innerText = sessionStorage.getItem('current_nombre');
                    document.getElementById('sidebar-user-id').innerText = "C.I: " + c;
                    
                    window.dispatchEvent(new Event('authReady'));
                }} else {{
                    mask.style.display = 'flex';
                    document.body.classList.add('locked');
                }}
            }}
            
            btnLogout.onclick = () => {{
                sessionStorage.removeItem('current_cedula');
                sessionStorage.removeItem('current_nombre');
                location.reload();
            }};
            
            applySession();
        }});
    </script>
    {scripts_marcadores}
</body>
</html>"""

modalidades_sabados = {
    1: 'Virtual', 2: 'Asincrónica', 3: 'Presencial',
    4: 'Virtual', 5: 'Asincrónica', 6: 'Presencial',
    7: 'Virtual', 8: 'Asincrónica', 9: 'Presencial',
    10: 'Virtual', 11: 'Asincrónica', 12: 'Presencial'
}

modalidades_lunes_viernes = {
    1: 'Presencial', 2: 'Virtual', 3: 'Presencial',
    4: 'Presencial', 5: 'Asincrónica', 6: 'Presencial',
    7: 'Presencial', 8: 'Virtual', 9: 'Presencial',
    10: 'Presencial', 11: 'Asincrónica', 12: 'Presencial'
}

def generar_html_por_grupo(directorio_grupo, modalidades_grupo):
    html_dir = directorio_grupo
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)

    grupo_js = os.path.basename(directorio_grupo)

    menu_links = ""
    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        menu_links += f'<a href="clase_{c["id"]:02d}.html" class="menu-clase" data-clase="{c["id"]}">Clase {c["id"]} ({tipo_actual})</a>\\n'

    # Progress Logic Script
    script_base = f"""
    <script>
        const current_grupo = '{grupo_js}';
        window.addEventListener('authReady', function() {{
            if(!currentUser) return;
            
            document.querySelectorAll('.menu-clase').forEach(link => {{
                let clId = link.getAttribute('data-clase');
                let state = localStorage.getItem('tic_progress_' + currentUser + '_' + current_grupo + '_clase_' + clId);
                if (state === 'finished') {{
                    link.classList.add('text-success', 'fw-bold');
                    link.innerHTML += ' <i class="bi bi-check-circle-fill float-end"></i>';
                }} else if (state) {{
                    link.classList.add('text-warning', 'fw-bold');
                    link.innerHTML += ' <i class="bi bi-bookmark-fill float-end"></i>';
                }}
            }});
            
            if(typeof current_clase !== 'undefined') {{
                let pKey = 'tic_progress_' + currentUser + '_' + current_grupo + '_clase_' + current_clase;
                let mainContent = document.querySelector('.content');
                let savedState = localStorage.getItem(pKey);
                
                // Bookmarks on sections
                if(savedState !== 'finished') {{
                    let cards = document.querySelectorAll('.section-card');
                    cards.forEach((card, index) => {{
                        let secId = 'sec-' + index;
                        card.id = secId;
                        let title = card.querySelector('.section-title');
                        if (title) {{
                            let btn = document.createElement('button');
                            btn.className = 'btn btn-sm btn-outline-warning ms-auto marcador-btn float-end';
                            btn.innerHTML = '<i class="bi bi-bookmark"></i> Marcar hasta aquí';
                            btn.onclick = function() {{
                                localStorage.setItem(pKey, secId);
                                location.reload();
                            }};
                            title.appendChild(btn);
                        }}
                    }});
                }}

                // Final Button / Banner
                if (savedState === 'finished') {{
                    let badge = document.createElement('div');
                    badge.className = 'alert alert-success text-center fw-bold shadow border-success p-4 mb-4';
                    badge.innerHTML = '<i class="bi bi-trophy-fill fs-1 text-warning d-block mb-2"></i><h4 class="mb-0">¡Felicidades, ' + sessionStorage.getItem('current_nombre') + '!</h4><p class="mb-0 mt-2 fs-5">Ya has completado totalmente el desarrollo de esta lección.</p>';
                    mainContent.appendChild(badge.cloneNode(true)); // Add to bottom
                    mainContent.insertBefore(badge, mainContent.firstChild); // Add to top
                }} else {{
                    let finishBtn = document.createElement('button');
                    finishBtn.className = 'btn btn-success btn-lg mt-5 mb-5 w-100 shadow fw-bold p-3';
                    finishBtn.innerHTML = '<i class="bi bi-check-all fs-3 me-2"></i> Confirmar Lección como Completada';
                    finishBtn.onclick = function() {{
                        localStorage.setItem(pKey, 'finished');
                        location.reload();
                    }};
                    mainContent.appendChild(finishBtn);
                }}

                // Scroll to active bookmark
                if (savedState && savedState.startsWith('sec-')) {{
                    let target = document.getElementById(savedState);
                    if (target) {{
                        target.style.border = '4px dashed #f39c12';
                        target.style.backgroundColor = '#fffdf7';
                        let markAlert = document.createElement('div');
                        markAlert.className = 'alert alert-warning mb-4 fw-bold fs-5 text-center shadow-sm';
                        markAlert.innerHTML = '<i class="bi bi-bookmark-fill me-2"></i> Marcador activo: Retomaste desde aquí.';
                        target.insertBefore(markAlert, target.firstChild);
                        setTimeout(() => {{
                            target.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                        }}, 600);
                    }}
                }}
            }}
        }});
    </script>
    """

    index_content = """
<h1 class="page-title text-center">Tecnología de la Información y la Comunicación (ADE18)</h1>
<div class="alert alert-dark text-center fs-5 mb-5"><strong>Instituto Superior Centuria</strong> | 2do Año - 3er Semestre | Carga Horaria: 120hs</div>
<div class="section-card border-def shadow-sm">
    <div class="section-title text-def"><i class="bi bi-bullseye"></i> Fundamentación y Objetivos Académicos</div>
    <p>Este documento presenta el programa académico de la asignatura Tecnologías de la Información y la Comunicación, diseñada para estudiantes de segundo año de administración. El curso se fundamenta en la relevancia de las herramientas digitales como motores de competitividad y éxito dentro del entorno empresarial contemporáneo. A través de diez unidades, el plan de estudios abarca desde la gestión de bases de datos y sistemas integrados hasta las nuevas tendencias del comercio electrónico y la inteligencia artificial. La metodología de enseñanza combina la teoría con la práctica en laboratorios y visitas técnicas para asegurar un aprendizaje integral.</p>
</div>
<div class="section-card border-casos shadow-sm">
    <div class="section-title text-casos"><i class="bi bi-bar-chart-steps"></i> Metodología de Evaluación Oficial</div>
    <ul class="list-group list-group-flush fs-5">
        <li class="list-group-item d-flex justify-content-between"><span><i class="bi bi-journal-text text-primary"></i> <strong>2 Exámenes Parciales</strong></span> <span class="badge bg-primary rounded-pill">40%</span></li>
        <li class="list-group-item d-flex justify-content-between"><span><i class="bi bi-person-check text-success"></i> <strong>Participación en Clase (Asistencia)</strong></span> <span class="badge bg-success rounded-pill">10%</span></li>
        <li class="list-group-item d-flex justify-content-between"><span><i class="bi bi-award text-danger"></i> <strong>Examen Final Integrador</strong></span> <span class="badge bg-danger rounded-pill">50%</span></li>
    </ul>
</div>
"""
    with open(os.path.join(html_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Programa ADE18", menu_links=menu_links, contenido_principal=index_content, scripts_marcadores=script_base))

    # Generate Planilla
    planilla_content = """
    <h1 class="page-title text-center"><i class="bi bi-table text-warning"></i> Planilla Oficial de Progreso</h1>
    <div class="alert alert-secondary shadow-sm fs-5 text-center mb-5">
        Monitoreo en tiempo real de los temas completados por los estudiantes registrados en este dispositivo.
    </div>
    <div class="card shadow border-0">
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-striped table-hover align-middle mb-0">
                    <thead class="table-dark">
                        <tr>
                            <th class="p-3">Cédula</th>
                            <th class="p-3">Estudiante</th>
                            <th class="p-3">Contacto</th>
                            <th class="text-center p-3" title="Clase 1">C1</th><th class="text-center p-3" title="Clase 2">C2</th><th class="text-center p-3" title="Clase 3">C3</th>
                            <th class="text-center p-3" title="Clase 4">C4</th><th class="text-center p-3" title="Clase 5">C5</th><th class="text-center p-3" title="Clase 6">C6</th>
                            <th class="text-center p-3" title="Clase 7">C7</th><th class="text-center p-3" title="Clase 8">C8</th><th class="text-center p-3" title="Clase 9">C9</th>
                            <th class="text-center p-3" title="Clase 10">C10</th><th class="text-center p-3" title="Clase 11">C11</th><th class="text-center p-3" title="Clase 12">C12</th>
                        </tr>
                    </thead>
                    <tbody id="planilla-body">
                        <!-- Llenado por JS -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <script>
        window.addEventListener('authReady', function() {
            const current_grupo = '""" + grupo_js + """';
            let users = JSON.parse(localStorage.getItem('tic_users')) || {};
            let tbody = document.getElementById('planilla-body');
            
            for (let ced in users) {
                let u = users[ced];
                let tr = document.createElement('tr');
                tr.innerHTML = `<td class="fw-bold">${u.cedula}</td><td><strong>${u.apellido}</strong>, ${u.nombre}</td><td class="small text-muted">${u.email}<br>${u.telefono}</td>`;
                
                for(let i = 1; i <= 12; i++) {
                    let st = localStorage.getItem('tic_progress_' + ced + '_' + current_grupo + '_clase_' + i);
                    let td = document.createElement('td');
                    td.className = 'text-center fs-4';
                    if (st === 'finished') {
                        td.innerHTML = '<i class="bi bi-check-circle-fill text-success" title="Completado"></i>';
                    } else if (st) {
                        td.innerHTML = '<i class="bi bi-bookmark-fill text-warning" title="En progreso"></i>';
                    } else {
                        td.innerHTML = '<i class="bi bi-dash text-black-50"></i>';
                    }
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            if (Object.keys(users).length === 0) {
                tbody.innerHTML = '<tr><td colspan="15" class="text-center text-muted py-5 fs-5">No hay alumnos registrados en el sistema.</td></tr>';
            }
        });
    </script>
    """
    with open(os.path.join(html_dir, "planilla.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Planilla de Progreso", menu_links=menu_links, contenido_principal=planilla_content, scripts_marcadores=script_base))


    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        badge_class = f"badge-{tipo_actual.lower()}"
        
        script_clase = f"<script>const current_clase = {c['id']};</script>\\n" + script_base

        if 'resultados_aprendizaje' in c:
            clase_content = f"""
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]} — {c["titulo"]}</h1>
            <div class="alert alert-secondary fs-5 text-center"><em>"{c.get('precentral', '')}"</em></div>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4"><i class="bi bi-tags"></i> Modalidad: {tipo_actual}</span>
            
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-bullseye"></i> 1. Resultados</div>{c.get("resultados_aprendizaje", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-exclamation-triangle-fill"></i> 2. Situación</div>{c.get("situacion_problematica", "")}</div>
            <div class="section-card border-ej"><div class="section-title text-ej"><i class="bi bi-question-circle"></i> 3. Diagnóstico</div>{c.get("actividad_diagnostica", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-book"></i> 4. Desarrollo</div>{c.get("teoria_1", "")}<hr>{c.get("actividad_1", "")}<hr>{c.get("teoria_2", "")}<hr>{c.get("teoria_3", "")}</div>
            <div class="section-card border-plan"><div class="section-title text-plan" style="color:#d35400;"><i class="bi bi-briefcase"></i> 5. Caso Práctico</div>{c.get("caso_practico", "")}</div>
            <div class="section-card border-rubrica"><div class="section-title text-rubrica" style="color:#2c3e50;"><i class="bi bi-diagram-3"></i> 6. Laboratorio</div>{c.get("taller_dfd", "")}</div>
            <div class="section-card border-bib"><div class="section-title text-bib"><i class="bi bi-check-circle"></i> 7. Cierre</div>{c.get("evaluacion_cierre", "")}</div>
            <div class="section-card border-rubrica"><div class="section-title text-rubrica" style="color:#8e44ad;"><i class="bi bi-ui-radios-grid"></i> 8. Evaluación</div>{c.get("evaluacion_multiple_choice", "")}</div>
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-journal-bookmark"></i> 9. Bibliografía</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            """
        else:
            clase_content = f"""
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]}: {c["titulo"]}</h1>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4"><i class="bi bi-tags"></i> Modalidad: {tipo_actual}</span>
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-journal-bookmark-fill"></i> 1. Desarrollo</div>{c.get("definiciones", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-newspaper"></i> 2. Casos</div>{c.get("casos", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-sliders2"></i> 3. Evaluaciones</div>{c.get("comparaciones", "")}</div>
            <div class="section-card border-ej"><div class="section-title text-ej"><i class="bi bi-pencil-square"></i> 4. Ejercitario</div><p class="fw-bold bg-light p-3 border rounded">{c.get("ejercitario", "")}</p></div>
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-book"></i> 5. Bibliografía</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            """
            
        with open(os.path.join(html_dir, f"clase_{c['id']:02d}.html"), "w", encoding="utf-8") as f:
            f.write(template_html.format(titulo_pagina=f"Clase {c['id']}", menu_links=menu_links, contenido_principal=clase_content, scripts_marcadores=script_clase))

# Generar para ambos grupos
generar_html_por_grupo('Materiales_HTML_Sabados', modalidades_sabados)
generar_html_por_grupo('Materiales_HTML_LunesViernes', modalidades_lunes_viernes)

print("Archivos HTML reconstruidos exitosamente: Login, Registro de Alumnos, Progreso Individual y Planilla Generada.")
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(base_code + new_code)
