/// <reference types="jest" />
import { DocumentParsingAgent } from '../../src/services/agents/document-parsing-agent';
import { EmpresaService } from '../../src/services/empresa-service';
import { DocumentProcessor } from '../../src/services/document-processor';
import { CacheService } from '../../src/services/cache';
import { BatchProcessor } from '../../src/services/batch-processor';
import { ParsedDocument, CompanyData } from '../../src/services/parsers/document-parser';
import { MockFactory } from '../mocks/MockFactory';

// Mock dos serviços
jest.mock('../../src/services/empresa-service');
jest.mock('../../src/services/document-processor');
jest.mock('../../src/services/cache');
jest.mock('../../src/services/batch-processor', () => ({
  BatchProcessor: jest.fn().mockImplementation(() => ({
    processBatch: jest.fn(),
    addJob: jest.fn(),
    getJobStatus: jest.fn(),
    cancelJob: jest.fn(),
    getStats: jest.fn(),
  })),
}));

describe('DocumentParsingAgent', () => {
  let agent: DocumentParsingAgent;
  let mockEmpresaService: any;
  let mockDocumentProcessor: any;
  let mockCacheService: any;
  let mockBatchProcessor: any;

  beforeEach(() => {
    // Limpar todos os mocks
    jest.clearAllMocks();    // Criar mocks usando MockFactory
    mockEmpresaService = MockFactory.createEmpresaServiceMock();
    mockDocumentProcessor = MockFactory.createDocumentProcessorMock();
    mockCacheService = MockFactory.createCacheServiceMock();
    mockBatchProcessor = MockFactory.createBatchProcessorMock();

    // Mock das implementações
    (EmpresaService as any).mockImplementation(() => mockEmpresaService);
    (DocumentProcessor as any).mockImplementation(() => mockDocumentProcessor);
    (CacheService as any).mockImplementation(() => mockCacheService);
    (BatchProcessor as any).mockImplementation(() => mockBatchProcessor);

    // Mock dos métodos estáticos do DocumentProcessor
    (DocumentProcessor as any).getDocumentsByCompany = mockDocumentProcessor.getDocumentsByCompany;
    (DocumentProcessor as any).getAllDocuments = mockDocumentProcessor.getAllDocuments;

    agent = DocumentParsingAgent.getInstance();
  });

  describe('processDocument', () => {
    it('deve processar um documento SPED Fiscal com sucesso', async () => {
      // Arrange
      const filePath = '/path/to/sped-fiscal.txt';
      const mockParsedDocument: ParsedDocument = {
        id: 'doc_123',
        fileName: 'sped-fiscal.txt',
        fileType: '.txt',
        companyData: {
          cnpj: '12345678000195',
          razaoSocial: 'Empresa Teste LTDA',
          ie: '123456789',
          regimeTributario: '1'
        },
        fiscalData: {
          produtos: [],
          operacoes: [
            {
              tipo: 'saida',
              cfop: '5102',
              cst: '00',
              valorOperacao: 1000,
              baseCalculo: 1000,
              aliquota: 18,
              valorImposto: 180,
              data: new Date()
            }
          ],
          impostos: [
            {
              tipo: 'ICMS',
              baseCalculo: 1000,
              aliquota: 18,
              valor: 180,
              periodo: new Date()
            }
          ]
        },
        validationResults: [],
        metadata: {
          fileSize: 1024,
          checksum: 'abc123',
          processingTime: 100,
          parserVersion: '1.0.0'
        },
        extractedAt: new Date()
      };

      const mockEmpresa = {
        id: 'emp_123',
        cnpj: '12345678000195',
        razaoSocial: 'Empresa Teste LTDA',
        status: 'ativo'
      };

      // Mock das respostas
      mockEmpresaService.findByCnpj.mockResolvedValue(mockEmpresa);
      mockDocumentProcessor.processFiscalData.mockResolvedValue();
      mockDocumentProcessor.indexDocument.mockResolvedValue();
      mockCacheService.set.mockResolvedValue(true);

      // Mock do parser interno usando uma propriedade mockável
      const mockDocumentParser = MockFactory.createDocumentParsingAgentMock();
      mockDocumentParser.documentParser.parseDocument.mockResolvedValue(mockParsedDocument);
      
      // Sobrescrever a propriedade documentParser do agent
      (agent as any).documentParser = mockDocumentParser.documentParser;
      (agent as any).empresaService = mockEmpresaService;
      (agent as any).documentProcessor = mockDocumentProcessor;
      (agent as any).cacheService = mockCacheService;

      // Simulate some processing time to ensure processingTime > 0
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return 1000 + callCount; // Each call increments time
      });

      // Act
      const result = await agent.processDocument(filePath);

      // Restore Date.now
      Date.now = originalDateNow;

      // Assert
      expect(result.success).toBe(true);
      expect(result.documentId).toBe('doc_123');
      expect(result.companyId).toBe('emp_123');
      expect(result.autoRegisteredCompany).toBeUndefined();
      expect(result.validationErrors).toHaveLength(0);
      expect(result.processingTime).toBeGreaterThan(0);

      expect(mockEmpresaService.findByCnpj).toHaveBeenCalledWith('12345678000195');
      expect(mockDocumentProcessor.processFiscalData).toHaveBeenCalledWith(mockParsedDocument.fiscalData, 'emp_123');
      expect(mockDocumentProcessor.indexDocument).toHaveBeenCalledWith(mockParsedDocument, 'emp_123');
      expect(mockCacheService.set).toHaveBeenCalledWith('document:doc_123', mockParsedDocument, 3600);
    });

    it('deve cadastrar empresa automaticamente se não existir', async () => {
      // Arrange
      const filePath = '/path/to/new-company.txt';
      const mockParsedDocument: ParsedDocument = {
        id: 'doc_456',
        fileName: 'new-company.txt',
        fileType: '.txt',
        companyData: {
          cnpj: '98765432000198',
          razaoSocial: 'Nova Empresa LTDA',
          ie: '987654321'
        },
        fiscalData: { 
          produtos: [], 
          operacoes: [
            {
              tipo: 'saida',
              cfop: '5102',
              cst: '00',
              valorOperacao: 1000,
              baseCalculo: 1000,
              aliquota: 18,
              valorImposto: 180,
              data: new Date()
            }
          ], 
          impostos: [] 
        },
        validationResults: [],
        metadata: {
          fileSize: 1024,
          checksum: 'def456',
          processingTime: 100,
          parserVersion: '1.0.0'
        },
        extractedAt: new Date()
      };

      const mockNewEmpresa = {
        id: 'emp_456',
        cnpj: '98765432000198',
        razaoSocial: 'Nova Empresa LTDA',
        status: 'ativo'
      };

      // Mock das respostas
      mockEmpresaService.findByCnpj.mockResolvedValue(null);
      mockEmpresaService.createEmpresa.mockResolvedValue(mockNewEmpresa);
      mockDocumentProcessor.processFiscalData.mockResolvedValue();
      mockDocumentProcessor.indexDocument.mockResolvedValue();
      mockCacheService.set.mockResolvedValue(true);

      // Mock do parser interno
      const mockDocumentParser = MockFactory.createDocumentParsingAgentMock();
      mockDocumentParser.documentParser.parseDocument.mockResolvedValue(mockParsedDocument);
      
      // Sobrescrever a propriedade documentParser do agent
      (agent as any).documentParser = mockDocumentParser.documentParser;
      (agent as any).empresaService = mockEmpresaService;
      (agent as any).documentProcessor = mockDocumentProcessor;
      (agent as any).cacheService = mockCacheService;

      // Act
      const result = await agent.processDocument(filePath);

      // Assert
      expect(result.success).toBe(true);
      expect(result.autoRegisteredCompany).toBe(true);
      expect(result.companyId).toBe('emp_456');

      expect(mockEmpresaService.createEmpresa).toHaveBeenCalledWith({
        cnpj: '98765432000198',
        razaoSocial: 'Nova Empresa LTDA',
        nomeFantasia: undefined,
        ie: '987654321',
        im: undefined,
        cnae: undefined,
        endereco: undefined,
        regimeTributario: undefined,
        dataInicioAtividade: undefined,
        dataFimAtividade: undefined,
        status: 'ativo'
      });
    });

    it('deve retornar erro se o documento não puder ser processado', async () => {
      // Arrange
      const filePath = '/path/to/invalid-file.xyz';
      const error = new Error('Tipo de arquivo não suportado');      // Mock do parser interno para lançar erro
      const mockDocumentParser = MockFactory.createDocumentParsingAgentMock();
      mockDocumentParser.documentParser.parseDocument.mockRejectedValue(error);
      
      // Sobrescrever a propriedade documentParser do agent
      (agent as any).documentParser = mockDocumentParser.documentParser;

      // Simulate some processing time
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return 1000 + callCount; // Each call increments time
      });

      // Act
      const result = await agent.processDocument(filePath);

      // Restore Date.now
      Date.now = originalDateNow;

      // Assert
      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Erro no processamento: Tipo de arquivo não suportado');
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('processBatch', () => {
    it('deve processar múltiplos documentos em lote', async () => {
      // Arrange
      const filePaths = [
        '/path/to/doc1.txt',
        '/path/to/doc2.txt',
        '/path/to/doc3.txt'
      ];      const mockResults = [
        { 
          success: true, 
          documentId: 'doc_1', 
          companyId: 'emp_1', 
          validationErrors: [],
          extractedData: {
            fiscalData: {
              totalFaturamento: 5000,
              impostos: [{ tipo: 'ICMS', valor: 900, aliquota: 18 }]
            }
          }
        },
        { 
          success: true, 
          documentId: 'doc_2', 
          companyId: 'emp_2', 
          validationErrors: [],
          extractedData: {
            fiscalData: {
              totalFaturamento: 7000,
              impostos: [{ tipo: 'ICMS', valor: 1260, aliquota: 18 }]
            }
          }
        },
        { 
          success: false, 
          documentId: 'doc_3', 
          validationErrors: ['Erro no documento 3'],
          extractedData: {}
        }
      ];

      mockBatchProcessor.processBatch.mockResolvedValue(mockResults);

      // Act
      const result = await agent.processBatch(filePaths);

      // Assert
      expect(result.batchId).toMatch(/^batch_\d+_[a-z0-9]+$/);
      expect(result.totalFiles).toBe(3);
      expect(result.processedFiles).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.results).toEqual(mockResults);

      expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith(
        filePaths,
        expect.any(Function),
        5
      );
    });
  });

  describe('extractCompanyDataFromDocuments', () => {
    it('deve extrair dados cadastrais consolidados de documentos', async () => {
      // Arrange
      const companyId = 'emp_123';
      const mockDocuments = [
        {
          companyData: {
            cnpj: '12345678000195',
            razaoSocial: 'Empresa Teste LTDA',
            ie: '123456789'
          }
        },
        {
          companyData: {
            cnpj: '12345678000195',
            nomeFantasia: 'Empresa Teste',
            cnae: '1234567'
          }
        }
      ];

      const expectedConsolidatedData: CompanyData = {
        cnpj: '12345678000195',
        razaoSocial: 'Empresa Teste LTDA',
        nomeFantasia: 'Empresa Teste',
        ie: '123456789',
        cnae: '1234567'
      };

      mockDocumentProcessor.getDocumentsByCompany.mockResolvedValue(mockDocuments);

      // Act
      const result = await agent.extractCompanyDataFromDocuments(companyId);

      // Assert
      expect(result).toEqual(expectedConsolidatedData);
      expect(mockDocumentProcessor.getDocumentsByCompany).toHaveBeenCalledWith(companyId);
    });

    it('deve lançar erro se nenhum documento for encontrado', async () => {
      // Arrange
      const companyId = 'emp_999';
      mockDocumentProcessor.getDocumentsByCompany.mockResolvedValue([]);

      // Act & Assert
      await expect(agent.extractCompanyDataFromDocuments(companyId))
        .rejects
        .toThrow('Nenhum documento encontrado para a empresa: emp_999');
    });
  });

  describe('validateAndCorrectData', () => {
    it('deve validar e corrigir dados de um documento', async () => {
      // Arrange
      const documentId = 'doc_123';
      const mockParsedDocument: ParsedDocument = {
        id: 'doc_123',
        fileName: 'test.txt',
        fileType: '.txt',        companyData: {
          cnpj: '12.345.678/0001-95', // CNPJ com formatação
          razaoSocial: 'Empresa Teste LTDA', // Required field
          ie: '123.456.789' // IE com formatação
        },fiscalData: {
          produtos: [],
          operacoes: [
            {
              tipo: 'saida',
              cfop: '123', // CFOP com menos dígitos que será corrigido
              cst: '00',
              valorOperacao: 1000,
              baseCalculo: 1000,
              aliquota: 18,
              valorImposto: 180,
              data: new Date()
            }
          ],
          impostos: []
        },
        validationResults: [],
        metadata: {
          fileSize: 1024,
          checksum: 'abc123',
          processingTime: 100,
          parserVersion: '1.0.0'
        },
        extractedAt: new Date()
      };

      mockCacheService.get.mockResolvedValue(mockParsedDocument);
      mockCacheService.set.mockResolvedValue();

      // Act
      const result = await agent.validateAndCorrectData(documentId);      // Assert
      expect(result.success).toBe(true); // Deve passar após correções
      expect(result.documentId).toBe(documentId);
      expect(result.validationErrors).toHaveLength(0); // Sem erros após correção

      // Verificar se as correções foram aplicadas
      expect(result.extractedData.companyData.cnpj).toBe('12345678000195'); // Sem formatação
      expect(result.extractedData.companyData.ie).toBe('123456789'); // Sem formatação
      expect(result.extractedData.fiscalData.operacoes[0].cfop).toBe('0123'); // Com padding

      expect(mockCacheService.get).toHaveBeenCalledWith('document:doc_123');
      expect(mockCacheService.set).toHaveBeenCalledWith('document:doc_123', result.extractedData, 3600);
    });
  });
  describe('generateExtractionReport', () => {
    it('deve gerar relatório de extração de dados', async () => {
      // Arrange
      const mockDocuments = [
        {
          fileType: '.txt',
          companyData: { cnpj: '12345678000195' },
          validationResults: [{ isValid: true }],
          fiscalData: {
            totalFaturamento: 1000,
            impostos: [{ valor: 180 }],
            operacoes: [{ cfop: '5102' }],
            produtos: [{ codigo: 'PROD1' }]
          },
          metadata: { processingTime: 100 }
        },
        {
          fileType: '.xlsx',
          companyData: { cnpj: '12345678000195' }, // Same company
          validationResults: [{ isValid: false }],
          fiscalData: {
            totalFaturamento: 2000,
            impostos: [{ valor: 360 }],
            operacoes: [{ cfop: '5102' }],
            produtos: [{ codigo: 'PROD2' }]
          },
          metadata: { processingTime: 150 }
        }
      ];

      mockDocumentProcessor.getAllDocuments.mockResolvedValue(mockDocuments);

      // Act
      const result = await agent.generateExtractionReport();

      // Assert
      expect(result.totalDocuments).toBe(2);
      expect(result.companiesProcessed).toBe(1); // Uma empresa única (mesmo CNPJ)
      expect(result.documentTypes).toEqual({
        '.txt': 1,
        '.xlsx': 1
      });
      expect(result.fiscalDataSummary.totalFaturamento).toBe(3000);
      expect(result.fiscalDataSummary.totalImpostos).toBe(540);
      expect(result.fiscalDataSummary.totalOperacoes).toBe(2);
      expect(result.fiscalDataSummary.totalProdutos).toBe(2);
      expect(result.processingStats.totalProcessingTime).toBe(250);
      expect(result.processingStats.averageProcessingTime).toBe(125);
    });
  });
}); 