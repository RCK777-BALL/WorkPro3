const LOG_LEVELS = ['error', 'warn', 'info'];
const currentLevel = process.env.LOG_LEVEL || 'info';
const shouldLog = (level) => LOG_LEVELS.indexOf(level) <= LOG_LEVELS.indexOf(currentLevel);

const logger = {
  info: (...args) => {
    if (shouldLog('info')) console.log('[INFO]', ...args);
  },
  warn: (...args) => {
    if (shouldLog('warn')) console.warn('[WARN]', ...args);
  },
  error: (...args) => {
    if (shouldLog('error')) console.error('[ERROR]', ...args);
  },
};

export default logger;
