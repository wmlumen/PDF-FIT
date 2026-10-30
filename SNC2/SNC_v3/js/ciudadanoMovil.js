/**
 * Portal Ciudadano — uso en celular y ubicación por GPS (PM-04, PM-05 de docs/PLAN_MEJORA_PRODUCTO_2026-10-27.md).
 *
 * - En pantallas angostas el panel lateral pasa a ser un cajón inferior y el mapa ocupa toda la pantalla.
 * - Recalcula el tamaño del mapa (Leaflet invalidateSize) al cambiar tamaño/orientación y al abrir/cerrar el
 *   cajón: sin esto el mapa queda gris en el celular.
 * - Botón "Mi ubicación": sigue la posición del GPS, dibuja el punto y su radio de precisión, muestra
 *   coordenadas WGS84 y UTM 21S, identifica departamento/distrito/barrio y, si hay parcelas cargadas,
 *   la parcela que contiene el punto.
 *
 * Navegador puro (ESM): sin módulos de Node (AGENTS.md §1).
 */

export const ANCHO_MOVIL = 768;
const UTM21S = '+proj=utm +zone=21 +south +datum=WGS84 +units=m +no_defs';

// ─── funciones puras (probadas en tests/ciudadano-movil.test.mjs) ──────────────────────────────────

/** Convierte lat/lng (WGS84) a UTM 21S. `proj` es proj4 (inyectado para poder probar sin navegador). */
export function aUtm21s(lat, lng, proj) {
  if (!proj || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const [este, norte] = proj('EPSG:4326', UTM21S, [lng, lat]);
  return { este, norte };
}

/** Textos listos para mostrar a partir de una posición del GPS. */
export function formatearUbicacion(lat, lng, precisionM, proj) {
  const utm = aUtm21s(lat, lng, proj);
  const p = Number.isFinite(precisionM) ? Math.round(precisionM) : null;
  return {
    wgs84: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    utm: utm ? `E ${utm.este.toFixed(1)} · N ${utm.norte.toFixed(1)}` : '—',
    precision: p === null ? 'precisión desconocida' : `±${p} m`,
    calidad: p === null ? 'desconocida' : p <= 10 ? 'buena' : p <= 50 ? 'aceptable' : 'baja'
  };
}

/** Mensaje claro para cada error de geolocalización. */
export function mensajeErrorGeo(error, contextoSeguro = true) {
  if (!contextoSeguro) {
    return 'El GPS solo funciona si la página se abre con https:// (o en esta misma PC con localhost). ' +
      'Pida al administrador el enlace seguro del portal.';
  }
  switch (error?.code) {
    case 1: return 'No se dio permiso para usar la ubicación. Habilítelo en el candado de la barra de direcciones ' +
      '(Permisos › Ubicación › Permitir) y vuelva a tocar "Mi ubicación".';
    case 2: return 'No se pudo obtener la ubicación. Active el GPS del celular o salga a un lugar abierto y reintente.';
    case 3: return 'El GPS tardó demasiado en responder. Reintente en unos segundos.';
    default: return 'Este navegador no permite obtener la ubicación.';
  }
}

/** Texto de la ficha de identificación devuelta por /api/spatial-identify. */
export function resumenIdentificacion(data) {
  if (!data || data.ok === false) return 'Ubicación fuera de la cobertura del catastro de referencia.';
  const partes = [data.departamento, data.distrito, data.barrio].filter(Boolean);
  return partes.length ? partes.join(' · ') : 'Sin datos de distrito para este punto.';
}

// ─── navegador ───────────────────────────────────────────────────────────────────────────────────

const esNavegador = typeof window !== 'undefined' && typeof document !== 'undefined';

function esperarMapa(tiempoMax = 15000) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const tick = () => {
      const map = window.MapEngine?.getMap?.() || window.SNCMapa;
      if (map) return resolve(map);
      if (performance.now() - t0 > tiempoMax) return resolve(null);
      setTimeout(tick, 150);
    };
    tick();
  });
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function aviso(texto) {
  const toast = document.getElementById('system-toast');
  const msg = document.getElementById('toast-msg');
  if (!toast || !msg) { console.warn('[ciudadanoMovil]', texto); return; }
  msg.textContent = texto;
  toast.hidden = false;
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => { toast.hidden = true; }, 8000);
}

