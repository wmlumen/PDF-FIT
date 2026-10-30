/**
 * Consulta de la base de cuentas DNIT (data/dnit_cuentas.sqlite, ver dnitCuentas.js y scripts/dnit-cuentas.mjs)
 * y detección de actualizaciones pendientes contra lo que la DNIT publica hoy.
 *
 * Solo lectura: la base la escribe únicamente el importador. Módulo de backend (Node).
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DNIT_LISTA, seleccionarPlanillas, compararPublicacion, claveGrupo, partesCtaCte } from './dnitCuentas.js';

const require = createRequire(import.meta.url);
const RUTA_DB = process.env.DNIT_DB || join(dirname(fileURLToPath(import.meta.url)), 'data', 'dnit_cuentas.sqlite');
const AGENTE = 'CatastroPYPro/3 (SNC v3; verificacion de actualizaciones)';
const TTL_LISTA_MS = 15 * 60 * 1000;

class ErrorConsulta extends Error { constructor(m, status = 400) { super(m); this.status = status; } }

let db = null;
function base() {
  if (db) return db;
  if (!existsSync(RUTA_DB)) throw new ErrorConsulta('La base de cuentas DNIT todavía no fue importada (node scripts/dnit-cuentas.mjs)', 503);
  const sqlite3 = require('sqlite3');
  db = new sqlite3.Database(RUTA_DB, sqlite3.OPEN_READONLY);
  return db;
}
const all = (sql, p = []) => new Promise((ok, mal) => base().all(sql, p, (e, r) => e ? mal(e) : ok(r)));

// ─── validación ─────────────────────────────────────────────────────────────────────────────────
export function validarConsulta(q = {}) {
  const out = {};
  if (q.ctacte) {
    const c = String(q.ctacte).trim();
    if (!/^\d{6}-\d{2,4}\/\d{2}-\d{3}$/.test(c)) throw new ErrorConsulta('Cta. Cte. con formato inválido (ej. 190001-01/00-000)');
    out.ctacte = c;
  }
  if (q.padron !== undefined && q.padron !== '') {
    if (!/^\d{1,9}$/.test(String(q.padron))) throw new ErrorConsulta('padron debe ser un número');
    out.padron = Number(q.padron);
  }
  for (const k of ['cod_distrito', 'zona', 'manzana', 'lote']) {
    if (q[k] !== undefined && q[k] !== '') {
      if (!/^\d{1,5}$/.test(String(q[k]))) throw new ErrorConsulta(`${k} debe ser un número`);
      out[k] = Number(q[k]);
    }
  }
  if (q.dpto) {
    const d = String(q.dpto).trim().toUpperCase();
    if (!/^[A-Z]$/.test(d)) throw new ErrorConsulta('dpto debe ser una letra (A a Z)');
    out.dpto = d;
  }
  if (q.distrito) {
    const d = String(q.distrito).trim();
    if (!/^[\p{L}\p{N} .'º°-]{2,60}$/u.test(d)) throw new ErrorConsulta('distrito con caracteres no permitidos');
    out.distrito = d.toUpperCase();
  }
  if (!out.ctacte && out.padron === undefined && !(out.zona !== undefined && out.manzana !== undefined && out.lote !== undefined)) {
    throw new ErrorConsulta('Indique ctacte (urbano), padron (rural) o zona + manzana + lote');
  }
  if (out.padron !== undefined && !(out.cod_distrito !== undefined || out.distrito)) {
    throw new ErrorConsulta('Para un padrón rural indique también cod_distrito o distrito');
  }
  return out;
}

// ─── publicación de la DNIT (con caché) ──────────────────────────────────────────────────────────
let cacheLista = { t: 0, items: null };
async function listaPublicada(fetchImpl = fetch) {
  if (cacheLista.items && Date.now() - cacheLista.t < TTL_LISTA_MS) return cacheLista;
  const r = await fetchImpl(DNIT_LISTA, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new ErrorConsulta(`La DNIT respondió ${r.status} al consultar las planillas publicadas`, 502);
  const d = await r.json();
  cacheLista = { t: Date.now(), items: d.items || [] };
  return cacheLista;
}

/** Estado de actualización: compara lo publicado por la DNIT con lo importado en la base. */
export async function estadoActualizacion({ departamento } = {}, fetchImpl) {
  const { items, t } = await listaPublicada(fetchImpl);
  const deps = departamento ? [departamento]
    : [...new Set(items.map(i => (typeof i.departamento === 'object' ? i.departamento?.name : i.departamento)).filter(Boolean))];
  const publicadas = deps.flatMap(d => seleccionarPlanillas(items, d));
  const importadas = await all("SELECT departamento, distrito, tipo, href, MAX(importado_en) AS importado_en FROM fuentes WHERE href NOT LIKE 'archivo:%' GROUP BY departamento, distrito, tipo, href");
  const filtradas = departamento ? importadas.filter(f => claveGrupo(f.departamento, '', '').split('|')[0] === claveGrupo(departamento, '', '').split('|')[0]) : importadas;
  const cmp = compararPublicacion(publicadas, filtradas);
  const ultima = new Map();
  for (const f of filtradas) {
    const k = claveGrupo(f.departamento, f.distrito, f.tipo);
    if (!ultima.has(k) || f.importado_en > ultima.get(k)) ultima.set(k, f.importado_en);
  }
  for (const g of cmp.grupos) g.ultimaImportacion = ultima.get(g.grupo) || null;
  return {
    consultadoDnit: new Date(t).toISOString(),
    ...cmp,
    comando: cmp.requiereActualizacion
      ? `node scripts/dnit-cuentas.mjs ${departamento ? `--departamento "${departamento}"` : '--todos'}`
      : null
  };
}

