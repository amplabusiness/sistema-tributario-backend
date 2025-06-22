"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAIJob = exports.addBatchJob = exports.addDocumentJob = exports.aiQueue = exports.batchQueue = exports.documentQueue = void 0;
const bull_1 = __importDefault(require("bull"));
const client_1 = require("@prisma/client");
const config_1 = __importDefault(require("@/config"));
const logger_1 = require("@/utils/logger");
const constants_1 = require("@/constants");
const prisma = new client_1.PrismaClient();
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
        (0, logger_1.logInfo)('Processing document', { documentId: id, jobId: job.id });
        await prisma.document.update({
            where: { id },
            data: { status: 'PROCESSING' },
        });
        const result = await processDocument(data);
        await prisma.document.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                metadata: result,
            },
        });
        const processingTime = Date.now() - startTime;
        (0, logger_1.logInfo)('Document processed successfully', {
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
        await prisma.document.update({
            where: { id },
            data: {
                status: 'ERROR',
                metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
            },
        });
        (0, logger_1.logError)('Document processing failed', error instanceof Error ? error : new Error('Unknown error'), {
            documentId: id,
            processingTime,
            jobId: job.id,
        });
        throw error;
    }
});
exports.batchQueue.process(async (job) => {
    const startTime = Date.now();
    const { documents } = job.data;
    try {
        (0, logger_1.logInfo)('Processing batch', {
            batchSize: documents.length,
            jobId: job.id
        });
        const results = [];
        const batchSize = constants_1.AI_CONFIG.BATCH_SIZE;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(doc => processDocument(doc)));
            results.push(...batchResults);
            if (i + batchSize < documents.length) {
                await new Promise(resolve => setTimeout(resolve, 1000 / constants_1.AI_CONFIG.RATE_LIMIT));
            }
        }
        const processingTime = Date.now() - startTime;
        (0, logger_1.logInfo)('Batch processed successfully', {
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
        (0, logger_1.logError)('Batch processing failed', error instanceof Error ? error : new Error('Unknown error'), {
            batchSize: documents.length,
            processingTime,
            jobId: job.id,
        });
        throw error;
    }
});
exports.aiQueue.process(async (job) => {
    const startTime = Date.now();
    const { documentId, content, model } = job.data;
    try {
        (0, logger_1.logAI)('Processing AI request', {
            documentId,
            model,
            jobId: job.id
        });
        const result = await processWithAI(content, model);
        await prisma.aIProcessingResult.create({
            data: {
                documentId,
                model,
                tokens: result.tokens || 0,
                processingTime: Date.now() - startTime,
                result: result.data,
            },
        });
        const processingTime = Date.now() - startTime;
        (0, logger_1.logAI)('AI processing completed', {
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
        await prisma.aIProcessingResult.create({
            data: {
                documentId,
                model,
                tokens: 0,
                processingTime,
                result: {},
                error: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        (0, logger_1.logError)('AI processing failed', error instanceof Error ? error : new Error('Unknown error'), {
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
    (0, logger_1.logInfo)('Document job added to queue', { documentId, jobId: job.id, priority });
    return job;
};
exports.addDocumentJob = addDocumentJob;
const addBatchJob = async (documents, priority = 'normal') => {
    const job = await exports.batchQueue.add('process-batch', { documents, type: 'batch', priority, retries: 0, createdAt: new Date() }, { priority: getPriorityValue(priority) });
    (0, logger_1.logInfo)('Batch job added to queue', { batchSize: documents.length, jobId: job.id, priority });
    return job;
};
exports.addBatchJob = addBatchJob;
const addAIJob = async (documentId, content, model, priority = 'normal') => {
    const job = await exports.aiQueue.add('process-ai', { documentId, content, model, type: 'ai', priority, retries: 0, createdAt: new Date() }, { priority: getPriorityValue(priority) });
    (0, logger_1.logAI)('AI job added to queue', { documentId, model, jobId: job.id, priority });
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
    (0, logger_1.logInfo)('Document job completed', { jobId: job.id, result: job.returnvalue });
});
exports.documentQueue.on('failed', (job, err) => {
    (0, logger_1.logError)('Document job failed', err, { jobId: job.id });
});
exports.batchQueue.on('completed', (job) => {
    (0, logger_1.logInfo)('Batch job completed', { jobId: job.id, result: job.returnvalue });
});
exports.batchQueue.on('failed', (job, err) => {
    (0, logger_1.logError)('Batch job failed', err, { jobId: job.id });
});
exports.aiQueue.on('completed', (job) => {
    (0, logger_1.logAI)('AI job completed', { jobId: job.id, result: job.returnvalue });
});
exports.aiQueue.on('failed', (job, err) => {
    (0, logger_1.logError)('AI job failed', err, { jobId: job.id });
});
exports.default = {
    documentQueue: exports.documentQueue,
    batchQueue: exports.batchQueue,
    aiQueue: exports.aiQueue,
    addDocumentJob: exports.addDocumentJob,
    addBatchJob: exports.addBatchJob,
    addAIJob: exports.addAIJob,
};
//# sourceMappingURL=batch-processor.js.map