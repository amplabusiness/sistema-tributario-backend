"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const protege_service_1 = require("../services/protege-service");
const empresa_service_1 = require("../services/empresa-service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/protege/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas arquivos PDF são permitidos'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});
router.post('/upload-pdfs', upload.array('pdfs', 5), async (req, res) => {
    try {
        const { empresaId } = req.body;
        if (!empresaId) {
            return res.status(400).json({ error: 'empresaId é obrigatório' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
        }
        const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(empresaId);
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        const arquivos = req.files.map(file => ({
            nome: file.originalname,
            caminho: file.path
        }));
        const configuracao = await protege_service_1.ProtegeService.processarPdfsProtege(empresaId, arquivos);
        (0, logger_1.logInfo)('PDFs do PROTEGE processados com sucesso', {
            empresaId,
            arquivos: arquivos.length,
            regras: configuracao.regras.length,
            beneficios: configuracao.beneficios.length
        });
        res.json({
            success: true,
            message: 'PDFs do PROTEGE processados com sucesso',
            configuracao: {
                empresaId: configuracao.empresaId,
                regras: configuracao.regras.length,
                beneficios: configuracao.beneficios.length,
                ativo: configuracao.ativo,
                dataInicio: configuracao.dataInicio
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao processar PDFs do PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao processar PDFs do PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/calcular', async (req, res) => {
    try {
        const { empresaId, periodo } = req.body;
        if (!empresaId || !periodo) {
            return res.status(400).json({ error: 'empresaId e periodo são obrigatórios' });
        }
        const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(empresaId);
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        const resultado = await protege_service_1.ProtegeService.calcularProtege(empresaId, periodo);
        if (resultado.status === 'ERRO') {
            return res.status(400).json({
                error: 'Erro no cálculo do PROTEGE',
                details: resultado.erro
            });
        }
        (0, logger_1.logInfo)('PROTEGE calculado com sucesso', {
            empresaId,
            periodo,
            valorFinal: resultado.resultado.valorFinal
        });
        res.json({
            success: true,
            message: 'PROTEGE calculado com sucesso',
            resultado: {
                id: resultado.id,
                empresaId: resultado.empresaId,
                periodo: resultado.periodo,
                totalBaseCalculo: resultado.resultado.totalBaseCalculo,
                totalProtege: resultado.resultado.totalProtege,
                totalBeneficios: resultado.resultado.totalBeneficios,
                valorFinal: resultado.resultado.valorFinal,
                dataCalculo: resultado.dataCalculo
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao calcular PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao calcular PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/resultado/:empresaId/:periodo', async (req, res) => {
    try {
        const { empresaId, periodo } = req.params;
        const resultado = await protege_service_1.ProtegeService.buscarResultado(empresaId, periodo);
        if (!resultado) {
            return res.status(404).json({ error: 'Resultado do PROTEGE não encontrado' });
        }
        res.json({
            success: true,
            resultado: {
                id: resultado.id,
                empresaId: resultado.empresaId,
                periodo: resultado.periodo,
                status: resultado.status,
                totalBaseCalculo: resultado.resultado.totalBaseCalculo,
                totalProtege: resultado.resultado.totalProtege,
                totalBeneficios: resultado.resultado.totalBeneficios,
                valorFinal: resultado.resultado.valorFinal,
                dataCalculo: resultado.dataCalculo,
                erro: resultado.erro
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar resultado do PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao buscar resultado do PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/resultados/:empresaId', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const resultados = await protege_service_1.ProtegeService.listarResultados(empresaId);
        res.json({
            success: true,
            empresaId,
            total: resultados.length,
            resultados: resultados.map(r => ({
                id: r.id,
                periodo: r.periodo,
                status: r.status,
                totalBaseCalculo: r.resultado.totalBaseCalculo,
                totalProtege: r.resultado.totalProtege,
                totalBeneficios: r.resultado.totalBeneficios,
                valorFinal: r.resultado.valorFinal,
                dataCalculo: r.dataCalculo
            }))
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao listar resultados do PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao listar resultados do PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorio/:empresaId', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { periodoInicio, periodoFim } = req.query;
        if (!periodoInicio || !periodoFim) {
            return res.status(400).json({ error: 'periodoInicio e periodoFim são obrigatórios' });
        }
        const relatorio = await protege_service_1.ProtegeService.gerarRelatorioConsolidado(empresaId, periodoInicio, periodoFim);
        res.json({
            success: true,
            relatorio
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório do PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório do PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/detalhes/:empresaId/:periodo', async (req, res) => {
    try {
        const { empresaId, periodo } = req.params;
        const resultado = await protege_service_1.ProtegeService.buscarResultado(empresaId, periodo);
        if (!resultado) {
            return res.status(404).json({ error: 'Resultado do PROTEGE não encontrado' });
        }
        const relatorioBeneficios = resultado.resultado.detalhes.map(detalhe => ({
            item: {
                ncm: detalhe.item.ncm,
                cfop: detalhe.item.cfop,
                cst: detalhe.item.cst,
                descricao: detalhe.item.descricao,
                baseIcms: detalhe.item.baseIcms,
                valorIcms: detalhe.item.valorIcms
            },
            protegeCalculo: {
                baseCalculo: detalhe.protegeCalculo.baseCalculo,
                aliquotaProtege: detalhe.protegeCalculo.aliquotaProtege,
                valorProtege: detalhe.protegeCalculo.valorProtege,
                totalBeneficios: detalhe.protegeCalculo.totalBeneficios,
                valorFinal: detalhe.protegeCalculo.valorFinal,
                beneficiosAplicados: detalhe.protegeCalculo.beneficiosAplicados.map(b => ({
                    codigo: b.beneficio.codigo,
                    descricao: b.beneficio.descricao,
                    tipo: b.beneficio.tipo,
                    valorBeneficio: b.valorBeneficio,
                    tipoCalculo: b.tipoCalculo,
                    condicoesAtendidas: b.condicoesAtendidas
                }))
            }
        }));
        res.json({
            success: true,
            empresaId: resultado.empresaId,
            periodo: resultado.periodo,
            totalItens: resultado.resultado.detalhes.length,
            totalBaseCalculo: resultado.resultado.totalBaseCalculo,
            totalProtege: resultado.resultado.totalProtege,
            totalBeneficios: resultado.resultado.totalBeneficios,
            valorFinal: resultado.resultado.valorFinal,
            detalhes: relatorioBeneficios
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar detalhes do PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao buscar detalhes do PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/configuracao/:empresaId', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const configuracao = req.body;
        const empresa = await empresa_service_1.EmpresaService.buscarEmpresa(empresaId);
        if (!empresa) {
            return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        const novaConfiguracao = await protege_service_1.ProtegeService.atualizarConfiguracao(empresaId, configuracao);
        res.json({
            success: true,
            message: 'Configuração do PROTEGE atualizada com sucesso',
            configuracao: {
                empresaId: novaConfiguracao.empresaId,
                regras: novaConfiguracao.regras.length,
                beneficios: novaConfiguracao.beneficios.length,
                ativo: novaConfiguracao.ativo,
                dataInicio: novaConfiguracao.dataInicio
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao atualizar configuração do PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao atualizar configuração do PROTEGE',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/processar-pdfs', upload.array('arquivos'), async (req, res) => {
    try {
        const { empresaId } = req.body;
        const arquivos = req.files;
        if (!empresaId || !arquivos || arquivos.length === 0) {
            return res.status(400).json({
                error: 'Empresa ID e arquivos são obrigatórios'
            });
        }
        const arquivosProcessar = arquivos.map(arquivo => ({
            nome: arquivo.originalname,
            caminho: arquivo.path
        }));
        const configuracao = await protege_service_1.ProtegeService.processarPdfsProtege(empresaId, arquivosProcessar);
        (0, logger_1.logInfo)(`PDFs PROTEGE processados para empresa ${empresaId}`, {
            arquivos: arquivos.length,
            regras: configuracao.regras.length,
            beneficios: configuracao.beneficios.length
        });
        res.json({
            success: true,
            configuracao,
            message: 'PDFs processados com sucesso'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao processar PDFs PROTEGE:', error);
        res.status(500).json({
            error: 'Erro ao processar PDFs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/teste-calculo', async (req, res) => {
    try {
        const { empresaId, periodo, dadosTeste } = req.body;
        if (!empresaId || !periodo || !dadosTeste) {
            return res.status(400).json({
                error: 'Empresa ID, período e dados de teste são obrigatórios'
            });
        }
        const itensTeste = dadosTeste.itens || [];
        const regrasTeste = dadosTeste.regras || [];
        const creditoMesAnterior = dadosTeste.creditoMesAnterior || 0;
        const { ProtegeCalculator } = await Promise.resolve().then(() => __importStar(require('../services/protege-calculator')));
        const resultado = ProtegeCalculator.calcularProtege(itensTeste, regrasTeste, empresaId, periodo, creditoMesAnterior);
        res.json({
            success: true,
            resultado,
            dadosTeste: {
                itens: itensTeste.length,
                regras: regrasTeste.length,
                creditoMesAnterior
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no teste de cálculo PROTEGE:', error);
        res.status(500).json({
            error: 'Erro no teste de cálculo',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/relatorio-credito-cruzado/:empresaId', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { periodoInicio, periodoFim } = req.query;
        if (!periodoInicio || !periodoFim) {
            return res.status(400).json({
                error: 'Período início e fim são obrigatórios'
            });
        }
        const relatorio = await protege_service_1.ProtegeService.gerarRelatorioCreditoCruzado(empresaId, periodoInicio.toString(), periodoFim.toString());
        res.json({
            success: true,
            relatorio
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao gerar relatório de crédito cruzado:', error);
        res.status(500).json({
            error: 'Erro ao gerar relatório de crédito cruzado',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/credito-mes-anterior/:empresaId/:periodo', async (req, res) => {
    try {
        const { empresaId, periodo } = req.params;
        const ano = parseInt(periodo.substring(0, 4));
        const mes = parseInt(periodo.substring(4, 6));
        let anoAnterior = ano;
        let mesAnterior = mes - 1;
        if (mesAnterior < 1) {
            mesAnterior = 12;
            anoAnterior = ano - 1;
        }
        const mesAnteriorStr = `${anoAnterior.toString().padStart(4, '0')}${mesAnterior.toString().padStart(2, '0')}`;
        const { CacheService } = await Promise.resolve().then(() => __importStar(require('../services/cache')));
        const cache = new CacheService();
        const pagamentoMesAnterior = await cache.get(`protege:pagamento2:${empresaId}:${mesAnteriorStr}`);
        res.json({
            success: true,
            empresaId,
            periodoAtual: periodo,
            mesAnterior: mesAnteriorStr,
            creditoMesAnterior: pagamentoMesAnterior || 0,
            message: `Crédito disponível do mês ${mesAnteriorStr} para compensar no mês ${periodo}`
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao consultar crédito do mês anterior:', error);
        res.status(500).json({
            error: 'Erro ao consultar crédito do mês anterior',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/historico-pagamentos/:empresaId', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { periodoInicio, periodoFim } = req.query;
        if (!periodoInicio || !periodoFim) {
            return res.status(400).json({
                error: 'Período início e fim são obrigatórios'
            });
        }
        const { CacheService } = await Promise.resolve().then(() => __importStar(require('../services/cache')));
        const cache = new CacheService();
        const historico = [];
        const inicio = new Date(parseInt(periodoInicio.substring(0, 4)), parseInt(periodoInicio.substring(4, 6)) - 1, 1);
        const fim = new Date(parseInt(periodoFim.substring(0, 4)), parseInt(periodoFim.substring(4, 6)) - 1, 1);
        for (let data = new Date(inicio); data <= fim; data.setMonth(data.getMonth() + 1)) {
            const periodo = `${data.getFullYear()}${(data.getMonth() + 1).toString().padStart(2, '0')}`;
            const pagamento = await cache.get(`protege:pagamento2:${empresaId}:${periodo}`);
            if (pagamento && pagamento > 0) {
                const ano = data.getFullYear();
                const mes = data.getMonth() + 1;
                let anoCredito = ano;
                let mesCredito = mes + 1;
                if (mesCredito > 12) {
                    mesCredito = 1;
                    anoCredito = ano + 1;
                }
                const mesCreditoStr = `${anoCredito.toString().padStart(4, '0')}${mesCredito.toString().padStart(2, '0')}`;
                historico.push({
                    periodo,
                    pagamento,
                    mesCredito: mesCreditoStr
                });
            }
        }
        res.json({
            success: true,
            empresaId,
            periodoInicio: periodoInicio.toString(),
            periodoFim: periodoFim.toString(),
            historico,
            totalPagamentos: historico.reduce((sum, item) => sum + item.pagamento, 0),
            message: 'Histórico de pagamentos PROTEGE 2% consultado com sucesso'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao consultar histórico de pagamentos:', error);
        res.status(500).json({
            error: 'Erro ao consultar histórico de pagamentos',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=protege.js.map