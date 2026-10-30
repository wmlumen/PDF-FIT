/**
 * Base de cuentas catastrales con la liquidación del Impuesto Inmobiliario publicada por la DNIT.
 *
 * Fuente: https://www.dnit.gov.py/web/portal-institucional/liquidación-de-impuestos-inmobiliarios
 * (API pública del portal: GET /o/c/planillageograficas/?pageSize=600 → planillas Excel urbana y rural por distrito).
 * Las planillas traen la LIQUIDACIÓN del ejercicio (valor fiscal e impuesto), sin propietarios y sin estado de pago.
 *
 * Actualización incremental: cada fila se identifica por su clave (urbano: dpto + distrito + Cta. Cte.;
 * rural: dpto + distrito + padrón) y se guarda una huella (SHA-1) de sus valores. Al reimportar solo se
 * insertan las cuentas nuevas, se actualizan las que cambiaron (registrando campo, valor anterior y nuevo en
 * `cambios`) y se marcan como no vigentes las que dejaron de publicarse. Las iguales no se tocan.
 *
 * Módulo de backend (Node). Base aparte del esquema congelado de db.cjs: data/dnit_cuentas.sqlite.
 */
import crypto from 'node:crypto';

export const DNIT_BASE = 'https://www.dnit.gov.py';
export const DNIT_LISTA = `${DNIT_BASE}/o/c/planillageograficas/?pageSize=600`;

// ─── columnas (los nombres varían entre planillas: se normalizan y se usan alias) ───────────────────

export function normalizarEncabezado(h) {
  return String(h ?? '').replace(/^'+/, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/%/g, 'PCT').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export const COLUMNAS = {
  urbano: {
    cod_dpto: ['COD_DPTO', 'DPTO', 'DEPARTAMENTO'],
    departamento: ['DESCRIPCION', 'DESC_DPTO', 'NOMBRE_DPTO'],
    cod_distrito: ['COD_DISTRITO', 'DISTRITO_ID', 'DIST_ID_CIUDAD', 'COD_DIST'],
    distrito: ['DESCRIPCION2', 'DISTRITO', 'DESC_DISTRITO'],
    zona: ['ZONA'], manzana: ['MANZANA', 'MZ'], lote: ['LOTE'], piso: ['PISO'], salon: ['SALON'],
    ctacte: ['CTACTE', 'CTA_CTE', 'CUENTA_CORRIENTE', 'CTA_CTE_CATASTRAL'],
    superf_tierra: ['SUPERF_TIERRA', 'SUPERFICIE_TIERRA'],
    superf_tierra_comun: ['SUPERFICIE_TIERRA_COMUN', 'SUPERF_TIERRA_COMUN'],
    superf_tierra_total: ['SUPERF_TIERRA_TOTAL', 'SUPERFICIE_TIERRA_TOTAL'],
    valor_tierra: ['VALOR_TIERRA'],
    superf_edif_prop: ['SUPERF_EDIF_PROP'], superf_edif_comun: ['SUPERF_EDIF_COMUN'],
    superf_edif_total: ['SUPERF_EDIF_TOTAL'], valor_edificado: ['VALOR_EDIFICADO'],
    valor_oficial: ['VALOR_OFICIAL', 'VAL_OFICIAL'],
    impuesto: ['IMPUESTO', 'IMPUESTO_INMOBILIARIO'], impuesto_adicional: ['IMPUESTO_ADICIONAL'],
    impuesto_total: ['IMPUESTO_TOTAL'],
    impuesto_municipal_70: ['70PCT_DEL_IMPUESTO_INMOBILIARIO', '70PORC_IMP_MUNICIPAL', '70PCT_IMP_MUNICIPAL']
  },
  rural: {
    cod_dpto: ['DEPARTAMENTO', 'COD_DPTO', 'DPTO'],
    cod_distrito: ['DIST_ID_CIUDAD', 'COD_DISTRITO', 'DISTRITO_ID'],
    distrito: ['DISTRITO', 'DESCRIPCION2'],
    padron: ['PADRON'], tipo_propiedad: ['CRUR_TIPO_PROPIEDAD', 'TIPO_PROPIEDAD'],
    hectareas: ['HAS', 'HECTAREAS'], metros2: ['MTS2', 'M2'],
    valor_oficial: ['VAL_OFICIAL', 'VALOR_OFICIAL'],
    impuesto: ['IMPUESTO_INMOBILIARIO_1PCT', 'IMPUESTO_INMOBILIARIO'],
    adicional_rural: ['ADICIONAL_A_INMUEBLE_RURAL', 'ADICIONAL_RURAL'],
    impuesto_total: ['IMP_TOTAL_1PCTVALOF_ADICRURAL', 'IMPUESTO_TOTAL'],
    impuesto_municipal_70: ['70PORC_IMP_MUNICIPAL', '70PCT_IMP_MUNICIPAL']
  }
};

export const CLAVES = { urbano: ['cod_dpto', 'cod_distrito', 'ctacte'], rural: ['cod_dpto', 'cod_distrito', 'padron'] };
const TEXTO = new Set(['cod_dpto', 'departamento', 'distrito', 'ctacte', 'tipo_propiedad']);

/** Ubica la fila de encabezados (la primera que contiene CTACTE o PADRON) y arma el mapa columna → campo. */
export function mapearEncabezados(filas, tipo) {
  const buscado = tipo === 'urbano' ? 'CTACTE' : 'PADRON';
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const norm = (filas[i] || []).map(normalizarEncabezado);
    if (!norm.some(h => h === buscado || (tipo === 'urbano' && COLUMNAS.urbano.ctacte.includes(h)))) continue;
    const mapa = {}, extra = [];
    norm.forEach((h, idx) => {
      if (!h) return;
      const campo = Object.entries(COLUMNAS[tipo]).find(([, alias]) => alias.includes(h))?.[0];
      if (campo && !(campo in mapa)) mapa[campo] = idx; else extra.push([h, idx]);
    });
    return { filaEncabezado: i, mapa, extra };
  }
  throw new Error(`No se encontró la fila de encabezados (${buscado}) en la planilla ${tipo}`);
}

