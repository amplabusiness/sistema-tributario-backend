import Queue from 'bull';
import prisma from '@/utils/prisma';
import config from '@/config';

import { AI_CONFIG } from '@/constants';

// Interface para jobs de processamento
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

// Interface para resultado do processamento
export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  tokens?: number;
}

// Configuração das filas
const queueConfig = {
  redis: config.redis.url,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: AI_CONFIG.RETRY_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: AI_CONFIG.RETRY_DELAY,
    },
  },
};

// Fila para processamento de documentos individuais
export const documentQueue = new Queue<ProcessingJob>('document-processing', queueConfig);

// Fila para processamento em lotes
export const batchQueue = new Queue<ProcessingJob>('batch-processing', queueConfig);

// Fila para processamento de IA
export const aiQueue = new Queue<ProcessingJob>('ai-processing', queueConfig);

// Processador de documentos individuais
documentQueue.process(async (job) => {
  const startTime = Date.now();
  const { id, data } = job.data;

  try {
    console.log('Processing document', { documentId: id, jobId: job.id });

    // Atualizar status para PROCESSING
    await prisma.document.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    // Simular processamento (será substituído pela lógica real de IA)
    const result = await processDocument(data);

    // Atualizar status para COMPLETED
    await prisma.document.update({
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
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Atualizar status para ERROR
    await prisma.document.update({
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

// Processador de lotes
batchQueue.process(async (job) => {
  const startTime = Date.now();
  const { documents } = job.data.data as { documents: any[] };

  try {
    console.log('Processing batch', { 
      batchSize: documents.length, 
      jobId: job.id 
    });

    const results = [];
    const batchSize = AI_CONFIG.BATCH_SIZE;

    // Processar em lotes menores para respeitar rate limits
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      // Processar lote
      const batchResults = await Promise.all(
        batch.map((doc: any) => processDocument(doc))
      );
      
      results.push(...batchResults);

      // Rate limiting - esperar entre lotes
      if (i + batchSize < documents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000 / AI_CONFIG.RATE_LIMIT));
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
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('Batch processing failed', error instanceof Error ? error : new Error('Unknown error'), {
      batchSize: documents.length,
      processingTime,
      jobId: job.id,
    });

    throw error;
  }
});

// Processador de IA
aiQueue.process(async (job) => {
  const startTime = Date.now();
  const { documentId, content, model } = job.data.data as { documentId: string; content: string; model: string };

  try {
    console.log('Processing AI request', { 
      documentId, 
      model, 
      jobId: job.id 
    });

    // Simular processamento de IA (será substituído pela integração real)
    const result = await processWithAI(content, model);

    // Salvar resultado no banco
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
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Salvar erro no banco
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

    console.error('AI processing failed', error instanceof Error ? error : new Error('Unknown error'), {
      documentId,
      model,
      processingTime,
      jobId: job.id,
    });

    throw error;
  }
});

// Função para processar documento (placeholder)
async function processDocument(data: any): Promise<any> {
  // Simular processamento
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  return {
    processed: true,
    extractedData: {
      // Dados extraídos do documento
    },
  };
}

// Função para processar com IA (placeholder)
async function processWithAI(content: string, model: string): Promise<any> {
  // Simular processamento de IA
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

// Funções para adicionar jobs às filas
export const addDocumentJob = async (documentId: string, data: any, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal') => {
  const job = await documentQueue.add(
    'process-document',
    { id: documentId, type: 'document', data, priority, retries: 0, createdAt: new Date() },
    { priority: getPriorityValue(priority) }
  );
  
  console.log('Document job added to queue', { documentId, jobId: job.id, priority });
  return job;
};

export const addBatchJob = async (documents: any[], priority: 'low' | 'normal' | 'high' | 'critical' = 'normal') => {
  const job = await batchQueue.add(
    'process-batch',
    { 
      id: `batch-${Date.now()}`,
      type: 'batch' as const, 
      data: { documents }, 
      priority, 
      retries: 0, 
      createdAt: new Date() 
    },
    { priority: getPriorityValue(priority) }
  );
  
  console.log('Batch job added to queue', { batchSize: documents.length, jobId: job.id, priority });
  return job;
};

export const addAIJob = async (documentId: string, content: string, model: string, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal') => {
  const job = await aiQueue.add(
    'process-ai',
    { 
      id: `ai-${documentId}-${Date.now()}`,
      type: 'ai' as const, 
      data: { documentId, content, model }, 
      priority, 
      retries: 0, 
      createdAt: new Date() 
    },
    { priority: getPriorityValue(priority) }
  );
  
  console.log('AI job added to queue', { documentId, model, jobId: job.id, priority });
  return job;
};

// Função auxiliar para converter prioridade em valor numérico
function getPriorityValue(priority: 'low' | 'normal' | 'high' | 'critical'): number {
  switch (priority) {
    case 'low': return 10;
    case 'normal': return 5;
    case 'high': return 1;
    case 'critical': return 0;
    default: return 5;
  }
}

// Event listeners para monitoramento
documentQueue.on('completed', (job) => {
  console.log('Document job completed', { jobId: job.id, result: job.returnvalue });
});

documentQueue.on('failed', (job, err) => {
  console.error('Document job failed', err, { jobId: job.id });
});

batchQueue.on('completed', (job) => {
  console.log('Batch job completed', { jobId: job.id, result: job.returnvalue });
});

batchQueue.on('failed', (job, err) => {
  console.error('Batch job failed', err, { jobId: job.id });
});

aiQueue.on('completed', (job) => {
  console.log('AI job completed', { jobId: job.id, result: job.returnvalue });
});

aiQueue.on('failed', (job, err) => {
  console.error('AI job failed', err, { jobId: job.id });
});

// Classe BatchProcessor para compatibilidade
export class BatchProcessor {
  static async processDocuments(documents: any[]): Promise<any[]> {
    const job = await addBatchJob(documents);
    return new Promise((resolve, reject) => {
      batchQueue.on('completed', (completedJob) => {
        if (completedJob.id === job.id) {
          resolve(completedJob.returnvalue.data);
        }
      });
      batchQueue.on('failed', (failedJob, err) => {
        if (failedJob.id === job.id) {
          reject(err);
        }
      });
    });
  }
}

export default BatchProcessor;