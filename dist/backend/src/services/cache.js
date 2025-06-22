"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheUtils = exports.cacheService = exports.CacheService = void 0;
const redis_1 = __importDefault(require("redis"));
const logger_1 = require("@/utils/logger");
const constants_1 = require("@/constants");
class CacheService {
    constructor() {
        this.isConnected = false;
        this.client = redis_1.default.createClient({
            url: process.env['REDIS_URL'] || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        (0, logger_1.logError)('Redis connection failed after 10 retries');
                        return new Error('Redis connection failed');
                    }
                    return Math.min(retries * 100, 3000);
                },
            },
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            (0, logger_1.logInfo)('Redis connected');
            this.isConnected = true;
        });
        this.client.on('ready', () => {
            (0, logger_1.logInfo)('Redis ready');
        });
        this.client.on('error', (err) => {
            (0, logger_1.logError)('Redis error', err);
            this.isConnected = false;
        });
        this.client.on('end', () => {
            (0, logger_1.logInfo)('Redis disconnected');
            this.isConnected = false;
        });
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.quit();
        }
    }
    async get(key) {
        try {
            await this.connect();
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            (0, logger_1.logError)('Cache get error', error instanceof Error ? error : new Error('Unknown error'));
            return null;
        }
    }
    async set(key, value, ttl = constants_1.CACHE.TTL.MEDIUM) {
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Cache set error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async delete(key) {
        try {
            await this.connect();
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            (0, logger_1.logError)('Cache delete error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async exists(key) {
        try {
            await this.connect();
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            (0, logger_1.logError)('Cache exists error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async setWithTags(key, value, tags, ttl = constants_1.CACHE.TTL.MEDIUM) {
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
            (0, logger_1.logError)('Cache setWithTags error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async invalidateByTags(tags) {
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
            (0, logger_1.logInfo)('Cache invalidated by tags', { tags, totalDeleted });
            return totalDeleted;
        }
        catch (error) {
            (0, logger_1.logError)('Cache invalidateByTags error', error instanceof Error ? error : new Error('Unknown error'));
            return 0;
        }
    }
    async hSet(key, field, value, ttl = constants_1.CACHE.TTL.MEDIUM) {
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.hSet(key, field, serializedValue);
            await this.client.expire(key, ttl);
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Cache hSet error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async hGet(key, field) {
        try {
            await this.connect();
            const value = await this.client.hGet(key, field);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            (0, logger_1.logError)('Cache hGet error', error instanceof Error ? error : new Error('Unknown error'));
            return null;
        }
    }
    async hGetAll(key) {
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
            (0, logger_1.logError)('Cache hGetAll error', error instanceof Error ? error : new Error('Unknown error'));
            return null;
        }
    }
    async lPush(key, value, ttl = constants_1.CACHE.TTL.MEDIUM) {
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.lPush(key, serializedValue);
            await this.client.expire(key, ttl);
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Cache lPush error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async lRange(key, start = 0, stop = -1) {
        try {
            await this.connect();
            const values = await this.client.lRange(key, start, stop);
            return values.map(value => JSON.parse(value));
        }
        catch (error) {
            (0, logger_1.logError)('Cache lRange error', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async setWithTTL(key, value, ttl) {
        return this.set(key, value, ttl);
    }
    async getTTL(key) {
        try {
            await this.connect();
            return await this.client.ttl(key);
        }
        catch (error) {
            (0, logger_1.logError)('Cache getTTL error', error instanceof Error ? error : new Error('Unknown error'));
            return -1;
        }
    }
    async increment(key, value = 1, ttl = constants_1.CACHE.TTL.SHORT) {
        try {
            await this.connect();
            const result = await this.client.incrBy(key, value);
            await this.client.expire(key, ttl);
            return result;
        }
        catch (error) {
            (0, logger_1.logError)('Cache increment error', error instanceof Error ? error : new Error('Unknown error'));
            return 0;
        }
    }
    async decrement(key, value = 1, ttl = constants_1.CACHE.TTL.SHORT) {
        try {
            await this.connect();
            const result = await this.client.decrBy(key, value);
            await this.client.expire(key, ttl);
            return result;
        }
        catch (error) {
            (0, logger_1.logError)('Cache decrement error', error instanceof Error ? error : new Error('Unknown error'));
            return 0;
        }
    }
    async clear() {
        try {
            await this.connect();
            await this.client.flushDb();
            (0, logger_1.logInfo)('Cache cleared');
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Cache clear error', error instanceof Error ? error : new Error('Unknown error'));
            return false;
        }
    }
    async clearPattern(pattern) {
        try {
            await this.connect();
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                const deleted = await this.client.del(keys);
                (0, logger_1.logInfo)('Cache cleared by pattern', { pattern, deleted });
                return deleted;
            }
            return 0;
        }
        catch (error) {
            (0, logger_1.logError)('Cache clearPattern error', error instanceof Error ? error : new Error('Unknown error'));
            return 0;
        }
    }
    async getStats() {
        try {
            await this.connect();
            const [keys, memory, info] = await Promise.all([
                this.client.dbSize(),
                this.client.memoryUsage(),
                this.client.info(),
            ]);
            return {
                connected: this.isConnected,
                keys,
                memory: `${Math.round(memory / 1024 / 1024)}MB`,
                info: this.parseRedisInfo(info),
            };
        }
        catch (error) {
            (0, logger_1.logError)('Cache getStats error', error instanceof Error ? error : new Error('Unknown error'));
            return {
                connected: this.isConnected,
                keys: 0,
                memory: '0MB',
                info: {},
            };
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
            (0, logger_1.logError)('Cache getOrSet error', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
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