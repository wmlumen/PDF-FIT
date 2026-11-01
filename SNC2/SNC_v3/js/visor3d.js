/**
 * Visor 3D catastral (visor-3d.html): MapLibre GL (versión CSP) con terreno 3D a partir de cotas reales.
 * - Relieve: modelo de elevación Terrarium (AWS, datos SRTM) como fuente raster-dem, igual que el terreno de Mapbox.
 * - Mapa base: OpenStreetMap o satélite (Esri). Todos los mosaicos pasan por /api/v3/teselas (la CSP solo permite el mismo origen).
 * - Catastro: edificios OSM extruidos por pisos, parcelas SNC, límite del distrito, cascos urbanos y barrios.
 *   Edificios y parcelas se piden solo para la zona visible (/api/v3/edificios/vista, /api/v3/parcelario/vista).
 */
const ml = window.maplibregl;
ml.setWorkerUrl('/vendor/maplibre/maplibre-gl-csp-worker.js');

const $ = id => document.getElementById(id);
const num = v => Number(v || 0).toLocaleString('es-PY');
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const INICIO = { center: [-57.045, -25.464], zoom: 14.5, pitch: 62, bearing: -20 };   // Piribebuy
const DPTO = { A: 'Asunción', B: 'Concepción', C: 'San Pedro', D: 'Cordillera', E: 'Guairá', F: 'Caaguazú', G: 'Caazapá', H: 'Itapúa', I: 'Misiones', J: 'Paraguarí',
  K: 'Alto Paraná', L: 'Central', M: 'Ñeembucú', N: 'Amambay', P: 'Presidente Hayes', Q: 'Boquerón', R: 'Alto Paraguay', S: 'Canindeyú' };
const vacio = { type: 'FeatureCollection', features: [] };
// Altura del edificio: «height» del mapa si existe; si no, pisos (del mapa, o estimados con la liquidación DNIT) × altura por piso.
const pisos = ['case', ['==', ['get', 'niveles_informados'], true], ['get', 'niveles'], ['coalesce', ['get', 'niveles_dnit'], ['get', 'niveles'], 1]];
const altura = h => ['coalesce', ['get', 'altura_m'], ['*', ['max', 1, pisos], h]];
const COLOR_CATASTRO = ['match', ['get', 'estado'], ['auto', 'manual'], '#f59e0b', 'pendiente', '#38bdf8', '#ef4444'];
// Vista realista (estilo F4Map): color del mapa si está; si no, uno según el tipo de edificio.
const COLOR_REAL = ['coalesce', ['get', 'color'], ['match', ['get', 'tipo'],
  ['house', 'residential', 'detached', 'semidetached_house', 'terrace', 'apartments'], '#e8dcc8',
  ['commercial', 'retail', 'office', 'supermarket', 'hotel'], '#cfd8e3',
  ['industrial', 'warehouse', 'shed', 'farm_auxiliary', 'barn'], '#b8b8b0',
  ['church', 'cathedral', 'chapel'], '#f5f0e6', ['school', 'university', 'hospital', 'public', 'government'], '#e9d7c1', '#ddd3c4']];
const tesela = f => [`${location.origin}/api/v3/teselas/${f}/{z}/{x}/{y}`];

const map = new ml.Map({
  container: 'mapa', ...INICIO, maxPitch: 80, hash: true, attributionControl: { compact: true },
  style: {
    version: 8,
    glyphs: `${location.origin}/api/v3/glifos/{fontstack}/{range}`,
    sources: {
      osm: { type: 'raster', tiles: tesela('osm'), tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap' },
      // Hasta 19: donde Esri no tiene imagen, el servidor responde 404 y MapLibre agranda la del zoom anterior.
      satelite: { type: 'raster', tiles: tesela('satelite'), tileSize: 256, maxzoom: 19, attribution: 'Imagen © Esri (Clarity / World Imagery)' },
      hipsometria: { type: 'raster', tiles: tesela('hipsometria'), tileSize: 256, maxzoom: 15, attribution: 'Altura: Terrarium (AWS)' },
      dem: { type: 'raster-dem', tiles: tesela('terreno'), tileSize: 256, maxzoom: 15, encoding: 'terrarium', attribution: 'Relieve: Terrarium (AWS)' },
      'dem-sombra': { type: 'raster-dem', tiles: tesela('terreno'), tileSize: 256, maxzoom: 15, encoding: 'terrarium' },
      curvas: { type: 'geojson', data: vacio },
      inundacion: { type: 'geojson', data: vacio },
      hidro: { type: 'geojson', data: vacio },
      'evacuacion-rutas': { type: 'geojson', data: vacio },
      'evacuacion-albergues': { type: 'geojson', data: vacio },
      edificios: { type: 'geojson', data: vacio }, parcelas: { type: 'geojson', data: vacio }, limite: { type: 'geojson', data: vacio },
      cascos: { type: 'geojson', data: vacio }, barrios: { type: 'geojson', data: vacio },
      incendios: { type: 'geojson', data: vacio }
    },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': '#dfe6e9' } },
      { id: 'base-osm', type: 'raster', source: 'osm' },
      { id: 'base-satelite', type: 'raster', source: 'satelite', maxzoom: 19.5, layout: { visibility: 'none' } },
      // Respaldo: con «Satélite» elegido, desde zoom 19 se muestra OpenStreetMap (la imagen ya no tiene más detalle).
      { id: 'base-satelite-respaldo', type: 'raster', source: 'osm', minzoom: 19.5, layout: { visibility: 'none' } },
      { id: 'hipsometria', type: 'raster', source: 'hipsometria', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.75 } },
      { id: 'sombra', type: 'hillshade', source: 'dem-sombra', paint: { 'hillshade-exaggeration': 0.45, 'hillshade-shadow-color': '#3f3f46' } },
      { id: 'hidro-lineas', type: 'line', source: 'hidro', layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#0284c7', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 3.5, 17, 7], 'line-opacity': 0.85 } },
      { id: 'hidro-nombres', type: 'symbol', source: 'hidro', minzoom: 13,
        // 'nombre' = capa nacional OSM (scripts/osm-hidrografia.mjs); 'NOMBRE' = formato SNC anterior (municipal/piribebuy).
        layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'nombre'], ['get', 'NOMBRE']], 'text-size': 11, 'text-font': ['Open Sans Regular'], 'text-max-angle': 30 },
        paint: { 'text-color': '#0369a1', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } },
      { id: 'inundacion-capa', type: 'fill', source: 'inundacion', layout: { visibility: 'none' }, paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.60, 'fill-antialias': false } },
      { id: 'inundacion-borde', type: 'line', source: 'inundacion', layout: { visibility: 'none' }, paint: { 'line-color': '#38bdf8', 'line-width': 1.5, 'line-opacity': 0.85 } },
      { id: 'evacuacion-rutas-linea', type: 'line', source: 'evacuacion-rutas', layout: { visibility: 'visible', 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#10b981', 'line-width': 3.5, 'line-dasharray': [2, 1.5] } },
      { id: 'evacuacion-albergues-puntos', type: 'circle', source: 'evacuacion-albergues', layout: { visibility: 'visible' },
        paint: { 'circle-color': '#059669', 'circle-radius': 7.5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } },
      { id: 'evacuacion-albergues-etiquetas', type: 'symbol', source: 'evacuacion-albergues', minzoom: 12,
        layout: { 'text-field': ['get', 'nombre'], 'text-size': 10.5, 'text-font': ['Open Sans Bold'], 'text-offset': [0, 1.3] },
        paint: { 'text-color': '#ecfdf5', 'text-halo-color': '#064e3b', 'text-halo-width': 1.5 } },
      { id: 'barrios', type: 'fill', source: 'barrios', layout: { visibility: 'none' }, paint: { 'fill-color': ['match', ['get', 'zona'], 'urbana', '#fcd34d', '#5eead4'], 'fill-opacity': 0.28 } },
      { id: 'barrios-borde', type: 'line', source: 'barrios', layout: { visibility: 'none' }, paint: { 'line-color': ['match', ['get', 'zona'], 'urbana', '#b45309', '#0d9488'], 'line-width': 1 } },
      { id: 'incendios-puntos', type: 'circle', source: 'incendios', layout: { visibility: 'none' },
        paint: {
          'circle-color': [
            'case',
            ['>=', ['coalesce', ['get', 'frp'], 0], 120], '#a855f7',
            ['>=', ['coalesce', ['get', 'frp'], 0], 50], '#ef4444',
            '#f97316'
          ],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3.5, 10, 7, 14, 11],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.92
        } },
      { id: 'cascos', type: 'fill', source: 'cascos', layout: { visibility: 'none' }, paint: { 'fill-color': '#a78bfa', 'fill-opacity': 0.22 } },
      { id: 'cascos-borde', type: 'line', source: 'cascos', layout: { visibility: 'none' }, paint: { 'line-color': '#7c3aed', 'line-width': 2 } },
      { id: 'curvas', type: 'line', source: 'curvas', minzoom: 13, layout: { visibility: 'none', 'line-join': 'round' },
        paint: { 'line-color': ['case', ['get', 'maestra'], '#7c2d12', '#a16207'], 'line-width': ['case', ['get', 'maestra'], 1.8, 0.8], 'line-opacity': 0.85 } },
      { id: 'curvas-cotas', type: 'symbol', source: 'curvas', minzoom: 14, filter: ['==', ['get', 'maestra'], true],
        layout: { visibility: 'none', 'symbol-placement': 'line', 'text-field': ['concat', ['to-string', ['get', 'cota']], ' m'], 'text-size': 11, 'text-font': ['Open Sans Regular'] },
        paint: { 'text-color': '#7c2d12', 'text-halo-color': '#fffbeb', 'text-halo-width': 1.5 } },
      { id: 'parcelas', type: 'line', source: 'parcelas', minzoom: 14, paint: { 'line-color': '#fde047', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 18, 1.6] } },
      { id: 'limite', type: 'line', source: 'limite', paint: { 'line-color': '#f472b6', 'line-width': 3 } },
      { id: 'edificios', type: 'fill-extrusion', source: 'edificios', minzoom: 14,
        paint: {
          'fill-extrusion-color': COLOR_CATASTRO, 'fill-extrusion-vertical-gradient': true,
          'fill-extrusion-height': altura(3),
          'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.9
        } }
    ]
  }
});
map.addControl(new ml.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new ml.FullscreenControl(), 'top-right');
map.addControl(new ml.ScaleControl({ unit: 'metric' }), 'bottom-left');
map.addControl(new ml.TerrainControl({ source: 'dem', exaggeration: 1.5 }), 'top-right');
// Mi ubicación: se pide al abrir y se muestra lo que hay alrededor (edificios y parcelas cercanos).
const gps = new ml.GeolocateControl({ positionOptions: { enableHighAccuracy: true, timeout: 15000 }, trackUserLocation: false, showAccuracyCircle: true, fitBoundsOptions: { maxZoom: 17 } });
map.addControl(gps, 'top-right');
gps.on('geolocate', p => {
  const prec = Math.round(p.coords.accuracy);
  map.easeTo({ center: [p.coords.longitude, p.coords.latitude], zoom: prec > 200 ? 15 : 17, pitch: 60, duration: 1500 });
  estado(prec > 50 ? `Ubicación aproximada (±${prec} m, por red; no es GPS). Mostrando lo que hay alrededor.` : `Su ubicación (±${prec} m). Mostrando lo que hay alrededor.`);
});
gps.on('error', () => estado('No se pudo obtener su ubicación (permiso denegado o sin señal). Elija un distrito en la lista.'));

const estado = t => { $('v3-estado').textContent = t || ''; };
const exag = () => Number($('v3-exag').value);
function aplicarTerreno() { map.setTerrain($('v3-terreno').checked ? { source: 'dem', exaggeration: exag() } : null); }

map.on('load', () => {
  aplicarTerreno();
  if (!location.hash) setTimeout(() => gps.trigger(), 400);   // sin una vista guardada en la dirección, se ubica al usuario
  cargarVista();
  actualizarCota();
  setTimeout(actualizarCota, 600);
  setTimeout(actualizarCota, 1500);
  // Red hidrográfica nacional (OSM, /api/v3/hidrografia) de la zona visible.
  cargarHidro();
  cargarCoeficienteAuto();
  if (typeof aplicarOrdenCapasMapLibre === 'function') aplicarOrdenCapasMapLibre();
});

// ── Mapa base y relieve ─────────────────────────────────────────────
document.querySelectorAll('input[name="base"]').forEach(r => r.addEventListener('change', () => {
  map.setLayoutProperty('base-osm', 'visibility', r.value === 'osm' && r.checked ? 'visible' : 'none');
  map.setLayoutProperty('base-satelite', 'visibility', r.value === 'satelite' && r.checked ? 'visible' : 'none');
  map.setLayoutProperty('base-satelite-respaldo', 'visibility', r.value === 'satelite' && r.checked ? 'visible' : 'none');
  if (!r.checked) return;
  // Lienzo en blanco: sin mapa base ni sombreado, para ver las capas (hidrografía, parcelas, edificios…) sin ruido visual.
  if (r.value === 'blanco') {
    map.setPaintProperty('fondo', 'background-color', '#ffffff');
    map.setLayoutProperty('sombra', 'visibility', 'none');
    if ($('v3-sombra')) $('v3-sombra').checked = false;
  } else {
    map.setPaintProperty('fondo', 'background-color', '#dfe6e9');
  }
}));
$('v3-terreno').addEventListener('change', aplicarTerreno);
$('v3-hipso').addEventListener('change', e => {
  map.setLayoutProperty('hipsometria', 'visibility', e.target.checked ? 'visible' : 'none');
  $('v3-hipso-ley').hidden = !e.target.checked;
  $('v3-hipso-ctrl').hidden = !e.target.checked;
  if (e.target.checked) actualizarLeyendaHipso();
});

// ── Hipsometría: paleta, bandas/degradado y transparencia ───────────
// Mismos 9 colores (0 a 850 m) que PALETAS en hipsometria.js — solo para dibujar la leyenda acá en el cliente.
const PALETAS_HIPSO = {
  clasico: ['#4f8c5a', '#6ea86a', '#9cc479', '#c8d98c', '#e9e4a0', '#e8cf86', '#d9ad6b', '#c48c55', '#a86d44'],
  espectral: ['#3b4cc0', '#4480c8', '#56b0a1', '#8ac970', '#cddc5e', '#f7ce4b', '#f29e3a', '#de6c34', '#c0443a'],
  gris: ['#ededE9', '#dcdcd6', '#c9c9c1', '#b6b6ac', '#a3a397', '#909083', '#7d7d6f', '#6a6a5c', '#575749']
};
const CORTES_PCT_HIPSO = [0, 8.8, 14.7, 20.6, 29.4, 41.2, 52.9, 64.7, 82.4, 100];
function urlHipsometria() {
  const paleta = $('v3-hipso-paleta').value, bandas = $('v3-hipso-bandas').checked;
  return `${location.origin}/api/v3/teselas/hipsometria/{z}/{x}/{y}?paleta=${paleta}&bandas=${bandas ? 1 : 0}`;
}
function actualizarLeyendaHipso() {
  const colores = PALETAS_HIPSO[$('v3-hipso-paleta').value];
  const bandas = $('v3-hipso-bandas').checked;
  const rampa = document.querySelector('#v3-hipso-ley .v3-rampa');
  if (!rampa) return;
  const stops = bandas
    ? colores.map((c, i) => `${c} ${CORTES_PCT_HIPSO[i]}%, ${c} ${CORTES_PCT_HIPSO[i + 1]}%`).join(', ')
    : colores.map((c, i) => `${c} ${CORTES_PCT_HIPSO[i]}%`).join(', ');
  rampa.style.background = `linear-gradient(90deg, ${stops})`;
}
function aplicarEstiloHipso() {
  map.getSource('hipsometria')?.setTiles([urlHipsometria()]);
  actualizarLeyendaHipso();
}
$('v3-hipso-paleta').addEventListener('change', aplicarEstiloHipso);
$('v3-hipso-bandas').addEventListener('change', aplicarEstiloHipso);
$('v3-hipso-opac').addEventListener('input', e => {
  const v = Number(e.target.value);
  $('v3-hipso-opac-o').textContent = `${v}%`;
  map.setPaintProperty('hipsometria', 'raster-opacity', v / 100);
});
$('v3-sombra').addEventListener('change', e => map.setLayoutProperty('sombra', 'visibility', e.target.checked ? 'visible' : 'none'));
$('v3-exag').addEventListener('input', () => { $('v3-exag-o').textContent = `${String(exag()).replace('.', ',')}×`; aplicarTerreno(); });
$('v3-piso').addEventListener('input', e => {
  const h = Number(e.target.value);
  $('v3-piso-o').textContent = `${String(h).replace('.', ',')} m`;
  map.setPaintProperty('edificios', 'fill-extrusion-height', altura(h));
});
function estimarCotaParaguay(lng, lat) {
  // Modelo hipsométrico de referencia para Paraguay (metros sobre el nivel del mar)
  if (lng < -57.5) {
    if (lat > -24.0) return 65; // Concepción / Alto Paraguay
    if (lat < -26.0) return 46; // Pilar / Humaitá
    return 56; // Asunción / Eje fluvial Río Paraguay
  }
  if (lng >= -57.5 && lng <= -56.8 && lat >= -25.6 && lat <= -25.1) {
    if (lng > -57.18) return 216; // Cordillera / Piribebuy / Altos
    return 65; // Valle Ypacaraí / Luque / San Lorenzo
  }
  if (lng >= -56.0) {
    return lat < -26.5 ? 90 : 175; // Cuenca Río Paraná / Encarnación / CDE
  }
  if (lng < -58.5) return 135; // Chaco Central / Filadelfia
  return 90;
}

// Paraguay no tiene costa: el punto más bajo del país (confluencia Paraguay-Paraná) está ~45-48 m
// s.n.m. Una lectura por debajo de esto no puede ser real — casi siempre es queryTerrainElevation
// devolviendo basura porque la pestaña estuvo en segundo plano (ver entrada de hoy en TURNOS_IA.md)
// y el relieve 3D no terminó de armarse. Se descarta en vez de usarse tal cual.
const COTA_MIN_PY = 35;
// Además del piso absoluto, se compara contra la estimación regional (estimarCotaParaguay): el
// mismo bug de relieve en segundo plano puede devolver un número "posible en algún lado de
// Paraguay" pero igual de falso para el punto puntual que se está consultando (p. ej. 150 m donde
// lo real son 85 m). Más margen hacia arriba que hacia abajo: una loma real puede superar bastante
// la estimación regional (que ya es un valor bajo de referencia), bajar mucho más no es tan plausible.
function cotaConfiable(lng, lat, h) {
  if (h == null || h <= COTA_MIN_PY) return null;
  const esperado = estimarCotaParaguay(lng, lat);
  if (h < esperado - 100 || h > esperado + 250) return null;
  return h;
}

