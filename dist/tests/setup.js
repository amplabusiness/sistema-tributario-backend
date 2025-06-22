"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
const adminUser = {
    id: "1",
    email: 'admin@test.com',
    password: 'hashedPassword',
    name: 'Admin',
    company: 'Test Company',
    role: 'ADMIN',
    isActive: true,
    empresaId: "1",
    empresa: {
        id: "1",
        nome: 'Empresa Teste',
        cnpj: '12345678000199',
        ativo: true,
        razaoSocial: 'Empresa Teste LTDA',
        regimeTributario: 'SIMPLES',
    },
    sessions: [
        {
            id: "1",
            userId: "1",
            token: 'fake-token',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
    ],
};
jest.mock('@prisma/client', () => {
    const userMock = {
        findUnique: jest.fn((args) => {
            if (args && args.where && args.where.email) {
                if (args.where.email === 'admin@test.com') {
                    if (args.select) {
                        const selected = {};
                        for (const key of Object.keys(args.select)) {
                            if (key in adminUser) {
                                selected[key] = adminUser[key];
                            }
                            if (key === 'empresa')
                                selected.empresa = adminUser.empresa;
                            if (key === 'sessions')
                                selected.sessions = adminUser.sessions;
                        }
                        if (args.select.id && !('id' in selected))
                            selected.id = adminUser.id;
                        if (args.select.isActive && !('isActive' in selected))
                            selected.isActive = adminUser.isActive;
                        if (args.select.role && !('role' in selected))
                            selected.role = adminUser.role;
                        if (args.select.email && !('email' in selected))
                            selected.email = adminUser.email;
                        if (args.select.password && !('password' in selected))
                            selected.password = adminUser.password;
                        return Promise.resolve(selected);
                    }
                    return Promise.resolve(adminUser);
                }
                return Promise.resolve(null);
            }
            return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(async (args) => {
            const { password, ...rest } = args.data;
            return {
                id: "2",
                ...rest,
                role: args.data.role || 'USER',
                isActive: true,
                createdAt: new Date(),
            };
        }),
        update: jest.fn().mockImplementation(async (args) => ({ ...adminUser, ...args.data })),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
        findMany: jest.fn().mockResolvedValue([adminUser]),
        findFirst: jest.fn().mockResolvedValue(adminUser),
        upsert: jest.fn().mockResolvedValue(adminUser),
        aggregate: jest.fn().mockResolvedValue({ _count: { id: 1 } }),
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1),
    };
    const empresaMock = {
        upsert: jest.fn().mockImplementation(async (args) => ({
            id: "1",
            nome: args.create?.nome || 'Empresa Teste',
            cnpj: args.create?.cnpj || args.where?.cnpj || '12345678000199',
            ativo: true,
            razaoSocial: args.create?.razaoSocial || 'Razão Social Teste',
            regimeTributario: args.create?.regimeTributario || 'SIMPLES',
            nomeFantasia: args.create?.nomeFantasia || 'Empresa Teste',
            dataCadastro: new Date('2024-01-01T00:00:00Z'),
            documentos: [{ id: "1", createdAt: new Date('2024-04-01T00:00:00Z') }],
            _count: { documentos: 10 },
        })),
        findUnique: jest.fn().mockImplementation(async (args) => {
            if (args.where?.cnpj === '98765432000199') {
                return {
                    id: "2",
                    nome: 'Empresa Nova',
                    cnpj: '98765432000199',
                    ativo: true,
                    razaoSocial: 'Empresa Nova LTDA',
                    regimeTributario: 'SIMPLES',
                    nomeFantasia: 'Empresa Nova',
                    dataCadastro: new Date('2024-01-01T00:00:00Z'),
                    documentos: [{ id: "2", createdAt: new Date('2024-04-01T00:00:00Z') }],
                    _count: { documentos: 5 },
                };
            }
            if (args.where?.cnpj === '99999999999999') {
                return null;
            }
            if (args.where?.cnpj && !['12345678000199', '98765432000199'].includes(args.where.cnpj)) {
                return null;
            }
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
            };
        }),
        findMany: jest.fn().mockImplementation(async (args) => {
            if (args?.where?.documentos?.some?.createdAt?.gte) {
                return [
                    {
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
                    },
                    {
                        id: "2",
                        nome: 'Empresa Nova',
                        cnpj: '98765432000199',
                        ativo: true,
                        razaoSocial: 'Empresa Nova LTDA',
                        regimeTributario: 'SIMPLES',
                        nomeFantasia: 'Empresa Nova',
                        dataCadastro: new Date('2024-01-01T00:00:00Z'),
                        documentos: [{ id: "2", createdAt: new Date('2024-04-01T00:00:00Z') }],
                        _count: { documentos: 5 },
                    },
                ];
            }
            if (args?.where?.cnpj) {
                if (args.where.cnpj === '12345678000199') {
                    return [{
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
                        }];
                }
                if (args.where.cnpj === '98765432000199') {
                    return [{
                            id: "2",
                            nome: 'Empresa Nova',
                            cnpj: '98765432000199',
                            ativo: true,
                            razaoSocial: 'Empresa Nova LTDA',
                            regimeTributario: 'SIMPLES',
                            nomeFantasia: 'Empresa Nova',
                            dataCadastro: new Date('2024-01-01T00:00:00Z'),
                            documentos: [{ id: "2", createdAt: new Date('2024-04-01T00:00:00Z') }],
                            _count: { documentos: 5 },
                        }];
                }
                return [];
            }
            return [
                {
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
                },
                {
                    id: "2",
                    nome: 'Empresa Nova',
                    cnpj: '98765432000199',
                    ativo: true,
                    razaoSocial: 'Empresa Nova LTDA',
                    regimeTributario: 'SIMPLES',
                    nomeFantasia: 'Empresa Nova',
                    dataCadastro: new Date('2024-01-01T00:00:00Z'),
                    documentos: [{ id: "2", createdAt: new Date('2024-04-01T00:00:00Z') }],
                    _count: { documentos: 5 },
                },
            ];
        }),
        count: jest.fn().mockResolvedValue(2),
        groupBy: jest.fn().mockResolvedValue([
            { regimeTributario: 'SIMPLES', _count: { id: 2 } }
        ]),
        create: jest.fn().mockImplementation(async (args) => ({ ...args.data, id: 3 })),
        update: jest.fn().mockImplementation(async (args) => ({ ...args.data })),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const sessionMock = {
        create: jest.fn().mockResolvedValue({
            id: "1",
            userId: "1",
            token: 'fake-token',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        }),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
    };
    const documentMock = {
        findMany: jest.fn().mockResolvedValue([
            { id: "1", createdAt: new Date('2024-04-01T00:00:00Z'), empresaId: "1" },
            { id: "2", createdAt: new Date('2024-04-01T00:00:00Z'), empresaId: "2" },
        ]),
        findUnique: jest.fn().mockResolvedValue({ id: "1", createdAt: new Date('2024-04-01T00:00:00Z'), empresaId: "1" }),
        findFirst: jest.fn().mockResolvedValue({ id: "1", createdAt: new Date('2024-04-01T00:00:00Z'), empresaId: "1" }),
        create: jest.fn().mockResolvedValue({ id: "3", createdAt: new Date('2024-04-01T00:00:00Z'), empresaId: "1" }),
        update: jest.fn().mockResolvedValue({ id: "1", createdAt: new Date('2024-04-01T00:00:00Z'), empresaId: "1" }),
        delete: jest.fn().mockResolvedValue({ id: "1" }),
        count: jest.fn().mockResolvedValue(10),
    };
    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            user: userMock,
            empresa: empresaMock,
            session: sessionMock,
            document: documentMock,
            $connect: jest.fn(),
            $disconnect: jest.fn(),
        })),
    };
});
jest.mock('winston', () => ({
    createLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    }),
    format: {
        combine: jest.fn(),
        timestamp: jest.fn(),
        errors: jest.fn(),
        json: jest.fn(),
        colorize: jest.fn(),
        printf: jest.fn(),
    },
    transports: {
        Console: jest.fn(),
        File: jest.fn(),
    },
}));
const redisMockInstance = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    isOpen: true,
    isReady: true,
    sAdd: jest.fn(),
    expire: jest.fn(),
    sMembers: jest.fn().mockResolvedValue([]),
    hSet: jest.fn(),
    hGet: jest.fn(),
    hGetAll: jest.fn().mockResolvedValue({}),
    scan: jest.fn().mockResolvedValue([]),
};
jest.mock('redis', () => ({
    createClient: jest.fn(() => redisMockInstance),
}));
jest.mock('bullmq', () => {
    const mockJob = {
        id: 'mock-job-id',
        data: {},
        attemptsMade: 0,
        add: jest.fn(),
        remove: jest.fn(),
        retry: jest.fn(),
        getState: jest.fn().mockResolvedValue('completed'),
        progress: jest.fn(),
    };
    const mockQueue = {
        add: jest.fn().mockResolvedValue(mockJob),
        getJob: jest.fn().mockResolvedValue(mockJob),
        getJobCounts: jest.fn().mockResolvedValue({
            waiting: 0,
            active: 0,
            completed: 10,
            failed: 0,
            delayed: 0,
            paused: 0,
        }),
        pause: jest.fn(),
        resume: jest.fn(),
        clean: jest.fn(),
        on: jest.fn(),
        close: jest.fn(),
    };
    return {
        Queue: jest.fn().mockImplementation(() => mockQueue),
        Worker: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            close: jest.fn(),
        })),
        QueueScheduler: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            close: jest.fn(),
        })),
    };
});
jest.mock('bull', () => {
    return jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        process: jest.fn(),
        on: jest.fn(),
    }));
});
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
    }));
});
jest.mock('chokidar', () => {
    const EventEmitter = require('events');
    class MockWatcher extends EventEmitter {
        constructor(paths, options) {
            super();
            setTimeout(() => {
                this.emit('ready');
            }, 100);
        }
        close() {
            this.emit('close');
        }
    }
    return { watch: jest.fn().mockImplementation((paths, options) => {
            return new MockWatcher(paths, options);
        }),
    };
});
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
    compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(() => 'fake-token'),
    verify: jest.fn((token, secret) => {
        if (token === 'fake-token') {
            return { userId: "1", email: 'admin@test.com', role: 'ADMIN' };
        }
        throw new Error('Invalid token');
    }),
}));
jest.mock('multer', () => {
    const multer = jest.fn(() => ({
        single: jest.fn().mockReturnValue((req, res, next) => {
            if (!req.file) {
                req.file = undefined;
            }
            next();
        }),
        array: jest.fn().mockReturnValue((req, res, next) => next()),
    }));
    multer.diskStorage = jest.fn(() => ({
        _mock: true,
    }));
    return multer;
});
jest.mock('openai', () => {
    const MockOpenAI = jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Resposta simulada da IA' } }],
                    usage: { total_tokens: 150 },
                }),
            },
        },
        audio: {
            transcriptions: {
                create: jest.fn().mockResolvedValue({ text: 'Mock transcription' }),
            },
        },
    }));
    return {
        __esModule: true,
        OpenAI: MockOpenAI,
        default: MockOpenAI,
    };
});
jest.mock('xlsx', () => ({
    readFile: jest.fn().mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
            Sheet1: {
                'A1': { v: 'Header1' },
                'B1': { v: 'Header2' },
                'A2': { v: 'Value1' },
                'B2': { v: 'Value2' },
            },
        },
    }),
    utils: {
        sheet_to_json: jest.fn().mockReturnValue([
            { Header1: 'Value1', Header2: 'Value2' },
        ]),
    },
}));
jest.mock('@/utils/logger', () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logDebug: jest.fn(),
}));
afterEach(() => {
    jest.clearAllMocks();
});
afterAll(() => {
    jest.restoreAllMocks();
});
//# sourceMappingURL=setup.js.map