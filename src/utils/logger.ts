import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

// Configuração dos formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Configuração dos transportes
const transports: winston.transport[] = [
  // Console
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
];

// Arquivos de log apenas em produção
if (process.env.NODE_ENV === 'production') {
  // Log geral
  transports.push(
    new (DailyRotateFile as any)({
      filename: path.join('logs', 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: 'info',
    }) as winston.transport
  );

  // Log de erros
  transports.push(
    new (DailyRotateFile as any)({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error',
    }) as winston.transport
  );
}

// Criar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false,
});

// Funções de log simplificadas
export const logInfo = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any, meta?: any): void => {
  if (error instanceof Error) {
    logger.error(message, {
      error: error.message,
      stack: error.stack,
      name: error.name,
      ...meta
    });
  } else if (error && typeof error === 'object') {
    logger.error(message, { error, ...meta });
  } else {
    logger.error(message, { error, ...meta });
  }
};

export const logWarn = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any): void => {
  logger.debug(message, meta);
};

// Logger para operações de IA
export const logAI = (message: string, meta?: any) => {
  logger.info(`[AI] ${message}`, { category: 'ai', ...meta });
};

// Logger para operações de banco de dados
export const logDB = (message: string, meta?: any) => {
  logger.info(`[DB] ${message}`, { category: 'database', ...meta });
};

// Logger para operações de cache
export const logCache = (message: string, meta?: any) => {
  logger.info(`[CACHE] ${message}`, { category: 'cache', ...meta });
};

// Logger para operações de upload
export const logUpload = (message: string, meta?: any) => {
  logger.info(`[UPLOAD] ${message}`, { category: 'upload', ...meta });
};

// Export nomeado para compatibilidade
export { logger };

export default logger; 