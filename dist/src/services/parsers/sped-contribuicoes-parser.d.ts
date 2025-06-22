export interface SpedContribuicoesRegistro {
    tipo: string;
    campos: string[];
}
export interface SpedContribuicoesDocumento {
    registros: SpedContribuicoesRegistro[];
}
export interface PisCofinsItem {
    documento: string;
    data: string;
    cnpj: string;
    produto: string;
    cfop: string;
    cst: string;
    valor: number;
    basePis: number;
    valorPis: number;
    baseCofins: number;
    valorCofins: number;
}
export declare class SpedContribuicoesParser {
    static parseFile(filePath: string): SpedContribuicoesDocumento;
    static parseContent(content: string): SpedContribuicoesDocumento;
    static consolidarPisCofins(documento: SpedContribuicoesDocumento): PisCofinsItem[];
    static consolidarApuracao(documento: SpedContribuicoesDocumento): any[];
}
//# sourceMappingURL=sped-contribuicoes-parser.d.ts.map