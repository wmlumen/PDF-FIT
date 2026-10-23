// ------------------------------------------------------------------ //
// 1) CONTENIDO ACTUAL DE SERVER-API.JS – ENDPOINTS EXISTENTES Y LO QUE FALTA PARA EL MÓDULO 1
// ------------------------------------------------------------------ //
const fs = require('fs');
const path = require('path');

const base = '/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3';

const serverApi = fs.readFileSync(path.join(base, 'server-api.js'), 'utf8');
console.log('=== Contenido actual de server-api.js ===');
// Filtrar para mostrar solo el contenido del endpoint (buscar rutas) y lo que tenemos
const lines = serverApi.split('\n');
let inApp = false;
let capturing = false;
let captureLines = [];
let foundModulo1 = false;
let foundIndexProfessional = false;
let foundIndexMunicipal = false;

for (const line of lines) {
  if (line.includes('app.get')) {
    // mostrar la ruta
    const match = line.match(/app\.(get|post|put|patch|delete)\(['\"]([^']+)['\"]/, i => i);
    if (match) {
      console.log('   Endpoint:', match[0]);
    }
  }
  if (line.includes('/api/modulo1') || line.includes('MODULO1') || line.includes('INDEX_PROFESIONAL') || line.includes('MUNICIPAL')) {
    console.log('   ----> Posible Módulo 1 o referencia index:', line.trim());
  }
  // Una búsqueda simple para detectar partes necesarias
  if (/index[-_]professional|index[-_]profe|index-profesional/i.test(line.toLowerCase())) {
    console.log('   Referencia a index-profesional/municipal:', line.trim().substring(0, 120));
  }
}

console.log('\n=== VERIFICAR SI HAY ENDPOINTS DE MÓDULO 1 ===');
if (serverApi.includes('/api/modulo1') || serverApi.includes('/api/index') || serverApi.includes('/api/profesional')) {
  console.log('¡Ya hay endpoints de Módulo 1 presentes!');
} else {
  console.log('No hay endpoints explícitos de Módulo 1 – necesitará ser añadido.');
}

// ------------------------------------------------------------------ //
// 2) INDEX PROFESIONAL / INDEX MUNICIPAL – búsqueda en el repo
// ------------------------------------------------------------------ //
function findFilesMatching(pattern) {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (pattern.test(entry.name)) results.push(full);
    }
  }
  walk(base);
  return results;
}

const professionalIndexFiles = findFilesMatching(/index[-_]professional|index[-_]profe|index-profesional/i);
const municipalIndexFiles = findFilesMatching(/index[-_]municipal|index-municipal/i);

console.log('\n=== Archivos de index profesional encontrados ===');
if (professionalIndexFiles.length === 0) {
  console.log('  (ninguno)');
  const genericIndex = findFilesMatching(/index\.html$/i);
  console.log('  Candidatos similares:', genericIndex.slice(0, 10));
} else {
  for (const f of professionalIndexFiles) {
    console.log('  ', f);
  }
}

console.log('\n=== Archivos de index municipal encontrados ===');
if (municipalIndexFiles.length === 0) {
  console.log('  (ninguno)');
  const genericIndexM = findFilesMatching(/index-municipal\.html$/i);
  console.log('  Candidatos similares:', genericIndexM.slice(0, 10));
} else {
  for (const f of municipalIndexFiles) {
    console.log('  ', f);
  }
}

// ------------------------------------------------------------------ //
// 3) SERVICIOS DE MÓDULO 1 TÍPICOS
// ------------------------------------------------------------------ //
console.log('\n=== SERVICIOS DE MÓDULO 1 TÍPICOS ===');
console.log('  GET /api/modulo1/estado -> { estado, orden, perfil geodésico, zonas UTM configuradas, datum usado }');
console.log('  GET /api/modulo1/coordinates -> GeoJSON de las parcelas UTM actuales (EPSG:32721/32720)');
console.log('  GET /api/modulo1/certificate -> certificado de exportación SNC (se genera en export.js)');
console.log('  POST /api/modulo1/validate -> valida la geometría del Módulo 1 (usa validator.js)');
console.log('  POST /api/modulo1/export -> realiza la exportación del Módulo 1 (genera shp/shp+xml+pdf)');

// ------------------------------------------------------------------ //
// 4) INTEGRACIÓN DE LA API DEL MÓDULO 1 EN server-api.js
// ------------------------------------------------------------------ //
console.log('\n=== INTEGRACIÓN SUGERIDA ===');
console.log('  - Agregar import de servicios del módulo 1 desde ./js/geodesia.js (si se organiza así)');
console.log('  - Agregar rutas para el Módulo 1 en server-api.js (arriba de la protección de authMiddleware)');
console.log('  - Usar normalizeFilesJson, validar el tamaño de la geometría con validator.js');
console.log('  - Enviar todo el certificado junto con los elementos del Módulo 1 en export.js');

// ------------------------------------------------------------------ //
// 5) VERIFICACIÓN DEL 'INDEX PROFESIONAL' vs 'INDEX MUNICIPAL'
// ------------------------------------------------------------------ //
console.log('\n=== Comprobando la presencia del index profesional para activar el municipal ===');
const indexProfessionalExists = fs.existsSync(path.join(base, 'docs', 'index-profesional.md')) ? 'docs/index-profesional.md' : null;
console.log('  index-profesional.md:', indexProfessionalExists ? 'presente' : 'FALTA');

// ------------------------------------------------------------------ //
// 6) DETECTAR SI LA RAMA AI-JS-API YA TRABAJÓ EN ALGO RELACIONADO CON EL MÓDULO 1
// ------------------------------------------------------------------ //
function execGitLog(pattern) {
  const result = require('child_process').spawnSync('git', ['log', '--oneline', '--all', '--grep=' + pattern, '--oneline'], { encoding: 'utf8', cwd: base, stdio: 'pipe' });
  return result.stdout ? result.stdout.split('\n').filter(l => l.trim() !== '') : [];
}
const gitLog = execGitLog('modulo1|geodesia|index.*municipal');
if (gitLog.length > 0) {
  console.log('  Compromisos encontrados relacionados con Módulo 1:', gitLog);
} else {
  console.log('  No hay commits previos de Módulo 1 detectados');
}

console.log('\n=== Lista de tareas ===');
console.log('  1. Agregar endpoints REST del Módulo 1 en server-api.js');
console.log('  2. Vincular js/geodesia.js con importaciones y exportaciones apropiadas');
console.log('  3. Verificar o crear docs/index-profesional.md (tal vez una plantilla para el municipal)');
console.log('  4. Ejecutar npm test (ya verde, pero asegurar que tests db-modulo1 pasen).');
console.log('  5. Probar la API del Módulo 1 con un cliente simple (curl o node).');

console.log('\n=== COMPLETADO ===');