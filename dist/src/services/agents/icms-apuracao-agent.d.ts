export interface RegraICMS {
    id: string;
    uf: string;
    tipo: 'base_reduzida' | 'credito_outorgado' | 'protege' | 'difal' | 'ciap' | 'st' | 'isencao';
    descricao: string;
    ncm: string[];
    cfop: string[];
    cst: string[];
    aliquota: number;
    baseReduzida?: number;
    creditoOutorgado?: number;
    protege?: {
        aliquota: number;
        baseCalculo: number;
    };
    difal?: {
        aliquotaInterna: number;
        aliquotaInterestadual: number;
    };
    ativo: boolean;
    dataInicio: Date;
    dataFim?: Date;
    fonte: string;
}
export interface ApuracaoICMS {
    id: string;
    empresa: string;
    cnpj: string;
    periodo: string;
    dataProcessamento: Date;
    status: 'pendente' | 'processando' | 'concluido' | 'erro';
    documentos: string[];
    planilhas: string[];
    relatorios: string[];
    totais: {
        baseCalculo: number;
        icmsDevido: number;
        icmsRecolhido: number;
        icmsACompensar: number;
        icmsAReembolsar: number;
        difal: number;
        protege: number;
        ciap: number;
    };
    produtos: ProdutoICMS[];
    operacoes: OperacaoICMS[];
    regrasAplicadas: RegraICMS[];
    relatoriosGerados: {
        tecnico: string;
        dashboard: string;
        memoriaCalculo: string;
    };
    erros: string[];
    observacoes: string;
}
export interface ProdutoICMS {
    id: string;
    codigo: string;
    descricao: string;
    ncm: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    baseCalculo: number;
    aliquota: number;
    icmsDevido: number;
    icmsRecolhido: number;
    icmsACompensar: number;
    regrasAplicadas: string[];
    observacoes: string;
}
export interface OperacaoICMS {
    id: string;
    tipo: 'entrada' | 'saida';
    cfop: string;
    cst: string;
    quantidade: number;
    valorTotal: number;
    baseCalculo: number;
    aliquota: number;
    icmsDevido: number;
    icmsRecolhido: number;
    icmsACompensar: number;
    difal?: number;
    protege?: number;
    ciap?: number;
    observacoes: string;
}
export declare class ICMSApuracaoAgent {
    private isRunning;
    private processingQueue;
    start(): Promise<void>;
    stop(): Promise<void>;
    processarApuracao(empresa: string, cnpj: string, periodo: string, documentos: string[], planilhas: string[], relatorios: string[]): Promise<ApuracaoICMS>;
    private extrairRegrasPlanilhas;
    private extrairRegrasPlanilha;
    private extrairRegrasRelatorio;
    private processarDocumentos;
    private aplicarRegrasICMS;
    private aplicarRegrasProduto;
    private aplicarRegrasOperacao;
    private calcularTotais;
    private gerarRelatorios;
    private gerarRelatorioTecnico;
    private gerarDashboard;
    private gerarMemoriaCalculo;
    private carregarRegrasICMS;
    private obterRegrasPadrao;
    private generateApuracaoId;
    private lerArquivo;
    private buscarDocumento;
    private extrairDadosICMS;
    private calcularTotaisDocumentos;
    private parsearRegrasPlanilha;
    private parsearRegrasRelatorio;
    private salvarNoBanco;
    getStatus(): any;
}
export declare const icmsApuracaoAgent: ICMSApuracaoAgent;
//# sourceMappingURL=icms-apuracao-agent.d.ts.map