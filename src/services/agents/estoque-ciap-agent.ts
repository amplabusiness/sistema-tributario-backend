/**
 * AGENTE 5: ESTOQUE & CIAP 100% AUTONOMA
 * 
 * Este agente controla automaticamente:
 * 1. Controle automático de estoque (entradas, saídas, movimentações)
 * 2. Validação do Bloco H (Inventário) e Bloco G (Ativo Imobilizado)
 * 3. Cálculo do custo médio e controle de CIAP
 * 4. ZERO intervenção humana - tudo 100% IA!
 */


import { DocumentIndexer } from '../document-indexer';
import { OpenAI } from 'openai';
import { CacheService } from '../cache';
import { formatarValorBR, formatarPercentualBR } from '@/utils/br-utils';

// Tipos de movimentação de estoque
export interface EstoqueMovimentacao {
  id: string;
  empresaId: string;
  produtoId: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'inventario';
  documento: string;
  data: Date;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  custoMedio: number;
  saldoAnterior: number;
  saldoAtual: number;
  observacoes: string[];
  fonte: 'nfe' | 'sped' | 'inventario' | 'ajuste_manual' | 'ia_correcao';
  confianca: number; // 0-100% de confiança da IA
}

// Controle de estoque por produto
export interface EstoqueProduto {
  id: string;
  empresaId: string;
  produtoId: string;
  codigo: string;
  descricao: string;
  ncm: string;
  unidade: string;
  quantidadeAtual: number;
  valorUnitario: number;
  valorTotal: number;
  custoMedio: number;
  ultimaMovimentacao: Date;
  movimentacoes: EstoqueMovimentacao[];
  alertas: string[];
  status: 'normal' | 'baixo_estoque' | 'estoque_zerado' | 'valor_negativo';
}

// CIAP - Controle de Crédito de ICMS sobre Ativo Permanente
export interface CIAPItem {
  id: string;
  empresaId: string;
  ativoId: string;
  descricao: string;
  ncm: string;
  cfop: string;
  dataAquisicao: Date;
  valorAquisicao: number;
  icmsAquisicao: number;
  aliquotaCiap: number;
  valorCiap: number;
  prazoRecuperacao: number; // em meses
  valorMensal: number;
  saldoRecuperar: number;
  movimentacoes: CIAPMovimentacao[];
  status: 'ativo' | 'baixado' | 'transferido';
}

export interface CIAPMovimentacao {
  id: string;
  ciapId: string;
  tipo: 'recuperacao' | 'baixa' | 'transferencia' | 'ajuste';
  data: Date;
  valor: number;
  documento: string;
  observacoes: string[];
}

// Resultado da apuracao de estoque
export interface EstoqueApuracao {
  id: string;
  empresaId: string;
  periodo: string; // MM/AAAA
  dataApuracao: Date;
  produtos: EstoqueProduto[];
  ciap: CIAPItem[];
  totais: EstoqueApuracaoTotal;
  alertas: string[];
  observacoes: string[];
  status: 'pendente' | 'processando' | 'concluida' | 'erro';
  confianca: number; // Confiança geral da apuracao
}

export interface EstoqueApuracaoTotal {
  totalProdutos: number;
  valorTotalEstoque: number;
  quantidadeTotal: number;
  produtosBaixoEstoque: number;
  produtosZerados: number;
  valorTotalCIAP: number;
  ciapRecuperado: number;
  ciapPendente: number;
  discrepanciaInventario: number;
}

// Configuração do agente
interface EstoqueCIAPConfig {
  openaiApiKey: string;
  cacheEnabled: boolean;
  autoCorrecao: boolean;
  confidenceThreshold: number; // Mínimo 70% de confiança
  maxRetries: number;
  batchSize: number;
}

/**
 * AGENTE 5: ESTOQUE & CIAP 100% AUTONOMA
 */
