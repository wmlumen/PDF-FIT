/**
 * Capas POUT cargadas (zonificación y afectaciones del Área Metropolitana) en el geoportal del módulo POUT.
 * Datos: /api/v3/pout-ama/* (poutAmaServicio.js). Clic en una zona: zona, norma del catálogo y afectaciones.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const json = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  let mapa, zonas, afect, cats = [];

  async function cargar() {
    const muni = $('poutAmaMuni').value, q = muni ? `?municipio=${encodeURIComponent(muni)}` : '';
    $('poutAmaEstado').textContent = 'Cargando capas…';
    [zonas, afect].forEach(c => c && mapa.removeLayer(c));
    try {
      const [z, a] = await Promise.all([json(`/api/v3/pout-ama/capa/zonas${q}`), json(`/api/v3/pout-ama/capa/afectaciones${q}`)]);
      zonas = L.geoJSON(z, { style: f => ({ color: '#334155', weight: 0.4, fillColor: f.properties.color, fillOpacity: 0.6 }), onEachFeature: (f, l) => l.on('click', e => consultar(e.latlng)) });
      afect = L.geoJSON(a, { pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 3 }), style: () => ({ color: '#b91c1c', weight: 1, dashArray: '3 3', fillColor: '#ef4444', fillOpacity: 0.12 }), onEachFeature: (f, l) => l.bindTooltip(esc(f.properties.tipo)) });
      if ($('poutAmaZonas').checked) zonas.addTo(mapa);
      if ($('poutAmaAfect').checked) afect.addTo(mapa);
      if (z.features.length) mapa.fitBounds(zonas.getBounds());
      $('poutAmaEstado').textContent = `${z.features.length.toLocaleString('es-PY')} zonas · ${a.features.length.toLocaleString('es-PY')} afectaciones`;
      leyenda(new Set(z.features.map(f => f.properties.categoria)));
    } catch (e) { $('poutAmaEstado').textContent = `No se pudieron cargar las capas (${e.message})`; }
  }
  function leyenda(presentes) {
    const el = $('poutAmaLeyenda');
    el.innerHTML = cats.filter(c => presentes.has(c.categoria)).map(c => `<span class="pout-ama-item"><i data-c="${esc(c.color)}"></i>${esc(c.categoria)}</span>`).join('') +
      '<span class="pout-ama-item"><i class="pout-ama-af"></i>Afectación</span>';
    el.querySelectorAll('i[data-c]').forEach(i => { i.style.background = i.dataset.c; });
  }
  async function consultar(ll) {
    const r = await json(`/api/v3/pout-ama/punto?lat=${ll.lat}&lng=${ll.lng}`).catch(() => null);
    if (!r?.dentro_pout_ama) return;
    const z = r.zona, n = r.norma, lista = a => (a?.length ? a.map(esc).join(', ') : '—');
    L.popup({ maxWidth: 320 }).setLatLng(ll).setContent(`<b>${esc(z.municipio)}</b><br>Zona: <b>${esc(z.zona)}</b>${r.codigo ? ` (${esc(r.codigo)})` : ''}<br>Categoría: ${esc(z.categoria)}` +
      (z.barrio ? `<br>Barrio: ${esc(z.barrio)}` : '') +
      (n ? `<br>Altura: ${esc(n.altura || '—')} · FOS ${esc(n.tasa_ocupacion || '—')} · FOT ${esc(n.edificabilidad || '—')}<br>Permitidos: ${lista(n.uso_permitido)}<br>No permitidos: ${lista(n.usos_no_permitidos)}` : '<br><i>Norma: ver ordenanza del municipio</i>') +
      `<br>Afectaciones: ${r.afectaciones.length ? r.afectaciones.map(a => esc(a.tipo)).join(', ') : 'ninguna registrada'}`).openOn(mapa);
  }

  // ── Búsqueda por departamento: estado POUT de cada municipio (Pout/data/municipios-interior.json, MEF/VEP) sobre los límites distritales.
  const norm = t => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\b(DR|DRA|GRAL|CNEL|CAP|CAPITAN|TTE|PTE|MCAL|SGTO|STA|STO|DE|DEL|LA|EL|LOS|LAS)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const nombreDpto = d => String(d).replace(/\s*\(.*\)\s*$/, '');
  let estados = [], distritos = null, capaDpto = null;
  const igual = (a, b) => { a = norm(a); b = norm(b); return a === b || (a.length > 4 && b.length > 4 && (a.includes(b) || b.includes(a))); };
  const conCapas = m => Array.from($('poutAmaMuni').options).some(o => o.value && igual(o.value, m)) || tieneCapasPropias(m);
  async function porDepartamento() {
    const dep = $('poutDpto').value;
    if (capaDpto) { mapa.removeLayer(capaDpto); capaDpto = null; }
    $('poutDptoLista').innerHTML = ''; $('poutDptoResumen').textContent = '';
    if (!dep) return;
    const munis = estados.filter(m => nombreDpto(m.departamento) === dep);
    distritos ||= await json('/data/distritos_py_light.geojson').catch(() => ({ features: [] }));
    const nd = norm(dep === 'Distrito Capital' ? 'Asunción' : dep);
    const feats = distritos.features.filter(f => norm(f.properties.DPTO_DESC) === nd);
    const estadoDe = f => munis.find(m => igual(m.municipio, f.properties.DIST_DESC));
    const color = m => (!m ? '#cbd5e1' : conCapas(m.municipio) ? '#2563eb' : m.estado_pout === 'CON_POUT' ? '#16a34a' : '#f87171');
    capaDpto = L.geoJSON({ type: 'FeatureCollection', features: feats }, {
      style: f => ({ color: '#1e293b', weight: 1.2, fillColor: color(estadoDe(f)), fillOpacity: 0.45 }),
      onEachFeature: (f, l) => { const m = estadoDe(f); l.bindTooltip(`<b>${esc(f.properties.DIST_DESC)}</b><br>${m ? (m.estado_pout === 'CON_POUT' ? `Con POUT${m.anio_pout ? ` (${esc(m.anio_pout)})` : ''}` : 'Sin POUT') : 'Sin dato'}`, { sticky: true }); }
    }).addTo(mapa);
    if (feats.length) mapa.fitBounds(capaDpto.getBounds());
    const con = munis.filter(m => m.estado_pout === 'CON_POUT' || conCapas(m.municipio)).length;
    $('poutDptoResumen').textContent = `${munis.length} municipios · ${con} con POUT · ${munis.length - con} sin POUT`;
    $('poutDptoLista').innerHTML = munis.map(m => {
      const capas = conCapas(m.municipio), cls = capas ? 'capas' : m.estado_pout === 'CON_POUT' ? 'con' : 'sin';
      const txt = capas ? 'POUT con capas cargadas' : m.estado_pout === 'CON_POUT' ? `Con POUT${m.anio_pout ? ` ${esc(m.anio_pout)}` : ''} · sin capas en el sistema` : 'Sin POUT';
      return `<button type="button" class="pout-dpto-item ${cls}" data-m="${esc(m.municipio)}"><b>${esc(m.municipio)}</b><span>${txt}</span>${m.intendente && m.intendente !== '—' ? `<small>${esc(m.intendente)}</small>` : ''}</button>`;
    }).join('') + '<div class="pout-dpto-ley"><i class="capas"></i>Con capas <i class="con"></i>Con POUT (sin capas) <i class="sin"></i>Sin POUT</div>';
    $('poutDptoLista').querySelectorAll('.pout-dpto-item').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.m, op = Array.from($('poutAmaMuni').options).find(o => o.value && igual(o.value, m));
      if (op) { $('poutAmaMuni').value = op.value; cargar(); return; }
      if (tieneCapasPropias(m)) { cargarMunicipal(m); return; }
      const f = feats.find(x => igual(m, x.properties.DIST_DESC));
      if (f) mapa.fitBounds(L.geoJSON(f).getBounds());
    }));
  }

  // ── POUT municipales con capas propias (visor público del municipio → data/pout_<municipio>/, scripts/arcgis-capas.py)
  // Varias fuentes por municipio; los límites de Boquerón (Google My Maps) se suman a sus 4 municipios.
  const LIM_BOQ = '/data/pout_municipal/limites_boqueron/';
  const MUNI_CAPAS = { Filadelfia: ['/data/pout_filadelfia/', LIM_BOQ], 'Loma Plata': ['/data/pout_municipal/loma_plata/', LIM_BOQ],
    'Mariscal José Félix Estigarribia': ['/data/pout_municipal/mcal_estigarribia/', LIM_BOQ], 'Boquerón': ['/data/pout_municipal/boqueron/', LIM_BOQ],
    'Tavaí': ['/data/pout_municipal/tavai/'] };
  const PALETA = ['#e11d48', '#f97316', '#eab308', '#84cc16', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#78716c'];
  function colorUso(u) {
    const c = String(u || '').toUpperCase().split(/[\s-]/)[0];
    const fijo = { AG: '#fde68a', RF: '#15803d', CF: '#22c55e', ASP: '#14532d', IAM: '#4ade80', IA: '#4ade80', VR: '#86efac', PCH: '#38bdf8', FNE: '#cbd5e1', CALLE: '#e5e7eb', CU: '#e5e7eb',
      ZHBD: '#bfdbfe', ZHMD: '#60a5fa', HABSUB: '#93c5fd', UFH: '#dbeafe', ZM1: '#fb923c', FM2: '#f59e0b', MSUB: '#fdba74', UFM1: '#fed7aa', IND: '#7c3aed', UFIND: '#c4b5fd',
      CI: '#b45309', CC: '#dc2626', PC: '#991b1b', ESP: '#94a3b8', SP: '#6b7280', ALD: '#a3e635', CS: '#f472b6', PR: '#facc15', SIT: '#e879f9' };
    if (fijo[c]) return fijo[c];
    let h = 0; for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETA[h % PALETA.length];
  }
  const capasMuni = {};   // archivo → { capa Leaflet, datos, meta }
  let muniActivo = null;
  const tieneCapasPropias = m => Object.keys(MUNI_CAPAS).some(k => igual(k, m));
  async function cargarMunicipal(nombre) {
    const bases = MUNI_CAPAS[Object.keys(MUNI_CAPAS).find(k => igual(k, nombre))];
    Object.values(capasMuni).forEach(c => c.capa && mapa.removeLayer(c.capa));
    Object.keys(capasMuni).forEach(k => delete capasMuni[k]);
    muniActivo = { nombre };
    // Cada capa lleva su URL completa (archivo = base + nombre) para poder mezclar fuentes.
    const meta = { capas: [] };
    for (const [i, b] of bases.entries()) {
      const m = await json(`${b}capas.json`).catch(() => ({ capas: [] }));
      m.capas.forEach(c => meta.capas.push({ ...c, capa: i && b === LIM_BOQ ? `${c.capa.replace(' (Google My Maps)', '')} · Límites de Boquerón` : c.capa, archivo: b + c.archivo }));
    }
    const caja = $('poutMuniCapas'); caja.hidden = false;
    const zonas = c => /^zona/i.test(c.capa) && !/my maps/i.test(c.capa);
    caja.innerHTML = `<div class="pout-muni-tit"><b>Capas del POUT de ${esc(nombre)}</b><small>Fuente: visor territorial público del municipio (ArcGIS). Sin datos personales.</small></div>` +
      meta.capas.map(c => `<div class="pout-muni-fila"><label><input type="checkbox" data-a="${esc(c.archivo)}" ${zonas(c) || (/distrito|l[ií]mite|comunidades/i.test(c.capa) && !/Límites de Boquerón/.test(c.capa)) ? 'checked' : ''}> ${esc(c.capa)}</label><span class="muted">${c.cantidad.toLocaleString('es-PY')} · ${esc(c.geometria)}</span><button type="button" class="btn btn--secondary" data-t="${esc(c.archivo)}">Tabla</button></div>`).join('') +
      '<div id="poutMuniLey" class="pout-ama-leyenda"></div>';
    const usos = new Map();
    for (const c of meta.capas) capasMuni[c.archivo] = { meta: c };
    const activar = async (archivo, on) => {
      const c = capasMuni[archivo];
      if (on && !c.datos) {
        c.datos = await json(archivo);
        c.capa = L.geoJSON(c.datos, {
          pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 5, color: '#fff', weight: 1, fillColor: f.properties.color || (/indígena/i.test(c.meta.capa) ? '#b45309' : '#2563eb'), fillOpacity: 0.9 }),
          style: f => !f.properties.uso && f.properties.color ? { color: f.properties.color, weight: c.meta.geometria === 'Polyline' ? 2.5 : 2, fillColor: f.properties.color, fillOpacity: 0.25 } : f.properties.uso ? { color: '#334155', weight: 0.3, fillColor: f.properties.color || colorUso(f.properties.uso), fillOpacity: 0.75 }
            : c.meta.geometria === 'Polyline' ? { color: '#475569', weight: 1.2 } : /distrito/i.test(c.meta.capa) ? { color: '#0f172a', weight: 2.5, fill: false } : { color: '#7c2d12', weight: 0.6, fillOpacity: 0.05 },
          onEachFeature: (f, l) => l.bindPopup(`<b>${esc(c.meta.capa)}</b><br>` + Object.entries(f.properties).filter(([k]) => !/^(Shape__|ORIG_FID|OBJECTID)/.test(k)).map(([k, v]) => `${esc(k)}: <b>${esc(v ?? '—')}</b>`).join('<br>'), { maxWidth: 360 })
        });
        c.datos.features.forEach(f => f.properties.uso && usos.set(f.properties.zona_oficial || f.properties.uso, f.properties.color || colorUso(f.properties.uso)));
        $('poutMuniLey').innerHTML = [...usos].sort().map(([u, col]) => `<span class="pout-ama-item"><i data-c="${esc(col)}"></i>${esc(u)}</span>`).join('');
        $('poutMuniLey').querySelectorAll('i[data-c]').forEach(i => { i.style.background = i.dataset.c; });
      }
      if (on) c.capa.addTo(mapa); else if (c.capa) mapa.removeLayer(c.capa);
      return c;
    };
    caja.querySelectorAll('input[data-a]').forEach(i => i.addEventListener('change', () => activar(i.dataset.a, i.checked)));
    caja.querySelectorAll('button[data-t]').forEach(b => b.addEventListener('click', async () => { const c = await activar(b.dataset.t, true); caja.querySelector(`input[data-a="${b.dataset.t}"]`).checked = true; tabla(c); }));
    for (const c of meta.capas.filter(c => zonas(c) || (/distrito|l[ií]mite|comunidades/i.test(c.capa) && !/Límites de Boquerón/.test(c.capa)))) await activar(c.archivo, true);
    const d = Object.values(capasMuni).find(c => c.capa && /distrito|l[ií]mite|comunidades/i.test(c.meta.capa))?.capa;
    if (d) mapa.fitBounds(d.getBounds());
  }
  // Tabla de atributos: encabezado fijo, filtro, clic en fila = acercar; CSV de las filas filtradas.
  let tablaActual = null;
  function tabla(c) {
    const cols = c.meta.campos.map(x => x.nombre).filter(n => !/^(Shape__|ORIG_FID)/.test(n));
    tablaActual = { c, cols, filas: c.datos.features };
    $('poutTabla').hidden = false;
    $('poutTablaTitulo').textContent = `${c.meta.capa} — ${muniActivo?.nombre || ''}`;
    $('poutTablaCab').innerHTML = `<tr>${cols.map(n => `<th>${esc(c.meta.campos.find(x => x.nombre === n)?.alias || n)}</th>`).join('')}</tr>`;
    $('poutTablaBuscar').value = '';
    pintarTabla();
    $('poutTabla').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function filasFiltradas() {
    const q = norm($('poutTablaBuscar').value);
    return q ? tablaActual.filas.filter(f => norm(Object.values(f.properties).join(' ')).includes(q)) : tablaActual.filas;
  }
  function pintarTabla() {
    const fs = filasFiltradas(), max = 1000, { cols } = tablaActual;
    $('poutTablaCuenta').textContent = `${fs.length.toLocaleString('es-PY')} filas${fs.length > max ? ` (se muestran ${max}; el CSV lleva todas)` : ''}`;
    $('poutTablaCuerpo').innerHTML = fs.slice(0, max).map((f, i) => `<tr data-i="${i}">${cols.map(n => { const v = f.properties[n]; return `<td${typeof v === 'number' ? ' class="num"' : ''}>${esc(typeof v === 'number' && !Number.isInteger(v) ? v.toLocaleString('es-PY', { maximumFractionDigits: 2 }) : v ?? '')}</td>`; }).join('')}</tr>`).join('');
    $('poutTablaCuerpo').querySelectorAll('tr').forEach(tr => tr.addEventListener('click', () => {
      const f = fs[Number(tr.dataset.i)], g = L.geoJSON(f);
      if (f.geometry.type === 'Point') mapa.setView(g.getBounds().getCenter(), 16); else mapa.fitBounds(g.getBounds(), { maxZoom: 17 });
      const sel = L.geoJSON(f, { style: { color: '#facc15', weight: 4, fill: false }, pointToLayer: (_, ll) => L.circleMarker(ll, { radius: 10, color: '#facc15', weight: 3 }) }).addTo(mapa);
      setTimeout(() => mapa.removeLayer(sel), 4000);
      $('pout-map').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  }
  function csv() {
    const { cols, c } = tablaActual, q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const txt = [cols.join(';'), ...filasFiltradas().map(f => cols.map(n => q(f.properties[n])).join(';'))].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }));
    a.download = `${(muniActivo?.nombre || 'pout').replace(/\W+/g, '_')}_${c.meta.archivo.split('/').pop().replace('.geojson', '')}.csv`; a.click();
  }
  async function iniciarDepartamentos() {
    try {
      estados = (await json('/Pout/data/municipios-interior.json')).municipios || [];
      const deps = [...new Set(estados.map(m => nombreDpto(m.departamento)))];
      $('poutDpto').insertAdjacentHTML('beforeend', deps.map(d => `<option>${esc(d)}</option>`).join(''));
      $('poutDpto').addEventListener('change', porDepartamento);
    } catch { $('poutDptoResumen').textContent = 'Sin listado de estado POUT'; }
  }
  window.poutCapasAma = async function (m) {
    mapa = m;
    try {
      const res = await json('/api/v3/pout-ama/resumen');
      cats = res.categorias || [];
      $('poutAmaMuni').insertAdjacentHTML('beforeend', Object.keys(res.municipios || {}).map(n => `<option>${esc(n)}</option>`).join(''));
    } catch { /* sin resumen */ }
    $('poutAmaMuni').addEventListener('change', cargar);
    $('poutAmaZonas').addEventListener('change', e => zonas && (e.target.checked ? zonas.addTo(mapa) : mapa.removeLayer(zonas)));
    $('poutAmaAfect').addEventListener('change', e => afect && (e.target.checked ? afect.addTo(mapa) : mapa.removeLayer(afect)));
    cargar();
    iniciarDepartamentos();
    $('poutTablaBuscar').addEventListener('input', () => tablaActual && pintarTabla());
    $('poutTablaCsv').addEventListener('click', () => tablaActual && csv());
    $('poutTablaCerrar').addEventListener('click', () => { $('poutTabla').hidden = true; });
  };
})();
