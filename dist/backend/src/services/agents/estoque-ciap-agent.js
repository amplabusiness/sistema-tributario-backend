"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstoqueCIAPAgent = void 0;
const logger_1 = require("@/utils/logger");
const document_indexer_1 = require("../document-indexer");
const openai_1 = require("openai");
const cache_1 = require("../cache");
const br_utils_1 = require("@/utils/br-utils");
class EstoqueCIAPAgent {
    constructor(config) {
        this.produtos = new Map();
        this.ciap = new Map();
        this.config = config;
        this.openai = new openai_1.OpenAI({ apiKey: config.openaiApiKey });
        this.indexer = new document_indexer_1.DocumentIndexer();
        this.cache = new cache_1.CacheService();
    }
    async apurarEstoqueCIAPAutomatico(empresaId, periodo, documentos) {
        const startTime = Date.now();
        const apuracaoId = `estoque_${empresaId}_${periodo}_${Date.now()}`;
        try {
            (0, logger_1.logInfo)('🚀 AGENTE 5: Iniciando apuração Estoque & CIAP 100% autônoma', {
                empresaId,
                periodo,
                apuracaoId,
            });
            await this.carregarDadosExistentes(empresaId);
            const docs = documentos || await this.buscarDocumentosPeriodo(empresaId, periodo);
            await this.processarMovimentacoesAutomaticamente(docs, empresaId);
            await this.calcularCustoMedioAutomaticamente();
            await this.processarCIAPAutomaticamente(docs, empresaId);
            await this.validarComInventario(empresaId, periodo);
            const alertas = await this.gerarAlertasAutomaticamente();
            const totais = this.calcularTotaisAutomaticamente();
            const observacoes = await this.gerarObservacoesAutomaticamente(totais);
            const confianca = this.calcularConfianca(totais);
            const apuracao = {
                id: apuracaoId,
                empresaId,
                periodo,
                dataApuracao: new Date(),
                produtos: Array.from(this.produtos.values()),
                ciap: Array.from(this.ciap.values()),
                totais,
                alertas,
                observacoes,
                status: 'concluida',
                confianca,
            };
            await this.salvarApuracao(apuracao);
            await this.gerarRelatoriosAutomaticamente(apuracao);
            const tempoProcessamento = Date.now() - startTime;
            (0, logger_1.logInfo)('✅ AGENTE 5: Apuração Estoque & CIAP concluída com sucesso', {
                apuracaoId,
                produtos: this.produtos.size,
                ciap: this.ciap.size,
                confianca: `${confianca}%`,
                tempo: `${tempoProcessamento}ms`,
            });
            return apuracao;
        }
        catch (error) {
            (0, logger_1.logError)('❌ AGENTE 5: Erro na apuração Estoque & CIAP', error instanceof Error ? error : new Error('Unknown error'));
            return {
                id: apuracaoId,
                empresaId,
                periodo,
                dataApuracao: new Date(),
                produtos: [],
                ciap: [],
                totais: {
                    totalProdutos: 0,
                    valorTotalEstoque: 0,
                    quantidadeTotal: 0,
                    produtosBaixoEstoque: 0,
                    produtosZerados: 0,
                    valorTotalCIAP: 0,
                    ciapRecuperado: 0,
                    ciapPendente: 0,
                    discrepanciaInventario: 0,
                },
                alertas: ['Erro na apuração automática'],
                observacoes: ['Erro na apuração automática'],
                status: 'erro',
                confianca: 0,
            };
        }
    }
    async carregarDadosExistentes(empresaId) {
        try {
            (0, logger_1.logInfo)('📂 AGENTE 5: Carregando dados existentes', { empresaId });
            const produtosCache = await this.cache.get(`estoque_produtos_${empresaId}`);
            if (produtosCache) {
                const produtos = JSON.parse(produtosCache);
                for (const produto of produtos) {
                    this.produtos.set(produto.produtoId, produto);
                }
            }
            const ciapCache = await this.cache.get(`ciap_${empresaId}`);
            if (ciapCache) {
                const ciap = JSON.parse(ciapCache);
                for (const item of ciap) {
                    this.ciap.set(item.id, item);
                }
            }
            (0, logger_1.logInfo)('✅ AGENTE 5: Dados existentes carregados', {
                empresaId,
                produtos: this.produtos.size,
                ciap: this.ciap.size,
            });
        }
        catch (error) {
            (0, logger_1.logError)('❌ AGENTE 5: Erro ao carregar dados existentes', error instanceof Error ? error : new Error('Unknown error'));
        }
    }
    async processarMovimentacoesAutomaticamente(documentos, empresaId) {
        try {
            (0, logger_1.logInfo)('🔄 AGENTE 5: Processando movimentações automaticamente', {
                empresaId,
                documentos: documentos.length,
            });
            for (const docId of documentos) {
                const dados = await this.indexer.buscarDocumentos(empresaId, new Date('2024-01-01'), new Date('2024-12-31'), 'NFe');
                for (const documento of dados) {
                    await this.processarDocumentoEstoque(documento);
                }
            }
            (0, logger_1.logInfo)('✅ AGENTE 5: Movimentações processadas', {
                empresaId,
                produtos: this.produtos.size,
            });
        }
        catch (error) {
            (0, logger_1.logError)('❌ AGENTE 5: Erro ao processar movimentações', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async processarDocumentoEstoque(documento) {
        const tipoOperacao = this.determinarTipoOperacao(documento.cfop);
        for (const item of documento.itens || []) {
            const produtoId = item.produtoId || item.ncm;
            let produto = this.produtos.get(produtoId);
            if (!produto) {
                produto = this.criarProdutoEstoque(documento.empresaId, item);
                this.produtos.set(produtoId, produto);
            }
            const movimentacao = {
                id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                empresaId: documento.empresaId,
                produtoId,
                tipo: tipoOperacao,
                documento: documento.numeroDocumento,
                data: documento.dataEmissao,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                valorTotal: item.valorTotal,
                custoMedio: produto.custoMedio,
                saldoAnterior: produto.quantidadeAtual,
                saldoAtual: this.calcularNovoSaldo(produto, tipoOperacao, item.quantidade),
                observacoes: [],
                fonte: 'nfe',
                confianca: 95,
            };
            this.atualizarProdutoEstoque(produto, movimentacao);
            produto.movimentacoes.push(movimentacao);
        }
    }
    async calcularCustoMedioAutomaticamente() {
        try {
            (0, logger_1.logInfo)('🧮 AGENTE 5: Calculando custo médio automaticamente');
            for (const produto of this.produtos.values()) {
                const movimentacoes = produto.movimentacoes.sort((a, b) => a.data.getTime() - b.data.getTime());
                let saldoQuantidade = 0;
                let saldoValor = 0;
                for (const mov of movimentacoes) {
                    if (mov.tipo === 'entrada') {
                        saldoQuantidade += mov.quantidade;
                        saldoValor += mov.valorTotal;
                    }
                    else if (mov.tipo === 'saida') {
                        saldoQuantidade -= mov.quantidade;
                        saldoValor -= (saldoValor / (saldoQuantidade + mov.quantidade)) * mov.quantidade;
                    }
                }
                if (saldoQuantidade > 0) {
                    produto.custoMedio = saldoValor / saldoQuantidade;
                }
                produto.quantidadeAtual = Math.max(0, saldoQuantidade);
                produto.valorTotal = produto.quantidadeAtual * produto.custoMedio;
                produto.valorUnitario = produto.custoMedio;
            }
            (0, logger_1.logInfo)('✅ AGENTE 5: Custo médio calculado', {
                produtos: this.produtos.size,
            });
        }
        catch (error) {
            (0, logger_1.logError)('❌ AGENTE 5: Erro ao calcular custo médio', error instanceof Error ? error : new Error('Unknown error'));
        }
    }
    async processarCIAPAutomaticamente(documentos, empresaId) {
        try {
            (0, logger_1.logInfo)('🏢 AGENTE 5: Processando CIAP automaticamente', {
                empresaId,
                documentos: documentos.length,
            });
            for (const docId of documentos) {
                const dados = await this.indexer.buscarDocumentos(empresaId, new Date('2024-01-01'), new Date('2024-12-31'), 'NFe');
                for (const documento of dados) {
                    await this.processarDocumentoCIAP(documento);
                }
            }
            await this.calcularRecuperacaoCIAP();
            (0, logger_1.logInfo)('✅ AGENTE 5: CIAP processado', {
                empresaId,
                ciap: this.ciap.size,
            });
        }
        catch (error) {
            (0, logger_1.logError)('❌ AGENTE 5: Erro ao processar CIAP', error instanceof Error ? error : new Error('Unknown error'));
        }
    }
    async processarDocumentoCIAP(documento) {
        if (this.isAtivoImobilizado(documento.cfop, documento.itens)) {
            for (const item of documento.itens || []) {
                const ciapItem = {
                    id: `ciap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    empresaId: documento.empresaId,
                    ativoId: item.produtoId,
                    descricao: item.descricao,
                    ncm: item.ncm,
                    cfop: documento.cfop,
                    dataAquisicao: documento.dataEmissao,
                    valorAquisicao: item.valorTotal,
                    icmsAquisicao: item.valorIcms,
                    aliquotaCiap: this.calcularAliquotaCIAP(item.ncm),
                    valorCiap: item.valorIcms,
                    prazoRecuperacao: this.calcularPrazoRecuperacao(item.ncm),
                    valorMensal: 0,
                    saldoRecuperar: item.valorIcms,
                    movimentacoes: [],
                    status: 'ativo',
                };
                ciapItem.valorMensal = ciapItem.valorCiap / ciapItem.prazoRecuperacao;
                this.ciap.set(ciapItem.id, ciapItem);
            }
        }
    }
    async calcularRecuperacaoCIAP() {
        const dataAtual = new Date();
        for (const ciapItem of this.ciap.values()) {
            if (ciapItem.status === 'ativo' && ciapItem.saldoRecuperar > 0) {
                const mesesDecorridos = this.calcularMesesDecorridos(ciapItem.dataAquisicao, dataAtual);
                const valorRecuperado = Math.min(ciapItem.valorMensal * mesesDecorridos, ciapItem.saldoRecuperar);
                if (valorRecuperado > 0) {
                    const movimentacao = {
                        id: `ciap_mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        ciapId: ciapItem.id,
                        tipo: 'recuperacao',
                        data: dataAtual,
                        valor: valorRecuperado,
                        documento: 'Recuperação automática CIAP',
                        observacoes: [`Recuperação de ${mesesDecorridos} meses`],
                    };
                    ciapItem.movimentacoes.push(movimentacao);
                    ciapItem.saldoRecuperar -= valorRecuperado;
                    if (ciapItem.saldoRecuperar <= 0) {
                        ciapItem.status = 'baixado';
                    }
                }
            }
        }
    }
    async validarComInventario(empresaId, periodo) {
        try {
            (0, logger_1.logInfo)('🔍 AGENTE 5: Validando com inventário', { empresaId, periodo });
            const inventario = await this.buscarInventario(empresaId, periodo);
            for (const itemInventario of inventario) {
                const produto = this.produtos.get(itemInventario.produtoId);
                if (produto) {
                    const diferenca = Math.abs(produto.quantidadeAtual - itemInventario.quantidade);
                    const percentualDiferenca = (diferenca / itemInventario.quantidade) * 100;
                    if (percentualDiferenca > 5) {
                        produto.alertas.push(`Discrepância no inventário: ${diferenca} unidades (${percentualDiferenca.toFixed(2)}%)`);
                    }
                }
            }
            (0, logger_1.logInfo)('✅ AGENTE 5: Validação com inventário concluída');
        }
        catch (error) {
            (0, logger_1.logError)('❌ AGENTE 5: Erro na validação com inventário', error instanceof Error ? error : new Error('Unknown error'));
        }
    }
    async gerarAlertasAutomaticamente() {
        const alertas = [];
        const produtosBaixoEstoque = Array.from(this.produtos.values())
            .filter(p => p.status === 'baixo_estoque');
        if (produtosBaixoEstoque.length > 0) {
            alertas.push(`${produtosBaixoEstoque.length} produtos com estoque baixo`);
        }
        const produtosZerados = Array.from(this.produtos.values())
            .filter(p => p.status === 'estoque_zerado');
        if (produtosZerados.length > 0) {
            alertas.push(`${produtosZerados.length} produtos com estoque zerado`);
        }
        const ciapPendente = Array.from(this.ciap.values())
            .filter(c => c.status === 'ativo' && c.saldoRecuperar > 0);
        if (ciapPendente.length > 0) {
            alertas.push(`${ciapPendente.length} itens de CIAP pendentes de recuperação`);
        }
        return alertas;
    }
    calcularTotaisAutomaticamente() {
        const totais = {
            totalProdutos: this.produtos.size,
            valorTotalEstoque: 0,
            quantidadeTotal: 0,
            produtosBaixoEstoque: 0,
            produtosZerados: 0,
            valorTotalCIAP: 0,
            ciapRecuperado: 0,
            ciapPendente: 0,
            discrepanciaInventario: 0,
        };
        for (const produto of this.produtos.values()) {
            totais.valorTotalEstoque += produto.valorTotal;
            totais.quantidadeTotal += produto.quantidadeAtual;
            if (produto.status === 'baixo_estoque')
                totais.produtosBaixoEstoque++;
            if (produto.status === 'estoque_zerado')
                totais.produtosZerados++;
        }
        for (const ciapItem of this.ciap.values()) {
            totais.valorTotalCIAP += ciapItem.valorCiap;
            if (ciapItem.status === 'ativo') {
                totais.ciapPendente += ciapItem.saldoRecuperar;
            }
            else {
                totais.ciapRecuperado += ciapItem.valorCiap;
            }
        }
        return totais;
    }
    async gerarObservacoesAutomaticamente(totais) {
        const observacoes = [];
        const prompt = `
    Analise os dados de estoque e CIAP e gere observações técnicas relevantes.
    
    Dados:
    - Total de produtos: ${totais.totalProdutos}
    - Valor total do estoque: ${(0, br_utils_1.formatarValorBR)(totais.valorTotalEstoque)}
    - Quantidade total: ${totais.quantidadeTotal}
    - Produtos com baixo estoque: ${totais.produtosBaixoEstoque}
    - Produtos zerados: ${totais.produtosZerados}
    - Valor total CIAP: ${(0, br_utils_1.formatarValorBR)(totais.valorTotalCIAP)}
    - CIAP recuperado: ${(0, br_utils_1.formatarValorBR)(totais.ciapRecuperado)}
    - CIAP pendente: ${(0, br_utils_1.formatarValorBR)(totais.ciapPendente)}
    
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
            (0, logger_1.logError)('❌ AGENTE 5: Erro ao gerar observações', error instanceof Error ? error : new Error('Unknown error'));
        }
        return observacoes;
    }
    calcularConfianca(totais) {
        let confianca = 100;
        if (totais.produtosZerados > 0)
            confianca -= 10;
        if (totais.produtosBaixoEstoque > totais.totalProdutos * 0.1)
            confianca -= 15;
        if (totais.discrepanciaInventario > 0)
            confianca -= 20;
        if (totais.valorTotalEstoque > 0)
            confianca += 10;
        if (totais.ciapRecuperado > 0)
            confianca += 5;
        return Math.max(0, Math.min(100, confianca));
    }
    determinarTipoOperacao(cfop) {
        if (cfop.startsWith('1'))
            return 'entrada';
        if (cfop.startsWith('5'))
            return 'saida';
        if (cfop.startsWith('2'))
            return 'ajuste';
        return 'inventario';
    }
    criarProdutoEstoque(empresaId, item) {
        return {
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            empresaId,
            produtoId: item.produtoId || item.ncm,
            codigo: item.codigo || item.ncm,
            descricao: item.descricao,
            ncm: item.ncm,
            unidade: item.unidade || 'UN',
            quantidadeAtual: 0,
            valorUnitario: 0,
            valorTotal: 0,
            custoMedio: 0,
            ultimaMovimentacao: new Date(),
            movimentacoes: [],
            alertas: [],
            status: 'normal',
        };
    }
    calcularNovoSaldo(produto, tipo, quantidade) {
        if (tipo === 'entrada')
            return produto.quantidadeAtual + quantidade;
        if (tipo === 'saida')
            return Math.max(0, produto.quantidadeAtual - quantidade);
        return produto.quantidadeAtual;
    }
    atualizarProdutoEstoque(produto, movimentacao) {
        produto.quantidadeAtual = movimentacao.saldoAtual;
        produto.ultimaMovimentacao = movimentacao.data;
        if (produto.quantidadeAtual === 0) {
            produto.status = 'estoque_zerado';
        }
        else if (produto.quantidadeAtual < 10) {
            produto.status = 'baixo_estoque';
        }
        else {
            produto.status = 'normal';
        }
    }
    isAtivoImobilizado(cfop, itens) {
        return cfop.startsWith('1') && itens.some(item => this.isNCMAtivoImobilizado(item.ncm));
    }
    isNCMAtivoImobilizado(ncm) {
        const ncmsAtivo = [
            '8471',
            '8517',
            '8528',
            '8708',
        ];
        return ncmsAtivo.some(ncmAtivo => ncm.startsWith(ncmAtivo));
    }
    calcularAliquotaCIAP(ncm) {
        const aliquotas = {
            '8471': 1.5,
            '8517': 1.0,
            '8528': 1.0,
            '8708': 2.0,
        };
        for (const [ncmBase, aliquota] of Object.entries(aliquotas)) {
            if (ncm.startsWith(ncmBase))
                return aliquota;
        }
        return 1.0;
    }
    calcularPrazoRecuperacao(ncm) {
        const prazos = {
            '8471': 48,
            '8517': 60,
            '8528': 60,
            '8708': 120,
        };
        for (const [ncmBase, prazo] of Object.entries(prazos)) {
            if (ncm.startsWith(ncmBase))
                return prazo;
        }
        return 60;
    }
    calcularMesesDecorridos(dataInicio, dataFim) {
        const meses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 +
            (dataFim.getMonth() - dataInicio.getMonth());
        return Math.max(0, meses);
    }
    async buscarDocumentosPeriodo(empresaId, periodo) {
        return [];
    }
    async buscarInventario(empresaId, periodo) {
        return [];
    }
    async salvarApuracao(apuracao) {
        await this.cache.set(`estoque_apuracao_${apuracao.id}`, JSON.stringify(apuracao), 3600);
    }
    async gerarRelatoriosAutomaticamente(apuracao) {
        (0, logger_1.logInfo)('📊 AGENTE 5: Gerando relatórios automaticamente', { apuracaoId: apuracao.id });
    }
}
exports.EstoqueCIAPAgent = EstoqueCIAPAgent;
//# sourceMappingURL=estoque-ciap-agent.js.map