/**
 * Informe municipal de un lote según su actividad (municipal/informe-lote.html).
 * Reúne lo que el sistema ya tiene del lote: parcela oficial (SNC), liquidación 2026 (DNIT), edificios del mapa
 * (OpenStreetMap, vinculados por edificiosServicio.js), relevamientos dibujados en el visor y área urbana (cascos SNC).
 * Las verificaciones automáticas solo usan esos datos; lo demás queda como «Verificar» para el funcionario.
 * Navegador puro (ESM). Sin estilos en línea (la CSP no los admite).
 */
import { consultaDnit, etiquetaCtaCte, cargarAmbito, parametrosAmbito } from './catastroOficialUI.js';

export const UTM21S = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';
export const LOTE_MINIMO_M2 = 360, FRENTE_MINIMO_M = 12;   // Ley 3966/2010, nuevos fraccionamientos urbanos

/** Área, perímetro y lados de un anillo en metros [[x,y],...]. */
export function medidasLote(anillo) {
  const r = anillo.length > 1 && anillo[0][0] === anillo[anillo.length - 1][0] && anillo[0][1] === anillo[anillo.length - 1][1] ? anillo.slice(0, -1) : anillo;
  let area = 0; const lados = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    area += a[0] * b[1] - b[0] * a[1];
    lados.push({ desde: a, largo: Math.hypot(b[0] - a[0], b[1] - a[1]) });
  }
  return { area: Math.abs(area / 2), perimetro: lados.reduce((s, l) => s + l.largo, 0), lados };
}

/** ¿Punto [lng,lat] dentro de un Polygon/MultiPolygon GeoJSON? (ray casting sobre el anillo exterior). */
export function puntoEnGeom([x, y], g) {
  const polys = g?.type === 'MultiPolygon' ? g.coordinates : g?.type === 'Polygon' ? [g.coordinates] : [];
  return polys.some(p => {
    let dentro = false; const r = p[0];
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  });
}

const ACTIVIDADES = {
  residencial: 'Residencial (vivienda)', comercial: 'Comercial / servicios', industrial: 'Industrial / depósito',
  agropecuaria: 'Agropecuaria / rural', fraccionamiento: 'Fraccionamiento / loteamiento'
};

/**
 * Verificaciones según la actividad. d: { urbano (bool|null), area, ladoMax, edifDnit, construido, faltante, tieneCuenta, esRural }.
 * Resultado: 'Conforme' | 'Observado' | 'Verificar'.
 */
