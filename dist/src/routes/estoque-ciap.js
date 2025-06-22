"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("@/middleware/auth");
const constants_1 = require("@/constants");
const validation_1 = require("@/middleware/validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const estoqueValidation = [
    (0, express_validator_1.body)('empresa')
        .notEmpty()
        .withMessage('Empresa é obrigatória'),
    (0, express_validator_1.body)('cnpj')
        .isLength({ min: 14, max: 18 })
        .withMessage('CNPJ deve ter entre 14 e 18 caracteres'),
    (0, express_validator_1.body)('periodo')
        .matches(/^\d{4}-\d{2}$/)
        .withMessage('Período deve estar no formato YYYY-MM'),
];
router.post('/processar', auth_1.authenticateToken, estoqueValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { empresa, cnpj, periodo } = req.body;
        console.log('Processamento de estoque e CIAP iniciado', {
            empresa,
            cnpj,
            periodo,
            userId: req.user?.id
        });
        const processamentoResult = {
            id: `estoque_${Date.now()}`,
            empresa,
            cnpj,
            periodo,
            status: 'PROCESSING',
            iniciadoEm: new Date().toISOString(),
            estimativaConclusao: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            etapas: [
                { nome: 'Validação de documentos', status: 'COMPLETED' },
                { nome: 'Processamento do Bloco H', status: 'PROCESSING' },
                { nome: 'Processamento do Bloco G', status: 'PENDING' },
                { nome: 'Cálculo do custo médio', status: 'PENDING' },
                { nome: 'Controle de CIAP', status: 'PENDING' },
            ],
        };
        res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Processamento de estoque e CIAP iniciado com sucesso',
            data: processamentoResult,
        });
    }
    catch (error) {
        console.error('Erro no processamento de estoque e CIAP', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/status/:processamentoId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { processamentoId } = req.params;
        const status = {
            id: processamentoId,
            status: 'COMPLETED',
            progresso: 100,
            iniciadoEm: '2024-01-15T10:00:00Z',
            concluidoEm: '2024-01-15T10:05:00Z',
            etapas: [
                { nome: 'Validação de documentos', status: 'COMPLETED', duracao: '30s' },
                { nome: 'Processamento do Bloco H', status: 'COMPLETED', duracao: '2m' },
                { nome: 'Processamento do Bloco G', status: 'COMPLETED', duracao: '1m' },
                { nome: 'Cálculo do custo médio', status: 'COMPLETED', duracao: '1m' },
                { nome: 'Controle de CIAP', status: 'COMPLETED', duracao: '30s' },
            ],
            resultados: {
                totalProdutos: 1250,
                produtosComEstoque: 1180,
                produtosSemEstoque: 70,
                valorTotalEstoque: 1250000.50,
                itensCIAP: 45,
                valorCIAP: 125000.00,
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('Erro ao buscar status do processamento', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/estoque/:empresa/:periodo', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, periodo } = req.params;
        const { page = 1, limit = 20, produto } = req.query;
        const estoque = {
            empresa,
            periodo,
            resumo: {
                totalProdutos: 1250,
                produtosComEstoque: 1180,
                produtosSemEstoque: 70,
                valorTotalEstoque: 1250000.50,
                ultimaAtualizacao: '2024-01-15T10:05:00Z',
            },
            produtos: [
                {
                    codigo: '001',
                    descricao: 'Produto A',
                    quantidade: 100,
                    valorUnitario: 50.00,
                    valorTotal: 5000.00,
                    ultimaMovimentacao: '2024-01-15T09:30:00Z',
                },
                {
                    codigo: '002',
                    descricao: 'Produto B',
                    quantidade: 75,
                    valorUnitario: 75.50,
                    valorTotal: 5662.50,
                    ultimaMovimentacao: '2024-01-15T09:45:00Z',
                },
            ],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 1250,
                totalPages: 63,
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: estoque,
        });
    }
    catch (error) {
        console.error('Erro ao buscar dados de estoque', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/ciap/:empresa/:periodo', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, periodo } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const ciap = {
            empresa,
            periodo,
            resumo: {
                totalItens: 45,
                valorTotal: 125000.00,
                percentualApropriado: 85.5,
                ultimaAtualizacao: '2024-01-15T10:05:00Z',
            },
            itens: [
                {
                    codigo: 'CIAP001',
                    descricao: 'Máquina Industrial',
                    valorOriginal: 50000.00,
                    valorApropriado: 42500.00,
                    percentualApropriado: 85.0,
                    dataAquisicao: '2023-01-15',
                    vidaUtil: '10 anos',
                },
                {
                    codigo: 'CIAP002',
                    descricao: 'Equipamento de Informática',
                    valorOriginal: 25000.00,
                    valorApropriado: 21250.00,
                    percentualApropriado: 85.0,
                    dataAquisicao: '2023-06-20',
                    vidaUtil: '5 anos',
                },
            ],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 45,
                totalPages: 3,
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: ciap,
        });
    }
    catch (error) {
        console.error('Erro ao buscar dados de CIAP', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/relatorio/:empresa/:periodo', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, periodo } = req.params;
        const relatorio = {
            empresa,
            periodo,
            geradoEm: new Date().toISOString(),
            estoque: {
                totalProdutos: 1250,
                produtosComEstoque: 1180,
                produtosSemEstoque: 70,
                valorTotalEstoque: 1250000.50,
                produtosCriticos: 15,
                produtosObsoletos: 8,
            },
            ciap: {
                totalItens: 45,
                valorTotal: 125000.00,
                percentualApropriado: 85.5,
                itensVencendo: 3,
                itensVencidos: 0,
            },
            alertas: [
                {
                    tipo: 'ESTOQUE_BAIXO',
                    mensagem: '15 produtos com estoque abaixo do mínimo',
                    severidade: 'MEDIA',
                },
                {
                    tipo: 'CIAP_VENCENDO',
                    mensagem: '3 itens de CIAP vencendo nos próximos 3 meses',
                    severidade: 'ALTA',
                },
            ],
            recomendacoes: [
                'Revisar política de estoque mínimo para produtos críticos',
                'Avaliar necessidade de renovação de equipamentos CIAP',
                'Considerar ajuste de preços para produtos com baixa rotatividade',
            ],
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: relatorio,
        });
    }
    catch (error) {
        console.error('Erro ao gerar relatório de estoque e CIAP', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
exports.default = router;
//# sourceMappingURL=estoque-ciap.js.map