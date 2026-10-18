# SNC v3 — Catastro PY (Res. SNC N° 551/2023)

Aplicación web para la validación, edición, certificación y exportación de expedientes catastrales de
Paraguay conforme a la **Resolución SNC N° 551/2023**: carga de DXF/KML/SHP/GeoJSON/CSV, validación de
8 criterios normativos, topología, COGO, versionado de geometrías, mapa Leaflet, exportación a
SHP/KML/GeoJSON/PDF y un backend Express con planes, usuarios, expedientes y pagos.

> ⚠️ **Estado: auditoría abierta — NO APTO para producción (2026-10-18).**
> El informe completo está en [`docs/AUDITORIA_SNC_v3_2026-10-18.md`](docs/AUDITORIA_SNC_v3_2026-10-18.md)
> y la lista de tareas accionables en [`docs/PLAN_REMEDIACION_AUDITORIA.md`](docs/PLAN_REMEDIACION_AUDITORIA.md).

---

## 🔴 Bloqueantes conocidos (leer antes de desplegar)

| # | Bloqueante | Evidencia |
|---|---|---|
| C-01 | Credenciales reales versionadas: contraseña de app Gmail en `ejercicio/contraseña app.txt`, copias de la base en `data/`, contraseña de admin en `_update_user.cjs` | auditoría §C-01 |
| C-02 | Clave privada de Firebase Admin (`snc511`) en `serviceAccountKey.json` sin cifrar | §C-02 |
| C-03 | `firebase.json` publica todo el repositorio (`"public": "."`), incluidos `docs/`, `tests/`, `ejercicio/` y `admin.html` | §C-03 |
| C-04 | IDOR multi-tenant: 9 endpoints no verifican propiedad del proyecto/expediente/pago | §C-04 |
| C-05 | `JWT_SECRET` con valor por defecto conocido; sesiones no revocables | §C-05 |
| C-06 | Firestore no inicializa (`admin.apps`) y hay fallback silencioso a SQLite con contrato incompleto | §C-06 |
| C-07 | `db.cjs` sin `expedientes.findByProject/update/deleteById` y esquema sin `files_json` → endpoints en 500 | §C-07 |
| C-08 | El webhook de pagos no puede validar la firma (body consumido + secreto ausente) | §C-08 |

No desplegar hasta completar la **Fase 0** y las tareas **A1-1 … A1-4** del plan.

---

## 🤖 Para agentes de IA

Este repositorio es operado por varios agentes. El contrato de trabajo está en [`AGENTS.md`](AGENTS.md)
(ciclo `route → check → lock → código + test → pass|fail` usando `.opencode/coordination/cli.mjs`).

Antes de tocar código, leer en este orden:

1. [`AGENTS.md`](AGENTS.md) — protocolo, aislamiento frontend/coordinación y matriz de dominios.
2. [`docs/AUDITORIA_SNC_v3_2026-10-18.md`](docs/AUDITORIA_SNC_v3_2026-10-18.md) — los 38 hallazgos con evidencia.
3. [`docs/PLAN_REMEDIACION_AUDITORIA.md`](docs/PLAN_REMEDIACION_AUDITORIA.md) — qué falta, con criterios de cierre y zonas congeladas.

Reglas adicionales mientras la auditoría esté abierta:

- Un hallazgo por cambio; no mezclar con refactors.
- No cerrar un hallazgo sin un test o una verificación reproducible.
- No "arreglar" deshabilitando tests, relajando auth/CORS/CSP o ampliando permisos.
- Nunca commitear secretos, bases ni logs; `dist/` tampoco. `graphify-out/` **sí** se versiona: es el grafo del repo.
- Registrar el resultado con `pass`/`fail` antes de terminar la tarea.

### 🧠 Grafo del repositorio (`graphify-out/`)

La estructura viva y las relaciones del proyecto están indexadas en [`graphify-out/`](graphify-out/), que se
versiona y es la **fuente de verdad** para el ruteo de tareas:

| Artefacto | Contenido |
|---|---|
| [`graph.json`](graphify-out/graph.json) | **Grafo completo: 1.398 nodos y 2.166 aristas** — 133 archivos (código, tests, docs, HTML y configuración) en 126 comunidades |
| [`grafo_dominio.json`](graphify-out/grafo_dominio.json) | Grafo de dominio: 139 nodos y 801 aristas (9 tablas SQLite, 55 endpoints, 13 páginas, roles, fixes) |
| [`GRAPH_REPORT.md`](graphify-out/GRAPH_REPORT.md) | Reporte arquitectónico: hubs, comunidades y preguntas sugeridas |
| [`graph.html`](graphify-out/graph.html) | Visor interactivo (abrir en navegador) |
| [`graphify-out/auditoria/`](graphify-out/auditoria/README.md) | Espejo legible por agentes del informe y del plan + `auditoria.json` con los 38 hallazgos |

```bash
node .opencode/coordination/cli.mjs route "descripcion de la tarea"   # ruteo sobre el grafo
graphify query "como funciona el flujo de expedientes"                # BFS/DFS sobre graph.json
npm run graph:refresh                                                 # graphify update + reindexar todo (recomendado)
npm run audit:graph                                                   # indexar todo el corpus (sin LLM)
npm run audit:sync                                                    # regenerar el espejo de auditoría
npm run audit:sync -- --check                                         # verificar que esté al día (CI)
```