export function verificaciones(actividad, d) {
  const v = [];
  const si = (cond, ok, mal, detalle) => v.push({ item: ok, resultado: cond === null ? 'Verificar' : cond ? 'Conforme' : 'Observado', detalle: cond === false ? mal : detalle });
  si(d.tieneCuenta, 'Inmueble con cuenta en la liquidación 2026', 'El lote no figura en la liquidación DNIT: actualizar el catastro municipal antes de habilitar.', 'Cuenta vigente en la planilla DNIT 2026.');
  if (actividad === 'agropecuaria') {
    si(d.urbano === null ? null : !d.urbano, 'Ubicación fuera del área urbana', 'El lote está dentro del área urbana aprobada: la actividad agropecuaria requiere autorización según la ordenanza.', 'Fuera del área urbana registrada en el SNC.');
  } else {
    si(d.urbano, 'Ubicación dentro del área urbana aprobada', 'El lote está fuera del área urbana registrada en el SNC (o el municipio no la tiene cargada).', 'Dentro del área urbana registrada en el SNC.');
  }
  if (actividad === 'fraccionamiento') {
    si(d.area >= LOTE_MINIMO_M2, `Superficie mínima de ${LOTE_MINIMO_M2} m² (Ley 3966/2010)`, `El lote mide ${Math.round(d.area)} m²: no alcanza el mínimo para nuevos fraccionamientos.`, `${Math.round(d.area)} m².`);
    si(d.ladoMax >= FRENTE_MINIMO_M ? null : false, `Frente mínimo de ${FRENTE_MINIMO_M} m`, `Ningún lado alcanza ${FRENTE_MINIMO_M} m.`, 'Confirmar cuál de los lados da a la calle (el catastro no identifica el frente).');
    v.push({ item: 'Plano de fraccionamiento aprobado por la municipalidad', resultado: 'Verificar', detalle: 'Presentar plano con mensura y aprobación municipal.' });
  } else if (actividad !== 'agropecuaria') {
    si(d.edifDnit == null ? null : d.faltante <= 0, 'Edificación declarada acorde a lo construido', `Se observan ${Math.round(d.faltante)} m² construidos sin declarar: actualizar la liquidación.`, d.construido ? `Construido ${Math.round(d.construido)} m² · declarado ${Math.round(d.edifDnit)} m².` : 'Sin construcciones medidas en el mapa para comparar.');
  }
  if (actividad === 'comercial') {
    si(d.construido > 0 || d.edifDnit > 0 ? true : null, 'Local construido', '', 'Hay edificación registrada o medida.');
    v.push({ item: 'Habilitación municipal del local y patente comercial', resultado: 'Verificar', detalle: 'Según ordenanza de habilitaciones del municipio.' });
    v.push({ item: 'Compatibilidad de uso con el plan de ordenamiento (POUT)', resultado: 'Verificar', detalle: 'Zona comercial o mixta según el POUT vigente.' });
  }
  if (actividad === 'industrial') {
    v.push({ item: 'Compatibilidad de uso con el plan de ordenamiento (POUT)', resultado: 'Verificar', detalle: 'Zona industrial o de servicios según el POUT vigente.' });
    v.push({ item: 'Licencia ambiental (Ley 294/1993 de Evaluación de Impacto Ambiental)', resultado: 'Verificar', detalle: 'Declaración de impacto ambiental del MADES según el tipo de industria.' });
  }
  if (actividad === 'residencial') {
    v.push({ item: 'Permiso de construcción y planos aprobados', resultado: 'Verificar', detalle: 'Contrastar con lo construido medido en este informe.' });
  }
  if (actividad === 'agropecuaria') {
    si(d.esRural ? true : null, 'Inmueble con padrón rural', '', 'Padrón rural en la liquidación.');
    v.push({ item: 'Franjas de protección de cauces hídricos', resultado: 'Verificar', detalle: 'Verificar en campo o con la cartografía hídrica si el lote linda con cursos de agua.' });
  }
  return v;
}

// ─── navegador ───────────────────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n1 = v => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('es-PY', { maximumFractionDigits: 1 }));
const gs = v => (v == null ? '—' : `Gs ${Math.round(Number(v)).toLocaleString('es-PY')}`);
const celda = (l, v, mono = false) => `<div class="info-cell"><div class="label">${esc(l)}</div><div class="value${mono ? ' value-mono' : ''}">${v}</div></div>`;
const pedir = async (u) => { const r = await fetch(u); const d = await r.json().catch(() => ({})); if (!r.ok || d.ok === false) throw Object.assign(new Error(d.error || `Error ${r.status}`), { status: r.status }); return d; };
let mapa = null, cascos = null;

