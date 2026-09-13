import os

filepath = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\generar_htmls.py"

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out_lines = []
in_block = False
for line in lines:
    if line.strip().startswith("if 'resultados_aprendizaje' in c:"):
        in_block = True
    
    if in_block and line.startswith("                "):
        # Remove exactly 8 spaces
        out_lines.append(line[8:])
    elif in_block and line.startswith("        "):
        # It might be 8 spaces but should be 4 if it's top level, wait the original indentation should be 8.
        pass # we'll just fix everything by doing a text replace of the whole block again.
        
# Actually, it's easier to just do it via string replacement of the exact string.
