import os

filepath = 'Portal_TIC_Final/generar_htmls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_cronograma = '<div class="section-card shadow-sm border-0 bg-light"><div class="section-title text-dark"><i class="bi bi-clock-history"></i> Cronograma de la Sesión</div><div class="table-responsive">{c.get("cronograma", "")}</div></div>'

new_cronograma = '''<div class="mt-5 pt-3 border-top">
                <div class="text-end mb-3">
                    <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDocente-{c['id']}" aria-expanded="false" aria-controls="collapseDocente-{c['id']}">
                        <i class="bi bi-lock-fill"></i> Panel Docente: Mostrar Cronograma
                    </button>
                </div>
                <div class="collapse" id="collapseDocente-{c['id']}">
                    <div class="section-card shadow-sm border-0 bg-light border-start border-4 border-secondary">
                        <div class="section-title text-secondary"><i class="bi bi-clock-history"></i> Cronograma de la Sesión (Oculto para Alumnos)</div>
                        <div class="table-responsive">{c.get("cronograma", "")}</div>
                    </div>
                </div>
            </div>'''

if old_cronograma in content:
    content = content.replace(old_cronograma, new_cronograma)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Cronograma successfully hidden.")
else:
    print("Could not find old_cronograma string.")
