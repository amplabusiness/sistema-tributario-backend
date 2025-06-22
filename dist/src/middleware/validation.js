"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.validate = void 0;
const express_validator_1 = require("express-validator");
const constants_1 = require("@/constants");
const formatValidationErrors = (errors) => {
    const errorMessages = errors.map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg
    }));
    return {
        success: false,
        error: constants_1.MESSAGES.ERROR.VALIDATION_ERROR,
        message: 'Erro de validação nos dados fornecidos',
        details: errorMessages.map(e => `${e.field}: ${e.message}`),
        code: constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY
    };
};
const validate = (validations) => {
    return async (req, res, next) => {
        try {
            await Promise.all(validations.map(validation => validation.run(req)));
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                const formattedErrors = formatValidationErrors(errors.array());
                console.error('Validation failed', {
                    path: req.path,
                    method: req.method,
                    errors: formattedErrors.details
                });
                res.status(formattedErrors.code || constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json(formattedErrors);
                return;
            }
            next();
        }
        catch (error) {
            console.error('Unexpected error in validation middleware', error);
            res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
                message: 'Erro interno durante validação',
                code: constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR
            });
        }
    };
};
exports.validate = validate;
const validateRequest = (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            console.error('Validation failed', {
                path: req.path,
                method: req.method,
                errors: formattedErrors.details
            });
            res.status(formattedErrors.code || constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json(formattedErrors);
            return;
        }
        next();
    }
    catch (error) {
        console.error('Unexpected error in validation middleware', error);
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno durante validação',
            code: constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR
        });
    }
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map