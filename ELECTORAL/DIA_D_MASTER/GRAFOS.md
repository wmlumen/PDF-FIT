# DIA_D_MASTER — grafo de conocimiento (graphify)

El proyecto tiene un grafo de su código en `graphify-out/` (graphify, tree-sitter
local, 0 tokens). Es EXCLUSIVO de este proyecto — no hay grafo global de GITHUT.

## Consultar (en vez de grep/read masivos)

```bash
export PATH="$HOME/.venvs/graphify/bin:$PATH"
cd "/mnt/c/Users/HP 250 G10/Documents/GITHUT/ELECTORAL/DIA_D_MASTER"

graphify query "login conductor transporte"   # subgrafo acotado (BFS)
graphify path "app.py" "database"             # cómo conectan dos conceptos
graphify explain "normalizar_cedula"          # qué es un nodo y con qué enlaza
graphify god-nodes --top 10                   # hubs arquitectónicos
graphify affected "hash_password"             # qué se impacta si cambio X
```

## Actualización automática

Cron `graphify-update-DIA_D_MASTER` (job d917d62c0058, cada 2h, script-only, 0 tokens):
`~/.hermes/scripts/graphify_cascade.sh` corre `graphify update .` (incremental, cache
SHA256, solo archivos cambiados). Forzar a mano: `bash ~/.hermes/scripts/graphify_cascade.sh`.

## Exclusiones (`.graphifyignore`)

Excluye `database/` (1.4G con PII), `__pycache__`, backups, `static/vendor/`, DBs, DBF,
zips, PDFs y binarios. Así el walk sobre drvfs (9p) no se cuelga.

Detalles de instalación y uso: skill Hermes `graphify-knowledge-graphs`.
Nota: graph.json usa la clave `links` (no `edges`) para las conexiones.
