import re, subprocess, json
from pathlib import Path

html = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/index.html").read_text(encoding="utf-8")
mods = list(re.finditer(r'<script type="module">(.*?)</script>', html, re.S))
src = mods[-1].group(1)
p = Path("_cand.js")
p.write_text(src, encoding="utf-8")
r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
print(r.stderr)
