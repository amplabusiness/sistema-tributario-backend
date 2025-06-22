"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const empresa_service_1 = require("../src/services/empresa-service");
const mockAuthenticateToken = jest.fn((req, res, next) => {
    req.user = { id: '1', email: 'admin@test.com', role: 'ADMIN' };
    next();
});
const mockJwt = {
    sign: jest.fn(() => 'fake-token'),
    verify: jest.fn((token) => {
        if (token === 'fake-token') {
            return { userId: '1', email: 'admin@test.com', role: 'ADMIN' };
        }
        throw new Error('Invalid token');
    }),
};
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    empresa: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
};
const mockBcrypt = {
    hash: jest.fn().mockResolvedValue('hashedPassword'),
    compare: jest.fn().mockResolvedValue(true),
};
jest.doMock('../src/middleware/auth', () => ({
    authenticateToken: mockAuthenticateToken,
}));
jest.doMock('jsonwebtoken', () => mockJwt);
jest.doMock('../src/utils/logger', () => ({ default: mockLogger }));
jest.doMock('../src/utils/prisma', () => ({ default: mockPrisma }));
jest.doMock('bcryptjs', () => mockBcrypt);
let app;
describe('MultiEmpresaWatcher', () => {
    jest.setTimeout(10000);
    let authToken;
    let testDir;
    beforeAll(async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            id: '1',
            name: 'Admin',
            email: 'admin@test.com',
            password: 'hashedPassword',
            role: 'ADMIN',
            isActive: true,
        });
        app = (await Promise.resolve().then(() => __importStar(require('../src/index')))).default;
        testDir = path_1.default.join(__dirname, 'test-files');
        if (!fs_1.default.existsSync(testDir)) {
            fs_1.default.mkdirSync(testDir, { recursive: true });
        }
        const empresaDir = path_1.default.join(testDir, 'empresa', '12345678000199');
        const anoDir = path_1.default.join(empresaDir, '2024');
        const mesDir = path_1.default.join(anoDir, '04');
        fs_1.default.mkdirSync(mesDir, { recursive: true });
        const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe52250400109066000114550010003773041217110708">
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>EMPRESA TESTE LTDA</xNome>
        <xFant>EMPRESA TESTE</xFant>
        <IE>123456789</IE>
      </emit>
    </infNFe>
  </NFe>
</nfeProc>`;
        fs_1.default.writeFileSync(path_1.default.join(mesDir, 'test-nfe.xml'), testXML);
        const loginResponse = await (0, supertest_1.default)(app)
            .post('/api/auth/login')
            .send({ email: 'admin@test.com',
            password: 'password123'
        });
        authToken = loginResponse.body.data?.token || 'fake-token';
    });
    afterAll(async () => {
        if (fs_1.default.existsSync(testDir)) {
            fs_1.default.rmSync(testDir, { recursive: true, force: true });
        }
    });
    describe('POST /api/multi-empresa/start', () => {
        it('should start multi-empresa watcher', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/multi-empresa/start')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                basePath: testDir,
                config: {
                    scanInterval: 5000,
                    maxFileSize: 10 * 1024 * 1024,
                }
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('iniciado com sucesso');
        });
        it('should return error without basePath', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/multi-empresa/start')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('basePath é obrigatório');
        });
    });
    describe('GET /api/multi-empresa/status', () => {
        it('should return watcher status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/multi-empresa/status')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.isRunning).toBe(true);
            expect(response.body.stats).toBeDefined();
        });
    });
    describe('GET /api/multi-empresa/empresas', () => {
        it('should list all empresas', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/multi-empresa/empresas')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.empresas)).toBe(true);
        });
        it('should filter empresas by year', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/multi-empresa/empresas?ano=2024')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.empresas)).toBe(true);
        });
    });
    describe('GET /api/multi-empresa/empresas/:cnpj', () => {
        it('should get empresa by CNPJ', async () => {
            const cnpj = '12345678000199';
            const response = await (0, supertest_1.default)(app)
                .get(`/api/multi-empresa/empresas/${cnpj}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.empresa.cnpj).toBe(cnpj);
        });
        it('should return 404 for non-existent empresa', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/multi-empresa/empresas/99999999999999')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
    describe('GET /api/multi-empresa/stats', () => {
        it('should return statistics', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/multi-empresa/stats')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.empresaStats).toBeDefined();
            expect(response.body.watcherStats).toBeDefined();
        });
    });
    describe('POST /api/multi-empresa/stop', () => {
        it('should stop multi-empresa watcher', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/multi-empresa/stop')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('parado com sucesso');
        });
    });
    describe('POST /api/multi-empresa/clear-processed', () => {
        it('should clear processed files list', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/multi-empresa/start')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                basePath: testDir,
                config: {
                    scanInterval: 5000,
                    maxFileSize: 10 * 1024 * 1024,
                }
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/multi-empresa/clear-processed')
                .set('Authorization', `Bearer ${authToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('limpa com sucesso');
        });
    });
});
describe('EmpresaService', () => {
    describe('createOrUpdateEmpresa', () => {
        it('should create new empresa', async () => {
            const empresaData = {
                cnpj: '98765432000199',
                razaoSocial: 'EMPRESA TESTE 2 LTDA',
                nomeFantasia: 'TESTE 2',
                ie: '987654321',
                cnae: '1234567',
            };
            const empresa = await empresa_service_1.EmpresaService.createOrUpdateEmpresa(empresaData);
            expect(empresa).toBeDefined();
            expect(empresa.cnpj).toBe(empresaData.cnpj);
            expect(empresa.razaoSocial).toBe(empresaData.razaoSocial);
        });
        it('should update existing empresa', async () => {
            const empresaData = {
                cnpj: '98765432000199',
                razaoSocial: 'EMPRESA TESTE 2 ATUALIZADA LTDA',
                nomeFantasia: 'TESTE 2 ATUALIZADO',
            };
            const empresa = await empresa_service_1.EmpresaService.createOrUpdateEmpresa(empresaData);
            expect(empresa).toBeDefined();
            expect(empresa.cnpj).toBe(empresaData.cnpj);
            expect(empresa.razaoSocial).toBe(empresaData.razaoSocial);
        });
    });
    describe('getEmpresaByCnpj', () => {
        it('should find empresa by CNPJ', async () => {
            const cnpj = '98765432000199';
            const empresa = await empresa_service_1.EmpresaService.getEmpresaByCnpj(cnpj);
            expect(empresa).toBeDefined();
            expect(empresa?.cnpj).toBe(cnpj);
        });
        it('should return null for non-existent CNPJ', async () => {
            const empresa = await empresa_service_1.EmpresaService.getEmpresaByCnpj('99999999999999');
            expect(empresa).toBeNull();
        });
    });
    describe('listEmpresas', () => {
        it('should list all empresas', async () => {
            const empresas = await empresa_service_1.EmpresaService.listEmpresas();
            expect(Array.isArray(empresas)).toBe(true);
            expect(empresas.length).toBeGreaterThan(0);
        });
    });
    describe('getEmpresaStats', () => {
        it('should return empresa statistics', async () => {
            const stats = await empresa_service_1.EmpresaService.getEmpresaStats();
            expect(stats).toBeDefined();
            expect(typeof stats.totalEmpresas).toBe('number');
            expect(typeof stats.totalDocumentos).toBe('number');
            expect(Array.isArray(stats.empresasPorRegime)).toBe(true);
        });
    });
});
//# sourceMappingURL=multi-empresa.test.js.map