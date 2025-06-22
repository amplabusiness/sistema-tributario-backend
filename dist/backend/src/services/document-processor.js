"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentProcessor = exports.DocumentProcessor = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const logger_1 = require("@/utils/logger");
const cache_1 = __importStar(require("@/services/cache"));
const queue_1 = require("@/services/queue");
const constants_1 = require("@/constants");
const icms_agent_1 = require("./agents/icms-agent");
const federal_agent_1 = require("./agents/federal-agent");
const sped_contribuicoes_parser_1 = require("./parsers/sped-contribuicoes-parser");
const sped_fiscal_parser_1 = require("./parsers/sped-fiscal-parser");
const prisma = new client_1.PrismaClient();
const CHUNKING_CONFIG = {
    MAX_TOKENS: 8000,
    OVERLAP_TOKENS: 200,
    MIN_CHUNK_SIZE: 100,
    MAX_CHUNK_SIZE: 10000,
};
const RATE_LIMIT_CONFIG = {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000,
    COOLDOWN_PERIOD: 60000,
};
class DocumentProcessor {
    constructor() {
        this.processingQueue = new Map();
        this.icmsAgent = new icms_agent_1.ICMSAgent();
        this.federalAgent = new federal_agent_1.FederalAgent();
    }
    async processDocument(documentId, userId) {
        if (this.processingQueue.has(documentId)) {
            (0, logger_1.logInfo)('Document already being processed', { documentId });
            return;
        }
        this.processingQueue.set(documentId, true);
        try {
            const document = await prisma.document.findFirst({
                where: { id: documentId, userId },
            });
            if (!document) {
                throw new Error('Document not found');
            }
            if (!fs_1.default.existsSync(document.filePath)) {
                throw new Error('File not found');
            }
            await this.updateDocumentStatus(documentId, constants_1.PROCESSING_STATUS.PROCESSING);
            let result;
            switch (document.documentType) {
                case constants_1.DOCUMENT_TYPES.XML:
                    result = await this.processXML(document.filePath);
                    break;
                case constants_1.DOCUMENT_TYPES.PDF:
                    result = await this.processPDF(document.filePath);
                    break;
                case constants_1.DOCUMENT_TYPES.EXCEL:
                    result = await this.processExcel(document.filePath);
                    break;
                case constants_1.DOCUMENT_TYPES.CSV:
                    result = await this.processCSV(document.filePath);
                    break;
                case constants_1.DOCUMENT_TYPES.JSON:
                    result = await this.processJSON(document.filePath);
                    break;
                default:
                    throw new Error(`Unsupported document type: ${document.documentType}`);
            }
            const chunks = this.createChunks(result.content, result.metadata);
            await this.saveChunks(documentId, chunks);
            await this.processChunksWithAI(documentId, chunks, userId);
            try {
                const icmsResults = await this.icmsAgent.processDocument(documentId);
                (0, logger_1.logInfo)('ICMS apuração concluída', { documentId, count: icmsResults.length });
            }
            catch (err) {
                (0, logger_1.logError)('Erro na apuração ICMS', { documentId, error: err instanceof Error ? err.message : 'Unknown error' });
            }
            try {
                const federalResults = await this.federalAgent.processDocument(documentId);
                (0, logger_1.logInfo)('Federal apuração concluída', { documentId, count: federalResults.length });
            }
            catch (err) {
                (0, logger_1.logError)('Erro na apuração Federal', { documentId, error: err instanceof Error ? err.message : 'Unknown error' });
            }
            await this.updateDocumentStatus(documentId, constants_1.PROCESSING_STATUS.COMPLETED, {
                processedAt: new Date(),
                chunksCount: chunks.length,
                totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
            });
            await cache_1.default.setWithTags(cache_1.cacheUtils.documentStatus(documentId), { status: constants_1.PROCESSING_STATUS.COMPLETED, chunks: chunks.length }, [`document:${documentId}`], 3600);
            (0, logger_1.logInfo)('Document processed successfully', {
                documentId,
                chunksCount: chunks.length,
                totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0),
            });
        }
        catch (error) {
            (0, logger_1.logError)('Document processing failed', error instanceof Error ? error : new Error('Unknown error'), {
                documentId,
                userId,
            });
            await this.updateDocumentStatus(documentId, constants_1.PROCESSING_STATUS.FAILED, {
                error: error instanceof Error ? error.message : 'Unknown error',
                failedAt: new Date(),
            });
            throw error;
        }
        finally {
            this.processingQueue.delete(documentId);
        }
    }
    async processBatch(batchId, documentIds, userId) {
        try {
            (0, logger_1.logInfo)('Starting batch processing', { batchId, documentCount: documentIds.length });
            const jobs = documentIds.map(documentId => ({
                documentId,
                filePath: '',
                documentType: '',
                userId,
                priority: 1,
            }));
            await (0, queue_1.addBatchJob)({
                batchId,
                documents: jobs,
                userId,
                priority: 2,
            });
            (0, logger_1.logInfo)('Batch job added to queue', { batchId, documentCount: documentIds.length });
        }
        catch (error) {
            (0, logger_1.logError)('Batch processing failed', error instanceof Error ? error : new Error('Unknown error'), {
                batchId,
                userId,
            });
            throw error;
        }
    }
    async processXML(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const metadata = {
            type: 'xml',
            size: content.length,
            elements: this.extractXMLElements(content),
        };
        return { content, metadata };
    }
    async processPDF(filePath) {
        const content = `PDF content extracted from ${path_1.default.basename(filePath)}`;
        const metadata = {
            type: 'pdf',
            filename: path_1.default.basename(filePath),
            pages: 1,
        };
        return { content, metadata };
    }
    async processExcel(filePath) {
        const content = `Excel content extracted from ${path_1.default.basename(filePath)}`;
        const metadata = {
            type: 'excel',
            filename: path_1.default.basename(filePath),
            sheets: 1,
        };
        return { content, metadata };
    }
    async processCSV(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const metadata = {
            type: 'csv',
            rows: lines.length,
            columns: lines[0]?.split(',').length || 0,
        };
        return { content, metadata };
    }
    async processJSON(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const metadata = {
            type: 'json',
            keys: Object.keys(parsed).length,
            structure: this.analyzeJSONStructure(parsed),
        };
        return { content: JSON.stringify(parsed, null, 2), metadata };
    }
    createChunks(content, metadata) {
        const chunks = [];
        const words = content.split(/\s+/);
        let currentChunk = [];
        let currentTokenCount = 0;
        let sequence = 0;
        for (const word of words) {
            const wordTokens = this.estimateTokenCount(word);
            if (currentTokenCount + wordTokens > CHUNKING_CONFIG.MAX_TOKENS && currentChunk.length > 0) {
                chunks.push({
                    id: `${Date.now()}-${sequence}`,
                    content: currentChunk.join(' '),
                    tokenCount: currentTokenCount,
                    metadata: { ...metadata, chunkType: 'text' },
                    sequence: sequence++,
                });
                const overlapWords = currentChunk.slice(-Math.floor(CHUNKING_CONFIG.OVERLAP_TOKENS / 10));
                currentChunk = overlapWords;
                currentTokenCount = overlapWords.reduce((sum, word) => sum + this.estimateTokenCount(word), 0);
            }
            currentChunk.push(word);
            currentTokenCount += wordTokens;
        }
        if (currentChunk.length > 0) {
            chunks.push({
                id: `${Date.now()}-${sequence}`,
                content: currentChunk.join(' '),
                tokenCount: currentTokenCount,
                metadata: { ...metadata, chunkType: 'text' },
                sequence: sequence,
            });
        }
        return chunks;
    }
    estimateTokenCount(text) {
        return Math.ceil(text.length / 4);
    }
    async saveChunks(documentId, chunks) {
        const chunkData = chunks.map(chunk => ({
            documentId,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            metadata: chunk.metadata,
            sequence: chunk.sequence,
        }));
        await prisma.documentChunk.createMany({
            data: chunkData,
        });
    }
    async processChunksWithAI(documentId, chunks, userId) {
        for (const chunk of chunks) {
            await addAIJob({
                jobId: chunk.id,
                content: chunk.content,
                model: 'gpt-4',
                userId,
                priority: 1,
            });
        }
        (0, logger_1.logInfo)('AI jobs added for chunks', {
            documentId,
            chunksCount: chunks.length,
        });
    }
    extractXMLElements(xml) {
        const elementRegex = /<(\w+)[^>]*>/g;
        const elements = [];
        let match;
        while ((match = elementRegex.exec(xml)) !== null) {
            elements.push(match[1]);
        }
        return [...new Set(elements)];
    }
    analyzeJSONStructure(obj, depth = 0) {
        if (depth > 3)
            return 'deep';
        if (typeof obj !== 'object' || obj === null)
            return typeof obj;
        if (Array.isArray(obj)) {
            return {
                type: 'array',
                length: obj.length,
                sample: obj.length > 0 ? this.analyzeJSONStructure(obj[0], depth + 1) : null,
            };
        }
        const structure = { type: 'object' };
        for (const [key, value] of Object.entries(obj)) {
            structure[key] = this.analyzeJSONStructure(value, depth + 1);
        }
        return structure;
    }
    async updateDocumentStatus(documentId, status, metadata) {
        await prisma.document.update({
            where: { id: documentId },
            data: {
                status,
                processingResult: metadata,
                updatedAt: new Date(),
            },
        });
    }
    async checkRateLimit(userId) {
        const key = cache_1.cacheUtils.rateLimit(userId);
        const currentCount = await cache_1.default.get(key) || 0;
        if (currentCount >= RATE_LIMIT_CONFIG.REQUESTS_PER_MINUTE) {
            return false;
        }
        await cache_1.default.increment(key, 1, 60);
        return true;
    }
    async getProcessingStatus(documentId) {
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                chunks: {
                    orderBy: { sequence: 'asc' },
                },
            },
        });
        if (!document) {
            return null;
        }
        return {
            id: document.id,
            status: document.status,
            progress: this.calculateProgress(document),
            chunks: document.chunks.length,
            processingResult: document.processingResult,
            errorMessage: document.errorMessage,
        };
    }
    calculateProgress(document) {
        if (document.status === constants_1.PROCESSING_STATUS.COMPLETED)
            return 100;
        if (document.status === constants_1.PROCESSING_STATUS.FAILED)
            return 0;
        if (document.status === constants_1.PROCESSING_STATUS.PROCESSING)
            return 50;
        return 0;
    }
    static async processSped(filePath, empresaId) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        let result;
        if (content.includes('|M100|') || content.includes('|M200|')) {
            const doc = sped_contribuicoes_parser_1.SpedContribuicoesParser.parseContent(content);
            const itens = sped_contribuicoes_parser_1.SpedContribuicoesParser.consolidarPisCofins(doc);
            const apuracao = sped_contribuicoes_parser_1.SpedContribuicoesParser.consolidarApuracao(doc);
            result = { tipo: 'SPED_CONTRIBUICOES', itens, apuracao };
        }
        else if (content.includes('|C100|') && content.includes('|C190|')) {
            const doc = sped_fiscal_parser_1.SpedFiscalParser.parseContent(content);
            const itens = sped_fiscal_parser_1.SpedFiscalParser.consolidarIcmsIpi(doc);
            const apuracao = sped_fiscal_parser_1.SpedFiscalParser.consolidarApuracao(doc);
            result = { tipo: 'SPED_FISCAL', itens, apuracao };
        }
        else {
            throw new Error('Tipo de arquivo SPED não reconhecido');
        }
        if (empresaId) {
            const document = await prisma.document.create({
                data: {
                    filename: path_1.default.basename(filePath),
                    originalName: path_1.default.basename(filePath),
                    size: fs_1.default.statSync(filePath).size,
                    mimeType: 'text/plain',
                    path: filePath,
                    userId: 'system',
                    empresaId,
                    metadata: { tipo: result.tipo, processado: true }
                }
            });
            if (result.tipo === 'SPED_CONTRIBUICOES') {
                await this.saveSpedContribuicoesData(document.id, empresaId, result.itens, result.apuracao);
            }
            else {
                await this.saveSpedFiscalData(document.id, empresaId, result.itens, result.apuracao);
            }
            result.documentId = document.id;
        }
        return result;
    }
    static async saveSpedContribuicoesData(documentId, empresaId, itens, apuracao) {
        for (const item of itens) {
            await prisma.spedContribuicoesItem.create({
                data: {
                    documentId,
                    empresaId,
                    documento: item.documento,
                    data: item.data,
                    cnpj: item.cnpj,
                    produto: item.produto,
                    cfop: item.cfop,
                    cst: item.cst,
                    valor: item.valor,
                    basePis: item.basePis,
                    valorPis: item.valorPis,
                    baseCofins: item.baseCofins,
                    valorCofins: item.valorCofins
                }
            });
        }
        for (const ap of apuracao) {
            await prisma.spedContribuicoesApuracao.create({
                data: {
                    documentId,
                    empresaId,
                    tipo: ap.tipo,
                    periodo: ap.periodo || '',
                    base: ap.base,
                    aliquota: ap.aliquota,
                    valor: ap.valor
                }
            });
        }
    }
    static async saveSpedFiscalData(documentId, empresaId, itens, apuracao) {
        for (const item of itens) {
            await prisma.spedFiscalItem.create({
                data: {
                    documentId,
                    empresaId,
                    documento: item.documento,
                    data: item.data,
                    cnpj: item.cnpj,
                    produto: item.produto,
                    cfop: item.cfop,
                    cst: item.cst,
                    ncm: item.ncm,
                    valor: item.valor,
                    baseIcms: item.baseIcms,
                    valorIcms: item.valorIcms,
                    baseIpi: item.baseIpi,
                    valorIpi: item.valorIpi
                }
            });
        }
        for (const ap of apuracao) {
            await prisma.spedFiscalApuracao.create({
                data: {
                    documentId,
                    empresaId,
                    cst: ap.cst,
                    cfop: ap.cfop,
                    aliquota: ap.aliquota,
                    valorOperacao: ap.valorOperacao,
                    baseIcms: ap.baseIcms,
                    valorIcms: ap.valorIcms,
                    baseIcmsSt: ap.baseIcmsSt,
                    valorIcmsSt: ap.valorIcmsSt,
                    valorRedBc: ap.valorRedBc,
                    valorIpi: ap.valorIpi
                }
            });
        }
    }
    static async listDocuments() {
        try {
            const documentos = await prisma.document.findMany({
                include: {
                    empresa: true,
                },
                orderBy: { createdAt: 'desc' },
            });
            return documentos;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao listar documentos', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
}
exports.DocumentProcessor = DocumentProcessor;
exports.documentProcessor = new DocumentProcessor();
exports.default = exports.documentProcessor;
//# sourceMappingURL=document-processor.js.map