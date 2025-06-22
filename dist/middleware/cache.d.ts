import { Request, Response, NextFunction } from 'express';
interface CacheOptions {
    ttl?: number;
    key?: string;
    tags?: string[];
    condition?: (req: Request, res: Response) => boolean;
}
export declare const cacheMiddleware: (options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const invalidateCache: (tags: string[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const userCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const documentCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const listCacheMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const clearUserCache: (userId: string) => Promise<void>;
export declare const clearDocumentCache: (documentId: string) => Promise<void>;
export {};
//# sourceMappingURL=cache.d.ts.map