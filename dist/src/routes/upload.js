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
        }
        else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    }
});
const uploadValidation = [
    (0, express_validator_1.body)('empresa').notEmpty().withMessage('Nome da empresa é obrigatório'),
    (0, express_validator_1.body)('cnpj').matches(/^\d{14}$/).withMessage('CNPJ deve ter 14 dígitos'),
    (0, express_validator_1.body)('periodo').matches(/^\d{4}-\d{2}$/).withMessage('Período deve estar no formato YYYY-MM'),
    (0, express_validator_1.body)('tipo').isIn(['sped', 'xml', 'planilha']).withMessage('Tipo deve ser sped, xml ou planilha'),
];
router.post('/single', auth_1.authenticateToken, upload.single('document'), uploadValidation, validation_1.validateRequest, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Arquivo não fornecido',
                message: 'É necessário enviar um arquivo',
            });
        }
        const { empresa, cnpj, periodo, tipo } = req.body;
        const fileInfo = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path
        };
        (0, logger_1.logInfo)('Arquivo uploaded com sucesso', {
            file: fileInfo,
            empresa,
            cnpj,
            periodo,
            tipo,
            userId: req.user?.id
        });
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro no upload de arquivo:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Erro ao processar upload',
        });
    }
});
router.post('/batch', auth_1.authenticateToken, upload.array('documents', 10), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nenhum arquivo fornecido',
                message: 'É necessário enviar pelo menos um arquivo',
            });
        }
        const { empresa, cnpj, periodo } = req.body;
        const uploadedFiles = files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path
        }));
        (0, logger_1.logInfo)('Batch upload realizado com sucesso', {
            files: uploadedFiles,
            empresa,
            cnpj,
            periodo,
            userId: req.user?.id
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro no batch upload:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Erro ao processar batch upload',
        });
    }
});
router.get('/status/:batchId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { batchId } = req.params;
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar status do batch:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar status',
        });
    }
});
router.get('/history', auth_1.authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, empresa, periodo } = req.query;
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
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao buscar histórico de uploads:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar histórico',
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map