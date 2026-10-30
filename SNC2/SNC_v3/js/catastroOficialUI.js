/**
 * Catastro oficial y búsqueda de direcciones en el mapa (PM-35, PM-38 — docs/PLAN_MEJORA_PRODUCTO_2026-10-27.md).
 *
 * - Buscador sobre el mapa: dirección o lugar (Nominatim/Photon vía /api/v3/geocodificar) o parcela oficial
 *   por finca, clave compuesta (A|5|#|14|885|20|#|#), dpto-dist-zona-mz-lote (D-12-19-58-5) o Cta. Cte.
 * - Botón "Parcelas oficiales": dibuja las parcelas del catastro nacional en la vista (zoom 16 o más).
 * - window.CatastroOficial.parcelaEnPunto(lat, lng): la parcela oficial que contiene un punto (lo usa el GPS).
 *
 * Navegador puro (ESM), sin módulos de Node (AGENTS.md §1).
 */

export const ZOOM_MINIMO = 16;

/** ¿El texto parece una referencia catastral (y no una dirección)? Debe coincidir con oficialCatastro.js. */
export function esConsultaCatastral(texto) {
  const t = String(texto || '').trim();
  return /^finca\s*(?:n[°º.]?\s*)?\d{1,9}/i.test(t)
    || /^[A-Za-z]\|/.test(t)
    || /^[A-Za-z][-\s/]\d{1,4}[-\s/]\d{1,4}[-\s/]\d{1,5}[-\s/]\d{1,5}$/.test(t)
    || /^\d{1,4}\s*[-/.\s]\s*\d{1,5}\s*[-/.\s]\s*\d{1,5}$/.test(t)          // zona-manzana-lote: 27-2815-18
    || /^\d{6}\s*-\s*\d{1,3}(?:\s*\/\s*\d{1,2}\s*-\s*\d{1,3})?$/.test(t)       // Cta. Cte. urbana: 272815-18
    || /^(?:cta\.?\s*cte\.?|ccc|cuenta)\s*[:#]?\s*[0-9A-Za-z.\-/]{3,30}$/i.test(t);
}

/** Texto corto de una parcela oficial. */
export function resumenParcela(p) {
  if (!p) return 'Sin parcela oficial en este punto';
  const partes = [];
  // Departamento y distrito primero: la misma zona/manzana/lote se repite en distintos distritos.
  if (p.dpto && p.dist != null) partes.push(`Dpto. ${p.dpto} · Distrito ${p.dist}`);
  if (p.ccatastral) partes.push(`Cta. Cte. ${p.ccatastral}`);
  if (p.finca) partes.push(`Finca ${p.finca}`);
  if (p.zona !== null && p.zona !== undefined) partes.push(`Zona ${p.zona}`);
  if (p.mz !== null && p.mz !== undefined) partes.push(`Mz ${p.mz}`);
  if (p.lote !== null && p.lote !== undefined) partes.push(`Lote ${p.lote}`);
  const sup = Number.isFinite(p.superficie_m2) ? ` (${p.superficie_m2.toLocaleString('es-PY')} m²)` : '';
  return (partes.join(' · ') || 'Parcela sin identificación') + sup;
}

const FILAS = [['ccatastral', 'Cta. Cte. catastral'], ['finca', 'Finca'], ['dpto', 'Dpto.'], ['dist', 'Distrito'],
  ['zona', 'Zona'], ['mz', 'Manzana'], ['lote', 'Lote'], ['padron', 'Padrón'], ['nro_matricula', 'Matrícula'],
  ['superficie_m2', 'Superficie (m²)'], ['clave_comparacion', 'Clave']];

export function filasFicha(p = {}) {
  return FILAS.map(([k, et]) => [et, p[k] === null || p[k] === undefined || p[k] === '' ? (k === 'ccatastral' ? 'no informada' : '—') : String(p[k])]);
}

/**
 * Consulta a la liquidación DNIT que corresponde a una parcela oficial (o null si no hay clave):
 * urbana por departamento + distrito + zona + manzana + lote; rural por departamento + distrito + padrón.
 */
export function consultaDnit(p = {}) {
  const dpto = String(p.dpto || '').toUpperCase(), dist = Number(p.dist);
  if (!/^[A-Z]$/.test(dpto) || !Number.isInteger(dist)) return null;
  const n = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  if (n(p.zona) && n(p.mz) && n(p.lote)) return new URLSearchParams({ dpto, cod_distrito: dist, zona: Number(p.zona), manzana: Number(p.mz), lote: Number(p.lote) }).toString();
  if (n(p.padron)) return new URLSearchParams({ dpto, cod_distrito: dist, padron: Number(p.padron) }).toString();
  return null;
}

/** Filas de la ficha DNIT (una o varias cuentas: un lote en propiedad horizontal tiene varias). */
export function filasDnit(r) {
  const cs = r?.cuentas || [];
  if (!cs.length) return null;
  const f = v => (v === null || v === undefined || v === '' ? '—' : Number.isFinite(Number(v)) ? Number(v).toLocaleString('es-PY') : String(v));
  const suma = k => cs.reduce((a, c) => a + (Number(c[k]) || 0), 0);
  const c0 = cs[0];
  const filas = [[cs[0].tipo === 'rural' ? 'Padrón' : 'Cta. Cte.', cs.length > 1 ? `${c0.ctacte ?? c0.padron} y ${cs.length - 1} más` : String(c0.ctacte ?? c0.padron)]];
  if (c0.tipo === 'rural') filas.push(['Superficie', `${f(c0.hectareas)} ha ${f(c0.metros2)} m²`]);
  else filas.push(['Terreno', `${f(c0.superf_tierra_total)} m²`], ['Edificado', `${f(suma('superf_edif_total'))} m²`]);
  filas.push(['Valor fiscal', `Gs ${f(suma('valor_oficial'))}`], ['Impuesto 2026', `Gs ${f(suma('impuesto_total'))}`]);
  return filas;
}

/**
 * Ámbito del cliente: si la sesión es de una municipalidad (?muni=villa_hayes, recordado en el navegador),
 * toda la cartografía se limita a su distrito. window.SNCAmbito = { id, nombre, dpto, dist }.
 */
export function parametrosAmbito() {
  const a = typeof window !== 'undefined' ? window.SNCAmbito : null;
  return a?.dpto ? `&dpto=${encodeURIComponent(a.dpto)}&dist=${encodeURIComponent(a.dist)}` : '';
}
export async function cargarAmbito() {
  if (typeof window === 'undefined') return null;
  if (window.SNCAmbito !== undefined) return window.SNCAmbito;
  let id = null;
  try {
    const u = new URLSearchParams(location.search).get('muni');
    if (u === 'ninguno' || u === 'pais') localStorage.removeItem('snc_muni');
    else if (u && /^[a-z0-9_-]+$/i.test(u)) localStorage.setItem('snc_muni', u.toLowerCase());
    id = localStorage.getItem('snc_muni');
  } catch { /* sin almacenamiento */ }
  // Páginas que siempre trabajan sobre un municipio (portal municipal) definen uno por defecto.
  if (!id && window.SNCMuniPorDefecto) id = window.SNCMuniPorDefecto;
  window.SNCAmbito = null;
  // Usuario de un cliente (sesión iniciada): su municipio y sus módulos mandan sobre la dirección (plataformaServicio.js).
  try {
    const t = localStorage.getItem('snc_api_token') || localStorage.getItem('snc_token');
    if (t) {
      const r = await fetch('/api/v3/mi-acceso', { headers: { Authorization: `Bearer ${t}` } });
      const a = r.ok ? await r.json() : null;
      if (a?.cliente) {
        window.SNCAcceso = a;
        if (a.cliente.cod_dpto && a.cliente.cod_distrito != null) {
          window.SNCAmbito = { id: a.cliente.muni_id || a.cliente.id, nombre: a.cliente.nombre, dpto: a.cliente.cod_dpto, dist: Number(a.cliente.cod_distrito), fijo: true };
          return window.SNCAmbito;
        }
      }
    }
  } catch { /* sin sesión o sin conexión: se sigue con la elección de la dirección */ }
  if (!id) return null;
  try {
    const r = await fetch(`/api/municipal/${encodeURIComponent(id)}/info`);
    const i = r.ok ? await r.json() : null;
    if (i?.cod_dpto && i.cod_distrito != null) window.SNCAmbito = { id, nombre: i.nombre, dpto: String(i.cod_dpto).toUpperCase(), dist: Number(i.cod_distrito) };
  } catch { /* sin conexión: sin ámbito */ }
  return window.SNCAmbito;
}

/** Texto del rótulo: Cta. Cte. urbana (ZZMMMM-LL, como en la liquidación) o padrón rural. */
export function etiquetaCtaCte(p = {}) {
  const n = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  if (n(p.zona) && n(p.mz) && n(p.lote)) {
    return `${String(Number(p.zona)).padStart(2, '0')}${String(Number(p.mz)).padStart(4, '0')}-${String(Number(p.lote)).padStart(2, '0')}`;
  }
  if (n(p.padron)) return `Padrón ${Number(p.padron)}`;
  return p.ccatastral ? String(p.ccatastral) : '';
}

/** ¿El punto está dentro del anillo? (ray casting) */
export function dentroDe([x, y], anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i], [xj, yj] = anillo[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * Ubicación y giro del rótulo en un anillo en coordenadas de pantalla (px):
 * centroide del área (o, si cae afuera, el centro del tramo interior más largo de la línea media),
 * ángulo del eje largo (análisis de componentes principales), largo y ancho del terreno a lo largo de ese eje.
 */
export function ubicacionRotulo(anillo) {
  const pts = anillo.length > 1 && anillo[0][0] === anillo[anillo.length - 1][0] && anillo[0][1] === anillo[anillo.length - 1][1] ? anillo.slice(0, -1) : anillo;
  if (pts.length < 3) return null;
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length], k = x1 * y2 - x2 * y1;
    a += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k;
  }
  if (Math.abs(a) < 1e-9) return null;
  let c = [cx / (3 * a), cy / (3 * a)];
  // Eje largo por componentes principales de los vértices.
  const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  let ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const proy = (p, e) => p[0] * e[0] + p[1] * e[1];
  if (!dentroDe(c, pts)) {
    // Centroide afuera (parcela en L o en U): punto medio del tramo interior más largo sobre la línea por el centro, a lo largo del eje.
    const pv = proy(c, v), cortes = [];
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i + 1) % pts.length], d1 = proy(p1, v) - pv, d2 = proy(p2, v) - pv;
      if ((d1 > 0) !== (d2 > 0)) { const t = d1 / (d1 - d2); cortes.push(proy([p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])], u)); }
    }
    cortes.sort((x, y) => x - y);
    let mejor = null;
    for (let i = 0; i + 1 < cortes.length; i += 2) if (!mejor || cortes[i + 1] - cortes[i] > mejor[1] - mejor[0]) mejor = [cortes[i], cortes[i + 1]];
    if (mejor) { const t = (mejor[0] + mejor[1]) / 2; c = [u[0] * t + v[0] * pv, u[1] * t + v[1] * pv]; }
  }
  const pu = pts.map(p => proy(p, u)), pw = pts.map(p => proy(p, v));
  const largo = Math.max(...pu) - Math.min(...pu), ancho = Math.max(...pw) - Math.min(...pw);
  let grados = ang * 180 / Math.PI;
  if (grados > 90) grados -= 180; if (grados < -90) grados += 180;   // nunca cabeza abajo
  return { centro: c, grados, largo, ancho };
}

