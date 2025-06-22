/**
 * Rotas para parsing e indexação de documentos fiscais
 * Agente 2: Parsing & Leitura dos Documentos
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '@/middleware/auth';
import { validate } from '@/middleware/validation';
import { body } from 'express-validator';
import { XMLParser } from '@/services/parsers/xml-parser';
import { SpedFiscalParser } from '@/services/parsers/sped-fiscal-parser';
import { DocumentIndexer } from '@/services/document-indexer';

import { HTTP_STATUS, MESSAGES } from '@/constants';
import { AuthenticatedRequest } from '../types/auth';
import prisma from '@/utils/prisma';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos XML e TXT
    if (file.mimetype === 'application/xml' || 
        file.mimetype === 'text/xml' || 
        file.mimetype === 'text/plain' ||
        file.originalname.endsWith('.xml') ||
        file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML e TXT são permitidos'));
    }
  },
});

// Validações
const xmlParsingValidation = [
  body('tipoDocumento')
    .isIn(['NFe', 'CTe', 'NFSe', 'MDFe'])
    .withMessage('Tipo de documento deve ser NFe, CTe, NFSe ou MDFe'),
  body('empresaId')
    .isString()
    .notEmpty()
    .withMessage('ID da empresa é obrigatório'),
];

const spedParsingValidation = [
  body('empresaId')
    .isString()
    .notEmpty()
    .withMessage('ID da empresa é obrigatório'),
  body('periodo')
    .isString()
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('Período deve estar no formato YYYY-MM'),
];

/**
 * POST /api/v1/parsing/xml
 * Faz parsing de documento XML (NFe, CTe, etc.)
 */
router.post('/xml', 
  authenticateToken,
  upload.single('file'),
  validate(xmlParsingValidation),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: MESSAGES.ERROR.VALIDATION_ERROR,
          message: 'Arquivo não fornecido'
        });
      }

      const parser = new XMLParser();
      const indexador = new DocumentIndexer();

      // Parse XML
      const resultado = await parser.parse(req.file.buffer);

      // Indexar documento
      const documentoIndexado = await indexador.indexarDocumento({        userId: req.user?.id || '',  // Handle in validation
        tipo: req.body.tipoDocumento,
        conteudo: resultado,
        empresaId: req.body.empresaId
      });

      if (!documentoIndexado) {
        throw new Error('Falha ao indexar documento');
      }

      // Registrar processamento
      if (!req.user?.id) {
        throw new Error('Usuário não autenticado');
      }

      await prisma.processamento.create({
        data: {
          userId: req.user.id,
          documentoId: documentoIndexado.id,
          status: 'PENDENTE',
          resultado: JSON.parse(JSON.stringify(resultado))
        }
      });

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          documentoId: documentoIndexado.id,
          resultado: resultado
        }
      });

    } catch (error: any) {
      console.error('Erro ao processar XML', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.PARSING_ERROR,
        message: error.message
      });
    }
  }
);

/**
 * POST /api/v1/parsing/sped
 * Faz parsing de arquivo SPED (Fiscal ou Contribuições)
 */
router.post('/sped',
  authenticateToken,
  upload.single('arquivo'),
  validate(spedParsingValidation),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tipoSped, empresaId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Arquivo não fornecido',
          message: 'É necessário enviar um arquivo SPED',
        });
      }      console.log('Iniciando parsing de SPED', {
        userId: req.user?.id,
        tipoSped,
        empresaId,
        filename: file.originalname,
        size: file.size,
      });

      // Converter buffer para string
      const spedContent = file.buffer.toString('utf-8');

      // Fazer parsing do SPED
      const dados = SpedFiscalParser.parseContent(spedContent);

      // Indexar no banco de dados
      const indexer = new DocumentIndexer();
      
      if (tipoSped === 'FISCAL') {
        await indexer.indexSpedFiscalData(file.filename, empresaId, dados);
      } else {
        await indexer.indexSpedContribuicoesData(file.filename, empresaId, dados);
      }

      // Consolidar dados
      const itens = SpedFiscalParser.consolidarIcmsIpi(dados);
      const apuracoes = SpedFiscalParser.consolidarApuracao(dados);      console.log('Parsing de SPED concluído com sucesso', {
        userId: req.user?.id,
        tipoSped,
        registros: dados.registros.length,
        itens: itens.length,
        apuracoes: apuracoes.length,
      });      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Arquivo SPED processado com sucesso',
        data: {
          tipoSped,
          registros: dados.registros.length,
          itens: itens.length,
          apuracoes: apuracoes.length,
          estatisticas: {
            itens,
            apuracoes,
          },
        },
      });
    } catch (error) {
      console.error('Erro no parsing de SPED', error instanceof Error ? error : new Error('Unknown error'));
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro ao processar arquivo SPED',
      });
    }
  }
);

