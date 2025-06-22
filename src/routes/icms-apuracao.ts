/**
 * ROTAS DA API - AGENTE 3: APURACAO ICMS 100% AUTONOMA
 * 
 * Este arquivo expõe endpoints REST para:
 * 1. Apuração ICMS automática
 * 2. Consulta de regras extraídas
 * 3. Relatórios gerados automaticamente
 * 4. Dashboard em tempo real
 * 5. ZERO intervenção humana - tudo 100% IA!
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { ICMSApuradorAgent, ICMSApuracao, ICMSRule } from '@/services/agents/icms-apurador-agent';

import { validateRequest } from '@/middleware/validation';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// Configuração do agente ICMS
const icmsAgent = new ICMSApuradorAgent({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  cacheEnabled: true,
  autoExtractRules: true,
  confidenceThreshold: 70, // Mínimo 70% de confiança
  maxRetries: 3,
  batchSize: 100,
});

/**
 * POST /api/icms/apurar
 * APURACAO ICMS 100% AUTONOMA
 * 
 * Endpoint principal que executa apuracao ICMS completa sem intervenção humana.
 * A IA:
 * 1. Extrai regras automaticamente
 * 2. Processa documentos
 * 3. Aplica regras
 * 4. Calcula totais
 * 5. Gera relatórios
 * 6. Retorna resultado completo
 */
