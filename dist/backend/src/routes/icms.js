"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("@/utils/logger");
const icms_apuracao_agent_1 = require("@/services/agents/icms-apuracao-agent");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
router.post('/apuracao', auth_1.authenticateToken, (0, validation_1.validateRequest)({
    body: {
        empresa: { type: 'string', required: true, minLength: 2, maxLength: 100 },
        cnpj: { type: 'string', required: true, pattern: /^\d{14}$/ },
        periodo: { type: 'string', required: true, pattern: /^\d{4}-\d{2}$/ },
        documentos: { type: 'array', required: true, minLength: 1 },
        planilhas: { type: 'array', required: false },
        relatorios: { type: 'array', required: false },
    }
}), async (req, res) => {
    try {
        const { empresa, cnpj, periodo, documentos, planilhas = [], relatorios = [] } = req.body;
        (0, logger_1.logInfo)('Iniciando apuração ICMS', {
            empresa,
            cnpj,
            periodo,
            quantidadeDocumentos: documentos.length,
            quantidadePlanilhas: planilhas.length,
            quantidadeRelatorios: relatorios.length,
            userId: req.user?.id,
        });
        const apuracao = await icms_apuracao_agent_1.icmsApuracaoAgent.processarApuracao(empresa, cnpj, periodo, documentos, planilhas, relatorios);
        (0, logger_1.logInfo)('Apuração ICMS processada com sucesso', {
            apuracaoId: apuracao.id,
            empresa,
            periodo,
            status: apuracao.status,
            userId: req.user?.id,
        });
        res.status(200).json({
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
        (0, logger_1.logError)('Erro ao processar apuração ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            body: req.body,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao processar apuração ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/apuracao/:id', auth_1.authenticateToken, (0, validation_1.validateRequest)({
    params: {
        id: { type: 'string', required: true, minLength: 10, maxLength: 100 },
    }
}), async (req, res) => {
    try {
        const { id } = req.params;
        (0, logger_1.logInfo)('Buscando apuração ICMS', {
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
        res.status(200).json({
            success: true,
            message: 'Apuração ICMS encontrada',
            data: apuracao,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar apuração ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            apuracaoId: req.params.id,
            userId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao buscar apuração ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/apuracao', auth_1.authenticateToken, (0, validation_1.validateRequest)({
    query: {
        empresa: { type: 'string', required: false, maxLength: 100 },
        cnpj: { type: 'string', required: false, pattern: /^\d{14}$/ },
        periodo: { type: 'string', required: false, pattern: /^\d{4}-\d{2}$/ },
        status: { type: 'string', required: false, enum: ['pendente', 'processando', 'concluido', 'erro'] },
        limit: { type: 'number', required: false, min: 1, max: 100 },
        offset: { type: 'number', required: false, min: 0 },
    }
}), async (req, res) => {
    try {
        const { empresa, cnpj, periodo, status, limit = 20, offset = 0 } = req.query;
        (0, logger_1.logInfo)('Listando apurações ICMS', {
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
        res.status(200).json({
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
        (0, logger_1.logError)('Erro ao listar apurações ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            query: req.query,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao listar apurações ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/regras', auth_1.authenticateToken, (0, validation_1.validateRequest)({
    query: {
        uf: { type: 'string', required: false, pattern: /^[A-Z]{2}$/ },
        tipo: { type: 'string', required: false, enum: ['base_reduzida', 'credito_outorgado', 'protege', 'difal', 'ciap', 'st', 'isencao'] },
        ativo: { type: 'boolean', required: false },
    }
}), async (req, res) => {
    try {
        const { uf, tipo, ativo } = req.query;
        (0, logger_1.logInfo)('Listando regras ICMS', {
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
        res.status(200).json({
            success: true,
            message: 'Regras ICMS listadas com sucesso',
            data: {
                regras,
                total: regras.length,
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao listar regras ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            query: req.query,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao listar regras ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/regras', auth_1.authenticateToken, (0, validation_1.validateRequest)({
    body: {
        uf: { type: 'string', required: true, pattern: /^[A-Z]{2}$/ },
        tipo: { type: 'string', required: true, enum: ['base_reduzida', 'credito_outorgado', 'protege', 'difal', 'ciap', 'st', 'isencao'] },
        descricao: { type: 'string', required: true, minLength: 5, maxLength: 200 },
        ncm: { type: 'array', required: true, minLength: 1 },
        cfop: { type: 'array', required: true, minLength: 1 },
        cst: { type: 'array', required: true, minLength: 1 },
        aliquota: { type: 'number', required: true, min: 0, max: 100 },
        baseReduzida: { type: 'number', required: false, min: 0, max: 100 },
        creditoOutorgado: { type: 'number', required: false, min: 0, max: 100 },
        protege: { type: 'object', required: false },
        difal: { type: 'object', required: false },
        ativo: { type: 'boolean', required: true },
        dataInicio: { type: 'string', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/ },
        dataFim: { type: 'string', required: false, pattern: /^\d{4}-\d{2}-\d{2}$/ },
        fonte: { type: 'string', required: true, maxLength: 50 },
    }
}), async (req, res) => {
    try {
        const regraData = req.body;
        (0, logger_1.logInfo)('Criando nova regra ICMS', {
            uf: regraData.uf,
            tipo: regraData.tipo,
            descricao: regraData.descricao,
            userId: req.user?.id,
        });
        const regra = await criarRegraICMS(regraData);
        res.status(201).json({
            success: true,
            message: 'Regra ICMS criada com sucesso',
            data: regra,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao criar regra ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            body: req.body,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao criar regra ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const status = icms_apuracao_agent_1.icmsApuracaoAgent.getStatus();
        res.status(200).json({
            success: true,
            message: 'Status do agente ICMS obtido com sucesso',
            data: status,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao obter status do agente ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao obter status do agente ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/start', auth_1.authenticateToken, async (req, res) => {
    try {
        await icms_apuracao_agent_1.icmsApuracaoAgent.start();
        res.status(200).json({
            success: true,
            message: 'Agente de apuração ICMS iniciado com sucesso',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao iniciar agente ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao iniciar agente ICMS',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/stop', auth_1.authenticateToken, async (req, res) => {
    try {
        await icms_apuracao_agent_1.icmsApuracaoAgent.stop();
        res.status(200).json({
            success: true,
            message: 'Agente de apuração ICMS parado com sucesso',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao parar agente ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        res.status(500).json({
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