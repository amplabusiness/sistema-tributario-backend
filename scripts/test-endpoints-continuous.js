#!/usr/bin/env node

/**
 * 🔄 TESTE CONTÍNUO DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA
 * ===========================================================
 * 
 * Este script executa testes de endpoints continuamente
 * e monitora a saúde da API em tempo real.
 */

const { runAllTests, testConnectivity } = require('./test-endpoints.js');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  interval: parseInt(process.env.TEST_INTERVAL) || 300000, // 5 minutos por padrão
  maxFailures: parseInt(process.env.MAX_FAILURES) || 3,
  logFile: 'continuous-test.log',
  alertFile: 'test-alerts.json',
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

// Histórico de testes
let testHistory = [];
let consecutiveFailures = 0;
let isRunning = false;

// Função para log
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
  
  // Console output
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  
  console.log(`${colorMap[type] || colors.reset}${logMessage}${colors.reset}`);
  
  // File log
  fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Função para salvar alertas
function saveAlert(alert) {
  const alerts = fs.existsSync(CONFIG.alertFile) 
    ? JSON.parse(fs.readFileSync(CONFIG.alertFile, 'utf8'))
    : [];
  
  alerts.push({
    ...alert,
    timestamp: new Date().toISOString()
  });
  
  // Manter apenas os últimos 100 alertas
  if (alerts.length > 100) {
    alerts.splice(0, alerts.length - 100);
  }
  
  fs.writeFileSync(CONFIG.alertFile, JSON.stringify(alerts, null, 2));
}

// Função para executar um ciclo de testes
async function runTestCycle() {
  if (isRunning) {
    log('Teste já em execução, pulando ciclo...', 'warning');
    return;
  }
  
  isRunning = true;
  const cycleStart = Date.now();
  
  try {
    log(`🔄 Iniciando ciclo de testes #${testHistory.length + 1}`, 'info');
    
    // Testar conectividade primeiro
    const isConnected = await testConnectivity();
    if (!isConnected) {
      consecutiveFailures++;
      log(`❌ Falha de conectividade (${consecutiveFailures}/${CONFIG.maxFailures})`, 'error');
      
      if (consecutiveFailures >= CONFIG.maxFailures) {
        saveAlert({
          type: 'connectivity_failure',
          message: 'Falha de conectividade consecutiva',
          consecutiveFailures,
          maxFailures: CONFIG.maxFailures
        });
        log('🚨 ALERTA: Múltiplas falhas de conectividade detectadas!', 'error');
      }
      
      return;
    }
    
    // Executar testes
    const report = await runAllTests();
    
    // Analisar resultados
    const cycleTime = Date.now() - cycleStart;
    const successRate = parseFloat(report.summary.successRate);
    
    const testResult = {
      cycle: testHistory.length + 1,
      timestamp: new Date().toISOString(),
      successRate,
      totalTests: report.summary.totalTests,
      passedTests: report.summary.passedTests,
      failedTests: report.summary.failedTests,
      totalTime: report.summary.totalTime,
      cycleTime,
      averageResponseTime: report.summary.averageResponseTime,
      consecutiveFailures: 0
    };
    
    // Verificar se houve falhas
    if (report.summary.failedTests > 0) {
      consecutiveFailures++;
      testResult.consecutiveFailures = consecutiveFailures;
      
      if (consecutiveFailures >= CONFIG.maxFailures) {
        saveAlert({
          type: 'test_failure',
          message: 'Múltiplas falhas de teste detectadas',
          consecutiveFailures,
          maxFailures: CONFIG.maxFailures,
          lastReport: report
        });
        log('🚨 ALERTA: Múltiplas falhas de teste detectadas!', 'error');
      }
    } else {
      consecutiveFailures = 0;
      log(`✅ Ciclo de testes concluído com sucesso (${successRate}%)`, 'success');
    }
    
    // Adicionar ao histórico
    testHistory.push(testResult);
    
    // Manter apenas os últimos 100 resultados
    if (testHistory.length > 100) {
      testHistory.splice(0, testHistory.length - 100);
    }
    
    // Salvar histórico
    fs.writeFileSync('test-history.json', JSON.stringify(testHistory, null, 2));
    
    // Log detalhado se verbose
    if (CONFIG.verbose) {
      log(`📊 Detalhes do ciclo:`, 'info');
      log(`   - Taxa de sucesso: ${successRate}%`, 'info');
      log(`   - Tempo total: ${report.summary.totalTime}ms`, 'info');
      log(`   - Tempo médio de resposta: ${report.summary.averageResponseTime.toFixed(2)}ms`, 'info');
      log(`   - Falhas consecutivas: ${consecutiveFailures}`, 'info');
    }
    
  } catch (error) {
    log(`❌ Erro durante ciclo de testes: ${error.message}`, 'error');
    consecutiveFailures++;
    
    if (consecutiveFailures >= CONFIG.maxFailures) {
      saveAlert({
        type: 'test_error',
        message: 'Erro durante execução de testes',
        error: error.message,
        consecutiveFailures,
        maxFailures: CONFIG.maxFailures
      });
    }
  } finally {
    isRunning = false;
  }
}

