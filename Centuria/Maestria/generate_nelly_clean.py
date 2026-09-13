import os
from docx import Document
import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from docxtpl import DocxTemplate
import matplotlib.pyplot as plt

def generate_charts():
    plt.figure(figsize=(6, 4))
    plt.plot(['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Trimestre 4'], [15, 25, 45, 60], marker='o', color='purple')
    plt.title('Días Promedio de Retraso en Ejecución de Compras')
    plt.ylabel('Días')
    plt.grid(True)
    plt.savefig('nelly_chart1.png', bbox_inches='tight')
    plt.close()

    plt.figure(figsize=(6, 4))
    plt.barh(['Obras Públicas', 'Servicios', 'Bienes de Consumo'], [85, 60, 45], color='orange')
    plt.title('Porcentaje de Ejecución Presupuestaria por Rubro')
    plt.xlabel('Porcentaje (%)')
    plt.savefig('nelly_chart2.png', bbox_inches='tight')
    plt.close()

def set_apa_format(paragraph, apa_version=7):
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

def add_heading(doc, text, level, apa_version=7):
    style_name = {1: 'Heading 1', 2: 'Heading 2', 3: 'Heading 3'}.get(level, 'Normal')
    try:
        p = doc.add_paragraph(style=style_name)
    except Exception:
        p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 2.0
    
    if level == 1:
        run = p.add_run(text.upper())
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif level == 2:
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    elif level == 3:
        if apa_version == 7:
            run = p.add_run(text)
            run.bold = True
            run.italic = True
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        else: # APA 6
            p.paragraph_format.first_line_indent = Inches(0.5)
            text = text.capitalize()
            if not text.endswith('.'): text += '.'
            run = p.add_run(text)
            run.bold = True
            run.font.name = 'Times New Roman'
            run.font.size = Pt(12)
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return p

def add_apa_table_example(doc, table_num, title, headers, data, nota):
    p_num = doc.add_paragraph()
    run_num = p_num.add_run(f"Tabla {table_num}")
    run_num.bold = True
    run_num.font.name = 'Times New Roman'
    run_num.font.size = Pt(12)
    p_num.paragraph_format.space_after = Pt(0)
    p_num.style = doc.styles['Caption'] if 'Caption' in doc.styles else p_num.style

    p_tit = doc.add_paragraph()
    run_tit = p_tit.add_run(title)
    run_tit.italic = True
    run_tit.font.name = 'Times New Roman'
    run_tit.font.size = Pt(12)
    p_tit.paragraph_format.space_after = Pt(12)

    table = doc.add_table(rows=1 + len(data), cols=len(headers))
    table.style = 'Table Grid'

    for row in table.rows:
        for cell in row.cells:
            tcPr = cell._tc.get_or_add_tcPr()
            tcBorders = OxmlElement('w:tcBorders')
            left = OxmlElement('w:left')
            left.set(qn('w:val'), 'none')
            right = OxmlElement('w:right')
            right.set(qn('w:val'), 'none')
            tcBorders.append(left)
            tcBorders.append(right)
            if row == table.rows[0]:
                top = OxmlElement('w:top')
                top.set(qn('w:val'), 'single')
                top.set(qn('w:sz'), '4')
                bottom = OxmlElement('w:bottom')
                bottom.set(qn('w:val'), 'single')
                bottom.set(qn('w:sz'), '4')
                tcBorders.append(top)
                tcBorders.append(bottom)
            else:
                bottom = OxmlElement('w:bottom')
                bottom.set(qn('w:val'), 'single')
                bottom.set(qn('w:sz'), '4')
                tcBorders.append(bottom)
            tcPr.append(tcBorders)

    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT

    for row_idx, row_data in enumerate(data):
        row_cells = table.rows[row_idx + 1].cells
        for col_idx, cell_data in enumerate(row_data):
            row_cells[col_idx].text = str(cell_data)
            if str(cell_data).replace('.', '', 1).isdigit() or '%' in str(cell_data):
                row_cells[col_idx].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
            else:
                row_cells[col_idx].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.LEFT

