import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find where `if 'resultados_aprendizaje' in c:` starts and just replace everything after it.
start_idx = content.find("if 'resultados_aprendizaje' in c:")
if start_idx == -1:
    print("Cannot find if resultados_aprendizaje")
    exit(1)

base_code = content[:start_idx]

quiz_js = """<div class="section-card border-ej">
    <div class="section-title text-ej"><i class="bi bi-controller"></i> Autoevaluación Secuencial Interactiva</div>
    <p class="text-muted"><i class="bi bi-info-circle"></i> <em>Este ejercicio de conocimiento no es calificable. Las preguntas aparecerán a medida que vayas avanzando para que evalúes tu propia comprensión de los temas de la unidad.</em></p>
    
    <div id="quiz-container-{c['id']}" class="bg-light p-4 border rounded shadow-sm">
        <div id="quiz-intro-{c['id']}" class="text-center">
            <h4 class="text-dark mb-4">¿Listo para repasar los conceptos clave?</h4>
            <button class="btn btn-warning btn-lg fw-bold shadow-sm" onclick="startQuiz({c['id']})"><i class="bi bi-play-circle-fill"></i> Comenzar Secuencia de Repaso</button>
        </div>
        
        <div id="quiz-question-{c['id']}" style="display:none;" class="text-center">
            <span class="badge bg-secondary mb-3 fs-6" id="quiz-progress-{c['id']}">Pregunta 1 de 3</span>
            <h4 id="quiz-text-{c['id']}" class="text-primary fw-bold mb-4" style="line-height: 1.5;"></h4>
            
            <div id="quiz-options-{c['id']}" class="d-flex flex-column gap-2 text-start mb-4" style="display:none;"></div>
            
            <button id="btn-reveal-{c['id']}" class="btn btn-outline-primary fw-bold mb-3" onclick="revealAnswer({c['id']})"><i class="bi bi-eye"></i> Revelar Concepto Clave</button>
            
            <div id="quiz-answer-box-{c['id']}" class="alert alert-success fs-5 shadow-sm" style="display:none; text-align: left;">
                <i class="bi bi-check-circle-fill text-success"></i> <span id="quiz-answer-{c['id']}"></span>
            </div>
            
            <button id="btn-next-{c['id']}" class="btn btn-success mt-2 fw-bold w-100 py-2 fs-5 shadow-sm" style="display:none;" onclick="nextQuestion({c['id']})">Siguiente Pregunta <i class="bi bi-arrow-right-circle"></i></button>
        </div>
        
        <div id="quiz-finish-{c['id']}" style="display:none;" class="text-center">
            <i class="bi bi-award-fill text-warning" style="font-size: 5rem;"></i>
            <h2 class="mt-3 text-dark fw-bold">¡Secuencia Completada!</h2>
            <p class="fs-5 text-muted">Excelente trabajo repasando y fijando los conocimientos.</p>
            <button class="btn btn-outline-secondary mt-3 fw-bold" onclick="resetQuiz({c['id']})"><i class="bi bi-arrow-counterclockwise"></i> Repasar de nuevo</button>
        </div>
    </div>
</div>

<script>
    let questions_{c['id']} = [];
    if ({c['id']} === 1) {{
        questions_{c['id']} = [
            {{
                q: "Dato e información: Una tienda registró las siguientes ventas diarias: 45 – 52 – 61 – 73 – 85 unidades. ¿Cuál de las siguientes opciones representa información y no simplemente datos?",
                options: [
                    "A. 45, 52, 61, 73 y 85.",
                    "B. Los números fueron registrados durante cinco días.",
                    "C. Las ventas aumentaron progresivamente durante los cinco días analizados.",
                    "D. Los valores están almacenados en una computadora."
                ],
                correct: 2
            }},
            {{
                q: "Concepto de sistema: ¿Cuál de las siguientes opciones describe mejor un sistema?",
                options: [
                    "A. Un conjunto de computadoras conectadas a Internet.",
                    "B. Un conjunto de elementos relacionados que interactúan para alcanzar un objetivo.",
                    "C. Una colección de datos almacenados.",
                    "D. Un programa utilizado por una empresa."
                ],
                correct: 1
            }},
            {{
                q: "Sistema de Información: Una empresa posee computadoras modernas, pero cada departamento registra sus datos independientemente y no existen procedimientos para compartirlos. ¿Cuál es la conclusión más apropiada?",
                options: [
                    "A. Poseer computadoras garantiza automáticamente un buen Sistema de Información.",
                    "B. El hardware es suficiente para administrar la información empresarial.",
                    "C. La tecnología por sí sola no garantiza un Sistema de Información eficiente.",
                    "D. La empresa solamente necesita una conexión más rápida a Internet."
                ],
                correct: 2
            }},
            {{
                q: "Componentes de un SI: ¿Cuál de los siguientes elementos NO corresponde por sí solo a un componente tecnológico suficiente para constituir un Sistema de Información completo?",
                options: [
                    "A. Personas.",
                    "B. Datos.",
                    "C. Procedimientos.",
                    "D. Una computadora aislada."
                ],
                correct: 3
            }},
            {{
                q: "Entrada – proceso – salida: En un supermercado, el cajero escanea los productos, el sistema calcula el total y posteriormente imprime el comprobante. ¿Cuál es la salida del proceso?",
                options: [
                    "A. Los códigos de los productos escaneados.",
                    "B. El cálculo realizado por el sistema.",
                    "C. El comprobante generado.",
                    "D. El lector de código de barras."
                ],
                correct: 2
            }},
            {{
                q: "Sistema TPS: Un sistema registra automáticamente cada venta realizada en las cajas de un supermercado. Este sistema corresponde principalmente a:",
                options: [
                    "A. TPS — Sistema de Procesamiento de Transacciones.",
                    "B. DSS — Sistema de Apoyo a las Decisiones.",
                    "C. EIS — Sistema de Información Ejecutiva.",
                    "D. MIS — Sistema de Información Gerencial."
                ],
                correct: 0
            }},
            {{
                q: "Sistema MIS: El gerente recibe cada lunes un informe que muestra ventas totales, ventas por sucursal, productos más vendidos y comparación con la semana anterior. ¿Qué tipo de sistema está utilizando principalmente?",
                options: [
                    "A. TPS.",
                    "B. MIS.",
                    "C. DSS.",
                    "D. EIS."
                ],
                correct: 1
            }},
            {{
                q: "Sistema DSS: Una empresa desea abrir una nueva sucursal. El sistema permite modificar variables como alquiler, cantidad de clientes, costos, ubicación y ventas proyectadas para comparar diferentes escenarios. Corresponde principalmente a:",
                options: [
                    "A. TPS.",
                    "B. MIS.",
                    "C. DSS.",
                    "D. Sistema operativo."
                ],
                correct: 2
            }},
            {{
                q: "Análisis de una situación: Una universidad registra información de estudiantes en diferentes hojas de cálculo. Algunos alumnos aparecen duplicados y existen diferencias entre los datos manejados por Secretaría y Administración. ¿Cuál es el principal problema?",
                options: [
                    "A. Falta de computadoras.",
                    "B. Exceso de estudiantes.",
                    "C. Falta de integración y consistencia de los datos.",
                    "D. Falta de impresoras."
                ],
                correct: 2
            }},
            {{
                q: "Pensamiento crítico: Una empresa afirma: “Nuestra organización está completamente digitalizada porque todos los empleados utilizan computadoras.” ¿Cuál es la respuesta técnicamente más apropiada?",
                options: [
                    "A. Es correcto, porque digitalización significa tener computadoras.",
                    "B. Es correcto siempre que las computadoras tengan Internet.",
                    "C. No necesariamente; la tecnología debe integrarse con personas, datos y procedimientos para generar información útil.",
                    "D. Es incorrecto porque las empresas no necesitan computadoras para digitalizarse."
                ],
                correct: 2
            }}
        ];
    }} else {{
        questions_{c['id']} = [
            {{ q: "¿Cuál es el propósito principal de los conceptos analizados en esta unidad para una organización?", a: "Permiten optimizar recursos, mejorar la toma de decisiones y alinear la tecnología con los objetivos estratégicos del negocio." }},
            {{ q: "Si tuvieras que aplicar esto en tu futuro rol como Administrador, ¿cuál sería el primer paso?", a: "Identificar las necesidades de información de la empresa y evaluar qué tecnología o proceso existente puede cubrir esa brecha de manera eficiente." }},
            {{ q: "¿Por qué crees que este tema es una ventaja competitiva en el mercado actual?", a: "Porque automatiza procesos críticos, reduce costos operativos y permite innovar en la manera de entregar valor a los clientes." }}
        ];
    }}

    let currentQ_{c['id']} = 0;

    function startQuiz(id) {{
        document.getElementById('quiz-intro-' + id).style.display = 'none';
        document.getElementById('quiz-question-' + id).style.display = 'block';
        currentQ_{c['id']} = 0;
        loadQuestion(id);
    }}

    function loadQuestion(id) {{
        let qData = questions_{c['id']}[currentQ_{c['id']}];
        document.getElementById('quiz-progress-' + id).innerText = "Paso " + (currentQ_{c['id']} + 1) + " de " + questions_{c['id']}.length;
        document.getElementById('quiz-text-' + id).innerText = qData.q;
        
        let optionsContainer = document.getElementById('quiz-options-' + id);
        let revealBtn = document.getElementById('btn-reveal-' + id);
        let answerBox = document.getElementById('quiz-answer-box-' + id);
        let nextBtn = document.getElementById('btn-next-' + id);
        
        answerBox.style.display = 'none';
        nextBtn.style.display = 'none';
        optionsContainer.innerHTML = '';
        
        if(qData.options) {{
            revealBtn.style.display = 'none';
            optionsContainer.style.display = 'flex';
            
            qData.options.forEach((opt, index) => {{
                let btn = document.createElement('button');
                btn.className = 'btn btn-outline-dark text-start p-3 fs-6';
                btn.innerHTML = opt;
                btn.onclick = function() {{
                    let allBtns = optionsContainer.querySelectorAll('button');
                    allBtns.forEach(b => {{ b.disabled = true; b.classList.remove('btn-outline-dark'); b.classList.add('btn-light', 'text-muted'); }});
                    
                    if(index === qData.correct) {{
                        btn.classList.remove('btn-light', 'text-muted');
                        btn.classList.add('btn-success', 'text-white', 'fw-bold');
                        btn.innerHTML += ' <i class="bi bi-check-circle-fill float-end fs-5"></i>';
                        answerBox.className = 'alert alert-success mt-4 fs-6 shadow-sm';
                        answerBox.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i> ¡Correcto! Has comprendido el concepto.';
                    }} else {{
                        btn.classList.remove('btn-light', 'text-muted');
                        btn.classList.add('btn-danger', 'text-white');
                        btn.innerHTML += ' <i class="bi bi-x-circle-fill float-end fs-5"></i>';
                        let correctBtn = allBtns[qData.correct];
                        correctBtn.classList.remove('btn-light', 'text-muted');
                        correctBtn.classList.add('btn-outline-success', 'fw-bold');
                        answerBox.className = 'alert alert-warning mt-4 fs-6 shadow-sm';
                        answerBox.innerHTML = '<i class="bi bi-info-circle-fill text-warning"></i> La respuesta correcta era la opción marcada en verde.';
                    }}
                    answerBox.style.display = 'block';
                    nextBtn.style.display = 'inline-block';
                }};
                optionsContainer.appendChild(btn);
            }});
        }} else {{
            optionsContainer.style.display = 'none';
            revealBtn.style.display = 'inline-block';
            document.getElementById('quiz-answer-' + id).innerText = qData.a;
        }}
    }}

    function revealAnswer(id) {{
        document.getElementById('btn-reveal-' + id).style.display = 'none';
        let box = document.getElementById('quiz-answer-box-' + id);
        box.className = 'alert alert-info mt-4 fs-5 shadow-sm text-start';
        box.style.display = 'block';
        document.getElementById('btn-next-' + id).style.display = 'inline-block';
    }}

    function nextQuestion(id) {{
        currentQ_{c['id']}++;
        if (currentQ_{c['id']} < questions_{c['id']}.length) {{
            loadQuestion(id);
        }} else {{
            document.getElementById('quiz-question-' + id).style.display = 'none';
            document.getElementById('quiz-finish-' + id).style.display = 'block';
        }}
    }}

    function resetQuiz(id) {{
        document.getElementById('quiz-finish-' + id).style.display = 'none';
        startQuiz(id);
    }}
</script>"""