async function generar(f, actividad) {
  const p = f.properties || {};
  $('il-estado').textContent = 'Armando el informe…';
  // Medidas del lote en metros (UTM 21S).
  const g = f.geometry, anillo = (g.type === 'MultiPolygon' ? g.coordinates[0][0] : g.coordinates[0]).map(([lng, lat]) => window.proj4('EPSG:4326', UTM21S, [lng, lat]));
  const m = medidasLote(anillo);
  const centro = anillo.reduce((a, c) => [a[0] + c[0] / anillo.length, a[1] + c[1] / anillo.length], [0, 0]);
  const centroGeo = window.proj4(UTM21S, 'EPSG:4326', centro);
  // Datos en paralelo: liquidación, edificios del distrito, relevamientos y áreas urbanas.
  const q = consultaDnit(p);
  const [dnit, edif, relev, cascosFc, pout] = await Promise.all([
    q ? pedir(`/api/v3/dnit/cuenta?${q}`).catch(() => null) : null,
    pedir(`/api/v3/edificios?dpto=${p.dpto}&dist=${p.dist}`).catch(() => null),
    pedir(`/api/v3/relevamientos?dpto=${p.dpto}&dist=${p.dist}`).catch(() => null),
    cascos ? cascos : fetch('/data/casco_urbano_snc.geojson').then(r => (r.ok ? r.json() : null)).catch(() => null),
    pedir(`/api/v3/pout-ama/punto?lat=${centroGeo[1]}&lng=${centroGeo[0]}`).catch(() => null)
  ]);
  cascos = cascosFc;
  const cs = dnit?.cuentas || [];
  const c0 = cs[0] || null;
  const urbano = cascos ? cascos.features.some(x => Number(x.properties?.dist) === Number(p.dist) && String(x.properties?.dpto) === String(p.dpto) && puntoEnGeom(centroGeo, x.geometry)) : null;
  const municipio = c0?.distrito ? `${c0.distrito}${c0.departamento ? ` (${c0.departamento})` : ''}` : `Departamento ${p.dpto} · Distrito ${p.dist}`;

  // Construcciones: edificios OSM asignados a esta parcela y relevamientos guardados para su cuenta.
  const idp = Number(p.objectid ?? p.id);
  const edificios = (edif?.features || []).filter(e => Number(e.properties.id_parcela) === idp && ['auto', 'manual'].includes(e.properties.estado));
  const ctacte = c0?.ctacte || etiquetaCtaCte(p);
  const relevs = (relev?.relevamientos || []).filter(r => r.ctacte === ctacte);
  const filasC = [
    ...edificios.map(e => ({ origen: `Mapa (OSM ${e.properties.osm_id})`, techo: e.properties.m2, cubierta: e.properties.m2_cubierta, pisos: e.properties.niveles, construido: (e.properties.m2_cubierta ?? e.properties.m2) * (e.properties.niveles || 1) })),
    ...relevs.map(r => ({ origen: `Relevamiento #${r.id} (${r.usuario || '—'}, ${String(r.fecha || '').slice(0, 10)})`, techo: r.m2_techo, cubierta: r.m2_cubierta, pisos: r.niveles, construido: r.construido_m2 }))
  ];
  // Si hay relevamientos, mandan sobre la estimación del mapa (son mediciones hechas por el municipio).
  const construido = relevs.length ? relevs.reduce((a, r) => a + (r.construido_m2 || 0), 0) : filasC.reduce((a, r) => a + (r.construido || 0), 0);
  const edifDnit = c0 && c0.tipo === 'urbano' ? cs.reduce((a, x) => a + (Number(x.superf_edif_total) || 0), 0) : null;
  const faltante = edifDnit == null ? 0 : Math.max(0, construido - edifDnit);

  // ── Volcar al documento
  $('il-municipio').textContent = `Municipalidad de ${municipio}`;
  $('il-id').textContent = ctacte;
  $('il-fecha').textContent = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: 'long', year: 'numeric' });
  $('il-actividad').textContent = ACTIVIDADES[actividad];
  $('il-ident').innerHTML = [
    celda('Cuenta corriente catastral', esc(ctacte), true), celda('Departamento / Distrito', `${esc(p.dpto)} / ${esc(p.dist)}${c0?.distrito ? ` · ${esc(c0.distrito)}` : ''}`),
    celda('Zona · Manzana · Lote', p.zona != null ? `${esc(p.zona)} · ${esc(p.mz)} · ${esc(p.lote)}` : '—', true), celda('Padrón', esc(p.padron ?? c0?.padron ?? '—'), true),
    celda('Finca', esc(p.finca ?? '—'), true), celda('Matrícula', esc(p.nro_matricula ?? '—'), true),
    celda('Clave SNC', esc(p.clave_comparacion ?? '—'), true),
    celda('Situación urbana', urbano === null ? '<span class="status-badge status-pending">Sin dato</span>' : urbano ? '<span class="status-badge status-ok">Dentro del área urbana</span>' : '<span class="status-badge status-alert">Fuera del área urbana</span>')
  ].join('');
  $('il-kpis').innerHTML = [
    ['Superficie del lote', n1(m.area), 'm²', `${n1(m.area / 10000)} ha`], ['Perímetro', n1(m.perimetro), 'm', `${m.lados.length} lados`],
    ['Centro (Este, Norte)', `${Math.round(centro[0])}`, '', `${Math.round(centro[1])} N`],
    ['Lote mínimo', m.area >= LOTE_MINIMO_M2 ? 'Cumple' : 'No cumple', '', `${LOTE_MINIMO_M2} m² (Ley 3966/2010)`]
  ].map(([l, v, u, pie]) => `<div class="kpi-card"><div class="kpi-top"><div class="kpi-label">${esc(l)}</div></div><div class="kpi-value-row"><span class="kpi-value">${esc(v)}</span><span class="kpi-unit">${esc(u)}</span></div><div class="kpi-footer">${esc(pie)}</div></div>`).join('');
  $('il-lados').innerHTML = m.lados.map((l, i) => `<tr><td class="col-lead">${i + 1}</td><td class="col-num">${n1(l.largo)}</td><td class="il-lados">${Math.round(l.desde[0])}, ${Math.round(l.desde[1])}</td></tr>`).join('');
  $('il-dnit').innerHTML = c0 ? [
    celda('Cuentas en el lote', String(cs.length)), celda('Valor fiscal de la tierra', gs(cs.reduce((a, x) => a + (Number(x.valor_tierra) || 0), 0))),
    celda('Valor fiscal edificado', gs(cs.reduce((a, x) => a + (Number(x.valor_edificado) || 0), 0))), celda('Valor fiscal total', gs(cs.reduce((a, x) => a + (Number(x.valor_oficial) || 0), 0))),
    celda('Superficie edificada declarada', edifDnit == null ? '— (rural)' : `${n1(edifDnit)} m²`), celda('Impuesto 2026 (con adicionales)', gs(cs.reduce((a, x) => a + (Number(x.impuesto_total) || 0), 0))),
    celda('Corresponde al municipio (70 %)', gs(cs.reduce((a, x) => a + (Number(x.impuesto_municipal_70) || 0), 0)))
  ].join('') : celda('Liquidación', '<span class="status-badge status-alert">El lote no figura en la liquidación DNIT 2026</span>');
  $('il-construcciones').innerHTML = filasC.length ? filasC.map(r => `<tr><td class="col-lead">${esc(r.origen)}</td><td class="col-num">${n1(r.techo)}</td><td class="col-num">${n1(r.cubierta)}</td><td class="col-num">${esc(r.pisos)}</td><td class="col-num">${n1(r.construido)}</td></tr>`).join('')
    : '<tr><td colspan="5">Sin construcciones medidas (mapa ni relevamientos) para este lote.</td></tr>';
  $('il-comparacion').innerHTML = [
    celda('Construido medido', `${n1(construido)} m²${relevs.length ? ' (relevamiento)' : filasC.length ? ' (estimado del mapa)' : ''}`),
    celda('Declarado en la liquidación', edifDnit == null ? '—' : `${n1(edifDnit)} m²`),
    celda('m² a completar', edifDnit == null ? '—' : faltante > 0 ? `<span class="il-mal">${n1(faltante)} m²</span>` : '<span class="il-ok">0 m²</span>')
  ].join('');

  // POUT (Área Metropolitana): zona, norma del catálogo y afectaciones. La sección solo aparece si el lote está en un POUT cargado.
  $('il-pout-sec').classList.toggle('il-oculto', !pout?.dentro_pout_ama);
  if (pout?.dentro_pout_ama) {
    const z = pout.zona, nm = pout.norma, lista = a => (a?.length ? a.map(esc).join(', ') : '—');
    $('il-pout').innerHTML = [
      celda('Municipio (POUT)', esc(z.municipio)), celda('Zona', `${esc(z.zona)}${pout.codigo ? ` (${esc(pout.codigo)})` : ''}`),
      celda('Categoría', `<span class="il-pout-color" data-color="${esc(z.color)}"></span>${esc(z.categoria)}`),
      ...(nm ? [celda('Altura máxima', esc(nm.altura || '—')), celda('FOS / FOT', `${esc(nm.tasa_ocupacion || '—')} / ${esc(nm.edificabilidad || '—')}`), celda('Retiros', esc(nm.retiros || '—')),
        celda('Usos permitidos', lista(nm.uso_permitido)), celda('Usos condicionados', lista(nm.uso_condicionado)), celda('Usos no permitidos', lista(nm.usos_no_permitidos))]
        : [celda('Norma', '<span class="status-badge status-pending">Ver ordenanza del municipio</span>')]),
      celda('Afectaciones', pout.afectaciones.length ? pout.afectaciones.map(a => `<span class="status-badge status-alert">${esc(a.tipo)}${a.distancia_m != null ? ` · ${a.distancia_m} m` : ''}</span>`).join(' ') : '<span class="status-badge status-ok">Sin afectaciones registradas</span>')
    ].join('');
    $('il-pout').querySelectorAll('.il-pout-color').forEach(e => { e.style.background = e.dataset.color; });
    $('il-pout-fuente').textContent = pout.fuente;
  }
  const checks = verificaciones(actividad, { urbano, area: m.area, ladoMax: Math.max(...m.lados.map(l => l.largo)), edifDnit, construido, faltante, tieneCuenta: cs.length > 0, esRural: c0?.tipo === 'rural' });
  const clase = { Conforme: 'status-ok', Observado: 'status-alert', Verificar: 'status-pending' };
  $('il-checks').innerHTML = checks.map(c => `<tr><td class="col-lead">${esc(c.item)}</td><td class="col-center"><span class="status-badge ${clase[c.resultado]}">${c.resultado}</span></td><td>${esc(c.detalle)}</td></tr>`).join('');
  $('il-act-nota').textContent = `${checks.filter(c => c.resultado === 'Conforme').length} conformes · ${checks.filter(c => c.resultado === 'Observado').length} observadas · ${checks.filter(c => c.resultado === 'Verificar').length} a verificar`;
  $('il-pie').textContent = `Informe de referencia · ${ctacte} · generado ${new Date().toLocaleString('es-PY')} · Fuentes: SNC (catastro.gov.py), DNIT (liquidación 2026), © colaboradores de OpenStreetMap (ODbL).`;
  $('il-informe').classList.remove('il-oculto');
  document.title = `Informe ${ctacte} · ${ACTIVIDADES[actividad]}`;

  // Mapa: lote resaltado, parcelario SNC de fondo y edificios del lote.
  const L = window.L;
  if (!mapa) mapa = L.map('il-mapa', { zoomControl: true, attributionControl: true });
  mapa.eachLayer(l => mapa.removeLayer(l));
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
  L.tileLayer.wms('https://www.catastro.gov.py/geoserver/ows', { layers: 'snc:parcelas_activas', format: 'image/png', transparent: true, version: '1.1.1',
    crs: L.extend({}, L.CRS.EPSG4326, { code: 'CRS:84' }), opacity: 0.6, maxZoom: 21, attribution: 'Catastro © SNC' }).addTo(mapa);
  const lote = L.geoJSON(f, { style: { color: '#b91c1c', weight: 3, fillOpacity: 0.12 } }).addTo(mapa);
  if (edificios.length) L.geoJSON({ type: 'FeatureCollection', features: edificios }, { style: { color: '#b45309', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.5 } }).addTo(mapa);
  mapa.fitBounds(lote.getBounds(), { maxZoom: 19, padding: [30, 30] });
  setTimeout(() => mapa.invalidateSize(), 50);
  $('il-estado').textContent = '';
  history.replaceState(null, '', `?ref=${encodeURIComponent($('il-ref').value)}&act=${actividad}${p.dpto ? `&dpto=${p.dpto}&dist=${p.dist}` : ''}`);
}

