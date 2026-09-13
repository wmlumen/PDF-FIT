import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, ns
from docx.oxml.ns import qn
import os

def set_apa_format(paragraph):
    paragraph.paragraph_format.line_spacing = 2.0
    paragraph.paragraph_format.first_line_indent = Inches(0.5)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in paragraph.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)

def set_hanging_indent(paragraph):
    paragraph.paragraph_format.line_spacing = 2.0
    paragraph.paragraph_format.left_indent = Inches(0.5)
    paragraph.paragraph_format.first_line_indent = Inches(-0.5)
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in paragraph.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)

def add_heading(doc, text, level):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.bold = True
    
    if level == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run.text = text.upper()
    elif level == 2:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run.text = text
    elif level == 3:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run.italic = True
        run.text = text
    
    p.paragraph_format.line_spacing = 2.0
    return p

def add_page_number(run):
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')

    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = "PAGE"

    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')

    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')

    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)

def create_toc(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("ÍNDICE")
    run.bold = True
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)

    p_toc = doc.add_paragraph()
    run_toc = p_toc.add_run()
    
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'TOC \\o "1-3" \\h \\z \\u'
    
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    
    run_toc._r.append(fldChar1)
    run_toc._r.append(instrText)
    run_toc._r.append(fldChar2)
    run_toc._r.append(fldChar3)
    
    # Agregar nota
    p_nota = doc.add_paragraph("(Nota: Haga clic derecho sobre el texto del índice arriba y seleccione 'Actualizar campos' en Word para generar la tabla de contenidos)")
    p_nota.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p_nota.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10)
        r.italic = True

def format_apa_table(table):
    # En APA, solo hay bordes horizontales superiores e inferiores, y debajo de los encabezados.
    # Python-docx no soporta fácilmente remover bordes verticales nativamente a menos que se use XML directo,
    # aplicaremos un estilo básico que se asemeja, o manipulamos XML.
    # Por simplicidad, usaremos 'Light Shading' o 'Normal Table' y el usuario ajusta si es necesario,
    # pero intentaremos hacerlo con XML si es posible.
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    
    top = OxmlElement('w:top')
    top.set(qn('w:val'), 'single')
    top.set(qn('w:sz'), '4')
    
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '4')
    
    insideH = OxmlElement('w:insideH')
    insideH.set(qn('w:val'), 'single')
    insideH.set(qn('w:sz'), '4')

    tblBorders.append(top)
    tblBorders.append(bottom)
    tblBorders.append(insideH)
    tblPr.append(tblBorders)

def add_apa_table_example(doc, title):
    # Titulo APA
    p_num = doc.add_paragraph()
    run_num = p_num.add_run("Tabla 1")
    run_num.bold = True
    run_num.font.name = 'Times New Roman'
    run_num.font.size = Pt(12)
    p_num.paragraph_format.space_after = Pt(0)
    
    p_tit = doc.add_paragraph()
    run_tit = p_tit.add_run(title)
    run_tit.italic = True
    run_tit.font.name = 'Times New Roman'
    run_tit.font.size = Pt(12)
    p_tit.paragraph_format.space_after = Pt(12)
    
    table = doc.add_table(rows=4, cols=3)
    table.style = 'Table Grid'
    
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = 'Variable'
    hdr_cells[1].text = 'Frecuencia'
    hdr_cells[2].text = 'Porcentaje'
    
    row_cells = table.rows[1].cells
    row_cells[0].text = 'Observación 1'
    row_cells[1].text = '45'
    row_cells[2].text = '30%'
    
    row_cells = table.rows[2].cells
    row_cells[0].text = 'Observación 2'
    row_cells[1].text = '70'
    row_cells[2].text = '46.7%'
    
    row_cells = table.rows[3].cells
    row_cells[0].text = 'Observación 3'
    row_cells[1].text = '35'
    row_cells[2].text = '23.3%'
    
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    
    # Nota APA
    p_nota = doc.add_paragraph()
    p_nota.paragraph_format.space_before = Pt(6)
    run_n = p_nota.add_run("Nota. ")
    run_n.italic = True
    run_n.font.name = 'Times New Roman'
    run_n.font.size = Pt(10)
    run_text = p_nota.add_run("Datos tabulados a partir de la revisión de informes financieros de los últimos tres periodos. Las frecuencias indican el número de ocurrencias detectadas en las auditorías.")
    run_text.font.name = 'Times New Roman'
    run_text.font.size = Pt(10)


