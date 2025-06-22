"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheUtils = exports.cacheService = exports.CacheService = void 0;
const redis_1 = require("redis");
const constants_1 = require("@/constants");
class MemoryCache {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        const item = this.store.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expires) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }
    async set(key, value, ttl) {
        try {
            this.store.set(key, {
                value,
                expires: Date.now() + (ttl * 1000)
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async delete(key) {
        return this.store.delete(key);
    }
    async exists(key) {
        return this.store.has(key);
    }
    async clear() {
        this.store.clear();
        return true;
    }
    async getStats() {
        return {
            connected: true,
            keys: this.store.size,
            memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            info: { mode: 'memory' }
        };
    }
}
class CacheService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.useMemoryFallback = false;
        this.memoryCache = new MemoryCache();
        this.initializeRedis();
    }
    async initializeRedis() {
        try {
            this.client = (0, redis_1.createClient)({
                url: process.env['REDIS_URL'] || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            console.error('Redis connection failed, using memory fallback');
                            this.useMemoryFallback = true;
                            return false;
                        }
                        return Math.min(retries * 100, 1000);
                    },
                },
            });
            this.setupEventHandlers();
            await this.connect();
        }
        catch (error) {
            console.error('Redis initialization failed, using memory fallback', error);
            this.useMemoryFallback = true;
            this.client = null;
        }
    }
    setupEventHandlers() {
        if (!this.client)
            return;
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
    async connect() {
        if (this.useMemoryFallback || !this.client)
            return;
        try {
            if (!this.isConnected) {
                await this.client.connect();
            }
        }
        catch (error) {
            console.error('Redis connect failed, using memory fallback', error);
            this.useMemoryFallback = true;
        }
    }
    async disconnect() {
        if (this.client && this.isConnected) {
            try {
                await this.client.quit();
            }
            catch (error) {
                console.error('Redis disconnect error', error);
            }
        }
    }
    async get(key) {
        if (this.useMemoryFallback || !this.client) {
            return this.memoryCache.get(key);
        }
        try {
            await this.connect();
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Cache get error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.get(key);
        }
    }
    async set(key, value, ttl = constants_1.CACHE.TTL.MEDIUM) {
        if (this.useMemoryFallback || !this.client) {
            return this.memoryCache.set(key, value, ttl);
        }
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            return true;
        }
        catch (error) {
            console.error('Cache set error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.set(key, value, ttl);
        }
    }
    async delete(key) {
        if (this.useMemoryFallback || !this.client) {
            return this.memoryCache.delete(key);
        }
        try {
            await this.connect();
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            console.error('Cache delete error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.delete(key);
        }
    }
    async exists(key) {
        if (this.useMemoryFallback || !this.client) {
            return this.memoryCache.exists(key);
        }
        try {
            await this.connect();
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Cache exists error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.exists(key);
        }
    }
    async setWithTags(key, value, tags, ttl = constants_1.CACHE.TTL.MEDIUM) {
        if (this.useMemoryFallback || !this.client) {
            return this.memoryCache.set(key, value, ttl);
        }
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            for (const tag of tags) {
                const tagKey = `tag:${tag}`;
                await this.client.sAdd(tagKey, key);
                await this.client.expire(tagKey, ttl);
            }
            return true;
        }
        catch (error) {
            console.error('Cache setWithTags error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.set(key, value, ttl);
        }
    }
    async invalidateByTags(tags) {
        if (this.useMemoryFallback || !this.client) {
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
        }
        catch (error) {
            console.error('Cache invalidateByTags error, falling back to memory', error);
            this.useMemoryFallback = true;
            return 0;
        }
    }
    async hSet(key, field, value, ttl = constants_1.CACHE.TTL.MEDIUM) {
        if (this.useMemoryFallback || !this.client) {
            const hashKey = `${key}:${field}`;
            return this.memoryCache.set(hashKey, value, ttl);
        }
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.hSet(key, field, serializedValue);
            await this.client.expire(key, ttl);
            return true;
        }
        catch (error) {
            console.error('Cache hSet error, falling back to memory', error);
            this.useMemoryFallback = true;
            const hashKey = `${key}:${field}`;
            return this.memoryCache.set(hashKey, value, ttl);
        }
    }
    async hGet(key, field) {
        if (this.useMemoryFallback || !this.client) {
            const hashKey = `${key}:${field}`;
            return this.memoryCache.get(hashKey);
        }
        try {
            await this.connect();
            const value = await this.client.hGet(key, field);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Cache hGet error, falling back to memory', error);
            this.useMemoryFallback = true;
            const hashKey = `${key}:${field}`;
            return this.memoryCache.get(hashKey);
        }
    }
    async hGetAll(key) {
        if (this.useMemoryFallback || !this.client) {
            return null;
        }
        try {
            await this.connect();
            const values = await this.client.hGetAll(key);
            if (Object.keys(values).length === 0) {
                return null;
            }
            const result = {};
            for (const [field, value] of Object.entries(values)) {
                result[field] = JSON.parse(value);
            }
            return result;
        }
        catch (error) {
            console.error('Cache hGetAll error, falling back to memory', error);
            this.useMemoryFallback = true;
            return null;
        }
    }
    async lPush(key, value, ttl = constants_1.CACHE.TTL.MEDIUM) {
        if (this.useMemoryFallback || !this.client) {
            const existing = await this.memoryCache.get(key) || [];
            existing.unshift(value);
            return this.memoryCache.set(key, existing, ttl);
        }
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.lPush(key, serializedValue);
            await this.client.expire(key, ttl);
            return true;
        }
        catch (error) {
            console.error('Cache lPush error, falling back to memory', error);
            this.useMemoryFallback = true;
            const existing = await this.memoryCache.get(key) || [];
            existing.unshift(value);
            return this.memoryCache.set(key, existing, ttl);
        }
    }
    async lRange(key, start = 0, stop = -1) {
        if (this.useMemoryFallback || !this.client) {
            const list = await this.memoryCache.get(key) || [];
            if (stop === -1)
                stop = list.length;
            return list.slice(start, stop);
        }
        try {
            await this.connect();
            const values = await this.client.lRange(key, start, stop);
            return values.map(value => JSON.parse(value));
        }
        catch (error) {
            console.error('Cache lRange error, falling back to memory', error);
            this.useMemoryFallback = true;
            const list = await this.memoryCache.get(key) || [];
            if (stop === -1)
                stop = list.length;
            return list.slice(start, stop);
        }
    }
    async setWithTTL(key, value, ttl) {
        return this.set(key, value, ttl);
    }
    async getTTL(key) {
        if (this.useMemoryFallback || !this.client) {
            return -1;
        }
        try {
            await this.connect();
            return await this.client.ttl(key);
        }
        catch (error) {
            console.error('Cache getTTL error, falling back to memory', error);
            this.useMemoryFallback = true;
            return -1;
        }
    }
    async increment(key, value = 1, ttl = constants_1.CACHE.TTL.SHORT) {
        if (this.useMemoryFallback || !this.client) {
            const current = await this.memoryCache.get(key) || 0;
            const newValue = current + value;
            await this.memoryCache.set(key, newValue, ttl);
            return newValue;
        }
        try {
            await this.connect();
            const result = await this.client.incrBy(key, value);
            await this.client.expire(key, ttl);
            return result;
        }
        catch (error) {
            console.error('Cache increment error, falling back to memory', error);
            this.useMemoryFallback = true;
            const current = await this.memoryCache.get(key) || 0;
            const newValue = current + value;
            await this.memoryCache.set(key, newValue, ttl);
            return newValue;
        }
    }
    async decrement(key, value = 1, ttl = constants_1.CACHE.TTL.SHORT) {
        if (this.useMemoryFallback || !this.client) {
            const current = await this.memoryCache.get(key) || 0;
            const newValue = current - value;
            await this.memoryCache.set(key, newValue, ttl);
            return newValue;
        }
        try {
            await this.connect();
            const result = await this.client.decrBy(key, value);
            await this.client.expire(key, ttl);
            return result;
        }
        catch (error) {
            console.error('Cache decrement error, falling back to memory', error);
            this.useMemoryFallback = true;
            const current = await this.memoryCache.get(key) || 0;
            const newValue = current - value;
            await this.memoryCache.set(key, newValue, ttl);
            return newValue;
        }
    }
    async clear() {
        if (this.useMemoryFallback || !this.client) {
            return this.memoryCache.clear();
        }
        try {
            await this.connect();
            await this.client.flushDb();
            console.log('Cache cleared');
            return true;
        }
        catch (error) {
            console.error('Cache clear error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.clear();
        }
    }
    async clearPattern(pattern) {
        if (this.useMemoryFallback || !this.client) {
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
        }
        catch (error) {
            console.error('Cache clearPattern error, falling back to memory', error);
            this.useMemoryFallback = true;
            return 0;
        }
    }
    async getStats() {
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
        }
        catch (error) {
            console.error('Cache getStats error, falling back to memory', error);
            this.useMemoryFallback = true;
            return this.memoryCache.getStats();
        }
    }
    parseRedisInfo(info) {
        const lines = info.split('\r\n');
        const result = {};
        for (const line of lines) {
            const [key, value] = line.split(':');
            if (key && value) {
                result[key] = value;
            }
        }
        return result;
    }
    async getOrSet(key, factory, ttl = constants_1.CACHE.TTL.MEDIUM) {
        if (this.useMemoryFallback || !this.client) {
            const cached = await this.memoryCache.get(key);
            if (cached) {
                return cached;
            }
            const value = await factory();
            await this.memoryCache.set(key, value, ttl);
            return value;
        }
        try {
            await this.connect();
            const cached = await this.client.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            const value = await factory();
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            return value;
        }
        catch (error) {
            console.error('Cache getOrSet error, falling back to memory', error);
            this.useMemoryFallback = true;
            const cached = await this.memoryCache.get(key);
            if (cached) {
                return cached;
            }
            const value = await factory();
            await this.memoryCache.set(key, value, ttl);
            return value;
        }
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
exports.cacheUtils = {
    generateKey: (prefix, ...parts) => {
        return `${prefix}:${parts.join(':')}`;
    },
    userProfile: (userId) => exports.cacheUtils.generateKey('user:profile', userId),
    documentStatus: (documentId) => exports.cacheUtils.generateKey('document:status', documentId),
    batchStatus: (batchId) => exports.cacheUtils.generateKey('batch:status', batchId),
    aiResult: (contentHash) => exports.cacheUtils.generateKey('ai:result', contentHash),
    rateLimit: (identifier) => exports.cacheUtils.generateKey('rate:limit', identifier),
};
exports.default = exports.cacheService;
//# sourceMappingURL=cache.js.map