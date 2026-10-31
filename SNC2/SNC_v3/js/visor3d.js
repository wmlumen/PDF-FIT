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
      edificios: { type: 'geojson', data: vacio }, parcelas: { type: 'geojson', data: vacio }, limite: { type: 'geojson', data: vacio },
      cascos: { type: 'geojson', data: vacio }, barrios: { type: 'geojson', data: vacio }
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
        layout: { 'symbol-placement': 'line', 'text-field': ['get', 'NOMBRE'], 'text-size': 11, 'text-font': ['Open Sans Regular'], 'text-max-angle': 30 },
        paint: { 'text-color': '#0369a1', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } },
      { id: 'inundacion-capa', type: 'fill', source: 'inundacion', layout: { visibility: 'none' }, paint: { 'fill-color': '#0284c7', 'fill-opacity': 0.60, 'fill-antialias': false } },
      { id: 'inundacion-borde', type: 'line', source: 'inundacion', layout: { visibility: 'none' }, paint: { 'line-color': '#38bdf8', 'line-width': 1.5, 'line-opacity': 0.85 } },
      { id: 'barrios', type: 'fill', source: 'barrios', layout: { visibility: 'none' }, paint: { 'fill-color': ['match', ['get', 'zona'], 'urbana', '#fcd34d', '#5eead4'], 'fill-opacity': 0.28 } },
      { id: 'barrios-borde', type: 'line', source: 'barrios', layout: { visibility: 'none' }, paint: { 'line-color': ['match', ['get', 'zona'], 'urbana', '#b45309', '#0d9488'], 'line-width': 1 } },
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
  // Carga automática de la red hidrográfica y cauces (SNC)
  fetch('/data/piribebuy/base/hidro.geojson').then(r => r.json()).then(data => {
    map.getSource('hidro')?.setData(data);
    cargadas.hidro = true;
  }).catch(() => {});
});