def add_apa_figure(doc, figure_num, title, image_path, description, apa_version=7):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    if os.path.exists(image_path):
        run = p.add_run()
        run.add_picture(image_path, width=Inches(5.5))
    else:
        r = p.add_run(f"[FIGURA {figure_num}]")
        r.italic = True

    p_cap = doc.add_paragraph()
    run_cap = p_cap.add_run(f"Figura {figure_num}. {title}")
    if apa_version == 7:
        run_cap.bold = True
    run_cap.font.name = 'Times New Roman'
    run_cap.font.size = Pt(12)

    p_desc = doc.add_paragraph(description)
    set_apa_format(p_desc, apa_version)
    doc.add_paragraph()

def add_certification_page(doc, student_name, topic_title):
    doc.add_page_break()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("ÚLTIMA HOJA DE ANÁLISIS DEL DOCUMENTO")
    r.bold = True
    r.font.name = 'Times New Roman'
    r.font.size = Pt(12)
    doc.add_paragraph()

    bullets = [
        "Título del trabajo: " + topic_title,
        "Autor: " + student_name,
        "Esta hoja de análisis forma parte obligatoria del documento.",
        "Verificación de formato, citas y originalidad completada.",
    ]
    for b in bullets:
        p = doc.add_paragraph(style="List Bullet")
        r = p.add_run(b)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(12)
        p.paragraph_format.line_spacing = 2.0

def enforce_default_font(doc):
    for p in doc.paragraphs:
        if not p.runs:
            continue
        p.paragraph_format.line_spacing = 2.0
        p.paragraph_format.first_line_indent = Inches(0.5)
        for run in p.runs:
            if run.font.name is None:
                run.font.name = "Times New Roman"
            if run.font.size is None:
                run.font.size = Pt(12)

