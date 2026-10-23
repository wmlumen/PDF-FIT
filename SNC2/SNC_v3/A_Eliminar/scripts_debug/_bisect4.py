import subprocess, sys
from pathlib import Path

src = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/_wireup.js").read_text(encoding="utf-8")
lines = src.split("\n")
print("total lines:", len(lines))

for cut in range(0, 140, 5):
    cand = "\n".join(lines[:-cut]) if cut else src
    p = Path("_cand.js")
    p.write_text(cand, encoding="utf-8")
    r = subprocess.run(["node", "--check", str(p)], capture_output=True, text=True)
    err = (r.stderr or "").strip().splitlines()
    # node --check prints: version line, file path, then error
    ok = "Syntax OK" in r.stderr
    err_line = err[2] if len(err) >= 3 else (err[-1] if err else "")
    print(f"cut {cut:3d}: {'OK' if ok else 'ERR: '+err_line[:90]}")
    if ok:
        print(">>> FIX FOUND at cut", cut)
        break
