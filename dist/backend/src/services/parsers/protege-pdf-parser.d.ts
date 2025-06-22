export interface ProtegeBeneficio {
    codigo: string;
    descricao: string;
    tipo: 'BASE_REDUZIDA' | 'CREDITO_OUTORGADO' | 'DIFAL' | 'CIAP' | 'OUTROS';
    aliquota?: number;
    baseReduzida?: number;
    condicoes: string[];
    ativo: boolean;
}
export interface ProtegeRegra {
    ncm?: string;
    cfop?: string;
    cst?: string;
    descricao: string;
    tipoProtege: 'PROTEGE_15' | 'PROTEGE_2';
    aliquotaProtege: number;
    beneficios?: ProtegeBeneficio[];
    condicoesElegibilidade: string[];
    produtosAplicaveis?: string[];
}
export declare class ProtegePdfParser {
    static parseProtegeGoias(filePath: string): ProtegeRegra[];
    static parseProtege2Percent(filePath: string): ProtegeRegra[];
    static parseGuiaPratico(filePath: string): ProtegeBeneficio[];
    static parseManualAuditoria(filePath: string): any;
    private static extractTextFromPdf;
    private static parseProtegeContent;
    private static parseProtege2PercentContent;
    private static parseBeneficiosContent;
    private static parseManualContent;
    private static getProtegeGoiasContent;
    private static getProtege2PercentContent;
    private static getGuiaPraticoContent;
    private static getManualAuditoriaContent;
}
//# sourceMappingURL=protege-pdf-parser.d.ts.map