/**
 * GET /api/v1/parsing/documents
 * Busca documentos indexados por empresa e período
 */
router.get('/documents',
  authenticateToken,
  [
    body('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    body('dataInicio').isISO8601().withMessage('Data de início deve ser uma data válida'),
    body('dataFim').isISO8601().withMessage('Data de fim deve ser uma data válida'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, dataInicio, dataFim, tipoDocumento } = req.query;      console.log('Buscando documentos indexados', {
        userId: req.user?.id,
        empresaId,
        dataInicio,
        dataFim,
        tipoDocumento,
      });

      const indexer = new DocumentIndexer();
      const documentos = await indexer.buscarDocumentos(
        empresaId as string,
        new Date(dataInicio as string),
        new Date(dataFim as string),
        tipoDocumento as string
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Documentos encontrados com sucesso',
        data: {
          documentos,
          total: documentos.length,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar documentos', error instanceof Error ? error : new Error('Unknown error'));
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro ao buscar documentos',
      });
    }
  }
);

/**
 * GET /api/v1/parsing/sped-fiscal/items
 * Busca itens de SPED Fiscal por empresa e período
 */
router.get('/sped-fiscal/items',
  authenticateToken,
  [
    body('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    body('dataInicio').isString().notEmpty().withMessage('Data de início é obrigatória'),
    body('dataFim').isString().notEmpty().withMessage('Data de fim é obrigatória'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, dataInicio, dataFim } = req.query;      console.log('Buscando itens de SPED Fiscal', {
        userId: req.user?.id,
        empresaId,
        dataInicio,
        dataFim,
      });

      const indexer = new DocumentIndexer();
      const itens = await indexer.buscarItensSpedFiscal(
        empresaId as string,
        dataInicio as string,
        dataFim as string
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Itens de SPED Fiscal encontrados com sucesso',
        data: {
          itens,
          total: itens.length,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar itens SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro ao buscar itens de SPED Fiscal',
      });
    }
  }
);

/**
 * GET /api/v1/parsing/sped-fiscal/apuracoes
 * Busca apurações de SPED Fiscal por empresa e período
 */
router.get('/sped-fiscal/apuracoes',
  authenticateToken,
  [
    body('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    body('dataInicio').isString().notEmpty().withMessage('Data de início é obrigatória'),
    body('dataFim').isString().notEmpty().withMessage('Data de fim é obrigatória'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { empresaId, dataInicio, dataFim } = req.query;      console.log('Buscando apurações de SPED Fiscal', {
        userId: req.user?.id,
        empresaId,
        dataInicio,
        dataFim,
      });

      const indexer = new DocumentIndexer();
      const apuracoes = await indexer.buscarApuracaoSpedFiscal(
        empresaId as string,
        dataInicio as string,
        dataFim as string
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Apurações de SPED Fiscal encontradas com sucesso',
        data: {
          apuracoes,
          total: apuracoes.length,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar apurações SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro ao buscar apurações de SPED Fiscal',
      });
    }
  }
);

/**
 * POST /api/v1/parsing/validate
 * Valida dados fiscais (CST, CFOP, NCM, CNPJ)
 */
router.post('/validate',
  authenticateToken,
  [
    body('dados').isObject().withMessage('Dados para validacao são obrigatórios'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { dados } = req.body;      console.log('Validando dados fiscais', {
        userId: req.user?.id,
      });

      const indexer = new DocumentIndexer();
      const validacao = await indexer.validarDadosFiscais(dados);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Validação concluída',
        data: validacao,
      });
    } catch (error) {
      console.error('Erro na validacao de dados fiscais', error instanceof Error ? error : new Error('Unknown error'));
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro ao validar dados fiscais',
      });
    }
  }
);

export { router as parsingRoutes };
