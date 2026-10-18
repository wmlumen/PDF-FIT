#!/usr/bin/env python3
"""Indexa documentos y código en el grafo de graphify sin usar LLM.

El extractor de Markdown convierte títulos y enlaces en nodos/aristas EXTRACTED, y el
extractor AST hace lo propio con el código. Los formatos sin extractor (HTML, JSON de
configuración) se representan con un nodo de archivo, para que el grafo cubra todo el
corpus sin dejar archivos afuera.

Uso:
    # Indexación completa del repositorio (recomendada)
    python scripts/graphify_index_docs.py --all

    # Solo documentos concretos
    python scripts/graphify_index_docs.py docs/AUDITORIA_SNC_v3_2026-10-18.md docs/PLAN_REMEDIACION_AUDITORIA.md

    python scripts/graphify_index_docs.py --all --dry-run
    python scripts/graphify_index_docs.py --all --commit <sha>

Qué hace:
  1. Respalda graph.json, GRAPH_REPORT.md, .graphify_analysis.json, .graphify_labels.json y graph.html.
  2. Toma el grafo actual como base y agrega nodos/aristas de los archivos indicados.
  3. Reconstruye, re-clusteriza y reutiliza las etiquetas de comunidad por solapamiento.
  4. Regenera graph.json, GRAPH_REPORT.md y .graphify_analysis.json.

Después conviene ejecutar `graphify export html` para refrescar el visor.
Requiere el paquete Python `graphify` (el mismo que provee la CLI).
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

try:
    from graphify.analyze import god_nodes, suggest_questions, surprising_connections
    from graphify.build import build_from_json
    from graphify.cluster import cluster, score_all
    from graphify.export import to_json
    from graphify.extract import extract
    from graphify.report import generate
except ImportError as exc:  # pragma: no cover
    sys.exit(f"No se pudo importar graphify ({exc}). Instalá el paquete que provee la CLI `graphify`.")

ROOT = Path(__file__).resolve().parent.parent

# La consola de Windows (cp1252) no puede imprimir emojis de los títulos: no abortar por eso.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(errors="replace")
    except (AttributeError, ValueError):
        pass
OUT = ROOT / "graphify-out"
GRAPH_JSON = OUT / "graph.json"
LABELS_JSON = OUT / ".graphify_labels.json"
ANALYSIS_JSON = OUT / ".graphify_analysis.json"
REPORT_MD = OUT / "GRAPH_REPORT.md"
BACKUP_FILES = [GRAPH_JSON, LABELS_JSON, ANALYSIS_JSON, REPORT_MD, OUT / "graph.html"]

# Corpus completo: se excluyen binarios, datos, artefactos y archivos con credenciales.
SCAN_EXCLUDE_DIRS = {
    "node_modules", ".git", ".firebase", "dist", "graphify-out", "data", "backup",
    "ejercicio", "__pycache__", ".vscode", ".idea", ".pytest_cache",
}
SCAN_EXCLUDE_FILES = {
    "serviceAccountKey.json",   # clave privada de Firebase Admin
    "package-lock.json",        # 380 KB de ruido sin valor de grafo
    "_update_user.cjs",         # contraseña de admin en claro
    "probar_members.cjs",       # credenciales de prueba en claro
    ".env",
    ".env.local",
    ".opencode/coordination/skills.json",
    ".opencode/coordination/tasks.jsonl",
}
SCAN_EXCLUDE_SUFFIXES = {".jsonl", ".log", ".dpapi", ".sqlite", ".db", ".map", ".min.js", ".min.css", ".bak"}
SCAN_EXTS = {".md", ".html", ".mjs", ".js", ".cjs", ".ps1", ".sh", ".sql", ".json", ".txt"}
DOC_EXTS = {".md", ".html", ".json", ".txt"}
BINARY_MARKERS = (b"\x00",)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def backup() -> Path:
    # Dentro del workspace: el sandbox no permite escribir en %TEMP%.
    target = OUT / f".graphify_backup_{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    target.mkdir(parents=True, exist_ok=True)
    for item in BACKUP_FILES:
        if item.exists():
            shutil.copy2(item, target / item.name)
    return target


def base_extraction(graph: dict) -> dict:
    """Convierte graph.json de vuelta al formato de extracción que espera build_from_json."""
    nodes = [
        {k: v for k, v in node.items() if k not in ("community", "community_name")}
        for node in graph.get("nodes", [])
    ]
    return {"nodes": nodes, "edges": graph.get("links", []), "hyperedges": graph.get("hyperedges", [])}


def merge(base: dict, extra_nodes: list[dict], extra_edges: list[dict]) -> tuple[list[dict], list[dict]]:
    seen = {node["id"] for node in base["nodes"]}
    nodes = list(base["nodes"])
    for node in extra_nodes:
        if node["id"] not in seen:
            seen.add(node["id"])
            nodes.append(node)

    edges = list(base["edges"])
    edge_keys = {(edge.get("source"), edge.get("target"), edge.get("relation")) for edge in edges}
    for edge in extra_edges:
        key = (edge.get("source"), edge.get("target"), edge.get("relation"))
        if key in edge_keys:
            continue  # idempotente: reindexar no duplica aristas
        edge_keys.add(key)
        edges.append(edge)
    return nodes, edges


def is_excluded_rel(rel: str) -> bool:
    """True si el archivo no debe formar parte del grafo (secretos, binarios, artefactos)."""
    rel = rel.replace("\\", "/")
    parts = rel.split("/")
    if any(part in SCAN_EXCLUDE_DIRS for part in parts[:-1]):
        return True
    if rel in SCAN_EXCLUDE_FILES:
        return True
    name = parts[-1]
    if name in {".env", ".env.local"} or name.startswith("tmp_"):
        return True
    suffix = Path(rel).suffix.lower()
    if suffix in SCAN_EXCLUDE_SUFFIXES or suffix not in SCAN_EXTS:
        return True
    return False


def sanitize_base(base: dict) -> tuple[dict, int]:
    """Quita del grafo base nodos de archivos excluidos (credenciales) o que ya no existen."""
    def keep(node: dict) -> bool:
        rel = str(node.get("source_file") or "").replace("\\", "/")
        if is_excluded_rel(rel):
            return False
        # Archivo borrado del repo: el nodo quedaría obsoleto (los módulos sin ruta se conservan).
        if rel and Path(rel).suffix and not (ROOT / rel).exists():
            return False
        return True

    kept = [node for node in base["nodes"] if keep(node)]
    removed = len(base["nodes"]) - len(kept)
    if removed == 0:
        return base, 0
    kept_ids = {node["id"] for node in kept}
    edges = [
        edge for edge in base["edges"]
        if edge.get("source") in kept_ids and edge.get("target") in kept_ids
    ]
    return {"nodes": kept, "edges": edges, "hyperedges": base.get("hyperedges", [])}, removed


def scan_corpus() -> list[Path]:
    """Recorre el repositorio y devuelve los archivos indexables (sin secretos ni binarios)."""
    found: list[Path] = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(ROOT).as_posix()
        parts = rel.split("/")
        if any(part in SCAN_EXCLUDE_DIRS for part in parts[:-1]):
            continue
        if rel in SCAN_EXCLUDE_FILES or path.name in {".env", ".env.local"}:
            continue
        if path.suffix.lower() not in SCAN_EXTS:
            continue
        if path.name.startswith("tmp_") or path.suffix.lower() in SCAN_EXCLUDE_SUFFIXES:
            continue
        try:
            with path.open("rb") as handle:
                head = handle.read(4096)
            if any(marker in head for marker in BINARY_MARKERS):
                continue
        except OSError:
            continue
        found.append(path)
    return found


def synthetic_node(rel: str) -> dict:
    """Nodo de archivo para formatos sin extractor (HTML, JSON), para que no queden afuera."""
    node_id = re.sub(r"[^a-z0-9]+", "_", rel.lower()).strip("_")
    return {
        "id": node_id,
        "label": Path(rel).name,
        "file_type": "document" if Path(rel).suffix.lower() in DOC_EXTS else "code",
        "source_file": rel,
        "source_location": "L1",
        "node_kind": "file",
        "_origin": "semantic",
    }


def reuse_labels(graph: dict, communities: dict[int, list[str]], G) -> dict[int, str]:
    """Reutiliza las etiquetas curadas por solapamiento de miembros; nombra los docs nuevos."""
    old_community = {
        node["id"]: node.get("community")
        for node in graph.get("nodes", [])
        if node.get("id") and node.get("community") is not None
    }
    old_labels: dict[int, str] = {}
    if LABELS_JSON.exists():
        old_labels = {int(key): value for key, value in load_json(LABELS_JSON).items()}

    old_members: dict[int, set[str]] = defaultdict(set)
    for node_id, community_id in old_community.items():
        old_members[int(community_id)].add(node_id)

    def doc_kind(members: set[str]) -> str | None:
        audit = plan = 0
        for node_id in members:
            source = str(G.nodes[node_id].get("source_file") or "").replace("\\", "/")
            if "AUDITORIA_SNC" in source:
                audit += 1
            elif "PLAN_REMEDIACION" in source:
                plan += 1
        total = audit + plan
        if total == 0:
            return None
        if audit >= plan * 3:
            return "Auditoría 2026-10-18"
        if plan >= audit * 3:
            return "Plan de remediación"
        return "Auditoría y plan de remediación"

    labels: dict[int, str] = {}
    for community_id, members in communities.items():
        members_set = set(members)
        best, overlap = None, 0
        for old_id, old_set in old_members.items():
            shared = len(members_set & old_set)
            if shared > overlap:
                best, overlap = old_id, shared
        if best is not None and overlap >= max(3, int(len(members_set) * 0.5)):
            labels[community_id] = old_labels.get(best) or f"Community {community_id}"
        else:
            labels[community_id] = doc_kind(members_set) or _hub_label(G, members_set, community_id)
    return labels


def _hub_label(G, members: set[str], community_id: int) -> str:
    if not members:
        return f"Community {community_id}"
    hub = max(members, key=lambda node_id: G.degree(node_id))
    return str(G.nodes[hub].get("label") or f"Community {community_id}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Indexa documentos y código en graphify-out/graph.json")
    parser.add_argument("docs", nargs="*", help="Rutas a indexar (si se omite, usar --all)")
    parser.add_argument("--all", action="store_true", help="Indexar todo el corpus indexable del repo")
    parser.add_argument("--commit", default=None, help="Commit con el que se marca el grafo (built_at_commit)")
    parser.add_argument("--dry-run", action="store_true", help="Solo calcula y muestra el resultado")
    args = parser.parse_args()

    if not GRAPH_JSON.exists():
        return _fail(f"No existe {GRAPH_JSON}. Construí el grafo primero con `graphify .`.")

    if args.all and args.docs:
        return _fail("Usá `--all` o una lista de rutas, no ambos.")
    if not args.all and not args.docs:
        return _fail("Indicá archivos a indexar o usá --all.")

    graph = load_json(GRAPH_JSON)
    if args.all:
        paths = scan_corpus()
    else:
        paths = []
        for raw in args.docs:
            path = Path(raw)
            path = path if path.is_absolute() else (ROOT / path)
            if not path.exists():
                return _fail(f"No existe el documento: {path}")
            paths.append(path)

    base = base_extraction(graph)
    base, removed_sensitive = sanitize_base(base)
    if removed_sensitive:
        print(f"[graph:index] nodos excluidos del grafo base (credenciales/artefactos): {removed_sensitive}")
    try:
        extra = extract(paths, cache_root=ROOT, root=ROOT, parallel=True)
    except Exception as exc:  # noqa: BLE001 - un archivo inválido no debe abortar todo
        print(f"[graph:index] extracción en paralelo falló ({exc}); reintentando secuencial", file=sys.stderr)
        extra = {"nodes": [], "edges": []}
        for path in paths:
            try:
                part = extract([path], cache_root=ROOT, root=ROOT, parallel=False)
            except Exception as part_exc:  # noqa: BLE001
                print(f"[graph:index] omitido {path}: {part_exc}", file=sys.stderr)
                continue
            extra["nodes"].extend(part.get("nodes", []))
            extra["edges"].extend(part.get("edges", []))

    extra_nodes = list(extra.get("nodes", []))
    extra_edges = list(extra.get("edges", []))

    # Archivos que ningún extractor cubrió (HTML, JSON de config): nodo de archivo.
    covered = {(str(node.get("source_file") or "")).replace("\\", "/") for node in extra_nodes}
    existing_ids = {node["id"] for node in base["nodes"]}
    synthetic = []
    for path in paths:
        rel = path.relative_to(ROOT).as_posix()
        if rel in covered:
            continue
        node = synthetic_node(rel)
        if node["id"] in existing_ids or any(item["id"] == node["id"] for item in synthetic):
            continue
        synthetic.append(node)
    extra_nodes.extend(synthetic)

    nodes, edges = merge(base, extra_nodes, extra_edges)
    G = build_from_json({"nodes": nodes, "edges": edges, "hyperedges": []}, root=ROOT, directed=False)
    if G.number_of_nodes() == 0:
        return _fail("El grafo resultante está vacío; no se escribe nada.")

    current = graph.get("nodes", [])
    floor = len(current) - removed_sensitive
    if len(current) and G.number_of_nodes() < floor:
        return _fail(
            f"El rebuild produciría menos nodos que el grafo actual ({G.number_of_nodes()} < {floor}). "
            "Se aborta para no perder información (to_json también lo rechazaría)."
        )

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    labels = reuse_labels(graph, communities, G)
    questions = suggest_questions(G, communities, labels)

    added = G.number_of_nodes() - len(current)
    print(
        f"[graph:index] archivos={len(paths)} nodos_extra={len(extra_nodes)} "
        f"(sintéticos={len(synthetic)}) nodos_nuevos={added} total={G.number_of_nodes()} "
        f"aristas={G.number_of_edges()} comunidades={len(communities)}"
    )

    if args.dry_run:
        print("[graph:index] dry-run: no se escribió nada.")
        for community_id, members in sorted(communities.items()):
            doc_nodes = [n for n in members if str(G.nodes[n].get("source_file") or "").lower().endswith((".md", ".html"))]
            if doc_nodes:
                print(f"  comunidad {community_id}: {labels[community_id]} ({len(doc_nodes)} nodos de documentos)")
        return 0

    backup_dir = backup()
    print(f"[graph:index] respaldo en {backup_dir}")

    detection = {
        "warning": "modo incremental — el corpus no se re-escaneó; se parte del grafo existente y se agregan archivos",
    }
    report = generate(
        G,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        {"input": 0, "output": 0},
        str(ROOT),
        suggested_questions=questions,
        built_at_commit=args.commit,
    )
    REPORT_MD.write_text(report, encoding="utf-8")

    analysis = {
        "communities": {str(key): value for key, value in communities.items()},
        "cohesion": {str(key): value for key, value in cohesion.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
    }
    ANALYSIS_JSON.write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")

    wrote = to_json(
        G,
        communities,
        str(GRAPH_JSON),
        built_at_commit=args.commit,
        community_labels=labels,
        force=G.number_of_nodes() < len(current),
    )
    if not wrote:
        return _fail("to_json rechazó escribir graph.json (guarda de reducción). Restaurá el respaldo si hace falta.")

    LABELS_JSON.write_text(
        json.dumps({str(key): value for key, value in labels.items()}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    shutil.rmtree(backup_dir, ignore_errors=True)
    print(f"[graph:index] graph.json actualizado ({datetime.now(timezone.utc).isoformat()})")
    print("[graph:index] siguiente paso: graphify export html")
    return 0


def _fail(message: str) -> int:
    print(f"[graph:index] ERROR: {message}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
