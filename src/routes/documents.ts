import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';
import { HTTP_STATUS, MESSAGES, UPLOAD } from '../constants';
import { DOCUMENT_TYPES, DOCUMENT_STATUS, PROCESSING_STATUS, UPLOAD_MESSAGES } from '../constants/document';
import { addDocumentJob, addAIJob } from '../services/queue';
import { IntegrityValidator } from '../services/validators/integrity-validator';
import { validate } from '../middleware/validation';
import { body, query, param } from 'express-validator';
import { AuthenticatedRequest } from '../types/auth';
import { DocumentType, DocumentStatus, AllowedMimeType } from '../types/document';
import { DocumentJob, AIJob } from '../types/queue';
import { DocumentProcessor } from '../services/document-processor';

const router = Router();

// Configuração do validator
const validatorConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
  allowedExtensions: ['.xml', '.pdf', '.txt', '.csv', '.xlsx'],
  validateSignature: process.env.VALIDATE_SIGNATURE === 'true',
};

// Inicializar validator
const integrityValidator = new IntegrityValidator(validatorConfig);

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), UPLOAD.UPLOAD_DIR);
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: AuthenticatedRequest, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const mimeType = file.mimetype as AllowedMimeType;
  if (Object.values(UPLOAD.ALLOWED_MIME_TYPES).includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error(UPLOAD_MESSAGES.INVALID_TYPE));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD.MAX_FILE_SIZE,
  },
});

// Validações para o upload de documento
const uploadValidation = [
  body('documentType')
    .optional()
    .isIn(Object.values(DOCUMENT_TYPES))
    .withMessage('Tipo de documento inválido'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Descrição deve ter entre 1 e 500 caracteres'),
  body('empresaId')
    .optional()
    .isString()
    .trim()
    .withMessage('ID da empresa inválido')
];

// POST /api/v1/documents/upload - Upload de documento
router.post('/upload', 
  authenticateToken,
  upload.single('document'),
  validate(uploadValidation),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Verificar se arquivo foi enviado
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: UPLOAD_MESSAGES.NO_FILE,
          message: 'Por favor, selecione um arquivo para upload',
        });
      }

      const { description, documentType, empresaId } = req.body;

      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: MESSAGES.ERROR.UNAUTHORIZED,
          message: 'Usuário não autenticado',
        });
      }

      // Determinar tipo do documento baseado na extensão
      const fileExt = path.extname(req.file.originalname).toLowerCase();      let detectedType: DocumentType = 'XML';
      
      if (fileExt === '.pdf') detectedType = 'PDF';
      else if (fileExt === '.xlsx' || fileExt === '.xls') detectedType = 'EXCEL';
      else if (fileExt === '.csv') detectedType = 'CSV';
      else if (fileExt === '.json') detectedType = 'JSON';

      // Criar registro do documento
      const document = await prisma.document.create({
        data: {
          userId: req.user.id,
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimeType: req.file.mimetype,
          status: DOCUMENT_STATUS.PENDING,
          empresaId: empresaId || null,
          metadata: {
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user.id,
            documentType: documentType || detectedType,
            description: description || '',
          },
        },
      });

      // Log do upload bem-sucedido
      logInfo('Documento enviado com sucesso', {
        documentId: document.id,
        userId: req.user.id,
        filename: req.file.originalname,
        size: req.file.size,
        type: documentType || detectedType,
      });      // Adicionar à fila de processamento
      const jobData: Omit<DocumentJob, 'type'> & { type: DocumentType } = {
        documentId: document.id,
        userId: req.user.id,
        filePath: req.file.path,
        type: documentType || detectedType,
        metadata: {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
        }
      };
      
      await addDocumentJob(jobData);

      // Adicionar à fila de processamento IA
      await addAIJob({
        documentId: document.id,
        content: req.file.path,
        model: 'document-parser',
      });

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: UPLOAD_MESSAGES.SUCCESS,
        data: {
          documentId: document.id,
          filename: document.filename,
          originalName: document.originalName,
          size: document.size,
          status: document.status,
          uploadedAt: document.createdAt,
        }
      });

    } catch (error) {
      logError('Erro ao fazer upload do documento', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        filename: req.file?.originalname,
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: UPLOAD_MESSAGES.UPLOAD_ERROR,
        message: 'Erro ao fazer upload do documento',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
);

// GET /api/v1/documents - Lista documentos
router.get('/', 
  authenticateToken,
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(Object.values(DOCUMENT_STATUS)),
    query('documentType').optional().isIn(Object.values(DOCUMENT_TYPES)),
  ]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as DocumentStatus;
      const documentType = req.query.documentType as DocumentType;

      const where = {
        userId,
        ...(status && { status }),
        ...(documentType && { 
          metadata: {
            path: ['documentType'],
            equals: documentType
          }
        }),
      };

      const [total, documents] = await Promise.all([
        prisma.document.count({ where }),
        prisma.document.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          documents,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });

    } catch (error) {
      logError('Erro ao listar documentos', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: MESSAGES.ERROR.INTERNAL_ERROR,
        message: 'Erro ao listar documentos',
      });
    }
  }
);

