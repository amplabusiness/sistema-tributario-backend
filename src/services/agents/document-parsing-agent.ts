import { Request, Response } from 'express';
import { DocumentParser } from '../parsers/document-parser';
import { DocumentIndexer } from '../document-indexer';
import { EmpresaService } from '../empresa-service';
import { DocumentProcessor } from '../document-processor';
import { CacheService } from '../cache';
import BatchProcessor from '../batch-processor';

export interface DocumentParsingResult {
  success: boolean;
  documentId: string;
  companyId?: string;
  extractedData: ParsedDocument;
  autoRegisteredCompany?: boolean;
  validationErrors: string[];
  processingTime: number;
}

export interface ParsingBatchResult {
  batchId: string;
  totalFiles: number;
  processedFiles: number;
  successCount: number;
  errorCount: number;
  results: DocumentParsingResult[];
  summary: {
    companiesFound: number;
    companiesRegistered: number;
    totalFaturamento: number;
    totalImpostos: number;
    validationErrors: number;
  };
}

export class DocumentParsingAgent {
  private static instance: DocumentParsingAgent;
  private documentParser: DocumentParser;
  private documentIndexer: DocumentIndexer;
  private empresaService: EmpresaService;
  private documentProcessor: DocumentProcessor;
  private cacheService: CacheService;

  private constructor() {
    this.documentParser = new DocumentParser();
    this.documentIndexer = new DocumentIndexer();
    this.empresaService = new EmpresaService();
    this.documentProcessor = new DocumentProcessor();
    this.cacheService = new CacheService();
  }

  public static getInstance(): DocumentParsingAgent {
    if (!DocumentParsingAgent.instance) {
      DocumentParsingAgent.instance = new DocumentParsingAgent();
    }
    return DocumentParsingAgent.instance;
  }

  // Leitura e parser automatico de XML, SPED, ECD, ECF
  async parseDocument(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, fileType, content, empresaId } = req.body;

      if (!fileName || !fileType || !content) {
        return res.status(400).json({
          success: false,
          error: 'Dados obrigatorios: fileName, fileType, content'
        });
      }

      console.log(`📄 Processando documento: ${fileName} (${fileType})`);

      // Parser automatico baseado no tipo
      const parsedData = await this.documentParser.parse(fileType, content);
      
      // Indexacao automatica no banco
      const indexedData = await this.documentIndexer.index(parsedData, empresaId);

      console.log(`✅ Documento processado: ${fileName} - ${indexedData.totalRegistros} registros`);

