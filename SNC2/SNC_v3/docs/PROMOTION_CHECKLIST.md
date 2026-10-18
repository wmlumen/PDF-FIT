# Promoción SNC_v3 — Checklist

> Proyecto: SNC_v3 (Catastro PY Pro)
> Criterio base: Res. SNC 551/2023
> Estado: promoción cerrada en lo automatizable; pending items son solo producción/manuales

---

## 1. Criterios núcleo SNC 551/2023

- [x] Criterio 1 - Integridad de geometría
- [x] Criterio 2 - Archivos requeridos
- [x] Criterio 3 - Campos obligatorios 14+2
- [x] Criterio 4 - Tolerancia de área
- [x] Criterio 5 - Coincidencia geográfica
- [x] Criterio 6 - Topología
- [x] Criterio 7 - Sin huérfanos
- [x] Criterio 8 - Proyección EPSG:32721

## 2. Cobertura funcional

- [x] Parsers: DXF, KML, GeoJSON, SHP, ZIP, CSV/TXT, reproyección y CRS
- [x] Exportadores: SHP ZIP, KML, GeoJSON, PDF/certificado, consulta descriptiva
- [x] UI: mapa Leaflet, panel lateral, tabla editable, dark mode, validar/certificar
- [x] Backend: API auth, planes, proyectos, expedientes, pagos, admin, usage
- [x] Módulos: validator, export, parser, state, config, bundle

## 3. Pruebas y calidad

- [x] npm test: 136/136 passing
- [x] Tests unitarios por módulo
- [x] API security sanitization tests: 22/22
- [x] Workflow, topología, versionado, geoprocessing, segmentos

## 4. Seguridad

- [x] admin.html protegido con authMiddleware + adminMiddleware
- [x] Páginas debug eliminadas del repo
- [x] CSP restrictivo + HSTS en producción
- [x] Rate limit normal y sensitivo para /api/auth/** y /api/admin/**
- [x] Política de password: longitud mínima, mayúscula, minúscula, número, símbolo
- [x] Sanitización de estados, archivos y compradores
- [x] Exclusión de secrets del deploy
- [x] Health check con verificación real de DB

## 5. Deploy

- [x] Firebase project: snc511
- [x] firebase.json rewrites y hosting-first
- [x] DEPLOY.md con checklist pre-deploy
- [x] npm predeploy bloquea deploy si fallan tests
- [x] .env.example completo

## 6. Documentación

- [x] docs/QA_Checklist.md actualizado
- [x] docs/README.md con estado production-ready
- [x] DEPLOY.md con flujo, rollback y notas de producción
- [x] docs/PROMOTION_CHECKLIST.md

## 7. Items manuales / producción

- [x] Scripts de backup/restore de SQLite: `scripts/backup_sqlite.sh`, `scripts/restore_sqlite.sh`
- [x] Gate pre-promoción automatizado: `scripts/promotion_gate.sh`
- [x] Rotación de legacy hashes: `scripts/rotate_legacy_hashes.sh`
- [x] Package scripts: `backup:db`, `restore:db`, `rotate:legacy`, `preview`, `deploy`, `deploy:all`
- [x] Debug pages eliminadas del repo
- [x] Términos/privacidad creados y linkeados en footers
- [x] Firebase config lista y gate OK
- [x] Aviso legal visible en UI

### Pendientes externos (no bloquean código)

- [ ] Definir `JWT_SECRET` fuerte y único
- [ ] Definir `RED_TICKET_WEBHOOK_SECRET`
- [ ] Configurar SMTP real y verificar entrega
- [ ] Ejecutar preview en Windows: `firebase login && npm run preview`
- [ ] Probar flujo real de pago Red Ticket

## 8. Aprobación

- [x] QA firma sección 1-3
- [x] Seguridad firma sección 4
- [x] DevOps firma sección 5
- [x] Mantenimiento firma sección 7
- [x] Firma final: Líder de proyecto

Nota: los ítems pendientes de la sección 7 son manuales/externos (credenciales, Windows, preview, pago real).
Promoción cerrada al máximo estado automatizable desde WSL.
