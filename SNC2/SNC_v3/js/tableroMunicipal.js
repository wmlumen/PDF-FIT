/**
 * Tablero "Gestión catastral del municipio" del portal municipal (/municipal).
 * Muestra lo que el sistema ya sabe del municipio cliente y da acceso directo a las listas de trabajo y herramientas.
 * El municipio sale del ámbito del cliente (?muni=…, recordado); si no hay, el de la demo del portal (Piribebuy).
 * Navegador puro (ESM). Estilos en css/tablero-municipal.css (la CSP no admite atributos style).
 */
import { cargarAmbito } from './catastroOficialUI.js';

// El portal municipal siempre trabaja sobre un municipio: si la sesión no eligió uno, el de la demo.
window.SNCMuniPorDefecto = window.SNCMuniPorDefecto || 'piribebuy';

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = v => (v == null ? '—' : Number(v).toLocaleString('es-PY'));
const gs = v => (v == null ? '—' : Math.abs(v) >= 1e9 ? `Gs ${(v / 1e9).toLocaleString('es-PY', { maximumFractionDigits: 1 })} mil M` : `Gs ${(v / 1e6).toLocaleString('es-PY', { maximumFractionDigits: 1 })} M`);
const pct = (a, b) => (b ? `${(a / b * 100).toLocaleString('es-PY', { maximumFractionDigits: 1 })} %` : '—');

function tarjeta(etiqueta, valor, pie, clase = '') {
  return `<div class="tm-kpi ${clase}"><div class="tm-et">${esc(etiqueta)}</div><div class="tm-val">${valor}</div><div class="tm-pie">${pie}</div></div>`;
}

