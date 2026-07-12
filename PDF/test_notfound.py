import subprocess, time, os, json, http.client

# Check if server is running
proc = subprocess.Popen([os.sys.executable, "app.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(5)

try:
    conn = http.client.HTTPConnection("127.0.0.1", 5000, timeout=10)
    conn.request("GET", "/")
    r = conn.getresponse()
    resp = r.read()
    conn.close()
    
    print(f"Status: {r.status}")
    print(f"Response: {resp.decode()[:500]}")
    print(f"Server PID: {proc.pid}")
    
except Exception as e:
    print(f"Error: {e}")
    stdout, stderr = proc.stdout.read(), proc.stderr.read()
    if stderr:
        print(f"Server error: {stderr.decode()[:500]}")

proc.terminate()
proc.wait()

if os.path.exists("test_notfound.py"):
    os.remove("test_notfound.py")
