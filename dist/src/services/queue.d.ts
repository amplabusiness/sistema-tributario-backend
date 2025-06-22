import { Queue, Job } from 'bullmq';
export interface DocumentJob {
    documentId: string;
    userId: string;
    filePath: string;
    type: 'document';
}
export interface BatchJob {
    batchId: string;
    userId: string;
    documents: string[];
    type: 'batch';
}
export interface AIJob {
    documentId: string;
    content: string;
    model: string;
    type: 'ai';
}
export declare const documentQueue: Queue<DocumentJob, any, string>;
export declare const batchQueue: Queue<BatchJob, any, string>;
export declare const iaQueue: Queue<AIJob, any, string>;
export declare const addDocumentJob: (data: Omit<DocumentJob, "type">) => Promise<Job<DocumentJob>>;
export declare const addBatchJob: (data: Omit<BatchJob, "type">) => Promise<Job<BatchJob>>;
export declare const addAIJob: (data: Omit<AIJob, "type">) => Promise<Job<AIJob>>;
export declare const cleanQueues: () => Promise<void>;
export declare const getQueueStats: () => Promise<{
    document: {
        [index: string]: number;
    };
    batch: {
        [index: string]: number;
    };
    ia: {
        [index: string]: number;
    };
}>;
export declare const addToQueue: (data: Omit<DocumentJob, "type">) => Promise<Job<DocumentJob>>;
export declare const addIATask: (data: Omit<AIJob, "type">) => Promise<Job<AIJob>>;
declare const _default: {
    documentQueue: Queue<DocumentJob, any, string>;
    batchQueue: Queue<BatchJob, any, string>;
    iaQueue: Queue<AIJob, any, string>;
    addDocumentJob: (data: Omit<DocumentJob, "type">) => Promise<Job<DocumentJob>>;
    addBatchJob: (data: Omit<BatchJob, "type">) => Promise<Job<BatchJob>>;
    addAIJob: (data: Omit<AIJob, "type">) => Promise<Job<AIJob>>;
    cleanQueues: () => Promise<void>;
    getQueueStats: () => Promise<{
        document: {
            [index: string]: number;
        };
        batch: {
            [index: string]: number;
        };
        ia: {
            [index: string]: number;
        };
    }>;
    addToQueue: (data: Omit<DocumentJob, "type">) => Promise<Job<DocumentJob>>;
};
export default _default;
//# sourceMappingURL=queue.d.ts.map