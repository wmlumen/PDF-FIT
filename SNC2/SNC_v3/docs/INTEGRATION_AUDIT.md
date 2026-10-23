# Integración Audit - SNC v3

> **Fecha de auditoría**: 2026-10-18
> **Veredicto**: NO APTO para producción (Fase 0 abierta)
> **Total hallazgos**: 38 (8 críticos, 11 altos, 10 medianos, 9 bajos)

## 1. Inventario de Módulos

### Módulo 7: Validación Documental y Firma Digital
- **Responsabilidad**: Generación de firmas digitales cualificadas, validación de adjuntos notariales, generación de carátula catastral
- **Archivos principales**: `js/export.js`, `js/validator.js`, `js/config.js`
- **Interfaces de entrada**: Datos de profesional, adjuntos notariales, geometrías de parcelas
- **Interfaces de salida**: Hash SHA-256, PDF con firma, carátula FUSEC, validación de requisitos
- **Dependencias internas**: `js/state.js`, `js/utils.js`, `js/config.js`
- **Dependencias externas**: `crypto` (simulado), `jsPDF` (para firma), proveedores PSC/MIC
- **Estado de implementación**: 75% - Módulo 7 functions implemented (generarFirmaDigitalCualificada, validarAdjuntosNotariales, simpleSHA256, generarCarátulaSNC, validarCarátulaSNC, validarProfesionalHabilitado, validarVigenciaCarné)
- **Estado de integración**: Integrado - Funciones exportadas y probadas en 30/30 tests validator/export
- **Pruebas existentes**: `tests/validator.test.mjs`, `tests/export.test.mjs` (50 tests unitarios)
- **Problemas confirmados**: None en módulo implementado; 7 hallazgos A0-1 a A0-7 en auditoría Fase 0
- **Riesgos y bloqueos**: Zonas congeladas Fase 0 prohiben modificar server-api.js, db.cjs esquema y auth

### Módulo 8: Cuadrícula UTM, PDF/A y Simbología
- **Responsabilidad**: Generación de cuadrícula UTM, exportación PDF/A-2b estricto, simbología de mojón
- **Archivos principales**: `js/export.js`, `js/module8.functions.mjs`, `js/config.js`
- **Interfaces de entrada**: Parámetros UTM, features GeoJSON, configuración de capas
- **Interfaces de salida**: Objeto {cruces, labels}, Blob PDF/A, configuración de estilo {color, lineWidth, radius, fill}
- **Dependencias internas**: `js/state.js`, `js/utils.js`, `js/config.js`, `js/mapEngine.js`
- **Dependencias externas**: jsPDF, Proj4js para proyecciones UTM, ISO 19005-2 (PDF/A)
- **Estado de implementación**: 75% - Functions: generarCuadriculaUTM, exportarPDFAStrict, definirSimboloMojón, aplicarSimboloMojónAFeatures
- **Estado de integración**: Parcial - Functions implementadas pero requieren integración con MapEngine
- **Pruebas existentes**: `tests/export.test.mjs` (20 tests), tests de certificación (20 tests)
- **Problemas confirmados**: None en funciones implementadas; integración con MapEngine pendiente
- **Riesgos y bloqueos**: Zonas congeladas Fase 0; PDF/A strict requiere configuración ISO 19005-2

### Módulo 9: Notificaciones e Interoperabilidad DGRP/Municipal
- **Responsabilidad**: Registro de expedientes, historial de estados, notificaciones automáticas, generación de CCC/Resolución
- **Archivos principales**: `js/app/index.js`, `js/module9.enhancements.mjs`
- **Interfaces de entrada**: Datos de expediente, filtros de búsqueda, configuración de correo
- **Interfaces de salida**: Objeto MesaEntrada con expedientes Map, notificaciones enviadas, CCC/Resolución generados
- **Dependencias internas**: `js/state.js`, `js/utils.js`, `js/export.js`
- **Dependencias externas**: EmailService (SMTP), Portal municipal, DGRP API, window.EmailService integrador
- **Estado de implementación**: 85% - window.MesaEntrada con registrarExpediente, histogram, ghost layer, circuito visado, dashboard métricas
- **Estado de integración**: Parcial - Notificaciones en modo simulado; producción requiere EmailService configurado
- **Pruebas existentes**: `tests/workflow.test.mjs` (14 tests), `tests/snc-reference.test.mjs`, `tests/db-modulo9.test.mjs` (19 regression tests)
- **Problemas confirmados**: None críticos; notificaciones reales requieren configuración SMTP
- **Riesgos y bloqueos**: Zona congelada Fase 0; servicios externos (EmailService, DGRP) no configurados en repo

