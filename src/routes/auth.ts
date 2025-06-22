import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';
import { HTTP_STATUS, MESSAGES } from '../constants';
import { validateRequest } from '../middleware/validation';
import prisma from '../utils/prisma';

const router = Router();

// Validação para registro
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres'),
];

// Validação para login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
];

// POST /api/v1/auth/register
router.post('/register', registerValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        error: 'Email já cadastrado',
        message: 'Um usuário com este email já existe',
      });
    }

    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Criar usuário
    const user = await prisma.user.create({
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

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Criar sessão
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    logInfo('User registered successfully', { userId: user.id, email: user.email });    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: MESSAGES.SUCCESS.USER_CREATED,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    logError('Registration failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// POST /api/v1/auth/login
router.post('/login', loginValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        isActive: true,
      },
    });    if (!user || !user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.INVALID_CREDENTIALS,
        message: 'Email ou senha inválidos',
      });
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.INVALID_CREDENTIALS,
        message: 'Email ou senha inválidos',
      });
    }

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Criar sessão
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    // Remover senha do response
    const { password: _, ...userWithoutPassword } = user;

    logInfo('User logged in successfully', { userId: user.id, email: user.email });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    logError('Login failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Invalidar sessão
      await prisma.session.deleteMany({
        where: { token },
      });

      logInfo('User logged out successfully', { token });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logout realizado com sucesso',
    });
  } catch (error) {
    logError('Logout failed', error instanceof Error ? error : new Error('Unknown error'));
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// GET /api/v1/auth/me
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Token não fornecido',
      });
    }

    // Buscar sessão
    const session = await prisma.session.findUnique({
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
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Sessão inválida ou expirada',
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        user: session.user,
      },
    });
  } catch (error) {
    logError('Get user profile failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

export { router as authRoutes };