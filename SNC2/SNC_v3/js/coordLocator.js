/**
 * Módulo de Localización y Parseo Universal de Coordenadas
 * Soporta:
 *  - Enlaces de Google Maps (cortos maps.app.goo.gl y largos)
 *  - Grados, Minutos y Segundos (DMS) en formato W o en español (O = Oeste)
 *  - Coordenadas decimales (con auto-orientación Lat/Lng para Paraguay)
 *  - Coordenadas UTM 21S / 20S
 */

// Definiciones de proyecciones
const PROJ_32721 = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
const PROJ_32720 = '+proj=utm +zone=20 +south +datum=WGS84 +units=m +no_defs';
const PROJ_WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

function getProj4() {
  if (typeof window !== 'undefined' && window.proj4) return window.proj4;
  if (typeof globalThis !== 'undefined' && globalThis.proj4) return globalThis.proj4;
  if (typeof proj4 !== 'undefined') return proj4;
  return null;
}

let defsInitialized = false;
function ensureDefs() {
  const p = getProj4();
  if (!p || defsInitialized) return p;
  try {
    p.defs('EPSG:32721', PROJ_32721);
    p.defs('EPSG:32720', PROJ_32720);
    p.defs('EPSG:4326', PROJ_WGS84);
    defsInitialized = true;
  } catch {}
  return p;
}

/**
 * Convierte grados decimales a formato DMS legible
 * @param {number} val - Grados decimales
 * @param {boolean} isLat - True si es latitud, false si es longitud
 * @returns {string} Ej: 25° 18' 09.4" S
 */
export function toDMS(val, isLat) {
  if (val === null || val === undefined || isNaN(val)) return '';
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir = isLat ? (val < 0 ? 'S' : 'N') : (val < 0 ? 'W' : 'E');
  return `${deg}° ${String(min).padStart(2, '0')}' ${String(sec).padStart(4, '0')}" ${dir}`;
}

/**
 * Convierte grados, minutos, segundos y orientación a decimal
 */
export function dmsToDecimal(deg, min, sec, dir) {
  let val = Math.abs(deg) + (Math.abs(min || 0) / 60) + (Math.abs(sec || 0) / 3600);
  const d = String(dir || '').toUpperCase();
  if (d === 'S' || d === 'W' || d === 'O' || deg < 0) {
    val = -val;
  }
  return val;
}

/**
 * Normaliza y analiza cualquier texto de entrada para extraer coordenadas geográficas
 * @param {string} input - Texto pegado o ingresado por el usuario
 * @returns {Promise<{ ok: boolean, lat: number, lng: number, utmX?: number, utmY?: number, zone?: string, dmsLat: string, dmsLng: string, type: string, label?: string, note?: string }>}
 */
