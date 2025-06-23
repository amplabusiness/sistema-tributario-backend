"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentsRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const document_1 = require("../constants/document");
const queue_1 = require("../services/queue");
const integrity_validator_1 = require("../services/validators/integrity-validator");
const validation_1 = require("../middleware/validation");
const express_validator_1 = require("express-validator");
const document_processor_1 = require("../services/document-processor");
const router = (0, express_1.Router)();
exports.documentsRoutes = router;
const validatorConfig = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
    allowedExtensions: ['.xml', '.pdf', '.txt', '.csv', '.xlsx'],
    validateSignature: process.env.VALIDATE_SIGNATURE === 'true',
};
const integrityValidator = new integrity_validator_1.IntegrityValidator(validatorConfig);
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), constants_1.UPLOAD.UPLOAD_DIR);
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const fileFilter = (req, file, cb) => {
    const mimeType = file.mimetype;
    if (Object.values(constants_1.UPLOAD.ALLOWED_MIME_TYPES).includes(mimeType)) {
        cb(null, true);
    }
    else {
        cb(new Error(document_1.UPLOAD_MESSAGES.INVALID_TYPE));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: constants_1.UPLOAD.MAX_FILE_SIZE,
    },
});
const uploadValidation = [
    (0, express_validator_1.body)('documentType')
        .optional()
        .isIn(Object.values(document_1.DOCUMENT_TYPES))
        .withMessage('Tipo de documento inválido'),
    (0, express_validator_1.body)('description')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Descrição deve ter entre 1 e 500 caracteres'),
    (0, express_validator_1.body)('empresaId')
        .optional()
        .isString()
        .trim()
        .withMessage('ID da empresa inválido')
];
router.post('/upload', auth_1.authenticateToken, upload.single('document'), (0, validation_1.validate)(uploadValidation), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: document_1.UPLOAD_MESSAGES.NO_FILE,
                message: 'Por favor, selecione um arquivo para upload',
            });
        }
        const { description, documentType, empresaId } = req.body;
        if (!req.user) {
            return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Usuário não autenticado',
            });
        }
        const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
        let detectedType = 'XML';
        if (fileExt === '.pdf')
            detectedType = 'PDF';
        else if (fileExt === '.xlsx' || fileExt === '.xls')
            detectedType = 'EXCEL';
        else if (fileExt === '.csv')
            detectedType = 'CSV';
        else if (fileExt === '.json')
            detectedType = 'JSON';
        const document = await prisma_1.default.document.create({
            data: {
                userId: req.user.id,
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                size: req.file.size,
                mimeType: req.file.mimetype,
                status: document_1.DOCUMENT_STATUS.PENDING,
                empresaId: empresaId || null,
                metadata: {
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: req.user.id,
                    documentType: documentType || detectedType,
                    description: description || '',
                },
            },
        });
        (0, logger_1.logInfo)('Documento enviado com sucesso', {
            documentId: document.id,
            userId: req.user.id,
            filename: req.file.originalname,
            size: req.file.size,
            type: documentType || detectedType,
        });
        const jobData = {
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
        await (0, queue_1.addDocumentJob)(jobData);
        await (0, queue_1.addAIJob)({
            documentId: document.id,
            content: req.file.path,
            model: 'document-parser',
        });
        return res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            message: document_1.UPLOAD_MESSAGES.SUCCESS,
            data: {
                documentId: document.id,
                filename: document.filename,
                originalName: document.originalName,
                size: document.size,
                status: document.status,
                uploadedAt: document.createdAt,
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao fazer upload do documento', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
            filename: req.file?.originalname,
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: document_1.UPLOAD_MESSAGES.UPLOAD_ERROR,
            message: 'Erro ao fazer upload do documento',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/', auth_1.authenticateToken, (0, validation_1.validate)([
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('status').optional().isIn(Object.values(document_1.DOCUMENT_STATUS)),
    (0, express_validator_1.query)('documentType').optional().isIn(Object.values(document_1.DOCUMENT_TYPES)),
]), async (req, res) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const status = req.query.status;
        const documentType = req.query.documentType;
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
            prisma_1.default.document.count({ where }),
            prisma_1.default.document.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return res.status(constants_1.HTTP_STATUS.OK).json({
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao listar documentos', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: req.user?.id,
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao listar documentos',
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const document = await prisma_1.default.document.findFirst({
            where: {
                id,
                userId,
            },
            select: { id: true,
                filename: true,
                originalName: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                metadata: true,
            },
        });
        if (!document) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Documento não encontrado',
            });
        }
        (0, logger_1.logInfo)('Document retrieved successfully', {
            userId,
            documentId: id,
        });
        return res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: document,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Get document failed', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const document = await prisma_1.default.document.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!document) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Documento não encontrado',
            });
        }
        if (document.path && fs_1.default.existsSync(document.path)) {
            fs_1.default.unlinkSync(document.path);
        }
        await prisma_1.default.document.delete({
            where: { id },
        });
        (0, logger_1.logInfo)('Document deleted successfully', {
            userId,
            documentId: id,
            filename: document.filename,
        });
        return res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Documento deletado com sucesso',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Delete document failed', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.post('/:id/retry', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const document = await prisma_1.default.document.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!document) {
            return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.NOT_FOUND,
                message: 'Documento não encontrado',
            });
        }
        if (!document.path || !fs_1.default.existsSync(document.path)) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Arquivo não encontrado',
                message: 'O arquivo físico não existe mais',
            });
        }
        await prisma_1.default.document.update({
            where: { id },
            data: { status: document_1.PROCESSING_STATUS.PENDING,
            },
        });
        await (0, queue_1.addDocumentJob)({
            documentId: document.id,
            userId: document.userId,
            filePath: document.path || '',
        });
        (0, logger_1.logInfo)('Document retry initiated', {
            userId,
            documentId: id,
            filename: document.filename,
        });
        return res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Documento adicionado à fila de reprocessamento',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Document retry failed', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.post('/upload', upload.array('documents', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado'
            });
        }
        const files = req.files;
        const results = [];
        for (const file of files) {
            try {
                (0, logger_1.logInfo)('Processando upload de arquivo', {
                    originalname: file.originalname,
                    size: file.size,
                    mimetype: file.mimetype
                });
                const integrityResult = await integrityValidator.validateFile(file.path);
                if (!integrityResult.isValid) {
                    (0, logger_1.logError)('Falha na validacao de integridade', {
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
                }
                await (0, queue_1.addAIJob)({
                    documentId: file.filename,
                    content: file.originalname,
                    model: 'gpt-4',
                });
                results.push({
                    filename: file.originalname,
                    success: true,
                    message: 'Arquivo enfileirado para processamento',
                    checksum: integrityResult.metadata.checksum,
                    size: file.size
                });
                (0, logger_1.logInfo)('Arquivo enfileirado com sucesso', {
                    filename: file.originalname,
                    checksum: integrityResult.metadata.checksum
                });
            }
            catch (error) {
                (0, logger_1.logError)('Erro ao processar arquivo', {
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
        const errorCount = results.length - successCount;
        return res.json({
            success: true,
            message: `Processados ${results.length} arquivos: ${successCount} sucessos, ${errorCount} erros`,
            results,
            summary: {
                total: results.length,
                success: successCount,
                errors: errorCount
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no upload de documentos', { error });
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/watchers/status', (req, res) => {
    const watchersStatus = {
        local: {
            enabled: true,
            paths: [
                path_1.default.resolve(process.cwd(), '../ICMS AVIZ 04-2025/ICMS 04-2025/ENTRADAS'),
                path_1.default.resolve(process.cwd(), '../ICMS AVIZ 04-2025/ICMS 04-2025/SAIDAS 01 A 15'),
                path_1.default.resolve(process.cwd(), '../ICMS AVIZ 04-2025/ICMS 04-2025/SAIDAS 16 A 30'),
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
router.post('/validate-integrity', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum arquivo enviado'
            });
        }
        const file = req.file;
        (0, logger_1.logInfo)('Testando validacao de integridade', {
            filename: file.originalname,
            size: file.size
        });
        const integrityResult = await integrityValidator.validateFile(file.path);
        return res.json({
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro na validacao de integridade', { error });
        return res.status(500).json({
            success: false,
            message: 'Erro na validacao de integridade',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/processed', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const source = req.query.source;
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao listar arquivos processados', { error });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});
router.post('/parse', auth_1.authenticateToken, async (req, res) => {
    try {
        const { filePath, tipo, empresa, cnpj, periodo } = req.body;
        if (!filePath || !tipo || !empresa || !cnpj || !periodo) {
            return res.status(400).json({
                success: false,
                message: 'Parâmetros obrigatórios: filePath, tipo, empresa, cnpj, periodo',
            });
        }
        const { documentParserAgent } = require('../services/agents/document-parser-agent');
        const result = await documentParserAgent.processarDocumento(filePath, tipo, empresa, cnpj, periodo);
        (0, logger_1.logInfo)('Documento processado com sucesso via parsing manual', {
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro no parsing manual de documento', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(500).json({
            success: false,
            message: 'Erro ao processar documento',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.post('/sped', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado' });
        }
        const filePath = req.file.path;
        const result = await document_processor_1.DocumentProcessor.processSped(filePath);
        return res.json({ success: true, tipo: result.tipo, itens: result.itens, apuracao: result.apuracao });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
});
router.get('/sped/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma_1.default.document.findUnique({
            where: { id },
            include: {
                empresa: true
            }
        });
        if (!document) {
            return res.status(404).json({ success: false, message: 'Documento não encontrado' });
        }
        const tipo = document.metadata?.tipo;
        let result = { document, tipo };
        if (tipo === 'SPED_CONTRIBUICOES') {
            const [itens, apuracoes] = await Promise.all([
                prisma_1.default.spedContribuicoesItem.findMany({
                    where: { documentId: id },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma_1.default.spedContribuicoesApuracao.findMany({
                    where: { documentId: id },
                    orderBy: { createdAt: 'asc' }
                })
            ]);
            result.itens = itens;
            result.apuracoes = apuracoes;
        }
        else if (tipo === 'SPED_FISCAL') {
            const [itens, apuracoes] = await Promise.all([
                prisma_1.default.spedFiscalItem.findMany({
                    where: { documentId: id },
                    orderBy: { createdAt: 'asc' }
                }),
                prisma_1.default.spedFiscalApuracao.findMany({
                    where: { documentId: id },
                    orderBy: { createdAt: 'asc' }
                })
            ]);
            result.itens = itens;
            result.apuracoes = apuracoes;
        }
        return res.json({ success: true, data: result });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
//# sourceMappingURL=documents.js.map