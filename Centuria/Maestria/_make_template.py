from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docxtpl import DocxTemplate
import os

logo = "/mnt/c/Users/HP 250 G10/Documents/GITHUT/Centuria/css/logo_centuria_blanco-trasparente.png"
print('logo exists', os.path.exists(logo), logo)

tpl_path = 'template_apa7.docx'
if os.path.exists(tpl_path):
    os.remove(tpl_path)

# Create base docx
Document().save(tpl_path)
tpl = DocxTemplate(tpl_path)

# Cover subdoc
sub = tpl.new_subdoc()
for s in sub.sections:
    s.top_margin = Inches(1)
    s.bottom_margin = Inches(1)
    s.left_margin = Inches(1)
    s.right_margin = Inches(1)

p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run()
if os.path.exists(logo):
    run.add_picture(logo, width=Inches(3.2))
else:
    run.text = "[LOGO CENTURIA]"

for txt in [
    "INSTITUTO SUPERIOR EN CIENCIAS EMPRESARIALES",
    "“CENTURIA”",
    "TRABAJO DE INVESTIGACIÓN",
    "MONOGRAFÍA",
]:
    p = sub.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(txt)
    r.bold = True
    r.font.name = "Times New Roman"
    r.font.size = Pt(13)

p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.LEFT
r = p.add_run("MATERIA: {{ materia }}\nDOCENTE: {{ docente }}\nALUMNO: {{ alumno }}\nCEDULA: {{ cedula }}\nCARRERA: {{ carrera }}\nSECCIÓN / GRUPO: {{ seccion }}")
r.font.name = "Times New Roman"
r.font.size = Pt(12)
p.paragraph_format.space_after = Pt(6)

# Recuadro interno para el logo/imagen institucional
sub.add_page_break()

# Internal data heading
p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("DATOS PARA USO INTERNO")
r.bold = True
r.font.name = "Times New Roman"
r.font.size = Pt(12)
p.paragraph_format.space_after = Pt(12)

# Indices
sub.add_page_break()
p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("ÍNDICE GENERAL")
r.bold = True
r.font.name = "Times New Roman"
r.font.size = Pt(12)

p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run_toc = p.add_run()
f1 = OxmlElement('w:fldChar')
f1.set(qn('w:fldCharType'), 'begin')
instrText = OxmlElement('w:instrText')
instrText.set(qn('xml:space'), 'preserve')
instrText.text = 'TOC \\\\o "1-3" \\\\h \\\\z \\\\u'
f2 = OxmlElement('w:fldChar')
f2.set(qn('w:fldCharType'), 'separate')
f3 = OxmlElement('w:fldChar')
f3.set(qn('w:fldCharType'), 'end')
run_toc._r.append(f1)
run_toc._r.append(instrText)
run_toc._r.append(f2)
run_toc._r.append(f3)
sub.add_page_break()

p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("ÍNDICE DE TABLAS")
r.bold = True
r.font.name = "Times New Roman"
r.font.size = Pt(12)
sub.add_page_break()

p = sub.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("ÍNDICE DE FIGURAS")
r.bold = True
r.font.name = "Times New Roman"
r.font.size = Pt(12)
sub.add_page_break()

context = {
    "universidad": "Instituto Superior Centuria",
    "facultad": "Instituto Superior Centuria",
    "carrera": "Maestría en Gestión Pública",
    "titulo_monografia": "Gestión contable y financiera del Impuesto Inmobiliario en el Departamento de Catastro de la Municipalidad de Asunción",
    "autor": "Lic. Christhian Jose Raul Keim",
    "tutor": "C.P Mg JUAN CARLOS MONTIEL",
    "ciudad": "Asunción",
    "anio": "2026",
    "certificacion_texto": "Documento verificado para entrega institucional.",
    "caratula": sub,
}
tpl.render(context)
out = 'Borradores/template_apa7.docx'
os.makedirs('Borradores', exist_ok=True)
tpl.save(out)
print(f"saved {out}")
