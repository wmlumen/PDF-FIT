from pathlib import Path
import re

src = Path("C:/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3/_wireup.js").read_text(encoding="utf-8")

# Find all template literals using acorn's tokenizer? No - use regex on backtick-delimited strings.
# Patch: backticks are escaped in the file? No, they're literal.
# Find backtick template literals (non-greedy) - the file uses real backticks.
# Escape backticks in pattern by using a function regex.
pattern = re.compile(r'`(.*?)`', re.S)
matches = list(pattern.finditer(src))
print("template literal count:", len(matches))

def check_template(content):
    # content is between backticks
    # find ${...} segments
    depth = 0
    i = 0
    n = len(content)
    segs = []
    while i < n:
        if content[i] == '$' and i+1 < n and content[i+1] == '{':
            # found interpolation start
            depth = 0
            i += 2
            start = i
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
                        segs.append(content[start:i])
                        break
                i += 1
            continue
        i += 1
    unbalanced = [s for s in segs if (s.count('{') - s.count('}')) != 0 or (s.count('(') - s.count(')')) != 0]
    return unbalanced

bad = []
for idx, m in enumerate(matches):
    bad_in = check_template(m.group(1))
    if bad_in:
        bad.append((idx, m.start(), bad_in))

if bad:
    for idx, pos, segs in bad:
        print(f"template literal #{idx} at file char {pos} has unbalanced segments:")
        for s in segs:
            print("   ", repr(s[:120]))
else:
    print("all template literals balanced")
