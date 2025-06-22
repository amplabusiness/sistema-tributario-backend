"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrityValidator = void 0;
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../utils/logger");
class IntegrityValidator {
    constructor() {
        this.ALGORITHM = 'sha256';
        this.BUFFER_SIZE = 64 * 1024;
        this.VALIDATIONS = {
            XML: {
                requiredTags: ['nfeProc', 'NFe', 'infNFe'],
                maxSize: 10 * 1024 * 1024,
                encoding: 'utf-8',
            },
            SPED: {
                requiredHeaders: ['|0000|', '|0001|', '|0005|'],
                maxSize: 50 * 1024 * 1024,
                encoding: 'utf-8',
            },
            PDF: {
                maxSize: 20 * 1024 * 1024,
                signature: '%PDF-',
            },
            EXCEL: {
                maxSize: 15 * 1024 * 1024,
                signatures: ['PK\x03\x04', 'PK\x05\x06'],
            },
        };
    }
    async validateFile(filePath) {
        const result = {
            isValid: true,
            checksum: '',
            errors: [],
            warnings: [],
            metadata: {
                size: 0,
                lastModified: new Date(),
                fileType: '',
            },
        };
        try {
            await this.validateBasicFile(filePath, result);
            if (!result.isValid)
                return result;
            result.checksum = await this.calculateChecksum(filePath);
            await this.validateFileType(filePath, result);
            await this.validateFiscalContent(filePath, result);
            await this.validateStructure(filePath, result);
            (0, logger_1.logInfo)('Validação de integridade concluída', {
                filePath,
                isValid: result.isValid,
                errors: result.errors.length,
                warnings: result.warnings.length,
            });
        }
        catch (error) {
            result.isValid = false;
            result.errors.push(`Erro durante validação: ${error instanceof Error ? error.message : 'Unknown error'}`);
            (0, logger_1.logError)('Erro na validação de integridade', { filePath, error });
        }
        return result;
    }
    async validateBasicFile(filePath, result) {
        try {
            const stats = fs_1.default.statSync(filePath);
            if (!stats.isFile()) {
                result.isValid = false;
                result.errors.push('Não é um arquivo válido');
                return;
            }
            if (stats.size === 0) {
                result.isValid = false;
                result.errors.push('Arquivo vazio');
                return;
            }
            if (stats.size > 100 * 1024 * 1024) {
                result.isValid = false;
                result.errors.push('Arquivo muito grande (máximo 100MB)');
                return;
            }
            result.metadata.size = stats.size;
            result.metadata.lastModified = stats.mtime;
        }
        catch (error) {
            result.isValid = false;
            result.errors.push(`Erro ao acessar arquivo: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async calculateChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto_1.default.createHash(this.ALGORITHM);
            const stream = fs_1.default.createReadStream(filePath);
            stream.on('data', (data) => {
                hash.update(data);
            });
            stream.on('end', () => {
                resolve(hash.digest('hex'));
            });
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }
    async validateFileType(filePath, result) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const content = await this.readFileHeader(filePath, 1024);
        result.metadata.fileType = ext;
        switch (ext) {
            case '.xml':
                await this.validateXML(filePath, content, result);
                break;
            case '.txt':
                await this.validateSPED(filePath, content, result);
                break;
            case '.pdf':
                await this.validatePDF(content, result);
                break;
            case '.xlsx':
            case '.xls':
                await this.validateExcel(content, result);
                break;
            default:
                result.warnings.push(`Tipo de arquivo não validado: ${ext}`);
        }
    }
    async validateXML(filePath, content, result) {
        const validation = this.VALIDATIONS.XML;
        if (result.metadata.size > validation.maxSize) {
            result.isValid = false;
            result.errors.push(`XML muito grande (máximo ${validation.maxSize / 1024 / 1024}MB)`);
        }
        if (!content.includes('<?xml') && !content.includes('<nfeProc')) {
            result.isValid = false;
            result.errors.push('Arquivo não parece ser um XML válido');
            return;
        }
        const hasRequiredTags = validation.requiredTags.some(tag => content.includes(tag));
        if (!hasRequiredTags) {
            result.warnings.push('XML não contém tags típicas de NFe');
        }
        if (content.includes('encoding="') && !content.includes(validation.encoding)) {
            result.warnings.push(`Encoding diferente do esperado: ${validation.encoding}`);
        }
    }
    async validateSPED(filePath, content, result) {
        const validation = this.VALIDATIONS.SPED;
        if (result.metadata.size > validation.maxSize) {
            result.isValid = false;
            result.errors.push(`SPED muito grande (máximo ${validation.maxSize / 1024 / 1024}MB)`);
        }
        const hasRequiredHeaders = validation.requiredHeaders.some(header => content.includes(header));
        if (!hasRequiredHeaders) {
            result.isValid = false;
            result.errors.push('Arquivo não parece ser um SPED válido');
            return;
        }
        const lines = content.split('\n');
        if (lines.length < 10) {
            result.warnings.push('SPED com poucas linhas, pode estar incompleto');
        }
        const fiscalKeywords = ['|C100|', '|C170|', '|C190|', '|D100|', '|D190|'];
        const hasFiscalData = fiscalKeywords.some(keyword => content.includes(keyword));
        if (!hasFiscalData) {
            result.warnings.push('SPED não contém dados fiscais típicos');
        }
    }
    async validatePDF(content, result) {
        const validation = this.VALIDATIONS.PDF;
        if (result.metadata.size > validation.maxSize) {
            result.isValid = false;
            result.errors.push(`PDF muito grande (máximo ${validation.maxSize / 1024 / 1024}MB)`);
        }
        if (!content.startsWith(validation.signature)) {
            result.isValid = false;
            result.errors.push('Arquivo não parece ser um PDF válido');
        }
    }
    async validateExcel(content, result) {
        const validation = this.VALIDATIONS.EXCEL;
        if (result.metadata.size > validation.maxSize) {
            result.isValid = false;
            result.errors.push(`Excel muito grande (máximo ${validation.maxSize / 1024 / 1024}MB)`);
        }
        const hasValidSignature = validation.signatures.some(signature => content.startsWith(signature));
        if (!hasValidSignature) {
            result.isValid = false;
            result.errors.push('Arquivo não parece ser um Excel válido');
        }
    }
    async validateFiscalContent(filePath, result) {
        const content = await this.readFileContent(filePath, 50000);
        const cnpjPattern = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
        const cnpjs = content.match(cnpjPattern);
        if (cnpjs && cnpjs.length > 0) {
            result.metadata.cnpj = cnpjs[0];
        }
        else {
            result.warnings.push('Nenhum CNPJ encontrado no arquivo');
        }
        const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
        const dates = content.match(datePattern);
        if (dates && dates.length > 0) {
            result.metadata.fiscalDates = dates.slice(0, 5);
        }
        const valuePattern = /R\$\s*\d+[.,]\d{2}/g;
        const values = content.match(valuePattern);
        if (values && values.length > 0) {
            result.metadata.hasMonetaryValues = true;
        }
    }
    async validateStructure(filePath, result) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        if (ext === '.xml') {
            await this.validateXMLStructure(filePath, result);
        }
        else if (ext === '.txt') {
            await this.validateSPEDStructure(filePath, result);
        }
    }
    async validateXMLStructure(filePath, result) {
        const content = await this.readFileContent(filePath, 10000);
        const openTags = (content.match(/</g) || []).length;
        const closeTags = (content.match(/>/g) || []).length;
        if (Math.abs(openTags - closeTags) > 5) {
            result.warnings.push('Possível desbalanceamento de tags XML');
        }
        if (!content.includes('</nfeProc>') && content.includes('<nfeProc')) {
            result.warnings.push('XML pode estar incompleto (falta fechamento)');
        }
    }
    async validateSPEDStructure(filePath, result) {
        const content = await this.readFileContent(filePath, 10000);
        const lines = content.split('\n');
        const invalidLines = lines.filter(line => line.trim() !== '' && !line.trim().startsWith('|'));
        if (invalidLines.length > 0) {
            result.warnings.push(`${invalidLines.length} linhas não seguem o formato SPED`);
        }
        const hasTotalizers = content.includes('|C990|') || content.includes('|D990|');
        if (!hasTotalizers) {
            result.warnings.push('SPED pode estar incompleto (falta totalizadores)');
        }
    }
    async readFileHeader(filePath, bytes) {
        return new Promise((resolve, reject) => {
            const stream = fs_1.default.createReadStream(filePath, { encoding: 'utf8' });
            let content = '';
            stream.on('data', (chunk) => {
                content += chunk;
                if (content.length >= bytes) {
                    stream.destroy();
                    resolve(content.substring(0, bytes));
                }
            });
            stream.on('end', () => {
                resolve(content);
            });
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }
    async readFileContent(filePath, maxBytes) {
        return new Promise((resolve, reject) => {
            const stream = fs_1.default.createReadStream(filePath, { encoding: 'utf8' });
            let content = '';
            stream.on('data', (chunk) => {
                content += chunk;
                if (content.length >= maxBytes) {
                    stream.destroy();
                    resolve(content.substring(0, maxBytes));
                }
            });
            stream.on('end', () => {
                resolve(content);
            });
            stream.on('error', (error) => {
                reject(error);
            });
        });
    }
}
exports.IntegrityValidator = IntegrityValidator;
//# sourceMappingURL=integrity-validator.js.map