function montarCajon(map) {
  const panel = document.getElementById('ciudadano-panel');
  if (!panel) return;
  const recalcular = debounce(() => map.invalidateSize({ pan: false }), 120);

  const asa = document.createElement('button');
  asa.type = 'button';
  asa.id = 'cm-asa';
  asa.className = 'cm-asa';
  asa.setAttribute('aria-controls', 'ciudadano-panel');
  asa.setAttribute('aria-expanded', 'false');
  asa.innerHTML = '<span class="cm-asa-barra" aria-hidden="true"></span><span>Buscar y capas</span>';
  panel.prepend(asa);

  const abrir = (si) => {
    document.body.classList.toggle('cm-panel-abierto', si);
    asa.setAttribute('aria-expanded', String(si));
    setTimeout(() => map.invalidateSize({ pan: false }), 260);
  };
  asa.addEventListener('click', () => abrir(!document.body.classList.contains('cm-panel-abierto')));

  const aplicarModo = () => {
    const movil = window.innerWidth <= ANCHO_MOVIL;
    document.body.classList.toggle('cm-movil', movil);
    if (!movil) document.body.classList.remove('cm-panel-abierto');
    recalcular();
  };
  aplicarModo();
  window.addEventListener('resize', debounce(aplicarModo, 150));
  window.addEventListener('orientationchange', () => setTimeout(aplicarModo, 300));
  // Al buscar una parcela en el celular, cerrar el cajón para ver el resultado en el mapa.
  document.getElementById('parcel-search-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.body.classList.contains('cm-movil')) abrir(false);
  });
}

/** Estilo de una parcela del radio del GPS según su edificación (DNIT). */
export function estiloEdificacion(p = {}) {
  if (p.edificada === true) return { color: '#b45309', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 0.55 };
  if (p.edificada === false) return { color: '#15803d', weight: 1.5, fillColor: '#22c55e', fillOpacity: 0.18 };
  return { color: '#64748b', weight: 1, dashArray: '4 3', fillOpacity: 0.05 };
}

