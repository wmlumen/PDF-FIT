# Plan de mejora de producto — SNC v3 (2026-10-27)

> Documento de trabajo para agentes de IA y personas, mismo formato que
> [`PLAN_REMEDIACION_AUDITORIA.md`](PLAN_REMEDIACION_AUDITORIA.md) y [`PLAN_FASE11_BACKLOG.md`](PLAN_FASE11_BACKLOG.md).
> Versión legible por máquina: [`PLAN_MEJORA_PRODUCTO_BACKLOG.json`](PLAN_MEJORA_PRODUCTO_BACKLOG.json) (misma lista de tareas,
> con `id`, `carril`, `archivos`, `depende_de` y `estado`).
>
> Origen: auditoría de producto del 2026-10-27 (portales en escritorio y celular, `js/plans.js`, documentación),
> pedidos del usuario del mismo día (modo ciudadano en celular con GPS; notificaciones identificadas por
> cuenta corriente catastral con seguimiento desde la cuenta principal o subdivisión) y comparación con
> TerraPlaniq (terraplaniq.com) y con el visor de Structec (mapas.structec.com.py). Structec usa Next.js en Vercel,
> mapa base vectorial de Protomaps y archivos PMTiles propios por departamento ("Lotes catastrales (RUN, …)",
> vintage 2026-07-30) generados desde fuentes públicas; no expone una API abierta. La fuente original abierta es
> el GeoServer de catastro.gov.py (WMS/WFS), que el SNC puede consumir directamente (PM-35).
>
> **La auditoría de seguridad del 2026-10-18 sigue siendo la prioridad.** Las tareas marcadas
> `Fase 0` tocan zonas congeladas (esquema de `db.cjs`, auth/IDOR de `server-api.js`) y no se empiezan
> hasta cerrar la Fase 0 de [`PLAN_REMEDIACION_AUDITORIA.md`](PLAN_REMEDIACION_AUDITORIA.md).

---

## 0. Cómo trabajar este plan entre varias IA

1. **Tomar una tarea por vez** de la tabla de su carril (§2). No mezclar carriles en un mismo cambio.
2. **Verificar dependencias** (`Depende de`) y que ningún otro agente tenga los mismos `Archivos` bloqueados.
3. **Seguir el ciclo de `AGENTS.md` §2** (ruta → check → lock → código + test → pass/fail).
   ⚠️ `.opencode/coordination/cli.mjs` **no existe hoy** en el repositorio (verificado 2026-10-27): hasta que
   PM-28 lo restaure, el bloqueo se registra a mano en la columna `estado` del JSON (`"en_curso:<agente>"`).
4. **Cerrar solo con el criterio de cierre verificado** (test o captura reproducible), marcar `[x]` aquí y
   poner `"hecho:<commit>"` en el JSON, en el mismo cambio.
5. Un carril = un área de archivos. Dos agentes pueden trabajar en paralelo solo en carriles distintos.

| Carril | Área | Archivos principales | Puede empezar ya |
|---|---|---|---|
| **A — Confianza** | marca, avisos, modo demo | `*.html`, `js/app-*.js` (textos) | Sí |
| **B — Ciudadano móvil + GPS** | portal ciudadano | `ciudadano/index.html`, `js/app-ciudadano.js`, `css/` | Sí |
| **C — Notificaciones por Cta. Cte. Catastral** | modelo, API y UI | `db.cjs`, `server-api.js`, `index.html`, `js/notificaciones*.js` | **No — Fase 0** |
| **D — Entregable profesional** | planos, cuadros, linderos | `js/export.js`, `js/cogo.js`, `js/app-notarial.js`, `js/municipal.js` | Sí |
| **E — Producto y plataforma** | planes, navegación, build | `js/plans.js`, `index.html`, `vite.config.js` | Parcial |

---

## 1. Hallazgos que originan el plan (resumen)

