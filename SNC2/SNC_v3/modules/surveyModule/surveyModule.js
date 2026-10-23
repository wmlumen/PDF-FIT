/**
 * surveyModule.js
 * -----------------------------------------------------------
 * Lógica del módulo de ingreso y medición de parcelas.
 * Incluye: parseo de CSV/GPX, cálculo de distancia/área, validación
 * contra tolerancias CDM, reglas de validación y almacenamiento local.
 * -----------------------------------------------------------
 */

(function () {
  'use strict';

  const state = {
    puntos: [],          // [{ lat, lng, alt, tipo }]
    distTotal: 0,
    area: 0,
    tolerancia: 0.0001,
    parcelaCode: '',
    municipio: 'Asunción',
    uso: 'Urban',
    mapa: null,
    capas: {},
    historial: []
  };

  // Referencias al DOM
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---------- Utilidades ----------
  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text != null) e.textContent = text;
    return e;
  }

  async function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('No se pudo leer el archivo'));
      r.readAsText(file);
    });
  }

  // ---------- Cálculo de distancia y área ----------
  function calcularDistanciaArea(puntos) {
    if (!puntos || puntos.length < 3) {
      return { dist: 0, area: 0 };
    }
    // Coordenadas en [lng, lat]
    const coords = puntos.map(p => [p.lng, p.lat]);
    const dist = turf.length(coords, { units: 'meters' });
    const area = turf.area(coords, { units: 'squaremeters' });
    // Turf devuelve área en m²; para facilitar lectura trabajamos en m²
    return { dist, area };
  }

  // ---------- Cálculo de la relación de redondeo (tolerancia) ----------
  function calcularRelacionRedondeo(puntos) {
    if (puntos.length < 3) return null;
    // Suma de las longitudes de los segmentos
    let perimetro = 0;
    for (let i = 0; i < puntos.length; i++) {
      const a = puntos[i];
      const b = puntos[(i + 1) % puntos.length];
      perimetro += calcularDistanciaSegmento(a, b);
    }
    // Usa el perímetro más pequeño (si el perímetro es 0, evitar división)
    if (perimetro === 0) return null;
    // La tolerancia es la raíz cuadrada de la relación entre el perímetro y el error absoluto
    // Estimación del error absoluto como la desviación de las coordenadas
    const altProm = puntos.reduce((s, p) => s + (p.alt || 0), 0) / puntos.length;
    const varianza = puntos.reduce((s, p) => s + Math.pow((p.alt || 0) - altProm, 2), 0) / puntos.length;
    const errorAbs = Math.sqrt(varianza);
    if (errorAbs === 0) return null;
    // Relación de redondeo = perímetro / error absoluto
    // La tolerancia (error relativo) = 1 / (perímetro / error) = error / perímetro
    const toleranciaRelativa = errorAbs / perimetro;
    return {
      perimetro,
      errorAbs,
      toleranciaRelativa,
      informe: `Perímetro: ${perimetro.toFixed(3)} m | Error absoluto: ${errorAbs.toFixed(4)} m | Relación: ${toleranciaRelativa.toFixed(6)}`
    };
  }

  // Distancia entre dos puntos
  function calcularDistanciaSegmento(a, b) {
    return turf.distance(
      turf.point([a.lng, a.lat]), turf.point([b.lng, b.lat]), { units: 'meters' }
    );
  }

  // ---------- Cálculo de la medida final ----------
  function calcularMedida() {
    const { dist, area } = calcularDistanciaArea(state.puntos);
    const redondeo = calcularRelacionRedondeo(state.puntos);
    const texoUso = state.uso === 'Urban' ? 'Urbano (≤1/10 000)' : 'Rural (≤1/5 000)';
    return {
      dist,
      area,
      redondeo,
      uso: state.uso,
      tolerancia: state.tolerancia,
      texoUso,
      texto: `Distancia: ${dist.toFixed(3)} m · Área: ${area.toFixed(2)} m²`
    };
  }

  // ---------- Validación contra tolerancias CDM ----------
  function validarTolerancia(medida) {
    const val = {
      ok: true,
      mensaje: 'No hay puntos suficientes para validar.',
      coste: 0,
      confiabilidad: 0
    };
    if (state.puntos.length < 3) {
      val.ok = false;
      val.mensaje = 'Se necesitan al menos 3 puntos para calcular una parcela.';
      return val;
    }
    const porc = medida.redondeo ? medida.redondeo.toleranciaRelativa : 0;
    const toleranciaObjetivo = state.uso === 'Urban' ? 0.0001 : 0.0002;
    const ok = porc <= toleranciaObjetivo;
    const coste = porc / toleranciaObjetivo;
    const confiabilidad = Math.max(0, 1 - coste);
    val.ok = ok;
    val.mensaje = ok
      ? `✅ Tolerancia cumplida. Relación: ${medida.redondeo.toleranciaRelativa.toFixed(6)} ≤ ${toleranciaObjetivo}`
      : `⚠️ Tolerancia NO cumplida. Relación: ${porc.toFixed(6)} > ${toleranciaObjetivo}. Ajusta los puntos o verifica la parcela.`;
    val.coste = coste;
    val.confiabilidad = confiabilidad;
    return val;
  }

  // ---------- Guardado de la medición ----------
  function guardarMedicion() {
    if (state.puntos.length < 3) {
      notificar('Error', 'Se necesitan al menos 3 puntos.');
      return false;
    }
    const medida = calcularMedida();
    const validacion = validarTolerancia(medida);
    if (!validacion.ok) {
      notificar('Advertencia', validacion.mensaje, 'warning');
      // aún permitir guardar si el usuario confirma
    }
    const registro = {
      id: 'med_' + Date.now(),
      parcelaCode: state.parcelaCode,
      municipio: state.municipio,
      uso: state.uso,
      puntos: state.puntos,
      distancia: medida.dist,
      area: medida.area,
      tolerancia: medida.redondeo ? medida.redondeo.toleranciaRelativa : null,
      validacion,
      fecha: new Date().toISOString(),
      fuente: 'upload'
    };
    // Guardar local (simulado) — se integrate con Firebase en producción
    state.historial.unshift(registro);
    if (window.SNC && window.SNC.firestore && window.SNC.firestore.collection) {
      window.SNC.firestore.collection('mediciones').add(registro).catch(console.error);
    }
    notificar('Guardado', `Medición ${registro.id} guardada.`, 'success');
    limpiar();
    return registro;
  }

  // ---------- Parser de CSV ----------
  function parsearCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const header = lines[0].split(',').map(h => h.trim().toLowerCase()).map(h => h.replace(/"/g, ''));
    const filas = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 3) continue;
      const row = {};
      header.forEach((h, idx) => {
        row[h] = cols[idx] ? cols[idx].trim() : '';
      });
      if (!row.lat || !row.lng) continue;
      filas.push({
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        alt: row.alt ? parseFloat(row.alt) : 0,
        tipo: row.tipo || 'punto'
      });
    }
    return filas;
  }

  // ---------- Parser de GPX ----------
  function parsearGPX(text) {
    const puntos = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    const trkpts = doc.getElementsByTagName('trkpt');
    for (let i = 0; i < trkpts.length; i++) {
      const trkpt = trkpts[i];
      const lat = parseFloat(trkpt.getAttribute('lat'));
      const lng = parseFloat(trkpt.getAttribute('lon'));
      const ele = trkpt.getElementsByTagName('ele')[0];
      if (lat && lng) {
        puntos.push({ lat, lng, alt: ele ? parseFloat(ele.textContent) || 0 : 0 });
      }
    }
    return puntos;
  }

  // ---------- Cargar archivo ----------
  async function cargarArchivo(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let puntos = [];
    if (ext === 'csv') {
      const text = await readTextFile(file);
      puntos = parsearCSV(text);
    } else if (ext === 'gpx') {
      const text = await readTextFile(file);
      puntos = parsearGPX(text);
    } else if (ext === 'zip') {
      // Se asume geondb o shapefile comprimido; requiere biblioteca especial (shapefile.js)
      notificar('Info', 'Lo procesaré: Shapefile comprimido en desarrollo.', 'info');
      return;
    }
    if (puntos.length === 0) {
      notificar('Error', 'No se pudieron leer puntos del archivo.', 'error');
      return;
    }
    state.puntos = puntos;
    renderPreview();
    notificar('Cargado', `${puntos.length} puntos leídos.`, 'success');
    return puntos;
  }

  // ---------- Limpiar entrada ----------
  function limpiar() {
    state.puntos = [];
    state.distTotal = 0;
    state.area = 0;
    renderPreview();
    const map = state.mapa;
    if (map) {
      map.eachLayer(l => {
        if (l instanceof L.Polygon || l instanceof L.Polyline || l instanceof L.Marker) map.removeLayer(l);
      });
    }
  }

  // ---------- Render de la vista previa ----------
  function renderPreview() {
    const { dist, area } = calcularMedida();
    state.distTotal = dist;
    state.area = area;
    $('#distTotal').textContent = `${dist.toFixed(3)} m`;
    $('#areaTotal').textContent = `${area.toFixed(2)} m²`;
    const { coordIni, coordFin } = estadoPrevio();
    $('#coordIni').textContent = coordIni;
    $('#coordFin').textContent = coordFin;
    $('#puntosN').textContent = state.puntos.length;
  }

  function estadoPrevio() {
    if (!state.puntos.length) {
      return { coordIni: '—', coordFin: '—' };
    }
    const ini = state.puntos[0];
    const fin = state.puntos[state.puntos.length - 1];
    return {
      coordIni: `${ini.lat.toFixed(6)}, ${ini.lng.toFixed(6)}`,
      coordFin: `${fin.lat.toFixed(6)}, ${fin.lng.toFixed(6)}`
    };
  }

  // ---------- Notificación (Toast simple) ----------
  function notificar(titulo, msg, tipo = 'info') {
    const toast = el('div', 'toast', `${titulo} — ${msg}`);
    toast.style.cssText =
      'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 18px;border-radius:6px;font:bold 14px sans-serif;z-index:9999;opacity:0;transition:opacity 0.4s;';
    if (tipo === 'success') toast.style.background = '#2e7d32';
    if (titulo === 'Advertencia') toast.style.background = '#e65100';
    if (tipo === 'error') toast.style.background = '#c62828';
    document.body.appendChild(toast);
    (toast.nextSibling || document.body).after(toast);
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 4000);
  }

  // ---------- Módulo principal ---------
  function init() {
    // Tarjetas de pestañas
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        const target = tab.dataset.tab;
        const panel = document.getElementById('tab-' + target);
        if (panel) panel.classList.add('active');
      });
    });

    // Botón Cargar muestra (demo)
    $('#btnLoadSample').addEventListener('click', () => {
      // Se puede implementar más adelante: descargar un CSV de ejemplo
      notificar('Info', 'No hay muestra de demostración cargada. Usa el deslizador de archivos.', 'info');
    });

    // Cargar archivo
    $('#fileInput').addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      for (const f of files) {
        await cargarArchivo(f);
      }
      e.target.value = '';
    });

    // Calcular
    $('#btnCalcular').addEventListener('click', () => {
      if (state.puntos.length === 0) {
        notificar('Error', 'No hay puntos para calcular.', 'error');
        return;
      }
      renderPreview();
      const m = calcularMedida();
      notificar('Cálculo', m.texto, 'success');
    });

    // Guardar
    $('#btnSave').addEventListener('click', () => {
      guardarMedicion();
    });

    // Botón siguiente -> validar (solo navegación)
    $('#btnSiguiente').addEventListener('click', () => {
      const tab = document.querySelector('.tab.active');
      const target = tab ? tab.dataset.tab : 'validar';
      const panel = document.getElementById('tab-' + target);
      if (panel) panel.classList.add('active');
      // Actualizar vista previa si hay datos
      if (state.puntos.length) renderPreview();
    });

    // Botón Validez
    $('#btnSaveValidated').addEventListener('click', () => {
      if (state.puntos.length < 3) {
        notificar('Error', 'Se necesitan puntos.', 'error');
        return;
      }
      const medida = calcularMedida();
      const v = validarTolerancia(medida);
      const r = document.getElementById('valResult');
      const t = document.getElementById('valTarget');
      const row = document.getElementById('valResultRow');
      if (v.ok) {
        r.textContent = '✅ Cumple';
        r.style.color = '#2e7d32';
        t.textContent = `≤ ${state.tolerancia}`;
      } else {
        r.textContent = '⚠️ No cumple';
        r.style.color = '#e65100';
        t.textContent = `≤ ${state.tolerancia}`;
      }
      const badge = document.getElementById('statusBadge');
      badge.textContent = v.mensaje;
      badge.style.background = v.ok ? '#2e7d32' : '#e65100';
      badge.style.color = '#fff';
    });

    // Exportar historial
    $('#btnExportHistorial').addEventListener('click', () => {
      // Implementación futura: exportar CSV
      notificar('Info', 'Exportación de historial en desarrollo.', 'info');
    });
  }

  // ---------- Inicialización (requiere Leaflet en el DOM) ----------
  function initMap(containerId = 'map') {
    return new Promise((resolve) => {
      if (!containerId || !document.getElementById(containerId)) {
        resolve(null);
        return;
      }
      const map = L.map(containerId, {
        center: [-25.26, -57.6],
        zoom: 14,
        worldCopyJump: true
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      state.mapa = map;
      // Si se cargan puntos, mostrarlos en el mapa
      if (state.puntos.length) {
        mostrarPuntosEnMapa();
      }
      resolve(map);
    });
  }

  // Mostrar puntos en el mapa
  function mostrarPuntosEnMapa() {
    const map = state.mapa;
    if (!map) return;
    state.puntos.forEach((p, i) => {
      const m = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        fillColor: '#1d4ed8',
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9
      }).addTo(map);
      if (i === 0) {
        m.bindPopup(`<b>Inicio</b><br>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
      } else if (i === state.puntos.length - 1) {
        m.bindPopup(`<b>Fin</b><br>${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
      } else {
        m.bindPopup(`Punto ${i + 1}`);
      }
    });
  }

  // Exponer el módulo al window (por compatibilidad simple)
  window.SurveyModule = {
    init,
    initMap,
    calcularMedida,
    validarTolerancia,
    guardarMedicion,
    limpiar,
    state: state,
    mostrarPuntosEnMapa
  };

  // Auto-inicialización del mapa (opcional)
  document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('map');
    if (mapEl) {
      initMap('map').catch(console.error);
    }
  });
})();
