import pino from 'pino';

// Environment-aware Pino logger configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

// Create child loggers for different modules
export const discussionLogger = logger.child({ module: 'discussion' });
export const gameLogger = logger.child({ module: 'game' });
export const claudeLogger = logger.child({ module: 'claude' });
export const dbLogger = logger.child({ module: 'database' });
export const orchestratorLogger = logger.child({ module: 'orchestrator' });
export const agentLogger = logger.child({ module: 'agent' });
export const votingLogger = logger.child({ module: 'voting' });
export const nightLogger = logger.child({ module: 'night' });
