# Grafo de Seguimiento — SNC_v3 · Plan de trabajo

## 1. Vista general

| Métrica | Valor |
|---|---|
| **Estado** | En desarrollo activo (SNC 551/2023) |
| **Data source** | Liquidación II 2026 · Censo 2022 · DNIT 514 planillas |
| **Api** | `server-api.js` → `http://localhost:5556/api/v3/dnit/*` |
| **Generación** | `node scripts/analisis-territorial.mjs` |
| **Base de datos** | SQLite (`data/catastro_territorio.sqlite`, `data/dnit_cuentas.sqlite`, `data/municipal/patentes_comerciales.sqlite`, `data/ciudadano_notificaciones.sqlite`) + GeoParquet (`data/parquet/`) |
| **Grafo de conocimiento** | `.opencode/coordination/` + `graphify-out/` |

---

## 2. Matriz de trabajo

| # | Tarea | Estado | Bloqueante | Entregable | Fecha |
|---|-------|--------|------------|------------|-------|
| W1 | Conectar API DNIT a datos dinámicos (analisis-datos.js) | 🟡 En progreso | — | `analisis-datos.js` consulta API | 2026-10-28 |
| W2 | Expander FODA con indicadores de riesgo (ambiental, jurídico, urbano, fiscal) | 🔴 Bloqueado: falta fuente de datos | — | 4 paneles + N indicadores | 2026-10-28 |
| W3 | Agregar sección "Recomendación Inteligente" (auto dictamen) | 🔴 Bloqueado: requiere motor DI | W2 | Sección en análisis territorial | 2026-10-28 |
| W4 | Conectar mapa Leaflet a datos reales | 🟢 Pendiente | N/A | Mapa con datos de DNIT | 2026-10-28 |
| W5 | Migrar a PostGIS / GeoServer (SNC v4) | 🔴 Bloqueado: arquitectura mayor | N/A | Nuevo stack | 2026-10-28 |
| W6 | Integrar capas ambientales (INFONA, MADES, Humedales) | 🔴 Bloqueado: fuente externa | — | Cervantes / Humedales | 2026-10-30 |
| W7 | Integrar capa notarial (DGRP, Títulos, Hipotecas, Embargos) | 🔴 Bloqueado: fuente externa | — | DGRP / Títulos | 2026-10-30 |
| W8 | Integrar capa municipal (POUT, Plan Regulador, COS, CUS, Zonificación) | 🔴 Bloqueado: fuente externa | — | POUT / COS / CUS | 2026-10-30 |
| W9 | Generar PDF auto-dictamen (SNC 551) | ✅ Completado | — | PDF por expediente | 2026-10-28 |
| W10 | Validaciones automáticas (cuentas, edificación, límites) | 🟡 En progreso | W1 | Reglas de validación | 2026-10-30 |
| W11 | Seguimiento de tareas por Fase (0 → 4) | ✅ Completado | — | `PLAN_MEJORA_PRODUCTO_BACKLOG.json` | 2026-10-18 |
| W12 | Gestión municipal: locales y patentes, inspecciones, liquidaciones, Planificación (POUT), avisos | 🟡 En progreso (falta reinicio del servidor y prueba en navegador) | — | `municipal/gestion.html`, `gestionMunicipalServicio.js` | 2026-10-29 |
| W13 | Usos OSM por sector (66 735; 39 102 con Cta. Cte./padrón) para Habilitación de Comercio y Liquidaciones | ✅ Datos generados | — | `data/osm/usos_py.json`, `scripts/osm-usos.mjs`, `usosOsm.js` | 2026-10-29 |
| W14 | Zonas residenciales OSM (7 736) con distrito, barrio, Cta. Cte. y padrones; 4 725 sin parcela SNC (34 670 ha) | ✅ Datos generados | — | `data/osm/residencial/`, `scripts/osm-residencial.mjs` | 2026-10-29 |
| W15 | Ciudadano: vincular teléfono con código y avisos en cola | 🟡 Backend listo; envío real requiere proveedor (`NOTIF_PROVEEDOR`) | Fase 0 | `ciudadanoServicio.js` | 2026-10-29 |
| W16 | Consolidación territorial DB y Parquet (departamentos, distritos, cascos, POUT, barrios, manzanas) con benchmark | ✅ Completado | — | `catastro_territorio.sqlite`, `data/parquet/` | 2026-10-29 |
| W17 | Login, Registro y Alta de Usuario/Cliente con selector de Perfil de Uso previsto (Ley 551/2023) | ✅ Completado | — | `index.html`, `register.html`, `js/authModal.js` | 2026-10-29 |
| W18 | Fiscalización de Patentes Comerciales (5 estados: vigente, clandestina, mora, inhabilitada, no declarada) e inspectores | ✅ Completado | — | `municipalPatentesServicio.js`, `patentes_comerciales.sqlite`, `js/patentesMunicipalUI.js` | 2026-10-29 |
| W19 | Portal Ciudadano: Situación tributaria integral (DNIT + Municipal), Semáforo, Vinculación Cta. Cte. y Notificaciones | ✅ Completado | — | `ciudadanoNotificacionesServicio.js`, `ciudadano_notificaciones.sqlite`, `js/ciudadanoNotifUI.js` | 2026-10-29 |

