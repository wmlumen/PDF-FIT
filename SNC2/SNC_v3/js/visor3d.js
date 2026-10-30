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
  K: 'Alto Paraná', L: 'Central', M: 'Ñeembucú', N: 'Amambay', O: 'Canindeyú', P: 'Presidente Hayes', Q: 'Boquerón', R: 'Alto Paraguay' };
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
});

// ── Mapa base y relieve ─────────────────────────────────────────────
document.querySelectorAll('input[name="base"]').forEach(r => r.addEventListener('change', () => {
  map.setLayoutProperty('base-osm', 'visibility', r.value === 'osm' && r.checked ? 'visible' : 'none');
  map.setLayoutProperty('base-satelite', 'visibility', r.value === 'satelite' && r.checked ? 'visible' : 'none');
  map.setLayoutProperty('base-satelite-respaldo', 'visibility', r.value === 'satelite' && r.checked ? 'visible' : 'none');
}));
$('v3-terreno').addEventListener('change', aplicarTerreno);
$('v3-hipso').addEventListener('change', e => { map.setLayoutProperty('hipsometria', 'visibility', e.target.checked ? 'visible' : 'none'); $('v3-hipso-ley').hidden = !e.target.checked; });
$('v3-sombra').addEventListener('change', e => map.setLayoutProperty('sombra', 'visibility', e.target.checked ? 'visible' : 'none'));
$('v3-exag').addEventListener('input', () => { $('v3-exag-o').textContent = `${String(exag()).replace('.', ',')}×`; aplicarTerreno(); });
$('v3-piso').addEventListener('input', e => {
  const h = Number(e.target.value);
  $('v3-piso-o').textContent = `${String(h).replace('.', ',')} m`;
  map.setPaintProperty('edificios', 'fill-extrusion-height', altura(h));
});
function actualizarCota() {
  const c = map.getCenter(), h = map.queryTerrainElevation?.(c);
  $('v3-cota').textContent = h != null && $('v3-terreno').checked ? `Cota del centro: ${num(Math.round(h / exag()))} m s. n. m.` : 'Cota del centro: active el relieve';
}

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
const CAPAS = { edificios: ['edificios'], parcelas: ['parcelas'], limite: ['limite'], cascos: ['cascos', 'cascos-borde'], barrios: ['barrios', 'barrios-borde'], pout: ['pout-rural', 'pout-urbana', 'pout-suburbana'] };
const cargadas = {};
document.querySelectorAll('input[data-capa]').forEach(ch => ch.addEventListener('change', async () => {
  const k = ch.dataset.capa;
  CAPAS[k].forEach(id => map.setLayoutProperty(id, 'visibility', ch.checked ? 'visible' : 'none'));
  if (ch.checked && (k === 'cascos' || k === 'barrios') && !cargadas[k]) {
    estado(`Cargando ${k === 'cascos' ? 'cascos urbanos' : 'barrios (18 MB, la primera vez tarda)'}…`);
    try {
      const r = await fetch(k === 'cascos' ? '/data/casco_urbano_snc.geojson' : '/data/barrios_py_light.geojson');
      map.getSource(k).setData(await r.json()); cargadas[k] = true; estado('');
    } catch { estado('No se pudo cargar la capa.'); }
  }
  if (ch.checked && (k === 'edificios' || k === 'parcelas')) { if (map.getZoom() < 16) acercar(map.getCenter()); else cargarVista(); }
  if (ch.checked && k === 'pout') {
    estado('Cargando capas POUT de Filadelfia…');
    try {
      const [rural, urbana, suburbana] = await Promise.all([
        fetch('/data/pout_filadelfia/zona_rural.geojson').then(r => r.json()),
        fetch('/data/pout_filadelfia/zona_urbana.geojson').then(r => r.json()),
        fetch('/data/pout_filadelfia/zona_suburbana.geojson').then(r => r.json())
      ]);
      map.getSource('pout-rural').setData(rural);
      map.getSource('pout-urbana').setData(urbana);
      map.getSource('pout-suburbana').setData(suburbana);
      cargadas.pout = true;
      estado('Capas POUT Filadelfia cargadas.');
    } catch { estado('No se pudo cargar las capas POUT.'); }
  }
}));

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
map.on('moveend', () => { clearTimeout(t); t = setTimeout(() => { cargarVista(); actualizarCota(); }, 350); });

// ── Selector de distrito ───────────────────────────────────────────
fetch('/api/v3/visor3d/distritos').then(r => r.json()).then(({ distritos }) => {
  const grupos = {};
  distritos.forEach(d => (grupos[d.dpto] ||= []).push(d));
  $('v3-distrito').insertAdjacentHTML('beforeend', Object.keys(grupos).sort().map(k => `<optgroup label="${esc(DPTO[k] || k)}">${grupos[k].map(d =>
    `<option value="${d.dpto}|${d.dist}">${esc(d.nombre.charAt(0) + d.nombre.slice(1).toLowerCase())}</option>`).join('')}</optgroup>`).join(''));
}).catch(() => {});
$('v3-distrito').addEventListener('change', async e => {
  const [dpto, dist] = e.target.value.split('|');
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

// ── Panel y teclado ─────────────────────────────────────────────────
$('v3-plegar').addEventListener('click', e => { const c = $('v3-cuerpo'); c.hidden = !c.hidden; e.target.textContent = c.hidden ? '+' : '−'; e.target.setAttribute('aria-expanded', String(!c.hidden)); });
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'r' || e.key === 'R') map.flyTo({ ...INICIO, duration: 1500 });
  if (e.key === 'f' || e.key === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
});
