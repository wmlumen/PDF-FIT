import re
import os
from bs4 import BeautifulSoup, NavigableString, Comment

BASE_DIR = r'C:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\Materiales_HTML_Sabados'

def restore_html(soup, original):
    """Try to preserve original HTML structure by using prettify only for the modified parts."""
    pass

def process_file_bs4(filepath):
    """Process using BeautifulSoup but preserve original formatting."""
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    soup = BeautifulSoup(original, 'html.parser')
    
    section = soup.find('div', class_='section-card border-def')
    if not section:
        return False
    
    mb5 = section.find('div', class_='mb-5')
    if not mb5:
        return False
    
    has_content = False
    
    # 1. Convert <p> unit titles to <h2>
    for p in mb5.find_all('p'):
        text = p.get_text(strip=True)
        if re.match(r'^Unidad\s+[IVXLCDM]+\s*:', text):
            p.name = 'h2'
            has_content = True
    
    # 2. Convert <li> subtopics to <h3>
    for ol in mb5.find_all('ol'):
        for li in ol.find_all('li'):
            text = li.get_text(strip=True)
            if re.match(r'^\d+\.', text):
                li.name = 'h3'
                has_content = True
            elif len(text) > 5 and text[0].isupper() and not text.startswith('Esta'):
                # Check if it's a heading-like item
                # If the <li> has only one <br> or text followed by more text on next line
                li_name = li.name
                if li_name != 'h3':
                    li.name = 'h3'
                    has_content = True
    
    # 3. Convert short <p> labels to <h4>
    for p in list(mb5.find_all('p')):
        text = p.get_text(strip=True)
        if re.search(r'\s{2,}', text):
            continue
        if len(text) < 80 and text.endswith(':') and not text.startswith('Esta'):
            p.name = 'h4'
            has_content = True
    
    # 4. Convert table-like <p> to tables
    for p in list(mb5.find_all('p')):
        text = p.get_text(strip=True)
        if not re.search(r'\s{2,}', text):
            continue
        
        lines = text.split('\n')
        rows_data = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            cells = re.split(r'\s{2,}', line)
            cells = [c.strip() for c in cells if c.strip()]
            if cells:
                rows_data.append(cells)
        
        if len(rows_data) >= 2:
            table_html = '<div class="table-responsive"><table class="table table-bordered">\n'
            table_html += '  <thead>\n    <tr>\n'
            for cell in rows_data[0]:
                table_html += f'      <th>{cell}</th>\n'
            table_html += '    </tr>\n  </thead>\n  <tbody>\n'
            for row in rows_data[1:]:
                table_html += '    <tr>\n'
                for cell in row:
                    table_html += f'      <td>{cell}</td>\n'
                table_html += '    </tr>\n'
            table_html += '  </tbody>\n</table></div>\n'
            
            p.insert_after(BeautifulSoup(table_html, 'html.parser'))
            p.decompose()
            has_content = True
    
    if not has_content:
        return False
    
    # Write back using original formatting where possible
    # BeautifulSoup str() will format differently, but it's the most reliable
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    
    return True

def main():
    files = [
        ('clase_03.html', True),
        ('clase_04.html', True),
        ('clase_05.html', False),
        ('clase_06.html', False),
        ('clase_11.html', False),
    ]
    
    base_dir = BASE_DIR
    processed = 0
    
    for filename, has_extended in files:
        filepath = os.path.join(base_dir, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filename}")
            continue
        
        print(f"\n{'='*60}")
        print(f"Processing: {filename}")
        print(f"{'='*60}")
        
        if not has_extended:
            # Check if it actually has content
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            start_idx = content.find('<div class="section-card border-def">')
            if start_idx != -1:
                mb5_idx = content.find('<div class="mb-5">', start_idx)
                if mb5_idx != -1:
                    section_start = mb5_idx + len('<div class="mb-5">')
                    next_sec = content.find('<div class="section-card', section_start)
                    sec_content = content[section_start:next_sec] if next_sec != -1 else content[section_start:section_start+2000]
                    if '<ol>' in sec_content or '<p>Unidad' in sec_content:
                        result = process_file_bs4(filepath)
                        if result:
                            processed += 1
                            print(f"  [OK] Processed.")
                        else:
                            print(f"  [SKIP] Minimal content.")
                    else:
                        print(f"  [SKIP] Minimal content (no <ol> or <p>Unidad).")
                else:
                    print(f"  [SKIP] No mb-5 div, skipped.")
            else:
                print(f"  [SKIP] No development section, skipped.")
        else:
            result = process_file_bs4(filepath)
            if result:
                processed += 1
                print(f"  [OK] Processed.")
            else:
                print(f"  [FAIL] Failed or no changes.")
    
    print(f"\n{'='*60}")
    print(f"PROCESO COMPLETADO: {processed} archivos fueron procesados.")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
