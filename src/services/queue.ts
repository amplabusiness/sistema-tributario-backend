import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logInfo, logError } from '../utils/logger';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

// Tipos de jobs
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

// Configurações das filas
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

// Criar filas
export const documentQueue = new Queue<DocumentJob>('document-processing', queueOptions);
export const batchQueue = new Queue<BatchJob>('batch-processing', queueOptions);
export const iaQueue = new Queue<AIJob>('ia-processing', queueOptions);

// Workers simplificados (sem listeners por enquanto)
const documentWorker = new Worker<DocumentJob>('document-processing', async (job: Job<DocumentJob>) => {
  logInfo(`Processing document job ${job.id}`, { documentId: job.data.documentId });
  // TODO: Implementar processamento de documento
  return { success: true, documentId: job.data.documentId };
}, { connection });

const batchWorker = new Worker<BatchJob>('batch-processing', async (job: Job<BatchJob>) => {
  logInfo(`Processing batch job ${job.id}`, { batchId: job.data.batchId });
  // TODO: Implementar processamento em lote
  return { success: true, batchId: job.data.batchId };
}, { connection });

const iaWorker = new Worker<AIJob>('ia-processing', async (job: Job<AIJob>) => {
  logInfo(`Processing AI job ${job.id}`, { documentId: job.data.documentId });
  // TODO: Implementar processamento IA
  return { success: true, documentId: job.data.documentId };
}, { connection });

// Funções para adicionar jobs
export const addDocumentJob = async (data: Omit<DocumentJob, 'type'>): Promise<Job<DocumentJob>> => {
  return documentQueue.add('process-document', { ...data, type: 'document' });
};

export const addBatchJob = async (data: Omit<BatchJob, 'type'>): Promise<Job<BatchJob>> => {
  return batchQueue.add('process-batch', { ...data, type: 'batch' });
};

export const addAIJob = async (data: Omit<AIJob, 'type'>): Promise<Job<AIJob>> => {
  return iaQueue.add('process-ai', { ...data, type: 'ai' });
};

// Função para limpar filas
export const cleanQueues = async () => {
  await Promise.all([
    documentQueue.obliterate(),
    batchQueue.obliterate(),
    iaQueue.obliterate(),
  ]);
};

// Status das filas
export const getQueueStats = async () => {
  const [docStats, batchStats, iaStats] = await Promise.all([
    documentQueue.getJobCounts(),
    batchQueue.getJobCounts(),
    iaQueue.getJobCounts(),
  ]);

  return {
    document: docStats,
    batch: batchStats,
    ia: iaStats,
  };
};

// Export para compatibilidade com código existente
export const addToQueue = addDocumentJob;
export const addIATask = addAIJob;

export default {
  documentQueue,
  batchQueue,
  iaQueue,
  addDocumentJob,
  addBatchJob,
  addAIJob,
  cleanQueues,
  getQueueStats,
  addToQueue,
};
