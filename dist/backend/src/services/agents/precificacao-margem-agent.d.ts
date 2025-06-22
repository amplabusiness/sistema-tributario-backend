export interface PrecificacaoAnalise {
    id: string;
    empresaId: string;
    produtoId: string;
    codigo: string;
    descricao: string;
    ncm: string;
    custoMedio: number;
    cargaTributaria: number;
    margemAtual: number;
    precoAtual: number;
    precoSugerido: number;
    margemSugerida: number;
    rentabilidade: number;
    competitividade: number;
    fatores: PrecificacaoFator[];
    observacoes: string[];
    confianca: number;
}
export interface PrecificacaoFator {
    nome: string;
    tipo: 'positivo' | 'negativo' | 'neutro';
    impacto: number;
    descricao: string;
    peso: number;
}
export interface MargemAnalise {
    id: string;
    empresaId: string;
    produtoId: string;
    margemBruta: number;
    margemLiquida: number;
    cargaTributaria: number;
    custosOperacionais: number;
    rentabilidade: number;
    tendencia: 'crescente' | 'decrescente' | 'estavel';
    alertas: string[];
    recomendacoes: string[];
}
export interface PrecificacaoDashboard {
    id: string;
    empresaId: string;
    periodo: string;
    dataAnalise: Date;
    produtos: PrecificacaoAnalise[];
    margens: MargemAnalise[];
    totais: PrecificacaoDashboardTotal;
    alertas: string[];
    observacoes: string[];
    status: 'pendente' | 'processando' | 'concluida' | 'erro';
    confianca: number;
}
export interface PrecificacaoDashboardTotal {
    totalProdutos: number;
    valorTotalVendas: number;
    margemBrutaMedia: number;
    margemLiquidaMedia: number;
    cargaTributariaMedia: number;
    rentabilidadeMedia: number;
    produtosLucrativos: number;
    produtosPrejuizo: number;
    produtosOtimizacao: number;
}
interface PrecificacaoMargemConfig {
    openaiApiKey: string;
    cacheEnabled: boolean;
    margemMinima: number;
    margemIdeal: number;
    margemMaxima: number;
    confidenceThreshold: number;
    maxRetries: number;
    batchSize: number;
}
export declare class PrecificacaoMargemAgent {
    private openai;
    private indexer;
    private cache;
    private config;
    constructor(config: PrecificacaoMargemConfig);
    analisarPrecificacaoAutomatico(empresaId: string, periodo: string, produtos?: string[]): Promise<PrecificacaoDashboard>;
    private buscarDadosProdutos;
    private analisarCustosAutomaticamente;
    private analisarCargaTributariaAutomaticamente;
    private analisarMercadoAutomaticamente;
    private calcularPrecificacaoAutomaticamente;
    private calcularPrecoSugeridoComIA;
    private analisarMargensAutomaticamente;
    private gerarRecomendacoesAutomaticamente;
    private calcularTotaisAutomaticamente;
    private gerarAlertasAutomaticamente;
    private gerarObservacoesAutomaticamente;
    private calcularConfianca;
    private buscarDadosCustos;
    private buscarDadosEstoque;
    private combinarDadosProdutos;
    private calcularCustoMedio;
    private calcularCustosIndiretos;
    private analisarTendenciaCustos;
    private calcularICMS;
    private calcularPIS;
    private calcularCOFINS;
    private calcularOutrosImpostos;
    private identificarBeneficiosFiscais;
    private calcularPrecoMedioMercado;
    private calcularElasticidadePreco;
    private analisarCompetitividade;
    private analisarSazonalidade;
    private gerarRecomendacaoMercado;
    private calcularMargemSugerida;
    private analisarFatoresPrecificacao;
    private calcularRentabilidade;
    private calcularCompetitividade;
    private gerarObservacoesPrecificacao;
    private calcularConfiancaPrecificacao;
    private calcularMargemBruta;
    private calcularMargemLiquida;
    private calcularRentabilidadeMargem;
    private analisarTendenciaMargem;
    private gerarAlertasMargem;
    private gerarRecomendacoesMargem;
    private salvarDashboard;
    private gerarRelatoriosAutomaticamente;
}
export {};
//# sourceMappingURL=precificacao-margem-agent.d.ts.map