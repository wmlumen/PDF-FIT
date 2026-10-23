/**
 * Entry Point Ciudadano - Ciudadano PY Pro (SNC 551/2023)
 * Portal público para consulta de parcelas e inmuebles catastrales
 */

import { App } from './app/index.js';
import { initButtonIcons } from './buttonIcons.js';
import { State } from './state.js';
import { showToast, formatNumber, calcularMetricasPlanasUTM } from './utils.js';
import './coordLocator.js';
import './expedienteModal.js';
import * as MapLegend from './mapLegend.js';
import OverviewMap from './overviewMap.js';

// Exponer en window
window.App = App;
let currentSelectedCitizenFeature = null;
let currentMuniId = null;
let currentMuniInfo = null;

// Acciones locales de coordenadas
const LocalActions = {
  copyCoordinates: () => {
    const c = State.get('cursorCoordinates') || State.get('lastCoordinates');
    const text = c ? `${c[1] ?? c.lat}, ${c[0] ?? c.lng}` : '';
    if (!text) { showToast('Mueva el cursor sobre el mapa para tomar coordenadas', 'warning'); return; }
    navigator.clipboard?.writeText(text)
      .then(() => showToast('Coordenadas copiadas: ' + text, 'success'))
      .catch(() => showToast('No se pudo copiar', 'error'));
  },
  centerMapOnCoordinates: () => {
    const inputEl = document.getElementById('coord-search-input');
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
      if (inputEl.value.trim()) {
        window.CoordLocator?.locateFromInput?.(inputEl.value.trim());
        return;
      }
    }
    const input = prompt('Ingrese coordenadas o enlace de Google Maps (DMS, Lat/Lng o UTM):');
    if (!input) return;
    window.CoordLocator?.fillAndLocate?.(input.trim());
  }
};
window.LocalActions = LocalActions;

/**
 * Muestra y completa la información de la parcela en el inspector ciudadano
 */
