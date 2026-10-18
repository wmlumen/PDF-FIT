/**
 * Graph Coordinator - Colaboración multi-IA sin solapamiento
 * Registra errores, evita reintentos fallidos, evoluciona skills
 * Integra grafo de conocimiento graphify para navegación de código
 */

// --- Storage: con detección de entorno ---
// Node.js: persiste en disco (.opencode/coordination/*.jsonl)
// Navegador: persiste en memoria + localStorage (sin node:fs)
let COORD_DIR = null;
let LOCKS_FILE = null;
let ERRORS_FILE = null;
let SKILLS_FILE = null;
let CHANGELOG_DIR = null;
let _MEM_LOCKS = [];
let _MEM_ERRORS = [];
let _MEM_TASKS = [];
let _MEM_SKILLS = { improvements: [], patterns: [] };
let _LS_KEY = 'snc_coordination_state_v1';

// --- Graph Client ---
let graphClient = null;

async function _initGraphClient() {
  if (graphClient) return graphClient;
  const { GraphClient, getGraphClient } = await import('./graphClient.mjs');
  graphClient = await getGraphClient();
  return graphClient;
}

export async function getGraphClient() {
  if (!graphClient) {
    const { GraphClient, getGraphClient: _getGraphClient } = await import('./graphClient.mjs');
    graphClient = await _getGraphClient();
  }
  return graphClient;
}

export function getGraphClientSync() {
  return graphClient;
}

function _lsLoad() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(_LS_KEY) : null;
    if (raw) {
      const p = JSON.parse(raw);
      _MEM_LOCKS = p.locks || [];
      _MEM_ERRORS = p.errors || [];
      _MEM_TASKS = p.tasks || [];
      _MEM_SKILLS = p.skills || { improvements: [], patterns: [] };
    }
  } catch { /* noop */ }
}

function _lsSave() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(_LS_KEY, JSON.stringify({
      locks: _MEM_LOCKS, errors: _MEM_ERRORS, tasks: _MEM_TASKS, skills: _MEM_SKILLS
    }));
  } catch { /* noop */ }
}

const IS_NODE = (typeof process !== 'undefined' && process.versions && process.versions.node);

async function _initPaths() {
  if (!IS_NODE) { _lsLoad(); return; }
  if (COORD_DIR) return;
  const { join } = await import('node:path');
  const { mkdirSync } = await import('node:fs');
  COORD_DIR = join(process.cwd(), '.opencode', 'coordination');
  LOCKS_FILE = join(COORD_DIR, 'locks.jsonl');
  ERRORS_FILE = join(COORD_DIR, 'errors.jsonl');
  SKILLS_FILE = join(COORD_DIR, 'skills.json');
  CHANGELOG_DIR = join(COORD_DIR, 'changelogs');
  mkdirSync(COORD_DIR, { recursive: true });
  mkdirSync(CHANGELOG_DIR, { recursive: true });
}

// --- Helpers de almacenamiento local (JSONL) ---
async function appendJsonl(file, obj) {
  const line = JSON.stringify({ ...obj, ts: new Date().toISOString() }) + '\n';
  if (!IS_NODE) {
    if (file === LOCKS_FILE) _MEM_LOCKS.push(JSON.parse(line));
    else if (file === ERRORS_FILE) _MEM_ERRORS.push(JSON.parse(line));
    else if (file === SKILLS_FILE) _MEM_SKILLS = JSON.parse(line);
    _lsSave();
    return;
  }
  const { appendFileSync } = await import('node:fs');
  appendFileSync(file, line);
}

async function readJsonl(file) {
  if (!IS_NODE) {
    if (file === LOCKS_FILE) return _MEM_LOCKS;
    if (file === ERRORS_FILE) return _MEM_ERRORS;
    return [];
  }
  const { existsSync, readFileSync } = await import('node:fs');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
}

async function writeJson(file, obj) {
  const text = JSON.stringify(obj, null, 2);
  if (!IS_NODE) { _MEM_SKILLS = obj; _lsSave(); return; }
  const { writeFileSync } = await import('node:fs');
  writeFileSync(file, text);
}

async function readJson(file, fallback = {}) {
  if (!IS_NODE) return _MEM_SKILLS;
  const { existsSync, readFileSync } = await import('node:fs');
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, 'utf8'));
}

// --- Generación de IDs únicos ---
function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// --- Clase Principal ---
export class GraphCoordinator {
  constructor(agentId, options = {}) {
    this.agentId = agentId;
    this.defaultTtl = options.defaultTtl || 300000; // 5 min
    this.maxRetries = options.maxRetries || 3;
    this._pathsReady = _initPaths();
  }

  /** Garantiza que las rutas/archivos estén inicializados antes de operar. */
  async _ready() { await this._pathsReady; }