/** Busca una cuenta (urbana o rural), con su historial y si su planilla tiene una actualización pendiente. */
export async function consultarCuenta(query, fetchImpl) {
  const q = validarConsulta(query);
  let filas, tipo;
  if (q.padron !== undefined) {
    tipo = 'rural';
    const cond = ['padron = ?'], p = [q.padron];
    if (q.cod_distrito !== undefined) { cond.push('cod_distrito = ?'); p.push(q.cod_distrito); }
    if (q.distrito) { cond.push('UPPER(distrito) = ?'); p.push(q.distrito); }
    if (q.dpto) { cond.push('cod_dpto = ?'); p.push(q.dpto); }
    filas = await all(`SELECT * FROM cuentas_rurales WHERE ${cond.join(' AND ')} LIMIT 20`, p);
  } else {
    tipo = 'urbano';
    const cond = [], p = [];
    if (q.ctacte) { cond.push('ctacte = ?'); p.push(q.ctacte); }
    for (const k of ['zona', 'manzana', 'lote', 'cod_distrito']) if (q[k] !== undefined) { cond.push(`${k} = ?`); p.push(q[k]); }
    if (q.distrito) { cond.push('UPPER(distrito) = ?'); p.push(q.distrito); }
    if (q.dpto) { cond.push('cod_dpto = ?'); p.push(q.dpto); }
    filas = await all(`SELECT * FROM cuentas_urbanas WHERE ${cond.join(' AND ')} LIMIT 20`, p);
  }
  let estado = null;
  try { estado = await estadoActualizacion({}, fetchImpl); } catch (e) { estado = { error: e.message }; }
  const porGrupo = new Map((estado?.grupos || []).map(g => [g.grupo, g]));
  const cuentas = [];
  for (const f of filas) {
    const clave = tipo === 'rural' ? `${f.cod_dpto}|${f.cod_distrito}|${f.padron}` : `${f.cod_dpto}|${f.cod_distrito}|${f.ctacte}`;
    const historial = await all('SELECT operacion, campos_json, fecha FROM cambios WHERE tipo_cuenta = ? AND clave = ? ORDER BY id DESC LIMIT 20', [tipo, clave]);
    const fuente = (await all('SELECT nombre_archivo, fecha_modificacion, importado_en FROM fuentes WHERE id = ?', [f.fuente_id]))[0] || null;
    const g = porGrupo.get(f.grupo);
    const { hash, extra_json, ...datos } = f;
    cuentas.push({
      tipo, ...datos,
      ...(tipo === 'urbano' ? { partes: partesCtaCte(f.ctacte) } : {}),
      extra: extra_json ? JSON.parse(extra_json) : undefined,
      historial: historial.map(h => ({ ...h, campos: h.campos_json ? JSON.parse(h.campos_json) : null, campos_json: undefined })),
      fuente,
      actualizacion: estado?.error
        ? { estado: 'desconocido', motivo: `No se pudo consultar la DNIT: ${estado.error}` }
        : g ? { estado: g.estado, pendientes: g.pendientes, ultimaImportacion: g.ultimaImportacion }
          : { estado: 'retirado', motivo: 'La planilla de esta cuenta ya no figura en la publicación de la DNIT' }
    });
  }
  return {
    encontradas: cuentas.length, cuentas,
    aviso: 'Liquidación del Impuesto Inmobiliario publicada por la DNIT (ejercicio 2026). No informa propietarios ni estado de pago.',
    fuente: 'https://www.dnit.gov.py/web/portal-institucional/liquidaci%C3%B3n-de-impuestos-inmobiliarios'
  };
}

/**
 * Agrega a cada parcela oficial su edificación según la liquidación DNIT (una sola consulta por distrito).
 * Urbanas: suma de superficie edificada de las cuentas del lote (incluye pisos y salones).
 * Rurales: la liquidación rural no informa edificación; se usa la del SNC si existe.
 */
