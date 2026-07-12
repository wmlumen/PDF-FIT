import subprocess, time, os, http.client

print("Iniciando servidor PDF-FIT...")
print("="*50)

# Start server
proc = subprocess.Popen([os.sys.executable, "app.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

# Wait for server to start
time.sleep(3)

# Test connection
max_retries = 10
for i in range(max_retries):
    try:
        conn = http.client.HTTPConnection("127.0.0.1", 5000, timeout=5)
        conn.request("GET", "/")
        r = conn.getresponse()
        resp = r.read()
        conn.close()
        
        if r.status == 200:
            print("OK - Servidor iniciado correctamente")
            print(f"Status: {r.status}")
            print("Accede: http://localhost:5000")
            print(f"PID: {proc.pid}")
            print("="*50)
            break
        else:
            print(f"Intento {i+1}: Status {r.status}")
            
    except Exception as e:
        print(f"Intento {i+1}: {e}")
        
    time.sleep(1)
else:
    print("ERROR - No se pudo iniciar el servidor")
    proc.terminate()
    proc.wait()
    stdout, stderr = proc.stdout.read(), proc.stderr.read()
    if stderr:
        print(f"Error: {stderr.decode()[:500]}")

# Keep running
print("\nPresiona Ctrl+C para detener el servidor")
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nDeteniendo servidor...")
    proc.terminate()
    proc.wait()
    print("Servidor detenido")