// ─── navegador ───────────────────────────────────────────────────────────────────────────────────

const esNavegador = typeof window !== 'undefined' && typeof document !== 'undefined';

function esperarMapa(t = 15000) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => {
      const m = window.MapEngine?.getMap?.() || window.SNCMapa;
      if (m) return resolve(m);
      if (performance.now() - t0 > t) return resolve(null);
      setTimeout(tick, 150);
    };
    tick();
  });
}

async function pedir(url) {
  const r = await fetch(url);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) throw new Error(d.error || `Error ${r.status}`);
  return d;
}

const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function htmlFicha(p) {
  return `<div class="co-popup"><strong>Parcela oficial</strong><dl>${filasFicha(p).map(([a, b]) => `<dt>${escHtml(a)}</dt><dd>${escHtml(b)}</dd>`).join('')}</dl>
    <div class="co-dnit"><strong>Liquidación DNIT 2026</strong><p class="co-info">${consultaDnit(p) ? 'Buscando la cuenta…' : 'La parcela no tiene zona/manzana/lote ni padrón: no se puede vincular.'}</p></div>
    ${refInforme(p) ? `<a class="co-informe" href="/municipal/informe-lote.html?ref=${encodeURIComponent(refInforme(p))}&dpto=${encodeURIComponent(p.dpto)}&dist=${encodeURIComponent(p.dist)}" target="_blank" rel="noopener">Informe municipal del lote</a>` : ''}
    <small>Fuente: catastro.gov.py (WFS público) y DNIT. Dato referencial.</small></div>`;
}
// Referencia que entiende el buscador para abrir el informe municipal del lote.
function refInforme(p) {
  if (p.dpto && p.dist != null && p.zona != null && p.mz != null && p.lote != null) return `${p.dpto}-${p.dist}-${p.zona}-${p.mz}-${p.lote}`;
  if (p.finca) return `finca ${p.finca} dist ${p.dist}`;
  return null;
}
// Ficha con la cuenta DNIT, que se busca al abrir la ventana (no por cada parcela dibujada).
// Se reemplaza el contenido completo con setContent(): popup.update() lo volvería a dibujar con el texto original.
function vincularFicha(f, capa) {
  capa.bindPopup(htmlFicha(f.properties), { maxWidth: 320 });
  capa.on('popupopen', async (e) => {
    const q = consultaDnit(f.properties);
    if (!q || capa.$fichaDnit) return;
    let bloque;
    try {
      const r = await pedir(`/api/v3/dnit/cuenta?${q}`);
      const filas = filasDnit(r);
      bloque = filas
        ? `<dl>${filas.map(([a, b]) => `<dt>${escHtml(a)}</dt><dd>${escHtml(b)}</dd>`).join('')}</dl>`
        : '<p class="co-info co-alerta">Sin cuenta en la liquidación: parcela sin liquidar o con datos distintos.</p>';
    } catch (err) { bloque = `<p class="co-info">${escHtml(err.message)}</p>`; }
    capa.$fichaDnit = htmlFicha(f.properties).replace(/<div class="co-dnit">[\s\S]*?<\/div>/, `<div class="co-dnit"><strong>Liquidación DNIT 2026</strong>${bloque}</div>`);
    capa.setPopupContent(capa.$fichaDnit);
  });
}