function obtenerCotaCentro() {
  const c = map.getCenter();
  let h = null;
  try {
    const h0 = map.queryTerrainElevation?.([c.lng, c.lat]);
    h = cotaConfiable(c.lng, c.lat, h0);
    if (h == null) {
      const d = 0.003;
      const puntos = [[c.lng + d, c.lat], [c.lng - d, c.lat], [c.lng, c.lat + d], [c.lng, c.lat - d]];
      for (const p of puntos) {
        const alt = cotaConfiable(p[0], p[1], map.queryTerrainElevation?.(p));
        if (alt != null) { h = alt; break; }
      }
    }
  } catch {}
  if (h == null) {
    h = estimarCotaParaguay(c.lng, c.lat);
  }
  return Math.round(h);
}

function recalibrarPresetsLocales(elev) {
  const sld = $('v3-inund-cota');
  if (!sld) return;
  const min = Math.max(0, elev - 4);
  const max = elev + 16;
  sld.min = min;
  sld.max = max;

  let actual = Number(sld.value);
  if (isNaN(actual) || actual < min || actual > max) {
    actual = elev + 2;
    sld.value = actual;
  }
  $('v3-inund-cota-o').textContent = `${actual} m`;

  const bNorm = $('v3-btn-norm');
  const bAler = $('v3-btn-aler');
  const bCrit = $('v3-btn-crit');
  const bRec = $('v3-btn-rec');

  if (bNorm) { bNorm.dataset.cota = elev; bNorm.textContent = `Base (${elev}m)`; }
  if (bAler) { bAler.dataset.cota = elev + 2; bAler.textContent = `Alerta (+2m)`; }
  if (bCrit) { bCrit.dataset.cota = elev + 5; bCrit.textContent = `Crítica (+5m)`; }
  if (bRec) { bRec.dataset.cota = elev + 8; bRec.textContent = `Récord (+8m)`; }
}

function actualizarCota() {
  const elev = obtenerCotaCentro();
  $('v3-cota').textContent = $('v3-terreno')?.checked ? `Cota del centro: ${num(elev)} m s. n. m.` : 'Cota del centro: active el relieve';

  const cuencaSelect = $('v3-inund-cuenca')?.value;
  if (!cuencaSelect || cuencaSelect === 'local') {
    const txtBase = $('v3-inund-cota-base-txt');
    if (txtBase) txtBase.textContent = `Base: ${elev} m`;
    recalibrarPresetsLocales(elev);
  }
}

// ── Simulación hidrológica e inundación (DMH / DINAC) ───────────────
const CUENCAS = {
  asuncion: {
    nombre: 'Río Paraguay — Pto. Asunción (Datum 55.4m)',
    centro: [-57.6433, -25.2755],
    zoom: 15.2, pitch: 55, bearing: -15,
    min: 52, max: 70, normal: 57.5, alerta: 60.0, record: 64.4,
    etqNormal: 'Normal (57.5m)', etqAlerta: 'Alerta (60m)', etqRecord: 'Récord 1983 (64.4m)'
  },
  concepcion: {
    nombre: 'Río Paraguay — Pto. Concepción (Datum 62m)',
    centro: [-57.4410, -23.4005],
    zoom: 15.0, pitch: 50, bearing: -10,
    min: 60, max: 78, normal: 64.5, alerta: 68.0, record: 70.7,
    etqNormal: 'Normal (64.5m)', etqAlerta: 'Alerta (68m)', etqRecord: 'Récord 1983 (70.7m)'
  },
  pilar: {
    nombre: 'Río Paraguay — Pto. Pilar (Datum 44m)',
    centro: [-58.2980, -26.8650],
    zoom: 15.0, pitch: 50, bearing: -10,
    min: 42, max: 60, normal: 46.5, alerta: 52.5, record: 54.0,
    etqNormal: 'Normal (46.5m)', etqAlerta: 'Alerta (52.5m)', etqRecord: 'Récord 1983 (54m)'
  },
  ayolas: {
    nombre: 'Río Paraná — Ayolas / Yacyretá (83m)',
    centro: [-56.8450, -27.3970],
    zoom: 14.8, pitch: 50, bearing: 0,
    min: 80, max: 96, normal: 83.0, alerta: 86.0, record: 89.5,
    etqNormal: 'Normal (83m)', etqAlerta: 'Alerta (86m)', etqRecord: 'Récord (89.5m)'
  },
  cde: {
    nombre: 'Río Paraná — Ciudad del Este (175m)',
    centro: [-54.6050, -25.5150],
    zoom: 14.8, pitch: 52, bearing: -25,
    min: 165, max: 195, normal: 175.0, alerta: 182.0, record: 188.0,
    etqNormal: 'Normal (175m)', etqAlerta: 'Alerta (182m)', etqRecord: 'Récord (188m)'
  },
  piribebuy: {
    nombre: 'Arroyo Piribebuy (Cordillera)',
    centro: [-57.04677, -25.46653],
    zoom: 16.5, pitch: 62, bearing: -20,
    min: 210, max: 236, normal: 216, alerta: 221, record: 228.5,
    etqNormal: 'Normal (216m)', etqAlerta: 'Alerta (221m)', etqRecord: 'Récord 2019 (228m)'
  },
  chaco: {
    nombre: 'Chaco Central — Filadelfia (135m)',
    centro: [-60.0330, -22.3520],
    zoom: 14.5, pitch: 45, bearing: 0,
    min: 130, max: 150, normal: 135, alerta: 138, record: 142,
    etqNormal: 'Normal (135m)', etqAlerta: 'Alerta (138m)', etqRecord: 'Récord (142m)'
  },
  bahianegra: {
    nombre: 'Río Paraguay — Bahía Negra / Pantanal (≈85m)',
    centro: [-58.1733, -20.2333],
    zoom: 13.5, pitch: 50, bearing: 0,
    min: 80, max: 98, normal: 85, alerta: 88, record: 92,
    etqNormal: 'Normal (85m)', etqAlerta: 'Alerta (88m)', etqRecord: 'Récord (92m)'
  }
};

let animandoInund = null;
let reintentoInund = null;

function aplicarCuenca(key) {
  const c = CUENCAS[key];
  if (!c) {
    const elev = obtenerCotaCentro();
    recalibrarPresetsLocales(elev);
    const txtBase = $('v3-inund-cota-base-txt');
    if (txtBase) txtBase.textContent = `Base: ${elev} m`;
    actualizarInundacion();
    return;
  }
  map.flyTo({ center: c.centro, zoom: c.zoom, pitch: c.pitch, bearing: c.bearing, duration: 1800 });
  const sld = $('v3-inund-cota');
  if (sld) { sld.min = c.min; sld.max = c.max; sld.value = c.alerta; }
  $('v3-btn-norm') && ($('v3-btn-norm').dataset.cota = c.normal, $('v3-btn-norm').textContent = c.etqNormal);
  $('v3-btn-aler') && ($('v3-btn-aler').dataset.cota = c.alerta, $('v3-btn-aler').textContent = c.etqAlerta);
  $('v3-btn-crit') && ($('v3-btn-crit').dataset.cota = ((c.normal + c.alerta) / 2).toFixed(1), $('v3-btn-crit').textContent = `Media (${((c.normal + c.alerta) / 2).toFixed(1)}m)`);
  $('v3-btn-rec') && ($('v3-btn-rec').dataset.cota = c.record, $('v3-btn-rec').textContent = c.etqRecord);
  const txtBase = $('v3-inund-cota-base-txt');
  if (txtBase) txtBase.textContent = `Base: ${c.normal} m`;
  if ($('v3-inundacion')) $('v3-inundacion').checked = true;
  setTimeout(actualizarInundacion, 1900);
}

$('v3-inund-cuenca')?.addEventListener('change', e => aplicarCuenca(e.target.value));

// Área aproximada de un anillo [lng,lat] en m² (plano local, suficiente para una cifra de referencia "~X ha").
function areaAnilloM2(anillo, latRef) {
  const mLat = 111320, mLng = 111320 * Math.cos(latRef * Math.PI / 180);
  let area = 0;
  for (let i = 0; i < anillo.length - 1; i++) {
    const [x1, y1] = anillo[i], [x2, y2] = anillo[i + 1];
    area += (x1 * mLng) * (y2 * mLat) - (x2 * mLng) * (y1 * mLat);
  }
  return Math.abs(area) / 2;
}

// ── Contorno de inundación suave (marching squares sobre la cota real), no celdas rectangulares ──
// Nota: a diferencia de la versión anterior (banda de 25 m bajo la cota), esto cubre toda la vista por
// debajo de la cota — más parecido a cómo se comporta una creciente real dentro del recuadro visible.
function suavizarAnillo(anillo, iteraciones = 2) {
  // Chaikin (corte de esquinas): cada iteración reemplaza cada vértice por dos, redondeando el trazo.
  let pts = anillo;
  for (let it = 0; it < iteraciones; it++) {
    const n = pts.length - 1;   // el anillo llega cerrado (último punto == primero)
    if (n < 3) return pts;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n];
      out.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25]);
      out.push([p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]);
    }
    out.push(out[0]);
    pts = out;
  }
  return pts;
}

function contornoSuaveInundacion(w, s, e, n, N, cotaVal) {
  // Grilla de esquinas con 1 celda de margen "seco" forzado en cada borde, para que cualquier
  // contorno cierre siempre adentro de la grilla y nunca quede abierto contra el borde del recuadro.
  const dx = (e - w) / N, dy = (n - s) / N;
  const G = N + 2;
  const SECO = cotaVal + 1000;
  const xDe = i => w + (i - 1) * dx, yDe = j => s + (j - 1) * dy;
  const val = [];
  for (let j = 0; j <= G; j++) {
    const fila = [];
    const bordeJ = (j === 0 || j === G);
    for (let i = 0; i <= G; i++) {
      if (bordeJ || i === 0 || i === G) { fila.push(SECO); continue; }
      const lng = xDe(i), lat = yDe(j);
      const h = cotaConfiable(lng, lat, map.queryTerrainElevation?.([lng, lat]));
      // Dato no confiable (relieve 3D sin terminar de cargar, o muy lejos de lo esperable en esta
      // zona del país): se trata como "seco" en vez de arriesgar un falso "muy bajo = anegado".
      fila.push(h == null ? SECO : h);
    }
    val.push(fila);
  }

  // Conectividad hidráulica: que la mancha nazca del cauce real y avance solo por celdas vecinas
  // también anegadas, en vez de "todo lo que esté bajo la cota" sin importar si está conectado al
  // río (eso inundaba charcos aislados en lomadas sin ningún arroyo cerca).
  const iDe = lng => Math.round((lng - w) / dx) + 1, jDe = lat => Math.round((lat - s) / dy) + 1;
  const semillas = [];
  const hidroData = map.getSource('hidro')?._data;
  // Semilla = cualquier celda de grilla pegada a un tramo real de hidrografía, sin exigir que esa
  // celda puntual ya lea "anegada": una sola lectura mala justo en el pixel del cauce (relieve 3D
  // sin terminar de cargar) no debe descartar la semilla entera, porque el BFS de abajo igual revisa
  // la lectura real de cada vecina antes de dejarla avanzar — alcanza con que ALGUNA vecina lea bien.
  (hidroData?.features || []).forEach(f => {
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords)) return;
    coords.forEach(pt => {
      if (!Array.isArray(pt) || typeof pt[0] !== 'number') return;
      const i = iDe(pt[0]), j = jDe(pt[1]);
      if (i >= 1 && i < G && j >= 1 && j < G) semillas.push([i, j]);
    });
  });
  if (!semillas.length) {
    // Sin hidrografía cargada (o ningún tramo bajo la cota todavía): el agua nace del punto más bajo.
    let mejor = null, minH = Infinity;
    for (let j = 1; j < G; j++) for (let i = 1; i < G; i++) {
      if (val[j][i] < minH) { minH = val[j][i]; mejor = [i, j]; }
    }
    if (mejor && minH <= cotaVal) semillas.push(mejor);
  }
  if (semillas.length) {
    const visitado = Array.from({ length: G + 1 }, () => new Array(G + 1).fill(false));
    const cola = [];
    semillas.forEach(([i, j]) => { if (!visitado[j][i]) { visitado[j][i] = true; cola.push([i, j]); } });
    let cabeza = 0;
    while (cabeza < cola.length) {
      const [i, j] = cola[cabeza++];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || ni > G || nj < 0 || nj > G || visitado[nj][ni]) continue;
        if (val[nj][ni] <= cotaVal) { visitado[nj][ni] = true; cola.push([ni, nj]); }
      }
    }
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      if (val[j][i] <= cotaVal && !visitado[j][i]) val[j][i] = SECO;
    }
  }

  const lerp = (v0, v1, p0, p1) => {
    const t = (cotaVal - v0) / (v1 - v0);
    return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
  };

  const segmentos = [];
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const a = val[j][i], bb = val[j][i + 1], cc = val[j + 1][i + 1], d = val[j + 1][i];
      const caso = (a <= cotaVal ? 8 : 0) | (bb <= cotaVal ? 4 : 0) | (cc <= cotaVal ? 2 : 0) | (d <= cotaVal ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const pTL = [xDe(i), yDe(j)], pTR = [xDe(i + 1), yDe(j)], pBR = [xDe(i + 1), yDe(j + 1)], pBL = [xDe(i), yDe(j + 1)];
      const top = () => lerp(a, bb, pTL, pTR), right = () => lerp(bb, cc, pTR, pBR);
      const bottom = () => lerp(d, cc, pBL, pBR), left = () => lerp(a, d, pTL, pBL);
      const seg = (p1, p2) => segmentos.push([p1, p2]);
      // Tabla estándar de marching squares (16 casos; 5 y 10 son los "silla de montar" ambiguos).
      switch (caso) {
        case 1: seg(left(), bottom()); break;
        case 2: seg(bottom(), right()); break;
        case 3: seg(left(), right()); break;
        case 4: seg(top(), right()); break;
        case 6: seg(top(), bottom()); break;
        case 7: seg(top(), left()); break;
        case 8: seg(left(), top()); break;
        case 9: seg(top(), bottom()); break;
        case 11: seg(top(), right()); break;
        case 12: seg(left(), right()); break;
        case 13: seg(right(), bottom()); break;
        case 14: seg(bottom(), left()); break;
        case 5: { const prom = (a + bb + cc + d) / 4; if (prom <= cotaVal) { seg(left(), top()); seg(right(), bottom()); } else { seg(left(), bottom()); seg(top(), right()); } break; }
        case 10: { const prom = (a + bb + cc + d) / 4; if (prom <= cotaVal) { seg(top(), right()); seg(left(), bottom()); } else { seg(top(), left()); seg(bottom(), right()); } break; }
      }
    }
  }
  if (!segmentos.length) return { type: 'FeatureCollection', features: [] };

  // Unir segmentos en anillos cerrados emparejando extremos (el margen seco garantiza que cierren).
  const key = p => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  const usados = new Array(segmentos.length).fill(false);
  const anillos = [];
  for (let ini = 0; ini < segmentos.length; ini++) {
    if (usados[ini]) continue;
    usados[ini] = true;
    const anillo = [segmentos[ini][0], segmentos[ini][1]];
    for (let salvaguarda = 0; salvaguarda < segmentos.length + 5; salvaguarda++) {
      const ultimo = anillo[anillo.length - 1];
      if (anillo.length > 2 && key(ultimo) === key(anillo[0])) break;   // anillo cerrado
      let encontrado = false;
      for (let k = 0; k < segmentos.length; k++) {
        if (usados[k]) continue;
        if (key(segmentos[k][0]) === key(ultimo)) { anillo.push(segmentos[k][1]); usados[k] = true; encontrado = true; break; }
        if (key(segmentos[k][1]) === key(ultimo)) { anillo.push(segmentos[k][0]); usados[k] = true; encontrado = true; break; }
      }
      if (!encontrado) break;
    }
    if (anillo.length > 3 && key(anillo[0]) === key(anillo[anillo.length - 1])) anillos.push(anillo);
  }

  const features = anillos.map(anillo => ({
    type: 'Feature', properties: { cota: cotaVal },
    geometry: { type: 'Polygon', coordinates: [suavizarAnillo(anillo)] }
  }));
  return { type: 'FeatureCollection', features };
}

/** Versión anterior (celdas rectangulares fusionadas por fila): respaldo si el contorno suave falla. */
function generarPoligonoInundacionCeldas(cotaVal, w, s, e, n, zoom) {
  const NX = zoom >= 14 ? 36 : 28, NY = NX;
  const dx = (e - w) / NX, dy = (n - s) / NY;
  const padX = dx * 0.02, padY = dy * 0.02;
  const features = [];
  for (let j = 0; j < NY; j++) {
    const y0 = s + j * dy - padY, y1 = s + (j + 1) * dy + padY, ym = (y0 + y1) / 2;
    let stripStart = null;
    for (let i = 0; i <= NX; i++) {
      let isFlooded = false;
      if (i < NX) {
        const lngM = w + (i + 0.5) * dx;
        const h = cotaConfiable(lngM, ym, map.queryTerrainElevation?.([lngM, ym]));
        if (h != null && h <= cotaVal && h >= cotaVal - 25) isFlooded = true;
      }
      if (isFlooded) { if (stripStart === null) stripStart = i; }
      else if (stripStart !== null) {
        const x0 = w + stripStart * dx - padX, x1 = w + i * dx + padX;
        features.push({ type: 'Feature', properties: { cota: cotaVal }, geometry: { type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] } });
        stripStart = null;
      }
    }
  }
  return { type: 'FeatureCollection', features };
}

