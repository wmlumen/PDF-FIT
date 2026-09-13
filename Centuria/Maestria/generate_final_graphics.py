import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, ns
from docx.oxml.ns import qn
import os
import matplotlib.pyplot as plt

def generate_charts():
    # Gráfico 1 - Christhian: Morosidad
    plt.figure(figsize=(6, 4))
    plt.bar(['2021', '2022', '2023'], [25, 35, 42], color='skyblue')
    plt.title('Evolución de la Morosidad del Impuesto Inmobiliario (%)')
    plt.ylabel('Porcentaje de Morosidad')
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.savefig('chris_chart1.png', bbox_inches='tight')
    plt.close()

    # Gráfico 2 - Christhian: Comparativa de Recaudación
    plt.figure(figsize=(6, 4))
    plt.pie([60, 40], labels=['Recaudado', 'No Recaudado'], autopct='%1.1f%%', colors=['#4CAF50', '#F44336'])
    plt.title('Proporción de Recaudación Efectiva (Último Ejercicio)')
    plt.savefig('chris_chart2.png', bbox_inches='tight')
    plt.close()

    # Gráfico 1 - Nelly: Demoras en Compras
    plt.figure(figsize=(6, 4))
    plt.plot(['Q1', 'Q2', 'Q3', 'Q4'], [15, 25, 45, 60], marker='o', color='purple')
    plt.title('Días Promedio de Retraso en Ejecución de Compras')
    plt.ylabel('Días')
    plt.grid(True)
    plt.savefig('nelly_chart1.png', bbox_inches='tight')
    plt.close()

    # Gráfico 2 - Nelly: Ejecución Presupuestaria
    plt.figure(figsize=(6, 4))
    plt.barh(['Obras Públicas', 'Servicios', 'Bienes de Consumo'], [85, 60, 45], color='orange')
    plt.title('Porcentaje de Ejecución Presupuestaria por Rubro')
    plt.xlabel('Porcentaje (%)')
    plt.savefig('nelly_chart2.png', bbox_inches='tight')
    plt.close()

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
    
    p_nota = doc.add_paragraph("(Nota: Haga clic derecho sobre el texto del índice arriba y seleccione 'Actualizar campos' en Word para generar la tabla de contenidos)")
    p_nota.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for r in p_nota.runs:
        r.font.name = 'Times New Roman'
        r.font.size = Pt(10)
        r.italic = True

def format_apa_table(table):
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

def add_apa_table_example(doc, table_num, title, headers, data, nota):
    p_num = doc.add_paragraph()
    run_num = p_num.add_run(f"Tabla {table_num}")
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
    
    table = doc.add_table(rows=1+len(data), cols=len(headers))
    table.style = 'Table Grid'
    
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
    
    for row_idx, row_data in enumerate(data):
        row_cells = table.rows[row_idx+1].cells
        for col_idx, cell_data in enumerate(row_data):
            row_cells[col_idx].text = str(cell_data)
    
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(12)
                    
    p_nota = doc.add_paragraph()
    p_nota.paragraph_format.space_before = Pt(6)
    run_n = p_nota.add_run("Nota. ")
    run_n.italic = True
    run_n.font.name = 'Times New Roman'
    run_n.font.size = Pt(10)
    run_text = p_nota.add_run(nota)
    run_text.font.name = 'Times New Roman'
    run_text.font.size = Pt(10)

def add_apa_figure(doc, fig_num, title, image_path, nota):
    p_num = doc.add_paragraph()
    run_num = p_num.add_run(f"Figura {fig_num}")
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
    
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_img = p_img.add_run()
    r_img.add_picture(image_path, width=Inches(5))
    
    p_nota = doc.add_paragraph()
    p_nota.paragraph_format.space_before = Pt(6)
    run_n = p_nota.add_run("Nota. ")
    run_n.italic = True
    run_n.font.name = 'Times New Roman'
    run_n.font.size = Pt(10)
    run_text = p_nota.add_run(nota)
    run_text.font.name = 'Times New Roman'
    run_text.font.size = Pt(10)

