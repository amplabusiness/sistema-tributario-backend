const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testPipeline() {
  console.log('🧪 Iniciando teste do pipeline completo...\n');

  try {
    // 1. Testar health check
    console.log('1️⃣ Testando health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check OK:', healthResponse.data);

    // 2. Criar documento de teste
    console.log('\n2️⃣ Criando documento de teste...');
    const createTestResponse = await axios.post(`${API_BASE_URL}/test/create-test-document`);
    console.log('✅ Documento de teste criado:', createTestResponse.data.filePath);

    // 3. Executar pipeline completo
    console.log('\n3️⃣ Executando pipeline completo...');
    
    // Criar FormData para upload
    const FormData = require('form-data');
    const form = new FormData();
    form.append('document', fs.createReadStream(createTestResponse.data.filePath));

    const pipelineResponse = await axios.post(`${API_BASE_URL}/test/pipeline`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 60000, // 60 segundos para processamento
    });

    console.log('✅ Pipeline executado com sucesso!');
    console.log('📊 Resultados:');
    console.log('   - Document ID:', pipelineResponse.data.documentId);
    console.log('   - ICMS Results:', pipelineResponse.data.results.icms.length);
    console.log('   - Federal Results:', pipelineResponse.data.results.federal.length);

    // 4. Mostrar detalhes dos resultados
    if (pipelineResponse.data.results.icms.length > 0) {
      console.log('\n📋 Detalhes ICMS:');
      pipelineResponse.data.results.icms.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.tipoOperacao} - R$ ${result.valorCalculado}`);
      });
    }

    if (pipelineResponse.data.results.federal.length > 0) {
      console.log('\n📋 Detalhes Federal:');
      pipelineResponse.data.results.federal.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.tipoImposto} - R$ ${result.valorCalculado}`);
      });
    }

    console.log('\n🎉 Teste do pipeline concluído com sucesso!');
    console.log('🔥 Sistema 100% IA funcionando perfeitamente!');

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.log('\n🔍 Verificando logs do servidor...');
      console.log('Execute: npm run dev para ver os logs detalhados');
    }
  }
}

// Função para testar apenas os agentes
async function testAgents(documentId) {
  console.log(`🧪 Testando agentes para documento ${documentId}...\n`);

  try {
    const response = await axios.post(`${API_BASE_URL}/test/test-agents/${documentId}`);
    console.log('✅ Agentes testados com sucesso:', response.data);

  } catch (error) {
    console.error('❌ Erro no teste dos agentes:', error.response?.data || error.message);
  }
}

// Executar teste
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--agents' && args[1]) {
    testAgents(args[1]);
  } else {
    testPipeline();
  }
}

module.exports = { testPipeline, testAgents }; 