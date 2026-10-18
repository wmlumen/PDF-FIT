# Plan de remediación — Auditoría 2026-10-18

> Documento de trabajo para agentes de IA y personas. Deriva del informe
> [`docs/AUDITORIA_SNC_v3_2026-10-18.md`](AUDITORIA_SNC_v3_2026-10-18.md), que contiene la evidencia
> completa (`archivo:línea`) de los 38 hallazgos.
>
> **Regla de oro:** este archivo es la lista de tareas. La auditoría es la fuente de verdad del *por qué*.

---

## 0. Estado

| Severidad | Total | Resueltos |
|---|---:|---:|
| 🔴 Crítico | 8 | 0 |
| 🟠 Alto | 11 | 0 |
| 🟡 Medio | 10 | 0 |
| 🔵 Bajo | 9 | 0 |

**Veredicto vigente: NO APTO para producción.** No desplegar hasta cerrar la Fase 0 completa y las tareas
A1-1, A1-2, A1-3 y A1-4.

Para actualizar este estado: marcar `[x]` la tarea, anotar el commit en la columna *Cierre* y registrar el
aprendizaje con `node .opencode/coordination/cli.mjs pass …` (ver `AGENTS.md` §2).

---

## 1. Reglas para quien implemente

1. **Un hallazgo por cambio.** No mezclar refactors con correcciones de seguridad; dificulta la revisión y el rollback.
2. **No cerrar un hallazgo sin verificación.** Cada tarea tiene un *criterio de cierre*; si no se puede demostrar, la tarea sigue abierta.
3. **No "arreglar" deshabilitando.** Prohibido comentar tests, relajar `adminMiddleware`, ampliar `CORS_ORIGIN` a `*` o desactivar la CSP para que algo pase.
4. **Secretos fuera del repo, siempre.** Nada de credenciales en código, scripts, docs ni tests. Si una tarea necesita una, se inyecta por variable de entorno.
5. **Respetar el protocolo multi-IA** de [`AGENTS.md`](../AGENTS.md): `route → check → lock → cambio + test → pass|fail`.
6. **No editar artefactos generados** (`dist/`, `graphify-out/`, `data/*.sqlite*`).

---

## 2. Fase 0 — Contención (0-48 h, bloqueante de despliegue)

| # | Acción | Archivos / sistemas | Criterio de cierre |
|---|---|---|---|
| **A0-1** | Revocar la contraseña de aplicación de Gmail; generar una nueva y guardarla fuera del repo | Cuenta Google `wmlumen@gmail.com`, `.env` | La credencial vieja ya no autentica; `git grep` no encuentra el valor |
| **A0-2** | Rotar la clave de servicio de Firebase Admin y retirar el JSON del disco | GCP IAM (`snc511`), `serviceAccountKey.json` | Clave anterior revocada; el backend arranca sin el archivo (o con secreto inyectado) |
| **A0-3** | Dejar de publicar el repositorio: `public: "dist"` y `ignore` completo | [`firebase.json`](../firebase.json), [`firebase.scripts.json`](../firebase.scripts.json) | `curl` a `/ejercicio/contraseña%20app.txt`, `/docs/`, `/tests/`, `/admin.html`, `/_update_user.cjs` devuelve 404 |
| **A0-4** | Sacar del índice y purgar del historial los datos y credenciales versionados | `ejercicio/contraseña app.txt`, `data/users.json`, `data/*.json`, `data/*.bak*`, `data/*.db-shm`, `data/*.db-wal` | Archivos ausentes en `HEAD` y en el historial; `gitleaks` limpio |
| **A0-5** | `JWT_SECRET` obligatorio, aleatorio (≥32 bytes) y validado en **todos** los entornos | [`config.env.js`](../config.env.js), [`.env.example`](../.env.example) | El proceso no arranca con secreto vacío, corto o placeholder |
| **A0-6** | Eliminar `_update_user.cjs` y rotar la contraseña de la cuenta admin afectada | `_update_user.cjs` | Archivo ausente; contraseña anterior inválida; nueva solo en gestor de secretos |
| **A0-7** | Añadir `gitleaks` como pre-commit/CI y completar `.gitignore` (`_*.cjs`, `*.sqlite*`, `graphify-out/`) | `.gitignore`, `.husky/` o `.githooks/`, CI | Un archivo con un secreto de prueba es rechazado |

---

## 3. Fase 1 — Autorización y funcionalidad core (semana 1)

