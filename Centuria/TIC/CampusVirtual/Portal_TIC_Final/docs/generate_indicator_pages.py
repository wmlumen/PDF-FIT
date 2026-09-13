# generate_indicator_pages.py
import os
import json

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
        .unit-header {{ margin-top: 40px; }}
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

base_dir = os.path.dirname(__file__)
json_path = os.path.join(base_dir, 'indicators.json')
with open(json_path, encoding='utf-8') as f:
    data = json.load(f)

# ---------- indicadores_por_unidad.html ----------
unit_sections = []
for unit, indicators in sorted(data.items()):
    rows = "".join(
        f"<tr><td>{idx+1}</td><td>{ind['name']}</td><td>{ind['points']}</td></tr>"
        for idx, ind in enumerate(indicators)
    )
    total = sum(ind['points'] for ind in indicators)
    table = f"""
    <h2 class='unit-header'>{unit.replace('_', ' ').title()}</h2>
    <p>Total puntos: <strong>{total}</strong></p>
    <table class='table table-sm table-striped'>
        <thead><tr><th>#</th><th>Indicador</th><th>Puntos</th></tr></thead>
        <tbody>{rows}</tbody>
    </table>
    """
    unit_sections.append(table)

unit_body = "\n".join(unit_sections)
write_html(os.path.join(base_dir, 'indicadores_por_unidad.html'), 'Indicadores por Unidad', unit_body)

# ---------- criterios_evaluacion.html ----------
criteria_body = """
<p>Este documento resume los criterios de evaluación para los docentes.</p>
<table class='table table-bordered'>
    <thead><tr><th>Unidad</th><th>Total puntos</th></tr></thead>
    <tbody>
"""
for unit, indicators in sorted(data.items()):
    total = sum(ind['points'] for ind in indicators)
    criteria_body += f"<tr><td>{unit.replace('_', ' ').title()}</td><td>{total}</td></tr>\n"
criteria_body += """    </tbody>
</table>
"""
write_html(os.path.join(base_dir, 'criterios_evaluacion.html'), 'Criterios de Evaluación', criteria_body)

print('Generated indicadores_por_unidad.html and criterios_evaluacion.html')