### Módulo 10: RBAC, MFA y Particionado BD
- **Responsabilidad**: Control de acceso RBAC, MFA (TOTP/SMS/autenticator), particionamiento de base de datos
- **Archivos principales**: `js/state.js`, `js/module10.functions.mjs`, `js/utils.js`
- **Interfaces de entrada**: Solicitudes de permiso, códigos MFA, configuración de particiones
- **Interfaces de salida**: Objeto RBAC {rol, permisos, departamental, jurisdiccional}, estado MFA {habilitado, metodo, ultimoVerificacion}, info particiones DB
- **Dependencias internas**: None (módulo standalone dentro de state.js)
- **Dependencias externas**: TOTP authenticator apps, servicios SMS, PostgreSQL/MySQL para particionamiento
- **Estado de implementación**: 70% - Functions: verificarPermiso, otorgarPermiso, esUsuarioAdmin, verificarAccesoDepartamental, mfaEstaHabilitado, configurarMFA, verificarCodigoMFA, definirParticionesDB, obtenerInfoParticiones
- **Estado de integración**: Parcial - Funciones implementadas lógicamente; integración con BD real pendiente
- **Pruebas existentes**: Tests unitarios de funciones RBAC/MFA; 68+ tests globales pasando
- **Problemas confirmados**: None críticos; integración BD real requiere setup PostgreSQL
- **Riesgos y bloqueos**: Zona congelada Fase 0; modificaciones a db.cjs prohibidas hasta Fase 1

### Módulo Municipal (Ley 3966)
- **Responsabilidad**: Módulo municipal, cliente municipal, index municipal HTML
- **Archivos principales**: `js/municipal.js`, `js/municipalClient.js`, `index-municipal.html`
- **Dependencias internas**: `js/state.js`, `js/config.js`
- **Estado**: Pendiente de integración con módulos principales

### Módulo de Topología y COGO
- **Responsabilidad**: Repair de topología, validación de ochavas, detección de microhuecos
- **Archivos principales**: `js/topologyRepair.js`, `js/geoprocessing.js`, `js/cogo.js`
- **Estado**: 100% implementado y testeado (6/6 topology repair tests passing)

## 2. Hallazgos Clasificados

| ID | Tipo | Descripción | Módulo | Criticidad |
|----|------|-------------|--------|-----------|
| A0-1 | BLOQUEADO | Revocar contraseña app Gmail | Config/.env | Crítico |
| A0-2 | BLOQUEADO | Rotar clave Firebase Admin | serviceAccountKey.json | Crítico |
| A0-3 | BLOQUEADO | Dejar de publicar repositorio | firebase.json | Crítico |
| A0-4 | BLOQUEADO | Sacar datos/credenciales del historial | múltiples data/ | Crítico |
| A0-5 | BLOQUEADO | JWT_SECRET obligatorio y aleatorio | config.env.js | Crítico |
| A0-6 | BLOQUEADO | Eliminar _update_user.cjs y rotar password admin | _update_user.cjs | Crítico |
| A0-7 | BLOQUEADO | Añadir gitleaks y completar .gitignore | .gitignore | Crítico |
| A1-1 | PARCIAL | Helper propiedad recurso en 9 endpoints | server-api.js | Alto |
| A1-2 | PARCIAL | Completable expedientes db.cjs | db.cjs | Alto |
| ... | ... | ... | ... | ... |

## 3. Dependencias Críticas

- **Módulo 10 → Zonajeado**: No se pueden modificar db.cjs ni server-api.js auth/IDOR/pagos hasta cerrar Fase 0 (A0-1 a A0-7)
- **Módulo 9 → Servicios externos**: EmailService, DGRP API requieren configuración externa (fuera del repo)
- **Módulo 7 → Zonajeado**: Functions implementadas pero no pueden integrarse con server-api.js hasta resolver A0-1 a A0-7
- **Grafo general**: 2583 nodos en graphify-out; dependencias principales documentadas en AGENTS.md protocolo

## 3. Bloqueos Identificados

1. **Fase 0 completa**: 8 hallazgos críticos sin resolver impiden despliegue (`firebase deploy`, `npm run deploy`)
2. **Modificaciones prohibidas**: server-api.js auth/IDOR/pagos, db.cjs esquema, .env, firebase.json
3. **Servicios externos**: EmailService, Firebase Admin, proveedores PSC/TSC requieren configuración fuera del repositorio
4. **Integraciones parciales**: Módulos 8-10 funciones implementadas pero integración con servicios reales pendiente

## 4. Prioridades de Corrección

1. **Critical**: Cerrar A0-1 a A0-7 (8 hallazgos) - habilita despliegue
2. **High**: Implementar A1-1 y A1-2 (helper recursos, completar expedientes db)
3. **Medium**: Integrar Módulo 8 funciones con MapEngine (UTM grid, PDF/A strict)
4. **Medium**: Completar notificaciones reales Módulo 9 (EmailService configurado)
5. **Low**: Mejorar Módulo 10 integración BD real (particionamiento PostgreSQL)

---
*Este archivo forma parte del sistema de auditoría y seguimiento persistente. Última actualización: 2026-10-18.*