  // ============================================
  // LOCKS - Evitar solapamiento en archivos
  // ============================================

  async acquireLock(resource, ttl = this.defaultTtl) {
    await this._ready();
    const lockId = genId('lock');
    const lock = {
      id: lockId,
      agent: this.agentId,
      resource,
      acquired: Date.now(),
      expires: Date.now() + ttl,
      status: 'active'
    };

    // Verificar si hay lock activo de OTRO agente
    const locks = await readJsonl(LOCKS_FILE);
    const existing = locks.find(l => l.resource === resource && l.status === 'active' && l.expires > Date.now() && l.agent !== this.agentId);
    
    if (existing) {
      throw new Error(`LOCKED: ${resource} by agent ${existing.agent} until ${new Date(existing.expires).toISOString()}`);
    }

    // Marcar locks propios expirados como released
    locks.forEach(l => {
      if (l.agent === this.agentId && l.resource === resource && l.status === 'active') {
        l.status = 'superseded';
        l.released = Date.now();
      }
    });

    await appendJsonl(LOCKS_FILE, lock);
    return lockId;
  }

  async releaseLock(lockId) {
    await this._ready();
    const { writeFileSync } = await import('node:fs');
    const locks = await readJsonl(LOCKS_FILE);
    const lock = locks.find(l => l.id === lockId);
    if (lock && lock.agent === this.agentId) {
      lock.status = 'released';
      lock.released = Date.now();
      // Reescribir archivo completo (poco frecuente)
      writeFileSync(LOCKS_FILE, locks.map(l => JSON.stringify(l)).join('\n') + '\n');
    }
  }

  async waitForLock(resource, maxWait = 60000, pollInterval = 1000) {
    await this._ready();
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      try {
        return await this.acquireLock(resource);
      } catch (e) {
        if (!e.message.startsWith('LOCKED:')) throw e;
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }
    throw new Error(`TIMEOUT waiting for lock: ${resource}`);
  }

  // Auto-release al salir
  async releaseAllMyLocks() {
    await this._ready();
    const locks = await readJsonl(LOCKS_FILE);
    let changed = false;
    locks.forEach(l => {
      if (l.agent === this.agentId && l.status === 'active') {
        l.status = 'released';
        l.released = Date.now();
        changed = true;
      }
    });
    if (changed) writeFileSync(LOCKS_FILE, locks.map(l => JSON.stringify(l)).join('\n') + '\n');
  }

  // ============================================
  // ERROR REGISTRY - Memoria de errores
  // ============================================

  async recordError(task, error, context = {}) {
    await this._ready();
    const errorId = genId('err');
    const record = {
      id: errorId,
      agent: this.agentId,
      task,
      error: error.message,
      stack: error.stack,
      context,
      resolved: false,
      retryCount: 0
    };
    await appendJsonl(ERRORS_FILE, record);
    return errorId;
  }

  async getBlockers(task) {
    await this._ready();
    const errors = await readJsonl(ERRORS_FILE);
    return errors.filter(e => 
      e.task === task && 
      e.agent === this.agentId && 
      !e.resolved
    );
  }

  async getSimilarErrors(task, threshold = 0.8) {
    await this._ready();
    const errors = await readJsonl(ERRORS_FILE);
    const taskWords = new Set(task.toLowerCase().split(/\W+/));
    return errors.filter(e => {
      if (e.resolved) return false;
      const otherWords = new Set(e.task.toLowerCase().split(/\W+/));
      const intersection = [...taskWords].filter(w => otherWords.has(w)).length;
      const union = new Set([...taskWords, ...otherWords]).size;
      return intersection / union >= threshold;
    });
  }

  async markResolved(errorId, solution) {
    await this._ready();
    const { writeFileSync } = await import('node:fs');
    const errors = await readJsonl(ERRORS_FILE);
    const err = errors.find(e => e.id === errorId);
    if (err) {
      err.resolved = true;
      err.solution = solution;
      err.resolvedAt = new Date().toISOString();
      writeFileSync(ERRORS_FILE, errors.map(e => JSON.stringify(e)).join('\n') + '\n');
    }
  }

  async incrementRetry(errorId) {
    await this._ready();
    const { writeFileSync } = await import('node:fs');
    const errors = await readJsonl(ERRORS_FILE);
    const err = errors.find(e => e.id === errorId);
    if (err) {
      err.retryCount++;
      err.lastRetry = new Date().toISOString();
      writeFileSync(ERRORS_FILE, errors.map(e => JSON.stringify(e)).join('\n') + '\n');
    }
  }

  // ============================================
  // SKILL EVOLUTION - Aprendizaje persistente
  // ============================================

