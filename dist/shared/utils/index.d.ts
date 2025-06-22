export declare const isValidEmail: (email: string) => boolean;
export declare const isValidPassword: (password: string) => boolean;
export declare const formatFileSize: (bytes: number) => string;
export declare const formatDate: (date: Date) => string;
export declare const calculatePagination: (page: number, limit: number, total: number) => {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    offset: number;
    hasNext: boolean;
    hasPrev: boolean;
};
export declare const generateCacheKey: (prefix: string, ...parts: string[]) => string;
export declare const createLogEntry: (level: "error" | "warn" | "info" | "debug", message: string, metadata?: Record<string, any>) => any;
export declare const createApiResponse: <T>(success: boolean, data?: T, error?: string, message?: string) => any;
export declare const isValidFileType: (mimeType: string) => boolean;
export declare const isValidFileSize: (size: number, maxSize: number) => boolean;
export declare const sanitizeString: (str: string) => string;
export declare const generateRandomId: () => string;
//# sourceMappingURL=index.d.ts.map