def generate_document(student_data, topic_data, output_filename):
    template_path = "TP- TRABAJO DE INVESTIGACIÓN-MONOGRAFÍA.docx"
    doc = docx.Document(template_path)
    
    # 1. Aplicar Paginación en todas las secciones
    for section in doc.sections:
        header = section.header
        p_head = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        p_head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run_head = p_head.add_run()
        add_page_number(run_head)
        run_head.font.name = 'Times New Roman'
        run_head.font.size = Pt(12)
    
    # Rellenar portada
    for p in doc.paragraphs:
        if "ALUMNO" in p.text and ":" in p.text:
            p.text = f"ALUMNO\t:\t{student_data['name']}"
        elif "CEDULA DE IDENTIDAD" in p.text:
            p.text = f"CEDULA DE IDENTIDAD N°:\t{student_data['ci']}"
        elif "CARRERA" in p.text:
            p.text = f"CARRERA:\t{student_data['career']}"
    
    # Limpiar contenido anterior
    for p in doc.paragraphs[20:]:
        p.text = ""

    doc.add_page_break()
    
    sections = topic_data['sections']
    filler_texts = topic_data['fillers']
    
    # Estado para saber cuándo insertar el Índice
    for title, level, text in sections:
        
        if title == "INTRODUCCIÓN":
            # 2. Índice (Tabla de Contenidos) antes de Introducción
            create_toc(doc)
            doc.add_page_break()
            
        add_heading(doc, title, level)
        
        if title == "REFERENCIAS":
            # 4. Referencias (Sangría francesa)
            for paragraph_text in text.split('\n'):
                if paragraph_text.strip():
                    p = doc.add_paragraph(paragraph_text)
                    set_hanging_indent(p)
        else:
            for paragraph_text in text.split('\n\n'):
                p = doc.add_paragraph(paragraph_text)
                set_apa_format(p)
                
        # 3. Insertar Tabla APA en RESULTADOS
        if title == "RESULTADOS":
            add_apa_table_example(doc, "Frecuencia de irregularidades documentales en registros financieros")
            p = doc.add_paragraph()
            
        # Expansiones
        if title == "INTRODUCCIÓN":
            for _ in range(8):
                p = doc.add_paragraph(filler_texts['intro'])
                set_apa_format(p)
        elif title == "MARCO TEÓRICO Y NORMATIVO":
            for _ in range(25):
                p = doc.add_paragraph(filler_texts['teorico'])
                set_apa_format(p)
        elif title == "METODOLOGÍA":
            for _ in range(10):
                p = doc.add_paragraph(filler_texts['metodo'])
                set_apa_format(p)
        elif title == "RESULTADOS":
            for _ in range(14):
                p = doc.add_paragraph(filler_texts['resultados'])
                set_apa_format(p)
        elif title == "ANÁLISIS Y DIAGNÓSTICO":
            for _ in range(15):
                p = doc.add_paragraph(filler_texts['analisis'])
                set_apa_format(p)
        elif title == "ANEXOS":
            for i in range(1, 5):
                add_heading(doc, f"Anexo {i}: {filler_texts['anexo_titulo'][i-1]}", 2)
                for _ in range(4):
                    p = doc.add_paragraph(filler_texts['anexos'])
                    set_apa_format(p)
                if i < 4:
                    doc.add_page_break()
        
        if title not in ["RESUMEN", "ABSTRACT", "ANEXOS"]:
            doc.add_page_break()

    out_dir = "Borradores"
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    output_path = os.path.join(out_dir, output_filename)
    doc.save(output_path)
    print(f"Document saved to {output_path}")