| # | Hallazgo | Severidad |
|---|---|---|
| H-1 | Se presenta como sistema oficial: sigla SNC, `superadmin@snc.gov.py`, "Visor Oficial SNC", "Interconexión B2B2G Activa"; el aviso de herramienta de apoyo solo está en el login | P0 |
| H-2 | `js/plans.js`: 6 planes de un portal de clasificados ("Ficha Directorio", "Links WhatsApp", "Anuncio destacado en Remansito/Villa Hayes", 10.000–100.000 Gs) sin validación ni certificación | P0 |
| H-3 | Datos de ejemplo presentados como reales: `ejemplo_piribebuy.geojson` precargado; minuta notarial con Padrón 4.521, valores y "Libre de Gravamen" fijos, con botón "Copiar Minuta" | P0 |
| H-4 | En celular (390 px) el panel tapa el mapa y el portal ciudadano queda con el mapa gris (sin mapa base) | P0 |
| H-5 | Notificaciones en memoria (`js/interoperabilidad.js` `_notificacionesMunicipales`): se pierden al reiniciar, sin cuenta catastral obligatoria ni seguimiento | P1 |
| H-6 | Sin jerarquía de cuentas: `users` no tiene organización ni subdivisión | P1 |
| H-7 | Falta el entregable del profesional (plano PDF, cuadro de datos técnicos); `docs/FUNCIONALIDADES.md` marca el PDF como eliminado | P1 |
| H-8 | ~120 botones en `index.html`, recorrido principal no explícito; 7 nombres de producto distintos; Tailwind por CDN en producción | P1 |

---

## 2. Tareas por carril

### Carril A — Confianza

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| PM-01 | [ ] Marca propia y avisos: quitar `.gov.py`, "Oficial" y "B2B2G Activa"; aviso "Herramienta de apoyo técnico; la validación oficial corresponde a la autoridad competente" en el pie de los 5 portales y en todo PDF/minuta exportada | — | `index.html`, `municipal/index.html`, `ciudadano/index.html`, `notarial/index.html`, `admin/index.html`, `js/export.js` | `grep -ri "gov.py\|B2B2G\|Visor Oficial"` sin resultados en HTML/JS de la app; captura de los 5 pies con el aviso |
| PM-02 | [ ] Modo demostración separado: franja visible "DEMOSTRACIÓN — datos ficticios" cuando hay datos de ejemplo; fuera de ese modo, estados vacíos ("Cargue un DXF, KML o SHP para empezar"); la minuta notarial solo se genera desde un expediente real | — | `index.html`, `js/app.js`, `js/app-notarial.js`, `js/app-municipal.js`, `js/app-ciudadano.js` | Sin sesión y sin `?demo=1`: ningún portal muestra padrón, valores ni minuta precargados; con `?demo=1` la franja es visible en toda la pantalla |
| PM-31 | [ ] Aviso legal al estilo de Structec: "capas de fuentes públicas, referenciales; no afiliado al SNC, RUN, INE ni DINAC" en el panel de capas y en "Acerca de" | PM-01 | `index.html`, portales | Texto visible en los 5 portales junto a las capas |
| PM-03 | [ ] Verificación legal de citas ("Ley 7.424/25 RUN", Ley 3966/2010, Res. 551/2023) por una persona abogada; corregir textos | — | `notarial/index.html`, `js/app-notarial.js` | Nota en este plan con quién y cuándo verificó; textos ajustados |

