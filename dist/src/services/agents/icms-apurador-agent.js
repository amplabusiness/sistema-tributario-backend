"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICMSApuradorAgent = void 0;
const document_indexer_1 = require("../document-indexer");
const openai_1 = require("openai");
const cache_1 = require("../cache");
const br_utils_1 = require("@/utils/br-utils");
class ICMSApuradorAgent {
    constructor(config) {
        this.regras = [];
        this.config = config;
        this.openai = new openai_1.OpenAI({ apiKey: config.openaiApiKey });
        this.indexer = new document_indexer_1.DocumentIndexer();
        this.cache = new cache_1.CacheService();
    }
    async apurarICMSAutomatico(empresaId, periodo, documentos) {
        const startTime = Date.now();
        const apuracaoId = `apuracao_${empresaId}_${periodo}_${Date.now()}`;
        try {
            console.log('🚀 AGENTE 3: Iniciando apuracao ICMS 100% autonoma', {
                empresaId,
                periodo,
                apuracaoId,
            });
            if (this.config.autoExtractRules) {
                await this.extrairRegrasAutomaticamente(empresaId);
            }
            await this.carregarRegras(empresaId);
            const docs = documentos || await this.buscarDocumentosPeriodo(empresaId, periodo);
            const itens = await this.processarDocumentosAutomaticamente(docs, empresaId);
            const itensComRegras = await this.aplicarRegrasAutomaticamente(itens);
            const totais = this.calcularTotaisAutomaticamente(itensComRegras);
            const observacoes = await this.gerarObservacoesAutomaticamente(itensComRegras, totais);
            const confianca = this.calcularConfianca(itensComRegras, totais);
            const apuracao = {
                id: apuracaoId,
                empresaId,
                periodo,
                dataApuracao: new Date(),
                regrasAplicadas: this.regras.filter(r => r.ativo),
                itens: itensComRegras,
                totais,
                observacoes,
                status: 'concluida',
                confianca,
            };
            await this.salvarApuracao(apuracao);
            await this.gerarRelatoriosAutomaticamente(apuracao);
            const tempoProcessamento = Date.now() - startTime;
            console.log('✅ AGENTE 3: Apuração ICMS concluída com sucesso', {
                apuracaoId,
                itens: itensComRegras.length,
                regras: this.regras.filter(r => r.ativo).length,
                confianca: `${confianca}%`,
                tempo: `${tempoProcessamento}ms`,
            });
            return apuracao;
        }
        catch (error) {
            console.error('❌ AGENTE 3: Erro na apuracao ICMS', error instanceof Error ? error : new Error('Unknown error'));
            return {
                id: apuracaoId,
                empresaId,
                periodo,
                dataApuracao: new Date(),
                regrasAplicadas: [],
                itens: [],
                totais: {
                    valorTotalOperacoes: 0,
                    baseCalculoTotal: 0,
                    valorIcmsTotal: 0,
                    baseStTotal: 0,
                    valorStTotal: 0,
                    valorDifalTotal: 0,
                    creditoPresumido: 0,
                    saldoApurado: 0,
                    porRegra: {},
                },
                observacoes: ['Erro na apuracao automática'],
                status: 'erro',
                confianca: 0,
            };
        }
    }
    async extrairRegrasAutomaticamente(empresaId) {
        try {
            console.log('🔍 AGENTE 3: Extraindo regras automaticamente', { empresaId });
            const documentosRegras = await this.buscarDocumentosRegras(empresaId);
            for (const doc of documentosRegras) {
                const conteudo = await this.extrairConteudoDocumento(doc);
                const regrasExtraidas = await this.analisarConteudoComIA(conteudo);
                const regrasValidadas = await this.validarRegrasAutomaticamente(regrasExtraidas);
                this.regras.push(...regrasValidadas);
            }
            console.log('✅ AGENTE 3: Extração de regras concluída', {
                empresaId,
                regrasExtraidas: this.regras.length,
            });
        }
        catch (error) {
            console.error('❌ AGENTE 3: Erro na extração de regras', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async analisarConteudoComIA(conteudo) {
        const prompt = `
    Analise o seguinte conteúdo e extraia regras de ICMS brasileiras.
    
    Para cada regra encontrada, retorne no formato JSON:
    {
      "nome": "Nome da regra",
      "descricao": "Descrição detalhada",
      "tipo": "base_reduzida|credito_outorgado|protege|difal|ciap|st|isencao",
      "condicoes": [
        {
          "campo": "cfop|ncm|uf_origem|uf_destino|tipo_cliente",
          "operador": "igual|diferente|contem|inicia_com|maior|menor|entre",
          "valor": "valor ou array de valores",
          "logica": "AND|OR"
        }
      ],
      "calculos": [
        {
          "tipo": "base_calculo|aliquota|credito|st|difal",
          "formula": "Fórmula em português",
          "parametros": ["param1", "param2"],
          "resultado": "percentual|valor|base"
        }
      ],
      "prioridade": 1-10,
      "confianca": 0-100
    }
    
    Conteúdo para analise:
    ${conteudo}
    `;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 2000,
            });
            const resultado = response.choices[0]?.message?.content;
            if (!resultado)
                throw new Error('Resposta vazia da IA');
            const regras = JSON.parse(resultado);
            return Array.isArray(regras) ? regras : [regras];
        }
        catch (error) {
            console.error('❌ AGENTE 3: Erro na analise com IA', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async validarRegrasAutomaticamente(regras) {
        const regrasValidadas = [];
        for (const regra of regras) {
            if (regra.confianca < this.config.confidenceThreshold) {
                console.warn('⚠️ AGENTE 3: Regra rejeitada por baixa confiança', {
                    regra: regra.nome,
                    confianca: regra.confianca,
                });
                continue;
            }
            if (!this.validarEstruturaRegra(regra)) {
                console.warn('⚠️ AGENTE 3: Regra rejeitada por estrutura inválida', {
                    regra: regra.nome,
                });
                continue;
            }
            if (!this.validarConsistenciaRegra(regra)) {
                console.warn('⚠️ AGENTE 3: Regra rejeitada por inconsistência', {
                    regra: regra.nome,
                });
                continue;
            }
            regra.id = `regra_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            regra.ativo = true;
            regra.fonte = 'extração_automática_ia';
            regra.dataCriacao = new Date();
            regra.dataAtualizacao = new Date();
            regrasValidadas.push(regra);
        }
        return regrasValidadas;
    }
    async processarDocumentosAutomaticamente(documentos, empresaId) {
        const itens = [];
        for (const docId of documentos) {
            try {
                const dados = await this.indexer.buscarDocumentos(empresaId, new Date('2024-01-01'), new Date('2024-12-31'), 'NFe');
                for (const documento of dados) {
                    for (const item of documento.itens || []) {
                        const itemApuracao = {
                            documento: documento.numeroDocumento,
                            data: documento.dataEmissao,
                            produto: item.descricao,
                            ncm: item.ncm,
                            cfop: item.cfop,
                            cst: item.cst,
                            valorOperacao: item.valorTotal,
                            baseCalculo: item.valorTotal,
                            aliquota: item.aliquotaIcms,
                            valorIcms: item.valorIcms,
                            regrasAplicadas: [],
                            observacoes: [],
                        };
                        itens.push(itemApuracao);
                    }
                }
            }
            catch (error) {
                console.error('❌ AGENTE 3: Erro ao processar documento', {
                    docId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return itens;
    }
    async aplicarRegrasAutomaticamente(itens) {
        const itensProcessados = [];
        for (const item of itens) {
            let itemProcessado = { ...item };
            const regrasOrdenadas = this.regras
                .filter(r => r.ativo)
                .sort((a, b) => b.prioridade - a.prioridade);
            for (const regra of regrasOrdenadas) {
                if (this.aplicarRegra(itemProcessado, regra)) {
                    itemProcessado.regrasAplicadas.push(regra.id);
                    itemProcessado.observacoes.push(`Regra aplicada: ${regra.nome}`);
                }
            }
            itensProcessados.push(itemProcessado);
        }
        return itensProcessados;
    }
    aplicarRegra(item, regra) {
        for (const condicao of regra.condicoes) {
            if (!this.verificarCondicao(item, condicao)) {
                return false;
            }
        }
        for (const calculo of regra.calculos) {
            this.aplicarCalculo(item, calculo);
        }
        return true;
    }
    verificarCondicao(item, condicao) {
        const valorItem = this.obterValorItem(item, condicao.campo);
        switch (condicao.operador) {
            case 'igual':
                return valorItem === condicao.valor;
            case 'diferente':
                return valorItem !== condicao.valor;
            case 'contem':
                return String(valorItem).includes(String(condicao.valor));
            case 'inicia_com':
                return String(valorItem).startsWith(String(condicao.valor));
            case 'maior':
                return Number(valorItem) > Number(condicao.valor);
            case 'menor':
                return Number(valorItem) < Number(condicao.valor);
            case 'entre':
                const valores = Array.isArray(condicao.valor) ? condicao.valor : [];
                return valores.length === 2 &&
                    Number(valorItem) >= Number(valores[0]) &&
                    Number(valorItem) <= Number(valores[1]);
            default:
                return false;
        }
    }
    aplicarCalculo(item, calculo) {
        switch (calculo.tipo) {
            case 'base_calculo':
                item.baseCalculo = this.calcularFormula(item, calculo.formula);
                break;
            case 'aliquota':
                item.aliquota = this.calcularFormula(item, calculo.formula);
                break;
            case 'st':
                item.aliquotaSt = this.calcularFormula(item, calculo.formula);
                item.baseSt = item.baseCalculo;
                item.valorSt = (item.baseSt * item.aliquotaSt) / 100;
                break;
            case 'difal':
                item.valorDifal = this.calcularFormula(item, calculo.formula);
                break;
        }
    }
    calcularFormula(item, formula) {
        const formulas = {
            'base_reduzida_50': () => item.valorOperacao * 0.5,
            'aliquota_icms_18': () => 18,
            'aliquota_icms_12': () => 12,
            'aliquota_icms_7': () => 7,
            'st_18': () => 18,
            'difal_4': () => 4,
        };
        return formulas[formula]?.() || 0;
    }
    calcularTotaisAutomaticamente(itens) {
        const totais = {
            valorTotalOperacoes: 0,
            baseCalculoTotal: 0,
            valorIcmsTotal: 0,
            baseStTotal: 0,
            valorStTotal: 0,
            valorDifalTotal: 0,
            creditoPresumido: 0,
            saldoApurado: 0,
            porRegra: {},
        };
        for (const item of itens) {
            totais.valorTotalOperacoes += item.valorOperacao;
            totais.baseCalculoTotal += item.baseCalculo;
            totais.valorIcmsTotal += item.valorIcms;
            totais.baseStTotal += item.baseSt || 0;
            totais.valorStTotal += item.valorSt || 0;
            totais.valorDifalTotal += item.valorDifal || 0;
            for (const regraId of item.regrasAplicadas) {
                totais.porRegra[regraId] = (totais.porRegra[regraId] || 0) + item.valorIcms;
            }
        }
        totais.saldoApurado = totais.valorIcmsTotal - totais.creditoPresumido;
        return totais;
    }
    async gerarObservacoesAutomaticamente(itens, totais) {
        const observacoes = [];
        const prompt = `
    Analise os dados de apuracao ICMS e gere observações técnicas relevantes.
    
    Dados:
    - Total de operações: ${(0, br_utils_1.formatarValorBR)(totais.valorTotalOperacoes)}
    - Base de cálculo: ${(0, br_utils_1.formatarValorBR)(totais.baseCalculoTotal)}
    - ICMS devido: ${(0, br_utils_1.formatarValorBR)(totais.valorIcmsTotal)}
    - ST: ${(0, br_utils_1.formatarValorBR)(totais.valorStTotal)}
    - DIFAL: ${(0, br_utils_1.formatarValorBR)(totais.valorDifalTotal)}
    - Saldo apurado: ${(0, br_utils_1.formatarValorBR)(totais.saldoApurado)}
    - Itens processados: ${itens.length}
    
    Gere observações técnicas em português brasileiro.
    `;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500,
            });
            const observacoesIA = response.choices[0]?.message?.content;
            if (observacoesIA) {
                observacoes.push(...observacoesIA.split('\n').filter(o => o.trim()));
            }
        }
        catch (error) {
            console.error('❌ AGENTE 3: Erro ao gerar observações', error instanceof Error ? error : new Error('Unknown error'));
        }
        return observacoes;
    }
    calcularConfianca(itens, totais) {
        let confianca = 100;
        if (itens.length === 0)
            confianca -= 50;
        if (totais.valorIcmsTotal === 0)
            confianca -= 20;
        if (totais.valorStTotal > totais.valorIcmsTotal)
            confianca -= 10;
        const itensComRegras = itens.filter(i => i.regrasAplicadas.length > 0);
        if (itensComRegras.length > 0) {
            confianca += Math.min(20, (itensComRegras.length / itens.length) * 20);
        }
        return Math.max(0, Math.min(100, confianca));
    }
    async carregarRegras(empresaId) {
        const regrasCache = await this.cache.get(`regras_icms_${empresaId}`);
        if (regrasCache && typeof regrasCache === 'string') {
            this.regras = JSON.parse(regrasCache);
        }
    }
    async buscarDocumentosPeriodo(empresaId, periodo) {
        return [];
    }
    async buscarDocumentosRegras(empresaId) {
        return [];
    }
    async extrairConteudoDocumento(docId) {
        return '';
    }
    async salvarApuracao(apuracao) {
        await this.cache.set(`apuracao_${apuracao.id}`, JSON.stringify(apuracao), 3600);
    }
    async gerarRelatoriosAutomaticamente(apuracao) {
        console.log('📊 AGENTE 3: Gerando relatórios automaticamente', { apuracaoId: apuracao.id });
    }
    validarEstruturaRegra(regra) {
        return !!(regra.nome && regra.tipo && regra.condicoes && regra.calculos);
    }
    validarConsistenciaRegra(regra) {
        return true;
    }
    obterValorItem(item, campo) {
        const mapeamento = {
            cfop: item.cfop,
            ncm: item.ncm,
            cst: item.cst,
            valor: item.valorOperacao,
            base: item.baseCalculo,
            aliquota: item.aliquota,
        };
        return mapeamento[campo] || '';
    }
}
exports.ICMSApuradorAgent = ICMSApuradorAgent;
//# sourceMappingURL=icms-apurador-agent.js.map