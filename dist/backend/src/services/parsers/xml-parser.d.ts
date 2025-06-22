export type XMLDocumentType = 'NFe' | 'CTe' | 'NFSe' | 'MDFe' | 'SPED';
export interface XMLParsedData {
    tipoDocumento: XMLDocumentType;
    numeroDocumento: string;
    serie: string;
    dataEmissao: Date;
    valorTotal: number;
    cnpjEmitente: string;
    cnpjDestinatario?: string;
    cpfDestinatario?: string;
    itens: XMLItem[];
    impostos: XMLImpostos;
    chaveAcesso?: string;
    protocolo?: string;
    status: 'autorizada' | 'cancelada' | 'denegada';
    observacoes?: string;
}
export interface XMLItem {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    cst: string;
    aliquotaIcms: number;
    valorIcms: number;
    aliquotaIpi?: number;
    valorIpi?: number;
    aliquotaPis?: number;
    valorPis?: number;
    aliquotaCofins?: number;
    valorCofins?: number;
}
export interface XMLImpostos {
    valorTotalIcms: number;
    valorTotalIpi?: number;
    valorTotalPis: number;
    valorTotalCofins: number;
    valorTotalIss?: number;
    baseCalculoIcms: number;
    baseCalculoPis: number;
    baseCalculoCofins: number;
}
export declare class XMLParser {
    private xmlDoc;
    parseXML(xmlContent: string, tipoDocumento: XMLDocumentType): Promise<XMLParsedData>;
    private parseNFe;
    private parseCTe;
    private parseNFSe;
    private parseMDFe;
    private parseItemNFe;
    private parseImpostosNFe;
    private getTextContent;
    private parseNumber;
    private parseDate;
    private getCST;
    private getStatusNFe;
    private getStatusCTe;
}
//# sourceMappingURL=xml-parser.d.ts.map