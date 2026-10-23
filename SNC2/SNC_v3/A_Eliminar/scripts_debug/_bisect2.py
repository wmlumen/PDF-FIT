import re, subprocess
from pathlib import Path

html = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/index.html").read_text(encoding="utf-8")
mods = list(re.finditer(r'<script type="module">(.*?)</script>', html, re.S))
src = mods[-1].group(1)
lines = src.split("\n")
print("total lines:", len(lines))

for cut in range(0, 80):
    cand = "\n".join(lines[:-cut]) if cut else src
    p = Path("_cand.js")
    p.write_text(cand, encoding="utf-8")
    r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
    if r.returncode == 0:
        print("PARSES OK with last", cut, "lines removed")
        break
    else:
        err = r.stderr.strip().splitlines()
        print("cut", cut, "->", err[-1] if err else "unknown")
