#!/usr/bin/env python3
"""
Sub-agent: generate_evaluation
- Lee shared_state.json (courseId) y genera evaluacion.html / criterios_evaluacion.html
- Usa indicators.json como fuente y plantilla de Portal_TIC_Final
"""
import json, pathlib, time

BASE = pathlib.Path(__file__).parent.parent
SHARED = BASE / "shared_state.json"
INDICATORS = BASE / "indicators.json"
OUTPUT = BASE / "evaluacion.html"
CRITERIOS = BASE / "criterios_evaluacion.html"

if __name__ == "__main__":
    state = json.loads(SHARED.read_text(encoding="utf-8")) if SHARED.exists() else {}
    cid = state.get("courseId", 2)
    data = json.loads(INDICATORS.read_text(encoding="utf-8"))

    # Genera evaluacion.html simple
    html = ["<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><title>Evaluación TIC - ADE18</title>",
            '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">',
            "</head><body class='p-4'><h1>Evaluación TIC - ADE18 (Curso ID "+str(cid)+")</h1><p>Generado desde indicators.json</p>"]
    for unit, inds in data.items():
        html.append(f"<h2>{unit}</h2><ul>")
        for ind in inds:
            html.append(f"<li>{ind['name']} — <strong>{ind['points']} pts</strong></li>")
        html.append("</ul>")
    html.append("</body></html>")
    OUTPUT.write_text("\n".join(html), encoding="utf-8")
    print(f"✅ evaluacion.html generado ({len(data)} unidades) → {OUTPUT}")

    # Criterios
    crit = ["<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'><title>Criterios</title></head><body>",
            f"<h1>Criterios de Evaluación (Curso {cid})</h1><table border=1 cellpadding=6><tr><th>Unidad</th><th>Indicador</th><th>Puntos</th></tr>"]
    for unit, inds in data.items():
        for ind in inds:
            crit.append(f"<tr><td>{unit}</td><td>{ind['name']}</td><td>{ind['points']}</td></tr>")
    crit.append("</table></body></html>")
    CRITERIOS.write_text("\n".join(crit), encoding="utf-8")
    print(f"✅ criterios_evaluacion.html generado → {CRITERIOS}")

    state["status"] = "evaluation_generated"
    state["updated_by"] = "generate_evaluation"
    state["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    SHARED.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Flujo completo. shared_state.json status={state['status']}")
    print("   Verificar en Moodle: Calificaciones → Categorías y verifica los 30 items")
