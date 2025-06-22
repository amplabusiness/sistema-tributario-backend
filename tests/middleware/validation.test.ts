/// <reference path="../../src/types/jest.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { validateRequest } from '../../src/middleware/validation';
import { HTTP_STATUS, MESSAGES } from '../../src/constants';
import { logError } from '../../src/utils/logger';

// Tipagem para MockedFunction
type MockedFunction<T extends (...args: any[]) => any> = jest.MockedFunction<T>;

// Mock do express-validator
jest.mock('express-validator', () => ({
  validationResult: jest.fn()
}));

// Mock do logger
jest.mock('../../src/utils/logger', () => ({
  logError: jest.fn(),
}));

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  let mockValidationResult: MockedFunction<typeof validationResult>;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'POST'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockValidationResult = validationResult as MockedFunction<typeof validationResult>;
    jest.clearAllMocks();
  });

  it('should pass validation when there are no errors', () => {
    const mockResult = {
      isEmpty: () => true,
      array: () => []
    };

    mockValidationResult.mockReturnValue(mockResult);

    validateRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it('should return validation error response when there are errors', () => {
    const validationErrors: Partial<ValidationError>[] = [
      {
        type: 'field',
        path: 'email',
        msg: 'Email inválido',
        location: 'body',
        value: ''
      },
      {
        type: 'field',
        path: 'password',
        msg: 'Senha muito curta',
        location: 'body',
        value: '123'
      }
    ];

    const mockResult = {
      isEmpty: () => false,
      array: () => validationErrors
    };

    mockValidationResult.mockReturnValue(mockResult);

    validateRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: MESSAGES.ERROR.VALIDATION_ERROR,
      message: 'Erro de validação nos dados fornecidos',
      details: [
        'email: Email inválido',
        'password: Senha muito curta'
      ],
      code: HTTP_STATUS.UNPROCESSABLE_ENTITY,
    });
    
    expect(logError).toHaveBeenCalledWith('Validation failed', {
      path: '/test',
      method: 'POST',
      errors: [
        'email: Email inválido',
        'password: Senha muito curta'
      ]
    });
  });

  it('should handle unexpected errors gracefully', () => {
    mockValidationResult.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    validateRequest(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith(
      'Unexpected error in validation middleware',
      expect.any(Error)
    );
    expect(mockResponse.status).toHaveBeenCalledWith(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno durante validação',
      code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    });
  });
});
