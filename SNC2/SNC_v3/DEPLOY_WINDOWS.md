# Deploy Windows + WSL — SNC_v3

Entorno confirmado:
- Windows ejecuta Firebase CLI.
- WSL edita y ejecuta scripts bash.
- Proyecto: `/mnt/c/Users/HP 250 G10/Documents/GITHUT/SNC2/SNC_v3`
- Firebase project: `snc511`

## Flujo ejecutivo

| Paso | Tarea | Ejecutar en |
|---|---|---|
| 1 | Login y selección de proyecto | Windows |
| 2 | Gate pre-promoción + tests | WSL |
| 3 | Preview | Windows |
| 4 | Validación manual | Navegador Windows |
| 5 | Producción | Windows |
| 6 | Verificación post-deploy | Navegador Windows |
| 7 | Rollback si falla | Windows + WSL |

---

## 1. Login y proyecto (Windows)

```powershell
firebase login
firebase use --add
# Seleccionar snc511 como default
```

Verificar:

```powershell
firebase projects:list
firebase hosting:sites:list
```

---

## 2. Gate pre-promoción + tests (WSL)

No ejecutar `npm run deploy:all` desde Windows porque `predeploy` es bash y fallará.

```bash
cd /mnt/c/Users/HP\ 250\ G10/Documents/GITHUT/SNC2/SNC_v3
bash scripts/promotion_gate.sh
```

El gate ejecuta `npm test` y valida:
- `/api/health`, HSTS, CSP, `admin.html`
- Ausencia de páginas debug (`test-login.html`, `snc-diag.html`, `test_mapa.html`, `test_validator.html`)
- `firebase.json`, `.firebaserc`, `.env.example`
- Variables `.env.example`: `JWT_SECRET`, `RED_TICKET_WEBHOOK_SECRET`, `SMTP_HOST`

Si falla, abortar antes de continuar.

---

## 3. Preview (Windows)

```powershell
cd /mnt/c/Users/HP\ 250\ G10/Documents/GITHUT/SNC2/SNC_v3
npm run preview
```

Esto despliega un canal temporal Firebase Hosting.

Validar manualmente:
- `/`, `/index.html`, `/admin.html`, `/members.html`
- `/api/health`, `/api/plans`
- Flujo completo de carga, validación y exportación
- Login/register si aplica
- Headers de seguridad en respuesta

URLs preview típicas:
- `https://<channel-id>--snc511.web.app`
- `https://<channel-id>--snc511.firebaseapp.com`

---

## 4. Deploy a producción (Windows)

Desde Windows:

```powershell
cd /mnt/c/Users/HP\ 250\ G10/Documents/GITHUT/SNC2/SNC_v3
npm run deploy
```

Esto ejecuta `firebase deploy --only hosting,functions`.

---

## 5. Verificación post-deploy

- Hosting URL: `https://snc511.web.app`
- Alternativa: `https://snc511.firebaseapp.com`

Checks rápidos:
- [ ] Página principal carga sin errores JS críticos.
- [ ] `/api/health` responde `OK`.
- [ ] `/api/plans` expone catálogo público.
- [ ] Login/register operativos si aplica.
- [ ] Exportación y validación accesibles desde UI.
- [ ] `admin.html` protegido por auth + admin middleware.
- [ ] HSTS y CSP activos en respuestas.

---

## 6. Rollback

Si producción falla:

### Opción A — Firebase Console
1. Ir a Firebase Console > Hosting > Releases.
2. Revertir a la versión anterior.

### Opción B — Re-deploy desde commit anterior
1. En WSL o Git Bash Windows:
   ```bash
   cd /mnt/c/Users/HP\ 250\ G10/Documents/GITHUT/SNC2/SNC_v3
   git log --oneline -n 5
   git revert HEAD
   git push
   ```
2. En Windows:
   ```powershell
   npm run deploy
   ```

### Limpiar canal preview
```powershell
firebase hosting:channel:delete preview
```

Restaurar datos si es necesario:
```bash
bash scripts/restore_sqlite.sh
```

---

## Notas importantes

- No subir `serviceAccountKey.json`, `.env`, `data/`, `node_modules/`, `*.sqlite`, `*.db`.
- `npm run deploy:all` no usar desde Windows porque invoca `bash scripts/promotion_gate.sh`.
- En producción mantener `NODE_ENV=production` para activar HSTS y logs estructurados.
- Mantener `docs/QA_Checklist.md` como fuente de verdad de calidad.
