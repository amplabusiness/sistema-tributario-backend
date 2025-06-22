"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessor = exports.addAIJob = exports.addBatchJob = exports.addDocumentJob = exports.aiQueue = exports.batchQueue = exports.documentQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const prisma_1 = __importDefault(require("@/utils/prisma"));
const config_1 = __importDefault(require("@/config"));
const constants_1 = require("@/constants");
const queueConfig = {
    redis: config_1.default.redis.url,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: constants_1.AI_CONFIG.RETRY_ATTEMPTS,
        backoff: {
            type: 'exponential',
            delay: constants_1.AI_CONFIG.RETRY_DELAY,
        },
    },
};
exports.documentQueue = new bull_1.default('document-processing', queueConfig);
exports.batchQueue = new bull_1.default('batch-processing', queueConfig);
exports.aiQueue = new bull_1.default('ai-processing', queueConfig);
exports.documentQueue.process(async (job) => {
    const startTime = Date.now();
    const { id, data } = job.data;
    try {
        console.log('Processing document', { documentId: id, jobId: job.id });
        await prisma_1.default.document.update({
            where: { id },
            data: { status: 'PROCESSING' },
        });
        const result = await processDocument(data);
        await prisma_1.default.document.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                metadata: result,
            },
        });
        const processingTime = Date.now() - startTime;
        console.log('Document processed successfully', {
            documentId: id,
            processingTime,
            jobId: job.id
        });
        return {
            success: true,
            data: result,
            processingTime,
        };
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        await prisma_1.default.document.update({
            where: { id },
            data: {
                status: 'ERROR',
                metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
            },
        });
        console.error('Document processing failed', error instanceof Error ? error : new Error('Unknown error'), {
            documentId: id,
            processingTime,
            jobId: job.id,
        });
        throw error;
    }
});
exports.batchQueue.process(async (job) => {
    const startTime = Date.now();
    const { documents } = job.data.data;
    try {
        console.log('Processing batch', {
            batchSize: documents.length,
            jobId: job.id
        });
        const results = [];
        const batchSize = constants_1.AI_CONFIG.BATCH_SIZE;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map((doc) => processDocument(doc)));
            results.push(...batchResults);
            if (i + batchSize < documents.length) {
                await new Promise(resolve => setTimeout(resolve, 1000 / constants_1.AI_CONFIG.RATE_LIMIT));
            }
        }
        const processingTime = Date.now() - startTime;
        console.log('Batch processed successfully', {
            batchSize: documents.length,
            processingTime,
            jobId: job.id
        });
        return {
            success: true,
            data: results,
            processingTime,
        };
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        console.error('Batch processing failed', error instanceof Error ? error : new Error('Unknown error'), {
            batchSize: documents.length,
            processingTime,
            jobId: job.id,
        });
        throw error;
    }
});
exports.aiQueue.process(async (job) => {
    const startTime = Date.now();
    const { documentId, content, model } = job.data.data;
    try {
        console.log('Processing AI request', {
            documentId,
            model,
            jobId: job.id
        });
        const result = await processWithAI(content, model);
        await prisma_1.default.aIProcessingResult.create({
            data: {
                documentId,
                model,
                tokens: result.tokens || 0,
                processingTime: Date.now() - startTime,
                result: result.data,
            },
        });
        const processingTime = Date.now() - startTime;
        console.log('AI processing completed', {
            documentId,
            model,
            tokens: result.tokens,
            processingTime,
            jobId: job.id
        });
        return {
            success: true,
            data: result.data,
            tokens: result.tokens,
            processingTime,
        };
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        await prisma_1.default.aIProcessingResult.create({
            data: {
                documentId,
                model,
                tokens: 0,
                processingTime,
                result: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        console.error('AI processing failed', error instanceof Error ? error : new Error('Unknown error'), {
            documentId,
            model,
            processingTime,
            jobId: job.id,
        });
        throw error;
    }
});
async function processDocument(data) {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    return {
        processed: true,
        extractedData: {},
    };
}
async function processWithAI(content, model) {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    return {
        data: {
            analysis: 'Análise simulada do conteúdo',
            summary: 'Resumo do documento',
            keywords: ['palavra1', 'palavra2', 'palavra3'],
        },
        tokens: Math.floor(Math.random() * 1000) + 100,
    };
}
const addDocumentJob = async (documentId, data, priority = 'normal') => {
    const job = await exports.documentQueue.add('process-document', { id: documentId, type: 'document', data, priority, retries: 0, createdAt: new Date() }, { priority: getPriorityValue(priority) });
    console.log('Document job added to queue', { documentId, jobId: job.id, priority });
    return job;
};
exports.addDocumentJob = addDocumentJob;
const addBatchJob = async (documents, priority = 'normal') => {
    const job = await exports.batchQueue.add('process-batch', {
        id: `batch-${Date.now()}`,
        type: 'batch',
        data: { documents },
        priority,
        retries: 0,
        createdAt: new Date()
    }, { priority: getPriorityValue(priority) });
    console.log('Batch job added to queue', { batchSize: documents.length, jobId: job.id, priority });
    return job;
};
exports.addBatchJob = addBatchJob;
const addAIJob = async (documentId, content, model, priority = 'normal') => {
    const job = await exports.aiQueue.add('process-ai', {
        id: `ai-${documentId}-${Date.now()}`,
        type: 'ai',
        data: { documentId, content, model },
        priority,
        retries: 0,
        createdAt: new Date()
    }, { priority: getPriorityValue(priority) });
    console.log('AI job added to queue', { documentId, model, jobId: job.id, priority });
    return job;
};
exports.addAIJob = addAIJob;
function getPriorityValue(priority) {
    switch (priority) {
        case 'low': return 10;
        case 'normal': return 5;
        case 'high': return 1;
        case 'critical': return 0;
        default: return 5;
    }
}
exports.documentQueue.on('completed', (job) => {
    console.log('Document job completed', { jobId: job.id, result: job.returnvalue });
});
exports.documentQueue.on('failed', (job, err) => {
    console.error('Document job failed', err, { jobId: job.id });
});
exports.batchQueue.on('completed', (job) => {
    console.log('Batch job completed', { jobId: job.id, result: job.returnvalue });
});
exports.batchQueue.on('failed', (job, err) => {
    console.error('Batch job failed', err, { jobId: job.id });
});
exports.aiQueue.on('completed', (job) => {
    console.log('AI job completed', { jobId: job.id, result: job.returnvalue });
});
exports.aiQueue.on('failed', (job, err) => {
    console.error('AI job failed', err, { jobId: job.id });
});
class BatchProcessor {
    static async processDocuments(documents) {
        const job = await (0, exports.addBatchJob)(documents);
        return new Promise((resolve, reject) => {
            exports.batchQueue.on('completed', (completedJob) => {
                if (completedJob.id === job.id) {
                    resolve(completedJob.returnvalue.data);
                }
            });
            exports.batchQueue.on('failed', (failedJob, err) => {
                if (failedJob.id === job.id) {
                    reject(err);
                }
            });
        });
    }
}
exports.BatchProcessor = BatchProcessor;
exports.default = BatchProcessor;
//# sourceMappingURL=batch-processor.js.map