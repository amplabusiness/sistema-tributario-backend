export declare const APP_CONFIG: {
    readonly NAME: "Sistema Tributário IA";
    readonly VERSION: "1.0.0";
    readonly PORT: number;
    readonly NODE_ENV: string;
};
export declare const AI_CONFIG: {
    readonly MAX_TOKENS: 8000;
    readonly BATCH_SIZE: 10;
    readonly RATE_LIMIT: 3;
    readonly RETRY_ATTEMPTS: 3;
    readonly RETRY_DELAY: 1000;
    readonly MODELS: {
        readonly PRIMARY: "gpt-4";
        readonly FALLBACK: "gpt-3.5-turbo";
        readonly CLAUDE: "claude-3-sonnet";
    };
};
export declare const CACHE_CONFIG: {
    readonly TTL: {
        readonly SHORT: 300;
        readonly MEDIUM: 3600;
        readonly LONG: 86400;
    };
    readonly PREFIXES: {
        readonly USER: "user:";
        readonly DOCUMENT: "doc:";
        readonly AI_RESULT: "ai:";
        readonly SESSION: "session:";
    };
};
export declare const VALIDATION: {
    readonly PASSWORD_MIN_LENGTH: 8;
    readonly EMAIL_MAX_LENGTH: 255;
    readonly NAME_MAX_LENGTH: 100;
    readonly FILE_MAX_SIZE: number;
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "application/xml", "text/xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const MESSAGES: {
    readonly SUCCESS: {
        readonly DOCUMENT_UPLOADED: "Documento enviado com sucesso";
        readonly DOCUMENT_PROCESSED: "Documento processado com sucesso";
        readonly USER_CREATED: "Usuário criado com sucesso";
        readonly USER_UPDATED: "Usuário atualizado com sucesso";
        readonly USER_DELETED: "Usuário removido com sucesso";
    };
    readonly ERROR: {
        readonly INVALID_CREDENTIALS: "Credenciais inválidas";
        readonly UNAUTHORIZED: "Acesso não autorizado";
        readonly NOT_FOUND: "Recurso não encontrado";
        readonly VALIDATION_ERROR: "Erro de validação";
        readonly INTERNAL_ERROR: "Erro interno do servidor";
        readonly RATE_LIMIT_EXCEEDED: "Limite de requisições excedido";
        readonly FILE_TOO_LARGE: "Arquivo muito grande";
        readonly INVALID_FILE_TYPE: "Tipo de arquivo não suportado";
    };
};
export declare const LOG_LEVELS: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly DEBUG: "debug";
};
export declare const SECURITY: {
    readonly JWT_EXPIRES_IN: "24h";
    readonly BCRYPT_ROUNDS: 12;
    readonly SESSION_TIMEOUT: number;
};
//# sourceMappingURL=index.d.ts.map