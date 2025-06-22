/// <reference types="jest" />

/**
 * MOCK FACTORY SYSTEM
 * 
 * Sistema centralizado para criação de mocks tipados e consistentes
 * Resolve problemas de mocks undefined e inconsistência entre testes
 */

export class MockFactory {
  /**
   * Mock do EmpresaService com todos os métodos esperados
   */
  static createEmpresaServiceMock() {
    return {
      findByCnpj: jest.fn(),
      createEmpresa: jest.fn(),
      updateEmpresa: jest.fn(),
      listEmpresas: jest.fn(),
      getEmpresaStats: jest.fn(),
      createOrUpdateEmpresa: jest.fn(),
      getEmpresaByCnpj: jest.fn(),
    };
  }

  /**
   * Mock do DocumentProcessor com todos os métodos esperados
   */
  static createDocumentProcessorMock() {
    return {
      processFiscalData: jest.fn(),
      indexDocument: jest.fn(),
      getDocumentsByCompany: jest.fn(),
      getAllDocuments: jest.fn(),
      processDocument: jest.fn(),
      validateDocument: jest.fn(),
    };
  }

  /**
   * Mock do CacheService com todos os métodos esperados
   */
  static createCacheServiceMock() {
    return {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      exists: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
  }

  /**
   * Mock do DocumentParsingAgent com todos os métodos esperados
   */
  static createDocumentParsingAgentMock() {
    return {
      processDocument: jest.fn(),
      processBatch: jest.fn(),
      extractCompanyDataFromDocuments: jest.fn(),
      validateAndCorrectData: jest.fn(),
      generateExtractionReport: jest.fn(),
      documentParser: {
        parseDocument: jest.fn(),
      },
    };
  }

  /**
   * Mock do ICMSApuradorAgent com todos os métodos esperados
   */
  static createICMSApuradorAgentMock() {
    return {
      executarApuracaoAutomatica: jest.fn(),
      extrairRegraAutomaticamente: jest.fn(),
      aplicarRegrasICMS: jest.fn(),
      calcularTotaisAutomatico: jest.fn(),
      calcularConfianca: jest.fn(),
      validarEstruturaRegras: jest.fn(),
    };
  }

  /**
   * Mock do BullMQ Queue com todos os métodos esperados
   */
  static createQueueMock() {
    return {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn(),
      getJobCounts: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn(),
      close: jest.fn(),
    };
  }

  /**
   * Cria mock do BatchProcessor
   */
  static createBatchProcessorMock() {
    return {
      processBatch: jest.fn().mockResolvedValue({
        success: true,
        processedCount: 5,
        results: [
          { success: true, data: { id: 'doc1' } },
          { success: true, data: { id: 'doc2' } },
        ],
      }),
      addJob: jest.fn().mockResolvedValue({ id: 'job_123' }),
      getJobStatus: jest.fn().mockResolvedValue({ status: 'completed' }),
      cancelJob: jest.fn().mockResolvedValue(true),
      getStats: jest.fn().mockResolvedValue({
        pending: 0,
        active: 0,
        completed: 10,
        failed: 0,
      }),
    };
  }

  /**
   * Mock de Request tipado para Express
   */
  static createMockRequest(overrides: any = {}): any {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: { id: '1', email: 'test@test.com', role: 'USER' },
      file: null,
      files: [],
      ...overrides,
    };
  }

  /**
   * Mock de Response tipado para Express
   */
  static createMockResponse(): any {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  }

  /**
   * Mock de Next function para Express middleware
   */
  static createMockNext(): any {
    return jest.fn();
  }

  /**
   * Dados de mock para empresa
   */
  static createMockEmpresa(overrides: any = {}) {
    return {
      id: "1",
      nome: 'Empresa Teste',
      cnpj: '12345678000199',
      ativo: true,
      razaoSocial: 'Empresa Teste LTDA',
      regimeTributario: 'SIMPLES',
      nomeFantasia: 'Empresa Teste',
      dataCadastro: new Date('2024-01-01T00:00:00Z'),
      documentos: [{ id: "1", createdAt: new Date('2024-04-01T00:00:00Z') }],
      _count: { documentos: 10 },
      ...overrides,
    };
  }

  /**
   * Dados de mock para usuário
   */
  static createMockUser(overrides: any = {}) {
    return {
      id: "1",
      email: 'admin@test.com',
      password: 'hashedPassword',
      name: 'Admin',
      company: 'Test Company',
      role: 'ADMIN',
      isActive: true,
      empresaId: "1",
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Dados de mock para documento
   */
  static createMockDocument(overrides: any = {}) {
    return {
      id: "1",
      fileName: 'test-document.xml',
      fileType: 'NFE',
      status: 'processed',
      empresaId: "1",
      createdAt: new Date('2024-04-01T00:00:00Z'),
      processedAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Resultado de mock para apuração ICMS
   */
  static createMockICMSApuracao(overrides: any = {}) {
    return {
      cnpj: '12345678000199',
      periodo: '04/2025',
      status: 'concluida',
      itens: [
        {
          id: 1,
          ncm: '12345678',
          cfop: '5101',
          baseCalculo: 1000.00,
          valorIcms: 180.00,
          produto: 'Produto Teste'
        }
      ],
      confianca: 0.95,
      regrasAplicadas: ['Base reduzida 50%'],
      totais: {
        valorTotalOperacoes: 15000.00,
        valorIcmsTotal: 420.00,
        baseCalculoTotal: 15000.00
      },
      observacoes: [],
      ...overrides,
    };
  }

  /**
   * Reset de todos os mocks
   */
  static resetAllMocks() {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  }
}

export default MockFactory;
