#!/usr/bin/env node
/**
 * Importa / actualiza la base de cuentas catastrales con la liquidación del Impuesto Inmobiliario (DNIT).
 *
 * Uso:
 *   node scripts/dnit-cuentas.mjs                          # Cordillera completo
 *   node scripts/dnit-cuentas.mjs --departamento Central
 *   node scripts/dnit-cuentas.mjs --todos                  # todo el Paraguay (514 planillas)
 *   node scripts/dnit-cuentas.mjs --distrito PIRIBEBUY     # un solo distrito
 *   node scripts/dnit-cuentas.mjs --forzar                 # reprocesar aunque la planilla no haya cambiado
 *   node scripts/dnit-cuentas.mjs --archivo liquidacion_2023.xlsx [--ejercicio 2023]   # planilla anterior guardada en disco
 *   node scripts/dnit-cuentas.mjs --consultar 190001-01/00-000 [--distrito PIRIBEBUY]
 *
 * Base: data/dnit_cuentas.sqlite (aparte de snc.sqlite). Solo se escriben las cuentas nuevas, las que
 * cambiaron (con historial en `cambios`) y las que dejaron de publicarse (vigente = 0).
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import XLSX from 'xlsx';
import {
  DNIT_BASE, DNIT_LISTA, COLUMNAS, CLAVES, normalizarFilas, planificarCambios, seleccionarPlanillas, partesCtaCte, claveGrupo, detectarTipo
, detectarEjercicio, modoEjercicio
} from '../dnitCuentas.js';

const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3');
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(`--${n}`); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : d; };
const TODOS = !!opt('todos', false);
const DEPARTAMENTO = TODOS ? null : opt('departamento', 'Cordillera');
const DISTRITO = opt('distrito');
const FORZAR = !!opt('forzar', false);
const ARCHIVO = opt('archivo');
const EJERCICIO = opt('ejercicio') ? Number(opt('ejercicio')) : null;
const RUTA_DB = opt('db', join(RAIZ, 'data', 'dnit_cuentas.sqlite'));
const AGENTE = 'CatastroPYPro/3 (SNC v3; actualización de cuentas catastrales)';
const esperar = ms => new Promise(r => setTimeout(r, ms));

// ─── base de datos ──────────────────────────────────────────────────────────────────────────────
mkdirSync(dirname(RUTA_DB), { recursive: true });
const db = new sqlite3.Database(RUTA_DB);
const run = (sql, p = []) => new Promise((ok, mal) => db.run(sql, p, function (e) { e ? mal(e) : ok(this); }));
const all = (sql, p = []) => new Promise((ok, mal) => db.all(sql, p, (e, r) => e ? mal(e) : ok(r)));

const TABLAS = { urbano: 'cuentas_urbanas', rural: 'cuentas_rurales' };
const CAMPOS = { urbano: Object.keys(COLUMNAS.urbano).concat('extra_json'), rural: Object.keys(COLUMNAS.rural).concat('extra_json') };

async function crearEsquema() {
  await run('PRAGMA journal_mode=WAL');
  await run(`CREATE TABLE IF NOT EXISTS fuentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, departamento TEXT, distrito TEXT, tipo TEXT, nombre_archivo TEXT,
    href TEXT, fecha_modificacion TEXT, sha256 TEXT, filas INTEGER, descartadas INTEGER, duplicadas INTEGER,
    importado_en TEXT DEFAULT (datetime('now')))`);
  for (const tipo of ['urbano', 'rural']) {
    const cols = CAMPOS[tipo].map(c => `${c} ${['cod_distrito', 'zona', 'manzana', 'lote', 'piso', 'salon', 'padron'].includes(c) ? 'INTEGER' : c === 'extra_json' || ['cod_dpto', 'departamento', 'distrito', 'ctacte', 'tipo_propiedad'].includes(c) ? 'TEXT' : 'REAL'}`);
    await run(`CREATE TABLE IF NOT EXISTS ${TABLAS[tipo]} (${cols.join(', ')}, hash TEXT NOT NULL, vigente INTEGER NOT NULL DEFAULT 1, grupo TEXT,
      fuente_id INTEGER REFERENCES fuentes(id), alta_en TEXT DEFAULT (datetime('now')), actualizado_en TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (${CLAVES[tipo].join(', ')}))`);
  }
  // Migración: columna grupo (planilla de origen). Las bajas se calculan por planilla, no por distrito:
  // Asunción pública 6 planillas con el mismo código de distrito.
  for (const tipo of ['urbano', 'rural']) {
    const cols = (await all(`PRAGMA table_info(${TABLAS[tipo]})`)).map(c => c.name);
    if (!cols.includes('grupo')) await run(`ALTER TABLE ${TABLAS[tipo]} ADD COLUMN grupo TEXT`);
    const sinGrupo = await all(`SELECT DISTINCT t.fuente_id, f.departamento, f.distrito, f.tipo FROM ${TABLAS[tipo]} t JOIN fuentes f ON f.id = t.fuente_id WHERE t.grupo IS NULL`);
    for (const f of sinGrupo) await run(`UPDATE ${TABLAS[tipo]} SET grupo = ? WHERE fuente_id = ? AND grupo IS NULL`, [claveGrupo(f.departamento, f.distrito, f.tipo), f.fuente_id]);
    await run(`CREATE INDEX IF NOT EXISTS idx_${TABLAS[tipo]}_grupo ON ${TABLAS[tipo]}(grupo)`);
  }
  await run('CREATE INDEX IF NOT EXISTS idx_urb_ubic ON cuentas_urbanas(cod_dpto, cod_distrito, zona, manzana, lote)');
  await run('CREATE INDEX IF NOT EXISTS idx_urb_ctacte ON cuentas_urbanas(ctacte)');
  await run(`CREATE TABLE IF NOT EXISTS cambios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tipo_cuenta TEXT, clave TEXT, operacion TEXT, campos_json TEXT,
    fuente_id INTEGER REFERENCES fuentes(id), fecha TEXT DEFAULT (datetime('now')))`);
  await run('CREATE INDEX IF NOT EXISTS idx_cambios_clave ON cambios(tipo_cuenta, clave)');
  // Ejercicio fiscal: cada planilla se registra con el año que declara en su título.
  const colsF = (await all('PRAGMA table_info(fuentes)')).map(c => c.name);
  if (!colsF.includes('ejercicio')) {
    await run('ALTER TABLE fuentes ADD COLUMN ejercicio INTEGER');
    // Todo lo importado antes de este cambio es la liquidación 2026 (verificado en los títulos).
    await run('UPDATE fuentes SET ejercicio = 2026 WHERE ejercicio IS NULL');
  }
  await run(`CREATE TABLE IF NOT EXISTS historico_cuentas (
    ejercicio INTEGER NOT NULL, tipo TEXT NOT NULL, clave TEXT NOT NULL, grupo TEXT, cod_dpto TEXT, departamento TEXT,
    cod_distrito INTEGER, distrito TEXT, superficie_m2 REAL, edificado_m2 REAL, valor_oficial REAL, impuesto_total REAL,
    fuente_id INTEGER, PRIMARY KEY (ejercicio, tipo, clave))`);
  await run('CREATE INDEX IF NOT EXISTS idx_hist_distrito ON historico_cuentas(ejercicio, cod_dpto, cod_distrito)');
  const hay = (await all('SELECT COUNT(*) AS n FROM historico_cuentas'))[0].n;
  if (!hay) {
    await run(`INSERT INTO historico_cuentas SELECT 2026, 'urbano', cod_dpto || '|' || cod_distrito || '|' || ctacte, grupo, cod_dpto, departamento,
      cod_distrito, distrito, superf_tierra_total, superf_edif_total, valor_oficial, impuesto_total, fuente_id FROM cuentas_urbanas WHERE vigente = 1`);
    await run(`INSERT INTO historico_cuentas SELECT 2026, 'rural', cod_dpto || '|' || cod_distrito || '|' || padron, grupo, cod_dpto, NULL,
      cod_distrito, distrito, COALESCE(hectareas, 0) * 10000 + COALESCE(metros2, 0), NULL, valor_oficial, impuesto_total, fuente_id FROM cuentas_rurales WHERE vigente = 1`);
  }
}

/** Guarda la foto de un ejercicio para un grupo (reemplaza la anterior del mismo año y grupo). */
async function guardarHistorico(ejercicio, tipo, grupoId, registros, fuenteId) {
  await run('DELETE FROM historico_cuentas WHERE ejercicio = ? AND tipo = ? AND grupo = ?', [ejercicio, tipo, grupoId]);
  for (const r of registros) {
    const sup = tipo === 'urbano' ? r.superf_tierra_total : (Number(r.hectareas) || 0) * 10000 + (Number(r.metros2) || 0);
    await run(`INSERT OR REPLACE INTO historico_cuentas VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [ejercicio, tipo, r.clave, grupoId, r.cod_dpto,
      r.departamento ?? null, r.cod_distrito, r.distrito ?? null, sup ?? null, tipo === 'urbano' ? (r.superf_edif_total ?? null) : null,
      r.valor_oficial ?? null, r.impuesto_total ?? null, fuenteId]);
  }
}

async function ejercicioVigente(departamento, distrito, tipo) {
  return (await all('SELECT MAX(ejercicio) AS e FROM fuentes WHERE departamento = ? AND distrito = ? AND tipo = ?', [departamento, distrito, tipo]))[0]?.e ?? null;
}

// ─── descarga ───────────────────────────────────────────────────────────────────────────────────
async function descargar(url) {
  const r = await fetch(url, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(180000) });
  if (!r.ok) throw new Error(`La DNIT respondió ${r.status} para ${url}`);
  return Buffer.from(await r.arrayBuffer());
}

function filasPlanilla(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
}

// ─── importación de un distrito/tipo ────────────────────────────────────────────────────────────
async function importarGrupo(grupo) {
  let { tipo } = grupo[0];
  const { distrito } = grupo[0];
  const descargas = [];
  for (const p of grupo) {
    const buf = p.archivoLocal ? readFileSync(p.archivoLocal) : await descargar(DNIT_BASE + p.href);
    descargas.push({ ...p, buf, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
    if (!p.archivoLocal) await esperar(800);
  }
  if (!FORZAR) {
    const previas = await all('SELECT sha256 FROM fuentes WHERE departamento = ? AND distrito = ? AND tipo = ? ORDER BY id DESC LIMIT ?',
      [grupo[0].departamento, distrito, tipo, descargas.length]);
    const ya = new Set(previas.map(f => f.sha256));
    if (previas.length === descargas.length && descargas.every(d => ya.has(d.sha256))) {
      return { distrito, tipo, sinCambiosEnFuente: true };
    }
  }
  // El tipo real se toma del contenido: la DNIT tiene planillas rurales en la casilla urbana y viceversa.
  for (const d of descargas) {
    d.filas = filasPlanilla(d.buf);
    d.tipoReal = detectarTipo(d.filas);
    if (!d.tipoReal) throw new Error(`No se reconocen los encabezados de ${d.nombre} (ni urbano ni rural)`);
    d.ejercicio = detectarEjercicio(d.filas) ?? d.ejercicioIndicado ?? null;
    if (d.ejercicioIndicado && detectarEjercicio(d.filas) && detectarEjercicio(d.filas) !== d.ejercicioIndicado) {
      throw new Error(`${d.nombre} declara el ejercicio ${detectarEjercicio(d.filas)}, no ${d.ejercicioIndicado}`);
    }
  }
  const ejercicios = new Set(descargas.map(d => d.ejercicio));
  const ejercicio = descargas[0].ejercicio;
  if (ejercicios.size > 1 || !Number.isInteger(ejercicio)) {
    // Sin año confirmado no se registra nada: así un cambio nunca se mezcla con otro ejercicio.
    return { distrito, tipo, error: `No se pudo confirmar el ejercicio fiscal en el título (${[...ejercicios].join(', ') || 'sin año'}); no se registró` };
  }
  const vigenteAntes = await ejercicioVigente(grupo[0].departamento, distrito, grupo[0].tipo);
  const modo = modoEjercicio(ejercicio, vigenteAntes);
  const tipos = new Set(descargas.map(d => d.tipoReal));
  if (tipos.size > 1) throw new Error('El grupo mezcla planillas urbanas y rurales');
  let aviso = null;
  if (descargas[0].tipoReal !== tipo) {
    aviso = `planilla publicada como ${tipo} pero contiene datos ${descargas[0].tipoReal}`;
    tipo = descargas[0].tipoReal;
  }
  const tabla = TABLAS[tipo];
  // Unir todas las planillas del distrito (puede haber más de una) antes de comparar.
  const registros = new Map();
  let descartadas = 0, duplicadas = 0, fuenteId = null;
  for (const d of descargas) {
    const res = normalizarFilas(d.filas, tipo);
    descartadas += res.descartadas; duplicadas += res.duplicadas;
    for (const r of res.registros) registros.set(r.clave, r);
    // En fuentes va el tipo PUBLICADO por la DNIT (así el control de actualizaciones las reconoce);
    // la tabla destino usa el tipo real detectado por el contenido.
    const f = await run(`INSERT INTO fuentes (departamento, distrito, tipo, nombre_archivo, href, fecha_modificacion, sha256, filas, descartadas, duplicadas, ejercicio)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [d.departamento, distrito, d.tipo, d.nombre, d.href, d.fechaModificacion, d.sha256, res.registros.length, res.descartadas, res.duplicadas, ejercicio]);
    fuenteId = f.lastID;
  }
  const nuevos = [...registros.values()];
  if (!nuevos.length) return { distrito, tipo, error: 'Planilla sin filas válidas' };
  const grupoId = claveGrupo(grupo[0].departamento, distrito, tipo);
  if (modo === 'historico') {
    // Planilla de un año anterior: se guarda para comparar, sin tocar las cuentas vigentes.
    await run('BEGIN');
    try { await guardarHistorico(ejercicio, tipo, grupoId, nuevos, fuenteId); await run('COMMIT'); } catch (e) { await run('ROLLBACK'); throw e; }
    return { distrito, tipo, ejercicio, modo, filas: nuevos.length };
  }
  const filasDb = await all(`SELECT * FROM ${tabla} WHERE grupo = ?`, [grupoId]);
  const existentes = new Map(filasDb.map(f => [CLAVES[tipo].map(c => f[c]).join('|'), f]));
  const plan = planificarCambios(existentes, nuevos, CAMPOS[tipo]);

  const cols = CAMPOS[tipo];
  const marcas = cols.map(() => '?').join(',');
  await run('BEGIN');
  try {
    for (const r of plan.altas) {
      // ON CONFLICT: la cuenta pudo venir antes en otra planilla del mismo distrito; pasa a esta.
      await run(`INSERT INTO ${tabla} (${cols.join(',')}, hash, vigente, fuente_id, grupo) VALUES (${marcas}, ?, 1, ?, ?)
        ON CONFLICT(${CLAVES[tipo].join(', ')}) DO UPDATE SET ${cols.map(c => `${c} = excluded.${c}`).join(', ')}, hash = excluded.hash,
        vigente = 1, fuente_id = excluded.fuente_id, grupo = excluded.grupo, actualizado_en = datetime('now')`, [...cols.map(c => r[c] ?? null), r.hash, fuenteId, grupoId]);
      await run('INSERT INTO cambios (tipo_cuenta, clave, operacion, campos_json, fuente_id) VALUES (?,?,?,?,?)', [tipo, r.clave, 'alta', null, fuenteId]);
    }
    for (const { registro: r, cambios } of plan.modificaciones) {
      await run(`UPDATE ${tabla} SET ${cols.map(c => `${c} = ?`).join(', ')}, hash = ?, vigente = 1, fuente_id = ?, grupo = '${grupoId.replace(/'/g, "''")}', actualizado_en = datetime('now')
        WHERE ${CLAVES[tipo].map(c => `${c} = ?`).join(' AND ')}`, [...cols.map(c => r[c] ?? null), r.hash, fuenteId, ...CLAVES[tipo].map(c => r[c])]);
      await run('INSERT INTO cambios (tipo_cuenta, clave, operacion, campos_json, fuente_id) VALUES (?,?,?,?,?)', [tipo, r.clave, 'modificacion', JSON.stringify(cambios), fuenteId]);
    }
    for (const r of plan.reactivadas) {
      await run(`UPDATE ${tabla} SET vigente = 1, fuente_id = ?, actualizado_en = datetime('now') WHERE ${CLAVES[tipo].map(c => `${c} = ?`).join(' AND ')}`,
        [fuenteId, ...CLAVES[tipo].map(c => r[c])]);
      await run('INSERT INTO cambios (tipo_cuenta, clave, operacion, campos_json, fuente_id) VALUES (?,?,?,?,?)', [tipo, r.clave, 'reactivacion', null, fuenteId]);
    }
    for (const clave of plan.bajas) {
      const partes = clave.split('|');
      const valores = CLAVES[tipo].map((c, i) => (['cod_distrito', 'padron'].includes(c) ? Number(partes[i]) : partes[i]));
      await run(`UPDATE ${tabla} SET vigente = 0, actualizado_en = datetime('now') WHERE ${CLAVES[tipo].map(c => `${c} = ?`).join(' AND ')}`, valores);
      await run('INSERT INTO cambios (tipo_cuenta, clave, operacion, campos_json, fuente_id) VALUES (?,?,?,?,?)', [tipo, clave, 'baja', null, fuenteId]);
    }
    await guardarHistorico(ejercicio, tipo, grupoId, nuevos, fuenteId);
    await run('COMMIT');
  } catch (e) { await run('ROLLBACK'); throw e; }
  return { distrito, tipo, ejercicio, nuevoEjercicio: vigenteAntes != null && ejercicio > vigenteAntes, aviso, planillas: descargas.length, filas: nuevos.length, altas: plan.altas.length, modificaciones: plan.modificaciones.length,
    reactivadas: plan.reactivadas.length, bajas: plan.bajas.length, iguales: plan.iguales, descartadas, duplicadas };
}

