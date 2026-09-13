import re
import os
import shutil

BASE_DIR = r'C:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\Materiales_HTML_Sabados'

def process_file_lines(filepath):
    """Process file by reading lines, transforming headings and tables, writing back."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    
    # State tracking
    i = 0
    in_ol = False  # Track if we're inside an <ol>
    in_ul = False  # Track if we're inside a <ul>
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # Track <ol> and <ul> context
        if '<ol>' in stripped:
            in_ol = True
            in_ul = False
        elif '</ol>' in stripped:
            in_ol = False
        elif '<ul>' in stripped:
            in_ul = True
            in_ol = False
        elif '</ul>' in stripped:
            in_ul = False
        
        # === Check for unit title ===
        if re.search(r'<p>Unidad\s+[IVXLCDM]+\s*:', stripped):
            # Find the end of this <p>...</p> block
            p_start = i
            p_content_lines = [line]
            j = i + 1
            while j < len(lines) and '</p>' not in lines[j]:
                p_content_lines.append(lines[j])
                j += 1
            if j < len(lines):
                p_content_lines.append(lines[j])
            
            full_p = '\n'.join(p_content_lines)
            if re.search(r'<p>Unidad\s+[IVXLCDM]+\s*:', full_p):
                h2_content = full_p.replace('<p>', '<h2>', 1)
                h2_content = h2_content.replace('</p>', '</h2>', 1)
                new_lines.extend(h2_content.split('\n'))
                i = j + 1
                continue
        
        # === Check for <li> headings (only inside <ol>) ===
        if in_ol:
            li_match = re.match(r'^(\s*)<li>(\d+\.\s+.*)$', stripped)
            if not li_match:
                li_match = re.match(r'^(\s*)<li>([A-Z][a-zA-Z\s].{5,70})$', stripped)
            
            if li_match:
                indent = li_match.group(1)
                li_text = li_match.group(2).strip()
                
                # Check if <li> ends with </li> on same line
                if '</li>' in stripped:
                    new_line = line.replace(f'<li>{li_text}', f'<h3>{li_text}', 1)
                    new_line = new_line.replace('</li>', '</h3>', 1)
                    new_lines.append(new_line)
                    i += 1
                    continue
                else:
                    # Collect all lines until </li>
                    li_lines = [line]
                    j = i + 1
                    while j < len(lines) and '</li>' not in lines[j]:
                        li_lines.append(lines[j])
                        j += 1
                    if j < len(lines):
                        li_lines.append(lines[j])
                    
                    # Convert first line's <li> to <h3>
                    first_line = li_lines[0]
                    new_first = first_line.replace(f'<li>{li_text}', f'<h3>{li_text}', 1)
                    new_lines.append(new_first)
                    
                    for k in range(1, len(li_lines)):
                        new_lines.append(li_lines[k])
                    
                    i = j + 1
                    continue
        
        # === Check for <p> labels that should be <h4> ===
        h4_patterns = [
            'Características:', 'Limitaciones:', 'Definiciones clave:', 'Elementos básicos:',
            'Funciones principales del DBA:', 'Tipos de DBA:', 'Modelos tradicionales:',
            'Modelos modernos:', 'Componentes típicos:', 'Beneficios:',
            'Diferencias con base de datos transaccional:', 'Características principales:',
            'Integrado:', 'Temporal:', 'No volátil:', 'Orientado a temas:',
            'Fuentes de datos:', 'Proceso ETL:', 'Almacén central:', 'Herramientas de BI:',
            'Análisis histórico:', 'Toma de decisiones:', 'Rendimiento:', 'Calidad de datos:',
            'Definiciones complementarias:', 'Módulos funcionales típicos:',
            'Beneficios de implementar un ERP:', 'Costos de implementación de un ERP',
            'Categorías de costos:', 'Modelos de costos:',
            'Costo Total de Propiedad (TCO', 'Costos de adquisición',
            'Costos de implementación', 'Costos operativos anuales',
            'Costos de mantenimiento y soporte', 'Costos de actualización',
            'Costos de oportunidad', 'Fases para determinar requerimientos',
            'Análisis de procesos actuales', 'Mapeo de procesos de negocio',
            'Identificación de cuellos de botella', 'Detección de necesidades de mejora',
            'Definición de requisitos funcionales', 'Qué debe hacer el sistema',
            'Módulos necesarios', 'Funcionalidades específicas por área',
            'Definición de requisitos técnicos', 'Infraestructura requerida',
            'Integraciones necesarias', 'Seguridad y cumplimiento normativo',
            'Escalabilidad futura', 'Priorización de requerimientos',
            'Críticos vs. deseables', 'Alineación con estrategia empresarial',
            'Documentación del RFP', 'Factores a considerar',
            'Criterios de evaluación técnica', 'Metodología de evaluación',
            'Indicadores financieros clave', 'Ejemplo de evaluación financiera',
            'Componentes del análisis financiero', 'Proyección de beneficios',
            'Análisis de sensibilidad', 'Estudio costo-beneficio',
            'Actividades principales:', 'Capacitación y formación del personal',
            'Capacitación por roles y niveles de usuario',
            'Materiales de referencia y documentación', 'Sesiones prácticas con el sistema',
            'Limpieza y validación de datos', 'Mapeo de campos y estructuras',
            'Pruebas de integridad de datos migrados',
            'Definición de parámetros y reglas de negocio',
            'Desarrollo de funcionalidades a medida (si aplica)',
            'Pruebas unitarias por módulo', 'Pruebas de integración entre módulos',
            'Pruebas de rendimiento y carga', 'Pruebas de aceptación por usuarios',
            'Plan de implementación (por fases o big bang)',
            'Soporte intensivo durante los primeros días', 'Monitoreo de incidencias',
            'Corrección de errores y ajustes', 'Optimización continua del sistema',
            'Factores críticos de éxito post-contrato:',
            'Compromiso de la alta dirección', 'Gestión del cambio organizacional',
            'Comunicación efectiva con todos los stakeholders',
            'Plan de proyecto detallado con hitos claros',
            'Equipo de implementación dedicado', 'Capacitación adecuada y oportuna',
            'Soporte técnico disponible',
            'Desarrollo de parámetros y reglas de negocio',
        ]
        
        is_h4 = False
        for pattern in h4_patterns:
            if stripped.startswith(f'<p>{pattern}') or stripped == f'<p>{pattern}</p>':
                is_h4 = True
                break
        
        if is_h4 and '<strong>' not in stripped:
            # Convert <p> to <h4>
            h4_line = stripped.replace('<p>', '<h4>', 1)
            if '</p>' in h4_line:
                h4_line = h4_line.replace('</p>', '</h4>', 1)
            new_lines.append(h4_line)
            i += 1
            continue
        
        # === Check for table-like <p> ===
        # Look for <p> with multiple spaces indicating table columns
        if '<p>' in stripped and re.search(r'\s{2,}', stripped) and '</p>' not in stripped:
            # This might be a table paragraph - collect all lines until </p>
            table_lines = [line]
            j = i + 1
            while j < len(lines) and '</p>' not in lines[j]:
                table_lines.append(lines[j])
                j += 1
            if j < len(lines):
                table_lines.append(lines[j])
            
            # Check if it's really a table
            full_table_text = '\n'.join(table_lines)
            if re.search(r'\s{2,}', full_table_text) and len(table_lines) >= 2:
                # Parse the table
                table_content = re.sub(r'<p>', '', full_table_text)
                table_content = re.sub(r'</p>', '', table_content)
                
                rows_raw = table_content.strip().split('\n')
                all_rows = []
                for r in rows_raw:
                    r = r.strip()
                    if not r:
                        continue
                    cells = re.split(r'\s{2,}', r)
                    cells = [c.strip() for c in cells if c.strip()]
                    if cells:
                        all_rows.append(cells)
                
                if len(all_rows) >= 2:
                    # Build table HTML
                    table_html = '<div class="table-responsive"><table class="table table-bordered">'
                    table_html += '<thead><tr>'
                    for cell in all_rows[0]:
                        table_html += f'<th>{cell}</th>'
                    table_html += '</tr></thead><tbody>'
                    for row in all_rows[1:]:
                        table_html += '<tr>'
                        for cell in row:
                            table_html += f'<td>{cell}</td>'
                        table_html += '</tr>'
                    table_html += '</tbody></table></div>'
                    
                    new_lines.append(table_html)
                    i = j + 1
                    continue
        
        # Default: keep line as is
        new_lines.append(line)
        i += 1
    
    # Write back
    new_content = '\n'.join(new_lines)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    return True

def main():
    processed = 0
    
    # Process clase_03 and clase_04
    for filename in ['clase_03.html', 'clase_04.html']:
        filepath = os.path.join(BASE_DIR, filename)
        print(f"\n{'='*60}")
        print(f"Processing: {filename}")
        print(f"{'='*60}")
        
        result = process_file_lines(filepath)
        if result:
            processed += 1
            print(f"  [OK] Processed.")
        else:
            print(f"  [FAIL] Failed.")
    
    # clase_05, clase_06, clase_11 have minimal content
    for filename in ['clase_05.html', 'clase_06.html', 'clase_11.html']:
        filepath = os.path.join(BASE_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        start = content.find('<div class="section-card border-def">')
        if start != -1:
            mb5 = content.find('<div class="mb-5">', start)
            if mb5 != -1:
                ss = mb5 + len('<div class="mb-5">')
                ns = content.find('<div class="section-card', ss)
                sec = content[ss:ns] if ns != -1 else content[ss:ss+2000]
                if '<ol>' in sec or '<p>Unidad' in sec:
                    print(f"\nProcessing: {filename}")
                    result = process_file_lines(filepath)
                    if result:
                        processed += 1
                        print(f"  [OK] Processed.")
                    else:
                        print(f"  [SKIP] Minimal content.")
                else:
                    print(f"\n{filename}: Minimal content (no <ol> or <p>Unidad), skipped.")
            else:
                print(f"\n{filename}: No mb-5 div, skipped.")
        else:
            print(f"\n{filename}: No development section, skipped.")
    
    print(f"\n{'='*60}")
    print(f"PROCESO COMPLETADO: {processed} archivos fueron procesados.")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
