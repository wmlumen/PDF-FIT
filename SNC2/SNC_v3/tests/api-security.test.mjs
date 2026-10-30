import assert from 'node:assert/strict';

let passed = 0;
let failed = 0;
function assertEqual(actual, expected, testName) {
  if (actual === expected) { console.log(`✅ PASS: ${testName}`); passed++; }
  else { console.log(`❌ FAIL: ${testName} :: expected=${expected} actual=${actual}`); failed++; }
}
function assertThrows(fn, testName) {
  try { fn(); console.log(`❌ FAIL: ${testName} :: expected error`); failed++; }
  catch { console.log(`✅ PASS: ${testName}`); passed++; }
}

function safeJsonParse(str, fallback = null) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function sanitizeClientState(state) {
  if (!state || typeof state !== 'object') return state;
  const out = { ...state };
  if (typeof out.geojson === 'string') {
    try { out.geojson = JSON.parse(out.geojson); } catch { delete out.geojson; }
  }
  if (typeof out.excelData === 'string') {
    try { out.excelData = JSON.parse(out.excelData); } catch { delete out.excelData; }
  }
  return out;
}

function sanitizeFilesArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 200).map((item, index) => ({
    id: String(item?.id || `file-${index}-${Date.now()}`),
    name: String(item?.name || '').slice(0, 120),
    size: Number(item?.size) || 0,
    type: String(item?.type || '').slice(0, 80),
    url: String(item?.url || '').slice(0, 500),
    created_at: new Date().toISOString()
  }));
}

function sanitizeBuyer(input) {
  const buyer = input && typeof input === 'object' ? input : {};
  return {
    name: String(buyer.name || '').trim().slice(0, 120),
    email: String(buyer.email || '').trim().slice(0, 160),
    document: String(buyer.document || '').trim().slice(0, 40),
    phone: String(buyer.phone || '').trim().slice(0, 40)
  };
}

console.log('\n🧪 TESTS UNITARIOS - sanitización backend server-api.js\n');

// sanitizeClientState
const deepState = { geojson: JSON.stringify({type:'FeatureCollection',features:[]}), excelData: JSON.stringify([{a:1}]), level1:{ level2:{x:1}} };
const clean1 = sanitizeClientState(deepState);
assertEqual(typeof clean1.geojson, 'object', 'sanitizeClientState parsea geojson string a objeto');
assertEqual(Array.isArray(clean1.excelData), true, 'sanitizeClientState parsea excelData string a array');
assertEqual(clean1.level1.level2.x, 1, 'sanitizeClientState preserva objetos anidados');

const invalidGeo = { geojson: '{bad json}', excelData: '{bad json}' };
const clean2 = sanitizeClientState(invalidGeo);
assertEqual('geojson' in clean2, false, 'sanitizeClientState elimina geojson inválido');
assertEqual('excelData' in clean2, false, 'sanitizeClientState elimina excelData inválido');

assertEqual(sanitizeClientState(null), null, 'sanitizeClientState maneja null');
assertEqual(sanitizeClientState('string'), 'string', 'sanitizeClientState maneja primitivos sin cambios');

// sanitizeFilesArray
assertEqual(sanitizeFilesArray([]).length, 0, 'sanitizeFilesArray vacío da []');
const filesWithLongUrl = Array.from({length:5}, (_, i) => ({ id:`f${i}`, name:`file-${i}.bin`, size:10, type:'bin', url:'x'.repeat(1000) }));
const capped = sanitizeFilesArray(filesWithLongUrl);
assertEqual(capped.length, 5, 'sanitizeFilesArray preserva cantidad pequena');
assertEqual(capped[0].url.length, 500, 'sanitizeFilesArray trunca url a 500');
assertEqual(capped[0].name.length, 10, 'sanitizeFilesArray preserva name corto');
const longItem = sanitizeFilesArray([{ name:'a'.repeat(200), size:'abc', url:'y'.repeat(2000) }])[0];
assertEqual(longItem.name.length, 120, 'sanitizeFilesArray trunca name largo a 120');
assertEqual(longItem.url.length, 500, 'sanitizeFilesArray trunca url largo a 500');
assertEqual(longItem.size, 0, 'sanitizeFilesArray normaliza size no numérico');
assertEqual(sanitizeFilesArray('not-array').length, 0, 'sanitizeFilesArray maneja entrada no array');

// sanitizeBuyer
assertEqual(sanitizeBuyer({}).name, '', 'sanitizeBuyer default name vacío');
assertEqual(sanitizeBuyer({ name:'A'.repeat(300), email:'x'.repeat(300), document:'doc', phone:'tel' }).name.length, 120, 'sanitizeBuyer trunca name a 120');
assertEqual(sanitizeBuyer({ email:'y'.repeat(300) }).email.length, 160, 'sanitizeBuyer trunca email a 160');
assertEqual(sanitizeBuyer({ document:'abcdefghijklmnopqrstuvwxyz0123456789012345' }).document.length, 40, 'sanitizeBuyer trunca document a 40');
assertEqual(sanitizeBuyer({ phone:'1234567890123456789012345678901234567890' }).phone.length, 40, 'sanitizeBuyer trunca phone a 40');
assertEqual(sanitizeBuyer(null).email, '', 'sanitizeBuyer maneja null');
assertEqual(sanitizeBuyer(123).name, '', 'sanitizeBuyer maneja primitivos');

console.log(`\n📊 API SECURITY SANITIZATION TESTS SUMMARY: ${passed}/${passed+failed} tests passed\n`);
if (failed > 0) process.exit(1);
