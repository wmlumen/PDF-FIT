# Graph Coordinator - Documentación de Uso

## Inicio Rápido

```javascript
// En cualquier módulo (app.js, validator.js, export.js, etc.)
import { GraphCoordinator } from '../.opencode/coordination/coordinator.mjs';

const coordinator = new GraphCoordinator('mi-agente', {
  defaultTtl: 300000,  // 5 min lock TTL
  maxRetries: 3
});
```

## 1. Locks - Evitar Solapamiento

```javascript
// Antes de editar validator.js
const lockId = await coordinator.acquireLock('js/validator.js');
try {
  // ... hacer cambios ...
} finally {
  await coordinator.releaseLock(lockId);
}

// O con auto-release:
await coordinator.waitForLock('js/export.js', 60000); // espera hasta 60s
// ... trabajo ...
coordinator.releaseLock(lockId); // opcional, expira solo
```

## 2. Error Registry - No Repetir Errores

```javascript
try {
  await riskyOperation();
} catch (error) {
  // Registrar automáticamente
  const errorId = await coordinator.recordError('export_pdf', error, {
    skill: 'export',
    file: 'js/export.js',
    context: { format: 'PDF', size: 'A4' }
  });
  
  // Verificar si ya falló antes (evita reintentar lo mismo)
  const blockers = await coordinator.getBlockers('export_pdf');
  if (blockers.length >= 3) {
    throw new Error('Demasiados fallos previos - buscar alternativa');
  }
  
  // Verificar patrones similares
  const similar = await coordinator.getSimilarErrors('export_pdf');
  if (similar.length) {
    console.warn('Errores similares previos:', similar.map(s => s.solution));
  }
  
  // Cuando se resuelve:
  await coordinator.markResolved(errorId, 'Fixed by using docx library instead of html2pdf');
}
```

## 3. Skill Evolution - Mejoras Persistentes

```javascript
// Cuando se resuelve un error y hay mejora de código:
await coordinator.proposeSkillImprovement('export', {
  description: 'Use docx library instead of html2pdf for DOCX generation',
  codeChange: `- const doc = html2pdf()\n+ import { Document, Packer } from 'docx'`,
  testsPassed: true,
  triggeredBy: 'error_resolved'
});

// Revisar mejoras pendientes:
const pending = await coordinator.getPendingImprovements('export');
// Revisar y aprobar:
await coordinator.approveImprovement('imp_123', 'lead-dev');
```

## 4. Patterns - Detección Automática

```javascript
// Registrar patrón de error recurrente:
await coordinator.recordPattern({
  description: 'Sintaxis JSX en archivo .js sin type=module',
  regex: 'Unexpected token.*<',
  example: 'Uncaught SyntaxError: Unexpected token < at app.js:1'
});

// Detección automática en catch:
const pattern = await coordinator.findSimilarPattern(error.message);
if (pattern) {
  console.log('Patrón conocido:', pattern.pattern);
  console.log('Solución previa:', pattern.examples);
}
```

## 5. Health Check

```javascript
// Dashboard de salud
const health = coordinator.getHealth();
console.log(health);
// {
//   agent: 'app-agent',
//   activeLocks: 2,
//   totalActiveLocks: 5,
//   unresolvedErrors: 3,
//   errorRate: 0.15
// }
```

## Flujo Recomendado de Trabajo

```javascript
async function safeEdit(resource, task, fn) {
  const lockId = await coordinator.acquireLock(resource);
  const errorId = null;
  
  try {
    // Verificar bloqueadores previos
    const blockers = await coordinator.getBlockers(task);
    if (blockers.length >= 3) {
      throw new Error(`Demasiados fallos previos en ${task}. Revisar: ${blockers.map(b => b.solution).join(', ')}`);
    }
    
    // Verificar patrones conocidos
    const similar = await coordinator.getSimilarErrors(task);
    if (similar.length) {
      console.warn('⚠️ Errores similares previos:', similar.map(s => s.solution));
    }
    
    // Ejecutar trabajo
    const result = await fn();
    
    // Si hubo error previo, marcar resuelto
    if (errorId) {
      await coordinator.markResolved(errorId, 'Fixed by implementing ' + task);
    }
    
    return result;
  } catch (error) {
    // Registrar error automáticamente
    const newErrorId = await coordinator.recordError(task, error, { resource });
    throw error;
  } finally {
    if (lockId) await coordinator.releaseLock(lockId);
  }
}

// Uso:
await safeEdit('js/validator.js', 'fix_topology_validation', async () => {
  // ... código que edita validator.js ...
});
```

## Archivos Generados

```
.opencode/coordination/
├── locks.jsonl          # Locks activos/históricos
├── errors.jsonl         # Registro de errores
├── tasks.jsonl          # Tareas ejecutadas
├── skills.json          # Mejoras de skills + patterns
├── changelogs/
│   ├── export.md        # Changelog skill export
│   ├── validator.md     # Changelog skill validator
│   └── ...
```

## Integración CI/CD (Opcional)

```yaml
# .github/workflows/skill-evolution.yml
name: Skill Evolution
on:
  push:
    paths:
      - '.opencode/coordination/skills.json'
jobs:
  approve-improvements:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check pending improvements
        run: |
          node -e "
            const skills = require('./.opencode/coordination/skills.json');
            const pending = skills.improvements.filter(i => i.status === 'pending_review');
            if (pending.length) {
              console.log('Pending improvements:', pending.length);
              process.exit(1);  // Block merge until reviewed
            }
          "
```