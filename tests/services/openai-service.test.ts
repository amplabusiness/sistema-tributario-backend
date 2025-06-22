// Garantir variável de ambiente para testes
process.env.OPENAI_API_KEY = 'fake-key-for-test';

// Mock do OpenAI antes de qualquer import
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
    default: MockOpenAI,
  };
});

import {
  analisarDocumentoFiscal,
  validarDadosFiscais,
  gerarRelatorioFiscal,
  analisarXML,
  corrigirErrosDocumento,
  verificarStatus,
  obterEstatisticas,
} from '../../src/services/openai-service';

// Mock do logger
jest.mock('../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

// Mock dos utilitários brasileiros
jest.mock('../../src/utils/br-utils', () => ({
  formatarDataHoraBR: jest.fn().mockReturnValue('15/01/2024 14:30:45'),
}));

// Mock do processo de ambiente
const originalEnv = process.env;
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  process.env.OPENAI_API_KEY = 'test-key';
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Serviço OpenAI', () => {
  describe('Análise de Documentos Fiscais', () => {
    it('deve analisar documento fiscal com sucesso', async () => {
      const conteudo = '<xml>conteudo do documento</xml>';
      const resultado = await analisarDocumentoFiscal(conteudo, 'XML');
      
      expect(resultado.success).toBe(true);
      expect(resultado.content).toBe('Resposta simulada da IA');
      expect(resultado.model).toBe('gpt-4');
      expect(resultado.tokens).toBe(150);
      expect(resultado.cost).toBeGreaterThan(0);
      expect(resultado.timestamp).toBe('15/01/2024 14:30:45');
    });

    it('deve analisar documento SPED', async () => {
      const conteudo = 'conteudo do SPED';
      const resultado = await analisarDocumentoFiscal(conteudo, 'SPED');
      
      expect(resultado.success).toBe(true);
      expect(resultado.content).toBe('Resposta simulada da IA');
    });
  });

  describe('Validação de Dados Fiscais', () => {
    it('deve validar dados fiscais com sucesso', async () => {
      const dados = {
        cnpj: '12345678000195',
        valor: 1000.00,
        data: '2024-01-15',
      };
      
      const resultado = await validarDadosFiscais(dados, 'geral');
      
      expect(resultado.success).toBe(true);
      expect(resultado.content).toBe('Resposta simulada da IA');
    });

    it('deve validar dados com tipo específico', async () => {
      const dados = { cnpj: '12345678000195' };
      const resultado = await validarDadosFiscais(dados, 'cnpj');
      
      expect(resultado.success).toBe(true);
    });
  });

  describe('Geração de Relatórios', () => {
    it('deve gerar relatório fiscal com sucesso', async () => {
      const dados = {
        empresa: 'Empresa Teste',
        periodo: 'Janeiro 2024',
        valorTotal: 50000.00,
      };
      
      const resultado = await gerarRelatorioFiscal(dados, 'resumo');
      
      expect(resultado.success).toBe(true);
      expect(resultado.content).toBe('Resposta simulada da IA');
    });

    it('deve gerar relatório detalhado', async () => {
      const dados = { periodo: '2024' };
      const resultado = await gerarRelatorioFiscal(dados, 'detalhado');
      
      expect(resultado.success).toBe(true);
    });
  });

  describe('Análise de XML', () => {
    it('deve analisar XML com sucesso', async () => {
      const xml = '<nfe><emitente>...</emitente></nfe>';
      const resultado = await analisarXML(xml, 'XML');
      
      expect(resultado.success).toBe(true);
      expect(resultado.content).toBe('Resposta simulada da IA');
    });

    it('deve analisar SPED', async () => {
      const sped = 'conteudo do SPED';
      const resultado = await analisarXML(sped, 'SPED');
      
      expect(resultado.success).toBe(true);
    });
  });

  describe('Correção de Erros', () => {
    it('deve corrigir erros em documento', async () => {
      const documento = {
        cnpj: '12345678000190', // CNPJ inválido
        valor: 1000.00,
      };
      
      const erros = ['CNPJ inválido', 'Valor incorreto'];
      
      const resultado = await corrigirErrosDocumento(documento, erros);
      
      expect(resultado.success).toBe(true);
      expect(resultado.content).toBe('Resposta simulada da IA');
    });
  });

  describe('Verificação de Status', () => {
    it('deve verificar status online', async () => {
      const status = await verificarStatus();
      
      expect(status.status).toBe('online');
      expect(status.message).toBe('Serviço funcionando normalmente');
      expect(status.config).toHaveProperty('model');
      expect(status.config.apiKey).toBe('***');
    });
  });

  describe('Estatísticas', () => {
    it('deve obter estatísticas de uso', () => {
      const stats = obterEstatisticas();
      
      expect(stats).toHaveProperty('requestsThisMinute');
      expect(stats).toHaveProperty('requestsThisHour');
      expect(stats).toHaveProperty('rateLimit');
      expect(stats.rateLimit).toHaveProperty('requestsPerMinute');
      expect(stats.rateLimit).toHaveProperty('requestsPerHour');
    });
  });  describe('Tratamento de Erros', () => {
    it('deve lidar com erro de API key não configurada', async () => {
      // Salvar valor original
      const originalApiKey = process.env.OPENAI_API_KEY;
      
      // Simular erro de API key
      delete process.env.OPENAI_API_KEY;
      
      // Reinicializar o módulo para que ele recrie a configuração
      jest.resetModules();
      const { analisarDocumentoFiscal: analisarSemKey } = require('../../src/services/openai-service');
      
      try {
        const resultado = await analisarSemKey('teste');
        
        expect(resultado.success).toBe(false);
        expect(resultado.error).toBe('Chave da API OpenAI não configurada');      } catch (error) {
        // Se lançar exceção, verificar se é a mensagem esperada
        expect((error as Error).message).toBe('Chave da API OpenAI não configurada');
      } finally {
        // Restaurar valor original
        if (originalApiKey) {
          process.env.OPENAI_API_KEY = originalApiKey;
        } else {
          process.env.OPENAI_API_KEY = 'fake-key-for-test';
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    it('deve respeitar limites de rate limiting', () => {
      const stats = obterEstatisticas();
      
      expect(stats.requestsThisMinute).toBeGreaterThanOrEqual(0);
      expect(stats.requestsThisHour).toBeGreaterThanOrEqual(0);
      expect(stats.rateLimit.requestsPerMinute).toBe(60);
      expect(stats.rateLimit.requestsPerHour).toBe(1000);
    });
  });
}); 