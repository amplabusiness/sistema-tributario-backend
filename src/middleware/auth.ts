import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import config from '../config';
import { logError } from '../utils/logger';
import { HTTP_STATUS, MESSAGES } from '../constants';

// Extend Request interface to include user
// Remove duplicate Express namespace declaration - it's already in types/index.ts

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Middleware para verificar token JWT
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Token não fornecido',
      });
      return;
    }

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;    // Verificar se o usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
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
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Usuário não encontrado ou inativo',
      });
      return;
    }    // Adicionar informações do usuário à requisição
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
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Token inválido',
      });
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Token expirado',
      });
    } else {
      logError('Authentication error', error instanceof Error ? error : new Error('Unknown error'));
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro interno do servidor',
      });
    }
  }
};

// Middleware para verificar roles específicas
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Usuário não autenticado',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: MESSAGES.ERROR.UNAUTHORIZED,
        message: 'Acesso negado - permissão insuficiente',
      });
      return;
    }

    next();
  };
};

// Middleware para verificar se é admin
export const requireAdmin = requireRole(['ADMIN']);

// Middleware para verificar se é admin ou auditor
export const requireAdminOrAuditor = requireRole(['ADMIN', 'AUDITOR']);

// Middleware para verificar se é o próprio usuário ou admin
export const requireOwnershipOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: MESSAGES.ERROR.UNAUTHORIZED,
      message: 'Usuário não autenticado',
    });
    return;
  }

  const userId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'ADMIN' || req.user.id === userId) {
    next();
  } else {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      error: MESSAGES.ERROR.UNAUTHORIZED,
      message: 'Acesso negado - você só pode acessar seus próprios dados',
    });
  }
};

// Função para gerar token JWT
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
};

// Função para verificar token sem middleware
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    return null;
  }
};