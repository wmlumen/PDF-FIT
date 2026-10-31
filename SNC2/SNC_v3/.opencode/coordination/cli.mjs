#!/usr/bin/env node
/**
 * cli.mjs — CLI de coordinación multi-IA para SNC_v3 (AGENTS.md §2).
 *
 * Expone por terminal lo que ya existe como librería en coordinator.mjs
 * (locks con TTL, registro de errores, skills/changelogs) más una búsqueda
 * de rutas sobre graphify-out/graph.json (graphClient.mjs) combinada con
 * la matriz de dominios de AGENTS.md §3.
 *
 * Uso (ejecutar siempre desde la raíz del repo, SNC_v3/):
 *   node .opencode/coordination/cli.mjs route "descripcion de lo que te pidieron"
 *   node .opencode/coordination/cli.mjs check "nombre_tarea" js/archivo.js [otro.js...]
 *   node .opencode/coordination/cli.mjs lock js/archivo.js [otro.js...] [--task=nombre_tarea]
 *   node .opencode/coordination/cli.mjs pass "nombre_tarea" "descripcion de la solucion" js/archivo.js [...]
 *   node .opencode/coordination/cli.mjs fail "nombre_tarea" "motivo exacto por el que fallo"
 *   node .opencode/coordination/cli.mjs status
 *
 * Toda la identidad del agente se da con --agent=Nombre (Claude, Antigravity, Hermes,
 * OpenCode, Codex, ...). Si se omite, se usa la variable de entorno SNC_AGENT_NAME,
 * y en último caso un nombre genérico con un aviso — pero entonces los locks no quedan
 * bien atribuidos a quién los tiene, así que conviene pasarlo siempre.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GraphCoordinator } from './coordinator.mjs';

const ROOT = process.cwd();
const COORD_DIR = join(ROOT, '.opencode', 'coordination');
const LOCKS_FILE = join(COORD_DIR, 'locks.jsonl');
const ERRORS_FILE = join(COORD_DIR, 'errors.jsonl');
const SKILLS_FILE = join(COORD_DIR, 'skills.json');

if (!existsSync(join(ROOT, 'server-api.js')) || !existsSync(join(ROOT, 'AGENTS.md'))) {
  console.warn('⚠️  No parece que estés en la raíz de SNC_v3 (no se encontró server-api.js / AGENTS.md junto a process.cwd()).');
  console.warn('    Los locks y el registro de errores se leen/escriben relativos al directorio actual: ejecutá esto desde la raíz del repo.');
}

// ── Matriz de dominios (AGENTS.md §3) — mantener sincronizada a mano ──
// Cada entrada suma puntos si la descripción/tarea menciona el dominio, el archivo
// principal, alguno de los secundarios, o una palabra clave típica de ese dominio.
const DOMINIOS = [
  { dominio: 'Validación Catastral SNC', principal: 'js/validator.js', secundarios: ['js/topology.worker.js', 'js/config.js'], test: 'npm test (tests/validator.test.mjs)', claves: ['validar', 'validacion', 'snc', 'anexo', '551'] },
  { dominio: 'Módulo Municipal (Ley 3966)', principal: 'js/municipal.js', secundarios: ['js/municipalClient.js', 'index-municipal.html'], test: 'tests/workflow.test.mjs', claves: ['municipal', '3966', 'junta municipal', 'fraccionamiento'] },
  { dominio: 'Motor de Mapas / Leaflet', principal: 'js/mapEngine.js', secundarios: ['js/layerGuard.js', 'js/paraguayRef.js'], test: 'tests/geometry-history.test.mjs', claves: ['mapa', 'leaflet', 'capa', 'layer'] },
  { dominio: 'Importación / Parsers', principal: 'js/parser.js', secundarios: ['js/config.js'], test: 'tests/workflow.test.mjs', claves: ['importar', 'parser', 'parsear', 'shp', 'dxf', 'kml'] },
  { dominio: 'Exportación (PDF/SHP/KML)', principal: 'js/export.js', secundarios: ['js/exportFormats.js'], test: 'tests/export.test.mjs', claves: ['exportar', 'export', 'pdf', 'shapefile', 'kml', 'zip'] },
  { dominio: 'Tabla de Atributos', principal: 'js/dataTable.js', secundarios: ['js/state.js'], test: 'tests/workflow.test.mjs', claves: ['tabla', 'atributos', 'dataTable'] },
  { dominio: 'Topología y COGO', principal: 'js/geoprocessing.js', secundarios: ['js/cogo.js', 'js/topologyRepair.js'], test: 'tests/geoprocessing.test.mjs', claves: ['topologia', 'cogo', 'geoproceso', 'reparar geometria'] },
  { dominio: 'Backend API y Base de Datos', principal: 'server-api.js', secundarios: ['db.cjs', 'cacheDb.js'], test: 'tests/api-security.test.mjs', claves: ['api', 'servidor', 'backend', 'base de datos', 'endpoint', 'ruta'] },
  { dominio: 'Portal Ciudadano', principal: 'ciudadano/index.html', secundarios: ['js/app-ciudadano.js', 'server-api.js'], test: 'Ver docs/PLAN_PORTAL_CIUDADANO.md', claves: ['ciudadano', 'portal ciudadano'] },
  { dominio: 'Frontend Entry Point', principal: 'js/app.js', secundarios: ['js/app/index.js', 'index.html'], test: 'npm run build', claves: ['frontend', 'entry point', 'app.js'] },
  { dominio: 'Paquetes de datos para informes/libros (Quarto)', principal: 'reportesDatosServicio.js', secundarios: ['docs/CONVENCION_DATOS_REPORTES.md'], test: 'tests/reportes-datos.test.mjs', claves: ['informe', 'reporte', 'quarto', 'libro', 'articulo'] }
];

function normaliza(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function puntajeDominio(d, textoNorm) {
  let score = 0;
  const campos = [d.dominio, d.principal, ...d.secundarios, ...d.claves];
  for (const campo of campos) {
    const partes = normaliza(campo).split(/[\s/._-]+/).filter(w => w.length > 2);
    for (const parte of partes) {
      if (textoNorm.includes(parte)) score++;
    }
  }
  return score;
}

async function cmdRoute(args) {
  const descripcion = args.join(' ').trim();
  if (!descripcion) { console.error('❌ Uso: route "descripcion de lo que te pidieron"'); process.exit(1); }
  const textoNorm = normaliza(descripcion);

  const ranking = DOMINIOS.map(d => ({ d, score: puntajeDominio(d, textoNorm) })).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

  console.log(`\n🧭 Ruteo para: "${descripcion}"\n`);

  if (ranking.length) {
    const top = ranking[0].d;
    console.log(`Dominio (matriz AGENTS.md §3): ${top.dominio}`);
    console.log(`  Archivo principal:    ${top.principal}`);
    console.log(`  Archivos de apoyo:    ${top.secundarios.join(', ')}`);
    console.log(`  Test:                 ${top.test}`);
    if (ranking[1] && ranking[1].score >= ranking[0].score * 0.7) {
      console.log(`  (también podría ser: ${ranking[1].d.dominio} — revisar si no encaja del todo)`);
    }
  } else {
    console.log('Sin coincidencia clara en la matriz de dominios de AGENTS.md §3.');
  }

  // Búsqueda complementaria en el grafo AST (graphify-out/graph.json): funciones/archivos por nombre.
  try {
    const { getGraphClient } = await import('./graphClient.mjs');
    const client = await getGraphClient();
    const terminos = textoNorm.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
    const vistos = new Set();
    const archivos = [];
    for (const t of terminos) {
      for (const n of client.search(t, { limit: 8 })) {
        if (n.source_file && !vistos.has(n.source_file)) { vistos.add(n.source_file); archivos.push(n.source_file); }
      }
    }
    if (archivos.length) {
      console.log(`\nArchivos que mencionan términos de la descripción (grafo AST, hasta 10):`);
      archivos.slice(0, 10).forEach(f => console.log(`  - ${f}`));
    }
  } catch (e) {
    console.log(`\n(No se pudo consultar graphify-out/graph.json: ${e.message}. Corré "npm run audit:graph" si hace falta regenerarlo.)`);
  }
  console.log('');
}

function leerAgente(flags) {
  const agente = flags.agent || process.env.SNC_AGENT_NAME || process.env.AGENT_NAME;
  if (agente) return agente;
  console.warn('⚠️  Sin --agent=Nombre ni $SNC_AGENT_NAME: los locks van a quedar atribuidos a "agente-sin-nombre".');
  console.warn('    Usá, por ejemplo: node .opencode/coordination/cli.mjs lock js/archivo.js --agent=Claude');
  return 'agente-sin-nombre';
}

function leerLocksActivos() {
  if (!existsSync(LOCKS_FILE)) return [];
  const ahora = Date.now();
  return readFileSync(LOCKS_FILE, 'utf8').trim().split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(l => l && typeof l === 'object' && !Array.isArray(l) && l.status === 'active' && l.expires > ahora);
}

async function cmdCheck(args, flags) {
  const [tarea, ...archivos] = args;
  if (!tarea || !archivos.length) { console.error('❌ Uso: check "nombre_tarea" archivo1.js [archivo2.js ...]'); process.exit(1); }
  const agente = leerAgente(flags);

  console.log(`\n🔎 check "${tarea}" (agente: ${agente})\n`);

  const activos = leerLocksActivos();
  let algunBloqueado = false;
  for (const archivo of archivos) {
    const lock = activos.find(l => l.resource === archivo && l.agent !== agente);
    if (lock) {
      algunBloqueado = true;
      console.log(`🔒 BLOQUEADO: ${archivo} — lo tiene "${lock.agent}" hasta ${new Date(lock.expires).toISOString()}. ¡No lo toques! Esperá o avisale al usuario.`);
    } else {
      console.log(`✅ Libre: ${archivo}`);
    }
  }

  // Memoria de errores: tareas con el mismo nombre (o muy parecido) que ya fallaron y siguen sin resolver.
  if (existsSync(ERRORS_FILE)) {
    const errores = readFileSync(ERRORS_FILE, 'utf8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(e => e && typeof e === 'object' && !Array.isArray(e));
    const tareaNorm = normaliza(tarea);
    const relacionados = errores.filter(e => !e.resolved && normaliza(e.task || '').includes(tareaNorm.slice(0, 12)));
    if (relacionados.length) {
      console.log(`\n⚠️  Ya se intentó algo parecido a "${tarea}" y no quedó resuelto:`);
      relacionados.forEach(e => console.log(`   - [${e.agent}] ${e.task}: ${e.error}`));
    }
  }
  console.log(algunBloqueado ? '\n→ Hay archivos bloqueados: no los edites sin avisar al usuario.\n' : '\n→ Todo libre para este check.\n');
}

async function cmdLock(args, flags) {
  const archivos = args.filter(a => !a.startsWith('--'));
  if (!archivos.length) { console.error('❌ Uso: lock archivo1.js [archivo2.js ...] [--task=nombre_tarea] [--agent=Nombre]'); process.exit(1); }
  const agente = leerAgente(flags);
  const coord = new GraphCoordinator(agente);

  for (const archivo of archivos) {
    try {
      const id = await coord.acquireLock(archivo);
      console.log(`🔒 Lock adquirido: ${archivo} (id ${id}, agente ${agente}, expira en 5 min salvo que lo liberes con "pass")`);
    } catch (e) {
      console.error(`❌ No se pudo bloquear ${archivo}: ${e.message}`);
      process.exit(1);
    }
  }
}

async function cmdPass(args, flags) {
  const [tarea, descripcion, ...archivos] = args;
  if (!tarea || !descripcion) { console.error('❌ Uso: pass "nombre_tarea" "descripcion de la solucion" [archivo1.js ...]'); process.exit(1); }
  const agente = leerAgente(flags);
  const coord = new GraphCoordinator(agente);

  await coord.proposeSkillImprovement(tarea, {
    description: descripcion,
    codeChange: flags.diff || '',
    testsPassed: true,
    triggeredBy: 'task_passed'
  });
  console.log(`✅ Registrado en skills.json: "${tarea}" — ${descripcion}`);

  for (const archivo of archivos) {
    const liberado = await coord.releaseLockByResource(archivo);
    console.log(liberado ? `🔓 Lock liberado: ${archivo}` : `(sin lock activo propio sobre ${archivo}, nada que liberar)`);
  }
}

async function cmdFail(args, flags) {
  const [tarea, motivo] = args;
  if (!tarea || !motivo) { console.error('❌ Uso: fail "nombre_tarea" "motivo exacto por el que fallo"'); process.exit(1); }
  const agente = leerAgente(flags);
  const coord = new GraphCoordinator(agente);
  const id = await coord.recordError(tarea, new Error(motivo), { via: 'cli fail' });
  console.log(`📝 Registrado en errors.jsonl (${id}): "${tarea}" → ${motivo}`);
  console.log('   Ninguna IA debería reintentar exactamente esto sin revisar este registro primero.');
}

function cmdStatus() {
  console.log('\n📊 Estado de coordinación (.opencode/coordination/)\n');

  const activos = leerLocksActivos();
  console.log(`Locks activos: ${activos.length}`);
  activos.forEach(l => console.log(`  🔒 ${l.resource} — ${l.agent} (expira ${new Date(l.expires).toISOString()})`));

  if (existsSync(ERRORS_FILE)) {
    const errores = readFileSync(ERRORS_FILE, 'utf8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(e => e && typeof e === 'object' && !Array.isArray(e));
    const abiertos = errores.filter(e => !e.resolved);
    console.log(`\nErrores abiertos (sin resolver): ${abiertos.length}`);
    abiertos.slice(-10).forEach(e => console.log(`  ⚠️  [${e.agent}] ${e.task}: ${e.error}`));
  }

  if (existsSync(SKILLS_FILE)) {
    try {
      const skills = JSON.parse(readFileSync(SKILLS_FILE, 'utf8'));
      const recientes = (skills.improvements || []).slice(-5);
      console.log(`\nÚltimas mejoras registradas (skills.json, hasta 5 de ${skills.improvements?.length || 0}):`);
      recientes.forEach(i => console.log(`  ✅ [${i.agent}] ${i.skill}: ${i.description}`));
    } catch { /* noop */ }
  }
  console.log('');
}

