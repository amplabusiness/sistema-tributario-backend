export interface SpedFiscalRegistro {
    tipo: string;
    campos: string[];
}
export interface SpedFiscalDocumento {
    registros: SpedFiscalRegistro[];
}
export interface IcmsIpiItem {
    documento: string;
    data: string;
    cnpj: string;
    produto: string;
    cfop: string;
    cst: string;
    ncm: string;
    valor: number;
    baseIcms: number;
    valorIcms: number;
    baseIpi: number;
    valorIpi: number;
}
export declare class SpedFiscalParser {
    static parseFile(filePath: string): SpedFiscalDocumento;
    static parseContent(content: string): SpedFiscalDocumento;
    static consolidarIcmsIpi(documento: SpedFiscalDocumento): IcmsIpiItem[];
    static consolidarApuracao(documento: SpedFiscalDocumento): any[];
}
//# sourceMappingURL=sped-fiscal-parser.d.ts.map