// ─── consulta ───────────────────────────────────────────────────────────────────────────────────
async function consultar(ctacte) {
  const filas = await all(`SELECT * FROM cuentas_urbanas WHERE ctacte = ? ${DISTRITO ? 'AND distrito = ?' : ''}`, DISTRITO ? [ctacte, String(DISTRITO).toUpperCase()] : [ctacte]);
  for (const f of filas) {
    const historial = await all('SELECT operacion, campos_json, fecha FROM cambios WHERE tipo_cuenta = ? AND clave = ? ORDER BY id', ['urbano', `${f.cod_dpto}|${f.cod_distrito}|${f.ctacte}`]);
    console.log(JSON.stringify({ ...f, partes: partesCtaCte(f.ctacte), historial }, null, 2));
  }
  if (!filas.length) console.log('Sin resultados para esa Cta. Cte.');
}

// ─── principal ──────────────────────────────────────────────────────────────────────────────────
await crearEsquema();
if (opt('consultar')) { await consultar(String(opt('consultar'))); db.close(); process.exit(0); }

if (ARCHIVO) {
  // Planilla de otro ejercicio guardada en disco (p. ej. pedida a la DNIT): se registra con el año de su título.
  if (DEPARTAMENTO === 'Cordillera' && !args.includes('--departamento') || !DISTRITO || DISTRITO === true) {
    console.error('Con --archivo indique --departamento y --distrito tal como los publica la DNIT (ej. --departamento Cordillera --distrito PIRIBEBUY)');
    process.exit(1);
  }
  const filas = filasPlanilla(readFileSync(ARCHIVO));
  const tipo = detectarTipo(filas);
  if (!tipo) { console.error('No se reconoce la planilla (ni urbana ni rural)'); process.exit(1); }
  const r = await importarGrupo([{ departamento: DEPARTAMENTO, distrito: String(DISTRITO).toUpperCase(), tipo, nombre: basename(ARCHIVO),
    href: `archivo:${basename(ARCHIVO)}`, fechaModificacion: null, archivoLocal: ARCHIVO, ejercicioIndicado: EJERCICIO }]);
  console.log(JSON.stringify(r, null, 2));
  db.close();
  process.exit(r.error ? 1 : 0);
}

