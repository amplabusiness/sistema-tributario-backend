#!/usr/bin/env node

/**
 * ⚡ TESTE DE CARGA DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA
 * ==========================================================
 * 
 * Este script executa testes de carga nos endpoints
 * para verificar performance e estabilidade sob stress.
 */

const { testEndpoint } = require('./test-endpoints.js');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  baseUrl: process.env.API_URL || 'https://backend-sergio-2143-sergio-carneiro-leaos-projects.vercel.app',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
  duration: parseInt(process.env.TEST_DURATION) || 60000, // 1 minuto
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 10000, // 10 segundos
  outputFile: 'load-test-report.json',
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Estatísticas globais
let stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null
};

// Cenários de teste
const testScenarios = [
  {
    name: 'Health Check Load',
    url: `${CONFIG.baseUrl}/health`,
    method: 'GET',
    weight: 30 // 30% das requisições
  },
  {
    name: 'API Status Load',
    url: `${CONFIG.baseUrl}/api/status`,
    method: 'GET',
    weight: 25 // 25% das requisições
  },
  {
    name: 'Documents List Load',
    url: `${CONFIG.baseUrl}/api/documents`,
    method: 'GET',
    weight: 20 // 20% das requisições
  },
  {
    name: 'Upload File Load',
    url: `${CONFIG.baseUrl}/api/upload`,
    method: 'POST',
    body: JSON.stringify({
      fileName: `load-test-${Date.now()}.txt`,
      fileType: 'AVIZ',
      content: 'Load test content',
      empresaId: 'load-test-empresa'
    }),
    weight: 15 // 15% das requisições
  },
  {
    name: 'ICMS Analysis Load',
    url: `${CONFIG.baseUrl}/api/icms/analyze`,
    method: 'POST',
    body: JSON.stringify({
      empresaId: 'load-test-empresa',
      periodo: '04/2025'
    }),
    weight: 10 // 10% das requisições
  }
];

// Função para selecionar cenário baseado no peso
function selectScenario() {
  const random = Math.random() * 100;
  let cumulativeWeight = 0;
  
  for (const scenario of testScenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      return scenario;
    }
  }
  
  return testScenarios[0]; // Fallback
}

// Função para calcular estatísticas
function calculateStats(responseTimes) {
  if (responseTimes.length === 0) return {};
  
  const sorted = responseTimes.sort((a, b) => a - b);
  const sum = responseTimes.reduce((acc, time) => acc + time, 0);
  const avg = sum / responseTimes.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  
  return {
    count: responseTimes.length,
    average: avg.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
    median: median.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2)
  };
}