// Função para gerar relatório de status
function generateStatusReport() {
  if (testHistory.length === 0) {
    return {
      status: 'no_data',
      message: 'Nenhum teste executado ainda'
    };
  }
  
  const recentTests = testHistory.slice(-10); // Últimos 10 testes
  const avgSuccessRate = recentTests.reduce((acc, test) => acc + test.successRate, 0) / recentTests.length;
  const avgResponseTime = recentTests.reduce((acc, test) => acc + test.averageResponseTime, 0) / recentTests.length;
  
  const lastTest = testHistory[testHistory.length - 1];
  const timeSinceLastTest = Date.now() - new Date(lastTest.timestamp).getTime();
  
  return {
    status: consecutiveFailures >= CONFIG.maxFailures ? 'critical' : avgSuccessRate < 80 ? 'warning' : 'healthy',
    lastTest: lastTest.timestamp,
    timeSinceLastTest: Math.floor(timeSinceLastTest / 1000), // em segundos
    averageSuccessRate: avgSuccessRate.toFixed(2),
    averageResponseTime: avgResponseTime.toFixed(2),
    consecutiveFailures,
    totalCycles: testHistory.length,
    recentTests: recentTests.length
  };
}

// Função para exibir status
function displayStatus() {
  const status = generateStatusReport();
  
  console.log(`${colors.bright}${colors.cyan}📊 STATUS DO MONITORAMENTO CONTÍNUO${colors.reset}`);
  console.log(`${colors.cyan}=====================================${colors.reset}`);
  
  if (status.status === 'no_data') {
    console.log(`${colors.yellow}⚠️  ${status.message}${colors.reset}`);
    return;
  }
  
  const statusColor = {
    healthy: colors.green,
    warning: colors.yellow,
    critical: colors.red
  };
  
  const statusIcon = {
    healthy: '✅',
    warning: '⚠️',
    critical: '🚨'
  };
  
  console.log(`${statusColor[status.status]}${statusIcon[status.status]} Status: ${status.status.toUpperCase()}${colors.reset}`);
  console.log(`${colors.blue}📅 Último teste: ${status.lastTest}${colors.reset}`);
  console.log(`${colors.blue}⏱️  Tempo desde último teste: ${status.timeSinceLastTest}s${colors.reset}`);
  console.log(`${colors.blue}📈 Taxa média de sucesso: ${status.averageSuccessRate}%${colors.reset}`);
  console.log(`${colors.blue}⚡ Tempo médio de resposta: ${status.averageResponseTime}ms${colors.reset}`);
  console.log(`${colors.blue}🔄 Ciclos executados: ${status.totalCycles}${colors.reset}`);
  console.log(`${colors.blue}❌ Falhas consecutivas: ${status.consecutiveFailures}${colors.reset}`);
  
  if (status.status === 'critical') {
    console.log(`${colors.red}🚨 SISTEMA EM ESTADO CRÍTICO!${colors.reset}`);
  }
}

// Função para parar o monitoramento
function stopMonitoring() {
  log('🛑 Parando monitoramento contínuo...', 'info');
  displayStatus();
  process.exit(0);
}

// Função principal
async function main() {
  console.log(`${colors.bright}${colors.cyan}🔄 MONITORAMENTO CONTÍNUO DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA${colors.reset}`);
  console.log(`${colors.cyan}================================================================${colors.reset}`);
  console.log(`${colors.blue}⏱️  Intervalo: ${CONFIG.interval / 1000}s${colors.reset}`);
  console.log(`${colors.blue}🚨 Max falhas: ${CONFIG.maxFailures}${colors.reset}`);
  console.log(`${colors.blue}📄 Log file: ${CONFIG.logFile}${colors.reset}`);
  console.log(`${colors.blue}📊 Alert file: ${CONFIG.alertFile}${colors.reset}`);
  console.log('');

  // Criar arquivos de log se não existirem
  if (!fs.existsSync(CONFIG.logFile)) {
    fs.writeFileSync(CONFIG.logFile, '');
  }
  
  if (!fs.existsSync(CONFIG.alertFile)) {
    fs.writeFileSync(CONFIG.alertFile, '[]');
  }

  // Executar primeiro teste imediatamente
  await runTestCycle();
  
  // Configurar intervalo
  const intervalId = setInterval(runTestCycle, CONFIG.interval);
  
  // Configurar handlers para parada graciosa
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    stopMonitoring();
  });
  
  process.on('SIGTERM', () => {
    clearInterval(intervalId);
    stopMonitoring();
  });
  
  // Exibir status a cada 5 minutos
  setInterval(() => {
    if (CONFIG.verbose) {
      displayStatus();
    }
  }, 300000);
  
  log('🔄 Monitoramento contínuo iniciado. Pressione Ctrl+C para parar.', 'info');
  
  // Manter o processo rodando
  process.stdin.resume();
}

// Executar se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  runTestCycle,
  generateStatusReport,
  displayStatus,
  stopMonitoring
}; 