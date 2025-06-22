"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityValidator = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../../utils/logger");
class IntegrityValidator {
    constructor(config) {
        this.config = config;
    }
    async validateFile(filePath) {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            metadata: {
                size: 0,
                extension: '',
            }
        };
        try {
            if (!fs_1.default.existsSync(filePath)) {
                result.errors.push('File does not exist');
                result.isValid = false;
                return result;
            }
            const stats = fs_1.default.statSync(filePath);
            const extension = path_1.default.extname(filePath).toLowerCase();
            result.metadata.size = stats.size;
            result.metadata.extension = extension;
            if (stats.size > this.config.maxFileSize) {
                result.errors.push(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
                result.isValid = false;
            }
            if (!this.config.allowedExtensions.includes(extension)) {
                result.errors.push(`File extension ${extension} is not allowed`);
                result.isValid = false;
            }
            if (result.isValid) {
                const fileBuffer = fs_1.default.readFileSync(filePath);
                result.metadata.hash = this.calculateHash(fileBuffer);
                result.metadata.checksum = this.calculateChecksum(fileBuffer);
            }
            if (this.config.validateSignature && result.isValid) {
                const isSignatureValid = await this.validateSignature(filePath);
                if (!isSignatureValid) {
                    result.errors.push('Invalid file signature');
                    result.isValid = false;
                }
            }
        }
        catch (error) {
            result.errors.push(`Validation error: ${error.message}`);
            result.isValid = false;
            (0, logger_1.logError)('File validation error', { filePath, error: error.message });
        }
        return result;
    }
    calculateHash(buffer) {
        return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
    }
    calculateChecksum(buffer) {
        return crypto_1.default.createHash('md5').update(buffer).digest('hex');
    }
    async validateSignature(filePath) {
        return true;
    }
}
exports.IntegrityValidator = IntegrityValidator;
//# sourceMappingURL=integrity-validator.js.map