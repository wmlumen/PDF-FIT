import { logger } from './logger.js';
/**
 * Complementos del Backup
 * Funciones adicionales de utilidad y cálculo geométrico
 * Armoniza funcionalidades del index_backup.html con el index.html modularizado
 */

// ==================== CÁLCULOS GEOMÉTRICOS ====================

/**
 * Calcula la superficie de un polígono en metros cuadrados
 * Usa la fórmula de Shoelace en coordenadas WGS84
 * @param {Object} geometry - Geometría GeoJSON
 * @returns {number} Superficie en m²
 */
export function calcularSuperficie(geometry) {
    const RADIO_TIERRA = 6371000;

    if (!geometry || !geometry.coordinates) return 0;

    const coords = geometry.type === 'Polygon'
        ? geometry.coordinates[0]
        : geometry.type === 'MultiPolygon'
            ? geometry.coordinates[0][0]
            : [];

    if (coords.length < 3) return 0;

    const puntos = coords.map(c => [c[0] * Math.PI / 180, c[1] * Math.PI / 180]);
    let area = 0;

    for (let i = 0; i < puntos.length; i++) {
        const j = (i + 1) % puntos.length;
        area += (puntos[j][0] - puntos[i][0]) * (Math.sin(puntos[i][1]) + Math.sin(puntos[j][1])) / 2;
    }

    return Math.abs(area) * RADIO_TIERRA * RADIO_TIERRA;
}

/**
 * Convierte grados a radianes
 */
export function gradosARadianes(grados) {
    return grados * Math.PI / 180;
}

/**
 * Calcula distancia entre dos puntos (Haversine)
 */
export function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Metro
    const dLat = gradosARadianes(lat2 - lat1);
    const dLon = gradosARadianes(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(gradosARadianes(lat1)) * Math.cos(gradosARadianes(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ==================== EXPORTACIÓN A MÚLTIPLES FORMATOS ====================

/**
 * Exporta reporte de validación a PDF
 * Complementa lo que ya hace Export.generatePDFReport
 */
export function exportarPDFDescargable(results, fileName = 'reporte_validacion.pdf') {
    try {
        if (!window.jspdf) {
            throw new Error('jsPDF no está disponible');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.text('Reporte de Validación SNC', 14, 22);
        doc.setFontSize(12);
        doc.text('Resolución SNC N.º 551/2023', 14, 30);

        // Fecha
        const fecha = new Date().toLocaleDateString('es-PY');
        doc.text(`Fecha: ${fecha}`, 14, 38);

        // Veredicto
        const errores = results.filter(r => r.estado === 'error');
        const veredicto = errores.length === 0 ? 'VÁLIDO' : 'INVÁLIDO';
        const colorVeredicto = errores.length === 0 ? [39, 174, 96] : [220, 53, 69];

        doc.setFontSize(16);
        doc.setTextColor(...colorVeredicto);
        doc.text(`Resultado: ${veredicto}`, 14, 50);
        doc.setTextColor(0, 0, 0);

        // Tabla de resultados
        const tableData = results.map(r => [
            r.campo || 'N/A',
            r.estado?.toUpperCase() || 'N/A',
            r.mensaje || ''
        ]);

        doc.autoTable({
            startY: 60,
            head: [['Campo', 'Estado', 'Mensaje']],
            body: tableData,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [102, 126, 234] }
        });

        // Guardar
        doc.save(fileName);
        return true;

    } catch (error) {
        logger.error('Error exportando PDF:', error);
        return false;
    }
}

/**
 * Exporta reporte de validación a Excel
 * @param {Array} results - Resultados de validación
 * @param {string} fileName - Nombre del archivo
 */
export function exportarExcelDescargable(results, fileName = 'reporte_validacion.xlsx') {
    try {
        if (!window.XLSX) {
            throw new Error('XLSX no está disponible');
        }

        const resultados = results.map(r => ({
            Campo: r.campo,
            Estado: r.estado?.toUpperCase() || 'N/A',
            Mensaje: r.mensaje || '',
            Detalles: r.detalles || ''
        }));

        const ws = XLSX.utils.json_to_sheet(resultados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Resultados');

        XLSX.writeFile(wb, fileName);
        return true;

    } catch (error) {
        logger.error('Error exportando Excel:', error);
        return false;
    }
}

// ==================== GENERADOR DE DBF BÁSICO ====================

/**
 * Genera estructura básica de archivo DBF
 * Para compatibilidad con Shapefiles
 */
export function generarDBF(features) {
    const props = features[0]?.properties || {};
    const fields = Object.keys(props).map(key => ({
        name: key.substring(0, 10).toUpperCase(),
        type: 'C',
        length: 50
    }));

    // Header DBF
    const header = new ArrayBuffer(32 + fields.length * 32);
    const view = new DataView(header);

    view.setUint8(0, 0x03); // dBASE III
    const now = new Date();
    view.setUint8(1, now.getFullYear() - 1900);
    view.setUint8(2, now.getMonth() + 1);
    view.setUint8(3, now.getDate());
    view.setUint32(4, features.length, true);
    view.setUint16(8, 32 + fields.length * 32 + 1, true);
    view.setUint16(10, 32, true);

    // Field descriptors
    for (let i = 0; i < fields.length; i++) {
        const offset = 32 + i * 32;
        const name = fields[i].name;
        for (let j = 0; j < name.length; j++) {
            view.setUint8(offset + j, name.charCodeAt(j));
        }
        view.setUint8(offset + 11, fields[i].type.charCodeAt(0));
        view.setUint8(offset + 16, fields[i].length);
    }

    // Terminator
    view.setUint8(32 + fields.length * 32, 0x0D);

    return new Blob([header]);
}

// ==================== VALIDACIONES COMPLEMENTARIAS ====================

/**
 * Valida estructura básica de archivo Shapefile
 */
export function validarArchivosPresentes(archivos) {
    const ARCHIVOS_OBLIGATORIOS = ['.shp', '.shx', '.dbf', '.prj'];
    const extensionesPresentes = archivos.map(nombre => {
        const partes = nombre.split('.');
        return '.' + partes[partes.length - 1];
    });

    return ARCHIVOS_OBLIGATORIOS.filter(ext => !extensionesPresentes.includes(ext));
}

/**
 * Valida que los campos obligatorios estén presentes en el GeoJSON
 */
export function validarCamposObligatorios(features, camposRequeridos) {
    if (features.length === 0) return { valido: true, mensaje: 'Sin features para validar' };

    const camposPresentes = Object.keys(features[0].properties || {}).map(c => c.toUpperCase());
    const camposFaltantes = camposRequeridos.filter(c => !camposPresentes.includes(c));

    return {
        valido: camposFaltantes.length === 0,
        faltantes: camposFaltantes,
        presentes: camposPresentes
    };
}

// Exportar para uso global
window.calcularSuperficie = calcularSuperficie;
window.gradosARadianes = gradosARadianes;
window.calcularDistancia = calcularDistancia;
window.exportarPDFDescargable = exportarPDFDescargable;
window.exportarExcelDescargable = exportarExcelDescargable;
window.generarDBF = generarDBF;
window.validarArchivosPresentes = validarArchivosPresentes;
window.validarCamposObligatorios = validarCamposObligatorios;