### Carril B — Portal ciudadano en celular con GPS

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| PM-04 | [ ] Diseño para celular: mapa a pantalla completa; panel como cajón inferior deslizable (cerrado por defecto); cabecera compacta con menú; `map.invalidateSize()` en `resize`, `orientationchange` y al abrir/cerrar el cajón | — | `ciudadano/index.html`, `js/app-ciudadano.js`, `css/` | Captura a 390×844 y 412×915 con mapa base visible y cajón cerrado/abierto; sin scroll horizontal |
| PM-05 | [ ] Botón "Mi ubicación" (GPS): `navigator.geolocation.watchPosition` con alta precisión; marcador + círculo de precisión; centrar mapa; mostrar coordenadas WGS84 y UTM 21S; consultar `/api/spatial-identify` (departamento, distrito, barrio, parcela) y mostrar la ficha; mensajes claros si el permiso se niega o no hay señal; botón para dejar de seguir | PM-04 | `js/app-ciudadano.js`, `ciudadano/index.html` | En un celular real (HTTPS): al tocar el botón aparece el punto azul con su radio y la ficha con distrito/barrio; permiso denegado muestra cómo habilitarlo; test unitario del formateo de coordenadas y del manejo de errores |
| PM-34 | [ ] "Informe del lugar" en el portal ciudadano: ficha PDF de la ubicación o parcela (distrito, barrio, Cta. Cte., restricciones ambientales y fronterizas) con aviso legal | PM-05, PM-01 | `js/app-ciudadano.js`, `js/export.js` | PDF generado desde el celular con los datos de la ficha |
| PM-06 | [ ] "Mi domicilio": guardar una ubicación como domicilio **solo en el dispositivo** (`localStorage`, sin enviar al servidor) y volver a ella con un toque; compartir ubicación/parcela por enlace y QR (`qrcode` ya está en dependencias) | PM-05 | `js/app-ciudadano.js` | Domicilio persiste tras recargar; borrarlo lo elimina; ningún request al servidor contiene el domicilio guardado |
| PM-07 | [ ] HTTPS para uso desde el celular: la geolocalización solo funciona en contexto seguro (HTTPS o `localhost`). Documentar y habilitar certificado local para pruebas en la red (p. ej. `mkcert`) y HTTPS en el despliegue | Fase 0 (para despliegue) | `docs/DEPLOY_WINDOWS.md`, `run.bat` (no `config.env.js`, congelado) | Desde el celular en la misma red, `https://<ip>:<puerto>/ciudadano` abre sin error y PM-05 funciona |
| PM-08 | [ ] Privacidad de la ubicación: `/api/spatial-identify` no registra coordenadas en logs; aviso en `privacy.html` sobre el uso del GPS | PM-05 | `server-api.js` (solo el handler de spatial-identify), `privacy.html` | Revisión de logs tras 10 consultas: sin coordenadas; texto de privacidad actualizado |
| PM-09 | [ ] Diseño para celular del portal principal (Catastro Pro): barra de herramientas agrupada en menú, panel de capas como cajón | PM-04 (mismo patrón) | `index.html`, `js/app.js`, `css/` | Captura a 390 px con título visible y mapa utilizable |
| PM-40 | [ ] Mapa interactivo en Análisis Territorial: integrar Leaflet sincronizado con el selector de distrito (`data/analisis/AnalisisTerritorial.html`), mostrando límites distritales, parcelas registradas, fajas hídricas de 30m MADES y zonas POUT | PM-04 | `data/analisis/AnalisisTerritorial.html`, `data/analisis/analisis-app.js`, `data/analisis/analisis.css` | Al cambiar de distrito, el mapa Leaflet se re-encuadra al BBOX distrital y proyecta las capas vectoriales y restricciones hídricas correspondientes |

### Carril C — Notificaciones identificadas por Cuenta Corriente Catastral (Catastro Pro)