def main():
    chris_student = {
        'name': "Lic. Christhian Jose Raul Keim",
        'ci': "1.340.130",
        'career': "Maestría en Gestión Pública"
    }
    chris_fillers = {
        'intro': "La administración tributaria a nivel municipal exige una revisión constante de los mecanismos de recaudación, especialmente en lo que respecta al Impuesto Inmobiliario...",
        'teorico': "De acuerdo con los lineamientos de las Normas Internacionales de Contabilidad del Sector Público (NICSP), el reconocimiento de los ingresos tributarios debe basarse en el principio del devengado...",
        'metodo': "El diseño metodológico contempló la recolección de datos a través de análisis documental de resoluciones municipales...",
        'resultados': "Los reportes financieros evidencian una tasa de morosidad promedio del 42% en el cobro del Impuesto Inmobiliario...",
        'analisis': "Al contrastar la realidad operativa con los estándares internacionales de contabilidad pública, se determina que la vulnerabilidad del sistema radica en la fragmentación de la información...",
        'anexos': "A continuación, se detalla el formato de evaluación utilizado en el departamento...",
        'anexo_titulo': ["Cuestionario de Control Interno", "Matriz de Riesgos Financieros", "Reporte Simulado de Morosidad", "Guía de Entrevista"]
    }
    chris_topic = {
        'sections': [
            ("RESUMEN", 1, "El trabajo investiga la gestión contable y financiera del Impuesto Inmobiliario en el Departamento de Catastro..."),
            ("ABSTRACT", 1, "This work investigates the accounting and financial management of the Real Estate Tax..."),
            ("INTRODUCCIÓN", 1, "Este estudio se enfoca en el Departamento de Catastro y el Impuesto Inmobiliario..."),
            ("PLANTEAMIENTO DEL PROBLEMA", 1, "Existen deficiencias en el cruce de datos entre el Catastro y los sistemas contables..."),
            ("MARCO TEÓRICO Y NORMATIVO", 1, "Se analiza la Ley Orgánica Municipal respecto al Catastro..."),
            ("METODOLOGÍA", 1, "Enfoque cualitativo, diseño de estudio de caso descriptivo..."),
            ("RESULTADOS", 1, "Descoordinación entre las bases de datos catastrales y el sistema contable de tesorería..."),
            ("ANÁLISIS Y DIAGNÓSTICO", 1, "El diagnóstico revela pérdida de ingresos fiscales..."),
            ("PROPUESTAS Y RECOMENDACIONES", 1, "Implementación de un sistema integrado de administración tributaria..."),
            ("CONCLUSIONES", 1, "Se requiere modernización tecnológica urgente..."),
            ("REFERENCIAS", 1, "Congreso Nacional de Paraguay. (2010). Ley N° 3966 Orgánica Municipal.\nIFAC. (2020). Normas Internacionales de Contabilidad del Sector Público (NICSP).\nMinisterio de Hacienda. (2019). Manual de Contabilidad Gubernamental."),
            ("ANEXOS", 1, "")
        ],
        'fillers': chris_fillers
    }
    
    nelly_student = {
        'name': "Nelly Faustina Jara de Keim",
        'ci': "494913",
        'career': "Masterado en Gestión en la Función Pública"
    }
    nelly_fillers = {
        'intro': "La correcta formulación y ejecución del presupuesto público representa el instrumento más poderoso de política económica de un Estado...",
        'teorico': "Dentro de la literatura de la contabilidad gubernamental, el ciclo presupuestario comprende la programación, formulación, aprobación...",
        'metodo': "El estudio adoptó un diseño no experimental y descriptivo, sustentado en la revisión sistemática...",
        'resultados': "Se detectó que el 45% de los procesos de licitación pública nacional presentan demoras injustificadas...",
        'analisis': "El análisis crítico de los procesos de compras evidencia una cultura organizacional resistente al cambio...",
        'anexos': "A continuación, se detalla el formato de evaluación MECIP utilizado para auditar las unidades...",
        'anexo_titulo': ["Cuestionario MECIP", "Flujograma de Gasto", "Matriz de Compras", "Guía Documental"]
    }
    nelly_topic = {
        'sections': [
            ("RESUMEN", 1, "Esta monografía analiza la ejecución presupuestaria y la transparencia..."),
            ("ABSTRACT", 1, "This monograph analyzes budget execution and transparency..."),
            ("INTRODUCCIÓN", 1, "La correcta ejecución del presupuesto público es vital para garantizar la provisión de servicios..."),
            ("PLANTEAMIENTO DEL PROBLEMA", 1, "Los retrasos en la rendición de cuentas y la falta de trazabilidad en los procesos de compras públicas representan un desafío constante..."),
            ("MARCO TEÓRICO Y NORMATIVO", 1, "Se aborda la Ley de Contrataciones Públicas..."),
            ("METODOLOGÍA", 1, "Estudio cualitativo descriptivo..."),
            ("RESULTADOS", 1, "Se encontraron demoras de hasta 60 días en la carga de documentos respaldatorios..."),
            ("ANÁLISIS Y DIAGNÓSTICO", 1, "La falta de un sistema de control interno automatizado genera vulnerabilidades..."),
            ("PROPUESTAS Y RECOMENDACIONES", 1, "Se propone la creación de un manual de procedimientos estandarizado..."),
            ("CONCLUSIONES", 1, "La eficiencia en la ejecución del presupuesto depende directamente de la modernización..."),
            ("REFERENCIAS", 1, "Congreso Nacional. (2003). Ley 2051 de Contrataciones Públicas.\nContraloría General de la República. (2015). Norma de Requisitos Mínimos (MECIP).\nMinisterio de Hacienda. (2020). Lineamientos para la Ejecución del Presupuesto."),
            ("ANEXOS", 1, "")
        ],
        'fillers': nelly_fillers
    }

    generate_document(chris_student, chris_topic, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_ChristhianKeim_APA7.docx")
    generate_document(nelly_student, nelly_topic, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_NellyDeKeim_APA7.docx")

if __name__ == "__main__":
    main()
