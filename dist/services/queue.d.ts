import { Queue, Worker, JobsOptions } from 'bullmq';
export interface DocumentJob {
    documentId: string;
    filePath: string;
    documentType: string;
    userId: string;
    priority?: number;
}
export interface BatchJob {
    batchId: string;
    documents: DocumentJob[];
    userId: string;
    priority?: number;
}
export interface AIJob {
    jobId: string;
    content: string;
    model: string;
    userId: string;
    priority?: number;
}
export declare const documentQueue: Queue<DocumentJob, any, string>;
export declare const batchQueue: Queue<BatchJob, any, string>;
export declare const iaQueue: Queue<any, any, string>;
export declare const addDocumentJob: (data: DocumentJob) => Promise<Queue.Job<DocumentJob>>;
export declare const addBatchJob: (data: BatchJob) => Promise<Queue.Job<BatchJob>>;
export declare const addAIJob: (data: AIJob) => Promise<Queue.Job<AIJob>>;
export declare const getQueueStats: () => Promise<{
    document: {
        [index: string]: number;
    };
    batch: {
        [index: string]: number;
    };
    ai: {
        [index: string]: number;
    };
}>;
export declare const pauseQueue: (queueName: "document" | "batch" | "ai") => Promise<void>;
export declare const resumeQueue: (queueName: "document" | "batch" | "ai") => Promise<void>;
export declare const cleanQueue: (queueName: "document" | "batch" | "ai", grace?: number) => Promise<void>;
export declare const getJobProgress: (jobId: string, queueName: "document" | "batch" | "ai") => Promise<{
    id: string;
    status: import("bullmq").JobState | "unknown";
    progress: any;
    data: any;
    result: any;
    failedReason: string;
    attemptsMade: number;
    timestamp: number;
    processedOn: number;
    finishedOn: number;
}>;
export declare const retryJob: (jobId: string, queueName: "document" | "batch" | "ai") => Promise<void>;
export declare const removeJob: (jobId: string, queueName: "document" | "batch" | "ai") => Promise<void>;
export declare const cleanupAllQueues: () => Promise<void>;
export declare const getDetailedStats: () => Promise<{
    document: {
        active: number;
        waiting: number;
        completed: number;
        failed: number;
    };
    batch: {
        active: number;
        waiting: number;
        completed: number;
        failed: number;
    };
    ai: {
        active: number;
        waiting: number;
        completed: number;
        failed: number;
    };
}>;
export declare function addIATask(data: any, opts?: JobsOptions): Promise<void>;
export declare function startIAWorker(processFn: (data: any) => Promise<any>): Worker<any, any, string>;
declare const _default: {
    documentQueue: Queue<DocumentJob, any, string>;
    batchQueue: Queue<BatchJob, any, string>;
    iaQueue: Queue<any, any, string>;
    addDocumentJob: (data: DocumentJob) => Promise<Queue.Job<DocumentJob>>;
    addBatchJob: (data: BatchJob) => Promise<Queue.Job<BatchJob>>;
    addAIJob: (data: AIJob) => Promise<Queue.Job<AIJob>>;
    getQueueStats: () => Promise<{
        document: {
            [index: string]: number;
        };
        batch: {
            [index: string]: number;
        };
        ai: {
            [index: string]: number;
        };
    }>;
    pauseQueue: (queueName: "document" | "batch" | "ai") => Promise<void>;
    resumeQueue: (queueName: "document" | "batch" | "ai") => Promise<void>;
    cleanQueue: (queueName: "document" | "batch" | "ai", grace?: number) => Promise<void>;
    getJobProgress: (jobId: string, queueName: "document" | "batch" | "ai") => Promise<{
        id: string;
        status: import("bullmq").JobState | "unknown";
        progress: any;
        data: any;
        result: any;
        failedReason: string;
        attemptsMade: number;
        timestamp: number;
        processedOn: number;
        finishedOn: number;
    }>;
    retryJob: (jobId: string, queueName: "document" | "batch" | "ai") => Promise<void>;
    removeJob: (jobId: string, queueName: "document" | "batch" | "ai") => Promise<void>;
    cleanupAllQueues: () => Promise<void>;
    getDetailedStats: () => Promise<{
        document: {
            active: number;
            waiting: number;
            completed: number;
            failed: number;
        };
        batch: {
            active: number;
            waiting: number;
            completed: number;
            failed: number;
        };
        ai: {
            active: number;
            waiting: number;
            completed: number;
            failed: number;
        };
    }>;
    addIATask: typeof addIATask;
    startIAWorker: typeof startIAWorker;
};
export default _default;
//# sourceMappingURL=queue.d.ts.map