> Pedido del usuario: *"Si un usuario va a hacer una notificación, deberá estar identificado a qué Cta. Cte.
> Catastral está haciendo la notificación y también desde el usuario principal o subdivisión podrá ver el
> avance de las notificaciones."* — **Bloqueado hasta Fase 0** (esquema de `db.cjs` y auth de `server-api.js` congelados).

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| PM-10 | [ ] Jerarquía de cuentas: tablas `organizaciones` y `unidades_org` (subdivisiones con `parent_id`, árbol); en `users`: `org_id`, `unidad_id`, `rol_org` (`principal` \| `subdivision` \| `operador`). Migración aditiva e idempotente | Fase 0 | `db.cjs` | Migración corre dos veces sin error; test crea org → 2 subdivisiones → 3 usuarios |
| PM-11 | [ ] Notificaciones persistentes: tabla `notificaciones` (`id`, `org_id`, `unidad_id`, `autor_user_id`, **`cuenta_catastral_id` NOT NULL** → `cuenta_catastral.id`, `codigo_ccc`, `clave_comparacion` (respaldo: en el WFS oficial `ccatastral`, `padron` y `nro_matricula` pueden venir vacíos — verificado 2026-10-27 con objectid 1109243, Asunción; usar la clave `dpto|dist|#|zona|mz|lote|#|#`), `parcela_id`, `expediente_id`, `tipo`, `asunto`, `cuerpo`, `destinatario`, `estado`, `vence_el`, fechas) y `notificacion_eventos` (línea de tiempo con cadena de hash, mismo patrón que `expediente_historial`). Migrar `_notificacionesMunicipales` de `js/interoperabilidad.js` a la base | PM-10 | `db.cjs`, `js/interoperabilidad.js` | No se puede insertar una notificación sin Cta. Cte. válida (test); reiniciar el servidor no pierde notificaciones |
| PM-12 | [ ] API con visibilidad por jerarquía: `POST /api/notificaciones` (exige `codigo_ccc` existente y que su parcela pertenezca a la organización del usuario), `GET /api/notificaciones?ccc=&estado=&unidad=&desde=&hasta=`, `GET /api/notificaciones/:id` (con eventos), `PATCH /api/notificaciones/:id/estado`. Visibilidad: **principal** ve toda la organización; **subdivisión** ve la suya y sus subdivisiones hijas; **operador** solo las propias. Estados: `borrador → enviada → recibida → observada/respondida → cerrada` | PM-11 | `server-api.js` | Tests de IDOR: subdivisión A no ve las de B; principal ve ambas; operador solo las suyas; 404 (no 403) para ajenas, igual que el resto de la API |
| PM-13 | [ ] UI "Nueva notificación" en Catastro Pro: buscador **obligatorio** de Cta. Cte. Catastral (autocompletar sobre `cuenta_catastral`, muestra padrón y resalta la parcela en el mapa); no se puede enviar sin cuenta seleccionada | PM-12 | `index.html`, `js/notificaciones.js` (nuevo) | Captura del formulario; envío sin Cta. Cte. bloqueado en cliente y servidor |
| PM-14 | [ ] UI "Seguimiento de notificaciones" para principal/subdivisión: tablero de avance (cantidad por estado, vencidas, por subdivisión y por Cta. Cte.), bandeja con filtros, línea de tiempo de cada notificación, exportar a Excel/PDF | PM-12 | `index.html`, `js/notificaciones.js`, `js/export.js` | Con datos de prueba (2 subdivisiones, 10 notificaciones), el principal ve el total y el avance por subdivisión; la subdivisión ve solo lo suyo |
| PM-15 | [ ] Avisos de vencimiento y cambios de estado por correo (usa `js/mailer.js`) | PM-12 | `js/mailer.js`, `server-api.js` | Notificación vencida genera un correo de prueba (SMTP de test) |