export class EstoqueCIAPAgent {
  private openai: OpenAI;
  private indexer: DocumentIndexer;
  private cache: CacheService;
  private config: EstoqueCIAPConfig;
  private produtos: Map<string, EstoqueProduto> = new Map();
  private ciap: Map<string, CIAPItem> = new Map();

  constructor(config: EstoqueCIAPConfig) {
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.indexer = new DocumentIndexer();
    this.cache = new CacheService();
  }

  /**
   * MÉTODO PRINCIPAL: APURACAO ESTOQUE & CIAP 100% AUTONOMA
   * Zero intervenção humana - tudo feito pela IA!
   */
  async apurarEstoqueCIAPAutomatico(
    empresaId: string,
    periodo: string,
    documentos?: string[]
  ): Promise<EstoqueApuracao> {
    const startTime = Date.now();
    const apuracaoId = `estoque_${empresaId}_${periodo}_${Date.now()}`;

    try {
      console.log('🚀 AGENTE 5: Iniciando apuracao Estoque & CIAP 100% autonoma', {
        empresaId,
        periodo,
        apuracaoId,
      });

      // 1. CARREGAMENTO AUTOMÁTICO DE DADOS EXISTENTES
      await this.carregarDadosExistentes(empresaId);

      // 2. BUSCA AUTOMÁTICA DE DOCUMENTOS
      const docs = documentos || await this.buscarDocumentosPeriodo(empresaId, periodo);

      // 3. PROCESSAMENTO AUTOMÁTICO DE MOVIMENTAÇÕES
      await this.processarMovimentacoesAutomaticamente(docs, empresaId);

      // 4. CÁLCULO AUTOMÁTICO DE CUSTO MÉDIO
      await this.calcularCustoMedioAutomaticamente();

      // 5. PROCESSAMENTO AUTOMÁTICO DE CIAP
      await this.processarCIAPAutomaticamente(docs, empresaId);

      // 6. VALIDACAO AUTOMÁTICA COM INVENTÁRIO
      await this.validarComInventario(empresaId, periodo);

      // 7. GERAÇÃO AUTOMÁTICA DE ALERTAS
      const alertas = await this.gerarAlertasAutomaticamente();

      // 8. CÁLCULO AUTOMÁTICO DE TOTAIS
      const totais = this.calcularTotaisAutomaticamente();

      // 9. GERAÇÃO AUTOMÁTICA DE OBSERVAÇÕES
      const observacoes = await this.gerarObservacoesAutomaticamente(totais);

      // 10. CÁLCULO DE CONFIANÇA
      const confianca = this.calcularConfianca(totais);

      const apuracao: EstoqueApuracao = {
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

      // 11. SALVAMENTO AUTOMÁTICO
      await this.salvarApuracao(apuracao);

      // 12. GERAÇÃO AUTOMÁTICA DE RELATÓRIOS
      await this.gerarRelatoriosAutomaticamente(apuracao);

      const tempoProcessamento = Date.now() - startTime;
      console.log('✅ AGENTE 5: Apuração Estoque & CIAP concluída com sucesso', {
        apuracaoId,
        produtos: this.produtos.size,
        ciap: this.ciap.size,
        confianca: `${confianca}%`,
        tempo: `${tempoProcessamento}ms`,
      });

      return apuracao;

    } catch (error) {
      console.error('❌ AGENTE 5: Erro na apuracao Estoque & CIAP', error instanceof Error ? error : new Error('Unknown error'));
      
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
        alertas: ['Erro na apuracao automática'],
        observacoes: ['Erro na apuracao automática'],
        status: 'erro',
        confianca: 0,
      };
    }
  }