export function montarGps(map) {
  const barra = document.getElementById('map-tools');
  if (!barra || !window.L) return;
  const L = window.L;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.id = 'btn-mi-ubicacion';
  boton.className = 'map-selector-btn cm-gps';
  boton.title = 'Mi ubicación (GPS)';
  boton.setAttribute('aria-label', 'Mostrar mi ubicación');
  boton.setAttribute('aria-pressed', 'false');
  boton.innerHTML = '<i class="fas fa-location-crosshairs" aria-hidden="true"></i>';
  barra.prepend(boton);

  const ficha = document.createElement('section');
  ficha.id = 'cm-ficha-gps';
  ficha.className = 'cm-ficha';
  ficha.hidden = true;
  ficha.setAttribute('aria-live', 'polite');
  ficha.innerHTML = `
    <header><strong>Mi ubicación</strong><button type="button" class="cm-cerrar" aria-label="Dejar de seguir mi ubicación">Detener</button></header>
    <dl>
      <dt>Lugar</dt><dd data-c="lugar">Buscando…</dd>
      <dt>Parcela</dt><dd data-c="parcela">—</dd>
      <dt>WGS84</dt><dd data-c="wgs84">—</dd>
      <dt>UTM 21S</dt><dd data-c="utm">—</dd>
      <dt>Precisión</dt><dd data-c="precision">—</dd>
      <dt>En el radio</dt><dd data-c="radio">—</dd>
    </dl>
    <p class="cm-leyenda-edif"><span class="cm-e si">Con edificación</span><span class="cm-e no">Sin edificación</span><span class="cm-e nd">Sin dato</span></p>`;
  (document.getElementById('map')?.parentElement || document.body).appendChild(ficha);
  const set = (c, v) => { const el = ficha.querySelector(`[data-c="${c}"]`); if (el) el.textContent = v; };

  let vigilancia = null, punto = null, radio = null, primera = true, ultimaConsulta = null, ultimoRadio = null;
  // Parcelas oficiales dentro del círculo de precisión, coloreadas por edificación (liquidación DNIT).
  const capaRadio = L.geoJSON(null, {
    style: f => estiloEdificacion(f.properties),
    onEachFeature: (f, l) => {
      const p = f.properties || {};
      l.bindTooltip(`${[p.zona != null ? `Zona ${p.zona} · Mz ${p.mz} · Lote ${p.lote}` : p.padron ? `Padrón ${p.padron}` : 'Parcela', p.dnit_ctacte].filter(Boolean).join(' · ')}<br>${p.edificada === true ? `Con edificación: ${Number(p.edif_m2).toLocaleString('es-PY')} m²` : p.edificada === false ? 'Sin edificación registrada' : 'Sin dato de edificación'}`, { sticky: true });
    }
  });
  const parcelasEnRadio = async (lat, lng, r) => {
    const rr = Math.min(300, Math.max(15, Math.round(r || 30)));
    if (ultimoRadio && map.distance([lat, lng], ultimoRadio.c) < 15 && Math.abs(ultimoRadio.r - rr) < 10) return;
    ultimoRadio = { c: [lat, lng], r: rr };
    try {
      const resp = await fetch(`/api/v3/oficial/parcelas-en-radio?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&radio=${rr}`);
      const fc = await resp.json();
      if (!resp.ok || fc.ok === false) throw new Error(fc.error || `Error ${resp.status}`);
      capaRadio.clearLayers().addData(fc);
      if (!map.hasLayer(capaRadio)) capaRadio.addTo(map);
      radio?.bringToFront?.(); punto?.bringToFront?.();
      const e = fc.edificacion || {};
      set('radio', `${fc.count} parcelas en ${rr} m · ${e.conEdificacion ?? 0} con edificación, ${e.sinEdificacion ?? 0} sin edificación${e.sinDato ? `, ${e.sinDato} sin dato` : ''}`);
    } catch (err) { set('radio', `No se pudieron cargar las parcelas: ${err.message}`); }
  };

  const detener = () => {
    if (vigilancia !== null) navigator.geolocation.clearWatch(vigilancia);
    vigilancia = null;
    punto?.remove(); radio?.remove(); punto = radio = null;
    capaRadio.clearLayers(); capaRadio.remove(); ultimoRadio = null;
    ficha.hidden = true;
    boton.classList.remove('cm-activo');
    boton.setAttribute('aria-pressed', 'false');
  };
  ficha.querySelector('.cm-cerrar').addEventListener('click', detener);

  const identificar = async (lat, lng) => {
    // Consultar solo si se movió más de ~25 m desde la última consulta (evita llamadas en cada lectura del GPS).
    if (ultimaConsulta && map.distance([lat, lng], ultimaConsulta) < 25) return;
    ultimaConsulta = [lat, lng];
    try {
      const r = await fetch(`/api/spatial-identify?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&noGeom=1`);
      set('lugar', resumenIdentificacion(await r.json()));
    } catch {
      set('lugar', 'Sin conexión con el servidor para identificar el lugar.');
    }
    // Parcela oficial del catastro nacional que contiene el punto (js/catastroOficialUI.js, PM-35).
    if (window.CatastroOficial?.parcelaEnPunto) {
      try {
        const f = await window.CatastroOficial.parcelaEnPunto(lat, lng);
        set('parcela', window.CatastroOficial.resumenParcela(f?.properties));
        return;
      } catch { /* sin conexión con el catastro oficial: se usan las parcelas cargadas */ }
    }
    // Parcela cargada en el mapa que contiene el punto (si hay datos del municipio o del expediente).
    try {
      const fc = window.State?.get?.('geojson');
      const turf = window.turf;
      if (fc?.features?.length && turf) {
        const pt = turf.point([lng, lat]);
        const f = fc.features.find(x => x.geometry && /Polygon/.test(x.geometry.type) && turf.booleanPointInPolygon(pt, x));
        const p = f?.properties || {};
        set('parcela', f ? [p.PADRON || p.padron, p.CODIGO || p.ccatastral, p.LOTE || p.lote].filter(Boolean).join(' · ') || 'Parcela sin código' : 'Fuera de las parcelas cargadas');
        if (f && window.State?.set) window.State.set('selectedFeature', f);
      }
    } catch { /* turf o State no disponibles: se omite la parcela */ }
  };

  const enPosicion = (pos) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const t = formatearUbicacion(lat, lng, accuracy, window.proj4);
    set('wgs84', t.wgs84); set('utm', t.utm); set('precision', `${t.precision} (${t.calidad})`);
    if (!punto) {
      radio = L.circle([lat, lng], { radius: accuracy, color: '#2563eb', weight: 2, fillOpacity: 0.06, interactive: false }).addTo(map);
      punto = L.circleMarker([lat, lng], { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map);
    } else {
      punto.setLatLng([lat, lng]); radio.setLatLng([lat, lng]).setRadius(accuracy);
    }
    if (primera) {
      primera = false;
      // Si el mapa está acotado al municipio del cliente y la ubicación cae afuera, se libera el encuadre:
      // si no, el mapa queda trabado en el borde y no coincide con lo que dice la ficha.
      const lim = map.options.maxBounds;
      if (lim && !L.latLngBounds(lim).contains([lat, lng])) {
        map._limitesAntesGps = lim; map.setMaxBounds(null);
        aviso('Su ubicación está fuera del municipio de este visor: se liberó el encuadre para mostrarla.');
      }
      map.setView([lat, lng], Math.max(map.getZoom(), accuracy > 100 ? 15 : 18));
    }
    // Sin GPS (computadora con WiFi o red) la precisión es de cientos de metros: no se puede afirmar la parcela.
    const aproximada = accuracy > 50;
    ficha.classList.toggle('cm-aproximada', aproximada);
    identificar(lat, lng, aproximada);
    parcelasEnRadio(lat, lng, accuracy);
    if (aproximada) set('precision', `${t.precision} (${t.calidad}) · ubicación aproximada por red, no es GPS`);
  };

  const enError = (err) => {
    aviso(mensajeErrorGeo(err, window.isSecureContext));
    detener();
  };

  boton.addEventListener('click', () => {
    if (vigilancia !== null) {               // segundo toque: volver a centrar en mi posición
      if (punto) map.setView(punto.getLatLng(), Math.max(map.getZoom(), 18));
      return;
    }
    if (!window.isSecureContext || !('geolocation' in navigator)) {
      aviso(mensajeErrorGeo(null, window.isSecureContext));
      return;
    }
    primera = true; ultimaConsulta = null;
    ficha.hidden = false;
    set('lugar', 'Buscando señal del GPS…'); set('parcela', '—');
    boton.classList.add('cm-activo');
    boton.setAttribute('aria-pressed', 'true');
    if (document.body.classList.contains('cm-movil')) document.body.classList.remove('cm-panel-abierto');
    vigilancia = navigator.geolocation.watchPosition(enPosicion, enError,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  });
}

if (esNavegador) {
  // El cajón móvil es propio del portal ciudadano; en las demás páginas el GPS lo monta js/visorPremium.js.
  const iniciar = async () => {
    if (!location.pathname.startsWith('/ciudadano')) return;
    const map = await esperarMapa();
    if (!map) return;
    montarCajon(map);
    montarGps(map);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}
