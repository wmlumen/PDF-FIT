/**
 * Agent Orchestrator - Despliegue de sub-agentes con control de recursos
 * Cada IA principal registra sus sub-agentes; el orquestador gestiona CPU/RAM
 */

import { EventEmitter } from 'node:events';
import { GraphCoordinator } from './coordinator.mjs';

const MAX_CONCURRENT_AGENTS = parseInt(process.env.MAX_AGENTS || '8');
const CPU_THRESHOLD = parseFloat(process.env.CPU_THRESHOLD || '80'); // %
const MEMORY_THRESHOLD = parseFloat(process.env.MEM_THRESHOLD || '85'); // %
const HEARTBEAT_INTERVAL = 10000; // 10s

// --- Monitor de recursos (Node.js) ---
function getSystemResources() {
  if (typeof process === 'undefined' || !process.memoryUsage) {
    return { cpu: 0, memory: 0, heapUsed: 0, heapTotal: 0 };
  }
  const mem = process.memoryUsage();
  return {
    cpu: 0, // Requiere binding nativo o os-utils
    memory: (mem.heapUsed / mem.heapTotal) * 100,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    rss: mem.rss
  };
}

// En navegador, usar performance.memory
function getBrowserResources() {
  if (typeof window !== 'undefined' && window.performance?.memory) {
    const m = performance.memory;
    return {
      cpu: 0,
      memory: (m.usedJSHeapSize / m.jsHeapSizeLimit) * 100,
      heapUsed: m.usedJSHeapSize,
      heapTotal: m.jsHeapSizeLimit
    };
  }
  return { cpu: 0, memory: 0, heapUsed: 0, heapTotal: 0 };
}

export function getResources() {
  return typeof process !== 'undefined' && process.versions?.node
    ? getSystemResources()
    : getBrowserResources();
}

// ============================================
// SUB-AGENT DEFINITION
// ============================================

