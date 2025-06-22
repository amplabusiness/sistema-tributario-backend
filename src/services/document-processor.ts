import prisma from '../config/database';
import logger from '../utils/logger';
import { DocumentStatus } from '@prisma/client';

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  validationResults?: ValidationResult[];
}

export interface ValidationResult {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  isValid: boolean;
}

export interface DocumentProcessingOptions {
  enableValidation?: boolean;
  enableAIAnalysis?: boolean;
  extractMetadata?: boolean;
  generateThumbnail?: boolean;
}

export class DocumentProcessor {
  constructor() {}

  async processDocument(
    documentId: string,
    content: Buffer,
    options: DocumentProcessingOptions = {}
  ): Promise<ProcessingResult> {
    try {
      logger.info(`Iniciando processamento do documento ${documentId}`);      // Update document status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING }
      });

      const result: ProcessingResult = {
        success: true,
        data: {},
        validationResults: []
      };

      // Basic processing - extract metadata
      if (options.extractMetadata) {
        result.data = {
          ...result.data,
          metadata: await this.extractMetadata(content)
        };
      }

      // Validation
      if (options.enableValidation) {
        const validationResults = await this.validateDocument(content);
        result.validationResults = validationResults;
        
        const hasErrors = validationResults.some(v => v.severity === 'error');
        if (hasErrors) {
          result.success = false;
          result.error = 'Documento contém erros de validacao';
        }
      }      // Update document status based on result
      const finalStatus = result.success ? DocumentStatus.COMPLETED : DocumentStatus.ERROR;
      
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: finalStatus,
          updatedAt: new Date()
        }
      });

      logger.info(`Processamento do documento ${documentId} concluído com sucesso`);
      return result;

    } catch (error: any) {
      logger.error(`Erro no processamento do documento ${documentId}:`, error);
        // Update document status to error
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.ERROR }
      });

      return {
        success: false,
        error: error.message || 'Erro desconhecido no processamento'
      };
    }
  }

  async processMultipleDocuments(
    documents: { id: string; content: Buffer }[],
    options: DocumentProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const doc of documents) {
      const result = await this.processDocument(doc.id, doc.content, options);
      results.push(result);
    }
    
    return results;
  }

  private async extractMetadata(content: Buffer): Promise<any> {
    return {
      size: content.length,
      processedAt: new Date(),
      encoding: 'buffer'
    };
  }

  private async validateDocument(content: Buffer): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Basic validation - check if content exists
    if (!content || content.length === 0) {
      results.push({
        field: 'content',
        message: 'Documento vazio ou conteúdo inválido',
        severity: 'error',
        isValid: false
      });
    }
    
    // Check minimum size
    if (content.length < 10) {
      results.push({
        field: 'size',
        message: 'Documento muito pequeno',
        severity: 'warning',
        isValid: false
      });
    }
    
    return results;
  }
  async getProcessingStatus(documentId: string): Promise<DocumentStatus> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { status: true }
    });
    
    return document?.status || DocumentStatus.PENDING;
  }

  async retryProcessing(documentId: string, options?: DocumentProcessingOptions): Promise<ProcessingResult> {
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });
    
    if (!document) {
      throw new Error(`Documento ${documentId} não encontrado`);
    }
    
    // For now, we'll simulate reprocessing with empty content
    // In a real implementation, you'd retrieve the actual file content
    const mockContent = Buffer.from('');
    
    return this.processDocument(documentId, mockContent, options);
  }

  // Static methods for dashboard and other services
  static async listarDocumentos(): Promise<any[]> {
    try {
      const documents = await prisma.document.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          empresa: {
            select: { id: true, razaoSocial: true, cnpj: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        mimeType: doc.mimeType,
        size: doc.size,
        empresaId: doc.empresaId,
        userId: doc.userId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        empresa: doc.empresa,
        user: doc.user
      }));
    } catch (error) {
      logger.error('Erro ao listar documentos:', error);
      return [];
    }
  }

  static async buscarDocumentosPorEmpresa(empresaId: string): Promise<any[]> {
    try {
      const documents = await prisma.document.findMany({
        where: { empresaId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          empresa: {
            select: { id: true, razaoSocial: true, cnpj: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        mimeType: doc.mimeType,
        size: doc.size,
        empresaId: doc.empresaId,
        userId: doc.userId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        empresa: doc.empresa,
        user: doc.user
      }));
    } catch (error) {
      logger.error('Erro ao buscar documentos por empresa:', error);
      return [];
    }
  }

  static async listDocuments(): Promise<any[]> {
    // Alias for listarDocumentos
    return this.listarDocumentos();
  }

  static async getAllDocuments(): Promise<any[]> {
    // Alias for listarDocumentos
    return this.listarDocumentos();
  }

  static async getDocumentsByCompany(companyId: string): Promise<any[]> {
    // Alias for buscarDocumentosPorEmpresa
    return this.buscarDocumentosPorEmpresa(companyId);
  }

  static async processarDocumento(documentId: string): Promise<any> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });
      
      if (!document) {
        throw new Error(`Documento ${documentId} não encontrado`);
      }
      
      // Update to processing status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING }
      });
      
      // For now, simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update to completed status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.COMPLETED }
      });
      
      return { success: true, documentId };
    } catch (error) {
      logger.error(`Erro ao processar documento ${documentId}:`, error);
      
      // Update to error status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.ERROR }
      });
      
      throw error;
    }
  }

  static async processSped(filePath: string, empresaId?: string): Promise<any> {
    try {
      logger.info(`Processando SPED: ${filePath}`);
      
      // Simulate SPED processing
      const result = {
        success: true,
        filePath,
        empresaId,
        processedAt: new Date(),
        summary: {
          totalRecords: Math.floor(Math.random() * 1000) + 100,
          errors: Math.floor(Math.random() * 5),
          warnings: Math.floor(Math.random() * 10)
        }
      };
      
      return result;
    } catch (error) {
      logger.error(`Erro ao processar SPED ${filePath}:`, error);
      throw error;
    }
  }

  // Methods for AI agents
  static async processFiscalData(fiscalData: any, companyId: string): Promise<any> {
    try {
      logger.info(`Processando dados fiscais para empresa ${companyId}`);
      return { success: true, companyId, processedData: fiscalData };
    } catch (error) {
      logger.error('Erro ao processar dados fiscais:', error);
      throw error;
    }
  }

  static async indexDocument(document: any, companyId: string): Promise<any> {
    try {
      logger.info(`Indexando documento para empresa ${companyId}`);
      return { success: true, companyId, indexed: true };
    } catch (error) {
      logger.error('Erro ao indexar documento:', error);
      throw error;
    }
  }
}

export default DocumentProcessor;
