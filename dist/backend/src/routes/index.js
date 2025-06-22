"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const upload_1 = __importDefault(require("./upload"));
const parsing_1 = __importDefault(require("./parsing"));
const icms_1 = __importDefault(require("./icms"));
const federal_1 = __importDefault(require("./federal"));
const estoque_ciap_1 = __importDefault(require("./estoque-ciap"));
const precificacao_margem_1 = __importDefault(require("./precificacao-margem"));
const interface_reporting_1 = __importDefault(require("./interface-reporting"));
const development_agents_1 = __importDefault(require("./development-agents"));
const logger_1 = require("@/utils/logger");
const router = (0, express_1.Router)();
(0, logger_1.logInfo)('🚀 API: Inicializando rotas do sistema tributário 100% IA');
router.use('/auth', auth_1.default);
router.use('/upload', upload_1.default);
router.use('/parsing', parsing_1.default);
router.use('/icms', icms_1.default);
router.use('/federal', federal_1.default);
router.use('/estoque-ciap', estoque_ciap_1.default);
router.use('/precificacao', precificacao_margem_1.default);
router.use('/dashboard', interface_reporting_1.default);
router.use('/development', development_agents_1.default);
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Sistema Tributário 100% IA - Online',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        agents: {
            agent1: 'Upload & Entrada de Dados - ✅ Ativo',
            agent2: 'Parsing & Leitura - ✅ Ativo',
            agent3: 'Apuração ICMS - ✅ Ativo',
            agent4: 'Apuração Federal - ✅ Ativo',
            agent5: 'Estoque & CIAP - ✅ Ativo',
            agent6: 'Precificação & Margem - ✅ Ativo',
            agent7: 'Interface & Reporting - ✅ Ativo',
            development: 'Agentes de Desenvolvimento - ✅ Ativo',
        },
        autonomy: '100% IA - Zero intervenção humana',
    });
});
router.get('/info', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Informações do Sistema Tributário 100% IA',
        system: {
            name: 'Sistema Tributário Brasileiro 100% IA',
            description: 'Primeiro sistema tributário totalmente autônomo do mundo',
            version: '1.0.0',
            autonomy: '100% IA - Zero intervenção humana',
            language: 'Português Brasileiro',
            country: 'Brasil',
        },
        features: {
            automaticUpload: 'Upload automático de documentos fiscais',
            intelligentParsing: 'Parsing inteligente de XML, SPED, ECD, ECF',
            taxCalculation: 'Cálculo automático de ICMS, PIS, COFINS, IRPJ, CSLL',
            inventoryControl: 'Controle automático de estoque e CIAP',
            pricingAnalysis: 'Análise automática de precificação e margem',
            reporting: 'Relatórios e dashboards automáticos',
            alerts: 'Alertas e notificações automáticas',
            automatedDevelopment: 'Desenvolvimento automatizado com agentes IA',
        },
        agents: {
            total: 11,
            status: 'Todos ativos e funcionando',
            autonomy: '100% autônomos',
            development: {
                testFix: 'Correção automática de testes',
                frontendDev: 'Desenvolvimento frontend automatizado',
                codeQuality: 'Melhoria automática de qualidade',
                devOps: 'Configuração DevOps automatizada',
                coordinator: 'Coordenação de desenvolvimento',
            }
        },
        technology: {
            backend: 'Node.js + Express + TypeScript',
            database: 'PostgreSQL + Redis',
            ai: 'OpenAI GPT-4 + Claude',
            testing: 'Jest + TypeScript',
            monitoring: 'Winston + Prometheus',
            development: 'Agentes IA + Desenvolvimento Automatizado',
        },
    });
});
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        availableRoutes: {
            auth: '/api/auth',
            upload: '/api/upload',
            parsing: '/api/parsing',
            icms: '/api/icms',
            federal: '/api/federal',
            estoqueCiap: '/api/estoque-ciap',
            precificacao: '/api/precificacao',
            dashboard: '/api/dashboard',
            development: '/api/development',
            health: '/api/health',
            info: '/api/info',
        },
    });
});
(0, logger_1.logInfo)('✅ API: Rotas inicializadas com sucesso');
exports.default = router;
//# sourceMappingURL=index.js.map