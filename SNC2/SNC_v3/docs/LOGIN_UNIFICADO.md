# Rediseño Login Unificado SNC v3

Arquitectura: un solo entry-point (login.html) con **selector de perfil/destino**.  
El backend (`/api/auth/login`) devuelve `token`, `user` y `app` (rol→destino).  
El login elige el target con **role-mapping** centralizado.

## 1. Login HTML (nuevo: `/login.html`)

Selector de rol antes del submit — un solo formulario, misma UX para todas las apps:

- Select: Super Admin / Admin Municipal / Admin Notarial / Profesional / Ciudadano
- El `role` value se manda en el payload → backend valida que coincide con la cuenta → redirige a `/admin`, `/municipal`, `/notarial`, `/visor`, `/ciudadano`
- Fallback: si no se elige, el backend decide por defecto (ciudadano).

```html
<form id="login-form" autocomplete="on">
  <select id="login-role" required>
    <option value="auto">— Seleccionar aplicación —</option>
    <option value="superadmin">Super Admin (Consola Master)</option>
    <option value="admin_municipal">Admin Municipal</option>
    <option value="admin_notarial">Admin Notarial</option>
    <option value="professional">Profesional / Visor</option>
    <option value="ciudadano">Ciudadano</option>
  </select>
  <!-- email + password igual que hoy -->
</form>
```

## 2. Backend: `/api/auth/login` — response ampliada

```json
{
  "token": "...",
  "user": { "id": 5, "email": "...", "role": "admin_municipal", "name": "..." },
  "app": {
    "target": "/municipal",
    "modules": ["mapa", "parcelas", "export", "notificaciones"]
  }
}
```

## 3. Frontend: role → redirección (unificada)

```js
// js/loginUnified.js - singleton importado por todas las apps
const APP_ROUTES = {
  superadmin:    '/admin',
  admin_municipal: '/municipal',
  admin_notarial:  '/notarial',
  professional:    '/visor',
  ciudadano:       '/ciudadano'
};
```

## 4. Tokens compatibles (backwards-compatible)

- `snc_api_token`  → usado por app-admin, gestionMunicipal, plataformaAdmin, municipioAdmin
- `snc_token`      → usado por catastroOficialUI, ciudadanoNotifUI, visorPremium, export

**Unifica ambos nombres → usa siempre `snc_api_token`.**  
Migración: en cada app, leer `snc_api_token || snc_token || backend_token`.

## 5. Módulos comunes (shared)

| Módulo              | Apps que lo usan                          |
|---------------------|-------------------------------------------|
| Auth (token, headers) | admin, municipal, notarial, visor, ciudadano |
| Toast / Notify      | admin, municipal, ciudadano               |
| BasemapMenu         | admin, municipal, visor                   |
| SNC GIS engine      | admin, municipal, visor, export           |
| CiudadanoNotif      | ciudadano, municipal                      |

→ Se centralizan en `js/shared/` (`js/shared/auth.js`, `js/shared/toast.js`, etc.)

## 6. Migración de cada app

### /admin (Super Admin)
- `js/app-admin.js`:
  - Elimina `showLoginOverlay()` / `handleLogin()`.
  - En boot: si no hay token → redirige a `/login.html`.
  - Lee token desde `shared/auth.js`.

### /municipal (admin_municipal)
- `js/municipioAdmin.js` y `js/gestionMunicipal.js`:
  - Reemplazar token inline por `shared/auth.js`.
  - Boot: redirige a login si no auth.

### /notarial (admin_notarial)
- `js/notarialAdmin.js`:
  - Migrar token → shared.
  - Login overlay → redirige a `/login.html?role=admin_notarial`.

### /visor (professional)
- `js/authModal.js`:
  - Mantener modal como fallback pero apuntar a `/login.html?role=professional` para flujo limpio.

## 7. Logout unificado

```js
// js/shared/auth.js
export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
  localStorage.removeItem('snc_api_token');
  localStorage.removeItem('snc_token');
  localStorage.removeItem('snc_api_user');
  window.location.href = '/login.html';
}
```

## 8. Archivos a crear/modificar

| Acción      | Archivo                              | Descripción                     |
|-------------|--------------------------------------|---------------------------------|
| **Crear**  | `/login.html`                        | Login unificado con selector    |
| **Crear**  | `/js/shared/auth.js`                 | getToken/setToken/clear/logout  |
| **Crear**  | `/js/shared/routes.js`               | Role→app map                    |
| **Crear**  | `/js/loginUnified.js`                | Handler formulario login        |
| **Editar** | `js/app-admin.js`                    | Quitar overlay, usar shared     |
| **Editar** | `js/municipioAdmin.js`               | Usar shared/auth.js             |
| **Editar** | `js/gestionMunicipal.js`             | Usar shared/auth.js             |
| **Editar** | `js/plataformaAdmin.js`              | Usar shared/auth.js             |
| **Editar** | `js/authModal.js`                    | Link a /login.html              |
| **Editar** | `server-api.js`                      | Agregar `app.target` + `app.modules` al login response |

## 9. UX extras

- **Remember me** → extiende expiración token a 30 días.
- **Auto-redirect**: si ya logueado, `/login.html` redirige al target automáticamente.
- **Deep link**: `/login.html?next=/municipal` preserva intento original.
