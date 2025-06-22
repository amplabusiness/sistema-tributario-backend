"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockFactory = void 0;
class MockFactory {
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
    static createMockRequest(overrides = {}) {
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
    static createMockResponse() {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.setHeader = jest.fn().mockReturnValue(res);
        res.end = jest.fn().mockReturnValue(res);
        return res;
    }
    static createMockNext() {
        return jest.fn();
    }
    static createMockEmpresa(overrides = {}) {
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
    static createMockUser(overrides = {}) {
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
    static createMockDocument(overrides = {}) {
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
    static createMockICMSApuracao(overrides = {}) {
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
    static resetAllMocks() {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    }
}
exports.MockFactory = MockFactory;
exports.default = MockFactory;
//# sourceMappingURL=MockFactory.js.map