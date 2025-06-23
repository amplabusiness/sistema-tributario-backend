"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const document_parsing_agent_1 = require("../../src/services/agents/document-parsing-agent");
const empresa_service_1 = require("../../src/services/empresa-service");
const document_processor_1 = require("../../src/services/document-processor");
const cache_1 = require("../../src/services/cache");
const batch_processor_1 = require("../../src/services/batch-processor");
const MockFactory_1 = require("../mocks/MockFactory");
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
    let agent;
    let mockEmpresaService;
    let mockDocumentProcessor;
    let mockCacheService;
    let mockBatchProcessor;
    beforeEach(() => {
        jest.clearAllMocks();
        mockEmpresaService = MockFactory_1.MockFactory.createEmpresaServiceMock();
        mockDocumentProcessor = MockFactory_1.MockFactory.createDocumentProcessorMock();
        mockCacheService = MockFactory_1.MockFactory.createCacheServiceMock();
        mockBatchProcessor = MockFactory_1.MockFactory.createBatchProcessorMock();
        empresa_service_1.EmpresaService.mockImplementation(() => mockEmpresaService);
        document_processor_1.DocumentProcessor.mockImplementation(() => mockDocumentProcessor);
        cache_1.CacheService.mockImplementation(() => mockCacheService);
        batch_processor_1.BatchProcessor.mockImplementation(() => mockBatchProcessor);
        document_processor_1.DocumentProcessor.getDocumentsByCompany = mockDocumentProcessor.getDocumentsByCompany;
        document_processor_1.DocumentProcessor.getAllDocuments = mockDocumentProcessor.getAllDocuments;
        agent = document_parsing_agent_1.DocumentParsingAgent.getInstance();
    });
    describe('processDocument', () => {
        it('deve processar um documento SPED Fiscal com sucesso', async () => {
            const filePath = '/path/to/sped-fiscal.txt';
            const mockParsedDocument = {
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
            mockEmpresaService.findByCnpj.mockResolvedValue(mockEmpresa);
            mockDocumentProcessor.processFiscalData.mockResolvedValue();
            mockDocumentProcessor.indexDocument.mockResolvedValue();
            mockCacheService.set.mockResolvedValue(true);
            const mockDocumentParser = MockFactory_1.MockFactory.createDocumentParsingAgentMock();
            mockDocumentParser.documentParser.parseDocument.mockResolvedValue(mockParsedDocument);
            agent.documentParser = mockDocumentParser.documentParser;
            agent.empresaService = mockEmpresaService;
            agent.documentProcessor = mockDocumentProcessor;
            agent.cacheService = mockCacheService;
            const originalDateNow = Date.now;
            let callCount = 0;
            Date.now = jest.fn(() => {
                callCount++;
                return 1000 + callCount;
            });
            const result = await agent.processDocument(filePath);
            Date.now = originalDateNow;
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
            const filePath = '/path/to/new-company.txt';
            const mockParsedDocument = {
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
            mockEmpresaService.findByCnpj.mockResolvedValue(null);
            mockEmpresaService.createEmpresa.mockResolvedValue(mockNewEmpresa);
            mockDocumentProcessor.processFiscalData.mockResolvedValue();
            mockDocumentProcessor.indexDocument.mockResolvedValue();
            mockCacheService.set.mockResolvedValue(true);
            const mockDocumentParser = MockFactory_1.MockFactory.createDocumentParsingAgentMock();
            mockDocumentParser.documentParser.parseDocument.mockResolvedValue(mockParsedDocument);
            agent.documentParser = mockDocumentParser.documentParser;
            agent.empresaService = mockEmpresaService;
            agent.documentProcessor = mockDocumentProcessor;
            agent.cacheService = mockCacheService;
            const result = await agent.processDocument(filePath);
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
            const filePath = '/path/to/invalid-file.xyz';
            const error = new Error('Tipo de arquivo não suportado');
            const mockDocumentParser = MockFactory_1.MockFactory.createDocumentParsingAgentMock();
            mockDocumentParser.documentParser.parseDocument.mockRejectedValue(error);
            agent.documentParser = mockDocumentParser.documentParser;
            const originalDateNow = Date.now;
            let callCount = 0;
            Date.now = jest.fn(() => {
                callCount++;
                return 1000 + callCount;
            });
            const result = await agent.processDocument(filePath);
            Date.now = originalDateNow;
            expect(result.success).toBe(false);
            expect(result.validationErrors).toContain('Erro no processamento: Tipo de arquivo não suportado');
            expect(result.processingTime).toBeGreaterThan(0);
        });
    });
    describe('processBatch', () => {
        it('deve processar múltiplos documentos em lote', async () => {
            const filePaths = [
                '/path/to/doc1.txt',
                '/path/to/doc2.txt',
                '/path/to/doc3.txt'
            ];
            const mockResults = [
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
            const result = await agent.processBatch(filePaths);
            expect(result.batchId).toMatch(/^batch_\d+_[a-z0-9]+$/);
            expect(result.totalFiles).toBe(3);
            expect(result.processedFiles).toBe(3);
            expect(result.successCount).toBe(2);
            expect(result.errorCount).toBe(1);
            expect(result.results).toEqual(mockResults);
            expect(mockBatchProcessor.processBatch).toHaveBeenCalledWith(filePaths, expect.any(Function), 5);
        });
    });
    describe('extractCompanyDataFromDocuments', () => {
        it('deve extrair dados cadastrais consolidados de documentos', async () => {
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
            const expectedConsolidatedData = {
                cnpj: '12345678000195',
                razaoSocial: 'Empresa Teste LTDA',
                nomeFantasia: 'Empresa Teste',
                ie: '123456789',
                cnae: '1234567'
            };
            mockDocumentProcessor.getDocumentsByCompany.mockResolvedValue(mockDocuments);
            const result = await agent.extractCompanyDataFromDocuments(companyId);
            expect(result).toEqual(expectedConsolidatedData);
            expect(mockDocumentProcessor.getDocumentsByCompany).toHaveBeenCalledWith(companyId);
        });
        it('deve lançar erro se nenhum documento for encontrado', async () => {
            const companyId = 'emp_999';
            mockDocumentProcessor.getDocumentsByCompany.mockResolvedValue([]);
            await expect(agent.extractCompanyDataFromDocuments(companyId))
                .rejects
                .toThrow('Nenhum documento encontrado para a empresa: emp_999');
        });
    });
    describe('validateAndCorrectData', () => {
        it('deve validar e corrigir dados de um documento', async () => {
            const documentId = 'doc_123';
            const mockParsedDocument = {
                id: 'doc_123',
                fileName: 'test.txt',
                fileType: '.txt', companyData: {
                    cnpj: '12.345.678/0001-95',
                    razaoSocial: 'Empresa Teste LTDA',
                    ie: '123.456.789'
                }, fiscalData: {
                    produtos: [],
                    operacoes: [
                        {
                            tipo: 'saida',
                            cfop: '123',
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
            const result = await agent.validateAndCorrectData(documentId);
            expect(result.success).toBe(true);
            expect(result.documentId).toBe(documentId);
            expect(result.validationErrors).toHaveLength(0);
            expect(result.extractedData.companyData.cnpj).toBe('12345678000195');
            expect(result.extractedData.companyData.ie).toBe('123456789');
            expect(result.extractedData.fiscalData.operacoes[0].cfop).toBe('0123');
            expect(mockCacheService.get).toHaveBeenCalledWith('document:doc_123');
            expect(mockCacheService.set).toHaveBeenCalledWith('document:doc_123', result.extractedData, 3600);
        });
    });
    describe('generateExtractionReport', () => {
        it('deve gerar relatório de extração de dados', async () => {
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
                    companyData: { cnpj: '12345678000195' },
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
            const result = await agent.generateExtractionReport();
            expect(result.totalDocuments).toBe(2);
            expect(result.companiesProcessed).toBe(1);
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
//# sourceMappingURL=document-parsing-agent.test.js.map