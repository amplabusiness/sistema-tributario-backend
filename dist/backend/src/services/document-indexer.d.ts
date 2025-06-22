import { XMLParsedData } from './parsers/xml-parser';
import { SpedFiscalDocumento } from './parsers/sped-fiscal-parser';
export declare class DocumentIndexer {
    private prisma;
    constructor();
    indexXMLData(documentId: string, empresaId: string, xmlData: XMLParsedData): Promise<void>;
    indexSpedFiscalData(documentId: string, empresaId: string, spedData: SpedFiscalDocumento): Promise<void>;
    indexSpedContribuicoesData(documentId: string, empresaId: string, spedData: any): Promise<void>;
    buscarDocumentos(empresaId: string, dataInicio: Date, dataFim: Date, tipoDocumento?: string): Promise<any[]>;
    buscarItensSpedFiscal(empresaId: string, dataInicio: string, dataFim: string): Promise<any[]>;
    buscarApuracaoSpedFiscal(empresaId: string, dataInicio: string, dataFim: string): Promise<any[]>;
    validarDadosFiscais(dados: any): Promise<{
        valido: boolean;
        erros: string[];
        avisos: string[];
    }>;
    private validarCNPJ;
    private validarCST;
    private validarCFOP;
    private validarNCM;
}
//# sourceMappingURL=document-indexer.d.ts.map