// GET /api/v1/documents/:id - Buscar documento específico
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
      select: {        id: true,
        filename: true,
        originalName: true,
        // documentType: true, // TODO: Add to schema
        status: true,
        // fileSize: true, // TODO: Add to schema
        // description: true, // TODO: Add to schema
        createdAt: true,
        updatedAt: true,
        metadata: true,
        // processingResult: true, // TODO: Add to schema
        // errorMessage: true, // TODO: Add to schema
      },
    });

    if (!document) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Documento não encontrado',
      });
    }

    logInfo('Document retrieved successfully', {
      userId,
      documentId: id,
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: document,
    });
  } catch (error) {
    logError('Get document failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// DELETE /api/v1/documents/:id - Deletar documento
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Buscar documento
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Documento não encontrado',
      });
    }    // Deletar arquivo físico
    if (document.path && fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    // Deletar registro do banco
    await prisma.document.delete({
      where: { id },
    });

    logInfo('Document deleted successfully', {
      userId,
      documentId: id,
      filename: document.filename,
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Documento deletado com sucesso',
    });
  } catch (error) {
    logError('Delete document failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// POST /api/v1/documents/:id/retry - Reprocessar documento
router.post('/:id/retry', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Buscar documento
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!document) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: MESSAGES.ERROR.NOT_FOUND,
        message: 'Documento não encontrado',
      });
    }

    // Verificar se arquivo ainda existe
    if (!document.path || !fs.existsSync(document.path)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Arquivo não encontrado',
        message: 'O arquivo físico não existe mais',
      });
    }

    // Atualizar status para pending
    await prisma.document.update({
      where: { id },
      data: {        status: PROCESSING_STATUS.PENDING,
        // errorMessage: null, // TODO: Add to schema
        // processingResult: null, // TODO: Add to schema
      },
    });    // Adicionar à fila novamente
    await addDocumentJob({
      documentId: document.id,
      userId: document.userId,
      filePath: document.path || '',
      // documentType: document.documentType, // TODO: Add to schema
    });

    logInfo('Document retry initiated', {
      userId,
      documentId: id,
      filename: document.filename,
    });    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Documento adicionado à fila de reprocessamento',
    });
  } catch (error) {
    logError('Document retry failed', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: MESSAGES.ERROR.INTERNAL_ERROR,
      message: 'Erro interno do servidor',
    });
  }
});

