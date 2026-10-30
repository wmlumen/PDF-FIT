import urllib.request
import re
from bs4 import BeautifulSoup
import json

def fetch_pout(pout_id):
    url = f"https://apps.mades.gov.py/siam/portal/ordenamiento-territorial/{pout_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            if res.status != 200:
                return None
            html = res.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find title / headers
            title = soup.find('title')
            t_text = title.text.strip() if title else ''
            
            # Find all links
            links = []
            for a in soup.find_all('a', href=True):
                href = a['href']
                text = a.text.strip()
                links.append({'text': text, 'href': href})
            
            # Find any text or headers describing the municipality
            h_tags = [h.text.strip() for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5'])]
            
            return {
                'id': pout_id,
                'status': res.status,
                'title': t_text,
                'headers': h_tags,
                'links': links,
                'html_length': len(html)
            }
    except Exception as e:
        return {'id': pout_id, 'error': str(e)}

print("--- Inspecting POUT 7 & 8 ---")
for pid in [7, 8]:
    res = fetch_pout(pid)
    print(f"\n=== POUT {pid} ===")
    if 'error' in res:
        print("Error:", res['error'])
    else:
        print("Headers:", res['headers'])
        print("Links count:", len(res['links']))
        for l in res['links']:
            print("  Link:", l['text'][:50], "->", l['href'])
