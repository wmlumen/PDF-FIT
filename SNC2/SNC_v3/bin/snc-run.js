#!/usr/bin/env node
/**
 * snc-run.js — CLI centralizado de ejecución para SNC_v3
 *
 * Unifica todos los comandos de ejecución en un solo punto de entrada.
 *
 * Uso:
 *   node bin/snc-run.js start [port]     Iniciar servidor API
 *   node bin/snc-run.js dev              Modo desarrollo (Vite)
 *   node bin/snc-run.js build            Construir producción
 *   node bin/snc-run.js test [filter]    Ejecutar tests
 *   node bin/snc-run.js lint             Verificar código
 *   node bin/snc-run.js fix              Corregir código
 *   node bin/snc-run.js format           Formatear código
 *   node bin/snc-run.js typecheck        Verificar tipos
 *   node bin/snc-run.js backup [dir]     Hacer backup de la base de datos
 *   node bin/snc-run.js restore [file]   Restaurar base de datos
 *   node bin/snc-run.js help             Ayuda
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SCRIPTS = join(ROOT, 'scripts');
const TESTS = join(ROOT, 'tests');
const SERVER = join(ROOT, 'server-api.js');
const DEFAULT_PORT = 5556;

function help() {
  console.log(`
SNC_v3 — CLI de ejecución

Modos de ejecución:
  start [port]     Iniciar servidor API en http://localhost:PORT
  dev              Modo desarrollo (Vite)
  build            Construir producción (Vite)
  preview          Servir la build de producción
  test [filter]    Ejecutar tests (opcional: filtro por nombre)
  lint             Verificar código (ESLint)
  fix              Corregir código (ESLint --fix)
  format           Formatear código (Prettier)
  typecheck        Verificar tipos (TypeScript)
  audit:sync       Sincronizar auditoría
  audit:graph      Generar grafo de auditoría
  graph:refresh    Actualizar grafo
  backup [dir]     Hacer backup de la base de datos
  restore [file]   Restaurar base de datos
  rotate           Rotar hashes legacy
  help             Mostrar esta ayuda

Ejemplos:
  node bin/snc-run.js start 5556
  node bin/snc-run.js test dnit
  node bin/snc-run.js backup data/
`);
}

function runCommand(cmd, args, options = {}) {
  const { stdio = 'inherit' } = options;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio, shell: process.platform === 'win32' });
    child.on('close', (code) => resolve(code ?? 0));
    child.on('error', () => resolve(1));
  });
}

async function cmdStart(args) {
  const port = args[0] || process.env.PORT || DEFAULT_PORT;
  console.log(`🚀 Iniciando servidor API en http://localhost:${port}...`);
  const code = await runCommand('node', [SERVER], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdDev() {
  console.log('🔧 Modo desarrollo (Vite)...');
  const code = await runCommand('npx', ['vite'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdBuild() {
  console.log('📦 Construyendo producción...');
  const code = await runCommand('npx', ['vite', 'build'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdPreview() {
  console.log('👀 Preview de la build...');
  const code = await runCommand('npx', ['firebase', 'hosting:channel:deploy', 'preview'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdTest(args) {
  console.log('🧪 Ejecutando tests...');
  const filter = args[0];
  let testArgs = ['--test'];
  if (filter) {
    const fs = require('node:fs');
    const path = require('node:path');
    let matches = [];
    try {
      const files = fs.readdirSync(TESTS);
      matches = files.filter((f) => f.endsWith('.test.mjs') && f.includes(filter));
    } catch {}
    if (matches.length === 0) {
      console.error(`❌ No se encontraron tests para "${filter}"`);
      process.exit(1);
    }
    testArgs = matches.map((f) => path.join(TESTS, f));
  }
  const code = await runCommand('node', testArgs, { stdio: 'inherit' });
  process.exit(code);
}

async function cmdLint() {
  console.log('🔍 Verificando código...');
  const code = await runCommand('npx', ['eslint', '.', '--ext', '.js,.mjs,.cjs'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdFix() {
  console.log('🛠️  Corrigiendo código...');
  const code = await runCommand('npx', ['eslint', '.', '--ext', '.js,.mjs,.cjs', '--fix'], { stdio: 'inherit' });
  const code2 = await runCommand('npx', ['prettier', '--write', '.'], { stdio: 'inherit' });
  process.exit(code || code2);
}

async function cmdFormat() {
  console.log('✨ Formateando código...');
  const code = await runCommand('npx', ['prettier', '--write', '.'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdTypecheck() {
  console.log('📐 Verificando tipos...');
  const code = await runCommand('npx', ['tsc', '--noEmit'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdAuditSync() {
  console.log('🔄 Sincronizando auditoría...');
  const code = await runCommand('node', [join(SCRIPTS, 'sync-auditoria.mjs')], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdAuditGraph() {
  console.log('📊 Generando grafo de auditoría...');
  const code = await runCommand('python', ['scripts/graphify_index_docs.py', '--all'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdGraphRefresh() {
  console.log('🔄 Actualizando grafo...');
  const code1 = await runCommand('graphify', ['update', '.'], { stdio: 'inherit' });
  const code2 = await runCommand('npm', ['run', 'audit:graph'], { stdio: 'inherit' });
  process.exit(code1 || code2);
}

async function cmdBackup(args) {
  console.log('💾 Haciendo backup de la base de datos...');
  const dir = args[0] || 'backups';
  mkdirSync(dir, { recursive: true });
  const code = await runCommand('bash', ['scripts/backup_sqlite.sh'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdRestore(args) {
  console.log('📂 Restaurando base de datos...');
  const code = await runCommand('bash', ['scripts/restore_sqlite.sh'], { stdio: 'inherit' });
  process.exit(code);
}

async function cmdRotate() {
  console.log('🔄 Rotando hashes legacy...');
  const code = await runCommand('bash', ['scripts/rotate_legacy_hashes.sh'], { stdio: 'inherit' });
  process.exit(code);
}

const commands = {
  start: cmdStart,
  dev: cmdDev,
  build: cmdBuild,
  preview: cmdPreview,
  test: cmdTest,
  lint: cmdLint,
  fix: cmdFix,
  format: cmdFormat,
  typecheck: cmdTypecheck,
  'audit:sync': cmdAuditSync,
  'audit:graph': cmdAuditGraph,
  'graph:refresh': cmdGraphRefresh,
  backup: cmdBackup,
  restore: cmdRestore,
  rotate: cmdRotate,
  help: () => help(),
};

const args = process.argv.slice(2);
const command = args[0] || 'help';

if (!commands[command]) {
  console.error(`❌ Comando desconocido: ${command}`);
  help();
  process.exit(1);
}

await commands[command](args.slice(1));
