import { createClient } from 'redis';

import { CACHE } from '@/constants';

// Cache em memória como fallback
class MemoryCache {
  private store = new Map<string, { value: any; expires: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      this.store.set(key, {
        value,
        expires: Date.now() + (ttl * 1000)
      });
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async clear(): Promise<boolean> {
    this.store.clear();
    return true;
  }

  async getStats(): Promise<{ connected: boolean; keys: number; memory: string; info: any }> {
    return {
      connected: true,
      keys: this.store.size,
      memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      info: { mode: 'memory' }
    };
  }
}

export class CacheService {
  private client: ReturnType<typeof createClient> | null = null;
  private memoryCache: MemoryCache;
  private isConnected: boolean = false;
  private useMemoryFallback: boolean = false;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env['REDIS_URL'] || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              console.error('Redis connection failed, using memory fallback');
              this.useMemoryFallback = true;
              return false; // Stop trying
            }
            return Math.min(retries * 100, 1000);
          },
        },
      });

      this.setupEventHandlers();
      await this.connect();
    } catch (error) {
      console.error('Redis initialization failed, using memory fallback', error);
      this.useMemoryFallback = true;
      this.client = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
      this.useMemoryFallback = false;
    });

    this.client.on('ready', () => {
      console.log('Redis ready');
    });

    this.client.on('error', (err) => {
      console.error('Redis error, switching to memory fallback', err);
      this.isConnected = false;
      this.useMemoryFallback = true;
    });

    this.client.on('end', () => {
      console.log('Redis disconnected, using memory fallback');
      this.isConnected = false;
      this.useMemoryFallback = true;
    });
  }

  async connect(): Promise<void> {
    if (this.useMemoryFallback || !this.client) return;
    
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('Redis connect failed, using memory fallback', error);
      this.useMemoryFallback = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
      } catch (error) {
        console.error('Redis disconnect error', error);
      }
    }
  }

  // Métodos básicos de cache
  async get<T>(key: string): Promise<T | null> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryCache.get<T>(key);
    }

    try {
      await this.connect();
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.get<T>(key);
    }
  }

  async set(key: string, value: any, ttl: number = CACHE.TTL.MEDIUM): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryCache.set(key, value, ttl);
    }

    try {
      await this.connect();
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.set(key, value, ttl);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryCache.delete(key);
    }

    try {
      await this.connect();
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryCache.exists(key);
    }

    try {
      await this.connect();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.exists(key);
    }
  }

  // Cache com tags para invalidacao em lote
  async setWithTags(key: string, value: any, tags: string[], ttl: number = CACHE.TTL.MEDIUM): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, apenas salvar o valor (tags não são suportadas)
      return this.memoryCache.set(key, value, ttl);
    }

    try {
      await this.connect();
      
      // Salvar valor
      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      
      // Salvar tags
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        await this.client.sAdd(tagKey, key);
        await this.client.expire(tagKey, ttl);
      }
      
      return true;
    } catch (error) {
      console.error('Cache setWithTags error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.set(key, value, ttl);
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, não há suporte a tags, retornar 0
      return 0;
    }

    try {
      await this.connect();
      let totalDeleted = 0;
      
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const keys = await this.client.sMembers(tagKey);
        
        if (keys.length > 0) {
          const deleted = await this.client.del(keys);
          totalDeleted += deleted;
        }
        
        await this.client.del(tagKey);
      }
      
      console.log('Cache invalidated by tags', { tags, totalDeleted });
      return totalDeleted;
    } catch (error) {
      console.error('Cache invalidateByTags error, falling back to memory', error);
      this.useMemoryFallback = true;
      return 0;
    }
  }

  // Cache de hash para objetos complexos
  async hSet(key: string, field: string, value: any, ttl: number = CACHE.TTL.MEDIUM): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, salvar como objeto simples
      const hashKey = `${key}:${field}`;
      return this.memoryCache.set(hashKey, value, ttl);
    }

    try {
      await this.connect();
      const serializedValue = JSON.stringify(value);
      await this.client.hSet(key, field, serializedValue);
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache hSet error, falling back to memory', error);
      this.useMemoryFallback = true;
      const hashKey = `${key}:${field}`;
      return this.memoryCache.set(hashKey, value, ttl);
    }
  }

  async hGet<T>(key: string, field: string): Promise<T | null> {
    if (this.useMemoryFallback || !this.client) {
      const hashKey = `${key}:${field}`;
      return this.memoryCache.get<T>(hashKey);
    }

    try {
      await this.connect();
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache hGet error, falling back to memory', error);
      this.useMemoryFallback = true;
      const hashKey = `${key}:${field}`;
      return this.memoryCache.get<T>(hashKey);
    }
  }

  async hGetAll<T>(key: string): Promise<Record<string, T> | null> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, não há suporte completo a hash
      return null;
    }

    try {
      await this.connect();
      const values = await this.client.hGetAll(key);
      
      if (Object.keys(values).length === 0) {
        return null;
      }
      
      const result: Record<string, T> = {};
      for (const [field, value] of Object.entries(values)) {
        result[field] = JSON.parse(value);
      }
      
      return result;
    } catch (error) {
      console.error('Cache hGetAll error, falling back to memory', error);
      this.useMemoryFallback = true;
      return null;
    }
  }

  // Cache de listas para dados sequenciais
  async lPush(key: string, value: any, ttl: number = CACHE.TTL.MEDIUM): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, salvar como array simples
      const existing = await this.memoryCache.get<any[]>(key) || [];
      existing.unshift(value);
      return this.memoryCache.set(key, existing, ttl);
    }

    try {
      await this.connect();
      const serializedValue = JSON.stringify(value);
      await this.client.lPush(key, serializedValue);
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache lPush error, falling back to memory', error);
      this.useMemoryFallback = true;
      const existing = await this.memoryCache.get<any[]>(key) || [];
      existing.unshift(value);
      return this.memoryCache.set(key, existing, ttl);
    }
  }

  async lRange<T>(key: string, start: number = 0, stop: number = -1): Promise<T[]> {
    if (this.useMemoryFallback || !this.client) {
      const list = await this.memoryCache.get<T[]>(key) || [];
      if (stop === -1) stop = list.length;
      return list.slice(start, stop);
    }

    try {
      await this.connect();
      const values = await this.client.lRange(key, start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      console.error('Cache lRange error, falling back to memory', error);
      this.useMemoryFallback = true;
      const list = await this.memoryCache.get<T[]>(key) || [];
      if (stop === -1) stop = list.length;
      return list.slice(start, stop);
    }
  }

  // Cache com TTL personalizado
  async setWithTTL(key: string, value: any, ttl: number): Promise<boolean> {
    return this.set(key, value, ttl);
  }

  async getTTL(key: string): Promise<number> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, não há TTL específico
      return -1;
    }

    try {
      await this.connect();
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Cache getTTL error, falling back to memory', error);
      this.useMemoryFallback = true;
      return -1;
    }
  }

  // Cache de contadores
  async increment(key: string, value: number = 1, ttl: number = CACHE.TTL.SHORT): Promise<number> {
    if (this.useMemoryFallback || !this.client) {
      const current = await this.memoryCache.get<number>(key) || 0;
      const newValue = current + value;
      await this.memoryCache.set(key, newValue, ttl);
      return newValue;
    }

    try {
      await this.connect();
      const result = await this.client.incrBy(key, value);
      await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      console.error('Cache increment error, falling back to memory', error);
      this.useMemoryFallback = true;
      const current = await this.memoryCache.get<number>(key) || 0;
      const newValue = current + value;
      await this.memoryCache.set(key, newValue, ttl);
      return newValue;
    }
  }

  async decrement(key: string, value: number = 1, ttl: number = CACHE.TTL.SHORT): Promise<number> {
    if (this.useMemoryFallback || !this.client) {
      const current = await this.memoryCache.get<number>(key) || 0;
      const newValue = current - value;
      await this.memoryCache.set(key, newValue, ttl);
      return newValue;
    }

    try {
      await this.connect();
      const result = await this.client.decrBy(key, value);
      await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      console.error('Cache decrement error, falling back to memory', error);
      this.useMemoryFallback = true;
      const current = await this.memoryCache.get<number>(key) || 0;
      const newValue = current - value;
      await this.memoryCache.set(key, newValue, ttl);
      return newValue;
    }
  }

  // Limpeza de cache
  async clear(): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryCache.clear();
    }

    try {
      await this.connect();
      await this.client.flushDb();
      console.log('Cache cleared');
      return true;
    } catch (error) {
      console.error('Cache clear error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.clear();
    }
  }

  async clearPattern(pattern: string): Promise<number> {
    if (this.useMemoryFallback || !this.client) {
      // Para memória, não há suporte a patterns
      return 0;
    }

    try {
      await this.connect();
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        const deleted = await this.client.del(keys);
        console.log('Cache cleared by pattern', { pattern, deleted });
        return deleted;
      }
      
      return 0;
    } catch (error) {
      console.error('Cache clearPattern error, falling back to memory', error);
      this.useMemoryFallback = true;
      return 0;
    }
  }

  // Estatísticas do cache
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
    info: any;
  }> {
    if (this.useMemoryFallback || !this.client) {
      return this.memoryCache.getStats();
    }

    try {
      await this.connect();
      const [keys, memory, info] = await Promise.all([
        this.client.dbSize(),
        this.client.memoryUsage('all'),
        this.client.info(),
      ]);
      
      return {
        connected: this.isConnected,
        keys,
        memory: memory ? `${Math.round(memory / 1024 / 1024)}MB` : '0MB',
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      console.error('Cache getStats error, falling back to memory', error);
      this.useMemoryFallback = true;
      return this.memoryCache.getStats();
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const lines = info.split('\r\n');
    const result: Record<string, string> = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key] = value;
      }
    }
    
    return result;
  }

  // Cache com factory function (getOrSet)
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl: number = CACHE.TTL.MEDIUM
  ): Promise<T> {
    if (this.useMemoryFallback || !this.client) {
      // Tentar buscar do cache primeiro
      const cached = await this.memoryCache.get<T>(key);
      if (cached) {
        return cached;
      }
      
      // Se não existe, executar factory e salvar
      const value = await factory();
      await this.memoryCache.set(key, value, ttl);
      return value;
    }

    try {
      await this.connect();
      
      // Tentar buscar do cache primeiro
      const cached = await this.client!.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Se não existe, executar factory e salvar
      const value = await factory();
      const serializedValue = JSON.stringify(value);
      await this.client!.setEx(key, ttl, serializedValue);
      
      return value;
    } catch (error) {
      console.error('Cache getOrSet error, falling back to memory', error);
      this.useMemoryFallback = true;
      
      // Tentar buscar do cache primeiro
      const cached = await this.memoryCache.get<T>(key);
      if (cached) {
        return cached;
      }
      
      // Se não existe, executar factory e salvar
      const value = await factory();
      await this.memoryCache.set(key, value, ttl);
      return value;
    }
  }
}

// Instância singleton
export const cacheService = new CacheService();

// Funções utilitárias para cache
export const cacheUtils = {
  // Gerar chave de cache
  generateKey: (prefix: string, ...parts: any[]): string => {
    return `${prefix}:${parts.join(':')}`;
  },

  // Cache de usuário
  userProfile: (userId: string) => cacheUtils.generateKey('user:profile', userId),
  
  // Cache de documento
  documentStatus: (documentId: string) => cacheUtils.generateKey('document:status', documentId),
  
  // Cache de processamento em lote
  batchStatus: (batchId: string) => cacheUtils.generateKey('batch:status', batchId),
  
  // Cache de IA
  aiResult: (contentHash: string) => cacheUtils.generateKey('ai:result', contentHash),
  
  // Cache de rate limiting
  rateLimit: (identifier: string) => cacheUtils.generateKey('rate:limit', identifier),
};

export default cacheService; 