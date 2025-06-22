"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParsingAgent = void 0;
const logger_1 = require("../../utils/logger");
const document_parser_1 = require("../parsers/document-parser");
const empresa_service_1 = require("../empresa-service");
const document_processor_1 = require("../document-processor");
const cache_1 = require("../cache");
const batch_processor_1 = require("../batch-processor");
class DocumentParsingAgent {
    constructor() {
        this.documentParser = new document_parser_1.DocumentParser();
        this.empresaService = new empresa_service_1.EmpresaService();
        this.documentProcessor = new document_processor_1.DocumentProcessor();
        this.cacheService = new cache_1.CacheService();
        this.batchProcessor = new batch_processor_1.BatchProcessor();
    }
    async processDocument(filePath) {
        const startTime = Date.now();
        const result = {
            success: false,
            documentId: '',
            extractedData: {},
            validationErrors: [],
            processingTime: 0
        };
        try {
            logger_1.logger.info(`Agente 2 iniciando processamento: ${filePath}`);
            const parsedDocument = await this.documentParser.parseDocument(filePath);
            result.documentId = parsedDocument.id;
            result.extractedData = parsedDocument;
            const companyData = parsedDocument.companyData;
            if (companyData.cnpj) {
                let empresa = await this.empresaService.findByCnpj(companyData.cnpj);
                if (!empresa) {
                    logger_1.logger.info(`Empresa não encontrada, cadastrando automaticamente: ${companyData.cnpj}`);
                    empresa = await this.empresaService.createEmpresa({
                        cnpj: companyData.cnpj,
                        razaoSocial: companyData.razaoSocial || 'Empresa não identificada',
                        nomeFantasia: companyData.nomeFantasia,
                        ie: companyData.ie,
                        im: companyData.im,
                        cnae: companyData.cnae,
                        endereco: companyData.endereco,
                        regimeTributario: companyData.regimeTributario,
                        dataInicioAtividade: companyData.dataInicioAtividade,
                        dataFimAtividade: companyData.dataFimAtividade,
                        status: 'ativo'
                    });
                    result.autoRegisteredCompany = true;
                    logger_1.logger.info(`Empresa cadastrada automaticamente: ${empresa.id}`);
                }
                result.companyId = empresa.id;
            }
            if (parsedDocument.fiscalData) {
                await this.processFiscalData(parsedDocument, result.companyId);
            }
            const validationErrors = this.validateExtractedData(parsedDocument);
            result.validationErrors = validationErrors;
            await this.indexDocument(parsedDocument, result.companyId);
            await this.cacheService.set(`document:${result.documentId}`, parsedDocument, 3600);
            result.success = validationErrors.length === 0;
            result.processingTime = Date.now() - startTime;
            logger_1.logger.info(`Agente 2 concluído com sucesso: ${filePath}`, {
                documentId: result.documentId,
                companyId: result.companyId,
                autoRegistered: result.autoRegisteredCompany,
                validationErrors: result.validationErrors.length,
                processingTime: result.processingTime
            });
            return result;
        }
        catch (error) {
            result.processingTime = Date.now() - startTime;
            result.validationErrors.push(`Erro no processamento: ${error.message}`);
            logger_1.logger.error(`Erro no Agente 2: ${filePath}`, { error, result });
            return result;
        }
    }
    async processBatch(filePaths) {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const startTime = Date.now();
        logger_1.logger.info(`Agente 2 iniciando processamento em lote: ${filePaths.length} arquivos`);
        const batchResult = {
            batchId,
            totalFiles: filePaths.length,
            processedFiles: 0,
            successCount: 0,
            errorCount: 0,
            results: [],
            summary: {
                companiesFound: 0,
                companiesRegistered: 0,
                totalFaturamento: 0,
                totalImpostos: 0,
                validationErrors: 0
            }
        };
        try {
            const results = await this.batchProcessor.processBatch(filePaths, async (filePath) => {
                return await this.processDocument(filePath);
            }, 5);
            batchResult.results = results;
            batchResult.processedFiles = results.length;
            const companiesFound = new Set();
            const companiesRegistered = new Set();
            results.forEach(result => {
                if (result.success) {
                    batchResult.successCount++;
                }
                else {
                    batchResult.errorCount++;
                }
                if (result.companyId) {
                    companiesFound.add(result.companyId);
                    if (result.autoRegisteredCompany) {
                        companiesRegistered.add(result.companyId);
                    }
                }
                if (result.extractedData.fiscalData) {
                    batchResult.summary.totalFaturamento += result.extractedData.fiscalData.totalFaturamento || 0;
                    batchResult.summary.totalImpostos += result.extractedData.fiscalData.impostos.reduce((sum, imposto) => sum + imposto.valor, 0);
                }
                batchResult.summary.validationErrors += result.validationErrors.length;
            });
            batchResult.summary.companiesFound = companiesFound.size;
            batchResult.summary.companiesRegistered = companiesRegistered.size;
            await this.cacheService.set(`batch:${batchId}`, batchResult, 7200);
            logger_1.logger.info(`Agente 2 lote concluído: ${batchId}`, {
                totalFiles: batchResult.totalFiles,
                successCount: batchResult.successCount,
                errorCount: batchResult.errorCount,
                companiesFound: batchResult.summary.companiesFound,
                companiesRegistered: batchResult.summary.companiesRegistered,
                processingTime: Date.now() - startTime
            });
            return batchResult;
        }
        catch (error) {
            logger_1.logger.error(`Erro no processamento em lote: ${batchId}`, { error });
            throw error;
        }
    }
    async extractCompanyDataFromDocuments(companyId) {
        logger_1.logger.info(`Extraindo dados cadastrais da empresa: ${companyId}`);
        try {
            const documents = await this.documentProcessor.getDocumentsByCompany(companyId);
            if (documents.length === 0) {
                throw new Error(`Nenhum documento encontrado para a empresa: ${companyId}`);
            }
            const consolidatedData = {};
            const dataSources = [];
            for (const doc of documents) {
                if (doc.companyData) {
                    Object.keys(doc.companyData).forEach(key => {
                        const value = doc.companyData[key];
                        if (value && !consolidatedData[key]) {
                            consolidatedData[key] = value;
                            dataSources.push(`${key}: ${doc.fileName}`);
                        }
                    });
                }
            }
            logger_1.logger.info(`Dados cadastrais consolidados para empresa: ${companyId}`, {
                dataSources,
                consolidatedFields: Object.keys(consolidatedData)
            });
            return consolidatedData;
        }
        catch (error) {
            logger_1.logger.error(`Erro ao extrair dados cadastrais: ${companyId}`, { error });
            throw error;
        }
    }
    async validateAndCorrectData(documentId) {
        logger_1.logger.info(`Validando e corrigindo dados: ${documentId}`);
        try {
            let parsedDocument = await this.cacheService.get(`document:${documentId}`);
            if (!parsedDocument) {
                throw new Error(`Documento não encontrado: ${documentId}`);
            }
            const correctedDocument = await this.applyAutoCorrections(parsedDocument);
            const validationErrors = this.validateExtractedData(correctedDocument);
            const result = {
                success: validationErrors.length === 0,
                documentId,
                extractedData: correctedDocument,
                validationErrors,
                processingTime: 0
            };
            await this.cacheService.set(`document:${documentId}`, correctedDocument, 3600);
            logger_1.logger.info(`Validação e correção concluída: ${documentId}`, {
                validationErrors: result.validationErrors.length,
                correctionsApplied: true
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Erro na validação e correção: ${documentId}`, { error });
            throw error;
        }
    }
    async generateExtractionReport(companyId, dateRange) {
        logger_1.logger.info(`Gerando relatório de extração`, { companyId, dateRange });
        try {
            const documents = companyId
                ? await this.documentProcessor.getDocumentsByCompany(companyId)
                : await this.documentProcessor.getAllDocuments();
            const report = {
                totalDocuments: documents.length,
                companiesProcessed: new Set(documents.map(d => d.companyData?.cnpj)).size,
                documentTypes: this.countDocumentTypes(documents),
                validationSummary: this.generateValidationSummary(documents),
                fiscalDataSummary: this.generateFiscalDataSummary(documents),
                processingStats: this.generateProcessingStats(documents),
                dateRange: dateRange,
                generatedAt: new Date()
            };
            logger_1.logger.info(`Relatório de extração gerado`, {
                totalDocuments: report.totalDocuments,
                companiesProcessed: report.companiesProcessed
            });
            return report;
        }
        catch (error) {
            logger_1.logger.error(`Erro ao gerar relatório de extração`, { error });
            throw error;
        }
    }
    async processFiscalData(parsedDocument, companyId) {
        if (!parsedDocument.fiscalData || !companyId)
            return;
        await this.documentProcessor.processFiscalData(parsedDocument.fiscalData, companyId);
    }
    validateExtractedData(parsedDocument) {
        const errors = [];
        if (!parsedDocument.companyData.cnpj) {
            errors.push('CNPJ não encontrado no documento');
        }
        if (!parsedDocument.companyData.razaoSocial) {
            errors.push('Razão social não encontrada no documento');
        }
        if (parsedDocument.fiscalData) {
            if (parsedDocument.fiscalData.operacoes.length === 0) {
                errors.push('Nenhuma operação fiscal encontrada');
            }
            parsedDocument.fiscalData.operacoes.forEach((op, index) => {
                if (!op.cfop || op.cfop.length !== 4) {
                    errors.push(`CFOP inválido na operação ${index + 1}: ${op.cfop}`);
                }
            });
        }
        return errors;
    }
    async indexDocument(parsedDocument, companyId) {
        await this.documentProcessor.indexDocument(parsedDocument, companyId);
    }
    async applyAutoCorrections(parsedDocument) {
        const corrected = { ...parsedDocument };
        if (corrected.companyData.cnpj) {
            corrected.companyData.cnpj = corrected.companyData.cnpj.replace(/[^\d]/g, '');
        }
        if (corrected.companyData.ie) {
            corrected.companyData.ie = corrected.companyData.ie.replace(/[^\d]/g, '');
        }
        if (corrected.fiscalData) {
            corrected.fiscalData.operacoes = corrected.fiscalData.operacoes.map(op => ({
                ...op,
                cfop: op.cfop.padStart(4, '0')
            }));
        }
        return corrected;
    }
    countDocumentTypes(documents) {
        const types = {};
        documents.forEach(doc => {
            const type = doc.fileType || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });
        return types;
    }
    generateValidationSummary(documents) {
        const totalErrors = documents.reduce((sum, doc) => sum + (doc.validationResults?.filter((v) => !v.isValid).length || 0), 0);
        const totalWarnings = documents.reduce((sum, doc) => sum + (doc.validationResults?.filter((v) => v.severity === 'warning').length || 0), 0);
        return {
            totalErrors,
            totalWarnings,
            documentsWithErrors: documents.filter(doc => doc.validationResults?.some((v) => !v.isValid)).length
        };
    }
    generateFiscalDataSummary(documents) {
        const totalFaturamento = documents.reduce((sum, doc) => sum + (doc.fiscalData?.totalFaturamento || 0), 0);
        const totalImpostos = documents.reduce((sum, doc) => sum + (doc.fiscalData?.impostos?.reduce((impSum, imp) => impSum + imp.valor, 0) || 0), 0);
        return {
            totalFaturamento,
            totalImpostos,
            totalOperacoes: documents.reduce((sum, doc) => sum + (doc.fiscalData?.operacoes?.length || 0), 0),
            totalProdutos: documents.reduce((sum, doc) => sum + (doc.fiscalData?.produtos?.length || 0), 0)
        };
    }
    generateProcessingStats(documents) {
        const processingTimes = documents.map(doc => doc.metadata?.processingTime || 0);
        const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
        return {
            totalProcessingTime: processingTimes.reduce((sum, time) => sum + time, 0),
            averageProcessingTime: avgProcessingTime,
            fastestProcessing: Math.min(...processingTimes),
            slowestProcessing: Math.max(...processingTimes)
        };
    }
}
exports.DocumentParsingAgent = DocumentParsingAgent;
//# sourceMappingURL=document-parsing-agent.js.map