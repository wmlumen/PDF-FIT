# Auditoría técnica — SNC_v3 (Catastro PY / Res. SNC 551/2023)

**Fecha:** 2026-10-18
**Alcance:** `SNC2/SNC_v3` completo (frontend, backend Express, capa SQLite/Firestore, configuración de despliegue, repositorio Git)
**Modalidad:** auditoría estática + verificación empírica de contratos, esquemas y pipelines (sin pruebas de intrusión dinámicas)
**Veredicto general:** **NO APTO para producción** en su estado actual. Hay 8 hallazgos críticos (credenciales reales versionadas, IDOR multi-tenant, emisión de JWT forjables, endpoints core en 500) y un pipeline de calidad que no pasa ni lint, ni typecheck, ni el propio gate de promoción, pese a que la documentación declara "production-ready".

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | Impacto agregado |
|---|---:|---|
| 🔴 Crítico | 8 | Fuga de credenciales, toma de control de cuentas/admin, fuga y borrado de datos de otros usuarios, pagos no confirmados |
| 🟠 Alto | 11 | Funcionalidad core rota, controles de abuso inefectivos, XSS, logs con PII, frontend no versionado, cadena de entrega inexistente |
| 🟡 Medio | 10 | Deuda estructural: tres capas de datos, duplicación, código muerto, configuración incoherente |
| 🔵 Bajo | 9 | Higiene de repositorio, encoding, documentación desactualizada |

**Los cinco problemas que hay que resolver antes de cualquier otra cosa:**

1. **Credenciales reales dentro del repositorio y del deploy.** La contraseña de aplicación de Gmail está en `ejercicio/contraseña app.txt` (versionado) y coincide con `SMTP_PASS` de `.env`. El archivo `_update_user.cjs` (sin versionar, pero publicable) contiene en claro la **contraseña de una cuenta admin** (`wmlumen@gmail.com`). Además hay copias de la base (`data/users.json`, `data/snc.sqlite.bak.20260803203003`) con hashes de contraseñas de usuarios.
2. **`firebase.json` publica el repositorio entero** (`"public": "."`), por lo que ese archivo con la contraseña, los docs internos y los datos de prueba quedarían descargables desde `snc511.web.app`.
3. **IDOR multi-tenant:** 8 endpoints de proyectos/expedientes/archivos/pagos no verifican que el recurso pertenezca al usuario autenticado. Cualquier cuenta puede leer o borrar expedientes ajenos.
4. **JWT forjables:** `JWT_SECRET` tiene valor por defecto conocido (`config.env.js:8`) y el `.env` local usa ese placeholder. Con un `userId` de admin (también versionado en `data/users.json`) se puede emitir un token válido.
5. **El backend que corre no es el que se documenta y está incompleto:** Firestore falla al inicializar (`admin.apps` ya no existe en firebase-admin 14) y hay *fallback silencioso* a SQLite; pero `db.cjs` no implementa `expedientes.findByProject/update/deleteById` y el esquema no tiene `files_json`. Resultado: expedientes y adjuntos responden 500.

**Lo que está bien y conviene preservar:** SQL parametrizado en el 100 % de las consultas revisadas (no se encontró SQL injection), bcrypt con coste 12, política de contraseñas en registro, comparación HMAC con `timingSafeEqual`, lista blanca de estáticos en Express, cabeceras CSP/HSTS/X-Frame-Options, y 11 suites de tests unitarios que pasan íntegramente.

---

## 2. Inventario auditado

| Métrica | Valor |
|---|---|
| Archivos fuente (js/mjs/cjs/html/css) | 89 |
| Líneas de código fuente | ~22.992 |
| Archivos versionados en Git | 186 (de 13 HTML solo 3) |
| Tamaño del repo sin `node_modules`/`dist` | ~109 MB |
| `node_modules` | 286 MB / 415 paquetes |
| `dist/` | 41,4 MB (ignorado por Git, presente en disco) |
| Módulos JS/ESM | 66 (52 alcanzables, **14 huérfanos**) |
| Suites de test | 11 archivos `.mjs` |
| CI | **inexistente** (no hay `.github/`, ni hooks de Husky efectivos) |

Componentes principales:

| Componente | Archivos | Rol |
|---|---|---|
| Backend HTTP | `server-api.js` (1.694 líneas) | Express 5: auth, planes, proyectos, expedientes, pagos, validaciones PostGIS, estáticos |
| Capa de datos | `db.cjs` (458), `db.js` (195), `js/firestore-db.cjs` (471) | Tres implementaciones distintas del mismo "contrato" |
| Caché catastral | `cacheDb.js` (156) | SQLite + Turf para autocompletado por punto |
| Frontend core | `js/export.js` (2.298), `js/mapEngine.js` (1.884), `js/parser.js` (852), `js/validator.js` (657) | GIS, validación normativa, exportación |
| Entradas HTML | `index.html`, `index-municipal.html`, `admin.html`, `fluxograma.html` + 9 secundarias | Sin framework; scripts inline y módulos ESM |
| Configuración | `vite.config.js`, `firebase.json`, `firebase.scripts.json`, `.eslintrc.cjs`, `tsconfig.json` | Build, hosting y calidad |
| Artefactos de agentes | `graphify-out/` (grafo AST + dominio, ≈1,2 MB) y `.opencode/coordination/` (≈1.400 líneas) | Versionados a propósito: `graphify-out/` es la fuente de verdad del repo; ninguno forma parte del runtime ni debe publicarse |