export function updateCiudadanoInspector(feature) {
  const inspector = document.getElementById('parcel-inspector');
  if (!inspector || !feature) return;

  const props = feature.properties || {};
  const currentProj = State.get('currentDisplayProjection') || 'EPSG:32721';
  let metrics = { areaM2: 0, perimeterM: 0 };
  try {
    metrics = calcularMetricasPlanasUTM(feature, currentProj);
  } catch {}

  const areaM2 = parseFloat(props.AREA_M2 || props.SUP_SIG_M2 || metrics.areaM2 || 0);
  const padron = props.PADRON || props.CODIGO || props.CTA_CTE || props.ID || 'S/D';
  const propietario = props.PROPIETARIO || props.Propietari || props.TITULAR || props.NOMBRE || 'No especificado (Registro Reservado)';
  const uso = props.USO_SUELO || props.DESTINO || props.TIPO_LOTE || props.Categoria || 'Residencial / Urbano';

  // Obtener centroide
  let centroideText = '—';
  if (typeof turf !== 'undefined' && feature.geometry) {
    try {
      const c = turf.centroid(feature);
      const [lng, lat] = c.geometry.coordinates;
      centroideText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {}
  }

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText('parcel-inspector-title', `Inmueble Padrón Nº ${padron}`);
  setText('lote-codigo', padron);
  setText('lote-propietario', propietario);
  setText('lote-area', `${formatNumber(areaM2, 2)} m² ${areaM2 >= 10000 ? '(' + (areaM2/10000).toFixed(4) + ' ha)' : ''}`);
  setText('lote-uso', uso);
  setText('lote-coords', centroideText);

  // Consulta espacial automática (Departamento, Distrito, Barrio) si hay coordenadas
  if (typeof turf !== 'undefined' && feature.geometry) {
    try {
      const centroid = turf.centroid(feature);
      const [cLng, cLat] = centroid.geometry?.coordinates || [];
      if (typeof cLat === 'number' && typeof cLng === 'number') {
        fetch(`/api/spatial-identify?lat=${cLat}&lng=${cLng}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data || !data.ok) return;
            const ubicacionParts = [];
            if (data.barrio) ubicacionParts.push(`Bº ${data.barrio}`);
            if (data.distrito) ubicacionParts.push(data.distrito);
            if (data.departamento) ubicacionParts.push(data.departamento);
            if (ubicacionParts.length) {
              setText('lote-ubicacion', ubicacionParts.join(' · '));
            }
          })
          .catch(() => {});
      }
    } catch {}
  }

  currentSelectedCitizenFeature = feature;

  // Cálculo de simulación tributaria (Ley 5513/2015)
  const valFiscalBaseM2 = 45000; // Valor referencial de zona urbana en Gs. / m²
  const valFiscalTotal = Math.round(areaM2 * valFiscalBaseM2);
  const impuestoAnual = Math.round(valFiscalTotal * 0.01); // 1% según Ley 5513/15
  const tasasServicios = 65000; // Tasas fijas anuales de aseo y mantenimiento
  const totalTributoAnual = impuestoAnual + tasasServicios;

  setText('sim-val-fiscal', 'Gs. ' + valFiscalTotal.toLocaleString('es-PY'));
  setText('sim-impuesto', 'Gs. ' + impuestoAnual.toLocaleString('es-PY'));
  setText('sim-tasas', 'Gs. ' + tasasServicios.toLocaleString('es-PY'));
  setText('sim-total-tributo', 'Gs. ' + totalTributoAnual.toLocaleString('es-PY'));

  inspector.classList.remove('hidden');
}

/**
 * Busca un inmueble por Cta. Cte., Padrón, o Código y vuela a él
 */
export async function flyToParcel(queryText) {
  const inputEl = document.getElementById('parcel-search-input');
  const query = (queryText || inputEl?.value || '').trim().toUpperCase();

  if (!query) {
    showToast('Ingrese un padrón, código o cuenta catastral a buscar', 'warning');
    return;
  }

  // 1. Buscar en las geometrías cargadas en el mapa
  const geojson = State.get('geojson');
  let matchedFeature = null;

  if (geojson?.features?.length) {
    matchedFeature = geojson.features.find(f => {
      const p = f.properties || {};
      const pad = String(p.PADRON || '').toUpperCase();
      const cod = String(p.CODIGO || '').toUpperCase();
      const cta = String(p.CTA_CTE || '').toUpperCase();
      const id = String(p.ID || '').toUpperCase();
      const nom = String(p.NOMBRE || '').toUpperCase();
      return pad === query || cod === query || cta === query || id === query || nom.includes(query) || pad.includes(query);
    });
  }

  if (matchedFeature) {
    const map = window.MapEngine?.getMap?.();
    if (map && typeof L !== 'undefined') {
      const geoLayer = L.geoJSON(matchedFeature);
      const bounds = geoLayer.getBounds();
      map.fitBounds(bounds, { maxZoom: 19, padding: [60, 60] });
      window.MapEngine?.highlightFeature?.(matchedFeature);
    }
    updateCiudadanoInspector(matchedFeature);
    showToast(`Inmueble localizado: ${query}`, 'success');
    return;
  }

  // 2. Si no coincide con un padrón local, evaluar si son coordenadas o enlace Google Maps
  if (window.CoordLocator?.parseCoordinateInput) {
    const parseRes = await window.CoordLocator.parseCoordinateInput(query);
    if (parseRes && parseRes.ok) {
      window.CoordLocator.locateOnMap(parseRes.lat, parseRes.lng, parseRes.label || query);
      showToast('Ubicación localizada por coordenadas', 'success');
      return;
    }
  }

  showToast(`No se encontró el inmueble o padrón "${query}". Pruebe con el demo.`, 'info');
}

/**
 * Carga loteamiento demo para consulta ciudadana
 */
App.loadSampleCiudadano = async function() {
  showToast('Cargando parcelas catastrales de demostración...', 'info');
  try {
    const resp = await fetch('/data/municipal/piribebuy/sample_fraccionamiento_municipal.geojson');
    if (!resp.ok) throw new Error('No se pudo cargar el archivo demo');
    const geojson = await resp.json();
    State.set('geojson', geojson);
    State.set('sourceGeoFileName', 'Parcelas_Catastrales_Demo.geojson');

    if (window.MapEngine?.loadGeoJSON) {
      window.MapEngine.loadGeoJSON(geojson);
    }

    // Seleccionar la primera parcela para mostrar en el inspector
    const firstParcel = geojson.features?.find(f => (f.properties?.TIPO_LOTE || f.properties?.USO_SUELO) === 'LOTE' || f.properties?.PADRON?.startsWith('LOTE'));
    if (firstParcel) {
      setTimeout(() => updateCiudadanoInspector(firstParcel), 400);
    }

    showToast('Inmuebles cargados. Haga clic en cualquier lote para inspeccionar.', 'success');
  } catch (err) {
    showToast('Error cargando demo: ' + err.message, 'error');
  }
};

// Exportar Ficha Parcelaria y Boleta Catastral Oficial Ciudadana (1 página en PDF)
App.exportFichaCiudadana = async function() {
  const geojson = State.get('geojson');
  const feature = currentSelectedCitizenFeature || geojson?.features?.[0];

  if (!feature) {
    showToast('Seleccione un inmueble en el mapa o busque un padrón para descargar su ficha', 'warning');
    return;
  }

  showToast('Generando Ficha Parcelaria Oficial...', 'info');

  try {
    if (!window.jspdf?.jsPDF) {
      throw new Error('Librería jsPDF no disponible en navegador');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const props = feature.properties || {};
    const currentProj = State.get('currentDisplayProjection') || 'EPSG:32721';
    let metrics = { areaM2: 0, perimeterM: 0 };
    try {
      metrics = calcularMetricasPlanasUTM(feature, currentProj);
    } catch {}

    const areaM2 = parseFloat(props.AREA_M2 || props.SUP_SIG_M2 || metrics.areaM2 || 0);
    const padron = props.PADRON || props.CODIGO || props.CTA_CTE || props.ID || 'S/D';
    const ctaCte = props.CTA_CTE || props.PADRON || '—';
    const finca = props.FINCA || props.MATRICULA || '—';
    const titular = props.PROPIETARIO || props.Propietari || props.TITULAR || props.NOMBRE || 'Titular / Propietario Declarado';
    const uso = props.USO_SUELO || props.DESTINO || props.TIPO_LOTE || props.Categoria || 'Residencial / Urbano';
    const dpto = props.DEPARTAMEN || 'CORDILLERA';
    const dist = props.DISTRITO || 'PIRIBEBUY';
    const lugar = props.LUGAR || props.BARRIO || 'Casco Urbano';

    // Centroide y coordenadas
    let coordStr = '—';
    let latNum = 0, lngNum = 0;
    if (typeof turf !== 'undefined' && feature.geometry) {
      try {
        const c = turf.centroid(feature);
        const [lng, lat] = c.geometry.coordinates;
        latNum = lat;
        lngNum = lng;
        coordStr = lat.toFixed(6) + ', ' + lng.toFixed(6);
      } catch {}
    }

    // 1. Encabezado Oficial
    doc.setFillColor(67, 56, 202); // Indigo 700
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('REPÚBLICA DEL PARAGUAY • SERVICIO NACIONAL DE CATASTRO', pageWidth / 2, 9, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('MUNICIPALIDAD DE ' + dist.toUpperCase() + ' • GEOPORTAL DE CONSULTA CIUDADANA', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text('Resolución SNC Nº 551/2023 • Ley Orgánica Municipal Nº 3966/2010', pageWidth / 2, 20, { align: 'center' });

    let y = 30;

    // Título de la Ficha
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('BOLETA CATASTRAL Y FICHA INFORMATIVA DEL INMUEBLE', pageWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Constancia Informativa de Ubicación, Superficie y Estado Tributario Estimado', pageWidth / 2, y, { align: 'center' });

    y += 4;

    // 2. Tabla Identificación Inmueble
    const infoData = [
      ['Padrón / Código Catastral', String(padron), 'Cuenta Corriente Catastral', String(ctaCte)],
      ['Finca / Matrícula Nº', String(finca), 'Titular Registrado', String(titular)],
      ['Departamento / Distrito', dpto + ' / ' + dist, 'Barrio / Localidad', lugar],
      ['Destino / Uso del Suelo', String(uso), 'Fecha de Expedición', new Date().toLocaleDateString('es-PY')]
    ];

    doc.autoTable({
      startY: y,
      body: infoData,
      theme: 'grid',
      headStyles: { fillColor: [67, 56, 202] },
      styles: { fontSize: 8, cellPadding: 2.2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 42 },
        1: { cellWidth: 53 },
        2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 42 },
        3: { cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 6;

    // 3. Captura del mapa o croquis satelital si domtoimage está disponible
    let mapCaptured = false;
    const mapContainer = document.getElementById('map');
    if (window.domtoimage && mapContainer) {
      try {
        const dataUrl = await window.domtoimage.toJpeg(mapContainer, { quality: 0.85 });
        if (dataUrl) {
          doc.addImage(dataUrl, 'JPEG', 14, y, 90, 52);
          mapCaptured = true;
        }
      } catch (e) {}
    }

    const boxX = mapCaptured ? 108 : 14;
    const boxW = mapCaptured ? pageWidth - 122 : pageWidth - 28;

    // Cuadro de Dimensiones Físicas y Georreferenciación
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(boxX, y, boxW, 52, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(boxX, y, boxW, 52, 2, 2, 'S');

    doc.setTextColor(67, 56, 202);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS FÍSICOS Y GEODÉSICOS', boxX + 4, y + 6);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Superficie Calculada:', boxX + 4, y + 13);
    doc.setFont('helvetica', 'bold');
    doc.text(areaM2.toLocaleString('es-PY', { minimumFractionDigits: 2 }) + ' m² ' + (areaM2 >= 10000 ? '(' + (areaM2 / 10000).toFixed(4) + ' ha)' : ''), boxX + 36, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.text('Perímetro Estimado:', boxX + 4, y + 20);
    doc.setFont('helvetica', 'bold');
    doc.text((metrics.perimeterM || 0).toFixed(2) + ' metros', boxX + 36, y + 20);

    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Coordenadas:', boxX + 4, y + 27);
    doc.setFont('helvetica', 'bold');
    doc.text('SIRGAS 2000 / UTM 21S (EPSG:32721)', boxX + 36, y + 27);

    doc.setFont('helvetica', 'normal');
    doc.text('Coordenadas Centroide:', boxX + 4, y + 34);
    doc.setFont('helvetica', 'bold');
    doc.text(coordStr, boxX + 36, y + 34);

    doc.setFont('helvetica', 'normal');
    doc.text('Estado en Visor:', boxX + 4, y + 41);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Parcela Activa / Vigente', boxX + 36, y + 41);

    y += 58;

    // 4. Sección Tributaria Estimada (Ley Nº 5513/2015)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LIQUIDACIÓN TRIBUTARIA MUNICIPAL ESTIMADA (LEY Nº 5513/2015)', 14, y);

    y += 3;

    const valFiscalBaseM2 = 45000;
    const valFiscalTotal = Math.round(areaM2 * valFiscalBaseM2);
    const impuestoAnual = Math.round(valFiscalTotal * 0.01);
    const tasasServicios = 65000;
    const totalTributoAnual = impuestoAnual + tasasServicios;

    const tributosData = [
      ['Valuación Fiscal de la Tierra', areaM2.toFixed(2) + ' m² × Gs. 45.000 / m²', 'Base Imponible Municipal', 'Gs. ' + valFiscalTotal.toLocaleString('es-PY')],
      ['Impuesto Inmobiliario Urbano', '1.00% anual sobre Valuación Fiscal', 'Ley 5513/15 Art. 151', 'Gs. ' + impuestoAnual.toLocaleString('es-PY')],
      ['Tasas de Barrido, Limpieza y Mantenimiento', 'Tarifa fija anual por recolección', 'Ordenanza Tributaria', 'Gs. ' + tasasServicios.toLocaleString('es-PY')],
      ['TOTAL ESTIMADO A TRIBUTAR', 'Ejercicio Fiscal 2026', 'Total Anual Proyectado', 'Gs. ' + totalTributoAnual.toLocaleString('es-PY')]
    ];

    doc.autoTable({
      startY: y,
      head: [['Concepto Tributario', 'Base de Liquidación', 'Marco Legal', 'Importe Estimado (Gs.)']],
      body: tributosData,
      theme: 'striped',
      headStyles: { fillColor: [67, 56, 202], fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2.2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 6;

    // 5. Nota de Validez y Uso Administrativo
    doc.setFillColor(238, 242, 255); // Indigo 50
    doc.rect(14, y, pageWidth - 28, 20, 'F');
    doc.setDrawColor(199, 210, 254);
    doc.rect(14, y, pageWidth - 28, 20, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    const notaTexto = 'VALIDEZ Y ALCANCE ADMINISTRATIVO: La presente ficha parcelaria constituye una constancia digital oficial informativa de ubicación y dimensiones del inmueble expedida a través del Geoportal Catastral Multifinalitario. Es válida para gestiones de conexión de suministros de servicios públicos ante la ANDE, ESSAP, COPACO, habilitaciones comerciales, y consultas notariales preliminares. No sustituye al Título de Propiedad inscripto en la Dirección General de los Registros Públicos.';
    doc.text(doc.splitTextToSize(notaTexto, pageWidth - 36), 18, y + 4.5);

    y += 26;

    // 6. Código QR de Consulta y Verificación
    const baseUrl = window.location.origin;
    const verifyUrl = baseUrl + '/ciudadano?padron=' + encodeURIComponent(padron);
    let qrDataUrl = null;
    if (window.QRCode?.toDataURL) {
      try {
        qrDataUrl = await window.QRCode.toDataURL(verifyUrl, { margin: 1, width: 100 });
      } catch (e) {}
    }

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 14, y, 22, 22);
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('Escanee el código QR para consultar este', 39, y + 7);
      doc.text('inmueble en vivo en el visor catastral.', 39, y + 11);
      doc.text('Código Único: FICHA-PY-' + padron + '-' + new Date().getFullYear(), 39, y + 16);
    }

    // Pie de página
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Expedido por Sistema Nacional de Catastro (SNC) - Portal Ciudadano. Emisión: ' + new Date().toLocaleString('es-PY'), 14, pageHeight - 6);

    const pdfBlob = doc.output('blob');
    const filename = 'Ficha_Catastral_Padron_' + padron + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
    
    // Descargar
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('✅ Ficha Parcelaria descargada: ' + filename, 'success');
  } catch (err) {
    console.error('Error generando ficha ciudadana:', err);
    showToast('Error al generar Ficha Parcelaria: ' + err.message, 'error');
  }
};

/**
 * Carga datos catastrales y branding oficial de una municipalidad
 */
export async function cargarDatosMunicipales(muniId) {
  if (!muniId) return false;
  const cleanId = String(muniId).trim().toLowerCase();
  try {
    // 1. Obtener información y branding
    const infoRes = await fetch(`/api/municipal/${encodeURIComponent(cleanId)}/info`);
    if (infoRes.ok) {
      const infoData = await infoRes.json();
      currentMuniInfo = infoData.data || infoData;
      currentMuniId = cleanId;

      // Inyectar branding en header
      const muniBrandEl = document.getElementById('muni-brand');
      if (muniBrandEl) {
        muniBrandEl.textContent = currentMuniInfo.nombre || cleanId;
        muniBrandEl.classList.remove('hidden');
        if (currentMuniInfo.color) {
          muniBrandEl.style.backgroundColor = currentMuniInfo.color + '22';
          muniBrandEl.style.borderColor = currentMuniInfo.color + '66';
          muniBrandEl.style.color = currentMuniInfo.color;
        }
      }

      // Inyectar badge de fuente
      const badgeEl = document.getElementById('data-source-badge');
      const badgeDate = document.getElementById('muni-badge-date');
      const badgeSource = document.getElementById('muni-badge-source');
      if (badgeEl) {
        badgeEl.classList.remove('hidden');
        if (badgeDate) badgeDate.textContent = currentMuniInfo.actualizado ? `Act: ${currentMuniInfo.actualizado}` : '';
        if (badgeSource) badgeSource.textContent = `${currentMuniInfo.nombre} · ${currentMuniInfo.fuente || 'Catastro Municipal'}`;
      }
    }

    // 2. Obtener parcelas
    const parcelasRes = await fetch(`/api/municipal/${encodeURIComponent(cleanId)}/parcelas`);
    if (parcelasRes.ok) {
      const geojson = await parcelasRes.json();
      State.set('geojson', geojson);
      State.set('sourceGeoFileName', `Parcelas_${cleanId}.geojson`);

      if (window.MapEngine?.loadGeoJSON) {
        window.MapEngine.loadGeoJSON(geojson);
      }
      showToast(`Datos de ${currentMuniInfo?.nombre || cleanId} cargados exitosamente`, 'success');
      return true;
    }
  } catch (err) {
    console.warn('[CiudadanoApp] Error cargando datos de municipalidad:', err);
  }
  return false;
}
window.cargarDatosMunicipales = cargarDatosMunicipales;

/**
 * Comparte el enlace directo al inmueble seleccionado y abre el modal con QR
 */
export async function shareParcel() {
  const feat = currentSelectedCitizenFeature || State.get('geojson')?.features?.[0];
  if (!feat) {
    showToast('Seleccione un inmueble en el mapa para compartir', 'warning');
    return;
  }

  const props = feat.properties || {};
  const padron = props.PADRON || props.CODIGO || props.CTA_CTE || props.ID || '';

  // Calcular centroide para coordenadas
  let lat = null, lng = null;
  if (typeof turf !== 'undefined' && feat.geometry) {
    try {
      const c = turf.centroid(feat);
      [lng, lat] = c.geometry.coordinates;
    } catch {}
  }

  // Detectar muni
  const muni = currentMuniId || (props.DISTRITO ? String(props.DISTRITO).toLowerCase() : 'piribebuy');

  // Construir URL compartible
  const baseOrigin = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  if (muni) params.set('muni', muni);
  if (padron) params.set('padron', padron);
  if (lat && lng) {
    params.set('lat', lat.toFixed(6));
    params.set('lng', lng.toFixed(6));
    params.set('z', '17');
  }

  const shareUrl = `${baseOrigin}?${params.toString()}`;

  // Configurar input y enlace de WhatsApp
  const inputEl = document.getElementById('share-url-input');
  if (inputEl) inputEl.value = shareUrl;

  const waBtn = document.getElementById('share-whatsapp-btn');
  if (waBtn) {
    const textMsg = encodeURIComponent(`Consulte este inmueble en el Catastro Ciudadano (${padron ? 'Padrón ' + padron : ''}): ${shareUrl}`);
    waBtn.href = `https://api.whatsapp.com/send?text=${textMsg}`;
  }

  // Generar QR
  const qrImg = document.getElementById('share-qr-img');
  if (qrImg && window.QRCode?.toDataURL) {
    try {
      const qrDataUrl = await window.QRCode.toDataURL(shareUrl, { margin: 1, width: 200 });
      qrImg.src = qrDataUrl;
    } catch (e) {
      console.warn('Error generando QR para compartir:', e);
    }
  }

  // Abrir modal
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  // Copiar al portapapeles automáticamente
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(shareUrl)
      .then(() => showToast('¡Enlace copiado al portapapeles!', 'success'))
      .catch(() => {});
  }
}
window.shareParcel = shareParcel;

export function copyShareUrl() {
  const inputEl = document.getElementById('share-url-input');
  if (inputEl && inputEl.value) {
    navigator.clipboard?.writeText(inputEl.value)
      .then(() => showToast('¡Enlace copiado!', 'success'))
      .catch(() => showToast('No se pudo copiar', 'error'));
  }
}
window.copyShareUrl = copyShareUrl;

export function closeShareModal() {
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}
window.closeShareModal = closeShareModal;

function whenMapReady() {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => {
      if (window.MapEngine?.getMap?.()) return resolve(true);
      if (performance.now() - t0 > 15000) return resolve(false);
      setTimeout(tick, 100);
    };
    tick();
  });
}

// Inicializar iconos y app
initButtonIcons(document.body);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initButtonIcons(document.body), { once: true });
}

