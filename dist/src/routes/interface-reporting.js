"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("@/middleware/auth");
const constants_1 = require("@/constants");
const router = (0, express_1.Router)();
router.get('/overview', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, periodo } = req.query;
        console.log('Dashboard overview solicitado', {
            empresa,
            periodo,
            userId: req.user?.id
        });
        const overview = {
            empresa: empresa || 'Todas',
            periodo: periodo || '2024-01',
            ultimaAtualizacao: new Date().toISOString(),
            metricas: {
                totalDocumentos: 1250,
                documentosProcessados: 1180,
                documentosPendentes: 70,
                documentosComErro: 5,
                percentualProcessamento: 94.4,
            },
            apuracao: {
                icms: {
                    total: 125000.50,
                    aRecolher: 85000.25,
                    creditos: 40000.25,
                    percentual: 68.0,
                },
                federal: {
                    pis: 8500.00,
                    cofins: 39200.00,
                    irpj: 25000.00,
                    csll: 15000.00,
                    total: 88700.00,
                },
            },
            estoque: {
                totalProdutos: 1250,
                valorTotal: 1250000.50,
                produtosCriticos: 15,
            },
            alertas: [
                {
                    id: 'alt_1',
                    tipo: 'DOCUMENTO_PENDENTE',
                    mensagem: '70 documentos aguardando processamento',
                    severidade: 'MEDIA',
                    timestamp: '2024-01-15T10:30:00Z',
                },
                {
                    id: 'alt_2',
                    tipo: 'ICMS_ALTO',
                    mensagem: 'ICMS a recolher acima da média histórica',
                    severidade: 'ALTA',
                    timestamp: '2024-01-15T10:25:00Z',
                },
            ],
            graficos: {
                processamentoPorDia: [
                    { data: '2024-01-10', documentos: 45, processados: 42 },
                    { data: '2024-01-11', documentos: 52, processados: 48 },
                    { data: '2024-01-12', documentos: 38, processados: 35 },
                    { data: '2024-01-13', documentos: 61, processados: 58 },
                    { data: '2024-01-14', documentos: 49, processados: 47 },
                    { data: '2024-01-15', documentos: 55, processados: 52 },
                ],
                apuracaoPorMes: [
                    { mes: '2023-10', icms: 115000, federal: 82000 },
                    { mes: '2023-11', icms: 118000, federal: 85000 },
                    { mes: '2023-12', icms: 122000, federal: 88000 },
                    { mes: '2024-01', icms: 125000, federal: 88700 },
                ],
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: overview,
        });
    }
    catch (error) {
        console.error('Erro ao buscar overview do dashboard', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/produtos', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, periodo, page = 1, limit = 20, produto } = req.query;
        console.log('Dashboard produtos solicitado', {
            empresa,
            periodo,
            produto,
            userId: req.user?.id
        });
        const produtos = {
            empresa: empresa || 'Todas',
            periodo: periodo || '2024-01',
            filtros: {
                produto: produto || null,
            },
            resumo: {
                totalProdutos: 1250,
                produtosComMovimentacao: 1180,
                produtosSemMovimentacao: 70,
                valorTotalVendas: 2500000.00,
                valorTotalCompras: 1800000.00,
            },
            produtos: [
                {
                    codigo: '001',
                    descricao: 'Produto A',
                    ncm: '12345678',
                    vendas: {
                        quantidade: 500,
                        valor: 25000.00,
                        icms: 4250.00,
                        pis: 425.00,
                        cofins: 1955.00,
                    },
                    compras: {
                        quantidade: 450,
                        valor: 18000.00,
                        icms: 3060.00,
                        pis: 306.00,
                        cofins: 1407.60,
                    },
                    estoque: {
                        quantidade: 100,
                        valor: 5000.00,
                    },
                    margem: {
                        bruta: 28.0,
                        liquida: 22.5,
                    },
                },
                {
                    codigo: '002',
                    descricao: 'Produto B',
                    ncm: '87654321',
                    vendas: {
                        quantidade: 300,
                        valor: 22500.00,
                        icms: 3825.00,
                        pis: 382.50,
                        cofins: 1759.50,
                    },
                    compras: {
                        quantidade: 280,
                        valor: 16800.00,
                        icms: 2856.00,
                        pis: 285.60,
                        cofins: 1313.76,
                    },
                    estoque: {
                        quantidade: 75,
                        valor: 5625.00,
                    },
                    margem: {
                        bruta: 25.3,
                        liquida: 20.1,
                    },
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
            data: produtos,
        });
    }
    catch (error) {
        console.error('Erro ao buscar dados de produtos', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/relatorios', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, periodo, tipo } = req.query;
        console.log('Relatórios solicitados', {
            empresa,
            periodo,
            tipo,
            userId: req.user?.id
        });
        const relatorios = {
            empresa: empresa || 'Todas',
            periodo: periodo || '2024-01',
            relatorios: [
                {
                    id: 'rel_1',
                    nome: 'Relatório de Apuração ICMS',
                    tipo: 'ICMS',
                    formato: 'PDF',
                    tamanho: '2.5 MB',
                    geradoEm: '2024-01-15T10:00:00Z',
                    status: 'DISPONIVEL',
                    url: '/api/v1/dashboard/relatorios/rel_1/download',
                },
                {
                    id: 'rel_2',
                    nome: 'Relatório de Apuração Federal',
                    tipo: 'FEDERAL',
                    formato: 'PDF',
                    tamanho: '3.1 MB',
                    geradoEm: '2024-01-15T10:05:00Z',
                    status: 'DISPONIVEL',
                    url: '/api/v1/dashboard/relatorios/rel_2/download',
                },
                {
                    id: 'rel_3',
                    nome: 'Relatório de Estoque e CIAP',
                    tipo: 'ESTOQUE',
                    formato: 'PDF',
                    tamanho: '1.8 MB',
                    geradoEm: '2024-01-15T10:10:00Z',
                    status: 'DISPONIVEL',
                    url: '/api/v1/dashboard/relatorios/rel_3/download',
                },
                {
                    id: 'rel_4',
                    nome: 'Relatório de Precificação e Margem',
                    tipo: 'PRECIFICACAO',
                    formato: 'PDF',
                    tamanho: '2.2 MB',
                    geradoEm: '2024-01-15T10:15:00Z',
                    status: 'GERANDO',
                    progresso: 75,
                },
            ],
            filtros: {
                tipos: ['ICMS', 'FEDERAL', 'ESTOQUE', 'PRECIFICACAO', 'GERAL'],
                formatos: ['PDF', 'EXCEL', 'CSV'],
                periodos: ['2024-01', '2023-12', '2023-11', '2023-10'],
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: relatorios,
        });
    }
    catch (error) {
        console.error('Erro ao buscar relatórios', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/alertas', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, severidade, page = 1, limit = 20 } = req.query;
        console.log('Alertas solicitados', {
            empresa,
            severidade,
            userId: req.user?.id
        });
        const alertas = {
            empresa: empresa || 'Todas',
            filtros: {
                severidade: severidade || null,
            },
            resumo: {
                total: 8,
                criticos: 2,
                altos: 3,
                medios: 2,
                baixos: 1,
            },
            alertas: [
                {
                    id: 'alt_1',
                    tipo: 'DOCUMENTO_PENDENTE',
                    titulo: 'Documentos pendentes de processamento',
                    mensagem: '70 documentos aguardando processamento há mais de 24 horas',
                    severidade: 'ALTA',
                    empresa: 'Empresa A',
                    cnpj: '12.345.678/0001-90',
                    periodo: '2024-01',
                    timestamp: '2024-01-15T10:30:00Z',
                    acoes: [
                        { nome: 'Processar Agora', url: '/api/v1/upload/processar-pendentes' },
                        { nome: 'Ver Detalhes', url: '/api/v1/dashboard/documentos-pendentes' },
                    ],
                },
                {
                    id: 'alt_2',
                    tipo: 'ICMS_ALTO',
                    titulo: 'ICMS a recolher acima da média',
                    mensagem: 'ICMS a recolher 15% acima da média histórica do período',
                    severidade: 'CRITICO',
                    empresa: 'Empresa B',
                    cnpj: '98.765.432/0001-10',
                    periodo: '2024-01',
                    timestamp: '2024-01-15T10:25:00Z',
                    acoes: [
                        { nome: 'Analisar Apuração', url: '/api/v1/icms/analise' },
                        { nome: 'Ver Relatório', url: '/api/v1/dashboard/relatorios/icms' },
                    ],
                },
                {
                    id: 'alt_3',
                    tipo: 'ESTOQUE_BAIXO',
                    titulo: 'Produtos com estoque baixo',
                    mensagem: '15 produtos com estoque abaixo do mínimo estabelecido',
                    severidade: 'MEDIO',
                    empresa: 'Empresa A',
                    cnpj: '12.345.678/0001-90',
                    periodo: '2024-01',
                    timestamp: '2024-01-15T10:20:00Z',
                    acoes: [
                        { nome: 'Ver Produtos', url: '/api/v1/estoque-ciap/produtos-criticos' },
                        { nome: 'Gerar Relatório', url: '/api/v1/estoque-ciap/relatorio' },
                    ],
                },
            ],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 8,
                totalPages: 1,
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: alertas,
        });
    }
    catch (error) {
        console.error('Erro ao buscar alertas', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
exports.default = router;
//# sourceMappingURL=interface-reporting.js.map