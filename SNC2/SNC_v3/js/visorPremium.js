/**
 * Paquete "Visor catastral Premium" (completo) para todas las páginas con mapa de SNC v3.
 * Reúne las herramientas de visualización catastral de lo descargado del SNC y la DNIT:
 *   - Parcelas oficiales con la Cta. Cte. en el centro y ficha con la liquidación DNIT (js/catastroOficialUI.js)
 *   - Buscador de terrenos (finca, clave, D-12-19-58-5, 27-2815-18, 272815-18)
 *   - Parcelario SNC de todo el país (WMS), límites de distritos y departamentos, cascos urbanos SNC
 *   - GPS con las parcelas del radio coloreadas por edificación (js/ciudadanoMovil.js)
 *   - Enlace al análisis territorial del distrito que se está mirando
 * Se activa con: <link rel="stylesheet" href="/css/visor-premium.css"> y <script type="module" src="/js/visorPremium.js"></script>
 * Navegador puro (ESM). Los estilos van en clases (la CSP no admite atributos style).
 */
const WMS = 'https://www.catastro.gov.py/geoserver/ows';
const ATRIB = 'Catastro nacional © Servicio Nacional de Catastro (catastro.gov.py)';

// Espera sin límite: hay páginas (administración) que crean el mapa recién al abrir su pestaña.
function esperarMapa() {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => {
      const m = window.MapEngine?.getMap?.() || window.SNCMapa;
      if (m && window.L) return resolve(m);
      setTimeout(tick, performance.now() - t0 < 20000 ? 200 : 1000);
    };
    tick();
  });
}

/** Barra de herramientas del mapa: usa #map-tools si la página la tiene; si no, crea una flotante. */
function barraHerramientas(map) {
  let barra = document.getElementById('map-tools');
  if (!barra) {
    barra = document.createElement('div');
    barra.id = 'map-tools';
    barra.className = 'vp-barra';
    map.getContainer().appendChild(barra);
    window.L.DomEvent.disableClickPropagation(barra);
  }
  return barra;
}

/**
 * Ajusta un polígono (coordenadas en metros) para que el lado k mida `largo` y el área sea `area`:
 * 1) estira a lo largo de la dirección del lado k (desde su primer vértice) hasta el largo pedido;
 * 2) estira perpendicular al lado k (desde la recta del lado) hasta el área pedida. El lado k no cambia en el paso 2.
 */
export function ajustarPoligono(pts, k, { largo = null, area = null } = {}) {
  const n = pts.length, a = pts[k], b = pts[(k + 1) % n];
  const lk = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (!(lk > 0)) return pts;
  const u = [(b[0] - a[0]) / lk, (b[1] - a[1]) / lk], v = [-u[1], u[0]];
  const loc = p => [(p[0] - a[0]) * u[0] + (p[1] - a[1]) * u[1], (p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1]];
  const glob = ([s, t]) => [a[0] + s * u[0] + t * v[0], a[1] + s * u[1] + t * v[1]];
  let q = pts.map(loc);
  if (largo > 0) q = q.map(([s, t]) => [s * largo / lk, t]);
  if (area > 0) {
    let A = 0; for (let i = 0, j = n - 1; i < n; j = i++) A += (q[j][0] + q[i][0]) * (q[j][1] - q[i][1]);
    A = Math.abs(A / 2);
    if (A > 0) q = q.map(([s, t]) => [s, t * area / A]);
  }
  return q.map(glob);
}

// ─── Mapa base "Mi lienzo": fondo en blanco sin mapa y zoom sin el tope de las teselas ────────────
const ZOOM_LIENZO = 28;
function montarLienzo(map) {
  const L = window.L;
  let activo = false, quitadas = [], zoomPrevio = null, limitesPrevios = null;
  const esBase = l => l instanceof L.TileLayer && !l.wmsParams;   // teselas de mapa base (las capas WMS de datos se quedan)
  const activar = () => {
    if (activo) return true;
    activo = true;
    zoomPrevio = map.getMaxZoom();
    quitadas = [];
    map.eachLayer(l => { if (esBase(l)) quitadas.push(l); });
    quitadas.forEach(l => map.removeLayer(l));
    // Las capas WMS de datos se piden al servidor a cualquier escala: se les quita el tope.
    map.eachLayer(l => { if (l.wmsParams) { l.options.maxZoom = ZOOM_LIENZO; } });
    map.setMaxZoom(ZOOM_LIENZO);
    limitesPrevios = map.options.maxBounds || null; map.setMaxBounds(null);   // en el lienzo se puede desplazar sin límites
    map.getContainer().classList.add('vp-lienzo');
    document.querySelectorAll('[data-layer]').forEach(b => { const on = b.dataset.layer === 'lienzo'; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
    return true;
  };
  const desactivar = () => {
    if (!activo) return;
    activo = false;
    quitadas.forEach(l => { if (!map.hasLayer(l)) l.addTo(map); });
    quitadas = [];
    map.getContainer().classList.remove('vp-lienzo');
    if (limitesPrevios) map.setMaxBounds(limitesPrevios);
    if (zoomPrevio != null) { map.setMaxZoom(zoomPrevio); if (map.getZoom() > zoomPrevio) map.setZoom(zoomPrevio); }
  };
  // Se integra con el menú de mapas base de cada página: "lienzo" lo resuelve este paquete; los demás, el motor de la página.
  for (const motor of [window.MapEngine, window._adminMap, window.AppNotarial]) {
    if (motor && typeof motor.setBaseLayer === 'function' && !motor.setBaseLayer.$lienzo) {
      const original = motor.setBaseLayer.bind(motor);
      motor.setBaseLayer = (name) => { if (name === 'lienzo') return activar(); desactivar(); return original(name); };
      motor.setBaseLayer.$lienzo = true;
    }
  }
  const menu = document.getElementById('map-base-menu');
  if (menu && !menu.querySelector('[data-layer="lienzo"]')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'map-selector-btn'; b.dataset.layer = 'lienzo';
    b.title = 'Mi lienzo: fondo en blanco, zoom sin tope'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.innerHTML = '<i class="fas fa-square" aria-hidden="true"></i><span>Mi lienzo</span>';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const motor = [window.MapEngine, window._adminMap, window.AppNotarial].find(m => typeof m?.setBaseLayer === 'function');
      motor ? motor.setBaseLayer('lienzo') : activar();
      try { localStorage.setItem('snc_basemap_' + (location.pathname.split('/').filter(Boolean).pop() || 'index.html'), 'lienzo'); } catch { /* sin almacenamiento */ }
      document.getElementById('map-base-menu-toggle')?.click();
    });
    menu.appendChild(b);
  }
  try { if (localStorage.getItem('snc_basemap_' + (location.pathname.split('/').filter(Boolean).pop() || 'index.html')) === 'lienzo') setTimeout(activar, 600); } catch { /* sin almacenamiento */ }
  return { activar, desactivar, activo: () => activo };
}