// POST /api/v1/documents/upload - Upload de documentos
router.post('/upload', upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    const files = req.files as Express.Multer.File[];
    const results = [];

    for (const file of files) {
      try {
        logInfo('Processando upload de arquivo', {
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        });

        // Validação de integridade robusta
        const integrityResult = await integrityValidator.validateFile(file.path);

        if (!integrityResult.isValid) {
          logError('Falha na validacao de integridade', {
            filename: file.originalname,
            errors: integrityResult.errors
          });

          results.push({
            filename: file.originalname,
            success: false,
            error: 'Falha na validacao de integridade',
            details: integrityResult.errors
          });

          continue;
        }        // Enfileira para processamento automático
        await addAIJob({
          documentId: file.filename,
          content: file.originalname, // TODO: Read file content
          model: 'gpt-4',
          // TODO: Remove unused fields - adapt to AIJob interface
        });

        results.push({
          filename: file.originalname,
          success: true,
          message: 'Arquivo enfileirado para processamento',
          checksum: integrityResult.metadata.checksum,
          size: file.size
        });

        logInfo('Arquivo enfileirado com sucesso', {
          filename: file.originalname,
          checksum: integrityResult.metadata.checksum
        });

      } catch (error) {
        logError('Erro ao processar arquivo', {
          filename: file.originalname,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        results.push({
          filename: file.originalname,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;    return res.json({
      success: true,
      message: `Processados ${results.length} arquivos: ${successCount} sucessos, ${errorCount} erros`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount
      }
    });

  } catch (error) {
    logError('Erro no upload de documentos', { error });
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/documents/watchers/status - Verificar status dos watchers
router.get('/watchers/status', (req, res) => {
  const watchersStatus = {
    local: {
      enabled: true,
      paths: [
        path.resolve(process.cwd(), '../ICMS AVIZ 04-2025/ICMS 04-2025/ENTRADAS'),
        path.resolve(process.cwd(), '../ICMS AVIZ 04-2025/ICMS 04-2025/SAIDAS 01 A 15'),
        path.resolve(process.cwd(), '../ICMS AVIZ 04-2025/ICMS 04-2025/SAIDAS 16 A 30'),
      ],
      status: 'active'
    },
    email: {
      enabled: process.env.EMAIL_WATCHER_ENABLED === 'true',
      host: process.env.EMAIL_HOST,
      folders: process.env.EMAIL_FOLDERS?.split(',') || ['INBOX', 'FISCAL', 'SPED'],
      status: process.env.EMAIL_WATCHER_ENABLED === 'true' ? 'active' : 'disabled'
    },
    api: {
      enabled: process.env.API_WATCHER_ENABLED === 'true',
      endpoints: process.env.API_ENDPOINTS?.split(',') || [],
      status: process.env.API_WATCHER_ENABLED === 'true' ? 'active' : 'disabled'
    },
    googleDrive: {
      enabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
      folderIds: process.env.GOOGLE_DRIVE_FOLDER_IDS?.split(',') || [],
      status: process.env.GOOGLE_DRIVE_ENABLED === 'true' ? 'active' : 'disabled'
    },
    s3: {
      enabled: process.env.S3_WATCHER_ENABLED === 'true',
      bucket: process.env.S3_BUCKET,
      prefix: process.env.S3_PREFIX,
      status: process.env.S3_WATCHER_ENABLED === 'true' ? 'active' : 'disabled'
    },
    ftp: {
      enabled: process.env.FTP_WATCHER_ENABLED === 'true',
      host: process.env.FTP_HOST,
      directories: process.env.FTP_DIRECTORIES?.split(',') || [],
      status: process.env.FTP_WATCHER_ENABLED === 'true' ? 'active' : 'disabled'
    }
  };

  res.json({
    success: true,
    watchers: watchersStatus,
    integrity: {
      enabled: process.env.INTEGRITY_CHECK_ENABLED === 'true',
      algorithm: process.env.INTEGRITY_ALGORITHM || 'sha256',
      maxFileSize: process.env.INTEGRITY_MAX_FILE_SIZE || '100MB'
    }
  });
});

// POST /api/v1/documents/validate-integrity - Testar validacao de integridade
router.post('/validate-integrity', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    const file = req.file;
    logInfo('Testando validacao de integridade', {
      filename: file.originalname,
      size: file.size
    });

    const integrityResult = await integrityValidator.validateFile(file.path);    return res.json({
      success: true,
      filename: file.originalname,
      validation: integrityResult,
      summary: {
        isValid: integrityResult.isValid,
        errors: integrityResult.errors.length,
        warnings: integrityResult.warnings.length,
        checksum: integrityResult.metadata.checksum,
        size: file.size
      }
    });

  } catch (error) {
    logError('Erro na validacao de integridade', { error });
    return res.status(500).json({
      success: false,
      message: 'Erro na validacao de integridade',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/v1/documents/processed - Listar arquivos processados
router.get('/processed', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const source = req.query.source as string;

    // Aqui você implementaria a lógica para buscar arquivos processados do banco
    // Por enquanto, retornamos uma estrutura de exemplo
    res.json({
      success: true,
      data: {
        files: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      }
    });

  } catch (error) {
    logError('Erro ao listar arquivos processados', { error });
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/v1/documents/parse - Parsing manual de documento fiscal
router.post('/parse', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filePath, tipo, empresa, cnpj, periodo } = req.body;
    if (!filePath || !tipo || !empresa || !cnpj || !periodo) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros obrigatórios: filePath, tipo, empresa, cnpj, periodo',
      });
    }    // Importação direta do agente
    const { documentParserAgent } = require('../services/agents/document-parser-agent');
    const result = await documentParserAgent.processarDocumento(filePath, tipo, empresa, cnpj, periodo);
    
    logInfo('Documento processado com sucesso via parsing manual', {
      filePath,
      tipo,
      empresa,
      cnpj,
      periodo,
      result
    });    
    return res.json({
      success: true,
      message: 'Documento processado',
      data: result,
    });
  } catch (error) {
    logError('Erro no parsing manual de documento', error instanceof Error ? error : new Error('Unknown error'));
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar documento',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/documents/sped - Upload e processamento automático de SPED
router.post('/sped', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
    }    const filePath = req.file.path;
    const result = await DocumentProcessor.processSped(filePath);
    return res.json({ success: true, tipo: result.tipo, itens: result.itens, apuracao: result.apuracao });
  } catch (error) {
    return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' });
  }
});

// GET /api/documents/sped/:id - Consulta dos dados extraídos de um documento
router.get('/sped/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar documento
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        empresa: true
      }
    });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Documento não encontrado' });
    }

    const tipo = (document.metadata as any)?.tipo;
    let result: any = { document, tipo };

    if (tipo === 'SPED_CONTRIBUICOES') {
      // Buscar itens e apuracao de PIS/COFINS
      const [itens, apuracoes] = await Promise.all([
        prisma.spedContribuicoesItem.findMany({
          where: { documentId: id },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.spedContribuicoesApuracao.findMany({
          where: { documentId: id },
          orderBy: { createdAt: 'asc' }
        })
      ]);
      result.itens = itens;
      result.apuracoes = apuracoes;
    } else if (tipo === 'SPED_FISCAL') {
      // Buscar itens e apuracao de ICMS/IPI
      const [itens, apuracoes] = await Promise.all([
        prisma.spedFiscalItem.findMany({
          where: { documentId: id },
          orderBy: { createdAt: 'asc' }
        }),
        prisma.spedFiscalApuracao.findMany({
          where: { documentId: id },
          orderBy: { createdAt: 'asc' }
        })
      ]);
      result.itens = itens;
      result.apuracoes = apuracoes;
    }    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

export { router as documentsRoutes };