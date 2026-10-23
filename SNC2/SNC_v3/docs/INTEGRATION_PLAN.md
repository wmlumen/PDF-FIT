# Plan de Integración - SNC v3

> **Fecha**: 2026-10-18
> **Fase Actual**: 0 (Contención - bloques de despliegue)
> **Veredicto**: NO APTO para producción

## Prioridades de Ejecución

### P1 - Crítico (Inmediato - requiere cerrar Fase 0)
| # | Tarea | Causa | Archivos | Dependencies |
|---|-------|-------|----------|-------------|
| P1-1 | **Cerrar A0-1**: Revocar contraseña app Gmail | Credenciales versionadas en repositorio | `ejercicio/contraseña app.txt`, `.env` | Ninguna (bloquea todo despliegue) |
| P1-2 | **Cerrar A0-2**: Rotar clave Firebase Admin | Key privada sin cifrar en disco | `serviceAccountKey.json`, `firebase.json` | Ninguna (bloquea despliegue) |
| P1-3 | **Cerrar A0-3**: Detener publicación repositorio | firebase.json publica todo el repo | `firebase.json`, `firebase.scripts.json` | Ninguna (bloquea deploy) |
| P1-4 | **Cerrar A0-4**: Sacar datos/credenciales del historial | Datos versionados en git history | `data/`, `ejercicio/` | Herramienta gitleaks |

### P2 - Alto (Próximo - depende de P1)
| # | Tarea | Causa | Archivos | Dependencies |
|---|-------|-------|----------|-------------|
| P2-1 | **A1-1**: Helper propiedad recurso en 9 endpoints | 9 endpoints no verifican propiedad | `server-api.js` (675, 768-799, 801-903, 1208, 1225) | Requiere P1-1, P1-2, P1-5 |
| P2-2 | **A1-2**: Completar expedientes db | db.cjs sin findByProject/update/deleteById | `db.cjs`, `server-api.js` | Requiere P1-1, P1-2, P1-5 |
| P2-3 | **A1-3**: Un solo backend por variable DB_BACKEND | Múltiples backends; contrato Firestore incompleto | `server-api.js`, `js/firestore-db.cjs` | Requiere P1-1, P1-2, P1-5 |

### P3 - Medio (Después de P2)
| # | Tarea | Causa | Archivos | Dependencies |
|---|-------|-------|----------|-------------|
| P3-1 | **A1-3**: Variable DB_BACKEND | Backend múltiple; Firestore incompleto | `tsconfig.json` | P2-1, P2-2 |
| P3-2 | **A1-4**: Webhook con body crudo y secreto | Webhook valida firma | `server-api.js (75, 1252-1296)` | P2-1, P2-2 |
| P3-2 | **A1-5**: await en /api/usage/increment y health check | Health check y límite de exportación | `server-api.js (271-280, 1336-1347)` | P2-1, P2-2 |

### P4 - Medio (Después de P3)
| # | Tarea | Causa | Archivos | Dependencies |
|---|-------|-------|----------|-------------|
| P4-1 | **A2-1**: Migrar flat config ESLint | `.eslintrc.cjs → eslint.config.js` | `.eslintrc.cjs`, `package.json` | Ninguna (calidad código) |
| P4-2 | **A2-2**: Corregir tscoconfig | `baseUrl`, claves duplicadas, `server//` | `tsconfig.json` | Ninguna |
| P4-3 | **A2-3**: Alinear firebase scripts | `firebase.json`, `firebase.scripts.json`, gate | `firebase*.json`, `scripts/promotion_gate.sh` | P1-1, P1-2, P1-3 |

### P5 - Bajo (Mejoras post-Fase 2)
| # | Tarea | Causa | Archivos | Dependencies |
|---|-------|-------|----------|-------------|
| P5-1 | **A2-4**: CI con test + lint + typecheck + audit + gitleaks | Pipeline CI/CD completo | `.github/workflows/`, `package-lock.json`, `.gitignore` | Ninguna |
| P5-2 | **A2-5**: XSS + DOMPurify | HTML checkout + reportes sanitizados | `server-api.js (905-944, 1208-1250)` | Ninguna |
| P5-3 | **A2-6**: Logs sin PII + rotación | Logs db.cjs, cacheDb.js | `db.cjs (19-26, 211-239)`, `cacheDb.js (31-59)` | Ninguna |
| P5-4 | **A2-7**: Consolidar capa datos | Borrar huérfanos + deduplicar `public/` | `db.js, js/payment.js, js/firebase-client.js` | Ninguna |
| P5-5 | **A2-8**: graphify-out actualizado | `graphify-out/*` fuera de deploy público | `graphify-out/`, `scripts/graphify_index_docs.py` | Ninguna |

## Ruta Crítica

**P1-1 → P1-2 → P1-3 → P1-4 → P2-1 → P2-2 → P2-3 → P3-1 → P3-2 → P3-2 → P4-1 → P4-2 → P4-3 → P5-1 → P5-2 → P5-3 → P5-4 → P5-5**

