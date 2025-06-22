// Utilitário de rate limiting usando Redis (ioredis)
// Permite até 3 requisições por segundo por chave (ex: usuário ou global)

import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const LIMIT = 3; // 3 requisições
const WINDOW = 1; // por 1 segundo

/**
 * Verifica se a chave pode fazer uma nova requisição (rate limit).
 * @param key Chave única (ex: userId, 'global', etc)
 * @returns boolean (true = permitido, false = bloqueado)
 */
export async function checkRateLimit(key: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000); // segundos
  const redisKey = `ratelimit:${key}:${now}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, WINDOW);
  }
  return count <= LIMIT;
} 