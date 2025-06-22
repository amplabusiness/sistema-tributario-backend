import { createClient } from 'redis';
import config from '../config';
import { logCache } from './logger';

// Função para gerar chave de cache
const generateCacheKey = (key: string, prefix?: string): string => {
  return prefix ? `${prefix}:${key}` : key;
};

class CacheService {
  private client: ReturnType<typeof createClient>;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url,
    });

    this.client.on('error', (err) => {
      logCache('Redis Client Error', { error: err.message });
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logCache('Redis connected successfully');
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      logCache('Redis disconnected');
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      await this.connect();
      const value = await this.client.get(key);
      
      if (value) {
        logCache('Cache hit', { key });
        return JSON.parse(value);
      }
      
      logCache('Cache miss', { key });
      return null;
    } catch (error) {
      logCache('Cache get error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.connect();
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      logCache('Cache set', { key, ttl });
    } catch (error) {
      logCache('Cache set error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.connect();
      await this.client.del(key);
      logCache('Cache delete', { key });
    } catch (error) {
      logCache('Cache delete error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logCache('Cache exists error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.connect();
      await this.client.flushAll();
      logCache('Cache flushed');
    } catch (error) {
      logCache('Cache flush error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Métodos específicos para diferentes tipos de dados
  async getUser(userId: string): Promise<any> {
    const key = generateCacheKey('user', userId);
    return this.get(key);
  }

  async setUser(userId: string, userData: any, ttl: number = 3600): Promise<void> {
    const key = generateCacheKey('user', userId);
    await this.set(key, userData, ttl);
  }

  async getDocument(documentId: string): Promise<any> {
    const key = generateCacheKey('doc', documentId);
    return this.get(key);
  }

  async setDocument(documentId: string, documentData: any, ttl: number = 1800): Promise<void> {
    const key = generateCacheKey('doc', documentId);
    await this.set(key, documentData, ttl);
  }

  async getAIResult(resultId: string): Promise<any> {
    const key = generateCacheKey('ai', resultId);
    return this.get(key);
  }

  async setAIResult(resultId: string, resultData: any, ttl: number = 7200): Promise<void> {
    const key = generateCacheKey('ai', resultId);
    await this.set(key, resultData, ttl);
  }

  async getSession(sessionId: string): Promise<any> {
    const key = generateCacheKey('session', sessionId);
    return this.get(key);
  }

  async setSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<void> {
    const key = generateCacheKey('session', sessionId);
    await this.set(key, sessionData, ttl);
  }

  // Cache com invalidacao automática
  async invalidateUserCache(userId: string): Promise<void> {
    const key = generateCacheKey('user', userId);
    await this.delete(key);
    logCache('User cache invalidated', { userId });
  }

  async invalidateDocumentCache(documentId: string): Promise<void> {
    const key = generateCacheKey('doc', documentId);
    await this.delete(key);
    logCache('Document cache invalidated', { documentId });
  }

  // Cache com tags para invalidacao em lote
  async setWithTags(key: string, value: any, tags: string[], ttl: number = 3600): Promise<void> {
    try {
      await this.connect();
      const serializedValue = JSON.stringify({ value, tags });
      await this.client.setEx(key, ttl, serializedValue);
      
      // Armazenar tags para invalidacao
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const existingKeys = await this.client.sMembers(tagKey);
        await this.client.sAdd(tagKey, key);
        await this.client.expire(tagKey, ttl);
      }
      
      logCache('Cache set with tags', { key, tags, ttl });
    } catch (error) {
      logCache('Cache set with tags error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      await this.connect();
      const tagKey = `tag:${tag}`;      const keys = await this.client.sMembers(tagKey);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        await this.client.del(tagKey);
        logCache('Cache invalidated by tag', { tag, keysCount: keys.length });
      }
    } catch (error) {
      logCache('Cache invalidate by tag error', { tag, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

// Instância singleton
const cacheService = new CacheService();

export default cacheService; 