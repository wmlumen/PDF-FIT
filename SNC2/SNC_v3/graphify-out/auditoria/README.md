# Auditoría SNC_v3 — hub de agentes

> **Estado: NO APTO para producción** (auditoría del 2026-10-18).

Este directorio es el **espejo para agentes** de la auditoría. La fuente de verdad está en `docs/`;
este contenido se genera con `npm run audit:sync` y **no debe editarse a mano**.

## Contenido

| Archivo | Qué es |
|---|---|
| [`AUDITORIA_SNC_v3_2026-10-18.md`](AUDITORIA_SNC_v3_2026-10-18.md) | Informe completo: 38 hallazgos con evidencia `archivo:línea` |
| [`PLAN_REMEDIACION_AUDITORIA.md`](PLAN_REMEDIACION_AUDITORIA.md) | Tareas por fase, criterios de cierre y zonas congeladas |
| [`auditoria.json`](auditoria.json) | Índice legible por máquina: id, severidad, fase, estado, evidencia |

## Resumen

| Severidad | Hallazgos |
|---|---:|
| 🔴 Crítico | 8 |
| 🟠 Alto | 11 |
| 🟡 Medio | 10 |
| 🔵 Bajo | 9 |
| **Total** | **38** |

### Críticos abiertos

- **C-01** — Credenciales reales versionadas en Git
- **C-02** — Clave privada de Firebase Admin en el workspace
- **C-03** — El despliegue publica todo el repositorio
- **C-04** — IDOR multi-tenant en proyectos, expedientes, archivos y pagos
- **C-05** — Tokens JWT forjables / sesiones no revocables
- **C-06** — Firestore roto + fallback silencioso a SQLite
- **C-07** — Endpoints core en 500: contrato db.cjs incompleto y files_json inexistente
- **C-08** — El webhook de pagos no puede validar la firma

## Cómo consumirlo

```bash
node scripts/sync-auditoria.mjs --check     # verifica que el espejo esté al día
node .opencode/coordination/cli.mjs route "arreglar autorizacion de expedientes"
jq '.findings[] | select(.severity=="critico")' graphify-out/auditoria/auditoria.json
```

> El grafo `graph.json` todavía **no indexa** estos documentos (solo código y 4 docs previos).
> Para que `route`/graphify query los encuentren hay que correr el pipeline semántico de graphify.
