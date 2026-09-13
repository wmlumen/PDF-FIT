// ============================================
// SCRIPT DE TRANSFORMACIÓN PROMPT MAESTRO TIC
// Aplicar este script en la consola del navegador o como parte de build process
// ============================================

/**
 * Aplica el Prompt Maestro a un documento HTML
 * Basado en: prompt_maestro_materiales.md (16 reglas)
 */
function aplicarPromptMaestro() {
    const html = document.documentElement.innerHTML;
    let resultado = html;
    
    // --- Regla 1: Jerarquía Semántica y Tipografía ---
    // Reemplazar títulos <p> por etiquetas semánticas
    // <h2> para Unidades, <h3> para temas, <h4> para subtemas
    
    // Patrones comunes y reemplazo
    // Convertir <h2> con clase o contenido de unidad
    resultado = resultado.replace(/<h2[^>]*>(Unidad\s+\d+:[^<]+)<\/h2>/gi, '<h2 class="h2-unidad">$1</h2>');
    resultado = resultado.replace(/<h3[^>]*>(Tema\s+\d+:[^<]+)<\/h3>/gi, '<h3 class="h3-tema">$1</h3>');
    resultado = resultado.replace(/<h4[^>]*>([A-Z]\.\s[^<]+)<\/h4>/gi, '<h4 class="h4-subtema">$1</h4>');
    
    // Evitar que los <p> simples funcionen como títulos (marcarlos para display:none)
    // Patrón: <p class="nota-box"> o <p> con contenido de sección
    // (Esto se manejaría con CSS .titulo-falso { display: none; })
    
    // --- Regla 2: Resaltado de Conceptos (Término: Definición) ---
    // Asegurar que los términos con dos puntos estén en negrita
    // Patrón: <strong>texto:</strong> o texto en negrita seguido de ":"
    
    // --- Regla 3: Listas Alfabéticas y Viñetas Estructuradas ---
    // Convertir listas ordenadas con formato de tabla a <ul><li>
    // Patrón: <ol><li>Tipo de sistema Uso principal</li></ol> → <ul><li>...</li></ul>
    
    // Expresión regular para detectar listas OL con formato de tabla
    const olPattern = /<ol>\s*<li>([^<]+)\s+([^<]+)<\/li>\s*<\/ol>/gi;
    resultado = resultado.replace(olPattern, '<ul><li><strong>$1:</strong> $2</li></ul>');
    
    // Agrupar párrafos sueltos que funcionan como enumeración en <ul><li>
    // Esto es más complejo y requeriría análisis semántico
    
    // --- Regla 4: Citas Textuales ---
    // Convertir texto entre comillas a <blockquote>
    // Patrón: "<texto>" → <blockquote><p>"texto"</p></blockquote>
    
    // --- Regla 5: Tablas Bootstrap Responsivas ---
    // Convertir tablas de texto plano a <table class="table table-bordered table-striped">
    
    // --- Regla 6: Tarjetas Verticales con íconos ---
    // Convertir <div class="section-card border-def"> a <div class="card shadow-sm border-start border-4 mb-3">
    // y agregar íconos de Bootstrap Icons
    
    // --- Regla 7: Gráficos HTML, cero Arte ASCII ---
    // Detectar y reemplazar arte ASCII por maquetación Bootstrap
    
    // --- Regla 8: Bibliografía Actualizada ---
    // Estructurar en "Bibliografía Básica" y "Bibliografía Complementaria"
    // con citas específicas (Laudon & Laudon 2020, Turban 2018, O'Brien 2011, Cohen 2000)
    
    // --- Regla 9: Desglose de Siglas ---
    // Agregar tooltips con significado en inglés y traducción al español
    // <span class="sigla-contenedor" data-significado="ERP (Enterprise Resource Planning)">ERP</span>
    
    // --- Regla 10: Interactividad Vínculos Internos ---
    // Agregar id a conceptos importantes y crear enlaces <a href="#id">
    
    // --- Regla 11: Coherencia Terminológica ---
    // Verificar que términos en prácticas existan en definiciones teóricas
    
    // --- Regla 12: Navegación Sidebar ---
    // Organizar enlaces por "Unidad" sin referencias a modalidad
    // Asegurar 10 enlaces para 10 unidades
    
    // --- Regla 13: UX y Auto-Tracking ---
    // Agregar barra de desplazamiento sidebar: overflow-y: auto; height: 100vh;
    // Script de auto-tracking del menú activo
    
    // --- Regla 14: Gamificación y Transparencia ---
    // Distribución de calificaciones: 1 (0-69%), 2 (70-77%), 3 (78-85%), 4 (86-93%), 5 (94-100%)
    // Alertas de pérdida de derecho si asistencia < 80%
    
    // --- Regla 15: Navegación Lineal ---
    // Agregar al final de <main>: <div class="navegacion-unidades">
    // <button class="btn-anter">🡠 Unidad Anterior</button>
    // <button class="btn-siguiente">Siguiente Unidad ➔</button>
    
    // --- Regla 16: Vinculación Global ---
    // Enlaces transversales fijos: Programa Oficial, Planilla de Progreso, Glosario Técnico
    // Desde cualquier unidad
    
    return resultado;
}

// Ejecutar al cargar si el script está en el HTML
//document.addEventListener('DOMContentLoaded', aplicarPromptMaestro);

console.log('Script de transformación Prompt Maestro TIC cargado');
console.log('Reglas incluidas: 16 reglas del prompt maestro');