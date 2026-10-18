
import { GraphCoordinator, AgentOrchestrator } from './coordinator.mjs';

const gc = new GraphCoordinator('test-agent');
const R = {};

// 1) Locks
try {
  const l1 = await gc.acquireLock('js/validator.js');
  R.lockAcquired = !!l1;
  const l2 = await gc.acquireLock('js/validator.js');
  R.lockSameAgentAllowed = !!l2;
  await gc.releaseLock(l1);
  await gc.releaseLock(l2);
  R.lockReleased = true;
} catch (e) { R.lockError = e.message; }

// 2) Error registry
try {
  const errId = await gc.recordError('fix_topology', new Error('boom'), { skill: 'validator' });
  R.errorId = errId;
  R.blockers = (await gc.getBlockers('fix_topology')).length;
  await gc.markResolved(errId, 'fixed');
  R.blockersAfterResolve = (await gc.getBlockers('fix_topology')).length;
} catch (e) { R.errorRegError = e.message; }

// 3) Patterns
try {
  await gc.recordPattern({ description: 'test pattern', regex: 'boom', example: 'boom' });
  R.patternFound = !!(await gc.findSimilarPattern('this is a boom error'));
} catch (e) { R.patternError = e.message; }

// 4) Tasks
try {
  const t = await gc.startTask('test_task', { x: 1 });
  R.taskId = t;
  await gc.completeTask(t, { ok: true });
  R.taskStatus = (await gc.getTaskStatus(t))?.status;
} catch (e) { R.taskError = e.message; }

// 5) Health
R.health = await gc.getHealth();

// 6) Orchestrator
try {
  const orch = new AgentOrchestrator(gc);
  const agent = await orch.registerMainAgent('hermes-agent', { maxSubAgents: 3, budget: { cpu: 30, memory: 512 } });
  R.agentRegistered = !!agent;
  const sub = await orch.spawnSubAgentAnywhere('validator', { capabilities: ['topology'] });
  R.subSpawned = !!sub;
  const res = await sub.execute({ fn: async (ctx) => ({ done: true, got: ctx.a }) }, { a: 1 });
  R.subExecuted = res?.done === true && res?.got === 1;
  R.globalHealth = orch.getGlobalHealth();
} catch (e) { R.orchError = e.message; }

console.log(JSON.stringify(R, null, 2));