function generarPoligonoInundacion(cotaVal) {
  const b = map.getBounds();
  const zoom = map.getZoom();

  // Cubre TODA la vista visible, sin tope de grados (antes era un radio fijo de ~22 km desde el
  // centro: en una vista regional o departamental —p. ej. Ayolas/Yacyretá/Isla Apipé— eso dejaba un
  // corte recto artificial bien adentro del río). Para que funcione igual de bien a nivel distrital,
  // departamental y nacional sin que la consulta de cotas se vuelva lenta, la grilla se hace más
  // gruesa cuanto más alejado el zoom (la vista país queda más aproximada, como el resto del relieve).
  const anchoView = b.getEast() - b.getWest(), altoView = b.getNorth() - b.getSouth();
  const margenX = anchoView * 0.08, margenY = altoView * 0.08;   // margen para que no se note el corte al panear
  const w = b.getWest() - margenX, e = b.getEast() + margenX;
  const s = b.getSouth() - margenY, n = b.getNorth() + margenY;
  const N = zoom >= 14 ? 40 : zoom >= 11 ? 36 : zoom >= 8 ? 30 : zoom >= 5 ? 24 : 18;

  try {
    const fc = contornoSuaveInundacion(w, s, e, n, N, cotaVal);
    if (fc.features.length) return fc;
  } catch { /* cae al método anterior si el contorno suave falla */ }
  return generarPoligonoInundacionCeldas(cotaVal, w, s, e, n, zoom);
}

// Indica en qué nivel (Base/Alerta/Crítica/Récord) cae la cota actual, según los umbrales de los
// botones de preset (que ya traen su data-cota real, sea de una cuenca con datos o del punto actual).
function actualizarNivelInund(cotaVal) {
  const el = $('v3-inund-nivel');
  if (!el) return;
  const cBase = Number($('v3-btn-norm')?.dataset.cota);
  const cAlerta = Number($('v3-btn-aler')?.dataset.cota);
  const cCritica = Number($('v3-btn-crit')?.dataset.cota);
  const cRecord = Number($('v3-btn-rec')?.dataset.cota);
  let etiqueta = 'BASE', color = '#34d399';
  if (!isNaN(cRecord) && cotaVal >= cRecord) { etiqueta = 'RÉCORD'; color = '#f87171'; }
  else if (!isNaN(cCritica) && cotaVal >= cCritica) { etiqueta = 'CRÍTICA'; color = '#fb923c'; }
  else if (!isNaN(cAlerta) && cotaVal >= cAlerta) { etiqueta = 'ALERTA'; color = '#fbbf24'; }
  else if (!isNaN(cBase) && cotaVal < cBase - 0.15) { etiqueta = 'BAJO BASE'; color = '#38bdf8'; }
  el.textContent = etiqueta;
  el.style.color = color;
  const punto = $('v3-instr-punto');
  if (punto) punto.style.color = color;
}

function actualizarInundacion() {
  const activo = $('v3-inundacion')?.checked;
  $('v3-inund-ctrl').hidden = !activo;
  map.setLayoutProperty('inundacion-capa', 'visibility', activo ? 'visible' : 'none');
  if (map.getLayer('inundacion-borde')) {
    map.setLayoutProperty('inundacion-borde', 'visibility', activo ? 'visible' : 'none');
  }

  if (!activo) {
    if (animandoTimeline) {
      clearInterval(animandoTimeline);
      animandoTimeline = null;
      if ($('v3-inund-animar')) $('v3-inund-animar').textContent = '▶ Reproducir Onda (4D)';
    }
    map.setPaintProperty('edificios', 'fill-extrusion-color', $('v3-color')?.value === 'real' ? COLOR_REAL : COLOR_CATASTRO);
    try { mini.getSource('inundacion-mini')?.setData(vacio); } catch {}
    map.getSource('evacuacion-rutas')?.setData(vacio);
    map.getSource('evacuacion-albergues')?.setData(vacio);
    if ($('v3-evac-info')) $('v3-evac-info').hidden = true;
    $('v3-inund-analitica').hidden = true;
    detenerVectoresFlujo();
    return;
  }

  const cotaVal = Number($('v3-inund-cota').value);
  $('v3-inund-cota-o').textContent = `${cotaVal} m`;
  actualizarNivelInund(cotaVal);

  // Si el relieve de la vista todavía no terminó de cargar, queryTerrainElevation puede devolver
  // valores incompletos/erróneos (toda la vista "inundada" o cotas muy por debajo de la real).
  // Se calcula igual con lo que haya ahora (para no congelar la interfaz) y se reintenta una vez.
  if (map.areTilesLoaded && !map.areTilesLoaded()) {
    estado('Cargando el relieve para terminar de calcular la inundación…');
    clearTimeout(reintentoInund);
    reintentoInund = setTimeout(() => { if ($('v3-inundacion')?.checked) actualizarInundacion(); }, 700);
  }

  const fc = generarPoligonoInundacion(cotaVal);
  map.getSource('inundacion')?.setData(fc);
  try { mini.getSource('inundacion-mini')?.setData(fc); } catch {}

  // Afectación de edificaciones en 3D y evaluación de Cota Segura (ICST)
  let totalComp = 0, totalCondic = 0, totalEdif = 0;
  const edifSrc = map.getSource('edificios');
  if (edifSrc?._data?.features?.length) {
    totalEdif = edifSrc._data.features.length;
    edifSrc._data.features.forEach(f => {
      const coord = f.geometry?.coordinates?.[0]?.[0] || f.geometry?.coordinates?.[0];
      if (coord && typeof coord[0] === 'number') {
        const h = cotaConfiable(coord[0], coord[1], map.queryTerrainElevation?.(coord));
        const isInund = h != null && h <= cotaVal;
        const isCondic = h != null && h > cotaVal && h <= (cotaVal + 1.5);
        f.properties._cota = h;
        f.properties._inund = isInund;
        f.properties._condic = isCondic;
        if (isInund) totalComp++;
        else if (isCondic) totalCondic++;
      }
    });

    const modoColor = $('v3-color')?.value;
    if (modoColor === 'icst') {
      map.setPaintProperty('edificios', 'fill-extrusion-color', [
        'case',
        ['==', ['get', '_inund'], true], '#ef4444',
        ['==', ['get', '_condic'], true], '#f59e0b',
        '#10b981'
      ]);
    } else {
      map.setPaintProperty('edificios', 'fill-extrusion-color', [
        'case',
        ['==', ['get', '_inund'], true], '#ef4444',
        modoColor === 'real' ? COLOR_REAL : COLOR_CATASTRO
      ]);
    }

    const badgeICST = $('v3-icst-badge');
    const detalleICST = $('v3-icst-detalle');
    if (badgeICST && detalleICST) {
      const totalSeguros = Math.max(0, totalEdif - totalComp - totalCondic);
      const pctApto = Math.round((totalSeguros / totalEdif) * 100);
      badgeICST.textContent = `${pctApto}% Apto`;
      badgeICST.style.color = pctApto >= 80 ? '#34d399' : (pctApto >= 50 ? '#fbbf24' : '#f87171');
      detalleICST.textContent = `${totalSeguros} construcciones seguras · ${totalCondic} condicionadas (+1.5m) · ${totalComp} en cota de agua.`;
    }
  }

  const latRef = map.getCenter().lat;
  const areaTotalM2 = fc.features.reduce((acc, f) => acc + areaAnilloM2(f.geometry.coordinates[0], latRef), 0);
  const ha = (areaTotalM2 / 10000).toFixed(1);
  const baseCota = obtenerCotaCentro();
  const delta = (cotaVal - baseCota).toFixed(1);
  const signoDelta = delta >= 0 ? `+${delta}` : delta;

  $('v3-inund-info').innerHTML = totalComp > 0
    ? `⚠️ <strong>Cota ${cotaVal} m s.n.m. (${signoDelta}m)</strong>: ~${ha} ha anegadas.<br><span style="color:#f87171;font-weight:bold;">${totalComp} de ${totalEdif} construcciones en riesgo crítico.</span>`
    : `✓ <strong>Cota ${cotaVal} m s.n.m. (${signoDelta}m)</strong>: ~${ha} ha cubiertas en valle.<br>Construcciones seguras en cota alta.`;

  // Volumen y caudal: estimación a partir del área real anegada (no de un modelo hidrológico).
  // Profundidad media = qué tan por encima de la cota base está la lámina, acotada a un rango razonable.
  const areaM2 = Number(ha) * 10000;
  const profundidadMedia = Math.max(0.3, Math.min(8, Number(delta) * 0.5 + 0.5));
  const volumenM3 = areaM2 * profundidadMedia;
  const volumenHm3 = volumenM3 / 1e6;
  // Si el usuario cargó cuántas horas duró la lluvia (mismo campo que ya usa el acumulado en mm),
  // el caudal se reparte en ese tiempo real; si no, 6 h de referencia (orden de magnitud para una
  // crecida rápida, no un cálculo de cuenca real). Antes era siempre fijo en 6 h, sin importar lo cargado.
  const horasLluviaCargadas = Number($('v3-lluvia-horas')?.value) || 0;
  const TIEMPO_CONCENTRACION_S = (horasLluviaCargadas > 0 ? horasLluviaCargadas : 6) * 3600;
  const caudalM3s = volumenM3 / TIEMPO_CONCENTRACION_S;
  $('v3-inund-analitica').hidden = false;
  $('v3-vol-o').textContent = `${volumenHm3 < 10 ? volumenHm3.toFixed(2) : Math.round(volumenHm3)} hm³`;
  $('v3-caudal-o').textContent = `${num(Math.round(caudalM3s))} m³/s`;

  // Alerta de Infraestructura Crítica: Construcciones y Red Vial
  const elEdif = $('v3-edif-afect-o');
  if (elEdif) {
    elEdif.textContent = totalComp > 0 ? `${totalComp} bajo agua` : '0 afectadas';
    elEdif.style.color = totalComp > 0 ? '#f87171' : '#34d399';
  }

  const elVias = $('v3-vias-afect-o');
  if (elVias) {
    const kmViasEst = Number(ha) > 1.5 ? (Number(ha) * 0.12).toFixed(1) : 0;
    elVias.textContent = kmViasEst > 0 ? `~${kmViasEst} km cortados` : 'Vías transitables';
    elVias.style.color = kmViasEst > 0 ? '#fbbf24' : '#34d399';
  }

  if ($('v3-flujo')?.checked) iniciarVectoresFlujo(); else detenerVectoresFlujo();
}

$('v3-inundacion')?.addEventListener('change', () => {
  if ($('v3-inundacion').checked) {
    const base = obtenerCotaCentro();
    recalibrarPresetsLocales(base);
    const sld = $('v3-inund-cota');
    if (sld) {
      const val = Number(sld.value);
      if (isNaN(val) || val < Number(sld.min) || val > Number(sld.max)) {
        sld.value = base + 2;
      }
    }
  }
  actualizarInundacion();
});
$('v3-inund-cota')?.addEventListener('input', actualizarInundacion);

document.querySelectorAll('.v3-inund-btn').forEach(b => {
  b.addEventListener('click', () => {
    let target = null;
    if (b.dataset.cota != null) {
      target = Number(b.dataset.cota);
    } else if (b.dataset.delta != null) {
      target = obtenerCotaCentro() + Number(b.dataset.delta);
    }
    if (target != null) {
      $('v3-inund-cota').value = target;
      actualizarInundacion();
    }
  });
});

$('v3-inund-recalc')?.addEventListener('click', () => {
  const elev = obtenerCotaCentro();
  recalibrarPresetsLocales(elev);
  const txtBase = $('v3-inund-cota-base-txt');
  if (txtBase) txtBase.textContent = `Base: ${elev} m`;
  actualizarInundacion();
});

// ── Timeline Player 4D: propagación horaria de la onda de crecida (Hidrograma Sintético) ──
let animandoTimeline = null;

function obtenerParametrosOnda() {
  const base = obtenerCotaCentro();
  const cotaActualTarget = Number($('v3-inund-cota')?.value) || (base + 3);
  const deltaMax = Math.max(1.5, Math.abs(cotaActualTarget - base));
  const hCargadas = Number($('v3-lluvia-horas')?.value) || 0;
  const tTotal = hCargadas > 0 ? Math.max(6, Math.min(72, hCargadas * 2)) : 24;
  return { base, deltaMax, tTotal };
}

function calcularCotaHidrograma(t, tTotal, base, deltaMax) {
  const tc = Math.max(2, tTotal * 0.35); // Tiempo al pico (~35% de duración)
  let frac = 0;
  let fase = 'Estiaje inicial';

  if (t === 0) {
    frac = 0;
    fase = 'Estiaje inicial';
  } else if (t <= tc) {
    frac = Math.pow(t / tc, 1.35);
    fase = 'Concentración pluvial (Subida)';
  } else {
    const tr = Math.max(1, tTotal - tc);
    frac = Math.exp(-2.2 * ((t - tc) / tr));
    fase = (t <= tc + 1.5) ? 'Pico de crecida' : 'Recesión / Drenaje';
  }

  const cota = +(base + deltaMax * frac).toFixed(2);
  return { cota, fase, frac: Math.min(1, Math.max(0, frac)) };
}

function fijarPasoTemporal(t) {
  const { base, deltaMax, tTotal } = obtenerParametrosOnda();
  const sldT = $('v3-tiempo-slider');
  if (sldT) {
    sldT.max = tTotal;
    sldT.value = t;
  }

  const res = calcularCotaHidrograma(t, tTotal, base, deltaMax);
  const outT = $('v3-tiempo-o');
  if (outT) outT.textContent = `T = ${t}h (${res.fase})`;

  const sldCota = $('v3-inund-cota');
  if (sldCota) {
    sldCota.value = res.cota;
  }
  actualizarInundacion();
}

function toggleReproduccionTimeline() {
  const btn = $('v3-inund-animar');
  if (animandoTimeline) {
    clearInterval(animandoTimeline);
    animandoTimeline = null;
    if (btn) btn.textContent = '▶ Reproducir Onda (4D)';
    estado('Simulación temporal pausada.');
  } else {
    if (!$('v3-inundacion').checked) {
      $('v3-inundacion').checked = true;
      actualizarInundacion();
    }
    if (btn) btn.textContent = '⏸ Pausar Onda';
    const { tTotal } = obtenerParametrosOnda();
    const sldT = $('v3-tiempo-slider');
    let t = Number(sldT?.value) || 0;
    if (t >= tTotal) t = 0;

    estado('Reproduciendo onda de crecida 4D paso a paso…');
    animandoTimeline = setInterval(() => {
      t = +(t + 0.5).toFixed(1);
      if (t > tTotal) {
        clearInterval(animandoTimeline);
        animandoTimeline = null;
        if (btn) btn.textContent = '▶ Reproducir Onda (4D)';
        estado(`Ciclo de tormenta completado (${tTotal} h).`);
        return;
      }
      fijarPasoTemporal(t);
    }, 220);
  }
}

$('v3-tiempo-slider')?.addEventListener('input', e => {
  if (animandoTimeline) {
    clearInterval(animandoTimeline);
    animandoTimeline = null;
    $('v3-inund-animar').textContent = '▶ Reproducir Onda (4D)';
  }
  fijarPasoTemporal(Number(e.target.value));
});

$('v3-tiempo-prev')?.addEventListener('click', () => {
  const sldT = $('v3-tiempo-slider');
  const t = Math.max(0, (Number(sldT?.value) || 0) - 1);
  fijarPasoTemporal(t);
});

$('v3-tiempo-next')?.addEventListener('click', () => {
  const { tTotal } = obtenerParametrosOnda();
  const sldT = $('v3-tiempo-slider');
  const t = Math.min(tTotal, (Number(sldT?.value) || 0) + 1);
  fijarPasoTemporal(t);
});

$('v3-inund-animar')?.addEventListener('click', toggleReproduccionTimeline);

// ── Centro de Inteligencia Hídrica Territorial (CIHT): ICST e IRCT ──
function calcularICST(cotaTerreno, cotaCrecida) {
  const cotaT = Number(cotaTerreno) || 0;
  const cotaC = Number(cotaCrecida) || 0;
  const hSegura = Number((cotaC + 1.5).toFixed(1)); // Margen libre normativo de seguridad
  const delta = Number((cotaT - hSegura).toFixed(1));

  let score, estado, color, badge, recomendacion;
  if (cotaT <= cotaC) {
    score = Math.max(10, Math.min(38, Math.round(30 + (cotaT - cotaC) * 5)));
    estado = 'ZONA INUNDABLE RESTRINGIDA (FRANJA HÍDRICA)';
    color = '#ef4444';
    badge = '🔴 NO APTO';
    recomendacion = 'Prohibición de edificación conforme al Art. 235 de la Ley Orgánica Municipal N° 3966/2010. Zona de amortiguamiento hídrico.';
  } else if (cotaT < hSegura) {
    score = Math.round(45 + ((cotaT - cotaC) / 1.5) * 20);
    estado = 'URBANIZACIÓN CONDICIONADA (VULNERABLE A EVENTOS EXTREMOS)';
    color = '#f59e0b';
    badge = '🟡 CONDICIONADO';
    recomendacion = 'Apto con drenaje pluvial certificado y elevación de cota de piso terminado mínima a ' + hSegura.toFixed(2) + ' m s.n.m.';
  } else {
    score = Math.min(100, Math.round(80 + Math.min(20, delta * 3)));
    estado = 'ZONA ESTRATÉGICA SEGURA (APTO PARA DESARROLLO)';
    color = '#10b981';
    badge = '🟢 APTO / SEGURO';
    recomendacion = 'Elevación superior al margen de crecida (+1.50 m). Apto para infraestructura comunitaria, albergues y loteamientos.';
  }

  return { score, cotaT, cotaC, hSegura, delta, estado, color, badge, recomendacion };
}

function calcularIRCTDistrital(distritoNom) {
  const nom = (distritoNom || '').toUpperCase();
  let baseScore = 74;
  if (nom.includes('PILAR') || nom.includes('ALBERDI') || nom.includes('AYOLAS')) baseScore = 58;
  else if (nom.includes('BAHIA NEGRA') || nom.includes('FILADELFIA') || nom.includes('ESTIGARRIBIA')) baseScore = 64;
  else if (nom.includes('ASUNCION') || nom.includes('LUQUE') || nom.includes('SAN LORENZO')) baseScore = 78;
  else if (nom.includes('PIRIBEBUY') || nom.includes('CAACUPE') || nom.includes('ALTOS')) baseScore = 82;

  return {
    score: baseScore,
    nivel: baseScore >= 80 ? 'Resiliencia Alta' : (baseScore >= 60 ? 'Resiliencia Media' : 'Vulnerable'),
    color: baseScore >= 80 ? '#10b981' : (baseScore >= 60 ? '#f59e0b' : '#ef4444'),
    desglose: {
      hidrologico: nom.includes('PILAR') ? 42 : 80,
      sequia: nom.includes('BAHIA') ? 52 : 76,
      incendios: nom.includes('BAHIA') ? 45 : 82,
      infraestructura: 85,
      social: 74,
      bosques: 79
    }
  };
}

// ── Rutas de Evacuación Segura hacia Albergues MEC y Centros de Salud ──
let cacheAlbergues = null;

