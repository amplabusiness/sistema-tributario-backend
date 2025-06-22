"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsingRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const express_validator_1 = require("express-validator");
const xml_parser_1 = require("@/services/parsers/xml-parser");
const sped_fiscal_parser_1 = require("@/services/parsers/sped-fiscal-parser");
const document_indexer_1 = require("@/services/document-indexer");
const constants_1 = require("@/constants");
const prisma_1 = __importDefault(require("@/utils/prisma"));
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
exports.parsingRoutes = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/xml' ||
            file.mimetype === 'text/xml' ||
            file.mimetype === 'text/plain' ||
            file.originalname.endsWith('.xml') ||
            file.originalname.endsWith('.txt')) {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas arquivos XML e TXT são permitidos'));
        }
    },
});
const xmlParsingValidation = [
    (0, express_validator_1.body)('tipoDocumento')
        .isIn(['NFe', 'CTe', 'NFSe', 'MDFe'])
        .withMessage('Tipo de documento deve ser NFe, CTe, NFSe ou MDFe'),
    (0, express_validator_1.body)('empresaId')
        .isString()
        .notEmpty()
        .withMessage('ID da empresa é obrigatório'),
];
const spedParsingValidation = [
    (0, express_validator_1.body)('empresaId')
        .isString()
        .notEmpty()
        .withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('periodo')
        .isString()
        .matches(/^\d{4}-\d{2}$/)
        .withMessage('Período deve estar no formato YYYY-MM'),
];
router.post('/xml', auth_1.authenticateToken, upload.single('file'), (0, validation_1.validate)(xmlParsingValidation), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: constants_1.MESSAGES.ERROR.VALIDATION_ERROR,
                message: 'Arquivo não fornecido'
            });
        }
        const parser = new xml_parser_1.XMLParser();
        const indexador = new document_indexer_1.DocumentIndexer();
        const resultado = await parser.parse(req.file.buffer);
        const documentoIndexado = await indexador.indexarDocumento({ userId: req.user?.id || '',
            tipo: req.body.tipoDocumento,
            conteudo: resultado,
            empresaId: req.body.empresaId
        });
        if (!documentoIndexado) {
            throw new Error('Falha ao indexar documento');
        }
        if (!req.user?.id) {
            throw new Error('Usuário não autenticado');
        }
        await prisma_1.default.processamento.create({
            data: {
                userId: req.user.id,
                documentoId: documentoIndexado.id,
                status: 'PENDENTE',
                resultado: JSON.parse(JSON.stringify(resultado))
            }
        });
        return res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            data: {
                documentoId: documentoIndexado.id,
                resultado: resultado
            }
        });
    }
    catch (error) {
        console.error('Erro ao processar XML', error);
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.PARSING_ERROR,
            message: error.message
        });
    }
});
router.post('/sped', auth_1.authenticateToken, upload.single('arquivo'), (0, validation_1.validate)(spedParsingValidation), async (req, res) => {
    try {
        const { tipoSped, empresaId } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Arquivo não fornecido',
                message: 'É necessário enviar um arquivo SPED',
            });
        }
        console.log('Iniciando parsing de SPED', {
            userId: req.user?.id,
            tipoSped,
            empresaId,
            filename: file.originalname,
            size: file.size,
        });
        const spedContent = file.buffer.toString('utf-8');
        const dados = sped_fiscal_parser_1.SpedFiscalParser.parseContent(spedContent);
        const indexer = new document_indexer_1.DocumentIndexer();
        if (tipoSped === 'FISCAL') {
            await indexer.indexSpedFiscalData(file.filename, empresaId, dados);
        }
        else {
            await indexer.indexSpedContribuicoesData(file.filename, empresaId, dados);
        }
        const itens = sped_fiscal_parser_1.SpedFiscalParser.consolidarIcmsIpi(dados);
        const apuracoes = sped_fiscal_parser_1.SpedFiscalParser.consolidarApuracao(dados);
        console.log('Parsing de SPED concluído com sucesso', {
            userId: req.user?.id,
            tipoSped,
            registros: dados.registros.length,
            itens: itens.length,
            apuracoes: apuracoes.length,
        });
        return res.status(constants_1.HTTP_STATUS.OK).json({
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
    }
    catch (error) {
        console.error('Erro no parsing de SPED', error instanceof Error ? error : new Error('Unknown error'));
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao processar arquivo SPED',
        });
    }
});
router.get('/documents', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('dataInicio').isISO8601().withMessage('Data de início deve ser uma data válida'),
    (0, express_validator_1.body)('dataFim').isISO8601().withMessage('Data de fim deve ser uma data válida'),
], validation_2.validateRequest, async (req, res) => {
    try {
        const { empresaId, dataInicio, dataFim, tipoDocumento } = req.query;
        console.log('Buscando documentos indexados', {
            userId: req.user?.id,
            empresaId,
            dataInicio,
            dataFim,
            tipoDocumento,
        });
        const indexer = new document_indexer_1.DocumentIndexer();
        const documentos = await indexer.buscarDocumentos(empresaId, new Date(dataInicio), new Date(dataFim), tipoDocumento);
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Documentos encontrados com sucesso',
            data: {
                documentos,
                total: documentos.length,
            },
        });
    }
    catch (error) {
        console.error('Erro ao buscar documentos', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao buscar documentos',
        });
    }
});
router.get('/sped-fiscal/items', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('dataInicio').isString().notEmpty().withMessage('Data de início é obrigatória'),
    (0, express_validator_1.body)('dataFim').isString().notEmpty().withMessage('Data de fim é obrigatória'),
], validation_2.validateRequest, async (req, res) => {
    try {
        const { empresaId, dataInicio, dataFim } = req.query;
        console.log('Buscando itens de SPED Fiscal', {
            userId: req.user?.id,
            empresaId,
            dataInicio,
            dataFim,
        });
        const indexer = new document_indexer_1.DocumentIndexer();
        const itens = await indexer.buscarItensSpedFiscal(empresaId, dataInicio, dataFim);
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Itens de SPED Fiscal encontrados com sucesso',
            data: {
                itens,
                total: itens.length,
            },
        });
    }
    catch (error) {
        console.error('Erro ao buscar itens SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao buscar itens de SPED Fiscal',
        });
    }
});
router.get('/sped-fiscal/apuracoes', auth_1.authenticateToken, [
    (0, express_validator_1.body)('empresaId').isString().notEmpty().withMessage('ID da empresa é obrigatório'),
    (0, express_validator_1.body)('dataInicio').isString().notEmpty().withMessage('Data de início é obrigatória'),
    (0, express_validator_1.body)('dataFim').isString().notEmpty().withMessage('Data de fim é obrigatória'),
], validation_2.validateRequest, async (req, res) => {
    try {
        const { empresaId, dataInicio, dataFim } = req.query;
        console.log('Buscando apurações de SPED Fiscal', {
            userId: req.user?.id,
            empresaId,
            dataInicio,
            dataFim,
        });
        const indexer = new document_indexer_1.DocumentIndexer();
        const apuracoes = await indexer.buscarApuracaoSpedFiscal(empresaId, dataInicio, dataFim);
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Apurações de SPED Fiscal encontradas com sucesso',
            data: {
                apuracoes,
                total: apuracoes.length,
            },
        });
    }
    catch (error) {
        console.error('Erro ao buscar apurações SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao buscar apurações de SPED Fiscal',
        });
    }
});
router.post('/validate', auth_1.authenticateToken, [
    (0, express_validator_1.body)('dados').isObject().withMessage('Dados para validação são obrigatórios'),
], validation_2.validateRequest, async (req, res) => {
    try {
        const { dados } = req.body;
        console.log('Validando dados fiscais', {
            userId: req.user?.id,
        });
        const indexer = new document_indexer_1.DocumentIndexer();
        const validacao = await indexer.validarDadosFiscais(dados);
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Validação concluída',
            data: validacao,
        });
    }
    catch (error) {
        console.error('Erro na validação de dados fiscais', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao validar dados fiscais',
        });
    }
});
//# sourceMappingURL=parsing.js.map