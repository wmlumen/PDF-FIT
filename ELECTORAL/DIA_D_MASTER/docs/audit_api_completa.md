# DIA_D_MASTER — Auditoría Completa de APIs

**Proyecto:** `/mnt/c/Users/HP 250 G10/Documents/GITHUT/ELECTORAL/DIA_D_MASTER`  
**Fecha:** 2026-10-16  
**Método:** Análisis cruzado backend (app.py) ↔ frontend (static/*.html) + grafo de dominio

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Endpoints backend (GET/POST/DELETE) | 137 |
| Acciones backend (api_post/api_get) | 158 |
| Total superficie API | 295 |
| Páginas frontend | 28 |
| Acciones que frontend envía | 89 |
| Acciones coincidentes (front∩back) | 85 |
| ❌ Solo frontend (backend NO tiene) | 4 |
| ⚠️ Solo backend (frontend NO llama) | 73 |
| APIs faltantes propuestas | 30 |

---

## 1. BLOQUEANTES — ESTADO VERIFICADO 2026-10-16 (sesión de corrección)

> **Nota de corrección:** de los 3 bloqueantes originales, 1 era falso positivo y 2 se
> resolvieron. Además se detectó un bug crítico NUEVO (sección 1.4) que la auditoría
> original no había visto. Todo verificado contra el código real y con TestClient in-process.

### 1.1 `action=registrar` — ✅ NO ERA BUG (falso positivo)

**Páginas que lo envían:** No_voto.html, dirigente.html

El dispatcher `api_post` (app.py:2936) usa `action = normalizar_texto(data.get("action", "registrar"))`.
Cuando ninguna rama `if action == "..."` matchea, cae al **bloque Default** (app.py ~4702)
que registra voto/no_voto — exactamente lo que estas páginas quieren. El payload que envían
(`estado:'no_voto'` + cédula/mesa/orden) encaja perfecto. Verificado: `POST /api
{action:'registrar', estado:'no_voto', ...}` → `200 {'success': True, 'tipo': 'no_voto'}`.
**No requiere fix.**

### 1.2 `action=solicitar_recogida` — ✅ CORREGIDO

**Página que lo envía:** dirigente.html

dirigente.html envía `action:'solicitar_recogida'` al dispatcher POST /api. Sin rama
explícita caía al Default de voto/no_voto y creaba un **registro fantasma en `registros`**
sin crear la solicitud real. (El frontend tenía un fallback a la ruta REST, pero el primer
intento siempre ensuciaba `registros`.)

**Fix aplicado:** rama explícita `if action == "solicitar_recogida":` en `api_post` que
replica la lógica de la ruta dedicada `POST /api/solicitar_recogida` (upsert sobre
`solicitudes_recogida` por votante con estado pendiente/autorizado). Verificado:
`200 {'success': True, 'accion': 'solicitado', 'id': N}`.

### 1.3 conductor.html usa `.length` — ✅ NO ERA BUG (falso positivo)

El `data.length` de `conductor.html:581` es el resultado de la API de **Nominatim**
(un array JSON de geocodificación), NO la respuesta de `/api/conductor/lista`. Es correcto.
Además, `conductor.html` **no llama** a `/api/conductor/lista`; los consumidores reales
(`transporte.html:141`, `dirigente.html:894`) ya usan `.conductores`. **No requiere fix.**

### 1.4 🔴 NUEVO CRÍTICO: candidato.html enviaba 3 acciones inexistentes al dispatcher

**Página:** `static/candidato.html`

Enviaba por el dispatcher (`apiPost`) las acciones `encuesta_responder`,
`simpatia_registrar` y `notificar_simpatizantes`, que **NO existen** como rama en `api_post`
ni como action. Caían al Default → intentaban registrar un voto/no_voto con datos
incompletos (cédula = respuesta de encuesta, etc.) → corrupción silenciosa.

Las rutas REST dedicadas correctas ya existían: `POST /api/candidato/encuesta/responder`,
`POST /api/candidato/simpatia/registrar`, `POST /api/candidato/notificar`.

**Fix aplicado:** las 3 llamadas ahora usan el helper `restPost(...)` apuntando a las rutas
REST dedicadas. Verificado: las 3 devuelven `200 {'success': True, ...}`.


---

## 2. ACCIONES MUERTAS (backend tiene, frontend NO llama) — 73

### 2.1 Crear/Registrar (12)
```
crear_candidato, crear_cargo_electivo, crear_chapa, crear_cliente,
crear_dirigente, crear_eleccion, crear_lista_electoral, crear_lista_partido,
crear_transporte, crear_pc, crear_paquete, crear_partido
```

### 2.2 Actualizar (5)
```
actualizar_candidato, cambiar_contrasena, editar_lista_partido,
editar_paquete, editar_partido
```

### 2.3 Eliminar (8)
```
eliminar_candidato_completo, eliminar_candidato_lista, eliminar_dirigente_grupo,
eliminar_lista_partido, eliminar_pc, eliminar_transporte,
quitar_dirigente, quitar_paquete_cliente
```

### 2.4 Listar/Ver (5)
```
agregar_candidato_lista, listas_electorales, mis_pcs,
reordenar_candidatos_lista, validar_lista_candidatos
```

### 2.5 Asignar/Gestionar (9)
```
aprobar_pendiente_qr, asignar_candidato_cliente, asignar_dirigente_cliente,
asignar_votante, autorizar_solicitud, vincular_concejal_pc,
vincular_dirigente_elector, vincular_intendente_concejal, vincular_pc_dirigente
```

### 2.6 Buscar/Verificar (2)
```
buscar_dirigente, certificar_dato
```

### 2.7 Otros (32)
```
activar_eleccion, agregar_candidatura, asignacion_dirigentes, candidaturas,
circunscripciones_api, clientes, certificar_dato, chapas, ...
```

**Recomendación:** Estas acciones representan funcionalidad CRUD completa que ninguna página consume. O bien:
- (a) Son funcionalidad futura planificada (mantener)
- (b) Se implementaron para una versión anterior del frontend que ya no existe (evaluar eliminación)
- (c) Faltan páginas que las consuman (crear páginas)

---

## 3. CRUD FALTANTE PRIORIZADO

### 3.1 Tablas SIN GET listar ni POST crear (crítico)

| Tabla | Dominio | Estado |
|-------|---------|--------|
| `elecciones` | Candidatos y Elecciones | ❌ Sin GET, sin POST |
| `transportes` | Transporte y Logística | ❌ Sin GET, sin POST |
| `ubicaciones_gps` | Transporte y Logística | ❌ Sin GET, sin POST |
| `veedores_mesa` | Veeduría | ❌ Sin GET, sin POST |
| `no_voto` | Votación y Padrón | ❌ Sin GET, sin POST |
| `grupo_dirigentes` | CRM y Dirigentes | ❌ Sin GET, sin POST |
| `asignacion_dirigentes` | CRM y Dirigentes | ❌ Sin GET, sin POST |
| `cargos_electivos` | Candidatos y Elecciones | ❌ Sin GET, sin POST |
| `listas_partido` | Candidatos y Elecciones | ❌ Sin GET, sin POST |
| `gastos_transporte` | Transporte y Logística | ❌ Sin GET, sin POST |
| `certificaciones` | Certificación | ❌ Sin GET, sin POST |
| `registro_participacion` | Certificación | ❌ Sin POST |

### 3.2 Tablas CON GET y POST pero sin DELETE

| Tabla | Dominio |
|-------|---------|
| `candidatos` | Candidatos y Elecciones |
| `clientes` | CRM y Dirigentes |
| `partidos` | Candidatos y Elecciones |
| `usuarios` | Usuarios y Seguridad |
| `departamentos` | Estructura Política |
| `distritos` | Estructura Política |

---

## 4. APIs FALTANTE PROPUESTAS (30)

### Candidatos y Elecciones (7)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/candidatos/{id}/eliminar` | Eliminar candidato completo |
| POST | `/api/cargos_electivos/crear` | Crear cargo electivo |
| GET | `/api/cargos_electivos` | Listar cargos electivos |
| POST | `/api/elecciones/crear` | Crear elección |
| GET | `/api/elecciones` | Listar elecciones |
| POST | `/api/listas_partido/crear` | Crear lista de partido |
| GET | `/api/listas_partido/{partido_id}` | Listar listas de un partido |

### Transporte y Logística (6)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/transportes/crear` | Crear transporte |
| GET | `/api/transportes` | Listar transportes |
| POST | `/api/transportes/{id}/eliminar` | Eliminar transporte |
| POST | `/api/ubicaciones_gps/registrar` | Registrar ubicación GPS |
| GET | `/api/gastos_transporte` | Listar gastos de transporte |
| POST | `/api/gastos_transporte/crear` | Crear gasto de transporte |

### CRM y Dirigentes (4)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/clientes/{id}/eliminar` | Eliminar cliente |
| POST | `/api/grupo_dirigentes/crear` | Crear grupo de dirigentes |
| GET | `/api/grupo_dirigentes/{cliente_id}` | Listar grupos de cliente |
| POST | `/api/asignacion_dirigentes/crear` | Asignar dirigente a grupo |

### Veeduría (4)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/veedores_mesa/crear` | Crear veedor de mesa |
| GET | `/api/veedores_mesa` | Listar veedores de mesa |
| POST | `/api/veedores_mesa/{id}/eliminar` | Eliminar veedor |
| GET | `/api/veedor_mesa_estado` | Listar estado de veedores |

### Votación y Padrón (3)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/no_voto/registrar` | Registrar no-voto |
| GET | `/api/no_voto` | Listar no-votos |
| POST | `/api/no_voto/{id}/eliminar` | Eliminar no-voto |

### Certificación (3)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/certificaciones/emitir` | Emitir certificación |
| GET | `/api/certificaciones/{cedula}` | Consultar certificación |
| POST | `/api/registro_participacion/registrar` | Registrar participación |

### Estructura Política (3)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/partidos_eleccion/{eleccion_id}` | Listar partidos en elección |
| POST | `/api/partidos_config_organizacion/crear` | Crear config de organización |
| GET | `/api/estructura_politica/{partido_id}` | Ver estructura del partido |

---

## 5. CAMPOS DE RESPUESTA

**24 de 24 páginas** usan campos correctos del backend.

(La observación original sobre `conductor.html` usando `data.length` era un falso positivo:
ese `data.length` es el resultado de Nominatim, no de `/api/conductor/lista`.)

---

## 6. PLAN DE ACCIÓN SUGERIDO

### Fase 1 — Bloqueadores (impacto inmediato, 3 fixes)
1. ~~conductor.html: `.length` → `.conductores.length`~~ → **falso positivo, no era bug**
2. ~~`action=registrar`: verificar si el default implícito ya lo maneja~~ → **ya lo maneja el bloque Default, no era bug**
3. ~~`action=solicitar_recogida`: decidir entre arreglar frontend o agregar action en backend~~ → **CORREGIDO: rama explícita agregada en api_post**
4. 🔴 **NUEVO (corregido):** candidato.html enviaba 3 acciones inexistentes al dispatcher
   (`encuesta_responder`, `simpatia_registrar`, `notificar_simpatizantes`) → apuntadas a sus
   rutas REST dedicadas.

### Fase 2 — APIs CRUD faltante (7 tablas sin GET/POST)
Priorizar por dominio activo:
1. `elecciones` (GET + POST) — core del sistema
2. `transportes` (GET + POST) — sección activa
3. `no_voto` (GET + POST) — página No_voto.html activa
4. `veedores_mesa` (GET + POST) — página veedores.html activa
5. `cargos_electivos` (GET + POST) — necesario para candidatos
6. `listas_partido` (GET + POST) — necesario para dhondt
7. `ubicaciones_gps` (GET + POST) — mapa en vivo

### Fase 3 — APIs de eliminación (6 tablas)
`DELETE` o `POST /api/{tabla}/{id}/eliminar` para: candidatos, clientes, partidos, usuarios, departamentos, distritos

### Fase 4 — Evaluar 73 acciones muertas
- Documentar cuáles son funcionalidad futura
- Considerar eliminar las que correspondan a features descartadas
- Priorizar conectar las que completan flujos existentes (crear, editar, eliminar)

---

## 7. COMANDOS DE VERIFICACIÓN

```bash
# Import check
python3 -c "import app"

# py_compile
python3 -m py_compile app.py

# Rutas del backend
grep -nE '@app\.(get|post|put|delete)' app.py | wc -l
# → 137

# Acciones del backend
grep -oE 'action\s*==\s*"[^"]+"' app.py | sort -u | wc -l
# → 158

# Páginas frontend
ls static/*.html | wc -l
# → 28

# Auditoría cruzada
python3 -c "
import re, os
app = open('app.py').read()
static_dir = 'static'
back = set(re.findall(r'action\s*==\s*\"([^\"]+)\"', app))
front = set()
for f in os.listdir(static_dir):
    if f.endswith('.html'):
        html = open(os.path.join(static_dir,f), encoding='utf-8', errors='ignore').read()
        for m in re.finditer(r'action\s*[:=]\s*[\"\\']?([^\"\\'&\s,}]+)', html):
            front.add(m.group(1))
        for m in re.finditer(r'[?&]action=([^\"&\\'`]+)', html):
            front.add(m.group(1))
print(f'Front: {len(front)}, Back: {len(back)}, Match: {len(front&back)}')
print(f'Faltan en back: {sorted(front-back)}')
print(f'Muertas en back: {len(back-front)}')
"
```

---

## 8. NOTAS

- El grafo de dominio (`graphify-out/grafo_dominio.json`) ya incluye las 158 acciones como endpoints con sus dominios y funciones asociadas.
- El grafo de dominio tiene 464 nodos y 789 aristas, 100% conectado.
- Las 73 acciones muertas NO son un error: son funcionalidad CRUD que existe en el backend esperando ser consumida por páginas futuras o que fueron parte de features descartadas.
- El proyecto usa un patrón híbrido: rutas REST dedicadas (137) + dispatcher por action (158). Esto es intencional, no una inconsistencia.