export async function edificacionDeParcelas(fc) {
  const feats = fc?.features || [];
  const grupos = new Map();
  for (const f of feats) {
    const p = f.properties || {};
    if (!/^[A-Z]$/.test(String(p.dpto)) || !Number.isInteger(Number(p.dist))) continue;
    if (p.zona == null || p.mz == null || p.lote == null) continue;
    const k = `${p.dpto}|${Number(p.dist)}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push([Number(p.zona), Number(p.mz), Number(p.lote)]);
  }
  const edif = new Map();
  for (const [k, lotes] of grupos) {
    const [dpto, dist] = k.split('|');
    const unicos = [...new Map(lotes.map(l => [l.join('|'), l])).values()].slice(0, 400);
    const cond = unicos.map(() => '(zona = ? AND manzana = ? AND lote = ?)').join(' OR ');
    const filas = await all(`SELECT zona, manzana, lote, COUNT(*) AS cuentas, SUM(COALESCE(superf_edif_total, 0)) AS edif, MIN(ctacte) AS ctacte
      FROM cuentas_urbanas WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ? AND (${cond}) GROUP BY zona, manzana, lote`, [dpto, Number(dist), ...unicos.flat()]);
    for (const r of filas) edif.set(`${dpto}|${dist}|${r.zona}|${r.manzana}|${r.lote}`, r);
  }
  let conEdif = 0, sinEdif = 0, sinDato = 0;
  for (const f of feats) {
    const p = f.properties || {};
    const r = edif.get(`${p.dpto}|${Number(p.dist)}|${p.zona}|${p.mz}|${p.lote}`);
    if (r) { p.dnit_ctacte = r.ctacte; p.dnit_cuentas = r.cuentas; p.edif_m2 = Math.round((Number(r.edif) || 0) * 10) / 10; p.edificada = p.edif_m2 > 0; }
    else if (Number(p.superficie_edificado) > 0) { p.edif_m2 = Number(p.superficie_edificado); p.edificada = true; p.fuente_edif = 'SNC'; }
    else { p.edificada = null; }
    p.edificada === true ? conEdif++ : p.edificada === false ? sinEdif++ : sinDato++;
  }
  fc.edificacion = { conEdificacion: conEdif, sinEdificacion: sinEdif, sinDato };
  return fc;
}

/** Totales por departamento (cuentas vigentes e impuesto liquidado). */
export async function resumen() {
  const u = await all(`SELECT cod_dpto, departamento, COUNT(*) AS cuentas, COUNT(DISTINCT grupo) AS planillas, ROUND(SUM(impuesto_total)) AS impuesto_total
    FROM cuentas_urbanas WHERE vigente = 1 GROUP BY cod_dpto ORDER BY cod_dpto`);
  const r = await all(`SELECT cod_dpto, COUNT(*) AS cuentas, COUNT(DISTINCT grupo) AS planillas, ROUND(SUM(impuesto_total)) AS impuesto_total
    FROM cuentas_rurales WHERE vigente = 1 GROUP BY cod_dpto ORDER BY cod_dpto`);
  const ultima = (await all('SELECT MAX(importado_en) AS u FROM fuentes'))[0]?.u || null;
  return { ultimaImportacion: ultima, urbanas: u, rurales: r,
    totales: { urbanas: u.reduce((s, x) => s + x.cuentas, 0), rurales: r.reduce((s, x) => s + x.cuentas, 0) } };
}

/** Liquidaciones de un distrito para el municipio: búsqueda por Cta. Cte. o padrón, con paginado. */
export async function listarLiquidaciones({ dpto, dist, q = '', tipo = 'urbano', pagina = 0 }) {
  const d = String(dpto || '').toUpperCase(), n = Number(dist), pg = Math.max(0, Number(pagina) || 0), PAG = 100;
  if (!/^[A-Z]$/.test(d) || !Number.isInteger(n)) throw new ErrorConsulta('Indique dpto y dist');
  const texto = String(q || '').trim().slice(0, 30);
  if (tipo === 'rural') {
    const filtro = /^\d{1,9}$/.test(texto) ? 'AND padron = ?' : '';
    const p = [d, n, ...(filtro ? [Number(texto)] : [])];
    const filas = await all(`SELECT padron, tipo_propiedad, hectareas, metros2, valor_oficial, impuesto_total, impuesto_municipal_70 FROM cuentas_rurales
      WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ? ${filtro} ORDER BY padron LIMIT ${PAG} OFFSET ${pg * PAG}`, p);
    const [t] = await all(`SELECT COUNT(*) AS n FROM cuentas_rurales WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ? ${filtro}`, p);
    return { tipo, filas, total: t.n, pagina: pg, por_pagina: PAG };
  }
  const filtro = texto ? 'AND ctacte LIKE ?' : '';
  const p = [d, n, ...(texto ? [`${texto.replace(/[%_]/g, '')}%`] : [])];
  const filas = await all(`SELECT ctacte, zona, manzana, lote, superf_tierra_total, superf_edif_total, valor_oficial, impuesto_total, impuesto_municipal_70 FROM cuentas_urbanas
    WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ? ${filtro} ORDER BY ctacte LIMIT ${PAG} OFFSET ${pg * PAG}`, p);
  const [t] = await all(`SELECT COUNT(*) AS n FROM cuentas_urbanas WHERE vigente = 1 AND cod_dpto = ? AND cod_distrito = ? ${filtro}`, p);
  return { tipo: 'urbano', filas, total: t.n, pagina: pg, por_pagina: PAG };
}