---

## 3. Estados

| Estado | Significado |
|---|---|
| ✅ Completado | Implementado, verificado y en producción |
| 🟡 En progreso | En desarrollo, requiere más trabajo |
| 🔴 Bloqueado | Requiere fuente de datos externa o arquitectura mayor |
| 🟢 Pendiente | Se conoce la solución, depende de recursos |
| 📋 Planificado | Tarea definida, aún no iniciada |

---

## 4. Dependencias críticas

```
W1 (API DNIT a datos) → W2 (FODA riesgo) → W3 (Recomendación)
W1 (API DNIT a datos) → W10 (Validaciones) → W11 (Seguimiento)

W5 (PostGIS/GeoServer) → Toda la geoprocesamiento real
W6/W7/W8 (Capas ambientales/notariales/municipales) → W3 (Recomendación)
```

---

## 5. Bloqueantes principales

1. **Fuentes de datos ambientales y registrales no disponibles** — requieren contrato con MADES, INFONA, DGRP
2. **Arquitectura SNC v4** — requiere PostGIS + GeoServer + motor normativo
3. **Censo 2022 a nivel barrio** — datos pendientes de confirmación

---

## 6. Línea de base actual

- ✅ HTML/CSS/JS funcional con Leaflet
- ✅ API Express + SQLite + tests (14/14)
- ✅ Script de actualización semanal (`actualizacion-semanal.mjs`)
- ✅ Análisis territorial generado por distrito
- ✅ FODA dinámica (sin filtros de umbrales)
- ✅ Diseño de sistema (60-30-10, Inter, JetBrains Mono)

---

## 7. Próximas acciones (orden de prioridad)

1. **W1**: Conectar `analisis-territorial.mjs` a `server-api.js`
2. **W2**: Ampliar FODA con indicadores de riesgo
3. **W5**: Diseñar arquitectura SNC v4 (PostGIS/GeoServer)
4. **W6**: Contactar fuentes ambientales Paraguay (MADES, INFONA, Humedales)
5. **W7**: Contactar fuentes notariales (DGRP, Títulos, Hipotecas)
6. **W8**: Contactar fuentes municipales (POUT, COS, CUS, Zonificación)

---

## 8. Archivos clave del proyecto

| Archivo | Ruta | Función |
|---|---|---|
| `server-api.js` | `server-api.js` | API Express (+5556) |
| `scripts/analisis-territorial.mjs` | `scripts/` | Genera HTML/JS/CSS |
| `scripts/analisis-territorial.plantilla.html` | `scripts/` | Template de generación |
| `scripts/dnit-cuentas.mjs` | `scripts/` | Carga datos DNIT |
| `scripts/dnitServicio.js` | `scripts/` | Servicio SNC+MCP |
| `data/dnit_cuentas.sqlite` | `data/` | Base de datos SQLite |
| `data/analisis/AnalisisTerritorial.html` | `data/analisis/` | Página analítica |
| `data/analisis/analisis-app.js` | `data/analisis/` | Lógica JS |
| `data/analisis/analisis-datos.js` | `data/analisis/` | Datos generados |
| `data/analisis/analisis.css` | `data/analisis/` | Estilos |
| `.opencode/coordination/` | `.opencode/` | Grafo de conocimiento |

---

## 9. Rastreo

- **Fecha de creación:** 2026-10-28
- **Actualizado por:** Hermes Agent (Hermes)
- **Próxima revisión:** al completar W1
- **Verificación:** `node --check` + `curl http://localhost:5556/api/health`

---

*Fin del grafo de seguimiento · SNC_v3 · Generado en 2026-10-28*