function montar(map) {
  const L = window.L;
  const estilo = { color: '#0891b2', weight: 1.6, opacity: 0.9, fillOpacity: 0.04 };
  const resaltado = { color: '#facc15', weight: 3, fillOpacity: 0.15 };
  const capa = L.geoJSON(null, { style: estilo, onEachFeature: (f, l) => vincularFicha(f, l) });
  const seleccion = L.geoJSON(null, { style: resaltado, onEachFeature: (f, l) => vincularFicha(f, l) }).addTo(map);
  let activa = false, pedido = 0, marcador = null;

  // ── Rótulos de Cta. Cte. en el centro de cada parcela, girados según el eje largo del terreno (zoom 17+).
  const ZOOM_ROTULOS = 17;
  const rotulos = L.layerGroup().addTo(map);
  const rotular = () => {
    rotulos.clearLayers();
    if (map.getZoom() < ZOOM_ROTULOS) return;
    const visibles = map.getBounds().pad(0.1);
    for (const grupo of [capa, seleccion]) {
      if (!map.hasLayer(grupo)) continue;
      grupo.eachLayer(l => {
        const p = l.feature?.properties || {}, texto = etiquetaCtaCte(p);
        if (!texto || !l.getLatLngs || !visibles.intersects(l.getBounds())) return;
        let anillo = l.getLatLngs();
        while (Array.isArray(anillo[0]) && Array.isArray(anillo[0][0] ?? null)) anillo = anillo[0];
        if (Array.isArray(anillo[0])) anillo = anillo[0];
        const px = anillo.map(ll => { const q = map.latLngToLayerPoint(ll); return [q.x, q.y]; });
        const u = ubicacionRotulo(px);
        if (!u) return;
        // Tamaño: que el texto entre a lo largo (≈0,6 em por carácter) y a lo ancho del terreno.
        const fs = Math.min(14, u.ancho * 0.55, (u.largo * 0.85) / (texto.length * 0.6));
        if (fs < 7) return;
        const pos = map.layerPointToLatLng(L.point(u.centro[0], u.centro[1]));
        const m = L.marker(pos, { interactive: false, keyboard: false,
          icon: L.divIcon({ className: 'co-rotulo', html: `<span>${escHtml(texto)}</span>`, iconSize: [0, 0] }) });
        m.on('add', () => {
          // Estilos por código: la CSP no admite atributos style en el HTML.
          const s = m.getElement()?.querySelector('span');
          if (s) { s.style.fontSize = `${fs.toFixed(1)}px`; s.style.transform = `translate(-50%, -50%) rotate(${u.grados.toFixed(1)}deg)`; }
        });
        rotulos.addLayer(m);
      });
    }
  };
  let esperaRot;
  const programarRotulos = () => { clearTimeout(esperaRot); esperaRot = setTimeout(rotular, 120); };
  map.on('zoomend moveend', programarRotulos);

  // ── Botón "Parcelas oficiales"
  const barra = document.getElementById('map-tools');
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'map-selector-btn co-boton';
  boton.title = 'Parcelas oficiales del catastro nacional (zoom 16+)';
  boton.setAttribute('aria-label', 'Mostrar parcelas oficiales');
  boton.setAttribute('aria-pressed', 'false');
  boton.innerHTML = '<i class="fas fa-border-all" aria-hidden="true"></i>';
  barra?.appendChild(boton);

  const avisar = (t) => {
    const toast = document.getElementById('system-toast'), msg = document.getElementById('toast-msg');
    if (toast && msg) { msg.textContent = t; toast.hidden = false; clearTimeout(avisar._t); avisar._t = setTimeout(() => { toast.hidden = true; }, 6000); }
  };

  // Parcelas: 1) lo que se ve, desde el parcelario descargado en el servidor (rápido);
  // 2) en segundo plano, el resto de los distritos de la vista, que quedan en memoria del navegador;
  // 3) si la zona no está descargada, el WFS del SNC como antes.
  const enMemoria = new Map();            // "D|12" → { completo, features: [{ f, caja }] }
  const bajando = new Set();
  const cajaDe = f => { if (!f.$caja) f.$caja = L.geoJSON(f).getBounds(); return f.$caja; };
  const dibujarDesdeMemoria = (claves) => {
    const vista = map.getBounds().pad(0.05), sel = [];
    for (const k of claves) for (const x of enMemoria.get(k).features) { if (vista.intersects(x.caja)) { sel.push(x.f); if (sel.length >= 4000) break; } }
    capa.clearLayers().addData({ type: 'FeatureCollection', features: sel });
    programarRotulos();
  };
  const completarDistrito = async (k) => {
    if (bajando.has(k) || enMemoria.get(k)?.completo) return;
    bajando.add(k);
    const [dpto, dist] = k.split('|');
    const lista = [];
    try {
      for (let pg = 0, total = 1; pg < total; pg++) {
        const r = await pedir(`/api/v3/parcelario/distrito?dpto=${dpto}&dist=${dist}&pagina=${pg}`);
        total = r.paginas;
        for (const f of r.features) lista.push({ f, caja: cajaDe(f) });
        await new Promise(res => setTimeout(res, 30));   // deja respirar al navegador entre páginas
      }
      enMemoria.set(k, { completo: true, features: lista });
    } catch { /* sin parcelario local para ese distrito: se seguirá pidiendo por vista */ }
    bajando.delete(k);
  };
  const cargarVista = async () => {
    if (!activa) return;
    if (map.getZoom() < ZOOM_MINIMO) { capa.clearLayers(); avisar('Acerque el mapa (zoom 16 o más) para ver las parcelas oficiales.'); return; }
    const b = map.getBounds(), n = ++pedido;
    const q = new URLSearchParams({ minX: b.getWest().toFixed(6), minY: b.getSouth().toFixed(6), maxX: b.getEast().toFixed(6), maxY: b.getNorth().toFixed(6) });
    try {
      const fc = await pedir(`/api/v3/parcelario/vista?${q}${parametrosAmbito()}`);
      if (n !== pedido) return;
      if (fc.local) {
        // Si los distritos de la vista ya están completos en memoria, se dibuja desde ahí (sin esperar al servidor la próxima vez).
        capa.clearLayers().addData(fc);
        programarRotulos();
        fc.distritos.forEach(k => completarDistrito(k));
        return;
      }
    } catch { /* ruta local no disponible: WFS */ }
    try {
      const fc = await pedir(`/api/v3/oficial/parcelas?${q}`);
      if (n !== pedido) return;   // llegó tarde: el usuario ya movió el mapa
      const a = window.SNCAmbito;
      if (a) fc.features = fc.features.filter(f => String(f.properties.dpto) === a.dpto && Number(f.properties.dist) === a.dist);
      capa.clearLayers().addData(fc);
      programarRotulos();
    } catch (e) { avisar(`Parcelas oficiales: ${e.message}`); }
  };
  // Al mover dentro de distritos ya completos, se dibuja desde la memoria del navegador de inmediato.
  const desdeMemoriaSiSePuede = () => {
    if (!activa || map.getZoom() < ZOOM_MINIMO) return false;
    const completos = [...enMemoria.entries()].filter(([, v]) => v.completo).map(([k]) => k);
    if (!completos.length) return false;
    const vista = map.getBounds();
    const cubre = completos.some(k => enMemoria.get(k).features.some(x => x.caja.contains(vista.getCenter())));
    if (!cubre) return false;
    dibujarDesdeMemoria(completos);
    return true;
  };
  let espera;
  map.on('moveend', () => { clearTimeout(espera); if (desdeMemoriaSiSePuede()) return; espera = setTimeout(cargarVista, 200); });
  boton.addEventListener('click', () => {
    activa = !activa;
    boton.classList.toggle('co-activo', activa);
    boton.setAttribute('aria-pressed', String(activa));
    if (activa) { capa.addTo(map); cargarVista(); } else { capa.remove(); programarRotulos(); }
  });

  // ── Buscador sobre el mapa
  const caja = document.createElement('form');
  caja.className = 'co-buscador';
  caja.setAttribute('role', 'search');
  caja.innerHTML = `
    <label for="co-q" class="co-oculto">Buscar dirección, lugar o parcela</label>
    <input id="co-q" type="search" autocomplete="off" placeholder="Dirección, lugar, finca o Cta. Cte." aria-describedby="co-ayuda">
    <button type="submit" aria-label="Buscar"><i class="fas fa-magnifying-glass" aria-hidden="true"></i></button>
    <button type="button" class="co-cerrar" aria-label="Ocultar la barra de búsqueda" title="Ocultar la barra de búsqueda">✕</button>
    <div id="co-res" class="co-resultados" hidden></div>
    <span id="co-ayuda" class="co-oculto">Ejemplos: Yegros Piribebuy, finca 15783, A|5|#|14|885|20|#|#, D-12-19-58-5</span>`;
  (document.getElementById('map')?.parentElement || document.body).appendChild(caja);
  const input = caja.querySelector('#co-q'), lista = caja.querySelector('#co-res');

  // Mostrar u ocultar la barra: ✕ la cierra; el botón con lupa la vuelve a abrir. Se recuerda en este navegador.
  const abrir = document.createElement('button');
  abrir.type = 'button'; abrir.className = 'co-abrir'; abrir.title = 'Mostrar la barra de búsqueda'; abrir.setAttribute('aria-label', 'Mostrar la barra de búsqueda');
  abrir.innerHTML = '<i class="fas fa-magnifying-glass" aria-hidden="true"></i>';
  caja.parentElement.appendChild(abrir);
  const verBarra = on => {
    caja.hidden = !on; abrir.hidden = on;
    try { localStorage.setItem('snc_buscador_oculto', on ? '0' : '1'); } catch { /* sin almacenamiento */ }
    if (on) input.focus();
  };
  caja.querySelector('.co-cerrar').addEventListener('click', () => { lista.hidden = true; verBarra(false); });
  abrir.addEventListener('click', () => verBarra(true));
  let oculto = false; try { oculto = localStorage.getItem('snc_buscador_oculto') === '1'; } catch { /* sin almacenamiento */ }
  caja.hidden = oculto; abrir.hidden = !oculto;

  const mostrar = (html) => { lista.innerHTML = html; lista.hidden = !html; };
  const irA = (lat, lng, bbox) => {
    if (bbox && bbox.every(Number.isFinite)) map.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { maxZoom: 18 });
    else map.setView([lat, lng], 18);
    marcador?.remove();
    marcador = L.marker([lat, lng]).addTo(map);
  };

  caja.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const q = input.value.trim();
    if (q.length < 3) return;
    mostrar('<p class="co-info">Buscando…</p>');
    try {
      if (esConsultaCatastral(q)) {
        await cargarAmbito();
        const fc = await pedir(`/api/v3/oficial/buscar?q=${encodeURIComponent(q)}${parametrosAmbito()}`);
        if (!fc.features.length) return mostrar('<p class="co-info">No se encontró esa parcela en el catastro oficial.</p>');
        seleccion.clearLayers().addData(fc); programarRotulos();
        map.fitBounds(seleccion.getBounds(), { maxZoom: 19 });
        if (fc.features.length === 1) seleccion.eachLayer(l => l.openPopup());
        mostrar((fc.features.length > 1 ? `<p class="co-info">${fc.features.length} parcelas con esa referencia en distintos distritos: elija una.</p>` : '') + fc.features.slice(0, 8).map((f, i) =>
          `<button type="button" data-i="${i}">${resumenParcela(f.properties).replace(/</g, '&lt;')}</button>`).join('') +
          '<p class="co-fuente">Catastro nacional (catastro.gov.py)</p>');
        lista.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
          const f = fc.features[Number(b.dataset.i)];
          seleccion.clearLayers().addData(f); programarRotulos();
          map.fitBounds(seleccion.getBounds(), { maxZoom: 19 });
          seleccion.eachLayer(l => l.openPopup());
          mostrar('');
        }));
      } else {
        const r = await pedir(`/api/v3/geocodificar?q=${encodeURIComponent(q)}`);
        if (!r.resultados.length) return mostrar('<p class="co-info">Sin resultados para esa dirección.</p>');
        mostrar(r.resultados.map((x, i) => `<button type="button" data-i="${i}">${x.nombre.replace(/</g, '&lt;')}</button>`).join('') +
          `<p class="co-fuente">${r.atribucion}</p>`);
        lista.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
          const x = r.resultados[Number(b.dataset.i)];
          irA(x.lat, x.lng, x.tipo === 'house' ? null : x.bbox);
          input.value = x.nombre.split(',').slice(0, 2).join(',');
          mostrar('');
        }));
      }
    } catch (e) { mostrar(`<p class="co-info">${String(e.message).replace(/</g, '&lt;')}</p>`); }
  });
  document.addEventListener('click', (e) => { if (!caja.contains(e.target)) mostrar(''); });

  window.CatastroOficial = {
    async parcelaEnPunto(lat, lng, { resaltar = true } = {}) {
      const fc = await pedir(`/api/v3/oficial/parcela-en-punto?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
      const f = fc.features[0] || null;
      if (resaltar) { seleccion.clearLayers(); if (f) seleccion.addData(f); programarRotulos(); }
      return f;
    },
    resumenParcela
  };
}

if (esNavegador) {
  const iniciar = async () => { const map = await esperarMapa(); if (map && window.L) montar(map); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}
