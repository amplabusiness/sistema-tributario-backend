export interface IcmsRule {
    ncm?: string;
    cfop?: string;
    cst?: string;
    descricao?: string;
    aliquota?: number;
    baseReduzida?: number;
    beneficio?: string;
    tipoCliente?: string;
    tipoOperacao?: string;
    proteje?: boolean;
    difal?: boolean;
    ciap?: boolean;
}
export declare class IcmsRulesExcelParser {
    static parseFile(filePath: string): IcmsRule[];
}
//# sourceMappingURL=icms-rules-excel-parser.d.ts.map