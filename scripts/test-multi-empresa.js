#!/usr/bin/env node

/**
 * Script para testar o sistema MultiEmpresa
 * Monitora múltiplas empresas e anos automaticamente
 */

const path = require('path');
const fs = require('fs');
const { MultiEmpresaWatcher } = require('../src/services/multi-empresa-watcher');
const { EmpresaService } = require('../src/services/empresa-service');

// Configuração de teste
const TEST_CONFIG = {
  basePath: path.resolve(__dirname, '../../ICMS AVIZ 04-2025'),
  supportedExtensions: ['.xml', '.txt', '.sped', '.ecd', '.ecf', '.pdf', '.xlsx', '.xls'],
  maxFileSize: 100 * 1024 * 1024, // 100MB
  scanInterval: 10000, // 10 segundos
  empresaFolders: ['empresa', 'company', 'cnpj', 'empresas'],
  yearFolders: ['2024', '2025', '2023', '2022', '2021'],
};

async function testMultiEmpresaWatcher() {
  console.log('🚀 Iniciando teste do MultiEmpresaWatcher...');
  console.log(`📁 Diretório base: ${TEST_CONFIG.basePath}`);
  console.log(`⏱️  Intervalo de varredura: ${TEST_CONFIG.scanInterval / 1000}s`);
  console.log('');

  // Verificar se o diretório existe
  if (!fs.existsSync(TEST_CONFIG.basePath)) {
    console.error(`❌ Diretório não encontrado: ${TEST_CONFIG.basePath}`);
    console.log('💡 Certifique-se de que o diretório ICMS AVIZ 04-2025 existe');
    return;
  }

  // Criar instância do watcher
  const watcher = new MultiEmpresaWatcher(TEST_CONFIG);

  // Função para exibir estatísticas
  const showStats = () => {
    const stats = watcher.getStats();
    console.log(`📊 Estatísticas:`);
    console.log(`   - Executando: ${stats.isRunning ? '✅ Sim' : '❌ Não'}`);
    console.log(`   - Arquivos processados: ${stats.processedFiles}`);
    console.log(`   - Extensões suportadas: ${stats.config.supportedExtensions.join(', ')}`);
    console.log('');
  };

  // Iniciar watcher
  try {
    await watcher.start();
    console.log('✅ MultiEmpresaWatcher iniciado com sucesso!');
    showStats();

    // Monitorar por 30 segundos
    console.log('⏳ Monitorando por 30 segundos...');
    console.log('💡 Pressione Ctrl+C para parar');
    console.log('');

    let scanCount = 0;
    const monitorInterval = setInterval(() => {
      scanCount++;
      console.log(`🔍 Varredura #${scanCount} - ${new Date().toLocaleTimeString()}`);
      showStats();
    }, TEST_CONFIG.scanInterval);

    // Parar após 30 segundos
    setTimeout(async () => {
      clearInterval(monitorInterval);
      watcher.stop();
      console.log('');
      console.log('🛑 Teste concluído!');
      showStats();

      // Testar serviços de empresa
      await testEmpresaServices();
    }, 30000);

  } catch (error) {
    console.error('❌ Erro ao iniciar MultiEmpresaWatcher:', error.message);
  }
}

async function testEmpresaServices() {
  console.log('');
  console.log('🏢 Testando serviços de empresa...');

  try {
    // Listar empresas
    const empresas = await EmpresaService.listEmpresas();
    console.log(`📋 Total de empresas: ${empresas.length}`);

    if (empresas.length > 0) {
      console.log('📝 Empresas encontradas:');
      empresas.forEach((empresa, index) => {
        console.log(`   ${index + 1}. ${empresa.razaoSocial} (${empresa.cnpj})`);
        console.log(`      - Regime: ${empresa.regimeTributario || 'Não informado'}`);
        console.log(`      - Documentos: ${empresa._count.documentos}`);
      });
    }

    // Estatísticas
    const stats = await EmpresaService.getEmpresaStats();
    console.log('');
    console.log('📊 Estatísticas gerais:');
    console.log(`   - Total de empresas: ${stats.totalEmpresas}`);
    console.log(`   - Total de documentos: ${stats.totalDocumentos}`);
    
    if (stats.empresasPorRegime.length > 0) {
      console.log('   - Empresas por regime:');
      stats.empresasPorRegime.forEach(regime => {
        console.log(`     * ${regime.regimeTributario || 'Não informado'}: ${regime._count.id}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao testar serviços de empresa:', error.message);
  }
}

async function testFileProcessing() {
  console.log('');
  console.log('📄 Testando processamento de arquivos...');

  // Criar arquivo de teste
  const testDir = path.join(__dirname, 'test-files');
  const testFile = path.join(testDir, 'test-nfe.xml');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe52250400109066000114550010003773041217110708">
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>EMPRESA TESTE LTDA</xNome>
        <xFant>EMPRESA TESTE</xFant>
        <IE>123456789</IE>
        <CNAE>1234567</CNAE>
      </emit>
      <dest>
        <CNPJ>98765432000199</CNPJ>
        <xNome>CLIENTE TESTE LTDA</xNome>
      </dest>
    </infNFe>
  </NFe>
</nfeProc>`;

  fs.writeFileSync(testFile, testXML);
  console.log(`✅ Arquivo de teste criado: ${testFile}`);

  // Testar extração de dados da empresa
  try {
    const fileContent = fs.readFileSync(testFile, 'utf-8');
    const empresaData = await EmpresaService.extractEmpresaFromFile(testFile, fileContent);

    if (empresaData) {
      console.log('✅ Dados da empresa extraídos:');
      console.log(`   - CNPJ: ${empresaData.cnpj}`);
      console.log(`   - Razão Social: ${empresaData.razaoSocial}`);
      console.log(`   - Nome Fantasia: ${empresaData.nomeFantasia || 'Não informado'}`);
      console.log(`   - IE: ${empresaData.ie || 'Não informado'}`);
      console.log(`   - CNAE: ${empresaData.cnae || 'Não informado'}`);
    } else {
      console.log('❌ Não foi possível extrair dados da empresa');
    }
  } catch (error) {
    console.error('❌ Erro ao extrair dados da empresa:', error.message);
  }

  // Limpar arquivo de teste
  fs.unlinkSync(testFile);
  console.log('🧹 Arquivo de teste removido');
}

// Função principal
async function main() {
  console.log('🎯 TESTE DO SISTEMA MULTIEMPRESA');
  console.log('================================');
  console.log('');

  try {
    await testMultiEmpresaWatcher();
    await testFileProcessing();
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testMultiEmpresaWatcher,
  testEmpresaServices,
  testFileProcessing,
}; 