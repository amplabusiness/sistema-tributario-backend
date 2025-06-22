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
const logger_1 = require("@/utils/logger");
const constants_1 = require("@/constants");
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
    (0, express_validator_1.body)('tipoSped')
        .isIn(['FISCAL', 'CONTRIBUICOES'])
        .withMessage('Tipo de SPED deve ser FISCAL ou CONTRIBUICOES'),
    (0, express_validator_1.body)('empresaId')
        .isString()
        .notEmpty()
        .withMessage('ID da empresa é obrigatório'),
];
router.post('/xml', auth_1.authenticateToken, upload.single('arquivo'), xmlParsingValidation, validation_1.validateRequest, async (req, res) => {
    try {
        const { tipoDocumento, empresaId } = req.body;
        const file = req.file;
        if (!file) {
            return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Arquivo não fornecido',
                message: 'É necessário enviar um arquivo XML',
            });
        }
        (0, logger_1.logInfo)('Iniciando parsing de XML', {
            userId: req.user?.userId,
            tipoDocumento,
            empresaId,
            filename: file.originalname,
            size: file.size,
        });
        const xmlContent = file.buffer.toString('utf-8');
        const xmlParser = new xml_parser_1.XMLParser();
        const dados = await xmlParser.parseXML(xmlContent, tipoDocumento);
        const indexer = new document_indexer_1.DocumentIndexer();
        await indexer.indexXMLData(file.filename, empresaId, dados);
        const validacao = await indexer.validarDadosFiscais(dados);
        (0, logger_1.logInfo)('Parsing de XML concluído com sucesso', {
            userId: req.user?.userId,
            tipoDocumento,
            numeroDocumento: dados.numeroDocumento,
            itens: dados.itens.length,
            validacao: validacao,
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
            success: true,
            message: 'Documento XML processado com sucesso',
            data: {
                documento: dados,
                validacao,
                estatisticas: {
                    itens: dados.itens.length,
                    valorTotal: dados.valorTotal,
                    impostos: dados.impostos,
                },
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro no parsing de XML', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao processar documento XML',
        });
    }
});
router.post('/sped', auth_1.authenticateToken, upload.single('arquivo'), spedParsingValidation, validation_1.validateRequest, async (req, res) => {
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
        (0, logger_1.logInfo)('Iniciando parsing de SPED', {
            userId: req.user?.userId,
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
        (0, logger_1.logInfo)('Parsing de SPED concluído com sucesso', {
            userId: req.user?.userId,
            tipoSped,
            registros: dados.registros.length,
            itens: itens.length,
            apuracoes: apuracoes.length,
        });
        res.status(constants_1.HTTP_STATUS.OK).json({
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
        (0, logger_1.logError)('Erro no parsing de SPED', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
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
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, dataInicio, dataFim, tipoDocumento } = req.query;
        (0, logger_1.logInfo)('Buscando documentos indexados', {
            userId: req.user?.userId,
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
        (0, logger_1.logError)('Erro ao buscar documentos', error instanceof Error ? error : new Error('Unknown error'));
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
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, dataInicio, dataFim } = req.query;
        (0, logger_1.logInfo)('Buscando itens de SPED Fiscal', {
            userId: req.user?.userId,
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
        (0, logger_1.logError)('Erro ao buscar itens SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
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
], validation_1.validateRequest, async (req, res) => {
    try {
        const { empresaId, dataInicio, dataFim } = req.query;
        (0, logger_1.logInfo)('Buscando apurações de SPED Fiscal', {
            userId: req.user?.userId,
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
        (0, logger_1.logError)('Erro ao buscar apurações SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao buscar apurações de SPED Fiscal',
        });
    }
});
router.post('/validate', auth_1.authenticateToken, [
    (0, express_validator_1.body)('dados').isObject().withMessage('Dados para validação são obrigatórios'),
], validation_1.validateRequest, async (req, res) => {
    try {
        const { dados } = req.body;
        (0, logger_1.logInfo)('Validando dados fiscais', {
            userId: req.user?.userId,
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
        (0, logger_1.logError)('Erro na validação de dados fiscais', error instanceof Error ? error : new Error('Unknown error'));
        res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: constants_1.MESSAGES.ERROR.INTERNAL_ERROR,
            message: 'Erro ao validar dados fiscais',
        });
    }
});
//# sourceMappingURL=parsing.js.map