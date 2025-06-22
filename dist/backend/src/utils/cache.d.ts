declare class CacheService {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    exists(key: string): Promise<boolean>;
    flush(): Promise<void>;
    getUser(userId: string): Promise<any>;
    setUser(userId: string, userData: any, ttl?: number): Promise<void>;
    getDocument(documentId: string): Promise<any>;
    setDocument(documentId: string, documentData: any, ttl?: number): Promise<void>;
    getAIResult(resultId: string): Promise<any>;
    setAIResult(resultId: string, resultData: any, ttl?: number): Promise<void>;
    getSession(sessionId: string): Promise<any>;
    setSession(sessionId: string, sessionData: any, ttl?: number): Promise<void>;
    invalidateUserCache(userId: string): Promise<void>;
    invalidateDocumentCache(documentId: string): Promise<void>;
    setWithTags(key: string, value: any, tags: string[], ttl?: number): Promise<void>;
    invalidateByTag(tag: string): Promise<void>;
}
declare const cacheService: CacheService;
export default cacheService;
//# sourceMappingURL=cache.d.ts.map