async function buscar(ref, actividad, preferido) {
  $('il-lista').innerHTML = ''; $('il-estado').textContent = 'Buscando el lote en el catastro oficial…';
  try {
    await cargarAmbito();   // municipalidad cliente: solo lotes de su distrito
    const fc = await pedir(`/api/v3/oficial/buscar?q=${encodeURIComponent(ref)}${parametrosAmbito()}`);
    const fs = fc.features || [];
    if (!fs.length) { $('il-estado').textContent = 'No se encontró esa referencia en el catastro oficial.'; return; }
    const elegido = preferido ? fs.find(f => String(f.properties.dpto) === preferido.dpto && String(f.properties.dist) === preferido.dist) : null;
    if (fs.length === 1 || elegido) return generar(elegido || fs[0], actividad);
    $('il-estado').textContent = `${fs.length} lotes con esa referencia en distintos distritos: elija uno.`;
    $('il-lista').innerHTML = fs.slice(0, 10).map((f, i) => { const p = f.properties; return `<button type="button" data-i="${i}">Dpto. ${esc(p.dpto)} · Distrito ${esc(p.dist)} · ${esc(etiquetaCtaCte(p))}${p.finca ? ` · Finca ${esc(p.finca)}` : ''}</button>`; }).join('');
    $('il-lista').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { $('il-lista').innerHTML = ''; generar(fs[Number(b.dataset.i)], actividad); }));
  } catch (e) { $('il-estado').textContent = e.message; }
}

if (typeof document !== 'undefined') {
  $('il-form').addEventListener('submit', (e) => { e.preventDefault(); buscar($('il-ref').value.trim(), $('il-act').value); });
  $('btn-imprimir').addEventListener('click', () => window.print());
  const u = new URLSearchParams(location.search);
  if (u.get('act') && ACTIVIDADES[u.get('act')]) $('il-act').value = u.get('act');
  if (u.get('ref')) { $('il-ref').value = u.get('ref'); buscar(u.get('ref'), $('il-act').value, u.get('dpto') ? { dpto: u.get('dpto'), dist: u.get('dist') } : null); }
}