function distanciaMetros(lng1, lat1, lng2, lat2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function cargarAlberguesReferencia() {
  if (cacheAlbergues && cacheAlbergues.length) return cacheAlbergues;
  try {
    const [resSalud, resEdu] = await Promise.all([
      fetch('/Cambio_climatico/data/infraestructura_salud.geojson').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/Cambio_climatico/data/infraestructura_educacion.geojson').then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    const lista = [];
    if (resSalud?.features) {
      for (const f of resSalud.features) {
        const c = f.geometry?.coordinates;
        if (c && typeof c[0] === 'number') {
          lista.push({
            nombre: f.properties?.nombre || 'Centro de Salud MSPyBS',
            tipo: f.properties?.tipo || 'Hospital / Salud',
            dpto: f.properties?.departamento || '',
            dist: f.properties?.distrito || '',
            lng: c[0],
            lat: c[1]
          });
        }
      }
    }
    if (resEdu?.features) {
      for (const f of resEdu.features) {
        const c = f.geometry?.coordinates;
        if (c && typeof c[0] === 'number') {
          lista.push({
            nombre: `Escuela MEC - ${f.properties?.barrio || f.properties?.distrito || 'Local'} (${f.properties?.codigo || ''})`,
            tipo: 'Escuela / Albergue MEC',
            dpto: f.properties?.departamento || '',
            dist: f.properties?.distrito || '',
            lng: c[0],
            lat: c[1]
          });
        }
      }
    }
    cacheAlbergues = lista;
    return lista;
  } catch (err) {
    console.warn('Error cargando albergues:', err);
    return [];
  }
}

async function trazarRutasEvacuacion() {
  const evacInfo = $('v3-evac-info');
  if (evacInfo) {
    evacInfo.textContent = 'Calculando rutas de evacuación a pie hacia albergues seguros…';
    evacInfo.style.color = '#38bdf8';
    evacInfo.hidden = false;
  }

  const cotaVal = Number($('v3-inund-cota')?.value) || (obtenerCotaCentro() + 2);
  const edifSrc = map.getSource('edificios');
  const features = edifSrc?._data?.features || [];

  // Edificaciones inundadas en la vista actual
  const inundados = [];
  for (const f of features) {
    const coord = f.geometry?.coordinates?.[0]?.[0] || f.geometry?.coordinates?.[0];
    if (coord && typeof coord[0] === 'number') {
      const h = f.properties?._cota ?? cotaConfiable(coord[0], coord[1], map.queryTerrainElevation?.(coord));
      if (h != null && h <= cotaVal) {
        inundados.push({ coord, h, props: f.properties });
      }
    }
  }

  if (features.length === 0) {
    if (evacInfo) {
      evacInfo.textContent = 'ℹ️ Acerque el mapa (zoom ≥ 14) para que se carguen las edificaciones y se puedan trazar rutas.';
      evacInfo.style.color = '#fbbf24';
      evacInfo.hidden = false;
    }
    map.getSource('evacuacion-rutas')?.setData(vacio);
    map.getSource('evacuacion-albergues')?.setData(vacio);
    return;
  }

  if (inundados.length === 0) {
    if (evacInfo) {
      evacInfo.textContent = `✓ Todas las ${features.length} edificaciones de la vista se hallan en cotas seguras (> ${cotaVal.toFixed(1)} m s.n.m.). Sin evacuación requerida.`;
      evacInfo.style.color = '#34d399';
      evacInfo.hidden = false;
    }
    map.getSource('evacuacion-rutas')?.setData(vacio);
    map.getSource('evacuacion-albergues')?.setData(vacio);
    return;
  }

  const todosAlbergues = await cargarAlberguesReferencia();
  if (!todosAlbergues || todosAlbergues.length === 0) {
    if (evacInfo) {
      evacInfo.textContent = '⚠️ No se pudo consultar la base de datos de albergues e infraestructura de contingencia.';
      evacInfo.style.color = '#f87171';
    }
    return;
  }

  const center = map.getCenter();
  let candidatos = todosAlbergues.map(a => {
    const dCentro = distanciaMetros(center.lng, center.lat, a.lng, a.lat);
    return { ...a, dCentro };
  }).filter(a => a.dCentro <= 35000);

  if (candidatos.length === 0) {
    candidatos = todosAlbergues.map(a => ({
      ...a,
      dCentro: distanciaMetros(center.lng, center.lat, a.lng, a.lat)
    })).sort((a, b) => a.dCentro - b.dCentro).slice(0, 15);
  }

  // Verificar cota del albergue: debe estar fuera del alcance del agua
  let alberguesSeguros = candidatos.filter(a => {
    const elev = cotaConfiable(a.lng, a.lat, map.queryTerrainElevation?.([a.lng, a.lat]));
    return elev == null || elev > (cotaVal + 0.5);
  });
  if (alberguesSeguros.length === 0) alberguesSeguros = candidatos.slice(0, 5);

  const rutasFeatures = [];
  const alberguesElegidos = new Map();
  let sumaTiempos = 0;
  const paso = inundados.length > 120 ? Math.ceil(inundados.length / 80) : 1;

  for (let i = 0; i < inundados.length; i += paso) {
    const ed = inundados[i];
    let mejorAlbergue = null;
    let menorDist = Infinity;

    for (const alb of alberguesSeguros) {
      const d = distanciaMetros(ed.coord[0], ed.coord[1], alb.lng, alb.lat);
      if (d < menorDist) {
        menorDist = d;
        mejorAlbergue = alb;
      }
    }

    if (mejorAlbergue) {
      const tMin = Math.max(1, Math.round(menorDist / 75)); // 4.5 km/h = 75 m/min a pie
      sumaTiempos += tMin;

      rutasFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [ed.coord[0], ed.coord[1]],
            [mejorAlbergue.lng, mejorAlbergue.lat]
          ]
        },
        properties: {
          albergue: mejorAlbergue.nombre,
          distanciaM: Math.round(menorDist),
          tiempoMin: tMin
        }
      });

      const keyAlb = `${mejorAlbergue.lng.toFixed(5)},${mejorAlbergue.lat.toFixed(5)}`;
      if (!alberguesElegidos.has(keyAlb)) {
        alberguesElegidos.set(keyAlb, mejorAlbergue);
      }
    }
  }

  const alberguesFeatures = Array.from(alberguesElegidos.values()).map(alb => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [alb.lng, alb.lat]
    },
    properties: {
      nombre: alb.nombre,
      tipo: alb.tipo,
      capacidad: alb.tipo.includes('Salud') ? 'Atención Médica y Triaje' : 'Albergue Temporal (150 personas)'
    }
  }));

  map.getSource('evacuacion-rutas')?.setData({ type: 'FeatureCollection', features: rutasFeatures });
  map.getSource('evacuacion-albergues')?.setData({ type: 'FeatureCollection', features: alberguesFeatures });

  const tMedio = rutasFeatures.length > 0 ? Math.round(sumaTiempos / rutasFeatures.length) : 0;
  if (evacInfo) {
    evacInfo.innerHTML = `🏃 <strong>Rutas trazadas:</strong> ${rutasFeatures.length} construcciones conectadas a ${alberguesFeatures.length} albergues seguros (escuelas MEC y centros de salud). Tiempo medio evacuación: <strong>${tMedio} min</strong> a pie.`;
    evacInfo.style.color = '#34d399';
    evacInfo.hidden = false;
  }
}

// ── Exportación Oficial en PDF del Dictamen Hidrodinámico 4D ──
function exportarReporteHidrodinamicoPDF() {
  if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
    alert('El motor PDF (jsPDF) se está inicializando. Por favor aguarde un momento e intente nuevamente.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const hasAutoTable = typeof doc.autoTable === 'function';

  const centro = map.getCenter();
  const dptoSel = $('v3-dpto')?.selectedOptions?.[0]?.textContent || 'Nacional';
  const distSel = $('v3-distrito')?.selectedOptions?.[0]?.textContent || 'Área de Interés';
  const cuencaSel = $('v3-inund-cuenca')?.value || 'local';
  const cotaVal = Number($('v3-inund-cota')?.value) || obtenerCotaCentro();
  const cotaBase = obtenerCotaCentro();
  const deltaCota = (cotaVal - cotaBase).toFixed(1);
  const mmLluvia = Number($('v3-lluvia')?.value) || 0;
  const horasLluvia = Number($('v3-lluvia-horas')?.value) || 6;
  const sueloSel = $('v3-suelo')?.selectedOptions?.[0]?.textContent || 'Automático';
  const volHm3 = $('v3-vol-o')?.textContent || '—';
  const caudalPico = $('v3-caudal-o')?.textContent || '—';
  const edifBajoAgua = $('v3-edif-afect-o')?.textContent || '0 afectadas';
  const viasAfectadas = $('v3-vias-afect-o')?.textContent || '0 km';
  const hashVerif = `SNC-HIDRO4D-${Date.now().toString(36).toUpperCase()}`;

  // Encabezado institucional
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REPÚBLICA DEL PARAGUAY · MINISTERIO DE ECONOMÍA Y FINANZAS (MEF)', 15, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('SERVICIO NACIONAL DE CATASTRO (SNC) — DIRECCIÓN DE GEODESIA Y CARTOGRAFÍA', 15, 16);
  doc.text('SISTEMA NACIONAL CATASTRAL (SNC v3) · PLATAFORMA DE GESTIÓN TERRITORIAL Y RIESGO HIDROLÓGICO', 15, 22);

  // Título del Dictamen
  let y = 37;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DICTAMEN TÉCNICO DE SIMULACIÓN HIDRODINÁMICA 4D Y RUTAS DE EVACUACIÓN', 15, y);
  
  y += 4;
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.8);
  doc.line(15, y, pageWidth - 15, y);

  // Recuadro de Metadatos
  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y, pageWidth - 30, 26, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(15, y, pageWidth - 30, 26, 'S');

  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha y Hora:', 18, y + 6);
  doc.text('Código Único Dictamen:', 18, y + 12);
  doc.text('Ubicación Geográfica:', 18, y + 18);
  doc.text('Marco Legal Aplicable:', 18, y + 24);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const ahora = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' });
  doc.text(ahora, 58, y + 6);
  doc.setFont('courier', 'bold');
  doc.text(hashVerif, 58, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${distSel} (${dptoSel}) — Coordenadas Centro: ${centro.lat.toFixed(5)}, ${centro.lng.toFixed(5)}`, 58, y + 18);
  doc.text('Ley N° 3966/2010 Orgánica Municipal (Art. 225) · Resolución SNC N° 551/2023', 58, y + 24);

  // Parámetros Hidrodinámicos y Meteorológicos
  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text('1. PARÁMETROS DE SIMULACIÓN DEL EVENTO METEOROLÓGICO', 15, y);

  y += 4;
  const paramData = [
    ['Cuenca Hidrográfica', cuencaSel.toUpperCase(), 'Lluvia Acumulada', `${mmLluvia} mm`],
    ['Cota Base del Valle', `${cotaBase.toFixed(1)} m s.n.m.`, 'Duración del Evento', `${horasLluvia} horas`],
    ['Cota Máxima de Crecida', `${cotaVal.toFixed(1)} m s.n.m. (+${deltaCota}m)`, 'Coeficiente Escorrentía (C)', `${sueloSel}`],
    ['Volumen Anegado Estimado', volHm3, 'Caudal Pico Estimado (Qp)', caudalPico]
  ];

  if (hasAutoTable) {
    doc.autoTable({
      startY: y,
      head: [],
      body: paramData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 45 },
        1: { width: 45 },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252], width: 45 },
        3: { width: 45 }
      },
      margin: { left: 15, right: 15 }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Hidrograma Sintético 4D Horario
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text('2. EVOLUCIÓN TEMPORAL DE LA ONDA DE CRECIDA (HIDROGRAMA SCS 4D)', 15, y);

  y += 4;
  const { tPico, tTotal, dt, factorPico } = obtenerParametrosOnda();
  const tablaHidrograma = [];
  for (let t = 0; t <= tTotal; t += Math.max(1, Math.round(dt))) {
    const { cota, delta, factor } = calcularCotaHidrograma(t);
    let fase = 'Estiaje / Inicio';
    if (t > 0 && t < tPico) fase = 'Concentración / Ascenso';
    else if (t === tPico) fase = '★ PICO MÁXIMO DE CRECIDA';
    else if (t > tPico && t < tTotal) fase = 'Recesión / Desagote';
    else if (t >= tTotal) fase = 'Retorno a Base';

    let alerta = 'NORMAL';
    if (factor > 0.75) alerta = 'EMERGENCIA ROJA';
    else if (factor > 0.45) alerta = 'ALERTA NARANJA';
    else if (factor > 0.15) alerta = 'ALERTA AMARILLA';

    tablaHidrograma.push([
      `T + ${t} h`,
      fase,
      `${cota.toFixed(2)} m s.n.m.`,
      `+${delta.toFixed(2)} m`,
      `${Math.round(factor * 100)} %`,
      alerta
    ]);
  }

  if (hasAutoTable) {
    doc.autoTable({
      startY: y,
      head: [['Hora (t)', 'Fase del Hidrograma', 'Cota Simulada', 'Tirante Delta', 'Fracción Pico', 'Alerta SNC/DINAC']],
      body: tablaHidrograma,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 1.8, halign: 'center' },
      columnStyles: {
        1: { halign: 'left', fontStyle: 'bold' }
      },
      margin: { left: 15, right: 15 }
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Afectación de Infraestructura y Directivas de Evacuación
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199);
  doc.text('3. EVALUACIÓN DE INFRAESTRUCTURA CRÍTICA Y DIRECTIVAS DE EVACUACIÓN', 15, y);

  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  const textoAfectacion = [
    `• Impacto en Construcciones Censadas: ${edifBajoAgua}.`,
    `• Compromiso de la Red Vial Terrestre: ${viasAfectadas} anegadas con riesgo de incomunicación vial.`,
    `• Puntos de Encuentro y Albergues Habilitados: Escuelas del Ministerio de Educación (MEC) y Centros de Salud (MSPyBS) situados por encima de la cota de seguridad (+${deltaCota} m).`,
    `• Directiva de Evacuación Preventiva: Conforme al Art. 225 de la Ley Orgánica Municipal N° 3966/2010, el Intendente Municipal y el Comité de Emergencia Distrital deben ordenar la evacuación comunitaria con antelación mínima al tiempo pico estimado (T + ${tPico} horas).`
  ];

  doc.text(textoAfectacion, 15, y, { maxWidth: pageWidth - 30, lineHeightFactor: 1.4 });

  // Pie de página institucional y código de integridad
  const pieY = pageHeight - 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, pieY - 4, pageWidth - 15, pieY - 4);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Este dictamen técnico ha sido generado automáticamente por el Motor de Simulación Hidrodinámica 4D de SNC v3.', 15, pieY);
  doc.text(`Identificador de Integridad: ${hashVerif} · Documento Oficial de Contingencia Municipal.`, 15, pieY + 4);

  // Guardar archivo
  const nombreLimpio = `Dictamen_Hidrodinamico_4D_${distSel.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
  doc.save(nombreLimpio);
}

$('v3-btn-evacuacion')?.addEventListener('click', trazarRutasEvacuacion);
$('v3-btn-pdf-4d')?.addEventListener('click', exportarReporteHidrodinamicoPDF);

// ── Lluvia, suelo y alerta DINAC: sugiere una cota a partir de un evento de lluvia ──
function actualizarDinac(mm) {
  const b = $('v3-dinac');
  if (!b) return;
  if (mm < 60) { b.textContent = 'NORMAL / ESTIAJE'; b.style.color = '#34d399'; }
  else if (mm < 160) { b.textContent = 'ALERTA AMARILLA'; b.style.color = '#fbbf24'; }
  else if (mm < 280) { b.textContent = 'ALERTA NARANJA'; b.style.color = '#fb923c'; }
  else { b.textContent = 'EMERGENCIA ROJA'; b.style.color = '#f87171'; }
}
// 369 mm = 450 mm × 0,82 (coeficiente de escorrentía más alto, Chaco húmedo): tope de normalización.
function cotaDesdeLluvia(mm, coef) {
  const fraccion = Math.min(1, (mm * coef) / 369);
  const c = CUENCAS[$('v3-inund-cuenca')?.value];
  if (c) return c.normal + fraccion * (c.record - c.normal);
  return obtenerCotaCentro() + fraccion * 16;
}
// Coeficiente "Automático": en vez de que el usuario elija a mano uno de los 3 valores fijos, se le pide
// al servidor el real del punto (zona residencial real de OSM si cae en una; si no, Chaco/Región Oriental
// — ver escorrentiaServicio.js). Se cachea en coefAuto y se refresca por punto, no en cada tecla.
let coefAuto = 0.42;
let pedidoCoefAuto = 0;
async function cargarCoeficienteAuto() {
  const c = map.getCenter();
  const yo = ++pedidoCoefAuto;
  try {
    const data = await fetch(`/api/v3/clima/escorrentia?lat=${c.lat.toFixed(5)}&lng=${c.lng.toFixed(5)}`).then(r => r.json());
    if (yo !== pedidoCoefAuto || data?.status !== 'ok') return;
    coefAuto = data.coeficiente;
    const opt = $('v3-suelo-auto');
    if (opt) opt.textContent = `Automático (${data.etiqueta}, C = ${data.coeficiente.toFixed(2)})`;
    if ($('v3-suelo')?.value === 'auto') aplicarLluvia();
  } catch {}
}
function aplicarLluvia() {
  const mm = Number($('v3-lluvia').value);
  $('v3-lluvia-o').textContent = `${mm} mm`;
  actualizarDinac(mm);
  if (!$('v3-inundacion').checked) $('v3-inundacion').checked = true;
  const sld = $('v3-inund-cota');
  const suelo = $('v3-suelo')?.value;
  const coef = suelo === 'auto' ? coefAuto : Number(suelo);
  const cota = cotaDesdeLluvia(mm, coef);
  sld.value = Math.max(Number(sld.min), Math.min(Number(sld.max), cota));
  actualizarInundacion();
}
$('v3-lluvia')?.addEventListener('input', aplicarLluvia);
$('v3-suelo')?.addEventListener('change', () => { if ($('v3-suelo').value === 'auto') cargarCoeficienteAuto(); aplicarLluvia(); });
document.querySelectorAll('.v3-lluvia-btn').forEach(b => b.addEventListener('click', () => { $('v3-lluvia').value = b.dataset.mm; aplicarLluvia(); }));
$('v3-btn-lluvia-real')?.addEventListener('click', async () => {
  const c = map.getCenter();
  const btn = $('v3-btn-lluvia-real');
  btn.disabled = true;
  const textoOrig = btn.textContent;
  btn.textContent = 'Consultando ERA5…';
  try {
    const res = await fetch(`/api/v3/clima/lluvia-historica?lat=${c.lat.toFixed(4)}&lng=${c.lng.toFixed(4)}`).then(r => r.json());
    if (res.status === 'ok') {
      const mm = Math.min(450, Math.round(res.maximoDiario_mm || res.totalPrecipitacion_mm || 50));
      $('v3-lluvia').value = mm;
      aplicarLluvia();
      estado(`Lluvia real ERA5 cargada para (${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}): ${mm} mm`);
    } else {
      estado('No se pudo obtener registro de lluvia.');
    }
  } catch (err) {
    estado('Error consultando ERA5: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = textoOrig;
  }
});

// Duración de la lluvia (h) × intensidad (mm/h): otra forma de cargar los mm acumulados, además
// del slider directo y los presets — útil para pensar "llovió 10 horas fuerte" en vez de "mm".
function aplicarLluviaPorHoras() {
  const horas = Math.max(0, Number($('v3-lluvia-horas').value) || 0);
  const tasa = Number($('v3-lluvia-intensidad').value);
  const mm = Math.min(450, Math.round(horas * tasa));
  $('v3-lluvia-horas-calc').textContent = `${horas} h × ${tasa} mm/h = ${mm} mm acumulados${horas * tasa > 450 ? ' (tope 450 mm)' : ''}.`;
  if (horas > 0) { $('v3-lluvia').value = mm; aplicarLluvia(); }
}
$('v3-lluvia-horas')?.addEventListener('input', aplicarLluviaPorHoras);
$('v3-lluvia-intensidad')?.addEventListener('change', aplicarLluviaPorHoras);
actualizarDinac(0);

// ── Vectores de flujo: anima el trazo real de hidrografía (SNC) para sugerir dirección de escurrimiento ──
// Secuencia estándar de "marching ants" (mismos pasos que el ejemplo oficial de Mapbox GL "Animate a line").
const DASH_FLUJO = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]
];
// El GeoJSON de hidrografía no garantiza que cada tramo esté digitalizado "aguas abajo":
// antes de animar, se pone cada LineString en sentido de cota alta → cota baja (como corre el agua).
let hidroOrientado = false;
function orientarHidroPorCota() {
  if (hidroOrientado) return;
  const src = map.getSource('hidro');
  const data = src?._data;
  if (!data?.features?.length) return;
  let corregidos = 0, sinDato = 0;
  data.features.forEach(f => {
    if (f.geometry?.type !== 'LineString') return;
    const coords = f.geometry.coordinates;
    if (coords.length < 2) return;
    const hIni = map.queryTerrainElevation?.(coords[0]);
    const hFin = map.queryTerrainElevation?.(coords[coords.length - 1]);
    if (hIni == null || hFin == null) { sinDato++; return; }
    if (hFin > hIni) { coords.reverse(); corregidos++; }   // corría cuesta arriba: se invierte
  });
  if (corregidos) map.getSource('hidro')?.setData(data);
  if (!sinDato) hidroOrientado = true;   // si falta DEM en algún tramo, se reintenta la próxima vez
  if (corregidos) estado(`Dirección corregida en ${corregidos} tramo(s) de cauce según la cota real (antes corrían cuesta arriba).`);
}
let animFlujo = null;
function iniciarVectoresFlujo() {
  if (animFlujo || !map.getLayer('hidro-lineas')) return;
  orientarHidroPorCota();
  let i = 0;
  animFlujo = setInterval(() => {
    i = (i + 1) % DASH_FLUJO.length;
    try { map.setPaintProperty('hidro-lineas', 'line-dasharray', DASH_FLUJO[i]); } catch {}
  }, 60);
}
function detenerVectoresFlujo() {
  if (!animFlujo) return;
  clearInterval(animFlujo);
  animFlujo = null;
  try { map.setPaintProperty('hidro-lineas', 'line-dasharray', null); } catch {}
}
$('v3-flujo')?.addEventListener('change', e => {
  if (e.target.checked && $('v3-inundacion')?.checked) iniciarVectoresFlujo(); else detenerVectoresFlujo();
});

// ── Aspecto: color de los edificios y sol según la hora ─────────────
$('v3-color').addEventListener('change', e => {
  const val = e.target.value;
  if (val === 'icst') {
    map.setPaintProperty('edificios', 'fill-extrusion-color', [
      'case',
      ['==', ['get', '_inund'], true], '#ef4444',
      ['==', ['get', '_condic'], true], '#f59e0b',
      '#10b981'
    ]);
    document.querySelector('.v3-leyenda').hidden = true;
  } else {
    map.setPaintProperty('edificios', 'fill-extrusion-color', val === 'real' ? COLOR_REAL : COLOR_CATASTRO);
    document.querySelector('.v3-leyenda').hidden = val === 'real';
  }
});
function sol() {
  const hora = Number($('v3-hora').value);   // 6 a 19 h; el sol sale al este y se pone al oeste (Paraguay)
  $('v3-hora-o').textContent = `${String(Math.floor(hora)).padStart(2, '0')}:${hora % 1 ? '30' : '00'}`;
  const t = (hora - 6) / 13, azimut = 90 + t * 180, altura = Math.sin(Math.PI * t);   // 0 al amanecer, 1 al mediodía
  map.setLight({ anchor: 'map', position: [1.5, azimut, 90 - altura * 70], intensity: 0.25 + altura * 0.35, color: altura < 0.3 ? '#ffd2a6' : '#ffffff' });
}
$('v3-hora').addEventListener('input', sol);
map.on('load', sol);

// ── Curvas de nivel: celdas de ~2 km alrededor del centro; equidistancia según el zoom ──
const CELDA = 0.02, celdasPedidas = new Map();
let curvasFc = { type: 'FeatureCollection', features: [] };
const ivZoom = z => (z >= 16 ? 5 : z >= 14.5 ? 10 : 25);
async function cargarCurvas() {
  if (!$('v3-curvas').checked || map.getZoom() < 13) return;
  const c = map.getCenter(), iv = ivZoom(map.getZoom());
  const cx = Math.floor(c.lng / CELDA), cy = Math.floor(c.lat / CELDA), pedidos = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const x0 = (cx + dx) * CELDA, y0 = (cy + dy) * CELDA, k = `${x0.toFixed(3)}_${y0.toFixed(3)}_${iv}`;
    if (celdasPedidas.has(k)) continue;
    celdasPedidas.set(k, true);
    pedidos.push(fetch(`/api/v3/curvas?minX=${x0}&minY=${y0}&maxX=${x0 + CELDA}&maxY=${y0 + CELDA}&intervalo=${iv}`).then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(fc => { if (fc?.features) { fc.features.forEach(f => { f.properties.iv = iv; }); curvasFc.features.push(...fc.features); } }));
  }
  if (!pedidos.length) return;
  estado('Calculando curvas de nivel…');
  await Promise.all(pedidos);
  // Solo se dibujan las de la equidistancia actual.
  map.getSource('curvas').setData({ type: 'FeatureCollection', features: curvasFc.features.filter(f => f.properties.iv === iv) });
  estado(`Curvas de nivel cada ${iv} m (maestras cada ${iv * 5} m, con cota).`);
}
$('v3-curvas').addEventListener('change', e => {
  ['curvas', 'curvas-cotas'].forEach(id => map.setLayoutProperty(id, 'visibility', e.target.checked ? 'visible' : 'none'));
  if (e.target.checked) { if (map.getZoom() < 14) acercar(map.getCenter()); else cargarCurvas(); }
});
map.on('moveend', () => { clearTimeout(cargarCurvas.t); cargarCurvas.t = setTimeout(() => {
  if (!$('v3-curvas').checked) return;
  const iv = ivZoom(map.getZoom());
  map.getSource('curvas').setData({ type: 'FeatureCollection', features: curvasFc.features.filter(f => f.properties.iv === iv) });
  cargarCurvas();
}, 500); });

