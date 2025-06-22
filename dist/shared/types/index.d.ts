export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum UserRole {
    ADMIN = "admin",
    USER = "user",
    AUDITOR = "auditor"
}
export interface Document {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    status: DocumentStatus;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum DocumentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    ERROR = "error"
}
export interface AIProcessingResult {
    id: string;
    documentId: string;
    model: string;
    tokens: number;
    processingTime: number;
    result: any;
    error?: string;
    createdAt: Date;
}
export interface CacheConfig {
    ttl: number;
    prefix: string;
}
export interface LogEntry {
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    timestamp: Date;
    userId?: string;
    metadata?: Record<string, any>;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: Date;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface AppConfig {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
        ssl: boolean;
    };
    redis: {
        url: string;
    };
    openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
}
//# sourceMappingURL=index.d.ts.map