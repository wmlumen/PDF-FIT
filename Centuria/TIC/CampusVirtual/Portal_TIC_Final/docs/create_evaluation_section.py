# create_evaluation_section.py
import os
import json

BASE_DIR = os.path.dirname(__file__)
JSON_PATH = os.path.join(BASE_DIR, 'indicators.json')
OUTPUT_PATH = os.path.join(BASE_DIR, 'evaluacion.html')

with open(JSON_PATH, encoding='utf-8') as f:
    data = json.load(f)

def write_html(path, title, body):
    html = f"""<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>{title}</title>
    <link href='https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css' rel='stylesheet'>
    <style>
        body {{ padding: 20px; background: #f8f9fa; }}
        .unit-section {{ margin-top: 40px; }}
    </style>
</head>
<body>
    <div class='container'>
        <h1 class='mb-4'>{title}</h1>
        {body}
    </div>
</body>
</html>"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

sections = []
for unit, indicators in sorted(data.items()):
    rows = "".join(
        f"<tr><td>{idx+1}</td><td>{ind['name']}</td><td>{ind['points']}</td></tr>"
        for idx, ind in enumerate(indicators)
    )
    total = sum(ind['points'] for ind in indicators)
    sec = f"""
    <div class='unit-section'>
        <h2>{unit.replace('_', ' ').title()}</h2>
        <p>Total puntos: <strong>{total}</strong></p>
        <table class='table table-sm table-striped'>
            <thead><tr><th>#</th><th>Indicador</th><th>Puntos</th></tr></thead>
            <tbody>{rows}</tbody>
        </table>
    </div>
    """
    sections.append(sec)

body_content = "\n".join(sections)
write_html(OUTPUT_PATH, 'Evaluación por Unidad', body_content)
print('Created evaluacion.html')