---

## 3. Verificaciones ejecutadas (evidencia)

| # | Verificación | Comando | Resultado |
|---|---|---|---|
| V1 | Tests unitarios | `npm test` | ✅ 11/11 suites en verde (export 20/20, workflow 14/14, geometry 10/10, cogo 12/12, lineage 10/10, topology 6/6, versioning 9/9, geoprocessing 8/8, segment 5/5, api-security 22/22) |
| V2 | Lint | `npm run lint` | ❌ `ESLint 10.13.0 couldn't find an eslint.config.* file` |
| V3 | Typecheck | `npm run typecheck` | ❌ `TS5101: Option 'baseUrl' is deprecated` (TypeScript 6.0.3) |
| V4 | Build | `npm run build` | ⚠️ No verificable en este entorno: `spawn EPERM` en `optimizeSafeRealPathSync` (restricción del sandbox, no del código). Reintentar en consola normal. |
| V5 | Auditoría de dependencias | `npm audit --omit=dev` | ✅ 0 vulnerabilidades reportadas |
| V6 | Gate de promoción | `scripts/promotion_gate.sh` (bloque Node) | ❌ `FAIL: rewrite /api/** ausente` en `firebase.json` |
| V7 | Contrato `db.cjs` vs `server-api.js` | script de introspección | ❌ faltan `expedientes.findByProject`, `.update`, `.deleteById` |
| V8 | Contrato `firestore-db.cjs` | `require()` | ❌ `TypeError: Cannot read properties of undefined (reading 'length')` en `firestore-db.cjs:7` |
| V9 | Esquema SQLite real | `PRAGMA table_info(expedientes)` | ❌ columnas: `id, project_id, name, state_json, validation_results, created_at, updated_at` → **no existe `files_json`** |
| V10 | Secretos versionados | `git ls-files` + inspección | ❌ contraseña SMTP, `users.json`, backup `.sqlite.bak`, hashes |
| V11 | Alcanzabilidad de módulos | grafo de imports | ❌ 14 módulos huérfanos (incl. `firebase-client.js`, `payment.js`, `db.js`) |
| V12 | Duplicación de assets | SHA-256 | ❌ `css/styles.css` == `public/css/styles.css` == `public/css/css/styles.css` |
| V13 | Cobertura de versionado | `git ls-files` vs disco | ❌ 10 de 13 HTML sin trackear (`admin`, `login-directo`, `register`, `recover`, `members`, `geoconverter`, `presentacion`, `privacy`, `terms`, `fluxograma`) |

**No verificado (fuera de alcance o bloqueado):** arranque real del servidor con la base de producción, pruebas dinámicas de autorización, build completo, y comportamiento de Firebase Hosting real.

---

## 4. Hallazgos críticos

### C-01 · Credenciales reales versionadas en Git
**Evidencia**
- `ejercicio/contraseña app.txt` (versionado, commit `4e1fe08`) contiene la contraseña de aplicación de Gmail en formato espaciado.
- `.env:4` define `SMTP_PASS` con **el mismo valor** (sin espacios) y `.env:3` el correo `wmlumen@gmail.com`.
- `data/users.json` (versionado) contiene 4 usuarios con hashes legacy de 64 caracteres hexadecimales (SHA-256 sin sal); los 4 comparten el mismo hash (`a98e616…`), es decir, la misma contraseña.
- `data/snc.sqlite.bak.20260803203003`, `-wal` y `-shm` (versionados) son una copia de la base con 8 usuarios.
- `data/payments.json`, `projects.json`, `expedientes.json` también están versionados.
- `_update_user.cjs` (raíz, **sin versionar pero publicable** por C-03) contiene en claro la contraseña de `wmlumen@gmail.com` (rol admin) y el código que la re-hashea con bcrypt coste 10.

**Impacto:** cualquiera con acceso al repositorio (o al sitio publicado, ver C-03) puede usar la cuenta de Gmail para enviar correo en nombre del proyecto, y dispone de hashes sin sal (cracking/rainbow table trivial y correlación entre cuentas) y de datos de usuarios y compradores.

**Hallazgo asociado (verificado en la base local):** 4 de los 8 usuarios tienen **solo** hash legacy (`password_hash_v2` nulo), incluido `test@redticket.test` con rol **admin**. Por A-03 esos usuarios no pueden iniciar sesión.

**Remediación**
1. Revocar la contraseña de aplicación en la cuenta de Google y generar otra fuera del repo.
2. Cambiar la contraseña de `wmlumen@gmail.com` y borrar `_update_user.cjs` (o moverlo a un CLI que reciba la contraseña por variable de entorno).
3. Sacar del índice: `git rm --cached "ejercicio/contraseña app.txt" data/users.json data/*.json data/*.bak* data/*.db-shm data/*.db-wal`.
4. Purgar el historial (`git filter-repo --path … --invert-paths` o BFG) y forzar push; asumir que ya está comprometido.
5. Añadir reglas eficaces a `.gitignore` y un pre-commit con `gitleaks`.

---

### C-02 · Clave privada de Firebase Admin en el workspace
**Evidencia:** `serviceAccountKey.json` existe en la raíz con `type: service_account`, `project_id: snc511`, `private_key` RSA de 1.704 caracteres y `client_email: firebase-adminsdk-fbsvc@snc511.iam.gserviceaccount.com`. No está versionado (`.gitignore:5`) pero sí en disco sin cifrar y es consumido automáticamente por el backend.

