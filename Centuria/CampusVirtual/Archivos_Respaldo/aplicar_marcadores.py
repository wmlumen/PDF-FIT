import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update template_html
content = content.replace("    </script>\n</body>", "    </script>\n    {scripts_marcadores}\n</body>")

# 2. Update function generar_html_por_grupo
old_func = """def generar_html_por_grupo(directorio_grupo, modalidades_grupo):
    html_dir = directorio_grupo
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)

    menu_links = ""
    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        menu_links += f'<a href="clase_{c["id"]:02d}.html">Clase {c["id"]} ({tipo_actual})</a>\\n'"""

new_func = """def generar_html_por_grupo(directorio_grupo, modalidades_grupo):
    html_dir = directorio_grupo
    if not os.path.exists(html_dir):
        os.makedirs(html_dir)
        
    grupo_js = os.path.basename(directorio_grupo)

    menu_links = ""
    for c in clases:
        tipo_actual = modalidades_grupo.get(c['id'], c.get('tipo', 'Presencial'))
        menu_links += f'<a href="clase_{c["id"]:02d}.html" class="menu-clase" data-clase="{c["id"]}">Clase {c["id"]} ({tipo_actual})</a>\\n'

    script_base = f'''
    <script>
        const current_grupo = '{grupo_js}';
        document.addEventListener("DOMContentLoaded", function() {{
            document.querySelectorAll('.menu-clase').forEach(link => {{
                let clId = link.getAttribute('data-clase');
                let state = localStorage.getItem('tic_progress_' + current_grupo + '_clase_' + clId);
                if (state === 'finished') {{
                    link.classList.add('text-success', 'fw-bold');
                    link.innerHTML += ' <i class="bi bi-check-circle-fill float-end"></i>';
                }} else if (state) {{
                    link.classList.add('text-warning', 'fw-bold');
                    link.innerHTML += ' <i class="bi bi-bookmark-fill float-end"></i>';
                }}
            }});
        }});
    </script>
    '''"""

content = content.replace(old_func, new_func)

# 3. Update index formatting
old_index_write = """    with open(os.path.join(html_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Programa ADE18", menu_links=menu_links, contenido_principal=index_content))"""

new_index_write = """    with open(os.path.join(html_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Programa ADE18", menu_links=menu_links, contenido_principal=index_content, scripts_marcadores=script_base))"""

content = content.replace(old_index_write, new_index_write)

# 4. Update class formatting
old_clase_write = """        with open(os.path.join(html_dir, f"clase_{c['id']:02d}.html"), "w", encoding="utf-8") as f:
            f.write(template_html.format(titulo_pagina=f"Clase {c['id']}", menu_links=menu_links, contenido_principal=clase_content))"""

new_clase_write = """        script_clase = script_base + f'''
        <script>
            document.addEventListener("DOMContentLoaded", function() {{
                const current_clase = {c["id"]};
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
                            localStorage.setItem('tic_progress_' + current_grupo + '_clase_' + current_clase, secId);
                            alert("Marcador de progreso guardado.");
                            location.reload();
                        }};
                        title.appendChild(btn);
                    }}
                }});

                let mainContent = document.querySelector('.content');
                let finishBtn = document.createElement('button');
                finishBtn.className = 'btn btn-success btn-lg mt-4 mb-5 w-100 shadow';
                finishBtn.innerHTML = '<i class="bi bi-check-all fs-4"></i> Marcar Clase como Terminada';
                finishBtn.onclick = function() {{
                    localStorage.setItem('tic_progress_' + current_grupo + '_clase_' + current_clase, 'finished');
                    location.reload();
                }};
                mainContent.appendChild(finishBtn);

                let savedState = localStorage.getItem('tic_progress_' + current_grupo + '_clase_' + current_clase);
                if (savedState === 'finished') {{
                    let badge = document.createElement('div');
                    badge.className = 'alert alert-success text-center fw-bold shadow-sm';
                    badge.innerHTML = '<i class="bi bi-check-circle-fill fs-4"></i> Esta clase está marcada como TERMINADA.';
                    mainContent.insertBefore(badge, mainContent.firstChild);
                }} else if (savedState && savedState.startsWith('sec-')) {{
                    let target = document.getElementById(savedState);
                    if (target) {{
                        target.style.border = '3px dashed #f39c12';
                        target.style.backgroundColor = '#fffcf5';
                        let markAlert = document.createElement('div');
                        markAlert.className = 'alert alert-warning mb-3 fw-bold';
                        markAlert.innerHTML = '<i class="bi bi-bookmark-fill"></i> Marcador activo: La clase se desarrolló hasta aquí.';
                        target.insertBefore(markAlert, target.firstChild);
                        setTimeout(() => {{
                            target.scrollIntoView({{ behavior: 'smooth', block: 'center' }});
                        }}, 500);
                    }}
                }}
            }});
        </script>
        '''
        with open(os.path.join(html_dir, f"clase_{c['id']:02d}.html"), "w", encoding="utf-8") as f:
            f.write(template_html.format(titulo_pagina=f"Clase {c['id']}", menu_links=menu_links, contenido_principal=clase_content, scripts_marcadores=script_clase))"""

content = content.replace(old_clase_write, new_clase_write)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modificaciones realizadas a generar_htmls.py")
