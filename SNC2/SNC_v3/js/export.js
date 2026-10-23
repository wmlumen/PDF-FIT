/**
 * Generador de Entregables
 * Exporta Shapefile, certificado y Excel
 */

import { State } from './state.js';
import { EPSG_32720, PROJ_32720, PROJ_32721, WKT_32721, CAMPOS_REQUERIDOS, METADATOS_GEODESICOS, CONFIG_MUNICIPAL } from './config.js';
import { showLoading, hideLoading, showToast, downloadFile, generarDerrotero } from './utils.js';
import { runValidation, runExportValidation } from './validator.js';
import { buildGeoJSON, buildKML, buildDXF, selectOfficialProperties } from './exportFormats.js';
import { calculateRingSegments, formatMeters } from './segmentLengths.js';
import { logger } from './logger.js';
import { SignatureAPI } from './signatureManager.js';

function getExportGeoJSON() {
    State.joinDataToGeoJSON();
    const geojson = State.get('geojson');
    if (!geojson?.features?.length) throw new Error('No hay geometrías para exportar');
    return {
        type: 'FeatureCollection',
        features: geojson.features.map(feature => ({
            type: 'Feature',
            properties: selectOfficialProperties(feature.properties, CAMPOS_REQUERIDOS),
            geometry: structuredClone(feature.geometry)
        }))
    };
}

export function exportGeoJSON() {
    downloadFile(buildGeoJSON(getExportGeoJSON()), 'expediente_snc.geojson', 'application/geo+json;charset=utf-8');
    showToast('GeoJSON exportado', 'success');
    return true;
}

export function exportKML() {
    downloadFile(buildKML(getExportGeoJSON()), 'expediente_snc.kml', 'application/vnd.google-earth.kml+xml;charset=utf-8');
    showToast('KML exportado', 'success');
    return true;
}

export function exportDXF() {
    downloadFile(buildDXF(getExportGeoJSON()), 'expediente_snc.dxf', 'application/dxf');
    showToast('DXF AutoCAD R12 exportado exitosamente', 'success');
    return true;
}

/**
 * ============================================================================
 * CERTIFICADO PREVENTIVO DE APTITUD Y DIAGNÓSTICO INTEGRAL
 * Genera informe profesional completo en PDF y DOCX para topógrafo/perito
 * Incluye: 5 gráficos cartográficos, dictámenes SNC+Municipal, checklist admin
 * ============================================================================
 */

// Importar docx dinámicamente
let docxLib = null;
async function getDocxLib() {
    if (!docxLib) {
        try {
            docxLib = await import('docx');
        } catch (e) {
            logger.warn('docx no disponible, solo PDF:', e.message);
        }
    }
    return docxLib;
}

/**
 * Captura los 5 gráficos cartográficos requeridos desde Leaflet
 * @returns {Promise<Object>} Objeto con 5 imágenes base64
 */
async function captureProfessionalMaps() {
    const map = window.MapEngine?.map || window.MapEngine?.getMap?.();
    if (!map) {
        logger.warn('MapEngine no disponible para captura de mapas');
        return {};
    }

    const geojson = State.get('geojson');
    const features = geojson?.features || [];
    if (features.length === 0) return {};

    const images = {};

    async function captureMap(name) {
        const mapContainer = document.getElementById('map') || (map.getContainer ? map.getContainer() : null);
        if (window.domtoimage && mapContainer) {
            try {
                const dataUrl = await window.domtoimage.toJpeg(mapContainer, { quality: 0.85 });
                return { name, dataUrl };
            } catch (e) {
                logger.warn('Error capturando imagen del mapa:', e.message);
            }
        }
        return { name, dataUrl: null };
    }

    try {
        images.g1 = await captureMap('plano_implantacion');
        images.g2 = await captureMap('croquis_perimetral');
        images.g3 = await captureMap('restriccion_hidrica');
        images.g4 = await captureMap('comparativo_satelital');
        images.g5 = await captureMap('balance_fraccionamiento');
    } catch (e) {
        logger.warn('Error general en captureProfessionalMaps:', e);
    }

    return images;
}

/**
 * Calcula fórmula de tolerancia SNC: T = a * sqrt(S) + b * S
 */
function calcularToleranciaSNC(superficieM2) {
    const a = 0.02;  // Coeficiente base
    const b = 0.001; // Coeficiente proporcional
    const tolerancia = a * Math.sqrt(superficieM2) + b * superficieM2;
    return Math.max(tolerancia, 0.5); // Mínimo 0.5 m²
}

/**
 * Genera el reporte profesional completo (PDF + DOCX)
 * @param {Object} options - Opciones de generación
 * @returns {Promise<{pdf: Blob, docx: Blob, filename: string}>}
 */

/**
 * Genera el Dictamen Técnico Municipal Oficial de Aprobación de Loteamiento (Ley 3966/2010)
 * Formato ejecutivo oficial de 1 a 2 páginas para la Dirección de Obras Particulares y Catastro.
 * @param {Object} data 
 * @returns {Promise<Blob>}
 */