| # | Acción | Archivos | Criterio de cierre |
|---|---|---|---|
| **A1-1** | Helper de propiedad de recurso y aplicación en los 9 endpoints de C-04 | [`server-api.js`](../server-api.js) (675, 768-799, 801-903, 1208, 1225) | Tests negativos: usuario A contra recurso de B → 404/403 en todos |
| **A1-2** | Completar `expedientes` (`findByProject`, `update`, `deleteById`) y migrar `files_json` | [`db.cjs`](../db.cjs) | `GET/POST /api/projects/:id/expedientes`, `PUT/DELETE /api/expedientes/:id` y `/files` responden 200/201 con la base real |
| **A1-3** | Un solo backend por variable `DB_BACKEND`; completar el contrato de Firestore o eliminarlo | `server-api.js`, [`js/firestore-db.cjs`](../js/firestore-db.cjs) | Test de contrato pasa con ambos backends; arranque falla si el backend elegido no inicializa |
| **A1-4** | Webhook con body crudo antes de `express.json`; secreto obligatorio; usar `metadata.payment_id` | `server-api.js` (75, 1252-1296) | Firma HMAC válida aceptada (200) y firma inválida rechazada (401), con test reproducible |
| **A1-5** | `await` en `/api/usage/increment` y health check real | `server-api.js` (271-280, 1336-1347) | Exportar respeta el límite del plan; `/api/health` devuelve 503 con DB caída |
| **A1-6** | Migración de hash legacy y bootstrap de admin fuera del registro | `server-api.js` (335-383), `db.cjs` | Un usuario con `password_hash` antiguo puede entrar y queda migrado; el primer registro es `member` |
| **A1-7** | Rate limit antes del parser de body, store con limpieza y `trust proxy` | `server-api.js` (75, 157-206) | 429 al superar el límite con IP simulada; sin crecimiento del Map |
| **A1-8** | Versionar las 9 páginas HTML faltantes y los íconos | `admin.html`, `login-directo.html`, `register.html`, `recover.html`, `members.html`, `geoconverter.html`, `presentacion.html`, `privacy.html`, `terms.html`, `favicon.svg`, `apple-touch-icon.png` | Clon limpio contiene todas las entradas de `PUBLIC_HTML_FILES`; check en CI |

---

## 4. Fase 2 — Calidad, XSS y cadena de entrega (semanas 2-3)

| # | Acción | Archivos | Criterio de cierre |
|---|---|---|---|
| **A2-1** | Migrar a flat config de ESLint y arreglar dependencias | `.eslintrc.cjs` → `eslint.config.js`, `package.json` | `npm run lint` en verde |
| **A2-2** | Corregir `tsconfig` (baseUrl, claves duplicadas, `server/**`) | [`tsconfig.json`](../tsconfig.json) | `npm run typecheck` en verde |
| **A2-3** | Alinear `firebase.json`, `firebase.scripts.json` y el gate; decidir si hay Functions | `firebase*.json`, [`scripts/promotion_gate.sh`](../scripts/promotion_gate.sh) | `npm run predeploy` en verde y `firebase deploy --only hosting` funciona |
| **A2-4** | CI con test + lint + typecheck + audit + gitleaks; versionar lockfile | `.github/workflows/`, `package-lock.json`, `.gitignore` | Un PR con tests rojos no puede mergear |
| **A2-5** | Escapar HTML del checkout y sanitizar reportes con DOMPurify | `server-api.js` (905-944, 1208-1250) | Payloads `<svg onload>`, `javas&#99;ript:` neutralizados; tests de regresión |
| **A2-6** | Logs sin PII + rotación + escritura asíncrona | `db.cjs` (19-26, 211-239), `cacheDb.js` (31-59) | `db.log` no contiene emails/hashes/geometrías; rotación activa |
| **A2-7** | Consolidar capa de datos, borrar huérfanos y deduplicar `public/` | `db.js`, `js/payment.js`, `js/firebase-client.js`, `public/css/css`, `public/img/img` | `depcheck` sin huérfanos; un solo `css/styles.css` |

---

## 5. Fase 3 — Endurecimiento y deuda (backlog)

| # | Acción | Referencias | Criterio de cierre |
|---|---|---|---|
| **A3-1** | `helmet`, CSP estricta sin CDNs, empaquetar Tailwind y Turf | M-07, M-08 | CSP con `script-src 'self'`; sin `cdn.tailwindcss.com` |
| **A3-2** | Migraciones versionadas y cuotas atómicas; persistir/limitar temp projects | M-02, M-09 | Migraciones idempotentes; sin `tempProjects` sin TTL |
| **A3-3** | Regenerar documentación desde el pipeline; eliminar casillas manuales | M-10 | `docs/README.md` y checklist reflejan el estado real |
| **A3-4** | Limpieza de ruido, encoding y artefactos | B-01…B-09 | `git ls-files` sin binarios/logs/artefactos de agentes |

---

## 6. Zonas congeladas hasta cerrar Fase 0

No aceptar cambios (salvo los de la propia Fase 0) en:

- `firebase.json`, `firebase.scripts.json`, `.firebaserc` — despliegue.
- `.env`, `serviceAccountKey.json`, `config.env.js` — secretos.
- `server-api.js` en las secciones de auth/IDOR/pagos — requieren el fix de A1-1/A1-4, no parches parciales.
- `db.cjs` en el esquema — esperar A1-2 para evitar un cuarto esquema divergente.

---

## 7. Cómo retomar el trabajo

```bash
node .opencode/coordination/cli.mjs status
node .opencode/coordination/cli.mjs route "arreglar autorizacion de expedientes"
node .opencode/coordination/cli.mjs check "fix_idor_expedientes" server-api.js
node .opencode/coordination/cli.mjs lock server-api.js
# … implementar + npm test …
node .opencode/coordination/cli.mjs pass "fix_idor_expedientes" "ownership helper + tests negativos" server-api.js
```

Al terminar una tarea: marcar `[x]` en la tabla, indicar el commit y ejecutar `pass`. Si el enfoque falló,
ejecutar `fail` con el motivo exacto antes de intentar otra cosa (así la próxima IA no repite el error).
