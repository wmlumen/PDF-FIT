#!/usr/bin/env node
/**
 * Sincroniza la auditoría y su plan de remediación al hub de agentes `graphify-out/auditoria/`.
 *
 * - `docs/AUDITORIA_SNC_v3_2026-10-18.md`  → `graphify-out/auditoria/AUDITORIA_SNC_v3_2026-10-18.md`
 * - `docs/PLAN_REMEDIACION_AUDITORIA.md`   → `graphify-out/auditoria/PLAN_REMEDIACION_AUDITORIA.md`
 * - genera `auditoria.json` (índice legible por máquina) y `README.md` (índice del hub)
 *
 * Uso:
 *   node scripts/sync-auditoria.mjs           # escribe el espejo
 *   node scripts/sync-auditoria.mjs --check   # falla si el espejo está desactualizado (CI)
 *
 * La fuente de verdad sigue siendo `docs/`. Este espejo existe para que cualquier agente que
 * solo inspeccione `graphify-out/` encuentre el estado de la auditoría sin recorrer el repo.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'graphify-out', 'auditoria');
const CHECK = process.argv.includes('--check');

const SOURCES = [
  { src: 'docs/AUDITORIA_SNC_v3_2026-10-18.md', dst: 'AUDITORIA_SNC_v3_2026-10-18.md' },
  { src: 'docs/PLAN_REMEDIACION_AUDITORIA.md', dst: 'PLAN_REMEDIACION_AUDITORIA.md' }
];

const SEVERITY = { C: 'critico', A: 'alto', M: 'medio', B: 'bajo' };
const PHASE = { C: 0, A: 1, M: 2, B: 3 };
const SEVERITY_ORDER = { critico: 0, alto: 1, medio: 2, bajo: 3 };
const SEVERITY_LABEL = { critico: '🔴 Crítico', alto: '🟠 Alto', medio: '🟡 Medio', bajo: '🔵 Bajo' };

const readNormalized = (relPath) => readFileSync(join(ROOT, relPath), 'utf8').replace(/\r\n/g, '\n');
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const clean = (text) =>
  String(text || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Extrae hallazgos de los encabezados (C/A) y de las tablas (M/B). */
function parseFindings(markdown) {
  const findings = [];
  const seen = new Set();

  for (const match of markdown.matchAll(/^###\s+([CAM])-(\d{2})\s*·\s*(.+)$/gm)) {
    const [, prefix, number, title] = match;
    const id = `${prefix}-${number}`;
    if (seen.has(id)) continue;
    seen.add(id);
    findings.push({
      id,
      severity: SEVERITY[prefix],
      phase: PHASE[prefix],
      status: 'abierto',
      title: clean(title),
      evidence: null
    });
  }

  for (const line of markdown.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const idMatch = /^([MB])-(\d{2})$/.exec(cells[1]);
    if (!idMatch) continue;
    const [, prefix, number] = idMatch;
    const id = `${prefix}-${number}`;
    if (seen.has(id)) continue;
    seen.add(id);
    findings.push({
      id,
      severity: SEVERITY[prefix],
      phase: PHASE[prefix],
      status: 'abierto',
      title: clean(cells[2]),
      evidence: clean(cells[3]) || null
    });
  }

  return findings.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.id.localeCompare(b.id)
  );
}

