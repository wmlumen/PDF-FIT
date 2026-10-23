from pathlib import Path
import re
html = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/index.html").read_text(encoding="utf-8")
modules = list(re.finditer(r'<script type="module">(.*?)</script>', html, re.S))
src = modules[-1].group(1)
lines = src.split("\n")
print("total lines:", len(lines))
for i in range(566, min(578, len(lines))):
    print(i+1, repr(lines[i]))
print("last 50 chars repr:", repr(src[-50:]))