**Impacto:** acceso administrativo total al proyecto Firebase (Firestore, Auth, Storage). Cualquier copia del directorio (ZIP, backup, `dist`, sincronización en la nube) lo filtra.

**Remediación:** rotar la clave en GCP (IAM → cuentas de servicio → nueva clave), revocar la anterior, y migrar a *Application Default Credentials* o a un gestor de secretos. Los scripts `backup-secure.ps1`/`restore-secure-secret.ps1` ya usan DPAPI: usarlos como mínimo, nunca dejar el JSON en claro.

---

### C-03 · El despliegue publica todo el repositorio
**Evidencia:** `firebase.json:3` → `"public": "."`; la lista `ignore` (líneas 5-13) solo excluye `firebase.json`, dotfiles, `node_modules`, `data/**`, `serviceAccountKey.json`, `.env`, `*.sqlite`, `*.db`.

**Consecuencia:** se publican `ejercicio/contraseña app.txt`, `_update_user.cjs` (**con la contraseña del admin en claro**), `docs/**`, `tests/**` (incluye `datos_catastro.csv` y `archivo_parcela.geojson`), `scripts/**`, `ideas/*.docx`, `graphify-out/**` (grafo del código), `plantilla_oficial_SNC_551_2023.xlsx`, `cordenadas.csv`, `poligonos_z20.csv`, y `admin.html` como archivo estático —esto último **anula** la protección `authMiddleware + adminMiddleware` de `server-api.js:1643` cuando se sirve por Hosting—.

`firebase.scripts.json` tiene el mismo `public: "."`.

**Remediación:** publicar un artefacto de build (`"public": "dist"`), nunca la raíz. Mientras tanto, ampliar `ignore` con `docs/**`, `tests/**`, `scripts/**`, `ejercicio/**`, `ideas/**`, `graphify-out/**`, `_update_user.cjs`, `*.xlsx`, `*.csv`, `admin.html` (si debe servirse, hacerlo desde Express). Verificar con `firebase hosting:channel:deploy` + `curl` de los paths sensibles.

---

### C-04 · IDOR multi-tenant en proyectos, expedientes, archivos y pagos
**Evidencia (`server-api.js`):**

| Endpoint | Línea | Comprobación de propiedad |
|---|---:|---|
| `DELETE /api/projects/:id` | 675 | ❌ ninguna |
| `GET /api/projects/:projectId/expedientes` | 768 | ❌ ninguna |
| `POST /api/projects/:projectId/expedientes` | 780 | ❌ ninguna (también permite crear expedientes en proyectos ajenos) |
| `GET /api/expedientes/:id` | 801 | ❌ ninguna |
| `PUT /api/expedientes/:id` | 831 | ✅ `project.user_id !== req.user.userId` (línea 835) |
| `DELETE /api/expedientes/:id` | 852 | ❌ ninguna |
| `GET/POST/DELETE /api/expedientes/:id/files` | 863 / 878 / 889 | ❌ ninguna |
| `GET /api/payments/redticket/checkout/:id` | 1208 | ❌ ninguna (expone nombre, email, documento y teléfono del comprador) |
| `GET /api/payments/redticket/success/:id` | 1225 | ❌ ninguna |

**Impacto:** con una cuenta gratuita autoregistrada se pueden enumerar UUIDs (vienen en las respuestas de listados compartidos o en logs) y leer/borrar expedientes y proyectos de terceros, y descargar datos personales de compradores.

**Remediación:** helper único `assertOwnership(recurso, userId)` aplicado a todo recurso derivado; idealmente filtrar por `user_id` en la propia consulta SQL (`WHERE p.id = ? AND p.user_id = ?`) en lugar de comparar en memoria. Añadir tests de integración negativos (usuario A contra recurso de B → 404/403).

---

### C-05 · Tokens JWT forjables / sesiones no revocables
**Evidencia**
- `config.env.js:8`: `JWT_SECRET` cae por defecto a `'snc-v3-development-only-change-me'` cuando `NODE_ENV !== 'production'`; el guard de producción (`config.env.js:21-25`) solo actúa si `NODE_ENV === 'production'`.
- `.env:5` y `.env:7`: el archivo local usa exactamente ese secreto y `NODE_ENV=development`.
- `server-api.js:348,377`: el token se firma solo con `{ userId, email }`, con `JWT_EXPIRES` de 7 días.
- `data/users.json` (versionado) expone los `id` de usuarios, incluido el admin.
- No hay `tokenVersion`/blacklist: suspender un usuario (`adminMiddleware` sí valida estado, pero los endpoints normales no) no invalida la sesión.

**Impacto:** con el secreto conocido + un `userId` de admin se emite un token válido y se accede a `/api/admin/*` hasta 7 días. Si el servidor se expone con `HOST=0.0.0.0` y este `.env`, la toma de control es trivial.

**Remediación:** secreto de 32 bytes aleatorios por entorno, obligatorio siempre (no solo en producción; fallar al arrancar si falta), rotación, `jti` + lista de revocación, expiración corta con refresh, y validar `status` en `authMiddleware` (una consulta cacheada).

---

