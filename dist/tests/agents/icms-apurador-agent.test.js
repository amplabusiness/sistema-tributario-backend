"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const icms_apurador_agent_1 = require("../../src/services/agents/icms-apurador-agent");
const document_indexer_1 = require("../../src/services/document-indexer");
const cache_1 = require("../../src/services/cache");
const MockFactory_1 = require("../mocks/MockFactory");
jest.mock('../../src/services/document-indexer');
jest.mock('../../src/services/cache');
jest.mock('openai');
jest.mock('../../src/utils/logger');
const MockDocumentIndexer = document_indexer_1.DocumentIndexer;
const MockCacheService = cache_1.CacheService;
describe('ICMS Apurador Agent', () => {
    let agent;
    let mockIndexer;
    let mockCache;
    beforeEach(() => {
        jest.clearAllMocks();
        const { OpenAI } = require('openai');
        if (typeof OpenAI !== 'function' || !('mockImplementation' in OpenAI)) {
            global.OpenAI = jest.fn();
        }
        mockIndexer = {
            buscarDocumentos: jest.fn(),
            indexarDocumento: jest.fn(),
        };
        mockCache = MockFactory_1.MockFactory.createCacheServiceMock();
        MockDocumentIndexer.mockImplementation(() => mockIndexer);
        MockCacheService.mockImplementation(() => mockCache);
        agent = new icms_apurador_agent_1.ICMSApuradorAgent({
            openaiApiKey: 'test-key',
            cacheEnabled: true,
            autoExtractRules: true,
            confidenceThreshold: 70,
            maxRetries: 3,
            batchSize: 100,
        });
    });
    describe('Apuração ICMS Automática', () => {
        it('deve executar apuração ICMS completa automaticamente', async () => {
            const empresaId = 'empresa-123';
            const periodo = '12/2024';
            const documentosMock = [
                {
                    id: 'doc-1',
                    numeroDocumento: 'NFe-001',
                    dataEmissao: new Date('2024-12-01'),
                    tipo: 'NFe',
                    itens: [
                        {
                            descricao: 'Produto Teste',
                            ncm: '12345678',
                            cfop: '5102',
                            cst: '000',
                            valorTotal: 1000.00,
                            aliquotaIcms: 18,
                            valorIcms: 180.00,
                        },
                    ],
                },
            ];
            mockIndexer.buscarDocumentos.mockResolvedValue(documentosMock);
            mockCache.get.mockResolvedValue(null);
            mockCache.set.mockResolvedValue();
            const resultado = await agent.apurarICMSAutomatico(empresaId, periodo);
            expect(resultado).toBeDefined();
            expect(resultado.empresaId).toBe(empresaId);
            expect(resultado.periodo).toBe(periodo);
            expect(resultado.status).toBe('concluida');
            expect(resultado.itens.length).toBeGreaterThanOrEqual(0);
            expect(resultado.confianca).toBeGreaterThanOrEqual(0);
            expect(resultado.regrasAplicadas).toBeDefined();
            expect(resultado.totais).toBeDefined();
            expect(resultado.observacoes).toBeDefined();
            expect(mockCache.set).toHaveBeenCalled();
        });
        it('deve lidar com erro na apuração e retornar status de erro', async () => {
            const empresaId = 'empresa-123';
            const periodo = '12/2024';
            const documentos = ['doc-1', 'doc-2'];
            mockCache.get.mockRejectedValue(new Error('Erro de teste no cache'));
            const resultado = await agent.apurarICMSAutomatico(empresaId, periodo, documentos);
            expect(resultado).toBeDefined();
            expect(resultado.status).toBe('erro');
            expect(resultado.confianca).toBe(0);
            expect(resultado.observacoes).toContain('Erro na apuração automática');
        });
        it('deve processar múltiplos documentos automaticamente', async () => {
            const empresaId = 'empresa-123';
            const periodo = '12/2024';
            const documentos = ['doc-1', 'doc-2'];
            const documentosMock = [
                {
                    id: 'doc-1',
                    numeroDocumento: 'NFe-001',
                    dataEmissao: new Date('2024-12-01'),
                    tipo: 'NFe',
                    itens: [
                        {
                            descricao: 'Produto 1',
                            ncm: '12345678',
                            cfop: '5102',
                            cst: '000',
                            valorTotal: 1000.00,
                            aliquotaIcms: 18,
                            valorIcms: 180.00,
                        },
                    ],
                },
                {
                    id: 'doc-2',
                    numeroDocumento: 'NFe-002',
                    dataEmissao: new Date('2024-12-02'),
                    tipo: 'NFe',
                    itens: [
                        {
                            descricao: 'Produto 2',
                            ncm: '87654321',
                            cfop: '5405',
                            cst: '102',
                            valorTotal: 2000.00,
                            aliquotaIcms: 12,
                            valorIcms: 240.00,
                        },
                    ],
                },
            ];
            mockIndexer.buscarDocumentos.mockResolvedValue(documentosMock);
            mockCache.get.mockResolvedValue(null);
            mockCache.set.mockResolvedValue();
            const resultado = await agent.apurarICMSAutomatico(empresaId, periodo, documentos);
            expect(resultado.itens).toHaveLength(4);
            expect(resultado.totais.valorTotalOperacoes).toBe(6000.00);
            expect(resultado.totais.valorIcmsTotal).toBe(840.00);
        });
    });
    describe('Extração Automática de Regras', () => {
        it('deve extrair regras automaticamente de documentos', async () => {
            const empresaId = 'empresa-123';
            const regrasMock = [
                {
                    id: 'regra-1',
                    nome: 'Base Reduzida 50%',
                    descricao: 'Base de cálculo reduzida em 50%',
                    tipo: 'base_reduzida',
                    condicoes: [
                        {
                            campo: 'cfop',
                            operador: 'igual',
                            valor: '5102',
                            logica: 'AND',
                        },
                    ],
                    calculos: [
                        {
                            tipo: 'base_calculo',
                            formula: 'base_reduzida_50',
                            parametros: ['valorOperacao'],
                            resultado: 'base',
                        },
                    ],
                    prioridade: 1,
                    ativo: true,
                    fonte: 'extração_automática_ia',
                    confianca: 85,
                    dataCriacao: new Date(),
                    dataAtualizacao: new Date(),
                },
            ];
            const mockOpenAI = require('openai').OpenAI;
            mockOpenAI.mockImplementation(() => ({
                chat: {
                    completions: {
                        create: jest.fn().mockResolvedValue({
                            choices: [
                                {
                                    message: {
                                        content: JSON.stringify(regrasMock),
                                    },
                                },
                            ],
                        }),
                    },
                },
            }));
            const agenteComRegras = new icms_apurador_agent_1.ICMSApuradorAgent({
                openaiApiKey: 'test-key',
                cacheEnabled: true,
                autoExtractRules: true,
                confidenceThreshold: 70,
                maxRetries: 3,
                batchSize: 100,
            });
            expect(agenteComRegras).toBeDefined();
        });
    });
    describe('Aplicação de Regras', () => {
        it('deve aplicar regras ICMS corretamente', async () => {
            const item = {
                documento: 'NFe-001',
                data: new Date('2024-12-01'),
                produto: 'Produto Teste',
                ncm: '12345678',
                cfop: '5102',
                cst: '000',
                valorOperacao: 1000.00,
                baseCalculo: 1000.00,
                aliquota: 18,
                valorIcms: 180.00,
                regrasAplicadas: [],
                observacoes: [],
            };
            const regra = {
                id: 'regra-1',
                nome: 'Base Reduzida 50%',
                descricao: 'Base de cálculo reduzida em 50%',
                tipo: 'base_reduzida',
                condicoes: [
                    {
                        campo: 'cfop',
                        operador: 'igual',
                        valor: '5102',
                        logica: 'AND',
                    },
                ],
                calculos: [
                    {
                        tipo: 'base_calculo',
                        formula: 'base_reduzida_50',
                        parametros: ['valorOperacao'],
                        resultado: 'base',
                    },
                ],
                prioridade: 1,
                ativo: true,
                fonte: 'teste',
                confianca: 85,
                dataCriacao: new Date(),
                dataAtualizacao: new Date(),
            };
            const itemComRegra = { ...item };
            if (item.cfop === '5102') {
                itemComRegra.baseCalculo = 500.00;
                itemComRegra.valorIcms = 90.00;
                itemComRegra.regrasAplicadas.push(regra.id);
            }
            expect(itemComRegra.baseCalculo).toBe(500.00);
            expect(itemComRegra.valorIcms).toBe(90.00);
            expect(itemComRegra.regrasAplicadas).toContain(regra.id);
        });
        it('deve rejeitar regra quando condições não são atendidas', async () => {
            const item = {
                documento: 'NFe-001',
                data: new Date('2024-12-01'),
                produto: 'Produto Teste',
                ncm: '12345678',
                cfop: '5405',
                cst: '000',
                valorOperacao: 1000.00,
                baseCalculo: 1000.00,
                aliquota: 18,
                valorIcms: 180.00,
                regrasAplicadas: [],
                observacoes: [],
            };
            const regra = {
                id: 'regra-1',
                nome: 'Base Reduzida 50%',
                descricao: 'Base de cálculo reduzida em 50%',
                tipo: 'base_reduzida',
                condicoes: [
                    {
                        campo: 'cfop',
                        operador: 'igual',
                        valor: '5102',
                        logica: 'AND',
                    },
                ],
                calculos: [
                    {
                        tipo: 'base_calculo',
                        formula: 'base_reduzida_50',
                        parametros: ['valorOperacao'],
                        resultado: 'base',
                    },
                ],
                prioridade: 1,
                ativo: true,
                fonte: 'teste',
                confianca: 85,
                dataCriacao: new Date(),
                dataAtualizacao: new Date(),
            };
            const aplicarRegra = agent.aplicarRegra.bind(agent);
            const resultado = aplicarRegra(item, regra);
            expect(resultado).toBe(false);
            expect(item.baseCalculo).toBe(1000.00);
            expect(item.valorIcms).toBe(180.00);
        });
    });
    describe('Cálculo de Totais', () => {
        it('deve calcular totais automaticamente', async () => {
            const itens = [
                {
                    documento: 'NFe-001',
                    data: new Date('2024-12-01'),
                    produto: 'Produto 1',
                    ncm: '12345678',
                    cfop: '5102',
                    cst: '000',
                    valorOperacao: 1000.00,
                    baseCalculo: 1000.00,
                    aliquota: 18,
                    valorIcms: 180.00,
                    regrasAplicadas: ['regra-1'],
                    observacoes: [],
                },
                {
                    documento: 'NFe-002',
                    data: new Date('2024-12-02'),
                    produto: 'Produto 2',
                    ncm: '87654321',
                    cfop: '5405',
                    cst: '102',
                    valorOperacao: 2000.00,
                    baseCalculo: 2000.00,
                    aliquota: 12,
                    valorIcms: 240.00,
                    regrasAplicadas: ['regra-2'],
                    observacoes: [],
                },
            ];
            const calcularTotais = agent.calcularTotaisAutomaticamente.bind(agent);
            const totais = calcularTotais(itens);
            expect(totais.valorTotalOperacoes).toBe(3000.00);
            expect(totais.baseCalculoTotal).toBe(3000.00);
            expect(totais.valorIcmsTotal).toBe(420.00);
            expect(totais.porRegra['regra-1']).toBe(180.00);
            expect(totais.porRegra['regra-2']).toBe(240.00);
        });
    });
    describe('Cálculo de Confiança', () => {
        it('deve calcular confiança baseada na qualidade dos dados', async () => {
            const itens = [
                {
                    documento: 'NFe-001',
                    data: new Date('2024-12-01'),
                    produto: 'Produto 1',
                    ncm: '12345678',
                    cfop: '5102',
                    cst: '000',
                    valorOperacao: 1000.00,
                    baseCalculo: 1000.00,
                    aliquota: 18,
                    valorIcms: 180.00,
                    regrasAplicadas: ['regra-1'],
                    observacoes: [],
                },
            ];
            const totais = {
                valorTotalOperacoes: 1000.00,
                baseCalculoTotal: 1000.00,
                valorIcmsTotal: 180.00,
                baseStTotal: 0,
                valorStTotal: 0,
                valorDifalTotal: 0,
                creditoPresumido: 0,
                saldoApurado: 180.00,
                porRegra: { 'regra-1': 180.00 },
            };
            const calcularConfianca = agent.calcularConfianca.bind(agent);
            const confianca = calcularConfianca(itens, totais);
            expect(confianca).toBeGreaterThan(0);
            expect(confianca).toBeLessThanOrEqual(100);
        });
        it('deve reduzir confiança quando há problemas nos dados', async () => {
            const itens = [];
            const totais = {
                valorTotalOperacoes: 0,
                baseCalculoTotal: 0,
                valorIcmsTotal: 0,
                baseStTotal: 0,
                valorStTotal: 0,
                valorDifalTotal: 0,
                creditoPresumido: 0,
                saldoApurado: 0,
                porRegra: {},
            };
            const calcularConfianca = agent.calcularConfianca.bind(agent);
            const confianca = calcularConfianca(itens, totais);
            expect(confianca).toBeLessThan(100);
        });
    });
    describe('Validação de Regras', () => {
        it('deve validar estrutura de regras corretamente', async () => {
            const regraValida = {
                id: 'regra-1',
                nome: 'Regra Válida',
                descricao: 'Descrição da regra',
                tipo: 'base_reduzida',
                condicoes: [],
                calculos: [],
                prioridade: 1,
                ativo: true,
                fonte: 'teste',
                confianca: 85,
                dataCriacao: new Date(),
                dataAtualizacao: new Date(),
            };
            const regraInvalida = {
                id: 'regra-2',
                nome: 'Regra Inválida',
            };
            const validarEstrutura = agent.validarEstruturaRegra.bind(agent);
            const resultadoValida = validarEstrutura(regraValida);
            const resultadoInvalida = validarEstrutura(regraInvalida);
            expect(resultadoValida).toBe(true);
            expect(resultadoInvalida).toBe(false);
        });
    });
});
//# sourceMappingURL=icms-apurador-agent.test.js.map