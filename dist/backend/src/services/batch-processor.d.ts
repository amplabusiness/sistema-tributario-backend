import Queue from 'bull';
export interface ProcessingJob {
    id: string;
    type: 'document' | 'batch';
    data: any;
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
declare const _default: {
    documentQueue: Queue.Queue<ProcessingJob>;
    batchQueue: Queue.Queue<ProcessingJob>;
    aiQueue: Queue.Queue<ProcessingJob>;
    addDocumentJob: (documentId: string, data: any, priority?: "low" | "normal" | "high" | "critical") => Promise<Queue.Job<ProcessingJob>>;
    addBatchJob: (documents: any[], priority?: "low" | "normal" | "high" | "critical") => Promise<Queue.Job<ProcessingJob>>;
    addAIJob: (documentId: string, content: string, model: string, priority?: "low" | "normal" | "high" | "critical") => Promise<Queue.Job<ProcessingJob>>;
};
export default _default;
//# sourceMappingURL=batch-processor.d.ts.map