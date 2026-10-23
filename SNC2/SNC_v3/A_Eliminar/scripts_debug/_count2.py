from pathlib import Path
import re

js = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/_inline_module_check4.js").read_text(encoding="utf-8")

# Remove strings (single, double, backtick) and comments to count braces genuinely.
def strip_strings(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c in ('"', "'", '`'):
            q = c
            i += 1
            while i < n:
                if s[i] == '\\' and i + 1 < n:
                    i += 2
                    continue
                if s[i] == q:
                    break
                i += 1
            i += 1
            continue
        if c == '/' and i + 1 < n and s[i+1] == '/':
            while i < n and s[i] != '\n':
                i += 1
            continue
        if c == '/' and i + 1 < n and s[i+1] == '*':
            i += 2
            while i + 1 < n and not (s[i] == '*' and s[i+1] == '/'):
                i += 1
            i += 2
            continue
        out.append(c)
        i += 1
    return ''.join(out)

clean = strip_strings(js)
depth = 0
for ch in clean:
    if ch in '{[(':
        depth += 1
    elif ch in '}])':
        depth -= 1
        if depth < 0:
            print("extra close")
            break
print("clean len:", len(clean), "depth:", depth)
print("last 300 chars repr:")
print(repr(clean[-300:]))
