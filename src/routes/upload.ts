/**
 * AGENTE 1: UPLOAD & ENTRADA DE DADOS
 * 
 * Este agente é responsável por:
 * - Upload automático de documentos fiscais
 * - Monitoramento de pastas, e-mails, APIs
 * - Validação de integridade dos arquivos
 * - Multiempresa e multianual
 * 
 * 100% AUTONOMO - ZERO INTERVENÇÃO HUMANA!
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';

const router = Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/xml',
      'text/xml',
      'application/json',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Validações
const uploadValidation = [
  body('empresa').notEmpty().withMessage('Nome da empresa é obrigatório'),
  body('cnpj').matches(/^\d{14}$/).withMessage('CNPJ deve ter 14 dígitos'),
  body('periodo').matches(/^\d{4}-\d{2}$/).withMessage('Período deve estar no formato YYYY-MM'),
  body('tipo').isIn(['sped', 'xml', 'planilha']).withMessage('Tipo deve ser sped, xml ou planilha'),
];

/**
 * POST /upload/single
 * Upload de arquivo único
 */
router.post('/single',
  authenticateToken,
  upload.single('document'),
  uploadValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Arquivo não fornecido',
          message: 'É necessário enviar um arquivo',
        });
      }

      const { empresa, cnpj, periodo, tipo } = req.body as {
        empresa: string;
        cnpj: string;
        periodo: string;
        tipo: string;
      };

      const fileInfo = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      };

      logInfo('Arquivo uploaded com sucesso', {
        file: fileInfo,
        empresa,
        cnpj,
        periodo,
        tipo,
        userId: (req as any).user?.id
      });

      // TODO: Processar arquivo em background
      // await addToQueue('document-processing', {
      //   filePath: req.file.path,
      //   fileName: req.file.originalname,
      //   empresaData: { empresa, cnpj },
      //   periodo,
      //   tipo,
      //   uploadedBy: req.user?.id,
      // });

      return res.status(201).json({
        success: true,
        message: 'Arquivo uploaded com sucesso',
        data: {
          fileId: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          status: 'uploaded'
        },
      });
    } catch (error) {
      logError('Erro no upload de arquivo:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao processar upload',
      });
    }
  }
);

/**
 * POST /upload/batch
 * Upload de múltiplos arquivos
 */
router.post('/batch',
  authenticateToken,
  upload.array('documents', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo fornecido',
          message: 'É necessário enviar pelo menos um arquivo',
        });
      }

      const { empresa, cnpj, periodo } = req.body as {
        empresa: string;
        cnpj: string;
        periodo: string;
      };

      const uploadedFiles = files.map(file => ({
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path
      }));

      logInfo('Batch upload realizado com sucesso', {
        files: uploadedFiles,
        empresa,
        cnpj,
        periodo,
        userId: (req as any).user?.id
      });

      return res.status(201).json({
        success: true,
        message: `${files.length} arquivos uploaded com sucesso`,
        data: {
          files: uploadedFiles,
          batchId: `batch-${Date.now()}`,
          status: 'uploaded'
        },
      });
    } catch (error) {
      logError('Erro no batch upload:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao processar batch upload',
      });
    }
  }
);

/**
 * GET /upload/status/:batchId
 * Status do processamento em lote
 */
router.get('/status/:batchId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;

      // TODO: Implementar busca real do status do batch
      const status = {
        batchId,
        status: 'processing',
        totalFiles: 5,
        processedFiles: 3,
        failedFiles: 0,
        startTime: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 120000).toISOString()
      };

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      logError('Erro ao buscar status do batch:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar status',
      });
    }
  }
);

/**
 * GET /upload/history
 * Histórico de uploads
 */
router.get('/history',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, empresa, periodo } = req.query;

      // TODO: Implementar busca real no banco de dados
      const uploads = [
        {
          id: '1',
          filename: 'documento-fiscal.xml',
          empresa: 'Empresa Teste LTDA',
          cnpj: '12345678000199',
          periodo: '2024-01',
          tipo: 'xml',
          status: 'processado',
          uploadedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          size: 1024000
        }
      ];

      const total = uploads.length;
      const totalPages = Math.ceil(total / Number(limit));
      const currentPage = Number(page);

      return res.status(200).json({
        success: true,
        data: {
          uploads,
          pagination: {
            currentPage,
            totalPages,
            totalItems: total,
            itemsPerPage: Number(limit)
          }
        },
      });
    } catch (error) {
      logError('Erro ao buscar histórico de uploads:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar histórico',
      });
    }
  }
);

export default router;
