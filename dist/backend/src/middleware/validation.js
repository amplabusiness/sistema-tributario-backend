"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const constants_1 = require("@/constants");
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        res.status(constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.VALIDATION_ERROR,
            message: 'Erro de validação',
            details: errorMessages,
        });
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map