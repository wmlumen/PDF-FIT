import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

split_idx = content.find('def generar_html_por_grupo(directorio_grupo, modalidades_grupo):')
if split_idx == -1:
    print("Could not find function")
    exit(1)

base_code = content[:split_idx]

new_func = '''def generar_html_por_grupo(directorio_grupo, modalidades_grupo):
    html_dir = directorio_grupo
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)

    grupo_js = os.path.basename(directorio_grupo)

    menu_links = ""
    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        menu_links += f'<a href="clase_{c["id"]:02d}.html" class="menu-clase" data-clase="{c["id"]}">Clase {c["id"]} ({tipo_actual})</a>\\n'

    # Progress and Attendance Logic Script
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
                let aKey = 'tic_asistencia_' + currentUser + '_' + current_grupo + '_clase_' + current_clase;
                let mainContent = document.querySelector('.content');
                let savedState = localStorage.getItem(pKey);
                
                // ASISTENCIA LOGIC
                let savedAsistencia = localStorage.getItem(aKey);
                let asisDiv = document.createElement('div');
                asisDiv.className = 'text-center mb-5';
                
                if (savedAsistencia) {{
                    asisDiv.innerHTML = `<span class="badge bg-success fs-5 p-3 shadow-sm"><i class="bi bi-check2-circle"></i> Asistencia Registrada: ${{savedAsistencia}}</span>`;
                }} else {{
                    let btnAsis = document.createElement('button');
                    btnAsis.className = 'btn btn-info text-white btn-lg fw-bold shadow-sm';
                    btnAsis.innerHTML = '<i class="bi bi-person-raised-hand"></i> Registrar mi Asistencia en esta Clase';
                    btnAsis.onclick = function() {{
                        let fecha = new Date().toLocaleString('es-ES', {{ dateStyle: 'short', timeStyle: 'short' }});
                        localStorage.setItem(aKey, fecha);
                        location.reload();
                    }};
                    asisDiv.appendChild(btnAsis);
                }}
                
                let modalidadBadge = document.querySelector('.badge.text-white');
                if(modalidadBadge) {{
                    modalidadBadge.parentNode.insertBefore(asisDiv, modalidadBadge.nextSibling);
                }}

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

    # Generate Planilla with Toggle
    planilla_content = """
    <h1 class="page-title text-center"><i class="bi bi-table text-warning"></i> Planilla Oficial (Progreso y Asistencia)</h1>
    
    <div class="d-flex justify-content-center mb-4 mt-4">
        <div class="btn-group shadow-sm" role="group">
            <input type="radio" class="btn-check" name="btnradio" id="btn-progreso" autocomplete="off" checked>
            <label class="btn btn-outline-primary fw-bold px-4 py-2 fs-5" for="btn-progreso"><i class="bi bi-journal-check"></i> Progreso Académico</label>

            <input type="radio" class="btn-check" name="btnradio" id="btn-asistencia" autocomplete="off">
            <label class="btn btn-outline-info fw-bold px-4 py-2 fs-5" for="btn-asistencia"><i class="bi bi-person-lines-fill"></i> Registro de Asistencia</label>
        </div>
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
            
            function renderTable(mode) {
                tbody.innerHTML = '';
                for (let ced in users) {
                    let u = users[ced];
                    let tr = document.createElement('tr');
                    tr.innerHTML = `<td class="fw-bold">${u.cedula}</td><td><strong>${u.apellido}</strong>, ${u.nombre}</td><td class="small text-muted">${u.email}<br>${u.telefono}</td>`;
                    
                    for(let i = 1; i <= 12; i++) {
                        let td = document.createElement('td');
                        td.className = 'text-center align-middle';
                        
                        if(mode === 'progreso') {
                            let st = localStorage.getItem('tic_progress_' + ced + '_' + current_grupo + '_clase_' + i);
                            if (st === 'finished') {
                                td.innerHTML = '<i class="bi bi-check-circle-fill text-success fs-4" title="Completado"></i>';
                            } else if (st) {
                                td.innerHTML = '<i class="bi bi-bookmark-fill text-warning fs-4" title="En progreso"></i>';
                            } else {
                                td.innerHTML = '<i class="bi bi-dash text-black-50 fs-4"></i>';
                            }
                        } else {
                            let ast = localStorage.getItem('tic_asistencia_' + ced + '_' + current_grupo + '_clase_' + i);
                            if (ast) {
                                td.innerHTML = `<span class="badge bg-success" title="${ast}">P</span><br><small class="text-muted" style="font-size:0.65rem;">${ast}</small>`;
                            } else {
                                td.innerHTML = '<span class="badge bg-danger">A</span>';
                            }
                        }
                        tr.appendChild(td);
                    }
                    tbody.appendChild(tr);
                }
                if (Object.keys(users).length === 0) {
                    tbody.innerHTML = '<tr><td colspan="15" class="text-center text-muted py-5 fs-5">No hay alumnos registrados en el sistema.</td></tr>';
                }
            }
            
            renderTable('progreso');
            
            document.getElementById('btn-progreso').addEventListener('change', () => renderTable('progreso'));
            document.getElementById('btn-asistencia').addEventListener('change', () => renderTable('asistencia'));
        });
    </script>
    """
    with open(os.path.join(html_dir, "planilla.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Planilla Progreso y Asistencia", menu_links=menu_links, contenido_principal=planilla_content, scripts_marcadores=script_base))


    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        badge_class = f"badge-{tipo_actual.lower()}"
        
        script_clase = f"<script>const current_clase = {c['id']};</script>\\n" + script_base

        if 'resultados_aprendizaje' in c:
            clase_content = f"""
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]} — {c["titulo"]}</h1>
            <div class="alert alert-secondary fs-5 text-center"><em>"{c.get('pregunta_central', '')}"</em></div>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4 d-block" style="width: fit-content; margin: 0 auto;"><i class="bi bi-tags"></i> Modalidad de Cursada: {tipo_actual}</span>
            
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-bullseye"></i> 1. Resultados de Aprendizaje</div>{c.get("resultados_aprendizaje", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-exclamation-triangle-fill"></i> 2. Situación Problemática</div>{c.get("situacion_problematica", "")}</div>
            <div class="section-card border-ej"><div class="section-title text-ej"><i class="bi bi-question-circle"></i> 3. Actividad Diagnóstica</div>{c.get("actividad_diagnostica", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-book"></i> 4. Desarrollo Teórico</div>{c.get("teoria_1", "")}<hr>{c.get("actividad_1", "")}<hr>{c.get("teoria_2", "")}<hr>{c.get("teoria_3", "")}</div>
            <div class="section-card border-plan"><div class="section-title text-plan" style="color:#d35400;"><i class="bi bi-briefcase"></i> 5. Caso Práctico Real</div>{c.get("caso_practico", "")}</div>
            <div class="section-card border-rubrica"><div class="section-title text-rubrica" style="color:#2c3e50;"><i class="bi bi-diagram-3"></i> 6. Mini Laboratorio / DFD</div>{c.get("taller_dfd", "")}</div>
            <div class="section-card border-bib"><div class="section-title text-bib"><i class="bi bi-check-circle"></i> 7. Evaluación Formativa y Cierre</div>{c.get("evaluacion_cierre", "")}</div>
            <div class="section-card border-rubrica"><div class="section-title text-rubrica" style="color:#8e44ad;"><i class="bi bi-ui-radios-grid"></i> 8. Secuencia de Selección Múltiple</div>{c.get("evaluacion_multiple_choice", "")}</div>
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-journal-bookmark"></i> 9. Bibliografía Oficial</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            <div class="section-card shadow-sm border-0 bg-light"><div class="section-title text-dark"><i class="bi bi-clock-history"></i> Cronograma de la Sesión</div><div class="table-responsive">{c.get("cronograma", "")}</div></div>
            """
        else:
            clase_content = f"""
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]}: {c["titulo"]}</h1>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4 d-block" style="width: fit-content; margin: 0 auto;"><i class="bi bi-tags"></i> Modalidad de Cursada: {tipo_actual}</span>
            
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-journal-bookmark-fill"></i> 1. Desarrollo Teórico y Conceptual</div>{c.get("definiciones", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-newspaper"></i> 2. Análisis Crítico y Casos</div>{c.get("casos", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-sliders2"></i> 3. Evaluaciones y Comparativas</div><div class="table-responsive">{c.get("comparaciones", "")}</div></div>
            <div class="section-card border-ej"><div class="section-title text-ej"><i class="bi bi-pencil-square"></i> 4. Ejercitario Oficial</div><p class="fw-bold bg-light p-3 border rounded">Consigna: {c.get("ejercitario", "")}</p></div>
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-book"></i> 5. Bibliografía Académica</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            """
            
        with open(os.path.join(html_dir, f"clase_{c['id']:02d}.html"), "w", encoding="utf-8") as f:
            f.write(template_html.format(titulo_pagina=f"Clase {c['id']}", menu_links=menu_links, contenido_principal=clase_content, scripts_marcadores=script_clase))

# Generar para ambos grupos
generar_html_por_grupo('Materiales_HTML_Sabados', modalidades_sabados)
generar_html_por_grupo('Materiales_HTML_LunesViernes', modalidades_lunes_viernes)

print("Archivos HTML reconstruidos exitosamente con Asistencia y Progreso Integrados.")
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(base_code + new_func)

print("Script actualizado.")