document.addEventListener('DOMContentLoaded', async () => {
  initButtonIcons(document.body);
  try {
    await App.init();

    // Conectar flyToParcel a MapEngine y window
    if (window.MapEngine) {
      window.MapEngine.flyToParcel = flyToParcel;
    }
    window.flyToParcel = flyToParcel;

    // Escuchar selección de features para actualizar el inspector
    State.subscribe('selectedFeature', (feat) => {
      if (feat) updateCiudadanoInspector(feat);
    });

    // Esperar al mapa
    await whenMapReady();

    // Montar dock inferior izquierdo: Leyenda (arriba) + Mini-mapa (abajo)
    const stackHost = document.getElementById('map-bottom-left-stack') || document.getElementById('map');
    if (stackHost) {
      MapLegend.mount(stackHost, {
        getActiveLayers: () => window.MapEngine?.getActiveLayersInfo?.() || [],
        getMap: () => window.MapEngine?.getMap?.(),
        onZoomLayer: (id) => {
          if (window.MapEngine?.getPiribebuyFeatures?.(id)?.length) {
            window.MapEngine.zoomToPiribebuyLayer(id);
          } else {
            window.MapEngine?.focusWorkPolygon?.();
          }
        }
      });
      OverviewMap.mount(stackHost, window.MapEngine?.getMap?.());
    }

    // Escuchar Enter en el input de búsqueda
    const searchInput = document.getElementById('parcel-search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          flyToParcel();
        }
      });
    }

    // ==================== PROCESAR PARÁMETROS URL (ENLACES COMPARTIBLES) ====================
    const urlParams = new URLSearchParams(window.location.search);
    const paramMuni = urlParams.get('muni');
    const paramPadron = urlParams.get('padron') || urlParams.get('cta_cte') || urlParams.get('codigo');
    const paramLat = parseFloat(urlParams.get('lat'));
    const paramLng = parseFloat(urlParams.get('lng'));
    const paramZoom = parseInt(urlParams.get('z'), 10) || 16;
    const paramBase = urlParams.get('base');

    if (paramBase && window.MapEngine?.setBaseLayer) {
      window.MapEngine.setBaseLayer(paramBase);
    }

    let loadedCustomMuni = false;
    if (paramMuni) {
      loadedCustomMuni = await cargarDatosMunicipales(paramMuni);
    }

    // Cargar automáticamente parcelas si no se cargó una municipalidad específica
    if (!loadedCustomMuni && !State.get('geojson')?.features?.length) {
      await App.loadSampleCiudadano().catch(() => {});
    }

    if (!isNaN(paramLat) && !isNaN(paramLng)) {
      const map = window.MapEngine?.getMap?.();
      if (map) {
        map.setView([paramLat, paramLng], paramZoom);
      }
    }

    if (paramPadron) {
      setTimeout(() => {
        flyToParcel(paramPadron);
      }, 500);
    }

  } catch (error) {
    console.error('[CiudadanoApp] Error en inicialización:', error);
  } finally {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.opacity = '0';
      loadingEl.style.transition = 'opacity 0.25s ease';
      setTimeout(() => loadingEl.remove(), 250);
    }
    if (window.MapEngine?.getMap?.()) {
      setTimeout(() => window.MapEngine.getMap().invalidateSize(), 200);
    }
  }
});

export { App };