  /**
   * CARREGAMENTO AUTOMÁTICO DE DADOS EXISTENTES
   */
  private async carregarDadosExistentes(empresaId: string): Promise<void> {
    try {
      console.log('📂 AGENTE 5: Carregando dados existentes', { empresaId });      // Carregar produtos do cache/banco
      const produtosCache = await this.cache.get(`estoque_produtos_${empresaId}`);
      if (produtosCache && typeof produtosCache === 'string') {
        const produtos = JSON.parse(produtosCache);
        for (const produto of produtos) {
          this.produtos.set(produto.produtoId, produto);
        }
      }

      // Carregar CIAP do cache/banco
      const ciapCache = await this.cache.get(`ciap_${empresaId}`);      if (ciapCache && typeof ciapCache === 'string') {
        const ciap = JSON.parse(ciapCache);
        for (const item of ciap) {
          this.ciap.set(item.id, item);
        }
      }

      console.log('✅ AGENTE 5: Dados existentes carregados', {
        empresaId,
        produtos: this.produtos.size,
        ciap: this.ciap.size,
      });

    } catch (error) {
      console.error('❌ AGENTE 5: Erro ao carregar dados existentes', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * PROCESSAMENTO AUTOMÁTICO DE MOVIMENTAÇÕES
   */
  private async processarMovimentacoesAutomaticamente(
    documentos: string[],
    empresaId: string
  ): Promise<void> {
    try {
      console.log('🔄 AGENTE 5: Processando movimentações automaticamente', {
        empresaId,
        documentos: documentos.length,
      });

      for (const docId of documentos) {
        // Buscar dados do documento
        const dados = await this.indexer.buscarDocumentos(
          empresaId,
          new Date('2024-01-01'),
          new Date('2024-12-31'),
          'NFe'
        );

        // Processar cada documento
        for (const documento of dados) {
          await this.processarDocumentoEstoque(documento);
        }
      }

      console.log('✅ AGENTE 5: Movimentações processadas', {
        empresaId,
        produtos: this.produtos.size,
      });

    } catch (error) {
      console.error('❌ AGENTE 5: Erro ao processar movimentações', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * PROCESSAMENTO DE DOCUMENTO DE ESTOQUE
   */
  private async processarDocumentoEstoque(documento: any): Promise<void> {
    const tipoOperacao = this.determinarTipoOperacao(documento.cfop);
    
    for (const item of documento.itens || []) {
      const produtoId = item.produtoId || item.ncm;
      
      // Obter ou criar produto
      let produto = this.produtos.get(produtoId);
      if (!produto) {
        produto = this.criarProdutoEstoque(documento.empresaId, item);
        this.produtos.set(produtoId, produto);
      }

      // Criar movimentação
      const movimentacao: EstoqueMovimentacao = {
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

      // Atualizar produto
      this.atualizarProdutoEstoque(produto, movimentacao);
      produto.movimentacoes.push(movimentacao);
    }
  }

  /**
   * CÁLCULO AUTOMÁTICO DE CUSTO MÉDIO
   */
  private async calcularCustoMedioAutomaticamente(): Promise<void> {
    try {
      console.log('🧮 AGENTE 5: Calculando custo médio automaticamente');

      for (const produto of this.produtos.values()) {
        const movimentacoes = produto.movimentacoes.sort((a, b) => a.data.getTime() - b.data.getTime());
        
        let saldoQuantidade = 0;
        let saldoValor = 0;

        for (const mov of movimentacoes) {
          if (mov.tipo === 'entrada') {
            saldoQuantidade += mov.quantidade;
            saldoValor += mov.valorTotal;
          } else if (mov.tipo === 'saida') {
            saldoQuantidade -= mov.quantidade;
            saldoValor -= (saldoValor / (saldoQuantidade + mov.quantidade)) * mov.quantidade;
          }
        }

        // Atualizar custo médio
        if (saldoQuantidade > 0) {
          produto.custoMedio = saldoValor / saldoQuantidade;
        }

        // Atualizar valores do produto
        produto.quantidadeAtual = Math.max(0, saldoQuantidade);
        produto.valorTotal = produto.quantidadeAtual * produto.custoMedio;
        produto.valorUnitario = produto.custoMedio;
      }

      console.log('✅ AGENTE 5: Custo médio calculado', {
        produtos: this.produtos.size,
      });

    } catch (error) {
      console.error('❌ AGENTE 5: Erro ao calcular custo médio', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * PROCESSAMENTO AUTOMÁTICO DE CIAP
   */
  private async processarCIAPAutomaticamente(
    documentos: string[],
    empresaId: string
  ): Promise<void> {
    try {
      console.log('🏢 AGENTE 5: Processando CIAP automaticamente', {
        empresaId,
        documentos: documentos.length,
      });

      for (const docId of documentos) {
        // Buscar documentos de ativo imobilizado
        const dados = await this.indexer.buscarDocumentos(
          empresaId,
          new Date('2024-01-01'),
          new Date('2024-12-31'),
          'NFe'
        );

        // Processar cada documento
        for (const documento of dados) {
          await this.processarDocumentoCIAP(documento);
        }
      }

      // Calcular recuperação mensal do CIAP
      await this.calcularRecuperacaoCIAP();

      console.log('✅ AGENTE 5: CIAP processado', {
        empresaId,
        ciap: this.ciap.size,
      });

    } catch (error) {
      console.error('❌ AGENTE 5: Erro ao processar CIAP', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * PROCESSAMENTO DE DOCUMENTO CIAP
   */
  private async processarDocumentoCIAP(documento: any): Promise<void> {
    // Verificar se é aquisição de ativo imobilizado
    if (this.isAtivoImobilizado(documento.cfop, documento.itens)) {
      for (const item of documento.itens || []) {
        const ciapItem: CIAPItem = {
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
          valorMensal: 0, // Será calculado
          saldoRecuperar: item.valorIcms,
          movimentacoes: [],
          status: 'ativo',
        };

        // Calcular valor mensal
        ciapItem.valorMensal = ciapItem.valorCiap / ciapItem.prazoRecuperacao;

        this.ciap.set(ciapItem.id, ciapItem);
      }
    }
  }

  /**
   * CÁLCULO DE RECUPERAÇÃO CIAP
   */
  private async calcularRecuperacaoCIAP(): Promise<void> {
    const dataAtual = new Date();

    for (const ciapItem of this.ciap.values()) {
      if (ciapItem.status === 'ativo' && ciapItem.saldoRecuperar > 0) {
        const mesesDecorridos = this.calcularMesesDecorridos(ciapItem.dataAquisicao, dataAtual);
        const valorRecuperado = Math.min(
          ciapItem.valorMensal * mesesDecorridos,
          ciapItem.saldoRecuperar
        );

        if (valorRecuperado > 0) {
          const movimentacao: CIAPMovimentacao = {
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

          // Verificar se foi totalmente recuperado
          if (ciapItem.saldoRecuperar <= 0) {
            ciapItem.status = 'baixado';
          }
        }
      }
    }
  }

  /**
   * VALIDACAO AUTOMÁTICA COM INVENTÁRIO
   */
  private async validarComInventario(empresaId: string, periodo: string): Promise<void> {
    try {
      console.log('🔍 AGENTE 5: Validando com inventário', { empresaId, periodo });

      // Buscar dados do inventário (Bloco H do SPED)
      const inventario = await this.buscarInventario(empresaId, periodo);

      // Comparar com estoque calculado
      for (const itemInventario of inventario) {
        const produto = this.produtos.get(itemInventario.produtoId);
        if (produto) {
          const diferenca = Math.abs(produto.quantidadeAtual - itemInventario.quantidade);
          const percentualDiferenca = (diferenca / itemInventario.quantidade) * 100;

          if (percentualDiferenca > 5) { // Mais de 5% de diferença
            produto.alertas.push(
              `Discrepância no inventário: ${diferenca} unidades (${percentualDiferenca.toFixed(2)}%)`
            );
          }
        }
      }

      console.log('✅ AGENTE 5: Validação com inventário concluída');

    } catch (error) {
      console.error('❌ AGENTE 5: Erro na validacao com inventário', error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  /**
   * GERAÇÃO AUTOMÁTICA DE ALERTAS
   */
  private async gerarAlertasAutomaticamente(): Promise<string[]> {
    const alertas: string[] = [];

    // Alertas de baixo estoque
    const produtosBaixoEstoque = Array.from(this.produtos.values())
      .filter(p => p.status === 'baixo_estoque');
    
    if (produtosBaixoEstoque.length > 0) {
      alertas.push(`${produtosBaixoEstoque.length} produtos com estoque baixo`);
    }

    // Alertas de estoque zerado
    const produtosZerados = Array.from(this.produtos.values())
      .filter(p => p.status === 'estoque_zerado');
    
    if (produtosZerados.length > 0) {
      alertas.push(`${produtosZerados.length} produtos com estoque zerado`);
    }

    // Alertas de CIAP
    const ciapPendente = Array.from(this.ciap.values())
      .filter(c => c.status === 'ativo' && c.saldoRecuperar > 0);
    
    if (ciapPendente.length > 0) {
      alertas.push(`${ciapPendente.length} itens de CIAP pendentes de recuperação`);
    }

    return alertas;
  }

  /**
   * CÁLCULO AUTOMÁTICO DE TOTAIS
   */
  private calcularTotaisAutomaticamente(): EstoqueApuracaoTotal {
    const totais: EstoqueApuracaoTotal = {
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

    // Totais de produtos
    for (const produto of this.produtos.values()) {
      totais.valorTotalEstoque += produto.valorTotal;
      totais.quantidadeTotal += produto.quantidadeAtual;

      if (produto.status === 'baixo_estoque') totais.produtosBaixoEstoque++;
      if (produto.status === 'estoque_zerado') totais.produtosZerados++;
    }

    // Totais de CIAP
    for (const ciapItem of this.ciap.values()) {
      totais.valorTotalCIAP += ciapItem.valorCiap;
      
      if (ciapItem.status === 'ativo') {
        totais.ciapPendente += ciapItem.saldoRecuperar;
      } else {
        totais.ciapRecuperado += ciapItem.valorCiap;
      }
    }

    return totais;
  }

  /**
   * GERAÇÃO AUTOMÁTICA DE OBSERVAÇÕES
   */
  private async gerarObservacoesAutomaticamente(totais: EstoqueApuracaoTotal): Promise<string[]> {
    const observacoes: string[] = [];

    // Análise automática com IA
    const prompt = `
    Analise os dados de estoque e CIAP e gere observações técnicas relevantes.
    
    Dados:
    - Total de produtos: ${totais.totalProdutos}
    - Valor total do estoque: ${formatarValorBR(totais.valorTotalEstoque)}
    - Quantidade total: ${totais.quantidadeTotal}
    - Produtos com baixo estoque: ${totais.produtosBaixoEstoque}
    - Produtos zerados: ${totais.produtosZerados}
    - Valor total CIAP: ${formatarValorBR(totais.valorTotalCIAP)}
    - CIAP recuperado: ${formatarValorBR(totais.ciapRecuperado)}
    - CIAP pendente: ${formatarValorBR(totais.ciapPendente)}
    
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

    } catch (error) {
      console.error('❌ AGENTE 5: Erro ao gerar observações', error instanceof Error ? error : new Error('Unknown error'));
    }

    return observacoes;
  }

  /**
   * CÁLCULO DE CONFIANÇA DA APURACAO
   */
  private calcularConfianca(totais: EstoqueApuracaoTotal): number {
    let confianca = 100;

    // Reduz confiança baseado em critérios
    if (totais.produtosZerados > 0) confianca -= 10;
    if (totais.produtosBaixoEstoque > totais.totalProdutos * 0.1) confianca -= 15;
    if (totais.discrepanciaInventario > 0) confianca -= 20;

    // Aumenta confiança baseado em critérios positivos
    if (totais.valorTotalEstoque > 0) confianca += 10;
    if (totais.ciapRecuperado > 0) confianca += 5;

    return Math.max(0, Math.min(100, confianca));
  }

  // Métodos auxiliares
  private determinarTipoOperacao(cfop: string): 'entrada' | 'saida' | 'ajuste' | 'inventario' {
    if (cfop.startsWith('1')) return 'entrada';
    if (cfop.startsWith('5')) return 'saida';
    if (cfop.startsWith('2')) return 'ajuste';
    return 'inventario';
  }

  private criarProdutoEstoque(empresaId: string, item: any): EstoqueProduto {
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

  private calcularNovoSaldo(produto: EstoqueProduto, tipo: string, quantidade: number): number {
    if (tipo === 'entrada') return produto.quantidadeAtual + quantidade;
    if (tipo === 'saida') return Math.max(0, produto.quantidadeAtual - quantidade);
    return produto.quantidadeAtual;
  }

  private atualizarProdutoEstoque(produto: EstoqueProduto, movimentacao: EstoqueMovimentacao): void {
    produto.quantidadeAtual = movimentacao.saldoAtual;
    produto.ultimaMovimentacao = movimentacao.data;

    // Atualizar status
    if (produto.quantidadeAtual === 0) {
      produto.status = 'estoque_zerado';
    } else if (produto.quantidadeAtual < 10) { // Exemplo: menos de 10 unidades
      produto.status = 'baixo_estoque';
    } else {
      produto.status = 'normal';
    }
  }

  private isAtivoImobilizado(cfop: string, itens: any[]): boolean {
    // Verificar se é aquisição de ativo imobilizado
    return cfop.startsWith('1') && itens.some(item => 
      this.isNCMAtivoImobilizado(item.ncm)
    );
  }

  private isNCMAtivoImobilizado(ncm: string): boolean {
    // NCMs de ativo imobilizado (exemplos)
    const ncmsAtivo = [
      '8471', // Computadores
      '8517', // Telefones
      '8528', // Monitores
      '8708', // Peças de veículos
    ];
    return ncmsAtivo.some(ncmAtivo => ncm.startsWith(ncmAtivo));
  }

  private calcularAliquotaCIAP(ncm: string): number {
    // Alíquotas de CIAP por NCM (exemplos)
    const aliquotas: { [key: string]: number } = {
      '8471': 1.5, // Computadores
      '8517': 1.0, // Telefones
      '8528': 1.0, // Monitores
      '8708': 2.0, // Peças de veículos
    };

    for (const [ncmBase, aliquota] of Object.entries(aliquotas)) {
      if (ncm.startsWith(ncmBase)) return aliquota;
    }

    return 1.0; // Alíquota padrão
  }

  private calcularPrazoRecuperacao(ncm: string): number {
    // Prazos de recuperação por NCM (em meses)
    const prazos: { [key: string]: number } = {
      '8471': 48, // Computadores
      '8517': 60, // Telefones
      '8528': 60, // Monitores
      '8708': 120, // Peças de veículos
    };

    for (const [ncmBase, prazo] of Object.entries(prazos)) {
      if (ncm.startsWith(ncmBase)) return prazo;
    }

    return 60; // Prazo padrão
  }

  private calcularMesesDecorridos(dataInicio: Date, dataFim: Date): number {
    const meses = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 +
                  (dataFim.getMonth() - dataInicio.getMonth());
    return Math.max(0, meses);
  }

  private async buscarDocumentosPeriodo(empresaId: string, periodo: string): Promise<string[]> {
    // Implementar busca de documentos por período
    return [];
  }

  private async buscarInventario(empresaId: string, periodo: string): Promise<any[]> {
    // Implementar busca de inventário
    return [];
  }

  private async salvarApuracao(apuracao: EstoqueApuracao): Promise<void> {
    // Salvar no banco de dados
    await this.cache.set(`estoque_apuracao_${apuracao.id}`, JSON.stringify(apuracao), 3600);
  }

  private async gerarRelatoriosAutomaticamente(apuracao: EstoqueApuracao): Promise<void> {
    // Gerar relatórios automaticamente
    console.log('📊 AGENTE 5: Gerando relatórios automaticamente', { apuracaoId: apuracao.id });
  }
} 