> ⚠️ `graphify update .` reconstruye el grafo solo con código y **descarta los nodos de documentación**.
> Por eso existe `npm run graph:refresh`, que actualiza el código y vuelve a indexar todo el corpus.
> Quedan fuera por seguridad: `data/`, `ejercicio/`, `serviceAccountKey.json`, `_update_user.cjs`,
> `probar_members.cjs`, `.env`, logs y binarios (`node_modules/`, `dist/`).

Estado al 2026-10-18: grafo construido en el commit `2f202d0`; 133 archivos y 126 comunidades. Incluye la
auditoría y el plan, los 11 tests, las 12 páginas HTML (como nodo de archivo), `.opencode/` y la
configuración. El grafo **se regenera, no se edita a mano**, y no debe publicarse en el sitio (ver C-03).

---

## 🚀 Arranque rápido

Requisitos: **Node.js ≥ 20** (probado con 24), npm 11.

```bash
npm install
cp .env.example .env        # completar JWT_SECRET, SMTP_*, RED_TICKET_*
npm start                   # API + estáticos en http://localhost:5556
npm test                    # 11 suites de tests unitarios
```

Notas:

- `npm run dev` (Vite) y `npm start` (API) usan **el mismo puerto 5556**, y el proxy `/api` de Vite apunta
  a ese mismo puerto (ver M-05). Para probar la aplicación completa, usar `npm start`.
- `npm run build` genera `dist/`; hoy no debe desplegarse (ver C-03).
- La base local es SQLite en `data/snc.sqlite` (ignorada por Git). `data/` **no** se versiona ni se publica.

### Scripts

| Comando | Qué hace | Estado |
|---|---|---|
| `npm start` | Levanta `server-api.js` | ✅ |
| `npm test` | Suites de validación/export/parser/topología/seguridad | ✅ |
| `npm run lint` | ESLint | ❌ no encuentra `eslint.config.js` |
| `npm run typecheck` | `tsc --noEmit` | ❌ `baseUrl` deprecado (TS 6) |
| `npm run build` | Build Vite | ⚠️ verificar en consola local |
| `npm run predeploy` | Gate + tests | ❌ el gate exige un rewrite `/api/**` inexistente |
| `npm run deploy` | Firebase Hosting + Functions | ❌ no existe `functions/` |

---

## 🗂️ Estructura

| Ruta | Contenido |
|---|---|
| `index.html`, `index-municipal.html`, `admin.html`, … | Entradas web (ver A-11: varias **sin versionar**) |
| `js/` | Módulos ESM del cliente: `validator`, `parser`, `export`, `mapEngine`, `state`, `dataTable`, `municipal`, `cogo`, … |
| `server-api.js` | API Express: auth, planes, proyectos, expedientes, archivos, pagos, validaciones PostGIS |
| `db.cjs`, `js/firestore-db.cjs`, `cacheDb.js` | Persistencia (SQLite / Firestore / caché catastral) |
| `tests/` | 11 suites `node:test` |
| `docs/` | Documentación, auditoría y plan de remediación |
| `graphify-out/` | Grafo del repositorio (AST + dominio), reporte y visor. Versionado; **no** público |
| `scripts/` | Backup/restore SQLite, gate de promoción, utilidades |
| `.opencode/coordination/` | Coordinación multi-IA (locks, errores, skills) — **solo CLI, nunca desde el navegador** |
| `data/` | Datos locales y capas SIG (no versionar ni publicar) |

---

## ✅ Verificaciones de referencia (2026-10-18)

| Verificación | Resultado |
|---|---|
| Tests unitarios | 11/11 suites en verde |
| Lint | ❌ |
| Typecheck | ❌ |
| Gate de promoción | ❌ |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| Autorización multi-tenant | ❌ sin tests y con IDOR abierto |

---

## 📚 Documentación

- [Auditoría técnica 2026-10-18](docs/AUDITORIA_SNC_v3_2026-10-18.md)
- [Plan de remediación](docs/PLAN_REMEDIACION_AUDITORIA.md)
- [Espejo de auditoría para agentes](graphify-out/auditoria/README.md) · [`auditoria.json`](graphify-out/auditoria/auditoria.json)
- [Grafo del repositorio (reporte)](graphify-out/GRAPH_REPORT.md)
- [Protocolo multi-IA](AGENTS.md)
- [Estructura y reglas de seguridad](docs/PROJECT_STRUCTURE.md)
- [Deploy](DEPLOY.md) · [Deploy en Windows](DEPLOY_WINDOWS.md)
- [Funcionalidades](docs/FUNCIONALIDADES.md) · [Checklist de promoción](docs/PROMOTION_CHECKLIST.md) (desactualizado: ver M-10)

> Mantener este README y la auditoría actualizados es parte del trabajo: si se cierra un hallazgo,
> actualizar el plan y, si cambia el estado global, la cabecera de este archivo.