### C-06 · Firestore roto + fallback silencioso a SQLite
**Evidencia**
- `js/firestore-db.cjs:7`: `if (!admin.apps.length && …)` → con `firebase-admin@14.5.0`, `admin.apps` es `undefined` (verificado: `TypeError: Cannot read properties of undefined (reading 'length')`).
- `server-api.js:12-23`: el `require` está en un `try/catch` que, ante cualquier error, cae a `require('./db.cjs')` registrando solo un `logger.error`.
- Aun corrigiendo el arranque, el contrato está incompleto: faltan `users.findByIp`, `listByIp`, `insertIpEvent`, `updateLoginIp`, `setBlocked`, `getStats`, `updateStats`. `server-api.js:371` llama `dbAPI.users.findByIp(...)` en el login → 500.

**Impacto:** el backend real es SQLite aunque exista `serviceAccountKey.json`; el operador cree estar en Firestore. Si se arregla el `require`, el login deja de funcionar. Es un fallo de arquitectura, no solo un bug.

**Remediación:** elegir **un** backend por variable de entorno explícita (`DB_BACKEND=sqlite|firestore`), sin autodetección por presencia de archivo; implementar el contrato completo con una interfaz tipada y tests de contrato compartidos; fallar el arranque si el backend elegido no inicializa.

---

### C-07 · Endpoints core en 500: contrato `db.cjs` incompleto y `files_json` inexistente
**Evidencia**
- `db.cjs` exporta `expedientes` con solo `insert`, `listByProject`, `findById`, `deleteByProject` (líneas 380-394). El servidor usa además `findByProject` (771, 784, 1317), `update` (840, 882, 898) y `deleteById` (856).
- El esquema `CREATE TABLE expedientes` (`db.cjs:86-95`) **no incluye `files_json`**, pero se inserta y actualiza (`db.cjs:382-383`, `server-api.js:882`). Verificado contra la base real: la columna no existe.

**Impacto:** `GET/POST /api/projects/:id/expedientes`, `PUT/DELETE /api/expedientes/:id`, `/api/usage` y todos los endpoints de archivos responden 500. Es decir, el flujo principal de expedientes y adjuntos está caído.

**Remediación:** completar `db.cjs` (`findByProject` como alias de `listByProject`, `update` con campos permitidos, `deleteById`) y agregar migración idempotente `ALTER TABLE expedientes ADD COLUMN files_json TEXT` ejecutada en un runner de migraciones versionado (no con callbacks vacíos). Añadir test de contrato que recorra todos los métodos usados por `server-api.js`.

---

### C-08 · El webhook de pagos no puede validar la firma
**Evidencia**
- `server-api.js:75`: `app.use(express.json({ limit: '10mb' }))` se registra globalmente.
- `server-api.js:1252`: el webhook intenta `express.raw({ type: 'application/json' })` **después** de que el body ya fue consumido/parseado; `req.body` es un objeto y `req.body?.toString?.()` devuelve `"[object Object]"`.
- `server-api.js:1258`: `verifyWebhook(..., process.env.RED_TICKET_WEBHOOK_SECRET || '')`; `RED_TICKET_WEBHOOK_SECRET` está documentado en `.env.example:34` pero **no definido en `.env`**, y `verifyWebhook` devuelve `false` si falta (`js/redticket-payments.js:23`).
- El `external_ref` generado es `SNC-<uuid>` (`server-api.js:1150`), pero el webhook intenta extraer `payment_id=` de él (`1266`), por lo que esa vía nunca coincide.

**Impacto:** todo webhook responde 401; los pagos quedan `pending` y la activación depende de `simulate-pay` (admin) o del flujo `success` (que consulta el proveedor). Riesgo de cobro sin activación o de activación manual inconsistente.

**Remediación:** montar el webhook **antes** del parser JSON global (`app.post(path, express.raw(...), handler)` registrado antes de `app.use(express.json)`), o excluir la ruta del parser; usar `metadata.payment_id` en lugar de parsear `external_ref`; exigir el secreto (si falta, 503 en arranque).

---

## 5. Hallazgos altos

### A-01 · `/api/usage/increment` responde 403 siempre
`server-api.js:1336-1347`: `const user = dbAPI.users.findByEmail(...)` sin `await` (Promise) y `const current = dbAPI.usage.get(key) || 0` también sin `await` (Promise). `canExport('free', Promise)` compara `Promise < 3` → `false`, por lo que **siempre** devuelve 403 y nunca incrementa. El control de exportaciones queda a la vez roto y no aplicado en otros caminos.
**Fix:** `const user = await dbAPI.users.findByEmail(req.user.email); const current = await dbAPI.usage.get(key);` y usar una operación atómica `increment-if-below-limit` para evitar TOCTOU.

### A-02 · Health check que siempre dice "ok"
`server-api.js:271-280`: `dbAPI.users.list?.().catch(() => {})` no se espera; `dbOk = true` es incondicional. El checklist (`docs/PROMOTION_CHECKLIST.md:44`, "Health check con verificación real de DB") es falso.
**Fix:** `await dbAPI.users.count()` dentro de `try`, con timeout y `res.status(503)` si falla.

### A-03 · Los usuarios con hash legacy no pueden iniciar sesión
`server-api.js:362-368`: se valida `verifyPassword(user.password_hash_v2, password)` y, si falla, se retorna 401 **antes** de la rama que migra el hash legacy (`if (!user.password_hash_v2)`). `verifyPassword(undefined, …)` siempre devuelve `false`. La migración de `password_hash` a `password_hash_v2` es código inalcanzable.

