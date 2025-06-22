"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const validation_1 = require("../middleware/validation");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
exports.authRoutes = router;
const registerValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Senha deve ter pelo menos 8 caracteres'),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Senha é obrigatória'),
];
router.post('/register', registerValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(constants_1.HTTP_STATUS.CONFLICT).json({
                success: false,
                error: 'Email já cadastrado',
                message: 'Um usuário com este email já existe',
            });
        }
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'USER',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        await prisma_1.default.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        (0, logger_1.logInfo)('User registered successfully', { userId: user.id, email: user.email });
        res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            message: constants_1.MESSAGES.SUCCESS.USER_CREATED,
            data: {
                user,
                token,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Registration failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.post('/login', loginValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.default.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.INVALID_CREDENTIALS,
                message: 'Email ou senha inválidos',
            });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.INVALID_CREDENTIALS,
                message: 'Email ou senha inválidos',
            });
        }
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        await prisma_1.default.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        const { password: _, ...userWithoutPassword } = user;
        (0, logger_1.logInfo)('User logged in successfully', { userId: user.id, email: user.email });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: userWithoutPassword,
                token,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Login failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            await prisma_1.default.session.deleteMany({
                where: { token },
            });
            (0, logger_1.logInfo)('User logged out successfully', { token });
        }
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Logout realizado com sucesso',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Logout failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Token não fornecido',
            });
        }
        const session = await prisma_1.default.session.findUnique({
            where: { token },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!session || !session.user || !session.user.isActive) {
            return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Sessão inválida ou expirada',
            });
        }
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: {
                user: session.user,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Get user profile failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
//# sourceMappingURL=auth.js.map