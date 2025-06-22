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
    confianca: number;
}
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
    prazoRecuperacao: number;
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
export interface EstoqueApuracao {
    id: string;
    empresaId: string;
    periodo: string;
    dataApuracao: Date;
    produtos: EstoqueProduto[];
    ciap: CIAPItem[];
    totais: EstoqueApuracaoTotal;
    alertas: string[];
    observacoes: string[];
    status: 'pendente' | 'processando' | 'concluida' | 'erro';
    confianca: number;
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
interface EstoqueCIAPConfig {
    openaiApiKey: string;
    cacheEnabled: boolean;
    autoCorrecao: boolean;
    confidenceThreshold: number;
    maxRetries: number;
    batchSize: number;
}
export declare class EstoqueCIAPAgent {
    private openai;
    private indexer;
    private cache;
    private config;
    private produtos;
    private ciap;
    constructor(config: EstoqueCIAPConfig);
    apurarEstoqueCIAPAutomatico(empresaId: string, periodo: string, documentos?: string[]): Promise<EstoqueApuracao>;
    private carregarDadosExistentes;
    private processarMovimentacoesAutomaticamente;
    private processarDocumentoEstoque;
    private calcularCustoMedioAutomaticamente;
    private processarCIAPAutomaticamente;
    private processarDocumentoCIAP;
    private calcularRecuperacaoCIAP;
    private validarComInventario;
    private gerarAlertasAutomaticamente;
    private calcularTotaisAutomaticamente;
    private gerarObservacoesAutomaticamente;
    private calcularConfianca;
    private determinarTipoOperacao;
    private criarProdutoEstoque;
    private calcularNovoSaldo;
    private atualizarProdutoEstoque;
    private isAtivoImobilizado;
    private isNCMAtivoImobilizado;
    private calcularAliquotaCIAP;
    private calcularPrazoRecuperacao;
    private calcularMesesDecorridos;
    private buscarDocumentosPeriodo;
    private buscarInventario;
    private salvarApuracao;
    private gerarRelatoriosAutomaticamente;
}
export {};
//# sourceMappingURL=estoque-ciap-agent.d.ts.map