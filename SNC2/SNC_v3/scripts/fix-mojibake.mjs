// scripts/fix-mojibake.mjs
import fs from 'node:fs';
import path from 'node:path';

// Windows-1252 mapping for characters in the 0x80 - 0x9F range
const CP1252_MAP = new Map([
  ['\u20AC', 0x80], // €
  ['\u201A', 0x82], // ‚
  ['\u0192', 0x83], // ƒ
  ['\u201E', 0x84], // „
  ['\u2026', 0x85], // …
  ['\u2020', 0x86], // †
  ['\u2021', 0x87], // ‡
  ['\u02C6', 0x88], // ˆ
  ['\u2030', 0x89], // ‰
  ['\u0160', 0x8A], // Š
  ['\u2039', 0x8B], // ‹
  ['\u0152', 0x8C], // Œ
  ['\u017D', 0x8E], // Ž
  ['\u2018', 0x91], // ‘
  ['\u2019', 0x92], // ’
  ['\u201C', 0x93], // “
  ['\u201D', 0x94], // ”
  ['\u2022', 0x95], // •
  ['\u2013', 0x96], // –
  ['\u2014', 0x97], // —
  ['\u02DC', 0x98], // ˜
  ['\u2122', 0x99], // ™
  ['\u0161', 0x9A], // š
  ['\u203A', 0x9B], // ›
  ['\u0153', 0x9C], // œ
  ['\u017E', 0x9E], // ž
  ['\u0178', 0x9F]   // Ÿ
]);

function charToByte(ch) {
  if (CP1252_MAP.has(ch)) {
    return CP1252_MAP.get(ch);
  }
  const code = ch.charCodeAt(0);
  if (code <= 0xFF) {
    return code;
  }
  return null;
}

// Build regex patterns for CP1252 characters
const cp1252CharsJoined = Array.from(CP1252_MAP.keys()).join('');
const byte2Follower = `[\\x80-\\xBF${cp1252CharsJoined}]`;
const byte3Follower = `[\\x80-\\xBF${cp1252CharsJoined}]`;

// Matches UTF-8 multi-byte sequences that were decoded as CP1252/ISO-8859-1
// 2-byte UTF-8: \xC2-\xDF followed by 1 trailing byte
// 3-byte UTF-8: \xE0-\xEF followed by 2 trailing bytes
const mojibake2 = new RegExp(`[\\xC2-\\xC3]${byte2Follower}`, 'g');
const mojibake3 = new RegExp(`[\\xE0-\\xEF]${byte3Follower}${byte3Follower}`, 'g');
const fullMojibakeRegex = new RegExp(`(${mojibake3.source})|(${mojibake2.source})`, 'g');

export function fixMojibake(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(fullMojibakeRegex, (match) => {
    try {
      const bytes = [];
      for (const ch of match) {
        const b = charToByte(ch);
        if (b === null) return match;
        bytes.push(b);
      }
      const buf = Buffer.from(bytes);
      // Verify valid UTF-8
      const decoded = buf.toString('utf8');
      // If roundtrip utf8 -> buffer equals our bytes, it's valid UTF-8!
      if (Buffer.compare(Buffer.from(decoded, 'utf8'), buf) === 0) {
        return decoded;
      }
      return match;
    } catch {
      return match;
    }
  });
}

export function detectMojibake(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = [];
  let m;
  const re = new RegExp(fullMojibakeRegex.source, 'g');
  while ((m = re.exec(text)) !== null) {
    matches.push({ match: m[0], index: m.index });
  }
  return matches;
}

const EXTENSIONS = new Set([
  '.html', '.js', '.mjs', '.cjs', '.json', '.md', '.css', '.txt', '.geojson', '.svg', '.sh', '.bat', '.ps1'
]);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.gemini', 'dist', '1.Paraguay', 'temp_css', 'logs_y_raw', '.opencode'
]);

const IGNORED_FILES = new Set([
  path.join('scripts', 'fix-mojibake.mjs'),
  path.join('tests', 'encoding.test.mjs')
]);

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!EXTENSIONS.has(ext)) return false;
  
  const rel = path.relative(process.cwd(), filePath);
  if (IGNORED_FILES.has(rel)) return false;

  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (IGNORED_DIRS.has(part)) return false;
  }
  return true;
}

function walkDir(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walkDir(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      if (shouldProcessFile(fullPath)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

// CLI Execution
if (process.argv[1] && (process.argv[1].endsWith('fix-mojibake.mjs') || process.argv[1].endsWith('fix-mojibake'))) {
  const isCheckMode = process.argv.includes('--check');
  const targetDir = process.cwd();
  console.log(`[MOJIBAKE] Scanning ${targetDir} (mode: ${isCheckMode ? 'CHECK' : 'FIX'})...`);
  
  const files = walkDir(targetDir);
  let totalFixedFiles = 0;
  let totalOccurrences = 0;
  const issues = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const detected = detectMojibake(content);
      if (detected.length > 0) {
        if (isCheckMode) {
          issues.push({ file, count: detected.length, samples: detected.slice(0, 3).map(d => d.match) });
        } else {
          const fixed = fixMojibake(content);
          if (fixed !== content) {
            fs.writeFileSync(file, fixed, 'utf8');
            totalFixedFiles++;
            totalOccurrences += detected.length;
            console.log(`  ✓ Fixed ${detected.length} occurrences in: ${path.relative(targetDir, file)}`);
          }
        }
      }
    } catch (err) {
      console.error(`  ✗ Error reading ${file}:`, err.message);
    }
  }

  if (isCheckMode) {
    if (issues.length > 0) {
      console.error(`\n[MOJIBAKE CHECK FAILED] Found mojibake in ${issues.length} files:`);
      for (const issue of issues) {
        console.error(`  - ${path.relative(targetDir, issue.file)} (${issue.count} occurrences): ${issue.samples.join(', ')}`);
      }
      process.exit(1);
    } else {
      console.log(`\n[MOJIBAKE CHECK PASSED] 0 mojibake detected across ${files.length} text files.`);
      process.exit(0);
    }
  } else {
    console.log(`\n[MOJIBAKE FIX COMPLETE] Fixed ${totalOccurrences} occurrences in ${totalFixedFiles} files.`);
  }
}