### Carril D — Entregable profesional (inspirado en TerraPlaniq)

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| PM-16 | [ ] Plano de mensura en PDF por parcela: rótulo, escala, norte, grilla de coordenadas, cuadro de datos técnicos, resultado de los 8 criterios, aviso legal (PM-01); generación masiva (1 a N parcelas) | PM-01 | `js/export.js`, `js/exportFormats.js` | PDF de una parcela de `data/municipal/test_muni` revisado por una persona agrimensora; lote de 13 parcelas en un ZIP |
| PM-17 | [ ] Cuadro de datos técnicos (vértice, lado, rumbo, distancia, coordenadas SIRGAS 2000 / UTM 21S) exportable a Excel y Word | — | `js/cogo.js`, `js/export.js` | Suma de lados = perímetro y cierre angular dentro de tolerancia; test con parcela conocida |
| PM-18 | [ ] Linderos automáticos: detectar colindantes con `/api/v3/catastro/vector-view` y generar la cláusula de linderos de la minuta desde la geometría real | PM-02 | `js/app-notarial.js`, `js/geoprocessing.js` | Para una parcela de prueba, los 4 rumbos y colindantes coinciden con el catastro; sin texto fijo |
| PM-19 | [ ] Subdivisión por área o por frente respetando la Ley 3966 (360 m², 12 m de frente, cesión vial 16 %) | — | `js/municipal.js`, `js/geoprocessing.js` | Subdividir un polígono de prueba produce lotes que pasan la validación municipal |
| PM-20 | [ ] Conversión de datum Campo Inchauspe 1969 → SIRGAS 2000 para planos antiguos | — | `js/parser.js`, `js/config.js` | Punto de control con diferencia conocida dentro de la tolerancia |
| PM-32 | [ ] Validación de zona de seguridad fronteriza (Ley 2532/2005, 50 km; confirmar en PM-03): capa nacional y advertencia en el expediente y en la minuta notarial cuando la parcela cae dentro | PM-03 | `js/validator.js`, `js/app-notarial.js`, `data/1.Paraguay/` | Parcela de prueba dentro de la franja muestra la advertencia; una fuera, no |
| PM-33 | [ ] Capas nacionales de referencia vistas en Structec y ausentes en el SNC: restricciones aeronáuticas para drones (fotogrametría), equipamientos e infraestructura, cartografía INE por departamento | — | `js/mapEngine.js`, `data/1.Paraguay/` | Capas activables en el panel con fuente y fecha |
| PM-21 | [ ] Importar KMZ (KML comprimido) | — | `js/parser.js` | KMZ de Google Earth carga igual que su KML |
| PM-22 | [ ] Metadatos GNSS del expediente (método RTK/PPK/estática, base, precisión, fecha) como respaldo del criterio de georreferenciación | Fase 0 (si toca `db.cjs`) | `js/validator.js`, `index.html` | Los metadatos aparecen en el PDF de PM-16 |
| PM-23 | [ ] Visor de lotes para loteadoras: enlace y QR por proyecto, estados Disponible/Separado/Vendido con contadores | PM-26 | `ciudadano/` o portal nuevo | Proyecto de prueba compartido por QR, estados editables por el dueño |

### Carril E — Producto y plataforma

