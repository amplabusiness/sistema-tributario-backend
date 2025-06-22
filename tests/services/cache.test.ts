/// <reference types="jest" />
import { createClient } from 'redis';
import { CacheService } from '../../src/services/cache';

// Mock do Redis
jest.mock('redis');
const mockCreateClient = createClient as any;

describe('Cache Service', () => {
  let cacheService: CacheService;
  let mockRedisInstance: any;

  beforeEach(() => {
    mockRedisInstance = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      quit: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      isOpen: true,
      isReady: true,
      sAdd: jest.fn(),
      expire: jest.fn(),
      sMembers: jest.fn().mockResolvedValue([]),
      hSet: jest.fn(),
      hGet: jest.fn(),
      hGetAll: jest.fn().mockResolvedValue({}),
      scan: jest.fn().mockResolvedValue([]),
    };

    mockCreateClient.mockReturnValue(mockRedisInstance);
    cacheService = new CacheService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Redis successfully', async () => {
      mockRedisInstance.connect.mockResolvedValue(undefined);

      await cacheService.connect();

      expect(mockRedisInstance.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockRedisInstance.connect.mockRejectedValue(error);

      // O cache service não lança erros, apenas faz fallback para memória
      await expect(cacheService.connect()).resolves.toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis successfully', async () => {
      // Primeiro conectar para simular o estado conectado
      mockRedisInstance.connect = jest.fn().mockImplementation(async () => {
        // Simular evento 'connect' que define isConnected = true
        const connectHandler = mockRedisInstance.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
        if (connectHandler) connectHandler();
      });
      
      await cacheService.connect();
      
      mockRedisInstance.quit = jest.fn().mockResolvedValue(undefined);

      await cacheService.disconnect();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should handle disconnection errors', async () => {
      // Primeiro conectar para simular o estado conectado
      mockRedisInstance.connect = jest.fn().mockImplementation(async () => {
        // Simular evento 'connect' que define isConnected = true
        const connectHandler = mockRedisInstance.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
        if (connectHandler) connectHandler();
      });
      
      await cacheService.connect();
      
      const error = new Error('Disconnection failed');
      mockRedisInstance.quit = jest.fn().mockRejectedValue(error);

      // O cache service não lança erros, apenas loga
      await expect(cacheService.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('get', () => {
    it('should get value from cache successfully', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(value));

      const result = await cacheService.get(key);

      expect(mockRedisInstance.get).toHaveBeenCalledWith(key);
      expect(result).toBe(value);
    });

    it('should return null for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      const key = 'test-key';
      const error = new Error('Get failed');
      mockRedisInstance.get.mockRejectedValue(error);

      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value in cache successfully', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 3600;
      mockRedisInstance.setEx.mockResolvedValue('OK');

      const result = await cacheService.set(key, value, ttl);

      expect(mockRedisInstance.setEx).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
      expect(result).toBe(true);
    });

    it('should set value without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      mockRedisInstance.setEx.mockResolvedValue('OK');

      const result = await cacheService.set(key, value);

      expect(mockRedisInstance.setEx).toHaveBeenCalledWith(key, 1800, JSON.stringify(value)); // TTL padrão
      expect(result).toBe(true);
    });

    it('should handle set errors', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const error = new Error('Set failed');
      mockRedisInstance.setEx.mockRejectedValue(error);

      // O cache service faz fallback para memória em caso de erro
      const result = await cacheService.set(key, value);
      expect(result).toBe(true); // Fallback para memória sempre retorna true
    });
  });

  describe('delete', () => {
    it('should delete key from cache successfully', async () => {
      const key = 'test-key';
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await cacheService.delete(key);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisInstance.del.mockResolvedValue(0);

      const result = await cacheService.delete(key);

      expect(result).toBe(false);
    });

    it('should handle delete errors', async () => {
      const key = 'test-key';
      const error = new Error('Delete failed');
      mockRedisInstance.del.mockRejectedValue(error);

      const result = await cacheService.delete(key);
      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should check if key exists successfully', async () => {
      const key = 'test-key';
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await cacheService.exists(key);

      expect(mockRedisInstance.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const key = 'non-existent-key';
      mockRedisInstance.exists.mockResolvedValue(0);

      const result = await cacheService.exists(key);

      expect(result).toBe(false);
    });

    it('should handle exists errors', async () => {
      const key = 'test-key';
      const error = new Error('Exists failed');
      mockRedisInstance.exists.mockRejectedValue(error);

      const result = await cacheService.exists(key);
      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should get existing value from cache', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const factory = jest.fn();

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(value));

      const result = await cacheService.getOrSet(key, factory);

      expect(result).toBe(value);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should set new value when key does not exist', async () => {
      const key = 'test-key';
      const value = 'new-value';
      const factory = jest.fn().mockResolvedValue(value);

      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setEx.mockResolvedValue('OK');

      const result = await cacheService.getOrSet(key, factory);

      expect(result).toBe(value);
      expect(factory).toHaveBeenCalled();
      expect(mockRedisInstance.setEx).toHaveBeenCalledWith(key, 1800, JSON.stringify(value));
    });

    it('should set new value with TTL when key does not exist', async () => {
      const key = 'test-key';
      const value = 'new-value';
      const ttl = 3600;
      const factory = jest.fn().mockResolvedValue(value);

      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setEx.mockResolvedValue('OK');

      const result = await cacheService.getOrSet(key, factory, ttl);

      expect(result).toBe(value);
      expect(factory).toHaveBeenCalled();
      expect(mockRedisInstance.setEx).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });

    it('should handle factory errors', async () => {
      const key = 'test-key';
      const factory = jest.fn().mockRejectedValue(new Error('Factory failed'));

      mockRedisInstance.get.mockResolvedValue(null);

      await expect(cacheService.getOrSet(key, factory)).rejects.toThrow('Factory failed');
    });
  });
  describe('clear', () => {
    it('should clear all keys with pattern', async () => {
      const pattern = 'test:*';
      mockRedisInstance.keys = jest.fn().mockResolvedValue(['test:1', 'test:2']);
      mockRedisInstance.del.mockResolvedValue(2);

      const result = await cacheService.clearPattern(pattern);

      expect(result).toBe(2);
    });

    it('should handle clear errors', async () => {
      const pattern = 'test:*';
      const error = new Error('Clear failed');
      mockRedisInstance.keys = jest.fn().mockRejectedValue(error);

      const result = await cacheService.clearPattern(pattern);
      expect(result).toBe(0);
    });
  });
}); 