router.post(
  '/apurar',
  authenticateToken,
  [
    body('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    body('periodo').isString().matches(/^\d{2}\/\d{4}$/).withMessage('Período deve estar no formato MM/AAAA'),
    body('documentos').optional().isArray().withMessage('Documentos deve ser um array'),
    body('configuracoes').optional().isObject().withMessage('Configurações deve ser um objeto'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, periodo, documentos, configuracoes } = req.body;

      console.log('🚀 API: Iniciando apuracao ICMS automática', {
        empresaId,
        periodo,
        documentos: documentos?.length || 0,
        userId: req.user?.id,
      });

      // Executar apuracao 100% automática
      const apuracao = await icmsAgent.apurarICMSAutomatico(
        empresaId,
        periodo,
        documentos
      );

      console.log('✅ API: Apuração ICMS concluída', {
        apuracaoId: apuracao.id,
        status: apuracao.status,
        confianca: apuracao.confianca,
        itens: apuracao.itens.length,
      });

      res.status(200).json({
        success: true,
        message: 'Apuração ICMS executada com sucesso',
        data: {
          apuracao,
          metadata: {
            tempoProcessamento: new Date().getTime() - new Date(apuracao.dataApuracao).getTime(),
            regrasAplicadas: apuracao.regrasAplicadas.length,
            itensProcessados: apuracao.itens.length,
            confianca: apuracao.confianca,
          },
        },
      });

    } catch (error) {
      console.error('❌ API: Erro na apuracao ICMS', error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(500).json({
        success: false,
        message: 'Erro na apuracao ICMS',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * GET /api/icms/apuracoes
 * CONSULTA DE APURAÇÕES REALIZADAS
 * 
 * Retorna lista de apurações ICMS realizadas pela IA
 */
router.get(
  '/apuracoes',
  authenticateToken,
  [
    query('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    query('periodo').optional().isString().withMessage('Período deve ser string'),
    query('status').optional().isIn(['pendente', 'processando', 'concluida', 'erro']).withMessage('Status inválido'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset deve ser >= 0'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, periodo, status, limit = 20, offset = 0 } = req.query;

      console.log('🔍 API: Consultando apurações ICMS', {
        empresaId,
        periodo,
        status,
        limit,
        offset,
        userId: req.user?.id,
      });

      // TODO: Implementar busca no banco de dados
      const apuracoes: ICMSApuracao[] = [];

      res.status(200).json({
        success: true,
        message: 'Apurações consultadas com sucesso',
        data: {
          apuracoes,
          pagination: {
            limit: Number(limit),
            offset: Number(offset),
            total: apuracoes.length,
          },
        },
      });

    } catch (error) {
      console.error('❌ API: Erro ao consultar apurações', error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(500).json({
        success: false,
        message: 'Erro ao consultar apurações',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * GET /api/icms/apuracoes/:id
 * CONSULTA DE APURACAO ESPECÍFICA
 * 
 * Retorna detalhes completos de uma apuracao ICMS
 */
router.get(
  '/apuracoes/:id',
  authenticateToken,
  [
    param('id').isString().notEmpty().withMessage('ID da apuracao é obrigatório'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      console.log('🔍 API: Consultando apuracao ICMS específica', {
        apuracaoId: id,
        userId: req.user?.id,
      });

      // TODO: Implementar busca no banco de dados
      const apuracao: ICMSApuracao | null = null;

      if (!apuracao) {
        return res.status(404).json({
          success: false,
          message: 'Apuração não encontrada',
        });
      }      return res.status(200).json({
        success: true,
        message: 'Apuração consultada com sucesso',
        data: { apuracao },
      });

    } catch (error) {
      console.error('❌ API: Erro ao consultar apuracao', error instanceof Error ? error : new Error('Unknown error'));
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao consultar apuracao',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * GET /api/icms/regras
 * CONSULTA DE REGRAS EXTRAÍDAS AUTOMATICAMENTE
 * 
 * Retorna regras ICMS extraídas automaticamente pela IA
 */
router.get(
  '/regras',
  authenticateToken,
  [
    query('empresaId').optional().isString().withMessage('ID da empresa deve ser string'),
    query('tipo').optional().isIn(['base_reduzida', 'credito_outorgado', 'protege', 'difal', 'ciap', 'st', 'isencao']).withMessage('Tipo inválido'),
    query('ativo').optional().isBoolean().withMessage('Ativo deve ser boolean'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, tipo, ativo } = req.query;

      console.log('🔍 API: Consultando regras ICMS', {
        empresaId,
        tipo,
        ativo,
        userId: req.user?.id,
      });

      // TODO: Implementar busca no banco de dados
      const regras: ICMSRule[] = [];

      res.status(200).json({
        success: true,
        message: 'Regras consultadas com sucesso',
        data: {
          regras,
          total: regras.length,
          porTipo: regras.reduce((acc, regra) => {
            acc[regra.tipo] = (acc[regra.tipo] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      });

    } catch (error) {
      console.error('❌ API: Erro ao consultar regras', error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(500).json({
        success: false,
        message: 'Erro ao consultar regras',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * GET /api/icms/dashboard
 * DASHBOARD EM TEMPO REAL
 * 
 * Retorna dashboard com métricas e gráficos da apuracao ICMS
 */
router.get(
  '/dashboard',
  authenticateToken,
  [
    query('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    query('periodo').optional().isString().withMessage('Período deve ser string'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, periodo } = req.query;

      console.log('📊 API: Gerando dashboard ICMS', {
        empresaId,
        periodo,
        userId: req.user?.id,
      });

      // TODO: Implementar geração de dashboard
      const dashboard = {
        resumo: {
          totalOperacoes: 0,
          valorTotal: 0,
          icmsDevido: 0,
          stDevido: 0,
          difalDevido: 0,
        },
        graficos: {
          porRegra: [],
          porPeriodo: [],
          porProduto: [],
        },
        alertas: [],
        confianca: 0,
      };

      res.status(200).json({
        success: true,
        message: 'Dashboard gerado com sucesso',
        data: { dashboard },
      });

    } catch (error) {
      console.error('❌ API: Erro ao gerar dashboard', error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar dashboard',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * POST /api/icms/regras/extrair
 * EXTRAÇÃO MANUAL DE REGRAS
 * 
 * Permite extração manual de regras de documentos específicos
 */
router.post(
  '/regras/extrair',
  authenticateToken,
  [
    body('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    body('documentos').isArray().withMessage('Documentos deve ser um array'),
    body('configuracoes').optional().isObject().withMessage('Configurações deve ser um objeto'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, documentos, configuracoes } = req.body;

      console.log('🔍 API: Extraindo regras ICMS manualmente', {
        empresaId,
        documentos: documentos.length,
        userId: req.user?.id,
      });

      // TODO: Implementar extração manual de regras
      const regrasExtraidas: ICMSRule[] = [];

      res.status(200).json({
        success: true,
        message: 'Regras extraídas com sucesso',
        data: {
          regras: regrasExtraidas,
          total: regrasExtraidas.length,
          confiancaMedia: regrasExtraidas.length > 0 
            ? regrasExtraidas.reduce((sum, r) => sum + r.confianca, 0) / regrasExtraidas.length 
            : 0,
        },
      });

    } catch (error) {
      console.error('❌ API: Erro ao extrair regras', error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(500).json({
        success: false,
        message: 'Erro ao extrair regras',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * GET /api/icms/relatorios/:apuracaoId
 * DOWNLOAD DE RELATÓRIOS GERADOS AUTOMATICAMENTE
 * 
 * Retorna relatórios técnicos gerados automaticamente pela IA
 */
router.get(
  '/relatorios/:apuracaoId',
  authenticateToken,
  [
    param('apuracaoId').isString().notEmpty().withMessage('ID da apuracao é obrigatório'),
    query('formato').optional().isIn(['pdf', 'excel', 'json']).withMessage('Formato inválido'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { apuracaoId } = req.params;
      const { formato = 'pdf' } = req.query;

      console.log('📄 API: Gerando relatório ICMS', {
        apuracaoId,
        formato,
        userId: req.user?.id,
      });

      // TODO: Implementar geração de relatórios
      const relatorio = {
        apuracaoId,
        formato,
        conteudo: 'Relatório gerado automaticamente pela IA',
        dataGeracao: new Date(),
      };

      res.status(200).json({
        success: true,
        message: 'Relatório gerado com sucesso',
        data: { relatorio },
      });

    } catch (error) {
      console.error('❌ API: Erro ao gerar relatório', error instanceof Error ? error : new Error('Unknown error'));
      
      res.status(500).json({
        success: false,
        message: 'Erro ao gerar relatório',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

export default router; 
