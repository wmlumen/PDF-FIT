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
- Nunca commitear secretos, bases, logs ni artefactos generados.
- Registrar el resultado con `pass`/`fail` antes de terminar la tarea.

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
- [Protocolo multi-IA](AGENTS.md)
- [Estructura y reglas de seguridad](docs/PROJECT_STRUCTURE.md)
- [Deploy](DEPLOY.md) · [Deploy en Windows](DEPLOY_WINDOWS.md)
- [Funcionalidades](docs/FUNCIONALIDADES.md) · [Checklist de promoción](docs/PROMOTION_CHECKLIST.md) (desactualizado: ver M-10)

> Mantener este README y la auditoría actualizados es parte del trabajo: si se cierra un hallazgo,
> actualizar el plan y, si cambia el estado global, la cabecera de este archivo.
