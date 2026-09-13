filepath = r'C:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\Materiales_HTML_Sabados\clase_03.html'
with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

# Find the section
start = html.find('section-card border-def')
end = html.find('section-card border-casos')
section = html[start:end]

# Find all <ol> tags
import re
ol_matches = list(re.finditer(r'<ol>.*?</ol>', section, re.DOTALL))
print(f"Found {len(ol_matches)} <ol> tags")
for i, m in enumerate(ol_matches[:3]):
    # Get the content of the ol
    ol_content = m.group(0)
    li_matches = re.findall(r'<li>(.*?)</li>', ol_content, re.DOTALL)
    print(f"  ol {i}: {len(li_matches)} li items")
    for li in li_matches[:3]:
        print(f"    li: {li[:80]}")

# Also check the raw text around <ol>
ol_pos = section.find('<ol>')
if ol_pos != -1:
    raw = section[ol_pos:ol_pos+500]
    print(f"\nRaw <ol> content: {repr(raw[:300])}")
