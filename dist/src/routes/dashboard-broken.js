"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const empresa_service_1 = require("../services/empresa-service");
const document_processor_1 = require("../services/document-processor");
const protege_service_1 = require("../services/protege-service");
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
            valorTotalIcms,
            valorTotalProtege,
            ultimaAtualizacao: new Date().toISOString()
        };
        await cache.set('dashboard:stats', stats, 300);
        res.json(stats);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({
            error: 'Erro ao buscar estatísticas',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/empresas/status', async (req, res) => {
    try {
        const empresas = await empresa_service_1.EmpresaService.listarEmpresas();
        const empresasComStatus = [];
        for (const empresa of empresas) {
            const documentos = await document_processor_1.DocumentProcessor.buscarDocumentosPorEmpresa(empresa.id);
            const documentosProcessados = documentos.filter(d => d.status === 'CONCLUIDO').length;
            const calculosIcms = await cache.get(`calculos:icms:${empresa.id}:count`) || 0;
            const calculosProtege = await cache.get(`calculos:protege:${empresa.id}:count`) || 0;
            const calculosRealizados = calculosIcms + calculosProtege;
            const ultimaDoc = documentos.sort((a, b) => new Date(b.dataProcessamento).getTime() - new Date(a.dataProcessamento).getTime())[0];
            empresasComStatus.push({
                id: empresa.id,
                nome: empresa.nome,
                cnpj: empresa.cnpj,
                status: empresa.status,
                ultimaAtualizacao: ultimaDoc?.dataProcessamento || empresa.dataCriacao,
                documentosProcessados,
                calculosRealizados
            });
        }
        res.json(empresasComStatus);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar status das empresas:', error);
        res.status(500).json({
            error: 'Erro ao buscar status das empresas',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/documents/recentes', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const documentos = await document_processor_1.DocumentProcessor.listarDocumentos();
        const documentosRecentes = documentos
            .sort((a, b) => new Date(b.dataProcessamento).getTime() - new Date(a.dataProcessamento).getTime())
            .slice(0, parseInt(limit.toString()));
        const documentosEnriquecidos = [];
        for (const doc of documentosRecentes) {
            const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(doc.empresaId);
            documentosEnriquecidos.push({
                id: doc.id,
                empresaId: doc.empresaId,
                empresaNome: empresa?.nome || 'Empresa não encontrada',
                tipo: doc.tipo,
                nome: doc.nome,
                status: doc.status,
                dataProcessamento: doc.dataProcessamento,
                tamanho: doc.tamanho || 0
            });
        }
        res.json(documentosEnriquecidos);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar documentos recentes:', error);
        res.status(500).json({
            error: 'Erro ao buscar documentos recentes',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/calculos/recentes', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const calculosRecentes = [];
        const calculosIcms = await cache.get('calculos:icms:recentes') || [];
        for (const calc of calculosIcms.slice(0, parseInt(limit.toString()) / 2)) {
            const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(calc.empresaId);
            calculosRecentes.push({
                id: calc.id,
                empresaId: calc.empresaId,
                empresaNome: empresa?.nome || 'Empresa não encontrada',
                tipo: 'ICMS',
                periodo: calc.periodo,
                valor: calc.valorTotal || 0,
                status: calc.status || 'CALCULADO',
                dataCalculo: calc.dataCalculo || new Date().toISOString()
            });
        }
        const calculosProtege = await cache.get('calculos:protege:recentes') || [];
        for (const calc of calculosProtege.slice(0, parseInt(limit.toString()) / 2)) {
            const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(calc.empresaId);
            calculosRecentes.push({
                id: calc.id,
                empresaId: calc.empresaId,
                empresaNome: empresa?.nome || 'Empresa não encontrada',
                tipo: 'PROTEGE',
                periodo: calc.periodo,
                valor: calc.resultado?.valorFinal || 0,
                status: calc.status || 'CALCULADO',
                dataCalculo: calc.dataCalculo || new Date().toISOString()
            });
        }
        calculosRecentes.sort((a, b) => new Date(b.dataCalculo).getTime() - new Date(a.dataCalculo).getTime());
        res.json(calculosRecentes.slice(0, parseInt(limit.toString())));
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar cálculos recentes:', error);
        res.status(500).json({
            error: 'Erro ao buscar cálculos recentes',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorios/empresas-por-status', async (req, res) => {
    try {
        const empresas = await empresa_service_1.EmpresaService.listarEmpresas();
        const statusCount = empresas.reduce((acc, empresa) => {
            acc[empresa.status] = (acc[empresa.status] || 0) + 1;
            return acc;
        }, {});
        const relatorio = {
            total: empresas.length,
            porStatus: statusCount,
            labels: Object.keys(statusCount),
            values: Object.values(statusCount)
        };
        res.json(relatorio);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de empresas por status:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorios/documentos-por-tipo', async (req, res) => {
    try {
        const documentos = await document_processor_1.DocumentProcessor.listarDocumentos();
        const tipoCount = documentos.reduce((acc, doc) => {
            acc[doc.tipo] = (acc[doc.tipo] || 0) + 1;
            return acc;
        }, {});
        const relatorio = {
            total: documentos.length,
            porTipo: tipoCount,
            labels: Object.keys(tipoCount),
            values: Object.values(tipoCount)
        };
        res.json(relatorio);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de documentos por tipo:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorios/valores-por-periodo', async (req, res) => {
    try {
        const { periodoInicio, periodoFim } = req.query;
        if (!periodoInicio || !periodoFim) {
            return res.status(400).json({
                error: 'Período início e fim são obrigatórios'
            });
        }
        const valoresIcms = await cache.get(`relatorio:icms:${periodoInicio}:${periodoFim}`) || [];
        const valoresProtege = await cache.get(`relatorio:protege:${periodoInicio}:${periodoFim}`) || [];
        const relatorio = {
            periodoInicio: periodoInicio.toString(),
            periodoFim: periodoFim.toString(),
            icms: valoresIcms,
            protege: valoresProtege,
            labels: valoresIcms.map((v) => v.periodo),
            valoresIcms: valoresIcms.map((v) => v.valor),
            valoresProtege: valoresProtege.map((v) => v.valor)
        };
        res.json(relatorio);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de valores por período:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorios/processamento-por-periodo', async (req, res) => {
    try {
        const { periodoInicio, periodoFim } = req.query;
        if (!periodoInicio || !periodoFim) {
            return res.status(400).json({
                error: 'Período início e fim são obrigatórios'
            });
        }
        const documentos = await document_processor_1.DocumentProcessor.listarDocumentos();
        const documentosFiltrados = documentos.filter(doc => {
            const docPeriodo = doc.dataProcessamento.substring(0, 7).replace('-', '');
            return docPeriodo >= periodoInicio.toString() && docPeriodo <= periodoFim.toString();
        });
        const processamentoPorPeriodo = documentosFiltrados.reduce((acc, doc) => {
            const periodo = doc.dataProcessamento.substring(0, 7);
            if (!acc[periodo]) {
                acc[periodo] = {
                    periodo,
                    documentos: 0,
                    processados: 0,
                    erros: 0
                };
            }
            acc[periodo].documentos++;
            if (doc.status === 'CONCLUIDO') {
                acc[periodo].processados++;
            }
            else if (doc.status === 'ERRO') {
                acc[periodo].erros++;
            }
            return acc;
        }, {});
        const relatorio = {
            periodoInicio: periodoInicio.toString(),
            periodoFim: periodoFim.toString(),
            dados: Object.values(processamentoPorPeriodo),
            labels: Object.keys(processamentoPorPeriodo),
            documentos: Object.values(processamentoPorPeriodo).map((d) => d.documentos),
            processados: Object.values(processamentoPorPeriodo).map((d) => d.processados),
            erros: Object.values(processamentoPorPeriodo).map((d) => d.erros)
        };
        res.json(relatorio);
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de processamento por período:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/acoes/processar-documentos', async (req, res) => {
    try {
        const documentos = await document_processor_1.DocumentProcessor.listarDocumentos();
        const documentosPendentes = documentos.filter(d => d.status === 'PENDENTE');
        let processados = 0;
        for (const doc of documentosPendentes) {
            try {
                await document_processor_1.DocumentProcessor.processarDocumento(doc.id);
                processados++;
            }
            catch (error) {
                (0, logger_1.logError)(`Erro ao processar documento ${doc.id}:`, error);
            }
        }
        res.json({
            success: true,
            message: `${processados} documentos processados`,
            processados,
            total: documentosPendentes.length
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao executar ação de processar documentos:', error);
        res.status(500).json({
            error: 'Erro ao processar documentos',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/acoes/executar-calculos', async (req, res) => {
    try {
        const { empresaId, periodo } = req.body;
        if (!empresaId || !periodo) {
            return res.status(400).json({
                error: 'Empresa ID e período são obrigatórios'
            });
        }
        const resultadoIcms = await fetch(`${process.env.API_URL}/icms/calcular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresaId, periodo })
        });
        const resultadoProtege = await fetch(`${process.env.API_URL}/protege/calcular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empresaId, periodo })
        });
        res.json({
            success: true,
            message: 'Cálculos executados com sucesso',
            icms: resultadoIcms.ok,
            protege: resultadoProtege.ok
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao executar ação de cálculos:', error);
        res.status(500).json({
            error: 'Erro ao executar cálculos',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/acoes/gerar-relatorios', async (req, res) => {
    try {
        const { empresaId, periodoInicio, periodoFim, tipos } = req.body;
        if (!empresaId || !periodoInicio || !periodoFim) {
            return res.status(400).json({
                error: 'Empresa ID, período início e fim são obrigatórios'
            });
        }
        const relatorios = [];
        if (!tipos || tipos.includes('icms')) {
            const relatorioIcms = await fetch(`${process.env.API_URL}/icms/relatorio-consolidado/${empresaId}?periodoInicio=${periodoInicio}&periodoFim=${periodoFim}`);
            if (relatorioIcms.ok) {
                relatorios.push({ tipo: 'ICMS', dados: await relatorioIcms.json() });
            }
        }
        if (!tipos || tipos.includes('protege')) {
            const relatorioProtege = await fetch(`${process.env.API_URL}/protege/relatorio-consolidado/${empresaId}?periodoInicio=${periodoInicio}&periodoFim=${periodoFim}`);
            if (relatorioProtege.ok) {
                relatorios.push({ tipo: 'PROTEGE', dados: await relatorioProtege.json() });
            }
        }
        res.json({
            success: true,
            message: `${relatorios.length} relatórios gerados`,
            relatorios
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao executar ação de gerar relatórios:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatórios',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/', async (req, res) => {
    try {
        const { empresaId, periodo } = req.query;
        const empresas = await empresa_service_1.EmpresaService.listEmpresas();
        const empresasList = empresas.map(e => ({ id: e.id, razaoSocial: e.razaoSocial, cnpj: e.cnpj }));
        const documentos = await document_processor_1.DocumentProcessor.listDocuments();
        const protegeService = new protege_service_1.ProtegeService();
        const documentosFiltrados = empresaId
            ? documentos.filter(d => d.empresa?.id === empresaId)
            : documentos;
        const periodosSet = new Set();
        documentosFiltrados.forEach(doc => {
            if (doc.fiscalData?.periodoInicial) {
                const p = new Date(doc.fiscalData.periodoInicial).toISOString().slice(0, 7);
                periodosSet.add(p);
            }
        });
        const periodos = Array.from(periodosSet).sort();
        const docsPeriodo = periodo
            ? documentosFiltrados.filter(doc => doc.fiscalData?.periodoInicial && new Date(doc.fiscalData.periodoInicial).toISOString().slice(0, 7) === periodo)
            : documentosFiltrados;
        const kpis = {
            empresas: empresas.length,
            documentos: docsPeriodo.length,
            impostos: docsPeriodo.reduce((sum, doc) => sum + (doc.fiscalData?.impostos?.reduce((s, i) => s + (i.valor || 0), 0) || 0), 0),
            proteges: await protegeService.countProtegeDocs(empresaId, periodo),
            erros: docsPeriodo.reduce((sum, doc) => sum + (doc.validationResults?.filter(v => !v.isValid).length || 0), 0),
            pendencias: docsPeriodo.reduce((sum, doc) => sum + (doc.validationResults?.filter(v => v.severity === 'warning').length || 0), 0),
            faturamento: docsPeriodo.reduce((sum, doc) => sum + (doc.fiscalData?.totalFaturamento || 0), 0)
        };
        const graficoFaturamento = [];
        const graficoImpostos = [];
        const faturamentoPorPeriodo = {};
        const impostosPorPeriodo = {};
        docsPeriodo.forEach(doc => {
            if (doc.fiscalData?.periodoInicial) {
                const p = new Date(doc.fiscalData.periodoInicial).toISOString().slice(0, 7);
                faturamentoPorPeriodo[p] = (faturamentoPorPeriodo[p] || 0) + (doc.fiscalData.totalFaturamento || 0);
                impostosPorPeriodo[p] = (impostosPorPeriodo[p] || 0) + (doc.fiscalData.impostos?.reduce((s, i) => s + (i.valor || 0), 0) || 0);
            }
        });
        for (const p of Object.keys(faturamentoPorPeriodo)) {
            graficoFaturamento.push({ periodo: p, valor: faturamentoPorPeriodo[p] });
            graficoImpostos.push({ periodo: p, valor: impostosPorPeriodo[p] });
        }
        graficoFaturamento.sort((a, b) => a.periodo.localeCompare(b.periodo));
        graficoImpostos.sort((a, b) => a.periodo.localeCompare(b.periodo));
        res.json({
            success: true,
            data: {
                empresas: kpis.empresas,
                documentos: kpis.documentos,
                impostos: kpis.impostos,
                proteges: kpis.proteges,
                erros: kpis.erros,
                pendencias: kpis.pendencias,
                faturamento: kpis.faturamento,
                periodos,
                empresasList,
                kpis,
                graficoFaturamento,
                graficoImpostos
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no dashboard', error);
        res.status(500).json({ success: false, error: 'Erro ao carregar dashboard', message: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard-broken.js.map