const lista = await (await fetch(DNIT_LISTA, { headers: { 'User-Agent': AGENTE }, signal: AbortSignal.timeout(60000) })).json();
const departamentos = TODOS ? [...new Set(lista.items.map(i => (typeof i.departamento === 'object' ? i.departamento?.name : i.departamento)).filter(Boolean))] : [DEPARTAMENTO];
const planillas = departamentos.flatMap(d => seleccionarPlanillas(lista.items, d, DISTRITO === true ? null : DISTRITO));
if (!planillas.length) { console.error(`No hay planillas publicadas para ${DEPARTAMENTO}${DISTRITO ? ' / ' + DISTRITO : ''}`); process.exit(1); }
const grupos = new Map();
for (const p of planillas) { const k = claveGrupo(p.departamento, p.distrito, p.tipo); if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); }
console.log(`DNIT: ${planillas.length} planillas de ${TODOS ? 'todo el Paraguay' : DEPARTAMENTO} en ${grupos.size} grupos → ${RUTA_DB}`);

const resumen = [];
for (const grupo of grupos.values()) {
  try {
    const r = await importarGrupo(grupo);
    resumen.push(r);
    console.log(r.error
      ? `  ${grupo[0].departamento.slice(0, 12).padEnd(12)} ${r.distrito.padEnd(28)} ${r.tipo.padEnd(6)} NO REGISTRADO: ${r.error}`
      : r.modo === 'historico'
      ? `  ${grupo[0].departamento.slice(0, 12).padEnd(12)} ${r.distrito.padEnd(28)} ${r.tipo.padEnd(6)} ejercicio ${r.ejercicio} guardado como histórico (${r.filas} cuentas)`
      : r.sinCambiosEnFuente
      ? `  ${grupo[0].departamento.slice(0, 12).padEnd(12)} ${r.distrito.padEnd(28)} ${r.tipo.padEnd(6)} planilla sin cambios: no se tocó nada`
      : `  ${grupo[0].departamento.slice(0, 12).padEnd(12)} ${r.distrito.padEnd(28)} ${r.tipo.padEnd(6)} ${String(r.filas).padStart(6)} cuentas · altas ${r.altas} · modificadas ${r.modificaciones} · bajas ${r.bajas} · iguales ${r.iguales}${r.descartadas ? ` · filas descartadas ${r.descartadas}` : ''}${r.nuevoEjercicio ? ` · NUEVO EJERCICIO ${r.ejercicio}` : ''}${r.aviso ? ` · AVISO: ${r.aviso}` : ''}`);
  } catch (e) {
    resumen.push({ distrito: grupo[0].distrito, tipo: grupo[0].tipo, error: e.message });
    console.error(`  ${grupo[0].distrito} ${grupo[0].tipo}: ERROR ${e.message}`);
  }
}
const tot = k => resumen.reduce((s, r) => s + (r[k] || 0), 0);
console.log(`Total: ${tot('filas')} cuentas · altas ${tot('altas')} · modificadas ${tot('modificaciones')} · bajas ${tot('bajas')} · iguales ${tot('iguales')} · errores ${resumen.filter(r => r.error).length}`);
const dirRep = join(RAIZ, 'data', 'dnit');
mkdirSync(dirRep, { recursive: true });
writeFileSync(join(dirRep, `reporte_${TODOS ? 'Paraguay' : String(DEPARTAMENTO).replace(/\W+/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`), JSON.stringify(resumen, null, 2));
db.close();
