import request from 'supertest';
import app from '../../src/index';
import { logInfo, logError } from '../../src/utils/logger';

// Mock do Prisma - usar o mock global do setup.ts
jest.mock('../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    document: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    empresa: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock do logger
jest.mock('../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// Mock do document parser agent
jest.mock('../../src/services/agents/document-parser-agent', () => ({
  documentParserAgent: {
    processarDocumento: jest.fn(),
  },
}));

describe('Document Routes', () => {
  const mockPrisma = require('../../src/utils/prisma').default;
  const mockDocumentParserAgent = require('../../src/services/agents/document-parser-agent').documentParserAgent;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/documents', () => {
    it('should return list of documents', async () => {
      const mockDocuments = [
        {
          id: 'doc1',
          filename: 'test.xml',
          originalName: 'test.xml',
          documentType: 'XML',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);
      mockPrisma.document.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 if no documents found', async () => {
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.document.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', 'Bearer fake-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Nenhum documento encontrado');
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should return document by id', async () => {
      const mockDocument = {
        id: 'doc1',
        filename: 'test.xml',
        originalName: 'test.xml',
        documentType: 'XML',
        status: 'PENDING',
        createdAt: new Date(),
      };

      mockPrisma.document.findFirst.mockResolvedValue(mockDocument);

      const response = await request(app)
        .get('/api/v1/documents/doc1')
        .set('Authorization', 'Bearer fake-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDocument);
    });

    it('should return 404 if document not found', async () => {
      mockPrisma.document.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/documents/not-found-id')
        .set('Authorization', 'Bearer fake-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Recurso não encontrado');
    });
  });

  describe('Document Routes - Parsing Endpoint', () => {
    const validParseRequest: Record<string, any> = {
      filePath: '/path/to/document.xml',
      tipo: 'XML',
      empresa: 'Empresa Teste LTDA',
      cnpj: '12345678000195',
      periodo: '2024-01',
    };

    const mockParsedDocument = {
      id: 'doc_123',
      tipo: 'XML',
      empresa: 'Empresa Teste LTDA',
      cnpj: '12345678000195',
      periodo: '2024-01',
      dataProcessamento: new Date(),
      status: 'concluido',
      dados: {
        emitente: { cnpj: '12345678000195' },
        destinatario: {},
        itens: [],
        impostos: [],
        totais: { valor: 1000.00 },
      },
      erros: [],
      observacoes: 'Documento processado com sucesso',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('POST /api/v1/documents/parse', () => {
      it('deve processar documento com sucesso', async () => {
        mockDocumentParserAgent.processarDocumento.mockResolvedValue(mockParsedDocument);

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(validParseRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Documento processado');
        expect(mockDocumentParserAgent.processarDocumento).toHaveBeenCalledWith(
          validParseRequest.filePath,
          validParseRequest.tipo,
          validParseRequest.empresa,
          validParseRequest.cnpj,
          validParseRequest.periodo
        );
      });

      it('deve rejeitar requisição sem filePath', async () => {
        const invalidRequest = { ...validParseRequest };
        delete invalidRequest.filePath;

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Parâmetros obrigatórios');
        expect(mockDocumentParserAgent.processarDocumento).not.toHaveBeenCalled();
      });

      it('deve rejeitar requisição sem tipo', async () => {
        const invalidRequest = { ...validParseRequest };
        delete invalidRequest.tipo;

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Parâmetros obrigatórios');
      });

      it('deve rejeitar requisição sem empresa', async () => {
        const invalidRequest = { ...validParseRequest };
        delete invalidRequest.empresa;

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Parâmetros obrigatórios');
      });

      it('deve rejeitar requisição sem CNPJ', async () => {
        const invalidRequest = { ...validParseRequest };
        delete invalidRequest.cnpj;

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Parâmetros obrigatórios');
      });

      it('deve rejeitar requisição sem período', async () => {
        const invalidRequest = { ...validParseRequest };
        delete invalidRequest.periodo;

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Parâmetros obrigatórios');
      });

      it('deve processar diferentes tipos de documentos', async () => {
        const documentTypes = ['XML', 'SPED', 'ECD', 'ECF', 'CIAP', 'INVENTARIO', 'PGDAS'];
        
        for (const tipo of documentTypes) {
          mockDocumentParserAgent.processarDocumento.mockResolvedValue({
            ...mockParsedDocument,
            tipo,
          });

          const response = await request(app)
            .post('/api/v1/documents/parse')
            .set('Authorization', 'Bearer fake-token')
            .send({ ...validParseRequest, tipo })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.tipo).toBe(tipo);
        }
      });

      it('deve lidar com erro do agente de parsing', async () => {
        const errorMessage = 'Erro ao processar documento';
        mockDocumentParserAgent.processarDocumento.mockRejectedValue(new Error(errorMessage));

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(validParseRequest)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Erro ao processar documento');
        expect(response.body.error).toBe(errorMessage);
        expect(logError).toHaveBeenCalledWith(
          'Erro no parsing manual de documento',
          expect.any(Error)
        );
      });

      it('deve processar documento com dados complexos', async () => {
        const complexDocument = {
          ...mockParsedDocument,
          dados: {
            emitente: {
              cnpj: '12345678000195',
              nome: 'Empresa Teste LTDA',
              endereco: {
                logradouro: 'Rua Teste',
                numero: '123',
                bairro: 'Centro',
                municipio: 'São Paulo',
                uf: 'SP',
                cep: '01234-567',
              },
            },
            destinatario: {
              cnpj: '98765432000110',
              nome: 'Cliente Teste LTDA',
            },
            itens: [
              {
                codigo: '001',
                descricao: 'Produto Teste',
                ncm: '12345678',
                cfop: '5102',
                cst: '102',
                aliquota: 18.0,
                baseCalculo: 1000.00,
                valor: 180.00,
                quantidade: 10,
                unidade: 'UN',
              },
            ],
            impostos: [
              {
                tipo: 'ICMS',
                baseCalculo: 1000.00,
                aliquota: 18.0,
                valor: 180.00,
                cst: '102',
                cfop: '5102',
              },
            ],
            totais: {
              valor: 1000.00,
              baseCalculo: 1000.00,
              impostos: 180.00,
            },
          },
        };

        mockDocumentParserAgent.processarDocumento.mockResolvedValue(complexDocument);

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(validParseRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.dados.emitente.nome).toBe('Empresa Teste LTDA');
        expect(response.body.data.dados.itens).toHaveLength(1);
        expect(response.body.data.dados.impostos).toHaveLength(1);
        expect(response.body.data.dados.totais.valor).toBe(1000.00);
      });

      it('deve validar formato do CNPJ', async () => {
        const invalidCnpjRequest = {
          filePath: '/path/to/document.xml',
          tipo: 'XML',
          empresa: 'Empresa Teste LTDA',
          cnpj: '12345678901234', // CNPJ inválido
          periodo: '2024-01',
        };

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(invalidCnpjRequest)
          .expect(200);

        expect(mockDocumentParserAgent.processarDocumento).toHaveBeenCalledWith(
          invalidCnpjRequest.filePath,
          invalidCnpjRequest.tipo,
          invalidCnpjRequest.empresa,
          invalidCnpjRequest.cnpj,
          invalidCnpjRequest.periodo
        );
      });

      it('deve processar documento com status de erro', async () => {
        const errorDocument = {
          ...mockParsedDocument,
          status: 'erro',
          erros: ['Arquivo corrompido', 'Formato inválido'],
          observacoes: 'Documento processado com erros',
        };

        mockDocumentParserAgent.processarDocumento.mockResolvedValue(errorDocument);

        const response = await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(validParseRequest)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('erro');
        expect(response.body.data.erros).toContain('Arquivo corrompido');
        expect(response.body.data.observacoes).toBe('Documento processado com erros');
      });
    });

    describe('Integração com outros endpoints', () => {
      it('deve manter compatibilidade com upload de documentos', async () => {
        const mockDocument = {
          id: 'doc-123',
          filename: 'test.xml',
          originalName: 'test.xml',
          documentType: 'XML',
          status: 'PENDING',
          createdAt: new Date(),
        };

        mockPrisma.document.create.mockResolvedValue(mockDocument);
        mockPrisma.document.findMany.mockResolvedValue([mockDocument]);
        mockPrisma.document.count.mockResolvedValue(1);

        const response = await request(app)
          .get('/api/v1/documents')
          .set('Authorization', 'Bearer fake-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });

    describe('Logs e monitoramento', () => {
      it('deve registrar logs de sucesso', async () => {
        mockDocumentParserAgent.processarDocumento.mockResolvedValue(mockParsedDocument);

        await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(validParseRequest)
          .expect(200);

        expect(logInfo).toHaveBeenCalled();
      });

      it('deve registrar logs de erro', async () => {
        mockDocumentParserAgent.processarDocumento.mockRejectedValue(new Error('Test error'));

        await request(app)
          .post('/api/v1/documents/parse')
          .set('Authorization', 'Bearer fake-token')
          .send(validParseRequest)
          .expect(500);

        expect(logError).toHaveBeenCalledWith(
          'Erro no parsing manual de documento',
          expect.any(Error)
        );
      });
    });
  });
}); 