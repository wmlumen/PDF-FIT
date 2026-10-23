// Test de regresión: persistencia de files_json en expedientes.
// Cubre el bug donde POST /api/expedientes/:id/files serializaba dos veces
// y el GET devolvía un string en lugar de un array.
import { files_json_value, normalizeFilesJson } from '../db.cjs';

let passed = 0;
function ok(nombre, cond) {
  if (!cond) { console.error(`❌ FAIL: ${nombre}`); process.exitCode = 1; }
  else { console.log(`✅ PASS: ${nombre}`); passed++; }
}

// --- files_json_value: normaliza a la forma canónica (string JSON de array) ---
ok('null -> null', files_json_value(null) === null);
ok('undefined -> null', files_json_value(undefined) === null);
ok('array -> string JSON', files_json_value([{ id: 'a' }]) === JSON.stringify([{ id: 'a' }]));
ok('string ya serializado -> canonico',
   files_json_value(JSON.stringify([{ id: 'b' }])) === JSON.stringify([{ id: 'b' }]));
ok('string con doble encoding -> canonico (un solo nivel)',
   files_json_value(JSON.stringify(JSON.stringify([{ id: 'c' }]))) === JSON.stringify([{ id: 'c' }]));
ok('string vacío -> null', files_json_value('   ') === null);
ok('objeto suelto -> string JSON', files_json_value({ id: 'd' }) === JSON.stringify({ id: 'd' }));

// --- normalizeFilesJson: siempre devuelve array ---
ok('null -> []', Array.isArray(normalizeFilesJson(null)) && normalizeFilesJson(null).length === 0);
ok('array -> mismo array', normalizeFilesJson([1, 2]).length === 2);
ok('string JSON de array -> array', normalizeFilesJson('[{"id":"x"}]')[0].id === 'x');
ok('string con doble encoding -> array', normalizeFilesJson('"[{\\"id\\":\\"y\\"}]"')[0].id === 'y');
ok('string basura -> []', normalizeFilesJson('no es json').length === 0);
ok('numero -> []', normalizeFilesJson(42).length === 0);

// --- invariante clave: escribir y leer debe ser idempotente ---
const original = [{ id: 'f1', name: 'plano.pdf', url: 'http://x', size: 10 }];
const persistido = files_json_value(original);
const leido = normalizeFilesJson(persistido);
ok('round-trip write->read preserva el array', JSON.stringify(leido) === JSON.stringify(original));

// --- idempotencia: escribir lo ya persistido no degrada ---
const segundo = files_json_value(persistido);
ok('re-escribir el valor persistido es estable', segundo === persistido);

console.log(`\n📊 FILES_JSON REGRESSION TESTS: ${passed} tests passed`);
if (process.exitCode) { console.error('❌ HAY FALLOS'); process.exit(1); }
