#!/usr/bin/env node

/**
 * 🤖 TESTE AUTOMATIZADO DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA
 * ================================================================
 * 
 * Este script testa automaticamente todos os endpoints da API
 * e gera um relatório detalhado de saúde do sistema.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
  baseUrl: process.env.API_URL || 'https://backend-sergio-2143-sergio-carneiro-leaos-projects.vercel.app',
  timeout: 10000,
  retries: 3,
  outputFile: 'endpoint-test-report.json',
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

// Função para fazer requisições HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sistema-Tributario-Test/1.0',
        ...options.headers
      },
      timeout: CONFIG.timeout
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            responseTime: Date.now() - startTime
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: Date.now() - startTime,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    const startTime = Date.now();
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Função para fazer requisição com retry
async function makeRequestWithRetry(url, options = {}, retries = CONFIG.retries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await makeRequest(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      if (CONFIG.verbose) {
        console.log(`${colors.yellow}⚠️  Tentativa ${i + 1} falhou, tentando novamente...${colors.reset}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Função para testar endpoint
async function testEndpoint(name, url, options = {}) {
  const startTime = Date.now();
  
  try {
    if (CONFIG.verbose) {
      console.log(`${colors.blue}🔍 Testando: ${name}${colors.reset}`);
    }
    
    const response = await makeRequestWithRetry(url, options);
    const testTime = Date.now() - startTime;
    
    // Determinar se o teste foi bem-sucedido
    let success = response.status >= 200 && response.status < 300;
    
    // Casos especiais onde códigos de erro são esperados
    if (name.includes('Invalid') && response.status === 400) {
      success = true; // 400 é esperado para dados inválidos
    }
    if (name.includes('404') && response.status === 404) {
      success = true; // 404 é esperado para rotas inexistentes
    }
    
    const result = {
      name,
      url,
      status: response.status,
      success,
      responseTime: response.responseTime,
      testTime,
      data: response.data,
      timestamp: new Date().toISOString()
    };
    
    if (CONFIG.verbose) {
      const statusIcon = result.success ? '✅' : '❌';
      const statusColor = result.success ? colors.green : colors.red;
      console.log(`${statusColor}${statusIcon} ${name}: ${response.status} (${response.responseTime}ms)${colors.reset}`);
    }
    
    return result;
  } catch (error) {
    const testTime = Date.now() - startTime;
    
    const result = {
      name,
      url,
      status: 'ERROR',
      success: false,
      responseTime: null,
      testTime,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    if (CONFIG.verbose) {
      console.log(`${colors.red}❌ ${name}: ERRO - ${error.message}${colors.reset}`);
    }
    
    return result;
  }
}

// Definição dos testes
const tests = [
  // Testes básicos
  {
    name: 'Health Check',
    url: `${CONFIG.baseUrl}/health`,
    method: 'GET'
  },
  {
    name: 'API Status',
    url: `${CONFIG.baseUrl}/api/status`,
    method: 'GET'
  },
  {
    name: 'Root Endpoint',
    url: `${CONFIG.baseUrl}/`,
    method: 'GET'
  },
  
  // Testes de documentos
  {
    name: 'List Documents',
    url: `${CONFIG.baseUrl}/api/documents`,
    method: 'GET'
  },
  
  // Testes de upload
  {
    name: 'Upload File (Valid)',
    url: `${CONFIG.baseUrl}/api/upload`,
    method: 'POST',
    body: JSON.stringify({
      fileName: 'test-aviz.txt',
      fileType: 'AVIZ',
      content: 'Test content for AVIZ file',
      empresaId: 'test-empresa-1'
    })
  },
  {
    name: 'Upload File (Invalid - Missing Fields)',
    url: `${CONFIG.baseUrl}/api/upload`,
    method: 'POST',
    body: JSON.stringify({
      fileName: 'test.txt'
      // Missing required fields
    })
  },
  
  // Testes de análise ICMS
  {
    name: 'ICMS Analysis (Valid)',
    url: `${CONFIG.baseUrl}/api/icms/analyze`,
    method: 'POST',
    body: JSON.stringify({
      empresaId: 'empresa-1',
      periodo: '04/2025'
    })
  },
  {
    name: 'ICMS Analysis (Default Values)',
    url: `${CONFIG.baseUrl}/api/icms/analyze`,
    method: 'POST',
    body: JSON.stringify({})
  },
  
  // Testes de análise Federal
  {
    name: 'Federal Analysis (Valid)',
    url: `${CONFIG.baseUrl}/api/federal/analyze`,
    method: 'POST',
    body: JSON.stringify({
      empresaId: 'empresa-1',
      periodo: '04/2025'
    })
  },
  {
    name: 'Federal Analysis (Default Values)',
    url: `${CONFIG.baseUrl}/api/federal/analyze`,
    method: 'POST',
    body: JSON.stringify({})
  },
  
  // Testes de erro
  {
    name: '404 Not Found',
    url: `${CONFIG.baseUrl}/api/nonexistent`,
    method: 'GET'
  }
];

// Função para executar todos os testes
async function runAllTests() {
  console.log(`${colors.bright}${colors.cyan}🤖 TESTE AUTOMATIZADO DE ENDPOINTS - SISTEMA TRIBUTÁRIO 100% IA${colors.reset}`);
  console.log(`${colors.cyan}========================================================${colors.reset}`);
  console.log(`${colors.blue}🌐 URL Base: ${CONFIG.baseUrl}${colors.reset}`);
  console.log(`${colors.blue}⏱️  Timeout: ${CONFIG.timeout}ms${colors.reset}`);
  console.log(`${colors.blue}🔄 Retries: ${CONFIG.retries}${colors.reset}`);
  console.log(`${colors.blue}📅 Data: ${new Date().toLocaleString('pt-BR')}${colors.reset}`);
  console.log('');

  const results = [];
  const startTime = Date.now();

  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, {
      method: test.method,
      body: test.body
    });
    results.push(result);
  }

  const totalTime = Date.now() - startTime;
  
  // Gerar relatório
  const report = {
    summary: {
      totalTests: results.length,
      passedTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      successRate: ((results.filter(r => r.success).length / results.length) * 100).toFixed(2),
      totalTime,
      averageResponseTime: results
        .filter(r => r.responseTime)
        .reduce((acc, r) => acc + r.responseTime, 0) / results.filter(r => r.responseTime).length || 0,
      timestamp: new Date().toISOString()
    },
    tests: results,
    config: CONFIG
  };

  // Exibir resumo
  console.log(`${colors.bright}${colors.cyan}📊 RELATÓRIO DE TESTES${colors.reset}`);
  console.log(`${colors.cyan}==================${colors.reset}`);
  console.log(`${colors.green}✅ Testes Passados: ${report.summary.passedTests}/${report.summary.totalTests}${colors.reset}`);
  console.log(`${colors.red}❌ Testes Falharam: ${report.summary.failedTests}/${report.summary.totalTests}${colors.reset}`);
  console.log(`${colors.blue}📈 Taxa de Sucesso: ${report.summary.successRate}%${colors.reset}`);
  console.log(`${colors.blue}⏱️  Tempo Total: ${totalTime}ms${colors.reset}`);
  console.log(`${colors.blue}⚡ Tempo Médio de Resposta: ${report.summary.averageResponseTime.toFixed(2)}ms${colors.reset}`);
  console.log('');

  // Exibir detalhes dos testes que falharam
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log(`${colors.red}❌ TESTES QUE FALHARAM:${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`${colors.red}  • ${test.name}: ${test.status}${test.error ? ` - ${test.error}` : ''}${colors.reset}`);
    });
    console.log('');
  }

  // Salvar relatório
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));
  console.log(`${colors.green}📄 Relatório salvo em: ${CONFIG.outputFile}${colors.reset}`);

  // Retornar código de saída
  const exitCode = report.summary.failedTests > 0 ? 1 : 0;
  
  if (exitCode === 0) {
    console.log(`${colors.green}🎉 Todos os testes passaram!${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️  Alguns testes falharam. Verifique o relatório.${colors.reset}`);
  }

  return report;
}

// Função para testar conectividade
async function testConnectivity() {
  console.log(`${colors.blue}🔍 Testando conectividade...${colors.reset}`);
  
  try {
    const response = await makeRequestWithRetry(`${CONFIG.baseUrl}/health`);
    console.log(`${colors.green}✅ Conectividade OK - Status: ${response.status}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Erro de conectividade: ${error.message}${colors.reset}`);
    return false;
  }
}

// Função principal
async function main() {
  try {
    // Testar conectividade primeiro
    const isConnected = await testConnectivity();
    if (!isConnected) {
      console.log(`${colors.red}❌ Não foi possível conectar à API. Verifique a URL e a conectividade.${colors.reset}`);
      process.exit(1);
    }
    
    console.log('');
    
    // Executar testes
    const report = await runAllTests();
    
    // Salvar relatório em formato legível
    const readableReport = `
🤖 RELATÓRIO DE TESTES AUTOMATIZADOS - SISTEMA TRIBUTÁRIO 100% IA
================================================================

📅 Data: ${new Date().toLocaleString('pt-BR')}
🌐 URL Base: ${CONFIG.baseUrl}

📊 RESUMO:
- Total de Testes: ${report.summary.totalTests}
- Testes Passados: ${report.summary.passedTests}
- Testes Falharam: ${report.summary.failedTests}
- Taxa de Sucesso: ${report.summary.successRate}%
- Tempo Total: ${report.summary.totalTime}ms
- Tempo Médio de Resposta: ${report.summary.averageResponseTime.toFixed(2)}ms

${report.tests.map(test => `
${test.success ? '✅' : '❌'} ${test.name}
   Status: ${test.status}
   Tempo: ${test.responseTime || 'N/A'}ms
   ${test.error ? `Erro: ${test.error}` : ''}
`).join('')}

🔗 Links Úteis:
- API: ${CONFIG.baseUrl}
- Health Check: ${CONFIG.baseUrl}/health
- Status: ${CONFIG.baseUrl}/api/status
`;

    fs.writeFileSync('endpoint-test-report.txt', readableReport);
    console.log(`${colors.green}📄 Relatório legível salvo em: endpoint-test-report.txt${colors.reset}`);
    
    process.exit(report.summary.failedTests > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}❌ Erro durante os testes: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  runAllTests,
  testEndpoint,
  testConnectivity
}; 