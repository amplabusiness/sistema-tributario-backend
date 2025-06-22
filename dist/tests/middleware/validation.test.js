"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const validation_1 = require("../../src/middleware/validation");
const constants_1 = require("../../src/constants");
const logger_1 = require("../../src/utils/logger");
jest.mock('express-validator', () => ({
    validationResult: jest.fn()
}));
jest.mock('../../src/utils/logger', () => ({
    logError: jest.fn(),
}));
describe('Validation Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction = jest.fn();
    let mockValidationResult;
    beforeEach(() => {
        mockRequest = {
            path: '/test',
            method: 'POST'
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockValidationResult = express_validator_1.validationResult;
        jest.clearAllMocks();
    });
    it('should pass validation when there are no errors', () => {
        const mockResult = {
            isEmpty: () => true,
            array: () => []
        };
        mockValidationResult.mockReturnValue(mockResult);
        (0, validation_1.validateRequest)(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
        expect(mockResponse.json).not.toHaveBeenCalled();
    });
    it('should return validation error response when there are errors', () => {
        const validationErrors = [
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
        (0, validation_1.validateRequest)(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).not.toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: false,
            error: constants_1.MESSAGES.ERROR.VALIDATION_ERROR,
            message: 'Erro de validação nos dados fornecidos',
            details: [
                'email: Email inválido',
                'password: Senha muito curta'
            ],
            code: constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY,
        });
        expect(logger_1.logError).toHaveBeenCalledWith('Validation failed', {
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
        (0, validation_1.validateRequest)(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).not.toHaveBeenCalled();
        expect(logger_1.logError).toHaveBeenCalledWith('Unexpected error in validation middleware', expect.any(Error));
        expect(mockResponse.status).toHaveBeenCalledWith(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno durante validação',
            code: constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR,
        });
    });
});
//# sourceMappingURL=validation.test.js.map