import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { HTTP_STATUS, MESSAGES } from '@/constants';


interface ValidationResponse {
  success: boolean;
  error?: string;
  message?: string;
  details?: string[];
  code?: number;
}

/**
 * Formata os erros de validacao em uma estrutura padronizada
 */
const formatValidationErrors = (errors: ExpressValidationError[]): ValidationResponse => {
  const errorMessages = errors.map(error => ({
    field: error.type === 'field' ? error.path : 'unknown',
    message: error.msg
  }));

  return {
    success: false,
    error: MESSAGES.ERROR.VALIDATION_ERROR,
    message: 'Erro de validacao nos dados fornecidos',
    details: errorMessages.map(e => `${e.field}: ${e.message}`),
    code: HTTP_STATUS.UNPROCESSABLE_ENTITY
  };
};

/**
 * Cria um middleware de validacao com as regras especificadas
 * @param validations Array de validações do express-validator
 * @returns Middleware de validacao configurado
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Executa todas as validações
      await Promise.all(validations.map(validation => validation.run(req)));
      
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const formattedErrors = formatValidationErrors(errors.array());
        
        // Log dos erros para debugging
        console.error('Validation failed', {
          path: req.path,
          method: req.method,
          errors: formattedErrors.details
        });
        
        res.status(formattedErrors.code || HTTP_STATUS.UNPROCESSABLE_ENTITY).json(formattedErrors);
        return;
      }
      
      next();
    } catch (error) {
      console.error('Unexpected error in validation middleware', error);
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro interno durante validacao',
        code: HTTP_STATUS.INTERNAL_SERVER_ERROR
      });
    }
  };
};

// Mantém a compatibilidade com código existente
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      
      // Log dos erros para debugging
      console.error('Validation failed', {
        path: req.path,
        method: req.method,
        errors: formattedErrors.details
      });
      
      res.status(formattedErrors.code || HTTP_STATUS.UNPROCESSABLE_ENTITY).json(formattedErrors);
      return;
    }
    
    next();
  } catch (error) {
    console.error('Unexpected error in validation middleware', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno durante validacao',
      code: HTTP_STATUS.INTERNAL_SERVER_ERROR
    });
  }
};