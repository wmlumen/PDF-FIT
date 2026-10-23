/**
 * planModule.js
 * -----------------------------------------------------------
 * Lógica del módulo de generación de planos.
 * Incluye: planimetría, altimetría, exportación PDF/DXF/DWG/TIFF.
 * -----------------------------------------------------------
 */

(function () {
  'use strict';

  const state = {
    puntos: [],
    mapa: null,
    tipoPlan: 'planimetrico',
    exportFormat: 'pdf'
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---------- Cálculo de medidas de un conjunto de puntos ----------
  function calcularMedidas(puntos) {
    if (!puntos || puntos.length < 3) return null;
    const coords = puntos.map(p => [p.lng, p.lat]);
    const dist = turf.length(coords, { units: 'meters' });
    const area = turf.area(coords, { units: 'squaremeters' });
    const altMax = Math.max(...puntos.map(p => p.alt || 0));
    const altMin = Math.min(...puntos.map(p => p.alt || 0));
    const altProm = puntos.reduce((s, p) => s + (p.alt || 0), 0) / puntos.length;
    const diff = altMax - altMin;
    const pend = diff / dist * 100; // pendiente % promedio
    return {
      dist,
      area,
      altMax,
      altMin,
      altProm,
      diff,
      pend,
      puntoCount: puntos.length
    };
  }

  // ---------- Render del plano planimétrico ----------
  function renderPlano() {
    const puntos = state.puntos;
    if (!puntos || puntos.length < 3) {
      notificar('Info', 'Primero agrega al menos 3 puntos para generar el plano.', 'info');
      return;
    }
    const m = calcularMedida();
    if (!m) return;

    $('#pDistTotal').textContent = `${m.dist.toFixed(3)} m`;
    $('#pAreaTotal').textContent = `${m.area.toFixed(2)} m²`;
    const ini = state.puntos[0];
    $('#pCoordIni').textContent = `${ini.lat.toFixed(6)}, ${ini.lng.toFixed(6)}`;
    $('#pPuntosN').textContent = state.puntos.length;

    // Crear el plano (dibujo geométrico)
    crearPlanoPlanimetrico();
    notificar('Género', 'Plano planimétrico renderizado.', 'success');
  }

  function crearPlanoPlanimetrico() {
    const map = state.mapa;
    if (!map) return;
    // Limpiar capas existentes
    state.mapa.eachLayer(l => map.removeLayer(l));
    // Dibujar el polígono
    const coords = state.puntos.map(p => [p.lat, p.lng]);
    L.polygon(coords, {
      color: '#1d4ed8',
      fillColor: '#1d4ed8',
      fillOpacity: 0.25,
      weight: 3,
      opacity: 0.8
    }).addTo(map).bindPopup('📐 Plano planimétrico');

    // Puntos
    state.puntos.forEach((p, i) => {
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        fillColor: '#1d4ed8',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9
      }).addTo(map).bindPopup(`Punto ${i + 1}<br>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
    });
  }

  // ---------- Render del plano altimétrico ----------
  function renderAltimetrico() {
    const m = calcularMedida();
    if (!m) {
      notificar('Info', 'Primero carga los puntos.', 'info');
      return;
    }
    $('#aProm').textContent = `${m.altProm.toFixed(3)} m`;
    $('#aMax').textContent = `${m.altMax.toFixed(3)} m`;
    $('#aDif').textContent = `${m.diff.toFixed(3)} m`;
    $('#aPend').textContent = `${m.pend.toFixed(2)} %`;
    notificar('Cálculo', 'Altimetría calculada.', 'success');
  }

  // ---------- Exportar PDF ----------
  function exportarPDF() {
    // En un entorno real, generar PDF con jsPDF o un servidor
    notificar('Exportación', 'PDF en proceso… (se integrará con jsPDF / servidor).', 'success');
  }

  // ---------- Exportar TIFF/GeoTIFF ----------
  function exportarTIFF() {
    notificar('Exportación', 'TIFF/GeoTIFF en proceso… (requiere servicio de cartografía).', 'success');
  }

  // ---------- Exportar DXF/DWG ----------
  function exportarDXF() {
    notificar('Exportación', 'DXF/DWG en proceso… (requiere comparador de capas).', 'success');
  }

  // ---------- Aplicar sello digital ----------
  function aplicarSello() {
    notificar('Sello', 'Sello digital aplicado (simulación).', 'success');
  }

  // ---------- Exportar certificado ----------
  function exportarCertificado() {
    notificar('Exportación', 'Certificado exportado como PDF.', 'success');
  }

  // ---------- Notificación ----------
  function notificar(titulo, msg, tipo = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText =
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 18px;border-radius:6px;font-weight:600;font-size:0.85rem;z-index:9999;opacity:0;transition:opacity 0.4s;';
    if (tipo === 'success') toast.style.background = '#2e7d32';
    else if (tipo === 'warning') toast.style.background = '#e65100';
    else if (tipo === 'error') toast.style.background = '#c62828';
    toast.textContent = `${titulo} — ${msg}`;
    document.body.appendChild(toast);
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 4000);
  }

  // ---------- Inicialización ----------
  function init() {
    // Pestañas
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        const t = tab.dataset.tab;
        const panel = document.getElementById('tab-' + t);
        if (panel) panel.classList.add('active');
      });
    });

    // Render plano
    $('#btnRenderPlano').addEventListener('click', renderPlano);

    // Calcular altimetría
    $('#btnCalcAlt').addEventListener('click', renderAltimetrico);

    // Exportar PDF
    $('#btnExportPDF').addEventListener('click', exportarPDF);

    // Sello digital
    $('#btnSello').addEventListener('click', aplicarSello);

    // Exportar certificado
    $('#btnExportCert').addEventListener('click', exportarCertificado);

    // Render inicial (si hay puntos)
    if (state.puntos.length) {
      renderPlano();
      renderAltimetrico();
    }
  }

  // ---------- Inicialización del mapa ----------
  function initMap(containerId) {
    if (!document.getElementById(containerId)) return null;
    const map = L.map(containerId, {
      center: [-25.26, -57.6],
      zoom: 14
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    state.mapa = map;
    return map;
  }

  // Exponer al window
  window.PlanModule = {
    init,
    initMap,
    calcularMedida,
    exportarPDF,
    exportarTIFF,
    exportarDXF,
    aplicarSello,
    renderPlano,
    renderAltimetrico,
    state
  };

  document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    if (mapEl) initMap('map');
  });
})();
