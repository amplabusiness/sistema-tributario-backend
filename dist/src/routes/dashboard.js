"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const empresa_service_1 = require("../services/empresa-service");
const document_processor_1 = require("../services/document-processor");
const cache_1 = require("../services/cache");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const cache = new cache_1.CacheService();
router.get('/stats', async (req, res) => {
    try {
        const cachedStats = await cache.get('dashboard:stats');
        if (cachedStats) {
            return res.json(cachedStats);
        }
        const empresas = await empresa_service_1.EmpresaService.listarEmpresas();
        const empresasAtivas = empresas.length;
        const documentos = await document_processor_1.DocumentProcessor.listarDocumentos();
        const documentosProcessados = documentos.filter(d => d.status === 'CONCLUIDO').length;
        const documentosPendentes = documentos.filter(d => d.status === 'PROCESSANDO').length;
        const calculosIcmsRaw = await cache.get('calculos:icms:count');
        const calculosIcms = (typeof calculosIcmsRaw === 'number') ? calculosIcmsRaw : 0;
        const valorTotalIcmsRaw = await cache.get('calculos:icms:total');
        const valorTotalIcms = (typeof valorTotalIcmsRaw === 'number') ? valorTotalIcmsRaw : 0;
        const calculosProtegeRaw = await cache.get('calculos:protege:count');
        const calculosProtege = (typeof calculosProtegeRaw === 'number') ? calculosProtegeRaw : 0;
        const valorTotalProtegeRaw = await cache.get('calculos:protege:total');
        const valorTotalProtege = (typeof valorTotalProtegeRaw === 'number') ? valorTotalProtegeRaw : 0;
        const stats = {
            totalEmpresas: empresas.length,
            empresasAtivas,
            documentosProcessados,
            documentosPendentes,
            calculosIcms,
            calculosProtege,
            calculosRealizados: calculosIcms + calculosProtege,
            valorTotalIcms,
            valorTotalProtege,
            valorTotal: valorTotalIcms + valorTotalProtege,
            periodosDisponiveis: ['2024-01', '2024-02', '2024-03'],
            empresasRecentes: empresas.slice(0, 5).map(empresa => ({
                id: empresa.id,
                razaoSocial: empresa.razaoSocial,
                cnpj: empresa.cnpj,
                nomeFantasia: empresa.nomeFantasia || 'N/A',
                ultimaAtualizacao: empresa.dataCadastro,
                documentosProcessados: empresa._count?.documentos || 0,
                calculosRealizados: 0
            }))
        };
        await cache.set('dashboard:stats', stats, 300);
        return res.json(stats);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar estatísticas do dashboard:', error);
        return res.status(500).json({
            error: 'Erro ao buscar estatísticas do dashboard',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/recent-activities', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit.toString());
        const documentosRecentes = await document_processor_1.DocumentProcessor.listarDocumentos();
        const atividades = documentosRecentes
            .slice(0, limitNum)
            .map(doc => ({
            id: doc.id,
            tipo: 'documento_processado',
            descricao: `Documento ${doc.filename} processado`,
            timestamp: doc.dataProcessamento || doc.uploadedAt,
            status: doc.status,
            empresaId: doc.empresaId
        }));
        return res.json(atividades);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar atividades recentes:', error);
        return res.status(500).json({
            error: 'Erro ao buscar atividades recentes',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/empresa-summary/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(id);
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        const documentos = await document_processor_1.DocumentProcessor.buscarDocumentosPorEmpresa(id);
        const documentosProcessados = documentos.filter(d => d.status === 'CONCLUIDO').length;
        const summary = {
            empresa: {
                id: empresa.id,
                razaoSocial: empresa.razaoSocial,
                cnpj: empresa.cnpj,
                nomeFantasia: empresa.nomeFantasia || 'N/A',
                regimeTributario: empresa.regimeTributario || 'N/A'
            },
            documentos: {
                total: documentos.length,
                processados: documentosProcessados,
                pendentes: documentos.length - documentosProcessados
            },
            calculos: {
                icms: 0,
                protege: 0
            }
        };
        return res.json(summary);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar resumo da empresa:', error);
        return res.status(500).json({
            error: 'Erro ao buscar resumo da empresa',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorios/valores-por-periodo', async (req, res) => {
    try {
        const { periodo_inicio, periodo_fim } = req.query;
        const valoresIcms = [
            { periodo: '2024-01', valor: 15000 },
            { periodo: '2024-02', valor: 18000 },
            { periodo: '2024-03', valor: 22000 }
        ];
        const valoresProtege = [
            { periodo: '2024-01', valor: 5000 },
            { periodo: '2024-02', valor: 6000 },
            { periodo: '2024-03', valor: 7000 }
        ];
        const relatorio = {
            labels: valoresIcms.map(v => v.periodo),
            valoresIcms: valoresIcms.map(v => v.valor),
            valoresProtege: valoresProtege.map(v => v.valor)
        };
        return res.json(relatorio);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de valores por período:', error);
        return res.status(500).json({
            error: 'Erro ao gerar relatório',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorios/processamento-por-periodo', async (req, res) => {
    try {
        const { periodo_inicio, periodo_fim } = req.query;
        const processamentoPorPeriodo = [
            { periodo: '2024-01', documentos: 45, calculos: 23, erros: 2 },
            { periodo: '2024-02', documentos: 52, calculos: 30, erros: 1 },
            { periodo: '2024-03', documentos: 61, calculos: 38, erros: 3 }
        ];
        return res.json(processamentoPorPeriodo);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de processamento:', error);
        return res.status(500).json({
            error: 'Erro ao gerar relatório de processamento',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/acoes/executar-calculos', async (req, res) => {
    try {
        const { empresaIds, periodo, tipo } = req.body;
        const resultado = {
            executados: empresaIds?.length || 0,
            sucesso: true,
            tempo: new Date().toISOString()
        };
        return res.json(resultado);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao executar cálculos em lote:', error);
        return res.status(500).json({
            error: 'Erro ao executar cálculos',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/acoes/gerar-relatorios', async (req, res) => {
    try {
        const { empresaIds, periodo, formatos } = req.body;
        const resultado = {
            gerados: formatos?.length || 0,
            sucesso: true,
            tempo: new Date().toISOString()
        };
        return res.json(resultado);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatórios em lote:', error);
        return res.status(500).json({
            error: 'Erro ao gerar relatórios',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map