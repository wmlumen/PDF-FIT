# Esquema de Base de Datos SNC v3 (SQLite)

**Motor:** SQLite 3 (`data/snc.sqlite`)  
**Adaptador:** `db.cjs` (sqlite3 async con Promises)  
**Configuración de Conexión:**
- `PRAGMA foreign_keys = ON;`
- `PRAGMA busy_timeout = 5000;`
- `PRAGMA journal_mode = DELETE;`

---

## 1. Tablas y Estructura

### `users`
Almacena usuarios, membresías y control de acceso.
- `id` (TEXT, PK): UUID del usuario.
- `email` (TEXT, UNIQUE, NOT NULL): Correo normalizado en minúsculas.
- `password_hash` (TEXT): Hash bcrypt v1 legacy (en migración).
- `password_hash_v2` (TEXT): Hash bcrypt v2 actual.
- `name` (TEXT): Nombre completo o razón social.
- `plan` (TEXT): Plan asignado (`free`, `pro`, `enterprise`). Default: `'free'`.
- `role` (TEXT): Rol de autorización (`member`, `admin`). Default: `'member'`.
- `status` (TEXT): Estado de cuenta (`active`, `blocked`, `pending`). Default: `'active'`.
- `last_login_ip` (TEXT): Última IP de inicio de sesión registrada.
- `stats_json` (TEXT): JSON con estadísticas de uso (`consultados`, `concretados`). Default: `'{}'`.
- `blocked_reason` (TEXT): Motivo en caso de bloqueo.
- `blocked_until` (TEXT): Fecha ISO límite de suspensión temporal.
- `created_at` (TEXT): Timestamp ISO de creación.
- `updated_at` (TEXT): Timestamp ISO de última modificación.

### `plans`
Definición de planes de suscripción y límites de cuota.
- `id` (TEXT, PK): Identificador único del plan (`free`, `pro`, `enterprise`).
- `name` (TEXT, UNIQUE, NOT NULL): Nombre comercial del plan.
- `type` (TEXT, NOT NULL): Tipo de plan (`free`, `paid`, `enterprise`).
- `price` (REAL, NOT NULL): Precio numérico (≥ 0).
- `currency` (TEXT, NOT NULL): Moneda ISO 4217 (ej. `'USD'`, `'PYG'`).
- `limits_json` (TEXT, NOT NULL): JSON con cuotas (`projects`, `expedientesPerProject`, `exportsPerMonth`, `maxParcelsPerLayer`).
- `features_json` (TEXT, NOT NULL): Array JSON de características incluidas.
- `watermark` (INTEGER): `1` si aplica marca de agua en reportes, `0` si no.
- `active` (INTEGER): `1` si está disponible para contratación, `0` si está inactivo.
- `created_at` (TEXT): Timestamp ISO.
- `updated_at` (TEXT): Timestamp ISO.

