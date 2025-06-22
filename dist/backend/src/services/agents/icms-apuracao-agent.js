"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.icmsApuracaoAgent = exports.ICMSApuracaoAgent = void 0;
const logger_1 = require("@/utils/logger");
const br_utils_1 = require("@/utils/br-utils");
const openai_service_1 = require("@/services/openai-service");
const queue_1 = require("@/services/queue");
const ICMS_CONFIG = {
    maxPlanilhas: 10,
    maxRelatorios: 5,
    timeout: 60000,
    retryAttempts: 3,
    batchSize: 50,
};
const regrasCache = new Map();
class ICMSApuracaoAgent {
    constructor() {
        this.isRunning = false;
        this.processingQueue = [];
    }
    async start() {
        if (this.isRunning) {
            (0, logger_1.logInfo)('Agente de apuração ICMS já está em execução');
            return;
        }
        this.isRunning = true;
        (0, logger_1.logInfo)('🚀 Iniciando Agente de Apuração ICMS', {
            config: ICMS_CONFIG,
        });
        await this.carregarRegrasICMS();
    }
    async stop() {
        this.isRunning = false;
        (0, logger_1.logInfo)('🛑 Agente de Apuração ICMS parado');
    }
    async processarApuracao(empresa, cnpj, periodo, documentos, planilhas, relatorios) {
        const apuracaoId = this.generateApuracaoId(empresa, cnpj, periodo);
        this.processingQueue.push(apuracaoId);
        const apuracao = {
            id: apuracaoId,
            empresa,
            cnpj,
            periodo,
            dataProcessamento: new Date(),
            status: 'pendente',
            documentos,
            planilhas,
            relatorios,
            totais: {
                baseCalculo: 0,
                icmsDevido: 0,
                icmsRecolhido: 0,
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
                tecnico: '',
                dashboard: '',
                memoriaCalculo: '',
            },
            erros: [],
            observacoes: '',
        };
        try {
            (0, logger_1.logInfo)('Iniciando apuração de ICMS', {
                apuracaoId,
                empresa,
                periodo,
                quantidadeDocumentos: documentos.length,
                quantidadePlanilhas: planilhas.length,
                quantidadeRelatorios: relatorios.length,
            });
            const regrasExtraidas = await this.extrairRegrasPlanilhas(planilhas, relatorios);
            const dadosDocumentos = await this.processarDocumentos(documentos);
            const resultadoApuracao = await this.aplicarRegrasICMS(dadosDocumentos, regrasExtraidas);
            const totais = this.calcularTotais(resultadoApuracao);
            const relatoriosGerados = await this.gerarRelatorios(resultadoApuracao, totais);
            apuracao.produtos = resultadoApuracao.produtos;
            apuracao.operacoes = resultadoApuracao.operacoes;
            apuracao.regrasAplicadas = resultadoApuracao.regrasAplicadas;
            apuracao.totais = totais;
            apuracao.relatoriosGerados = relatoriosGerados;
            apuracao.status = 'concluido';
            apuracao.observacoes = 'Apuração ICMS concluída com sucesso';
            await this.salvarNoBanco(apuracao);
            (0, logger_1.logInfo)('Apuração ICMS concluída com sucesso', {
                apuracaoId,
                empresa,
                periodo,
                quantidadeProdutos: apuracao.produtos.length,
                quantidadeOperacoes: apuracao.operacoes.length,
                totais: apuracao.totais,
            });
            await (0, queue_1.addToQueue)('apuracao-federal', {
                apuracaoId,
                empresa,
                periodo,
                dados: resultadoApuracao,
            });
            return apuracao;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar apuração ICMS', {
                apuracaoId,
                empresa,
                periodo,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            apuracao.status = 'erro';
            apuracao.erros.push(error instanceof Error ? error.message : 'Erro desconhecido');
            await this.salvarNoBanco(apuracao);
            return apuracao;
        }
        finally {
            const index = this.processingQueue.indexOf(apuracaoId);
            if (index > -1) {
                this.processingQueue.splice(index, 1);
            }
        }
    }
    async extrairRegrasPlanilhas(planilhas, relatorios) {
        const regras = [];
        try {
            for (const planilha of planilhas) {
                const regrasPlanilha = await this.extrairRegrasPlanilha(planilha);
                regras.push(...regrasPlanilha);
            }
            for (const relatorio of relatorios) {
                const regrasRelatorio = await this.extrairRegrasRelatorio(relatorio);
                regras.push(...regrasRelatorio);
            }
            (0, logger_1.logInfo)('Regras ICMS extraídas', {
                quantidadePlanilhas: planilhas.length,
                quantidadeRelatorios: relatorios.length,
                quantidadeRegras: regras.length,
            });
            return regras;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao extrair regras ICMS', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async extrairRegrasPlanilha(planilhaPath) {
        try {
            const conteudo = await this.lerArquivo(planilhaPath);
            const analiseIA = await (0, openai_service_1.analisarXML)(conteudo, 'PLANILHA_ICMS');
            if (!analiseIA.success) {
                throw new Error('Falha na análise IA da planilha');
            }
            const regras = this.parsearRegrasPlanilha(conteudo, analiseIA.content);
            return regras;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao extrair regras da planilha', {
                planilhaPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return [];
        }
    }
    async extrairRegrasRelatorio(relatorioPath) {
        try {
            const conteudo = await this.lerArquivo(relatorioPath);
            const analiseIA = await (0, openai_service_1.analisarXML)(conteudo, 'RELATORIO_ICMS');
            if (!analiseIA.success) {
                throw new Error('Falha na análise IA do relatório');
            }
            const regras = this.parsearRegrasRelatorio(conteudo, analiseIA.content);
            return regras;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao extrair regras do relatório', {
                relatorioPath,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return [];
        }
    }
    async processarDocumentos(documentos) {
        const dados = {
            produtos: [],
            operacoes: [],
            totais: {
                baseCalculo: 0,
                icmsDevido: 0,
                icmsRecolhido: 0,
            },
        };
        try {
            for (const documentoId of documentos) {
                const documento = await this.buscarDocumento(documentoId);
                if (documento && documento.dados) {
                    const dadosICMS = this.extrairDadosICMS(documento.dados);
                    dados.produtos.push(...dadosICMS.produtos);
                    dados.operacoes.push(...dadosICMS.operacoes);
                }
            }
            dados.totais = this.calcularTotaisDocumentos(dados.produtos, dados.operacoes);
            return dados;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar documentos', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async aplicarRegrasICMS(dados, regras) {
        const resultado = {
            produtos: [],
            operacoes: [],
            regrasAplicadas: [],
        };
        try {
            for (const produto of dados.produtos) {
                const produtoProcessado = await this.aplicarRegrasProduto(produto, regras);
                resultado.produtos.push(produtoProcessado);
            }
            for (const operacao of dados.operacoes) {
                const operacaoProcessada = await this.aplicarRegrasOperacao(operacao, regras);
                resultado.operacoes.push(operacaoProcessada);
            }
            resultado.regrasAplicadas = regras.filter(r => r.ativo);
            return resultado;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao aplicar regras ICMS', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async aplicarRegrasProduto(produto, regras) {
        const produtoICMS = {
            id: produto.id || `prod_${Date.now()}`,
            codigo: produto.codigo,
            descricao: produto.descricao,
            ncm: produto.ncm,
            quantidade: produto.quantidade || 0,
            valorUnitario: produto.valorUnitario || 0,
            valorTotal: produto.valorTotal || 0,
            baseCalculo: produto.baseCalculo || produto.valorTotal || 0,
            aliquota: produto.aliquota || 0,
            icmsDevido: 0,
            icmsRecolhido: 0,
            icmsACompensar: 0,
            regrasAplicadas: [],
            observacoes: '',
        };
        const regrasAplicaveis = regras.filter(regra => regra.ativo &&
            (regra.ncm.includes(produto.ncm) || regra.ncm.includes('*')) &&
            (regra.cfop.includes(produto.cfop) || regra.cfop.includes('*')));
        for (const regra of regrasAplicaveis) {
            produtoICMS.regrasAplicadas.push(regra.descricao);
            switch (regra.tipo) {
                case 'base_reduzida':
                    if (regra.baseReduzida) {
                        produtoICMS.baseCalculo = produtoICMS.baseCalculo * (regra.baseReduzida / 100);
                        produtoICMS.observacoes += `Base reduzida aplicada: ${regra.baseReduzida}%. `;
                    }
                    break;
                case 'credito_outorgado':
                    if (regra.creditoOutorgado) {
                        produtoICMS.icmsACompensar = produtoICMS.baseCalculo * (regra.creditoOutorgado / 100) * (regra.aliquota / 100);
                        produtoICMS.observacoes += `Crédito outorgado aplicado: ${regra.creditoOutorgado}%. `;
                    }
                    break;
                case 'protege':
                    if (regra.protege) {
                        const protege = produtoICMS.baseCalculo * (regra.protege.aliquota / 100);
                        produtoICMS.icmsDevido += protege;
                        produtoICMS.observacoes += `Protege aplicado: ${regra.protege.aliquota}%. `;
                    }
                    break;
            }
        }
        produtoICMS.icmsDevido = produtoICMS.baseCalculo * (produtoICMS.aliquota / 100);
        produtoICMS.icmsRecolhido = produtoICMS.icmsDevido - produtoICMS.icmsACompensar;
        return produtoICMS;
    }
    async aplicarRegrasOperacao(operacao, regras) {
        const operacaoICMS = {
            id: operacao.id || `op_${Date.now()}`,
            tipo: operacao.tipo || 'saida',
            cfop: operacao.cfop,
            cst: operacao.cst,
            quantidade: operacao.quantidade || 0,
            valorTotal: operacao.valorTotal || 0,
            baseCalculo: operacao.baseCalculo || operacao.valorTotal || 0,
            aliquota: operacao.aliquota || 0,
            icmsDevido: 0,
            icmsRecolhido: 0,
            icmsACompensar: 0,
            observacoes: '',
        };
        const regrasAplicaveis = regras.filter(regra => regra.ativo &&
            regra.cfop.includes(operacao.cfop) &&
            regra.cst.includes(operacao.cst));
        for (const regra of regrasAplicaveis) {
            switch (regra.tipo) {
                case 'difal':
                    if (regra.difal) {
                        const difal = operacaoICMS.baseCalculo *
                            ((regra.difal.aliquotaInterna - regra.difal.aliquotaInterestadual) / 100);
                        operacaoICMS.difal = difal;
                        operacaoICMS.observacoes += `DIFAL aplicado: ${regra.difal.aliquotaInterna}% - ${regra.difal.aliquotaInterestadual}%. `;
                    }
                    break;
                case 'ciap':
                    if (regra.aliquota) {
                        const ciap = operacaoICMS.baseCalculo * (regra.aliquota / 100);
                        operacaoICMS.ciap = ciap;
                        operacaoICMS.observacoes += `CIAP aplicado: ${regra.aliquota}%. `;
                    }
                    break;
            }
        }
        operacaoICMS.icmsDevido = operacaoICMS.baseCalculo * (operacaoICMS.aliquota / 100);
        operacaoICMS.icmsRecolhido = operacaoICMS.icmsDevido + (operacaoICMS.difal || 0) + (operacaoICMS.ciap || 0);
        return operacaoICMS;
    }
    calcularTotais(resultado) {
        const totais = {
            baseCalculo: 0,
            icmsDevido: 0,
            icmsRecolhido: 0,
            icmsACompensar: 0,
            icmsAReembolsar: 0,
            difal: 0,
            protege: 0,
            ciap: 0,
        };
        for (const produto of resultado.produtos) {
            totais.baseCalculo += produto.baseCalculo;
            totais.icmsDevido += produto.icmsDevido;
            totais.icmsRecolhido += produto.icmsRecolhido;
            totais.icmsACompensar += produto.icmsACompensar;
        }
        for (const operacao of resultado.operacoes) {
            totais.baseCalculo += operacao.baseCalculo;
            totais.icmsDevido += operacao.icmsDevido;
            totais.icmsRecolhido += operacao.icmsRecolhido;
            totais.difal += operacao.difal || 0;
            totais.ciap += operacao.ciap || 0;
        }
        totais.icmsAReembolsar = totais.icmsACompensar - totais.icmsDevido;
        return totais;
    }
    async gerarRelatorios(resultado, totais) {
        try {
            const relatorioTecnico = await this.gerarRelatorioTecnico(resultado, totais);
            const dashboard = await this.gerarDashboard(resultado, totais);
            const memoriaCalculo = await this.gerarMemoriaCalculo(resultado, totais);
            return {
                tecnico: relatorioTecnico,
                dashboard: dashboard,
                memoriaCalculo: memoriaCalculo,
            };
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao gerar relatórios', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return {
                tecnico: 'Erro ao gerar relatório técnico',
                dashboard: 'Erro ao gerar dashboard',
                memoriaCalculo: 'Erro ao gerar memória de cálculo',
            };
        }
    }
    async gerarRelatorioTecnico(resultado, totais) {
        const relatorio = `
# RELATÓRIO TÉCNICO - APURAÇÃO ICMS

## RESUMO EXECUTIVO
- **Base de Cálculo Total**: ${(0, br_utils_1.formatarValorBR)(totais.baseCalculo)}
- **ICMS Devido**: ${(0, br_utils_1.formatarValorBR)(totais.icmsDevido)}
- **ICMS Recolhido**: ${(0, br_utils_1.formatarValorBR)(totais.icmsRecolhido)}
- **ICMS a Compensar**: ${(0, br_utils_1.formatarValorBR)(totais.icmsACompensar)}
- **ICMS a Reembolsar**: ${(0, br_utils_1.formatarValorBR)(totais.icmsAReembolsar)}
- **DIFAL**: ${(0, br_utils_1.formatarValorBR)(totais.difal)}
- **CIAP**: ${(0, br_utils_1.formatarValorBR)(totais.ciap)}

## PRODUTOS PROCESSADOS
${resultado.produtos.map(p => `- ${p.descricao}: ${(0, br_utils_1.formatarValorBR)(p.icmsDevido)}`).join('\n')}

## OPERAÇÕES PROCESSADAS
${resultado.operacoes.map(o => `- ${o.tipo} ${o.cfop}: ${(0, br_utils_1.formatarValorBR)(o.icmsRecolhido)}`).join('\n')}

## REGRAS APLICADAS
${resultado.regrasAplicadas.map(r => `- ${r.descricao} (${r.uf})`).join('\n')}
    `;
        return relatorio;
    }
    async gerarDashboard(resultado, totais) {
        const dashboard = `
# DASHBOARD ICMS

## MÉTRICAS PRINCIPAIS
- **Base de Cálculo**: ${(0, br_utils_1.formatarValorBR)(totais.baseCalculo)}
- **ICMS Devido**: ${(0, br_utils_1.formatarValorBR)(totais.icmsDevido)}
- **ICMS Recolhido**: ${(0, br_utils_1.formatarValorBR)(totais.icmsRecolhido)}
- **Saldo**: ${(0, br_utils_1.formatarValorBR)(totais.icmsAReembolsar)}

## DISTRIBUIÇÃO POR PRODUTO
${resultado.produtos.map(p => `${p.descricao}: ${(0, br_utils_1.formatarPercentualBR)((p.icmsDevido / totais.icmsDevido) * 100)}`).join('\n')}

## DISTRIBUIÇÃO POR OPERAÇÃO
${resultado.operacoes.map(o => `${o.tipo} ${o.cfop}: ${(0, br_utils_1.formatarPercentualBR)((o.icmsRecolhido / totais.icmsRecolhido) * 100)}`).join('\n')}
    `;
        return dashboard;
    }
    async gerarMemoriaCalculo(resultado, totais) {
        const memoria = `
# MEMÓRIA DE CÁLCULO ICMS

## CÁLCULOS POR PRODUTO
${resultado.produtos.map(p => `
### ${p.descricao}
- Base de Cálculo: ${(0, br_utils_1.formatarValorBR)(p.baseCalculo)}
- Alíquota: ${(0, br_utils_1.formatarPercentualBR)(p.aliquota)}
- ICMS Devido: ${(0, br_utils_1.formatarValorBR)(p.icmsDevido)}
- ICMS a Compensar: ${(0, br_utils_1.formatarValorBR)(p.icmsACompensar)}
- Regras Aplicadas: ${p.regrasAplicadas.join(', ')}
- Observações: ${p.observacoes}
`).join('\n')}

## CÁLCULOS POR OPERAÇÃO
${resultado.operacoes.map(o => `
### ${o.tipo.toUpperCase()} - CFOP ${o.cfop}
- Base de Cálculo: ${(0, br_utils_1.formatarValorBR)(o.baseCalculo)}
- Alíquota: ${(0, br_utils_1.formatarPercentualBR)(o.aliquota)}
- ICMS Devido: ${(0, br_utils_1.formatarValorBR)(o.icmsDevido)}
- DIFAL: ${(0, br_utils_1.formatarValorBR)(o.difal || 0)}
- CIAP: ${(0, br_utils_1.formatarValorBR)(o.ciap || 0)}
- Observações: ${o.observacoes}
`).join('\n')}
    `;
        return memoria;
    }
    async carregarRegrasICMS() {
        try {
            const regrasPadrao = this.obterRegrasPadrao();
            for (const [uf, regras] of Object.entries(regrasPadrao)) {
                regrasCache.set(uf, regras);
            }
            (0, logger_1.logInfo)('Regras ICMS carregadas', {
                ufs: Array.from(regrasCache.keys()),
                totalRegras: Array.from(regrasCache.values()).flat().length,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao carregar regras ICMS', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    obterRegrasPadrao() {
        return {
            'SP': [
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
                },
                {
                    id: 'sp_protege_1',
                    uf: 'SP',
                    tipo: 'protege',
                    descricao: 'Protege para produtos da cesta básica',
                    ncm: ['10063000', '10064000'],
                    cfop: ['5102', '5405'],
                    cst: ['102', '202'],
                    aliquota: 18,
                    protege: {
                        aliquota: 7,
                        baseCalculo: 100,
                    },
                    ativo: true,
                    dataInicio: new Date('2024-01-01'),
                    fonte: 'manual',
                },
            ],
            'RJ': [
                {
                    id: 'rj_difal_1',
                    uf: 'RJ',
                    tipo: 'difal',
                    descricao: 'DIFAL para operações interestaduais',
                    ncm: ['*'],
                    cfop: ['6102', '6405'],
                    cst: ['102', '202'],
                    aliquota: 20,
                    difal: {
                        aliquotaInterna: 20,
                        aliquotaInterestadual: 12,
                    },
                    ativo: true,
                    dataInicio: new Date('2024-01-01'),
                    fonte: 'manual',
                },
            ],
        };
    }
    generateApuracaoId(empresa, cnpj, periodo) {
        const timestamp = Date.now();
        const hash = empresa.replace(/\s+/g, '_').toLowerCase();
        return `icms_${hash}_${periodo}_${timestamp}`;
    }
    async lerArquivo(arquivoPath) {
        const fs = require('fs').promises;
        return await fs.readFile(arquivoPath, 'utf-8');
    }
    async buscarDocumento(documentoId) {
        return {
            id: documentoId,
            dados: {
                produtos: [],
                operacoes: [],
            },
        };
    }
    extrairDadosICMS(dados) {
        return {
            produtos: dados.produtos || [],
            operacoes: dados.operacoes || [],
        };
    }
    calcularTotaisDocumentos(produtos, operacoes) {
        return {
            baseCalculo: produtos.reduce((sum, p) => sum + (p.baseCalculo || 0), 0),
            icmsDevido: produtos.reduce((sum, p) => sum + (p.icmsDevido || 0), 0),
            icmsRecolhido: operacoes.reduce((sum, o) => sum + (o.icmsRecolhido || 0), 0),
        };
    }
    parsearRegrasPlanilha(conteudo, analiseIA) {
        return [];
    }
    parsearRegrasRelatorio(conteudo, analiseIA) {
        return [];
    }
    async salvarNoBanco(apuracao) {
        (0, logger_1.logInfo)('Salvando apuração ICMS no banco', {
            apuracaoId: apuracao.id,
            empresa: apuracao.empresa,
            status: apuracao.status,
        });
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            processingQueue: this.processingQueue.length,
            cacheSize: regrasCache.size,
            config: ICMS_CONFIG,
        };
    }
}
exports.ICMSApuracaoAgent = ICMSApuracaoAgent;
exports.icmsApuracaoAgent = new ICMSApuracaoAgent();
//# sourceMappingURL=icms-apuracao-agent.js.map