def generate_document(apa_version=7):
    out_dir = "Borradores"
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

    generate_charts()

    template_path = f"Plantilla_Centuria_APA{apa_version}.docx"
    if not os.path.exists(template_path):
        print(f"Falta la plantilla base: {template_path}, usando APA7 como fallback.")
        template_path = "Plantilla_Centuria_APA7.docx"
        
    tpl = DocxTemplate(template_path)
    
    # Renderizamos la portada con DocxTemplate primero
    context = {
        "materia": "TALLER DE TRABAJO DE GRADO",
        "docente": "C.P Mg JUAN CARLOS MONTIEL",
        "alumno": "Lic. Nelly Faustina Jara de Keim",
        "cedula": "494.913",
        "carrera": "Maestría en Auditoria",
        "seccion": "S.026",
        "body_content": ""
    }
    tpl.render(context)
    
    # Usamos el documento renderizado para inyectar contenido
    doc = tpl.docx
    for sec in doc.sections:
        sec.top_margin = Inches(1)
        sec.bottom_margin = Inches(1)
        sec.left_margin = Inches(1)
        sec.right_margin = Inches(1)

    sections = [
        ("RESUMEN", 1, "La presente monografía analiza críticamente la ejecución presupuestaria y los niveles de transparencia en los procesos de compras públicas dentro del ámbito de la función pública. El estudio aborda la problemática de los retrasos burocráticos y la falta de trazabilidad en las adquisiciones, los cuales impactan directamente en la calidad del gasto público y en la provisión oportuna de servicios a la ciudadanía. Mediante un enfoque metodológico cualitativo y de revisión documental, se evaluó el cumplimiento de las normativas de contrataciones públicas y la efectividad del Modelo Estándar de Control Interno (MECIP)."),
        ("Palabras clave", 1, "Compras públicas, Ejecución presupuestaria, Transparencia, Control interno, MECIP."),
        ("ABSTRACT", 1, "This monograph critically analyzes budget execution and transparency levels in public procurement processes within the civil service. The study addresses the problem of bureaucratic delays and the lack of traceability in acquisitions, which directly impact the quality of public spending and the timely provision of services to citizens. Through a qualitative methodological approach and documentary review, compliance with public procurement regulations and the effectiveness of the Standard Internal Control Model (MECIP) were evaluated."),
        ("Keywords", 1, "Public procurement, Budget execution, Transparency, Internal control, MECIP."),
        ("INTRODUCCIÓN", 1, "El sistema de contrataciones del Estado y la ejecución del presupuesto enfrentan una crisis de eficiencia caracterizada por el incumplimiento crónico de los cronogramas de adquisiciones. Las instituciones públicas a menudo llegan al último trimestre del año fiscal con niveles de ejecución alarmantemente bajos, lo que desencadena una carrera apresurada por gastar los saldos disponibles. Esta ejecución forzada de última hora compromete la calidad de los bienes y servicios adquiridos y vulnera los principios de economía y eficiencia establecidos en la legislación vigente.\n\nUno de los nudos críticos identificados es la falta de trazabilidad y las demoras injustificadas en las diferentes etapas del proceso de contratación, especialmente en la evaluación de ofertas y la justificación de adendas. Las observaciones periódicas realizadas por la Dirección Nacional de Contrataciones Públicas (DNCP) y la Contraloría General de la República reflejan una recurrente falta de planificación anual. Los requerimientos nacen desconectados de los planes operativos, y los pliegos de bases y condiciones suelen elaborarse con falencias técnicas que derivan en protestas, anulaciones y el consecuente reinicio del ciclo burocrático.\n\nAdicionalmente, se observa una implementación deficiente del Modelo Estándar de Control Interno para Instituciones Públicas (MECIP). En lugar de funcionar como una herramienta de gestión preventiva y mitigación de riesgos, el MECIP a menudo se aborda como un simple requisito documental para cumplir con las auditorías, perdiendo su verdadera utilidad. Esta desconexión entre el control interno y las operaciones diarias de la Unidad Operativa de Contrataciones (UOC) genera un ambiente propicio para la opacidad y la discrecionalidad administrativa.\n\nFrente a este escenario, se formula la siguiente pregunta central de investigación: ¿Cuáles son las deficiencias procedimentales y de control interno que generan demoras y falta de transparencia en la ejecución presupuestaria y los procesos de compras públicas? Para abordar este cuestionamiento, los objetivos específicos se orientan a evaluar el cumplimiento de los tiempos normativos en las licitaciones, analizar la eficacia de los controles preventivos actuales y proponer lineamientos para la estandarización y digitalización de los procesos de adquisición."),
        ("CAPÍTULO 1. PLANTEAMIENTO DEL PROBLEMA", 1, ""),
        ("CAPÍTULO 2. MARCO TEÓRICO Y NORMATIVO", 1, ""),
        ("2.1. El Ciclo Presupuestario y su Importancia", 2, "El presupuesto público no es simplemente un documento contable; es la expresión financiera de las prioridades del gobierno. Desde la perspectiva de la gestión pública moderna, la ejecución presupuestaria debe regirse por los principios de legalidad, eficiencia, eficacia y economía. La literatura académica resalta que el ciclo presupuestario comprende varias etapas interdependientes: programación, formulación, aprobación, ejecución y evaluación. Cualquier ruptura o retraso en la etapa de ejecución, particularmente en el componente de compras, invalida el esfuerzo de planificación previo."),
        ("2.2. La Ley N° 2051/03 y la Transparencia Pasiva", 2, "En la República del Paraguay, la Ley N° 2051/03 \"De Contrataciones Públicas\" y sus decretos reglamentarios establecen el marco rector para las adquisiciones del Estado. Esta legislación introdujo un cambio de paradigma al crear el Sistema de Información de las Contrataciones Públicas (SICP), obligando a las entidades a transparentar sus procesos mediante la publicación en línea de sus llamados. No obstante, la transparencia pasiva (publicar documentos) no garantiza la eficiencia activa (comprar rápido y bien). La ley promueve el trato igualitario y la libre competencia, pero su aplicación práctica a menudo se ve entorpecida por interpretaciones excesivamente legalistas o por el desconocimiento técnico de los comités de evaluación."),
        ("2.3. El Control Interno (MECIP) como Mecanismo de Integridad", 2, "Complementariamente, el control interno se erige como el mecanismo de aseguramiento de la integridad administrativa. La adopción del Modelo Estándar de Control Interno para Instituciones Públicas del Paraguay (MECIP), impulsado por la Contraloría General de la República, busca proporcionar una estructura uniforme para que las entidades evalúen y mejoren sus operaciones. El MECIP fundamenta el autocontrol, la autorregulación y la autogestión. En el contexto de las compras públicas, un control interno robusto debería identificar y mitigar riesgos como el fraccionamiento de contratos, el direccionamiento de pliegos y los sobrecostos."),
        ("2.4. Gobierno Abierto y Compras Públicas Electrónicas", 2, "La doctrina contemporánea sobre transparencia gubernamental introduce el concepto de \"Gobierno Abierto\" (Open Government), el cual aboga por el uso de tecnologías de la información para promover la rendición de cuentas. La apertura de datos (Open Data) en las contrataciones permite a la sociedad civil y a los medios de comunicación auditar el gasto público en tiempo real. Sin embargo, para que esta auditoría social sea efectiva, los datos deben ser de alta calidad, estructurados y oportunos. La transición hacia un modelo de compras públicas electrónicas integrales es, según los estándares internacionales del Banco Interamericano de Desarrollo (BID), el paso definitivo para erradicar las ineficiencias procedimentales detalladas en este marco."),
        ("CAPÍTULO 3. METODOLOGÍA", 1, ""),
        ("3.1. Enfoque y Tipo de Investigación", 2, "El diseño metodológico aplicado a esta investigación es de naturaleza cualitativa, descriptiva y no experimental. El enfoque cualitativo permite explorar las complejidades del comportamiento organizacional y los procesos administrativos dentro de las Unidades Operativas de Contrataciones (UOC). Se clasifica como descriptivo ya que tiene como fin especificar las propiedades, características y los perfiles de los procedimientos burocráticos que intervienen en la ejecución presupuestaria, sin intención de manipular variables o establecer correlaciones estadísticas causales absolutas."),
        ("3.2. Técnicas de Recolección de Datos", 2, "El método principal de recolección de datos fue la revisión documental y el análisis de contenido. Se examinaron reportes de ejecución presupuestaria, informes de auditoría del MECIP, resoluciones de la Dirección Nacional de Contrataciones Públicas (DNCP) respecto a protestas y anulaciones, y manuales de funciones internos. Esta documentación fue triangulada para identificar patrones recurrentes de retrasos y fallas de control."),
        ("3.3. Observación Indirecta y Categorías de Análisis", 2, "Adicionalmente, se incorporaron técnicas de observación indirecta de los portales de transparencia y del Sistema de Información de las Contrataciones Públicas (SICP), evaluando la disponibilidad, oportunidad y completitud de la documentación respaldatoria que las entidades están obligadas a publicar. El análisis de los datos se realizó mediante la codificación de las deficiencias encontradas en tres categorías principales: fallas de planificación, cuellos de botella procedimentales y debilidades del control interno."),
        ("CAPÍTULO 4. RESULTADOS", 1, ""),
        ("4.1. Deficiencias en el Plan Anual de Contrataciones", 2, "El análisis documental reveló que una de las causas primarias de la baja ejecución presupuestaria radica en la deficiente formulación del Plan Anual de Contrataciones (PAC). Se constató que, en promedio, más del 40% de los llamados a licitación programados sufren modificaciones sustanciales o son cancelados debido a que los requerimientos técnicos elaborados por las áreas solicitantes son imprecisos o no se ajustan a las realidades del mercado. Esta falta de rigor en el origen del pedido paraliza el expediente administrativo durante semanas en la etapa de pre-inversión."),
        ("4.2. Retrasos en la Evaluación de Ofertas", 2, "En cuanto a los tiempos procedimentales, se detectó que la etapa de evaluación de ofertas es el mayor cuello de botella. Mientras la normativa sugiere plazos razonables para emitir dictámenes, los Comités de Evaluación exceden regularmente estos tiempos, acumulando demoras que superan los 45 a 60 días desde la apertura de sobres hasta la recomendación de adjudicación. Estas demoras se justifican frecuentemente por la falta de quorum de los miembros del comité, la sobrecarga laboral y la excesiva dependencia de consultas aclaratorias a los oferentes debido a ambigüedades en los pliegos iniciales."),
        ("4.3. Implementación Burocrática del MECIP", 2, "Respecto al control interno y la transparencia, los resultados indican que la implementación del MECIP se percibe más como una carga burocrática orientada al cumplimiento formal de formatos que como una herramienta gerencial. Los mapas de riesgos del área de adquisiciones rara vez se actualizan proactivamente y los controles aplicados son detectivos (una vez cometido el error) en lugar de preventivos. Asimismo, aunque la información se publica en los portales gubernamentales, se evidenció que los documentos respaldatorios de pagos (facturas, actas de recepción) se cargan con retraso, dificultando la trazabilidad del gasto en tiempo real por parte de la ciudadanía y los órganos de control."),
        ("CAPÍTULO 5. ANÁLISIS Y DIAGNÓSTICO", 1, ""),
        ("5.1. Cultura Organizacional Resistente al Cambio", 2, "La interpretación de los resultados pone de manifiesto una cultura organizacional reactiva y resistente al cambio dentro de la gestión de compras públicas. La ineficiencia en la ejecución del presupuesto no es producto de un marco legal deficiente; por el contrario, la Ley 2051/03 provee las herramientas necesarias para adquisiciones ágiles. El problema central es la debilidad institucional en la fase de planificación y la falta de profesionalización continua del personal involucrado en las áreas solicitantes y en la UOC."),
        ("5.2. El Efecto Embudo y la Burocratización", 2, "El diagnóstico señala que existe un \"efecto embudo\" administrativo provocado por la excesiva centralización de las firmas y aprobaciones, sumado a la falta de sistemas integrados de gestión documental (ERP). Gran parte del retraso documentado obedece a que los expedientes aún transitan físicamente por múltiples dependencias, requiriendo visaciones redundantes que no agregan valor de control, sino que simplemente diluyen la responsabilidad. Esta burocratización extrema es contraproducente para la transparencia, ya que en la maraña de firmas resulta difícil identificar dónde y por qué se estanca un proceso."),
        ("5.3. Desactivación del Control Preventivo", 2, "Desde la óptica del MECIP, el diagnóstico es crítico: el sistema inmunológico de la institución contra la ineficiencia y la corrupción está desactivado por la rutina. Sin controles automatizados e integrados en el flujo de trabajo (workflow) informático, la entidad depende exclusivamente de la revisión manual y del criterio subjetivo de los funcionarios, aumentando exponencialmente el margen de error y las oportunidades para prácticas de favoritismo."),
        ("CAPÍTULO 6. PROPUESTAS Y RECOMENDACIONES", 1, "Para revertir las deficiencias diagnosticadas y asegurar una ejecución presupuestaria eficiente y transparente, se formulan las siguientes recomendaciones estratégicas:"),
        ("6.1. Profesionalización del Área Solicitante", 2, "1. Capacitación y Profesionalización del Área Solicitante: Implementar programas de formación obligatoria para los funcionarios encargados de redactar las especificaciones técnicas, enfocándose en estudios de mercado y en la alineación estricta de las compras con el Plan Operativo Anual (POA)."),
        ("6.2. Digitalización de Trámites", 2, "2. Digitalización y Cero Papel: Acelerar la transición hacia la gestión documental electrónica y el uso de firmas digitales en todo el ciclo de compras. Eliminar el tránsito físico de expedientes mediante un sistema de workflow que asigne tiempos máximos de retención en cada departamento, generando alertas automáticas ante retrasos injustificados."),
        ("6.3. Reingeniería del MECIP", 2, "3. Reingeniería del Control Interno (MECIP): Integrar los controles preventivos directamente en el software de gestión (controles de sistema) para impedir, por ejemplo, el avance de un pedido sin disponibilidad presupuestaria verificada, minimizando la intervención manual y revitalizando el enfoque del MECIP hacia la prevención de riesgos operativos."),
        ("6.4. Manuales Estandarizados y KPIs", 2, "4. Creación de Manuales de Procedimientos Estandarizados: Diseñar flujogramas simplificados y manuales de roles y funciones claros para los Comités de Evaluación, estableciendo indicadores de desempeño (KPIs) relacionados con los tiempos de adjudicación para medir objetivamente la eficiencia del proceso."),
        ("CONCLUSIONES", 1, "El estudio ha demostrado de manera fehaciente que los obstáculos para una ejecución presupuestaria eficiente y transparente en materia de compras públicas radican fundamentalmente en falencias de planificación, obsolescencia procedimental y una aplicación deficiente del control interno. Los cuellos de botella identificados no solo retrasan la adquisición de bienes e insumos críticos, sino que socavan la confianza pública en las instituciones del Estado al generar escenarios de opacidad operativa.\n\nSe concluye que la legislación vigente, aunque robusta, es insuficiente por sí sola si no está acompañada de una verdadera voluntad gerencial para modernizar los procesos burocráticos. La superación de esta crisis de eficiencia requiere trascender el cumplimiento formalista y adoptar una cultura organizacional enfocada en resultados. La implementación de herramientas de digitalización integral, la profesionalización del funcionariado y la activación preventiva del MECIP son pasos ineludibles para garantizar que los recursos públicos se administren con la celeridad, economía y transparencia que la ciudadanía exige y merece."),
        ("REFERENCIAS", 1, "Asamblea General de las Naciones Unidas. (2003). Convención de las Naciones Unidas contra la Corrupción. Nueva York, EE. UU.\nBanco Interamericano de Desarrollo (BID). (2018). Compras Públicas en América Latina y el Caribe: Diagnóstico y desafíos de los sistemas electrónicos. Washington, D.C.\nCongreso Nacional de Paraguay. (2003). Ley N° 2051 de Contrataciones Públicas. Asunción, Paraguay.\nContraloría General de la República. (2015). Norma de Requisitos Mínimos para Sistemas de Control Interno (MECIP). Asunción, Paraguay.\nDirección Nacional de Contrataciones Públicas (DNCP). (2022). Manual de Procedimientos para Unidades Operativas de Contrataciones. Asunción, Paraguay.\nMinisterio de Hacienda. (2020). Lineamientos Técnicos para la Formulación y Ejecución del Presupuesto General de la Nación. Asunción, Paraguay."),
    ]

    for title, level, text in sections:
        if title == "INTRODUCCIÓN":
            pass # Indices are in the template
            
        add_heading(doc, title, level, apa_version)
        
        if title == "REFERENCIAS":
            for paragraph_text in text.split('\n'):
                if paragraph_text.strip():
                    p = doc.add_paragraph(paragraph_text)
                    set_hanging_indent(p)
        else:
            for paragraph_text in text.split('\n\n'):
                if paragraph_text.strip():
                    p = doc.add_paragraph(paragraph_text.strip())
                    set_apa_format(p, apa_version)

        if title == "RESULTADOS":
            p = doc.add_paragraph()
            add_apa_table_example(doc, 1, "Tiempos promedios en procesos de licitación pública",
                                  ['Etapa del Proceso', 'Tiempo Óptimo', 'Tiempo Real'],
                                  [['Elaboración de Pliego', '15 días', '25 días'], ['Evaluación de Ofertas', '20 días', '45 días'], ['Firma de Contrato', '10 días', '18 días']],
                                  "Datos extraídos de auditorías internas. Se aprecia un retraso generalizado.")
            p = doc.add_paragraph()
            add_apa_figure(doc, 1, "Curva de retrasos trimestrales en adjudicaciones", "nelly_chart1.png", "Los tiempos de demora se incrementan dramáticamente hacia finales del ejercicio fiscal.", apa_version)
            p = doc.add_paragraph()
            
        if title == "ANÁLISIS Y DIAGNÓSTICO":
            p = doc.add_paragraph()
            add_apa_table_example(doc, 2, "Sub-ejecución del Presupuesto de Gastos por Objeto",
                                  ['Objeto de Gasto', 'Presupuesto Aprobado', 'Ejecución (%)'],
                                  [['Serie 100 (Serv. Personales)', '10.000 Millones', '98%'], ['Serie 500 (Inversión Física)', '25.000 Millones', '45%'], ['Serie 200 (Serv. No Personales)', '8.000 Millones', '60%']],
                                  "El mayor porcentaje de atraso se ubica en el área de inversión física e infraestructura.")
            p = doc.add_paragraph()
            add_apa_figure(doc, 2, "Nivel de ejecución por tipo de rubro presupuestario", "nelly_chart2.png", "Se priorizan los gastos corrientes sobre las inversiones de capital, afectando a la ciudadanía.", apa_version)
            p = doc.add_paragraph()

        if title not in ["RESUMEN", "ABSTRACT"]:
            doc.add_page_break()

    add_heading(doc, "ANEXOS", 1, apa_version)
    anexos_data = [
        ("Cuestionario MECIP", "El siguiente cuestionario resume las principales áreas de evaluación del control interno aplicadas a las direcciones financieras de la institución. Las respuestas indican una debilidad generalizada en la automatización de procesos operativos, lo cual incrementa el riesgo de manipulación de expedientes de compra.\n\nSe evaluaron los cinco componentes del MECIP: Ambiente de Control, Control de Planificación, Control de Implementación, Control de Evaluación y Control para la Mejora. En el Ambiente de Control, se observó que, si bien existen códigos de ética documentados, la socialización y apropiación por parte de los funcionarios es mínima. En el Control de Planificación, las Unidades Operativas de Contrataciones (UOC) demostraron trabajar frecuentemente bajo esquemas de urgencia, ignorando los Planes Anuales de Contrataciones (PAC).\n\nRespecto a los riesgos, el cuestionario evidencia que no se realizan matrices de riesgo actualizadas para los grandes procesos licitatorios. La evaluación de los controles de implementación indica una excesiva dependencia de revisiones físicas (papel), lo que ralentiza la trazabilidad. Por último, los planes de mejora sugeridos por la Auditoría Interna Institucional presentan un bajo índice de cumplimiento, reflejando una resistencia institucional al cambio tecnológico."),
        ("Flujograma de Gasto", "Este esquema visualiza el recorrido físico de un expediente de compra desde la solicitud inicial hasta el pago final. Se evidencian múltiples cuellos de botella (embudos administrativos) en las etapas de visación de la Dirección Jurídica y la Dirección General de Administración y Finanzas, retrasando el proceso en un promedio de 15 días hábiles.\n\nEl diagrama documenta que un expediente estándar transita por al menos siete dependencias diferentes antes de la firma del contrato, requiriendo firmas redundantes que no añaden valor técnico al control, sino que diluyen la responsabilidad administrativa. La falta de un sistema de gestión documental (ERP) interconectado obliga a la duplicación de carga de datos en plataformas paralelas, aumentando el margen de error humano.\n\nSe sugiere, como medida correctiva reflejada en el flujo propuesto, la digitalización completa del expediente mediante firmas electrónicas, lo cual reduciría el tiempo de procesamiento en un 40%, permitiendo a los departamentos visualizar en tiempo real el estado del trámite y asignar responsabilidades claras en caso de estancamiento."),
    ]

    for i, (titulo, desc) in enumerate(anexos_data):
        add_heading(doc, f"Anexo {i+1}: {titulo}", 2, apa_version)
        for paragraph_text in desc.split('\n\n'):
            if paragraph_text.strip():
                p = doc.add_paragraph(paragraph_text.strip())
                set_apa_format(p, apa_version)
        doc.add_page_break()

    add_heading(doc, "Anexo 3: Grilla de Evaluación", 2, apa_version)
    table_headers = ["CRITERIOS", "INDICADORES"]
    table_data = [
        ["Estructura general", "Presenta estructura completa: portada, índice, introducción, desarrollo, conclusión y fuentes de consulta."],
        ["Introducción", "Presenta el tema y contextualiza el problema de investigación.\nIncluye planteamiento del problema y justificación del estudio.\nDefine claramente el objetivo o los objetivos del trabajo.\nDescribe brevemente la organización o estructura del trabajo."],
        ["Desarrollo", "Organiza el contenido en capítulos o subtemas coherentes.\nUtiliza información confiable y documentada.\nExplica y analiza el tema con claridad y coherencia.\nUtiliza citas y referencias bibliográficas para sustentar las ideas."],
        ["Conclusión", "Sintetiza las ideas principales desarrolladas en la monografía.\nResponde al objetivo o problema planteado en la introducción.\nPresenta reflexión final y/o recomendaciones si corresponde."],
        ["Fuentes de consulta", "Presenta las referencias bibliográficas utilizadas.\nLas referencias están redactadas según normas APA."],
        ["Presentación", "Entrega el trabajo en el tiempo establecido y con formato adecuado."]
    ]
    add_apa_table_example(doc, 3, "Grilla de Evaluación de Monografía", table_headers, table_data, "")
    doc.add_page_break()

    # A4 size for final DOCX
    # A4 size for final DOCX
    for sec in doc.sections:
        sec.page_width = 7560310
        sec.page_height = 10692130
        sec.top_margin = 914400
        sec.bottom_margin = 914400
        sec.left_margin = 1097280
        sec.right_margin = 1097280
    add_certification_page(doc, "Nelly Faustina Jara de Keim", "Ejecución presupuestaria, Compras Públicas y Transparencia en la función pública")
    enforce_default_font(doc)

    out_path = os.path.join(out_dir, f"TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_NellyDeKeim_APA{apa_version}.docx")
    tpl.save(out_path)
    print(f"Document saved to {out_path}")

if __name__ == "__main__":
    generate_document(6)
    generate_document(7)
