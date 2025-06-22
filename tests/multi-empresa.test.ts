/// <reference types="jest" />
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { EmpresaService } from '../src/services/empresa-service';

// Mock global do middleware de autenticação
const mockAuthenticateToken = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: '1', email: 'admin@test.com', role: 'ADMIN' };
  next();
});

// Mock do JWT
const mockJwt = {
  sign: jest.fn(() => 'fake-token'),
  verify: jest.fn((token: string) => {
    if (token === 'fake-token') {
      return { userId: '1', email: 'admin@test.com', role: 'ADMIN' };
    }
    throw new Error('Invalid token');
  }),
};

// Mock do logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock dos serviços
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

// Mock módulos antes de importar o app
jest.doMock('../src/middleware/auth', () => ({
  authenticateToken: mockAuthenticateToken,
}));
jest.doMock('jsonwebtoken', () => mockJwt);
jest.doMock('../src/utils/logger', () => ({ default: mockLogger }));
jest.doMock('../src/utils/prisma', () => ({ default: mockPrisma }));
jest.doMock('bcryptjs', () => mockBcrypt);

let app: any;

describe('MultiEmpresaWatcher', () => {
  // Aumentar timeout para 10 segundos para testes que podem demorar
  jest.setTimeout(10000);
  
  let authToken: string;
  let testDir: string;
  beforeAll(async () => {
    // Setup do mock do Prisma para login
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1',
      name: 'Admin',
      email: 'admin@test.com',
      password: 'hashedPassword',
      role: 'ADMIN',
      isActive: true,
    });

    // Importar o app só depois dos mocks globais
    app = (await import('../src/index')).default;

    // Criar diretório de teste
    testDir = path.join(__dirname, 'test-files');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Criar estrutura de teste
    const empresaDir = path.join(testDir, 'empresa', '12345678000199');
    const anoDir = path.join(empresaDir, '2024');
    const mesDir = path.join(anoDir, '04');
    fs.mkdirSync(mesDir, { recursive: true });

    // Criar arquivo XML de teste
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
    fs.writeFileSync(path.join(mesDir, 'test-nfe.xml'), testXML);

    // Login para obter token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({        email: 'admin@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data?.token || 'fake-token';
  });

  afterAll(async () => {
    // Limpar diretório de teste
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });  describe('POST /api/multi-empresa/start', () => {
    it('should start multi-empresa watcher', async () => {
      const response = await request(app)
        .post('/api/multi-empresa/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          basePath: testDir,
          config: {
            scanInterval: 5000, // 5 segundos para teste
            maxFileSize: 10 * 1024 * 1024, // 10MB
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('iniciado com sucesso');
    });

    it('should return error without basePath', async () => {
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
        .get('/api/multi-empresa/empresas')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.empresas)).toBe(true);
    });

    it('should filter empresas by year', async () => {
      const response = await request(app)
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
      const response = await request(app)
        .get(`/api/multi-empresa/empresas/${cnpj}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.empresa.cnpj).toBe(cnpj);
    });

    it('should return 404 for non-existent empresa', async () => {
      const response = await request(app)
        .get('/api/multi-empresa/empresas/99999999999999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/multi-empresa/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app)
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
      const response = await request(app)
        .post('/api/multi-empresa/stop')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('parado com sucesso');
    });
  });

  describe('POST /api/multi-empresa/clear-processed', () => {
    it('should clear processed files list', async () => {
      // Primeiro iniciar o watcher
      await request(app)
        .post('/api/multi-empresa/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          basePath: testDir,
          config: {
            scanInterval: 5000,
            maxFileSize: 10 * 1024 * 1024,
          }
        });

      const response = await request(app)
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

      const empresa = await EmpresaService.createOrUpdateEmpresa(empresaData);

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

      const empresa = await EmpresaService.createOrUpdateEmpresa(empresaData);

      expect(empresa).toBeDefined();
      expect(empresa.cnpj).toBe(empresaData.cnpj);
      expect(empresa.razaoSocial).toBe(empresaData.razaoSocial);
    });
  });

  describe('getEmpresaByCnpj', () => {
    it('should find empresa by CNPJ', async () => {
      const cnpj = '98765432000199';
      const empresa = await EmpresaService.getEmpresaByCnpj(cnpj);

      expect(empresa).toBeDefined();
      expect(empresa?.cnpj).toBe(cnpj);
    });

    it('should return null for non-existent CNPJ', async () => {
      const empresa = await EmpresaService.getEmpresaByCnpj('99999999999999');
      expect(empresa).toBeNull();
    });
  });

  describe('listEmpresas', () => {
    it('should list all empresas', async () => {
      const empresas = await EmpresaService.listEmpresas();

      expect(Array.isArray(empresas)).toBe(true);
      expect(empresas.length).toBeGreaterThan(0);
    });
  });

  describe('getEmpresaStats', () => {
    it('should return empresa statistics', async () => {
      const stats = await EmpresaService.getEmpresaStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalEmpresas).toBe('number');
      expect(typeof stats.totalDocumentos).toBe('number');
      expect(Array.isArray(stats.empresasPorRegime)).toBe(true);
    });
  });
});