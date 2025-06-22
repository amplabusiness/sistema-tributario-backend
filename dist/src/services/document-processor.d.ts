import { DocumentStatus } from '@prisma/client';
export interface ProcessingResult {
    success: boolean;
    data?: any;
    error?: string;
    validationResults?: ValidationResult[];
}
export interface ValidationResult {
    field: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    isValid: boolean;
}
export interface DocumentProcessingOptions {
    enableValidation?: boolean;
    enableAIAnalysis?: boolean;
    extractMetadata?: boolean;
    generateThumbnail?: boolean;
}
export declare class DocumentProcessor {
    constructor();
    processDocument(documentId: string, content: Buffer, options?: DocumentProcessingOptions): Promise<ProcessingResult>;
    processMultipleDocuments(documents: {
        id: string;
        content: Buffer;
    }[], options?: DocumentProcessingOptions): Promise<ProcessingResult[]>;
    private extractMetadata;
    private validateDocument;
    getProcessingStatus(documentId: string): Promise<DocumentStatus>;
    retryProcessing(documentId: string, options?: DocumentProcessingOptions): Promise<ProcessingResult>;
    static listarDocumentos(): Promise<any[]>;
    static buscarDocumentosPorEmpresa(empresaId: string): Promise<any[]>;
    static listDocuments(): Promise<any[]>;
    static getAllDocuments(): Promise<any[]>;
    static getDocumentsByCompany(companyId: string): Promise<any[]>;
    static processarDocumento(documentId: string): Promise<any>;
    static processSped(filePath: string, empresaId?: string): Promise<any>;
    static processFiscalData(fiscalData: any, companyId: string): Promise<any>;
    static indexDocument(document: any, companyId: string): Promise<any>;
}
export default DocumentProcessor;
//# sourceMappingURL=document-processor.d.ts.map