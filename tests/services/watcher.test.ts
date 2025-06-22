import { startWatchers, stopWatchers } from '../../src/services/watcher';
import { logInfo } from '@/utils/logger';

// Mock do logger
jest.mock('../../src/utils/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
}));

describe('Watcher Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Garantir que o watcher seja parado após cada teste
    try {
      stopWatchers();
    } catch (error) {
      // Ignorar erros de parada
    }
  });

  it('should start watcher without errors', async () => {
    await expect(startWatchers()).resolves.not.toThrow();

    // Verificar se o log de inicialização foi chamado
    expect(logInfo).toHaveBeenCalledWith(
      'Iniciando sistema de monitoramento completo',
      expect.any(Object)
    );
  });

  it('should stop watcher without errors', async () => {
    // Primeiro iniciar
    await startWatchers();
    
    // Depois parar
    expect(() => {
      stopWatchers();
    }).not.toThrow();

    expect(logInfo).toHaveBeenCalledWith('Todos os watchers foram parados');
  });

  it('should handle multiple start/stop cycles', async () => {
    // Ciclo 1
    await startWatchers();
    stopWatchers();
    
    // Ciclo 2
    await startWatchers();
    stopWatchers();
    
    // Ciclo 3
    await startWatchers();
    stopWatchers();
    
    // Não deve lançar erros e deve logar corretamente
    expect(logInfo).toHaveBeenCalled();
  });

  it('should log watcher configuration', async () => {
    await startWatchers();
    
    // Verificar se as configurações foram logadas
    expect(logInfo).toHaveBeenCalledWith(
      'Status dos watchers',
      expect.any(Object)
    );
  });
});