**Evidencia en datos:** en `data/snc.sqlite`, 4 de 8 usuarios tienen `password_hash_v2 = NULL` (hash legacy de 64 hex), incluido `test@redticket.test` con rol **admin**. Esos usuarios quedan bloqueados fuera del sistema, y `scripts/rotate_legacy_hashes.sh` no puede compensarlo porque necesita la contraseña en claro.

**Fix:** evaluar primero `password_hash_v2`; si es nulo, validar `password_hash` (con `bcrypt.compare` o el esquema legacy correspondiente), migrar y limpiar; luego 401.

### A-04 · El primer usuario registrado se convierte en administrador
`server-api.js:344-346`: `isFirstUser = (await dbAPI.users.count()) === 0` → `role: 'admin'`. El registro es público (línea 335). En un entorno nuevo, o tras un borrado de datos, cualquiera que se registre primero obtiene admin. Además es una condición de carrera (dos registros concurrentes).
**Fix:** crear el admin por seeding/CLI fuera de banda (`ensureAdmin` ya existe) y eliminar la promoción automática en el registro.

### A-05 · Rate limiting inefectivo
- `rateMap`/`sensitiveRateMap` son `Map` en memoria que **nunca se purgan** (`server-api.js:157-203`) → crecimiento de memoria y reinicio del contador al reiniciar.
- Sin `app.set('trust proxy', …)`: detrás de un proxy/CDN todos los clientes comparten IP → un atacante bloquea a todos, o el límite se evade.
- El middleware se monta en la línea 205, **después** de `express.json` (75): un atacante puede enviar cuerpos de 10 MB sin pasar por el límite.
**Fix:** `express-rate-limit` con store compartido (Redis) o al menos limpieza periódica, `trust proxy` correcto, y rate limit antes del parser de body.

### A-06 · XSS almacenado en el checkout de pagos (y alcanzable por un admin vía IDOR)
`server-api.js:1218` interpola `buyerName`, `buyerEmail`, `payment.amount`, `payment.currency` y `plan?.name` en el HTML sin escapar. `sanitizeBuyer` (241-249) solo recorta longitudes. Combinado con C-04 (`checkout/:id` sin ownership), un usuario puede crear un pago con `name = <svg onload=…>` y conseguir que un administrador abra esa URL: el script corre en el origen de la app y puede exfiltrar el token de `localStorage`.
**Fix:** escapar con una función `escapeHtml`/plantilla segura (o renderizar en el cliente), y añadir ownership en `checkout/:id`.

### A-07 · Sanitización de HTML por regex y reporte "público" que exige login
`server-api.js:911-919` elimina `<script>`, eventos entrecomillados, `javascript:` literal, `<iframe>`, `<object>`, `<embed>` y `<link>`. Es evadible (`<svg onload=alert(1)>` sin comillas, `javas&#99;ript:`, `<img src=x onerror=…>` con comillas simples escapadas, etc.). La CSP (`default-src 'none'`, línea 263) mitiga la ejecución en navegadores modernos, pero no es la defensa correcta. Además `GET /report/:id` (933) exige `authMiddleware`: los enlaces generados como "reporte público" (926) no se pueden compartir, y el primer acceso desde otro navegador devuelve 401.
**Fix:** sanitizar en servidor con DOMPurify (JSDOM) o almacenar JSON y renderizar en cliente; separar `public_reports` (público, con token no adivinable y caducidad) de reportes privados.

### A-08 · Logs con datos sensibles y sin rotación
`db.cjs:213,223,234` registran **consulta + parámetros** de cada query en `data/db.log` (133 KB, 269 líneas, 4 `INSERT INTO users` con hashes de contraseñas y correos). Cada INSERT/UPDATE de usuario pasa por ahí. `cacheDb.js:34,46,53` hace lo mismo con geometrías completas: `data/cacheDb.log` pesa **12,94 MB** con 8.193 líneas. Ambos usan `appendFileSync` por consulta (bloquea el event loop) y no rotan.
**Fix:** logger estructurado con niveles, nunca loguear `params` (o redactar `password*`, `token`, `email`), escritura asíncrona con buffer, rotación (`pino` + `pino-roll`, o logrotate) y exclusión de `data/` del deploy (ya está, pero también del backup).

### A-09 · Pipeline de calidad y promoción roto
| Pieza | Estado | Causa |
|---|---|---|
| `npm run lint` | ❌ | ESLint 10 exige `eslint.config.js`; el proyecto usa `.eslintrc.cjs`, que además extiende `prettier` sin tener `eslint-config-prettier` instalado |
| `npm run typecheck` | ❌ | `tsconfig.json:15` `baseUrl` deprecado en TS 6; clave `forceConsistentCasingInFileNames` duplicada (37 y 41); `include` apunta a `server/**/*`, que no existe |
| `npm run predeploy` | ❌ | `scripts/promotion_gate.sh:44` exige el rewrite `/api/**` → función `api`, que **no está** en `firebase.json` |
| `npm run deploy` | ❌ | `firebase.json:19` declara `functions.source: "functions"`, directorio inexistente; no hay `firebase-functions` ni `firebase` instalados |
| CI | ❌ | No hay `.github/workflows`; Husky está como dependencia pero no hay `.husky/` |
| Cobertura | ⚠️ | `docs/qa/coverage.md:23` reconoce que es "estimada… no por líneas instrumentadas" |

