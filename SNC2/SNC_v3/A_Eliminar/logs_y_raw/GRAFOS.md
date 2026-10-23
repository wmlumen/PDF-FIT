# Grafos de SNC_v3

SNC_v3 tiene DOS grafos complementarios para navegación y auditoría del codebase.

## 1. Grafo tree-sitter (graphify)

**Qué es:** AST del código. Funciones, clases, imports, calls entre símbolos.
**Archivo:** `graphify-out/graph.json` (696 nodos, 1322 edges, 48 comunidades)
**Actualización:** `graphify update .` (~2 min incremental, 0 tokens LLM)

```bash
# Ver reporte
cat graphify-out/GRAPH_REPORT.md

# Ver grafo interactivo
open graphify-out/graph.html

# Consultar (0 tokens, 100% local)
graphify query "how does authentication work?"
graphify path "AuthModule" "DatabasePool"
graphify explain "RateLimiter"
```

## 2. Grafo de dominio

**Qué es:** Entidades de negocio. Tablas, endpoints, páginas, roles, FKs.
**Archivo:** `graphify-out/grafo_dominio.json` (123 nodos, 759 aristas, **0 huérfanos**)
**Actualización:** Script propio (requiere rebuild manual tras cambios grandes)

### Nodos

| Tipo | Cantidad | Ejemplo |
|------|----------|---------|
| tabla | 9 | `users`, `projects`, `expedientes`, `plans` |
| endpoint | 55 | `GET /api/auth/me`, `POST /api/projects` |
| funcion | 49 | `runValidation()`, `handleGeoFile()` |
| pagina | 4 | `index`, `index-municipal`, `admin`, `login` |
| rol | 5 | `publico`, `topografo`, `municipal`, `admin`, `manager` |
| clase | 1 | `ValidadorMunicipal` |

### Aristas

| Tipo | Significado |
|------|-------------|
| `fk` | FK entre tablas |
| `usa` | Endpoint → tabla |
| `sirve_a` | Página → endpoint |
| `accede_a` | Rol → página |
| `misma_unidad` | Función → función (mismo archivo) |

### Consulta rápida (python)

```python
import json
g = json.load(open('graphify-out/grafo_dominio.json'))

# Todos los endpoints de admin
admin_eps = [n for n in g['nodos'] if n['tipo']=='endpoint' and '/admin/' in n['datos']['ruta']]

# Qué tablas usa un endpoint
ep = next(n for n in g['nodos'] if n['id']=='api:POST:/api/projects')
print(ep['datos']['tablas'])

# Qué página usa un endpoint
ep = next(n for n in g['nodos'] if n['id']=='api:GET:/api/auth/me')
print(ep['datos']['pagina'])  # → login
```

## Comunidades del grafo tree-sitter (etiquetadas)

| ID | Nombre | Cohesión |
|----|--------|----------|
| 0 | Mapa y Capas Leaflet | 0.08 |
| 1 | Configuración Catastral | 0.07 |
| 4 | Exportación y Certificados | 0.10 |
| 6 | Carga de Archivos Geo | 0.13 |
| 8 | Geoprocesamiento y Modales | 0.16 |
| 10 | Versionado y Municipal | 0.13 |
| 11 | DB y Autenticación | 0.10 |
| 13 | Admin y Pagos | 0.11 |
| 15 | Catastro Cache | 0.20 |
| 16 | Orquestador Multi-IA | 0.15 |
| 18 | Cogo y Coordenadas | 0.26 |
| 19 | Email y Notificaciones | 0.31 |
| 21 | Planes y Features | 0.26 |
| 23 | Pagos RedTicket | 0.27 |
| 28 | Firebase Auth | 0.60 |

## God Nodes (más conectados)

1. `showToast()` — 68 edges (puente entre 9 comunidades)
2. `compilerOptions` — 37 edges
3. `StateManager` — 25 edges
4. `runValidation()` — 19 edges
5. `logger` — 17 edges

## Estado

- [x] Grafo tree-sitter construido (696 nodos)
- [x] Grafo de dominio construido (123 nodos, 0 huérfanos)
- [x] Comunidades etiquetadas en español (28)
- [x] Grafo visual exportado (graph.html)
- [x] .graphifyignore configurado
- [ ] Extracción semántica del frontend (requiere API key LLM)