export async function parseCoordinateInput(input) {
  if (!input || typeof input !== 'string') {
    return { ok: false, error: 'Texto de coordenadas vacío' };
  }

  const trimmed = input.trim();

  // 1. Detección de enlace Google Maps (corto o estándar)
  if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps') || (trimmed.startsWith('http') && trimmed.includes('google.com/maps'))) {
    // Si es enlace corto maps.app.goo.gl o goo.gl/maps, resolver vía backend endpoint
    if (trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps')) {
      try {
        const fetchUrl = typeof window !== 'undefined'
          ? `/api/resolve-maps-url?url=${encodeURIComponent(trimmed)}`
          : `http://localhost:5556/api/resolve-maps-url?url=${encodeURIComponent(trimmed)}`;
        
        const resp = await fetch(fetchUrl);
        const data = await resp.json();
        if (data && data.ok && data.lat !== undefined && data.lng !== undefined) {
          return buildCoordinateResult(data.lat, data.lng, 'google_maps', data.label || 'Google Maps');
        }
      } catch (err) {
        console.warn('[CoordLocator] Error resolviendo enlace corto de Google Maps:', err);
      }
    }

    // Intentar extraer de la URL completa mediante expresiones regulares
    // Patrón 1: !3d(-?\d+\.\d+)!4d(-?\d+\.\d+)
    const mData = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (mData) {
      const lat = parseFloat(mData[1]);
      const lng = parseFloat(mData[2]);
      return buildCoordinateResult(lat, lng, 'google_maps', 'Ubicación Google Maps');
    }

    // Patrón 2: @(-?\d+\.\d+),(-?\d+\.\d+)
    const mAt = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (mAt) {
      const lat = parseFloat(mAt[1]);
      const lng = parseFloat(mAt[2]);
      return buildCoordinateResult(lat, lng, 'google_maps', 'Ubicación Google Maps');
    }

    // Patrón 3: ?q=(-?\d+\.\d+)[,\s]+(-?\d+\.\d+) o ?ll=
    const mQuery = trimmed.match(/[?&](?:q|ll)=(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (mQuery) {
      const lat = parseFloat(mQuery[1]);
      const lng = parseFloat(mQuery[2]);
      return buildCoordinateResult(lat, lng, 'google_maps', 'Ubicación Google Maps');
    }
  }

  // 2. Detección de formato Grados Minutos Segundos (DMS)
  // Ej: 25°18'10.2"S 57°30'48.1"W  ó  25°18'10.2"S, 57°30'48.1"O  ó  25 18 10.2 S 57 30 48.1 W
  const dmsRegex = /([NSns+-]?\s*\d{1,2})[°\s]+(\d{1,2})['\s]+(\d{1,2}(?:\.\d+)?)["]?\s*([NSns]?)[,\s]+([EWOewos+-]?\s*\d{1,3})[°\s]+(\d{1,2})['\s]+(\d{1,2}(?:\.\d+)?)["]?\s*([EWOewos]?)/i;
  const matchDms = trimmed.match(dmsRegex);
  if (matchDms) {
    const latDeg = parseFloat(matchDms[1]);
    const latMin = parseFloat(matchDms[2]);
    const latSec = parseFloat(matchDms[3]);
    const latDir = matchDms[4] || (matchDms[1].toUpperCase().includes('S') ? 'S' : 'N');

    const lngDeg = parseFloat(matchDms[5]);
    const lngMin = parseFloat(matchDms[6]);
    const lngSec = parseFloat(matchDms[7]);
    const lngDir = matchDms[8] || (matchDms[5].toUpperCase().includes('W') || matchDms[5].toUpperCase().includes('O') ? 'W' : 'E');

    const lat = dmsToDecimal(latDeg, latMin, latSec, latDir);
    const lng = dmsToDecimal(lngDeg, lngMin, lngSec, lngDir);
    return buildCoordinateResult(lat, lng, 'dms', 'Coordenadas DMS');
  }

  // 3. Detección de Coordenadas UTM
  // Ej: 448332 7200780  o  X: 448332, Y: 7200780
  const utmRegex = /(?:[Xx]:?\s*)?(\d{5,7}(?:\.\d+)?)[,\s]+(?:[Yy]:?\s*)?(\d{6,8}(?:\.\d+)?)/;
  const matchUtm = trimmed.match(utmRegex);
  if (matchUtm) {
    const v1 = parseFloat(matchUtm[1]);
    const v2 = parseFloat(matchUtm[2]);
    // En Paraguay (hemisferio sur):
    // X (Easting) está en rango 150.000 a 850.000 m
    // Y (Northing) está en rango 6.800.000 a 7.900.000 m
    let easting = Math.min(v1, v2);
    let northing = Math.max(v1, v2);

    if (easting >= 100000 && easting <= 900000 && northing >= 6500000 && northing <= 8500000) {
      try {
        const p = ensureDefs();
        if (p) {
          const [lon, lat] = p('EPSG:32721', 'EPSG:4326', [easting, northing]);
          const res = buildCoordinateResult(lat, lon, 'utm', 'Coordenadas UTM 21S');
          res.utmX = easting;
          res.utmY = northing;
          res.zone = '21S';
          return res;
        }
      } catch (err) {
        console.warn('[CoordLocator] Error reproyectando UTM:', err);
      }
    }
  }

  // 4. Detección de Coordenadas Decimales
  // Ej: -25.302609, -57.513558  ó  -25.302609 -57.513558  ó  25.302609 S, 57.513558 W
  const decRegex = /([+-]?\d{1,2}(?:\.\d+)?)\s*([NSns]?)[,\s]+([+-]?\d{1,3}(?:\.\d+)?)\s*([EWOewos]?)/i;
  const matchDec = trimmed.match(decRegex);
  if (matchDec) {
    let lat = parseFloat(matchDec[1]);
    const latDir = matchDec[2]?.toUpperCase();
    let lng = parseFloat(matchDec[3]);
    const lngDir = matchDec[4]?.toUpperCase();

    if (latDir === 'S' && lat > 0) lat = -lat;
    if ((lngDir === 'W' || lngDir === 'O') && lng > 0) lng = -lng;

    // Auto-orientación inteligente para Paraguay / Sudamérica:
    // Si el usuario ingresó Longitud primero y Latitud segundo (ej: -57.51, -25.30)
    let note = '';
    if (Math.abs(lat) > 50 && Math.abs(lat) < 65 && Math.abs(lng) > 18 && Math.abs(lng) < 30) {
      const tmp = lat;
      lat = lng;
      lng = tmp;
      note = 'Coordenadas invertidas automáticamente a [Latitud, Longitud]';
    }

    // Si ambas son positivas y caen en rangos de Paraguay, convertir a Sur/Oeste (negativos)
    if (lat > 18 && lat < 30 && lng > 50 && lng < 65) {
      lat = -lat;
      lng = -lng;
      note = 'Hemisferio ajustado a Sur y Oeste (Paraguay)';
    }

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const res = buildCoordinateResult(lat, lng, 'decimal', 'Coordenadas Decimales');
      if (note) res.note = note;
      return res;
    }
  }

  return { ok: false, error: 'No se reconocieron coordenadas válidas en el texto ingresado' };
}

/**
 * Ensambla un resultado estructurado con WGS84, DMS y UTM
 */
function buildCoordinateResult(lat, lng, type, label) {
  const dmsLat = toDMS(lat, true);
  const dmsLng = toDMS(lng, false);

  let utmX = null;
  let utmY = null;
  let zone = '21S';

  try {
    const p = ensureDefs();
    if (p) {
      const [x, y] = p('EPSG:4326', 'EPSG:32721', [lng, lat]);
      utmX = Number(x.toFixed(2));
      utmY = Number(y.toFixed(2));
      if (lng < -60) zone = '20S';
    }
  } catch {}

  return {
    ok: true,
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    utmX,
    utmY,
    zone,
    dmsLat,
    dmsLng,
    type,
    label: label || 'Ubicación'
  };
}

/**
 * Ubica la coordenada en el mapa de Leaflet, dibuja el marcador animado y abre el popup
 * @param {{ lat: number, lng: number, utmX?: number, utmY?: number, zone?: string, dmsLat?: string, dmsLng?: string, label?: string }} coord
 * @param {object} map - Instancia de Leaflet Map
 */
let activeLocateMarker = null;

export function locateOnMap(coord, map) {
  if (!map || !coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
    return null;
  }

  // Eliminar marcador previo si existe
  if (activeLocateMarker) {
    try { map.removeLayer(activeLocateMarker); } catch {}
    activeLocateMarker = null;
  }

  // Centrar y hacer zoom suave a nivel de detalle
  const targetZoom = Math.max(map.getZoom(), 18);
  map.flyTo([coord.lat, coord.lng], targetZoom, {
    duration: 1.2,
    easeLinearity: 0.25
  });

  // Crear icono HTML personalizado con pulso brillante
  const icon = L.divIcon({
    className: 'custom-locate-pin-container',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="locate-pulse-wave"></div>
        <div class="locate-pin-badge shadow-xl">
          <i class="fas fa-location-dot text-white text-base"></i>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
    popupAnchor: [0, -32]
  });

  const marker = L.marker([coord.lat, coord.lng], {
    icon,
    zIndexOffset: 2000,
    title: coord.label || 'Ubicación localizada'
  }).addTo(map);

  activeLocateMarker = marker;

  // Armar popup con información completa y enlace a Google Maps
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${coord.lat},${coord.lng}`;
  const popupContent = `
    <div class="p-1 min-w-[240px] text-slate-100">
      <div class="flex items-center gap-2 border-b border-slate-700/80 pb-2 mb-2">
        <div class="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs">
          <i class="fas fa-location-crosshairs"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-xs font-bold text-white truncate">${coord.label || 'Punto Localizado'}</h4>
          <span class="text-[9px] text-blue-400 font-mono">${coord.type ? coord.type.toUpperCase() : 'COORDENADAS'}</span>
        </div>
      </div>
      <div class="space-y-1.5 text-[11px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
        <div class="flex justify-between">
          <span class="text-slate-400">Lat, Lng:</span>
          <span class="text-white font-semibold">${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">DMS Lat:</span>
          <span class="text-emerald-400">${coord.dmsLat || toDMS(coord.lat, true)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">DMS Lng:</span>
          <span class="text-emerald-400">${coord.dmsLng || toDMS(coord.lng, false)}</span>
        </div>
        ${coord.utmX && coord.utmY ? `
        <div class="flex justify-between border-t border-slate-800 pt-1 mt-1">
          <span class="text-slate-400">UTM ${coord.zone || '21S'} (E, N):</span>
          <span class="text-cyan-400">${coord.utmX.toLocaleString('es-PY')} m, ${coord.utmY.toLocaleString('es-PY')} m</span>
        </div>
        ` : ''}
        <div id="locate-popup-admin" class="border-t border-slate-800 pt-1 mt-1 text-[10px] text-amber-300 flex items-center gap-1">
          <i class="fas fa-spinner fa-spin text-[9px]"></i> Identificando territorio...
        </div>
      </div>
      <div class="mt-2.5 flex gap-2">
        <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 text-center py-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1.5 transition">
          <i class="fab fa-google"></i> Google Maps
        </a>
        <button type="button" onclick="window.CoordLocator?.copyResult?.(${coord.lat}, ${coord.lng})" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] border border-slate-700 transition" title="Copiar coordenadas">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>
  `;

  marker.bindPopup(popupContent, {
    className: 'locate-custom-popup',
    maxWidth: 300,
    autoPan: true
  }).openPopup();

  // Actualizar coordenadas UTM en el sidebar
  const coordE = document.getElementById('coord-e');
  const coordN = document.getElementById('coord-n');
  if (coordE && coord.utmX) coordE.textContent = coord.utmX.toFixed(2);
  if (coordN && coord.utmY) coordN.textContent = coord.utmY.toFixed(2);

  // Consulta de identificación espacial administrativa
  fetch(`/api/spatial-identify?lat=${coord.lat.toFixed(6)}&lng=${coord.lng.toFixed(6)}&noGeom=1`)
    .then(r => r.json())
    .then(data => {
      if (data && data.ok) {
        const dpto = data.departamento || 'Sin determinar';
        const dist = data.distrito || 'Sin determinar';
        const barrio = data.barrio || 'Sin determinar';

        const elAdmin = document.getElementById('locate-popup-admin');
        if (elAdmin) {
          elAdmin.innerHTML = `
            <i class="fas fa-map-pin text-blue-400"></i>
            <span>${dist} (${dpto}) · Barrio: <strong>${barrio}</strong></span>
          `;
        }

        // Actualizar el Dashboard lateral
        const elDpto = document.getElementById('stat-dpto-map');
        if (elDpto) { elDpto.textContent = dpto; elDpto.title = dpto; }
        const elDist = document.getElementById('stat-dist-map');
        if (elDist) { elDist.textContent = dist; elDist.title = dist; }
        const elBarrio = document.getElementById('stat-barrio');
        if (elBarrio) { elBarrio.textContent = barrio; elBarrio.title = barrio; }

        if (typeof window !== 'undefined' && window.State) {
          window.State.set('departamento', dpto);
          window.State.set('distrito', dist);
          window.State.set('barrio', barrio);
        }
      }
    })
    .catch(() => {});

  return marker;
}

export function clearLocateMarker(map) {
  if (activeLocateMarker && map) {
    try { map.removeLayer(activeLocateMarker); } catch {}
    activeLocateMarker = null;
  }
}

/**
 * Función central para procesar texto de entrada, ubicar en mapa y mostrar feedback
 */
export async function locateFromInput(inputText) {
  const text = inputText || document.getElementById('coord-search-input')?.value;
  const statusEl = document.getElementById('coord-locate-status');
  const btnLocate = document.getElementById('btn-locate-coord');

  if (!text || !text.trim()) {
    if (typeof window.showToast === 'function') {
      window.showToast('Pegá o ingresá un enlace o coordenadas', 'warning');
    }
    return null;
  }

  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Procesando coordenadas...';
  }
  if (btnLocate) btnLocate.disabled = true;

  try {
    const res = await parseCoordinateInput(text);
    if (!res.ok) {
      if (statusEl) {
        statusEl.innerHTML = `<span class="text-rose-400"><i class="fas fa-circle-exclamation mr-1"></i> ${res.error || 'Formato no reconocido'}</span>`;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(res.error || 'Formato no reconocido', 'error');
      }
      return null;
    }

    const map = window.MapEngine?.getMap?.();
    if (!map) {
      if (typeof window.showToast === 'function') {
        window.showToast('El visor de mapa no está listo', 'warning');
      }
      return null;
    }

    locateOnMap(res, map);

    if (statusEl) {
      const typeLabel = res.type === 'google_maps' ? 'Google Maps' : res.type.toUpperCase();
      statusEl.innerHTML = `<span class="text-emerald-400"><i class="fas fa-circle-check mr-1"></i> ${typeLabel}: ${res.lat.toFixed(5)}, ${res.lng.toFixed(5)}</span>`;
    }

    if (typeof window.showToast === 'function') {
      const msg = res.note
        ? `Ubicado: ${res.lat.toFixed(5)}, ${res.lng.toFixed(5)} (${res.note})`
        : `Ubicación localizada (${res.type.toUpperCase()})`;
      window.showToast(msg, 'success');
    }

    return res;
  } catch (err) {
    console.error('[CoordLocator] Error ubicando coordenadas:', err);
    if (statusEl) {
      statusEl.innerHTML = `<span class="text-rose-400"><i class="fas fa-triangle-exclamation mr-1"></i> Error: ${err.message}</span>`;
    }
    return null;
  } finally {
    if (btnLocate) btnLocate.disabled = false;
  }
}

/**
 * Pega del portapapeles directamente al input y localiza
 */
export async function pasteAndLocate() {
  const inputEl = document.getElementById('coord-search-input');
  try {
    if (!navigator.clipboard?.readText) {
      inputEl?.focus();
      return;
    }
    const text = await navigator.clipboard.readText();
    if (text && inputEl) {
      inputEl.value = text.trim();
      await locateFromInput(text.trim());
    }
  } catch (err) {
    console.warn('[CoordLocator] No se pudo leer portapapeles directamente:', err);
    inputEl?.focus();
  }
}

/**
 * Rellena el input con un ejemplo y ejecuta la localización
 */
export async function fillAndLocate(exampleText) {
  const inputEl = document.getElementById('coord-search-input');
  if (inputEl) inputEl.value = exampleText;
  return locateFromInput(exampleText);
}

/**
 * Copia coordenadas al portapapeles
 */
export function copyResult(lat, lng) {
  const text = `${lat}, ${lng}`;
  navigator.clipboard?.writeText?.(text)
    .then(() => {
      if (typeof window.showToast === 'function') {
        window.showToast('Coordenadas copiadas: ' + text, 'success');
      }
    })
    .catch(() => {});
}

/**
 * Inicializa los escuchadores de eventos de la interfaz
 */
export function initCoordLocatorUI() {
  const inputEl = document.getElementById('coord-search-input');
  const btnLocate = document.getElementById('btn-locate-coord');
  const btnPaste = document.getElementById('btn-paste-coord');
  const btnClear = document.getElementById('btn-clear-locate');

  if (btnLocate) {
    btnLocate.addEventListener('click', () => locateFromInput());
  }

  if (btnPaste) {
    btnPaste.addEventListener('click', () => pasteAndLocate());
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (inputEl) inputEl.value = '';
      const statusEl = document.getElementById('coord-locate-status');
      if (statusEl) {
        statusEl.innerHTML = '';
        statusEl.classList.add('hidden');
      }
      const map = window.MapEngine?.getMap?.();
      if (map) clearLocateMarker(map);
    });
  }

  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        locateFromInput();
      }
    });

    // Auto-detectar cuando el usuario pega con Ctrl+V
    inputEl.addEventListener('paste', () => {
      setTimeout(() => {
        if (inputEl.value.trim().length > 5) {
          locateFromInput();
        }
      }, 50);
    });
  }
}

// Inicializar y exponer al entorno global
if (typeof window !== 'undefined') {
  window.CoordLocator = {
    parseCoordinateInput,
    toDMS,
    dmsToDecimal,
    locateOnMap,
    clearLocateMarker,
    locateFromInput,
    pasteAndLocate,
    fillAndLocate,
    copyResult,
    initCoordLocatorUI
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCoordLocatorUI);
  } else {
    initCoordLocatorUI();
  }
}