**Impacto:** nada impide mergear código roto; el "gate" que la documentación dice aprobado no pasa hoy.

**Fix:** migrar a flat config, arreglar `tsconfig`, alinear `firebase.json` con `firebase.scripts.json` (o eliminar el segundo), decidir si hay Cloud Functions (y crearlas) o si el hosting es solo estático, y montar CI con `test + lint + typecheck + gate + gitleaks`.

### A-10 · Sin tests de API ni de autorización; dependencias no reproducibles
Los 11 tests cubren lógica pura (`validator`, `export`, `parser`, `cogo`, `geoprocessing`, `versioning`…) y, en el caso de `api-security.test.mjs`, **solo funciones de sanitización**, no rutas. No hay `supertest` ni pruebas de login, IDOR, límites de plan o webhook. Además `package-lock.json` está en `.gitignore:29`, por lo que las instalaciones no son reproducibles (415 paquetes resueltos por rango `^`).

### A-11 · El frontend de autenticación no está versionado
**Evidencia:** de las 13 páginas HTML del proyecto, Git solo versiona **3** (`index.html`, `index-municipal.html`, `test-municipal.html`). Están sin trackear: `admin.html`, `login-directo.html`, `register.html`, `recover.html`, `members.html`, `geoconverter.html`, `presentacion.html`, `privacy.html`, `terms.html` (y `fluxograma.html` está explícitamente ignorado en `.gitignore:72`). También quedaron fuera `favicon.svg` y `apple-touch-icon.png`.

**Impacto:** un clon limpio del repositorio **no puede** servir login, registro, recuperación, membresía ni panel de administración; `server-api.js:52-64` los declara como públicos y `firebase.json` los publica solo desde el disco de esta máquina. Es decir, el despliegue real no es reproducible a partir del repositorio, y se pierde el historial de cambios de esas pantallas (que concentran la autenticación y parte del XSS revisado en `admin.html`).

**Remediación:** `git add` de las 9 páginas y de los íconos; revisar si `fluxograma.html` debe seguir ignorado (es una página de diagnóstico de 147 KB, no un artefacto generado); añadir un check en CI que compare los HTML de `PUBLIC_HTML_FILES` con `git ls-files`.

---

## 6. Hallazgos medios