function valor(campo, v) {
  if (v === null || v === undefined) return null;
  if (TEXTO.has(campo)) { const s = String(v).trim(); return s === '' ? null : s.toUpperCase(); }
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  const t = String(v).trim();
  if (t === '') return null;
  // "5471.42" o "5471" (punto decimal) se leen tal cual; "1.234.567,89" (formato es-PY) se convierte.
  const s = /^-?\d+(\.\d+)?$/.test(t) ? t : t.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : String(v).trim();
}

/** Convierte las filas de una hoja en registros normalizados con clave y huella. */
export function normalizarFilas(filas, tipo) {
  const { filaEncabezado, mapa, extra } = mapearEncabezados(filas, tipo);
  const faltan = CLAVES[tipo].filter(c => !(c in mapa));
  if (faltan.length) throw new Error(`Faltan columnas clave en la planilla ${tipo}: ${faltan.join(', ')}`);
  const registros = new Map();
  let descartadas = 0, duplicadas = 0;
  for (const fila of filas.slice(filaEncabezado + 1)) {
    if (!fila || fila.every(c => c === null || c === undefined || c === '')) continue;
    const r = {};
    for (const [campo, idx] of Object.entries(mapa)) r[campo] = valor(campo, fila[idx]);
    if (extra.length) {
      const e = Object.fromEntries(extra.map(([h, idx]) => [h, fila[idx] ?? null]).filter(([, v]) => v !== null && v !== ''));
      if (Object.keys(e).length) r.extra_json = JSON.stringify(e);
    }
    if (CLAVES[tipo].some(c => r[c] === null || r[c] === undefined)) { descartadas++; continue; }
    // Filas de totales o basura: el departamento debe ser una sola letra (Canindeyú usa la S).
    if (!/^[A-Z]$/.test(String(r.cod_dpto))) { descartadas++; continue; }
    if (tipo === 'rural') r.padron = Number(r.padron);
    r.cod_distrito = Number(r.cod_distrito);
    const clave = CLAVES[tipo].map(c => r[c]).join('|');
    if (registros.has(clave)) duplicadas++;
    r.clave = clave;
    r.hash = huella(r);
    registros.set(clave, r);
  }
  return { registros: [...registros.values()], descartadas, duplicadas };
}

export function huella(r) {
  const limpio = Object.fromEntries(Object.entries(r).filter(([k]) => !['hash', 'clave'].includes(k)).sort());
  return crypto.createHash('sha1').update(JSON.stringify(limpio)).digest('hex');
}

/** Diferencias campo a campo entre el registro guardado y el nuevo. */
export function diferencias(antes, despues, campos) {
  const d = {};
  for (const c of campos) {
    const a = antes?.[c] ?? null, b = despues?.[c] ?? null;
    if (a !== b && !(typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 0.005)) d[c] = [a, b];
  }
  return d;
}

/**
 * Plan de cambios para un distrito/tipo: qué insertar, qué actualizar y qué dar de baja.
 * `existentes`: Map clave → {hash, vigente, ...campos}. Puro, para poder probarlo.
 */
export function planificarCambios(existentes, nuevos, campos) {
  const altas = [], modificaciones = [], reactivadas = [];
  let iguales = 0;
  const vistos = new Set();
  for (const r of nuevos) {
    vistos.add(r.clave);
    const e = existentes.get(r.clave);
    if (!e) { altas.push(r); continue; }
    if (e.hash === r.hash) {
      if (e.vigente === 0) reactivadas.push(r); else iguales++;
      continue;
    }
    modificaciones.push({ registro: r, cambios: diferencias(e, r, campos) });
  }
  const bajas = [...existentes.entries()].filter(([k, e]) => !vistos.has(k) && e.vigente !== 0).map(([k]) => k);
  return { altas, modificaciones, reactivadas, bajas, iguales };
}

