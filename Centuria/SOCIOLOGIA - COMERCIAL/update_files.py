import os
import re

contenidos = {
    "1": """<div class="highlight-box mt-4">
                    <h3 class="font-bold mb-3 text-green-900 text-sm"><i class="fas fa-list mr-2"></i>Contenidos Oficiales</h3>
                    <p class="text-xs text-gray-700">Sociología y sociólogos: autores y doctrinas. Aparición de la sociología – Los fundadores. Comte: el positivismo sociológico. Spencer: el organicismo evolucionista. Durkheim: el realismo social. Darwin: evolucionismo social. Weber: la sociología comprensiva. Marx: el materialismo histórico. Pareto: mecanicismo y psicologismo. Resumen: doctrinas y escuelas sociológicas.</p>
                </div>""",
    "2": """<div class="highlight-box mt-4">
                    <h3 class="font-bold mb-3 text-green-900 text-sm"><i class="fas fa-list mr-2"></i>Contenidos Oficiales</h3>
                    <p class="text-xs text-gray-700">La esfera de la sociología. Complejidad de la sociología. Fines de la sociología. Tres tareas. Definiciones. El objeto de la sociología. Visión de conjunto. La sociología y la Economía. Especialidades.</p>
                </div>""",
    "3": """<div class="highlight-box mt-4">
                    <h3 class="font-bold mb-3 text-green-900 text-sm"><i class="fas fa-list mr-2"></i>Contenidos Oficiales</h3>
                    <p class="text-xs text-gray-700">El concepto de naturaleza humana. La teoría de los instintos. Criterios de estabilidad. Los orígenes de la cultura. El hombre fuera de la cultura.</p>
                </div>""",
    "4": """<div class="highlight-box mt-4">
                    <h3 class="font-bold mb-3 text-green-900 text-sm"><i class="fas fa-list mr-2"></i>Contenidos Oficiales</h3>
                    <p class="text-xs text-gray-700">La integración del hombre en la sociedad. La búsqueda del equilibrio en la integración. El individualismo. El colectivismo y la masificación. Planificación y manipulación. El primado de las relaciones interpersonales. Democracia: Participación y derechos humanos.</p>
                </div>""",
    "5": """<div class="highlight-box mt-4">
                    <h3 class="font-bold mb-3 text-green-900 text-sm"><i class="fas fa-list mr-2"></i>Contenidos Oficiales</h3>
                    <p class="text-xs text-gray-700">La acción humana: Deliberación y responsabilidad. La libertad absoluta. La libertad condicionada y sus diversos aspectos. La libertad como proyecto de realización humana. El establecimiento de las condiciones sociales, económicas y políticas para la realización humana.</p>
                </div>""",
    "6": """<div class="highlight-box mt-4">
                    <h3 class="font-bold mb-3 text-green-900 text-sm"><i class="fas fa-list mr-2"></i>Contenidos Oficiales</h3>
                    <p class="text-xs text-gray-700">La dinámica del cambio social. Estructura y proceso. La dinámica socioeconómica: leyes del desarrollo social. Modernización y racionalización. Las características de la fase de desarrollo de posguerra. La nueva política económica: el reformismo keynesiano. Cambios asociados: éxodo rural, urbanización e incorporación de la mujer al mundo laboral.</p>
                </div>"""
}

bibliografia = """
        <section class="step-card mb-8 no-print">
            <div class="step-header">
                <div class="step-number"><i class="fas fa-book"></i></div>
                <h2 class="text-xl font-bold uppercase text-secondary">Bibliografía Oficial</h2>
            </div>
            <div class="content-padding text-xs text-gray-700">
                <ul class="list-disc ml-5 space-y-2">
                    <li>Castells, Manuel 1942-, "La era de la información economía, sociedad y cultura", Madrid Alianza 2009</li>
                    <li>Chinoy, Ely: La sociedad, una introducción a la sociología, Fondo de Cultura Económica, México, 5ª. Edición, 1973.</li>
                    <li>Coreth, Emerich. “¿Qué es el hombre? Herder, Madrid, 1980.</li>
                    <li>Gevaert, Joseph. “El problema del hombre”. Sígueme. Salamanca, 1998.</li>
                    <li>Jiménez, Emiliano. “¿Quién soy yo?”. Biblioteca Catecumenal, Madrid, 1992.</li>
                    <li>LUCAS, Juan de S. “El hombre ¿quién es? Edit. Sociedad de Educación. Atenas, 1988</li>
                    <li>LUYPEN, W. “Fenomenología existencial”. Herder, Madrid, 1980.</li>
                    <li>RECONDO, GREGORIO: Sociología y ciencias sociales, introducción a la sociología, Ediciones Pannedille, Buenos Aires, 1971.</li>
                    <li>VIDAL, Marciano. “Moral de actitudes”. P.S. Madrid, 1979.</li>
                    <li>En Antología: De la sociedad tradicional a la sociedad de masas, Departamento de Sociología, Universidad Nacional de Buenos Aires (UNBA), 1961.</li>
                    <li>Manual de Naciones Unidas: Población, desarrollo y salud reproductiva en el Paraguay, Manual para Institutos de Enseñanza Militar, Asunción, 1998.</li>
                    <li>RUMNEY, Jay & Maier, Joseph: Sociología, la ciencia de la sociedad, Editorial Paidos, Buenos Aires. 1952.</li>
                </ul>
            </div>
        </section>
"""

base_dir = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\SOCIOLOGIA"

for i in range(1, 7):
    file_path = os.path.join(base_dir, f"UNIDAD_{i}_MATERIAL_DE_ESTUDIO.html")
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Inject contenidos
    if "Contenidos Oficiales" not in content:
        pattern = r'(<div class="md:col-span-2">\s*<h3 class="font-bold text-lg mb-2">.*?</h3>\s*<p class="text-gray-700 leading-relaxed text-sm">.*?</p>)\s*</div>'
        replacement = r'\1\n                ' + contenidos[str(i)] + '\n                </div>'
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
    # Inject bibliografia
    if "Bibliografía Oficial" not in content:
        content = content.replace("</main>", bibliografia + "\n    </main>")
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Injections complete")