| ID | Hallazgo | Evidencia | Impacto | Remediación |
|---|---|---|---|---|
| M-01 | **Tres capas de datos divergentes** | `db.cjs` (SQLite callback), `db.js` (better-sqlite3 ESM, huérfano), `js/firestore-db.cjs` (Firestore) | Esquemas y contratos distintos; bugs como C-06/C-07 | Una sola interfaz + un adaptador por backend, con tests de contrato compartidos |
| M-02 | **Migraciones improvisadas** | `db.cjs:57-62` `ALTER TABLE` con callbacks vacíos; `PRAGMA journal_mode=DELETE` vs `WAL` en `db.js:11` | Drift de esquema (origen de `files_json` faltante) | Runner de migraciones versionado (`001_init.sql`, `002_files_json.sql`, …) |
| M-03 | **Assets duplicados** | SHA-256 idéntico en `css/styles.css`, `public/css/styles.css`, `public/css/css/styles.css`; `img/icon.svg` y `public/img/img/icon.svg` | +150 KB y confusión sobre cuál se edita | Un solo origen (`css/`, `img/`) y `publicDir` explícito |
| M-04 | **14 módulos huérfanos** | `db.js`, `js/firebase-client.js`, `js/firebase-admin.js`, `js/payment.js`, `js/admin_diagnostic.js`, `js/backup_complement.js`, `members_api_block.js`, `migrate.mjs`, `db.load.mjs`, `fix_members_auth.mjs`, `register-errors.mjs`, `probar_members.cjs`, … | `payment.js` usa `require` dentro de un paquete `"type":"module"` (inválido); `firebase-client.js` importa `firebase`, que **no está** en `package.json`, con `apiKey` hardcodeada | Borrar o mover a `tools/`/`legacy/`; si se usa Firebase Web, instalar el SDK y externalizar la config |
| M-05 | **`vite.config.js` con defectos** | Clave `css` duplicada (121 y 138) → pierde `devSourcemap`; alias `@server` → `server/` inexistente (132); `optimizeDeps.include` de `jspdf`, `leaflet`, `qrcode`, `dom-to-image` no instalados; `manualChunks` para paquetes ausentes | Build/dev frágil y chunks muertos | Limpiar claves duplicadas, alinear `dependencies` con lo realmente importado |
| M-06 | **Dependencias declaradas y no usadas** | `graphify`, `node-cache`, `husky`, `lint-staged`, `typescript`, `@typescript-eslint/*`; `firebase`/`firebase-functions` ausentes pero usados | 286 MB de `node_modules`; falsa sensación de tooling | `npm prune`, `depcheck` en CI |
| M-07 | **CSP y cadena de suministro permisivas** | `server-api.js:263` permite `unpkg.com`, `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `cdn.tailwindcss.com`; `admin.html:11` y otras páginas cargan Tailwind CDN (no recomendado en producción); `js/topology.worker.js:4` hace `importScripts('https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js')`; **0 atributos `integrity`** en el repo | Compromiso de un CDN ⇒ ejecución de código en el origen de la app | Empaquetar dependencias (Vite), eliminar Tailwind CDN, CSP con `script-src 'self'` + hashes/nonces |
| M-08 | **Endurecimiento HTTP incompleto** | Sin `helmet`, sin compresión, sin redirección HTTPS, sin `trust proxy`; errores internos devueltos al cliente: `pgErr.message`/`e.message` en 1038, 1420, 1479, 1563, 1623; `res.json` con `detail` en validaciones | Fuga de detalles de infraestructura; comportamiento inconsistente tras proxy | `helmet`, `compression`, `trust proxy`, mensajes genéricos + log interno con `requestId` |
| M-09 | **Modelo de planes/uso defectuoso** | `tempProjects` en memoria sin límite ni TTL (470, 687-766); `resolvePlan` cae a `free` en silencio (129-131); `snc-toggle` responde pero no persiste (312-325); check-then-increment TOCTOU | Fuga de memoria, límites eludibles, features "fantasma" | Persistir temp projects o limitarlos; plan explícito obligatorio; cuotas atómicas |
| M-10 | **Documentación que contradice el código** | `docs/README.md:5,131` "production-ready"; `docs/PROMOTION_CHECKLIST.md:30,44,64` marca `[x]` tests, health real y gate; `docs/PROJECT_STRUCTURE.md:6` "las bases de datos no se versionan" mientras `data/users.json` y `data/*.bak` están versionados; `DEPLOY.md` "0 errores críticos" | Riesgo operativo: se promueve sin verificación real | Conversion de la checklist en *scripts* verificables (no casillas manuales); regenerar docs desde el pipeline |

---

## 7. Hallazgos bajos

| ID | Hallazgo | Evidencia |
|---|---|---|
| B-01 | Ruido de repositorio | `Nodos error (rojo punteado）` (archivo vacío con caracteres inválidos), `cacheDb.db` (0 bytes), `docs/frontend-p2-improvements.diff`, `members_api_block.js` (fragmento suelto), `firebase.scripts.json` (config alternativa), `.opencode/coordination/` (~1.400 líneas de meta-herramientas), `probar_members.cjs`, `fix_members_auth.mjs`, `register-errors.mjs` |
| B-02 | Encoding: un solo caso real (el resto era falso positivo) | Solo `js/mapEngine.js:1852` tiene doble codificación UTF-8 (`cartogrÃ¡ficas`, `certificaciÃ³n`). El resto de los archivos —incluidos `login-directo.html`, `js/app.js`, `DEPLOY.md`, `js/topology.worker.js`— es UTF-8 válido; el "mojibake" observado era un artefacto de la consola de Windows. Corregir la línea y añadir `.editorconfig` + check de encoding en CI |
| B-03 | Rutas y credenciales hardcodeadas | `deploy-windows.ps1:36-37` rutas absolutas de la máquina del autor; `probar_members.cjs:30` credenciales `santo.palo@gmail.com` / `123*`. Ese correo corresponde a una cuenta **admin** en la base local; verificado que `123*` no coincide con el hash almacenado, pero el correo y el patrón de contraseña quedan expuestos |
| B-04 | Grafo del repo versionado (decisión del proyecto) | `graphify-out/` (`graph.json`, `grafo_dominio.json`, `GRAPH_REPORT.md`, `graph.html`, `cache/`) se versiona a propósito como fuente de verdad. Riesgo real: se publica por C-03 y está desactualizado (`built_at_commit: 259c361`). Mantenerlo con `graphify update .` y excluirlo del deploy; nunca editarlo a mano |
| B-05 | Archivos WAL/SHM versionados | `data/catastro_cache.db-shm`, `data/catastro_cache.db-wal` (binarios que cambian en cada ejecución) |
| B-06 | Configuración TypeScript/ESLint histórica | `tsconfig.json` con `server/**/*` inexistente y claves duplicadas; `.eslintrc.cjs` incompatible con ESLint 10; sin `.editorconfig` |
| B-07 | Rendimiento del caché catastral | `cacheDb.js:135-140` guarda features con `await` secuencial (N+1) y ejecuta `pruneCache()` (COUNT + DELETE) en **cada** lote; con 20.000 filas es O(n) por request |
| B-08 | Uso implícito de `crypto` global | `db.cjs:319` usa `crypto.randomUUID()` sin `require('node:crypto')`; funciona por el global de Node ≥ 19, pero es frágil |
| B-09 | Fallback SPA y bloqueo por extensión | `server-api.js:1654` devuelve 404 a cualquier ruta con extensión (`extname`), incluidas rutas legítimas con punto; `admin.html` está bloqueado en el fallback y además servido por Hosting (C-03) |

---

## 8. Plan de remediación priorizado

### Fase 0 — Contención (0-48 h)
1. Revocar y regenerar la contraseña de aplicación de Gmail (C-01) y rotar la clave de servicio Firebase (C-02).
2. Publicar solo `dist/` en Firebase y/o ampliar `ignore`; verificar por HTTP que `ejercicio/contraseña app.txt`, `docs/`, `tests/` y `admin.html` ya no se descargan (C-03).
3. Sacar del índice y purgar del historial `data/*.json`, `data/*.bak*`, `ejercicio/`; añadir `gitleaks` como pre-commit (C-01).
4. Definir `JWT_SECRET` aleatorio de 32 bytes y hacer que el arranque falle si falta o es placeholder, en **todos** los entornos (C-05).

### Fase 1 — Corrección funcional y de autorización (semana 1)
5. Helper de ownership + tests negativos en todos los endpoints de C-04.
6. Completar `db.cjs` (`findByProject`, `update`, `deleteById`) y migración `files_json`; test de contrato automático (C-07).
7. Decidir y fijar backend único (`DB_BACKEND`), completar el contrato de Firestore o eliminarlo (C-06).
8. Mover el webhook antes del parser JSON, exigir secreto y usar `metadata.payment_id` (C-08).
9. Corregir `await` en `/api/usage/increment` (A-01), health check real (A-02), migración de hash legacy (A-03), bootstrap de admin fuera del registro (A-04).
10. Rate limit antes del body parser + store con limpieza + `trust proxy` (A-05).
11. Versionar las 9 páginas HTML y los íconos; eliminar `_update_user.cjs` y rotar esa contraseña; comprobar que un clon limpio puede arrancar el sitio (A-11, C-01).

### Fase 2 — Calidad y cadena de entrega (semanas 2-3)
12. Flat config de ESLint, `tsconfig` corregido, `npm run lint` y `typecheck` en verde (A-09).
13. CI (GitHub Actions): `test`, `lint`, `typecheck`, `audit`, `gitleaks`, gate de promoción; versionar `package-lock.json` (A-10).
14. Sanitización con DOMPurify y escape del checkout (A-06, A-07).
15. Logging sin PII + rotación (A-08).
16. Consolidar capa de datos, borrar huérfanos, deduplicar `public/` (M-01, M-03, M-04).

### Fase 3 — Endurecimiento y deuda (backlog)
17. `helmet`, CSP estricta sin CDNs, empaquetar Tailwind/Turf (M-07, M-08).
18. Migraciones versionadas, cuotas atómicas, persistencia de temp projects (M-02, M-09).
19. Reescribir documentación generada desde el pipeline; dejar de marcar `[x]` manuales (M-10).
20. Limpieza de ruido, encoding y artefactos de agentes (B-01…B-05).

---

## 9. Anexo — Parches sugeridos (orientativos)

**Autorización por recurso (C-04)**
```js
async function requireOwnedExpediente(req, res, next) {
  const exp = await dbAPI.expedientes.findById(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Expediente no encontrado' });
  const project = await dbAPI.projects.findById(exp.project_id);
  if (!project || project.user_id !== req.user.userId) {
    return res.status(404).json({ error: 'Expediente no encontrado' });
  }
  req.expediente = exp; req.project = project;
  next();
}
```

**Webhook con body crudo (C-08)**
```js
// ANTES de app.use(express.json(...))
app.post('/api/payments/redticket/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const body = req.body?.toString?.() || '';
    if (!verifyWebhook(body, req.get('x-redticket-signature'),
                       req.get('x-redticket-timestamp'),
                       ENV.RED_TICKET_WEBHOOK_SECRET)) {
      return res.status(401).send('Invalid signature');
    }
    // …usar event.data.metadata.payment_id
  });
```

**Contador de exportaciones (A-01)**
```js
const user = await dbAPI.users.findByEmail(req.user.email);
const current = await dbAPI.usage.get(key);
if (!canExport(user?.plan || 'free', current)) {
  return res.status(403).json({ error: 'Límite alcanzado', code: 'EXPORT_LIMIT' });
}
await dbAPI.usage.increment(key);
```

**Migración `files_json` (C-07)**
```js
db.run(`CREATE TABLE IF NOT EXISTS expedientes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state_json TEXT,
  validation_results TEXT,
  files_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`);
db.run('ALTER TABLE expedientes ADD COLUMN files_json TEXT', () => {});
```

**Secreto obligatorio (C-05)**
```js
const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET || JWT_SECRET.length < 32 || /change-me|development-only/i.test(JWT_SECRET)) {
  console.error('[BOOT][FATAL] JWT_SECRET ausente o inseguro.');
  process.exit(1);
}
```

---

## 10. Conclusión

El producto tiene una base funcional sólida en su núcleo GIS (validación SNC 551/2023, exportación, topología, COGO, versionado) y una suite de tests unitarios que pasa. Sin embargo, **la capa de plataforma —secretos, autorización multi-tenant, capa de datos y cadena de despliegue— no está a la altura de los datos que maneja** (catastro, datos personales de compradores, pagos).

Ninguno de los 8 críticos requiere un rediseño: son correcciones acotadas (escapado, `await`, ownership, orden de middlewares, migración de columna, rotación de credenciales). La recomendación es ejecutar Fase 0 y Fase 1 antes de cualquier nueva funcionalidad, y no volver a declarar el sistema "production-ready" hasta que `lint`, `typecheck`, `predeploy` y los tests de autorización pasen de forma automática en CI.

A ello se suma un problema de reproducibilidad que conviene no subestimar: **el 77 % de las páginas HTML —incluidas login, registro, recuperación, membresía y administración— no está versionado**, de modo que el repositorio no describe el sistema que efectivamente se despliega. Mientras eso no se corrija, cualquier rotación de equipo, clon o rollback es una operación manual y frágil.

---

*Informe generado mediante análisis estático, introspección de contratos en Node.js y ejecución de los pipelines del proyecto. No incluye pruebas de intrusión dinámicas ni revisión de infraestructura de red.*
