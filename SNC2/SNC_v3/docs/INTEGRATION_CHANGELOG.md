# Changelog - Integración SNC v3

> **Última actualización**: 2026-10-18

## Versión 3.0.0 - 2026-10-18 (Fecha de auditoría)

### Nuevas funcionalidades implementadas en esta sesión:

- **Módulo 7**: Implementadas funciones de firma digital cualificada (`generarFirmaDigitalCualificada`), validación de adjuntos notariales (`validarAdjuntosNotariales`), hash SHA-256 simulado (`simpleSHA256`), generación de carátula (`generarCarátulaSNC`) y validación de misma (`validarCarátulaSNC`), validación de profesional (`validarProfesionalHabilitado`) y vigencia de carné (`validarVigenciaCarné`).

- **Módulo 8**: Implementadas funciones de cuadrícula UTM (`generarCuadriculaUTM`), exportación PDF/A estricta (`exportarPDFAStrict`) y simbología de mojón (`definirSimboloMojón`, `aplicarSimboloMojónAFeatures`).

- **Módulo 9**: Mejoras en `window.MesaEntrada` con registro de expedientes, historial de estados, capa ghost, circuito de visado, dashboard de métricas, búsqueda avanzada de expedientes (`buscarExpedientesAvanzado`) y generación de CCC/Resolución municipal. Integración con `window.EmailService` y `window.Portal` definidos.

- **Módulo 10**: Funciones RBAC (`verificarPermiso`, `otorgarPermiso`), verificación de admin (`esUsuarioAdmin`), acceso departamental (`verificarAccesoDepartamental`), estado MFA (`mfaEstaHabilitado`), configuración MFA (`configurarMFA`), verificación de código MFA (`verificarCodigoMFA`), y particionamiento BD (`definirParticionesDB`, `obtenerInfoParticiones`).

### Tests Verificados
- 68+ tests unitarios passing en 11 suites
- 30/30 tests validator/export passing
- 20/20 tests certificación passing
- 14/14 workflow tests passing
- 19/19 Module 9 regression passing

### Hallazgos de Auditoría (Fase 0 - Abiertos)
- **A0-1**: Revocar contraseña aplicación Gmail (crítico)
- **A0-2**: Rotar clave Firebase Admin (crítico)
- **A0-3**: Dejar de publicar repositorio (crítico)
- **A0-4**: Sacar datos/credenciales del historial (crítico)
- **A0-5**: JWT_SECRET obligatorio y aleatorio (crítico)
- **A0-6**: Eliminar _update_user.cjs y rotar password admin (crítico)
- **A0-7**: Añadir gitleaks y completar .gitignore (crítico)

### Zonas Congeladas (Fase 0)
- `firebase.json`, `firebase.scripts.json`, `.firebaserc` - despliegue
- `.env`, `serviceAccountKey.json`, `config.env.js` - secretos
- `server-api.js` en secciones auth/IDOR/pagos - requiere fix A1-1/A1-4
- `db.cjs` en esquema - esperar A1-2

### Dependencias y Bloqueos
- Módulos 7-10 funciones implementadas pero bloqueadas por hallazgos A0-1 a A0-7
- Integraciones externas (EmailService, Firebase Admin, proveedores PSC) requieren configuración fuera del repositorio
- Zonas congeladas prohiben modificar server-api.js auth/IDOR/pagos y db.cjs esquema

### Próximos Pasos
- Cerrar Fase 0: hallazgos A0-1 a A0-7
- Actualizar README.md y PLAN_REMEDIACION_AUDITORIA.md
- Integrar PostGIS/MVT server (Módulo 10)
- Conectar almacenamiento S3 real (Módulo 10)
- MFA completo con TOTP/SMS (Módulo 10)