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
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const MESSAGES: {
    readonly SUCCESS: {
        readonly USER_CREATED: "Usuário criado com sucesso";
        readonly USER_UPDATED: "Usuário atualizado com sucesso";
        readonly USER_DELETED: "Usuário deletado com sucesso";
        readonly DOCUMENT_PROCESSED: "Documento processado com sucesso";
        readonly BATCH_STARTED: "Processamento em lote iniciado";
        readonly CACHE_CLEARED: "Cache limpo com sucesso";
    };
    readonly ERROR: {
        readonly VALIDATION_ERROR: "Erro de validação";
        readonly UNAUTHORIZED: "Não autorizado";
        readonly FORBIDDEN: "Acesso negado";
        readonly NOT_FOUND: "Recurso não encontrado";
        readonly INVALID_CREDENTIALS: "Credenciais inválidas";
        readonly INTERNAL_ERROR: "Erro interno do servidor";
        readonly RATE_LIMIT_EXCEEDED: "Limite de requisições excedido";
        readonly INVALID_TOKEN: "Token inválido";
        readonly TOKEN_EXPIRED: "Token expirado";
        readonly PARSING_ERROR: "Erro ao processar arquivo";
    };
};
export declare const PAGINATION: {
    readonly DEFAULT_PAGE: 1;
    readonly DEFAULT_LIMIT: 20;
    readonly MAX_LIMIT: 100;
};
export declare const CACHE: {
    readonly TTL: {
        readonly SHORT: 300;
        readonly MEDIUM: 1800;
        readonly LONG: 3600;
        readonly VERY_LONG: 86400;
    };
    readonly KEYS: {
        readonly USER_PROFILE: "user:profile:";
        readonly DOCUMENT_STATUS: "document:status:";
        readonly BATCH_STATUS: "batch:status:";
    };
};
export declare const RATE_LIMIT: {
    readonly WINDOW_MS: number;
    readonly MAX_REQUESTS: 100;
    readonly SKIP_SUCCESSFUL_REQUESTS: false;
    readonly SKIP_FAILED_REQUESTS: false;
};
export declare const JWT: {
    readonly SECRET: string;
    readonly EXPIRES_IN: "24h";
    readonly REFRESH_EXPIRES_IN: "7d";
};
export declare const UPLOAD: {
    readonly MAX_FILE_SIZE: number;
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "application/xml", "text/xml", "application/json", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    readonly UPLOAD_DIR: "uploads";
};
export declare const BATCH: {
    readonly CONCURRENCY: 5;
    readonly RETRY_ATTEMPTS: 3;
    readonly RETRY_DELAY: 5000;
    readonly TIMEOUT: 300000;
};
export declare const DOCUMENT_TYPES: {
    readonly XML: "xml";
    readonly PDF: "pdf";
    readonly EXCEL: "excel";
    readonly CSV: "csv";
    readonly JSON: "json";
};
export declare const PROCESSING_STATUS: {
    readonly PENDING: "PENDING";
    readonly PROCESSING: "PROCESSING";
    readonly COMPLETED: "COMPLETED";
    readonly FAILED: "ERROR";
    readonly CANCELLED: "CANCELLED";
};
export declare const USER_ROLES: {
    readonly ADMIN: "ADMIN";
    readonly USER: "USER";
    readonly AUDITOR: "AUDITOR";
};
export declare const AI_CONFIG: {
    readonly RETRY_ATTEMPTS: 3;
    readonly RETRY_DELAY: 5000;
    readonly BATCH_SIZE: 10;
    readonly RATE_LIMIT: 3;
    readonly TIMEOUT: 30000;
    readonly MAX_TOKENS: 8000;
    readonly MODEL: "gpt-4";
    readonly TEMPERATURE: 0.1;
};
//# sourceMappingURL=index.d.ts.map