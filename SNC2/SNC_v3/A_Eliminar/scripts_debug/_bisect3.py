import re, subprocess
from pathlib import Path

html = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/index.html").read_text(encoding="utf-8")
mods = list(re.finditer(r'<script type="module">(.*?)</script>', html, re.S))
src = mods[-1].group(1)
lines = src.split("\n")
print("total lines:", len(lines))

for cut in range(0, 100, 5):
    cand = "\n".join(lines[:-cut]) if cut else src
    p = Path("_cand.js")
    p.write_text(cand, encoding="utf-8")
    r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
    out = (r.stderr or r.stdout).strip().splitlines()
    # node --check prints: version line, file path, then error
    err_line = out[2] if len(out) >= 3 else (out[-1] if out else "")
    ok = "Syntax OK" in r.stderr
    print("cut", cut, "->", "OK" if ok else ("ERR: " + err_line[:80]))
    if ok:
        break
