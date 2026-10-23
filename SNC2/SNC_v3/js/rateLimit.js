import Redis from 'ioredis';
import { ENV } from '../config.env.js';

let redis = null;
let useRedis = false;

if (ENV.REDIS_URL) {
  try {
    redis = new Redis(ENV.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      enableReadyCheck: true,
      lazyConnect: true,
    });
    redis.on('error', (err) => {
      console.warn('[RATE_LIMIT] Redis error, fallback a memoria:', err.message);
      useRedis = false;
    });
    redis.on('connect', () => {
      useRedis = true;
      console.log('[RATE_LIMIT] Redis conectado');
    });
    redis.connect().catch(() => { useRedis = false; });
  } catch (e) {
    console.warn('[RATE_LIMIT] No se pudo inicializar Redis:', e.message);
  }
}

// Fallback en memoria (solo desarrollo)
const memoryStore = new Map();
const sensitiveMemoryStore = new Map();

function getClientIdentifier(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const authHeader = req.headers.authorization || '';
  const tokenPart = authHeader.split(' ')[1];
  const tokenPrefix = tokenPart ? String(tokenPart).slice(0, 16) : '';
  if (req.user?.userId) return `u:${req.user.userId}`;
  return `${ip}|${tokenPrefix}`;
}

async function incrementWithTTL(store, key, windowMs, limit) {
  const now = Date.now();
  const windowSec = Math.ceil(windowMs / 1000);

  if (useRedis && redis) {
    const luaScript = `
      local current = redis.call('GET', KEYS[1])
      if current == false then
        redis.call('SET', KEYS[1], 1, 'EX', ARGV[1])
        return {1, ARGV[1]}
      end
      if tonumber(current) >= tonumber(ARGV[2]) then
        return {tonumber(current), redis.call('TTL', KEYS[1])}
      end
      local incr = redis.call('INCR', KEYS[1])
      local ttl = redis.call('TTL', KEYS[1])
      if ttl < 0 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
        ttl = ARGV[1]
      end
      return {incr, ttl}
    `;
    const result = await redis.eval(luaScript, 1, key, windowSec, limit);
    return { count: result[0], resetIn: result[1] };
  } else {
    const entry = store.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    store.set(key, entry);
    return { count: entry.count, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
  }
}

export function rateLimit(req, res, next) {
  const key = `rl:${getClientIdentifier(req)}`;
  const windowMs = ENV.RATE_LIMIT_WINDOW_MS;
  const limit = ENV.RATE_LIMIT_MAX;

  incrementWithTTL(memoryStore, key, windowMs, limit).then(({ count, resetIn }) => {
    if (count > limit) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes',
        retryAfter: resetIn
      });
    }
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - count));
    res.setHeader('X-RateLimit-Reset', resetIn);
    next();
  }).catch(next);
}

export function sensitiveRateLimit(req, res, next) {
  const isSensitive = req.path.startsWith('/api/auth/') || req.path.startsWith('/api/admin/');
  if (!isSensitive) return next();

  const key = `rl:sensitive:${getClientIdentifier(req)}`;
  const windowMs = Math.max(ENV.RATE_LIMIT_WINDOW_MS, 60_000);
  const limit = Math.min(ENV.RATE_LIMIT_MAX, 60);

  incrementWithTTL(sensitiveMemoryStore, key, windowMs, limit).then(({ count, resetIn }) => {
    if (count > limit) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes en endpoint sensible',
        retryAfter: resetIn
      });
    }
    next();
  }).catch(next);
}

export function closeRateLimit() {
  if (redis) return redis.quit();
  return Promise.resolve();
}