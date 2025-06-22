import { XMLParsedData } from './parsers/xml-parser';
import { SpedFiscalDocumento } from './parsers/sped-fiscal-parser';
export interface IndexarDocumentoInput {
    userId: string;
    tipo: string;
    conteudo: any;
    empresaId: string;
}
export interface DocumentoIndexado {
    id: string;
    tipo: string;
    conteudo: any;
    metadata: any;
}
export declare class DocumentIndexer {
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
    indexarDocumento(input: IndexarDocumentoInput): Promise<DocumentoIndexado>;
}
//# sourceMappingURL=document-indexer.d.ts.map