def generate_document(student_data, topic_data, output_filename, chart1, chart2):
    template_path = "TP- TRABAJO DE INVESTIGACIÓN-MONOGRAFÍA.docx"
    doc = docx.Document(template_path)
    
    for section in doc.sections:
        header = section.header
        p_head = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        p_head.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run_head = p_head.add_run()
        add_page_number(run_head)
        run_head.font.name = 'Times New Roman'
        run_head.font.size = Pt(12)
    
    for p in doc.paragraphs:
        if "ALUMNO" in p.text and ":" in p.text:
            p.text = f"ALUMNO\t:\t{student_data['name']}"
        elif "CEDULA DE IDENTIDAD" in p.text:
            p.text = f"CEDULA DE IDENTIDAD N°:\t{student_data['ci']}"
        elif "CARRERA" in p.text:
            p.text = f"CARRERA:\t{student_data['career']}"
    
    for p in doc.paragraphs[20:]:
        p.text = ""

    doc.add_page_break()
    
    sections = topic_data['sections']
    filler_texts = topic_data['fillers']
    
    for title, level, text in sections:
        
        if title == "INTRODUCCIÓN":
            create_toc(doc)
            doc.add_page_break()
            
        add_heading(doc, title, level)
        
        if title == "REFERENCIAS":
            for paragraph_text in text.split('\n'):
                if paragraph_text.strip():
                    p = doc.add_paragraph(paragraph_text)
                    set_hanging_indent(p)
        else:
            for paragraph_text in text.split('\n\n'):
                p = doc.add_paragraph(paragraph_text)
                set_apa_format(p)
                
        # Insertar 2 Gráficos y 2 Tablas
        if title == "RESULTADOS":
            add_apa_table_example(doc, 1, topic_data['table1_title'], topic_data['table1_h'], topic_data['table1_d'], topic_data['table1_n'])
            p = doc.add_paragraph()
            add_apa_figure(doc, 1, topic_data['fig1_title'], chart1, topic_data['fig1_n'])
            p = doc.add_paragraph()

        if title == "ANÁLISIS Y DIAGNÓSTICO":
            add_apa_table_example(doc, 2, topic_data['table2_title'], topic_data['table2_h'], topic_data['table2_d'], topic_data['table2_n'])
            p = doc.add_paragraph()
            add_apa_figure(doc, 2, topic_data['fig2_title'], chart2, topic_data['fig2_n'])
            p = doc.add_paragraph()

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
            for _ in range(12):
                p = doc.add_paragraph(filler_texts['resultados'])
                set_apa_format(p)
        elif title == "ANÁLISIS Y DIAGNÓSTICO":
            for _ in range(12):
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
    generate_charts()
    
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
        'fillers': chris_fillers,
        'table1_title': "Frecuencia de errores en registros catastrales",
        'table1_h': ['Tipo de Error', 'Cantidad', 'Frecuencia Relativa'],
        'table1_d': [['Finca duplicada', 120, '20%'], ['Superficie incorrecta', 250, '41.6%'], ['Titular desactualizado', 230, '38.4%']],
        'table1_n': "Datos extraídos de la muestra aleatoria de 600 expedientes catastrales (2022-2023).",
        'table2_title': "Impacto financiero de la morosidad por periodos",
        'table2_h': ['Periodo', 'Monto Emitido (Gs)', 'Monto Cobrado (Gs)'],
        'table2_d': [['2021', '5.000 Millones', '3.800 Millones'], ['2022', '5.200 Millones', '3.400 Millones'], ['2023', '5.500 Millones', '3.100 Millones']],
        'table2_n': "Elaboración propia con base en informes de la Dirección de Administración y Finanzas.",
        'fig1_title': "Progresión interanual de la tasa de morosidad tributaria",
        'fig1_n': "Se observa una tendencia creciente en los niveles de impago.",
        'fig2_title': "Proporción de Recaudación del Impuesto Inmobiliario",
        'fig2_n': "Más del 40% de los ingresos genuinos previstos no ingresaron a las arcas municipales."
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
        'fillers': nelly_fillers,
        'table1_title': "Tiempos promedios en procesos de licitación pública",
        'table1_h': ['Etapa del Proceso', 'Tiempo Óptimo', 'Tiempo Real'],
        'table1_d': [['Elaboración de Pliego', '15 días', '25 días'], ['Evaluación de Ofertas', '20 días', '45 días'], ['Firma de Contrato', '10 días', '18 días']],
        'table1_n': "Datos extraídos de auditorías internas. Se aprecia un retraso generalizado.",
        'table2_title': "Sub-ejecución del Presupuesto de Gastos por Objeto",
        'table2_h': ['Objeto de Gasto', 'Presupuesto Aprobado', 'Ejecución (%)'],
        'table2_d': [['Serie 100 (Servicios Personales)', '10.000 Millones', '98%'], ['Serie 500 (Inversión Física)', '25.000 Millones', '45%'], ['Serie 200 (Servicios No Personales)', '8.000 Millones', '60%']],
        'table2_n': "El mayor porcentaje de atraso se ubica en el área de inversión física e infraestructura.",
        'fig1_title': "Curva de retrasos trimestrales en adjudicaciones",
        'fig1_n': "Los tiempos de demora se incrementan dramáticamente hacia finales del ejercicio fiscal.",
        'fig2_title': "Nivel de ejecución por tipo de rubro presupuestario",
        'fig2_n': "Se priorizan los gastos corrientes sobre las inversiones de capital, afectando a la ciudadanía."
    }

    generate_document(chris_student, chris_topic, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_ChristhianKeim_Graficos.docx", "chris_chart1.png", "chris_chart2.png")
    generate_document(nelly_student, nelly_topic, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_NellyDeKeim_Graficos.docx", "nelly_chart1.png", "nelly_chart2.png")

if __name__ == "__main__":
    main()
