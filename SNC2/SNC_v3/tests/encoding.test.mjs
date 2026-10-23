import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { detectMojibake } from '../scripts/fix-mojibake.mjs';

test('Codificacion UTF-8 - Ningun archivo del repositorio debe contener mojibake', () => {
  const targetDir = process.cwd();
  const EXTENSIONS = new Set([
    '.html', '.js', '.mjs', '.cjs', '.json', '.md', '.css', '.txt', '.geojson', '.svg'
  ]);
  const IGNORED_DIRS = new Set([
    'node_modules', '.git', '.gemini', 'dist', '1.Paraguay', 'temp_css', 'logs_y_raw', '.opencode'
  ]);
  const IGNORED_FILES = new Set([
    path.join('tests', 'encoding.test.mjs'),
    path.join('scripts', 'fix-mojibake.mjs')
  ]);

  function walk(dir, list = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(fullPath, list);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const rel = path.relative(targetDir, fullPath);
        if (EXTENSIONS.has(ext) && !IGNORED_FILES.has(rel)) {
          list.push(fullPath);
        }
      }
    }
    return list;
  }

  const files = walk(targetDir);
  const corrupted = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = detectMojibake(content);
    if (matches.length > 0) {
      corrupted.push({
        file: path.relative(targetDir, file),
        count: matches.length,
        samples: matches.slice(0, 3).map(m => m.match)
      });
    }
  }

  assert.equal(
    corrupted.length,
    0,
    `Se encontraron caracteres mojibake en ${corrupted.length} archivos:\n` +
    corrupted.map(c => `  - ${c.file} (${c.count} ocurrencias: ${c.samples.join(', ')})`).join('\n')
  );
});