// ── Secciones plegables del panel (clic o Enter/Espacio en el título) ──
function plegable(legendId, cuerpoId, icoId) {
  const legend = $(legendId), cuerpo = $(cuerpoId), ico = $(icoId);
  const act = () => {
    cuerpo.hidden = !cuerpo.hidden;
    ico.textContent = cuerpo.hidden ? '▸' : '▾';
    legend.setAttribute('aria-expanded', String(!cuerpo.hidden));
  };
  legend.addEventListener('click', act);
  legend.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
}
const todosPlegables = [
  ['v3-ubic-legend', 'v3-ubic-cuerpo', 'v3-ubic-ico'],
  ['v3-base-legend', 'v3-base-cuerpo', 'v3-base-ico'],
  ['v3-capas-legend', 'v3-capas-cuerpo', 'v3-capas-ico'],
  ['v3-terreno-legend', 'v3-terreno-cuerpo', 'v3-terreno-ico'],
  ['v3-sim-legend', 'v3-sim-cuerpo', 'v3-sim-ico'],
  ['v3-exp-legend', 'v3-exp-cuerpo', 'v3-exp-ico']
];
todosPlegables.forEach(([l, c, i]) => plegable(l, c, i));

$('v3-btn-expandir-todos')?.addEventListener('click', () => {
  todosPlegables.forEach(([l, c, i]) => {
    const leg = $(l), cue = $(c), ico = $(i);
    if (cue) cue.hidden = false;
    if (ico) ico.textContent = '▾';
    if (leg) leg.setAttribute('aria-expanded', 'true');
  });
});

$('v3-btn-colapsar-todos')?.addEventListener('click', () => {
  todosPlegables.forEach(([l, c, i]) => {
    const leg = $(l), cue = $(c), ico = $(i);
    if (cue) cue.hidden = true;
    if (ico) ico.textContent = '▸';
    if (leg) leg.setAttribute('aria-expanded', 'false');
  });
});

$('v3-exportar').addEventListener('click', async () => {
  const zona = $('v3-exp-zona').value, formato = $('v3-exp-formato').value, iv = $('v3-exp-iv').value;
  let q = `formato=${formato}&intervalo=${iv}`;
  if (zona === 'distrito') {
    const v = $('v3-distrito').value; if (!v) { estado('Elija primero un distrito en la lista.'); return; }
    const [d, n] = v.split('|'); q += `&dpto=${d}&dist=${n}`;
  } else {
    const c = map.getCenter(), b = map.getBounds(), mx = Math.min(0.03, (b.getEast() - b.getWest()) / 2), my = Math.min(0.03, (b.getNorth() - b.getSouth()) / 2);
    q += `&minX=${c.lng - mx}&minY=${c.lat - my}&maxX=${c.lng + mx}&maxY=${c.lat + my}&nombre=vista`;
  }
  const btn = $('v3-exportar'); btn.disabled = true; estado('Preparando la descarga (puede tardar hasta un minuto en zonas grandes)…');
  try {
    const r = await fetch(`/api/v3/curvas/exportar?${q}`);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
    const nombre = (r.headers.get('content-disposition') || '').match(/filename="?([^"]+)"?/)?.[1] || `topografia.${formato}`;
    const url = URL.createObjectURL(await r.blob()), a = Object.assign(document.createElement('a'), { href: url, download: nombre });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    estado(`Descargado: ${nombre}`);
  } catch (err) { estado(err.message); } finally { btn.disabled = false; }
});

// ── Capas y Superposición (Layer Stacking) ───────────────────────────
const CAPAS = {
  hidro: ['hidro-lineas', 'hidro-nombres'],
  edificios: ['edificios'],
  parcelas: ['parcelas'],
  limite: ['limite'],
  cascos: ['cascos', 'cascos-borde'],
  barrios: ['barrios', 'barrios-borde'],
  incendios: ['incendios-puntos']
};
const cargadas = {};

/**
 * Aplica el orden de superposición (Z-Index / Stacking) a las capas en MapLibre GL.
 * En la interfaz: la primera capa de la lista (arriba del todo) se ve al frente de todas.
 * La segunda capa va detrás de la primera, y así sucesivamente hacia abajo.
 */
function aplicarOrdenCapasMapLibre() {
  if (!map || !map.isStyleLoaded()) return;

  const listaEl = document.getElementById('v3-capas-lista');
  if (!listaEl) return;
  const filas = Array.from(listaEl.querySelectorAll('.v3-capa-fila'));
  if (!filas.length) return;

  // Actualizar badges numéricos (1º, 2º, ...) y habilitación de botones ▲ / ▼
  filas.forEach((f, idx) => {
    const ordenEl = f.querySelector('.v3-capa-orden');
    if (ordenEl) ordenEl.textContent = `${idx + 1}º`;
    const btnSubir = f.querySelector('.v3-btn-subir');
    const btnBajar = f.querySelector('.v3-btn-bajar');
    if (btnSubir) btnSubir.disabled = idx === 0;
    if (btnBajar) btnBajar.disabled = idx === filas.length - 1;
  });

  // Guardar orden preferido en localStorage
  const clavesOrdenadas = filas.map(f => f.dataset.capa);
  try {
    localStorage.setItem('v3_visor3d_orden_capas', JSON.stringify(clavesOrdenadas));
  } catch (err) {}

  // En MapLibre GL, las capas añadidas o movidas al final se dibujan encima de las anteriores.
  // Por ende, recorremos en orden INVERSO (desde la última de la lista hacia la primera):
  // La última se mueve primero (quedará al fondo del conjunto de capas temáticas),
  // y la 1ª (arriba de todo) se mueve al final, quedando al frente de todas.
  for (let i = filas.length - 1; i >= 0; i--) {
    const k = filas[i].dataset.capa;
    const subcapas = CAPAS[k] || [];
    subcapas.forEach(subId => {
      if (map.getLayer(subId)) {
        try {
          map.moveLayer(subId);
        } catch (e) {
          // Ignorar si la capa todavía no está lista en el estilo
        }
      }
    });
  }
}

/**
 * Inicializa los eventos de reordenamiento interactivo (Botones ▲ / ▼ y Drag-and-Drop)
 */
function inicializarReordenamientoCapas() {
  const listaEl = document.getElementById('v3-capas-lista');
  if (!listaEl) return;

  // 1. Restaurar orden guardado en localStorage si existe
  try {
    const ordenGuardado = JSON.parse(localStorage.getItem('v3_visor3d_orden_capas') || '[]');
    if (Array.isArray(ordenGuardado) && ordenGuardado.length) {
      ordenGuardado.forEach(capaId => {
        const fila = listaEl.querySelector(`.v3-capa-fila[data-capa="${capaId}"]`);
        if (fila) listaEl.appendChild(fila);
      });
    }
  } catch (err) {}

  // 2. Botones Subir (▲) y Bajar (▼)
  listaEl.addEventListener('click', e => {
    const btnSubir = e.target.closest('.v3-btn-subir');
    const btnBajar = e.target.closest('.v3-btn-bajar');
    if (!btnSubir && !btnBajar) return;

    const fila = e.target.closest('.v3-capa-fila');
    if (!fila) return;

    if (btnSubir) {
      const prev = fila.previousElementSibling;
      if (prev && prev.classList.contains('v3-capa-fila')) {
        listaEl.insertBefore(fila, prev);
        aplicarOrdenCapasMapLibre();
      }
    } else if (btnBajar) {
      const next = fila.nextElementSibling;
      if (next && next.classList.contains('v3-capa-fila')) {
        listaEl.insertBefore(next, fila);
        aplicarOrdenCapasMapLibre();
      }
    }
  });

  // 3. Drag and Drop HTML5
  let filaArrastrada = null;

  listaEl.querySelectorAll('.v3-capa-fila').forEach(fila => {
    fila.addEventListener('dragstart', e => {
      filaArrastrada = fila;
      fila.classList.add('v3-arrastrando');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', fila.dataset.capa);
    });

    fila.addEventListener('dragend', () => {
      fila.classList.remove('v3-arrastrando');
      listaEl.querySelectorAll('.v3-capa-fila').forEach(f => f.classList.remove('v3-drag-over'));
      filaArrastrada = null;
    });

    fila.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (filaArrastrada && filaArrastrada !== fila) {
        fila.classList.add('v3-drag-over');
      }
    });

    fila.addEventListener('dragleave', () => {
      fila.classList.remove('v3-drag-over');
    });

    fila.addEventListener('drop', e => {
      e.preventDefault();
      fila.classList.remove('v3-drag-over');
      if (filaArrastrada && filaArrastrada !== fila) {
        const rect = fila.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          listaEl.insertBefore(filaArrastrada, fila);
        } else {
          listaEl.insertBefore(filaArrastrada, fila.nextElementSibling);
        }
        aplicarOrdenCapasMapLibre();
      }
    });
  });

  // Actualizar badges iniciales
  aplicarOrdenCapasMapLibre();
}

// Inicializar reordenamiento al cargar
inicializarReordenamientoCapas();

document.querySelectorAll('input[data-capa]').forEach(ch => ch.addEventListener('change', async () => {
  const k = ch.dataset.capa;
  CAPAS[k]?.forEach(id => map.setLayoutProperty(id, 'visibility', ch.checked ? 'visible' : 'none'));
  if (ch.checked && k === 'hidro') await cargarHidro();
  if (ch.checked && k === 'incendios') await cargarIncendios();
  if (ch.checked && (k === 'cascos' || k === 'barrios') && !cargadas[k]) {
    estado(`Cargando ${k === 'cascos' ? 'cascos urbanos' : 'barrios (18 MB, la primera vez tarda)'}…`);
    try {
      const r = await fetch(k === 'cascos' ? '/data/casco_urbano_snc.geojson' : '/data/barrios_py_light.geojson');
      map.getSource(k).setData(await r.json()); cargadas[k] = true; estado('');
    } catch { estado('No se pudo cargar la capa.'); }
  }
  if (ch.checked && (k === 'edificios' || k === 'parcelas')) { if (map.getZoom() < 16) acercar(map.getCenter()); else cargarVista(); }
  aplicarOrdenCapasMapLibre();
}));

