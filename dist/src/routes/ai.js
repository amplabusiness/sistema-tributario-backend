"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const constants_1 = require("@/constants");
const openai_service_1 = require("@/services/openai-service");
const router = (0, express_1.Router)();
exports.aiRoutes = router;
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
            success: false,
            message: 'Dados inválidos',
            errors: errors.array(),
        });
    }
    next();
};
router.post('/analisar-documento', [
    (0, express_validator_1.body)('conteudo').isString().notEmpty().withMessage('Conteúdo é obrigatório'),
    (0, express_validator_1.body)('tipoDocumento').optional().isString().withMessage('Tipo de documento deve ser string'),
], handleValidationErrors, async (req, res) => {
    try {
        const { conteudo, tipoDocumento = 'XML' } = req.body;
        console.log('Iniciando análise de documento fiscal', {
            tipoDocumento,
            tamanhoConteudo: conteudo.length,
        });
        const resultado = await (0, openai_service_1.analisarDocumentoFiscal)(conteudo, tipoDocumento);
        if (!resultado.success) {
            return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erro na análise do documento',
                error: resultado.error,
            });
        }
        return res.json({
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
    }
    catch (error) {
        console.error('Erro ao analisar documento fiscal', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/validar-dados', [
    (0, express_validator_1.body)('dados').isObject().withMessage('Dados são obrigatórios'),
    (0, express_validator_1.body)('tipoValidacao').optional().isString().withMessage('Tipo de validação deve ser string'),
], handleValidationErrors, async (req, res) => {
    try {
        const { dados, tipoValidacao = 'geral' } = req.body;
        console.log('Iniciando validação de dados fiscais', {
            tipoValidacao,
            campos: Object.keys(dados),
        });
        const resultado = await (0, openai_service_1.validarDadosFiscais)(dados, tipoValidacao);
        if (!resultado.success) {
            return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erro na validação dos dados',
                error: resultado.error,
            });
        }
        return res.json({
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
    }
    catch (error) {
        console.error('Erro ao validar dados fiscais', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/gerar-relatorio', [
    (0, express_validator_1.body)('dados').isObject().withMessage('Dados são obrigatórios'),
    (0, express_validator_1.body)('tipoRelatorio').optional().isString().withMessage('Tipo de relatório deve ser string'),
], handleValidationErrors, async (req, res) => {
    try {
        const { dados, tipoRelatorio = 'resumo' } = req.body;
        console.log('Iniciando geração de relatório fiscal', {
            tipoRelatorio,
            campos: Object.keys(dados),
        });
        const resultado = await (0, openai_service_1.gerarRelatorioFiscal)(dados, tipoRelatorio);
        if (!resultado.success) {
            return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erro na geração do relatório',
                error: resultado.error,
            });
        }
        return res.json({
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
    }
    catch (error) {
        console.error('Erro ao gerar relatório fiscal', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/analisar-xml', [
    (0, express_validator_1.body)('conteudoXML').isString().notEmpty().withMessage('Conteúdo XML é obrigatório'),
    (0, express_validator_1.body)('tipo').optional().isIn(['XML', 'SPED']).withMessage('Tipo deve ser XML ou SPED'),
], handleValidationErrors, async (req, res) => {
    try {
        const { conteudoXML, tipo = 'XML' } = req.body;
        console.log('Iniciando análise de XML/SPED', {
            tipo,
            tamanhoConteudo: conteudoXML.length,
        });
        const resultado = await (0, openai_service_1.analisarXML)(conteudoXML, tipo);
        if (!resultado.success) {
            return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erro na análise do XML',
                error: resultado.error,
            });
        }
        return res.json({
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
    }
    catch (error) {
        console.error('Erro ao analisar XML', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/corrigir-erros', [
    (0, express_validator_1.body)('documento').isObject().withMessage('Documento é obrigatório'),
    (0, express_validator_1.body)('erros').isArray().withMessage('Lista de erros é obrigatória'),
], handleValidationErrors, async (req, res) => {
    try {
        const { documento, erros } = req.body;
        console.log('Iniciando correção de erros', {
            quantidadeErros: erros.length,
            campos: Object.keys(documento),
        });
        const resultado = await (0, openai_service_1.corrigirErrosDocumento)(documento, erros);
        if (!resultado.success) {
            return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erro na correção dos erros',
                error: resultado.error,
            });
        }
        return res.json({
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
    }
    catch (error) {
        console.error('Erro ao corrigir erros', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.post('/requisicao-customizada', [
    (0, express_validator_1.body)('prompt.system').isString().notEmpty().withMessage('Prompt do sistema é obrigatório'),
    (0, express_validator_1.body)('prompt.user').isString().notEmpty().withMessage('Prompt do usuário é obrigatório'),
    (0, express_validator_1.body)('config').optional().isObject().withMessage('Config deve ser objeto'),
], handleValidationErrors, async (req, res) => {
    try {
        const { prompt, config = {} } = req.body;
        console.log('Iniciando requisição customizada', {
            tamanhoPrompt: prompt.user.length,
            config: Object.keys(config),
        });
        const resultado = await (0, openai_service_1.fazerRequisicaoCustomizada)(prompt, config);
        if (!resultado.success) {
            return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Erro na requisição customizada',
                error: resultado.error,
            });
        }
        return res.json({
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
    }
    catch (error) {
        console.error('Erro na requisição customizada', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        const status = await (0, openai_service_1.verificarStatus)();
        const estatisticas = (0, openai_service_1.obterEstatisticas)();
        return res.json({
            success: true,
            data: {
                status,
                estatisticas,
            },
        });
    }
    catch (error) {
        console.error('Erro ao verificar status da IA', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
router.get('/estatisticas', (req, res) => {
    try {
        const estatisticas = (0, openai_service_1.obterEstatisticas)();
        return res.json({
            success: true,
            data: estatisticas,
        });
    }
    catch (error) {
        console.error('Erro ao obter estatísticas da IA', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
    }
});
//# sourceMappingURL=ai.js.map