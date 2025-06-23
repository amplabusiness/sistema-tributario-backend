import { Request, Response } from 'express';
import { ParsedDocument, CompanyData } from '../parsers/document-parser';
export interface DocumentParsingResult {
    success: boolean;
    documentId: string;
    companyId?: string;
    extractedData: ParsedDocument;
    autoRegisteredCompany?: boolean;
    validationErrors: string[];
    processingTime: number;
}
export interface ParsingBatchResult {
    batchId: string;
    totalFiles: number;
    processedFiles: number;
    successCount: number;
    errorCount: number;
    results: DocumentParsingResult[];
    summary: {
        companiesFound: number;
        companiesRegistered: number;
        totalFaturamento: number;
        totalImpostos: number;
        validationErrors: number;
    };
}
export declare class DocumentParsingAgent {
    private static instance;
    private documentParser;
    private documentIndexer;
    private empresaService;
    private documentProcessor;
    private cacheService;
    private constructor();
    static getInstance(): DocumentParsingAgent;
    parseDocument(req: Request, res: Response): Promise<void>;
    validateDocument(req: Request, res: Response): Promise<void>;
    private validateCST;
    private validateCFOP;
    private validateNCM;
    private validateCNPJ;
    processDocument(filePath: string): Promise<DocumentParsingResult>;
    processBatch(filePaths: string[]): Promise<ParsingBatchResult>;
    extractCompanyDataFromDocuments(companyId: string): Promise<CompanyData>;
    validateAndCorrectData(documentId: string): Promise<DocumentParsingResult>;
    generateExtractionReport(companyId?: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<any>;
    private processFiscalData;
    private validateExtractedData;
    private indexDocument;
    private applyAutoCorrections;
    private countDocumentTypes;
    private generateValidationSummary;
    private generateFiscalDataSummary;
    private generateProcessingStats;
}
export default DocumentParsingAgent;
//# sourceMappingURL=document-parsing-agent.d.ts.map