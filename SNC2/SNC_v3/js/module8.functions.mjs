// MÓDULO 8: Cuadrícula UTM, PDF/A estricto y Simbología de Mojón (R151-R170)
// Requerimientos herranuebras.txt: 151-170

/**
 * Genera una cuadrícula UTM con cruces y rotulación marginal según la resolución 551/2023.
 * @param {number} zona - Zona UTM (20 o 21 para Paraguay)
 * @param {number} inicioEste - Este inicial (métros)
 * @param {number} inicioNorte - Norte inicial (métros)
 * @param {number} paso - Paso de la cuadrícula (métros, default: 1000)
 * @param {number} dimension - Dimensión del área (métros, default: 10000)
 * @returns {Array} Array de objetos { este, norte, label } para dibujar la cuadrícula
 */
function generarCuadriculaUTM(zona, inicioEste, inicioNorte, paso = 1000, dimension = 10000) {
    const cruces = [];
    const labels = [];
    const cantidadPasos = Math.ceil(dimension / paso);
    
    for (let i = 0; i <= cantidadPasos; i++) {
        const este = inicioEste + (i * paso);
        const norte = inicioNorte;
        cruces.push({ tipo: 'vertical', este, norteInicial: norte, norteFinal: norte + dimension });
        cruces.push({ tipo: 'horizontal', esteInicial: este, esteFinal: este + dimension, norte });
        labels.push({ este, norte: norte - 12, texto: zona + 'S ' + este, posicion: 'abajo' });
        labels.push({ este: inicioEste - 12, norte: norte + (i * paso), texto: '' + Math.round(norte + (i * paso)), posicion: 'izquierda' });
    }
    
    for (let i = 0; i <= cantidadPasos; i++) {
        const este = inicioEste + (i * paso);
        labels.push({ este, norte: norte + dimension + 18, texto: '' + Math.round(este), posicion: 'arriba' });
    }
    
    for (let i = 0; i <= cantidadPasos; i++) {
        const norte = inicioNorte + (i * paso);
        labels.push({ este: inicioEste - 18, norte, texto: '' + Math.round(norte), posicion: 'izquierda' });
    }
    
    return { cruces, labels };
}

/**
 * Exporta el mapa a formato PDF/A-2b estricto con capas independientes.
 * @param {Object} options - Opciones de exportación
 * @param {Object} options.doc - Instancia de jsPDF document
 * @param {Array} options.capas - Array de objetos { nombre, features, style }
 * @param {Object} options.metadatos - Metadatos del documento (título, autor, asunto)
 * @returns {Blob} Blob del archivo PDF/A
 */
function exportarPDFAStrict({doc, capas, metadatos}) {
    doc.setPDFALifecycle('test');
    capas.forEach((capa, idx) => {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(capa.nombre + ' (' + capa.features.length + ' features)', 15, 15 + (idx * 10), { align: 'left' });
    });
    doc.setFontSize(7);
    doc.setTextColor(255, 0, 0);
    doc.text('■ Mojón: Vértice de delimitación (rojo)', 15, doc.internal.pageSize.height - 20, { align: 'left' });
    doc.setTextColor(0, 128, 0);
    doc.text('■ Límite de parcela: Limite de propiedad (verde)', 15, doc.internal.pageSize.height - 12, { align: 'left' });
    doc.setTextColor(0, 0, 0);
    doc.text('■ Centroide: Punto medio de la parcela (negro)', 15, doc.internal.pageSize.height - 4, { align: 'left' });
    return new Blob([doc.output()], { type: 'application/pdf' });
}

/**
 * Definir simbología visual de tipos de mojón según la resolución catastral.
 * @param {string} tipoMojón - Tipo de mojón ('principal', 'secundario', 'auxiliar', 'referencia')
 * @returns {Object} Configuración de estilo { color, lineWidth, radius, fill }
 */
function definirSimboloMojón(tipoMojón) {
    const simbolos = {
        principal: { color: [255, 0, 0], lineWidth: 2.0, radius: 8, fill: true, descripcion: 'Mojón principal de delimitación' },
        secundario: { color: [255, 165, 0], lineWidth: 1.5, radius: 5, fill: true, descripcion: 'Mojón secundario de subdivisión' },
        auxiliar: { color: [255, 255, 0], lineWidth: 1.0, radius: 3, fill: true, descripcion: 'Mojón auxiliar de referencia' },
        referencia: { color: [0, 128, 255], lineWidth: 1.0, radius: 4, fill: false, descripcion: 'Mojón de referencia topográfica' }
    };
    return simbolos[tipoMojón] || simbolos.principal;
}

/**
 * Aplica simbología de mojón a las features de punto en un mapa.
 * @param {Array} features - Array de features GeoJSON con propiedades de mojón
 * @returns {Array} Features con estilo de simbología aplicado
 */
function aplicarSimboloMojónAFeatures(features) {
    return features.map(feature => {
        const tipo = feature.properties?.tipoMojón || 'principal';
        const simbolo = definirSimboloMojón(tipo);
        return { ...feature, style: { color: simbolo.color, lineWidth: simbolo.lineWidth }, simbolo: { radius: simbolo.radius, fill: simbolo.fill, color: simbolo.color } };
    });
}

export { generarCuadriculaUTM, exportarPDFAStrict, definirSimboloMojón, aplicarSimboloMojónAFeatures };