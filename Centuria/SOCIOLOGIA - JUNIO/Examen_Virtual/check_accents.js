const fs = require('fs');
const t = fs.readFileSync('public/script.js', 'utf8');

// Corrupt patterns: Ã + char (where char is the Latin-1 rendering of UTF-8 second byte)
const patterns = [
  ['\u00c3\u00a1', 'á'], ['\u00c3\u00a9', 'é'], ['\u00c3\u00ad', 'í'],
  ['\u00c3\u00b3', 'ó'], ['\u00c3\u00ba', 'ú'], ['\u00c3\u00b1', 'ñ'],
  ['\u00c2\u00bf', '¿'], ['\u00c2\u00a1', '¡'],
];
let found = false;
patterns.forEach(([bad, good]) => {
  let idx = t.indexOf(bad);
  while (idx >= 0) {
    console.log('CORRUPTO: ' + JSON.stringify(bad) + ' (deberia ser ' + JSON.stringify(good) + ') en pos ' + idx);
    console.log('  Contexto: ' + JSON.stringify(t.slice(Math.max(0,idx-10), idx+15)));
    found = true;
    idx = t.indexOf(bad, idx + 1);
  }
});

// Check correct Spanish words
['Ningún','configuración','válidos','cédula','Gestión','Ó','í','é','ó','ú','ñ'].forEach(w => {
  if (t.includes(w)) console.log('OK: ' + w);
  else console.log('NO ENCONTRADO: ' + w);
});

if (!found) console.log('\nNO HAY CARACTERES CORRUPTOS');
