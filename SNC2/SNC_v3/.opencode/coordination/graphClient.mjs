/**
 * Graph Client - Interfaz para consultar el grafo de conocimiento graphify
 * Carga el grafo estático de código (graphify-out/graph.json) y provee consultas
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GRAPH_PATH = join(__dirname, '..', 'graphify-out', 'graph.json');

export class GraphClient {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.nodeIndex = new Map(); // label -> node
    this.fileIndex = new Map(); // source_file -> nodes[]
    this.communityIndex = new Map(); // community -> nodes[]
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    
    const raw = readFileSync(GRAPH_PATH, 'utf8');
    const graph = JSON.parse(raw);
    
    this.nodes = new Map(graph.nodes.map(n => [n.id, n]));
    
    // Build indices
    for (const node of graph.nodes) {
      // By label (normalized)
      this.nodeIndex.set(node.norm_label || node.label.toLowerCase(), node);
      
      // By source file
      if (node.source_file) {
        const fileNodes = this.fileIndex.get(node.source_file) || [];
        fileNodes.push(node);
        this.fileIndex.set(node.source_file, fileNodes);
      }
      
      // By community
      const commNodes = this.communityIndex.get(node.community) || [];
      commNodes.push(node);
      this.communityIndex.set(node.community, commNodes);
    }
    
    this.edges = graph.links;
    this.loaded = true;
    
    console.log(`[GraphClient] Loaded ${this.nodes.size} nodes, ${this.edges.length} edges`);
  }

  // ===== NODE QUERIES =====
  
  getNode(id) {
    return this.nodes.get(id);
  }
  
  getNodeByLabel(label) {
    return this.nodeIndex.get(label.toLowerCase());
  }
  
  findNodesByLabel(pattern) {
    const regex = new RegExp(pattern, 'i');
    const results = [];
    for (const [id, node] of this.nodes) {
      if (regex.test(node.label) || regex.test(node.norm_label || '')) {
        results.push(node);
      }
    }
    return results;
  }

  // ===== FILE QUERIES =====
  
  getNodesByFile(sourceFile) {
    return this.fileIndex.get(sourceFile) || [];
  }
  
  getFilesForNode(nodeId) {
    const node = this.nodes.get(nodeId);
    return node?.source_file ? [node.source_file] : [];
  }
  
  // ===== COMMUNITY QUERIES =====
  
  getCommunityNodes(communityId) {
    return this.communityIndex.get(communityId) || [];
  }
  
  getCommunities() {
    const communities = new Map();
    for (const node of this.nodes.values()) {
      const c = node.community;
      if (!communities.has(c)) {
        communities.set(c, {
          id: c,
          name: node.community_name || `Community ${c}`,
          nodes: []
        });
      }
      communities.get(c).nodes.push(node.id);
    }
    return Array.from(communities.values());
  }

  // ===== EDGE / DEPENDENCY QUERIES =====
  
  getOutgoingEdges(nodeId) {
    return this.edges.filter(e => e.source === nodeId);
  }
  
  getIncomingEdges(nodeId) {
    return this.edges.filter(e => e.target === nodeId);
  }
  
  getDependencies(nodeId, depth = 1) {
    const visited = new Set();
    const result = [];
    
    const traverse = (id, currentDepth) => {
      if (visited.has(id) || currentDepth > depth) return;
      visited.add(id);
      
      const outgoing = this.getOutgoingEdges(id);
      for (const edge of outgoing) {
        const target = this.nodes.get(edge.target);
        if (target) {
          result.push({ edge, target, depth: currentDepth });
          traverse(edge.target, currentDepth + 1);
        }
      }
    };
    
    traverse(nodeId, 1);
    return result;
  }
  
  getDependents(nodeId, depth = 1) {
    const visited = new Set();
    const result = [];
    
    const traverse = (id, currentDepth) => {
      if (visited.has(id) || currentDepth > depth) return;
      visited.add(id);
      
      const incoming = this.getIncomingEdges(id);
      for (const edge of incoming) {
        const source = this.nodes.get(edge.source);
        if (source) {
          result.push({ edge, source, depth: currentDepth });
          traverse(edge.source, currentDepth + 1);
        }
      }
    };
    
    traverse(nodeId, 1);
    return result;
  }
  
  // ===== SEARCH =====
  
  search(searchQuery, options = {}) {
    const { type, community, fileType, limit = 20 } = options;
    const results = [];
    const queryLower = searchQuery.toLowerCase();
    
    for (const node of this.nodes.values()) {
      if (type && node.file_type !== type) continue;
      if (community !== undefined && node.community !== community) continue;
      if (node.file_type !== fileType) continue;
      
      const label = (node.label || '').toLowerCase();
      const normLabel = (node.norm_label || '').toLowerCase();
      const sourceFile = (node.source_file || '').toLowerCase();
      
      if (label.includes(queryLower) || normLabel.includes(queryLower) || sourceFile.includes(queryLower)) {
        results.push(node);
        if (results.length >= limit) break;
      }
    }
    
    return results;
  }
  
  // ===== STATS =====
  
  getStats() {
    const byType = {};
    const byCommunity = {};
    
    for (const node of this.nodes.values()) {
      byType[node.file_type] = (byType[node.file_type] || 0) + 1;
      byCommunity[node.community] = (byCommunity[node.community] || 0) + 1;
    }
    
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      byType,
      byCommunity: Object.fromEntries(
        Object.entries(byCommunity).map(([k, v]) => [k, { count: v, name: this.getCommunityName(k) }])
      )
    };
  }
  
  getCommunityName(id) {
    const nodes = this.communityIndex.get(id);
    return nodes?.[0]?.community_name || `Community ${id}`;
  }
  
  // ===== NAVIGATION HELPERS =====
  
  getRelatedFiles(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    
    const deps = this.getDependencies(node.id, 2);
    const files = new Set([node.source_file]);
    for (const d of deps) {
      if (d.target.source_file) files.add(d.target.source_file);
    }
    return Array.from(files).filter(Boolean);
  }
  
  getImpactedFiles(nodeId) {
    const deps = this.getDependents(nodeId, 2);
    const files = new Set();
    for (const d of deps) {
      if (d.source.source_file) files.add(d.source.source_file);
    }
    return Array.from(files).filter(Boolean);
  }
}

// Singleton instance
let graphClientInstance = null;

export async function getGraphClient() {
  if (!graphClientInstance) {
    graphClientInstance = new GraphClient();
    await graphClientInstance.load();
  }
  return graphClientInstance;
}

export default GraphClient;