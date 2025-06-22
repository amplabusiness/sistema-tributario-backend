export declare class MockFactory {
    static createEmpresaServiceMock(): {
        findByCnpj: any;
        createEmpresa: any;
        updateEmpresa: any;
        listEmpresas: any;
        getEmpresaStats: any;
        createOrUpdateEmpresa: any;
        getEmpresaByCnpj: any;
    };
    static createDocumentProcessorMock(): {
        processFiscalData: any;
        indexDocument: any;
        getDocumentsByCompany: any;
        getAllDocuments: any;
        processDocument: any;
        validateDocument: any;
    };
    static createCacheServiceMock(): {
        set: any;
        get: any;
        delete: any;
        clear: any;
        exists: any;
        connect: any;
        disconnect: any;
    };
    static createDocumentParsingAgentMock(): {
        processDocument: any;
        processBatch: any;
        extractCompanyDataFromDocuments: any;
        validateAndCorrectData: any;
        generateExtractionReport: any;
        documentParser: {
            parseDocument: any;
        };
    };
    static createICMSApuradorAgentMock(): {
        executarApuracaoAutomatica: any;
        extrairRegraAutomaticamente: any;
        aplicarRegrasICMS: any;
        calcularTotaisAutomatico: any;
        calcularConfianca: any;
        validarEstruturaRegras: any;
    };
    static createQueueMock(): {
        add: any;
        process: any;
        on: any;
        getJob: any;
        getJobCounts: any;
        pause: any;
        resume: any;
        clean: any;
        close: any;
    };
    static createBatchProcessorMock(): {
        processBatch: any;
        addJob: any;
        getJobStatus: any;
        cancelJob: any;
        getStats: any;
    };
    static createMockRequest(overrides?: any): any;
    static createMockResponse(): any;
    static createMockNext(): any;
    static createMockEmpresa(overrides?: any): any;
    static createMockUser(overrides?: any): any;
    static createMockDocument(overrides?: any): any;
    static createMockICMSApuracao(overrides?: any): any;
    static resetAllMocks(): void;
}
export default MockFactory;
//# sourceMappingURL=MockFactory.d.ts.map