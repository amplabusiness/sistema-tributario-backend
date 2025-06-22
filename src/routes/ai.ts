/**
 * Rotas para servicos de IA (OpenAI/ChatGPT)
 * Análise, validacao e geração de relatórios fiscais
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

import { HTTP_STATUS } from '@/constants';
import {
  analisarDocumentoFiscal,
  validarDadosFiscais,
  gerarRelatorioFiscal,
  analisarXML,
  corrigirErrosDocumento,
  verificarStatus,
  obterEstatisticas,
  fazerRequisicaoCustomizada,
} from '@/services/openai-service';

const router = Router();

// Middleware para validar erros
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * POST /ai/analisar-documento
 * Analisa documento fiscal usando IA
 */
router.post(
  '/analisar-documento',
  [
    body('conteudo').isString().notEmpty().withMessage('Conteúdo é obrigatório'),
    body('tipoDocumento').optional().isString().withMessage('Tipo de documento deve ser string'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { conteudo, tipoDocumento = 'XML' } = req.body;

      console.log('Iniciando analise de documento fiscal', {
        tipoDocumento,
        tamanhoConteudo: conteudo.length,
      });

      const resultado = await analisarDocumentoFiscal(conteudo, tipoDocumento);

      if (!resultado.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na analise do documento',
          error: resultado.error,
        });
      }      return res.json({
        success: true,
        message: 'Documento analisado com sucesso',
        data: {
          analise: resultado.content,
          modelo: resultado.model,
          tokens: resultado.tokens,
          custo: resultado.cost,
          timestamp: resultado.timestamp,
        },
      });

    } catch (error) {
      console.error('Erro ao analisar documento fiscal', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * POST /ai/validar-dados
 * Valida dados fiscais usando IA
 */
router.post(
  '/validar-dados',
  [
    body('dados').isObject().withMessage('Dados são obrigatórios'),
    body('tipoValidacao').optional().isString().withMessage('Tipo de validacao deve ser string'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { dados, tipoValidacao = 'geral' } = req.body;

      console.log('Iniciando validacao de dados fiscais', {
        tipoValidacao,
        campos: Object.keys(dados),
      });

      const resultado = await validarDadosFiscais(dados, tipoValidacao);

      if (!resultado.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na validacao dos dados',
          error: resultado.error,
        });
      }      return res.json({
        success: true,
        message: 'Dados validados com sucesso',
        data: {
          validacao: resultado.content,
          modelo: resultado.model,
          tokens: resultado.tokens,
          custo: resultado.cost,
          timestamp: resultado.timestamp,
        },
      });

    } catch (error) {
      console.error('Erro ao validar dados fiscais', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * POST /ai/gerar-relatorio
 * Gera relatório fiscal usando IA
 */
router.post(
  '/gerar-relatorio',
  [
    body('dados').isObject().withMessage('Dados são obrigatórios'),
    body('tipoRelatorio').optional().isString().withMessage('Tipo de relatório deve ser string'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { dados, tipoRelatorio = 'resumo' } = req.body;

      console.log('Iniciando geração de relatório fiscal', {
        tipoRelatorio,
        campos: Object.keys(dados),
      });

      const resultado = await gerarRelatorioFiscal(dados, tipoRelatorio);

      if (!resultado.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na geração do relatório',
          error: resultado.error,
        });
      }      return res.json({
        success: true,
        message: 'Relatório gerado com sucesso',
        data: {
          relatorio: resultado.content,
          modelo: resultado.model,
          tokens: resultado.tokens,
          custo: resultado.cost,
          timestamp: resultado.timestamp,
        },
      });

    } catch (error) {
      console.error('Erro ao gerar relatório fiscal', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * POST /ai/analisar-xml
 * Analisa arquivo XML/SPED usando IA
 */
router.post(
  '/analisar-xml',
  [
    body('conteudoXML').isString().notEmpty().withMessage('Conteúdo XML é obrigatório'),
    body('tipo').optional().isIn(['XML', 'SPED']).withMessage('Tipo deve ser XML ou SPED'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { conteudoXML, tipo = 'XML' } = req.body;

      console.log('Iniciando analise de XML/SPED', {
        tipo,
        tamanhoConteudo: conteudoXML.length,
      });

      const resultado = await analisarXML(conteudoXML, tipo);

      if (!resultado.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na analise do XML',
          error: resultado.error,
        });
      }        return res.json({
        success: true,
        message: 'XML analisado com sucesso',
        data: {
          analise: resultado.content,
          modelo: resultado.model,
          tokens: resultado.tokens,
          custo: resultado.cost,
          timestamp: resultado.timestamp,
        },
      });

    } catch (error) {
      console.error('Erro ao analisar XML', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * POST /ai/corrigir-erros
 * Corrige erros em documentos usando IA
 */
router.post(
  '/corrigir-erros',
  [
    body('documento').isObject().withMessage('Documento é obrigatório'),
    body('erros').isArray().withMessage('Lista de erros é obrigatória'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { documento, erros } = req.body;

      console.log('Iniciando correção de erros', {
        quantidadeErros: erros.length,
        campos: Object.keys(documento),
      });

      const resultado = await corrigirErrosDocumento(documento, erros);

      if (!resultado.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na correção dos erros',
          error: resultado.error,
        });
      }      return res.json({
        success: true,
        message: 'Erros corrigidos com sucesso',
        data: {
          correcoes: resultado.content,
          modelo: resultado.model,
          tokens: resultado.tokens,
          custo: resultado.cost,
          timestamp: resultado.timestamp,
        },
      });

    } catch (error) {
      console.error('Erro ao corrigir erros', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * POST /ai/requisicao-customizada
 * Faz requisição customizada para a IA
 */
router.post(
  '/requisicao-customizada',
  [
    body('prompt.system').isString().notEmpty().withMessage('Prompt do sistema é obrigatório'),
    body('prompt.user').isString().notEmpty().withMessage('Prompt do usuário é obrigatório'),
    body('config').optional().isObject().withMessage('Config deve ser objeto'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { prompt, config = {} } = req.body;

      console.log('Iniciando requisição customizada', {
        tamanhoPrompt: prompt.user.length,
        config: Object.keys(config),
      });

      const resultado = await fazerRequisicaoCustomizada(prompt, config);

      if (!resultado.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Erro na requisição customizada',
          error: resultado.error,
        });
      }      return res.json({
        success: true,
        message: 'Requisição customizada concluída',
        data: {
          resposta: resultado.content,
          modelo: resultado.model,
          tokens: resultado.tokens,
          custo: resultado.cost,
          timestamp: resultado.timestamp,
        },
      });

    } catch (error) {
      console.error('Erro na requisição customizada', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
);

/**
 * GET /ai/status
 * Verifica status do serviço de IA
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await verificarStatus();
    const estatisticas = obterEstatisticas();    return res.json({
      success: true,
      data: {
        status,
        estatisticas,
      },
    });
  } catch (error) {
    console.error('Erro ao verificar status da IA', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

/**
 * GET /ai/estatisticas
 * Obtém estatísticas de uso da IA
 */
router.get('/estatisticas', (req, res) => {
  try {
    const estatisticas = obterEstatisticas();    return res.json({
      success: true,
      data: estatisticas,
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas da IA', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

export { router as aiRoutes };
