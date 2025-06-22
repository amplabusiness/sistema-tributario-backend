"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
const LIMIT = 3;
const WINDOW = 1;
async function checkRateLimit(key) {
    const now = Math.floor(Date.now() / 1000);
    const redisKey = `ratelimit:${key}:${now}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
        await redis.expire(redisKey, WINDOW);
    }
    return count <= LIMIT;
}
//# sourceMappingURL=rateLimiter.js.map