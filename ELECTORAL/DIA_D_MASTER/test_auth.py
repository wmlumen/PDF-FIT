import subprocess
import time
import requests
import os

# Set the API key
os.environ["DIRE_API_KEY"] = "sk-nuestro-api-key-aqui"

# Start server
proc = subprocess.Popen(
    ["python", "server.py", "--port", "8002"],
    cwd="C:\\Users\\HP 250 G10\\Documents\\GITHUT\\ELECTORAL\\DIA_D_MASTER",
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

time.sleep(3)

try:
    # Test 1: Without API key
    print("=== Test 1: Sin API key ===")
    r = requests.get("http://localhost:8002/api?action=dirigentes")
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text[:200]}")
    print()
    
    # Test 2: With correct API key
    print("=== Test 2: Con API key correcta ===")
    r2 = requests.get(
        "http://localhost:8002/api?action=dirigentes",
        headers={"X-API-Key": "sk-nuestro-api-key-aqui"}
    )
    print(f"Status: {r2.status_code}")
    print(f"Body: {r2.text[:200]}")
    print()
    
    # Test 3: With wrong API key
    print("=== Test 3: Con API key incorrecta ===")
    r3 = requests.get(
        "http://localhost:8002/api?action=dirigentes",
        headers={"X-API-Key": "clave-incorrecta"}
    )
    print(f"Status: {r3.status_code}")
    print(f"Body: {r3.text[:200]}")
    
finally:
    proc.terminate()
    proc.wait()
    print("\n=== Server stopped ===")