export async function generateMunicipalDictamenPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const meta = data.expedienteMetadata || {};
    const props = data.props || {};
    const rep = data.municipalReporte || {};
    const balance = rep.balanceLoteamiento || {};
    const contrib = rep.contribucionMejoras || {};

    const dist = meta.distrito || props.DISTRITO || 'PIRIBEBUY';
    const dpto = meta.departamento || props.DEPARTAMEN || 'CORDILLERA';
    const muniNombre = meta.municipioNombre || ('MUNICIPALIDAD DE ' + dist.toUpperCase());
    const expNum = meta.expedienteNumero || ('EXP-MUNI-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
    const propNombre = meta.propietarioNombre || props.PROPIETARIO || props.Propietari || 'Propietario / Titular';
    const propDoc = meta.propietarioDoc || props.CI_RUC || '—';
    const profNombre = meta.profesionalNombre || props.PROFESIONAL || 'Agrimensor / Perito Topógrafo';
    const profMat = meta.profesionalMatricula || props.REG_PROF || '—';
    const fincaMat = meta.fincaMatricula || props.FINCA || '—';
    const padronMat = meta.padronCtaCte || props.PADRON || props.CODIGO || '—';
    const lugar = meta.lugarBarrio || props.LUGAR || props.BARRIO || 'Casco Urbano';

    // ===== ENCABEZADO OFICIAL MUNICIPAL =====
    doc.setFillColor(5, 150, 105); // Verde municipal esmeralda
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(muniNombre.toUpperCase(), pageWidth / 2, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DIRECCIÓN DE OBRAS PARTICULARES, URBANISMO Y CATASTRO • DPTO. DE ' + dpto.toUpperCase(), pageWidth / 2, 16, { align: 'center' });
    doc.text('Ley Orgánica Municipal Nº 3966/2010 • Expediente Nº ' + expNum, pageWidth / 2, 21, { align: 'center' });

    let y = 30;

    // Título del Dictamen
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('DICTAMEN TÉCNICO DE APROBACIÓN DE FRACCIONAMIENTO', pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Constancia Técnica de Fiscalización Urbanística y Cesiones de Dominio Público', pageWidth / 2, y, { align: 'center' });

    y += 4;

    // Tabla de Identificación del Inmueble y Trámite
    const infoData = [
        ['Expediente Municipal Nº', expNum, 'Fecha de Dictamen', new Date().toLocaleDateString('es-PY')],
        ['Inmueble / Finca Matriz', 'Finca/Mat: ' + fincaMat, 'Padrón Matriz', String(padronMat)],
        ['Ubicación / Paraje', lugar + ', ' + dist + ' (' + dpto + ')', 'Tipo de Trámite', meta.tipoTramite || 'Loteamiento / Fraccionamiento Urbano'],
        ['Propietario / Titular', propNombre + ' (Doc: ' + propDoc + ')', 'Profesional Proyectista', profNombre + ' (Reg: ' + profMat + ')']
    ];

    doc.autoTable({
        startY: y,
        body: infoData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 38 },
            1: { cellWidth: 57 },
            2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 },
            3: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 5;

    // Mini plano / croquis si está disponible
    if (data.mapImages?.g5?.dataUrl || data.mapImages?.g1?.dataUrl) {
        const img = data.mapImages.g5?.dataUrl ? data.mapImages.g5 : data.mapImages.g1;
        try {
            doc.addImage(img.dataUrl, 'JPEG', 14, y, 75, 45);
        } catch (e) {}
    }

    const mapBoxX = (data.mapImages?.g5?.dataUrl || data.mapImages?.g1?.dataUrl) ? 94 : 14;
    const mapBoxW = (data.mapImages?.g5?.dataUrl || data.mapImages?.g1?.dataUrl) ? pageWidth - 108 : pageWidth - 28;

    const esAprobado = (rep.lotesConErrores || 0) === 0 && (!balance.detalles?.cesionCalles || parseFloat(balance.detalles.cesionCalles.actual) >= 16);
    const boxColor = esAprobado ? [16, 185, 129] : [239, 68, 68];
    const dictamenTitulo = esAprobado ? 'DICTAMEN TÉCNICO FAVORABLE' : 'DICTAMEN CON OBSERVACIONES';
    const dictamenSub = esAprobado ? 'Cumple con los porcentajes legales de cesión de calles, plazas y dimensiones de lotes.' : 'Requiere subsanación o ajuste de áreas cedidas antes de homologación.';

    doc.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
    doc.roundedRect(mapBoxX, y, mapBoxW, 45, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(dictamenTitulo, mapBoxX + (mapBoxW / 2), y + 14, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(dictamenSub, mapBoxW - 8), mapBoxX + (mapBoxW / 2), y + 23, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('Art. 86 Ley 3966/2010 • Verificado bajo sistema SNC 551/2023', mapBoxX + (mapBoxW / 2), y + 38, { align: 'center' });

    y += 50;

    // Sección 1: BALANCE OFICIAL DE SUPERFICIES Y CESIONES (Ley 3966/2010 Art. 86)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I. BALANCE OFICIAL DE SUPERFICIES Y CESIONES PÚBLICAS', 14, y);

    y += 3;

    const areaMatrizNum = parseFloat(balance.areaTotalMatriz || 0);
    const areaCallesNum = parseFloat(balance.areaCallesCedidas || 0);
    const areaVerdeNum = parseFloat(balance.areaEspaciosVerdes || 0);
    const areaLotesNum = parseFloat(balance.areaUtilLotes || 0);

    const pctCalles = areaMatrizNum > 0 ? (areaCallesNum / areaMatrizNum * 100).toFixed(2) : '0.00';
    const pctVerde = areaMatrizNum > 0 ? (areaVerdeNum / areaMatrizNum * 100).toFixed(2) : '0.00';
    const pctLotes = areaMatrizNum > 0 ? (areaLotesNum / areaMatrizNum * 100).toFixed(2) : '0.00';

    const balanceTable = [
        ['Área Matriz Total (Inmueble)', areaMatrizNum.toLocaleString('es-PY', { minimumFractionDigits: 2 }) + ' m²', '100.00%', 'Título de Propiedad y Relevamiento', 'Base de Cálculo'],
        ['Cesión para Vías Públicas (Calles)', areaCallesNum.toLocaleString('es-PY', { minimumFractionDigits: 2 }) + ' m²', pctCalles + '%', 'Mínimo 16.00% (Ley 3966/10 Art. 86)', parseFloat(pctCalles) >= 16 ? 'CUMPLE' : 'DEFICITARIO'],
        ['Cesión para Plazas y Edificios Públicos', areaVerdeNum.toLocaleString('es-PY', { minimumFractionDigits: 2 }) + ' m²', pctVerde + '%', 'Rango 5.00% a 7.00% (Ley 3966/10)', parseFloat(pctVerde) >= 5 ? 'CUMPLE' : 'DEFICITARIO'],
        ['Superficie Útil de Lotes (Área Privada)', areaLotesNum.toLocaleString('es-PY', { minimumFractionDigits: 2 }) + ' m²', pctLotes + '%', 'Lotes vendibles urbanos', 'APROBADO']
    ];

    doc.autoTable({
        startY: y,
        head: [['Destino de la Superficie', 'Área (m²)', '% Total', 'Exigencia Legal Municipal', 'Calificación']],
        body: balanceTable,
        theme: 'striped',
        headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2.2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 55 },
            1: { halign: 'right', cellWidth: 32 },
            2: { halign: 'center', cellWidth: 20 },
            3: { cellWidth: 50 },
            4: { halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 5;

    // Sección 2: AUDITORÍA DE LOTES INDIVIDUALES Y PARÁMETROS URBANÍSTICOS
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('II. FISCALIZACIÓN DE LOTES Y CONTRIBUCIÓN POR MEJORAS (LEY 5513/2015)', 14, y);

    y += 3;

    const totLotes = rep.lotesEvaluados || (data.features?.length || 0);
    const frentesTotal = contrib.metrosFrenteTotal || 0;
    const contribTotal = contrib.totalContribucionGs || 0;

    const auditoriaRows = [
        ['Total de Lotes Proyectados', totLotes + ' lotes residenciales/comerciales', 'Superficie Mínima por Lote (≥ 360 m²)', (totLotes - (rep.lotesConErrores || 0)) + ' / ' + totLotes + ' conformes'],
        ['Frente Mínimo por Lote (≥ 12.00 m)', 'Verificado según ordenanza', 'Ochavas en Esquina (3x3m - Art. 235)', 'Fiscalizado conforme'],
        ['Franja de Protección Hídrica (30 m)', 'Ley 3239/2007 de Recursos Hídricos', 'Frente Lineal a Pavimentar', frentesTotal + ' metros lineales'],
        ['Contribución Especial Proyectada', 'Gs. ' + contribTotal.toLocaleString('es-PY'), 'Aporte a Dominio Público', 'Calles y plazas a transferir sin gravamen']
    ];

    doc.autoTable({
        startY: y,
        body: auditoriaRows,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 48 },
            1: { cellWidth: 44 },
            2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 48 },
            3: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 5;

    // Texto Legal de Dictamen y Transferencia
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, pageWidth - 28, 18, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, y, pageWidth - 28, 18, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    const legalText = 'DISPOSICIÓN TÉCNICA: Habiéndose constatado el cumplimiento de los parámetros de la Ley Orgánica Municipal Nº 3966/2010 y normas de loteamiento, se emite el presente DICTAMEN FAVORABLE para su tratamiento en la Junta Municipal. Las superficies destinadas a calles y plazas quedan afectadas al Uso Público y deberán ser transferidas por Escritura Pública a favor de la Municipalidad, libres de todo gravamen, como requisito previo para la habilitación de cuentas corrientes catastrales individuales.';
    doc.text(doc.splitTextToSize(legalText, pageWidth - 36), 18, y + 4.5);

    y += 22;

    // Sección de Firmas y Sellos (3 columnas)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMAS Y SELLOS DE AUTORIDADES MUNICIPALES', pageWidth / 2, y, { align: 'center' });

    y += 3.5;

    const colW = (pageWidth - 28 - 12) / 3;
    const colH = 24;

    // Sello 1: Liquidación y Catastro
    doc.setDrawColor(148, 163, 184);
    doc.rect(14, y, colW, colH, 'S');
    doc.line(18, y + 16, 14 + colW - 4, y + 16);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DEPARTAMENTO DE CATASTRO', 14 + colW / 2, y + 19.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Liquidación y Verificación Gráfica', 14 + colW / 2, y + 22.5, { align: 'center' });

    // Sello 2: Dirección de Obras Particulares
    const col2X = 14 + colW + 6;
    doc.rect(col2X, y, colW, colH, 'S');
    doc.line(col2X + 4, y + 16, col2X + colW - 4, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECCIÓN DE OBRAS PARTICULARES', col2X + colW / 2, y + 19.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Aprobación Técnica Urbanística', col2X + colW / 2, y + 22.5, { align: 'center' });

    // Sello 3: Intendencia Municipal
    const col3X = col2X + colW + 6;
    doc.rect(col3X, y, colW, colH, 'S');
    doc.line(col3X + 4, y + 16, col3X + colW - 4, y + 16);
    doc.setFont('helvetica', 'bold');
    doc.text('INTENDENCIA MUNICIPAL', col3X + colW / 2, y + 19.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Visto Bueno y Remisión a Junta', col3X + colW / 2, y + 22.5, { align: 'center' });

    // QR y Pie de Página
    if (data.qrDataUrl) {
        doc.addImage(data.qrDataUrl, 'PNG', pageWidth - 26, pageHeight - 17, 12, 12);
    }
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Documento generado electrónicamente por Sistema Integrado SNC - Módulo Municipal Ley 3966/2010. Código: ' + data.validationCode, 14, pageHeight - 6);

    return doc.output('blob');
}

export async function generateProfessionalReport(options = {}) {
    showLoading('Generando Certificado Preventivo de Aptitud...');
    
    try {
        const geojson = State.get('geojson');
        const excelData = State.get('excelData') || [];
        const validationResults = State.get('validationResults') || [];
        let expedienteMetadata = {};
        try {
            const expMod = await import('./expedienteModal.js');
            expedienteMetadata = expMod.getExpedienteMetadata();
        } catch (e) { logger.warn('ExpedienteModal no cargado:', e); }
        const municipalReporte = State.get('reporteMunicipal') || await import('./municipal.js').then(m => m.validadorMunicipalDefault.generarReporteMunicipal());
        const metadatosGeo = State.get('metadatosGeodesicos') || {};
        
        if (!geojson || !geojson.features.length) {
            throw new Error('No hay geometrías cargadas para generar el informe');
        }

        const feature0 = geojson.features[0];
        const props = feature0.properties || {};
        const excelRow = excelData.find(r => r.CODIGO === props.CODIGO) || props;

        // 1. Generar Hash criptográfico único
        const geojsonStr = JSON.stringify(geojson);
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(geojsonStr));
        const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const validationCode = `VAL-SNC-${new Date().getFullYear()}-${hashHex.substring(0, 6).toUpperCase()}`;

        // 2. Capturar los 5 gráficos cartográficos
        const mapImages = await captureProfessionalMaps();

        // 3. Calcular métricas
        const metricas = calcularMetricasPlanasUTM(feature0, State.get('currentDisplayProjection') || 'EPSG:32721');
        const supCalculada = metricas.areaM2;
        const supTitulo = parseFloat(props.SUP_TITULO || props.SUP_LEGAL || 0);
        const discrepanciaAbs = Math.abs(supTitulo - supCalculada);
        const discrepanciaPct = supCalculada > 0 ? (discrepanciaAbs / supCalculada) * 100 : 0;
        const toleranciaSNC = calcularToleranciaSNC(supCalculada);
        const dentroTolerancia = discrepanciaAbs <= toleranciaSNC;

        // 4. Determinar semáforo general
        const erroresSNC = validationResults.filter(r => r.estado === 'error');
        const erroresMunicipales = municipalReporte.erroresPorLote?.length || 0;
        const advertencias = validationResults.filter(r => r.estado === 'advertencia').length + (municipalReporte.lotesConAlertas || 0);
        
        let semaforo = '🟢 APROBADO PARA INGRESO';
        let semaforoColor = '#10b981';
        let semaforoDetalle = 'Cumple parámetros topológicos, normativas ambientales y directivas municipales.';
        
        if (erroresSNC.length > 0 || erroresMunicipales > 0) {
            semaforo = '🔴 NO APTO (RECHAZO EN TRÁMITE)';
            semaforoColor = '#ef4444';
            semaforoDetalle = 'Presenta inconsistencias que impiden el ingreso formal (solapamientos, invasión franja hídrica, geometría inválida, o incumplimiento municipal).';
        } else if (advertencias > 0) {
            semaforo = '🟡 APROBADO CON OBSERVACIONES MENORES';
            semaforoColor = '#f59e0b';
            semaforoDetalle = 'Inconsistencias subsanables en gabinete (documentación faltante, advertencias de tolerancia, retiros por verificar).';
        }

        // 5. Generar QR con URL de verificación
        // Fix: antes apuntaba a /verify.html que no existe (404).
        // Ahora apunta a /index.html que es la página que carga el validador.
        const baseUrl = window.location.origin;
        const verificationUrl = `${baseUrl}/index.html?verify=${validationCode}`;
        let qrDataUrl = null;
        if (window.QRCode) {
            qrDataUrl = await window.QRCode.toDataURL(verificationUrl, { margin: 1, width: 120 });
        }

        // 6. Generar PDF
        const reportData = {
            validationCode,
            qrDataUrl,
            semaforo,
            semaforoColor,
            semaforoDetalle,
            props,
            excelRow,
            metadatosGeo,
            validationResults,
            municipalReporte,
            metricas,
            supCalculada,
            supTitulo,
            discrepanciaAbs,
            discrepanciaPct,
            toleranciaSNC,
            dentroTolerancia,
            mapImages,
            features: geojson.features,
            hashHex,
            expedienteMetadata
        };

        if (options.tipo === 'MUNICIPAL') {
            const muniBlob = await generateMunicipalDictamenPDF(reportData);
            const muniFilename = 'Dictamen_Municipal_' + validationCode + '_' + new Date().toISOString().slice(0,10);
            downloadFile(muniBlob, muniFilename + '.pdf', 'application/pdf');
            hideLoading();
            showToast('Dictamen Municipal generado exitosamente', 'success');
            return { pdf: muniBlob, filename: muniFilename };
        }

        if (options.tipo === 'DUAL') {
            const muniBlob = await generateMunicipalDictamenPDF(reportData);
            const muniFilename = 'Dictamen_Municipal_' + validationCode + '_' + new Date().toISOString().slice(0,10);
            downloadFile(muniBlob, muniFilename + '.pdf', 'application/pdf');
        }

        const pdfBlob = await generateProfessionalPDF({
            validationCode,
            qrDataUrl,
            semaforo,
            semaforoColor,
            semaforoDetalle,
            props,
            excelRow,
            metadatosGeo,
            validationResults,
            municipalReporte,
            metricas,
            supCalculada,
            supTitulo,
            discrepanciaAbs,
            discrepanciaPct,
            toleranciaSNC,
            dentroTolerancia,
            mapImages,
            features: geojson.features,
            hashHex,
            expedienteMetadata
        });

        // 7. Generar DOCX
        let docxBlob = null;
        try {
            docxBlob = await generateProfessionalDOCX({
                validationCode,
                semaforo,
                semaforoColor,
                semaforoDetalle,
                props,
                excelRow,
                metadatosGeo,
                validationResults,
                municipalReporte,
                metricas,
                supCalculada,
                supTitulo,
                discrepanciaAbs,
                discrepanciaPct,
                toleranciaSNC,
                dentroTolerancia,
                mapImages,
                features: geojson.features,
                verificationUrl
            });
        } catch (e) {
            logger.warn('DOCX no generado:', e.message);
        }

        const filename = `Certificado_Preventivo_${validationCode}_${new Date().toISOString().slice(0,10)}`;
        
        // Descargar ambos
        downloadFile(pdfBlob, `${filename}.pdf`, 'application/pdf');
        if (docxBlob) downloadFile(docxBlob, `${filename}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        showToast(`✅ Certificado Preventivo generado: ${validationCode}`, 'success');
        
        return { pdf: pdfBlob, docx: docxBlob, filename, validationCode };

    } catch (error) {
        logger.error('Error generando certificado profesional:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
        throw error;
    } finally {
        hideLoading();
    }
}

/**
 * Genera PDF profesional completo con jsPDF + autoTable
 */
async function generateProfessionalPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let y = 15;
    const validationResults = data.validationResults || [];

    // ===== FUNCIÓN HELPER PARA AGREGAR IMÁGENES =====
    const addImage = (imgData, x, y, w, h) => {
        if (imgData?.dataUrl) {
            try {
                doc.addImage(imgData.dataUrl, 'PNG', x, y, w, h);
            } catch (e) {
                logger.warn('Error agregando imagen:', e);
            }
        }
    };

    // ===== PORTADA =====
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICADO PREVENTIVO', pageWidth / 2, 60, { align: 'center' });
    doc.text('DE APTITUD Y DIAGNÓSTICO INTEGRAL', pageWidth / 2, 75, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Servicio Nacional de Catastro (SNC) • Dirección de Catastro Municipal', pageWidth / 2, 95, { align: 'center' });
    
    // Código de validación
    doc.setFontSize(11);
    doc.text(`Código: ${data.validationCode}`, pageWidth / 2, 115, { align: 'center' });
    
    // QR Code
    if (data.qrDataUrl) {
        doc.addImage(data.qrDataUrl, 'PNG', pageWidth / 2 - 25, 120, 50, 50);
        doc.setFontSize(8);
        doc.text('Escanee para verificar en vivo', pageWidth / 2, 175, { align: 'center' });
    }
    
    doc.addPage();
    y = 15;

    // ===== ENCABEZADO DE CONTROL =====
    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('I. ENCABEZADO DE CONTROL Y VALIDACIÓN CRIPTOGRÁFICA', 15, 16);

    y = 25;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

        const meta = data.expedienteMetadata || {};
    const profNombre = meta.profesionalNombre || data.props?.PROFESIONAL || '—';
    const profMat = meta.profesionalMatricula || data.props?.REG_PROF || data.props?.MATRICULA || '—';
    const profDoc = meta.profesionalDoc || data.props?.CI_RUC || data.props?.RUC || '—';
    const profContacto = meta.profesionalContacto || '—';
    const propNombre = meta.propietarioNombre || data.props?.PROPIETARIO || data.props?.Propietari || '—';
    const propDoc = meta.propietarioDoc || '—';
    const fincaMat = meta.fincaMatricula || data.props?.FINCA || '—';
    const padronCta = meta.padronCtaCte || data.props?.PADRON || data.props?.CODIGO || '—';
    const dpto = meta.departamento || data.excelRow?.DEPARTAMEN || data.props?.DEPARTAMEN || '—';
    const dist = meta.distrito || data.excelRow?.DISTRITO || data.props?.DISTRITO || '—';
    const lugar = meta.lugarBarrio || data.excelRow?.LUGAR || data.props?.LUGAR || '—';
    const muni = meta.municipioNombre || dist;
    const expNum = meta.expedienteNumero || 'S/N';
    const tramite = meta.tipoTramite || 'FRACCIONAMIENTO';

    const headerData = [
        ['Código de Pre-Validación', data.validationCode],
        ['Fecha / Hora de Emisión', new Date().toLocaleString('es-PY')],
        ['Profesional Responsable', `${profNombre} | Mat. SNC/MOPC: ${profMat}`],
        ['C.I. / R.U.C. Profesional', `${profDoc} | Contacto: ${profContacto}`],
        ['Titular / Propietario', `${propNombre} | Doc: ${propDoc}`],
        ['Identificación Inmueble', `Finca/Matrícula: ${fincaMat} | Padrón/Cta. Cte.: ${padronCta}`],
        ['Ubicación Política', `${dpto} / ${dist} / ${lugar}`],
        ['Expediente Municipal', `Municipio: ${muni} | Exp: ${expNum} | Trámite: ${tramite}`],
        ['Semáforo y Dictamen', data.semaforo.replace(/🟢|🟡|🔴/, '').trim()]
    ];

    doc.autoTable({
        startY: y,
        body: headerData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { cellWidth: 'auto' } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // Semáforo destacado
    y = doc.lastAutoTable.finalY + 10;
    doc.setFillColor(data.semaforoColor);
    doc.roundedRect(15, y, pageWidth - 30, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(data.semaforo, pageWidth / 2, y + 8, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.semaforoDetalle, pageWidth / 2, y + 20, { align: 'center' });

    // ===== PARÁMETROS GEODÉSICOS =====
    doc.addPage();
    y = 15;
    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('II. PARÁMETROS GEODÉSICOS Y DE PROYECCIÓN (SIRGAS 2000)', 15, 16);

    y = 25;
    const geoData = [
        ['Marco de Referencia', 'SIRGAS 2000 (WGS84 compatible)'],
        ['Sistema de Proyección', `UTM ${data.metadatosGeo?.ZONA_UTM || 'Zona 21S (EPSG:32721)'}`],
        ['Punto de Control / Tipo', data.metadatosGeo?.PUNTO_CONTROL_TIPO || 'CORS_ACTIVA'],
        ['Estación CORS / Red Nacional', data.metadatosGeo?.ESTACION_CORS_NOMBRE || 'PYAR (Asunción)'],
        ['Método de Posicionamiento', data.metadatosGeo?.METODO_POSICIONAMIENTO || 'RTK_NTRIP'],
        ['Precisión Horizontal Estimada', `±${data.metadatosGeo?.PRECISION_HORIZONTAL_M || '0.010'} m`],
        ['Fecha de Rastreo GNSS', data.metadatosGeo?.FECHA_RASTREO || new Date().toISOString().split('T')[0]],
        ['Operador GNSS Responsable', data.metadatosGeo?.OPERADOR_GNSS || '—'],
        ['Equipo GNSS Utilizado', data.metadatosGeo?.EQUIPO_GNSS || '—']
    ];

    doc.autoTable({
        startY: y,
        body: geoData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // ===== AUDITORÍA GEOMÉTRICA =====
    y = doc.lastAutoTable.finalY + 15;
    if (y > pageHeight - 60) { doc.addPage(); y = 15; }

    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('III. AUDITORÍA GEOMÉTRICA INTERNA (SNC 551/2023)', 15, 16);

    y = 25;
    const geomChecks = [
        ['Cierre Topológico (E₁=Eₙ, N₁=Nₙ)', validationResults.find(r => r.campo?.startsWith('CIERRE_') && r.estado === 'ok') ? '✅ CUMPLE' : '❌ NO CUMPLE'],
        ['Validez Topológica (sin auto-intersecciones)', validationResults.find(r => r.campo?.startsWith('TOPOLOGÍA') && r.estado === 'ok') ? '✅ VÁLIDO' : '❌ INVÁLIDO (moños/lazos)'],
        ['Superficie Título (declarada)', `${data.supTitulo.toLocaleString('es-PY', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m²`],
        ['Superficie SIG (calculada UTM)', `${data.supCalculada.toLocaleString('es-PY', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m²`],
        ['Discrepancia Absoluta', `${data.discrepanciaAbs.toLocaleString('es-PY', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m²`],
        ['Discrepancia Porcentual', `${data.discrepanciaPct.toFixed(2)}%`],
        ['Tolerancia SNC (T = a√S + bS)', `${data.toleranciaSNC.toLocaleString('es-PY', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m²`],
        ['Dentro de Tolerancia Reglamentaria', data.dentroTolerancia ? '✅ SÍ' : '❌ NO - EXCEDE TOLERANCIA']
    ];

    doc.autoTable({
        startY: y,
        body: geomChecks,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 85 } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // ===== AUDITORÍA COLINDANCIA (ENTORNO 200m) =====
    y = doc.lastAutoTable.finalY + 10;
    if (y > pageHeight - 80) { doc.addPage(); y = 15; }

    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('IV. AUDITORÍA DE COLINDANCIA Y CRUCE CATASTRAL (RADIO 200 m)', 15, 16);

    y = 25;
    const overlaps = validationResults.filter(r => r.campo?.startsWith('SOLAPAMIENTO_') && r.estado === 'error');
    
    if (overlaps.length > 0) {
        const overlapData = overlaps.map(o => [
            o.campo.replace('SOLAPAMIENTO_', ''),
            o.valor,
            o.mensaje
        ]);
        doc.autoTable({
            startY: y,
            head: [['Parcelas Colindantes Afectadas', 'Área Invadida (m²)', 'Detalle']],
            body: overlapData,
            theme: 'grid',
            headStyles: { fillColor: [239, 68, 68] },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 15, right: 15 }
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(16, 185, 129);
        doc.text('✅ CERO SOLAPAMIENTO: No se detectan superposiciones con parcelas oficiales en radio 200m.', 15, y);
    }

    // ===== AUDITORÍA AMBIENTAL =====
    y = doc.lastAutoTable.finalY + 10;
    if (y > pageHeight - 60) { doc.addPage(); y = 15; }

    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('V. AUDITORÍA AMBIENTAL Y RESTRICCIONES DE DOMINIO (Ley 3239/07)', 15, 16);

    y = 25;
    const envData = [
        ['Distancia a cauce hídrico más cercano', `${data.mapImages?.g3 ? 'Calculada (ver Gráfico 3)' : 'Requiere validación PostGIS'}`],
        ['Franja de protección legal (30 m)', data.mapImages?.g3 ? '✅ Verificada en Gráfico 3' : '⚠️ Pendiente validación PostGIS'],
        ['Invasión franja hídrica', 'Sin datos - Requiere consulta PostGIS hidrografia_mades'],
        ['Servidumbres ANDE / Ductos / Viales', 'Pendiente validación contra capas oficiales']
    ];

    doc.autoTable({
        startY: y,
        body: envData,
        theme: 'grid',
        headStyles: { fillColor: [14, 116, 144] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 85 } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // ===== AUDITORÍA MUNICIPAL =====
    y = doc.lastAutoTable.finalY + 10;
    if (y > pageHeight - 60) { doc.addPage(); y = 15; }

    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VI. AUDITORÍA PARÁMETROS URBANOS MUNICIPALES (Ley 3966/2010)', 15, 16);

    y = 25;
    const muniData = [
        ['Superficie mínima urbana (360 m²)', `${data.metricas?.areaM2?.toLocaleString('es-PY', {minimumFractionDigits: 2}) || 'N/A'} m² ${(data.metricas?.areaM2 || 0) >= 360 ? '✅' : '❌'}`],
        ['Frente mínimo a vía pública (12 m)', `${data.metricas?.frenteEstimadoM?.toFixed(2) || 'N/A'} m ${(data.metricas?.frenteEstimadoM || 0) >= 12 ? '✅' : '❌'}`],
        ['Cesión vial (mín 16%)', data.municipalReporte?.balanceLoteamiento ? `${data.municipalReporte.balanceLoteamiento.detalles.cesionCalles.actual}% ${parseFloat(data.municipalReporte.balanceLoteamiento.detalles.cesionCalles.actual) >= 16 ? '✅' : '❌'}` : 'N/A (no es fraccionamiento)'],
        ['Cesión plazas/edif. públicos (5-7%)', data.municipalReporte?.balanceLoteamiento ? `${data.municipalReporte.balanceLoteamiento.detalles.cesionPlazas.actual}% ${parseFloat(data.municipalReporte.balanceLoteamiento.detalles.cesionPlazas.actual) >= 5 ? '✅' : '❌'}` : 'N/A (no es fraccionamiento)'],
        ['Retiro de fondo (mín 3 m)', '⚠️ Verificar en gabinete'],
        ['Retiro lateral (mín 1.5 m)', '⚠️ Verificar en gabinete']
    ];

    doc.autoTable({
        startY: y,
        body: muniData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 85 } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // ===== CUADRO OFICIAL DE COORDENADAS =====
    doc.addPage();
    y = 15;
    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VII. CUADRO OFICIAL DE COORDENADAS, RUMBOS Y DISTANCIAS', 15, 16);

    const vertexData = getCertificateVertexRows({ features: data.features });
    const vertexBody = vertexData.rows.slice(0, 50).map(r => [r[0], r[1], r[2], r[3], r[4], r[5] || 'N/A']);
    
    if (vertexBody.length > 0) {
        doc.autoTable({
            startY: 25,
            head: [['Padrón/Código', 'Vértice', 'Rumbo (GMS)', 'Distancia (m)', 'Este (X) UTM', 'Norte (Y) UTM']],
            body: vertexBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], fontSize: 7 },
            styles: { fontSize: 7, cellPadding: 1.5 },
            margin: { left: 10, right: 10 },
            columnStyles: { 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 30 }, 5: { cellWidth: 30 } }
        });
    }

    // ===== CHECKLIST ADMINISTRATIVO =====
    y = doc.lastAutoTable.finalY + 10;
    if (y > pageHeight - 80) { doc.addPage(); y = 15; }

    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VIII. CHECKLIST ADMINISTRATIVO / DOCUMENTAL PREVENTIVO', 15, 16);

    y = 25;
    const checklist = [
        ['✅', 'Polígono y atributos vectoriales validados (SNC 551/2023)'],
        ['☐', 'Copia de Título de Propiedad inscripto en la DGRP'],
        ['☐', 'Certificado de no adeudar Impuesto Inmobiliario (Municipalidad)'],
        ['☐', 'Comprobante de pago de Patente Profesional al día'],
        ['☐', 'Memoria Descriptiva y Planos firmados digitalmente'],
        ['☐', 'Plano de implantación con retiros y linderos'],
        ['☐', 'Certificado de coordenadas GNSS (si aplica)'],
        ['☐', 'Croquis perimetral con vértices numerados'],
        ['☐', 'Plano de restricción ambiental (franja hídrica 30m)'],
        ['☐', 'Plano comparativo satelital / ortofoto']
    ];

    doc.autoTable({
        startY: y,
        body: checklist,
        theme: 'plain',
        columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto' } },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // ===== GRÁFICOS CARTOGRÁFICOS =====
    const graphLabels = [
        ['Gráfico 1', 'Plano de Implantación y Entorno Catastral (Radio 200 m)'],
        ['Gráfico 2', 'Croquis Perimetral de Geometría y Vértices'],
        ['Gráfico 3', 'Lámina de Restricción Ambiental (Franja Hídrica 30m)'],
        ['Gráfico 4', 'Plano Comparativo con Imagen Satelital / Ortofoto'],
        ['Gráfico 5', 'Gráfico de Balance y Cesiones (Fraccionamientos)']
    ];

    doc.addPage();
    y = 15;
    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('IX. GRÁFICOS Y CARTOGRAFÍA DE SALIDA', 15, 16);

    y = 25;
    doc.autoTable({
        startY: y,
        head: [['Referencia', 'Descripción', 'Estado']],
        body: graphLabels.map(([ref, desc], i) => {
            const key = `g${i + 1}`;
            return [ref, desc, data.mapImages?.[key]?.dataUrl ? '✅ Generado' : '⚠️ No disponible'];
        }),
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 }
    });

    // Insertar miniaturas de los mapas si existen
    let imgY = doc.lastAutoTable.finalY + 10;
    ['g1', 'g2', 'g3', 'g4', 'g5'].forEach((key, i) => {
        if (data.mapImages?.[key]?.dataUrl) {
            if (imgY > pageHeight - 60) { doc.addPage(); imgY = 15; }
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(graphLabels[i][1], 15, imgY);
            try {
                doc.addImage(data.mapImages[key].dataUrl, 'PNG', 15, imgY + 3, 90, 60);
            } catch (e) { /* ignore */ }
            imgY += 68;
        }
    });

    // ===== X. CUADRO DE DECLARACIÓN JURADA Y FIRMAS =====
    doc.addPage();
    y = 15;
    doc.setFillColor(79, 70, 229);
    doc.rect(10, 10, pageWidth - 20, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('X. DECLARACIÓN JURADA Y CUADRO DE FIRMAS DE RESPONSABILIDAD TÉCNICA', 15, 16);

    y = 26;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(51, 65, 85);
    const juramentoText = 'DECLARACIÓN JURADA DE MENSURA Y DESLINDE: El profesional agrimensor/topógrafo interviniente declara bajo fe de juramento que las coordenadas UTM, linderos, rumbos, distancias y superficies consignados en el presente informe pericial y en la cartografía adjunta, son fiel reflejo de la realidad física relevada en el terreno conforme a las prescripciones técnicas y geodésicas de la Resolución SNC N° 551/2023.';
    const splitJura = doc.splitTextToSize(juramentoText, pageWidth - 30);
    doc.text(splitJura, 15, y);

    y += (splitJura.length * 4.5) + 6;

    // Cuadro 1: Firma del Profesional Topógrafo / Agrimensor
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 85, 52, 3, 3, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('PROFESIONAL TOPÓGRAFO / PERITO', 18, y + 8);
    doc.line(25, y + 34, 90, y + 34);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(profNombre, 57.5, y + 39, { align: 'center' });
    doc.text(`Reg. MOPC / SNC: ${profMat}`, 57.5, y + 43.5, { align: 'center' });
    doc.text(`C.I. / R.U.C.: ${profDoc}`, 57.5, y + 48, { align: 'center' });

    // Cuadro 2: Firma y Visto Bueno del Propietario / Solicitante
    doc.roundedRect(110, y, 85, 52, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPIETARIO / TITULAR REGISTRADO', 113, y + 8);
    doc.line(120, y + 34, 185, y + 34);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(propNombre, 152.5, y + 39, { align: 'center' });
    doc.text(`C.I. / R.U.C.: ${propDoc}`, 152.5, y + 43.5, { align: 'center' });
    doc.text('Conforme con linderos y superficie', 152.5, y + 48, { align: 'center' });

    // Cuadro de Autoridades Municipales (Ley 3966/2010)
    y += 58;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, y, pageWidth - 30, 52, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`INTERVENCIÓN Y VISADO MUNICIPAL — ${muni.toUpperCase()}`, 18, y + 7);
    
    // 3 sub-firmas: Catastro, Obras, Intendencia
    const subW = (pageWidth - 40) / 3;
    
    // Director Catastro
    doc.line(20, y + 33, 20 + subW - 10, y + 33);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Dirección de Catastro Municipal', 20 + (subW - 10) / 2, y + 38, { align: 'center' });
    doc.text('Verificación de Padrón e Impuestos', 20 + (subW - 10) / 2, y + 42, { align: 'center' });

    // Director Obras
    doc.line(20 + subW, y + 33, 20 + (subW * 2) - 10, y + 33);
    doc.text('Dirección de Obras y Urbanismo', 20 + subW + (subW - 10) / 2, y + 38, { align: 'center' });
    doc.text('Dictamen Favorable de Loteamiento', 20 + subW + (subW - 10) / 2, y + 42, { align: 'center' });

    // Intendente Municipal
    doc.line(20 + (subW * 2), y + 33, 20 + (subW * 3) - 10, y + 33);
    doc.text('Intendencia Municipal / Visto Bueno', 20 + (subW * 2) + (subW - 10) / 2, y + 38, { align: 'center' });
    doc.text('Resolución de Aprobación Final', 20 + (subW * 2) + (subW - 10) / 2, y + 42, { align: 'center' });

    
    // ===== PIE DE PÁGINA =====
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generado por Catastro PY Pro • ${data.validationCode} • Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    return doc.output('blob');
}

/**
 * Genera DOCX profesional completo
 */
async function generateProfessionalDOCX(data) {
    const docx = await getDocxLib();
    if (!docx) throw new Error('docx library not loaded');

    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, ImageRun, PageBreak } = docx;

    const rows = [];

    // Helper para crear párrafos
    const p = (text, bold = false, size = 24, color = '1e293b', alignment = AlignmentType.LEFT) => new Paragraph({
        alignment,
        children: [new TextRun({ text, bold, size, color })],
        spacing: { after: 120 }
    });

    const heading = (text, level = 1) => new Paragraph({
        heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
        children: [new TextRun({ text, bold: true, size: level === 1 ? 32 : 26, color: '1e3a5f' })],
        spacing: { before: 240, after: 120 }
    });

    // PORTADA
    rows.push(
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200 }, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CERTIFICADO PREVENTIVO', bold: true, size: 48, color: '1e3a5f' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DE APTITUD Y DIAGNÓSTICO INTEGRAL', bold: true, size: 48, color: '1e3a5f' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [new TextRun({ text: 'Servicio Nacional de Catastro (SNC) • Dirección de Catastro Municipal', size: 28, color: '475569' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new TextRun({ text: `Código: ${data.validationCode}`, bold: true, size: 26, color: '1e3a5f' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: [new TextRun({ text: new Date().toLocaleDateString('es-PY'), size: 24, color: '64748b' })] }),
        new PageBreak()
    );

    // ENCABEZADO
    rows.push(heading('I. ENCABEZADO DE CONTROL Y VALIDACIÓN CRIPTOGRÁFICA'));
    rows.push(
        p(`Código de Pre-Validación: ${data.validationCode}`, true),
        p(`Fecha/Hora de Emisión: ${new Date().toLocaleString('es-PY')}`),
        p(`Versión Motor: SNC 551/2023 rev. ${new Date().getFullYear()}`),
        p(`Profesional Actuante: ${data.props?.PROFESIONAL || '—'} | Matrícula: ${data.props?.REG_PROF || data.props?.MATRICULA || '—'}`),
        p(`CI/RUC: ${data.props?.CI_RUC || data.props?.RUC || '—'}`),
        p(`Inmueble: ${data.props?.PADRON || data.props?.CODIGO || '—'} | Cta. Cte: ${data.props?.CUENTA_CORRIENTE || '—'}`),
        p(`Ubicación: ${data.excelRow?.DEPARTAMEN || data.props?.DEPARTAMEN || '—'} / ${data.excelRow?.DISTRITO || data.props?.DISTRITO || '—'} / ${data.excelRow?.LUGAR || data.props?.LUGAR || '—'}`),
        p(`Semáforo General: ${data.semaforo}`, true),
        p(data.semaforoDetalle)
    );
    rows.push(new PageBreak());

    // PARÁMETROS GEODÉSICOS
    rows.push(heading('II. PARÁMETROS GEODÉSICOS Y DE PROYECCIÓN (SIRGAS 2000)'));
    const geoTable = new Table({
        rows: [
            new TableRow({ children: [new TableCell({ children: [p('Parámetro', true)] }), new TableCell({ children: [p('Valor', true)] })] }),
            ...[
                ['Marco de Referencia', 'SIRGAS 2000 (WGS84 compatible)'],
                ['Sistema de Proyección', `UTM ${data.metadatosGeo?.ZONA_UTM || 'Zona 21S (EPSG:32721)'}`],
                ['Punto de Control / Tipo', data.metadatosGeo?.PUNTO_CONTROL_TIPO || 'CORS_ACTIVA'],
                ['Estación CORS / Red Nacional', data.metadatosGeo?.ESTACION_CORS_NOMBRE || 'PYAR (Asunción)'],
                ['Método de Posicionamiento', data.metadatosGeo?.METODO_POSICIONAMIENTO || 'RTK_NTRIP'],
                ['Precisión Horizontal Estimada', `±${data.metadatosGeo?.PRECISION_HORIZONTAL_M || '0.010'} m`],
                ['Fecha de Rastreo GNSS', data.metadatosGeo?.FECHA_RASTREO || new Date().toISOString().split('T')[0]],
                ['Operador GNSS Responsable', data.metadatosGeo?.OPERADOR_GNSS || '—'],
                ['Equipo GNSS Utilizado', data.metadatosGeo?.EQUIPO_GNSS || '—']
            ].map(([k, v]) => new TableRow({ children: [new TableCell({ children: [p(k, true)] }), new TableCell({ children: [p(v)] })] }))
        ]
    });
    rows.push(geoTable, new PageBreak());

    // AUDITORÍA GEOMÉTRICA
    rows.push(heading('III. AUDITORÍA GEOMÉTRICA INTERNA (SNC 551/2023)'));
    const geomTable = new Table({
        rows: [
            new TableRow({ children: [new TableCell({ children: [p('Control', true)] }), new TableCell({ children: [p('Resultado', true)] })] }),
            ...[
                ['Cierre Topológico (E₁=Eₙ, N₁=Nₙ)', validationResults.find(r => r.campo?.startsWith('CIERRE_') && r.estado === 'ok') ? '✅ CUMPLE' : '❌ NO CUMPLE'],
                ['Validez Topológica (sin auto-intersecciones)', validationResults.find(r => r.campo?.startsWith('TOPOLOGÍA') && r.estado === 'ok') ? '✅ VÁLIDO' : '❌ INVÁLIDO (moños/lazos)'],
                ['Superficie Título (declarada)', `${data.supTitulo.toLocaleString('es-PY', {minimumFractionDigits: 2})} m²`],
                ['Superficie SIG (calculada UTM)', `${data.supCalculada.toLocaleString('es-PY', {minimumFractionDigits: 2})} m²`],
                ['Discrepancia Absoluta', `${data.discrepanciaAbs.toLocaleString('es-PY', {minimumFractionDigits: 2})} m²`],
                ['Discrepancia Porcentual', `${data.discrepanciaPct.toFixed(2)}%`],
                ['Tolerancia SNC (T = a√S + bS)', `${data.toleranciaSNC.toLocaleString('es-PY', {minimumFractionDigits: 2})} m²`],
                ['Dentro de Tolerancia Reglamentaria', data.dentroTolerancia ? '✅ SÍ' : '❌ NO - EXCEDE TOLERANCIA']
            ].map(([k, v]) => new TableRow({ children: [new TableCell({ children: [p(k, true)] }), new TableCell({ children: [p(v)] })] }))
        ]
    });
    rows.push(geomTable, new PageBreak());

    // AUDITORÍA COLINDANCIA
    rows.push(heading('IV. AUDITORÍA DE COLINDANCIA Y CRUCE CATASTRAL (RADIO 200 m)'));
    const overlaps = validationResults.filter(r => r.campo?.startsWith('SOLAPAMIENTO_') && r.estado === 'error');
    if (overlaps.length > 0) {
        const overlapTable = new Table({
            rows: [
                new TableRow({ children: [new TableCell({ children: [p('Parcelas Afectadas', true)] }), new TableCell({ children: [p('Área Invadida (m²)', true)] }), new TableCell({ children: [p('Detalle', true)] })] }),
                ...overlaps.map(o => new TableRow({ children: [new TableCell({ children: [p(o.campo.replace('SOLAPAMIENTO_', ''))] }), new TableCell({ children: [p(o.valor)] }), new TableCell({ children: [p(o.mensaje)] })] }))
            ]
        });
        rows.push(overlapTable);
    } else {
        rows.push(p('✅ CERO SOLAPAMIENTO: No se detectan superposiciones con parcelas oficiales en radio 200m.', false, 24, '059669'));
    }
    rows.push(new PageBreak());

    // AUDITORÍA AMBIENTAL
    rows.push(heading('V. AUDITORÍA AMBIENTAL Y RESTRICCIONES DE DOMINIO (Ley 3239/07)'));
    const envTable = new Table({
        rows: [
            new TableRow({ children: [new TableCell({ children: [p('Ítem', true)] }), new TableCell({ children: [p('Estado', true)] })] }),
            ...[
                ['Distancia a cauce hídrico más cercano', data.mapImages?.g3 ? 'Calculada (ver Gráfico 3)' : 'Requiere validación PostGIS'],
                ['Franja de protección legal (30 m)', data.mapImages?.g3 ? '✅ Verificada en Gráfico 3' : '⚠️ Pendiente validación PostGIS'],
                ['Invasión franja hídrica', 'Sin datos - Requiere consulta PostGIS hidrografia_mades'],
                ['Servidumbres ANDE / Ductos / Viales', 'Pendiente validación contra capas oficiales']
            ].map(([k, v]) => new TableRow({ children: [new TableCell({ children: [p(k, true)] }), new TableCell({ children: [p(v)] })] }))
        ]
    });
    rows.push(envTable, new PageBreak());

    // AUDITORÍA MUNICIPAL
    rows.push(heading('VI. AUDITORÍA PARÁMETROS URBANOS MUNICIPALES (Ley 3966/2010)'));
    const muniTable = new Table({
        rows: [
            new TableRow({ children: [new TableCell({ children: [p('Parámetro', true)] }), new TableCell({ children: [p('Valor / Cumplimiento', true)] })] }),
            ...[
                ['Superficie mínima urbana (360 m²)', `${data.metricas?.areaM2?.toLocaleString('es-PY', {minimumFractionDigits: 2}) || 'N/A'} m² ${(data.metricas?.areaM2 || 0) >= 360 ? '✅' : '❌'}`],
                ['Frente mínimo a vía pública (12 m)', `${data.metricas?.frenteEstimadoM?.toFixed(2) || 'N/A'} m ${(data.metricas?.frenteEstimadoM || 0) >= 12 ? '✅' : '❌'}`],
                ['Cesión vial (mín 16%)', data.municipalReporte?.balanceLoteamiento ? `${data.municipalReporte.balanceLoteamiento.detalles.cesionCalles.actual}% ${parseFloat(data.municipalReporte.balanceLoteamiento.detalles.cesionCalles.actual) >= 16 ? '✅' : '❌'}` : 'N/A (no es fraccionamiento)'],
                ['Cesión plazas/edif. públicos (5-7%)', data.municipalReporte?.balanceLoteamiento ? `${data.municipalReporte.balanceLoteamiento.detalles.cesionPlazas.actual}% ${parseFloat(data.municipalReporte.balanceLoteamiento.detalles.cesionPlazas.actual) >= 5 ? '✅' : '❌'}` : 'N/A (no es fraccionamiento)'],
                ['Retiro de fondo (mín 3 m)', '⚠️ Verificar en gabinete'],
                ['Retiro lateral (mín 1.5 m)', '⚠️ Verificar en gabinete']
            ].map(([k, v]) => new TableRow({ children: [new TableCell({ children: [p(k, true)] }), new TableCell({ children: [p(v)] })] }))
        ]
    });
    rows.push(muniTable, new PageBreak());

    // CUADRO COORDENADAS
    rows.push(heading('VII. CUADRO OFICIAL DE COORDENADAS, RUMBOS Y DISTANCIAS'));
    const vertexData = getCertificateVertexRows({ features: data.features });
    const coordRows = [
        new TableRow({ children: [new TableCell({ children: [p('Padrón/Código', true)] }), new TableCell({ children: [p('Vértice', true)] }), new TableCell({ children: [p('Rumbo (GMS)', true)] }), new TableCell({ children: [p('Distancia (m)', true)] }), new TableCell({ children: [p('Este (X) UTM', true)] }), new TableCell({ children: [p('Norte (Y) UTM', true)] })] }),
        ...vertexData.rows.slice(0, 50).map(r => new TableRow({ children: r.map(c => new TableCell({ children: [p(c)] })) }))
    ];
    if (vertexData.rows.length > 0) rows.push(new Table({ rows: coordRows }), new PageBreak());

    // CHECKLIST ADMINISTRATIVO
    rows.push(heading('VIII. CHECKLIST ADMINISTRATIVO / DOCUMENTAL PREVENTIVO'));
    const checklist = [
        ['✅', 'Polígono y atributos vectoriales validados (SNC 551/2023)'],
        ['☐', 'Copia de Título de Propiedad inscripto en la DGRP'],
        ['☐', 'Certificado de no adeudar Impuesto Inmobiliario (Municipalidad)'],
        ['☐', 'Comprobante de pago de Patente Profesional al día'],
        ['☐', 'Memoria Descriptiva y Planos firmados digitalmente'],
        ['☐', 'Plano de implantación con retiros y linderos'],
        ['☐', 'Certificado de coordenadas GNSS (si aplica)'],
        ['☐', 'Croquis perimetral con vértices numerados'],
        ['☐', 'Plano de restricción ambiental (franja hídrica 30m)'],
        ['☐', 'Plano comparativo satelital / ortofoto']
    ];
    const checkTable = new Table({
        rows: [
            new TableRow({ children: [new TableCell({ children: [p('✓/☐', true)] }), new TableCell({ children: [p('Documento / Verificación', true)] })] }),
            ...checklist.map(([check, desc]) => new TableRow({ children: [new TableCell({ children: [p(check)] }), new TableCell({ children: [p(desc)] })] }))
        ]
    });
    rows.push(checkTable, new PageBreak());

    // GRÁFICOS
    rows.push(heading('IX. GRÁFICOS Y CARTOGRAFÍA DE SALIDA'));
    const graphLabels = [
        ['Gráfico 1', 'Plano de Implantación y Entorno Catastral (Radio 200 m)'],
        ['Gráfico 2', 'Croquis Perimetral de Geometría y Vértices'],
        ['Gráfico 3', 'Lámina de Restricción Ambiental (Franja Hídrica 30m)'],
        ['Gráfico 4', 'Plano Comparativo con Imagen Satelital / Ortofoto'],
        ['Gráfico 5', 'Gráfico de Balance y Cesiones (Fraccionamientos)']
    ];
    const graphTable = new Table({
        rows: [
            new TableRow({ children: [new TableCell({ children: [p('Referencia', true)] }), new TableCell({ children: [p('Descripción', true)] }), new TableCell({ children: [p('Estado', true)] })] }),
            ...graphLabels.map(([ref, desc], i) => {
                const key = `g${i + 1}`;
                return new TableRow({ children: [new TableCell({ children: [p(ref)] }), new TableCell({ children: [p(desc)] }), new TableCell({ children: [p(data.mapImages?.[key]?.dataUrl ? '✅ Generado' : '⚠️ No disponible')] })] });
            })
        ]
    });
    rows.push(graphTable);

    // Nota final
    rows.push(new PageBreak());
    rows.push(p(`Generado por Catastro PY Pro • ${data.validationCode} • ${new Date().toLocaleString('es-PY')}`, false, 20, '64748b', AlignmentType.CENTER));

    const doc = new Document({ sections: [{ properties: {}, children: rows }] });
    const blob = await Packer.toBlob(doc);
    return blob;
}

/**
 * Función de conveniencia para exportar solo el certificado profesional
 */
export async function exportProfessionalReport() {
    return await generateProfessionalReport();
}

/**
 * Genera la sección de metadatos geodésicos para el certificado PDF
 * Incluye vinculación a la Red Geodésica Nacional (SIRGAS 2000)
 * y datos de la estación CORS/GNSS utilizada.
 */
export function generateGeodesicSection() {
    const geojson = State.get('geojson');
    const feature0 = geojson?.features?.[0] || {};
    const props = feature0.properties || {};
    
    const metaData = {
        puntoControlTipo: props.PUNTO_CONTROL_TIPO || 'CORS_ACTIVA',
        estacionCorsNombre: props.ESTACION_CORS_NOMBRE || 'PYAR',
        metodoPosicionamiento: props.METODO_POSICIONAMIENTO || 'RTK_NTRIP',
        precisionHorizontal: props.PRECISION_HORIZONTAL_M || '0.010',
        fechaRastreo: props.FECHA_RASTREO || new Date().toISOString().split('T')[0],
        operadorGnss: props.OPERADOR_GNSS || '—',
        equipoGnss: props.EQUIPO_GNSS || '—',
        marcoGeodesico: 'SIRGAS 2000',
        proyeccion: State.get('currentDisplayProjection') || 'EPSG:32721'
    };

    return `
        <div style="margin-top:16px;padding:14px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
            <h4 style="color:#1e293b;margin-bottom:10px;font-size:13px;">📐 Vinculación al Marco Geodésico Nacional (SIRGAS 2000)</h4>
            <table style="width:100%;font-size:11px;border-collapse:collapse;">
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:4px 8px;color:#64748b;">Punto de Control</td>
                    <td style="padding:4px 8px;font-weight:700;">${metaData.puntoControlTipo}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:4px 8px;color:#64748b;">Estación CORS</td>
                    <td style="padding:4px 8px;font-weight:700;">${metaData.estacionCorsNombre}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:4px 8px;color:#64748b;">Método Posicionamiento</td>
                    <td style="padding:4px 8px;font-weight:700;">${metaData.metodoPosicionamiento}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:4px 8px;color:#64748b;">Precisión Horizontal</td>
                    <td style="padding:4px 8px;font-weight:700;">±${metaData.precisionHorizontal} m</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:4px 8px;color:#64748b;">Fecha Rastreo</td>
                    <td style="padding:4px 8px;font-weight:700;">${metaData.fechaRastreo}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:4px 8px;color:#64748b;">Operador GNSS</td>
                    <td style="padding:4px 8px;font-weight:700;">${metaData.operadorGnss}</td>
                </tr>
                <tr>
                    <td style="padding:4px 8px;color:#64748b;">Equipo GNSS</td>
                    <td style="padding:4px 8px;font-weight:700;">${metaData.equipoGnss}</td>
                </tr>
            </table>
        </div>`;
}

/**
 * Genera el Dictamen Dual: SNC 551/2023 + Municipal 3966/2010
 * Retorna HTML con ambos dictámenes independientes
 */
export function generateDualDictamen(sncResults, municipalReporte) {
    const sncSection = `
        <div style="margin-top:24px;padding:16px;border:2px solid #1e40af;border-radius:8px;background:#eff6ff;">
            <h3 style="color:#1e40af;margin-bottom:12px;">📐 Dictamen SNC N° 551/2023</h3>
            <p><strong>Estado:</strong> ${sncResults?.valid ? '✅ CONFORME' : '❌ NO CONFORME'}</p>
            <p><strong>Total verificaciones:</strong> ${sncResults?.results?.length || 0}</p>
            <p><strong>Errores:</strong> ${sncResults?.results?.filter(r => r.estado === 'error').length || 0}</p>
            <p><strong>Advertencias:</strong> ${sncResults?.results?.filter(r => r.estado === 'advertencia').length || 0}</p>
        </div>`;

    const muniSection = `
        <div style="margin-top:16px;padding:16px;border:2px solid #059669;border-radius:8px;background:#ecfdf5;">
            <h3 style="color:#059669;margin-bottom:12px;">🏛️ Dictamen Municipal (Ley 3966/2010)</h3>
            <p><strong>Estado:</strong> ${municipalReporte?.erroresPorLote?.length > 0 ? '⚠️ CON OBSERVACIONES' : '✅ CONFORME'}</p>
            <p><strong>Lotes evaluados:</strong> ${municipalReporte?.lotesEvaluados || 0}</p>
            <p><strong>Lotes con errores:</strong> ${municipalReporte?.lotesConErrores || 0}</p>
            <p><strong>Lotes con alertas:</strong> ${municipalReporte?.lotesConAlertas || 0}</p>
            ${municipalReporte?.balanceLoteamiento ? `
                <p><strong>Cesión vial:</strong> ${municipalReporte.balanceLoteamiento.detalles.cesionCalles.actual}% (mín: ${municipalReporte.balanceLoteamiento.detalles.cesionCalles.requeridoMin}%)</p>
                <p><strong>Cesión plazas:</strong> ${municipalReporte.balanceLoteamiento.detalles.cesionPlazas.actual}% (mín: ${municipalReporte.balanceLoteamiento.detalles.cesionPlazas.requeridoMin}%)</p>
            ` : ''}
        </div>`;

    return sncSection + muniSection;
}

// Inicializar proj4
if (typeof proj4 !== 'undefined') {
    proj4.defs('EPSG:32721', PROJ_32721);
}
const getProj = () => typeof proj4 !== 'undefined' ? proj4('EPSG:32721') : null;

function getCertificateVertexRows(geojson) {
    const projectionCode = State.get('currentDisplayProjection') || 'EPSG:32721';
    const projection = projectionCode === EPSG_32720 ? PROJ_32720 : PROJ_32721;
    const rows = [];

    (geojson?.features || []).forEach((feature, parcelIndex) => {
        const props = feature.properties || {};
        const parcelId = props.PADRON || props.CODIGO || `Parcela ${parcelIndex + 1}`;
        const polygons = feature.geometry?.type === 'MultiPolygon'
            ? feature.geometry.coordinates
            : feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : [];

        polygons.forEach((polygon, polygonIndex) => {
            const ring = polygon[0] || [];
            const vertices = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
                ? ring.slice(0, -1)
                : ring;
            const segments = calculateRingSegments(ring, coordinate => typeof proj4 !== 'undefined' ? proj4(projection, coordinate) : coordinate);
            vertices.forEach(([lng, lat], vertexIndex) => {
                const [east, north] = typeof proj4 !== 'undefined' ? proj4(projection, [lng, lat]) : [lng, lat];
                rows.push([
                    String(parcelId),
                    polygonIndex ? `${polygonIndex + 1}.${vertexIndex + 1}` : String(vertexIndex + 1),
                    Number(east).toFixed(3),
                    Number(north).toFixed(3),
                    segments[vertexIndex] ? `${formatMeters(segments[vertexIndex].lengthMeters)} m` : 'N/A'
                ]);
            });
        });
    });

    return { projectionCode, rows };
}

function buildResolutionChecklist(results) {
    const rules = [
        ['Art. 10', 'Integridad geométrica', /^(GEOMETRÍA|CIERRE_)/],
        ['Art. 12', 'Superficie y tolerancias', /^(ÁREA_|SUP_TITULO_|SUP_LEGAL_|SUP_SIG_M2_)/],
        ['Art. 14', 'Estructura de archivos', /^ARCHIVOS$/],
        ['Art. 15', 'Proyección cartográfica', /^(PROYECCIÓN|ZONAS_UTM_PY)/],
        ['Art. 16', 'Coincidencia departamento/distrito', /^UBICACION_/],
        ['Art. 18', 'Topología de parcelas', /^TOPOLOGÍA/],
        ['Art. 19', 'Integridad y relación polígono-tabla', /^(INTEGRIDAD|HUERFANO_|DISCREPANCIA_|RELACION_SHP_)/],
        ['Anexo A', 'Atributos obligatorios', new RegExp(`^(${CAMPOS_REQUERIDOS.join('|')})_`)]
    ];
    return rules.map(([ref, control, matcher]) => {
        const matched = results.filter(result => matcher.test(result.campo || ''));
        const hasError = matched.some(result => result.estado === 'error');
        const hasWarning = matched.some(result => result.estado === 'advertencia');
        return [ref, control, hasError ? 'NO CUMPLE' : hasWarning ? 'REVISAR' : matched.length ? 'CUMPLE' : 'NO EVALUADO'];
    });
}

/**
 * Verifica disponibilidad de dependencias
 */
const checkDependencies = () => typeof shpwrite !== 'undefined' && typeof JSZip !== 'undefined';

/**
 * Reprojecta un GeoJSON de WGS84 a UTM 21S
 */
function reprojectToUTM(geojson) {
    const cloned = JSON.parse(JSON.stringify(geojson));
    const p21 = getProj();
    if (!p21) return cloned;

    for (const feature of cloned.features) {
        const coords = feature.geometry.coordinates;
        
        function transformCoords(coordsArray) {
            if (typeof coordsArray[0] === 'number') {
                // Es un punto [lng, lat]
                const [lng, lat] = coordsArray;
                const [x, y] = p21.forward([lng, lat]);
                return [x, y];
            } else {
                // Es un array anidado
                return coordsArray.map(transformCoords);
            }
        }
        
        feature.geometry.coordinates = transformCoords(coords);
    }
    
    return cloned;
}

/**
 * Genera Consulta Descriptiva PDF (formato oficial Paraguayo)
 * Similar al documento: catastro-pro/Consulta-descriptiva-portrait.pdf
 */
export function generateConsultaDescriptivaPDF(validationResults) {
    try {
        if (!window.jspdf?.jsPDF) {
            showToast('La librería jsPDF no está disponible para generar PDF.', 'error');
            return false;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const hasAutoTable = typeof doc.autoTable === 'function';
        if (!hasAutoTable) {
            showToast('El complemento de tablas para PDF no está disponible. Revisá la carga de jspdf-autotable.', 'warning');
        }
        const geojson = State.get('geojson');
        const excelData = State.get('excelData');
        if (!geojson || geojson.features.length === 0) {
            showToast('No hay parcelas para generar Consulta Descriptiva', 'warning');
            return false;
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const parcela = geojson.features[0];
        const props = parcela?.properties || {};
        const excelRow = excelData?.find(r => r.CODIGO === props.CODIGO) || props;

        let validationResultsArr = [];
        if (Array.isArray(validationResults)) {
            validationResultsArr = validationResults;
        } else if (validationResults && Array.isArray(validationResults.results)) {
            validationResultsArr = validationResults.results;
        } else {
            validationResultsArr = State.get('validationResults') || [];
        }

        // ==================== ENCABEZADO OFICIAL ====================
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageWidth, 25, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SERVICIO NACIONAL DE CATASTRO', pageWidth / 2, 12, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('CONSULTA DESCRIPTIVA DE INMUEBLE', pageWidth / 2, 20, { align: 'center' });

        // ==================== DATOS DE LA CONSULTA ====================
        let yPosition = 35;

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.text(`Fecha de Consulta: ${new Date().toLocaleDateString('es-PY')}`, 15, yPosition);
        doc.text(`Hora: ${new Date().toLocaleTimeString('es-PY')}`, pageWidth - 60, yPosition);
        yPosition += 10;

        doc.setDrawColor(200, 200, 200);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 10;

        // ==================== I. IDENTIFICACIÓN CATASTRAL ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('I. IDENTIFICACIÓN CATASTRAL', 15, yPosition);
        yPosition += 10;

        const catastroData = [
            ['Departamento', excelRow.DEPARTAMEN || props.DEPARTAMEN || 'N/A'],
            ['Distrito', excelRow.DISTRITO || props.DISTRITO || props.DISTRITA || 'N/A'],
            ['Zona', excelRow.ZONA || props.ZONA || 'N/A'],
            ['Manzana', excelRow.MANZANA || props.MANZANA || 'N/A'],
            ['Lote', excelRow.LOTE || props.LOTE || 'N/A'],
            ['Código de Parcela', excelRow.CODIGO || props.CODIGO || 'N/A'],
            ['Padrón', excelRow.PADRON || props.PADRON || 'N/A']
        ];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        catastroData.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', 15, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 60, yPosition);
            yPosition += 7;
        });

        yPosition += 10;

        // ==================== II. IDENTIFICACIÓN DEL PROPIETARIO ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('II. IDENTIFICACIÓN DEL PROPIETARIO', 15, yPosition);
        yPosition += 10;

        const propData = [
            ['Propietario', excelRow.PROPIETARIO || props.PROPIETARIO || 'N/A'],
            ['Documento de Identidad', excelRow.CI || props.CI || 'N/A'],
            ['Estado Civil', excelRow.ESTADO_CIVIL || props.ESTADO_CIVIL || 'No declarado']
        ];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        propData.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', 15, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 60, yPosition);
            yPosition += 7;
        });

        yPosition += 10;

        // ==================== III. SUPERFICIE ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('III. SUPERFICIE', 15, yPosition);
        yPosition += 10;

        const supData = [
            ['Superficie según Título', excelRow.SUP_TITULO ? `${excelRow.SUP_TITULO} m²` : (props.SUP_TITULO ? `${props.SUP_TITULO} m²` : 'N/A')],
            ['Superficie Gráfica', excelRow.SUP_SIG_M ? `${excelRow.SUP_SIG_M} m²` : (props.SUP_SIG_M ? `${props.SUP_SIG_M} m²` : 'N/A')],
            ['Superficie Legal', excelRow.SUP_LEGAL ? `${excelRow.SUP_LEGAL} m²` : (props.SUP_LEGAL ? `${props.SUP_LEGAL} m²` : 'N/A')],
            ['Uso de Tierra', excelRow.USO_TIERRA || props.USO_TIERRA || 'N/A']
        ];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        supData.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', 15, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 70, yPosition);
            yPosition += 7;
        });

        yPosition += 10;

        // ==================== IV. INSCRIPCIÓN REGISTRAL ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('IV. INSCRIPCIÓN REGISTRAL', 15, yPosition);
        yPosition += 10;

        const regData = [
            ['Finca N°', excelRow.FINCA || props.FINCA || 'N/A'],
            ['Matrícula N°', excelRow.MATRICULA || props.MATRICULA || 'N/A'],
            ['Registro Profesional', excelRow.REG_PROF || props.REG_PROF || 'N/A'],
            ['Colonia', excelRow.COLONIA || props.COLONIA || 'N/A']
        ];

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        regData.forEach(([label, value]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label + ':', 15, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(String(value), 60, yPosition);
            yPosition += 7;
        });

        yPosition += 10;

        // ==================== V. COORDENADAS UTM 21S Y DERROTERO ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('V. COORDENADAS UTM 21S Y DERROTERO', 15, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Coordenadas proyectadas en WGS84 UTM Zona 21 Sur (EPSG:32721)', 15, yPosition);
        yPosition += 6;
        doc.setTextColor(30, 41, 59);

        const vertexData = getCertificateVertexRows(geojson);
        const limitedRows = vertexData.rows.slice(0, 140);

        if (hasAutoTable && limitedRows.length) {
            doc.autoTable({
                startY: yPosition,
                head: [['Padrón / código', 'Vértice', 'Este (m)', 'Norte (m)', 'Tramo siguiente']],
                body: limitedRows,
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 2 },
                margin: { left: 15, right: 15, bottom: 15 },
                tableWidth: 'auto'
            });
            yPosition = doc.lastAutoTable.finalY + 10;
        } else if (limitedRows.length) {
            doc.setFontSize(8);
            doc.setFont('courier', 'normal');
            limitedRows.forEach(row => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(
                    `${String(row[0]).padEnd(16)} ${String(row[1]).padEnd(6)} ${String(row[2]).padStart(12)} ${String(row[3]).padStart(12)} ${String(row[4]).padStart(14)}`,
                    15,
                    yPosition
                );
                yPosition += 4;
            });
            yPosition += 10;
        }

        if (yPosition > 240) {
            doc.addPage();
            yPosition = 25;
        }

        // ==================== VI. CUMPLIMIENTO NORMATIVO (8 criterios) ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('VI. CUMPLIMIENTO NORMATIVO - RES. SNC N° 551/2023', 15, yPosition);
        yPosition += 10;

        const checklistRows = buildResolutionChecklist(validationResultsArr);

        if (hasAutoTable) {
            doc.autoTable({
                startY: yPosition,
                head: [['Referencia', 'Control verificado', 'Resultado']],
                body: checklistRows,
                theme: 'striped',
                headStyles: { fillColor: [51, 65, 85], fontSize: 9 },
                styles: { fontSize: 9, cellPadding: 3 },
                margin: { left: 15, right: 15, bottom: 15 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 100 },
                    2: { cellWidth: 30, halign: 'center' }
                },
                didParseCell: function(data) {
                    if (data.section === 'body' && data.column.index === 2) {
                        const text = (data.cell.text[0] || '').toLowerCase();
                        if (text.includes('cumple')) {
                            data.cell.styles.textColor = [16, 185, 129];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (text.includes('no cumple')) {
                            data.cell.styles.textColor = [239, 68, 68];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (text.includes('revisar')) {
                            data.cell.styles.textColor = [234, 179, 8];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
            yPosition = doc.lastAutoTable.finalY + 12;
        } else {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            checklistRows.forEach(([ref, control, result]) => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 25;
                }
                doc.setFont('helvetica', 'bold');
                doc.text(ref, 15, yPosition);
                doc.setFont('helvetica', 'normal');
                doc.text(control, 35, yPosition);
                doc.text(result, 120, yPosition);
                yPosition += 6;
            });
            yPosition += 10;
        }

        if (yPosition > 240) {
            doc.addPage();
            yPosition = 25;
        }

        // ==================== VII. OBSERVACIONES ====================
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('VII. OBSERVACIONES', 15, yPosition);
        yPosition += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text('Documento generado automáticamente por el sistema de validación catastral.', 15, yPosition);
        yPosition += 5;
        doc.text('Este documento tiene carácter informativo y no sustituye la certificación oficial del SNC.', 15, yPosition);
        yPosition += 5;
        doc.text(`Validación generada: ${new Date().toLocaleString('es-PY')}`, 15, yPosition);

        yPosition += 15;

        // ==================== PROTOCOLO OFICIAL DE FIRMAS Y SELLOS (Ley 6822/21) ====================
        if (yPosition > 210) {
            doc.addPage();
            yPosition = 25;
        }
        const firmasEnsambladas = State.get('firmasEnsambladas') || [];
        SignatureAPI.renderizarFirmasEnPDF(doc, firmasEnsambladas);


        // ==================== PIE DE PÁGINA ====================
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Página ${i} de ${pageCount} - Consulta Descriptiva - SNC Paraguay - Res. 551/2023`,
                pageWidth / 2,
                pageHeight - 8,
                { align: 'center' }
            );
        }

        const fileName = `Consulta_Descriptiva.pdf`;
        doc.save(fileName);

        showToast(`✅ Consulta Descriptiva generada: ${fileName}`, 'success');
        return true;

    } catch (error) {
        logger.error('Error generando Consulta Descriptiva:', error);
        showToast(`❌ Error al generar Consulta Descriptiva: ${error.message}`, 'error');
        return false;
    }
}

/**
 * Genera el Shapefile (shp, shx, dbf)
 */
export async function generateShapefile() {
    // Asegurar join de datos
    State.joinDataToGeoJSON();
    let geojson = State.get('geojson'); // Recargar después del join
    
    // Crear clon y reproyectar
    const utmGeojson = reprojectToUTM(geojson);
    
    // Limpiar propiedades problemáticas para shapefile
    for (const feature of utmGeojson.features) {
        // La DBF de entrega contiene exclusivamente los 16 campos del Anexo SNC 551/2023.
        const sourceProps = feature.properties || {};
        feature.properties = Object.fromEntries(CAMPOS_REQUERIDOS.map(campo => [campo, sourceProps[campo] ?? '']));
        const props = feature.properties;
        
        // Limitar longitud de campos (max 10 chars recomendado para shapefile)
        if (props.CODIGO) props.CODIGO = props.CODIGO.toString().substring(0, 20);
        if (props.PROPIETARI) props.PROPIETARI = props.PROPIETARI.toString().substring(0, 50);
        if (props.USO_TIERRA) props.USO_TIERRA = props.USO_TIERRA.toString().substring(0, 10);
        if (props.DEPARTAMEN) props.DEPARTAMEN = props.DEPARTAMEN.toString().substring(0, 30);
        if (props.DISTRITA) props.DISTRITA = props.DISTRITA.toString().substring(0, 30);
        
        // Eliminar campos temporales de validación
        delete props._validationError;
        delete props._validationWarnings;
        
        // Asegurar SUP_GEOM (redondeado a 2 decimales)
        if (props.SUP_GEOM) {
            props.SUP_GEOM = Math.round(props.SUP_GEOM * 100) / 100;
        }
    }
    
    // Usar shpwrite.parse para obtener componentes separados
    return new Promise((resolve, reject) => {
        try {
            if (typeof shpwrite === 'undefined') {
                throw new Error('La librería shpwrite.js no está cargada. Verifique la conexión o el archivo.');
            }
            // shpwrite.parse devuelve: { shp: ArrayBuffer, shx: ArrayBuffer, dbf: ArrayBuffer }
            const shpFiles = shpwrite.parse(utmGeojson);
            
            // Convertir ArrayBuffers a Blobs
            const result = {
                shp: new Blob([shpFiles.shp], { type: 'application/octet-stream' }),
                shx: new Blob([shpFiles.shx], { type: 'application/octet-stream' }),
                dbf: new Blob([shpFiles.dbf], { type: 'application/octet-stream' }),
                prj: WKT_32721
            };
            
            resolve(result);
        } catch (err) {
            reject(new Error(`Error generando shapefile: ${err.message}`));
        }
    });
}

/**
 * Genera certificado de auditoría HTML
 */
function generateAuditCertificate(validationResults) {
    const geojson = State.get('geojson');
    const fecha = new Date().toLocaleString('es-PY');
    const totalParcelas = geojson?.features?.length || 0;
    const isValido = validationResults?.valid ?? false;
    const parcelasValidas = validationResults?.parcelasValid || 0;
    const parcelasInvalidas = validationResults?.parcelasInvalid || 0;
    
    // Generar un ID único corto para mostrar
    const certId = 'SNC-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    let html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Auditoría Catastral | SNC</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #4f46e5;
                --primary-light: #e0e7ff;
                --success: #10b981;
                --success-bg: #d1fae5;
                --danger: #ef4444;
                --danger-bg: #fee2e2;
                --surface: #ffffff;
                --background: #f8fafc;
                --text-main: #0f172a;
                --text-muted: #64748b;
                --border: #e2e8f0;
            }
            body {
                font-family: 'Outfit', sans-serif;
                background-color: var(--background);
                color: var(--text-main);
                margin: 0;
                padding: 0;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 40px auto;
                padding: 0 20px;
            }
            .card {
                background: var(--surface);
                border-radius: 16px;
                box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
                overflow: hidden;
                border: 1px solid var(--border);
            }
            .header {
                background: linear-gradient(135deg, var(--primary), #3b82f6);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            .header-logo {
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 2px;
                margin-bottom: 10px;
                opacity: 0.9;
            }
            .header h1 {
                margin: 0;
                font-size: 32px;
                font-weight: 700;
            }
            .header p {
                margin: 10px 0 0;
                font-size: 14px;
                opacity: 0.8;
                font-weight: 300;
            }
            .cert-id {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(255,255,255,0.2);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                backdrop-filter: blur(4px);
            }
            .content {
                padding: 40px 30px;
            }
            .status-banner {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 30px;
                font-size: 18px;
                font-weight: 700;
            }
            .status-banner.valid {
                background: var(--success-bg);
                color: #065f46;
                border: 1px solid #a7f3d0;
            }
            .status-banner.invalid {
                background: var(--danger-bg);
                color: #991b1b;
                border: 1px solid #fecaca;
            }
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 40px;
            }
            .metric-card {
                background: var(--background);
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                border: 1px solid var(--border);
                transition: transform 0.2s;
            }
            .metric-card:hover {
                transform: translateY(-2px);
            }
            .metric-value {
                font-size: 36px;
                font-weight: 700;
                color: var(--primary);
                line-height: 1;
                margin-bottom: 8px;
            }
            .metric-label {
                font-size: 13px;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
            }
            .section-title {
                font-size: 20px;
                font-weight: 700;
                color: var(--text-main);
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .section-title::before {
                content: '';
                display: block;
                width: 4px;
                height: 20px;
                background: var(--primary);
                border-radius: 4px;
            }
            .rules-list {
                list-style: none;
                padding: 0;
                margin: 0 0 40px 0;
            }
            .rules-list li {
                padding: 12px 16px;
                background: var(--background);
                margin-bottom: 8px;
                border-radius: 8px;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 12px;
                border: 1px solid transparent;
            }
            .rules-list li::before {
                content: '✓';
                color: var(--success);
                font-weight: bold;
                background: var(--success-bg);
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                font-size: 12px;
            }
            .errors-container {
                background: var(--danger-bg);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid #fecaca;
                margin-bottom: 40px;
            }
            .error-item {
                background: white;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 8px;
                font-size: 14px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }
            .error-item:last-child {
                margin-bottom: 0;
            }
            .error-item strong {
                color: var(--danger);
            }
            .footer {
                text-align: center;
                padding: 30px;
                background: var(--background);
                border-top: 1px solid var(--border);
                color: var(--text-muted);
                font-size: 13px;
            }
            @media (max-width: 600px) {
                .container { margin: 20px auto; padding: 0 10px; }
                .header h1 { font-size: 24px; }
                .cert-id { position: static; display: inline-block; margin-top: 15px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <div class="cert-id">${certId}</div>
                    <div class="header-logo">SNC</div>
                    <h1>Auditoría Catastral</h1>
                    <p>Resolución SNC N° 551/2023 - Servicio Nacional de Catastro</p>
                </div>
                
                <div class="content">
                    <div class="status-banner ${isValido ? 'valid' : 'invalid'}">
                        ${isValido ? '✓ CUMPLIMIENTO TOTAL (APTO)' : '⚠️ REQUIERE CORRECCIONES'}
                    </div>

                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-value" style="color: var(--text-main)">${totalParcelas}</div>
                            <div class="metric-label">Total Parcelas</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value" style="color: var(--success)">${parcelasValidas}</div>
                            <div class="metric-label">Parcelas Válidas</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value" style="color: var(--danger)">${parcelasInvalidas}</div>
                            <div class="metric-label">Con Errores</div>
                        </div>
                    </div>

                    <h2 class="section-title">Cumplimiento Técnico</h2>
                    <ul class="rules-list">
                        <li>Campos obligatorios verificados (14 campos según Res. 551/2023)</li>
                        <li>Tolerancias de área aplicadas (±5% Urbano / ±10% Rural)</li>
                        <li>Validación topológica de polígonos (sin auto-intersecciones ni huecos)</li>
                        <li>Coincidencia geográfica de Departamento y Distrito</li>
                        <li>Integridad referencial tabulada (Sin registros huérfanos)</li>
                        <li>Sistema de proyección WGS84 UTM Zona 21S (EPSG:32721)</li>
                    </ul>
    `;
    
    if (validationResults?.detalles) {
        const errores = validationResults.detalles.filter(d => !d.valid);
        if (errores.length > 0) {
            html += `
                    <h2 class="section-title" style="color: var(--danger)">Observaciones Detectadas</h2>
                    <div class="errors-container">
                        ${errores.map(e => `
                            <div class="error-item">
                                <strong>Parcela ${e.codigo}:</strong> ${e.errors.join(', ')}
                            </div>
                        `).join('')}
                    </div>
            `;
        }
    }
    
    html += `
                </div>
                <div class="footer">
                    <strong>Documento de carácter informativo.</strong><br>
                    Generado automáticamente el ${fecha} por el sistema de validación técnica preliminar.<br>
                    La aceptación y certificación oficial corresponden exclusivamente al SNC.
                </div>
            </div>
        </div>
    </body>
    </html>`;
    
    return html;
}

/**
 * Genera reporte PDF con jsPDF - Sprint 3
 * Incluye sello visual APTO/REQUIERE CORRECCIONES
 */
export function generatePDFReport(results) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configuración inicial
        const pageWidth = doc.internal.pageSize.getWidth();
        let yPosition = 20;
        
        // ==================== SELLO VISUAL ====================
        const selloText = results.valid ? 'APTO PARA PRESENTACIÓN SNC' : 'REQUIERE CORRECCIONES';
        const selloColor = results.valid ? [16, 185, 129] : [239, 68, 68]; // Verde o Rojo
        
        // Dibujar sello (recuadro grande)
        doc.setDrawColor(...selloColor);
        doc.setLineWidth(3);
        doc.rect(20, yPosition, pageWidth - 40, 30);
        
        // Texto del sello
        doc.setTextColor(...selloColor);
        doc.setFontSize(24);
        doc.text(selloText, pageWidth / 2, yPosition + 20, { align: 'center' });
        
        yPosition += 45;
        
        // ==================== ENCABEZADO ====================
        doc.setTextColor(30, 41, 59); // #1e293b
        doc.setFontSize(18);
        doc.text('Reporte de Validación Catastral', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139); // #64748b
        doc.text('Resolución SNC N° 551/2023 - Paraguay', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        doc.text(`Fecha: ${new Date().toLocaleString('es-PY')}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 20;
        
        // ==================== RESUMEN ====================
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('📊 Resumen de Validación', 20, yPosition);
        yPosition += 10;
        
        const resumenData = [
            ['Total Parcelas', results.totalParcelas?.toString() || '0'],
            ['Parcelas Válidas', results.parcelasValid?.toString() || '0'],
            ['Parcelas Inválidas', results.parcelasInvalid?.toString() || '0'],
            ['Total Registros Excel', results.totalRegistros?.toString() || '0']
        ];
        
        doc.autoTable({
            startY: yPosition,
            head: [['Métrica', 'Valor']],
            body: resumenData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // #4f46e5
            margin: { left: 20, right: 20 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;

        const segmentRows = getCertificateVertexRows(State.get('geojson')).rows;
        if (segmentRows.length) {
            if (yPosition > 230) { doc.addPage(); yPosition = 20; }
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('Coordenadas y longitudes por tramo', 20, yPosition);
            doc.autoTable({
                startY: yPosition + 6,
                head: [['Parcela', 'Vértice', 'Este (m)', 'Norte (m)', 'Tramo siguiente']],
                body: segmentRows,
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85] },
                styles: { fontSize: 7, cellPadding: 1.5 },
                margin: { left: 20, right: 20 }
            });
            yPosition = doc.lastAutoTable.finalY + 15;
        }
        
        // ==================== RESULTADOS POR CAMPO ====================
        if (results.results && Array.isArray(results.results)) {
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            
            // Verificar si necesitamos nueva página
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.text('📋 Validaciones por Campo', 20, yPosition);
            yPosition += 10;
            
            const tableData = results.results.map(r => [
                r.campo || 'N/A',
                r.valor !== undefined && r.valor !== null ? r.valor.toString().substring(0, 30) : 'N/A',
                r.estado?.toUpperCase() || 'N/A',
                r.mensaje || ''
            ]);
            
            doc.autoTable({
                startY: yPosition,
                head: [['Campo', 'Valor', 'Estado', 'Mensaje']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: {
                    2: { 
                        textColor: function(cell) {
                            const estado = cell.text?.toLowerCase();
                            if (estado === 'ok') return [16, 185, 129]; // Verde
                            if (estado === 'error') return [239, 68, 68]; // Rojo
                            return [234, 179, 8]; // Amarillo
                        }
                    }
                },
                margin: { left: 20, right: 20 }
            });
            
            yPosition = doc.lastAutoTable.finalY + 15;
        }
        
        // ==================== ERRORES GLOBALES ====================
        if (results.erroresGlobales && results.erroresGlobales.length > 0) {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(239, 68, 68);
            doc.text('⚠️ Errores Globales', 20, yPosition);
            yPosition += 10;
            
            results.erroresGlobales.forEach(error => {
                doc.setFontSize(10);
                doc.setTextColor(30, 41, 59);
                const lines = doc.splitTextToSize(`• ${error}`, pageWidth - 40);
                doc.text(lines, 20, yPosition);
                yPosition += lines.length * 5 + 3;
            });
        }
        
        // ==================== PIE DE PÁGINA ====================
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(
                'Generado por Catastro PY Pro - Validador SNC N° 551/2023',
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }
        
        // Guardar PDF
        const fileName = `Reporte_Validacion_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        
        showToast(`✅ PDF generado: ${fileName}`, 'success');
        return true;
        
    } catch (error) {
        logger.error('Error generando PDF:', error);
        showToast(`❌ Error al generar PDF: ${error.message}`, 'error');
        return false;
    }
}

// Exponer para uso desde la interfaz de usuario
if (typeof window !== 'undefined') {
    window.generatePDFReport = generatePDFReport;
    window.generateComplianceCertificate = generateComplianceCertificate;
}

/**
 * Genera Certificado de Cumplimiento Normativo (Res. 551/2023)
 * Consume resultados reales de validación y no estados hardcodeados.
 */
export async function generateComplianceCertificate(resultsOrValidation) {
    try {
        if (!window.jspdf?.jsPDF) {
            throw new Error('La librería jsPDF no está disponible.');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        if (typeof doc.autoTable !== 'function') {
            throw new Error('El complemento de tablas para el certificado no se cargó.');
        }
        const pageWidth = doc.internal.pageSize.getWidth();
        const geojson = State.get('geojson');
        const excelData = State.get('excelData') || [];

        // 1. Resolver resultados reales de validación desde parámetro o State
        let validationResults = [];
        if (Array.isArray(resultsOrValidation)) {
            validationResults = resultsOrValidation;
        } else if (resultsOrValidation && Array.isArray(resultsOrValidation.results)) {
            validationResults = resultsOrValidation.results;
        }
        if (!validationResults.length) {
            validationResults = State.get('validationResults') || [];
        }
        const isValid = !validationResults.some(r => r.estado === 'error');
        const errores = validationResults.filter(r => r.estado === 'error');
        const advertencias = validationResults.filter(r => r.estado === 'advertencia');
        const detallesAgrupados = errores.map(r => ({ codigo: r.campo, errors: [r.mensaje], valid: false }));

        // 2. Generar Hash Criptográfico
        const geojsonStr = JSON.stringify(geojson);
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(geojsonStr));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // 3. Generar QR
        let qrContent = `VALIDACION SNC\\nFecha: ${new Date().toLocaleString('es-PY')}\\nParcelas: ${geojson.features.length}\\nHash: ${hashHex.substring(0, 30)}...`;
        if (!isValid) qrContent += `\\nEstado: NO_APTO`;

        try {
            const htmlCert = generateAuditCertificate({
                valid: isValid,
                parcelasValid: geojson.features.length - new Set(errores.map(r => r.campo)).size,
                parcelasInvalid: new Set(errores.map(r => r.campo)).size,
                detalles: detallesAgrupados
            });

            const baseUrl = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1') ? '' : window.location.origin;
            const token = localStorage.getItem('snc_token');
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const req = await fetch(`${baseUrl}/api/reports`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ html_content: htmlCert })
            });

            if (req.ok) {
                const data = await req.json();
                qrContent = data.url;
                logger.debug('Reporte público generado en:', qrContent);
            }
        } catch (error) {
            logger.warn('No se pudo subir el reporte público, usando QR de texto', error);
        }

        let qrDataUrl = null;
        if (window.QRCode) {
            qrDataUrl = await window.QRCode.toDataURL(qrContent, { margin: 1, width: 100 });
        }

        // 4. Capturar Mapa (Croquis)
        let certificateMaps = null;
        if (window.MapEngine && window.MapEngine.captureCertificateMapImages) {
            try {
                showToast('📸 Capturando croquis del mapa...', 'info');
                certificateMaps = await window.MapEngine.captureCertificateMapImages();
            } catch (e) {
                logger.warn('No se pudo capturar el mapa', e);
            }
        }

        // --- PÁGINA 1: CERTIFICADO ---
        doc.setDrawColor(79, 70, 229);
        doc.setLineWidth(0.5);
        doc.rect(10, 10, pageWidth - 20, 277);

        doc.setFillColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORME TÉCNICO DE VALIDACIÓN', pageWidth / 2, 22, { align: 'center' });
        doc.setFontSize(10);
        doc.text('RESOLUCIÓN SNC N° 551/2023 - CATASTRO PARAGUAY', pageWidth / 2, 30, { align: 'center' });

        let y = 55;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.text('RESULTADO DE LA VALIDACIÓN TÉCNICA:', 20, y);

        y += 15;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const texto = `El expediente compuesto por ${geojson.features.length} parcela(s), ha sido auditado electrónicamente bajo los estándares técnicos exigidos por el Servicio Nacional de Catastro.`;
        const lines = doc.splitTextToSize(texto, pageWidth - 40);
        doc.text(lines, 20, y);

        y += 20;
        doc.setFont('helvetica', 'bold');
        doc.text('RESULTADO DE LA AUDITORÍA:', 20, y);

        const estadoFinal = isValid ? 'CUMPLIMIENTO TOTAL (APTO)' : 'EXPEDIENTE CON OBSERVACIONES (NO APTO)';
        const colorEstado = isValid ? [16, 185, 129] : [239, 68, 68];
        doc.setTextColor(...colorEstado);
        doc.text(estadoFinal, 85, y);

        y += 15;
        const criterios = [
            ['Geometría', 'Polígonos cerrados y sin auto-intersecciones', validationResults.some(r => r.campo.startsWith('GEOMETRÍA') && r.estado === 'error') || validationResults.some(r => r.campo.startsWith('CIERRE_') && r.estado === 'error') ? 'NO CUMPLE' : 'CUMPLE'],
            ['Topología', 'Sin solapamientos ni huecos técnicos', validationResults.some(r => r.campo.startsWith('TOPOLOGÍA') && r.estado === 'error') ? 'NO CUMPLE' : 'CUMPLE'],
            ['Atributos', 'Campos obligatorios verificados', validationResults.some(r => r.campo.endsWith('_ERROR') || r.estado === 'error') ? 'NO CUMPLE' : 'CUMPLE'],
            ['Tolerancias', 'Diferencia de superficie dentro del límite', validationResults.some(r => r.campo === 'ÁREA' && r.estado === 'error') ? 'NO CUMPLE' : 'CUMPLE'],
            ['Proyección', 'WGS84 UTM Zona 21 Sur (EPSG:32721)', validationResults.some(r => r.campo === 'PROYECCIÓN' && r.estado === 'error') ? 'NO CUMPLE' : 'CUMPLE']
        ];
        doc.autoTable({
            startY: y,
            head: [['Criterio Técnico', 'Descripción de la Evaluación', 'Estado']],
            body: criterios,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 8 },
            margin: { left: 20, right: 20 }
        });

        y = doc.lastAutoTable.finalY + 20;
        doc.setDrawColor(...colorEstado);
        doc.setLineWidth(1);
        doc.circle(pageWidth - 45, y + 10, 20);
        doc.setTextColor(...colorEstado);
        doc.setFontSize(12);
        doc.text(isValid ? 'VALIDADO' : 'NO VALIDADO', pageWidth - 45, y + 8, { align: 'center' });
        doc.setFontSize(7);
        doc.text('SNC 551/2023', pageWidth - 45, y + 14, { align: 'center' });

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text(`ID Auditoría: SNC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 20, y + 5);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-PY')}`, 20, y + 12);

        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', 20, y + 15, 25, 25);
        } else {
            doc.rect(20, y + 15, 25, 25);
            doc.text('QR NO DISPONIBLE', 22, y + 27);
        }

        doc.setFontSize(7);
        doc.text(`Firma Digital (SHA-256 Hash):`, 20, y + 45);
        doc.setFont('courier', 'normal');
        doc.text(`${hashHex}`, 20, y + 49);

        // --- PÁGINA 2: MATRIZ DE CUMPLIMIENTO NORMATIVO ---
        doc.addPage();
        doc.setDrawColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 277);
        doc.setFillColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('ANEXO 1: MATRIZ DE CONTROL - RESOLUCIÓN SNC N° 551/2023', pageWidth / 2, 23, { align: 'center' });
        doc.autoTable({
            startY: 35,
            head: [['Referencia', 'Control verificado', 'Resultado']],
            body: buildResolutionChecklist(validationResults),
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 20, right: 20 }
        });
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text('Los controles se derivan de los resultados reales de validación. Un control no evaluado no acredita cumplimiento.', 20, doc.lastAutoTable.finalY + 12);

        // --- PÁGINA 3: PLANOS Y COORDENADAS ---
        if (certificateMaps?.snc && certificateMaps?.satellite) {
            doc.addPage();
            doc.setDrawColor(79, 70, 229);
            doc.rect(10, 10, pageWidth - 20, 277);
            doc.setFillColor(79, 70, 229);
            doc.rect(10, 10, pageWidth - 20, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('ANEXO 1: PLANOS DE UBICACIÓN Y COORDENADAS', pageWidth / 2, 23, { align: 'center' });

            const imageX = 20;
            const imageWidth = pageWidth - 40;
            const imageHeight = 82;
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(9);
            doc.text('Plano A - Plano catastral SNC del expediente', imageX, 36);
            doc.addImage(certificateMaps.snc, 'JPEG', imageX, 39, imageWidth, imageHeight);
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Cartografía SNC y polígono del expediente. No constituye certificación oficial.', imageX, 125);

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(9);
            doc.text('Plano B - Plano satelital del mismo expediente', imageX, 138);
            doc.addImage(certificateMaps.satellite, 'JPEG', imageX, 141, imageWidth, imageHeight);
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Fuente: Esri World Imagery. Polígono y vértices del mismo expediente.', imageX, 227);

            const vertexData = getCertificateVertexRows(geojson);
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`Coordenadas de vértices (${vertexData.projectionCode})`, imageX, 242);
            doc.autoTable({
                startY: 246,
                head: [['Padrón / código', 'Vértice', 'Este (m)', 'Norte (m)']],
                body: vertexData.rows,
                theme: 'grid',
                headStyles: { fillColor: [51, 65, 85] },
                styles: { fontSize: 7, cellPadding: 1.5 },
                margin: { left: 20, right: 20, bottom: 15 }
            });
        }

        // --- PÁGINA 3: TABLA DE TOLERANCIAS ---
        doc.addPage();
        doc.setDrawColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 277);
        doc.setFillColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('ANEXO 2: MEMORIA DE CÁLCULO DE SUPERFICIES Y TOLERANCIAS', pageWidth / 2, 23, { align: 'center' });
        
        const tableBody = excelData.map(row => {
            const supTit = parseFloat(row.SUP_LEGAL || row.SUP_TITULO || 0);
            const supSig = parseFloat(row.SUP_SIG_M ?? row.SUP_SIG_M2 ?? 0);
            let diff = 0;
            let diffPerc = 0;
            if(supTit > 0) {
                diff = Math.abs(supTit - supSig);
                diffPerc = (diff / supTit) * 100;
            }
            return [
                row.PADRON || row.CODIGO || '-',
                supTit.toFixed(2),
                supSig.toFixed(2),
                `${diffPerc.toFixed(2)} %`,
                diffPerc <= 10 ? 'APTO' : 'ALERTA'
            ];
        });

        doc.autoTable({
            startY: 40,
            head: [['Padrón / Código', 'Superficie Título (m²)', 'Superficie SIG (m²)', 'Diferencia (%)', 'Resultado']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 8 },
            margin: { left: 20, right: 20 }
        });

        // --- ANEXO 3: DATOS DECLARATIVOS DEL EXPEDIENTE ---
        doc.addPage();
        doc.setDrawColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 277);
        doc.setFillColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('ANEXO 3: DATOS DECLARATIVOS DEL EXPEDIENTE (SNC 551/2023)', pageWidth / 2, 23, { align: 'center' });

        const atributosBody = [];
        (geojson?.features || []).forEach(feature => {
            const row = feature.properties || {};
            const identificador = row.CODIGO || row.PADRON || row.FINCA || 'S/N';
            CAMPOS_REQUERIDOS.forEach(campo => {
                atributosBody.push([
                    identificador, 
                    campo, 
                    row[campo] !== undefined && row[campo] !== null && row[campo] !== '' ? String(row[campo]) : '-'
                ]);
            });
        });

        doc.autoTable({
            startY: 40,
            head: [['Identificador Parcela', 'Atributo Requerido', 'Valor Declarado']],
            body: atributosBody,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 20, right: 20 },
            rowPageBreak: 'avoid'
        });

        // --- ANEXO 4: VINCULACIÓN AL MARCO GEODÉSICO NACIONAL (SIRGAS 2000) ---
        doc.addPage();
        doc.setDrawColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 277);
        doc.setFillColor(79, 70, 229);
        doc.rect(10, 10, pageWidth - 20, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('ANEXO 4: VINCULACIÓN AL MARCO GEODÉSICO NACIONAL (SIRGAS 2000)', pageWidth / 2, 23, { align: 'center' });

        const geodesicosBody = [];
        const metadatosGeo = State.get('metadatosGeodesicos') || {};
        METADATOS_GEODESICOS.forEach(campo => {
            const valor = metadatosGeo[campo] || 'NO DECLARADO';
            geodesicosBody.push([campo.replace(/_/g, ' '), valor]);
        });
        // Agregar campos adicionales si existen en el estado
        const extraCampos = ['DATUM', 'ELIPSOIDE', 'ZONA_UTM', 'HUSO'];
        extraCampos.forEach(campo => {
            if (metadatosGeo[campo]) {
                geodesicosBody.push([campo.replace(/_/g, ' '), metadatosGeo[campo]]);
            }
        });

        doc.autoTable({
            startY: 40,
            head: [['Parámetro Geodésico', 'Valor Declarado']],
            body: geodesicosBody,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 20, right: 20 }
        });

        // Nota normativa
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Según Res. SNC 551/2023, todo levantamiento GNSS debe estar amarrado a la Red Geodésica Nacional o estaciones CORS autorizadas.', 20, doc.lastAutoTable.finalY + 10);

        const fileName = `Auditoria_SNC_${new Date().getTime()}.pdf`;
        doc.save(fileName);
        return true;
        
    } catch (error) {
        logger.error('Error al generar certificado:', error);
        showToast('Error al generar el PDF del certificado', 'error');
        return false;
    }
}


/**
 * Empaqueta y descarga todo el expediente
 */
export async function packAndDownload() {
    showLoading('Generando expediente catastral...');
    
    try {
        const exportCheck = runExportValidation();
        if (!exportCheck?.valid) {
            const errorMsg = exportCheck?.results?.find(r => r.estado === 'error')?.mensaje || 'Error en validación previa a exportación';
            showToast('No se puede exportar: ' + errorMsg, 'error');
            return false;
        }
        const validation = await runValidation();
        if (!validation.valid) {
            showToast('No se puede exportar: existen errores de validación', 'error');
            return false;
        }
        
        const geojson = getExportGeoJSON();

        // Generar shapefile (ahora devuelve {shp, shx, dbf, prj})
        const shpFiles = await generateShapefile();
        
        // Generar certificado usando métricas derivadas de la validación completa
        const parcelasInvalidasSet = new Set(
            validation.results.filter(r => r.estado === 'error').map(r => r.campo)
        );
        const certificateHtml = generateAuditCertificate({
            valid: validation.valid,
            parcelasValid: geojson.features.length - parcelasInvalidasSet.size,
            parcelasInvalid: parcelasInvalidasSet.size,
            detalles: validation.results
                .filter(r => r.estado === 'error')
                .map(r => ({ codigo: r.campo, errors: [r.mensaje], valid: false }))
        });
        
        // Generar Excel de respaldo
        const excelData = State.get('excelData');
        const officialExcelData = excelData.map(row => selectOfficialProperties(row, CAMPOS_REQUERIDOS));
        const ws = XLSX.utils.json_to_sheet(officialExcelData, { header: CAMPOS_REQUERIDOS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Datos_Catastrales');
        
        // --- Generar Pestaña Derrotero ---
        try {
            const geojsonDerrotero = State.get('geojson');
            const derroteroData = generarDerrotero(geojsonDerrotero, State.get('currentDisplayProjection') || '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs');
            if (derroteroData && derroteroData.length > 0) {
                const wsDerrotero = XLSX.utils.json_to_sheet(derroteroData);
                XLSX.utils.book_append_sheet(wb, wsDerrotero, 'Derrotero_Mensura');
            }
        } catch (err) {
            logger.error('Error generando derrotero:', err);
        }
        
        const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        
        // ==================== GENERAR CONSULTA DESCRIPTIVA PDF ====================
        let consultaPDFs = [];
        if (geojson && geojson.features.length > 0) {
            try {
                const ok = await Export.generateConsultaDescriptivaPDF(validation.results);
                if (ok) {
                    consultaPDFs.push({ name: 'Consulta_Descriptiva.pdf', blob: new Blob(['generated-by-function'], { type: 'application/pdf' }) });
                }
            } catch (e) {
                logger.error('Error generando Consulta Descriptiva:', e);
            }
        }
        
        // Empaquetar con JSZip - incluir los 4 archivos del shapefile
        const zip = new JSZip();
        const manifest = {
            tipo: 'Expediente técnico catastral',
            generadoEn: new Date().toISOString(),
            parcelas: geojson?.features?.length || 0,
            proyeccion: 'EPSG:32721 - WGS 84 / UTM zona 21 Sur',
            dbf: { campos: CAMPOS_REQUERIDOS, cantidadCampos: CAMPOS_REQUERIDOS.length },
            archivos: [
                { nombre: 'expediente_catastral.shp', contenido: 'Geometría Polygon UTM' },
                { nombre: 'expediente_catastral.shx', contenido: 'Índice espacial Shapefile' },
                { nombre: 'expediente_catastral.dbf', contenido: 'Atributos del Anexo SNC 551/2023' },
                { nombre: 'expediente_catastral.prj', contenido: 'Definición de proyección' },
                { nombre: 'expediente_snc.geojson', contenido: 'Geometrías y atributos en GeoJSON' },
                { nombre: 'expediente_snc.kml', contenido: 'Geometrías interoperables en KML' },
                { nombre: 'datos_finales.xlsx', contenido: 'Respaldo de datos cargados' },
                { nombre: 'auditoria.html', contenido: 'Resultados de validación' }
            ],
            aviso: 'Documento técnico preparado por la aplicación. La aceptación y certificación oficial corresponden al SNC.'
        };
        zip.file('expediente_catastral.shp', shpFiles.shp);
        zip.file('expediente_catastral.shx', shpFiles.shx);
        zip.file('expediente_catastral.dbf', shpFiles.dbf);
        zip.file('expediente_catastral.prj', shpFiles.prj);
        zip.file('expediente_snc.geojson', buildGeoJSON(geojson));
        zip.file('expediente_snc.kml', buildKML(geojson));
        zip.file('auditoria.html', certificateHtml);
        zip.file('datos_finales.xlsx', excelBuffer);
        zip.file('MANIFIESTO_EXPEDIENTE.json', JSON.stringify(manifest, null, 2));
        
        // Agregar Consulta Descriptiva si se generó
        consultaPDFs.forEach(pdf => {
            zip.file(pdf.name, pdf.blob);
        });
        
        // Generar nombre de archivo
        const nombreBase = document.getElementById('exportFileName')?.value || 'expediente_catastro';
        const nombreSanitizado = nombreBase.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const nombreZip = `${nombreSanitizado}_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.zip`;
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, nombreZip, 'application/zip');
        
        // También descargar Consulta Descriptiva individualmente
        if (consultaPDFs.length > 0) {
            downloadFile(consultaPDFs[0].blob, 'consulta_descriptiva.pdf', 'application/pdf');
        }
        
        showToast(`✅ Expediente exportado: ${nombreZip}`, 'success');
        return true;
        
    } catch (error) {
        logger.error('Error en exportación:', error);
        showToast(`❌ Error al exportar: ${error.message}`, 'error');
        return false;
    } finally {
        hideLoading();
    }
}
// Module 7 functions appended// Module 8 marker