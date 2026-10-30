import urllib.request
import os
import re
import json
import time
import sys

# Ensure UTF-8 output on Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

CATALOG_PATH = 'data/pouts_mades_catalogo.json'
OUT_BASE = 'data/mades_pout'

def sanitize(name):
    name = re.sub(r'[\\/*?:"<>|]', '_', name)
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def main():
    if not os.path.exists(CATALOG_PATH):
        print(f"No existe {CATALOG_PATH}")
        return

    with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
        pouts = json.load(f)

    os.makedirs(OUT_BASE, exist_ok=True)
    manifest = []

    dir_map = {
        2: '02_filadelfia',
        3: '03_capitan_miranda',
        4: '04_bella_vista',
        5: '05_villa_hayes',
        7: '07_naranjal',
        8: '08_carmelo_peralta',
        9: '09_fulgencio_yegros'
    }

    for p in pouts:
        pid = p['id']
        sub_folder = dir_map.get(pid, f"{pid:02d}_municipio")
        dest_dir = os.path.join(OUT_BASE, sub_folder)
        os.makedirs(dest_dir, exist_ok=True)

        print(f"\n==========================================")
        print(f"Descargando POUT {pid}: {p['municipio']}")
        print(f"Destino: {dest_dir}")
        print(f"==========================================")

        for doc in p['documentos']:
            raw_title = doc['titulo']
            if not raw_title.lower().endswith('.pdf'):
                raw_title += '.pdf'
            filename = sanitize(raw_title)
            dest_file = os.path.join(dest_dir, filename)

            url = doc['url']
            print(f"-> {filename} ...")

            if os.path.exists(dest_file) and os.path.getsize(dest_file) > 1000:
                print(f"   [OK] Ya existe ({os.path.getsize(dest_file):,} bytes)")
                manifest.append({
                    'id': pid,
                    'municipio': p['municipio'],
                    'titulo': doc['titulo'],
                    'archivo': dest_file,
                    'bytes': os.path.getsize(dest_file),
                    'url': url
                })
                continue

            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                with urllib.request.urlopen(req, timeout=30) as response, open(dest_file, 'wb') as out_f:
                    data = response.read()
                    out_f.write(data)
                
                size = os.path.getsize(dest_file)
                print(f"   [OK] Descargado ({size:,} bytes)")
                manifest.append({
                    'id': pid,
                    'municipio': p['municipio'],
                    'titulo': doc['titulo'],
                    'archivo': dest_file,
                    'bytes': size,
                    'url': url
                })
            except Exception as e:
                print(f"   [ERROR] Falló la descarga: {e}")
            
            time.sleep(0.5)

    manifest_path = os.path.join(OUT_BASE, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nDescargas finalizadas. Manifest guardado en {manifest_path}")
    print(f"Total archivos procesados: {len(manifest)}")

if __name__ == '__main__':
    main()

