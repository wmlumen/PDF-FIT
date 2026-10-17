# GRAPH_PROTOCOL.md — Protocolo Multi-IA "Grafo Primero"

> **Para:** OpenCode, Gemini, Claude, Antigravity, Cursor, Copilot, etc.
> **Proyecto:** DIA_D_MASTER — Sistema Electoral Unificado
> **Última actualización:** 2026-10-16

---

## El problema

Cuando varias IAs trabajan en el mismo proyecto, cada una genera documentos que otra vuelve a leer,
pero ya están resueltos. Esto desperdicia tokens, tiempo y genera inconsistencias.

## La solución

El grafo de conocimiento (`graphify-out/`) es la **capa de memoria compartida** entre todas las IAs.
Ninguna IA lee código sin pasar por el grafo primero.

---

## Flujo obligatorio (5 pasos)

### 1. ANTES de tocar código o leer archivos

```bash
graphify query "<tema>"           # BFS subgraph — ubica nodos relevantes
graphify path "<A>" "<B>"         # shortest path — relaciones entre conceptos
graphify explain "<concepto>"     # detalle de un nodo + conexiones
```

- Leer `graphify-out/GRAPH_REPORT.md` solo si query/path/explain no alcanzan.
- NUNCA leer archivos enteros sin ubicar la línea exacta primero.

### 2. NUNCA leer archivos enteros sin ubicar la línea exacta primero

- `app.py` ~9800 líneas, `database.py` ~2900 líneas, `static/App.html` 3.7 MB.
- Usar el grafo o `Grep` acotado para encontrar la función/línea.
- Leer solo ese rango con `offset`/`limit`.

### 3. DESPUÉS de modificar código

```bash
graphify update .                 # incremental, 0 tokens, ~30s
```

- Si se agregó un endpoint/tabla/página nuevo, actualizar `graphify-out/grafo_dominio.json` también.
- Si se modificó `AGENTS.md`, correr `graphify update .` también.

### 4. PENDIENTES y documentación

- Los pendientes viven en `AGENTS.md`, en la sección del módulo correspondiente.
- Formato fijo: `🔴/🟡/🟢 **archivo: función/endpoint** — qué falta`
- Un pendiente resuelto se borra, no se tachar.
- Nunca crear documentos sueltos que dupliquen lo que el grafo ya sabe.

### 5. DOCUMENTOS de especificación (ROADMAP, PLANES, etc.)

- Se actualizan cuando cambia el código, no antes.
- Si una IA genera un documento que otra ya resolvió, se borra el duplicado.
- El grafo es la fuente de verdad; los documentos son vistas derivadas.

---

## Verificación de cumplimiento

| Acción | ¿Cumple el protocolo? |
|--------|----------------------|
| Leer `app.py` sin correr `graphify query` primero | ❌ Violación |
| Generar un documento que duplica información del grafo | ❌ Violación |
| No correr `graphify update .` después de modificar código | ❌ Violación |
| Correr `graphify query` antes de leer archivos | ✅ Correcto |
| Actualizar `grafo_dominio.json` al agregar endpoints | ✅ Correcto |
| Borrar un pendiente resuelto de `AGENTS.md` | ✅ Correcto |

---

## Estructura del grafo

```
graphify-out/
├── graph.json              # Grafo principal (nodos, aristas, comunidades)
├── GRAPH_REPORT.md         # Resumen: god nodes, comunidades, conexiones clave
├── graph.html              # Visualización interactiva
├── grafo_dominio.json      # Grafo de dominio (tablas, endpoints, páginas, roles, FKs)
├── .graphify_labels.json   # Labels curados de comunidades
└── cache/                  # Cache SHA256 para actualizaciones incrementales
```

---

## Comandos útiles

```bash
# Actualizar el grafo (incremental, 0 tokens)
graphify update .

# Consultar el grafo
graphify query "cómo funciona la autenticación?"
graphify path "AuthModule" "DatabasePool"
graphify explain "RateLimiter"

# Regenerar visualización
graphify export html

# Reclusterizar (conserva labels curados)
graphify cluster-only . --no-label
```

---

## Reglas adicionales

1. **El grafo es la fuente de verdad.** Si el grafo dice que una función existe, existe.
2. **Los documentos son vistas derivadas.** Si un documento contradice al grafo, el documento está desactualizado.
3. **El grafo se actualiza automáticamente** cada 2h vía cron (0 tokens, solo AST).
4. **El grafo de dominio** (`grafo_dominio.json`) se actualiza manualmente cuando se agregan tablas/endpoints nuevos.
5. **Los labels de comunidades** se conservan entre actualizaciones (mapeo por solapamiento de nodos).

---

## Resumen

| Antes | Ahora |
|-------|-------|
| Cada IA lee archivos enteros | Cada IA consulta el grafo primero |
| Cada IA genera documentos redundantes | El grafo es la memoria compartida |
| Los pendientes se acumulan | Los pendientes se borran al resolverse |
| Las IAs trabajan en silos | Las IAs trabajan sobre el mismo grafo |

**El grafo es el camino más eficaz para todas las IAs. Seguirlo.**
