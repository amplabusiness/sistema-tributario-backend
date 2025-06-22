import Queue from 'bull';
export interface ProcessingJob {
    id: string;
    type: 'document' | 'batch' | 'ai';
    data: {
        documents?: any[];
        documentId?: string;
        content?: string;
        model?: string;
        [key: string]: any;
    };
    priority: 'low' | 'normal' | 'high' | 'critical';
    retries: number;
    createdAt: Date;
}
export interface ProcessingResult {
    success: boolean;
    data?: any;
    error?: string;
    processingTime: number;
    tokens?: number;
}
export declare const documentQueue: Queue.Queue<ProcessingJob>;
export declare const batchQueue: Queue.Queue<ProcessingJob>;
export declare const aiQueue: Queue.Queue<ProcessingJob>;
export declare const addDocumentJob: (documentId: string, data: any, priority?: "low" | "normal" | "high" | "critical") => Promise<Queue.Job<ProcessingJob>>;
export declare const addBatchJob: (documents: any[], priority?: "low" | "normal" | "high" | "critical") => Promise<Queue.Job<ProcessingJob>>;
export declare const addAIJob: (documentId: string, content: string, model: string, priority?: "low" | "normal" | "high" | "critical") => Promise<Queue.Job<ProcessingJob>>;
export declare class BatchProcessor {
    static processDocuments(documents: any[]): Promise<any[]>;
}
export default BatchProcessor;
//# sourceMappingURL=batch-processor.d.ts.map