async function montar() {
  const ancla = document.getElementById('municipal-status-section');
  if (!ancla) return;
  const sec = document.createElement('section');
  sec.className = 'operational-section tm-tablero';
  sec.setAttribute('aria-labelledby', 'tm-titulo');
  sec.innerHTML = '<h3 id="tm-titulo" class="tm-titulo"><i class="fas fa-landmark" aria-hidden="true"></i> Gestión catastral del municipio</h3><p class="tm-nota">Cargando datos del municipio…</p>';
  ancla.before(sec);
  const amb = await cargarAmbito();
  const mods = window.SNCAcceso?.modulos;
  if (Array.isArray(mods) && !mods.includes('tablero_municipal')) { sec.querySelector('.tm-nota').textContent = 'El tablero de gestión no está incluido en el plan del municipio.'; return; }
  if (!amb) { sec.querySelector('.tm-nota').textContent = 'Elija el municipio cliente entrando con ?muni=villa_hayes (o el que corresponda).'; return; }
  let t;
  try {
    const r = await fetch(`/api/v3/municipio/tablero?dpto=${amb.dpto}&dist=${amb.dist}`);
    t = await r.json();
    if (!r.ok) throw new Error(t.error || `Error ${r.status}`);
  } catch (e) { sec.querySelector('.tm-nota').textContent = `No se pudo cargar el tablero: ${e.message}`; return; }
  const L = t.liquidacion, P = t.parcelario, E = t.edificios, R = t.relevamientos;
  const q = `dpto=${amb.dpto}&dist=${amb.dist}`;
  const nombre = t.distrito.nombre ? t.distrito.nombre.charAt(0) + t.distrito.nombre.slice(1).toLowerCase() : amb.nombre;
  sec.innerHTML = `
    <h3 id="tm-titulo" class="tm-titulo"><i class="fas fa-landmark" aria-hidden="true"></i> Gestión catastral · ${esc(nombre)}</h3>
    <p class="tm-nota">${esc(amb.nombre)} · distrito ${esc(t.distrito.id)}. Toda la cartografía del portal se limita a este municipio.</p>
    <div class="tm-grid">
      ${L ? tarjeta('Cuentas en la liquidación 2026', num(L.cuentasUrbanas + L.padronesRurales), `${num(L.cuentasUrbanas)} urbanas · ${num(L.padronesRurales)} rurales`) : ''}
      ${L ? tarjeta('Impuesto 2026 para el municipio', gs(L.municipal70), `70 % de ${gs(L.impuesto)} liquidados`) : ''}
      ${P ? tarjeta('Cuentas sin parcela en el mapa', num(P.cuentasSinParcela), `${gs(P.impuestoSinParcela)} de impuesto sin polígono`, 'tm-alerta') : ''}
      ${P ? tarjeta('Parcelas vinculadas a su cuenta', pct(P.urbanasConCuenta + P.ruralesConCuenta, P.urbanas + P.rurales), `${num(P.parcelas)} parcelas oficiales`) : ''}
      ${E ? tarjeta('Construcciones no declaradas', num(E.noDeclaradas), `${num(E.liquidanMenos)} parcelas liquidan menos de lo construido`, 'tm-alerta') : tarjeta('Construcciones', '—', 'Edificios del mapa todavía en proceso')}
      ${E ? tarjeta('m² a completar', `${num(E.m2ACompletar)} m²`, E.recaudacionPotencial ? `≈ ${gs(E.recaudacionPotencial)} por año (estimado)` : 'según edificios del mapa', 'tm-alerta') : ''}
      ${E ? tarjeta('Edificios para asignar a mano', num(E.pendientes), `${num(E.sinParcela)} edificios fuera de toda parcela`) : ''}
      ${L ? tarjeta('Lotes bajo 360 m²', num(L.lotesBajoMinimo), `de ${num(L.lotesConSuperficie)} lotes propios (Ley 3966/2010)`) : ''}
      ${tarjeta('Relevamientos guardados', num(R.cantidad), R.cantidad ? `${num(R.m2ACompletar)} m² a completar medidos` : 'dibujados en el visor Premium')}
    </div>
    <div class="tm-acciones">
      <button type="button" data-capa="parcelas"><i class="fas fa-border-all" aria-hidden="true"></i> Parcelas con Cta. Cte.</button>
      <button type="button" data-capa="edificios"><i class="fas fa-house" aria-hidden="true"></i> Construcciones a revisar</button>
      <button type="button" data-capa="dibujar"><i class="fas fa-draw-polygon" aria-hidden="true"></i> Medir construcción</button>
      <a href="/municipal/informe-lote.html" target="_blank" rel="noopener"><i class="fas fa-file-lines" aria-hidden="true"></i> Informe del lote</a>
      <a href="/municipal/gestion.html" target="_blank" rel="noopener"><i class="fas fa-store" aria-hidden="true"></i> Gestión: locales, patentes, inspecciones, liquidaciones y planificación</a>
      <a href="/AnalisisTerritorial.html#${encodeURIComponent((t.distrito.nombre || '').toLowerCase())}" target="_blank" rel="noopener"><i class="fas fa-chart-column" aria-hidden="true"></i> Análisis del municipio</a>
    </div>
    <div class="tm-descargas">
      <span>Listas de trabajo (CSV):</span>
      ${t.archivos.sinParcela ? `<a href="/api/v3/municipio/archivo?${q}&tipo=sin_parcela">Cuentas sin parcela</a>` : ''}
      ${t.archivos.diferencias ? `<a href="/api/v3/municipio/archivo?${q}&tipo=diferencias">Diferencias de construcción</a>` : ''}
      <a href="/api/v3/relevamientos?${q}&formato=csv">Relevamientos</a>
    </div>
    <div class="tm-descargas"><a href="/municipal/admin.html">Administración del municipio (usuarios, plan y pagos)</a></div>`;
  // Los botones prenden la capa correspondiente del visor Premium (que ya está en la página).
  sec.querySelectorAll('button[data-capa]').forEach(b => b.addEventListener('click', () => {
    const panel = document.querySelector('.vp-panel'), boton = document.querySelector('.vp-boton');
    if (!panel || !boton) return;
    if (panel.hidden) boton.click();
    const ch = panel.querySelector(`input[data-op="${b.dataset.capa}"]`);
    if (ch && !ch.checked) { ch.checked = true; ch.dispatchEvent(new Event('change')); }
    const m = window.MapEngine?.getMap?.();
    if (m && b.dataset.capa !== 'dibujar' && m.getZoom() < 16) m.setZoom(16);
  }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar, { once: true });
else montar();
