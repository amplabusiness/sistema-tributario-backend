import express, { Request, Response } from 'express';
import { EmpresaService } from '../services/empresa-service';
import { DocumentProcessor } from '../services/document-processor';
import { ProtegeService } from '../services/protege-service';
import { CacheService } from '../services/cache';
import { IcmsApurador } from '../services/icms-apurador';
import { logInfo, logError } from '../utils/logger';

const router = express.Router();
const cache = new CacheService();

/**
 * GET /dashboard/stats
 * Estatísticas gerais do sistema
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Buscar estatísticas do cache ou calcular
    const cachedStats = await cache.get('dashboard:stats');
    if (cachedStats) {
      return res.json(cachedStats);
    }

    // Calcular estatísticas
    const empresas = await EmpresaService.listarEmpresas();
    const empresasAtivas = empresas.length; // Todas empresas ativas por padrão (sem campo status)

    // Contar documentos processados
    const documentos = await DocumentProcessor.listarDocumentos();
    const documentosProcessados = documentos.filter(d => d.status === 'CONCLUIDO').length;
    const documentosPendentes = documentos.filter(d => d.status === 'PROCESSANDO').length;

    // Contar cálculos ICMS
    const calculosIcmsRaw = await cache.get('calculos:icms:count');
    const calculosIcms = (typeof calculosIcmsRaw === 'number') ? calculosIcmsRaw : 0;
    const valorTotalIcmsRaw = await cache.get('calculos:icms:total');
    const valorTotalIcms = (typeof valorTotalIcmsRaw === 'number') ? valorTotalIcmsRaw : 0;

    // Contar cálculos PROTEGE
    const calculosProtegeRaw = await cache.get('calculos:protege:count');
    const calculosProtege = (typeof calculosProtegeRaw === 'number') ? calculosProtegeRaw : 0;
    const valorTotalProtegeRaw = await cache.get('calculos:protege:total');
    const valorTotalProtege = (typeof valorTotalProtegeRaw === 'number') ? valorTotalProtegeRaw : 0;

    const stats = {
      totalEmpresas: empresas.length,
      empresasAtivas,
      documentosProcessados,
      documentosPendentes,
      calculosIcms,
      calculosProtege,
      calculosRealizados: calculosIcms + calculosProtege,
      valorTotalIcms,
      valorTotalProtege,
      valorTotal: valorTotalIcms + valorTotalProtege,
      periodosDisponiveis: ['2024-01', '2024-02', '2024-03'],
      empresasRecentes: empresas.slice(0, 5).map(empresa => ({
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        cnpj: empresa.cnpj,
        nomeFantasia: empresa.nomeFantasia || 'N/A',
        ultimaAtualizacao: empresa.dataCadastro, // Use dataCadastro since updatedAt might not exist
        documentosProcessados: empresa._count?.documentos || 0,
        calculosRealizados: 0 // placeholder
      }))
    };

    // Cachear por 5 minutos
    await cache.set('dashboard:stats', stats, 300);

    return res.json(stats);
  } catch (error) {
    logError('Erro ao buscar estatísticas do dashboard:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar estatísticas do dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /dashboard/recent-activities
 * Atividades recentes do sistema
 */
router.get('/recent-activities', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = parseInt(limit.toString());

    // Buscar documentos recentes
    const documentosRecentes = await DocumentProcessor.listarDocumentos();
    const atividades = documentosRecentes
      .slice(0, limitNum)
      .map(doc => ({
        id: doc.id,
        tipo: 'documento_processado',
        descricao: `Documento ${doc.filename} processado`,
        timestamp: doc.dataProcessamento || doc.uploadedAt,
        status: doc.status,
        empresaId: doc.empresaId
      }));

    return res.json(atividades);
  } catch (error) {
    logError('Erro ao buscar atividades recentes:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar atividades recentes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /dashboard/empresa-summary/:id
 * Resumo detalhado de uma empresa
 */
router.get('/empresa-summary/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const empresa = await EmpresaService.buscarEmpresa(id);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Buscar estatísticas da empresa
    const documentos = await DocumentProcessor.buscarDocumentosPorEmpresa(id);
    const documentosProcessados = documentos.filter(d => d.status === 'CONCLUIDO').length;
    
    const summary = {
      empresa: {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        cnpj: empresa.cnpj,
        nomeFantasia: empresa.nomeFantasia || 'N/A',
        regimeTributario: empresa.regimeTributario || 'N/A'
      },
      documentos: {
        total: documentos.length,
        processados: documentosProcessados,
        pendentes: documentos.length - documentosProcessados
      },
      calculos: {
        icms: 0, // placeholder
        protege: 0 // placeholder
      }
    };

    return res.json(summary);
  } catch (error) {
    logError('Erro ao buscar resumo da empresa:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar resumo da empresa',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /dashboard/relatorios/valores-por-periodo
 * Relatório de valores por período
 */
router.get('/relatorios/valores-por-periodo', async (req: Request, res: Response) => {
  try {
    const { periodo_inicio, periodo_fim } = req.query;

    // Mock data for now - replace with actual calculation logic
    const valoresIcms = [
      { periodo: '2024-01', valor: 15000 },
      { periodo: '2024-02', valor: 18000 },
      { periodo: '2024-03', valor: 22000 }
    ];

    const valoresProtege = [
      { periodo: '2024-01', valor: 5000 },
      { periodo: '2024-02', valor: 6000 },
      { periodo: '2024-03', valor: 7000 }
    ];

    const relatorio = {
      labels: valoresIcms.map(v => v.periodo),
      valoresIcms: valoresIcms.map(v => v.valor),
      valoresProtege: valoresProtege.map(v => v.valor)
    };

    return res.json(relatorio);
  } catch (error) {
    logError('Erro ao gerar relatório de valores por período:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar relatório',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /dashboard/relatorios/processamento-por-periodo
 * Relatório de processamento por período
 */
router.get('/relatorios/processamento-por-periodo', async (req: Request, res: Response) => {
  try {
    const { periodo_inicio, periodo_fim } = req.query;

    // Mock data for now - replace with actual calculation logic
    const processamentoPorPeriodo = [
      { periodo: '2024-01', documentos: 45, calculos: 23, erros: 2 },
      { periodo: '2024-02', documentos: 52, calculos: 30, erros: 1 },
      { periodo: '2024-03', documentos: 61, calculos: 38, erros: 3 }
    ];

    return res.json(processamentoPorPeriodo);
  } catch (error) {
    logError('Erro ao gerar relatório de processamento:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar relatório de processamento',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /dashboard/acoes/executar-calculos
 * Executar cálculos em lote
 */
router.post('/acoes/executar-calculos', async (req: Request, res: Response) => {
  try {
    const { empresaIds, periodo, tipo } = req.body;

    // Implementar lógica de execução de cálculos em lote
    const resultado = {
      executados: empresaIds?.length || 0,
      sucesso: true,
      tempo: new Date().toISOString()
    };

    return res.json(resultado);
  } catch (error) {
    logError('Erro ao executar cálculos em lote:', error);
    return res.status(500).json({ 
      error: 'Erro ao executar cálculos',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /dashboard/acoes/gerar-relatorios
 * Gerar relatórios em lote
 */
router.post('/acoes/gerar-relatorios', async (req: Request, res: Response) => {
  try {
    const { empresaIds, periodo, formatos } = req.body;

    // Implementar lógica de geração de relatórios em lote
    const resultado = {
      gerados: formatos?.length || 0,
      sucesso: true,
      tempo: new Date().toISOString()
    };

    return res.json(resultado);
  } catch (error) {
    logError('Erro ao gerar relatórios em lote:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar relatórios',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
