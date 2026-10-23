# Super Administrador, Módulo Notarial y Homogeneización de Portales

**Fecha:** 2026-10-22
**Módulos Afectados:**
- `admin/index.html` (Consola Master de Super Administrador con 8 pestañas y 3 pilares)
- `js/app-admin.js` (Orquestador cliente, métricas multi-tenant, visor GIS y sincronización)
- `notarial/index.html` (Módulo Notarial consolidado dentro de su propia carpeta)
- `server-api.js` (Soporte para ruta `/superadmin`, y roles `superadmin`, `admin_municipal`, `admin_notarial`)
- `tests/super-admin.test.mjs` (Suite de pruebas para los 3 pilares y credenciales)
- `data/snc.sqlite` (Usuario Super Administrador Christhian Keim activo con Ck1340130*)

### Resumen de Cambios:
1. **Consola Master de Super Administrador:**
   - Panel de control con 3 pilares: Profesional (Agrimensura), Municipal (Ley 3966) y Notarial (Escribanías / RUN).
   - Selector rápido de entornos en la cabecera (Live Environment Switcher).
   - Trazabilidad B2B2G y auditoría de firmas cualificadas (4 slots - Ley 6822/2021).
2. **Homogeneización de Directorios:**
   - Cada entorno web reside en su propia carpeta limpia: `/` (Profesional), `/municipal/`, `/notarial/`, `/ciudadano/`, `/admin/`.
3. **Roles Administrativos Especializados:**
   - `superadmin`: Acceso irrestricto total.
   - `admin_municipal`: Director de Catastro y Obras Municipales.
   - `admin_notarial`: Administrador Notarial y de Escribanías.
