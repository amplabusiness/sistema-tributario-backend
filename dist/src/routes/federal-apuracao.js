"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const federal_agent_1 = require("@/services/agents/federal-agent");
const validation_1 = require("@/middleware/validation");
const auth_1 = require("@/middleware/auth");
const router = (0, express_1.Router)();
const federalAgent = new federal_agent_1.FederalAgent();
router.post('/apurar', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('periodo').isString().matches(/^\d{2}\/\d{4}$/).withMessage('Período deve estar no formato MM/AAAA'),
    (0, express_validator_1.body)('documentos').optional().isArray().withMessage('Documentos deve ser um array'),
    (0, express_validator_1.body)('tipoApuracao').optional().isIn(['pis_cofins', 'irpj_csll', 'completa']).withMessage('Tipo de apuracao inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, documentos, tipoApuracao = 'completa' } = req.body;
        console.log('🚀 API: Iniciando apuracao Federal automática', {
            empresaId,
            periodo,
            tipoApuracao,
            documentos: documentos?.length || 0,
            userId: req.user?.id,
        });
        const resultados = [];
        for (const documentId of documentos || []) {
            try {
                const resultado = await federalAgent.processDocument(documentId);
                resultados.push(...resultado);
            }
            catch (error) {
                console.error('❌ API: Erro ao processar documento Federal', {
                    documentId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        const totais = calcularTotaisFederais(resultados);
        const observacoes = gerarObservacoesFederais(resultados, totais);
        console.log('✅ API: Apuração Federal concluída', {
            empresaId,
            periodo,
            documentosProcessados: documentos?.length || 0,
            itensProcessados: resultados.length,
            totais: {
                pis: totais.pis.valorTotal,
                cofins: totais.cofins.valorTotal,
                irpj: totais.irpj.valorTotal,
                csll: totais.csll.valorTotal,
            },
        });
        res.status(200).json({
            success: true,
            message: 'Apuração Federal executada com sucesso',
            data: {
                empresaId,
                periodo,
                tipoApuracao,
                resultados,
                totais,
                observacoes,
                metadata: {
                    documentosProcessados: documentos?.length || 0,
                    itensProcessados: resultados.length,
                    beneficiosAplicados: contarBeneficios(resultados),
                    tempoProcessamento: Date.now(),
                },
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro na apuracao Federal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro na apuracao Federal',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/documento/:documentId', auth_1.authenticateToken, [
    (0, express_validator_1.param)('documentId').isString().notEmpty().withMessage('ID do documento é obrigatório'),
    (0, express_validator_1.body)('tipoApuracao').optional().isIn(['pis_cofins', 'irpj_csll', 'completa']).withMessage('Tipo de apuracao inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { documentId } = req.params;
        const { tipoApuracao = 'completa' } = req.body;
        console.log('🚀 API: Processando documento Federal específico', {
            documentId,
            tipoApuracao,
            userId: req.user?.id,
        });
        const resultados = await federalAgent.processDocument(documentId);
        const totais = calcularTotaisFederais(resultados);
        console.log('✅ API: Documento Federal processado', {
            documentId,
            itensProcessados: resultados.length,
            totais,
        });
        res.status(200).json({
            success: true,
            message: 'Documento Federal processado com sucesso',
            data: {
                documentId,
                tipoApuracao,
                resultados,
                totais,
                metadata: {
                    itensProcessados: resultados.length,
                    beneficiosAplicados: contarBeneficios(resultados),
                },
            },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao processar documento Federal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao processar documento Federal',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/apuracoes', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
    (0, express_validator_1.query)('tipoApuracao').optional().isIn(['pis_cofins', 'irpj_csll', 'completa']).withMessage('Tipo de apuracao inválido'),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    (0, express_validator_1.query)('offset').optional().isInt({ min: 0 }).withMessage('Offset deve ser >= 0'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, tipoApuracao, limit = 20, offset = 0 } = req.query;
        console.log('🔍 API: Consultando apurações Federais', {
            empresaId,
            periodo,
            tipoApuracao,
            limit,
            offset,
            userId: req.user?.id,
        });
        const apuracoes = [];
        res.status(200).json({
            success: true,
            message: 'Apurações Federais consultadas com sucesso',
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
        console.error('❌ API: Erro ao consultar apurações Federais', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar apurações Federais',
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
        console.log('📊 API: Gerando dashboard Federal', {
            empresaId,
            periodo,
            userId: req.user?.id,
        });
        const dashboard = {
            resumo: {
                totalOperacoes: 0,
                valorTotal: 0,
                pisDevido: 0,
                cofinsDevido: 0,
                irpjDevido: 0,
                csllDevido: 0,
            },
            graficos: {
                porImposto: [],
                porBeneficio: [],
                porPeriodo: [],
                porProduto: [],
            },
            alertas: [],
            beneficios: {
                total: 0,
                porTipo: {},
            },
        };
        res.status(200).json({
            success: true,
            message: 'Dashboard Federal gerado com sucesso',
            data: { dashboard },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao gerar dashboard Federal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar dashboard Federal',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/beneficios', auth_1.authenticateToken, [
    (0, express_validator_1.query)('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    (0, express_validator_1.query)('periodo').optional().isString().withMessage('Período deve ser string'),
    (0, express_validator_1.query)('tipo').optional().isIn(['pis', 'cofins', 'irpj', 'csll']).withMessage('Tipo de imposto inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, periodo, tipo } = req.query;
        console.log('🔍 API: Consultando benefícios fiscais', {
            empresaId,
            periodo,
            tipo,
            userId: req.user?.id,
        });
        const beneficios = {
            pis: {
                creditoPresumido: 0,
                creditoInsumos: 0,
                creditoEnergia: 0,
                creditoFrete: 0,
                creditoEmbalagens: 0,
            },
            cofins: {
                creditoPresumido: 0,
                creditoInsumos: 0,
                creditoEnergia: 0,
                creditoFrete: 0,
                creditoEmbalagens: 0,
            },
            irpj: {
                isencao: 0,
                reducao: 0,
            },
            csll: {
                isencao: 0,
                reducao: 0,
            },
        };
        res.status(200).json({
            success: true,
            message: 'Benefícios fiscais consultados com sucesso',
            data: { beneficios },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao consultar benefícios fiscais', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao consultar benefícios fiscais',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/relatorios/:periodo', auth_1.authenticateToken, [
    (0, express_validator_1.param)('periodo').isString().matches(/^\d{2}\/\d{4}$/).withMessage('Período deve estar no formato MM/AAAA'),
    (0, express_validator_1.query)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.query)('formato').optional().isIn(['pdf', 'excel', 'json']).withMessage('Formato inválido'),
    (0, express_validator_1.query)('tipo').optional().isIn(['pis_cofins', 'irpj_csll', 'completo']).withMessage('Tipo de relatório inválido'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { periodo } = req.params;
        const { empresaId, formato = 'pdf', tipo = 'completo' } = req.query;
        console.log('📄 API: Gerando relatório Federal', {
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
            conteudo: 'Relatório Federal gerado automaticamente pela IA',
            dataGeracao: new Date(),
            totais: {
                pis: 0,
                cofins: 0,
                irpj: 0,
                csll: 0,
            },
            beneficios: {
                total: 0,
                detalhado: {},
            },
        };
        res.status(200).json({
            success: true,
            message: 'Relatório Federal gerado com sucesso',
            data: { relatorio },
        });
    }
    catch (error) {
        console.error('❌ API: Erro ao gerar relatório Federal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar relatório Federal',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
function calcularTotaisFederais(resultados) {
    const totais = {
        pis: {
            baseCalculo: 0,
            valorTotal: 0,
            creditoPresumido: 0,
            creditoInsumos: 0,
            creditoEnergia: 0,
            creditoFrete: 0,
            creditoEmbalagens: 0,
        },
        cofins: {
            baseCalculo: 0,
            valorTotal: 0,
            creditoPresumido: 0,
            creditoInsumos: 0,
            creditoEnergia: 0,
            creditoFrete: 0,
            creditoEmbalagens: 0,
        },
        irpj: {
            baseCalculo: 0,
            valorTotal: 0,
            isencao: 0,
            reducao: 0,
        },
        csll: {
            baseCalculo: 0,
            valorTotal: 0,
            isencao: 0,
            reducao: 0,
        },
    };
    for (const resultado of resultados) {
        const calc = resultado.calculo;
        totais.pis.baseCalculo += calc.pis.baseCalculo;
        totais.pis.valorTotal += calc.pis.valorPIS;
        totais.pis.creditoPresumido += calc.pis.creditoPresumido || 0;
        totais.pis.creditoInsumos += calc.pis.creditoInsumos || 0;
        totais.pis.creditoEnergia += calc.pis.creditoEnergia || 0;
        totais.pis.creditoFrete += calc.pis.creditoFrete || 0;
        totais.pis.creditoEmbalagens += calc.pis.creditoEmbalagens || 0;
        totais.cofins.baseCalculo += calc.cofins.baseCalculo;
        totais.cofins.valorTotal += calc.cofins.valorCOFINS;
        totais.cofins.creditoPresumido += calc.cofins.creditoPresumido || 0;
        totais.cofins.creditoInsumos += calc.cofins.creditoInsumos || 0;
        totais.cofins.creditoEnergia += calc.cofins.creditoEnergia || 0;
        totais.cofins.creditoFrete += calc.cofins.creditoFrete || 0;
        totais.cofins.creditoEmbalagens += calc.cofins.creditoEmbalagens || 0;
        totais.irpj.baseCalculo += calc.irpj.baseCalculo;
        totais.irpj.valorTotal += calc.irpj.valorIRPJ;
        totais.irpj.isencao += calc.irpj.isencao || 0;
        totais.irpj.reducao += calc.irpj.reducao || 0;
        totais.csll.baseCalculo += calc.csll.baseCalculo;
        totais.csll.valorTotal += calc.csll.valorCSLL;
        totais.csll.isencao += calc.csll.isencao || 0;
        totais.csll.reducao += calc.csll.reducao || 0;
    }
    return totais;
}
function gerarObservacoesFederais(resultados, totais) {
    const observacoes = [];
    if (totais.pis.valorTotal > 0) {
        observacoes.push(`PIS devido: R$ ${totais.pis.valorTotal.toFixed(2)}`);
    }
    if (totais.cofins.valorTotal > 0) {
        observacoes.push(`COFINS devido: R$ ${totais.cofins.valorTotal.toFixed(2)}`);
    }
    if (totais.irpj.valorTotal > 0) {
        observacoes.push(`IRPJ devido: R$ ${totais.irpj.valorTotal.toFixed(2)}`);
    }
    if (totais.csll.valorTotal > 0) {
        observacoes.push(`CSLL devido: R$ ${totais.csll.valorTotal.toFixed(2)}`);
    }
    const totalBeneficios = totais.pis.creditoPresumido + totais.cofins.creditoPresumido +
        totais.irpj.isencao + totais.csll.isencao;
    if (totalBeneficios > 0) {
        observacoes.push(`Total de benefícios fiscais aplicados: R$ ${totalBeneficios.toFixed(2)}`);
    }
    return observacoes;
}
function contarBeneficios(resultados) {
    let total = 0;
    for (const resultado of resultados) {
        total += resultado.beneficios.length;
    }
    return total;
}
exports.default = router;
//# sourceMappingURL=federal-apuracao.js.map