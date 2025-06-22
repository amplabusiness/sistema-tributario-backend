import { Request, Response, NextFunction } from 'express';
import cacheService, { cacheUtils } from '@/services/cache';


interface CacheOptions {
  ttl?: number;
  key?: string;
  tags?: string[];
  condition?: (req: Request, res: Response) => boolean;
}

export const cacheMiddleware = (options: CacheOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Pular cache se não for GET
    if (req.method !== 'GET') {
      return next();
    }

    // Verificar condição personalizada
    if (options.condition && !options.condition(req, res)) {
      return next();
    }

    // Gerar chave de cache
    const cacheKey = options.key || cacheUtils.generateKey(
      'api',
      req.method,
      req.originalUrl,
      req.user?.id || 'anonymous'
    );

    try {
      // Tentar buscar do cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        console.log('Cache hit', { key: cacheKey, url: req.originalUrl });
        return res.json(cachedData);
      }

      // Cache miss - interceptar resposta
      const originalSend = res.json;
      res.json = function(data: any) {
        // Restaurar método original
        res.json = originalSend;
        
        // Salvar no cache
        cacheService.setWithTags(
          cacheKey,
          data,
          options.tags || ['api'],
          options.ttl || 300 // 5 minutos padrão
        ).catch(error => {
          console.log('Cache save failed', { key: cacheKey, error: error.message });
        });
        
        // Enviar resposta
        return originalSend.call(this, data);
      };

      next();
    } catch (error) {
      console.log('Cache middleware error', { key: cacheKey, error: error instanceof Error ? error.message : 'Unknown error' });
      next();
    }
  };
};

// Middleware para invalidar cache
export const invalidateCache = (tags: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    
    res.json = function(data: any) {
      // Restaurar método original
      res.json = originalSend;
      
      // Invalidar cache após resposta bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.invalidateByTags(tags).catch(error => {
          console.log('Cache invalidation failed', { tags, error: error instanceof Error ? error.message : 'Unknown error' });
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware para cache de usuário
export const userCacheMiddleware = cacheMiddleware({
  ttl: 1800, // 30 minutos
  tags: ['user'],
  condition: (req) => req.user?.id !== undefined,
});

// Middleware para cache de documentos
export const documentCacheMiddleware = cacheMiddleware({
  ttl: 600, // 10 minutos
  tags: ['document'],
});

// Middleware para cache de listagens
export const listCacheMiddleware = cacheMiddleware({
  ttl: 300, // 5 minutos
  tags: ['list'],
});

// Função para limpar cache específico
export const clearUserCache = async (userId: string) => {
  await cacheService.invalidateByTags([`user:${userId}`]);
};

export const clearDocumentCache = async (documentId: string) => {
  await cacheService.invalidateByTags([`document:${documentId}`]);
}; 