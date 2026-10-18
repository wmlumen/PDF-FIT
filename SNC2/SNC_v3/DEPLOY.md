# Deploy SNC_v3 — Firebase Hosting

Esta guía documenta el flujo de despliegue para SNC_v3 en Firebase Hosting usando el proyecto `snc511`.
Incluye checklist pre-deploy, pasos de deploy, verificación y mantenimiento post-despliegue.

**Última actualización: 2026-10-18 (post Fase 4 — Limpieza completada)**

## 1. Requisitos previos

- Node.js >= 18
- Firebase CLI instalado: `npm install -g firebase-tools`
- Acceso al proyecto Firebase `snc511`
- Archivos de configuración presentes: `firebase.json`, `.firebaserc`, `package.json`
- Archivos sensibles excluidos del deploy: `serviceAccountKey.json`, `.env`, `data/`, `node_modules/`, `*.sqlite`, `*.db`, `bundle.js`
- Variables de entorno definidas para el entorno destino (`JWT_SECRET`, `SMTP_*`, `RED_TICKET_*`, etc.)

## 2. Checklist Pre-Deploy

### Código y calidad
- [x] `npm test` ejecuta todas las suites sin fallos
- [x] 0 errores críticos abiertos (Fases 1-4 completadas 2026-10-18)
- [x] Logger centralizado implementado (js/logger.js) — console.log solo en desarrollo
- [x] Sin código muerto (77 líneas eliminadas de app.js)
- [x] Sin doble inicialización de módulos
- [x] bundle.js legacy eliminado

### Configuración y secretos
- [ ] `JWT_SECRET` definido y distinto al valor de desarrollo
- [ ] `CORS_ORIGIN` configurado para los dominios permitidos
- [ ] Credenciales SMTP y Red Ticket configuradas si los flujos están activos
- [ ] Backups recientes disponibles en `backup/` y fuera del alcance de deploy

### Seguridad (Fase 2 verificada)
- [x] XSS en /api/reports — sanitización de html_content implementada
- [x] Endpoints de pago protegidos con authMiddleware (checkout + success)
- [x] password_hash_v2 excluido de respuestas admin
- [x] Rate limit sin User-Agent (IP + token prefix)
- [x] Coordenadas validadas en /api/autocompletar (Number.isFinite)
- [x] simulate-pay protegido con authMiddleware + adminMiddleware

### Datos y hosting
- [ ] Confirmar exclusiones en `.gitignore`, `firebase.json` y `.firebaserc`
- [ ] Verificar que no se empaquetan archivos sensibles (`serviceAccountKey.json`, `.env`, bases de datos locales)
- [ ] Reglas y sitio Firebase verificados con `firebase projects:list` y `firebase hosting:sites:list`

### Backend y entorno
- [ ] `PORT`, `HOST` y flags de entorno definidos
- [ ] `NODE_ENV` en `production` para activar headers de seguridad
- [ ] Acceso al backend confirmado en el entorno de deploy

## 3. Inicio de sesión y proyecto

```bash
firebase login
firebase use --add
```

Seleccionar `snc511` como proyecto por defecto.

## 4. Verificar configuración

```bash
firebase projects:list
firebase hosting:sites:list
```

## 5. Prueba local / preview

```bash
npm run preview
```

Esto levanta Firebase Hosting localmente para validar reglas de rewrite, SPA routing y cloud functions emuladas si aplica.

Validar manualmente:
- `/`, `/index.html`, `/admin.html`, `/members.html`
- `/api/health`, `/api/plans`
- Flujo completo de carga, validación y exportación
- Flujo de login (verifyPassword implementada)
- Flujo de proyectos (findByEmail con await verificado)

## 6. Deploy a preview

```bash
npm run preview
```

Usa un canal temporal de preview y permite validar en staging sin exponer producción.

## 7. Deploy a producción

```bash
npm run deploy
```

O para deploy completo (hosting + funciones):

```bash
npm run deploy:all
```

**REGLA: No ejecutar firebase deploy sin antes completar las verificaciones locales.**

## 8. Verificar post-deploy

- Hosting URL: `https://snc511.web.app`
- Alternativa: `https://snc511.firebaseapp.com`

Checks rápidos:
- [ ] Página principal carga sin errores JS críticos
- [ ] `/api/health` responde OK
- [ ] `/api/plans` expone catálogo público
- [ ] Login/register operativos (verifyPassword + bcrypt)
- [ ] Exportación y validación accesibles desde UI
- [ ] Popups de parcelas muestran propietario (PROPIETARIO no PROPIETARI)
- [ ] Mapa inicializa una sola vez (sin doble init)

## 9. Rollback

- Revertir desde Firebase Console a la versión anterior si se detecta fallo en producción.
- Restaurar backups desde `backup/` si se requiere recuperar estado de datos.

## 10. Notas importantes

- No subir `serviceAccountKey.json` ni `.env` a Git ni Firebase.
- Los datos locales (`data/`) y dependencias (`node_modules/`) no se suben gracias a `firebase.json` y `.gitignore`.
- Para resetear secrets/config, usar solo variables locales en `.env`.
- Mantener `docs/QA_Checklist.md` como fuente de verdad de calidad antes de cada release.
- En producción mantener `NODE_ENV=production` para activar HSTS y logs estructurados.
- `RED_TICKET_WEBHOOK_SECRET` debe estar definido para validar webhooks reales.
- `admin.html` queda protegido por `authMiddleware + adminMiddleware`; no se accede sin login admin.
- Páginas de debug eliminadas del repositorio y excluidas del deploy.

## 11. Estado del proyecto (2026-10-18)

### Completado
| Fase | Estado | Descripción |
|------|--------|-------------|
| Fase 1 — Críticos | ✅ | 9 fixes: verifyPassword, await, db.cjs, headers, etc. |
| Fase 2 — Seguridad | ✅ | 5 fixes: XSS, auth pagos, rate limit, coordenadas |
| Fase 3 — Frontend | ✅ | 7 fixes: doble init, EPSG, popups, showReadme, bundle.js |
| Fase 4 — Limpieza | ✅ | Logger, responsive, bundle.js eliminado, DEPLOY.md |

### Pendiente de verificación manual
- [ ] SMTP envío de correos (recuperación, bienvenida, alertas)
- [ ] Red Ticket checkout end-to-end con pago real
- [ ] GeoServer WFS/WMS capas reference (requiere servidor local)
- [ ] Tests de integración en CI/CD

### Archivos eliminados
- `js/bundle.js` (legacy, 33+ referencias a IDs inexistentes, sin uso en index.html)
- `backup/js/bundle.js` (copia del anterior)
