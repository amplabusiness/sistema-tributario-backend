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
exports.DevelopmentCoordinatorAgent = void 0;
const openai_1 = require("openai");
const cache_1 = require("../cache");
const document_indexer_1 = require("../document-indexer");
const logger_1 = require("../../utils/logger");
class DevelopmentCoordinatorAgent {
    constructor(config) {
        this.tasks = [];
        this.agents = new Map();
        this.config = config;
        this.openai = new openai_1.OpenAI({ apiKey: config.openaiApiKey });
        this.indexer = new document_indexer_1.DocumentIndexer();
        this.cache = new cache_1.CacheService();
    }
    async initializeAgents() {
        logger_1.logger.info('🤖 Inicializando agentes de desenvolvimento...');
        try {
            const { TestFixAgent } = await Promise.resolve().then(() => __importStar(require('./test-fix-agent')));
            const { FrontendDevAgent } = await Promise.resolve().then(() => __importStar(require('./frontend-dev-agent')));
            const { CodeQualityAgent } = await Promise.resolve().then(() => __importStar(require('./code-quality-agent')));
            const { DevOpsAgent } = await Promise.resolve().then(() => __importStar(require('./devops-agent')));
            this.agents.set('test-fix', new TestFixAgent({
                openaiApiKey: this.config.openaiApiKey
            }));
            this.agents.set('frontend-dev', new FrontendDevAgent({
                openaiApiKey: this.config.openaiApiKey,
                frontendPath: `${this.config.projectPath}/frontend`
            }));
            this.agents.set('code-quality', new CodeQualityAgent({
                openaiApiKey: this.config.openaiApiKey,
                projectPath: this.config.projectPath
            }));
            this.agents.set('devops', new DevOpsAgent({
                openaiApiKey: this.config.openaiApiKey,
                projectPath: this.config.projectPath,
                deploymentTargets: ['vercel', 'railway']
            }));
            logger_1.logger.info('✅ Todos os agentes inicializados com sucesso');
        }
        catch (error) {
            logger_1.logger.error('❌ Erro ao inicializar agentes:', error);
            throw error;
        }
    }
    async createDevelopmentPlan() {
        logger_1.logger.info('📋 Criando plano de desenvolvimento...');
        const tasks = [
            {
                id: 'task-001',
                type: 'test-fix',
                priority: 'critical',
                description: 'Corrigir problemas de testes (29/135 falhando)',
                status: 'pending',
                createdAt: new Date()
            },
            {
                id: 'task-002',
                type: 'code-quality',
                priority: 'high',
                description: 'Melhorar qualidade do código e aplicar padrões',
                status: 'pending',
                createdAt: new Date()
            },
            {
                id: 'task-003',
                type: 'frontend-dev',
                priority: 'high',
                description: 'Desenvolver frontend completo (15% concluído)',
                status: 'pending',
                createdAt: new Date()
            },
            {
                id: 'task-004',
                type: 'devops',
                priority: 'medium',
                description: 'Configurar CI/CD e deploy automático',
                status: 'pending',
                createdAt: new Date()
            },
            {
                id: 'task-005',
                type: 'monitoring',
                priority: 'medium',
                description: 'Configurar monitoramento e alertas',
                status: 'pending',
                createdAt: new Date()
            }
        ];
        const plan = {
            tasks,
            estimatedTime: 480,
            priority: 'high',
            dependencies: ['task-001', 'task-002']
        };
        this.tasks = tasks;
        logger_1.logger.info(`📋 Plano criado: ${tasks.length} tarefas, ${plan.estimatedTime} minutos estimados`);
        return plan;
    }
    async executeDevelopmentPlan() {
        logger_1.logger.info('🚀 Executando plano de desenvolvimento...');
        const startTime = Date.now();
        const completedTasks = [];
        const failedTasks = [];
        try {
            const sortedTasks = this.tasks.sort((a, b) => {
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            });
            for (const task of sortedTasks) {
                try {
                    logger_1.logger.info(`🔄 Executando tarefa: ${task.description}`);
                    task.status = 'in-progress';
                    task.assignedAgent = this.getAgentForTask(task.type);
                    const result = await this.executeTask(task);
                    task.status = 'completed';
                    task.result = result;
                    task.completedAt = new Date();
                    completedTasks.push(task);
                    logger_1.logger.info(`✅ Tarefa concluída: ${task.description}`);
                }
                catch (error) {
                    logger_1.logger.error(`❌ Erro na tarefa ${task.id}:`, error);
                    task.status = 'failed';
                    task.result = { error: error.message || 'Erro desconhecido' };
                    failedTasks.push(task);
                }
            }
            const totalTime = (Date.now() - startTime) / 1000 / 60;
            const result = {
                success: failedTasks.length === 0,
                completedTasks,
                failedTasks,
                totalTime,
                suggestions: this.generateSuggestions(completedTasks, failedTasks)
            };
            logger_1.logger.info(`🎉 Plano de desenvolvimento concluído em ${totalTime.toFixed(2)} minutos`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('❌ Erro na execução do plano:', error);
            throw error;
        }
    }
    async executeTask(task) {
        const agent = this.agents.get(task.assignedAgent);
        switch (task.type) {
            case 'test-fix':
                return await agent.fixTestIssues();
            case 'frontend-dev':
                return await agent.developCompleteFrontend();
            case 'code-quality':
                return await agent.runFullQualityAnalysis();
            case 'devops':
                return await agent.setupDevOpsPipeline();
            case 'monitoring':
                return await agent.setupMonitoring();
            default:
                throw new Error(`Tipo de tarefa não suportado: ${task.type}`);
        }
    }
    getAgentForTask(taskType) {
        const agentMap = {
            'test-fix': 'test-fix',
            'frontend-dev': 'frontend-dev',
            'code-quality': 'code-quality',
            'devops': 'devops',
            'monitoring': 'devops'
        };
        return agentMap[taskType] || 'code-quality';
    }
    generateSuggestions(completedTasks, failedTasks) {
        const suggestions = [];
        if (failedTasks.length > 0) {
            suggestions.push('Revisar e corrigir tarefas falhadas');
            suggestions.push('Implementar retry automático para tarefas críticas');
        }
        if (completedTasks.some(t => t.type === 'test-fix')) {
            suggestions.push('Implementar testes de regressão automáticos');
            suggestions.push('Configurar cobertura de testes mínima de 90%');
        }
        if (completedTasks.some(t => t.type === 'frontend-dev')) {
            suggestions.push('Implementar testes E2E para frontend');
            suggestions.push('Otimizar performance do frontend');
        }
        if (completedTasks.some(t => t.type === 'devops')) {
            suggestions.push('Configurar backup automático');
            suggestions.push('Implementar rollback automático');
        }
        suggestions.push('Configurar monitoramento contínuo');
        suggestions.push('Implementar feedback loop para melhorias');
        return suggestions;
    }
    async startContinuousDevelopment() {
        logger_1.logger.info('🔄 Iniciando desenvolvimento contínuo...');
        await this.initializeAgents();
        const continuousTasks = [
            {
                agent: 'test-fix',
                method: 'startContinuousFix',
                interval: 300000
            },
            {
                agent: 'frontend-dev',
                method: 'startContinuousDevelopment',
                interval: 600000
            },
            {
                agent: 'code-quality',
                method: 'startContinuousQualityMonitoring',
                interval: 300000
            },
            {
                agent: 'devops',
                method: 'startInfrastructureMonitoring',
                interval: 60000
            }
        ];
        for (const task of continuousTasks) {
            const agent = this.agents.get(task.agent);
            if (agent && agent[task.method]) {
                setInterval(async () => {
                    try {
                        await agent[task.method]();
                    }
                    catch (error) {
                        logger_1.logger.error(`Erro no ${task.agent}:`, error);
                    }
                }, task.interval);
            }
        }
        logger_1.logger.info('✅ Desenvolvimento contínuo iniciado');
    }
    async monitorProgress() {
        logger_1.logger.info('📊 Monitorando progresso do desenvolvimento...');
        setInterval(async () => {
            const pendingTasks = this.tasks.filter(t => t.status === 'pending');
            const inProgressTasks = this.tasks.filter(t => t.status === 'in-progress');
            const completedTasks = this.tasks.filter(t => t.status === 'completed');
            const failedTasks = this.tasks.filter(t => t.status === 'failed');
            const progress = (completedTasks.length / this.tasks.length) * 100;
            logger_1.logger.info(`📈 Progresso: ${progress.toFixed(1)}% (${completedTasks.length}/${this.tasks.length})`);
            logger_1.logger.info(`🔄 Em andamento: ${inProgressTasks.length}`);
            logger_1.logger.info(`⏳ Pendentes: ${pendingTasks.length}`);
            logger_1.logger.info(`❌ Falhadas: ${failedTasks.length}`);
            if (failedTasks.length > 0) {
                logger_1.logger.warn('⚠️ Tarefas falhadas detectadas, iniciando correção automática...');
                await this.autoFixFailedTasks(failedTasks);
            }
        }, 60000);
    }
    async autoFixFailedTasks(failedTasks) {
        for (const task of failedTasks) {
            try {
                logger_1.logger.info(`🔧 Tentando corrigir tarefa falhada: ${task.description}`);
                task.status = 'pending';
                delete task.result;
                delete task.completedAt;
                const result = await this.executeTask(task);
                task.status = 'completed';
                task.result = result;
                task.completedAt = new Date();
                logger_1.logger.info(`✅ Tarefa corrigida: ${task.description}`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Falha ao corrigir tarefa ${task.id}:`, error);
            }
        }
    }
    async generateDevelopmentReport() {
        const completedTasks = this.tasks.filter(t => t.status === 'completed');
        const failedTasks = this.tasks.filter(t => t.status === 'failed');
        const progress = (completedTasks.length / this.tasks.length) * 100;
        const report = `
# Relatório de Desenvolvimento Automatizado

## Resumo
- **Progresso Geral**: ${progress.toFixed(1)}%
- **Tarefas Concluídas**: ${completedTasks.length}/${this.tasks.length}
- **Tarefas Falhadas**: ${failedTasks.length}
- **Status**: ${progress === 100 ? '✅ Concluído' : '🔄 Em Andamento'}

## Tarefas Concluídas
${completedTasks.map(task => `
### ${task.description}
- **Tipo**: ${task.type}
- **Prioridade**: ${task.priority}
- **Agente**: ${task.assignedAgent}
- **Concluída em**: ${task.completedAt?.toLocaleString()}
`).join('\n')}

## Tarefas Falhadas
${failedTasks.map(task => `
### ${task.description}
- **Tipo**: ${task.type}
- **Prioridade**: ${task.priority}
- **Erro**: ${task.result?.error || 'Erro desconhecido'}
`).join('\n')}

## Próximos Passos
${this.generateSuggestions(completedTasks, failedTasks).map(suggestion => `- ${suggestion}`).join('\n')}
    `;
        return report;
    }
}
exports.DevelopmentCoordinatorAgent = DevelopmentCoordinatorAgent;
//# sourceMappingURL=development-coordinator-agent.js.map