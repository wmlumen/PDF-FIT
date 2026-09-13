# extract_indicators.py
import os
import re
import json

def extract_text(line):
    """Remove HTML tags and clean whitespace"""
    return re.sub(r'<[^>]+>', '', line).strip()

# Directory containing unit HTML files
base_dir = os.path.join(os.path.dirname(__file__), 'Materiales_Clases')
indicator_map = {}

for fname in os.listdir(base_dir):
    if not fname.lower().endswith('.html'):
        continue
    unit_name = os.path.splitext(fname)[0]  # e.g., clase_02
    path = os.path.join(base_dir, fname)
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()
    indicators = []
    for line in lines:
        # Look for list items or paragraphs that contain the word "indicador"
        if re.search(r'indicador', line, re.IGNORECASE):
            if '<li' in line.lower():
                txt = extract_text(line)
                if txt:
                    indicators.append(txt)
            elif '<p' in line.lower():
                txt = extract_text(line)
                if txt:
                    indicators.append(txt)
    # Preserve order, remove duplicates
    seen = set()
    uniq = []
    for i in indicators:
        if i not in seen:
            seen.add(i)
            uniq.append(i)
    indicator_map[unit_name] = uniq

# Assign default points (1 per indicator) – can be edited later
output = {
    unit: [{"name": name, "points": 1} for name in names]
    for unit, names in indicator_map.items()
}

# Write JSON next to this script
json_path = os.path.join(os.path.dirname(__file__), 'indicators.json')
with open(json_path, 'w', encoding='utf-8') as out:
    json.dump(output, out, ensure_ascii=False, indent=2)
print(f"Extracted indicators for {len(output)} units -> {json_path}")
