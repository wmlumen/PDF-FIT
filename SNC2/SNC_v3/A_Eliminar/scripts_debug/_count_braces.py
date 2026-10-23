from pathlib import Path
import json

js = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/_inline_module_check4.js").read_text(encoding="utf-8")

# Tokenize, tracking strings and comments crudely
depth = 0
i = 0
n = len(js)
errors = []
while i < n:
    c = js[i]
    if c in ('"', "'", '`'):
        q = c
        i += 1
        while i < n:
            if js[i] == '\\' and i + 1 < n:
                i += 2
                continue
            if js[i] == q:
                break
            i += 1
        i += 1
        continue
    if c == '/' and i + 1 < n and js[i+1] == '/':
        while i < n and js[i] != '\n':
            i += 1
        continue
    if c == '/' and i + 1 < n and js[i+1] == '*':
        i += 2
        while i + 1 < n and not (js[i] == '*' and js[i+1] == '/'):
            i += 1
        i += 2
        continue
    if c in '{[(':
        depth += 1
    elif c in '}])':
        depth -= 1
        if depth < 0:
            errors.append(f"extra close at char {i}")
    i += 1
print("final depth:", depth, "len:", n)
for e in errors:
    print(e)
