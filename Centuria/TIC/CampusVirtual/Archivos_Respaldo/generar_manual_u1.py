import os
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def add_heading(doc, text, level=1):
    heading = doc.add_heading(text, level=level)
    for run in heading.runs:
        run.font.name = 'Arial'
        if level == 1:
            run.font.color.rgb = RGBColor(0, 51, 102)
        else:
            run.font.color.rgb = RGBColor(0, 102, 204)

doc = Document()
style = doc.styles['Normal']
font = style.font
font.name = 'Arial'
font.size = Pt(11)

# PORTADA
titulo = doc.add_paragraph()
titulo.alignment = WD_ALIGN_PARAGRAPH.CENTER
run_tit = titulo.add_run("INSTITUTO SUPERIOR CENTURIA\nASIGNATURA: T.I.C. (ADE18)\n\n")
run_tit.bold = True
run_tit.font.size = Pt(16)
run_tit.font.color.rgb = RGBColor(0, 51, 102)

run_sub = titulo.add_run("MATERIAL DE LECTURA EXTENSO\nUNIDAD I: Introducción a los Sistemas de Información")
run_sub.bold = True
run_sub.font.size = Pt(14)

doc.add_page_break()

# 1. DEFINICIONES
add_heading(doc, "1. Definiciones y Conceptos Fundamentales", level=1)

p = doc.add_paragraph()
p.add_run("Dato e Información: ").bold = True
p.add_run("Un dato es un hecho aislado (ej. '1500'). Por sí solo carece de utilidad. La información es el dato procesado, estructurado y contextualizado que tiene significado y valor directo para la toma de decisiones (ej. 'Las ventas cayeron a 1500 unidades en septiembre, un 20% menos que en agosto').\n\n")

p.add_run("Sistema de Información (SI): ").bold = True
p.add_run("Conjunto de componentes interrelacionados (Hardware, Software, Datos, Procesos y Personas) que capturan, almacenan, procesan y distribuyen la información para apoyar la toma de decisiones, el control y la coordinación en una organización.\n\n")

p.add_run("Ciclo de Vida de los Sistemas: ").bold = True
p.add_run("Todo sistema nace, se desarrolla y muere. Sus fases son: 1) Nacimiento (Estudio de factibilidad), 2) Desarrollo (Análisis, Diseño y Programación), 3) Operación (Puesta en marcha), 4) Mantenimiento (Corrección de errores y actualizaciones) y 5) Muerte (El sistema se vuelve obsoleto y es reemplazado).\n\n")

p.add_run("Métodos de Adquisición de Sistemas: ").bold = True
p.add_run("\n- Método Tradicional: Desarrollo a medida interno (In-house).\n- Compra de Paquetes: Adquirir software comercial ya hecho (ej. Microsoft Office, SAP).\n- Outsourcing: Tercerizar el desarrollo y mantenimiento a una empresa experta externa.")

doc.add_paragraph()

# 2. ESTUDIOS DE CASOS
add_heading(doc, "2. Estudios de Casos (En las Noticias)", level=1)

p2 = doc.add_paragraph()
p2.add_run("Caso de Estudio A: Las TIC y la Sociedad (El apagón informático de CrowdStrike - Julio 2024)\n").bold = True
p2.add_run("Contexto de la noticia: Un error en la actualización de un software de ciberseguridad (CrowdStrike) provocó que millones de computadoras con Windows colapsaran a nivel mundial. \n")
p2.add_run("Análisis didáctico: Este caso ilustra perfectamente el tema 'Las tecnologías de la información y la sociedad' del programa. Demuestra cómo nuestra sociedad es hiperdependiente de los Sistemas de Información. Un solo fallo de software detuvo vuelos (Delta Airlines perdió cientos de millones de dólares), paralizó bancos y retrasó cirugías en hospitales. Muestra la importancia de la fase de 'Pruebas del sistema' en el ciclo de vida, un paso que fue omitido trágicamente por la empresa.\n\n")

