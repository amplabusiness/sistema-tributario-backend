"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const precificacao_margem_agent_1 = require("@/services/agents/precificacao-margem-agent");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
const precificacaoAgent = new precificacao_margem_agent_1.PrecificacaoMargemAgent({
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    cacheEnabled: true,
    margemMinima: 15,
    margemIdeal: 25,
    margemMaxima: 50,
    confidenceThreshold: 70,
    maxRetries: 3,
    batchSize: 100,
});
router.post('/analisar', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('periodo').isString().matches(/^\d{2}\/\d{4}$/).withMessage('Período deve estar no formato MM/AAAA'),
    (0, express_validator_1.body)('produtos').optional().isArray().withMessage('Produtos deve ser um array'),
    (0, express_validator_1.body)('configuracoes').optional().isObject().withMessage('Configurações deve ser um objeto'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, produtos, configuracoes } = req.body;
        console.log('🚀 API: Iniciando analise de precificacao automática', {
            empresaId,
            periodo,
            produtos: produtos?.length || 0,
            userId: req.user?.id,
        });
        const dashboard = await precificacaoAgent.analisarPrecificacaoAutomatico(empresaId, periodo, produtos);
        console.log('✅ API: Análise de precificacao concluída', {
            dashboardId: dashboard.id,
            status: dashboard.status,
            confianca: dashboard.confianca,
            produtos: dashboard.produtos.length,
        });
        res.status(200).json({
            success: true,
            message: 'Análise de precificacao executada com sucesso',
            data: {
                dashboard,
                metadata: {
                    tempoProcessamento: new Date().getTime() - new Date(dashboard.dataAnalise).getTime(),
                    produtosAnalisados: dashboard.produtos.length,
                    margemMedia: dashboard.totais.margemBrutaMedia,
                    rentabilidadeMedia: dashboard.totais.rentabilidadeMedia,
                    confianca: dashboard.confianca,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro na analise de precificacao', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro na analise de precificacao',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/dashboards', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
    (0, express_validator_1.query)('status').optional().isIn(['pendente', 'processando', 'concluida', 'erro']).withMessage('Status inválido'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }).withMessage('Offset deve ser >= 0'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, status, limit = 20, offset = 0 } = req.query;
        console.log('🔍 API: Consultando dashboards de precificacao', {
            empresaId,
            periodo,
            status,
            limit,
            offset,
            userId: req.user?.id,
        });
        const dashboards = [];
        res.status(200).json({
            success: true,
            message: 'Dashboards de precificacao consultados com sucesso',
            data: {
                dashboards,
                pagination: {
                    limit: Number(limit),
                    offset: Number(offset),
                    total: dashboards.length,
                },
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar dashboards de precificacao', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar dashboards de precificacao',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/dashboards/:id', auth_1.authenticateToken, [
    (0, express_validator_1.param)('id').isString().notEmpty().withMessage('ID do dashboard é obrigatório'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 API: Consultando dashboard de precificacao específico', {
            dashboardId: id,
            userId: req.user?.id,
        });
        const dashboard = null;
        if (!dashboard) {
            return res.status(404).json({
                success: false,
                message: 'Dashboard não encontrado',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Dashboard consultado com sucesso',
            data: { dashboard },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar dashboard', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(500).json({
            success: false,
            message: 'Erro ao consultar dashboard',
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
        console.log('📊 API: Gerando dashboard de precificacao', {
            empresaId,
            periodo,
            userId: req.user?.id,
        });
        const dashboard = {
            resumo: {
                totalProdutos: 0,
                valorTotalVendas: 0,
                margemBrutaMedia: 0,
                margemLiquidaMedia: 0,
                rentabilidadeMedia: 0,
            },
            graficos: {
                porMargem: [],
                porRentabilidade: [],
                porCompetitividade: [],
                porProduto: [],
            },
            alertas: [],
            recomendacoes: [],
        };
        res.status(200).json({
            success: true,
            message: 'Dashboard de precificacao gerado com sucesso',
            data: { dashboard },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao gerar dashboard de precificacao', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar dashboard de precificacao',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/produtos/:produtoId', auth_1.authenticateToken, [
    (0, express_validator_1.param)('produtoId').isString().notEmpty().withMessage('ID do produto é obrigatório'),
    (0, express_validator_1.query)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { produtoId } = req.params;
        const { empresaId, periodo } = req.query;
        console.log('🔍 API: Analisando precificacao de produto específico', {
            produtoId,
            empresaId,
            periodo,
            userId: req.user?.id,
        });
        const analise = null;
        if (!analise) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Análise de produto consultada com sucesso',
            data: { analise },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao analisar produto', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(500).json({
            success: false,
            message: 'Erro ao analisar produto',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/margens', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
    (0, express_validator_1.query)('tendencia').optional().isIn(['crescente', 'decrescente', 'estavel']).withMessage('Tendência inválida'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, tendencia } = req.query;
        console.log('🔍 API: Consultando analises de margem', {
            empresaId,
            periodo,
            tendencia,
            userId: req.user?.id,
        });
        const margens = [];
        res.status(200).json({
            success: true,
            message: 'Análises de margem consultadas com sucesso',
            data: {
                margens,
                total: margens.length,
                porTendencia: margens.reduce((acc, margem) => {
                    acc[margem.tendencia] = (acc[margem.tendencia] || 0) + 1;
                    return acc;
                }, {}),
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar analises de margem', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar analises de margem',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/simular', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('produtos').isArray().withMessage('Produtos deve ser um array'),
    (0, express_validator_1.body)('cenarios').isArray().withMessage('Cenários deve ser um array'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, produtos, cenarios } = req.body;
        console.log('🧮 API: Simulando cenários de precificacao', {
            empresaId,
            produtos: produtos.length,
            cenarios: cenarios.length,
            userId: req.user?.id,
        });
        const simulacoes = [];
        return res.status(200).json({
            success: true,
            message: 'Simulações realizadas com sucesso',
            data: {
                simulacoes,
                total: simulacoes.length,
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao simular precificacao', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(500).json({
            success: false,
            message: 'Erro ao simular precificacao',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/recomendacoes', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
    (0, express_validator_1.query)('tipo').optional().isIn(['preco', 'margem', 'competitividade', 'geral']).withMessage('Tipo inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, tipo = 'geral' } = req.query;
        console.log('💡 API: Consultando recomendações estratégicas', {
            empresaId,
            periodo,
            tipo,
            userId: req.user?.id,
        });
        const recomendacoes = [
            'Revisar preços dos produtos com margem abaixo de 15%',
            'Analisar oportunidades de redução de custos operacionais',
            'Considerar aumento de preço para produtos com alta competitividade',
            'Implementar estratégia de precificacao dinâmica',
        ];
        res.status(200).json({
            success: true,
            message: 'Recomendações consultadas com sucesso',
            data: {
                recomendacoes,
                total: recomendacoes.length,
                tipo,
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar recomendações', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar recomendações',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/relatorios/:periodo', auth_1.authenticateToken, [
    (0, express_validator_1.param)('periodo').isString().matches(/^\d{2}\/\d{4}$/).withMessage('Período deve estar no formato MM/AAAA'),
    (0, express_validator_1.query)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.query)('formato').optional().isIn(['pdf', 'excel', 'json']).withMessage('Formato inválido'),
    (0, express_validator_1.query)('tipo').optional().isIn(['precificacao', 'margem', 'competitividade', 'completo']).withMessage('Tipo de relatório inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { periodo } = req.params;
        const { empresaId, formato = 'pdf', tipo = 'completo' } = req.query;
        console.log('📄 API: Gerando relatório de precificacao', {
            empresaId,
            periodo,
            formato,
            tipo,
            userId: req.user?.id,
        });
        const relatorio = {
            empresaId,
            periodo,
            formato,
            tipo,
            conteudo: 'Relatório de precificacao gerado automaticamente pela IA',
            dataGeracao: new Date(),
            totais: {
                produtosAnalisados: 0,
                margemMedia: 0,
                rentabilidadeMedia: 0,
            },
            recomendacoes: [],
        };
        res.status(200).json({
            success: true,
            message: 'Relatório de precificacao gerado com sucesso',
            data: { relatorio },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao gerar relatório de precificacao', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar relatório de precificacao',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
exports.default = router;
//# sourceMappingURL=precificacao-margem.js.map