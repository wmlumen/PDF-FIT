import os

filepath = 'Portal_TIC_Final/generar_htmls.py'
content = open(filepath, 'r', encoding='utf-8').read()

quiz_js_str = """<div class="section-card border-ej">
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
                q: "Pensamiento crítico: Una empresa afirma: ‘Nuestra organización está completamente digitalizada porque todos los empleados utilizan computadoras.’ ¿Cuál es la respuesta técnicamente más apropiada?",
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

content = content.replace('{quiz_js}', quiz_js_str)
open(filepath, 'w', encoding='utf-8').write(content)