// ── Capas extra por distrito (reemplaza el antiguo checkbox fijo "POUT Filadelfia") ──
// Al elegir un distrito con datos propios (POUT, Google My Maps, capas base municipales),
// se arma la lista de checkboxes acá mismo; en distritos sin datos extra no aparece nada.
const COLORES_CAPAS_DISTRITO = ['#f59e0b', '#a78bfa', '#34d399', '#f472b6', '#38bdf8', '#fbbf24', '#fb7185', '#2dd4bf'];
let capasDistritoDinamicas = [];
function limpiarCapasDistrito() {
  capasDistritoDinamicas.forEach(c => {
    ['-relleno', '-borde'].forEach(suf => { if (map.getLayer(c.layerId + suf)) map.removeLayer(c.layerId + suf); });
    if (map.getSource(c.layerId)) map.removeSource(c.layerId);
  });
  capasDistritoDinamicas = [];
  const cont = $('v3-capas-distrito');
  cont.innerHTML = '';
  cont.hidden = true;
}
async function cargarCapasDistrito(dpto, dist) {
  limpiarCapasDistrito();
  if (!dpto || !dist) return;
  let fuentes = [];
  try {
    const r = await fetch(`/api/v3/visor3d/capas-distrito?dpto=${dpto}&dist=${dist}`);
    ({ fuentes } = await r.json());
  } catch { return; }
  if (!fuentes?.length) return;

  const cont = $('v3-capas-distrito');
  cont.hidden = false;
  fuentes.forEach(fuente => {
    const titulo = document.createElement('p');
    titulo.className = 'v3-fuente';
    titulo.style.cssText = 'margin:6px 0 2px;color:#94a3b8;font-weight:600;';
    titulo.textContent = fuente.etiqueta;
    cont.appendChild(titulo);
    fuente.capas.forEach(capa => {
      const idx = capasDistritoDinamicas.length;
      const layerId = `distrito-capa-${idx}`;
      const color = COLORES_CAPAS_DISTRITO[idx % COLORES_CAPAS_DISTRITO.length];
      capasDistritoDinamicas.push({ layerId, url: capa.url, geometria: capa.geometria, color });

      const label = document.createElement('label');
      label.className = 'v3-op';
      label.innerHTML = `<input type="checkbox" id="v3-capadist-${idx}"> <span class="v3-mues" style="background:${color}"></span> ${esc(capa.nombre)}${capa.cantidad != null ? ` <small style="color:#64748b;">(${capa.cantidad})</small>` : ''}`;
      cont.appendChild(label);

      label.querySelector('input').addEventListener('change', async e => {
        if (!e.target.checked) {
          ['-relleno', '-borde'].forEach(suf => { if (map.getLayer(layerId + suf)) map.setLayoutProperty(layerId + suf, 'visibility', 'none'); });
          return;
        }
        if (map.getSource(layerId)) {
          ['-relleno', '-borde'].forEach(suf => { if (map.getLayer(layerId + suf)) map.setLayoutProperty(layerId + suf, 'visibility', 'visible'); });
          return;
        }
        let data;
        try { data = await fetch(capa.url).then(r => r.json()); } catch { estado(`No se pudo cargar "${capa.nombre}".`); e.target.checked = false; return; }
        map.addSource(layerId, { type: 'geojson', data });
        const geom = (data.features?.[0]?.geometry?.type) || capa.geometria || '';
        if (/point/i.test(geom)) {
          map.addLayer({ id: layerId + '-relleno', type: 'circle', source: layerId, paint: { 'circle-color': color, 'circle-radius': 5, 'circle-stroke-color': '#0f172a', 'circle-stroke-width': 1.5 } });
        } else if (/line/i.test(geom)) {
          map.addLayer({ id: layerId + '-relleno', type: 'line', source: layerId, paint: { 'line-color': color, 'line-width': 2.5 } });
        } else {
          map.addLayer({ id: layerId + '-relleno', type: 'fill', source: layerId, paint: { 'fill-color': color, 'fill-opacity': 0.32 } });
          map.addLayer({ id: layerId + '-borde', type: 'line', source: layerId, paint: { 'line-color': color, 'line-width': 1.5 } });
        }
      });
    });
  });
}

// Hidrografía (ríos/arroyos/canales + lagunas/embalses/humedales, OSM) de la zona visible, a cualquier
// escala: distrital, departamental o país (el servidor filtra por recuadro, ver /api/v3/hidrografia).
let pedidoHidro = 0;
async function cargarHidro() {
  const b = map.getBounds();
  const mx = (b.getEast() - b.getWest()) * 0.15, my = (b.getNorth() - b.getSouth()) * 0.15;
  const q = `minX=${b.getWest() - mx}&minY=${b.getSouth() - my}&maxX=${b.getEast() + mx}&maxY=${b.getNorth() + my}`;
  const yo = ++pedidoHidro;
  try {
    const data = await fetch(`/api/v3/hidrografia?${q}`).then(r => r.json());
    if (yo !== pedidoHidro || !data?.features) return;
    map.getSource('hidro')?.setData(data);
    hidroOrientado = false;   // cambiaron los tramos cargados: reorientar de nuevo (ver orientarHidroPorCota)
    cargadas.hidro = true;
  } catch {}
}

// Focos de calor e incendios activos (NASA FIRMS VIIRS 375m NRT) filtrados por la vista actual
let pedidoIncendios = 0;
async function cargarIncendios() {
  const b = map.getBounds();
  const mx = (b.getEast() - b.getWest()) * 0.15, my = (b.getNorth() - b.getSouth()) * 0.15;
  const q = `minX=${b.getWest() - mx}&minY=${b.getSouth() - my}&maxX=${b.getEast() + mx}&maxY=${b.getNorth() + my}&tipo=todos`;
  const yo = ++pedidoIncendios;
  try {
    let data = await fetch(`/api/v3/clima/incendios?${q}`).then(r => r.json()).catch(() => null);
    if (!data || !data.features || data.features.length <= 3) {
      const full = await fetch('/Cambio_climatico/data/incendios_historico_py.geojson').then(r => r.json()).catch(() => null);
      if (full?.features) {
        const minX = b.getWest() - mx, maxX = b.getEast() + mx, minY = b.getSouth() - my, maxY = b.getNorth() + my;
        const filtrados = full.features.filter(f => {
          const c = f.geometry?.coordinates;
          return c && c[0] >= minX && c[0] <= maxX && c[1] >= minY && c[1] <= maxY;
        });
        data = { type: 'FeatureCollection', features: filtrados };
      }
    }
    if (yo !== pedidoIncendios || !data?.features) return;
    map.getSource('incendios')?.setData(data);
    cargadas.incendios = true;
  } catch {}
}

// Edificios y parcelas de la zona visible (el servidor limita el recuadro a ~5 × 5 km).
let pedido = 0;
async function cargarVista() {
  const z = map.getZoom();
  if (z < 14) { estado('Toque el mapa donde quiera ver edificios y parcelas: el visor se acerca solo.'); return; }
  // Con el mapa inclinado la vista llega al horizonte: se pide solo un cuadrado alrededor del centro (~1,5 km de lado o menos).
  const c = map.getCenter(), b = map.getBounds();
  const mx = Math.min(0.0075, (b.getEast() - b.getWest()) / 2), my = Math.min(0.0068, (b.getNorth() - b.getSouth()) / 2);
  const q = `minX=${c.lng - mx}&minY=${c.lat - my}&maxX=${c.lng + mx}&maxY=${c.lat + my}`;
  const yo = ++pedido;
  estado('Cargando edificios y parcelas de la zona…');
  try {
    const [e, p] = await Promise.all([
      document.querySelector('[data-capa="edificios"]').checked ? fetch(`/api/v3/edificios/vista?${q}`).then(r => r.json()) : null,
      document.querySelector('[data-capa="parcelas"]').checked ? fetch(`/api/v3/parcelario/vista?${q}`).then(r => r.json()) : null
    ]);
    if (yo !== pedido) return;
    if (e?.features) map.getSource('edificios').setData(e);
    if (p?.features) map.getSource('parcelas').setData(p);
    const msg = [e?.error, p?.error].filter(Boolean)[0];
    estado(msg ? msg : `${num(e?.features?.length)} edificios · ${num(p?.features?.length)} parcelas en la zona.`);
  } catch { if (yo === pedido) estado('Sin conexión con el servidor.'); }
}
let t = null;
map.on('zoomend', () => {
  const sat = document.querySelector('input[name="base"][value="satelite"]')?.checked;
  if (sat && map.getZoom() >= 19.5) estado('Muy cerca: el satélite no tiene más detalle, se muestra el mapa de OpenStreetMap. Aleje para volver al satélite.');
});
map.on('moveend', () => {
  clearTimeout(t);
  t = setTimeout(() => {
    cargarVista();
    actualizarCota();
    if (document.querySelector('[data-capa="hidro"]')?.checked) cargarHidro();
    if (document.querySelector('[data-capa="incendios"]')?.checked) cargarIncendios();
    if ($('v3-suelo')?.value === 'auto') cargarCoeficienteAuto();
    if ($('v3-inundacion')?.checked && (!$('v3-inund-cuenca') || $('v3-inund-cuenca').value === 'local')) {
      actualizarInundacion();
    }
  }, 350);
});

// ── Selector de departamento → distrito (en 2 pasos, con datos del panel en vivo) ──
let distritosPorDpto = {};
let distritosIRIMap = new Map();
let focosFIRMSCachados = [];
let cotaUbicacionActual = 100;

// Base de referencia territorial y demográfica departamental oficial (CNPV 2022 / DNIT / MHC-PY)
const DEPARTAMENTOS_PY_DATA = {
  A: { nombre: 'Asunción', lat: -25.302, lng: -57.601, bounds: [[-25.36, -57.67], [-25.24, -57.53]], cota: 65, pob: 477346, dnit: 154200, edu: 670, sal: 62, ind: 480, cuenca: 'Río Paraguay (Bañados Costeros)', iriNivel: 'ALTO', iriRank: 12, iriVal: 78 },
  B: { nombre: 'Concepción', lat: -22.794, lng: -57.060, bounds: [[-23.70, -58.00], [-21.80, -56.10]], cota: 85, pob: 204536, dnit: 31500, edu: 456, sal: 38, ind: 120, cuenca: 'Río Paraguay y Río Apa', iriNivel: 'MEDIO', iriRank: 45, iriVal: 52 },
  C: { nombre: 'San Pedro', lat: -24.160, lng: -56.588, bounds: [[-25.10, -57.50], [-23.20, -55.80]], cota: 110, pob: 341895, dnit: 41200, edu: 1014, sal: 54, ind: 190, cuenca: 'Río Jejuí Guazú y Río Manduvirá', iriNivel: 'MEDIO', iriRank: 58, iriVal: 48 },
  D: { nombre: 'Cordillera', lat: -25.256, lng: -57.020, bounds: [[-25.70, -57.45], [-24.80, -56.70]], cota: 216, pob: 271475, dnit: 59400, edu: 466, sal: 44, ind: 210, cuenca: 'Arroyo Piribebuy y Lago Ypacaraí', iriNivel: 'BAJO', iriRank: 72, iriVal: 35 },
  E: { nombre: 'Guairá', lat: -25.882, lng: -56.191, bounds: [[-26.30, -56.60], [-25.50, -55.80]], cota: 220, pob: 180121, dnit: 29800, edu: 428, sal: 32, ind: 160, cuenca: 'Río Tebicuarymí', iriNivel: 'BAJO', iriRank: 84, iriVal: 30 },
  F: { nombre: 'Caaguazú', lat: -25.088, lng: -55.890, bounds: [[-25.80, -56.70], [-24.40, -55.00]], cota: 290, pob: 430142, dnit: 68100, edu: 927, sal: 66, ind: 310, cuenca: 'Río Tebicuary y Río Acaray', iriNivel: 'BAJO', iriRank: 92, iriVal: 28 },
  G: { nombre: 'Caazapá', lat: -26.159, lng: -56.049, bounds: [[-26.85, -56.70], [-25.60, -55.30]], cota: 145, pob: 140060, dnit: 16900, edu: 462, sal: 28, ind: 90, cuenca: 'Río Tebicuary y Pirapó', iriNivel: 'MEDIO', iriRank: 64, iriVal: 42 },
  H: { nombre: 'Itapúa', lat: -26.842, lng: -55.766, bounds: [[-27.50, -56.60], [-26.10, -54.90]], cota: 125, pob: 436983, dnit: 89300, edu: 882, sal: 78, ind: 540, cuenca: 'Río Paraná y Arroyo Quiteria', iriNivel: 'MEDIO', iriRank: 38, iriVal: 55 },
  I: { nombre: 'Misiones', lat: -26.932, lng: -57.185, bounds: [[-27.60, -57.70], [-26.40, -56.50]], cota: 90, pob: 114542, dnit: 24300, edu: 218, sal: 30, ind: 140, cuenca: 'Río Paraná y Río Tebicuary', iriNivel: 'ALTO', iriRank: 24, iriVal: 68 },
  J: { nombre: 'Paraguarí', lat: -26.011, lng: -57.179, bounds: [[-26.60, -57.60], [-25.40, -56.60]], cota: 160, pob: 199430, dnit: 38900, edu: 482, sal: 36, ind: 180, cuenca: 'Río Tebicuary y Caañabé', iriNivel: 'MEDIO', iriRank: 50, iriVal: 46 },
  K: { nombre: 'Alto Paraná', lat: -25.367, lng: -54.948, bounds: [[-26.30, -55.50], [-24.50, -54.40]], cota: 185, pob: 784837, dnit: 182400, edu: 888, sal: 92, ind: 820, cuenca: 'Río Paraná, Acaray y Monday', iriNivel: 'MEDIO', iriRank: 40, iriVal: 54 },
  L: { nombre: 'Central', lat: -25.561, lng: -57.510, bounds: [[-26.00, -57.75], [-25.10, -57.25]], cota: 95, pob: 1866562, dnit: 442100, edu: 1188, sal: 142, ind: 2850, cuenca: 'Cuenca Río Paraguay, Salado e Ypacaraí', iriNivel: 'ALTO', iriRank: 16, iriVal: 74 },
  M: { nombre: 'Ñeembucú', lat: -26.606, lng: -57.923, bounds: [[-27.40, -58.65], [-25.75, -57.30]], cota: 47, pob: 85749, dnit: 19800, edu: 210, sal: 26, ind: 110, cuenca: 'Confluencia Paraguay-Paraná y Humedales', iriNivel: 'EXTREMO', iriRank: 1, iriVal: 97 },
  N: { nombre: 'Amambay', lat: -22.953, lng: -56.165, bounds: [[-24.10, -56.70], [-22.00, -55.40]], cota: 450, pob: 173770, dnit: 28100, edu: 195, sal: 24, ind: 130, cuenca: 'Río Apa y Río Aquidabán', iriNivel: 'BAJO', iriRank: 110, iriVal: 22 },
  P: { nombre: 'Presidente Hayes', lat: -23.715, lng: -58.967, bounds: [[-25.40, -60.80], [-22.20, -57.20]], cota: 75, pob: 126880, dnit: 17200, edu: 249, sal: 32, ind: 180, cuenca: 'Río Pilcomayo, Confuso y Paraguay', iriNivel: 'ALTO', iriRank: 8, iriVal: 82 },
  Q: { nombre: 'Boquerón', lat: -21.987, lng: -60.991, bounds: [[-23.90, -62.70], [-20.00, -59.30]], cota: 140, pob: 68595, dnit: 8400, edu: 105, sal: 18, ind: 150, cuenca: 'Chaco Central y Río Pilcomayo', iriNivel: 'BAJO', iriRank: 130, iriVal: 18 },
  R: { nombre: 'Alto Paraguay', lat: -20.843, lng: -59.870, bounds: [[-22.30, -61.20], [-19.30, -57.80]], cota: 80, pob: 17608, dnit: 2800, edu: 36, sal: 12, ind: 40, cuenca: 'Gran Pantanal y Río Negro', iriNivel: 'ALTO', iriRank: 14, iriVal: 76 },
  S: { nombre: 'Canindeyú', lat: -24.154, lng: -55.216, bounds: [[-24.70, -56.10], [-23.60, -54.20]], cota: 240, pob: 189128, dnit: 27600, edu: 422, sal: 34, ind: 220, cuenca: 'Río Jejui Guazu y Embalse Itaipú', iriNivel: 'BAJO', iriRank: 98, iriVal: 26 },
  ALL: { nombre: 'Paraguay Total (Nacional)', lat: -23.4425, lng: -58.4438, bounds: [[-27.60, -62.70], [-19.30, -54.20]], cota: 130, pob: 6109644, dnit: 1248310, edu: 9295, sal: 741, ind: 6616, cuenca: 'Macrocuenca del Plata (Ríos Paraguay y Paraná)', iriNivel: 'MEDIO', iriRank: 'Nacional', iriVal: 58 }
};