| # | Acción | Depende de | Archivos | Criterio de cierre |
|---|---|---|---|---|
| PM-24 | [ ] Recorrido principal en Catastro Pro: barra de pasos **Cargar → Validar → Corregir → Certificar → Exportar**, 8 criterios siempre visibles en verde/rojo; herramientas avanzadas agrupadas y con nombre | — | `index.html`, `js/app.js` | Prueba con una persona usuaria nueva: completa el recorrido sin ayuda |
| PM-25 | [ ] Portada por rol (Profesional, Municipio, Escribanía, Ciudadano); cada portal muestra solo su navegación; "Super Admin" fuera de los portales públicos | PM-01 | `index.html` o portada nueva, cabeceras de los 5 portales | Ningún portal público enlaza a `/admin` |
| PM-26 | [ ] Planes por perfil en lugar de los de clasificados: Free, Profesional, Estudio, Municipal, Notarial (+ pago por expediente validado); límites coherentes | Fase 0 (pagos) para cobrar | `js/plans.js` | `GET /api/plans` devuelve los planes nuevos; tests de límites actualizados |
| PM-27 | [ ] Una marca y cuatro nombres de portal; versiones internas solo en "Acerca de" | PM-01 | cabeceras y pies de los 5 portales | `grep` de "ENGINE v" sin resultados en la UI |
| PM-28 | [ ] Restaurar o reescribir la CLI de coordinación `.opencode/coordination/cli.mjs` (`route`, `check`, `lock`, `pass`, `fail`, `status`) que `AGENTS.md` exige y hoy falta | — | `.opencode/coordination/` | `node .opencode/coordination/cli.mjs status` funciona y lee `PLAN_MEJORA_PRODUCTO_BACKLOG.json` |
| PM-35 | [ ] Conector a las fuentes oficiales abiertas (las mismas que usa Structec, sin copiar sus archivos): WFS/WMS de `https://www.catastro.gov.py/geoserver/ows` — `snc:parcelas_activas` (con `ccatastral`, zona, mz, lote, finca, matrícula; EPSG:32721), `snc:ly_dpto`, `snc:ly_dist`, `snc:ly_urba` (ejido urbano), `snc:area_afectada` (seguridad fronteriza). Proxy en el servidor con caché en el R-Tree de `cacheDb.js`, paginación (`count`/`startIndex`), atribución de fuente y fecha | — | `server-api.js` (rutas nuevas, fuera de auth/pagos), `cacheDb.js`, `js/mapEngine.js` | Verificado 2026-10-27: GetFeature JSON responde (3.043 parcelas en un bbox de Piribebuy) y `cql_filter=objectid=…` devuelve la misma parcela que muestra Structec (campos idénticos; superficie 366,1 m² calculada vs 367 m² en Structec). `ccatastral` suele venir vacío: indexar también `clave_comparacion`, `finca` y `zona/mz/lote`. Cierre: capa "Parcelas oficiales" en el visor y búsqueda por `ccatastral` funcionando; respeta términos de uso del sitio |
| PM-36 | [ ] Mosaicos vectoriales PMTiles propios (técnica que usa Structec): generar `.pmtiles` por departamento desde el WFS oficial y `data/1.Paraguay` con `tippecanoe`/`ogr2ogr`; mapa base vectorial de Paraguay autoalojado (extracto Protomaps) para no depender de una clave de API; servir con lectura por rangos HTTP | PM-35 | `scripts/` (nuevo pipeline), `js/mapEngine.js` (`protomaps-leaflet` o MapLibre) | Un departamento completo navegable a zoom 15+ con fluidez; mismo archivo sirve en PC (disco local) y nube (almacenamiento de objetos) |
| PM-37 | [ ] Funcionar en PC y en la nube con la misma base de código: modo PC (Windows, `run.bat`, SQLite, PMTiles en disco, HTTPS local para GPS) y modo nube (contenedor Docker, PostgreSQL/PostGIS según M-7, PMTiles en almacenamiento de objetos, HTTPS); configuración por variables de entorno documentada | Fase 0 (para desplegar), PM-07, PM-36 | `Dockerfile` (nuevo), `docs/DEPLOY.md`, `docs/DEPLOY_WINDOWS.md` | `docker compose up` levanta la app con datos de prueba; la misma versión corre en la PC sin Docker |
| PM-38 | [ ] Búsqueda por dirección o lugar (Structec la tiene; el SNC solo busca por padrón/coordenadas): geocodificador abierto (Nominatim con su política de uso y atribución, o Photon autoalojado) en el portal ciudadano y en Catastro Pro | PM-04 | `js/app-ciudadano.js`, `js/coordLocator.js` | Buscar "Yegros, Piribebuy" centra el mapa en esa calle; respeta límite de 1 consulta/s |
| PM-39 | [ ] Base de cuentas catastrales con la liquidación del Impuesto Inmobiliario de la DNIT (API pública `GET https://www.dnit.gov.py/o/c/planillageograficas/?pageSize=600`, 270 planillas Excel urbana/rural por distrito, ejercicio 2026): `data/dnit_cuentas.sqlite` aparte de `snc.sqlite`, importación incremental (solo altas, modificaciones con historial campo a campo y bajas). Urbano por Cta. Cte. (`190001-01/00-000` = zona 19, mz 1, lote 1: se une con `zona/mz/lote` del WFS oficial y cubre el `ccatastral` vacío); rural por padrón. **No trae propietarios ni estado de pago** | — | `dnitCuentas.js`, `scripts/dnit-cuentas.mjs`, `tests/dnit-cuentas.test.mjs` | Cordillera importado; reimportar sin cambios no escribe nada; un cambio simulado aparece como 1 modificación con su historial |
| PM-29 | [ ] Build de producción: Tailwind compilado (sin `cdn.tailwindcss.com`), servir `dist/`; datos pesados de `data/1.Paraguay` (3,5 GB) fuera del repositorio | — | `vite.config.js`, `tailwind.config.js`, `index.html` | Consola sin el aviso de Tailwind; repositorio sin datos >100 MB |
| PM-30 | [ ] Accesibilidad: tema claro, etiquetas ≥12 px, contraste AA, nombre visible en íconos principales | PM-24 | `css/`, `index.html` | Revisión de contraste AA en los 5 portales |

---

## 3. Orden sugerido

