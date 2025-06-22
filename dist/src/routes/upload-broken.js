"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const constants_1 = require("../constants");
const validation_1 = require("../middleware/validation");
const express_validator_1 = require("express-validator");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/xml',
            'text/xml',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de arquivo não suportado'));
        }
    }
});
const uploadValidation = [
    (0, express_validator_1.body)('empresa')
        .notEmpty()
        .withMessage('Empresa é obrigatória'),
    (0, express_validator_1.body)('cnpj')
        .isLength({ min: 14, max: 18 })
        .withMessage('CNPJ deve ter entre 14 e 18 caracteres'),
    (0, express_validator_1.body)('periodo')
        .matches(/^\d{4}-\d{2}$/)
        .withMessage('Período deve estar no formato YYYY-MM'),
    (0, express_validator_1.body)('tipo')
        .isIn(['NFe', 'CTe', 'SPED', 'ECD', 'ECF', 'CIAP', 'Inventario', 'PGDAS'])
        .withMessage('Tipo de documento inválido'),
];
router.post('/document', auth_1.authenticateToken, upload.single('file'), uploadValidation, validation_1.validateRequest, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Arquivo não fornecido',
                message: 'É necessário enviar um arquivo',
            });
        }
        const { empresa, cnpj, periodo, tipo } = req.body;
        const file = req.file;
        (0, logger_1.logInfo)('Documento recebido para upload', {
            originalName: file.originalname,
            size: file.size,
            empresa,
            cnpj,
            periodo,
            tipo,
            userId: req.user?.id
        });
        const processingResult = {
            id: `doc_${Date.now()}`,
            originalName: file.originalname,
            fileName: file.filename,
            filePath: file.path,
            size: file.size,
            empresa,
            cnpj,
            periodo,
            tipo,
            status: 'PENDING',
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user?.id,
        };
        res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            message: 'Documento enviado com sucesso e adicionado à fila de processamento',
            data: processingResult,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no upload de documento', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.post('/batch', auth_1.authenticateToken, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Arquivos não fornecidos',
                message: 'É necessário enviar pelo menos um arquivo',
            });
        }
        const files = req.files;
        const { empresa, cnpj, periodo } = req.body;
        (0, logger_1.logInfo)('Upload em lote iniciado', {
            fileCount: files.length,
            empresa,
            cnpj,
            periodo,
            userId: req.user?.id
        });
        const batchResult = {
            batchId: `batch_${Date.now()}`,
            totalFiles: files.length,
            empresa,
            cnpj,
            periodo,
            status: 'PROCESSING',
            createdAt: new Date().toISOString(),
            files: files.map(file => ({
                id: `doc_${Date.now()}_${Math.random()}`,
                originalName: file.originalname,
                fileName: file.filename,
                filePath: file.path,
                size: file.size,
                status: 'PENDING',
            })),
        };
        res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            message: `Lote de ${files.length} documentos enviado com sucesso`,
            data: batchResult,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no upload em lote', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/status/:batchId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { batchId } = req.params;
        const batchStatus = {
            batchId,
            status: 'PROCESSING',
            progress: 75,
            totalFiles: 10,
            processedFiles: 7,
            failedFiles: 1,
            completedFiles: 6,
            estimatedTimeRemaining: '2 minutos',
            lastUpdate: new Date().toISOString(),
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: batchStatus,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar status do lote', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, empresa, periodo } = req.query;
        const uploadHistory = {
            uploads: [
                {
                    id: 'doc_1',
                    originalName: 'NFe_001.xml',
                    empresa: 'Empresa Teste',
                    cnpj: '12.345.678/0001-90',
                    periodo: '2024-01',
                    tipo: 'NFe',
                    status: 'COMPLETED',
                    uploadedAt: '2024-01-15T10:30:00Z',
                    processedAt: '2024-01-15T10:35:00Z',
                },
                {
                    id: 'doc_2',
                    originalName: 'SPED_Fiscal.txt',
                    empresa: 'Empresa Teste',
                    cnpj: '12.345.678/0001-90',
                    periodo: '2024-01',
                    tipo: 'SPED',
                    status: 'PROCESSING',
                    uploadedAt: '2024-01-15T11:00:00Z',
                    processedAt: null,
                },
            ],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: 2,
                totalPages: 1,
            },
        };
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: uploadHistory,
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar histórico de uploads', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro interno do servidor',
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload-broken.js.map