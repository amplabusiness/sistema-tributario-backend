"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multi_empresa_watcher_1 = require("../services/multi-empresa-watcher");
const empresa_service_1 = require("../services/empresa-service");
const logger_1 = __importDefault(require("../utils/logger"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
let multiEmpresaWatcher = null;
router.use(auth_1.authenticateToken);
router.post('/start', async (req, res) => {
    try {
        const { basePath, config } = req.body;
        if (!basePath) {
            return res.status(400).json({
                success: false,
                error: 'basePath é obrigatório',
            });
        }
        const watcherConfig = {
            basePath,
            supportedExtensions: config?.supportedExtensions || ['.xml', '.txt', '.sped', '.ecd', '.ecf', '.pdf', '.xlsx', '.xls'],
            maxFileSize: config?.maxFileSize || 100 * 1024 * 1024,
            scanInterval: config?.scanInterval || 30000,
            empresaFolders: config?.empresaFolders || ['empresa', 'company', 'cnpj', 'empresas'],
            yearFolders: config?.yearFolders || ['2024', '2025', '2023', '2022', '2021'],
        };
        if (multiEmpresaWatcher) {
            multiEmpresaWatcher.stop();
        }
        multiEmpresaWatcher = new multi_empresa_watcher_1.MultiEmpresaWatcher(watcherConfig);
        await multiEmpresaWatcher.start();
        logger_1.default.info('MultiEmpresaWatcher iniciado', {
            basePath,
            config: watcherConfig,
        });
        res.json({
            success: true,
            message: 'Monitoramento multiempresa iniciado com sucesso',
            config: watcherConfig,
        });
    }
    catch (error) {
        logger_1.default.error('Erro ao iniciar MultiEmpresaWatcher', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
router.post('/stop', (req, res) => {
    try {
        if (multiEmpresaWatcher) {
            multiEmpresaWatcher.stop();
            multiEmpresaWatcher = null;
            logger_1.default.info('MultiEmpresaWatcher parado');
            res.json({
                success: true,
                message: 'Monitoramento multiempresa parado com sucesso',
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Monitoramento não está ativo',
            });
        }
    }
    catch (error) {
        logger_1.default.error('Erro ao parar MultiEmpresaWatcher', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
router.get('/status', (req, res) => {
    try {
        if (multiEmpresaWatcher) {
            const stats = multiEmpresaWatcher.getStats();
            res.json({
                success: true,
                isRunning: stats.isRunning,
                stats,
            });
        }
        else {
            res.json({
                success: true,
                isRunning: false,
                stats: null,
            });
        }
    }
    catch (error) {
        logger_1.default.error('Erro ao obter status do MultiEmpresaWatcher', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
router.get('/empresas', async (req, res) => {
    try {
        const { ano, mes } = req.query;
        let empresas;
        if (ano) {
            empresas = await empresa_service_1.EmpresaService.getEmpresasByPeriod(parseInt(ano), mes ? parseInt(mes) : undefined);
        }
        else {
            empresas = await empresa_service_1.EmpresaService.listEmpresas();
        }
        res.json({
            success: true,
            empresas,
        });
    }
    catch (error) {
        logger_1.default.error('Erro ao listar empresas', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
router.get('/empresas/:cnpj', async (req, res) => {
    try {
        const { cnpj } = req.params;
        const empresa = await empresa_service_1.EmpresaService.getEmpresaByCnpj(cnpj);
        if (!empresa) {
            return res.status(404).json({
                success: false,
                error: 'Empresa não encontrada',
            });
        }
        res.json({
            success: true,
            empresa,
        });
    }
    catch (error) {
        logger_1.default.error('Erro ao buscar empresa', {
            error: error instanceof Error ? error.message : 'Unknown error',
            cnpj: req.params.cnpj,
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const stats = await empresa_service_1.EmpresaService.getEmpresaStats();
        const watcherStats = multiEmpresaWatcher ? multiEmpresaWatcher.getStats() : null;
        res.json({
            success: true,
            empresaStats: stats,
            watcherStats,
        });
    }
    catch (error) {
        logger_1.default.error('Erro ao obter estatísticas', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
router.post('/clear-processed', (req, res) => {
    try {
        if (multiEmpresaWatcher) {
            multiEmpresaWatcher.clearProcessedFiles();
            res.json({
                success: true,
                message: 'Lista de arquivos processados limpa com sucesso',
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Monitoramento não está ativo',
            });
        }
    }
    catch (error) {
        logger_1.default.error('Erro ao limpar arquivos processados', {
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
        });
    }
});
exports.default = router;
//# sourceMappingURL=multi-empresa.js.map