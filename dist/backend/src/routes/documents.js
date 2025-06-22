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
const client_1 = require("@prisma/client");
const auth_1 = require("@/middleware/auth");
const logger_1 = require("@/utils/logger");
const constants_1 = require("@/constants");
const batch_processor_1 = require("@/services/batch-processor");
const queue_1 = require("../services/queue");
const integrity_validator_1 = require("../services/validators/integrity-validator");
const document_processor_1 = require("../services/document-processor");
const router = (0, express_1.Router)();
exports.documentsRoutes = router;
const prisma = new client_1.PrismaClient();
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
    if (constants_1.UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Tipo de arquivo não permitido'));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: constants_1.UPLOAD.MAX_FILE_SIZE,
    },
});
const integrityValidator = new integrity_validator_1.IntegrityValidator();
router.post('/upload', auth_1.authenticateToken, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Nenhum arquivo enviado',
                message: 'Por favor, selecione um arquivo para upload',
            });
        }
        const { description, documentType } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.UNAUTHORIZED,
                message: 'Usuário não autenticado',
            });
        }
        const fileExt = path_1.default.extname(req.file.originalname).toLowerCase();
        let detectedType = constants_1.DOCUMENT_TYPES.XML;
        if (fileExt === '.pdf')
            detectedType = constants_1.DOCUMENT_TYPES.PDF;
        else if (fileExt === '.xlsx' || fileExt === '.xls')
            detectedType = constants_1.DOCUMENT_TYPES.EXCEL;
        else if (fileExt === '.csv')
            detectedType = constants_1.DOCUMENT_TYPES.CSV;
        else if (fileExt === '.json')
            detectedType = constants_1.DOCUMENT_TYPES.JSON;
        const document = await prisma.document.create({
            data: {
                userId,
                filename: req.file.filename,
                originalName: req.file.originalname,
                filePath: req.file.path,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                documentType: documentType || detectedType,
                description: description || '',
                status: constants_1.PROCESSING_STATUS.PENDING,
                metadata: {
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: userId,
                },
            },
        });
        await (0, batch_processor_1.addToQueue)('document-processing', {
            documentId: document.id,
            filePath: req.file.path,
            documentType: document.documentType,
        });
        (0, logger_1.logInfo)('Document uploaded successfully', {
            userId,
            documentId: document.id,
            filename: req.file.filename,
            fileSize: req.file.size,
        });
        res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Documento enviado com sucesso e adicionado à fila de processamento',
            data: {
                id: document.id,
                filename: document.filename,
                originalName: document.originalName,
                documentType: document.documentType,
                status: document.status,
                uploadedAt: document.createdAt,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Document upload failed', error instanceof Error ? error : new Error('Unknown error'));
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
        }
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao fazer upload do documento',
        });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const documentType = req.query.documentType;
        const where = { userId };
        if (status)
            where.status = status;
        if (documentType)
            where.documentType = documentType;
        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where,
                skip: offset,
                take: limit,
                select: {
                    id: true,
                    filename: true,
                    originalName: true,
                    documentType: true,
                    status: true,
                    fileSize: true,
                    description: true,
                    createdAt: true,
                    updatedAt: true,
                    metadata: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.document.count({ where }),
        ]);
        const totalPages = Math.ceil(total / limit);
        (0, logger_1.logInfo)('Documents listed successfully', {
            userId,
            page,
            limit,
            total,
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: documents,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('List documents failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const document = await prisma.document.findFirst({
            where: {
                id,
                userId,
            },
            select: {
                id: true,
                filename: true,
                originalName: true,
                documentType: true,
                status: true,
                fileSize: true,
                description: true,
                createdAt: true,
                updatedAt: true,
                metadata: true,
                processingResult: true,
                errorMessage: true,
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
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: document,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Get document failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
        const document = await prisma.document.findFirst({
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
        if (fs_1.default.existsSync(document.filePath)) {
            fs_1.default.unlinkSync(document.filePath);
        }
        await prisma.document.delete({
            where: { id },
        });
        (0, logger_1.logInfo)('Document deleted successfully', {
            userId,
            documentId: id,
            filename: document.filename,
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Documento deletado com sucesso',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Delete document failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
        const document = await prisma.document.findFirst({
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
        if (!fs_1.default.existsSync(document.filePath)) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Arquivo não encontrado',
                message: 'O arquivo físico não existe mais',
            });
        }
        await prisma.document.update({
            where: { id },
            data: {
                status: constants_1.PROCESSING_STATUS.PENDING,
                errorMessage: null,
                processingResult: null,
            },
        });
        await (0, batch_processor_1.addToQueue)('document-processing', {
            documentId: document.id,
            filePath: document.filePath,
            documentType: document.documentType,
        });
        (0, logger_1.logInfo)('Document retry initiated', {
            userId,
            documentId: id,
            filename: document.filename,
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Documento adicionado à fila de reprocessamento',
        });
    }
    catch (error) {
        (0, logger_1.logError)('Document retry failed', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
                    (0, logger_1.logError)('Falha na validação de integridade', {
                        filename: file.originalname,
                        errors: integrityResult.errors
                    });
                    results.push({
                        filename: file.originalname,
                        success: false,
                        error: 'Falha na validação de integridade',
                        details: integrityResult.errors
                    });
                    continue;
                }
                await (0, queue_1.addIATask)({
                    filePath: file.path,
                    source: 'manual-upload',
                    receivedAt: new Date().toISOString(),
                    metadata: {
                        originalname: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype,
                        checksum: integrityResult.checksum,
                        validation: integrityResult,
                    },
                });
                results.push({
                    filename: file.originalname,
                    success: true,
                    message: 'Arquivo enfileirado para processamento',
                    checksum: integrityResult.checksum,
                    size: file.size
                });
                (0, logger_1.logInfo)('Arquivo enfileirado com sucesso', {
                    filename: file.originalname,
                    checksum: integrityResult.checksum
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
        res.json({
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
        res.status(500).json({
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
        (0, logger_1.logInfo)('Testando validação de integridade', {
            filename: file.originalname,
            size: file.size
        });
        const integrityResult = await integrityValidator.validateFile(file.path);
        res.json({
            success: true,
            filename: file.originalname,
            validation: integrityResult,
            summary: {
                isValid: integrityResult.isValid,
                errors: integrityResult.errors.length,
                warnings: integrityResult.warnings.length,
                checksum: integrityResult.checksum,
                size: file.size
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro na validação de integridade', { error });
        res.status(500).json({
            success: false,
            message: 'Erro na validação de integridade',
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
        res.json({
            success: true,
            message: 'Documento processado',
            data: result,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no parsing manual de documento', error instanceof Error ? error : new Error('Unknown error'));
        res.status(500).json({
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
        res.json({ success: true, tipo: result.tipo, itens: result.itens, apuracao: result.apuracao });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Erro desconhecido' });
    }
});
router.get('/sped/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const document = await prisma.document.findUnique({
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
        }
        else if (tipo === 'SPED_FISCAL') {
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
        }
        res.json({ success: true, data: result });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
//# sourceMappingURL=documents.js.map