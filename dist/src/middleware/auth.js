"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.requireOwnershipOrAdmin = exports.requireAdminOrAuditor = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const config_1 = __importDefault(require("../config"));
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Token não fornecido',
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user || !user.isActive) {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Usuário não encontrado ou inativo',
            });
            return;
        }
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        next();
    }
    catch (error) {
        if (error instanceof Error && error.name === 'JsonWebTokenError') {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Token inválido',
            });
        }
        else if (error instanceof Error && error.name === 'TokenExpiredError') {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Token expirado',
            });
        }
        else {
            (0, logger_1.logError)('Authentication error', error instanceof Error ? error : new Error('Unknown error'));
            res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
                message: 'Erro interno do servidor',
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Usuário não autenticado',
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(constants_1.HTTP_STATUS.FORBIDDEN).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Acesso negado - permissão insuficiente',
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['ADMIN']);
exports.requireAdminOrAuditor = (0, exports.requireRole)(['ADMIN', 'AUDITOR']);
const requireOwnershipOrAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
            message: 'Usuário não autenticado',
        });
        return;
    }
    const userId = req.params.userId || req.body.userId;
    if (req.user.role === 'ADMIN' || req.user.id === userId) {
        next();
    }
    else {
        res.status(constants_1.HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
            message: 'Acesso negado - você só pode acessar seus próprios dados',
        });
    }
};
exports.requireOwnershipOrAdmin = requireOwnershipOrAdmin;
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, {
        expiresIn: config_1.default.jwt.expiresIn,
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
    }
    catch (error) {
        return null;
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.js.map