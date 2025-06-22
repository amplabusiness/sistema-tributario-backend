export interface ParsedDocument {
    id: string;
    fileName: string;
    fileType: string;
    companyData: CompanyData;
    fiscalData: FiscalData;
    validationResults: ValidationResult[];
    metadata: DocumentMetadata;
    extractedAt: Date;
}
export interface CompanyData {
    cnpj?: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    ie?: string;
    im?: string;
    cnae?: string;
    endereco?: {
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        municipio?: string;
        uf?: string;
        cep?: string;
    };
    regimeTributario?: string;
    dataInicioAtividade?: Date;
    dataFimAtividade?: Date;
}
export interface FiscalData {
    periodoInicial?: Date;
    periodoFinal?: Date;
    totalFaturamento?: number;
    totalCompras?: number;
    produtos: ProductData[];
    operacoes: OperationData[];
    impostos: TaxData[];
}
export interface ProductData {
    codigo?: string;
    descricao?: string;
    ncm?: string;
    cest?: string;
    unidade?: string;
    quantidade?: number;
    valorUnitario?: number;
    valorTotal?: number;
}
export interface OperationData {
    tipo: 'entrada' | 'saida';
    cfop: string;
    cst: string;
    naturezaOperacao?: string;
    valorOperacao: number;
    baseCalculo: number;
    aliquota: number;
    valorImposto: number;
    data: Date;
}
export interface TaxData {
    tipo: 'ICMS' | 'IPI' | 'PIS' | 'COFINS' | 'ISS' | 'IOF';
    baseCalculo: number;
    aliquota: number;
    valor: number;
    periodo: Date;
}
export interface ValidationResult {
    field: string;
    isValid: boolean;
    message: string;
    severity: 'error' | 'warning' | 'info';
}
export interface DocumentMetadata {
    fileSize: number;
    encoding?: string;
    checksum: string;
    processingTime: number;
    parserVersion: string;
}
export declare class DocumentParser {
    private spedFiscalParser;
    private spedContribuicoesParser;
    private icmsRulesParser;
    private protegeParser;
    constructor();
    parseDocument(filePath: string): Promise<ParsedDocument>;
    private extractCompanyDataFromSped;
    private extractFiscalDataFromSped;
    private extractFiscalDataFromSpedContribuicoes;
    private extractCompanyDataFromExcel;
    private extractCompanyDataFromPdf;
    private validateDocument;
    private validateCnpj;
    private validateIe;
    private validateCfop;
    private validateCst;
    private validateNcm;
    private calculateChecksum;
    private generateDocumentId;
}
//# sourceMappingURL=document-parser.d.ts.map