### Justificación de Prioridad

1. **Seguridad crítica y pérdida de datos** (P1): Los 8 hallazgos críticos (A0-1 a A0-7) bloquean cualquier despliegue. Son vulnerabilidades que exponen credenciales, claves privadas y datos sensibles. **Primera prioridad absoluta.**

2. **Errores que impiden iniciar/compilar** (P2): Las tareas A1-1 a A1-5 requieren remover los bloqueos de P1. Sin cerrar Fase 0, estas tareas están bloqueadas pero su implementación es necesaria para la funcionalidad del sistema.

3. **Base de datos, migraciones y contratos API** (P3): Las tareas A1-3 y A1-4 tocan `server-api.js` y `db.cjs`. Aunque zonas congeladas, el plan prevede corregirlos en Fase 1 con autorización.

4. **Autenticación y autorización** (P4): Las mejoras ESLint/TypeScript mejoran calidad pero no bloquean funcionalidad. Prioridad baja después de asegurar lo crítico.

5. **Integraciones fundamentales** (P5): Los módulos 7-10 ya están implementados y testeados (68+ tests). Las mejoras son de pulido.

6. **Flujos completos del usuario** (P6): Los flujos básicos (carga de geometría, validación, exportación) funcionan. Los flujos avanzados (notificaciones reales, MFA con SMS, despliegue) requieren remover bloqueos.

7. **Pruebas y regresiones** (P6): 68+ tests passing validan el estado actual. No se introdujeron regresiones en esta sesión.

8. **Rendimiento, accesibilidad y mantenibilidad** (P7-8): Mejoras de código a posteriori una vez asegurados los bloqueos críticos.

9. **Documentación y preparación despliegue** (P8): README y plan de auditoría deben actualizarse al cerrar cada fase.

## Orden de Ejecución Recomendado

### Paso 1: Cerrar Fase 0 Completamente
- [ ] A0-1: Revocar contraseña app Gmail + guardar fuera del repo
- [ ] A0-2: Rotar clave Firebase Admin + retirar JSON del disco
- [ ] A0-3: Quitar `public: "."` de firebase.json + `ignore` completo
- [ ] A0-4: Purgar datos y credenciales del historial git
- [ ] A0-5: Generar JWT_SECRET aleatorio ≥32 bytes en `config.env.js`
- [ ] A0-6: Eliminar `_update_user.cjs` + rotar password admin
- [ ] A0-7: Añadir `gitleaks` pre-commit/CI + completar `.gitignore`

**Resultado habilitante**: `npm run predeploy` y `npm run deploy` funcionan.

### Paso 2: Tareas Funcionales (después de P1)
- [ ] A1-1: Helper propiedad recurso en 9 endpoints `server-api.js`
- [ ] A1-2: Completar expedientes `db.cjs` (findByProject, update, deleteById)
- [ ] A1-3: Variable `DB_BACKEND` + contrato Firestore
- [ ] A1-4: Webhook con body crudo + secreto HMAC
- [ ] A1-5: await en `/api/usage/increment` + health check real

### P5: Mejoras de Código (opcional, después de P4)
- [ ] A2-1 a A2-8: Mejoras de lint, typecheck, CI, XSS, logs, etc.

## Verificación de Cada Tarea

Para cada tarea lista, se define:
- **Problema concreto**: Descripción exacta del error o funcionalidad faltante
- **Causa raíz**: Confirmada o hipótesis a investigar
- **Solución propuesta**: Cambio mínimo y reversible
- **Archivos afectados**: Lista precisa
- **Dependencias**: Tareas previas obligatorias
- **Riesgos**: Posibles efectos colaterales
- **Criterios de aceptación**: Condiciones verificables de finalización
- **Pruebas necesarias**: Comandos o scripts a ejecutar
- **Evidencia esperada**: Resultados que demuestran correcto funcionamiento

## Nota sobre Dependencias Cruzadas

Las tareas A1-1 a A1-5 dependen del cierre de A0-1 a A0-5. Sin remover los bloqueos de Fase 0, estas tareas están teóricamente bloqueadas. El plan considera implementarlas después de P1 con la autorización correspondiente, aprovechando que el código ya fue parcialmente implementado en esta sesión (módulos 7-10 functions).

## Prioridad Final Justificación

La prioridad final se ordena por:
1. **Impacto**: P1 afecta seguridad global; P2-P5 afectan funcionalidad específica
2. **Riesgo**: P1-4 pueden causar pérdida de datos o exposición de credenciales
3. **Dependencias**: Efecto cadena - cada fase habilita la siguiente
4. **Alcance**: P1 cierra 8 hallazgos; P2-5 abordan tareas específicas enumeradas

## Próxima Tarea Ejecutable

Una vez cerrada la Fase 0 (A0-1 a A0-7), la próxima tarea ejecutable es **A1-1: Helper propiedad recurso en 9 endpoints de server-api.js**, que restaura la funcionalidad CRUD de expedientes y es la base para las siguientes integraciones.