// ── Mapa base y relieve ─────────────────────────────────────────────
document.querySelectorAll('input[name="base"]').forEach(r => r.addEventListener('change', () => {
  map.setLayoutProperty('base-osm', 'visibility', r.value === 'osm' && r.checked ? 'visible' : 'none');
  map.setLayoutProperty('base-satelite', 'visibility', r.value === 'satelite' && r.checked ? 'visible' : 'none');
  map.setLayoutProperty('base-satelite-respaldo', 'visibility', r.value === 'satelite' && r.checked ? 'visible' : 'none');
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

function obtenerCotaCentro() {
  const c = map.getCenter();
  let h = null;
  try {
    h = map.queryTerrainElevation?.([c.lng, c.lat]);
    if (h == null || h <= 0) {
      const d = 0.003;
      const puntos = [[c.lng + d, c.lat], [c.lng - d, c.lat], [c.lng, c.lat + d], [c.lng, c.lat - d]];
      for (const p of puntos) {
        const alt = map.queryTerrainElevation?.(p);
        if (alt != null && alt > 0) { h = alt; break; }
      }
    }
  } catch {}
  if (h == null || h <= 0) {
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
      const h = map.queryTerrainElevation?.([xDe(i), yDe(j)]);
      fila.push(h == null ? SECO : h);
    }
    val.push(fila);
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
        const h = map.queryTerrainElevation?.([w + (i + 0.5) * dx, ym]);
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
}

function actualizarInundacion() {
  const activo = $('v3-inundacion')?.checked;
  $('v3-inund-ctrl').hidden = !activo;
  map.setLayoutProperty('inundacion-capa', 'visibility', activo ? 'visible' : 'none');
  if (map.getLayer('inundacion-borde')) {
    map.setLayoutProperty('inundacion-borde', 'visibility', activo ? 'visible' : 'none');
  }

  if (!activo) {
    if (animandoInund) {
      clearInterval(animandoInund);
      animandoInund = null;
      $('v3-inund-animar').textContent = '▶ Simular crecida';
    }
    map.setPaintProperty('edificios', 'fill-extrusion-color', $('v3-color')?.value === 'real' ? COLOR_REAL : COLOR_CATASTRO);
    try { mini.getSource('inundacion-mini')?.setData(vacio); } catch {}
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

  // Afectación de edificaciones en 3D
  let totalComp = 0, totalEdif = 0;
  const edifSrc = map.getSource('edificios');
  if (edifSrc?._data?.features?.length) {
    totalEdif = edifSrc._data.features.length;
    edifSrc._data.features.forEach(f => {
      const coord = f.geometry?.coordinates?.[0]?.[0] || f.geometry?.coordinates?.[0];
      if (coord && typeof coord[0] === 'number') {
        const h = map.queryTerrainElevation?.(coord);
        const isInund = h != null && h <= cotaVal;
        f.properties._inund = isInund;
        if (isInund) totalComp++;
      }
    });
    map.setPaintProperty('edificios', 'fill-extrusion-color', [
      'case',
      ['==', ['get', '_inund'], true], '#ef4444',
      $('v3-color')?.value === 'real' ? COLOR_REAL : COLOR_CATASTRO
    ]);
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
  const TIEMPO_CONCENTRACION_S = 6 * 3600;   // 6 h: orden de magnitud para una crecida rápida, no un cálculo de cuenca real
  const caudalM3s = volumenM3 / TIEMPO_CONCENTRACION_S;
  $('v3-inund-analitica').hidden = false;
  $('v3-vol-o').textContent = `${volumenHm3 < 10 ? volumenHm3.toFixed(2) : Math.round(volumenHm3)} hm³`;
  $('v3-caudal-o').textContent = `${num(Math.round(caudalM3s))} m³/s`;

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

$('v3-inund-animar')?.addEventListener('click', () => {
  if (animandoInund) {
    clearInterval(animandoInund); animandoInund = null;
    $('v3-inund-animar').textContent = '▶ Simular crecida';
  } else {
    $('v3-inund-animar').textContent = '⏸ Pausar';
    let subiendo = true;
    const base = obtenerCotaCentro();
    const minC = base;
    const maxC = base + 8;
    $('v3-inund-cota').value = minC;
    animandoInund = setInterval(() => {
      let c = Number($('v3-inund-cota').value);
      if (subiendo) {
        c += 0.5;
        if (c >= maxC) subiendo = false;
      } else {
        c -= 0.5;
        if (c <= minC) subiendo = true;
      }
      $('v3-inund-cota').value = c;
      actualizarInundacion();
    }, 450);
  }
});

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
function aplicarLluvia() {
  const mm = Number($('v3-lluvia').value);
  $('v3-lluvia-o').textContent = `${mm} mm`;
  actualizarDinac(mm);
  if (!$('v3-inundacion').checked) $('v3-inundacion').checked = true;
  const sld = $('v3-inund-cota');
  const cota = cotaDesdeLluvia(mm, Number($('v3-suelo').value));
  sld.value = Math.max(Number(sld.min), Math.min(Number(sld.max), cota));
  actualizarInundacion();
}
$('v3-lluvia')?.addEventListener('input', aplicarLluvia);
$('v3-suelo')?.addEventListener('change', aplicarLluvia);
document.querySelectorAll('.v3-lluvia-btn').forEach(b => b.addEventListener('click', () => { $('v3-lluvia').value = b.dataset.mm; aplicarLluvia(); }));

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
  map.setPaintProperty('edificios', 'fill-extrusion-color', e.target.value === 'real' ? COLOR_REAL : COLOR_CATASTRO);
  document.querySelector('.v3-leyenda').hidden = e.target.value === 'real';
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

// ── Exportar topografía ────────────────────────────────────────────
function toggleExportar() {
  const c = $('v3-exp-cuerpo'); c.hidden = !c.hidden;
  $('v3-exp-ico').textContent = c.hidden ? '▸' : '▾';
  $('v3-exp-legend').setAttribute('aria-expanded', String(!c.hidden));
}
$('v3-exp-legend').addEventListener('click', toggleExportar);
$('v3-exp-legend').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExportar(); } });

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

// ── Capas ───────────────────────────────────────────────────────────
const CAPAS = { hidro: ['hidro-lineas', 'hidro-nombres'], edificios: ['edificios'], parcelas: ['parcelas'], limite: ['limite'], cascos: ['cascos', 'cascos-borde'], barrios: ['barrios', 'barrios-borde'] };
const cargadas = {};
document.querySelectorAll('input[data-capa]').forEach(ch => ch.addEventListener('change', async () => {
  const k = ch.dataset.capa;
  CAPAS[k]?.forEach(id => map.setLayoutProperty(id, 'visibility', ch.checked ? 'visible' : 'none'));
  if (ch.checked && k === 'hidro' && !cargadas.hidro) {
    try {
      const r = await fetch('/data/piribebuy/base/hidro.geojson');
      map.getSource('hidro').setData(await r.json());
      cargadas.hidro = true;
    } catch {}
  }
  if (ch.checked && (k === 'cascos' || k === 'barrios') && !cargadas[k]) {
    estado(`Cargando ${k === 'cascos' ? 'cascos urbanos' : 'barrios (18 MB, la primera vez tarda)'}…`);
    try {
      const r = await fetch(k === 'cascos' ? '/data/casco_urbano_snc.geojson' : '/data/barrios_py_light.geojson');
      map.getSource(k).setData(await r.json()); cargadas[k] = true; estado('');
    } catch { estado('No se pudo cargar la capa.'); }
  }
  if (ch.checked && (k === 'edificios' || k === 'parcelas')) { if (map.getZoom() < 16) acercar(map.getCenter()); else cargarVista(); }
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
    if ($('v3-inundacion')?.checked && (!$('v3-inund-cuenca') || $('v3-inund-cuenca').value === 'local')) {
      actualizarInundacion();
    }
  }, 350);
});

// ── Selector de departamento → distrito (en 2 pasos, en vez de un combo con los 268) ──
let distritosPorDpto = {};
fetch('/api/v3/visor3d/distritos').then(r => r.json()).then(({ distritos }) => {
  distritos.forEach(d => (distritosPorDpto[d.dpto] ||= []).push(d));
  $('v3-dpto').insertAdjacentHTML('beforeend', Object.keys(distritosPorDpto).sort((a, b) => (DPTO[a] || a).localeCompare(DPTO[b] || b, 'es'))
    .map(k => `<option value="${k}">${esc(DPTO[k] || k)}</option>`).join(''));
}).catch(() => {});
$('v3-dpto').addEventListener('change', e => {
  const dpto = e.target.value, sel = $('v3-distrito');
  const lista = distritosPorDpto[dpto];
  sel.disabled = !lista;
  sel.innerHTML = lista
    ? `<option value="">— Elegir distrito —</option>${lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        .map(d => `<option value="${d.dpto}|${d.dist}">${esc(d.nombre.charAt(0) + d.nombre.slice(1).toLowerCase())}</option>`).join('')}`
    : '<option value="">— Elija primero el departamento —</option>';
  sel.dispatchEvent(new Event('change'));   // limpia el límite y las capas del distrito anterior
});
$('v3-distrito').addEventListener('change', async e => {
  const [dpto, dist] = e.target.value.split('|');
  cargarCapasDistrito(dpto, dist);
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

// ── Información al tocar ────────────────────────────────────────────
map.on('click', 'edificios', ev => {
  const p = ev.features[0].properties;
  const est = { auto: 'vinculado a su parcela', manual: 'asignado a mano', pendiente: 'falta asignarlo a una parcela' }[p.estado] || 'fuera del catastro (sin parcela)';
  new ml.Popup().setLngLat(ev.lngLat).setHTML(`<b>Edificio ${esc(p.tipo || '')}</b><br>Techo: ${num(p.m2)} m² · cubierta: ${num(p.m2_cubierta)} m²<br>Pisos: ${String(p.niveles_informados) === 'true' ? `${esc(p.niveles)} (del mapa)` : p.niveles_dnit ? `${esc(p.niveles_dnit)} (estimado por la liquidación DNIT)` : '1 (supuesto: el mapa no lo indica)'}${p.altura_m ? `<br>Altura: ${esc(p.altura_m)} m` : ''}${p.material ? `<br>Material: ${esc(p.material)}` : ''}<br>${esc(est)}`).addTo(map);
});
map.on('click', 'parcelas', ev => {
  if (map.queryRenderedFeatures(ev.point, { layers: ['edificios'] }).length) return;
  const p = ev.features[0].properties;
  const cta = p.dnit_ctacte || (p.padron ? `Padrón ${p.padron}` : '—');
  new ml.Popup().setLngLat(ev.lngLat).setHTML(`<b>Parcela SNC</b><br>Cuenta: ${esc(cta)}<br>Superficie: ${num(p.superficie_m2)} m²${p.dnit_impuesto != null ? `<br>Impuesto 2026: Gs ${num(p.dnit_impuesto)}` : ''}${p.dnit_sup_edif_m2 != null ? `<br>Edificado DNIT: ${num(p.dnit_sup_edif_m2)} m²` : ''}`).addTo(map);
});
['edificios', 'parcelas'].forEach(id => { map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer'; }); map.on('mouseleave', id, () => { map.getCanvas().style.cursor = ''; }); });

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
  if (irA2D) {
    map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
    if ($('v3-toggle-2d')) { $('v3-toggle-2d').textContent = 'Vista 3D'; $('v3-toggle-2d').style.background = '#0284c7'; }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = true;
  } else {
    map.easeTo({ pitch: 62, bearing: -20, duration: 1000 });
    if ($('v3-toggle-2d')) { $('v3-toggle-2d').textContent = 'Vista 2D'; $('v3-toggle-2d').style.background = '#334155'; }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = false;
  }
}
$('v3-toggle-2d')?.addEventListener('click', () => alternarModo2D());
$('v3-inund-planta-2d')?.addEventListener('change', e => alternarModo2D(e.target.checked));
map.on('pitchend', () => {
  const p = map.getPitch();
  if (p <= 5) {
    if ($('v3-toggle-2d')) { $('v3-toggle-2d').textContent = 'Vista 3D'; $('v3-toggle-2d').style.background = '#0284c7'; }
    if ($('v3-inund-planta-2d')) $('v3-inund-planta-2d').checked = true;
  } else if (p >= 35) {
    if ($('v3-toggle-2d')) { $('v3-toggle-2d').textContent = 'Vista 2D'; $('v3-toggle-2d').style.background = '#334155'; }
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