p2.add_run("Caso de Estudio B: Éxito del Outsourcing vs Fracaso del Método Tradicional\n").bold = True
p2.add_run("Contexto de la noticia: El gobierno del Reino Unido intentó desarrollar a medida (Método Tradicional) un Sistema de Información para el Servicio Nacional de Salud (NHS), resultando en uno de los mayores fracasos informáticos, perdiendo más de 10.000 millones de libras.\n")
p2.add_run("Análisis didáctico: En contraposición, muchas aerolíneas deciden utilizar el 'Outsourcing' contratando a Amadeus, una empresa externa experta que provee el sistema de reservas por un pago mensual. Esto demuestra que, aunque el desarrollo a medida parece dar más control, las empresas que no son de tecnología (como un hospital o aerolínea) suelen beneficiarse más comprando paquetes o tercerizando (Outsourcing).")

doc.add_paragraph()

# 3. COMPARACIONES
add_heading(doc, "3. Cuadros y Comparaciones Didácticas", level=1)
doc.add_paragraph("A continuación, se presenta una comparación crítica sobre los métodos de adquisición de sistemas:")

table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr_cells = table.rows[0].cells
hdr_cells[0].text = 'Criterio'
hdr_cells[1].text = 'Método Tradicional (A medida)'
hdr_cells[2].text = 'Outsourcing / Compra de Paquetes'

for cell in hdr_cells:
    for paragraph in cell.paragraphs:
        for run in paragraph.runs:
            run.font.bold = True

row_cells = table.add_row().cells
row_cells[0].text = 'Ajuste a la Empresa'
row_cells[1].text = '100% ajustado a las necesidades exactas.'
row_cells[2].text = 'La empresa debe adaptarse un poco al software estándar.'

row_cells = table.add_row().cells
row_cells[0].text = 'Costo Inicial'
row_cells[1].text = 'Muy alto (requiere contratar programadores y meses de trabajo).'
row_cells[2].text = 'Bajo/Medio (se paga una licencia o mensualidad).'

row_cells = table.add_row().cells
row_cells[0].text = 'Tiempo de Implementación'
row_cells[1].text = 'Largo (meses o años de desarrollo).'
row_cells[2].text = 'Inmediato (el software ya está programado).'

row_cells = table.add_row().cells
row_cells[0].text = 'Mantenimiento'
row_cells[1].text = 'Responsabilidad de la propia empresa (riesgo de que los programadores renuncien).'
row_cells[2].text = 'Garantizado por el proveedor externo experto.'

doc.add_paragraph()

# 4. EJERCITARIOS
add_heading(doc, "4. Ejercitario de Autoevaluación", level=1)
doc.add_paragraph("Responda de forma analítica y extensa las siguientes preguntas basándose en la lectura anterior:")
doc.add_paragraph("1. Explique con sus propias palabras la diferencia entre 'Dato' e 'Información' utilizando el ejemplo de las ventas de un supermercado.")
doc.add_paragraph("2. Basado en el Caso de Estudio A (CrowdStrike), redacte una breve reflexión sobre qué ocurre cuando se salta la fase de 'Pruebas del sistema' en el Ciclo de Vida del software.")
doc.add_paragraph("3. Si usted fuera el gerente de una pequeña panadería que quiere digitalizar su inventario, ¿elegiría el Método Tradicional (contratar un programador para crear un sistema desde cero) o la Compra de Paquetes? Justifique su respuesta utilizando la tabla comparativa.")

doc.add_paragraph()

# 5. BIBLIOGRAFIA
add_heading(doc, "5. Bibliografía y Fuentes Consultadas", level=1)
doc.add_paragraph("- Cohen Kare, Daniel y Asín Lares, Enrique. (2009). Tecnología de información en los Negocios. México: McGraw-Hill. (Capítulos 1 y 2).")
doc.add_paragraph("- The Wall Street Journal (Julio 2024). 'CrowdStrike IT Outage Explained'.")
doc.add_paragraph("- BBC News (2013). 'NHS IT system one of worst fiascos ever'.")

output_path = os.path.join(os.getcwd(), "Material_Lectura_Unidad_1.docx")
doc.save(output_path)
