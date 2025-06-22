export interface ICMSRule {
    id: string;
    nome: string;
    descricao: string;
    tipo: 'base_reduzida' | 'credito_outorgado' | 'protege' | 'difal' | 'ciap' | 'st' | 'isencao';
    condicoes: ICMSCondition[];
    calculos: ICMSCalculation[];
    prioridade: number;
    ativo: boolean;
    fonte: string;
    confianca: number;
    dataCriacao: Date;
    dataAtualizacao: Date;
}
export interface ICMSCondition {
    campo: string;
    operador: 'igual' | 'diferente' | 'contem' | 'inicia_com' | 'maior' | 'menor' | 'entre';
    valor: string | number | string[];
    logica: 'AND' | 'OR';
}
export interface ICMSCalculation {
    tipo: 'base_calculo' | 'aliquota' | 'credito' | 'st' | 'difal';
    formula: string;
    parametros: string[];
    resultado: 'percentual' | 'valor' | 'base';
}
export interface ICMSApuracao {
    id: string;
    empresaId: string;
    periodo: string;
    dataApuracao: Date;
    regrasAplicadas: ICMSRule[];
    itens: ICMSApuracaoItem[];
    totais: ICMSApuracaoTotal;
    observacoes: string[];
    status: 'pendente' | 'processando' | 'concluida' | 'erro';
    confianca: number;
}
export interface ICMSApuracaoItem {
    documento: string;
    data: Date;
    produto: string;
    ncm: string;
    cfop: string;
    cst: string;
    valorOperacao: number;
    baseCalculo: number;
    aliquota: number;
    valorIcms: number;
    baseSt?: number;
    aliquotaSt?: number;
    valorSt?: number;
    valorDifal?: number;
    regrasAplicadas: string[];
    observacoes: string[];
}
export interface ICMSApuracaoTotal {
    valorTotalOperacoes: number;
    baseCalculoTotal: number;
    valorIcmsTotal: number;
    baseStTotal: number;
    valorStTotal: number;
    valorDifalTotal: number;
    creditoPresumido: number;
    saldoApurado: number;
    porRegra: {
        [regraId: string]: number;
    };
}
interface ICMSApuradorConfig {
    openaiApiKey: string;
    cacheEnabled: boolean;
    autoExtractRules: boolean;
    confidenceThreshold: number;
    maxRetries: number;
    batchSize: number;
}
export declare class ICMSApuradorAgent {
    private openai;
    private indexer;
    private cache;
    private config;
    private regras;
    constructor(config: ICMSApuradorConfig);
    apurarICMSAutomatico(empresaId: string, periodo: string, documentos?: string[]): Promise<ICMSApuracao>;
    private extrairRegrasAutomaticamente;
    private analisarConteudoComIA;
    private validarRegrasAutomaticamente;
    private processarDocumentosAutomaticamente;
    private aplicarRegrasAutomaticamente;
    private aplicarRegra;
    private verificarCondicao;
    private aplicarCalculo;
    private calcularFormula;
    private calcularTotaisAutomaticamente;
    private gerarObservacoesAutomaticamente;
    private calcularConfianca;
    private carregarRegras;
    private buscarDocumentosPeriodo;
    private buscarDocumentosRegras;
    private extrairConteudoDocumento;
    private salvarApuracao;
    private gerarRelatoriosAutomaticamente;
    private validarEstruturaRegra;
    private validarConsistenciaRegra;
    private obterValorItem;
}
export {};
//# sourceMappingURL=icms-apurador-agent.d.ts.map