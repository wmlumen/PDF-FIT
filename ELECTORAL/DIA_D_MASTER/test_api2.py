import subprocess, time, requests, os, sys

# Set env
os.environ['DIRE_API_KEY'] = 'test-key'

# Start server
proc = subprocess.Popen(
    [sys.executable, 'server.py', '--port', '8001'],
    cwd='C:\\Users\\HP 250 G10\\Documents\\GITHUT\\ELECTORAL\\DIA_D_MASTER',
    stdout=subprocess.PIPE, stderr=subprocess.PIPE
)
time.sleep(3)

try:
    base = 'http://localhost:8001/api'
    
    # Probar endpoints electorales
    endpoints = [
        ('/api?action=elecciones', 'Elecciones'),
        ('/api?action=tipos_eleccion', 'Tipos eleccion'),
        ('/api?action=cargos_electivos', 'Cargos electivos'),
        ('/api?action=circunscripciones_api', 'Circunscripciones'),
        ('/api?action=reglas_cargo', 'Reglas cargo'),
    ]
    
    for endpoint, name in endpoints:
        try:
            r = requests.get(f'{base}{endpoint}', timeout=5)
            print(f'{name}: Status {r.status_code}, Total chars: {len(r.text)}')
            # Mostrar primer renglón
            lines = r.text.strip().split('\n')
            if lines:
                print(f'  Primer renglón: {lines[0][:100]}')
        except Exception as e:
            print(f'{name}: Error - {e}')
    
    # Probar reglas por cargo específico - Presidente
    r = requests.get(f'{base}?action=reglas_cargo&id=1', timeout=5)
    print(f'\nReglas Presidente: Status {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'Total reglas: {data.get("total", "N/A")}')
        if data.get('reglas'):
            print(f'Primera regla: {data["reglas"][0]}')
    
    # Probar reglas por cargo - Senadores
    r = requests.get(f'{base}?action=reglas_cargo&id=2', timeout=5)
    print(f'Reglas Senadores: Status {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'Total reglas: {data.get("total", "N/A")}')
        if data.get('reglas'):
            print(f'Primera regla: {data["reglas"][0]}')
    
    # Probar reglas por cargo - Diputados Central (ID 11)
    r = requests.get(f'{base}?action=reglas_cargo&id=3&mesa_param=11', timeout=5)
    print(f'Reglas Diputados Central: Status {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'Total reglas: {data.get("total", "N/A")}')
        if data.get('reglas'):
            print(f'Primera regla: {data["reglas"][0]}')
    
    # Probar reglas por cargo - Gobernador Concepción
    r = requests.get(f'{base}?action=reglas_cargo&id=4&dirigente=2', timeout=5)
    print(f'Reglas Gobernador Concepcion: Status {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'Total reglas: {data.get("total", "N/A")}')
        if data.get('reglas'):
            print(f'Primera regla: {data["reglas"][0]}')
    
    # Probar reglas por cargo - Intendente
    r = requests.get(f'{base}?action=reglas_cargo&id=5', timeout=5)
    print(f'Reglas Intendente: Status {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'Total reglas: {data.get("total", "N/A")}')
        if data.get('reglas'):
            print(f'Primera regla: {data["reglas"][0]}')
    
    # Probar reglas por cargo - Concejal
    r = requests.get(f'{base}?action=reglas_cargo&id=6', timeout=5)
    print(f'Reglas Concejal: Status {r.status_code}')
    if r.status_code == 200:
        data = r.json()
        print(f'Total reglas: {data.get("total", "N/A")}')
        if data.get('reglas'):
            print(f'Primera regla: {data["reglas"][0]}')
    
finally:
    proc.terminate()
    proc.wait()
    print('\nServidor detenido')