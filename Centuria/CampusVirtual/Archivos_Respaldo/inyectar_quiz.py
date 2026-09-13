import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The string to replace is the hardcoded HTML for Ejercitario
old_ejercitario = """<div class="section-card border-ej"><div class="section-title text-ej"><i class="bi bi-pencil-square"></i> 4. Ejercitario Oficial</div><p class="fw-bold bg-light p-3 border rounded">Consigna: {c.get("ejercitario", "")}</p></div>"""

# The new HTML structure includes a JS script and container for the interactive sequence
new_ejercitario = """<div class="section-card border-ej">
    <div class="section-title text-ej"><i class="bi bi-controller"></i> 4. Autoevaluación Secuencial</div>
    <p class="text-muted"><i class="bi bi-info-circle"></i> <em>Este ejercicio de conocimiento no es calificable. Las preguntas aparecerán a medida que vayas avanzando para medir tu propio aprendizaje.</em></p>
    
    <div id="quiz-container-{c['id']}" class="bg-light p-4 border rounded shadow-sm">
        <div id="quiz-intro-{c['id']}" class="text-center">
            <h4 class="text-dark">¿Listo para repasar los conceptos?</h4>
            <button class="btn btn-warning btn-lg mt-3 fw-bold shadow-sm" onclick="startQuiz({c['id']})"><i class="bi bi-play-circle-fill"></i> Comenzar Secuencia</button>
        </div>
        
        <div id="quiz-question-{c['id']}" style="display:none;" class="text-center">
            <span class="badge bg-secondary mb-3 fs-6" id="quiz-progress-{c['id']}">Pregunta 1 de 3</span>
            <h4 id="quiz-text-{c['id']}" class="text-primary fw-bold mb-4" style="line-height: 1.5;"></h4>
            
            <button id="btn-reveal-{c['id']}" class="btn btn-outline-primary fw-bold" onclick="revealAnswer({c['id']})"><i class="bi bi-eye"></i> Revelar Concepto Clave</button>
            
            <div id="quiz-answer-box-{c['id']}" class="alert alert-success mt-4 fs-5 shadow-sm" style="display:none; text-align: left;">
                <i class="bi bi-check-circle-fill text-success"></i> <span id="quiz-answer-{c['id']}"></span>
            </div>
            
            <button id="btn-next-{c['id']}" class="btn btn-success mt-4 fw-bold w-100" style="display:none;" onclick="nextQuestion({c['id']})">Siguiente Pregunta <i class="bi bi-arrow-right-circle"></i></button>
        </div>
        
        <div id="quiz-finish-{c['id']}" style="display:none;" class="text-center">
            <i class="bi bi-award-fill text-warning" style="font-size: 4rem;"></i>
            <h3 class="mt-3 text-dark">¡Secuencia Completada!</h3>
            <p class="fs-5">Excelente trabajo repasando los conceptos de la clase.</p>
            <button class="btn btn-outline-secondary mt-2" onclick="resetQuiz({c['id']})"><i class="bi bi-arrow-counterclockwise"></i> Repasar de nuevo</button>
        </div>
    </div>
</div>

<script>
    const questions_{c['id']} = [
        {{ q: "¿Cuál es el propósito principal de los conceptos analizados en esta unidad para una organización?", a: "Permiten optimizar recursos, mejorar la toma de decisiones y alinear la tecnología con los objetivos estratégicos del negocio." }},
        {{ q: "Si tuvieras que aplicar esto en tu futuro rol como Administrador, ¿cuál sería el primer paso?", a: "Identificar las necesidades de información de la empresa y evaluar qué tecnología o proceso existente puede cubrir esa brecha de manera eficiente." }},
        {{ q: "¿Por qué crees que este tema es una ventaja competitiva en el mercado actual?", a: "Porque automatiza procesos críticos, reduce costos operativos y permite innovar en la manera de entregar valor a los clientes." }}
    ];
    let currentQ_{c['id']} = 0;

    function startQuiz(id) {{
        document.getElementById('quiz-intro-' + id).style.display = 'none';
        document.getElementById('quiz-question-' + id).style.display = 'block';
        currentQ_{c['id']} = 0;
        loadQuestion(id);
    }}

    function loadQuestion(id) {{
        document.getElementById('quiz-progress-' + id).innerText = "Paso " + (currentQ_{c['id']} + 1) + " de " + questions_{c['id']}.length;
        document.getElementById('quiz-text-' + id).innerText = questions_{c['id']}[currentQ_{c['id']}].q;
        document.getElementById('quiz-answer-' + id).innerText = questions_{c['id']}[currentQ_{c['id']}].a;
        
        document.getElementById('quiz-answer-box-' + id).style.display = 'none';
        document.getElementById('btn-next-' + id).style.display = 'none';
        document.getElementById('btn-reveal-' + id).style.display = 'inline-block';
    }}

    function revealAnswer(id) {{
        document.getElementById('btn-reveal-' + id).style.display = 'none';
        document.getElementById('quiz-answer-box-' + id).style.display = 'block';
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

# Replace in string
if old_ejercitario in content:
    content = content.replace(old_ejercitario, new_ejercitario)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Script modified successfully.")
else:
    print("Could not find the target string in generar_htmls.py")
