import re

def process_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements for main chapters
    content = content.replace('("PLANTEAMIENTO DEL PROBLEMA", 1,', '("CAPÍTULO 1. PLANTEAMIENTO DEL PROBLEMA", 1,')
    content = content.replace('("MARCO TEÓRICO Y NORMATIVO", 1,', '("CAPÍTULO 2. MARCO TEÓRICO Y NORMATIVO", 1,')
    content = content.replace('("METODOLOGÍA", 1,', '("CAPÍTULO 3. METODOLOGÍA", 1,')
    content = content.replace('("RESULTADOS", 1,', '("CAPÍTULO 4. RESULTADOS", 1,')
    content = content.replace('("ANÁLISIS Y DIAGNÓSTICO", 1,', '("CAPÍTULO 5. ANÁLISIS Y DIAGNÓSTICO", 1,')
    content = content.replace('("PROPUESTAS Y RECOMENDACIONES", 1,', '("CAPÍTULO 6. PROPUESTAS Y RECOMENDACIONES", 1,')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

process_file('generate_final_clean.py')
process_file('generate_nelly_clean.py')
