// ==========================================
// Logger centralizado - ESM Module
// En producción solo muestra warn/error
// En desarrollo muestra todo
// ==========================================

const DEBUG_ENABLED = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');

export const logger = {
  debug: (...args) => { if (DEBUG_ENABLED) console.log('[DEBUG]', ...args); },
  info: (...args) => { if (DEBUG_ENABLED) console.log('[INFO]', ...args); },
  warn: (...args) => { console.warn('[WARN]', ...args); },
  error: (...args) => { console.error('[ERROR]', ...args); }
};

export default logger;