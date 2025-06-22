"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUpload = exports.logCache = exports.logDB = exports.logAI = exports.logDebug = exports.logWarn = exports.logError = exports.logInfo = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
}));
const transports = [
    new winston_1.default.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
];
if (process.env.NODE_ENV === 'production') {
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join('logs', 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
        level: 'info',
    }));
    transports.push(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
        level: 'error',
    }));
}
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false,
});
const logInfo = (message, meta) => {
    logger.info(message, meta);
};
exports.logInfo = logInfo;
const logError = (message, error) => {
    if (error instanceof Error) {
        logger.error(message, {
            error: error.message,
            stack: error.stack,
            name: error.name,
        });
    }
    else {
        logger.error(message, error);
    }
};
exports.logError = logError;
const logWarn = (message, meta) => {
    logger.warn(message, meta);
};
exports.logWarn = logWarn;
const logDebug = (message, meta) => {
    logger.debug(message, meta);
};
exports.logDebug = logDebug;
const logAI = (message, meta) => {
    logger.info(`[AI] ${message}`, { category: 'ai', ...meta });
};
exports.logAI = logAI;
const logDB = (message, meta) => {
    logger.info(`[DB] ${message}`, { category: 'database', ...meta });
};
exports.logDB = logDB;
const logCache = (message, meta) => {
    logger.info(`[CACHE] ${message}`, { category: 'cache', ...meta });
};
exports.logCache = logCache;
const logUpload = (message, meta) => {
    logger.info(`[UPLOAD] ${message}`, { category: 'upload', ...meta });
};
exports.logUpload = logUpload;
exports.default = logger;
//# sourceMappingURL=logger.js.map