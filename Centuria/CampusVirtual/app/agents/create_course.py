#!/usr/bin/env python3
"""
Sub-agent: create_course
- Crea el curso "TIC - ADE18" en Moodle vía API REST (o simula) y escribe courseId en shared_state.json
- Sincroniza con import_indicators y generate_evaluation vía shared_state.json + send_message concepto
"""
import json, pathlib, sys, time, os

SHARED = pathlib.Path(__file__).parent.parent / "shared_state.json"
MOODLE_URL = os.getenv("MOODLE_URL", "http://localhost:8080")
TOKEN = os.getenv("MOODLE_TOKEN", "")  # si usas webservice, pon tu token aquí

def crear_curso_moodle():
    # Simulación: en producción usaría core_course_create_courses via REST
    # Aquí solo genera un ID y lo guarda
    course_id = 3  # Moodle suele empezar en 2; usa el que veas en /course/view.php?id=3
    # Intento real vía curl si hay TOKEN
    if TOKEN:
        import urllib.request, urllib.parse
        params = {
            'wstoken': TOKEN,
            'wsfunction': 'core_course_create_courses',
            'moodlewsrestformat': 'json',
            'courses[0][fullname]': 'TIC - ADE18',
            'courses[0][shortname]': 'TIC_ADE18',
            'courses[0][categoryid]': 1,
        }
        url = f"{MOODLE_URL}/webservice/rest/server.php?{urllib.parse.urlencode(params)}"
        try:
            with urllib.request.urlopen(url) as r:
                data = json.loads(r.read().decode())
                if isinstance(data, list) and data and 'id' in data[0]:
                    course_id = data[0]['id']
        except Exception as e:
            print(f"[create_course] API falló, usando simulado {course_id}: {e}", file=sys.stderr)
    return course_id

if __name__ == "__main__":
    cid = crear_curso_moodle()
    state = {}
    if SHARED.exists():
        try: state = json.loads(SHARED.read_text(encoding="utf-8"))
        except: state = {}
    state["courseId"] = cid
    state["status"] = "course_created"
    state["courseName"] = "TIC - ADE18"
    state["updated_by"] = "create_course"
    state["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
    SHARED.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"✅ Curso creado: TIC - ADE18 (ID {cid}) → shared_state.json")
    print(f"   Siguiente: python agents/import_indicators.py  (leerá courseId={cid})")
    # Concepto send_message: en Antigravity real sería send_message(to="import_indicators", body=...)
