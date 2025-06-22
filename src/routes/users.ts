import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import prisma from '@/utils/prisma';
import { authenticateToken, requireAdmin, requireOwnershipOrAdmin } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';

import { HTTP_STATUS, MESSAGES, PAGINATION } from '@/constants';

const router = Router();

// Validação para atualização de usuário
const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'USER', 'AUDITOR'])
    .withMessage('Role deve ser ADMIN, USER ou AUDITOR'),
];

// GET /api/v1/users - Listar usuários (apenas admin)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit as string) || PAGINATION.DEFAULT_LIMIT,
      PAGINATION.MAX_LIMIT
    );
    const offset = (page - 1) * limit;

    // Buscar usuários
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

    console.log('Users listed successfully', { 
      userId: req.user?.id, 
      page, 
      limit, 
      total 
    });

    res.status(HTTP_STATUS.OK).json({
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
  } catch (error) {
    console.error('List users failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// GET /api/v1/users/:id - Buscar usuário específico
router.get('/:id', authenticateToken, requireOwnershipOrAdmin, async (req: Request, res: Response) => {
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
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Usuário não encontrado',
      });
    }

    console.log('User retrieved successfully', { 
      userId: req.user?.id, 
      targetUserId: id 
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// PUT /api/v1/users/:id - Atualizar usuário
router.put('/:id', authenticateToken, requireOwnershipOrAdmin, updateUserValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Usuário não encontrado',
      });
    }

    // Preparar dados para atualização
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && req.user?.role === 'ADMIN') updateData.role = role;
    
    if (password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(password, saltRounds);
    }

    // Atualizar usuário
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

    console.log('User updated successfully', { 
      userId: req.user?.id, 
      targetUserId: id 
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.USER_UPDATED,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// DELETE /api/v1/users/:id - Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Usuário não encontrado',
      });
    }

    // Verificar se não está tentando deletar a si mesmo
    if (req.user?.id === id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Não é possível deletar seu próprio usuário',
        message: 'Você não pode deletar sua própria conta',
      });
    }

    // Deletar usuário (cascade irá deletar sessões e documentos)
    await prisma.user.delete({
      where: { id },
    });

    console.log('User deleted successfully', { 
      userId: req.user?.id, 
      targetUserId: id 
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: MESSAGES.SUCCESS.USER_DELETED,
    });
  } catch (error) {
    console.error('Delete user failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// PATCH /api/v1/users/:id/activate - Ativar/desativar usuário (apenas admin)
router.patch('/:id/activate', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Campo isActive deve ser um boolean',
        message: 'O campo isActive é obrigatório e deve ser true ou false',
      });
    }

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Usuário não encontrado',
      });
    }

    // Atualizar status
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

    console.log('User activation status updated', { 
      userId: req.user?.id, 
      targetUserId: id, 
      isActive 
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Usuário ${isActive ? 'ativado' : 'desativado'} com sucesso`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user activation failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

export { router as usersRoutes };