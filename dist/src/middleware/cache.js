"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearDocumentCache = exports.clearUserCache = exports.listCacheMiddleware = exports.documentCacheMiddleware = exports.userCacheMiddleware = exports.invalidateCache = exports.cacheMiddleware = void 0;
const cache_1 = __importStar(require("@/services/cache"));
const cacheMiddleware = (options = {}) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        if (options.condition && !options.condition(req, res)) {
            return next();
        }
        const cacheKey = options.key || cache_1.cacheUtils.generateKey('api', req.method, req.originalUrl, req.user?.id || 'anonymous');
        try {
            const cachedData = await cache_1.default.get(cacheKey);
            if (cachedData) {
                console.log('Cache hit', { key: cacheKey, url: req.originalUrl });
                return res.json(cachedData);
            }
            const originalSend = res.json;
            res.json = function (data) {
                res.json = originalSend;
                cache_1.default.setWithTags(cacheKey, data, options.tags || ['api'], options.ttl || 300).catch(error => {
                    console.log('Cache save failed', { key: cacheKey, error: error.message });
                });
                return originalSend.call(this, data);
            };
            next();
        }
        catch (error) {
            console.log('Cache middleware error', { key: cacheKey, error: error instanceof Error ? error.message : 'Unknown error' });
            next();
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
const invalidateCache = (tags) => {
    return async (req, res, next) => {
        const originalSend = res.json;
        res.json = function (data) {
            res.json = originalSend;
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache_1.default.invalidateByTags(tags).catch(error => {
                    console.log('Cache invalidation failed', { tags, error: error instanceof Error ? error.message : 'Unknown error' });
                });
            }
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.invalidateCache = invalidateCache;
exports.userCacheMiddleware = (0, exports.cacheMiddleware)({
    ttl: 1800,
    tags: ['user'],
    condition: (req) => req.user?.id !== undefined,
});
exports.documentCacheMiddleware = (0, exports.cacheMiddleware)({
    ttl: 600,
    tags: ['document'],
});
exports.listCacheMiddleware = (0, exports.cacheMiddleware)({
    ttl: 300,
    tags: ['list'],
});
const clearUserCache = async (userId) => {
    await cache_1.default.invalidateByTags([`user:${userId}`]);
};
exports.clearUserCache = clearUserCache;
const clearDocumentCache = async (documentId) => {
    await cache_1.default.invalidateByTags([`document:${documentId}`]);
};
exports.clearDocumentCache = clearDocumentCache;
//# sourceMappingURL=cache.js.map