#!/usr/bin/env node
/**
 * actualizacion-semanal.mjs — Actualización semanal de cuentas DNIT + regeneración del análisis territorial.
 *
 * Flujo:
 *   1. Ejecuta el importador DNIT (node scripts/dnit-cuentas.mjs) con los parámetros indicados.
 *   2. Regenera el análisis territorial (node scripts/analisis-territorial.mjs).
 *   3. Registra la ejecución en logs/actualizacion-semanal.log.
 *
 * Uso:
 *   node scripts/actualizacion-semanal.mjs --todos                       # todo Paraguay (514 planillas)
 *   node scripts/actualizacion-semanal.mjs --departamento Central        # solo Central
 *   node scripts/actualizacion-semanal.mjs --departamento CENTRAL --departamento Cordillera
 *   node scripts/actualizacion-semanal.mjs --todos --solo-db            # solo actualiza BD, sin regen
 *
 * Programar en crontab (cada lunes 02:00) — ruta al proyecto:
 *   0 2 * * 1 cd /ruta/SNC_v3 && node scripts/actualizacion-semanal.mjs --todos >> logs/actualizacion.log 2>&1
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFileSync } from 'node:fs';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = join(RAIZ, 'logs', 'actualizacion-semanal.log');
const TS = new Date().toISOString();

// ─── flags ────────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const TODOS = args.includes('--todos');
const SOLO_DB = args.includes('--solo-db');
const DEPARTAMENTOS = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--departamento' && args[i + 1]) { DEPARTAMENTOS.push(args[++i].toUpperCase()); }
  else if (args[i].startsWith('--departamento=')) DEPARTAMENTOS.push(args[i].split('=').pop().toUpperCase());
}
const DEPARTAMENTOS_LIST = DEPARTAMENTOS.length ? DEPARTAMENTOS : null;

const log = (...l) => {
  const s = `[semanal ${TS}] ` + l.join(' ');
  console.log(s);
  appendFileSync(LOG, s + '\n', { flag: 'a' });
};
const error = (...l) => {
  const s = `[semanal-error ${TS}] ` + l.join(' ');
  console.error(s);
  appendFileSync(LOG, s + '\n', { flag: 'a' });
  process.exitCode = 1;
};

log('=== Inicio actualización semanal ===');

// ─── 1. Importar cuentas DNIT ─────────────────────────────────────────────────────────────────────
const cmd = [TODOS ? '--todos' : '--departamento', ...(DEPARTAMENTOS_LIST || [])].filter(Boolean).join(' ');
log(`Ejecutando: node scripts/dnit-cuentas.mjs ${cmd}`);
try {
  execFileSync(process.execPath, [join(RAIZ, 'scripts', 'dnit-cuentas.mjs'), '--departamento', ...(DEPARTAMENTOS_LIST || []), ...args.filter(a => a !== '--solo-db' && a !== '--departamento')], { stdio: 'inherit', cwd: RAIZ });
} catch (e) {
  error('Fallo en el importador DNIT:', e.message);
}

// ─── 2. Regenerar análisis territorial ────────────────────────────────────────────────────────────
if (!SOLO_DB) {
  log('Regenerando análisis territorial...');
  try {
    execFileSync(process.execPath, [join(RAIZ, 'scripts', 'analisis-territorial.mjs')], { stdio: 'inherit', cwd: RAIZ });
  } catch (e) {
    error('Fallo al regenerar análisis:', e.message);
  }
}

log('=== Fin actualización semanal ===');
