"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.logUpload = exports.logCache = exports.logDB = exports.logAI = exports.logDebug = exports.logWarn = exports.logError = exports.logInfo = void 0;
const winston = __importStar(require("winston"));
const DailyRotateFile = __importStar(require("winston-daily-rotate-file"));
const path = __importStar(require("path"));
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.json());
const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
}));
const transports = [
    new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
];
if (process.env.NODE_ENV === 'production') {
    transports.push(new DailyRotateFile({
        filename: path.join('logs', 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat,
        level: 'info',
    }));
    transports.push(new DailyRotateFile({
        filename: path.join('logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
        level: 'error',
    }));
}
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exitOnError: false,
});
exports.logger = logger;
const logInfo = (message, meta) => {
    logger.info(message, meta);
};
exports.logInfo = logInfo;
const logError = (message, error, meta) => {
    if (error instanceof Error) {
        logger.error(message, {
            error: error.message,
            stack: error.stack,
            name: error.name,
            ...meta
        });
    }
    else if (error && typeof error === 'object') {
        logger.error(message, { error, ...meta });
    }
    else {
        logger.error(message, { error, ...meta });
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