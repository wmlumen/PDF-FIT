/**
 * Gestión municipal (/municipal/gestion.html): locales y patentes (vigente, vencida, sin patente, inhabilitada,
 * no declarada), inspecciones, liquidaciones DNIT, Planificación (POUT) y avisos a contribuyentes.
 * El municipio sale del usuario (/api/v3/mi-acceso); sin sesión, de ?dpto=&dist= (solo lectura pública).
 */
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gs = v => `Gs ${Number(v || 0).toLocaleString('es-PY')}`;
const num = v => Number(v || 0).toLocaleString('es-PY');
const token = () => { try { return localStorage.getItem('snc_api_token') || localStorage.getItem('snc_token'); } catch { return null; } };
const msg = (t, error) => { const m = $('pf-msg'); m.textContent = t || ''; m.classList.toggle('error', !!error); };
async function api(url, metodo = 'GET', cuerpo) {
  const r = await fetch(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 401 ? 'Inicie sesión con un usuario del municipio.' : (d.error || `Error ${r.status}`));
  return d;
}
const COLOR = { vigente: '#22c55e', vencida: '#f59e0b', sin_patente: '#a855f7', inhabilitada: '#ef4444', no_declarada: '#22d3ee' };
let amb = { dpto: null, dist: null, nombre: '' }, datos = null, mapa = null, capa = null, marca = null, liqPag = 1;

async function ambito() {
  const q = new URLSearchParams(location.search);
  if (token()) { try { const a = await api('/api/v3/mi-acceso'); if (a.cliente?.cod_dpto) return { dpto: a.cliente.cod_dpto, dist: a.cliente.cod_distrito, nombre: a.cliente.nombre }; } catch { /* sin acceso: sigue */ } }
  return { dpto: (q.get('dpto') || '').toUpperCase() || null, dist: q.get('dist'), nombre: q.get('nombre') || '' };
}
const qs = extra => new URLSearchParams({ dpto: amb.dpto, dist: amb.dist, ...extra }).toString();

// ─── Locales ─────────────────────────────────────────────
function dibujarLocales() {
  if (!datos) return;
  const f = $('gm-filtro').value, b = $('gm-buscar').value.trim().toLowerCase();
  const lista = datos.locales.filter(l => (!f || l.estado === f) && (!b || [l.nombre, l.rubro, l.ctacte].join(' ').toLowerCase().includes(b)));
  $('gm-resumen').innerHTML = Object.entries(datos.estados).map(([k, t]) => `<button type="button" class="gm-res ${k}" data-k="${k}"><b>${num(datos.resumen[k])}</b><small>${esc(t)}</small></button>`).join('');
  $('gm-resumen').querySelectorAll('button').forEach(x => x.addEventListener('click', () => { $('gm-filtro').value = $('gm-filtro').value === x.dataset.k ? '' : x.dataset.k; dibujarLocales(); }));
  $('gm-locales').innerHTML = lista.slice(0, 500).map((l, i) => `<tr data-i="${datos.locales.indexOf(l)}"><td><b>${esc(l.nombre || 'Sin nombre')}</b>${l.origen === 'mapa' ? '<br><small>Detectado en el mapa (OSM)</small>' : ''}</td><td>${esc(l.rubro)}</td><td>${esc(l.ctacte)}</td>
    <td>${esc(l.patente_nro)}${l.patente_vence ? `<br><small>vence ${esc(l.patente_vence)}</small>` : ''}</td><td><span class="pf-chip ${l.estado}">${esc(datos.estados[l.estado])}</span></td>
    <td><button type="button" class="pf-boton sec" data-insp="${i}">Inspección</button></td></tr>`).join('') || '<tr><td colspan="6" class="pf-vacio">Sin locales.</td></tr>';
  $('gm-locales').querySelectorAll('tr[data-i]').forEach(tr => {
    const l = datos.locales[tr.dataset.i];
    tr.addEventListener('click', e => { if (e.target.dataset.insp != null) pedirInspeccion(l); else editar(l); });
  });
  if (capa) {
    capa.clearLayers();
    lista.filter(l => l.lat != null).forEach(l => L.circleMarker([l.lat, l.lng], { radius: 6, color: '#0b1220', weight: 1, fillColor: COLOR[l.estado], fillOpacity: 0.9 })
      .bindTooltip(`${esc(l.nombre || 'Sin nombre')} · ${esc(datos.estados[l.estado])}`).on('click', () => editar(l)).addTo(capa));
  }
}
async function cargarLocales() {
  datos = await api(`/api/v3/gestion/locales?${qs()}`);
  if ($('gm-filtro').options.length === 1) $('gm-filtro').insertAdjacentHTML('beforeend', Object.entries(datos.estados).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join(''));
  dibujarLocales(); dibujarInspecciones();
  if (mapa && capa.getLayers().length) mapa.fitBounds(L.featureGroup(capa.getLayers()).getBounds(), { maxZoom: 16, padding: [10, 10] });
}
function editar(l) {
  const f = $('gm-form');
  f.reset();
  for (const k of ['id', 'osm_id', 'nombre', 'rubro', 'ruc', 'ctacte', 'patente_nro', 'patente_vence', 'lat', 'lng', 'motivo_inhabilitacion']) if (f.elements[k]) f.elements[k].value = l?.[k] ?? '';
  f.elements.inhabilitado.checked = !!l?.inhabilitado;
  $('gm-form-titulo').textContent = l?.id ? `Editar: ${l.nombre}` : l ? 'Registrar comercio detectado en el mapa' : 'Alta de local';
  if (l?.lat != null && mapa) { ubicar(l.lat, l.lng); mapa.setView([l.lat, l.lng], 17); }
}
function ubicar(lat, lng) {
  if (!mapa) return;
  marca = marca ? marca.setLatLng([lat, lng]) : L.marker([lat, lng]).addTo(mapa);
}
function pedirInspeccion(l) {
  const f = $('gm-form-insp');
  f.elements.local_id.value = l.id || ''; f.elements.osm_id.value = l.osm_id || ''; f.elements.ctacte.value = l.ctacte || '';
  f.elements.referencia.value = l.nombre || 'Sin nombre';
  f.elements.motivo.value = { vencida: 'Patente vencida', sin_patente: 'Local sin patente', no_declarada: 'Comercio no declarado' }[l.estado] || 'Otro';
  vista('inspecciones');
}