new_code = """        if 'resultados_aprendizaje' in c:
            clase_content = f'''
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
            
            ''' + quiz_js + f'''
            
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-journal-bookmark"></i> 9. Bibliografía Oficial</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            <div class="section-card shadow-sm border-0 bg-light"><div class="section-title text-dark"><i class="bi bi-clock-history"></i> Cronograma de la Sesión</div><div class="table-responsive">{c.get("cronograma", "")}</div></div>
            '''
        else:
            clase_content = f'''
            <h1 class="page-title"><i class="bi bi-book-half text-secondary me-2"></i>Clase {c["id"]}: {c["titulo"]}</h1>
            <span class="badge {badge_class} text-white shadow-sm rounded-pill mb-4 d-block" style="width: fit-content; margin: 0 auto;"><i class="bi bi-tags"></i> Modalidad de Cursada: {tipo_actual}</span>
            
            <div class="section-card border-def"><div class="section-title text-def"><i class="bi bi-journal-bookmark-fill"></i> 1. Desarrollo Teórico y Conceptual</div>{c.get("definiciones", "")}</div>
            <div class="section-card border-casos"><div class="section-title text-casos"><i class="bi bi-newspaper"></i> 2. Análisis Crítico y Casos</div>{c.get("casos", "")}</div>
            <div class="section-card border-comp"><div class="section-title text-comp"><i class="bi bi-sliders2"></i> 3. Evaluaciones y Comparativas</div><div class="table-responsive">{c.get("comparaciones", "")}</div></div>
            
            ''' + quiz_js + f'''
            
            <div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-book"></i> 5. Bibliografía Académica</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            '''
            
        with open(os.path.join(html_dir, f"clase_{c['id']:02d}.html"), "w", encoding="utf-8") as f:
            f.write(template_html.format(titulo_pagina=f"Clase {c['id']}", menu_links=menu_links, contenido_principal=clase_content, scripts_marcadores=script_clase))

# Generar para ambos grupos
generar_html_por_grupo('Materiales_HTML_Sabados', modalidades_sabados)
generar_html_por_grupo('Materiales_HTML_LunesViernes', modalidades_lunes_viernes)

print("Archivos HTML reconstruidos exitosamente con Asistencia y Progreso Integrados.")
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(base_code + new_code)
