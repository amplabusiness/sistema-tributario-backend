// HTTP Status Codes
export const HTTP_STATUS = {
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
} as const;

// Mensagens de sucesso
export const MESSAGES = {
  SUCCESS: {
    USER_CREATED: 'Usuário criado com sucesso',
    USER_UPDATED: 'Usuário atualizado com sucesso',
    USER_DELETED: 'Usuário deletado com sucesso',
    DOCUMENT_PROCESSED: 'Documento processado com sucesso',
    BATCH_STARTED: 'Processamento em lote iniciado',
    CACHE_CLEARED: 'Cache limpo com sucesso',
  },
  ERROR: {
    VALIDATION_ERROR: 'Erro de validacao',
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
} as const;

// Configurações de paginação
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Configurações de cache
export const CACHE = {
  TTL: {
    SHORT: 300, // 5 minutos
    MEDIUM: 1800, // 30 minutos
    LONG: 3600, // 1 hora
    VERY_LONG: 86400, // 24 horas
  },
  KEYS: {
    USER_PROFILE: 'user:profile:',
    DOCUMENT_STATUS: 'document:status:',
    BATCH_STATUS: 'batch:status:',
  },
} as const;

// Configurações de rate limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  MAX_REQUESTS: 100, // 100 requisições por janela
  SKIP_SUCCESSFUL_REQUESTS: false,
  SKIP_FAILED_REQUESTS: false,
} as const;

// Configurações de JWT
export const JWT = {
  SECRET: process.env.JWT_SECRET || 'your-secret-key',
  EXPIRES_IN: '24h',
  REFRESH_EXPIRES_IN: '7d',
} as const;

// Configurações de upload
export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
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
} as const;

// Configurações de processamento em lote
export const BATCH = {
  CONCURRENCY: 5,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 segundos
  TIMEOUT: 300000, // 5 minutos
} as const;

// Tipos de documentos
export const DOCUMENT_TYPES = {
  XML: 'xml',
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json',
} as const;

// Status de processamento
export const PROCESSING_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'ERROR',
  CANCELLED: 'CANCELLED',
} as const;

// Roles de usuário
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  AUDITOR: 'AUDITOR',
} as const;

// Configurações de IA
export const AI_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 segundos
  BATCH_SIZE: 10,
  RATE_LIMIT: 3, // 3 requests por segundo
  TIMEOUT: 30000, // 30 segundos
  MAX_TOKENS: 8000,
  MODEL: 'gpt-4',
  TEMPERATURE: 0.1,
} as const;