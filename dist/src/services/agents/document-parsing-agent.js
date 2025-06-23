"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentParsingAgent = void 0;
const document_parser_1 = require("../parsers/document-parser");
const document_indexer_1 = require("../document-indexer");
const empresa_service_1 = require("../empresa-service");
const document_processor_1 = require("../document-processor");
const cache_1 = require("../cache");
class DocumentParsingAgent {
    constructor() {
        this.documentParser = new document_parser_1.DocumentParser();
        this.documentIndexer = new document_indexer_1.DocumentIndexer();
        this.empresaService = new empresa_service_1.EmpresaService();
        this.documentProcessor = new document_processor_1.DocumentProcessor();
        this.cacheService = new cache_1.CacheService();
    }
    static getInstance() {
        if (!DocumentParsingAgent.instance) {
            DocumentParsingAgent.instance = new DocumentParsingAgent();
        }
        return DocumentParsingAgent.instance;
    }
    async parseDocument(req, res) {
        try {
            const { fileName, fileType, content, empresaId } = req.body;
            if (!fileName || !fileType || !content) {
                res.status(400).json({
                    success: false,
                    error: 'Dados obrigatorios: fileName, fileType, content'
                });
                return;
            }
            console.log(`📄 Processando documento: ${fileName} (${fileType})`);
            const tempPath = `/tmp/${fileName}`;
            require('fs').writeFileSync(tempPath, content);
            const parsedData = await this.documentParser.parseDocument(tempPath);
            await this.documentIndexer.indexarDocumento({
                userId: empresaId || '',
                tipo: fileType,
                conteudo: parsedData,
                empresaId: empresaId || ''
            });
            console.log(`✅ Documento processado: ${fileName}`);
            res.json({
                success: true,
                message: 'Documento processado com sucesso!',
                data: {
                    fileName,
                    fileType,
                    empresaId,
                    processadoEm: new Date().toISOString()
                }
            });
        }
        catch (error) {
            console.error('❌ Erro no parsing do documento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro no processamento do documento'
            });
        }
    }
    async validateDocument(req, res) {
        try {
            const { documentData } = req.body;
            console.log('🔍 Validando dados do documento...');
            const validacoes = {
                cst: this.validateCST(documentData.cst),
                cfop: this.validateCFOP(documentData.cfop),
                ncm: this.validateNCM(documentData.ncm),
                cnpj: this.validateCNPJ(documentData.cnpj)
            };
            const totalValidacoes = Object.keys(validacoes).length;
            const validacoesPassaram = Object.values(validacoes).filter(v => v.valido).length;
            console.log(`✅ Validacoes: ${validacoesPassaram}/${totalValidacoes} passaram`);
            res.json({
                success: true,
                message: 'Validacao concluida!',
                data: {
                    validacoes,
                    totalValidacoes,
                    validacoesPassaram,
                    percentualSucesso: (validacoesPassaram / totalValidacoes) * 100
                }
            });
        }
        catch (error) {
            console.error('❌ Erro na validacao:', error);
            res.status(500).json({
                success: false,
                error: 'Erro na validacao do documento'
            });
        }
    }
    validateCST(cst) {
        if (!cst || cst.length !== 2) {
            return { valido: false, erro: 'CST deve ter 2 digitos' };
        }
        return { valido: true };
    }
    validateCFOP(cfop) {
        if (!cfop || cfop.length !== 4) {
            return { valido: false, erro: 'CFOP deve ter 4 digitos' };
        }
        return { valido: true };
    }
    validateNCM(ncm) {
        if (!ncm || ncm.length !== 8) {
            return { valido: false, erro: 'NCM deve ter 8 digitos' };
        }
        return { valido: true };
    }
    validateCNPJ(cnpj) {
        if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
            return { valido: false, erro: 'CNPJ deve ter 14 digitos' };
        }
        return { valido: true };
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
            console.log(`Agente 2 iniciando processamento: ${filePath}`);
            const parsedDocument = await this.documentParser.parseDocument(filePath);
            result.documentId = parsedDocument.id;
            result.extractedData = parsedDocument;
            const companyData = parsedDocument.companyData;
            if (companyData.cnpj) {
                let empresa = await empresa_service_1.EmpresaService.getEmpresaByCnpj(companyData.cnpj);
                if (!empresa) {
                    console.log(`🏢 Registrando nova empresa: ${companyData.cnpj}`);
                    const empresaData = {
                        cnpj: companyData.cnpj,
                        razaoSocial: companyData.razaoSocial || 'Empresa não identificada',
                        nomeFantasia: companyData.nomeFantasia,
                        ie: companyData.ie,
                        im: companyData.im,
                        cnae: companyData.cnae,
                        endereco: companyData.endereco ?
                            `${companyData.endereco.logradouro}, ${companyData.endereco.numero} - ${companyData.endereco.bairro}, ${companyData.endereco.municipio}/${companyData.endereco.uf}` :
                            undefined,
                        regimeTributario: companyData.regimeTributario
                    };
                    empresa = await empresa_service_1.EmpresaService.createOrUpdateEmpresa(empresaData);
                    result.autoRegisteredCompany = true;
                }
                result.companyId = empresa.id;
            }
            const validationErrors = this.validateExtractedData(parsedDocument);
            result.validationErrors = validationErrors;
            const correctedDocument = await this.applyAutoCorrections(parsedDocument);
            result.extractedData = correctedDocument;
            await this.indexDocument(correctedDocument, result.companyId);
            await this.processFiscalData(correctedDocument, result.companyId);
            result.success = true;
            result.processingTime = Date.now() - startTime;
            console.log(`✅ Agente 2 concluído: ${filePath}`, {
                documentId: result.documentId,
                companyId: result.companyId,
                validationErrors: result.validationErrors.length,
                processingTime: result.processingTime
            });
            return result;
        }
        catch (error) {
            console.error(`❌ Erro no Agente 2: ${filePath}`, error);
            result.validationErrors.push(`Erro de processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            result.processingTime = Date.now() - startTime;
            return result;
        }
    }
    async processBatch(filePaths) {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const startTime = Date.now();
        console.log(`Agente 2 iniciando processamento em lote: ${filePaths.length} arquivos`);
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
            const results = await Promise.all(filePaths.map((filePath) => this.processDocument(filePath)));
            batchResult.results = results;
            batchResult.processedFiles = results.length;
            const companiesFound = new Set();
            const companiesRegistered = new Set();
            results.forEach((result) => {
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
            console.log(`Agente 2 lote concluído: ${batchId}`, {
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
            console.error(`Erro no processamento em lote: ${batchId}`, { error });
            throw error;
        }
    }
    async extractCompanyDataFromDocuments(companyId) {
        console.log(`Extraindo dados cadastrais da empresa: ${companyId}`);
        try {
            const documents = await document_processor_1.DocumentProcessor.getDocumentsByCompany(companyId);
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
            console.log(`Dados cadastrais consolidados para empresa: ${companyId}`, {
                dataSources,
                consolidatedFields: Object.keys(consolidatedData)
            });
            return consolidatedData;
        }
        catch (error) {
            console.error(`Erro ao extrair dados cadastrais: ${companyId}`, { error });
            throw error;
        }
    }
    async validateAndCorrectData(documentId) {
        console.log(`Validando e corrigindo dados: ${documentId}`);
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
            console.log(`Validação e correção concluída: ${documentId}`, {
                validationErrors: result.validationErrors.length,
                correctionsApplied: true
            });
            return result;
        }
        catch (error) {
            console.error(`Erro na validacao e correção: ${documentId}`, { error });
            throw error;
        }
    }
    async generateExtractionReport(companyId, dateRange) {
        console.log(`Gerando relatório de extração`, { companyId, dateRange });
        try {
            const documents = companyId ? await document_processor_1.DocumentProcessor.getDocumentsByCompany(companyId)
                : await document_processor_1.DocumentProcessor.getAllDocuments();
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
            console.log(`Relatório de extração gerado`, {
                totalDocuments: report.totalDocuments,
                companiesProcessed: report.companiesProcessed
            });
            return report;
        }
        catch (error) {
            console.error(`Erro ao gerar relatório de extração`, { error });
            throw error;
        }
    }
    async processFiscalData(parsedDocument, companyId) {
        if (!parsedDocument.fiscalData || !companyId)
            return;
        await document_processor_1.DocumentProcessor.processFiscalData(parsedDocument.fiscalData, companyId);
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
        if (companyId) {
            await document_processor_1.DocumentProcessor.indexDocument(parsedDocument, companyId);
        }
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
exports.default = DocumentParsingAgent;
//# sourceMappingURL=document-parsing-agent.js.map