// Função para simular usuário
async function simulateUser(userId) {
  const userStats = {
    userId,
    requests: 0,
    successful: 0,
    failed: 0,
    responseTimes: [],
    errors: []
  };
  
  const startTime = Date.now();
  const endTime = startTime + CONFIG.duration;
  
  while (Date.now() < endTime) {
    try {
      const scenario = selectScenario();
      const requestStart = Date.now();
      
      const result = await testEndpoint(
        `${scenario.name} (User ${userId})`,
        scenario.url,
        {
          method: scenario.method,
          body: scenario.body
        }
      );
      
      const responseTime = Date.now() - requestStart;
      
      // Atualizar estatísticas globais
      stats.totalRequests++;
      stats.responseTimes.push(responseTime);
      
      if (result.success) {
        stats.successfulRequests++;
        userStats.successful++;
      } else {
        stats.failedRequests++;
        userStats.failed++;
        stats.errors.push({
          scenario: scenario.name,
          userId,
          error: result.error || `Status ${result.status}`,
          timestamp: new Date().toISOString()
        });
      }
      
      userStats.requests++;
      userStats.responseTimes.push(responseTime);
      
      // Pequena pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
    } catch (error) {
      stats.totalRequests++;
      stats.failedRequests++;
      userStats.failed++;
      userStats.errors.push({
        scenario: 'Unknown',
        userId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (CONFIG.verbose) {
        console.log(`${colors.red}❌ User ${userId} error: ${error.message}${colors.reset}`);
      }
    }
  }
  
  return userStats;
}

// Função para executar teste de carga
async function runLoadTest() {
  console.log(`${colors.bright}${colors.cyan}⚡ TESTE DE CARGA DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA${colors.reset}`);
  console.log(`${colors.cyan}==============================================================${colors.reset}`);
  console.log(`${colors.blue}👥 Usuários concorrentes: ${CONFIG.concurrentUsers}${colors.reset}`);
  console.log(`${colors.blue}⏱️  Duração: ${CONFIG.duration / 1000}s${colors.reset}`);
  console.log(`${colors.blue}📈 Ramp-up time: ${CONFIG.rampUpTime / 1000}s${colors.reset}`);
  console.log(`${colors.blue}🌐 URL Base: ${CONFIG.baseUrl}${colors.reset}`);
  console.log('');

  stats.startTime = Date.now();
  
  // Iniciar usuários gradualmente
  const userPromises = [];
  const rampUpDelay = CONFIG.rampUpTime / CONFIG.concurrentUsers;
  
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    const userId = i + 1;
    
    // Aguardar antes de iniciar cada usuário (ramp-up)
    await new Promise(resolve => setTimeout(resolve, rampUpDelay));
    
    if (CONFIG.verbose) {
      console.log(`${colors.blue}👤 Iniciando usuário ${userId}${colors.reset}`);
    }
    
    userPromises.push(simulateUser(userId));
  }
  
  // Aguardar todos os usuários terminarem
  const userResults = await Promise.all(userPromises);
  stats.endTime = Date.now();
  
  // Gerar relatório
  const testDuration = stats.endTime - stats.startTime;
  const requestsPerSecond = (stats.totalRequests / (testDuration / 1000)).toFixed(2);
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2);
  
  const responseTimeStats = calculateStats(stats.responseTimes);
  
  const report = {
    summary: {
      testType: 'load_test',
      concurrentUsers: CONFIG.concurrentUsers,
      duration: testDuration,
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      requestsPerSecond,
      successRate: parseFloat(successRate),
      responseTimeStats,
      timestamp: new Date().toISOString()
    },
    userResults,
    errors: stats.errors.slice(0, 100), // Limitar a 100 erros
    config: CONFIG
  };
  
  // Exibir resultados
  console.log(`${colors.bright}${colors.cyan}📊 RESULTADOS DO TESTE DE CARGA${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}`);
  console.log(`${colors.green}✅ Requisições bem-sucedidas: ${stats.successfulRequests}/${stats.totalRequests} (${successRate}%)${colors.reset}`);
  console.log(`${colors.red}❌ Requisições falharam: ${stats.failedRequests}/${stats.totalRequests}${colors.reset}`);
  console.log(`${colors.blue}⚡ Requisições/segundo: ${requestsPerSecond}${colors.reset}`);
  console.log(`${colors.blue}⏱️  Duração total: ${testDuration}ms${colors.reset}`);
  console.log('');
  
  if (responseTimeStats.count > 0) {
    console.log(`${colors.cyan}📈 ESTATÍSTICAS DE TEMPO DE RESPOSTA:${colors.reset}`);
    console.log(`${colors.blue}  Média: ${responseTimeStats.average}ms${colors.reset}`);
    console.log(`${colors.blue}  Mínimo: ${responseTimeStats.min}ms${colors.reset}`);
    console.log(`${colors.blue}  Máximo: ${responseTimeStats.max}ms${colors.reset}`);
    console.log(`${colors.blue}  Mediana: ${responseTimeStats.median}ms${colors.reset}`);
    console.log(`${colors.blue}  P95: ${responseTimeStats.p95}ms${colors.reset}`);
    console.log(`${colors.blue}  P99: ${responseTimeStats.p99}ms${colors.reset}`);
    console.log('');
  }
  
  // Análise de performance
  const performanceAnalysis = [];
  
  if (parseFloat(successRate) < 95) {
    performanceAnalysis.push('⚠️  Taxa de sucesso abaixo de 95% - Verificar estabilidade');
  }
  
  if (parseFloat(responseTimeStats.average) > 2000) {
    performanceAnalysis.push('⚠️  Tempo de resposta médio alto - Verificar performance');
  }
  
  if (parseFloat(responseTimeStats.p95) > 5000) {
    performanceAnalysis.push('⚠️  P95 muito alto - Possíveis gargalos');
  }
  
  if (stats.errors.length > 0) {
    performanceAnalysis.push(`⚠️  ${stats.errors.length} erros detectados - Verificar logs`);
  }
  
  if (performanceAnalysis.length > 0) {
    console.log(`${colors.yellow}🔍 ANÁLISE DE PERFORMANCE:${colors.reset}`);
    performanceAnalysis.forEach(analysis => {
      console.log(`${colors.yellow}  ${analysis}${colors.reset}`);
    });
    console.log('');
  } else {
    console.log(`${colors.green}🎉 Performance excelente! Todos os indicadores estão bons.${colors.reset}`);
    console.log('');
  }
  
  // Salvar relatório
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
  console.log(`${colors.green}📄 Relatório salvo em: ${CONFIG.outputFile}${colors.reset}`);
  
  return report;
}

// Função para executar teste rápido
async function runQuickLoadTest() {
  console.log(`${colors.bright}${colors.cyan}⚡ TESTE DE CARGA RÁPIDO${colors.reset}`);
  console.log(`${colors.cyan}========================${colors.reset}`);
  
  // Configurações para teste rápido
  const quickConfig = {
    ...CONFIG,
    concurrentUsers: 5,
    duration: 30000, // 30 segundos
    rampUpTime: 5000 // 5 segundos
  };
  
  const originalConfig = { ...CONFIG };
  Object.assign(CONFIG, quickConfig);
  
  try {
    const report = await runLoadTest();
    Object.assign(CONFIG, originalConfig);
    return report;
  } catch (error) {
    Object.assign(CONFIG, originalConfig);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    const isQuickTest = process.argv.includes('--quick') || process.argv.includes('-q');
    
    if (isQuickTest) {
      await runQuickLoadTest();
    } else {
      await runLoadTest();
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}❌ Erro durante teste de carga: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  runLoadTest,
  runQuickLoadTest,
  simulateUser,
  calculateStats
}; 