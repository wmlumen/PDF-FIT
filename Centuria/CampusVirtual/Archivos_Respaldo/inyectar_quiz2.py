import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The string to replace is the hardcoded HTML for Evaluacion Multiple Choice
old_evaluacion = """<div class="section-card border-rubrica"><div class="section-title text-rubrica" style="color:#8e44ad;"><i class="bi bi-ui-radios-grid"></i> 8. Secuencia de Selección Múltiple</div>{c.get("evaluacion_multiple_choice", "")}</div>"""

new_evaluacion = """<div class="section-card border-rubrica">
    <div class="section-title text-rubrica" style="color:#8e44ad;"><i class="bi bi-controller"></i> 8. Autoevaluación Secuencial</div>
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
</div>"""

if old_evaluacion in content:
    content = content.replace(old_evaluacion, new_evaluacion)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Script modified successfully for Evaluacion.")
else:
    print("Could not find the evaluacion target string.")
