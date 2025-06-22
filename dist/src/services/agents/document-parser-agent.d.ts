export interface DocumentoFiscal {
    id: string;
    tipo: 'XML' | 'SPED' | 'ECD' | 'ECF' | 'CIAP' | 'INVENTARIO' | 'PGDAS';
    empresa: string;
    cnpj: string;
    periodo: string;
    dataProcessamento: Date;
    status: 'pendente' | 'processando' | 'concluido' | 'erro';
    dados: any;
    erros: string[];
    observacoes: string;
}
export interface ItemFiscal {
    id: string;
    documentoId: string;
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    cst: string;
    aliquota: number;
    baseCalculo: number;
    valor: number;
    quantidade: number;
    unidade: string;
    naturezaOperacao: string;
}
export interface EmitenteDestinatario {
    id: string;
    documentoId: string;
    tipo: 'emitente' | 'destinatario';
    cnpj: string;
    cpf?: string;
    nome: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        municipio: string;
        uf: string;
        cep: string;
    };
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
}
export interface Imposto {
    id: string;
    documentoId: string;
    itemId?: string;
    tipo: 'ICMS' | 'PIS' | 'COFINS' | 'IPI' | 'ISS' | 'IOF' | 'II' | 'ICMS_ST';
    baseCalculo: number;
    aliquota: number;
    valor: number;
    cst: string;
    cfop: string;
}
export declare class DocumentParserAgent {
    private isRunning;
    private processingQueue;
    start(): Promise<void>;
    stop(): Promise<void>;
    processarDocumento(arquivoPath: string, tipo: DocumentoFiscal['tipo'], empresa: string, cnpj: string, periodo: string): Promise<DocumentoFiscal>;
    private processarPorTipo;
    private processarXML;
    private processarSPED;
    private processarECD;
    private processarECF;
    private processarCIAP;
    private processarInventario;
    private processarPGDAS;
    private validarDadosComIA;
    private extrairDadosXML;
    private extrairDadosSPED;
    private processarRegistroSPED;
    private processarRegistroECD;
    private processarRegistroECF;
    private processarRegistroCIAP;
    private processarItemInventario;
    private processarGuiaPGDAS;
    private identificarTipoXML;
    private identificarTipoSPED;
    private generateDocumentId;
    private lerArquivo;
    private salvarNoBanco;
    private getDocumentFromCache;
    private startProcessing;
    getStatus(): any;
}
export declare const documentParserAgent: DocumentParserAgent;
//# sourceMappingURL=document-parser-agent.d.ts.map