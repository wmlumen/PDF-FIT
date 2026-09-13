import os
import markdown
import re

base_dir = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC"
text_dir = os.path.join(base_dir, "Archivos_Respaldo", "Oficial", "Unidad")
programa_txt = os.path.join(base_dir, "Archivos_Respaldo", "Oficial", "programa.txt")
generar_py = os.path.join(base_dir, "Portal_TIC_Final", "generar_htmls.py")

# 1. Read Programa
with open(programa_txt, 'r', encoding='utf-8') as f:
    programa_text = f.read()

# Make Programa HTML
programa_html_content = markdown.markdown(programa_text.replace('\n', '\n\n'))
programa_html_section = f"""
<div class="section-card border-def shadow-sm">
    <div class="section-title text-def"><i class="bi bi-card-list"></i> Programa Oficial a Desarrollar</div>
    <div class="fs-5">{programa_html_content}</div>
</div>
"""

# 2. Read Units
unidades = {}
for i in range(1, 10):
    filename = f"Unidad {i}.txt" if i != 8 else "unidad 8.txt"
    filepath = os.path.join(text_dir, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            raw_text = f.read()
            # Convert markdown to HTML
            html = markdown.markdown(raw_text)
            # Add Bootstrap classes to tables if any, and style paragraphs
            html = html.replace('<table>', '<table class="table table-bordered table-striped">')
            unidades[i] = html
    else:
        unidades[i] = "<p>Material en desarrollo.</p>"

unidades[10] = "<p><em>Contenido de la Unidad X en desarrollo.</em></p>"

# Map classes to units
class_mapping = {
    1: [1, 5],
    2: [2],
    3: [3],
    4: [4],
    5: [], # Lab
    6: [], # Lab
    7: [7],
    8: [6],
    9: [7],
    10: [9],
    11: [10],
    12: [8]
}

clases_list_python = "clases = [\n"
titulos = {
    1: "Unidad I y V: Introducción y Hardware/Software",
    2: "Unidad II: Estrategia de Negocios a través de TI",
    3: "Unidad III: Fundamentos de Base de Datos",
    4: "Unidad IV: Sistemas Integrados de Gestión (ERP)",
    5: "Laboratorio Práctico I",
    6: "Laboratorio Práctico II",
    7: "Unidad VII: Apoyo a la Toma de Decisiones (Parte I)",
    8: "Unidad VI: Infraestructura de Redes",
    9: "Unidad VII: Apoyo a la Toma de Decisiones (Parte II)",
    10: "Unidad IX: Negocios en Internet",
    11: "Unidad X: Futuro de las TIC",
    12: "Unidad VIII: Sistemas de Apoyo a Ejecutivos (EIS)"
}

for c_id in range(1, 13):
    units_to_include = class_mapping[c_id]
    content_html = ""
    for u in units_to_include:
        content_html += f'<div class="mb-5">{unidades[u]}</div>'
    
    if not units_to_include:
        content_html = "<div class='alert alert-info fs-5'><i class='bi bi-laptop'></i> Práctica de Laboratorio. Las guías se entregarán presencialmente.</div>"
        
    clases_list_python += f'''    {{
        "id": {c_id},
        "titulo": "{titulos[c_id]}",
        "tipo": "Presencial",
        "definiciones": """{content_html}""",
        "casos": "<p>Análisis de casos prácticos según directrices del docente.</p>",
        "comparaciones": "<p>Revisión de cuadros comparativos de la bibliografía.</p>",
        "ejercitario": "Completar la guía de ejercicios de la plataforma.",
        "bibliografia": "Cohen, Asín. (2000). Sistemas de Información para los Negocios. McGraw-Hill."
    }},\n'''

clases_list_python += "]\n"


# 3. Update generar_htmls.py
with open(generar_py, 'r', encoding='utf-8') as f:
    gen_content = f.read()

# Replace clases
clases_start = gen_content.find('clases = [')
clases_end = gen_content.find(']', clases_start) + 1
if clases_start != -1 and clases_end != -1:
    gen_content = gen_content[:clases_start] + clases_list_python + gen_content[clases_end:]

# Inject Programa into menu and generate its page
menu_link_str = 'menu_links += f\'<a href="clase_{c["id"]:02d}.html" class="menu-clase" data-clase="{c["id"]}">Clase {c["id"]} ({tipo_actual})</a>\\n\''
new_menu_link_str = 'menu_links += f\'<a href="clase_{c["id"]:02d}.html" class="menu-clase" data-clase="{c["id"]}">Clase {c["id"]} ({tipo_actual})</a>\\n\'\n    menu_links = \'<a href="programa.html"><i class="bi bi-file-earmark-text me-2"></i>Programa Oficial</a>\\n\' + menu_links'

gen_content = gen_content.replace(menu_link_str, new_menu_link_str)

# Generate programa.html
# Find where index.html is written
index_write_str = 'with open(os.path.join(html_dir, "index.html"), "w", encoding="utf-8") as f:\n        f.write(template_html.format(titulo_pagina="Programa ADE18", menu_links=menu_links, contenido_principal=index_content, scripts_marcadores=script_base))'

programa_write_str = index_write_str + f'''

    programa_content = """
    <h1 class="page-title text-center"><i class="bi bi-journal-bookmark-fill text-primary"></i> Programa Académico Oficial</h1>
    {programa_html_section}
    """
    with open(os.path.join(html_dir, "programa.html"), "w", encoding="utf-8") as f:
        f.write(template_html.format(titulo_pagina="Programa Oficial", menu_links=menu_links, contenido_principal=programa_content, scripts_marcadores=script_base))
'''

gen_content = gen_content.replace(index_write_str, programa_write_str)

with open(generar_py, 'w', encoding='utf-8') as f:
    f.write(gen_content)

print("generar_htmls.py actualizado con el nuevo contenido de las Unidades y el Programa Oficial.")
