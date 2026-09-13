import os
import sys

# We need to extract 'clases' from generar_htmls.py safely
with open('generar_htmls.py', 'r', encoding='utf-8') as f:
    content = f.read()

# We can execute the content up to the template_html definition to get the 'clases' variable
exec_context = {}
exec(content.split("template_html = ")[0], globals(), exec_context)

clases = exec_context['clases']

html_dir = 'Materiales_HTML'
if not os.path.exists(html_dir):
    os.makedirs(html_dir)

template_html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{titulo_pagina} - TIC Centuria</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <style>
        body { background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.7; }
        body.locked { overflow: hidden; }
        #login-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: #1e2b3c; z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .login-box { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 400px; width: 90%; }
        .sidebar { background-color: #1e2b3c; min-height: 100vh; color: white; padding-top: 20px; }
        .sidebar h5 { color: #ecf0f1; font-weight: bold; border-bottom: 1px solid #34495e; padding-bottom: 15px; margin-bottom: 0; text-align: center; }
        .sidebar a { color: #bdc3c7; text-decoration: none; display: block; padding: 12px 20px; border-bottom: 1px solid #2c3e50; transition: 0.2s; }
        .sidebar a:hover, .sidebar a.active { background-color: #2c3e50; color: white; padding-left: 25px; border-left: 4px solid #3498db; }
        .content { padding: 50px 8%; background-color: white; }
        h1.page-title { color: #2c3e50; font-weight: 800; border-bottom: 4px solid #3498db; padding-bottom: 10px; margin-bottom: 30px; font-size: 2.2rem; }
        
        .section-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 25px; margin-bottom: 35px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border-left: 5px solid; }
        .border-def { border-left-color: #3498db; }
        .border-casos { border-left-color: #e74c3c; }
        .border-comp { border-left-color: #9b59b6; }
        .border-ej { border-left-color: #f1c40f; }
        .border-bib { border-left-color: #2ecc71; }
        .border-plan { border-left-color: #e67e22; }
        .border-rubrica { border-left-color: #34495e; }
        
        .section-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .text-def { color: #2980b9; }
        .text-casos { color: #c0392b; }
        .text-comp { color: #8e44ad; }
        .text-ej { color: #f39c12; }
        .text-bib { color: #27ae60; }
        .text-plan { color: #d35400; }
        .text-rubrica { color: #2c3e50; }
        
        table { font-size: 1.1rem; }
        p { font-size: 1.15rem; color: #444; text-align: justify; margin-bottom: 15px; }
        
        .badge-presencial { background-color: #e74c3c; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }
        .badge-virtual { background-color: #2980b9; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }
        .badge-asincronica { background-color: #27ae60; font-size: 1rem; padding: 8px 12px; margin-bottom: 25px; display: inline-block; }
        
        .toc-item { font-size: 1.1rem; font-weight: 500; margin-bottom: 10px; }
    </style>
</head>
<body class="locked">
    <div id="login-mask">
        <div class="login-box">
            <h3 class="mb-3 text-dark"><i class="bi bi-shield-lock-fill text-primary"></i> Portal Académico</h3>
            <p class="text-muted mb-4">Material Didáctico Extenso - T.I.C.</p>
            <input type="password" id="pass-input" class="form-control mb-3" placeholder="Contraseña de acceso">
            <button id="btn-login" class="btn btn-primary w-100 fw-bold">Ingresar</button>
            <p id="login-error" class="text-danger mt-3 mb-0" style="display:none; font-weight: bold;">Contraseña incorrecta.</p>
        </div>
    </div>
    <div class="container-fluid">
        <div class="row">
            <nav class="col-md-3 col-lg-2 sidebar px-0 fixed-top" style="position: sticky; top: 0; max-height: 100vh; overflow-y: auto;">
                <h5>CENTURIA ADE18</h5>
                <a href="index.html"><i class="bi bi-house-door me-2"></i>Inicio - Programa</a>
                <a href="cronograma.html"><i class="bi bi-calendar3 me-2"></i>Cronograma Fechas</a>
                <a href="Clases_Completas.html" class="active" style="background-color: #2c3e50; color: white; padding-left: 25px; border-left: 4px solid #3498db;"><i class="bi bi-collection-fill me-2"></i>TODAS LAS CLASES</a>
                {menu_links}
            </nav>
            <main class="col-md-9 col-lg-10 content">
                {contenido_principal}
            </main>
        </div>
    </div>
    <script>
        document.addEventListener("DOMContentLoaded", function() {{
            const mask = document.getElementById('login-mask');
            const passInput = document.getElementById('pass-input');
            const btnLogin = document.getElementById('btn-login');
            const errorMsg = document.getElementById('login-error');
            const PASSWORD_CORRECTA = 'Centuria2026';
            if(sessionStorage.getItem('auth_tic') === 'true') {{ mask.style.display = 'none'; document.body.classList.remove('locked'); }}
            function checkPassword() {{
                if(passInput.value === PASSWORD_CORRECTA) {{ sessionStorage.setItem('auth_tic', 'true'); mask.style.display = 'none'; document.body.classList.remove('locked'); }} 
                else {{ errorMsg.style.display = 'block'; passInput.classList.add('is-invalid'); }}
            }}
            btnLogin.addEventListener('click', checkPassword);
            passInput.addEventListener('keypress', function(e) {{ if(e.key === 'Enter') checkPassword(); }});
        }});
    </script>
</body>
</html>"""

menu_links = ""
for c in clases:
    menu_links += f'<a href="#clase_{c["id"]}" style="font-size: 0.85em; padding-left: 25px;">- Clase {c["id"]}</a>\n'

todas_las_clases_html = """
<h1 class="page-title text-center mb-5" style="border-bottom: none;"><i class="bi bi-collection-fill text-primary"></i> Manual Completo de Todas las Clases y Unidades</h1>
<div class="alert alert-info shadow-sm mb-5">
    <i class="bi bi-info-circle-fill me-2"></i> Este documento integra <strong>todas las clases y unidades</strong> en un solo lugar. Incluye planificación de 4 horas, lectura extensa, cuadros comparativos, casos, preguntas disparadoras, ejercitario y rúbrica para cada unidad.
</div>
"""

for c in clases:
    badge_class = f"badge-{c['tipo'].lower()}"
    
    planificacion = f"""
    <ul class="list-group list-group-flush fs-6">
        <li class="list-group-item"><strong>Hora 1:</strong> Introducción teórica y revisión de lectura extensa ({c['titulo']}).</li>
        <li class="list-group-item"><strong>Hora 2:</strong> Análisis profundo y debate de Casos Clínicos/Noticiosos reales.</li>
        <li class="list-group-item"><strong>Hora 3:</strong> Cuadros comparativos, evaluación de ventajas/desventajas y ejercicios prácticos.</li>
        <li class="list-group-item"><strong>Hora 4:</strong> Preguntas disparadoras, resolución del ejercitario oficial y retroalimentación basada en rúbrica.</li>
    </ul>
    """
    
    rubrica = """
    <table class="table table-bordered table-sm mt-3">
        <thead class="table-dark"><tr><th>Criterio</th><th>Excelente (5)</th><th>Bueno (3)</th><th>Requiere Mejora (1)</th></tr></thead>
        <tbody>
            <tr><td><strong>Comprensión Teórica</strong></td><td>Domina completamente los conceptos.</td><td>Comprende parcialmente.</td><td>Confusión en conceptos clave.</td></tr>
            <tr><td><strong>Análisis Crítico (Casos)</strong></td><td>Vincula teoría y práctica de forma brillante.</td><td>Análisis superficial.</td><td>No logra relacionar el caso.</td></tr>
            <tr><td><strong>Resolución del Ejercitario</strong></td><td>Respuestas fundamentadas con bibliografía.</td><td>Respuestas correctas pero breves.</td><td>Respuestas incompletas.</td></tr>
        </tbody>
    </table>
    """

    if 'resultados_aprendizaje' in c:
        clase_content = f"""
        <div id="clase_{c['id']}" style="padding-top: 80px; margin-top: -80px;"></div>
        <hr class="my-5 border-4 border-primary opacity-25">
        
        <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]} — {c["titulo"]}</h1>
        <div class="alert alert-secondary fs-5 text-center"><em>"{c.get('pregunta_central', '')}"</em></div>
        <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4"><i class="bi bi-tags"></i> Modalidad: {c["tipo"]}</span>
        
        <div class="section-card border-def">
            <div class="section-title text-def"><i class="bi bi-bullseye"></i> 1. Resultados de Aprendizaje</div>
            {c["resultados_aprendizaje"]}
        </div>
        
        <div class="section-card border-casos">
            <div class="section-title text-casos"><i class="bi bi-exclamation-triangle-fill"></i> 2. Situación Problemática Inicial</div>
            {c["situacion_problematica"]}
        </div>
        
        <div class="section-card border-ej">
            <div class="section-title text-ej"><i class="bi bi-question-circle"></i> 3. Actividad Diagnóstica</div>
            {c["actividad_diagnostica"]}
        </div>

        <div class="section-card border-comp">
            <div class="section-title text-comp"><i class="bi bi-book"></i> 4. Desarrollo Teórico</div>
            {c.get("teoria_1", "")}
            <hr class="my-4">
            {c.get("actividad_1", "")}
            <hr class="my-4">
            {c.get("teoria_2", "")}
            <hr class="my-4">
            {c.get("teoria_3", "")}
        </div>

        <div class="section-card border-plan">
            <div class="section-title text-plan" style="color:#d35400;"><i class="bi bi-briefcase"></i> 5. Actividad Práctica Real</div>
            {c.get("caso_practico", "")}
        </div>

        <div class="section-card border-rubrica">
            <div class="section-title text-rubrica" style="color:#2c3e50;"><i class="bi bi-diagram-3"></i> 6. Mini Laboratorio / DFD</div>
            {c.get("taller_dfd", "")}
        </div>
        
        <div class="section-card border-bib mb-5">
            <div class="section-title text-bib"><i class="bi bi-check-circle"></i> 7. Evaluación Formativa y Cierre</div>
            {c.get("evaluacion_cierre", "")}
        </div>
        
        <div class="section-card border-rubrica">
            <div class="section-title text-rubrica"><i class="bi bi-ui-checks"></i> 8. Rúbrica de Evaluación</div>
            <div class="table-responsive">
                {rubrica}
            </div>
        </div>

        <div class="section-card border-rubrica mb-5">
            <div class="section-title text-rubrica" style="color:#8e44ad;"><i class="bi bi-ui-radios-grid"></i> 9. Secuencia de Selección Múltiple</div>
            {c.get("evaluacion_multiple_choice", "")}
        </div>

        <div class="section-card border-bib mb-5">
            <div class="section-title text-bib"><i class="bi bi-journal-bookmark"></i> 10. Bibliografía Oficial</div>
            <p class="mb-0"><em>{c["bibliografia"]}</em></p>
        </div>
        
        <div class="section-card shadow-sm border-0 bg-light">
            <div class="section-title text-dark"><i class="bi bi-clock-history"></i> Cronograma de la Sesión (180 min)</div>
            <div class="table-responsive">
                {c.get("cronograma", "")}
            </div>
        </div>
        """
    else:
        clase_content = f"""
        <div id="clase_{c['id']}" style="padding-top: 80px; margin-top: -80px;"></div>
        <hr class="my-5 border-4 border-primary opacity-25">
        
        <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]}: {c["titulo"]}</h1>
        <span class="badge {badge_class} text-white shadow-sm rounded-pill"><i class="bi bi-tags"></i> Modalidad: {c["tipo"]}</span>
        
        <div class="section-card border-plan">
            <div class="section-title text-plan"><i class="bi bi-clock-history"></i> Planificación Académica (4 Horas)</div>
            {planificacion}
        </div>

        <div class="section-card border-def">
            <div class="section-title text-def"><i class="bi bi-journal-bookmark-fill"></i> 1. Desarrollo Teórico y Conceptual (Lectura Extensa)</div>
            {c["definiciones"]}
        </div>
        
        <div class="section-card border-casos">
            <div class="section-title text-casos"><i class="bi bi-newspaper"></i> 2. Análisis Crítico y Estudio de Casos</div>
            {c["casos"]}
        </div>
        
        <div class="section-card border-comp">
            <div class="section-title text-comp"><i class="bi bi-sliders2"></i> 3. Evaluaciones y Cuadros Comparativos</div>
            <div class="table-responsive">
                {c["comparaciones"]}
            </div>
        </div>
        
        <div class="section-card border-ej">
            <div class="section-title text-ej"><i class="bi bi-pencil-square"></i> 4. Ejercitario Oficial y Preguntas Disparadoras</div>
            <p class="mb-0 fw-bold bg-light p-3 border rounded">Consigna Obligatoria: {c["ejercitario"]}</p>
        </div>
        
        <div class="section-card border-rubrica">
            <div class="section-title text-rubrica"><i class="bi bi-ui-checks"></i> 5. Rúbrica de Evaluación</div>
            <div class="table-responsive">
                {rubrica}
            </div>
        </div>

        <div class="section-card border-bib mb-5">
            <div class="section-title text-bib"><i class="bi bi-book"></i> 6. Fuentes y Bibliografía Académica</div>
            <p class="mb-0"><em>{c["bibliografia"]}</em></p>
        </div>
        """
    todas_las_clases_html += clase_content

with open(os.path.join(html_dir, "Clases_Completas.html"), "w", encoding="utf-8") as f:
    f.write(template_html.replace("{titulo_pagina}", "Manual Integral de Clases").replace("{menu_links}", menu_links).replace("{contenido_principal}", todas_las_clases_html))

print("¡Archivo unificado 'Clases_Completas.html' generado exitosamente!")
