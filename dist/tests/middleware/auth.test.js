"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../../src/middleware/auth");
jest.mock('jsonwebtoken');
const mockJwt = jsonwebtoken_1.default;
jest.mock('../../src/utils/prisma', () => ({
    __esModule: true,
    default: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('../../src/config', () => ({
    __esModule: true,
    default: {
        jwt: {
            secret: 'test-secret',
        },
    },
}));
describe('Auth Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction = jest.fn();
    let mockPrisma;
    beforeEach(() => {
        mockRequest = {
            headers: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        nextFunction = jest.fn();
        jest.clearAllMocks();
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
            mockJwt.verify.mockReturnValue(mockDecoded);
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
            await (0, auth_1.authenticateToken)(mockRequest, mockResponse, nextFunction);
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
            await (0, auth_1.authenticateToken)(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Não autorizado',
                message: 'Token não fornecido',
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
        it('should return 401 for invalid token format', async () => {
            const error = new Error('Invalid token format');
            error.name = 'JsonWebTokenError';
            mockJwt.verify.mockImplementation(() => {
                throw error;
            });
            mockRequest.headers = {
                authorization: 'Bearer invalid-token-format',
            };
            await (0, auth_1.authenticateToken)(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Não autorizado',
                message: 'Token inválido',
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
        it('should return 401 for invalid token', async () => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            mockJwt.verify.mockImplementation(() => {
                throw error;
            });
            mockRequest.headers = {
                authorization: 'Bearer invalid-token',
            };
            await (0, auth_1.authenticateToken)(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Não autorizado',
                message: 'Token inválido',
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
        it('should return 401 for non-existent user', async () => {
            const mockDecoded = { userId: '999' };
            mockJwt.verify.mockReturnValue(mockDecoded);
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };
            await (0, auth_1.authenticateToken)(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Não autorizado',
                message: 'Usuário não encontrado ou inativo',
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
        it('should handle database errors gracefully', async () => {
            const mockDecoded = { userId: '1' };
            mockJwt.verify.mockReturnValue(mockDecoded);
            mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));
            mockRequest.headers = {
                authorization: 'Bearer valid-token',
            };
            await (0, auth_1.authenticateToken)(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Erro interno do servidor',
                message: 'Erro interno do servidor',
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=auth.test.js.map