"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrecificacaoMargemAgent = void 0;
const document_indexer_1 = require("../document-indexer");
const openai_1 = require("openai");
const cache_1 = require("../cache");
const br_utils_1 = require("@/utils/br-utils");
class PrecificacaoMargemAgent {
    constructor(config) {
        this.config = config;
        this.openai = new openai_1.OpenAI({ apiKey: config.openaiApiKey });
        this.indexer = new document_indexer_1.DocumentIndexer();
        this.cache = new cache_1.CacheService();
    }
    async analisarPrecificacaoAutomatico(empresaId, periodo, produtos) {
        const startTime = Date.now();
        const dashboardId = `precificacao_${empresaId}_${periodo}_${Date.now()}`;
        try {
            console.log('🚀 AGENTE 6: Iniciando análise de precificação 100% autônoma', {
                empresaId,
                periodo,
                dashboardId,
            });
            const dadosProdutos = await this.buscarDadosProdutos(empresaId, periodo, produtos);
            const analisesCustos = await this.analisarCustosAutomaticamente(dadosProdutos);
            const analisesTributarias = await this.analisarCargaTributariaAutomaticamente(dadosProdutos);
            const analisesMercado = await this.analisarMercadoAutomaticamente(dadosProdutos);
            const precificacoes = await this.calcularPrecificacaoAutomaticamente(analisesCustos, analisesTributarias, analisesMercado);
            const margens = await this.analisarMargensAutomaticamente(precificacoes);
            const recomendacoes = await this.gerarRecomendacoesAutomaticamente(precificacoes, margens);
            const totais = this.calcularTotaisAutomaticamente(precificacoes, margens);
            const alertas = await this.gerarAlertasAutomaticamente(precificacoes, margens);
            const observacoes = await this.gerarObservacoesAutomaticamente(totais);
            const confianca = this.calcularConfianca(precificacoes, margens);
            const dashboard = {
                id: dashboardId,
                empresaId,
                periodo,
                dataAnalise: new Date(),
                produtos: precificacoes,
                margens,
                totais,
                alertas,
                observacoes,
                status: 'concluida',
                confianca,
            };
            await this.salvarDashboard(dashboard);
            await this.gerarRelatoriosAutomaticamente(dashboard);
            const tempoProcessamento = Date.now() - startTime;
            console.log('✅ AGENTE 6: Análise de precificação concluída com sucesso', {
                dashboardId,
                produtos: precificacoes.length,
                confianca: `${confianca}%`,
                tempo: `${tempoProcessamento}ms`,
            });
            return dashboard;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro na análise de precificação', error instanceof Error ? error : new Error('Unknown error'));
            return {
                id: dashboardId,
                empresaId,
                periodo,
                dataAnalise: new Date(),
                produtos: [],
                margens: [],
                totais: {
                    totalProdutos: 0,
                    valorTotalVendas: 0,
                    margemBrutaMedia: 0,
                    margemLiquidaMedia: 0,
                    cargaTributariaMedia: 0,
                    rentabilidadeMedia: 0,
                    produtosLucrativos: 0,
                    produtosPrejuizo: 0,
                    produtosOtimizacao: 0,
                },
                alertas: ['Erro na análise automática'],
                observacoes: ['Erro na análise automática'],
                status: 'erro',
                confianca: 0,
            };
        }
    }
    async buscarDadosProdutos(empresaId, periodo, produtos) {
        try {
            console.log('📊 AGENTE 6: Buscando dados de produtos', { empresaId, periodo });
            const vendas = await this.indexer.buscarDocumentos(empresaId, new Date('2024-01-01'), new Date('2024-12-31'), 'NFe');
            const custos = await this.buscarDadosCustos(empresaId, periodo);
            const estoque = await this.buscarDadosEstoque(empresaId, periodo);
            const dadosCombinados = this.combinarDadosProdutos(vendas, custos, estoque);
            console.log('✅ AGENTE 6: Dados de produtos buscados', {
                empresaId,
                produtos: dadosCombinados.length,
            });
            return dadosCombinados;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao buscar dados de produtos', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async analisarCustosAutomaticamente(dadosProdutos) {
        try {
            console.log('💰 AGENTE 6: Analisando custos automaticamente');
            const analisesCustos = [];
            for (const produto of dadosProdutos) {
                const custoMedio = this.calcularCustoMedio(produto);
                const custosOperacionais = this.calcularCustosOperacionais(produto);
                const custosIndiretos = this.calcularCustosIndiretos(produto);
                analisesCustos.push({
                    produtoId: produto.produtoId,
                    custoMedio,
                    custosOperacionais,
                    custosIndiretos,
                    custoTotal: custoMedio + custosOperacionais + custosIndiretos,
                    tendencia: this.analisarTendenciaCustos(produto),
                });
            }
            console.log('✅ AGENTE 6: Custos analisados', {
                produtos: analisesCustos.length,
            });
            return analisesCustos;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao analisar custos', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async analisarCargaTributariaAutomaticamente(dadosProdutos) {
        try {
            console.log('🏛️ AGENTE 6: Analisando carga tributária automaticamente');
            const analisesTributarias = [];
            for (const produto of dadosProdutos) {
                const icms = this.calcularICMS(produto);
                const pis = this.calcularPIS(produto);
                const cofins = this.calcularCOFINS(produto);
                const outros = this.calcularOutrosImpostos(produto);
                const cargaTributaria = icms + pis + cofins + outros;
                analisesTributarias.push({
                    produtoId: produto.produtoId,
                    icms,
                    pis,
                    cofins,
                    outros,
                    cargaTributaria,
                    percentualCarga: (cargaTributaria / produto.valorVenda) * 100,
                    beneficios: this.identificarBeneficiosFiscais(produto),
                });
            }
            console.log('✅ AGENTE 6: Carga tributária analisada', {
                produtos: analisesTributarias.length,
            });
            return analisesTributarias;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao analisar carga tributária', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async analisarMercadoAutomaticamente(dadosProdutos) {
        try {
            console.log('📈 AGENTE 6: Analisando mercado automaticamente');
            const analisesMercado = [];
            for (const produto of dadosProdutos) {
                const precoMedio = this.calcularPrecoMedioMercado(produto);
                const elasticidade = this.calcularElasticidadePreco(produto);
                const competitividade = this.analisarCompetitividade(produto);
                const sazonalidade = this.analisarSazonalidade(produto);
                analisesMercado.push({
                    produtoId: produto.produtoId,
                    precoMedio,
                    elasticidade,
                    competitividade,
                    sazonalidade,
                    recomendacao: this.gerarRecomendacaoMercado(precoMedio, elasticidade, competitividade),
                });
            }
            console.log('✅ AGENTE 6: Mercado analisado', {
                produtos: analisesMercado.length,
            });
            return analisesMercado;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao analisar mercado', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async calcularPrecificacaoAutomaticamente(analisesCustos, analisesTributarias, analisesMercado) {
        try {
            console.log('🧮 AGENTE 6: Calculando precificação automaticamente');
            const precificacoes = [];
            for (let i = 0; i < analisesCustos.length; i++) {
                const custo = analisesCustos[i];
                const tributario = analisesTributarias[i];
                const mercado = analisesMercado[i];
                const precoSugerido = await this.calcularPrecoSugeridoComIA(custo, tributario, mercado);
                const margemSugerida = this.calcularMargemSugerida(custo, tributario, mercado);
                const fatores = this.analisarFatoresPrecificacao(custo, tributario, mercado);
                const rentabilidade = this.calcularRentabilidade(custo, tributario, precoSugerido);
                const competitividade = this.calcularCompetitividade(precoSugerido, mercado);
                const precificacao = {
                    id: `prec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    empresaId: custo.empresaId,
                    produtoId: custo.produtoId,
                    codigo: custo.codigo,
                    descricao: custo.descricao,
                    ncm: custo.ncm,
                    custoMedio: custo.custoTotal,
                    cargaTributaria: tributario.cargaTributaria,
                    margemAtual: custo.margemAtual || 0,
                    precoAtual: custo.precoAtual || 0,
                    precoSugerido,
                    margemSugerida,
                    rentabilidade,
                    competitividade,
                    fatores,
                    observacoes: this.gerarObservacoesPrecificacao(custo, tributario, mercado),
                    confianca: this.calcularConfiancaPrecificacao(custo, tributario, mercado),
                };
                precificacoes.push(precificacao);
            }
            console.log('✅ AGENTE 6: Precificação calculada', {
                produtos: precificacoes.length,
            });
            return precificacoes;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao calcular precificação', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async calcularPrecoSugeridoComIA(custo, tributario, mercado) {
        const prompt = `
    Analise os dados de custo, tributário e mercado para sugerir um preço de venda otimizado.
    
    Dados:
    - Custo total: R$ ${custo.custoTotal}
    - Carga tributária: R$ ${tributario.cargaTributaria} (${tributario.percentualCarga}%)
    - Preço médio do mercado: R$ ${mercado.precoMedio}
    - Elasticidade de preço: ${mercado.elasticidade}
    - Competitividade: ${mercado.competitividade}
    
    Considere:
    1. Margem mínima aceitável: ${this.config.margemMinima}%
    2. Margem ideal: ${this.config.margemIdeal}%
    3. Margem máxima: ${this.config.margemMaxima}%
    4. Competitividade no mercado
    5. Elasticidade da demanda
    
    Retorne apenas o valor numérico do preço sugerido.
    `;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 50,
            });
            const resultado = response.choices[0]?.message?.content;
            if (resultado) {
                const preco = parseFloat(resultado.replace(/[^\d.,]/g, '').replace(',', '.'));
                return isNaN(preco) ? custo.custoTotal * (1 + this.config.margemIdeal / 100) : preco;
            }
            return custo.custoTotal * (1 + this.config.margemIdeal / 100);
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao calcular preço com IA', error instanceof Error ? error : new Error('Unknown error'));
            return custo.custoTotal * (1 + this.config.margemIdeal / 100);
        }
    }
    async analisarMargensAutomaticamente(precificacoes) {
        try {
            console.log('📊 AGENTE 6: Analisando margens automaticamente');
            const margens = [];
            for (const precificacao of precificacoes) {
                const margemBruta = this.calcularMargemBruta(precificacao);
                const margemLiquida = this.calcularMargemLiquida(precificacao);
                const custosOperacionais = this.calcularCustosOperacionais(precificacao);
                const rentabilidade = this.calcularRentabilidadeMargem(margemLiquida, custosOperacionais);
                const tendencia = this.analisarTendenciaMargem(precificacao);
                const margem = {
                    id: `margem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    empresaId: precificacao.empresaId,
                    produtoId: precificacao.produtoId,
                    margemBruta,
                    margemLiquida,
                    cargaTributaria: precificacao.cargaTributaria,
                    custosOperacionais,
                    rentabilidade,
                    tendencia,
                    alertas: this.gerarAlertasMargem(margemLiquida, rentabilidade),
                    recomendacoes: this.gerarRecomendacoesMargem(margemLiquida, rentabilidade),
                };
                margens.push(margem);
            }
            console.log('✅ AGENTE 6: Margens analisadas', {
                produtos: margens.length,
            });
            return margens;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao analisar margens', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    async gerarRecomendacoesAutomaticamente(precificacoes, margens) {
        try {
            console.log('💡 AGENTE 6: Gerando recomendações automaticamente');
            const recomendacoes = [];
            const prompt = `
      Analise os dados de precificação e margens e gere recomendações estratégicas.
      
      Dados:
      - Total de produtos: ${precificacoes.length}
      - Margem bruta média: ${precificacoes.reduce((sum, p) => sum + p.margemSugerida, 0) / precificacoes.length}%
      - Rentabilidade média: ${precificacoes.reduce((sum, p) => sum + p.rentabilidade, 0) / precificacoes.length}%
      - Produtos com margem baixa: ${precificacoes.filter(p => p.margemSugerida < this.config.margemMinima).length}
      
      Gere recomendações estratégicas em português brasileiro.
      `;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500,
            });
            const recomendacoesIA = response.choices[0]?.message?.content;
            if (recomendacoesIA) {
                recomendacoes.push(...recomendacoesIA.split('\n').filter(r => r.trim()));
            }
            return recomendacoes;
        }
        catch (error) {
            console.error('❌ AGENTE 6: Erro ao gerar recomendações', error instanceof Error ? error : new Error('Unknown error'));
            return [];
        }
    }
    calcularTotaisAutomaticamente(precificacoes, margens) {
        const totais = {
            totalProdutos: precificacoes.length,
            valorTotalVendas: 0,
            margemBrutaMedia: 0,
            margemLiquidaMedia: 0,
            cargaTributariaMedia: 0,
            rentabilidadeMedia: 0,
            produtosLucrativos: 0,
            produtosPrejuizo: 0,
            produtosOtimizacao: 0,
        };
        for (const precificacao of precificacoes) {
            totais.valorTotalVendas += precificacao.precoSugerido;
            totais.margemBrutaMedia += precificacao.margemSugerida;
            totais.cargaTributariaMedia += precificacao.cargaTributaria;
            totais.rentabilidadeMedia += precificacao.rentabilidade;
            if (precificacao.rentabilidade > 0) {
                totais.produtosLucrativos++;
            }
            else {
                totais.produtosPrejuizo++;
            }
            if (precificacao.margemSugerida < this.config.margemMinima) {
                totais.produtosOtimizacao++;
            }
        }
        if (precificacoes.length > 0) {
            totais.margemBrutaMedia /= precificacoes.length;
            totais.margemLiquidaMedia /= precificacoes.length;
            totais.cargaTributariaMedia /= precificacoes.length;
            totais.rentabilidadeMedia /= precificacoes.length;
        }
        return totais;
    }
    async gerarAlertasAutomaticamente(precificacoes, margens) {
        const alertas = [];
        const produtosMargemBaixa = precificacoes.filter(p => p.margemSugerida < this.config.margemMinima);
        if (produtosMargemBaixa.length > 0) {
            alertas.push(`${produtosMargemBaixa.length} produtos com margem abaixo do mínimo (${this.config.margemMinima}%)`);
        }
        const produtosPrejuizo = precificacoes.filter(p => p.rentabilidade < 0);
        if (produtosPrejuizo.length > 0) {
            alertas.push(`${produtosPrejuizo.length} produtos operando com prejuízo`);
        }
        const produtosBaixaCompetitividade = precificacoes.filter(p => p.competitividade < 50);
        if (produtosBaixaCompetitividade.length > 0) {
            alertas.push(`${produtosBaixaCompetitividade.length} produtos com baixa competitividade`);
        }
        return alertas;
    }
    async gerarObservacoesAutomaticamente(totais) {
        const observacoes = [];
        const prompt = `
    Analise os dados de precificação e margens e gere observações técnicas relevantes.
    
    Dados:
    - Total de produtos: ${totais.totalProdutos}
    - Valor total de vendas: ${(0, br_utils_1.formatarValorBR)(totais.valorTotalVendas)}
    - Margem bruta média: ${(0, br_utils_1.formatarPercentualBR)(totais.margemBrutaMedia)}
    - Margem líquida média: ${(0, br_utils_1.formatarPercentualBR)(totais.margemLiquidaMedia)}
    - Carga tributária média: ${(0, br_utils_1.formatarPercentualBR)(totais.cargaTributariaMedia)}
    - Rentabilidade média: ${(0, br_utils_1.formatarPercentualBR)(totais.rentabilidadeMedia)}
    - Produtos lucrativos: ${totais.produtosLucrativos}
    - Produtos com prejuízo: ${totais.produtosPrejuizo}
    - Produtos para otimização: ${totais.produtosOtimizacao}
    
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
            console.error('❌ AGENTE 6: Erro ao gerar observações', error instanceof Error ? error : new Error('Unknown error'));
        }
        return observacoes;
    }
    calcularConfianca(precificacoes, margens) {
        let confianca = 100;
        if (precificacoes.length === 0)
            confianca -= 50;
        if (precificacoes.filter(p => p.confianca < 70).length > 0)
            confianca -= 20;
        if (margens.filter(m => m.rentabilidade < 0).length > 0)
            confianca -= 15;
        const confiancaMedia = precificacoes.reduce((sum, p) => sum + p.confianca, 0) / precificacoes.length;
        if (confiancaMedia > 80)
            confianca += 10;
        return Math.max(0, Math.min(100, confianca));
    }
    async buscarDadosCustos(empresaId, periodo) {
        return [];
    }
    async buscarDadosEstoque(empresaId, periodo) {
        return [];
    }
    combinarDadosProdutos(vendas, custos, estoque) {
        return [];
    }
    calcularCustoMedio(produto) {
        return produto.custoMedio || 0;
    }
    calcularCustosOperacionaisProduto(produto) {
        return produto.custosOperacionais || 0;
    }
    calcularCustosIndiretos(produto) {
        return produto.custosIndiretos || 0;
    }
    analisarTendenciaCustos(produto) {
        return 'estavel';
    }
    calcularICMS(produto) {
        return produto.icms || 0;
    }
    calcularPIS(produto) {
        return produto.pis || 0;
    }
    calcularCOFINS(produto) {
        return produto.cofins || 0;
    }
    calcularOutrosImpostos(produto) {
        return produto.outrosImpostos || 0;
    }
    identificarBeneficiosFiscais(produto) {
        return [];
    }
    calcularPrecoMedioMercado(produto) {
        return produto.precoMedioMercado || 0;
    }
    calcularElasticidadePreco(produto) {
        return produto.elasticidade || 1.0;
    }
    analisarCompetitividade(produto) {
        return produto.competitividade || 50;
    }
    analisarSazonalidade(produto) {
        return 'estavel';
    }
    gerarRecomendacaoMercado(precoMedio, elasticidade, competitividade) {
        return 'manter_preco';
    }
    calcularMargemSugerida(custo, tributario, mercado) {
        return this.config.margemIdeal;
    }
    analisarFatoresPrecificacao(custo, tributario, mercado) {
        return [];
    }
    calcularRentabilidade(custo, tributario, precoSugerido) {
        return ((precoSugerido - custo.custoTotal - tributario.cargaTributaria) / precoSugerido) * 100;
    }
    calcularCompetitividade(precoSugerido, mercado) {
        return 50;
    }
    gerarObservacoesPrecificacao(custo, tributario, mercado) {
        return [];
    }
    calcularConfiancaPrecificacao(custo, tributario, mercado) {
        return 85;
    }
    calcularMargemBruta(precificacao) {
        return ((precificacao.precoSugerido - precificacao.custoMedio) / precificacao.precoSugerido) * 100;
    }
    calcularMargemLiquida(precificacao) {
        return ((precificacao.precoSugerido - precificacao.custoMedio - precificacao.cargaTributaria) / precificacao.precoSugerido) * 100;
    }
    calcularCustosOperacionais(precificacao) {
        return precificacao.custoMedio * 0.1;
    }
    calcularRentabilidadeMargem(margemLiquida, custosOperacionais) {
        return margemLiquida - custosOperacionais;
    }
    analisarTendenciaMargem(precificacao) {
        return 'estavel';
    }
    gerarAlertasMargem(margemLiquida, rentabilidade) {
        const alertas = [];
        if (margemLiquida < this.config.margemMinima) {
            alertas.push('Margem líquida abaixo do mínimo');
        }
        if (rentabilidade < 0) {
            alertas.push('Produto operando com prejuízo');
        }
        return alertas;
    }
    gerarRecomendacoesMargem(margemLiquida, rentabilidade) {
        const recomendacoes = [];
        if (margemLiquida < this.config.margemMinima) {
            recomendacoes.push('Revisar preço de venda');
        }
        if (rentabilidade < 0) {
            recomendacoes.push('Analisar redução de custos');
        }
        return recomendacoes;
    }
    async salvarDashboard(dashboard) {
        await this.cache.set(`precificacao_dashboard_${dashboard.id}`, JSON.stringify(dashboard), 3600);
    }
    async gerarRelatoriosAutomaticamente(dashboard) {
        console.log('📊 AGENTE 6: Gerando relatórios automaticamente', { dashboardId: dashboard.id });
    }
}
exports.PrecificacaoMargemAgent = PrecificacaoMargemAgent;
//# sourceMappingURL=precificacao-margem-agent.js.map