      res.json({
        success: true,
        message: 'Documento processado com sucesso!',
        data: {
          fileName,
          fileType,
          empresaId,
          totalRegistros: indexedData.totalRegistros,
          registrosProcessados: indexedData.registrosProcessados,
          erros: indexedData.erros,
          processadoEm: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro no parsing do documento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro no processamento do documento'
      });
    }
  }

  // Validacao de CST, CFOP, NCM, CNPJ
  async validateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { documentData } = req.body;

      console.log('🔍 Validando dados do documento...');

      const validacoes = {
        cst: this.validateCST(documentData.cst),
        cfop: this.validateCFOP(documentData.cfop),
        ncm: this.validateNCM(documentData.ncm),
        cnpj: this.validateCNPJ(documentData.cnpj)
      };

      const totalValidacoes = Object.keys(validacoes).length;
      const validacoesPassaram = Object.values(validacoes).filter(v => v.valido).length;

      console.log(`✅ Validacoes: ${validacoesPassaram}/${totalValidacoes} passaram`);

      res.json({
        success: true,
        message: 'Validacao concluida!',
        data: {
          validacoes,
          totalValidacoes,
          validacoesPassaram,
          percentualSucesso: (validacoesPassaram / totalValidacoes) * 100
        }
      });
    } catch (error) {
      console.error('❌ Erro na validacao:', error);
      res.status(500).json({
        success: false,
        error: 'Erro na validacao do documento'
      });
    }
  }

  private validateCST(cst: string): { valido: boolean; erro?: string } {
    if (!cst || cst.length !== 2) {
      return { valido: false, erro: 'CST deve ter 2 digitos' };
    }
    return { valido: true };
  }

  private validateCFOP(cfop: string): { valido: boolean; erro?: string } {
    if (!cfop || cfop.length !== 4) {
      return { valido: false, erro: 'CFOP deve ter 4 digitos' };
    }
    return { valido: true };
  }

  private validateNCM(ncm: string): { valido: boolean; erro?: string } {
    if (!ncm || ncm.length !== 8) {
      return { valido: false, erro: 'NCM deve ter 8 digitos' };
    }
    return { valido: true };
  }

  private validateCNPJ(cnpj: string): { valido: boolean; erro?: string } {
    if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) {
      return { valido: false, erro: 'CNPJ deve ter 14 digitos' };
    }
    return { valido: true };
  }

  /**
   * Processa um documento individual e extrai todos os dados automaticamente
   */
  async processDocument(filePath: string): Promise<DocumentParsingResult> {
    const startTime = Date.now();
    const result: DocumentParsingResult = {
      success: false,
      documentId: '',
      extractedData: {} as ParsedDocument,
      validationErrors: [],
      processingTime: 0
    };

    try {
      console.log(`Agente 2 iniciando processamento: ${filePath}`);

      // 1. Fazer parsing do documento
      const parsedDocument = await this.documentParser.parseDocument(filePath);
      result.documentId = parsedDocument.id;
      result.extractedData = parsedDocument;      // 2. Extrair e validar dados da empresa
      const companyData = parsedDocument.companyData;
      if (companyData.cnpj) {
        // Verificar se empresa já existe
        let empresa = await EmpresaService.findByCnpj(companyData.cnpj);
        
        if (!empresa) {
          // Cadastrar empresa automaticamente
          console.log(`Empresa não encontrada, cadastrando automaticamente: ${companyData.cnpj}`);
            empresa = await EmpresaService.createEmpresa({
            cnpj: companyData.cnpj,
            razaoSocial: companyData.razaoSocial || 'Empresa não identificada',
            nomeFantasia: companyData.nomeFantasia,
            ie: companyData.ie,
            im: companyData.im,
            cnae: companyData.cnae,            endereco: companyData.endereco ? JSON.stringify(companyData.endereco) : undefined,
            regimeTributario: companyData.regimeTributario,
          });
          
          if (empresa) {
            result.autoRegisteredCompany = true;
            console.log(`Empresa cadastrada automaticamente: ${empresa.id}`);
          }
        }
        
        if (empresa) {
          result.companyId = empresa.id;
        }
      }

      // 3. Processar dados fiscais
      if (parsedDocument.fiscalData) {
        await this.processFiscalData(parsedDocument, result.companyId);
      }

      // 4. Validar dados extraídos
      const validationErrors = this.validateExtractedData(parsedDocument);
      result.validationErrors = validationErrors;

      // 5. Indexar documento no banco
      await this.indexDocument(parsedDocument, result.companyId);

      // 6. Cache dos resultados
      await this.cacheService.set(
        `document:${result.documentId}`,
        parsedDocument,
        3600 // 1 hora
      );

      result.success = validationErrors.length === 0;
      result.processingTime = Date.now() - startTime;

      console.log(`Agente 2 concluído com sucesso: ${filePath}`, {
        documentId: result.documentId,
        companyId: result.companyId,
        autoRegistered: result.autoRegisteredCompany,
        validationErrors: result.validationErrors.length,
        processingTime: result.processingTime
      });

      return result;    } catch (error) {
      result.processingTime = Date.now() - startTime;
      result.validationErrors.push(`Erro no processamento: ${(error as Error).message || 'Erro desconhecido'}`);
      
      console.error(`Erro no Agente 2: ${filePath}`, { error, result });
      return result;
    }
  }

  /**
   * Processa um lote de documentos em paralelo
   */
  async processBatch(filePaths: string[]): Promise<ParsingBatchResult> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();

    console.log(`Agente 2 iniciando processamento em lote: ${filePaths.length} arquivos`);

    const batchResult: ParsingBatchResult = {
      batchId,
      totalFiles: filePaths.length,
      processedFiles: 0,
      successCount: 0,
      errorCount: 0,
      results: [],
      summary: {
        companiesFound: 0,
        companiesRegistered: 0,
        totalFaturamento: 0,
        totalImpostos: 0,
        validationErrors: 0
      }
    };

    try {      // Processar documentos em paralelo com limite de concorrência
      const results: any[] = await Promise.all(
        filePaths.map((filePath: string) => this.processDocument(filePath))
      );

      batchResult.results = results;
      batchResult.processedFiles = results.length;

      // Calcular estatísticas
      const companiesFound = new Set<string>();
      const companiesRegistered = new Set<string>();

      results.forEach((result: any) => {
        if (result.success) {
          batchResult.successCount++;
        } else {
          batchResult.errorCount++;
        }

        if (result.companyId) {
          companiesFound.add(result.companyId);
          if (result.autoRegisteredCompany) {
            companiesRegistered.add(result.companyId);
          }
        }

        if (result.extractedData.fiscalData) {
          batchResult.summary.totalFaturamento += result.extractedData.fiscalData.totalFaturamento || 0;
          batchResult.summary.totalImpostos += result.extractedData.fiscalData.impostos.reduce(
            (sum: number, imposto: any) => sum + imposto.valor, 0
          );
        }

        batchResult.summary.validationErrors += result.validationErrors.length;
      });

      batchResult.summary.companiesFound = companiesFound.size;
      batchResult.summary.companiesRegistered = companiesRegistered.size;

      // Cache do resultado do lote
      await this.cacheService.set(
        `batch:${batchId}`,
        batchResult,
        7200 // 2 horas
      );

      console.log(`Agente 2 lote concluído: ${batchId}`, {
        totalFiles: batchResult.totalFiles,
        successCount: batchResult.successCount,
        errorCount: batchResult.errorCount,
        companiesFound: batchResult.summary.companiesFound,
        companiesRegistered: batchResult.summary.companiesRegistered,
        processingTime: Date.now() - startTime
      });

      return batchResult;

    } catch (error) {
      console.error(`Erro no processamento em lote: ${batchId}`, { error });
      throw error;
    }
  }

  /**
   * Extrai dados cadastrais de todos os documentos de uma empresa
   */
  async extractCompanyDataFromDocuments(companyId: string): Promise<CompanyData> {
    console.log(`Extraindo dados cadastrais da empresa: ${companyId}`);

    try {
      // Buscar todos os documentos da empresa
      const documents = await DocumentProcessor.getDocumentsByCompany(companyId);
      
      if (documents.length === 0) {
        throw new Error(`Nenhum documento encontrado para a empresa: ${companyId}`);
      }

      // Consolidar dados de todos os documentos
      const consolidatedData: CompanyData = {};
      const dataSources: string[] = [];      for (const doc of documents) {
        if (doc.companyData) {
          // Mesclar dados, priorizando dados não vazios
          Object.keys(doc.companyData).forEach(key => {
            const value = (doc.companyData as any)[key];
            if (value && !(consolidatedData as any)[key]) {
              (consolidatedData as any)[key] = value;
              dataSources.push(`${key}: ${doc.fileName}`);
            }
          });
        }
      }

      console.log(`Dados cadastrais consolidados para empresa: ${companyId}`, {
        dataSources,
        consolidatedFields: Object.keys(consolidatedData)
      });

      return consolidatedData;

    } catch (error) {
      console.error(`Erro ao extrair dados cadastrais: ${companyId}`, { error });
      throw error;
    }
  }

  /**
   * Valida e corrige dados extraídos automaticamente
   */
  async validateAndCorrectData(documentId: string): Promise<DocumentParsingResult> {
    console.log(`Validando e corrigindo dados: ${documentId}`);    try {
      // Buscar documento do cache ou reprocessar
      let parsedDocument = await this.cacheService.get(`document:${documentId}`) as ParsedDocument;
      
      if (!parsedDocument) {
        throw new Error(`Documento não encontrado: ${documentId}`);
      }

      // Aplicar correções automáticas
      const correctedDocument = await this.applyAutoCorrections(parsedDocument);

      // Revalidar dados corrigidos
      const validationErrors = this.validateExtractedData(correctedDocument);

      const result: DocumentParsingResult = {
        success: validationErrors.length === 0,
        documentId,
        extractedData: correctedDocument,
        validationErrors,
        processingTime: 0
      };

      // Atualizar cache
      await this.cacheService.set(`document:${documentId}`, correctedDocument, 3600);

      console.log(`Validação e correção concluída: ${documentId}`, {
        validationErrors: result.validationErrors.length,
        correctionsApplied: true
      });

      return result;

    } catch (error) {
      console.error(`Erro na validacao e correção: ${documentId}`, { error });
      throw error;
    }
  }

  /**
   * Gera relatório de extração de dados
   */
  async generateExtractionReport(companyId?: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    console.log(`Gerando relatório de extração`, { companyId, dateRange });

    try {
      const documents = companyId        ? await DocumentProcessor.getDocumentsByCompany(companyId)
        : await DocumentProcessor.getAllDocuments();

      const report = {
        totalDocuments: documents.length,
        companiesProcessed: new Set(documents.map(d => d.companyData?.cnpj)).size,
        documentTypes: this.countDocumentTypes(documents),
        validationSummary: this.generateValidationSummary(documents),
        fiscalDataSummary: this.generateFiscalDataSummary(documents),
        processingStats: this.generateProcessingStats(documents),
        dateRange: dateRange,
        generatedAt: new Date()
      };

      console.log(`Relatório de extração gerado`, {
        totalDocuments: report.totalDocuments,
        companiesProcessed: report.companiesProcessed
      });

      return report;

    } catch (error) {
      console.error(`Erro ao gerar relatório de extração`, { error });
      throw error;
    }
  }

  // Métodos privados auxiliares

  private async processFiscalData(parsedDocument: ParsedDocument, companyId?: string): Promise<void> {
    if (!parsedDocument.fiscalData || !companyId) return;

    // Processar dados fiscais através do DocumentProcessor
    await DocumentProcessor.processFiscalData(parsedDocument.fiscalData, companyId);
  }

  private validateExtractedData(parsedDocument: ParsedDocument): string[] {
    const errors: string[] = [];

    // Validar dados obrigatórios
    if (!parsedDocument.companyData.cnpj) {
      errors.push('CNPJ não encontrado no documento');
    }

    if (!parsedDocument.companyData.razaoSocial) {
      errors.push('Razão social não encontrada no documento');
    }

    // Validar dados fiscais
    if (parsedDocument.fiscalData) {
      if (parsedDocument.fiscalData.operacoes.length === 0) {
        errors.push('Nenhuma operação fiscal encontrada');
      }

      // Validar CFOPs
      parsedDocument.fiscalData.operacoes.forEach((op, index) => {
        if (!op.cfop || op.cfop.length !== 4) {
          errors.push(`CFOP inválido na operação ${index + 1}: ${op.cfop}`);
        }
      });
    }

    return errors;
  }

  private async indexDocument(parsedDocument: ParsedDocument, companyId?: string): Promise<void> {
    // Indexar documento no banco de dados
    if (companyId) {
      await DocumentProcessor.indexDocument(parsedDocument, companyId);
    }
  }

  private async applyAutoCorrections(parsedDocument: ParsedDocument): Promise<ParsedDocument> {
    const corrected = { ...parsedDocument };

    // Corrigir CNPJ (remover caracteres especiais)
    if (corrected.companyData.cnpj) {
      corrected.companyData.cnpj = corrected.companyData.cnpj.replace(/[^\d]/g, '');
    }

    // Corrigir IE (remover caracteres especiais)
    if (corrected.companyData.ie) {
      corrected.companyData.ie = corrected.companyData.ie.replace(/[^\d]/g, '');
    }

    // Corrigir CFOPs (garantir 4 dígitos)
    if (corrected.fiscalData) {
      corrected.fiscalData.operacoes = corrected.fiscalData.operacoes.map(op => ({
        ...op,
        cfop: op.cfop.padStart(4, '0')
      }));
    }

    return corrected;
  }

  private countDocumentTypes(documents: any[]): Record<string, number> {
    const types: Record<string, number> = {};
    documents.forEach(doc => {
      const type = doc.fileType || 'unknown';
      types[type] = (types[type] || 0) + 1;
    });
    return types;
  }

  private generateValidationSummary(documents: any[]): any {
    const totalErrors = documents.reduce((sum, doc) => 
      sum + (doc.validationResults?.filter((v: any) => !v.isValid).length || 0), 0
    );
    
    const totalWarnings = documents.reduce((sum, doc) => 
      sum + (doc.validationResults?.filter((v: any) => v.severity === 'warning').length || 0), 0
    );

    return {
      totalErrors,
      totalWarnings,
      documentsWithErrors: documents.filter(doc => 
        doc.validationResults?.some((v: any) => !v.isValid)
      ).length
    };
  }

  private generateFiscalDataSummary(documents: any[]): any {
    const totalFaturamento = documents.reduce((sum, doc) => 
      sum + (doc.fiscalData?.totalFaturamento || 0), 0
    );

    const totalImpostos = documents.reduce((sum, doc) => 
      sum + (doc.fiscalData?.impostos?.reduce((impSum: number, imp: any) => impSum + imp.valor, 0) || 0), 0
    );

    return {
      totalFaturamento,
      totalImpostos,
      totalOperacoes: documents.reduce((sum, doc) => 
        sum + (doc.fiscalData?.operacoes?.length || 0), 0
      ),
      totalProdutos: documents.reduce((sum, doc) => 
        sum + (doc.fiscalData?.produtos?.length || 0), 0
      )
    };
  }

  private generateProcessingStats(documents: any[]): any {
    const processingTimes = documents.map(doc => doc.metadata?.processingTime || 0);
    const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;

    return {
      totalProcessingTime: processingTimes.reduce((sum, time) => sum + time, 0),
      averageProcessingTime: avgProcessingTime,
      fastestProcessing: Math.min(...processingTimes),
      slowestProcessing: Math.max(...processingTimes)
    };
  }
}

export default DocumentParsingAgent;