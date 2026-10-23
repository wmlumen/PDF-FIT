/**
 * poutModule.js
 * -----------------------------------------------------------
 * Módulo POUT Municipal — SNC_v3
 * Diagnóstico territorial, estado/vigencia (5 años), geoportal,
 * bitácora de cambios, recursos oficiales y exportaciones múltiples.
 * CSS: Pout/poutModule.css
 * Ruta servidor: app.use('/Pout', express.static(...)) en server-api.js
 * -----------------------------------------------------------
 */
(function () {
  'use strict';

  const state = {
    municipios: [],      // [{municipio, poblacion, ...}]
    bitacora: [],        // [{autor, descripcion, motivo, hash, fecha}]
    map: null,
    capas: { mag: false, mades: false, mopc: true },
    exportCache: null
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const notificar = (msg) => console.log('[POUT]', msg);

  /* === UTILIDADES === */
  async function hashSHA256(text) {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return '';
  }

  /* === Diagnóstico territorial === */
  function saveDiag() {
    const muni = $('#poutMuni').value.trim();
    if (!muni) return notificar('Falta nombre del municipio');
    const d = {
      municipio: muni,
      poblacion: Number($('#poutPob').value) || 0,
      densidad: Number($('#poutDens').value) || 0,
      crecimiento: Number($('#poutCrec').value) || 0,
      agua: Number($('#poutAgua').value) || 0,
      luz: Number($('#poutLuz').value) || 0,
      ts: new Date().toISOString()
    };
    state.municipios = state.municipios.filter(m => m.municipio !== muni);
    state.municipios.push(d);
    $('#poutDiagOut').textContent =
      `Guardado: ${d.municipio} — pob ${d.poblacion}, dens ${d.densidad}, crec ${d.crecimiento}%, agua ${d.agua}%, luz ${d.luz}%`;
  }
  function clearDiag() {
    $('#poutMuni').value = ''; $('#poutPob').value = ''; $('#poutDens').value = '';
    $('#poutCrec').value = ''; $('#poutAgua').value = ''; $('#poutLuz').value = '';
    $('#poutDiagOut').textContent = '';
  }
  function exportCSV() {
    if (!state.municipios.length) return notificar('Sin diagnósticos');
    const cols = ['municipio', 'poblacion', 'densidad', 'crecimiento', 'agua', 'luz', 'ts'];
    const rows = state.municipios.map(m => cols.map(c => `"${m[c] || ""}"`).join(','));
    const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent([cols.join(','), ...rows].join('\n'));
    const a = document.createElement('a');
    a.href = csv; a.download = 'pout-diagnosticos.csv'; a.click();
  }

  /* === Estado y vigencia === */
  function evalVigencia() {
    const anio = Number($('#poutAnio').value);
    const estado = $('#poutEstado').value;
    const hoy = new Date();
    const aprob = anio || hoy.getFullYear();
    const edad = hoy.getFullYear() - aprob;
    let clase = 'muted', txt;
    if (estado !== 'APROBADO') {
      txt = `Estado ${estado}`;
    } else if (edad >= 5) {
      txt = `⚠️ Requiere actualización (${edad} años, >5 años)`;
      clase = 'warning';
    } else {
      txt = `✅ Vigente (${edad} años)`;
      clase = 'success';
    }
    $('#poutEvalOut').innerHTML = `<span class="${clase}">${txt} — última act. ${$('#poutUltAct').value || 's/d'} — ordenanza ${$('#poutOrdenanza').value || 's/d'}</span>`;
  }
  function genOrdenanza() {
    const m = $('#poutMuni').value.trim();
    if (!m) return notificar('Define municipio');
    // Integración PDF del SNC (jspdf) — stub de integración
    if (window.jspdf && window.jspdf.jsPDF) {
      const doc = new window.jspdf.jsPDF();
      doc.text(`Ordenanza POUT — ${m}`, 20, 20);
      doc.save(`ordenanza-pout-${m}.pdf`);
    } else {
      notificar(`Generando ordenanza POUT para ${m} (PDF)...`);
      notificar('Instale / cargue vendor/jspdf para exportar PDF');
    }
  }

  /* === Geoportal === */
  function initMap() {
    if (typeof L === 'undefined') return notificar('Leaflet no cargado');
    const el = $('#pout-map');
    if (!el || state.map) return;
    state.map = L.map(el).setView([-25.3, -57.6], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(state.map);
    // Marcador parque central genérico PY
    L.marker([-25.2945, -57.6387]).addTo(state.map)
      .bindPopup('<b>Paraguay</b>').openPopup();
    // Capa vial MOPC activada por defecto
    toggleCapa('mopc');
  }
  function toggleCapa(tipo) {
    state.capas[tipo] = !state.capas[tipo];
    notificar(`Capa ${tipo} ${state.capas[tipo] ? 'activada' : 'desactivada'}`);
    // TODO: fetch GeoJSON oficial y addTo/removeFrom el mapa
    if (tipo === 'mag')      notificar('Cargando capa MAG (server.gis.mag.gov.py)...');
    if (tipo === 'mades')    notificar('Cargando capa MADES (zonas riesgo)...');
    if (tipo === 'mopc')     notificar('Cargando capa MOPC (red vial)...');
  }
  function exportMapPNG() {
    if (!state.map) return notificar('Mapa no inicializado');
    notificar('Exportar PNG requiere html2canvas; usar capture de pantida o intalar /vendor/dom-to-image.min.js');
  }

  /* === Bitácora === */
  async function logChange() {
    const desc = $('#poutDesc').value.trim();
    if (!desc) return notificar('Falta descripción');
    const h = $('#poutHash').value.trim();
    const hash = h || await hashSHA256(desc + new Date().toISOString());
    const e = {
      autor: $('#poutAutor').value.trim() || 'anónimo',
      descripcion: desc,
      motivo: $('#poutMotivo').value.trim(),
      hash,
      fecha: new Date().toISOString()
    };
    state.bitacora.push(e);
    $('#poutLogOut').innerHTML = `<span class="muted">Registrado #${state.bitacora.length} · ${hash.slice(0, 18)}…</span>`;
    $('#poutDesc').value = ''; $('#poutMotivo').value = '';
  }
  function renderHistorial() {
    if (!state.bitacora.length) {
      $('#poutLogList').textContent = 'Sin cambios registrados.';
      return;
    }
    const rows = state.bitacora.map(e => `
      <div class="grid__row">
        <span class="muted">${new Date(e.fecha).toLocaleString()}</span>
        <span class="muted">· ${e.autor}</span>
        <span class="muted">${e.descripcion}</span>
        <span class="muted">${e.hash.slice(0, 18)}…</span>
      </div>`).join('');
    $('#poutLogList').innerHTML = `<div class="grid">${rows}</div>`;
  }
  function clearLog() {
    state.bitacora = []; $('#poutLogOut').textContent = ''; $('#poutLogList').textContent = '';
  }

  /* === Exportación de datos === */
  function exportDatos() {
    const blob = new Blob(
      [JSON.stringify({ municipios: state.municipios, bitacora: state.bitacora }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'pout-export.json'; a.click();
  }

  /* === Tabs === */
  function setupTabs() {
    $$('.tab').forEach(t => t.addEventListener('click', () => {
      $$('.tab').forEach(x => x.classList.remove('active'));
      $$('.tab-panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const p = document.getElementById('tab-' + t.dataset.tab);
      if (p) p.classList.add('active');
      if (t.dataset.tab === 'geoportal') setTimeout(initMap, 30);
    }));
  }

  /* === Bindings === */
  function bind() {
    $('#btnPoutSaveDiag')?.addEventListener('click', saveDiag);
    $('#btnPoutClearDiag')?.addEventListener('click', clearDiag);
    $('#btnPoutExportCsv')?.addEventListener('click', exportCSV);
    $('#btnPoutEval')?.addEventListener('click', evalVigencia);
    $('#btnPoutGenOrdenanza')?.addEventListener('click', genOrdenanza);
    $('#btnPoutLayerMag')?.addEventListener('click', () => toggleCapa('mag'));
    $('#btnPoutLayerMades')?.addEventListener('click', () => toggleCapa('mades'));
    $('#btnPoutLayerMopc')?.addEventListener('click', () => toggleCapa('mopc'));
    $('#btnPoutExportMap')?.addEventListener('click', exportMapPNG);
    $('#btnPoutLog')?.addEventListener('click', logChange);
    $('#btnPoutClearLog')?.addEventListener('click', renderHistorial);
    $('#btnPoutNew')?.addEventListener('click', clearDiag);
    $('#btnPoutExport')?.addEventListener('click', exportDatos);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    bind();
  });
})();
