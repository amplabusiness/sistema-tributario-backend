"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIATask = exports.addToQueue = exports.getQueueStats = exports.cleanQueues = exports.addAIJob = exports.addBatchJob = exports.addDocumentJob = exports.iaQueue = exports.batchQueue = exports.documentQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
const queueOptions = {
    connection,
    defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
};
exports.documentQueue = new bullmq_1.Queue('document-processing', queueOptions);
exports.batchQueue = new bullmq_1.Queue('batch-processing', queueOptions);
exports.iaQueue = new bullmq_1.Queue('ia-processing', queueOptions);
const documentWorker = new bullmq_1.Worker('document-processing', async (job) => {
    (0, logger_1.logInfo)(`Processing document job ${job.id}`, { documentId: job.data.documentId });
    return { success: true, documentId: job.data.documentId };
}, { connection });
const batchWorker = new bullmq_1.Worker('batch-processing', async (job) => {
    (0, logger_1.logInfo)(`Processing batch job ${job.id}`, { batchId: job.data.batchId });
    return { success: true, batchId: job.data.batchId };
}, { connection });
const iaWorker = new bullmq_1.Worker('ia-processing', async (job) => {
    (0, logger_1.logInfo)(`Processing AI job ${job.id}`, { documentId: job.data.documentId });
    return { success: true, documentId: job.data.documentId };
}, { connection });
const addDocumentJob = async (data) => {
    return exports.documentQueue.add('process-document', { ...data, type: 'document' });
};
exports.addDocumentJob = addDocumentJob;
const addBatchJob = async (data) => {
    return exports.batchQueue.add('process-batch', { ...data, type: 'batch' });
};
exports.addBatchJob = addBatchJob;
const addAIJob = async (data) => {
    return exports.iaQueue.add('process-ai', { ...data, type: 'ai' });
};
exports.addAIJob = addAIJob;
const cleanQueues = async () => {
    await Promise.all([
        exports.documentQueue.obliterate(),
        exports.batchQueue.obliterate(),
        exports.iaQueue.obliterate(),
    ]);
};
exports.cleanQueues = cleanQueues;
const getQueueStats = async () => {
    const [docStats, batchStats, iaStats] = await Promise.all([
        exports.documentQueue.getJobCounts(),
        exports.batchQueue.getJobCounts(),
        exports.iaQueue.getJobCounts(),
    ]);
    return {
        document: docStats,
        batch: batchStats,
        ia: iaStats,
    };
};
exports.getQueueStats = getQueueStats;
exports.addToQueue = exports.addDocumentJob;
exports.addIATask = exports.addAIJob;
exports.default = {
    documentQueue: exports.documentQueue,
    batchQueue: exports.batchQueue,
    iaQueue: exports.iaQueue,
    addDocumentJob: exports.addDocumentJob,
    addBatchJob: exports.addBatchJob,
    addAIJob: exports.addAIJob,
    cleanQueues: exports.cleanQueues,
    getQueueStats: exports.getQueueStats,
    addToQueue: exports.addToQueue,
};
//# sourceMappingURL=queue.js.map