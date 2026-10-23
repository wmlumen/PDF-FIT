# Punto de Continuación - SNC v3

> **Última actualización**: 2026-10-18
> **Estado actual**: Fase 0 Auditoría abierta - NO APTO para producción
> **Tareas completadas en esta sesión**: Módulos 7-10 functions implementados y testeados (68+ tests passing)

## Estado Actual del Proyecto

### Módulos Implementados (Sesión Actual)
- **Módulo 7**: `generarFirmaDigitalCualificada`, `validarAdjuntosNotariales`, `simpleSHA256`, `generarCarátulaSNC`, `validarCarátulaSNC`, `validarProfesionalHabilitado`, `validarVigenciaCarné`
- **Módulo 8**: `generarCuadriculaUTM`, `exportarPDFAStrict`, `definirSimboloMojón`, `aplicarSimboloMojónAFeatures`
- **Módulo 9**: `window.MesaEntrada` con registrarExpediente, histogram, ghost layer, circuito visado, dashboard métricas, buscarExpedientesAvanzado, generarCCC, generarResolucionMunicipal
- **Módulo 10**: `verificarPermiso`, `otorgarPermiso`, `esUsuarioAdmin`, `verificarAccesoDepartamental`, `mfaEstaHabilitado`, `configurarMFA`, `verificarCodigoMFA`, `definirParticionesDB`, `obtenerInfoParticiones`

### Hallazgos de Auditoría Pendientes (Fase 0)
- **A0-1**: Revocar contraseña aplicación Gmail [BLOQUEO]
- **A0-2**: Rotar clave Firebase Admin [BLOQUEO]
- **A0-3**: Dejar de publicar repositorio [BLOQUEO]
- **A0-4**: Sacar datos/credenciales del historial [BLOQUEO]
- **A0-5**: JWT_SECRET obligatorio y aleatorio [BLOQUEO]
- **A0-6**: Eliminar _update_user.cjs y rotar password admin [BLOQUEO]
- **A0-7**: Añadir gitleaks y completar .gitignore [BLOQUEO]

### Zonas Congeladas (No modificar sin autorización)
- `firebase.json`, `firebase.scripts.json`, `.firebaserc` - despliegue
- `.env`, `serviceAccountKey.json`, `config.env.js` - secretos
- `server-api.js` auth/IDOR/pagos - requiere fix A1-1/A1-4, no parches parciales
- `db.cjs` esquema - esperar A1-2 para evitar cuarto esquema divergente

### Tests Estado
- **68+ tests passing** en 11 suites
- Sin tests deshabilitados
 Sin relajamiento de CSP ni middleware
- Todos los módulos 7-10 integrados y exportados

## Siguiente Tarea Ejecutable

### Tarea: A0-1 - Revocar contraseña aplicación Gmail
- **Descripción**: Credenciales reales versionadas: contraseña de app Gmail en `ejercicio/contraseña app.txt`, copias de la base en `data/`, contraseña de admin en `_update_user.cjs`
- **Prioridad**: Critical (bloquea despliegue)
- **Módulo**: Infraestructura
- **Dependencias**: Ninguna (es tarea independiente para desbloquear todo)
- **Acceptance criteria**: 
  - Credencial vieja ya no autentica
  - `git grep` no encuentra el valor
  - Nueva credencial guardada fuera del repositorio
- **Pruebas necesarias**: 
  - `git grep -r 'contraseña app' --no-index` para verificar ausencia
  - Probar autenticación con clave antigua vs nueva
- **Archivos afectados**: 
  - `ejercicio/contraseña app.txt` (eliminar o movernos fuera)
  - `data/contraseña app.txt` (eliminar o movernos fuera)
  - `.env` (actualizar si contiene la contraseña)
  - `_update_user.cjs` (eliminar o modificar)
- **Comando para reanudar**: 
  ```
  # Paso 1: Mover credenciales fuera del repositorio
  mkdir -p ~/snc-secrets
  mv ejercicio/contraseña app.txt ~/snc-secrets/
  mv data/contraseña app.txt ~/snc-secrets/
  
  # Paso 2: Actualizar .env si es necesario
  # (quitar o rotar la contraseña de app Gmail)
  
  # Paso 3: Verificar tests
  npm test
  
  # Paso 4: Registrar pass en CLI
  node .opencode/coordination/cli.mjs pass "A0-1_password_app" "Revoked Gmail app password and moved to secure storage" js/export.js
  ```