export class SubAgent {
  constructor(definition, parentAgentId, orchestrator) {
    this.id = `sub_${definition.role}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.role = definition.role;           // 'validator', 'exporter', 'parser', 'mapper', etc.
    this.capabilities = definition.capabilities || [];
    this.parentAgentId = parentAgentId;
    this.orchestrator = orchestrator;
    this.status = 'spawning';
    this.resourceQuota = definition.quota || { cpu: 10, memory: 50 }; // % of parent quota
    this.currentTask = null;
    this.heartbeat = Date.now();
    this.metrics = { tasksCompleted: 0, errors: 0, avgDuration: 0 };
  }

  async execute(task, context = {}) {
    this.status = 'working';
    this.currentTask = task;
    const start = Date.now();
    
    try {
      const result = await task.fn.call(this, context);
      this.metrics.tasksCompleted++;
      this.metrics.avgDuration = (this.metrics.avgDuration * (this.metrics.tasksCompleted - 1) + (Date.now() - start)) / this.metrics.tasksCompleted;
      this.status = 'idle';
      this.currentTask = null;
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.status = 'error';
      throw error;
    } finally {
      this.heartbeat = Date.now();
    }
  }

  getStatus() {
    return {
      id: this.id,
      role: this.role,
      status: this.status,
      parent: this.parentAgentId,
      quota: this.resourceQuota,
      metrics: this.metrics,
      heartbeat: this.heartbeat
    };
  }
}

// ============================================
// MAIN AGENT - IA Principal con sub-agentes
// ============================================

export class MainAgent extends EventEmitter {
  constructor(agentId, graphCoordinator, options = {}) {
    super();
    this.id = agentId;
    this.coordinator = graphCoordinator;
    this.maxSubAgents = options.maxSubAgents || 4;
    this.subAgents = new Map();
    this.resourceBudget = options.budget || { cpu: 50, memory: 400 }; // MB
    this.isShuttingDown = false;
  }

  // Desplegar sub-agente
  async spawnSubAgent(definition) {
    if (this.subAgents.size >= this.maxSubAgents) {
      throw new Error(`Max sub-agents reached (${this.maxSubAgents})`);
    }

    // Verificar presupuesto de recursos
    const resources = getResources();
    const totalQuota = Array.from(this.subAgents.values())
      .reduce((sum, a) => sum + a.resourceQuota.memory, 0);
    
    if (totalQuota + definition.quota?.memory > this.resourceBudget.memory) {
      throw new Error(`Memory budget exceeded (${totalQuota}/${this.resourceBudget.memory}MB)`);
    }

    // Lock coordinado para el recurso que va a usar
    const lockId = await this.coordinator.acquireLock(`subagent_${definition.role}`);
    
    const subAgent = new SubAgent(definition, this.id, this);
    this.subAgents.set(subAgent.id, subAgent);
    subAgent.status = 'ready';
    subAgent.lockId = lockId;

    // Registrar en coordinador global
    await this.coordinator.startTask(`subagent_${subAgent.id}`, {
      role: definition.role,
      parent: this.id,
      capabilities: definition.capabilities
    });

    this.emit('subagent:spawned', subAgent.getStatus());
    return subAgent;
  }

  // Ejecutar tarea en sub-agente apropiado
  async delegate(role, task, context) {
    // Buscar sub-agente libre con ese rol
    const agent = Array.from(this.subAgents.values())
      .find(a => a.role === role && a.status === 'idle');

    if (!agent) {
      // Auto-spawn si hay presupuesto
      if (this.subAgents.size < this.maxSubAgents) {
        const newAgent = await this.spawnSubAgent({ role, capabilities: [role] });
        return newAgent.execute(task, context);
      }
      throw new Error(`No available ${role} sub-agent`);
    }

    return agent.execute(task, context);
  }

  // Apagar sub-agente
  async terminateSubAgent(subAgentId) {
    const agent = this.subAgents.get(subAgentId);
    if (!agent) return false;

    if (agent.lockId) await this.coordinator.releaseLock(agent.lockId);
    await this.coordinator.completeTask(`subagent_${agent.id}`, { status: 'terminated' });
    this.subAgents.delete(subAgentId);
    this.emit('subagent:terminated', { id: subAgentId });
    return true;
  }

  // Apagar todos
  async shutdown() {
    this.isShuttingDown = true;
    for (const [id, agent] of this.subAgents) {
      await this.terminateSubAgent(id);
    }
    await this.coordinator.releaseAllMyLocks();
    this.emit('shutdown');
  }

  getStatus() {
    return {
      id: this.id,
      subAgents: Array.from(this.subAgents.values()).map(a => a.getStatus()),
      resourceBudget: this.resourceBudget,
      currentUsage: {
        subAgents: this.subAgents.size,
        maxSubAgents: this.maxSubAgents
      }
    };
  }
}

// ============================================
// ORCHESTRATOR GLOBAL - Registro de IAs principales
// ============================================

export class AgentOrchestrator {
  constructor(graphCoordinator) {
    this.coordinator = graphCoordinator;
    this.mainAgents = new Map(); // agentId -> MainAgent
    this.globalBudget = { cpu: 80, memory: 2048 }; // Total system budget
    this.heartbeatTimer = null;
  }

  // Registrar IA principal
  async registerMainAgent(agentId, options = {}) {
    if (this.mainAgents.has(agentId)) {
      throw new Error(`Agent ${agentId} already registered`);
    }

    // Lock global para registro
    const lockId = await this.coordinator.acquireLock(`agent_registry_${agentId}`);
    
    const agent = new MainAgent(agentId, this.coordinator, options);
    this.mainAgents.set(agentId, agent);
    
    await this.coordinator.releaseLock(lockId);
    
    // Heartbeat monitoring
    agent.on('subagent:error', (status) => {
      console.error(`[Orchestrator] Sub-agent error:`, status);
    });

    console.log(`[Orchestrator] Registered main agent: ${agentId}`);
    return agent;
  }

  // Obtener agente principal
  getAgent(agentId) {
    return this.mainAgents.get(agentId);
  }

  // Desplegar sub-agente en cualquier IA principal
  async spawnSubAgentAnywhere(role, definition, preferredAgentId = null) {
    // Buscar agente con capacidad
    let targetAgent = null;
    
    if (preferredAgentId) {
      targetAgent = this.mainAgents.get(preferredAgentId);
    } else {
      // Buscar el que menos carga tenga
      targetAgent = Array.from(this.mainAgents.values())
        .filter(a => a.subAgents.size < a.maxSubAgents)
        .sort((a, b) => a.subAgents.size - b.subAgents.size)[0];
    }

    if (!targetAgent) {
      throw new Error('No main agent available with capacity');
    }

    return targetAgent.spawnSubAgent({ ...definition, role });
  }

  // Ejecutar tarea en cualquier sub-agente disponible
  async delegateAnywhere(role, task, context) {
    // Buscar en todos los agentes principales
    for (const [id, agent] of this.mainAgents) {
      const subAgent = Array.from(agent.subAgents.values())
        .find(a => a.role === role && a.status === 'idle');
      
      if (subAgent) {
        return subAgent.execute(task, context);
      }
    }

    // Auto-spawn en el primero con capacidad
    for (const [id, agent] of this.mainAgents) {
      if (agent.subAgents.size < agent.maxSubAgents) {
        const newAgent = await agent.spawnSubAgent({ role, capabilities: [role] });
        return newAgent.execute(task, context);
      }
    }

    throw new Error(`No available ${role} agent and no capacity to spawn`);
  }

  // Health check global
  getGlobalHealth() {
    const resources = getResources();
    let totalSubAgents = 0;
    let totalErrors = 0;
    let totalTasks = 0;

    for (const [id, agent] of this.mainAgents) {
      for (const [_, sub] of agent.subAgents) {
        totalSubAgents++;
        totalErrors += sub.metrics.errors;
        totalTasks += sub.metrics.tasksCompleted;
      }
    }

    return {
      resources,
      mainAgents: this.mainAgents.size,
      totalSubAgents,
      totalErrors,
      totalTasks,
      errorRate: totalTasks ? totalErrors / totalTasks : 0,
      budgetUsage: {
        cpu: `${resources.cpu.toFixed(1)}%`,
        memory: `${resources.memory.toFixed(1)}%`
      }
    };
  }

  // Iniciar heartbeat monitoring
  startHeartbeat(interval = HEARTBEAT_INTERVAL) {
    if (this.heartbeatTimer) return;
    
    this.heartbeatTimer = setInterval(() => {
      const health = this.getGlobalHealth();
      
      // Alertas de recursos
      if (health.resources.memory > MEMORY_THRESHOLD) {
        this.emit('warning:memory', health);
        console.warn(`[Orchestrator] HIGH MEMORY: ${health.resources.memory.toFixed(1)}%`);
      }
      
      if (health.resources.cpu > CPU_THRESHOLD) {
        this.emit('warning:cpu', health);
        console.warn(`[Orchestrator] HIGH CPU: ${health.resources.cpu.toFixed(1)}%`);
      }

      // Limpiar sub-agentes muertos (sin heartbeat > 60s)
      const now = Date.now();
      for (const [id, agent] of this.mainAgents) {
        for (const [subId, sub] of agent.subAgents) {
          if (now - sub.heartbeat > 60000 && sub.status !== 'terminated') {
            console.warn(`[Orchestrator] Stale sub-agent detected: ${subId}`);
            agent.terminateSubAgent(subId).catch(console.error);
          }
        }
      }

      this.emit('heartbeat', health);
    }, interval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Apagado graceful
  async shutdown() {
    this.stopHeartbeat();
    
    for (const [id, agent] of this.mainAgents) {
      await agent.shutdown();
    }
    this.mainAgents.clear();
    await this.coordinator.releaseAllMyLocks();
    this.emit('shutdown');
  }
}

// ============================================
// FACTORY PARA DESPLIEGUE RÁPIDO
// ============================================

export async function createAgentSwarm(graphCoordinator, config) {
  const orchestrator = new AgentOrchestrator(graphCoordinator);
  
  // Registrar IAs principales según config
  for (const [agentId, options] of Object.entries(config.mainAgents || {})) {
    await orchestrator.registerMainAgent(agentId, options);
  }

  // Iniciar heartbeat
  orchestrator.startHeartbeat();

  // Exponer globalmente
  if (typeof window !== 'undefined') {
    window.AgentOrchestrator = orchestrator;
    window.MainAgent = MainAgent;
    window.SubAgent = SubAgent;
  }

  return orchestrator;
}

// Configuración por defecto para el proyecto SNC
export const DEFAULT_SWARM_CONFIG = {
  mainAgents: {
    'frontend-agent': {
      maxSubAgents: 3,
      budget: { cpu: 30, memory: 512 },
      roles: ['mapper', 'exporter', 'validator']
    },
    'backend-agent': {
      maxSubAgents: 4,
      budget: { cpu: 40, memory: 1024 },
      roles: ['validator', 'postgis', 'auth', 'payments']
    },
    'municipal-agent': {
      maxSubAgents: 2,
      budget: { cpu: 10, memory: 256 },
      roles: ['municipal-validator', 'report-generator']
    }
  }
};

export default { AgentOrchestrator, MainAgent, SubAgent, createAgentSwarm, DEFAULT_SWARM_CONFIG };