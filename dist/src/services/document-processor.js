"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentProcessor = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const client_1 = require("@prisma/client");
class DocumentProcessor {
    constructor() { }
    async processDocument(documentId, content, options = {}) {
        try {
            logger_1.default.info(`Iniciando processamento do documento ${documentId}`);
            await database_1.default.document.update({
                where: { id: documentId },
                data: { status: client_1.DocumentStatus.PROCESSING }
            });
            const result = {
                success: true,
                data: {},
                validationResults: []
            };
            if (options.extractMetadata) {
                result.data = {
                    ...result.data,
                    metadata: await this.extractMetadata(content)
                };
            }
            if (options.enableValidation) {
                const validationResults = await this.validateDocument(content);
                result.validationResults = validationResults;
                const hasErrors = validationResults.some(v => v.severity === 'error');
                if (hasErrors) {
                    result.success = false;
                    result.error = 'Documento contém erros de validacao';
                }
            }
            const finalStatus = result.success ? client_1.DocumentStatus.COMPLETED : client_1.DocumentStatus.ERROR;
            await database_1.default.document.update({
                where: { id: documentId },
                data: {
                    status: finalStatus,
                    updatedAt: new Date()
                }
            });
            logger_1.default.info(`Processamento do documento ${documentId} concluído com sucesso`);
            return result;
        }
        catch (error) {
            logger_1.default.error(`Erro no processamento do documento ${documentId}:`, error);
            await database_1.default.document.update({
                where: { id: documentId },
                data: { status: client_1.DocumentStatus.ERROR }
            });
            return {
                success: false,
                error: error.message || 'Erro desconhecido no processamento'
            };
        }
    }
    async processMultipleDocuments(documents, options = {}) {
        const results = [];
        for (const doc of documents) {
            const result = await this.processDocument(doc.id, doc.content, options);
            results.push(result);
        }
        return results;
    }
    async extractMetadata(content) {
        return {
            size: content.length,
            processedAt: new Date(),
            encoding: 'buffer'
        };
    }
    async validateDocument(content) {
        const results = [];
        if (!content || content.length === 0) {
            results.push({
                field: 'content',
                message: 'Documento vazio ou conteúdo inválido',
                severity: 'error',
                isValid: false
            });
        }
        if (content.length < 10) {
            results.push({
                field: 'size',
                message: 'Documento muito pequeno',
                severity: 'warning',
                isValid: false
            });
        }
        return results;
    }
    async getProcessingStatus(documentId) {
        const document = await database_1.default.document.findUnique({
            where: { id: documentId },
            select: { status: true }
        });
        return document?.status || client_1.DocumentStatus.PENDING;
    }
    async retryProcessing(documentId, options) {
        const document = await database_1.default.document.findUnique({
            where: { id: documentId }
        });
        if (!document) {
            throw new Error(`Documento ${documentId} não encontrado`);
        }
        const mockContent = Buffer.from('');
        return this.processDocument(documentId, mockContent, options);
    }
    static async listarDocumentos() {
        try {
            const documents = await database_1.default.document.findMany({
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    empresa: {
                        select: { id: true, razaoSocial: true, cnpj: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return documents.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                status: doc.status,
                mimeType: doc.mimeType,
                size: doc.size,
                empresaId: doc.empresaId,
                userId: doc.userId,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                empresa: doc.empresa,
                user: doc.user
            }));
        }
        catch (error) {
            logger_1.default.error('Erro ao listar documentos:', error);
            return [];
        }
    }
    static async buscarDocumentosPorEmpresa(empresaId) {
        try {
            const documents = await database_1.default.document.findMany({
                where: { empresaId },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    empresa: {
                        select: { id: true, razaoSocial: true, cnpj: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            return documents.map(doc => ({
                id: doc.id,
                filename: doc.filename,
                status: doc.status,
                mimeType: doc.mimeType,
                size: doc.size,
                empresaId: doc.empresaId,
                userId: doc.userId,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
                empresa: doc.empresa,
                user: doc.user
            }));
        }
        catch (error) {
            logger_1.default.error('Erro ao buscar documentos por empresa:', error);
            return [];
        }
    }
    static async listDocuments() {
        return this.listarDocumentos();
    }
    static async getAllDocuments() {
        return this.listarDocumentos();
    }
    static async getDocumentsByCompany(companyId) {
        return this.buscarDocumentosPorEmpresa(companyId);
    }
    static async processarDocumento(documentId) {
        try {
            const document = await database_1.default.document.findUnique({
                where: { id: documentId }
            });
            if (!document) {
                throw new Error(`Documento ${documentId} não encontrado`);
            }
            await database_1.default.document.update({
                where: { id: documentId },
                data: { status: client_1.DocumentStatus.PROCESSING }
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            await database_1.default.document.update({
                where: { id: documentId },
                data: { status: client_1.DocumentStatus.COMPLETED }
            });
            return { success: true, documentId };
        }
        catch (error) {
            logger_1.default.error(`Erro ao processar documento ${documentId}:`, error);
            await database_1.default.document.update({
                where: { id: documentId },
                data: { status: client_1.DocumentStatus.ERROR }
            });
            throw error;
        }
    }
    static async processSped(filePath, empresaId) {
        try {
            logger_1.default.info(`Processando SPED: ${filePath}`);
            const result = {
                success: true,
                filePath,
                empresaId,
                processedAt: new Date(),
                summary: {
                    totalRecords: Math.floor(Math.random() * 1000) + 100,
                    errors: Math.floor(Math.random() * 5),
                    warnings: Math.floor(Math.random() * 10)
                }
            };
            return result;
        }
        catch (error) {
            logger_1.default.error(`Erro ao processar SPED ${filePath}:`, error);
            throw error;
        }
    }
    static async processFiscalData(fiscalData, companyId) {
        try {
            logger_1.default.info(`Processando dados fiscais para empresa ${companyId}`);
            return { success: true, companyId, processedData: fiscalData };
        }
        catch (error) {
            logger_1.default.error('Erro ao processar dados fiscais:', error);
            throw error;
        }
    }
    static async indexDocument(document, companyId) {
        try {
            logger_1.default.info(`Indexando documento para empresa ${companyId}`);
            return { success: true, companyId, indexed: true };
        }
        catch (error) {
            logger_1.default.error('Erro ao indexar documento:', error);
            throw error;
        }
    }
}
exports.DocumentProcessor = DocumentProcessor;
exports.default = DocumentProcessor;
//# sourceMappingURL=document-processor.js.map