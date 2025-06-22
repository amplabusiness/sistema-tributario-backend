"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const logger_1 = require("@/utils/logger");
const constants_1 = require("@/constants");
const router = (0, express_1.Router)();
exports.usersRoutes = router;
const prisma = new client_1.PrismaClient();
const updateUserValidation = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    (0, express_validator_1.body)('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    (0, express_validator_1.body)('password')
        .optional()
        .isLength({ min: 8 })
        .withMessage('Senha deve ter pelo menos 8 caracteres'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['ADMIN', 'USER', 'AUDITOR'])
        .withMessage('Role deve ser ADMIN, USER ou AUDITOR'),
];
router.get('/', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || constants_1.PAGINATION.DEFAULT_PAGE;
        const limit = Math.min(parseInt(req.query.limit) || constants_1.PAGINATION.DEFAULT_LIMIT, constants_1.PAGINATION.MAX_LIMIT);
        const offset = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.user.count(),
        ]);
        const totalPages = Math.ceil(total / limit);
        (0, logger_1.logInfo)('Users listed successfully', {
            userId: req.user?.id,
            page,
            limit,
            total
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('List users failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/:id', auth_1.authenticateToken, auth_1.requireOwnershipOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
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
        if (!user) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Usuário não encontrado',
            });
        }
        (0, logger_1.logInfo)('User retrieved successfully', {
            userId: req.user?.id,
            targetUserId: id
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Get user failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.put('/:id', auth_1.authenticateToken, auth_1.requireOwnershipOrAdmin, updateUserValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role } = req.body;
        const existingUser = await prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Usuário não encontrado',
            });
        }
        const updateData = {};
        if (name)
            updateData.name = name;
        if (email)
            updateData.email = email;
        if (role && req.user?.role === 'ADMIN')
            updateData.role = role;
        if (password) {
            const saltRounds = 12;
            updateData.password = await bcryptjs_1.default.hash(password, saltRounds);
        }
        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
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
        (0, logger_1.logInfo)('User updated successfully', {
            userId: req.user?.id,
            targetUserId: id
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: constants_1.MESSAGES.SUCCESS.USER_UPDATED,
            data: updatedUser,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Update user failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const existingUser = await prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Usuário não encontrado',
            });
        }
        if (req.user?.id === id) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Não é possível deletar seu próprio usuário',
                message: 'Você não pode deletar sua própria conta',
            });
        }
        await prisma.user.delete({
            where: { id },
        });
        (0, logger_1.logInfo)('User deleted successfully', {
            userId: req.user?.id,
            targetUserId: id
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: constants_1.MESSAGES.SUCCESS.USER_DELETED,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Delete user failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.patch('/:id/activate', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (typeof isActive !== 'boolean') {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Campo isActive deve ser um boolean',
                message: 'O campo isActive é obrigatório e deve ser true ou false',
            });
        }
        const existingUser = await prisma.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Usuário não encontrado',
            });
        }
        const updatedUser = await prisma.user.update({
            where: { id },
            data: { isActive },
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
        (0, logger_1.logInfo)('User activation status updated', {
            userId: req.user?.id,
            targetUserId: id,
            isActive
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
            data: updatedUser,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Update user activation failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
//# sourceMappingURL=users.js.map