// ─── Usos y actividades (OSM + parcela + cuenta DNIT) ─────
let usosD = null, mapaU = null, capaU = null;
function filtrarUsos() {
  const sec = $('gu-sector').value, f = $('gu-filtro').value, b = $('gu-buscar').value.trim().toLowerCase();
  return usosD.usos.filter(u => (!sec || u.sector === sec)
    && (!f || (f === 'sin_habilitar' && u.habilitacion && !u.registrado) || (f === 'sin_edif' && u.sin_edificacion_declarada) || (f === 'sin_cuenta' && !u.cuenta))
    && (!b || [u.nombre, u.rubro, u.cuenta].join(' ').toLowerCase().includes(b)));
}
function dibujarUsos() {
  const S = usosD.sectores, c = usosD.cruces, lista = filtrarUsos();
  $('gu-cruces').innerHTML = [[num(usosD.usos.length), 'Usos en el mapa', ''], [num(c.requieren_habilitacion), 'Requieren habilitación', ''], [num(c.sin_habilitar), 'Sin local registrado', 'vencida'],
    [num(c.con_cuenta), 'Con cuenta DNIT vinculada', 'vigente'], [num(c.actividad_sin_edificacion_declarada), 'Actividad en lote sin edificación declarada', 'inhabilitada']]
    .map(([v, t, k]) => `<div class="gm-res ${k}"><b>${v}</b><small>${t}</small></div>`).join('');
  $('gu-sectores').innerHTML = Object.entries(S).filter(([, s]) => s.total).sort((a, b) => b[1].total - a[1].total).map(([k, s]) =>
    `<button type="button" class="gm-res ${$('gu-sector').value === k ? 'activo' : ''}" data-k="${k}"><b>${num(s.total)}</b><small><span class="gu-punto" data-color="${s.color}"></span>${esc(s.nombre)}${s.habilitacion ? ` · ${num(s.sin_habilitar)} sin registrar` : ''}</small></button>`).join('');
  $('gu-sectores').querySelectorAll('.gu-punto').forEach(p => p.style.setProperty('--gu-color', p.dataset.color));
  $('gu-sectores').querySelectorAll('button').forEach(x => x.addEventListener('click', () => { $('gu-sector').value = $('gu-sector').value === x.dataset.k ? '' : x.dataset.k; dibujarUsos(); }));
  $('gu-total').textContent = `${num(lista.length)} resultados`;
  $('gu-tabla').innerHTML = lista.slice(0, 400).map((u, i) => `<tr><td><b>${esc(u.nombre)}</b></td><td><span class="gu-punto" data-color="${S[u.sector].color}"></span>${esc(S[u.sector].nombre)}<br><small>${esc(u.rubro)}</small></td>
    <td>${u.cuenta ? `<a href="#" data-cta="${esc(u.cuenta)}">${esc(u.cuenta)}</a>` : '<small>sin parcela</small>'}</td><td>${u.impuesto != null ? gs(u.impuesto) : '—'}</td><td>${u.cuenta ? `${num(u.edif_m2)} m²` : '—'}</td>
    <td>${!u.habilitacion ? '<small>No aplica</small>' : u.registrado ? '<span class="pf-chip vigente">Registrado</span>' : '<span class="pf-chip no_declarada">No registrado</span>'}</td>
    <td>${u.habilitacion && !u.registrado ? `<button type="button" class="pf-boton sec" data-reg="${i}">Registrar</button> <button type="button" class="pf-boton sec" data-ins="${i}">Inspección</button>` : ''}</td></tr>`).join('')
    || '<tr><td colspan="7" class="pf-vacio">Sin resultados.</td></tr>';
  $('gu-tabla').querySelectorAll('.gu-punto').forEach(p => p.style.setProperty('--gu-color', p.dataset.color));
  $('gu-tabla').querySelectorAll('[data-cta]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const cta = a.dataset.cta; $('gm-liq-tipo').value = cta.startsWith('P') ? 'rural' : 'urbano'; $('gm-liq-q').value = cta.replace(/^P/, ''); liqPag = 1; vista('liquidaciones'); cargarLiquidaciones(); }));
  $('gu-tabla').querySelectorAll('[data-reg]').forEach(x => x.addEventListener('click', () => { const u = lista[x.dataset.reg]; vista('locales'); editar({ ...u, ctacte: u.cuenta, id: null }); }));
  $('gu-tabla').querySelectorAll('[data-ins]').forEach(x => x.addEventListener('click', () => { const u = lista[x.dataset.ins]; pedirInspeccion({ ...u, id: null, ctacte: u.cuenta, estado: 'no_declarada' }); }));
  if (capaU) {
    capaU.clearLayers();
    lista.forEach(u => L.circleMarker([u.lat, u.lng], { radius: 5, color: '#0b1220', weight: 1, fillColor: S[u.sector].color, fillOpacity: 0.9 })
      .bindTooltip(`${esc(u.nombre)} · ${esc(S[u.sector].nombre)}${u.cuenta ? ` · ${esc(u.cuenta)}` : ''}`).addTo(capaU));
  }
}
async function cargarUsos() {
  try {
    usosD = await api(`/api/v3/gestion/usos?${qs()}`);
    $('gu-sector').insertAdjacentHTML('beforeend', Object.entries(usosD.sectores).map(([k, s]) => `<option value="${k}">${esc(s.nombre)}</option>`).join(''));
    if (window.L && !mapaU) {
      mapaU = L.map('gu-mapa').setView([-25.3, -57.6], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapaU);
      capaU = L.layerGroup().addTo(mapaU);
    }
    dibujarUsos();
    if (mapaU && capaU.getLayers().length) mapaU.fitBounds(L.featureGroup(capaU.getLayers()).getBounds(), { padding: [10, 10] });
    ['gu-sector', 'gu-filtro'].forEach(id => $(id).addEventListener('change', dibujarUsos));
    $('gu-buscar').addEventListener('input', dibujarUsos);
  } catch (e) { msg(e.message, true); }
}

// ─── Zonas residenciales ──────────────────────────────────
let resD = null, mapaR = null, capaR = null;
const colorZona = p => p.sin_parcela_snc ? '#ef4444' : p.padrones_rurales > p.cuentas_urbanas ? '#f59e0b' : '#9ca3af';
function dibujarResidencial() {
  const f = $('gr-filtro').value, b = $('gr-buscar').value.trim().toLowerCase(), r = resD.resumen;
  const lista = resD.features.filter(x => { const p = x.properties; return (!f || (f === 'sin' && p.sin_parcela_snc) || (f === 'sin_cuenta' && p.sin_cuenta_dnit) || (f === 'rural' && p.padrones_rurales))
    && (!b || [p.barrio, p.nombre].join(' ').toLowerCase().includes(b)); });
  $('gr-resumen').innerHTML = [[num(r.zonas), 'Zonas residenciales'], [`${num(r.ha)} ha`, 'Superficie'], [num(r.parcelas), 'Parcelas SNC dentro'], [num(r.cuentas_urbanas), 'Cta. Cte. urbanas'],
    [num(r.padrones_rurales), 'Padrones rurales'], [num(r.sin_parcela_snc), 'Zonas sin parcela SNC', 'inhabilitada'], [gs(r.impuesto_2026), 'Impuesto 2026']]
    .map(([v, t, k = '']) => `<div class="gm-res ${k}"><b>${v}</b><small>${t}</small></div>`).join('');
  $('gr-tabla').innerHTML = lista.slice(0, 500).map((x, i) => { const p = x.properties; return `<tr data-i="${i}"><td><b>${esc(p.barrio || 'Sin barrio')}</b>${p.nombre ? `<br><small>${esc(p.nombre)}</small>` : ''}</td><td>${num(p.area_ha)}</td><td>${num(p.parcelas)}</td><td>${num(p.cuentas_urbanas)}</td><td>${num(p.padrones_rurales)}</td><td>${num(p.sin_cuenta_dnit)}</td><td>${p.densidad_parcelas_ha ?? '—'}</td><td>${gs(p.impuesto_2026)}</td><td>${num(p.edif_declarada_m2)} m²</td></tr>`; }).join('')
    || '<tr><td colspan="9" class="pf-vacio">Sin zonas.</td></tr>';
  capaR.clearLayers();
  const capas = lista.map(x => L.geoJSON(x, { style: { color: colorZona(x.properties), weight: 1, fillColor: colorZona(x.properties), fillOpacity: 0.35 } })
    .bindTooltip(`${esc(x.properties.barrio || 'Sin barrio')} · ${num(x.properties.parcelas)} parcelas`).on('click', () => detalleZona(x.properties)).addTo(capaR));
  $('gr-tabla').querySelectorAll('tr[data-i]').forEach(tr => tr.addEventListener('click', () => { mapaR.fitBounds(capas[tr.dataset.i].getBounds()); detalleZona(lista[tr.dataset.i].properties); }));
}
function detalleZona(p) {
  const ctas = p.ctas_ctes || [], pad = p.padrones || [];
  $('gr-detalle').textContent = `${p.barrio || 'Sin barrio'} (${p.osm_id}): ${ctas.length ? `Cta. Cte.: ${ctas.slice(0, 60).join(', ')}${ctas.length > 60 ? ` y ${ctas.length - 60} más` : ''}. ` : ''}${pad.length ? `Padrones: ${pad.slice(0, 60).join(', ')}${pad.length > 60 ? ` y ${pad.length - 60} más` : ''}.` : ''}${!ctas.length && !pad.length ? 'Sin cuentas DNIT vinculadas.' : ''}`;
}
async function cargarResidencial() {
  try {
    resD = await api(`/api/v3/gestion/residencial?${qs()}`);
    mapaR = L.map('gr-mapa').setView([-25.3, -57.6], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapaR);
    capaR = L.featureGroup().addTo(mapaR);
    dibujarResidencial();
    if (capaR.getLayers().length) mapaR.fitBounds(capaR.getBounds());
    $('gr-filtro').addEventListener('change', dibujarResidencial);
    $('gr-buscar').addEventListener('input', dibujarResidencial);
  } catch (e) { msg(e.message, true); }
}

// ─── Inspecciones ─────────────────────────────────────────
function dibujarInspecciones() {
  const ins = datos?.inspecciones || [];
  $('gm-insp').innerHTML = ins.map(x => `<tr><td>${x.id}</td><td>${esc(x.motivo)}${x.ctacte ? `<br><small>${esc(x.ctacte)}</small>` : ''}</td><td>${esc(x.inspector)}</td><td><span class="pf-chip">${esc(x.estado)}</span></td>
    <td>${x.estado === 'realizada' ? `${esc(x.resultado)}${x.observacion ? `<br><small>${esc(x.observacion)}</small>` : ''}`
      : `<select data-id="${x.id}" aria-label="Resultado"><option value="">Registrar…</option><option value="conforme">Conforme</option><option value="intimado">Intimado</option><option value="clausurado">Clausurado</option><option value="no_encontrado">No encontrado</option></select>`}</td></tr>`).join('')
    || '<tr><td colspan="5" class="pf-vacio">Sin inspecciones.</td></tr>';
  $('gm-insp').querySelectorAll('select[data-id]').forEach(s => s.addEventListener('change', async () => {
    if (!s.value) return;
    const observacion = prompt('Observación de la visita (opcional)') || '';
    try { await api(`/api/v3/gestion/inspecciones/${s.dataset.id}?${qs()}`, 'POST', { resultado: s.value, observacion, dpto: amb.dpto, dist: amb.dist }); msg('Resultado registrado.'); await cargarLocales(); } catch (e) { msg(e.message, true); }
  }));
}

// ─── Liquidaciones ────────────────────────────────────────
async function cargarLiquidaciones() {
  const tipo = $('gm-liq-tipo').value;
  try {
    const d = await api(`/api/v3/gestion/liquidaciones?${qs({ tipo, q: $('gm-liq-q').value.trim(), pagina: liqPag })}`);
    const urb = tipo === 'urbano';
    $('gm-liq-cab').innerHTML = urb ? '<tr><th>Cta. Cte.</th><th>Zona-Mz-Lote</th><th>Tierra m²</th><th>Edificado m²</th><th>Valor fiscal</th><th>Impuesto</th><th>70 % municipio</th></tr>'
      : '<tr><th>Padrón</th><th>Tipo</th><th>ha</th><th>Valor fiscal</th><th>Impuesto</th><th>70 % municipio</th></tr>';
    $('gm-liq').innerHTML = d.filas.map(f => urb
      ? `<tr><td>${esc(f.ctacte)}</td><td>${esc([f.zona, f.manzana, f.lote].join('-'))}</td><td>${num(f.superf_tierra_total)}</td><td>${num(f.superf_edif_total)}</td><td>${gs(f.valor_oficial)}</td><td>${gs(f.impuesto_total)}</td><td>${gs(f.impuesto_municipal_70)}</td></tr>`
      : `<tr><td>${esc(f.padron)}</td><td>${esc(f.tipo_propiedad)}</td><td>${num(f.hectareas)}</td><td>${gs(f.valor_oficial)}</td><td>${gs(f.impuesto_total)}</td><td>${gs(f.impuesto_municipal_70)}</td></tr>`).join('')
      || '<tr><td colspan="7" class="pf-vacio">Sin cuentas.</td></tr>';
    const pags = Math.max(1, Math.ceil(d.total / d.por_pagina));
    $('gm-liq-total').textContent = `${num(d.total)} cuentas · página ${d.pagina} de ${pags}`;
    $('gm-liq-ant').disabled = d.pagina <= 1; $('gm-liq-sig').disabled = d.pagina >= pags;
  } catch (e) { msg(e.message, true); }
}

// ─── Planificación y avisos ───────────────────────────────
async function cargarPlanificacion() {
  try {
    const d = await api(`/api/v3/gestion/planificacion?distrito=${encodeURIComponent(amb.nombre.replace(/^Municipalidad de\s+/i, ''))}`);
    $('gm-docs').innerHTML = d.documentos.map(x => `<li><a href="/api/v3/gestion/planificacion/${x.n}" target="_blank" rel="noopener">${esc(x.titulo)} <small>(${(x.bytes / 1048576).toFixed(1)} MB, PDF)</small></a></li>`).join('')
      || '<li class="pf-vacio">No hay documentos de planificación descargados para este municipio.</li>';
  } catch (e) { msg(e.message, true); }
}
async function cargarAvisos() {
  try {
    const d = await api(`/api/v3/gestion/avisos?${qs()}`);
    const n = d.notificaciones || {};
    $('gm-avisos').innerHTML = `<div class="gm-resumen"><div class="gm-res"><b>${num(d.suscriptos)}</b><small>Contribuyentes con teléfono</small></div><div class="gm-res vigente"><b>${num(d.verificados)}</b><small>Teléfonos verificados</small></div>
      <div class="gm-res vencida"><b>${num(n.pendiente)}</b><small>Avisos en cola</small></div><div class="gm-res"><b>${num(n.enviado)}</b><small>Enviados</small></div></div>
      <p class="pf-sub">${d.proveedor ? 'Proveedor de SMS/WhatsApp configurado.' : 'Todavía no hay proveedor de SMS/WhatsApp: los avisos quedan en cola y se envían cuando se configure.'} Los contribuyentes vinculan su teléfono desde el portal ciudadano.</p>`;
  } catch (e) { $('gm-avisos').innerHTML = `<p class="pf-vacio">${esc(e.message)}</p>`; }
}

// ─── Navegación ───────────────────────────────────────────
const cargado = {};
function vista(v) {
  document.querySelectorAll('nav button[data-v]').forEach(b => b.classList.toggle('activo', b.dataset.v === v));
  document.querySelectorAll('section[data-vista]').forEach(s => { s.hidden = s.dataset.vista !== v; });
  if (v === 'locales' && mapa) setTimeout(() => mapa.invalidateSize(), 50);
  if (v === 'residencial' && mapaR) setTimeout(() => mapaR.invalidateSize(), 50);
  if (v === 'usos' && mapaU) setTimeout(() => mapaU.invalidateSize(), 50);
  if (cargado[v]) return; cargado[v] = true;
  if (v === 'usos') cargarUsos();
  if (v === 'residencial') cargarResidencial();
  if (v === 'liquidaciones') cargarLiquidaciones();
  if (v === 'planificacion') cargarPlanificacion();
  if (v === 'avisos') cargarAvisos();
}

async function iniciar() {
  amb = await ambito();
  if (!amb.dpto || !amb.dist) { msg('Inicie sesión con un usuario del municipio (o abra con ?dpto=D&dist=12).', true); return; }
  $('gm-titulo').textContent = `Gestión municipal${amb.nombre ? ` · ${amb.nombre}` : ''}`;
  document.querySelectorAll('nav button[data-v]').forEach(b => b.addEventListener('click', () => vista(b.dataset.v)));
  if (window.L) {
    mapa = L.map('gm-mapa', { zoomControl: true }).setView([-25.3, -57.6], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
    capa = L.layerGroup().addTo(mapa);
    mapa.on('click', e => { const f = $('gm-form'); f.elements.lat.value = e.latlng.lat.toFixed(6); f.elements.lng.value = e.latlng.lng.toFixed(6); ubicar(e.latlng.lat, e.latlng.lng); });
  }
  $('gm-filtro').addEventListener('change', dibujarLocales);
  $('gm-buscar').addEventListener('input', dibujarLocales);
  $('gm-limpiar').addEventListener('click', () => editar(null));
  $('gm-form').addEventListener('submit', async e => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target)); b.inhabilitado = e.target.elements.inhabilitado.checked;
    try { await api(`/api/v3/gestion/locales?${qs()}`, 'POST', { ...b, dpto: amb.dpto, dist: amb.dist }); msg('Local guardado.'); editar(null); await cargarLocales(); } catch (er) { msg(er.message, true); }
  });
  $('gm-form-insp').addEventListener('submit', async e => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(e.target));
    try { await api(`/api/v3/gestion/inspecciones?${qs()}`, 'POST', { ...b, dpto: amb.dpto, dist: amb.dist }); msg('Inspección asignada.'); e.target.reset(); await cargarLocales(); } catch (er) { msg(er.message, true); }
  });
  $('gm-liq-buscar').addEventListener('click', () => { liqPag = 1; cargarLiquidaciones(); });
  $('gm-liq-tipo').addEventListener('change', () => { liqPag = 1; cargarLiquidaciones(); });
  $('gm-liq-ant').addEventListener('click', () => { liqPag--; cargarLiquidaciones(); });
  $('gm-liq-sig').addEventListener('click', () => { liqPag++; cargarLiquidaciones(); });
  try { await cargarLocales(); } catch (e) { msg(e.message, true); }
}
iniciar();
