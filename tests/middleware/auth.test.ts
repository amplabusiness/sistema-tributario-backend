import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../../src/middleware/auth';

// Mock do jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt as any;

// Mock do Prisma - usando o caminho correto
jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock do config
jest.mock('../../src/config', () => ({
  __esModule: true,
  default: {
    jwt: {
      secret: 'test-secret',
    },
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  let mockPrisma: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    // Limpar mocks
    jest.clearAllMocks();

    // Obter o mock do Prisma
    mockPrisma = require('../../src/utils/prisma').default;
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
      };

      const mockDecoded = { userId: '1' };

      // Mock do JWT verify
      mockJwt.verify.mockReturnValue(mockDecoded as any);

      // Mock do Prisma
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockRequest.user).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
        name: 'Test User',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Não autorizado',
        message: 'Token não fornecido',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });    it('should return 401 for invalid token format', async () => {
      // Mock do JWT verify - token com formato inválido gerará JsonWebTokenError
      const error = new Error('Invalid token format');
      error.name = 'JsonWebTokenError';
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      mockRequest.headers = {
        authorization: 'Bearer invalid-token-format',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Não autorizado',
        message: 'Token inválido',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      // Mock do JWT verify - token inválido
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Não autorizado',
        message: 'Token inválido',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });    it('should return 401 for non-existent user', async () => {
      const mockDecoded = { userId: '999' };

      // Mock do JWT verify
      mockJwt.verify.mockReturnValue(mockDecoded as any);

      // Mock do Prisma - usuário não encontrado
      mockPrisma.user.findUnique.mockResolvedValue(null);

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Não autorizado',
        message: 'Usuário não encontrado ou inativo',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });it('should handle database errors gracefully', async () => {
      const mockDecoded = { userId: '1' };

      // Mock do JWT verify
      mockJwt.verify.mockReturnValue(mockDecoded as any);

      // Mock do Prisma - erro de banco
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro interno do servidor',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
}); 