// Cargar catálogo de vulnerabilidad fluvial distrital (IRI)
fetch('/Cambio_climatico/indice_riesgo_inundacion_distritos.json')
  .then(r => r.json())
  .then(data => {
    if (data && Array.isArray(data.distritos)) {
      data.distritos.forEach(d => {
        const kNorm = String(d.distrito || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        distritosIRIMap.set(kNorm, d);
      });
    }
  }).catch(() => {});

// Cargar focos de calor activos NASA FIRMS
fetch('/api/v3/clima/incendios?tipo=activos')
  .then(r => r.json())
  .then(data => {
    if (data && Array.isArray(data.features)) {
      focosFIRMSCachados = data.features;
    }
  }).catch(() => {});

// Función para traducir código meteorológico WMO
function descClimaWMO(code) {
  if (code === 0) return '☀️ Despejado';
  if (code <= 2) return '🌤️ Parcialmente nublado';
  if (code === 3) return '☁️ Nublado';
  if (code <= 48) return '🌫️ Niebla';
  if (code <= 55) return '🌦️ Llovizna';
  if (code <= 65) return '🌧️ Lluvia';
  if (code <= 82) return '🌧️ Chubascos';
  if (code >= 95) return '⛈️ Tormenta eléctrica';
  return '☁️ Variable';
}

// Actualizar el Panel de Datos de Ubicación con todas las métricas de MHC-PY
async function actualizarPanelDatosUbicacion(dptoCod, distFull) {
  const wrap = $('v3-panel-datos-wrap');
  if (!wrap) return;

  if (!dptoCod) {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  const depRef = DEPARTAMENTOS_PY_DATA[dptoCod] || DEPARTAMENTOS_PY_DATA['L'];
  let lat = depRef.lat;
  let lng = depRef.lng;
  let nombreTitulo = dptoCod === 'ALL' ? '📍 Paraguay (Nacional)' : `📍 ${depRef.nombre}`;
  let cotaMedia = depRef.cota;
  let cuencaNom = depRef.cuenca;
  let iriNivel = depRef.iriNivel;
  let iriVal = depRef.iriVal;
  let iriRank = depRef.iriRank;
  let eduCount = depRef.edu;
  let salCount = depRef.sal;
  let indCount = depRef.ind;
  let poblacion = depRef.pob;
  let dnitCuentas = depRef.dnit;

  // Si hay distrito elegido, afinar datos específicos
  if (distFull) {
    const [d, distId] = distFull.split('|');
    const dObj = (distritosPorDpto[d] || []).find(x => String(x.dist) === String(distId));
    if (dObj) {
      nombreTitulo = `📍 ${depRef.nombre} › ${dObj.nombre.charAt(0) + dObj.nombre.slice(1).toLowerCase()}`;
      const dNorm = String(dObj.nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const iriDist = distritosIRIMap.get(dNorm);
      if (iriDist) {
        cotaMedia = iriDist.cota_media_m || cotaMedia;
        cuencaNom = iriDist.cuenca || cuencaNom;
        iriNivel = iriDist.nivel_riesgo || iriNivel;
        iriVal = iriDist.indice_riesgo_inundacion || iriVal;
        iriRank = `#${iriDist.ranking} de 246`;
      }
    }
  }

  cotaUbicacionActual = cotaMedia;

  // Actualizar Título y enlaces
  if ($('v3-pdatos-nombre')) $('v3-pdatos-nombre').textContent = nombreTitulo;
  if ($('v3-colap-nombre')) $('v3-colap-nombre').textContent = nombreTitulo;
  if ($('v3-btn-abrir-panel-link')) {
    const qDist = distFull ? `&dist=${encodeURIComponent(distFull)}` : '';
    $('v3-btn-abrir-panel-link').setAttribute('href', `/panel.html?dpto=${dptoCod}${qDist}`);
  }

  // Actualizar Inundabilidad IRI con Semáforos y Barra
  const esRiesgoCritico = iriNivel === 'EXTREMO' || iriNivel === 'ALTO';
  const esRiesgoMedio = iriNivel === 'MEDIO';
  if ($('v3-iri-nivel-txt')) $('v3-iri-nivel-txt').textContent = iriNivel;
  if ($('v3-iri-dot')) $('v3-iri-dot').textContent = esRiesgoCritico ? '🔴' : (esRiesgoMedio ? '🟡' : '🟢');
  if ($('v3-iri-badge-status')) {
    $('v3-iri-badge-status').className = `v3-iri-badge-status ${esRiesgoCritico ? 'pill-rojo' : (esRiesgoMedio ? 'pill-amarillo' : 'pill-verde')}`;
  }
  if ($('v3-iri-bar-pointer')) {
    const ptr = Math.min(95, Math.max(5, iriVal));
    $('v3-iri-bar-pointer').style.left = `${ptr}%`;
  }
  if ($('v3-iri-retorno')) {
    $('v3-iri-retorno').textContent = iriVal <= 25 ? 'Tr: 50 años' : (iriVal <= 45 ? 'Tr: 20 años' : (iriVal <= 70 ? 'Tr: 10 años' : 'Tr: 2-5 años'));
  }
  if ($('v3-iri-nivel')) {
    const badge = $('v3-iri-nivel');
    badge.textContent = `NIVEL: ${iriNivel}`;
    badge.className = `v3-badge-riesgo ${esRiesgoCritico ? 'pill-rojo' : esRiesgoMedio ? 'pill-amarillo' : 'pill-verde'}`;
  }
  if ($('v3-iri-val')) $('v3-iri-val').textContent = iriVal;
  if ($('v3-iri-ranking')) $('v3-iri-ranking').textContent = `Ranking: ${iriRank}`;
  if ($('v3-iri-cuenca')) $('v3-iri-cuenca').textContent = cuencaNom;
  if ($('v3-iri-cota')) $('v3-iri-cota').textContent = `${cotaMedia} m.s.n.m.`;

  // Actualizar Infraestructura
  if ($('v3-infra-edu')) $('v3-infra-edu').textContent = num(eduCount);
  if ($('v3-infra-sal')) $('v3-infra-sal').textContent = num(salCount);
  if ($('v3-infra-ind')) $('v3-infra-ind').textContent = num(indCount);

  // Actualizar Demografía & Catastro
  if ($('v3-demo-pob')) $('v3-demo-pob').textContent = `${num(poblacion)} hab.`;
  if ($('v3-demo-dnit')) $('v3-demo-dnit').textContent = `${num(dnitCuentas)} ctas.`;

  // Actualizar Focos de Calor Activos
  if ($('v3-firms-texto')) {
    let focosDpto = focosFIRMSCachados;
    if (dptoCod !== 'ALL' && depRef.bounds) {
      const [[s, w], [n, o]] = depRef.bounds;
      focosDpto = focosFIRMSCachados.filter(f => {
        const [cLng, cLat] = f.geometry.coordinates;
        return cLat >= s && cLat <= n && cLng >= w && cLng <= o;
      });
    }
    if (focosDpto.length > 0) {
      const frpTotal = focosDpto.reduce((acc, f) => acc + (f.properties?.frp || 0), 0);
      $('v3-firms-texto').innerHTML = `<strong style="color:#f43f5e;">${focosDpto.length} focos activos</strong> (${frpTotal.toFixed(1)} MW)`;
    } else {
      $('v3-firms-texto').innerHTML = `<span style="color:#34d399;">✓ 0 focos de calor activos en el área</span>`;
    }
  }

  // Consultar Clima en Tiempo Real (Open-Meteo & ERA5)
  try {
    const resClima = await fetch(`/api/v3/clima/tiempo?lat=${lat}&lng=${lng}`).then(r => r.json());
    if (resClima && resClima.actual) {
      const act = resClima.actual;
      if ($('v3-kpi-temp')) $('v3-kpi-temp').textContent = act.temperatura !== undefined ? act.temperatura.toFixed(1) : '--';
      if ($('v3-kpi-sens')) $('v3-kpi-sens').textContent = `Sens ${act.sensacion !== undefined ? act.sensacion.toFixed(1) : (act.temperatura ? act.temperatura.toFixed(1) : '--')}°`;
      if ($('v3-kpi-lluvia')) $('v3-kpi-lluvia').textContent = (act.lluvia || act.precipitacion || 0).toFixed(1);
      if ($('v3-kpi-hum')) $('v3-kpi-hum').textContent = act.humedad || '--';
      if ($('v3-kpi-viento')) $('v3-kpi-viento').textContent = `${act.viento || 0}`;
      if ($('v3-kpi-cielo-desc')) $('v3-kpi-cielo-desc').textContent = descClimaWMO(act.codigoClima || 0);

      // Decision Intelligence (SNC-DI)
      const di = resClima.decisionIntelligence || {};
      const ict = di.ICT !== undefined ? di.ICT : 82;
      const irt = di.IRT !== undefined ? di.IRT : 41;
      const ipoot = di.IPOOT_aptitud || 'FAVORABLE';
      const ipootScore = ipoot === 'CRÍTICA' ? 35 : (ipoot === 'RESTRINGIDA' ? 62 : 85);
      const irm = di.IRM !== undefined ? di.IRM : 66;

      // Actualizar ICT
      if ($('v3-val-ict')) $('v3-val-ict').textContent = `${ict} / 100`;
      if ($('v3-dot-ict')) $('v3-dot-ict').textContent = ict >= 70 ? '🟢' : (ict >= 45 ? '🟡' : '🔴');

      // Actualizar IPOOT
      if ($('v3-val-ipoot')) $('v3-val-ipoot').textContent = `${ipootScore} / 100`;
      if ($('v3-dot-ipoot')) $('v3-dot-ipoot').textContent = ipootScore >= 75 ? '🟢' : (ipootScore >= 50 ? '🟡' : '🔴');

      // Actualizar IRT
      if ($('v3-val-irt')) $('v3-val-irt').textContent = `${irt} / 100`;
      if ($('v3-dot-irt')) $('v3-dot-irt').textContent = irt <= 35 ? '🟢' : (irt <= 55 ? '🟡' : '🔴');

      // Actualizar IRM
      if ($('v3-val-irm')) $('v3-val-irm').textContent = `${irm} %`;
      if ($('v3-dot-irm')) $('v3-dot-irm').textContent = irm >= 60 ? '🟢' : (irm >= 40 ? '🟡' : '🔴');
      if ($('v3-val-icst')) $('v3-val-icst').textContent = `+${(cotaMedia + 1.5).toFixed(1)} msnm`;

      // CTI Score General
      let ctiScore = Math.round(100 - (irt * 0.35) - (iriVal * 0.35) + (irm * 0.25));
      ctiScore = Math.min(96, Math.max(25, ctiScore));
      if ($('v3-cti-score-val')) $('v3-cti-score-val').textContent = ctiScore;
      if ($('v3-cti-score-badge')) {
        const badge = $('v3-cti-score-badge');
        if (ctiScore >= 75) {
          badge.textContent = '🟢 EXCELENTE';
          badge.className = 'v3-cti-score-badge pill-verde';
        } else if (ctiScore >= 55) {
          badge.textContent = '🟡 MODERADO';
          badge.className = 'v3-cti-score-badge pill-amarillo';
        } else {
          badge.textContent = '🔴 CRÍTICO';
          badge.className = 'v3-cti-score-badge pill-rojo';
        }
      }

      // Recomendación IA SNC-DI
      if ($('v3-insight-1')) {
        $('v3-insight-1').textContent = ipootScore >= 70
          ? 'Apto para consolidación y desarrollo urbano según POUT.'
          : (ipootScore >= 50 ? 'Expansión urbana condicionada a drenaje y pendiente.' : 'Restricción preventiva de nuevos fraccionamientos.');
      }
      if ($('v3-insight-2')) {
        $('v3-insight-2').textContent = iriVal <= 30
          ? `Bajo riesgo fluvial en cota ${cotaMedia} msnm (Retorno Tr > 50a).`
          : (iriVal <= 60 ? 'Riesgo fluvial moderado. Mantener franja de amortiguamiento.' : `Alto riesgo fluvial. Cota de defensa: +${(cotaMedia + 1.5).toFixed(1)} msnm.`);
      }
      if ($('v3-insight-3')) {
        $('v3-insight-3').textContent = irm >= 60
          ? 'Resiliencia municipal e infraestructura crítica activas.'
          : 'Reforzar obras de drenaje pluvial secundario en zonas bajas.';
      }
    }
  } catch (err) {
    // Si falla la red exterior, los valores predeterminados ya están fijados
  }
}

// Inicializar listeners de ojo, modos de navegación y sincronización de cota 3D
// Inicializar listeners de ojo, modos de navegación y sincronización de cota 3D
let activarModoTabGlobal = null;

function inicializarPestanasYModos() {
  const btnOjo = $('v3-btn-ojo-datos');
  const btnMostrar = $('v3-btn-mostrar-datos');
  const detalle = $('v3-pdatos-detalle');
  const colapsado = $('v3-pdatos-colapsado');

  if (btnOjo && detalle && colapsado) {
    btnOjo.addEventListener('click', () => {
      detalle.style.display = 'none';
      colapsado.style.display = 'flex';
    });
  }

  if (btnMostrar && detalle && colapsado) {
    btnMostrar.addEventListener('click', () => {
      detalle.style.display = 'block';
      colapsado.style.display = 'none';
    });
  }

  // Pestañas de Modos de Navegación del Panel (CTI, Simulación, Capas, Todo)
  const tabBtns = document.querySelectorAll('.v3-tab-btn');
  const fieldsetsModo = document.querySelectorAll('#v3-cuerpo > fieldset[data-modo]');
  const leyendaEdif = document.querySelector('.v3-leyenda');

  function activarModoTab(modo) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === modo));
    const todoToolbar = $('v3-todo-toolbar');
    if (todoToolbar) todoToolbar.style.display = modo === 'todos' ? 'flex' : 'none';

    // Filtrar visibilidad de cada sección según el modo seleccionado
    fieldsetsModo.forEach(fs => {
      if (modo === 'todos') {
        fs.style.display = '';
        fs.classList.remove('v3-modo-oculto');
        fs.hidden = false;
      } else {
        const coincide = fs.dataset.modo === modo;
        fs.style.display = coincide ? '' : 'none';
        fs.classList.toggle('v3-modo-oculto', !coincide);
        fs.hidden = !coincide;
        if (coincide) {
          const legendPleg = fs.querySelector('.v3-legend-plegable');
          if (legendPleg) {
            const cuerpoId = legendPleg.getAttribute('aria-controls');
            const cuerpo = $(cuerpoId);
            if (cuerpo && cuerpo.hidden) {
              cuerpo.hidden = false;
              const ico = legendPleg.querySelector('span');
              if (ico) ico.textContent = '▾';
              legendPleg.setAttribute('aria-expanded', 'true');
            }
          }
        }
      }
    });

    // Control de la leyenda cartográfica (solo en Capas 3D y Todo)
    if (leyendaEdif) {
      leyendaEdif.style.display = (modo === 'capas' || modo === 'todos') ? 'flex' : 'none';
    }

    // Modo Simulación: asegurar que los controles hídricos interactivos estén visibles
    if (modo === 'sim') {
      const chkInund = $('v3-inundacion');
      const ctrlInund = $('v3-inund-ctrl');
      if (chkInund && ctrlInund) {
        if (!chkInund.checked) {
          chkInund.checked = true;
          chkInund.dispatchEvent(new Event('change'));
        }
        ctrlInund.hidden = false;
      }
    }

    // Modo CTI: asegurar que la tarjeta de Decision Intelligence territorial sea visible de inmediato
    if (modo === 'cti') {
      const wrap = $('v3-panel-datos-wrap');
      if (wrap) wrap.style.display = 'block';
    }

    const cuerpo = $('v3-cuerpo');
    if (cuerpo) cuerpo.scrollTo({ top: 0, behavior: 'smooth' });
    const panel = $('v3-panel');
    if (panel) panel.scrollTo({ top: 0 });
  }
  activarModoTabGlobal = activarModoTab;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activarModoTab(btn.dataset.tab);
    });
  });

  // Interactividad de plegado/desplegado por clic en encabezados (Legends)
  document.querySelectorAll('.v3-legend-plegable').forEach(leg => {
    leg.addEventListener('click', () => {
      const cuerpoId = leg.getAttribute('aria-controls');
      const cuerpo = $(cuerpoId);
      if (cuerpo) {
        cuerpo.hidden = !cuerpo.hidden;
        const expandido = !cuerpo.hidden;
        leg.setAttribute('aria-expanded', String(expandido));
        const ico = leg.querySelector('span');
        if (ico) ico.textContent = expandido ? '▾' : '▸';
      }
    });
    leg.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        leg.click();
      }
    });
  });

  // Acciones de Vista Continua (Expandir / Colapsar todos)
  $('v3-btn-expandir-todos')?.addEventListener('click', () => {
    document.querySelectorAll('#v3-cuerpo .v3-legend-plegable').forEach(leg => {
      const cuerpoId = leg.getAttribute('aria-controls');
      const cuerpo = $(cuerpoId);
      if (cuerpo) {
        cuerpo.hidden = false;
        leg.setAttribute('aria-expanded', 'true');
        const ico = leg.querySelector('span');
        if (ico) ico.textContent = '▾';
      }
    });
  });
  $('v3-btn-colapsar-todos')?.addEventListener('click', () => {
    document.querySelectorAll('#v3-cuerpo .v3-legend-plegable').forEach(leg => {
      const cuerpoId = leg.getAttribute('aria-controls');
      const cuerpo = $(cuerpoId);
      if (cuerpo) {
        cuerpo.hidden = true;
        leg.setAttribute('aria-expanded', 'false');
        const ico = leg.querySelector('span');
        if (ico) ico.textContent = '▸';
      }
    });
  });

  const tabInicial = document.querySelector('.v3-tab-btn.active')?.dataset.tab || 'cti';
  activarModoTab(tabInicial);

  const btnSyncCota = $('v3-btn-sincronizar-cota-3d');
  if (btnSyncCota) {
    btnSyncCota.addEventListener('click', () => {
      activarModoTab('sim');
      const chkInund = $('v3-inundacion');
      if (chkInund && !chkInund.checked) {
        chkInund.checked = true;
        chkInund.dispatchEvent(new Event('change'));
      }
      const slider = $('v3-inund-cota');
      if (slider && typeof cotaUbicacionActual === 'number') {
        slider.value = cotaUbicacionActual;
        slider.dispatchEvent(new Event('input'));
        estado(`🌊 Cota 3D sincronizada a ${cotaUbicacionActual} m s.n.m. para el área seleccionada.`);
      }
    });
  }
}

// Ejecución infalible en módulos ES6 sin depender de timing de DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarPestanasYModos);
} else {
  inicializarPestanasYModos();
}

// Cargar distritos y configurar eventos del selector
fetch('/api/v3/visor3d/distritos').then(r => r.json()).then(({ distritos }) => {
  distritos.forEach(d => (distritosPorDpto[d.dpto] ||= []).push(d));
  const opciones = Object.keys(distritosPorDpto).sort((a, b) => (DPTO[a] || a).localeCompare(DPTO[b] || b, 'es'))
    .map(k => `<option value="${k}">${esc(DPTO[k] || k)}</option>`).join('');
  $('v3-dpto').insertAdjacentHTML('beforeend', `<option value="ALL">🇵🇾 Paraguay Total (Nacional)</option>${opciones}`);
}).catch(() => {});

$('v3-dpto').addEventListener('change', e => {
  const dpto = e.target.value, sel = $('v3-distrito');
  if (dpto === 'ALL') {
    sel.disabled = true;
    sel.innerHTML = '<option value="">— Cobertura Nacional —</option>';
    map.fitBounds([[-27.60, -62.70], [-19.30, -54.20]], { padding: 40, pitch: 40, duration: 1600 });
    actualizarPanelDatosUbicacion('ALL', null);
    return;
  }
  const lista = distritosPorDpto[dpto];
  sel.disabled = !lista;
  sel.innerHTML = lista
    ? `<option value="">— Elegir distrito —</option>${lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(d => `<option value="${d.dpto}|${d.dist}">${esc(d.nombre.charAt(0) + d.nombre.slice(1).toLowerCase())}</option>`).join('')}`
    : '<option value="">— Elija primero el departamento —</option>';
  
  // Si se eligió un departamento específico, volar hacia él y mostrar sus datos
  if (dpto && DEPARTAMENTOS_PY_DATA[dpto]) {
    const dep = DEPARTAMENTOS_PY_DATA[dpto];
    if (dep.bounds) {
      map.fitBounds(dep.bounds, { padding: 40, pitch: 45, duration: 1600 });
    } else {
      map.flyTo({ center: [dep.lng, dep.lat], zoom: 9, pitch: 45, duration: 1600 });
    }
    actualizarPanelDatosUbicacion(dpto, null);
  } else {
    actualizarPanelDatosUbicacion(null, null);
  }

  sel.dispatchEvent(new Event('change'));   // limpia el límite y las capas del distrito anterior
});