function ayuda() {
  console.log(`
SNC_v3 — CLI de coordinación multi-IA (AGENTS.md §2)

  route "descripcion"                            Dónde tocar (dominio, archivo principal, apoyo, test)
  check "tarea" archivo.js [...]                  ¿Está bloqueado? ¿Ya falló antes alguien con esta tarea?
  lock archivo.js [...] [--task=x] [--agent=Y]    Tomar el lock antes de editar
  pass "tarea" "solucion" archivo.js [...]        Registrar el acierto y liberar el/los lock(s)
  fail "tarea" "motivo"                           Registrar que no funcionó (para que nadie lo repita)
  status                                          Ver locks activos, errores abiertos, últimas mejoras

Identidad: pasá --agent=Claude (o Antigravity, Hermes, OpenCode...) en cada comando,
o definí la variable de entorno SNC_AGENT_NAME una vez por sesión.

Ejemplos:
  node .opencode/coordination/cli.mjs route "arreglar el zoom del mapa" --agent=Claude
  node .opencode/coordination/cli.mjs check "fix_zoom_mapa" js/mapEngine.js --agent=Claude
  node .opencode/coordination/cli.mjs lock js/mapEngine.js --agent=Claude
  node .opencode/coordination/cli.mjs pass "fix_zoom_mapa" "Se corrigió el nivel inicial" js/mapEngine.js --agent=Claude
`);
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (const a of argv) {
    const m = a.match(/^--([\w-]+)=(.*)$/);
    if (m) flags[m[1]] = m[2];
    else positional.push(a);
  }
  return { flags, positional };
}

async function main() {
  const [, , comando, ...resto] = process.argv;
  const { flags, positional } = parseFlags(resto);

  switch (comando) {
    case 'route': return cmdRoute(positional);
    case 'check': return cmdCheck(positional, flags);
    case 'lock': return cmdLock(positional, flags);
    case 'pass': return cmdPass(positional, flags);
    case 'fail': return cmdFail(positional, flags);
    case 'status': return cmdStatus();
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      return ayuda();
    default:
      console.error(`❌ Comando desconocido: ${comando}`);
      ayuda();
      process.exit(1);
  }
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
