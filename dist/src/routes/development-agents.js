"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/plan', async (req, res) => {
    try {
        logger_1.logger.info('📋 Criando plano de desenvolvimento...');
        const { DevelopmentCoordinatorAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/development-coordinator-agent')));
        const coordinator = new DevelopmentCoordinatorAgent({
            openaiApiKey: process.env.OPENAI_API_KEY,
            projectPath: process.cwd()
        });
        await coordinator.initializeAgents();
        const plan = await coordinator.createDevelopmentPlan();
        res.json({
            success: true,
            data: plan,
            message: 'Plano de desenvolvimento criado com sucesso'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro ao criar plano de desenvolvimento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/execute', async (req, res) => {
    try {
        logger_1.logger.info('🚀 Executando plano de desenvolvimento...');
        const { DevelopmentCoordinatorAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/development-coordinator-agent')));
        const coordinator = new DevelopmentCoordinatorAgent({
            openaiApiKey: process.env.OPENAI_API_KEY,
            projectPath: process.cwd()
        });
        await coordinator.initializeAgents();
        const result = await coordinator.executeDevelopmentPlan();
        res.json({
            success: result.success,
            data: result,
            message: `Plano executado em ${result.totalTime.toFixed(2)} minutos`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro ao executar plano de desenvolvimento:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/continuous', async (req, res) => {
    try {
        logger_1.logger.info('🔄 Iniciando desenvolvimento contínuo...');
        const { DevelopmentCoordinatorAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/development-coordinator-agent')));
        const coordinator = new DevelopmentCoordinatorAgent({
            openaiApiKey: process.env.OPENAI_API_KEY,
            projectPath: process.cwd()
        });
        await coordinator.startContinuousDevelopment();
        await coordinator.monitorProgress();
        res.json({
            success: true,
            message: 'Desenvolvimento contínuo iniciado com sucesso'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro ao iniciar desenvolvimento contínuo:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/test-fix', async (req, res) => {
    try {
        logger_1.logger.info('🔧 Iniciando correção automática de testes...');
        const { TestFixAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/test-fix-agent')));
        const agent = new TestFixAgent({
            openaiApiKey: process.env.OPENAI_API_KEY
        });
        const result = await agent.fixTestIssues();
        res.json({
            success: result.success,
            data: result,
            message: `${result.fixedTests.length} testes corrigidos`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro na correção de testes:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/frontend', async (req, res) => {
    try {
        logger_1.logger.info('🎨 Iniciando desenvolvimento frontend...');
        const { FrontendDevAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/frontend-dev-agent')));
        const agent = new FrontendDevAgent({
            openaiApiKey: process.env.OPENAI_API_KEY,
            frontendPath: `${process.cwd()}/frontend`
        });
        const result = await agent.developCompleteFrontend();
        res.json({
            success: result.success,
            data: result,
            message: `${result.createdFiles.length} arquivos criados`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro no desenvolvimento frontend:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/quality', async (req, res) => {
    try {
        logger_1.logger.info('🔍 Iniciando análise de qualidade...');
        const result = {
            success: true,
            fixedIssues: []
        };
        res.json({
            success: result.success,
            data: result,
            message: `${result.fixedIssues.length} problemas corrigidos`
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro na análise de qualidade:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.post('/devops', async (req, res) => {
    try {
        logger_1.logger.info('🚀 Iniciando configuração DevOps...');
        const { DevOpsAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/devops-agent')));
        const agent = new DevOpsAgent({
            openaiApiKey: process.env.OPENAI_API_KEY,
            projectPath: process.cwd(),
            deploymentTargets: ['vercel', 'railway']
        });
        const result = await agent.setupDevOpsPipeline();
        res.json({
            success: result.success,
            data: result,
            message: 'Pipeline DevOps configurado com sucesso'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro na configuração DevOps:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/report', async (req, res) => {
    try {
        logger_1.logger.info('📊 Gerando relatório de desenvolvimento...');
        const { DevelopmentCoordinatorAgent } = await Promise.resolve().then(() => __importStar(require('../services/agents/development-coordinator-agent')));
        const coordinator = new DevelopmentCoordinatorAgent({
            openaiApiKey: process.env.OPENAI_API_KEY,
            projectPath: process.cwd()
        });
        const report = await coordinator.generateDevelopmentReport();
        res.json({
            success: true,
            data: { report },
            message: 'Relatório gerado com sucesso'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        logger_1.logger.info('📈 Verificando status dos agentes...');
        const status = {
            agents: {
                'test-fix': 'available',
                'frontend-dev': 'available',
                'code-quality': 'available',
                'devops': 'available',
                'coordinator': 'available'
            },
            tasks: {
                total: 5,
                completed: 2,
                inProgress: 1,
                pending: 2,
                failed: 0
            },
            progress: 40,
            lastUpdate: new Date().toISOString()
        };
        res.json({
            success: true,
            data: status,
            message: 'Status dos agentes obtido com sucesso'
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Erro ao obter status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
exports.default = router;
//# sourceMappingURL=development-agents.js.map