function buildJson({ auditText, planText, findings }) {
  const auditPath = SOURCES[0].src;
  const counts = { critico: 0, alto: 0, medio: 0, bajo: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return {
    schema: 'snc-auditoria/1',
    project: 'SNC_v3',
    audit_date: '2026-10-18',
    verdict: 'NO APTO para producción',
    canonical: { audit: auditPath, plan: SOURCES[1].src },
    mirror: 'graphify-out/auditoria/',
    sources: {
      [auditPath]: { sha256: sha256(auditText), bytes: Buffer.byteLength(auditText, 'utf8') },
      [SOURCES[1].src]: { sha256: sha256(planText), bytes: Buffer.byteLength(planText, 'utf8') }
    },
    counts: { ...counts, total: findings.length, abiertos: findings.filter((f) => f.status === 'abierto').length },
    findings: findings.map((f) => ({ ...f, source: `${auditPath}#${f.id}` }))
  };
}

function buildReadme({ findings, counts }) {
  const rows = Object.entries(counts)
    .filter(([key]) => key !== 'total')
    .map(([severity, count]) => `| ${SEVERITY_LABEL[severity]} | ${count} |`)
    .join('\n');

  const critical = findings
    .filter((f) => f.severity === 'critico')
    .map((f) => `- **${f.id}** — ${f.title}`)
    .join('\n');

  return `# Auditoría SNC_v3 — hub de agentes

> **Estado: ${'NO APTO para producción'}** (auditoría del 2026-10-18).

Este directorio es el **espejo para agentes** de la auditoría. La fuente de verdad está en \`docs/\`;
este contenido se genera con \`npm run audit:sync\` y **no debe editarse a mano**.

## Contenido

| Archivo | Qué es |
|---|---|
| [\`AUDITORIA_SNC_v3_2026-10-18.md\`](AUDITORIA_SNC_v3_2026-10-18.md) | Informe completo: ${findings.length} hallazgos con evidencia \`archivo:línea\` |
| [\`PLAN_REMEDIACION_AUDITORIA.md\`](PLAN_REMEDIACION_AUDITORIA.md) | Tareas por fase, criterios de cierre y zonas congeladas |
| [\`auditoria.json\`](auditoria.json) | Índice legible por máquina: id, severidad, fase, estado, evidencia |

## Resumen

| Severidad | Hallazgos |
|---|---:|
${rows}
| **Total** | **${findings.length}** |

### Críticos abiertos

${critical}

## Cómo consumirlo

\`\`\`bash
npm run audit:graph                          # reindexa auditoría + plan en graph.json (sin LLM)
npm run audit:sync -- --check                # verifica que el espejo esté al día
node .opencode/coordination/cli.mjs route "arreglar autorizacion de expedientes"
jq '.findings[] | select(.severity=="critico")' graphify-out/auditoria/auditoria.json
\`\`\`

> El grafo \`graph.json\` **indexa** este informe y el plan como nodos (comunidades «Auditoría 2026-10-18»
> y «Plan de remediación»), así que \`route\` y \`graphify query\` los encuentran. Para reindexar tras editar
> los documentos: \`npm run audit:graph\`.
`;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const auditText = readNormalized(SOURCES[0].src);
  const planText = readNormalized(SOURCES[1].src);
  const findings = parseFindings(auditText);

  if (findings.length === 0) {
    console.error('[audit:sync] No se encontraron hallazgos en el informe. Abortando.');
    process.exit(1);
  }

  const counts = { critico: 0, alto: 0, medio: 0, bajo: 0, total: findings.length };
  for (const finding of findings) counts[finding.severity] += 1;

  const outputs = new Map();
  outputs.set(SOURCES[0].dst, auditText);
  outputs.set(SOURCES[1].dst, planText);
  outputs.set('auditoria.json', `${JSON.stringify(buildJson({ auditText, planText, findings }), null, 2)}\n`);
  outputs.set('README.md', buildReadme({ findings, counts }));

  let stale = 0;
  for (const [name, content] of outputs) {
    const target = join(OUT_DIR, name);
    const current = existsSync(target) ? readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current === content) continue;
    if (CHECK) {
      console.error(`[audit:sync] desactualizado: ${relative(ROOT, target)}`);
      stale += 1;
      continue;
    }
    writeFileSync(target, content, 'utf8');
  }

  if (CHECK) {
    if (stale > 0) {
      console.error(`[audit:sync] ${stale} archivo(s) desactualizado(s). Ejecutá: npm run audit:sync`);
      process.exit(1);
    }
    console.log('[audit:sync] espejo al día.');
    return;
  }

  const bySeverity = Object.entries(counts)
    .filter(([key]) => key !== 'total')
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  console.log(`[audit:sync] ${findings.length} hallazgos (${bySeverity}) → ${relative(ROOT, OUT_DIR)}`);
}

main();
