"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_parsing_agent_1 = require("../services/agents/document-parsing-agent");
const logger_1 = require("../utils/logger");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const documentParsingAgent = new document_parsing_agent_1.DocumentParsingAgent();
router.post('/process', auth_1.authenticateToken, async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'Caminho do arquivo não fornecido' });
        }
        (0, logger_1.logInfo)(`Iniciando processamento de documento: ${filePath}`);
        const result = await documentParsingAgent.processDocument(filePath);
        return res.json({
            success: true,
            data: result,
            message: 'Documento processado com sucesso'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no processamento de documento', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/batch', auth_1.authenticateToken, async (req, res) => {
    try {
        const { filePaths } = req.body;
        if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
            return res.status(400).json({ error: 'Lista de arquivos não fornecida' });
        }
        (0, logger_1.logInfo)(`Iniciando processamento em lote: ${filePaths.length} arquivos`);
        const result = await documentParsingAgent.processBatch(filePaths);
        return res.json({
            success: true,
            data: result,
            message: `Lote processado: ${result.successCount}/${result.totalFiles} sucessos`
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no processamento em lote', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/validate/:documentId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { documentId } = req.params;
        (0, logger_1.logInfo)(`Validando documento: ${documentId}`);
        const result = await documentParsingAgent.validateAndCorrectData(documentId);
        return res.json({
            success: true,
            data: result,
            message: 'Documento validado e corrigido'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro na validação de documento', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/extract-company/:companyId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.params;
        (0, logger_1.logInfo)(`Extraindo dados cadastrais da empresa: ${companyId}`);
        const companyData = await documentParsingAgent.extractCompanyDataFromDocuments(companyId);
        return res.json({
            success: true,
            data: companyData,
            message: 'Dados cadastrais extraídos com sucesso'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro na extração de dados cadastrais', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/report', auth_1.authenticateToken, async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;
        const dateRange = startDate && endDate ? {
            start: new Date(startDate),
            end: new Date(endDate)
        } : undefined;
        (0, logger_1.logInfo)('Gerando relatório de extração', { companyId, dateRange });
        const report = await documentParsingAgent.generateExtractionReport(companyId, dateRange);
        return res.json({
            success: true,
            data: report,
            message: 'Relatório gerado com sucesso'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro na geração de relatório', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        return res.json({
            success: true,
            data: {
                agent: 'DocumentParsingAgent',
                status: 'active',
                version: '1.0.0',
                capabilities: [
                    'SPED Fiscal parsing',
                    'SPED Contribuições parsing',
                    'Excel rules parsing',
                    'PDF parsing',
                    'Automatic company registration',
                    'Data validation and correction',
                    'Batch processing',
                    'Report generation'
                ],
                supportedFormats: ['.txt', '.xlsx', '.xls', '.pdf'],
                timestamp: new Date()
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao obter status do agente', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/process-folder', auth_1.authenticateToken, async (req, res) => {
    try {
        const { folderPath } = req.body;
        if (!folderPath) {
            return res.status(400).json({ error: 'Caminho da pasta não fornecido' });
        }
        (0, logger_1.logInfo)(`Processando pasta: ${folderPath}`);
        return res.json({
            success: true,
            data: {
                folderPath,
                status: 'processing',
                message: 'Pasta em processamento'
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no processamento de pasta', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/validation-rules', auth_1.authenticateToken, async (req, res) => {
    try {
        const validationRules = {
            cnpj: {
                description: 'CNPJ deve ter 14 dígitos e ser válido',
                pattern: '^\\d{14}$',
                validation: 'Dígitos verificadores válidos'
            },
            ie: {
                description: 'IE deve ter entre 8 e 12 dígitos',
                pattern: '^\\d{8,12}$',
                validation: 'Formato básico de IE'
            },
            cfop: {
                description: 'CFOP deve ter 4 dígitos',
                pattern: '^\\d{4}$',
                validation: 'CFOP válido'
            },
            cst: {
                description: 'CST deve ter 2 ou 3 dígitos',
                pattern: '^\\d{2,3}$',
                validation: 'CST válido'
            },
            ncm: {
                description: 'NCM deve ter 8 dígitos',
                pattern: '^\\d{8}$',
                validation: 'NCM válido'
            }
        };
        return res.json({
            success: true,
            data: validationRules,
            message: 'Regras de validação'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao obter regras de validação', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.default = router;
//# sourceMappingURL=document-parsing.js.map