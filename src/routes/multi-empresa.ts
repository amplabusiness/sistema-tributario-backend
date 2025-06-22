import { Router } from 'express';
import { MultiEmpresaWatcher, WatcherConfig } from '../services/multi-empresa-watcher';
import { EmpresaService } from '../services/empresa-service';
import { logInfo, logError } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = Router();
let multiEmpresaWatcher: MultiEmpresaWatcher | null = null;

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

/**
 * POST /api/multi-empresa/start
 * Inicia o monitoramento multiempresa
 */
router.post('/start', async (req, res) => {
  try {
    const { basePath, config } = req.body;

    if (!basePath) {
      return res.status(400).json({
        success: false,
        error: 'basePath é obrigatório',
      });
    }

    // Configuração padrão
    const watcherConfig: WatcherConfig = {
      basePath,
      supportedExtensions: config?.supportedExtensions || ['.xml', '.txt', '.sped', '.ecd', '.ecf', '.pdf', '.xlsx', '.xls'],
      maxFileSize: config?.maxFileSize || 100 * 1024 * 1024, // 100MB
      scanInterval: config?.scanInterval || 30000, // 30 segundos
      empresaFolders: config?.empresaFolders || ['empresa', 'company', 'cnpj', 'empresas'],
      yearFolders: config?.yearFolders || ['2024', '2025', '2023', '2022', '2021'],
    };

    // Para watcher anterior se existir
    if (multiEmpresaWatcher) {
      multiEmpresaWatcher.stop();
    }

    // Cria novo watcher
    multiEmpresaWatcher = new MultiEmpresaWatcher(watcherConfig);
    await multiEmpresaWatcher.start();    logInfo('MultiEmpresaWatcher iniciado', {
      basePath,
      config: watcherConfig,
    });    return res.json({
      success: true,
      message: 'Monitoramento multiempresa iniciado com sucesso',
      config: watcherConfig,
    });  } catch (error) {
    logError('Erro ao iniciar MultiEmpresaWatcher', error instanceof Error ? error : new Error('Unknown error'));

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/multi-empresa/stop
 * Para o monitoramento multiempresa
 */
router.post('/stop', (req, res) => {
  try {
    if (multiEmpresaWatcher) {
      multiEmpresaWatcher.stop();
      multiEmpresaWatcher = null;

      logInfo('MultiEmpresaWatcher parado');

      res.json({
        success: true,
        message: 'Monitoramento multiempresa parado com sucesso',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Monitoramento não está ativo',
      });
    }
  } catch (error) {    logError('Erro ao parar MultiEmpresaWatcher', error instanceof Error ? error : new Error('Unknown error'));

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/multi-empresa/status
 * Obtém o status do monitoramento
 */
router.get('/status', (req, res) => {
  try {
    if (multiEmpresaWatcher) {
      const stats = multiEmpresaWatcher.getStats();
      
      res.json({
        success: true,
        isRunning: stats.isRunning,
        stats,
      });
    } else {
      res.json({
        success: true,
        isRunning: false,
        stats: null,
      });
    }
  } catch (error) {    logError('Erro ao obter status do MultiEmpresaWatcher', error instanceof Error ? error : new Error('Unknown error'));

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/multi-empresa/empresas
 * Lista todas as empresas
 */
router.get('/empresas', async (req, res) => {
  try {
    const { ano, mes } = req.query;

    let empresas;
    if (ano) {
      empresas = await EmpresaService.getEmpresasByPeriod(
        parseInt(ano as string),
        mes ? parseInt(mes as string) : undefined
      );
    } else {
      empresas = await EmpresaService.listEmpresas();
    }

    res.json({
      success: true,
      empresas,
    });
  } catch (error) {    logError('Erro ao listar empresas', error instanceof Error ? error : new Error('Unknown error'));

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/multi-empresa/empresas/:cnpj
 * Obtém detalhes de uma empresa específica
 */
router.get('/empresas/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    const empresa = await EmpresaService.getEmpresaByCnpj(cnpj);

    if (!empresa) {
      return res.status(404).json({
        success: false,
        error: 'Empresa não encontrada',
      });
    }    return res.json({
      success: true,
      empresa,
    });  } catch (error) {
    logError('Erro ao buscar empresa', error instanceof Error ? error : new Error('Unknown error'));

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /api/multi-empresa/stats
 * Obtém estatísticas gerais
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await EmpresaService.getEmpresaStats();
    const watcherStats = multiEmpresaWatcher ? multiEmpresaWatcher.getStats() : null;

    res.json({
      success: true,
      empresaStats: stats,
      watcherStats,
    });
  } catch (error) {    logError('Erro ao obter estatísticas', error instanceof Error ? error : new Error('Unknown error'));

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /api/multi-empresa/clear-processed
 * Limpa a lista de arquivos processados (útil para reprocessar)
 */
router.post('/clear-processed', (req, res) => {
  try {
    if (multiEmpresaWatcher) {
      multiEmpresaWatcher.clearProcessedFiles();

      res.json({
        success: true,
        message: 'Lista de arquivos processados limpa com sucesso',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Monitoramento não está ativo',
      });
    }
  } catch (error) {    logError('Erro ao limpar arquivos processados', error instanceof Error ? error : new Error('Unknown error'));

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router; 