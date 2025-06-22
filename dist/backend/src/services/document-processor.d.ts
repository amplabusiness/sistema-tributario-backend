export declare class DocumentProcessor {
    private processingQueue;
    private icmsAgent;
    private federalAgent;
    processDocument(documentId: string, userId: string): Promise<void>;
    processBatch(batchId: string, documentIds: string[], userId: string): Promise<void>;
    private processXML;
    private processPDF;
    private processExcel;
    private processCSV;
    private processJSON;
    private createChunks;
    private estimateTokenCount;
    private saveChunks;
    private processChunksWithAI;
    private extractXMLElements;
    private analyzeJSONStructure;
    private updateDocumentStatus;
    private checkRateLimit;
    getProcessingStatus(documentId: string): Promise<any>;
    private calculateProgress;
    static processSped(filePath: string, empresaId?: string): Promise<any>;
    private static saveSpedContribuicoesData;
    private static saveSpedFiscalData;
    static listDocuments(): Promise<({
        empresa: {
            id: string;
            updatedAt: Date;
            cnpj: string;
            razaoSocial: string;
            nomeFantasia: string | null;
            ie: string | null;
            im: string | null;
            cnae: string | null;
            endereco: string | null;
            regimeTributario: string | null;
            dataCadastro: Date;
        };
    } & {
        empresaId: string | null;
        id: string;
        filename: string;
        originalName: string;
        size: number;
        mimeType: string;
        status: import(".prisma/client").$Enums.DocumentStatus;
        userId: string;
        path: string | null;
        metadata: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
export declare const documentProcessor: DocumentProcessor;
export default documentProcessor;
//# sourceMappingURL=document-processor.d.ts.map