from pathlib import Path
import re

js = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/_wireup.js").read_text(encoding="utf-8")

# Tokenize: track strings (single, double, backtick), comments. Count braces.
depth = 0
i = 0
n = len(js)
tokens = []
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
            print("EXTRA CLOSE at char", i)
    i += 1
print("final depth:", depth)
print("len:", n)

# Report the running depth at the end (where the unclosed opener is)
depth = 0
for idx, ch in enumerate(js, 1):
    if ch in '{[(':
        depth += 1
    elif ch in '}])':
        depth -= 1
print("cumulative depth at last char:", depth)

# Show the context where depth became 1 (the first unclosed opener) by finding where depth == 1 at EOF start
depth = 0
first_open = None
for idx, ch in enumerate(js, 1):
    if ch in '{[(':
        depth += 1
        if depth == 1 and first_open is None:
            first_open = idx
    elif ch in '}])':
        depth -= 1
print("first unclosed opener char:", first_open)
print("context around first_open:", repr(js[max(0,first_open-120):first_open+120]))