### Tarea: A0-2 - Rotar clave Firebase Admin
- **Descripción**: Clave privada de Firebase Admin (snc511) en `serviceAccountKey.json` sin cifrar
- **Prioridad**: Critical
- **Módulo**: Infraestructura
- **Acceptance criteria**: Clave anterior revocada; backend arranca sin el archivo (o con secreto inyectado)
- **Comando**: Similar estructura A0-1

### Tarea: A0-3 - Dejar de publicar repositorio
- **Descripción**: `firebase.json` publica todo el repositorio (`"public": "."`), incluidos `docs/`, `tests/`, `ejercicio/` y `admin.html`
- **Prioridad**: Critical
- **Módulo**: Infraestructura
- **Acceptance criteria**: `curl` a `/ejercicio/contraseña%20app.txt`, `/docs/`, `/tests/`, `/admin.html`, `/_update_user.cjs` devuelve 404

### Tarea: A0-4 - Sacar datos y credenciales del historial
- **Descripción**: `ejercicio/contraseña app.txt`, `data/users.json`, `data/*.json`, `data/*.bak*`, `data/*.db-shm`, `data/*.db-wal`
- **Prioridad**: Critical
- **Acceptance criteria**: Archivos ausentes en `HEAD` y en el historial; `gitleaks` limpio

### Tarea: A0-5 - JWT_SECRET obligatorio y aleatorio
- **Prioridad**: Critical
- **Acceptance criteria**: `JWT_SECRET` obligatorio, aleatorio (≥32 bytes) y validado en **todos** los entornos; proceso no arranca con secreto vacío, corto o placeholder

### Tarea: A0-6 - Eliminar _update_user.cjs y rotar password admin
- **Prioridad**: Critical
- **Acceptance criteria**: `_update_user.cjs` ausente en HEAD; contraseña anterior inválida; nueva solo en gestor de secretos

### Tarea: A0-7 - Añadir gitleaks y completar .gitignore
- **Prioridad**: Critical
- **Acceptance criteria**: Un archivo con un secreto de prueba es rechazado; `.gitignore` incluye `_*.cjs`, `*.sqlite*`, `graphify-out/`

## Siguientes Pasos Después de Cerrar Fase 0

### Paso 1: Tareas Funcionales (después de A0-A0-7)
- **A1-1**: Helper propiedad recurso en 9 endpoints `server-api.js`
- **A1-2**: Completar expedientes `db.cjs` (findByProject, update, deleteById)
- **A1-3**: Variable `DB_BACKEND` + contrato Firestore
- **A1-4**: Webhook con body crudo + secreto
- **A1-5**: await en `/api/usage/increment` + health check real

### Paso 2: Mejoras de Código (después de A1)
- **A2-1 a A2-8**: Mejoras de lint, typecheck, CI, XSS, logs, graphify-out

## Punto de Continuación para Reanudación

Al detener el trabajo, el estado queda en:

1. **Módulos 7-10 completados y testeados** - lista para usar siempre que se cierren los bloques A0-x
2. **Archivos guardados**: 
   - `docs/INTEGRATION_AUDIT.md`
   - `docs/INTEGRATION_GRAPH.json`
   - `docs/INTEGRATION_BACKLOG.json`
   - `docs/INTEGRATION_CHANGELOG.md`
   - `docs/INTEGRATION_TEST_REPORT.md`
   - `docs/SIMBOLOGIA_MAPA.md`
3. **Tests**: 68+ passing listos para validación
4. **Bloqueos**: 7 hallazgos A0-1 a A0-7 (más A0-8 si existe)

### Para Reanudar el Trabajo

Ejecutar en orden:
1. `node .opencode/coordination/cli.mjs status` - verificar estado actual
2. Cerrar A0-1 a A0-7 siguiendo los acceptance criteria de cada una
3. `npm run predeploy` - verificar que el gate pasa
4. `npm run deploy` - desplegar si corresponde
5. Continuar con A1-1, A1-2, etc. según plan de integración

**Nota**: El trabajo puede pausarse en cualquier momento. El punto de continuación anterior deja el proyecto en un estado consistente donde los módulos 7-10 están listos para usar siempre que los bloqueos de seguridad (A0-1 a A0-7) sean resueltos. No se necesita volver a inspeccionar todo el proyecto para reanudar.

---
*Este archivo forma parte del sistema de seguimiento persistente. No editar sin causa técnica documentada.*