"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: Number(process.env.PORT) || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sistema_tributario',
        ssl: process.env.NODE_ENV === 'production',
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: Number(process.env.OPENAI_MAX_TOKENS) || 8000,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    upload: {
        maxFileSize: Number(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
        uploadPath: process.env.UPLOAD_PATH || './uploads',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || './logs/app.log',
    },
    security: {
        bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
        rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
        rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
    },
    monitoring: {
        prometheusPort: Number(process.env.PROMETHEUS_PORT) || 9090,
        grafanaPort: Number(process.env.GRAFANA_PORT) || 3002,
    },
};
exports.default = exports.config;
//# sourceMappingURL=index.js.map