import subprocess, sys
PY
cd /c/Users/HP\ 250\ G10/Documents/GITHUT/SNC2/SNC_v3
node - <<'NODE'
const acorn = require('acorn');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const mods = [...html.matchAll(/<script type="module">(.*?)<\/script>/gs)];
const src = mods[mods.length-1][1];
const lines = src.split('\n');
// Try parsing with progressively fewer lines
for (let cut = 0; cut <= 60; cut++) {
  const cand = lines.slice(0, lines.length - cut).join('\n');
  try {
    acorn.parse(cand, {ecmaVersion: 2022, sourceType: 'module'});
    console.log('PARSES OK with last ' + cut + ' lines removed');
    process.exit(0);
  } catch (e) {
    if (e.message.includes('Unexpected')) {
      // still failing
    } else {
      console.log('OTHER ERROR with last ' + cut + ' removed:', e.message);
    }
  }
}
console.log('no cut point found');
NODE