### `projects`
Agrupación de expedientes de un profesional o institución.
- `id` (TEXT, PK): UUID del proyecto.
- `user_id` (TEXT, NOT NULL, FK `users.id` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Nombre del proyecto o cliente.
- `created_at` (TEXT): Timestamp ISO.
- `updated_at` (TEXT): Timestamp ISO.

### `expedientes`
Expedientes catastrales sometidos a validación bajo SNC 551/2023.
- `id` (TEXT, PK): UUID del expediente.
- `project_id` (TEXT, NOT NULL, FK `projects.id` ON DELETE CASCADE).
- `name` (TEXT, NOT NULL): Título o código de expediente.
- `state_json` (TEXT): Estado GIS del cliente (GeoJSON de capas, Excel data, CRS).
- `validation_results` (TEXT): JSON con diagnóstico de validación topológica y catastral.
- `files_json` (TEXT): Array JSON con metadatos de archivos adjuntos cargados.
- `created_at` (TEXT): Timestamp ISO.
- `updated_at` (TEXT): Timestamp ISO.

### `payments`
Registro de transacciones y pagos de planes.
- `id` (TEXT, PK): UUID del pago.
- `user_id` (TEXT, NOT NULL, FK `users.id`).
- `plan_id` (TEXT, NOT NULL): ID del plan solicitado.
- `provider` (TEXT): Pasarela de pago (`'manual'`, `'redticket'`). Default: `'manual'`.
- `status` (TEXT): Estado (`'pending'`, `'paid'`, `'failed'`, `'cancelled'`).
- `amount` (REAL): Monto cobrado.
- `currency` (TEXT): Moneda de cobro. Default: `'PYG'`.
- `buyer` (TEXT): JSON con datos del comprador (`name`, `email`, `document`, `phone`).
- `paid_at` (TEXT): Timestamp ISO de confirmación de pago.
- `provider_id` (TEXT): ID de la orden en la pasarela externa.
- `webhook_status` (TEXT): Último estado reportado por webhook.
- `webhook_data` (TEXT): JSON del payload recibido del webhook.
- `created_at` (TEXT): Timestamp ISO.

### `temp_projects`
Proyectos temporales en memoria / scratch con TTL automático de 24 horas.
- `id` (TEXT, PK): UUID o token del proyecto temporal.
- `user_id` (TEXT, NOT NULL, FK `users.id` ON DELETE CASCADE).
- `name` (TEXT): Nombre descriptivo.
- `expedientes_json` (TEXT): Array JSON de expedientes provisionales.
- `created_at` (TEXT): Timestamp ISO.
- `updated_at` (TEXT): Timestamp ISO.
- `expires_at` (TEXT): Timestamp ISO de expiración.

### `admin_audit_log`
Trazabilidad obligatoria de acciones administrativas.
- `id` (TEXT, PK): UUID del registro.
- `admin_user_id` (TEXT, NOT NULL, FK `users.id`): Administrador que ejecutó la acción.
- `action` (TEXT, NOT NULL): Acción (`'create'`, `'update'`, `'delete'`, `'block'`, `'confirm_payment'`, `'upsert_plan'`).
- `target_type` (TEXT, NOT NULL): Entidad afectada (`'user'`, `'plan'`, `'payment'`, `'project'`, `'expediente'`).
- `target_id` (TEXT, NOT NULL): ID de la entidad afectada.
- `old_value` (TEXT): Snapshot JSON previo.
- `new_value` (TEXT): Snapshot JSON posterior.
- `ip` (TEXT): IP del administrador.
- `created_at` (TEXT): Timestamp ISO.

### `usage`
Contadores de uso atómico para límites mensuales de planes.
- `key` (TEXT, PK): Clave con formato `{userId}:{period}:{feature}` (ej. `usr-1:2026-10:exports`).
- `value` (INTEGER): Cantidad acumulada de operaciones consumidas.
- `updated_at` (TEXT): Timestamp ISO.

### `public_reports`
Almacenamiento de certificados catastrales públicos accesibles mediante enlace web o código QR.
- `id` (TEXT, PK): ID público SNC (ej. `SNC-2026-XXXX`).
- `user_id` (TEXT): Profesional que generó el reporte.
- `html_content` (TEXT, NOT NULL): Contenido HTML sanitizado del certificado.
- `created_at` (TEXT): Timestamp ISO.

### `recovery_tokens`
Tokens temporales para recuperación de contraseñas.
- `token` (TEXT, PK): Token criptográfico aleatorio.
- `email` (TEXT, NOT NULL): Correo electrónico del usuario.
- `expires_at` (TEXT, NOT NULL): Timestamp ISO de expiración.

### `ip_events`
Telemetría de seguridad y detección de intentos sospechosos o ataques por IP.
- `id` (TEXT, PK): UUID del evento.
- `ip` (TEXT, NOT NULL): Dirección IP.
- `user_id` (TEXT): ID de usuario asociado si hubo sesión.
- `event` (TEXT, NOT NULL): Tipo de evento (`'login'`, `'failed_login'`, `'rate_limit'`).
- `meta` (TEXT): Metadata adicional en formato string o JSON.
- `created_at` (TEXT): Timestamp ISO.

---

## 2. Índices de Rendimiento

| Índice | Tabla | Columnas | Propósito |
|:---|:---|:---|:---|
| `idx_users_email` | `users` | `email` | Búsqueda O(1) en login y autenticación |
| `idx_users_plan` | `users` | `plan` | Reportes de distribución de planes |
| `idx_users_status` | `users` | `status` | Filtrado de usuarios activos vs suspendidos |
| `idx_projects_user_created` | `projects` | `user_id, created_at` | Listado ordenado de proyectos por usuario |
| `idx_expedientes_project_updated` | `expedientes` | `project_id, updated_at` | Carga de expedientes de un proyecto |
| `idx_payments_user_status` | `payments` | `user_id, status` | Consulta de suscripción activa de usuario |
| `idx_payments_provider_id` | `payments` | `provider_id` | Resolución inmediata en webhooks de pago |
| `idx_usage_key` | `usage` | `key` | Verificación de cuota de uso |
| `idx_recovery_email` | `recovery_tokens` | `email` | Búsqueda e invalidación de tokens previos |
| `idx_temp_projects_user` | `temp_projects` | `user_id` | Proyectos scratch por usuario |
| `idx_temp_projects_expires` | `temp_projects` | `expires_at` | Barrido rápido de proyectos expirados |
| `idx_audit_admin` | `admin_audit_log` | `admin_user_id` | Historial de acciones por administrador |
| `idx_audit_target` | `admin_audit_log` | `target_type, target_id` | Historial de auditoría por recurso |
| `idx_audit_created` | `admin_audit_log` | `created_at` | Orden cronológico de auditoría |
| `idx_ip_events_ip` | `ip_events` | `ip` | Rate limiting y bloqueo por IP |
| `idx_ip_events_user` | `ip_events` | `user_id` | Detección de anomalías por cuenta |

---

## 3. Contrato `dbAPI`

```javascript
const { dbAPI } = require('./db.cjs');

// Verificación de estado de la base de datos
await dbAPI.health(); // { ok: true, sqlite: true, timestamp }
await dbAPI.health.check();

// Transacciones multi-tabla atómicas
await dbAPI.transaction(async (api) => {
  await api.projects.insert(...);
  await api.expedientes.insert(...);
});

// Sembrado idempotente de planes
await dbAPI.plans.seed();
```
