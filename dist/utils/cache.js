"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const utils_1 = require("@/utils");
const config_1 = __importDefault(require("@/config"));
const logger_1 = require("./logger");
class CacheService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            url: config_1.default.redis.url,
        });
        this.client.on('error', (err) => {
            (0, logger_1.logCache)('Redis Client Error', { error: err.message });
        });
        this.client.on('connect', () => {
            this.isConnected = true;
            (0, logger_1.logCache)('Redis connected successfully');
        });
        this.client.on('disconnect', () => {
            this.isConnected = false;
            (0, logger_1.logCache)('Redis disconnected');
        });
    }
    async connect() {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.disconnect();
        }
    }
    async get(key) {
        try {
            await this.connect();
            const value = await this.client.get(key);
            if (value) {
                (0, logger_1.logCache)('Cache hit', { key });
                return JSON.parse(value);
            }
            (0, logger_1.logCache)('Cache miss', { key });
            return null;
        }
        catch (error) {
            (0, logger_1.logCache)('Cache get error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
            return null;
        }
    }
    async set(key, value, ttl = 3600) {
        try {
            await this.connect();
            const serializedValue = JSON.stringify(value);
            await this.client.setEx(key, ttl, serializedValue);
            (0, logger_1.logCache)('Cache set', { key, ttl });
        }
        catch (error) {
            (0, logger_1.logCache)('Cache set error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async delete(key) {
        try {
            await this.connect();
            await this.client.del(key);
            (0, logger_1.logCache)('Cache delete', { key });
        }
        catch (error) {
            (0, logger_1.logCache)('Cache delete error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async exists(key) {
        try {
            await this.connect();
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            (0, logger_1.logCache)('Cache exists error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
            return false;
        }
    }
    async flush() {
        try {
            await this.connect();
            await this.client.flushAll();
            (0, logger_1.logCache)('Cache flushed');
        }
        catch (error) {
            (0, logger_1.logCache)('Cache flush error', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async getUser(userId) {
        const key = (0, utils_1.generateCacheKey)('user', userId);
        return this.get(key);
    }
    async setUser(userId, userData, ttl = 3600) {
        const key = (0, utils_1.generateCacheKey)('user', userId);
        await this.set(key, userData, ttl);
    }
    async getDocument(documentId) {
        const key = (0, utils_1.generateCacheKey)('doc', documentId);
        return this.get(key);
    }
    async setDocument(documentId, documentData, ttl = 1800) {
        const key = (0, utils_1.generateCacheKey)('doc', documentId);
        await this.set(key, documentData, ttl);
    }
    async getAIResult(resultId) {
        const key = (0, utils_1.generateCacheKey)('ai', resultId);
        return this.get(key);
    }
    async setAIResult(resultId, resultData, ttl = 7200) {
        const key = (0, utils_1.generateCacheKey)('ai', resultId);
        await this.set(key, resultData, ttl);
    }
    async getSession(sessionId) {
        const key = (0, utils_1.generateCacheKey)('session', sessionId);
        return this.get(key);
    }
    async setSession(sessionId, sessionData, ttl = 86400) {
        const key = (0, utils_1.generateCacheKey)('session', sessionId);
        await this.set(key, sessionData, ttl);
    }
    async invalidateUserCache(userId) {
        const key = (0, utils_1.generateCacheKey)('user', userId);
        await this.delete(key);
        (0, logger_1.logCache)('User cache invalidated', { userId });
    }
    async invalidateDocumentCache(documentId) {
        const key = (0, utils_1.generateCacheKey)('doc', documentId);
        await this.delete(key);
        (0, logger_1.logCache)('Document cache invalidated', { documentId });
    }
    async setWithTags(key, value, tags, ttl = 3600) {
        try {
            await this.connect();
            const serializedValue = JSON.stringify({ value, tags });
            await this.client.setEx(key, ttl, serializedValue);
            for (const tag of tags) {
                const tagKey = `tag:${tag}`;
                const existingKeys = await this.client.sMembers(tagKey);
                await this.client.sAdd(tagKey, key);
                await this.client.expire(tagKey, ttl);
            }
            (0, logger_1.logCache)('Cache set with tags', { key, tags, ttl });
        }
        catch (error) {
            (0, logger_1.logCache)('Cache set with tags error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async invalidateByTag(tag) {
        try {
            await this.connect();
            const tagKey = `tag:${tag}`;
            const keys = await this.client.sMembers(tagKey);
            if (keys.length > 0) {
                await this.client.del(...keys);
                await this.client.del(tagKey);
                (0, logger_1.logCache)('Cache invalidated by tag', { tag, keysCount: keys.length });
            }
        }
        catch (error) {
            (0, logger_1.logCache)('Cache invalidate by tag error', { tag, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
}
const cacheService = new CacheService();
exports.default = cacheService;
//# sourceMappingURL=cache.js.map