function capaWms(layers, { opacity = 1, styles = '', filtro = null } = {}) {
  const L = window.L;
  return L.tileLayer.wms(WMS, { layers, styles, format: 'image/png', transparent: true, version: '1.1.1', tiled: true, ...(filtro ? { CQL_FILTER: filtro } : {}),
    crs: L.extend({}, L.CRS.EPSG4326, { code: 'CRS:84' }), opacity, maxZoom: 21, attribution: ATRIB, updateWhenIdle: true, keepBuffer: 2 });
}

async function montar() {
  const map = await esperarMapa();
  if (!map) return;
  const L = window.L;
  const barra = barraHerramientas(map);
  // Ámbito del cliente (municipalidad): encuadre, límite marcado, recorrido acotado y filtros en cada capa.
  const { cargarAmbito, parametrosAmbito } = await import('/js/catastroOficialUI.js');
  const amb = await cargarAmbito();
  if (amb) {
    try {
      const lim = await fetch(`/api/v3/parcelario/limite?dpto=${amb.dpto}&dist=${amb.dist}`).then(r => (r.ok ? r.json() : null));
      if (lim?.geometry) {
        const capaLim = L.geoJSON(lim, { style: { color: '#1e3a8a', weight: 4, fill: false, dashArray: '10 6' }, interactive: false }).addTo(map);
        const bb = capaLim.getBounds();
        map.fitBounds(bb, { padding: [20, 20] });
        map.setMaxBounds(bb.pad(0.25));
      }
    } catch { /* sin límite: solo filtros */ }
  }
  const baseLienzo = montarLienzo(map);
  // Herramientas que ya existen como módulos: se cargan una sola vez (el navegador reutiliza el módulo si la página ya lo tenía).
  await import('/js/catastroOficialUI.js');
  const gps = await import('/js/ciudadanoMovil.js');
  if (!document.getElementById('btn-mi-ubicacion')) gps.montarGps(map);

  const capas = {
    parcelario: capaWms('snc:parcelas_activas', { opacity: 0.55, filtro: amb ? `dpto='${amb.dpto}' AND dist=${amb.dist}` : null }),
    limites: capaWms('snc:ly_dpto,snc:ly_dist', { opacity: 0.9 }),
    cascos: null
  };
  const cascos = async () => {
    if (capas.cascos) return capas.cascos;
    const r = await fetch('/data/casco_urbano_snc.geojson');
    if (!r.ok) throw new Error(`Cascos urbanos: ${r.status}`);
    capas.cascos = L.geoJSON(await r.json(), {
      style: { color: '#dc2626', weight: 2, dashArray: '6 4', fillOpacity: 0.04 },
      onEachFeature: (f, l) => {
        const p = f.properties || {};
        const ha = Number(p.superficie_ha ?? p.area_ha ?? (p.area_m2 ? p.area_m2 / 1e4 : NaN));
        l.bindPopup(`<strong>Área urbana · ${String(p.distrito || '').replace(/</g, '&lt;')}</strong><br>${String(p.situacion || 'Norma sin dato').replace(/</g, '&lt;')}${Number.isFinite(ha) ? `<br>${ha.toLocaleString('es-PY', { maximumFractionDigits: 1 })} ha` : ''}`);
      }
    });
    return capas.cascos;
  };

  // ── Botón y panel Premium
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'map-selector-btn vp-boton';
  boton.title = 'Visor catastral Premium';
  boton.setAttribute('aria-label', 'Abrir el visor catastral Premium');
  boton.setAttribute('aria-expanded', 'false');
  boton.innerHTML = '<i class="fas fa-crown" aria-hidden="true"></i><span class="vp-oculto">Premium</span>';
  barra.appendChild(boton);

  const panel = document.createElement('section');
  panel.className = 'vp-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Visor catastral Premium');
  panel.innerHTML = `
    <header><strong><i class="fas fa-crown" aria-hidden="true"></i> Visor catastral Premium</strong><span class="vp-plan">Completo</span>
      ${amb ? `<span class="vp-ambito" title="Toda la cartografía se limita a este municipio">${String(amb.nombre).replace(/</g, '&lt;')}</span>` : ''}
      <button type="button" class="vp-cerrar" aria-label="Cerrar">×</button></header>
    <p class="vp-nota">Datos del Servicio Nacional de Catastro y de la liquidación DNIT 2026.</p>
    <label class="vp-op"><input type="checkbox" data-op="lienzo"> <span><b>Mapa base: Mi lienzo</b> (fondo en blanco, zoom sin tope)</span></label>
    <label class="vp-op"><input type="checkbox" data-op="parcelas"> <span><b>Parcelas oficiales</b> con su Cta. Cte. y ficha DNIT <small>(acerque a zoom 16)</small></span></label>
    <label class="vp-op"><input type="checkbox" data-op="parcelario"> <span><b>Parcelario de todo el país</b> (imagen del SNC, con padrones)</span></label>
    <label class="vp-op"><input type="checkbox" data-op="limites"> <span><b>Límites</b> de departamentos y distritos</span></label>
    <label class="vp-op"><input type="checkbox" data-op="cascos"> <span><b>Cascos urbanos</b> aprobados (ley u ordenanza)</span></label>
    <label class="vp-op"><input type="checkbox" data-op="edificios"> <span><b>Edificios del mapa (OpenStreetMap)</b> vinculados a su parcela y comparados con la liquidación</span></label>
    <div class="vp-leyenda vp-ley-edif"><span class="vp-c no_declarada">No declarada</span><span class="vp-c menor_declarada">Liquida menos</span><span class="vp-c mayor_declarada">Liquida más</span><span class="vp-c coincide">Coincide</span><span class="vp-c pendiente">Asignar a mano</span><span class="vp-c sin_parcela">Sin parcela (fuera del catastro)</span><span class="vp-c otro">En parcela, sin diferencia calculada</span></div>
    <label class="vp-op"><input type="checkbox" data-op="dibujar"> <span><b>Dibujar construcción</b>: área, lados, m² de techo y área cubierta, m² a completar</span></label>
    <label class="vp-op"><input type="checkbox" data-op="gps"> <span><b>Mi ubicación</b> y parcelas del radio GPS por edificación</span></label>
    <div class="vp-leyenda"><span class="vp-e si">Con edificación</span><span class="vp-e no">Sin edificación</span><span class="vp-e nd">Sin dato</span></div>
    <p class="vp-ayuda">Buscador del mapa: finca, Cta. Cte. o terreno, por ejemplo <code>27-2815-18</code> o <code>L-7-27-2815-18</code>.</p>
    <a class="vp-analisis" href="/analisis-territorial.html" target="_blank" rel="noopener"><i class="fas fa-chart-column" aria-hidden="true"></i> Análisis territorial de este lugar</a>`;
  map.getContainer().appendChild(panel);
  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);
  const abrir = (v) => { panel.hidden = !v; boton.classList.toggle('vp-activo', v); boton.setAttribute('aria-expanded', String(v)); };
  boton.addEventListener('click', () => abrir(panel.hidden));
  panel.querySelector('.vp-cerrar').addEventListener('click', () => abrir(false));

  const avisar = (t) => { const n = panel.querySelector('.vp-nota'); n.textContent = t; };
  // ── Edificios de OpenStreetMap frente a la liquidación DNIT
  const COLOR_COMP = { no_declarada: '#dc2626', menor_declarada: '#f97316', mayor_declarada: '#7c3aed', coincide: '#16a34a', sin_edificacion: '#64748b' };
  const estiloEdif = p => p.estado === 'sin_parcela'
    ? { color: '#0891b2', weight: 2, fillColor: '#22d3ee', fillOpacity: 0.45 }
    : p.estado === 'pendiente'
    ? { color: '#db2777', weight: 2, dashArray: '4 3', fillColor: '#db2777', fillOpacity: 0.15 }
    : { color: COLOR_COMP[p.comparacion] || '#334155', weight: 1.5, fillColor: COLOR_COMP[p.comparacion] || '#334155', fillOpacity: 0.45 };
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const m2 = v => (v == null ? '—' : `${Number(v).toLocaleString('es-PY', { maximumFractionDigits: 1 })} m²`);
  const fichaEdif = (p) => `<div class="vp-edif"><strong>Edificio ${esc(p.osm_id)}</strong>
    <dl><dt>m² de techo (mapa)</dt><dd>${m2(p.m2)}</dd><dt>Área cubierta (estimada)</dt><dd>${m2(p.m2_cubierta)}</dd><dt>Niveles</dt><dd>${p.niveles}${p.niveles_informados ? '' : ' (supuesto)'}</dd>
    <dt>Estado</dt><dd>${p.estado === 'sin_parcela' ? 'Fuera de toda parcela del catastro' : p.estado === 'pendiente' ? 'Pendiente: está en varias parcelas' : p.estado === 'manual' ? `Asignado a mano${p.asignado_por ? ` por ${esc(p.asignado_por)}` : ''}` : 'Asignado automáticamente'}</dd>
    ${p.parcela_ctacte ? `<dt>Parcela</dt><dd>${esc(p.parcela_ctacte)}</dd><dt>Construido (mapa)</dt><dd>${m2(p.parcela_construido_osm_m2)}</dd><dt>Edificado (DNIT)</dt><dd>${m2(p.parcela_edificado_dnit_m2)}</dd>${p.parcela_m2_a_completar > 0 ? `<dt>m² a completar</dt><dd class="vp-falta">${m2(p.parcela_m2_a_completar)}</dd>` : ''}` : ''}</dl>
    ${p.comparacion_texto ? `<p class="vp-comp vp-${esc(p.comparacion)}">${esc(p.comparacion_texto)}</p>` : ''}
    ${(p.candidatas || []).length > 1 || (p.estado === 'pendiente' && (p.candidatas || []).length) ? `<p class="vp-nota">${p.estado === 'pendiente' ? 'Elija la parcela a la que pertenece:' : 'Reasignar a:'}</p>${p.candidatas.map(c => `<button type="button" class="vp-cand" data-id="${c.id_parcela}">${esc(c.ctacte)} · ${c.pct} %</button>`).join('')}` : ''}
    <small>Edificios © colaboradores de OpenStreetMap (ODbL)</small></div>`;

  // Capa de edificios que sigue al mapa: carga el distrito del centro y dibuja solo lo visible (zoom 15+), en canvas.
  const ZOOM_EDIF = 15;
  const lienzo = L.canvas({ padding: 0.3 });
  const capaEdif = L.featureGroup();
  const cacheEdif = new Map();          // "D|12" → FeatureCollection completa del distrito
  let distritoEdif = null, edifActivo = false;
  const dibujar = (f) => {
    const l = L.geoJSON(f, { style: () => estiloEdif(f.properties), renderer: lienzo });
    l.eachLayer(capa => {
      capa.feature = f;
      capa.bindPopup(() => fichaEdif(f.properties), { maxWidth: 300 });
      capa.on('popupopen', (e) => {
        const [dp, ds] = f.properties.dpto ? [f.properties.dpto, f.properties.dist] : distritoEdif.split('|');
        e.popup.getElement()?.querySelectorAll('.vp-cand').forEach(b => b.addEventListener('click', async () => {
          const token = localStorage.getItem('snc_api_token') || localStorage.getItem('snc_token');
          if (!token) { b.textContent = 'Inicie sesión para asignar'; return; }
          b.disabled = true;
          try {
            const resp = await fetch('/api/v3/edificios/asignar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ dpto: dp, dist: Number(ds), osm_id: f.properties.osm_id, id_parcela: Number(b.dataset.id) }) });
            const d = await resp.json();
            if (!resp.ok) throw new Error(d.error || `Error ${resp.status}`);
            Object.assign(f.properties, d.edificio);
            if (d.parcela) Object.assign(f.properties, { comparacion: d.parcela.estado, comparacion_texto: d.parcela.etiqueta, parcela_ctacte: d.parcela.ctacte,
              parcela_construido_osm_m2: d.parcela.construido_osm_m2, parcela_edificado_dnit_m2: d.parcela.edificado_dnit_m2 });
            capa.setStyle(estiloEdif(f.properties)); capa.setPopupContent(fichaEdif(f.properties));
          } catch (err) { b.disabled = false; b.textContent = err.message; }
        }));
      });
    });
    return l;
  };
  // Edificios por vista: el servidor tiene el distrito en memoria y entrega solo lo visible (rápido en cualquier distrito).
  let pedidoEdif = 0;
  const resumenTexto = (d) => { const r = d.porEstado || {}; return `${d.total.toLocaleString('es-PY')} edificios en el distrito · ${d.pendientes} para asignar a mano · parcelas: ${r.no_declarada || 0} con construcción no declarada, ${r.menor_declarada || 0} liquidan menos, ${r.mayor_declarada || 0} liquidan más, ${r.sin_huella || 0} sin huella, ${r.coincide || 0} coinciden.`; };
  const cargarEdificios = async () => {
    if (map.getZoom() < ZOOM_EDIF) { capaEdif.clearLayers(); avisar(`Acerque el mapa (zoom ${ZOOM_EDIF} o más) para ver los edificios.`); return capaEdif; }
    const b = map.getBounds().pad(0.15), n = ++pedidoEdif;
    const q = new URLSearchParams({ minX: b.getWest().toFixed(6), minY: b.getSouth().toFixed(6), maxX: b.getEast().toFixed(6), maxY: b.getNorth().toFixed(6) });
    const r = await fetch(`/api/v3/edificios/vista?${q}${parametrosAmbito()}`);
    const fc = await r.json();
    if (n !== pedidoEdif) return capaEdif;   // llegó tarde
    if (!r.ok) { avisar(fc.error || `Error ${r.status}`); return capaEdif; }
    capaEdif.clearLayers();
    for (const f of fc.features) capaEdif.addLayer(dibujar(f));
    const c = map.getCenter(), d0 = fc.distritos?.[0];
    distritoEdif = d0?.distrito || distritoEdif;
    avisar(d0 ? resumenTexto(d0) : 'Esta zona todavía no tiene los edificios procesados.');
    void c;
    return capaEdif;
  };
  map.on('moveend', () => { if (!edifActivo) return; clearTimeout(cargarEdificios._t); cargarEdificios._t = setTimeout(() => cargarEdificios().catch(e => avisar(e.message)), 150); });


  // ── Dibujar una construcción: área, perímetro y largo de cada lado; techo frente a área cubierta; m² a completar.
  const UTM21S = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
  const aMetros = (ll) => (window.proj4 ? window.proj4('EPSG:4326', UTM21S, [ll.lng, ll.lat]) : (() => { const o = map.options.crs.project(ll); return [o.x, o.y]; })());
  const capaDibujo = L.featureGroup().addTo(map);
  let dibujando = false, vertices = [], medida = null;
  const panelDib = document.createElement('div');
  panelDib.className = 'vp-dibujo';
  panelDib.hidden = true;
  panelDib.innerHTML = `
    <p class="vp-nota" data-d="ayuda">Toque el mapa para marcar los vértices. Doble clic o «Terminar» para cerrar.</p>
    <div class="vp-fila"><button type="button" data-d="terminar">Terminar</button><button type="button" data-d="deshacer">Deshacer vértice</button><button type="button" data-d="borrar">Borrar</button></div>
    <div class="vp-fila"><label>Lo dibujado es <select data-d="trazo"><option value="techo">Techo (como se ve en la imagen)</option><option value="cubierta">Área cubierta (entre paredes)</option></select></label></div>
    <div class="vp-fila"><label>Alero (m) <input data-d="alero" type="number" min="0" max="3" step="0.05" value="0.6"></label><label>Pisos <input data-d="niveles" type="number" min="1" max="60" step="1" value="1"></label></div>
    <div class="vp-ajuste">
      <p class="vp-nota">Ajustar por medidas: cargue los m² y un lado; lo demás se acomoda. Sin dibujo, crea un rectángulo (frente × fondo).</p>
      <div class="vp-fila"><label>Lado <select data-d="lado"><option value="0">1</option></select></label><label>Largo (m) <input data-d="largo" type="number" min="0" step="0.01" placeholder="frente"></label></div>
      <div class="vp-fila"><label>Área (m²) <input data-d="areaObj" type="number" min="0" step="0.01"></label><button type="button" data-d="ajustar">Aplicar</button></div>
    </div>
    <div class="vp-pisos" data-d="pisos" hidden></div>
    <dl class="vp-medidas" data-d="medidas"></dl>
    <div class="vp-fila"><button type="button" data-d="guardar" class="vp-primario" disabled>Guardar relevamiento</button><a data-d="csv" href="#" target="_blank" rel="noopener">Tabla (CSV)</a></div>`;
  panel.querySelector('.vp-op input[data-op="dibujar"]')?.closest('.vp-op')?.after(panelDib);
  const d = k => panelDib.querySelector(`[data-d="${k}"]`);
  const r1 = v => (v == null ? '—' : Number(v).toLocaleString('es-PY', { maximumFractionDigits: 1 }));
  // Durante el arrastre solo se mueve la forma (rápido); al soltar se recalculan medidas y parcela.
  const redibujarForma = () => { capaDibujo.eachLayer(l => { if (l instanceof L.Polygon) l.setLatLngs(vertices); else if (l instanceof L.Polyline) l.setLatLngs(vertices.concat(vertices.length > 2 && !dibujando ? [vertices[0]] : [])); }); };
  const calcular = () => {
    capaDibujo.clearLayers();
    if (vertices.length) L.polyline(vertices.concat(vertices.length > 2 && !dibujando ? [vertices[0]] : []), { color: '#fbbf24', weight: 3 }).addTo(capaDibujo);
    // Vértices arrastrables (una vez cerrado el polígono): se mueve el punto y se recalcula todo.
    vertices.forEach((v, k) => {
      const mk = L.marker(v, { draggable: !dibujando, keyboard: false, icon: L.divIcon({ className: 'vp-vertice', iconSize: [12, 12] }) }).addTo(capaDibujo);
      mk.on('drag', e => { vertices[k] = e.target.getLatLng(); redibujarForma(); });
      mk.on('dragend', () => { if (medida) medida.parcela = null; calcular(); buscarParcela(); });
    });
    if (vertices.length < 2) { d('medidas').innerHTML = ''; d('guardar').disabled = true; return; }
    const pts = vertices.map(aMetros), cerrado = vertices.length > 2;
    const lados = [];
    for (let i = 0; i < (cerrado ? pts.length : pts.length - 1); i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      lados.push(l);
      const va = vertices[i], vb = vertices[(i + 1) % vertices.length];
      L.marker([(va.lat + vb.lat) / 2, (va.lng + vb.lng) / 2], { interactive: false, icon: L.divIcon({ className: 'vp-lado', html: `<span>${r1(l)} m</span>`, iconSize: [0, 0] }) }).addTo(capaDibujo);
    }
    let area = 0;
    if (cerrado) {
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
      area = Math.abs(area / 2);
      // Arrastrar el polígono entero lo desplaza con todos sus vértices.
      const forma = L.polygon(vertices, { color: '#fbbf24', weight: 2, fillOpacity: 0.2, interactive: !dibujando, className: dibujando ? '' : 'vp-arrastrable' }).addTo(capaDibujo);
      if (!dibujando) forma.on('mousedown touchstart', (e) => {
        L.DomEvent.stop(e); map.dragging.disable();
        const inicio = e.latlng, base = vertices.map(v => L.latLng(v.lat, v.lng));
        const mover = (ev) => { const dl = ev.latlng.lat - inicio.lat, dg = ev.latlng.lng - inicio.lng; vertices = base.map(v => L.latLng(v.lat + dl, v.lng + dg)); redibujarForma(); };
        const soltar = () => { map.off('mousemove', mover); map.off('mouseup', soltar); map.dragging.enable(); if (medida) medida.parcela = null; calcular(); buscarParcela(); };
        map.on('mousemove', mover); map.on('mouseup', soltar);
      });
    }
    const perimetro = lados.reduce((a, b) => a + b, 0);
    const selLado = d('lado');
    if (selLado && selLado.options.length !== Math.max(1, lados.length)) {
      const prev = selLado.value;
      selLado.innerHTML = (lados.length ? lados : [0]).map((l, i) => `<option value="${i}">${i + 1}${l ? ` (${r1(l)} m)` : ''}</option>`).join('');
      if (prev && Number(prev) < lados.length) selLado.value = prev;
    } else if (selLado) [...selLado.options].forEach((o, i) => { o.textContent = `${i + 1} (${r1(lados[i])} m)`; });
    const alero = Math.min(3, Math.max(0, Number(d('alero').value) || 0)), niveles = Math.max(1, Math.round(Number(d('niveles').value) || 1));
    const esTecho = d('trazo').value === 'techo';
    const techo = esTecho ? area : area + perimetro * alero + 4 * alero * alero, cubierta = esTecho ? Math.max(0, area - perimetro * alero + 4 * alero * alero) : area;
    // Edificación en altura: m² de cada piso (planta baja … último), editables; por defecto el área cubierta.
    const caja = d('pisos');
    caja.hidden = !(cerrado && niveles > 1);
    let filasP = [...caja.querySelectorAll('input[data-piso]')];
    if (filasP.length !== niveles) {
      const previos = filasP.map(x => x.value);
      caja.innerHTML = '<p class="vp-nota">m² por piso (edite el último o los que sean distintos):</p>' + Array.from({ length: niveles }, (_, k) =>
        `<label>${k === 0 ? 'Planta baja' : k === niveles - 1 ? `Último (piso ${k + 1})` : `Piso ${k + 1}`} <input type="number" min="0" step="0.1" data-piso="${k}" value="${previos[k] ?? ''}" placeholder="${r1(cubierta)}"></label>`).join('');
      caja.querySelectorAll('input[data-piso]').forEach(x => x.addEventListener('input', calcular));
      filasP = [...caja.querySelectorAll('input[data-piso]')];
    }
    filasP.forEach(x => { x.placeholder = (Math.round(cubierta * 10) / 10).toString(); });
    const pisosM2 = filasP.length ? filasP.map(x => (x.value === '' ? cubierta : Math.max(0, Number(x.value) || 0))) : [cubierta];
    medida = { area, perimetro, lados, techo, cubierta, pisosM2, construido: pisosM2.reduce((a, b) => a + b, 0), alero, niveles, trazo: esTecho ? 'techo' : 'cubierta', parcela: medida?.parcela || null };
    const par = medida.parcela, dec = par?.declarado ?? null, falta = dec == null ? null : Math.max(0, medida.construido - dec);
    d('medidas').innerHTML = `<dt>Área dibujada</dt><dd>${r1(area)} m²</dd><dt>Perímetro</dt><dd>${r1(perimetro)} m</dd>
      <dt>Lados</dt><dd>${lados.map(l => r1(l)).join(' · ')} m</dd>
      <dt>m² de techo</dt><dd>${r1(techo)} m²</dd><dt>Área cubierta</dt><dd>${r1(cubierta)} m²</dd>${niveles > 1 ? `<dt>Por piso</dt><dd>${pisosM2.map(r1).join(' + ')} m²</dd>` : ''}<dt>Total construido${niveles > 1 ? ` (${niveles} pisos)` : ''}</dt><dd>${r1(medida.construido)} m²</dd>
      <dt>Parcela</dt><dd>${par ? par.ctacte : (cerrado && !dibujando ? 'buscando…' : '—')}</dd><dt>Declarado (DNIT)</dt><dd>${dec == null ? '—' : `${r1(dec)} m²`}</dd>
      <dt>m² a completar</dt><dd class="${falta > 0 ? 'vp-falta' : ''}">${falta == null ? '—' : `${r1(falta)} m²`}</dd>`;
    d('guardar').disabled = !(cerrado && !dibujando && area > 0);
  };
  const buscarParcela = async () => {
    if (vertices.length < 3) return;
    const c = L.polygon(vertices).getBounds().getCenter();
    try {
      const f = await window.CatastroOficial?.parcelaEnPunto?.(c.lat, c.lng, { resaltar: false });
      const p = f?.properties;
      if (!p) { medida.parcela = { ctacte: 'sin parcela oficial', declarado: null }; return calcular(); }
      const q = new URLSearchParams(p.zona != null ? { dpto: p.dpto, cod_distrito: p.dist, zona: p.zona, manzana: p.mz, lote: p.lote } : { dpto: p.dpto, cod_distrito: p.dist, padron: p.padron });
      const r = await fetch(`/api/v3/dnit/cuenta?${q}`).then(x => x.json()).catch(() => null);
      const cs = r?.cuentas || [];
      const declarado = cs.length && cs[0].tipo === 'urbano' ? cs.reduce((a, x) => a + (Number(x.superf_edif_total) || 0), 0) : null;
      medida.parcela = { dpto: p.dpto, dist: p.dist, id_parcela: p.id_parcela ?? null, ctacte: cs[0]?.ctacte || (p.zona != null ? `${String(p.zona).padStart(2, '0')}${String(p.mz).padStart(4, '0')}-${String(p.lote).padStart(2, '0')}` : `Padrón ${p.padron}`), declarado };
      d('csv').href = `/api/v3/relevamientos?dpto=${p.dpto}&dist=${p.dist}&formato=csv`;
    } catch { medida.parcela = { ctacte: 'sin conexión con el catastro', declarado: null }; }
    calcular();
  };
  const alClic = (e) => { if (!dibujando) return; vertices.push(e.latlng); calcular(); };
  const terminar = () => { if (!dibujando) return; dibujando = false; map.doubleClickZoom.enable(); map.getContainer().classList.remove('vp-cursor-dibujo'); d('ayuda').textContent = 'Polígono cerrado. Ajuste trazo, alero y pisos; luego guarde.'; calcular(); buscarParcela(); };
  map.on('click', alClic);
  map.on('dblclick', (e) => { if (dibujando) { L.DomEvent.stop(e); terminar(); } });
  const empezar = () => { vertices = []; medida = null; dibujando = true; map.doubleClickZoom.disable(); map.getContainer().classList.add('vp-cursor-dibujo'); d('ayuda').textContent = 'Toque el mapa para marcar los vértices. Doble clic o «Terminar» para cerrar.'; calcular(); };
  const aGrados = (xy) => { const [lng, lat] = window.proj4 ? window.proj4(UTM21S, 'EPSG:4326', xy) : (() => { const ll = map.options.crs.unproject(L.point(xy[0], xy[1])); return [ll.lng, ll.lat]; })(); return L.latLng(lat, lng); };
  d('ajustar').addEventListener('click', () => {
    const largo = Number(d('largo').value) || null, area = Number(d('areaObj').value) || null;
    if (!largo && !area) { d('ayuda').textContent = 'Cargue el área y/o el largo del lado elegido.'; return; }
    if (vertices.length < 3) {
      // Sin dibujo: rectángulo frente × fondo en el centro del mapa (fondo = área / frente).
      if (!(largo && area)) { d('ayuda').textContent = 'Para crear un rectángulo cargue el área y el largo del frente.'; return; }
      const fondo = area / largo, c = aMetros(map.getCenter());
      vertices = [[-largo / 2, -fondo / 2], [largo / 2, -fondo / 2], [largo / 2, fondo / 2], [-largo / 2, fondo / 2]].map(([x, y]) => aGrados([c[0] + x, c[1] + y]));
      dibujando = false; map.doubleClickZoom.enable(); map.getContainer().classList.remove('vp-cursor-dibujo');
      d('ayuda').textContent = `Rectángulo de ${r1(largo)} × ${r1(fondo)} m (${r1(area)} m²). Arrástrelo a su lugar.`;
    } else {
      const k = Math.min(Number(d('lado').value) || 0, vertices.length - 1);
      vertices = ajustarPoligono(vertices.map(aMetros), k, { largo, area }).map(aGrados);
      if (dibujando) { dibujando = false; map.doubleClickZoom.enable(); map.getContainer().classList.remove('vp-cursor-dibujo'); }
      d('ayuda').textContent = `Ajustado: lado ${k + 1}${largo ? ` = ${r1(largo)} m` : ''}${area ? `, área = ${r1(area)} m²` : ''}.`;
    }
    if (medida) medida.parcela = null;
    calcular(); buscarParcela();
  });
  d('terminar').addEventListener('click', terminar);
  d('deshacer').addEventListener('click', () => { vertices.pop(); calcular(); });
  d('borrar').addEventListener('click', () => { capaDibujo.clearLayers(); empezar(); });
  ['trazo', 'alero', 'niveles'].forEach(k => d(k).addEventListener('input', calcular));
  d('guardar').addEventListener('click', async () => {
    const token = localStorage.getItem('snc_api_token') || localStorage.getItem('snc_token');
    if (!token) { d('ayuda').textContent = 'Inicie sesión para guardar el relevamiento.'; return; }
    if (!medida?.parcela?.dpto) { d('ayuda').textContent = 'El dibujo debe estar dentro de una parcela oficial para guardarlo.'; return; }
    d('guardar').disabled = true;
    try {
      const resp = await fetch('/api/v3/relevamientos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dpto: medida.parcela.dpto, dist: medida.parcela.dist, id_parcela: medida.parcela.id_parcela, ctacte: medida.parcela.ctacte, area_m2: medida.area, perimetro_m: medida.perimetro,
          lados_m: medida.lados, trazo: medida.trazo, alero_m: medida.alero, niveles: medida.niveles, pisos_m2: medida.pisosM2, declarado_m2: medida.parcela.declarado,
          geometry: { type: 'Polygon', coordinates: [[...vertices, vertices[0]].map(v => [+v.lng.toFixed(7), +v.lat.toFixed(7)])] } }) });
      const r = await resp.json();
      if (!resp.ok) throw new Error(r.error || `Error ${resp.status}`);
      d('ayuda').textContent = `Guardado: ${r.m2_a_completar ? `${r1(r.m2_a_completar)} m² a completar` : 'sin m² a completar'}.`;
    } catch (err) { d('ayuda').textContent = err.message; d('guardar').disabled = false; }
  });

  // Módulos del plan del cliente (si hay sesión de un cliente): se ocultan las herramientas no habilitadas.
  const MOD_DE = { parcelas: 'parcelas_dnit', edificios: 'edificios', dibujar: 'relevamiento', gps: 'gps_campo', parcelario: 'visor_premium', limites: 'visor_premium', cascos: 'visor_premium', lienzo: 'visor_premium' };
  const mods = window.SNCAcceso?.modulos;
  if (Array.isArray(mods)) {
    panel.querySelectorAll('input[data-op]').forEach(ch => { const m = MOD_DE[ch.dataset.op]; if (m && !mods.includes(m)) { ch.closest('.vp-op').hidden = true; ch.checked = false; } });
    if (!mods.includes('analisis_territorial')) panel.querySelector('.vp-analisis').hidden = true;
    if (window.SNCAcceso.pago?.estado === 'vencido') avisar('Pago vencido: solo están habilitadas las herramientas básicas. Informe el pago en la administración del municipio.');
  }

  // Las capas elegidas se recuerdan en este navegador y se aplican en todas las páginas con mapa.
  const CLAVE = 'snc-visor-premium-capas';
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify([...panel.querySelectorAll('input[data-op]:checked')].map(x => x.dataset.op).filter(x => x !== 'gps' && x !== 'dibujar'))); } catch { /* sin almacenamiento */ } };
  panel.querySelectorAll('input[data-op]').forEach(ch => ch.addEventListener('change', async () => {
    const on = ch.checked, op = ch.dataset.op;
    guardar();
    try {
      if (op === 'parcelas') {
        const b = document.querySelector('.co-boton');
        if (b && b.classList.contains('co-activo') !== on) b.click();
        if (on && map.getZoom() < 16) avisar('Acerque el mapa (zoom 16 o más) para ver las parcelas con su Cta. Cte.');
      } else if (op === 'gps') {
        const b = document.getElementById('btn-mi-ubicacion');
        if (on && b && !b.classList.contains('cm-activo')) b.click();
        if (!on) document.querySelector('#cm-ficha-gps .cm-cerrar')?.click();
      } else if (op === 'lienzo') {
        if (on) baseLienzo.activar(); else { baseLienzo.desactivar(); const b = document.querySelector('[data-layer="osm"]'); if (b) b.click(); }
      } else if (op === 'dibujar') {
        panelDib.hidden = !on;
        if (on) empezar(); else { dibujando = false; map.doubleClickZoom.enable(); map.getContainer().classList.remove('vp-cursor-dibujo'); capaDibujo.clearLayers(); }
      } else if (op === 'edificios') {
        edifActivo = on;
        if (on) { capaEdif.addTo(map); await cargarEdificios(); } else { capaEdif.clearLayers(); capaEdif.remove(); }
      } else if (op === 'cascos') {
        const c = await cascos();
        on ? c.addTo(map) : c.remove();
      } else {
        on ? capas[op].addTo(map) : capas[op].remove();
      }
    } catch (e) { ch.checked = false; avisar(e.message); }
  }));

  try {
    const previas = JSON.parse(localStorage.getItem(CLAVE) || '[]');
    for (const op of previas) { const ch = panel.querySelector(`input[data-op="${op}"]`); if (ch && !ch.checked) { ch.checked = true; ch.dispatchEvent(new Event('change')); } }
  } catch { /* sin almacenamiento */ }

  // Las capas del paquete Premium también figuran en el árbol «Capas» (y por lo tanto en la leyenda del mapa).
  // Solo se registran las que el plan del cliente habilita (las ocultas no aparecen).
  import('/js/layerManager.js').then(({ default: LM }) => {
    if (!LM?.registerLayer) return;
    const ESTILO = { parcelas: { color: '#f59e0b', fillColor: '#f59e0b' }, parcelario: { color: '#fb923c', fillColor: '#fb923c' }, limites: { color: '#111827', fillColor: 'transparent' },
      cascos: { color: '#a855f7', fillColor: '#a855f7' }, edificios: { color: '#ef4444', fillColor: '#22c55e' }, lienzo: { color: '#e5e7eb', fillColor: '#ffffff' }, gps: { color: '#2563eb', fillColor: '#2563eb' }, dibujar: { color: '#0ea5e9', fillColor: '#0ea5e9' } };
    const GEOM = { parcelas: 'Polygon', parcelario: 'Polygon', limites: 'LineString', cascos: 'Polygon', edificios: 'Polygon', lienzo: 'Polygon', gps: 'Point', dibujar: 'Polygon' };
    LM.registerGroup({ id: 'g_premium', title: 'Visor Premium (SNC · DNIT · OSM)' });
    const nodos = [...panel.querySelectorAll('input[data-op]')].filter(ch => !ch.closest('.vp-op')?.hidden);
    let sincronizando = false;
    for (const ch of nodos) {
      const op = ch.dataset.op, titulo = ch.closest('label')?.textContent.trim().replace(/\s+/g, ' ') || op;
      const n = LM.registerLayer({ id: 'vp-' + op, title: titulo, parentId: 'g_premium', visible: ch.checked, sourceType: 'servicio',
        server: op === 'edificios' ? 'OpenStreetMap' : 'SNC', theme: 'Catastral', sourcePath: op === 'edificios' ? 'Edificios OSM vinculados a parcelas' : 'Servicio SNC / DNIT', style: ESTILO[op], geometryType: GEOM[op] });
      n.visible = ch.checked;
      ch.addEventListener('change', () => { if (sincronizando) return; sincronizando = true; LM.setVisible('vp-' + op, ch.checked); sincronizando = false; });
    }
    const aplicar = id => {
      const ch = panel.querySelector(`input[data-op="${id.slice(3)}"]`), n = LM.nodes?.get?.(id);
      if (!ch || !n || ch.checked === !!n.visible) return;
      sincronizando = true; ch.checked = !!n.visible; ch.dispatchEvent(new Event('change')); sincronizando = false;
    };
    window.dispatchEvent(new CustomEvent('snc:layers-changed'));
    LM.on('visibility', ({ id }) => {
      if (sincronizando || !id) return;
      if (id === 'g_premium') nodos.forEach(ch => aplicar('vp-' + ch.dataset.op));
      else if (id.startsWith('vp-')) aplicar(id);
    });
  }).catch(() => { /* página sin árbol de capas */ });

  // Enlace al análisis del distrito que se está mirando (parcela oficial en el centro del mapa).
  const enlace = panel.querySelector('.vp-analisis');
  const actualizarEnlace = async () => {
    if (panel.hidden || map.getZoom() < 12 || !window.CatastroOficial?.parcelaEnPunto) return;
    try {
      const c = map.getCenter();
      const f = await window.CatastroOficial.parcelaEnPunto(c.lat, c.lng, { resaltar: false });
      const p = f?.properties;
      if (p?.dpto && p.dist != null) {
        const r = await fetch('/data/snc_estadisticas/superficies_distritos.json').then(x => (x.ok ? x.json() : null)).catch(() => null);
        const nombre = r?.distritos?.[`${p.dpto}|${Number(p.dist)}`]?.nombre;
        if (nombre) { enlace.href = `/analisis-territorial.html#${encodeURIComponent(nombre.toLowerCase())}`; enlace.lastChild.textContent = ` Análisis territorial de ${nombre.charAt(0)}${nombre.slice(1).toLowerCase()}`; }
      }
    } catch { /* sin conexión con el catastro: el enlace abre la vista del país */ }
  };
  boton.addEventListener('click', actualizarEnlace);
  map.on('moveend', () => { clearTimeout(actualizarEnlace._t); actualizarEnlace._t = setTimeout(actualizarEnlace, 800); });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar, { once: true });
  else montar();
}
