"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtegeService = void 0;
const protege_pdf_parser_1 = require("./parsers/protege-pdf-parser");
const protege_calculator_1 = require("./protege-calculator");
const cache_1 = require("./cache");
const logger_1 = require("../utils/logger");
class ProtegeService {
    static async processarPdfsProtege(empresaId, arquivos) {
        try {
            const regras = [];
            const beneficios = [];
            for (const arquivo of arquivos) {
                (0, logger_1.logInfo)(`Processando arquivo PROTEGE: ${arquivo.nome}`);
                if (arquivo.nome.toLowerCase().includes('protege goias') && !arquivo.nome.includes('2%')) {
                    const regrasProtege = protege_pdf_parser_1.ProtegePdfParser.parseProtegeGoias(arquivo.caminho);
                    regras.push(...regrasProtege);
                }
                else if (arquivo.nome.toLowerCase().includes('2%')) {
                    const regras2Percent = protege_pdf_parser_1.ProtegePdfParser.parseProtege2Percent(arquivo.caminho);
                    regras.push(...regras2Percent);
                }
                else if (arquivo.nome.toLowerCase().includes('guia')) {
                    const beneficiosGuia = protege_pdf_parser_1.ProtegePdfParser.parseGuiaPratico(arquivo.caminho);
                    beneficios.push(...beneficiosGuia);
                }
            }
            const configuracao = {
                empresaId,
                regras,
                beneficios,
                ativo: true,
                dataInicio: new Date()
            };
            await this.cache.set(`protege:config:${empresaId}`, configuracao, 3600);
            (0, logger_1.logInfo)(`Configuração PROTEGE processada para empresa ${empresaId}: ${regras.length} regras, ${beneficios.length} benefícios`);
            return configuracao;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar PDFs do PROTEGE:', error);
            throw new Error(`Erro ao processar PDFs do PROTEGE: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async calcularProtege(empresaId, periodo, configuracao) {
        try {
            if (!configuracao) {
                const cachedConfig = await this.cache.get(`protege:config:${empresaId}`);
                if (!cachedConfig) {
                    throw new Error('Configuração PROTEGE não encontrada para a empresa');
                }
                configuracao = cachedConfig;
            }
            if (!protege_calculator_1.ProtegeCalculator.validarElegibilidade(empresaId, configuracao.regras)) {
                throw new Error('Empresa não elegível para o PROTEGE');
            }
            const dadosSped = await this.buscarDadosSpedFiscal(empresaId, periodo);
            if (!dadosSped || dadosSped.length === 0) {
                throw new Error('Dados SPED Fiscal não encontrados para o período');
            }
            const creditoMesAnterior = await this.buscarCreditoMesAnterior(empresaId, periodo);
            const resultado = protege_calculator_1.ProtegeCalculator.calcularProtege(dadosSped, configuracao.regras, empresaId, periodo, creditoMesAnterior);
            const protegeResultado = {
                id: `protege_${empresaId}_${periodo}_${Date.now()}`,
                empresaId,
                periodo,
                configuracao,
                resultado,
                dataCalculo: new Date(),
                status: 'CALCULADO'
            };
            await this.cache.set(`protege:resultado:${empresaId}:${periodo}`, protegeResultado, 7200);
            if (resultado.protege2Pagamento > 0) {
                await this.salvarPagamentoProtege2(empresaId, periodo, resultado.protege2Pagamento);
            }
            (0, logger_1.logInfo)(`PROTEGE calculado para empresa ${empresaId}, período ${periodo}: R$ ${resultado.valorFinal.toFixed(2)}`, {
                protege15: resultado.totalProtege15,
                protege2: resultado.totalProtege2,
                beneficios: resultado.totalBeneficios,
                creditoMesAnterior,
                saldoProtege2: resultado.saldoProtege2
            });
            return protegeResultado;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao calcular PROTEGE:', error);
            const resultadoErro = {
                id: `protege_${empresaId}_${periodo}_${Date.now()}`,
                empresaId,
                periodo,
                configuracao: configuracao || { empresaId, regras: [], beneficios: [], ativo: false, dataInicio: new Date() },
                resultado: {
                    empresaId,
                    periodo,
                    totalBaseCalculo: 0,
                    totalProtege15: 0,
                    totalProtege2: 0,
                    totalBeneficios: 0,
                    valorFinal: 0,
                    detalhes: [],
                    protege2Pagamento: 0,
                    protege2Credito: 0,
                    saldoProtege2: 0
                },
                dataCalculo: new Date(),
                status: 'ERRO',
                erro: error instanceof Error ? error.message : 'Unknown error'
            };
            return resultadoErro;
        }
    }
    static async buscarCreditoMesAnterior(empresaId, periodo) {
        try {
            const mesAnterior = this.calcularMesAnterior(periodo);
            const pagamentoMesAnterior = await this.cache.get(`protege:pagamento2:${empresaId}:${mesAnterior}`);
            return pagamentoMesAnterior || 0;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar crédito do mês anterior:', error);
            return 0;
        }
    }
    static async salvarPagamentoProtege2(empresaId, periodo, valor) {
        try {
            await this.cache.set(`protege:pagamento2:${empresaId}:${periodo}`, valor, 2592000);
            (0, logger_1.logInfo)(`Pagamento PROTEGE 2% salvo para crédito futuro`, { empresaId, periodo, valor });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao salvar pagamento PROTEGE 2%:', error);
        }
    }
    static calcularMesAnterior(periodo) {
        if (!periodo || periodo.length !== 6) {
            return '';
        }
        const ano = parseInt(periodo.substring(0, 4));
        const mes = parseInt(periodo.substring(4, 6));
        let anoAnterior = ano;
        let mesAnterior = mes - 1;
        if (mesAnterior < 1) {
            mesAnterior = 12;
            anoAnterior = ano - 1;
        }
        return `${anoAnterior.toString().padStart(4, '0')}${mesAnterior.toString().padStart(2, '0')}`;
    }
    static async buscarDadosSpedFiscal(empresaId, periodo) {
        try {
            const documentos = await this.buscarDocumentosPorTipo(empresaId, 'SPED_FISCAL', periodo);
            const itens = [];
            for (const documento of documentos) {
                if (documento.dadosExtraidos && documento.dadosExtraidos.itens) {
                    itens.push(...documento.dadosExtraidos.itens);
                }
            }
            return itens;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar dados SPED Fiscal:', error);
            return [];
        }
    }
    static async buscarDocumentosPorTipo(empresaId, tipo, periodo) {
        try {
            return [];
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar documentos por tipo:', error);
            return [];
        }
    }
    static async buscarResultado(empresaId, periodo) {
        try {
            return await this.cache.get(`protege:resultado:${empresaId}:${periodo}`);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar resultado PROTEGE:', error);
            return null;
        }
    }
    static async listarResultados(empresaId) {
        try {
            const chaves = await this.buscarChavesCache(`protege:resultado:${empresaId}:*`);
            const resultados = [];
            for (const chave of chaves) {
                const resultado = await this.cache.get(chave);
                if (resultado) {
                    resultados.push(resultado);
                }
            }
            return resultados.sort((a, b) => b.dataCalculo.getTime() - a.dataCalculo.getTime());
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao listar resultados PROTEGE:', error);
            return [];
        }
    }
    static async buscarChavesCache(pattern) {
        try {
            return [];
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar chaves do cache:', error);
            return [];
        }
    }
    static async gerarRelatorioConsolidado(empresaId, periodoInicio, periodoFim) {
        try {
            const resultados = await this.listarResultados(empresaId);
            const resultadosFiltrados = resultados.filter(r => r.periodo >= periodoInicio && r.periodo <= periodoFim && r.status === 'CALCULADO');
            const consolidado = {
                empresaId,
                periodoInicio,
                periodoFim,
                totalPeriodos: resultadosFiltrados.length,
                totalBaseCalculo: 0,
                totalProtege15: 0,
                totalProtege2: 0,
                totalBeneficios: 0,
                valorFinal: 0, beneficiosPorTipo: {},
                detalhesPorPeriodo: []
            };
            for (const resultado of resultadosFiltrados) {
                consolidado.totalBaseCalculo += resultado.resultado.totalBaseCalculo;
                consolidado.totalProtege15 += resultado.resultado.totalProtege15;
                consolidado.totalProtege2 += resultado.resultado.totalProtege2;
                consolidado.totalBeneficios += resultado.resultado.totalBeneficios;
                consolidado.valorFinal += resultado.resultado.valorFinal;
                const relatorioBeneficios = protege_calculator_1.ProtegeCalculator.gerarRelatorioBeneficios(resultado.resultado);
                for (const [tipo, valor] of Object.entries(relatorioBeneficios.beneficiosPorTipo)) {
                    consolidado.beneficiosPorTipo[tipo] = (consolidado.beneficiosPorTipo[tipo] || 0) + valor;
                }
                consolidado.detalhesPorPeriodo.push({
                    periodo: resultado.periodo,
                    baseCalculo: resultado.resultado.totalBaseCalculo,
                    protege15: resultado.resultado.totalProtege15,
                    protege2: resultado.resultado.totalProtege2,
                    beneficios: resultado.resultado.totalBeneficios,
                    valorFinal: resultado.resultado.valorFinal,
                    protege2Pagamento: resultado.resultado.protege2Pagamento,
                    protege2Credito: resultado.resultado.protege2Credito,
                    saldoProtege2: resultado.resultado.saldoProtege2
                });
            }
            return consolidado;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao gerar relatório consolidado PROTEGE:', error);
            throw new Error(`Erro ao gerar relatório: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async gerarRelatorioCreditoCruzado(empresaId, periodoInicio, periodoFim) {
        try {
            const resultados = await this.listarResultados(empresaId);
            const resultadosFiltrados = resultados.filter(r => r.periodo >= periodoInicio && r.periodo <= periodoFim && r.status === 'CALCULADO');
            const relatorio = protege_calculator_1.ProtegeCalculator.gerarRelatorioCreditoCruzado(resultadosFiltrados.map(r => r.resultado), periodoInicio, periodoFim);
            return {
                empresaId,
                ...relatorio
            };
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao gerar relatório de crédito cruzado:', error);
            throw new Error(`Erro ao gerar relatório de crédito cruzado: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    static async atualizarConfiguracao(empresaId, configuracao) {
        try {
            const configAtual = await this.cache.get(`protege:config:${empresaId}`);
            const novaConfig = configAtual ? { ...configAtual, ...configuracao } : {
                empresaId,
                regras: [],
                beneficios: [],
                ativo: false,
                dataInicio: new Date(),
                ...configuracao
            };
            await this.cache.set(`protege:config:${empresaId}`, novaConfig, 3600);
            (0, logger_1.logInfo)(`Configuração PROTEGE atualizada para empresa ${empresaId}`);
            return novaConfig;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao atualizar configuração PROTEGE:', error);
            throw new Error(`Erro ao atualizar configuração: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.ProtegeService = ProtegeService;
ProtegeService.cache = new cache_1.CacheService();
//# sourceMappingURL=protege-service.js.map