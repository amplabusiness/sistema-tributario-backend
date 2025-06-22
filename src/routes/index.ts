/**
 * ROTAS PRINCIPAIS DA API - SISTEMA TRIBUTÁRIO 100% IA
 * 
 * Este arquivo centraliza todas as rotas dos agentes IA autonomos:
 * - Agente 1: Upload & Entrada de Dados
 * - Agente 2: Parsing & Leitura dos Documentos
 * - Agente 3: Apuração Tributária Estadual (ICMS)
 * - Agente 4: Apuração Tributária Federal (PIS/COFINS/IRPJ/CSLL)
 * - Agente 5: Estoque & CIAP
 * - Agente 6: Precificação & Margem
 * - Agente 7: Interface & Reporting
 * - Agentes de Desenvolvimento Automatizado
 * 
 * TODOS OS AGENTES SÃO 100% AUTONOMOS - ZERO INTERVENÇÃO HUMANA!
 */

import { Router } from 'express';
import { authRoutes } from './auth';
import uploadRoutes from './upload';
import { parsingRoutes } from './parsing';
import icmsRoutes from './icms';
import federalApuracaoRoutes from './federal-apuracao';
import estoqueCiapRoutes from './estoque-ciap';
import precificacaoMargemRoutes from './precificacao-margem';
import interfaceReportingRoutes from './interface-reporting';
import developmentAgentsRoutes from './development-agents';


const router = Router();

// Log de inicialização das rotas
console.log('🚀 API: Inicializando rotas do sistema tributário 100% IA');

// Rotas de autenticação
router.use('/auth', authRoutes);

// Agente 1: Upload & Entrada de Dados
router.use('/upload', uploadRoutes);

// Agente 2: Parsing & Leitura dos Documentos
router.use('/parsing', parsingRoutes);

// Agente 3: Apuração Tributária Estadual (ICMS)
router.use('/icms', icmsRoutes);

// Agente 4: Apuração Tributária Federal (PIS/COFINS/IRPJ/CSLL)
router.use('/federal', federalApuracaoRoutes);

// Agente 5: Estoque & CIAP
router.use('/estoque-ciap', estoqueCiapRoutes);

// Agente 6: Precificação & Margem
router.use('/precificacao', precificacaoMargemRoutes);

// Agente 7: Interface & Reporting
router.use('/dashboard', interfaceReportingRoutes);

// Agentes de Desenvolvimento Automatizado
router.use('/development', developmentAgentsRoutes);

// Rota de saúde da API
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

// Rota de informações do sistema
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Informações do Sistema Tributário 100% IA',
    system: {
      name: 'Sistema Tributário Brasileiro 100% IA',
      description: 'Primeiro sistema tributário totalmente autonomo do mundo',
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
      pricingAnalysis: 'Análise automática de precificacao e margem',
      reporting: 'Relatórios e dashboards automáticos',
      alerts: 'Alertas e notificações automáticas',
      automatedDevelopment: 'Desenvolvimento automatizado com agentes IA',
    },
    agents: {
      total: 11, // 7 agentes principais + 4 agentes de desenvolvimento
      status: 'Todos ativos e funcionando',
      autonomy: '100% autonomos',
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

// Middleware de tratamento de rotas não encontradas
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

console.log('✅ API: Rotas inicializadas com sucesso');

export default router; 