| Semana | Carril A | Carril B | Carril D | Carril E | Carril C |
|---|---|---|---|---|---|
| 1–2 | PM-01, PM-02, PM-31 | PM-04, PM-05 | PM-17 | PM-28 | (esperar Fase 0) |
| 3–4 | PM-03 | PM-06, PM-07, PM-08 | PM-16, PM-21 | PM-24, PM-25 | PM-10, PM-11 si la Fase 0 cerró |
| 5–8 | — | PM-09, PM-34 | PM-18, PM-19, PM-20, PM-32, PM-33 | PM-26, PM-27, PM-29, PM-35 | PM-12, PM-13, PM-14, PM-15 |
| 9+ | — | — | PM-22, PM-23 | PM-30, PM-36, PM-37 | — |

---

## 4. Avance registrado

| Tarea | Estado | Hecho | Falta para cerrar |
|---|---|---|---|
| PM-04 | en curso (claude, 2026-10-27) | `js/ciudadanoMovil.js`, `css/ciudadano-movil.css`: cajón inferior, mapa a pantalla completa, `invalidateSize` en resize/orientación, cabecera sin desborde. Verificado a 390×844 (Chrome sin interfaz, CDP) | Captura a 412×915 y prueba en un celular real |
| PM-05 | en curso (claude, 2026-10-27) | Botón "Mi ubicación" con `watchPosition`, radio de precisión, WGS84 + UTM 21S, distrito/barrio y parcela oficial. `tests/ciudadano-movil.test.mjs` (5) | Prueba en un celular real con HTTPS (depende de PM-07) |
| PM-35 | en curso (claude, 2026-10-27) | `oficialCatastro.js` + rutas `GET /api/v3/oficial/{parcelas,parcela-en-punto,buscar,capa/:capa}`: pide en EPSG:32721 y reproyecta (el WFS redondea a 4 decimales si se pide 4326), lista cerrada de capas, CQL validado, caché en memoria 6 h, búsqueda por finca / clave compuesta / dpto-dist-zona-mz-lote / Cta. Cte. En el portal ciudadano: botón "Parcelas oficiales" (zoom 16+), parcela oficial en la ficha del GPS. `tests/catastro-oficial.test.mjs` (8) | Llevarlo a Catastro Pro (`index.html`); caché persistente en el R-Tree de `cacheDb.js` |
| PM-38 | en curso (claude, 2026-10-27) | `GET /api/v3/geocodificar` (Nominatim, 1 consulta/s con cola, caché 7 días, `GEOCODER_URL` para Photon propio, `NOMINATIM_CONTACTO` opcional) y buscador sobre el mapa del portal ciudadano | Llevarlo a Catastro Pro; definir `NOMINATIM_CONTACTO` en producción |
| PM-39 | en curso (claude, 2026-10-27) | `dnitCuentas.js` + `scripts/dnit-cuentas.mjs` + 8 pruebas. Piribebuy: 34.670 cuentas (11.987 urbanas, 22.683 rurales); reimportar sin cambios no toca nada; cambio simulado detectado como 1 modificación + 1 baja + 1 reactivación. **Cordillera completo importado (2026-10-27): 20 distritos, 42 planillas, 280.958 cuentas, 0 errores**. **Todo el Paraguay (2026-10-28): 514 planillas, 1.862.698 cuentas urbanas y 1.258.173 rurales; API `/api/v3/dnit/{cuenta,estado,resumen}` con detección de planillas nuevas; análisis territorial por distrito en `/analisis-territorial` (`scripts/analisis-territorial.mjs`)**. Notas de la fuente: la DNIT publicó la planilla rural de San Roque González de S.M. en ambas casillas (no hay urbana) y la urbana de Desmochados en ambas; el importador detecta el tipo por el contenido. Corregidos en el camino: lectura de decimales como texto y el detector CRS que tomaba `ZONA` catastral como zona UTM (doble reproyección: `js/crs.js`, `tests/crs-zona-catastral.test.mjs`) | Exponer consulta en la API y en el MCP de SNC; actualización programada (semanal); otros departamentos con `--departamento` |
| PM-11 | bloqueada | — | Fase 0 + A1-2 (esquema de `db.cjs` congelado) |
| PM-11 (nota) | — | La Cta. Cte. urbana de PM-39 permite identificar parcelas cuyo `ccatastral` viene vacío en el WFS (unir por dpto + distrito + zona + mz + lote) | — |

