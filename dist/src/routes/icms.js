"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const icms_apuracao_agent_1 = require("@/services/agents/icms-apuracao-agent");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
const validateApuracao = [
    (0, express_validator_1.body)('empresa').isString().isLength({ min: 2, max: 100 }).withMessage('Nome da empresa é obrigatório'),
    (0, express_validator_1.body)('cnpj').matches(/^\d{14}$/).withMessage('CNPJ deve ter 14 dígitos'),
    (0, express_validator_1.body)('periodo').matches(/^\d{4}-\d{2}$/).withMessage('Período deve estar no formato YYYY-MM'),
    (0, express_validator_1.body)('documentos').isArray({ min: 1 }).withMessage('Pelo menos um documento é obrigatório'),
    (0, express_validator_1.body)('planilhas').optional().isArray(),
    (0, express_validator_1.body)('relatorios').optional().isArray(),
];
router.post('/apuracao', auth_1.authenticateToken, (0, validation_1.validate)(validateApuracao), async (req, res) => {
    try {
        const { empresa, cnpj, periodo, documentos, planilhas = [], relatorios = [] } = req.body;
        console.log('Iniciando apuracao ICMS', {
            empresa,
            cnpj,
            periodo,
            quantidadeDocumentos: documentos.length,
            quantidadePlanilhas: planilhas.length,
            quantidadeRelatorios: relatorios.length,
            userId: req.user?.id,
        });
        const apuracao = await icms_apuracao_agent_1.icmsApuracaoAgent.processarApuracao(empresa, cnpj, periodo, documentos, planilhas, relatorios);
        console.log('Apuração ICMS processada com sucesso', {
            apuracaoId: apuracao.id,
            empresa,
            periodo,
            status: apuracao.status,
            userId: req.user?.id,
        });
        return res.status(200).json({
            success: true,
            message: 'Apuração ICMS processada com sucesso',
            data: {
                apuracaoId: apuracao.id,
                empresa: apuracao.empresa,
                periodo: apuracao.periodo,
                status: apuracao.status,
                dataProcessamento: apuracao.dataProcessamento,
                totais: apuracao.totais,
                quantidadeProdutos: apuracao.produtos.length,
                quantidadeOperacoes: apuracao.operacoes.length,
                quantidadeRegras: apuracao.regrasAplicadas.length,
                relatoriosGerados: apuracao.relatoriosGerados,
                erros: apuracao.erros,
                observacoes: apuracao.observacoes,
            }
        });
    }
    catch (error) {
        console.error('Erro ao processar apuracao ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            body: req.body,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao processar apuracao ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/apuracao/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Buscando apuracao ICMS', {
            apuracaoId: id,
            userId: req.user?.id,
        });
        const apuracao = await buscarApuracaoICMS(id);
        if (!apuracao) {
            return res.status(404).json({
                success: false,
                message: 'Apuração ICMS não encontrada',
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Apuração ICMS encontrada',
            data: apuracao,
        });
    }
    catch (error) {
        console.error('Erro ao buscar apuracao ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            apuracaoId: req.params.id,
            userId: req.user?.id,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao buscar apuracao ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/apuracao', auth_1.authenticateToken, async (req, res) => {
    try {
        const { empresa, cnpj, periodo, status, limit = 20, offset = 0 } = req.query;
        console.log('Listando apurações ICMS', {
            empresa,
            cnpj,
            periodo,
            status,
            limit,
            offset,
            userId: req.user?.id,
        });
        const apuracoes = await listarApuracaoICMS({
            empresa: empresa,
            cnpj: cnpj,
            periodo: periodo,
            status: status,
            limit: Number(limit),
            offset: Number(offset),
        });
        return res.status(200).json({
            success: true,
            message: 'Apurações ICMS listadas com sucesso',
            data: {
                apuracoes,
                paginacao: {
                    limit: Number(limit),
                    offset: Number(offset),
                    total: apuracoes.length,
                }
            }
        });
    }
    catch (error) {
        console.error('Erro ao listar apurações ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            query: req.query,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao listar apurações ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/regras', auth_1.authenticateToken, async (req, res) => {
    try {
        const { uf, tipo, ativo } = req.query;
        console.log('Listando regras ICMS', {
            uf,
            tipo,
            ativo,
            userId: req.user?.id,
        });
        const regras = await listarRegrasICMS({
            uf: uf,
            tipo: tipo,
            ativo: ativo === 'true',
        });
        return res.status(200).json({
            success: true,
            message: 'Regras ICMS listadas com sucesso',
            data: {
                regras,
                total: regras.length,
            }
        });
    }
    catch (error) {
        console.error('Erro ao listar regras ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            query: req.query,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao listar regras ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/regras', auth_1.authenticateToken, async (req, res) => {
    try {
        const regraData = req.body;
        console.log('Criando nova regra ICMS', {
            uf: regraData.uf,
            tipo: regraData.tipo,
            descricao: regraData.descricao,
            userId: req.user?.id,
        });
        const regra = await criarRegraICMS(regraData);
        return res.status(201).json({
            success: true,
            message: 'Regra ICMS criada com sucesso',
            data: regra,
        });
    }
    catch (error) {
        console.error('Erro ao criar regra ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            body: req.body,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao criar regra ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const status = icms_apuracao_agent_1.icmsApuracaoAgent.getStatus();
        return res.status(200).json({
            success: true,
            message: 'Status do agente ICMS obtido com sucesso',
            data: status,
        });
    }
    catch (error) {
        console.error('Erro ao obter status do agente ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao obter status do agente ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/start', auth_1.authenticateToken, async (req, res) => {
    try {
        await icms_apuracao_agent_1.icmsApuracaoAgent.start();
        return res.status(200).json({
            success: true,
            message: 'Agente de apuracao ICMS iniciado com sucesso',
        });
    }
    catch (error) {
        console.error('Erro ao iniciar agente ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao iniciar agente ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/stop', auth_1.authenticateToken, async (req, res) => {
    try {
        await icms_apuracao_agent_1.icmsApuracaoAgent.stop();
        return res.status(200).json({
            success: true,
            message: 'Agente de apuracao ICMS parado com sucesso',
        });
    }
    catch (error) {
        console.error('Erro ao parar agente ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao parar agente ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
async function buscarApuracaoICMS(id) {
    return {
        id,
        empresa: 'Empresa Exemplo',
        cnpj: '12345678000199',
        periodo: '2024-01',
        dataProcessamento: new Date(),
        status: 'concluido',
        totais: {
            baseCalculo: 100000,
            icmsDevido: 18000,
            icmsRecolhido: 18000,
            icmsACompensar: 0,
            icmsAReembolsar: 0,
            difal: 0,
            protege: 0,
            ciap: 0,
        },
        produtos: [],
        operacoes: [],
        regrasAplicadas: [],
        relatoriosGerados: {
            tecnico: 'Relatório técnico gerado',
            dashboard: 'Dashboard gerado',
            memoriaCalculo: 'Memória de cálculo gerada',
        },
        erros: [],
        observacoes: 'Apuração ICMS concluída com sucesso',
    };
}
async function listarApuracaoICMS(filtros) {
    return [
        {
            id: 'icms_empresa_exemplo_2024-01_1234567890',
            empresa: 'Empresa Exemplo',
            cnpj: '12345678000199',
            periodo: '2024-01',
            dataProcessamento: new Date(),
            status: 'concluido',
            totais: {
                baseCalculo: 100000,
                icmsDevido: 18000,
                icmsRecolhido: 18000,
            },
        }
    ];
}
async function listarRegrasICMS(filtros) {
    return [
        {
            id: 'sp_base_reduzida_1',
            uf: 'SP',
            tipo: 'base_reduzida',
            descricao: 'Base reduzida para produtos essenciais',
            ncm: ['21069090', '22021000'],
            cfop: ['5102', '5405'],
            cst: ['102', '202'],
            aliquota: 18,
            baseReduzida: 70,
            ativo: true,
            dataInicio: new Date('2024-01-01'),
            fonte: 'manual',
        }
    ];
}
async function criarRegraICMS(regraData) {
    return {
        id: `regra_${Date.now()}`,
        ...regraData,
        dataInicio: new Date(regraData.dataInicio),
        dataFim: regraData.dataFim ? new Date(regraData.dataFim) : undefined,
    };
}
exports.default = router;
//# sourceMappingURL=icms.js.map