"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const icms_apurador_agent_1 = require("@/services/agents/icms-apurador-agent");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
const icmsAgent = new icms_apurador_agent_1.ICMSApuradorAgent({
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    cacheEnabled: true,
    autoExtractRules: true,
    confidenceThreshold: 70,
    maxRetries: 3,
    batchSize: 100,
});
router.post('/apurar', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('periodo').isString().matches(/^\d{2}\/\d{4}$/).withMessage('Período deve estar no formato MM/AAAA'),
    (0, express_validator_1.body)('documentos').optional().isArray().withMessage('Documentos deve ser um array'),
    (0, express_validator_1.body)('configuracoes').optional().isObject().withMessage('Configurações deve ser um objeto'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, documentos, configuracoes } = req.body;
        console.log('🚀 API: Iniciando apuração ICMS automática', {
            empresaId,
            periodo,
            documentos: documentos?.length || 0,
            userId: req.user?.id,
        });
        const apuracao = await icmsAgent.apurarICMSAutomatico(empresaId, periodo, documentos);
        console.log('✅ API: Apuração ICMS concluída', {
            apuracaoId: apuracao.id,
            status: apuracao.status,
            confianca: apuracao.confianca,
            itens: apuracao.itens.length,
        });
        res.status(200).json({
            success: true,
            message: 'Apuração ICMS executada com sucesso',
            data: {
                apuracao,
                metadata: {
                    tempoProcessamento: new Date().getTime() - new Date(apuracao.dataApuracao).getTime(),
                    regrasAplicadas: apuracao.regrasAplicadas.length,
                    itensProcessados: apuracao.itens.length,
                    confianca: apuracao.confianca,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro na apuração ICMS', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro na apuração ICMS',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/apuracoes', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
    (0, express_validator_1.query)('status').optional().isIn(['pendente', 'processando', 'concluida', 'erro']).withMessage('Status inválido'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }).withMessage('Offset deve ser >= 0'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, status, limit = 20, offset = 0 } = req.query;
        console.log('🔍 API: Consultando apurações ICMS', {
            empresaId,
            periodo,
            status,
            limit,
            offset,
            userId: req.user?.id,
        });
        const apuracoes = [];
        res.status(200).json({
            success: true,
            message: 'Apurações consultadas com sucesso',
            data: {
                apuracoes,
                pagination: {
                    limit: Number(limit),
                    offset: Number(offset),
                    total: apuracoes.length,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar apurações', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar apurações',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/apuracoes/:id', auth_1.authenticateToken, [
    (0, express_validator_1.param)('id').isString().notEmpty().withMessage('ID da apuração é obrigatório'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 API: Consultando apuração ICMS específica', {
            apuracaoId: id,
            userId: req.user?.id,
        });
        const apuracao = null;
        if (!apuracao) {
            return res.status(404).json({
                success: false,
                message: 'Apuração não encontrada',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Apuração consultada com sucesso',
            data: { apuracao },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar apuração', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(500).json({
            success: false,
            message: 'Erro ao consultar apuração',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/regras', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    (0, express_validator_1.query)('tipo').optional().isIn(['base_reduzida', 'credito_outorgado', 'protege', 'difal', 'ciap', 'st', 'isencao']).withMessage('Tipo inválido'),
    (0, express_validator_1.query)('ativo').optional().isBoolean().withMessage('Ativo deve ser boolean'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, tipo, ativo } = req.query;
        console.log('🔍 API: Consultando regras ICMS', {
            empresaId,
            tipo,
            ativo,
            userId: req.user?.id,
        });
        const regras = [];
        res.status(200).json({
            success: true,
            message: 'Regras consultadas com sucesso',
            data: {
                regras,
                total: regras.length,
                porTipo: regras.reduce((acc, regra) => {
                    acc[regra.tipo] = (acc[regra.tipo] || 0) + 1;
                    return acc;
                }, {}),
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar regras', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar regras',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/dashboard', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo } = req.query;
        console.log('📊 API: Gerando dashboard ICMS', {
            empresaId,
            periodo,
            userId: req.user?.id,
        });
        const dashboard = {
            resumo: {
                totalOperacoes: 0,
                valorTotal: 0,
                icmsDevido: 0,
                stDevido: 0,
                difalDevido: 0,
            },
            graficos: {
                porRegra: [],
                porPeriodo: [],
                porProduto: [],
            },
            alertas: [],
            confianca: 0,
        };
        res.status(200).json({
            success: true,
            message: 'Dashboard gerado com sucesso',
            data: { dashboard },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao gerar dashboard', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar dashboard',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/regras/extrair', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('documentos').isArray().withMessage('Documentos deve ser um array'),
    (0, express_validator_1.body)('configuracoes').optional().isObject().withMessage('Configurações deve ser um objeto'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, documentos, configuracoes } = req.body;
        console.log('🔍 API: Extraindo regras ICMS manualmente', {
            empresaId,
            documentos: documentos.length,
            userId: req.user?.id,
        });
        const regrasExtraidas = [];
        res.status(200).json({
            success: true,
            message: 'Regras extraídas com sucesso',
            data: {
                regras: regrasExtraidas,
                total: regrasExtraidas.length,
                confiancaMedia: regrasExtraidas.length > 0
                    ? regrasExtraidas.reduce((sum, r) => sum + r.confianca, 0) / regrasExtraidas.length
                    : 0,
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao extrair regras', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao extrair regras',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/relatorios/:apuracaoId', auth_1.authenticateToken, [
    (0, express_validator_1.param)('apuracaoId').isString().notEmpty().withMessage('ID da apuração é obrigatório'),
    (0, express_validator_1.query)('formato').optional().isIn(['pdf', 'excel', 'json']).withMessage('Formato inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { apuracaoId } = req.params;
        const { formato = 'pdf' } = req.query;
        console.log('📄 API: Gerando relatório ICMS', {
            apuracaoId,
            formato,
            userId: req.user?.id,
        });
        const relatorio = {
            apuracaoId,
            formato,
            conteudo: 'Relatório gerado automaticamente pela IA',
            dataGeracao: new Date(),
        };
        res.status(200).json({
            success: true,
            message: 'Relatório gerado com sucesso',
            data: { relatorio },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao gerar relatório', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar relatório',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
exports.default = router;
//# sourceMappingURL=icms-apuracao.js.map