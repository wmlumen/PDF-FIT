import re, sys
from pathlib import Path

src = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/_wireup.js").read_text(encoding="utf-8")

# Find template literals. A template literal is backtick-delimited.
# Handle escaped backticks (\`) inside.
def find_templates(s):
    out = []
    i = 0
    n = len(s)
    while i < n:
        if s[i] == '`':
            j = i + 1
            while j < n:
                if s[j] == '\\' and j + 1 < n:
                    j += 2
                    continue
                if s[j] == '`':
                    break
                j += 1
            if j < n:
                out.append((i, j + 1, s[i:j+1]))
                i = j + 1
            else:
                break
        else:
            i += 1
    return out

templates = find_templates(src)
print("template literal count:", len(templates))

bad = []
for idx, (start, end, tpl) in enumerate(templates):
    content = tpl[1:-1]  # between backticks
    # Find interpolations ${...}
    depth = 0
    i = 0
    n = len(content)
    unbalanced = []
    while i < n:
        if content[i] == '$' and i + 1 < n and content[i+1] == '{':
            depth = 0
            i += 2
            start_seg = i
            while i < n:
                c = content[i]
                if c == '\\':
                    i += 2
                    continue
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        seg = content[start_seg:i]
                        opens = seg.count('{') - seg.count('}')
                        closes = seg.count('(') - seg.count(')')
                        if opens != 0 or closes != 0:
                            unbalanced.append((seg[:80], opens, closes))
                        break
                i += 1
            continue
        i += 1
    if unbalanced:
        bad.append((idx, start, unbalanced))

if bad:
    for idx, pos, unbal in bad:
        print(f"template #{idx} at char {pos}:")
        for seg, opens, closes in unbal:
            print(f"   '{seg}': opens={opens} closes={closes}")
else:
    print("NO unbalanced interpolations")