  async proposeSkillImprovement(skillName, improvement) {
    await this._ready();
    const { writeFileSync: _wf, appendFileSync: _af } = await import('node:fs');
    const { join: _join } = await import('node:path');
    const skills = await readJson(SKILLS_FILE, { improvements: [], patterns: [] });
    
    const improvementId = genId('imp');
    const record = {
      id: improvementId,
      skill: skillName,
      agent: this.agentId,
      description: improvement.description,
      codeChange: improvement.codeChange,
      testsPassed: improvement.testsPassed,
      triggeredBy: improvement.triggeredBy, // 'error_resolved' | 'pattern' | 'performance'
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };
    
    skills.improvements.push(record);
    await writeJson(SKILLS_FILE, skills);
    
    // Registrar en changelog del skill
    const changelogFile = join(CHANGELOG_DIR, `${skillName}.md`);
    const entry = `\n## ${new Date().toISOString().split('T')[0]} - ${improvementId}\n**Agent:** ${this.agentId}\n**Type:** ${improvement.triggeredBy}\n**Description:** ${improvement.description}\n\n\`\`\`diff\n${improvement.codeChange}\n\`\`\`\n`;
    _af(changelogFile, entry);
    
    return improvementId;
  }

  async getPendingImprovements(skillName) {
    await this._ready();
    const skills = await readJson(SKILLS_FILE, { improvements: [] });
    return skills.improvements.filter(i => i.skill === skillName && i.status === 'pending_review');
  }

  async approveImprovement(improvementId, approvedBy) {
    await this._ready();
    const skills = await readJson(SKILLS_FILE, { improvements: [] });
    const imp = skills.improvements.find(i => i.id === improvementId);
    if (imp) {
      imp.status = 'approved';
      imp.approvedBy = approvedBy;
      imp.approvedAt = new Date().toISOString();
      await writeJson(SKILLS_FILE, skills);
    }
  }

  // ============================================
  // PATTERNS - Detección de patrones recurrentes
  // ============================================

  async recordPattern(pattern) {
    await this._ready();
    const skills = await readJson(SKILLS_FILE, { improvements: [], patterns: [] });
    const patternId = genId('pat');
    const record = {
      id: patternId,
      pattern: pattern.description,
      regex: pattern.regex,
      frequency: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      agents: [this.agentId],
      examples: [pattern.example]
    };
    skills.patterns.push(record);
    await writeJson(SKILLS_FILE, skills);
  }

  async findSimilarPattern(errorMsg) {
    await this._ready();
    const skills = await readJson(SKILLS_FILE, { patterns: [] });
    return skills.patterns.find(p => {
      try {
        return new RegExp(p.regex).test(errorMsg);
      } catch { return false; }
    });
  }

  // ============================================
  // TASK TRACKING - Coordinación de tareas
  // ============================================

  async startTask(taskName, metadata = {}) {
    await this._ready();
    const { join } = await import('node:path');
    const taskId = genId('task');
    const record = {
      id: taskId,
      agent: this.agentId,
      task: taskName,
      status: 'started',
      metadata,
      startedAt: new Date().toISOString()
    };
    await appendJsonl(join(COORD_DIR, 'tasks.jsonl'), record);
    return taskId;
  }

  async completeTask(taskId, result) {
    await this._ready();
    const { writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const tasks = await readJsonl(join(COORD_DIR, 'tasks.jsonl'));
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date().toISOString();
      writeFileSync(join(COORD_DIR, 'tasks.jsonl'), tasks.map(t => JSON.stringify(t)).join('\n') + '\n');
    }
  }

  async getTaskStatus(taskId) {
    await this._ready();
    const { join } = await import('node:path');
    const tasks = await readJsonl(join(COORD_DIR, 'tasks.jsonl'));
    return tasks.find(t => t.id === taskId);
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async getHealth() {
    await this._ready();
    const locks = await readJsonl(LOCKS_FILE);
    const errors = await readJsonl(ERRORS_FILE);
    const activeLocks = locks.filter(l => l.status === 'active' && l.expires > Date.now());
    const myLocks = activeLocks.filter(l => l.agent === this.agentId);
    const unresolvedErrors = errors.filter(e => e.agent === this.agentId && !e.resolved);
    
    return {
      agent: this.agentId,
      activeLocks: myLocks.length,
      totalActiveLocks: activeLocks.length,
      unresolvedErrors: unresolvedErrors.length,
      errorRate: errors.length ? unresolvedErrors.length / errors.length : 0
    };
  }
}

// Auto-cleanup al cerrar
process.on('exit', () => {
  // No se puede usar async aquí, pero los locks expiran solos por TTL
});

export default GraphCoordinator;
export { AgentOrchestrator, MainAgent, SubAgent, createAgentSwarm, DEFAULT_SWARM_CONFIG, getResources } from './orchestrator.mjs';