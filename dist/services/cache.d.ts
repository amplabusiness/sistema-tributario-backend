export declare class CacheService {
    private client;
    private isConnected;
    constructor();
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<boolean>;
    invalidateByTags(tags: string[]): Promise<number>;
    hSet(key: string, field: string, value: any, ttl?: number): Promise<boolean>;
    hGet<T>(key: string, field: string): Promise<T | null>;
    hGetAll<T>(key: string): Promise<Record<string, T> | null>;
    lPush(key: string, value: any, ttl?: number): Promise<boolean>;
    lRange<T>(key: string, start?: number, stop?: number): Promise<T[]>;
    setWithTTL(key: string, value: any, ttl: number): Promise<boolean>;
    getTTL(key: string): Promise<number>;
    increment(key: string, value?: number, ttl?: number): Promise<number>;
    decrement(key: string, value?: number, ttl?: number): Promise<number>;
    clear(): Promise<boolean>;
    clearPattern(pattern: string): Promise<number>;
    getStats(): Promise<{
        connected: boolean;
        keys: number;
        memory: string;
        info: any;
    }>;
    private parseRedisInfo;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
}
export declare const cacheService: CacheService;
export declare const cacheUtils: {
    generateKey: (prefix: string, ...parts: any[]) => string;
    userProfile: (userId: string) => string;
    documentStatus: (documentId: string) => string;
    batchStatus: (batchId: string) => string;
    aiResult: (contentHash: string) => string;
    rateLimit: (identifier: string) => string;
};
export default cacheService;
//# sourceMappingURL=cache.d.ts.map