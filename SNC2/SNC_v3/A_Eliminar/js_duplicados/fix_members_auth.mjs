import { readFileSync, writeFileSync } from 'node:fs';
const p = 'members.html';
let text = readFileSync(p, 'utf8');
const start = text.indexOf('async function api(path, options={}) {');
const end = text.indexOf('function renderOptions(values, current) {');
let block = text.slice(start, end);
console.log('BLOCK_BEFORE:\n', block);
block = block.replace(
  /Authorization:\s*\*\*\s*\$\{token\}`/,
  'Authorization: `Bearer ${token}`'
);
console.log('BLOCK_AFTER:\n', block);
text = text.slice(0, start) + block + text.slice(end);
writeFileSync(p, text);
console.log('WROTE members.html');
