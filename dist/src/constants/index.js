"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_CONFIG = exports.USER_ROLES = exports.PROCESSING_STATUS = exports.DOCUMENT_TYPES = exports.BATCH = exports.UPLOAD = exports.JWT = exports.RATE_LIMIT = exports.CACHE = exports.PAGINATION = exports.MESSAGES = exports.HTTP_STATUS = void 0;
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
};
exports.MESSAGES = {
    SUCCESS: {
        USER_CREATED: 'Usuário criado com sucesso',
        USER_UPDATED: 'Usuário atualizado com sucesso',
        USER_DELETED: 'Usuário deletado com sucesso',
        DOCUMENT_PROCESSED: 'Documento processado com sucesso',
        BATCH_STARTED: 'Processamento em lote iniciado',
        CACHE_CLEARED: 'Cache limpo com sucesso',
    },
    ERROR: {
        VALIDATION_ERROR: 'Erro de validação',
        UNAUTHORIZED: 'Não autorizado',
        FORBIDDEN: 'Acesso negado',
        NOT_FOUND: 'Recurso não encontrado',
        INVALID_CREDENTIALS: 'Credenciais inválidas',
        INTERNAL_ERROR: 'Erro interno do servidor',
        RATE_LIMIT_EXCEEDED: 'Limite de requisições excedido',
        INVALID_TOKEN: 'Token inválido',
        TOKEN_EXPIRED: 'Token expirado',
        PARSING_ERROR: 'Erro ao processar arquivo',
    },
};
exports.PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
};
exports.CACHE = {
    TTL: {
        SHORT: 300,
        MEDIUM: 1800,
        LONG: 3600,
        VERY_LONG: 86400,
    },
    KEYS: {
        USER_PROFILE: 'user:profile:',
        DOCUMENT_STATUS: 'document:status:',
        BATCH_STATUS: 'batch:status:',
    },
};
exports.RATE_LIMIT = {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 100,
    SKIP_SUCCESSFUL_REQUESTS: false,
    SKIP_FAILED_REQUESTS: false,
};
exports.JWT = {
    SECRET: process.env.JWT_SECRET || 'your-secret-key',
    EXPIRES_IN: '24h',
    REFRESH_EXPIRES_IN: '7d',
};
exports.UPLOAD = {
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    ALLOWED_MIME_TYPES: [
        'application/pdf',
        'application/xml',
        'text/xml',
        'application/json',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ],
    UPLOAD_DIR: 'uploads',
};
exports.BATCH = {
    CONCURRENCY: 5,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000,
    TIMEOUT: 300000,
};
exports.DOCUMENT_TYPES = {
    XML: 'xml',
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv',
    JSON: 'json',
};
exports.PROCESSING_STATUS = {
    PENDING: 'PENDING',
    PROCESSING: 'PROCESSING',
    COMPLETED: 'COMPLETED',
    FAILED: 'ERROR',
    CANCELLED: 'CANCELLED',
};
exports.USER_ROLES = {
    ADMIN: 'ADMIN',
    USER: 'USER',
    AUDITOR: 'AUDITOR',
};
exports.AI_CONFIG = {
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000,
    BATCH_SIZE: 10,
    RATE_LIMIT: 3,
    TIMEOUT: 30000,
    MAX_TOKENS: 8000,
    MODEL: 'gpt-4',
    TEMPERATURE: 0.1,
};
//# sourceMappingURL=index.js.map