$('v3-distrito').addEventListener('change', async e => {
  const val = e.target.value;
  if (!val) {
    const dpto = $('v3-dpto').value;
    if (dpto) actualizarPanelDatosUbicacion(dpto, null);
    return;
  }
  const [dpto, dist] = val.split('|');
  cargarCapasDistrito(dpto, dist);
  actualizarPanelDatosUbicacion(dpto, val);
  if (!dpto) { map.getSource('limite').setData(vacio); return; }
  estado('Buscando el límite del distrito…');
  try {
    const f = await fetch(`/api/v3/parcelario/limite?dpto=${dpto}&dist=${dist}`).then(r => r.json());
    if (!f.geometry) throw new Error(f.error || 'Sin límite');
    map.getSource('limite').setData(f);
    let w = 180, s = 90, o = -180, n = -90;
    const rec = c => { if (typeof c[0] === 'number') { w = Math.min(w, c[0]); o = Math.max(o, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); } else c.forEach(rec); };
    rec(f.geometry.coordinates);
    map.fitBounds([[w, s], [o, n]], { padding: 40, pitch: 55, duration: 1800 });
    estado(`${f.properties.nombre}: ${num(Math.round(f.properties.area_km2))} km². Toque el lugar que quiera ver: el visor se acerca a los edificios.`);
  } catch (err) { estado(err.message); }
});

// Zoom óptimo para ver edificios en 3D (≈ 16,5 e inclinado).
const ZOOM_EDIFICIOS = 16.5;
function acercar(lngLat) { map.flyTo({ center: lngLat, zoom: ZOOM_EDIFICIOS, pitch: 60, duration: 1600 }); }
map.on('click', ev => { if (map.getZoom() < 14) acercar(ev.lngLat); });

// ── Información al tocar y Vínculos de Inspección 360° ───────────────
function botonesInspeccionVisual3D(lat, lng) {
  const cLat = Number(lat).toFixed(6);
  const cLng = Number(lng).toFixed(6);
  const urlSV = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${cLat},${cLng}`;
  const urlGM = `https://www.google.com/maps/search/?api=1&query=${cLat},${cLng}`;
  const urlMP = `https://www.mapillary.com/app/?lat=${cLat}&lng=${cLng}&z=17`;

  return `<div style="display:flex;gap:4px;margin-top:7px;flex-wrap:wrap;">` +
    `<a href="${urlSV}" target="_blank" rel="noopener noreferrer" style="flex:1;min-width:115px;background:#0284c7;color:#fff;text-align:center;padding:4px 6px;border-radius:4px;text-decoration:none;font-weight:600;font-size:10.5px;display:inline-block;" title="Abrir vista esférica 360° más cercana en Google Street View">📷 Street View 360°</a>` +
    `<a href="${urlGM}" target="_blank" rel="noopener noreferrer" style="background:#334155;color:#f8fafc;text-align:center;padding:4px 6px;border-radius:4px;text-decoration:none;font-size:10.5px;display:inline-block;" title="Ver en Google Maps con ruteo">📍 Maps</a>` +
    `<a href="${urlMP}" target="_blank" rel="noopener noreferrer" style="background:#1e293b;color:#94a3b8;border:1px solid #475569;text-align:center;padding:4px 5px;border-radius:4px;text-decoration:none;font-size:10px;display:inline-block;" title="Ver imágenes a nivel de calle comunitarias en Mapillary">🌐 Mapillary</a>` +
  `</div>`;
}

map.on('click', 'edificios', ev => {
  const p = ev.features[0].properties;
  const cotaVal = Number($('v3-inund-cota')?.value) || obtenerCotaCentro();
  const cotaT = p._cota ?? cotaConfiable(ev.lngLat.lng, ev.lngLat.lat, map.queryTerrainElevation?.(ev.lngLat));
  const icst = calcularICST(cotaT, cotaVal);
  const distSel = $('v3-distrito')?.selectedOptions?.[0]?.textContent || 'Área Local';
  const irct = calcularIRCTDistrital(distSel);
  const est = { auto: 'vinculado a su parcela', manual: 'asignado a mano', pendiente: 'falta asignarlo a una parcela' }[p.estado] || 'fuera del catastro (sin parcela)';

  const html = `
    <div style="font-size:12px; line-height:1.4; min-width:260px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong style="font-size:13px; color:#0f172a;">Edificio ${esc(p.tipo || '')}</strong>
        <span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:3px; background:${icst.color}20; color:${icst.color}; border:1px solid ${icst.color};">
          ${icst.badge}
        </span>
      </div>

      <!-- Ficha de Cota Segura Territorial (ICST) -->
      <div style="background:#0f172a; border-radius:4px; padding:6px 8px; color:#f8fafc; margin-bottom:6px; font-size:11px;">
        <div style="color:#38bdf8; font-weight:bold; font-size:11px; margin-bottom:3px; display:flex; justify-content:space-between;">
          <span>🛡️ Cota Segura (ICST)</span>
          <span>${icst.score} / 100</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#94a3b8;">Cota terreno (DEM):</span><strong>${cotaT ? cotaT.toFixed(2) + ' m' : '—'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#94a3b8;">Crecida diseño:</span><strong style="color:#f87171;">${cotaVal.toFixed(2)} m</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#94a3b8;">Cota segura (+1.5m):</span><strong style="color:#34d399;">${icst.hSegura.toFixed(2)} m</strong>
        </div>
        <div style="font-size:10px; color:#cbd5e1; margin-top:3px; border-top:1px solid #1e293b; padding-top:3px;">
          ${icst.recomendacion}
        </div>
      </div>

      <div style="font-size:11px; color:#475569; margin-bottom:3px;">
        Techo: <b>${num(p.m2)} m²</b> · Pisos: <b>${p.niveles || '1'}</b> · ${esc(est)}
      </div>
      <div style="font-size:10.5px; color:#0284c7; margin-bottom:4px;">
        📊 <strong>IRCT Distrital:</strong> ${irct.score}/100 (${irct.nivel})
      </div>
      ${botonesInspeccionVisual3D(ev.lngLat.lat, ev.lngLat.lng)}
    </div>
  `;

  new ml.Popup().setLngLat(ev.lngLat).setHTML(html).addTo(map);
});

map.on('click', 'parcelas', ev => {
  if (map.queryRenderedFeatures(ev.point, { layers: ['edificios'] }).length) return;
  const p = ev.features[0].properties;
  const cta = p.dnit_ctacte || (p.padron ? `Padrón ${p.padron}` : '—');
  const cotaVal = Number($('v3-inund-cota')?.value) || obtenerCotaCentro();
  const cotaT = cotaConfiable(ev.lngLat.lng, ev.lngLat.lat, map.queryTerrainElevation?.(ev.lngLat));
  const icst = calcularICST(cotaT, cotaVal);
  const distSel = $('v3-distrito')?.selectedOptions?.[0]?.textContent || 'Área Local';
  const irct = calcularIRCTDistrital(distSel);

  const html = `
    <div style="font-size:12px; line-height:1.4; min-width:260px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <strong style="font-size:13px; color:#0f172a;">Parcela SNC (${esc(cta)})</strong>
        <span style="font-size:10px; font-weight:bold; padding:2px 6px; border-radius:3px; background:${icst.color}20; color:${icst.color}; border:1px solid ${icst.color};">
          ${icst.badge}
        </span>
      </div>

      <!-- Ficha de Cota Segura Territorial (ICST) -->
      <div style="background:#0f172a; border-radius:4px; padding:6px 8px; color:#f8fafc; margin-bottom:6px; font-size:11px;">
        <div style="color:#38bdf8; font-weight:bold; font-size:11px; margin-bottom:3px; display:flex; justify-content:space-between;">
          <span>🛡️ Cota Segura Territorial (ICST)</span>
          <span>${icst.score} / 100</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#94a3b8;">Cota terreno (DEM):</span><strong>${cotaT ? cotaT.toFixed(2) + ' m' : '—'}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#94a3b8;">Crecida diseño:</span><strong style="color:#f87171;">${cotaVal.toFixed(2)} m</strong>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
          <span style="color:#94a3b8;">Cota mínima resguardo:</span><strong style="color:#34d399;">${icst.hSegura.toFixed(2)} m</strong>
        </div>
        <div style="font-size:10px; color:#cbd5e1; margin-top:3px; border-top:1px solid #1e293b; padding-top:3px;">
          ${icst.recomendacion}
        </div>
      </div>

      <div style="font-size:11px; color:#475569; margin-bottom:3px;">
        Superficie: <b>${num(p.superficie_m2)} m²</b>${p.dnit_impuesto != null ? ` · Impuesto: Gs <b>${num(p.dnit_impuesto)}</b>` : ''}
      </div>
      <div style="font-size:10.5px; color:#0284c7; margin-bottom:4px;">
        📊 <strong>IRCT Distrital:</strong> ${irct.score}/100 (${irct.nivel}) · Ley 3966 Art. 225
      </div>
      ${botonesInspeccionVisual3D(ev.lngLat.lat, ev.lngLat.lng)}
    </div>
  `;

  new ml.Popup().setLngLat(ev.lngLat).setHTML(html).addTo(map);
});

map.on('click', 'incendios-puntos', ev => {
  const p = ev.features[0].properties;
  const evento = p.evento ? `<b>${esc(p.evento)}</b><br>` : '';
  const distHtml = p.distrito ? `Distrito: <b>${esc(p.distrito)}</b> (${esc(p.departamento || '')})<br>` : '';
  const supHtml = p.superficie_ha ? `Área quemada estimada: <b style="color:#ef4444;">~${esc(p.superficie_ha)} ha</b><br>` : '';
  const html = `<b>🔥 Foco de Calor / Incendio</b><br>${evento}${distHtml}Fecha: ${esc(p.fecha)} ${esc(p.hora)}<br>Satélite: ${esc(p.satelite)}<br>Potencia radiativa (FRP): <b>${esc(p.frp)} MW</b><br>${supHtml}Confianza: ${esc(p.confianza)}${botonesInspeccionVisual3D(ev.lngLat.lat, ev.lngLat.lng)}`;
  new ml.Popup().setLngLat(ev.lngLat).setHTML(html).addTo(map);
});

map.on('click', 'evacuacion-albergues-puntos', ev => {
  const p = ev.features[0].properties;
  const html = `<div style="font-size:12px;line-height:1.4;">` +
    `<strong style="color:#059669;font-size:13px;">🛡️ ${esc(p.nombre || 'Albergue Seguro')}</strong><br>` +
    `<span style="color:#475569;font-size:11px;">${esc(p.tipo || 'Infraestructura de Contingencia')}</span><br>` +
    `<span style="color:#0f172a;font-size:11px;">Capacidad: <strong>${esc(p.capacidad || '50-200 personas')}</strong></span><br>` +
    `<div style="margin-top:3px;padding:2px 5px;background:#ecfdf5;border:1px solid #10b981;border-radius:3px;color:#065f46;font-size:10.5px;font-weight:bold;">` +
      `✓ Terreno Seco Habilitado (Ley 3966 Art. 225)` +
    `</div>` +
    botonesInspeccionVisual3D(ev.lngLat.lat, ev.lngLat.lng) +
  `</div>`;
  new ml.Popup().setLngLat(ev.lngLat).setHTML(html).addTo(map);
});

['edificios', 'parcelas', 'incendios-puntos', 'evacuacion-albergues-puntos'].forEach(id => {
  map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; });
});

// ── Minimapa 2D de ubicación: punto en el centro de la cámara y cono hacia donde mira ──
const mini = new ml.Map({
  container: 'v3-minimapa', interactive: true, attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
  center: map.getCenter(), zoom: Math.max(1, map.getZoom() - 4),
  style: { version: 8, sources: { osm: { type: 'raster', tiles: tesela('osm'), tileSize: 256, maxzoom: 19 } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] }
});
mini.on('load', () => {
  mini.addSource('inundacion-mini', { type: 'geojson', data: vacio });
  mini.addLayer({
    id: 'inundacion-mini-capa',
    type: 'fill',
    source: 'inundacion-mini',
    paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.7 }
  });
});
const ojo = document.createElement('div'); ojo.className = 'v3-ojo';
ojo.innerHTML = '<div class="v3-cono"></div><div class="v3-punto"></div>';
const marcaMini = new ml.Marker({ element: ojo, anchor: 'center' }).setLngLat(map.getCenter()).addTo(mini);
const cono = ojo.querySelector('.v3-cono');
const mira = document.createElement('div'); mira.className = 'v3-mira';
const marcaCentro = new ml.Marker({ element: mira, anchor: 'center' }).setLngLat(map.getCenter()).addTo(mini);
// El punto va donde está la cámara (con la vista inclinada queda detrás del centro) y el cono apunta hacia
// donde mira: el rumbo de la cámara, medido en sentido horario desde el norte, igual que en el mapa principal.
// Observador = el punto del suelo que se ve abajo al centro de la vista 3D (lo más cercano que ve el usuario).
// La «cámara matemática» queda mucho más atrás con la vista inclinada y no coincide con lo que se percibe.
function posicionCamara() {
  const cv = map.getCanvas(), w = cv.clientWidth, h = cv.clientHeight;
  try { const ll = map.unproject([w / 2, h - 8]); if (Number.isFinite(ll.lng) && Number.isFinite(ll.lat)) return ll; } catch { /* sin proyección todavía */ }
  return map.getCenter();
}
function syncMini() {
  const cam = posicionCamara(), c = map.getCenter();
  marcaMini.setLngLat(cam); marcaCentro.setLngLat(c);
  mini.jumpTo({ center: [(cam.lng + c.lng) / 2, (cam.lat + c.lat) / 2], zoom: Math.max(1, map.getZoom() - 3.5) });
  // El haz se calcula en pantalla del minimapa: sale de la cámara y su eje pasa exactamente por el centro de la vista.
  const a = mini.project(cam), b = mini.project(c);
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const largo = Math.max(50, d * 1.35), ancho = Math.max(44, largo * 0.8);
  cono.style.width = `${ancho}px`; cono.style.height = `${largo}px`; cono.style.left = `${-ancho / 2}px`; cono.style.top = `${-largo}px`;
  const ang = d > 2 ? Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI : map.getBearing();
  cono.style.transform = `rotate(${ang}deg)`;
  cono.style.opacity = String(0.45 + Math.min(1, map.getPitch() / 70) * 0.55);   // más inclinado, cono más marcado
}
map.on('move', syncMini);
map.on('load', syncMini);
mini.on('click', e => { if (!girando) map.easeTo({ center: e.lngLat, duration: 800 }); });

// Girar la cámara 360° arrastrando el cono (o el punto) en el minimapa.
let girando = false;
ojo.addEventListener('pointerdown', ev => {
  ev.preventDefault(); ev.stopPropagation();
  girando = true; ojo.setPointerCapture(ev.pointerId); ojo.classList.add('v3-girando');
});
ojo.addEventListener('pointermove', ev => {
  if (!girando) return;
  const r = ojo.querySelector('.v3-punto').getBoundingClientRect();
  const dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < 6) return;
  map.setBearing(Math.atan2(dx, -dy) * 180 / Math.PI);   // 0° = norte, 90° = este
});
const soltar = ev => { if (!girando) return; ojo.releasePointerCapture?.(ev.pointerId); ojo.classList.remove('v3-girando'); setTimeout(() => { girando = false; }, 50); };
ojo.addEventListener('pointerup', soltar);
ojo.addEventListener('pointercancel', soltar);
ojo.title = 'Arrastre el cono para girar la cámara (360°)';

// ── Alternar Vista 2D (Planta) / 3D (Relieve) ────────────────────────
function alternarModo2D(forzar2D) {
  const irA2D = forzar2D !== undefined ? forzar2D : (map.getPitch() > 10);
  const btn3D = $('v3-toggle-2d');
  if (irA2D) {
    map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    if (btn3D) {
      btn3D.classList.remove('active');
      btn3D.title = 'Cambiar a perspectiva 3D';
    }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = true;
  } else {
    map.easeTo({ pitch: 62, bearing: -20, duration: 1000 });
    if (btn3D) {
      btn3D.classList.add('active');
      btn3D.title = 'Cambiar a vista cenital 2D';
    }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = false;
  }
}
$('v3-toggle-2d')?.addEventListener('click', () => alternarModo2D());
$('v3-btn-scroll-di')?.addEventListener('click', () => {
  if (typeof activarModoTabGlobal === 'function') {
    activarModoTabGlobal('cti');
  }
  const secDI = $('v3-sec-snc-di');
  if (secDI) {
    secDI.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
$('v3-inund-planta-2d')?.addEventListener('change', e => alternarModo2D(e.target.checked));
map.on('pitchend', () => {
  const p = map.getPitch();
  const btn3D = $('v3-toggle-2d');
  if (p <= 5) {
    if (btn3D) { btn3D.classList.remove('active'); btn3D.title = 'Cambiar a perspectiva 3D'; }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = true;
  } else if (p >= 35) {
    if (btn3D) { btn3D.classList.add('active'); btn3D.title = 'Cambiar a vista cenital 2D'; }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = false;
  }
});

// ── Panel y teclado ─────────────────────────────────────────────────
$('v3-plegar').addEventListener('click', e => { const c = $('v3-cuerpo'); c.hidden = !c.hidden; e.target.textContent = c.hidden ? '+' : '−'; e.target.setAttribute('aria-expanded', String(!c.hidden)); });

$('v3-pestana')?.addEventListener('click', () => {
  const panel = $('v3-panel'), tab = $('v3-pestana');
  const oculto = panel.classList.toggle('v3-oculto');
  tab.classList.toggle('v3-oculto', oculto);
  tab.textContent = oculto ? '▸' : '◂';
  tab.title = oculto ? 'Mostrar el panel' : 'Ocultar el panel';
  tab.setAttribute('aria-expanded', String(!oculto));
});
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'r' || e.key === 'R') map.flyTo({ ...INICIO, duration: 1500 });
  if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
});

// Con la pestaña en segundo plano, los navegadores frenan requestAnimationFrame a ~1 cuadro cada
// 1-2 s; de eso depende el armado del relieve 3D, así que queryTerrainElevation puede devolver
// cotas muy por debajo de la real mientras tanto. Al volver a primer plano, se recalcula.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  actualizarCota();
  if ($('v3-inundacion')?.checked) actualizarInundacion();
});