/** Relación con el catastro: la Cta. Cte. urbana "190001-01/00-000" = zona 19, manzana 0001, lote 01. */
export function partesCtaCte(ctacte) {
  const m = String(ctacte || '').match(/^(\d{2})(\d{4})-(\d{2,4})\/(\d{2})-(\d{3})$/);
  if (!m) return null;
  return { zona: Number(m[1]), manzana: Number(m[2]), lote: Number(m[3]), piso: Number(m[4]), salon: Number(m[5]) };
}

/** Elige las planillas de la lista de la DNIT para un departamento (y opcionalmente un distrito). */
export function seleccionarPlanillas(items, departamento, distrito) {
  const n = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
  const out = [];
  for (const i of items || []) {
    const dep = typeof i.departamento === 'object' ? i.departamento?.name : i.departamento;
    if (n(dep) !== n(departamento)) continue;
    if (distrito && n(i.ciudad) !== n(distrito)) continue;
    for (const [tipo, campo] of [['urbano', 'archivoUrbano'], ['rural', 'archivoRural']]) {
      const href = i[campo]?.link?.href;
      if (href) out.push({ departamento: dep, distrito: String(i.ciudad).trim(), tipo, href, nombre: i[campo]?.name || '', fechaModificacion: i.dateModified || null, itemId: i.id });
    }
  }
  return out;
}

/** Identificador de la planilla de origen: departamento|distrito-planilla|tipo (Asunción viene en 6 planillas). */
export function claveGrupo(departamento, distrito, tipo) {
  const n = x => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
  return `${n(departamento)}|${n(distrito)}|${tipo}`;
}

/**
 * Compara lo publicado hoy por la DNIT con lo ya importado (por href: cada carga nueva tiene otro nombre de
 * archivo con fecha y hora). Devuelve por grupo: 'al_dia', 'nuevo' (nunca importado), 'actualizacion'
 * (hay una planilla publicada que no se importó) o 'retirado' (importado pero ya no publicado).
 * `importadas`: [{departamento, distrito, tipo, href}] de la tabla fuentes.
 */
export function compararPublicacion(publicadas, importadas) {
  const imp = new Map();
  for (const f of importadas) {
    const k = claveGrupo(f.departamento, f.distrito, f.tipo);
    if (!imp.has(k)) imp.set(k, new Set());
    imp.get(k).add(f.href);
  }
  const pub = new Map();
  for (const p of publicadas) {
    const k = claveGrupo(p.departamento, p.distrito, p.tipo);
    if (!pub.has(k)) pub.set(k, { departamento: p.departamento, distrito: p.distrito, tipo: p.tipo, planillas: [] });
    pub.get(k).planillas.push({ href: p.href, nombre: p.nombre, fechaModificacion: p.fechaModificacion });
  }
  const grupos = [];
  for (const [k, g] of pub) {
    const ya = imp.get(k);
    const faltan = g.planillas.filter(p => !ya?.has(p.href));
    grupos.push({ grupo: k, ...g, estado: !ya ? 'nuevo' : faltan.length ? 'actualizacion' : 'al_dia', pendientes: faltan.map(p => p.nombre || p.href) });
  }
  for (const k of imp.keys()) {
    if (!pub.has(k)) { const [departamento, distrito, tipo] = k.split('|'); grupos.push({ grupo: k, departamento, distrito, tipo, estado: 'retirado', planillas: [], pendientes: [] }); }
  }
  const resumen = grupos.reduce((r, g) => (r[g.estado] = (r[g.estado] || 0) + 1, r), {});
  return { resumen, requiereActualizacion: grupos.some(g => g.estado === 'nuevo' || g.estado === 'actualizacion'), grupos };
}

/** Detecta si una hoja es urbana o rural por sus encabezados (hay planillas cargadas en la casilla equivocada). */
export function detectarTipo(filas) {
  for (const t of ['urbano', 'rural']) {
    try { mapearEncabezados(filas, t); return t; } catch { /* probar el otro tipo */ }
  }
  return null;
}


/**
 * Ejercicio fiscal declarado en el título de la planilla ("... para el Ejercicio Fiscal 2026").
 * Solo se busca antes de la fila de encabezados; devuelve null si la planilla no lo declara
 * (en ese caso NO se registra como ningún año: no se adivina por la fecha de publicación).
 */
export function detectarEjercicio(filas) {
  for (const fila of (filas || []).slice(0, 10)) {
    for (const c of fila || []) {
      const m = String(c ?? '').replace(/\s+/g, ' ').match(/Ejercicio\s+Fiscal\s*:?\s*(20\d\d)/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

/** Decide qué hacer con una planilla según su ejercicio y el ejercicio vigente en la base. */
export function modoEjercicio(ejercicio, vigente) {
  if (!Number.isInteger(ejercicio)) return 'rechazar';
  if (vigente == null || ejercicio >= vigente) return 'vigente';   // mismo año (corrección) o año nuevo
  return 'historico';                                               // año anterior: solo para comparar
}
