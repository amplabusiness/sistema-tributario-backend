"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDetailedStats = exports.cleanupAllQueues = exports.removeJob = exports.retryJob = exports.getJobProgress = exports.cleanQueue = exports.resumeQueue = exports.pauseQueue = exports.getQueueStats = exports.addAIJob = exports.addBatchJob = exports.addDocumentJob = exports.iaQueue = exports.batchQueue = exports.documentQueue = void 0;
exports.addIATask = addIATask;
exports.startIAWorker = startIAWorker;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("@/utils/logger");
const constants_1 = require("@/constants");
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
const queueConfig = {
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: constants_1.BATCH.RETRY_ATTEMPTS,
        backoff: {
            type: 'exponential',
            delay: constants_1.BATCH.RETRY_DELAY,
        },
    },
};
exports.documentQueue = new bullmq_1.Queue('document-processing', queueConfig);
exports.batchQueue = new bullmq_1.Queue('batch-processing', queueConfig);
exports.iaQueue = new bullmq_1.Queue('ia-processing', { connection });
const iaScheduler = new bullmq_1.QueueScheduler('ia-processing', { connection });
exports.documentQueue.on('completed', (job, result) => {
    (0, logger_1.logInfo)('Document job completed', {
        jobId: job.id,
        documentId: job.data.documentId,
        result,
    });
});
exports.documentQueue.on('failed', (job, err) => {
    (0, logger_1.logError)('Document job failed', err, {
        jobId: job.id,
        documentId: job.data.documentId,
        attempts: job.attemptsMade,
    });
});
exports.batchQueue.on('completed', (job, result) => {
    (0, logger_1.logInfo)('Batch job completed', {
        jobId: job.id,
        batchId: job.data.batchId,
        processedCount: result?.processedCount || 0,
    });
});
exports.batchQueue.on('failed', (job, err) => {
    (0, logger_1.logError)('Batch job failed', err, {
        jobId: job.id,
        batchId: job.data.batchId,
        attempts: job.attemptsMade,
    });
});
exports.iaQueue.on('completed', (job, result) => {
    (0, logger_1.logInfo)('AI job completed', {
        jobId: job.id,
        model: job.data.model,
        resultLength: result?.length || 0,
    });
});
exports.iaQueue.on('failed', (job, err) => {
    (0, logger_1.logError)('AI job failed', err, {
        jobId: job.id,
        model: job.data.model,
        attempts: job.attemptsMade,
    });
});
const addDocumentJob = async (data) => {
    const job = await exports.documentQueue.add('process-document', data, {
        priority: data.priority || 0,
        timeout: constants_1.BATCH.TIMEOUT,
    });
    (0, logger_1.logInfo)('Document job added', {
        jobId: job.id,
        documentId: data.documentId,
        priority: data.priority,
    });
    return job;
};
exports.addDocumentJob = addDocumentJob;
const addBatchJob = async (data) => {
    const job = await exports.batchQueue.add('process-batch', data, {
        priority: data.priority || 0,
        timeout: constants_1.BATCH.TIMEOUT * 2,
    });
    (0, logger_1.logInfo)('Batch job added', {
        jobId: job.id,
        batchId: data.batchId,
        documentCount: data.documents.length,
        priority: data.priority,
    });
    return job;
};
exports.addBatchJob = addBatchJob;
const addAIJob = async (data) => {
    const job = await exports.iaQueue.add('process', data, {
        priority: data.priority || 0,
        timeout: constants_1.BATCH.TIMEOUT,
    });
    (0, logger_1.logInfo)('AI job added', {
        jobId: job.id,
        model: data.model,
        contentLength: data.content.length,
        priority: data.priority,
    });
    return job;
};
exports.addAIJob = addAIJob;
const getQueueStats = async () => {
    const [documentStats, batchStats, aiStats] = await Promise.all([
        exports.documentQueue.getJobCounts(),
        exports.batchQueue.getJobCounts(),
        exports.iaQueue.getJobCounts(),
    ]);
    return {
        document: documentStats,
        batch: batchStats,
        ai: aiStats,
    };
};
exports.getQueueStats = getQueueStats;
const pauseQueue = async (queueName) => {
    const queue = getQueueByName(queueName);
    await queue.pause();
    (0, logger_1.logInfo)('Queue paused', { queueName });
};
exports.pauseQueue = pauseQueue;
const resumeQueue = async (queueName) => {
    const queue = getQueueByName(queueName);
    await queue.resume();
    (0, logger_1.logInfo)('Queue resumed', { queueName });
};
exports.resumeQueue = resumeQueue;
const cleanQueue = async (queueName, grace = 1000) => {
    const queue = getQueueByName(queueName);
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
    (0, logger_1.logInfo)('Queue cleaned', { queueName, grace });
};
exports.cleanQueue = cleanQueue;
const getQueueByName = (name) => {
    switch (name) {
        case 'document':
            return exports.documentQueue;
        case 'batch':
            return exports.batchQueue;
        case 'ai':
            return exports.iaQueue;
        default:
            throw new Error(`Unknown queue: ${name}`);
    }
};
const getJobProgress = async (jobId, queueName) => {
    const queue = getQueueByName(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
        return null;
    }
    return {
        id: job.id,
        status: await job.getState(),
        progress: job.progress(),
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
    };
};
exports.getJobProgress = getJobProgress;
const retryJob = async (jobId, queueName) => {
    const queue = getQueueByName(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
        throw new Error('Job not found');
    }
    await job.retry();
    (0, logger_1.logInfo)('Job retried', { jobId, queueName });
};
exports.retryJob = retryJob;
const removeJob = async (jobId, queueName) => {
    const queue = getQueueByName(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
        throw new Error('Job not found');
    }
    await job.remove();
    (0, logger_1.logInfo)('Job removed', { jobId, queueName });
};
exports.removeJob = removeJob;
const cleanupAllQueues = async () => {
    await Promise.all([
        exports.documentQueue.clean(0, 'completed'),
        exports.documentQueue.clean(0, 'failed'),
        exports.batchQueue.clean(0, 'completed'),
        exports.batchQueue.clean(0, 'failed'),
        exports.iaQueue.clean(0, 'completed'),
        exports.iaQueue.clean(0, 'failed'),
    ]);
    (0, logger_1.logInfo)('All queues cleaned');
};
exports.cleanupAllQueues = cleanupAllQueues;
const getDetailedStats = async () => {
    const [documentJobs, batchJobs, aiJobs] = await Promise.all([
        exports.documentQueue.getJobs(['active', 'waiting', 'completed', 'failed']),
        exports.batchQueue.getJobs(['active', 'waiting', 'completed', 'failed']),
        exports.iaQueue.getJobs(['active', 'waiting', 'completed', 'failed']),
    ]);
    return {
        document: {
            active: documentJobs.filter(job => job.processedOn).length,
            waiting: documentJobs.filter(job => !job.processedOn).length,
            completed: documentJobs.filter(job => job.finishedOn && !job.failedReason).length,
            failed: documentJobs.filter(job => job.failedReason).length,
        },
        batch: {
            active: batchJobs.filter(job => job.processedOn).length,
            waiting: batchJobs.filter(job => !job.processedOn).length,
            completed: batchJobs.filter(job => job.finishedOn && !job.failedReason).length,
            failed: batchJobs.filter(job => job.failedReason).length,
        },
        ai: {
            active: aiJobs.filter(job => job.processedOn).length,
            waiting: aiJobs.filter(job => !job.processedOn).length,
            completed: aiJobs.filter(job => job.finishedOn && !job.failedReason).length,
            failed: aiJobs.filter(job => job.failedReason).length,
        },
    };
};
exports.getDetailedStats = getDetailedStats;
async function addIATask(data, opts) {
    await exports.iaQueue.add('process', data, opts);
}
function startIAWorker(processFn) {
    const worker = new bullmq_1.Worker('ia-processing', async (job) => {
        return await processFn(job.data);
    }, { connection });
    worker.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed:`, err);
    });
    worker.on('completed', job => {
        console.log(`Job ${job.id} completed.`);
    });
    return worker;
}
exports.default = {
    documentQueue: exports.documentQueue,
    batchQueue: exports.batchQueue,
    iaQueue: exports.iaQueue,
    addDocumentJob: exports.addDocumentJob,
    addBatchJob: exports.addBatchJob,
    addAIJob: exports.addAIJob,
    getQueueStats: exports.getQueueStats,
    pauseQueue: exports.pauseQueue,
    resumeQueue: exports.resumeQueue,
    cleanQueue: exports.cleanQueue,
    getJobProgress: exports.getJobProgress,
    retryJob: exports.retryJob,
    removeJob: exports.removeJob,
    cleanupAllQueues: exports.cleanupAllQueues,
    getDetailedStats: exports.getDetailedStats,
    addIATask,
    startIAWorker,
};
//# sourceMappingURL=queue.js.map