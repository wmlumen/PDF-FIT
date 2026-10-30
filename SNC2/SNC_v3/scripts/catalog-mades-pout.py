import urllib.request
from bs4 import BeautifulSoup
import re
import json

BASE_URL = 'https://apps.mades.gov.py'
POUT_IDS = [2, 3, 4, 5, 7, 8, 9]

all_pouts = []

for pid in POUT_IDS:
    url = f"{BASE_URL}/siam/portal/ordenamiento-territorial/{pid}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as res:
            html = res.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            
            h = soup.find(['h1', 'h2', 'h3'])
            muni_name = h.text.strip() if h else f"POUT_{pid}"
            
            docs = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                if '/archivo/' in href:
                    full_url = href if href.startswith('http') else BASE_URL + href
                    title = a.text.strip() or full_url.split('/')[-1]
                    docs.append({
                        'titulo': title,
                        'url': full_url
                    })
            
            all_pouts.append({
                'id': pid,
                'municipio': muni_name,
                'url_portal': url,
                'documentos': docs
            })
    except Exception as e:
        print(f"Error en POUT {pid}: {e}")

print(f"Total POUTs encontrados: {len(all_pouts)}")
total_docs = sum(len(p['documentos']) for p in all_pouts)
print(f"Total documentos: {total_docs}")

for p in all_pouts:
    print(f"\n[{p['id']}] {p['municipio']} ({len(p['documentos'])} docs):")
    for d in p['documentos']:
        print(f"   - {d['titulo']} -> {d['url']}")

with open('data/pouts_mades_catalogo.json', 'w', encoding='utf-8') as f:
    json.dump(all_pouts, f, ensure_ascii=False, indent=2)
