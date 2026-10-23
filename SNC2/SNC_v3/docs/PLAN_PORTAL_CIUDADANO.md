# Plan de Mejoras — Portal Ciudadano (Compartir datos municipales)

> **Estado:** COMPLETADO — 5/5 mejoras implementadas y verificadas con tests unitarios (`tests/portal-ciudadano.test.mjs`).
> **Objetivo:** Una municipalidad publica sus datos catastrales y la ciudadanía
> los consulta a través de la página o de un enlace compartible.
> **Verificado el:** 2026-10-22. Test suite: `npm test` (32/32 suites en verde).

---

## Archivos involucrados

| Archivo | Dominio (AGENTS.md §3) | Qué se toca |
|---|---|---|
| `ciudadano/index.html` | Portal Ciudadano | URL params, botón Compartir, branding municipal |
| `js/app-ciudadano.js` | Portal Ciudadano | Parsear URL, cargar datos municipales, generar enlace/QR |
| `server-api.js` | Backend API | Endpoints de publicación/lectura municipal |
| `db.cjs` | Backend API | (opcional) tabla `municipal_data` para registro de publicaciones |
| `scripts/convert-piribebuy.mjs` | Scripts | Modelo a replicar para otras municipalidades |

---

## Mejora 1 — Enlaces compartibles (URL con parámetros)

**Prioridad:** ALTA · **Esfuerzo:** Bajo · **Archivos:** `ciudadano/index.html`, `js/app-ciudadano.js`

El portal hoy no guarda estado en la URL; un ciudadano no puede compartir su vista.

Implementar parseo de query params al cargar:

```
/ciudadano/?padron=12345                    → abre y centra esa parcela
/ciudadano/?muni=piribebuy                  → carga datos de esa municipalidad
/ciudadano/?lat=-25.3&lng=-57.6&z=15        → centra el mapa en esas coordenadas
/ciudadano/?base=satellite                   → selecciona capa base
/ciudadano/?muni=piribebuy&padron=123       → municipalidad + parcela
```

**Dónde tocar:**
- `js/app-ciudadano.js`: al final de `init()`, leer `new URLSearchParams(location.search)`
  y ejecutar la acción correspondiente (volar a parcela, cargar datos municipal, setBaseLayer).
- No requiere cambios del servidor.

**Criterio de cierre:** abrir `/ciudadano/?padron=X&lat=Y&lng=Z` centra el mapa en esa parcela sin interacción del usuario.

---

## Mejora 2 — Endpoint de publicación municipal

**Prioridad:** ALTA · **Esfuerzo:** Medio · **Archivos:** `server-api.js`, `data/municipal/`

La municipalidad necesita subir su GeoJSON de parcelas y que quede disponible públicamente.

```
POST /api/municipal/:muniId/publicar   → sube GeoJSON (auth admin municipal)
GET  /api/municipal/:muniId/parcelas   → lectura pública (sin auth)
GET  /api/municipal/:muniId/info       → metadatos: nombre, logo, fecha de actualización
```

**Dónde tocar:**
- `server-api.js`: agregar 3 rutas después de las rutas de `/ciudadano` (línea ~78).
- Los GeoJSON se guardan en `data/municipal/:muniId/parcelas.geojson` (servidos como estáticos).
- Los metadatos en `data/municipal/:muniId/info.json`.

**Criterio de cierre:** `curl /api/municipal/piribebuy/parcelas` devuelve el GeoJSON publicado y el portal ciudadano lo renderiza con `?muni=piribebuy`.

---

## Mejora 3 — Botón "Compartir" + código QR

**Prioridad:** ALTA · **Esfuerzo:** Bajo · **Archivos:** `ciudadano/index.html`, `js/app-ciudadano.js`

Cuando el inspector de parcela está abierto, agregar botón que genere:
1. **Enlace corto:** `?muni=piribebuy&padron=123` (copiable al portapapeles)
2. **Código QR:** del enlace, usando la librería `qrcode` ya disponible en `/vendor`.

**Dónde tocar:**
- `ciudadano/index.html`: agregar botón en el footer del inspector (`parcel-inspector`, línea ~318-330).
- `js/app-ciudadano.js`: función `shareParcel()` que construye la URL, la copia y genera el QR en un modal.

**Criterio de cierre:** al hacer clic en Compartir, se copia el enlace al portapapeles y se muestra un QR escaneable.

---

## Mejora 4 — Branding municipal

**Prioridad:** MEDIA · **Esfuerzo:** Bajo · **Archivos:** `ciudadano/index.html`, `js/app-ciudadano.js`, `server-api.js`

Cuando el enlace trae `?muni=piribebuy`, el header del portal muestra:

```
[Ciudadano PY Pro — Municipalidad de Piribebuy]
```

con color de acento y logo de esa municipalidad.

**Dónde tocar:**
- `js/app-ciudadano.js`: leer `?muni=`, hacer `fetch('/api/municipal/:id/info')`, inyectar nombre/logo en el header.
- `ciudadano/index.html`: agregar elemento `<span id="muni-brand">` en el header (línea ~61).
- Los metadatos (nombre, color, logo) vienen de `data/municipal/:id/info.json`.

**Criterio de cierre:** abrir `?muni=piribebuy` muestra "Municipalidad de Piribebuy" en el header con su logo.

---

## Mejora 5 — Indicador de fuente y fecha de datos

**Prioridad:** MEDIA · **Esfuerzo:** Bajo · **Archivos:** `ciudadano/index.html`, `js/app-ciudadano.js`

Panel que dice: *"Datos publicados por Municipalidad de X · Actualizado: DD/MM/AAAA"*, para que el ciudadano sepa que consulta datos oficiales municipales.

**Dónde tocar:**
- `ciudadano/index.html`: agregar `<div id="data-source-badge">` debajo del header o en el sidebar.
- `js/app-ciudadano.js`: al cargar datos municipal, actualizar el badge con `info.json`.

**Criterio de cierre:** el badge muestra el nombre de la municipalidad y la fecha de la última publicación.

---

## Modelo de datos sugerido

```
data/
  municipal/
    piribebuy/
      info.json          → { "nombre": "Municipalidad de Piribebuy", "color": "#10b981",
                             "logo": "logo.png", "actualizado": "2026-10-22" }
      parcelas.geojson   → FeatureCollection con las parcelas publicadas
    <otra-municipalidad>/
      info.json
      parcelas.geojson
```

El flujo completo queda así:

```
Municipalidad                          Ciudadano
     |                                     |
     | POST /api/municipal/x/publicar       |
     | (sube parcelas.geojson)             |
     |                                     |
     |          GET /api/municipal/x/parcelas
     |<------------------------------------|
     |                                     |
     |         /ciudadano/?muni=x&padron=123
     |         (enlace compartido por WhatsApp, QR, etc.)
     |<------------------------------------|
     |                                     |
     |         Portal renderiza el mapa + inspector + branding
```

---

## Relación con la auditoría (2026-10-18)

Estas mejoras no cierran ningún hallazgo crítico de la auditoría, pero el endpoint
`POST /publicar` **debe** implementarse con `authMiddleware` (no dejarlo público) y
validar el GeoJSON recibido (tamaño máximo, estructura, CRS). Ver `docs/AUDITORIA_SNC_v3_2026-10-18.md` C-04.
