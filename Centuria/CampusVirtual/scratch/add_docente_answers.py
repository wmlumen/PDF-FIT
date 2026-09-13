import os
import re

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Modify the existing Panel Docente in the `if` branch to include the answer key div
old_docente = '''<div class="section-title text-secondary"><i class="bi bi-clock-history"></i> Cronograma de la Sesión (Oculto para Alumnos)</div>
                        <div class="table-responsive">{c.get("cronograma", "")}</div>
                    </div>'''

new_docente = '''<div class="section-title text-secondary"><i class="bi bi-clock-history"></i> Cronograma de la Sesión (Oculto para Alumnos)</div>
                        <div class="table-responsive">{c.get("cronograma", "")}</div>
                        <hr>
                        <h5 class="text-secondary"><i class="bi bi-key-fill"></i> Clave de Respuestas (Autoevaluación)</h5>
                        <div id="docente-respuestas-{c['id']}" class="fs-6 text-dark mt-3"></div>
                    </div>'''

content = content.replace(old_docente, new_docente)

# 2. Add the Panel Docente to the `else` branch
old_else_end = '''<div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-book"></i> 5. Bibliografía Académica</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            '''

new_else_end = '''<div class="section-card border-bib mb-4"><div class="section-title text-bib"><i class="bi bi-book"></i> 5. Bibliografía Académica</div><p><em>{c.get("bibliografia", "")}</em></p></div>
            <div class="mt-5 pt-3 border-top">
                <div class="text-end mb-3">
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDocente-{c['id']}" aria-expanded="false" aria-controls="collapseDocente-{c['id']}">
                        <i class="bi bi-lock-fill"></i> Panel Docente
                    </button>
                </div>
                <div class="collapse" id="collapseDocente-{c['id']}">
                    <div class="section-card shadow-sm border-0 bg-light border-start border-4 border-secondary">
                        <h5 class="text-secondary"><i class="bi bi-key-fill"></i> Clave de Respuestas (Autoevaluación)</h5>
                        <div id="docente-respuestas-{c['id']}" class="fs-6 text-dark mt-3"></div>
                    </div>
                </div>
            </div>
            '''

if old_else_end in content:
    content = content.replace(old_else_end, new_else_end)

# 3. Add the Javascript to populate the answers.
# We can just append it before the </script> tag in quiz_js_str
old_script_end = '''    function resetQuiz(id) {
        document.getElementById('quiz-finish-' + id).style.display = 'none';
        startQuiz(id);
    }
</script>'''

new_script_end = '''    function resetQuiz(id) {
        document.getElementById('quiz-finish-' + id).style.display = 'none';
        startQuiz(id);
    }

    // Generar clave de respuestas para el Panel Docente
    window.addEventListener('DOMContentLoaded', () => {
        let answerHtml = '<ul class="list-group">';
        questions_{c['id']}.forEach((q, idx) => {
            let correctAnswer = q.options ? q.options[q.correct] : q.a;
            answerHtml += `<li class="list-group-item"><strong>P${idx+1}:</strong> ${correctAnswer}</li>`;
        });
        answerHtml += '</ul>';
        let ansDiv = document.getElementById('docente-respuestas-{c['id']}');
        if (ansDiv) ansDiv.innerHTML = answerHtml;
    });
</script>'''

# Replace carefully
content = content.replace(old_script_end, new_script_end)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Docente answers script successfully added.")
