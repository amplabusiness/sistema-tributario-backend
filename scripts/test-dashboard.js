const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testDashboard() {
  console.log('🧪 Testando Dashboard de Controle Tributário...\n');

  try {
    // Teste 1: Dashboard sem filtros
    console.log('📊 Teste 1: Dashboard geral (sem filtros)');
    const response1 = await axios.get(`${BASE_URL}/dashboard`);
    
    if (response1.data.success) {
      console.log('✅ Dashboard carregado com sucesso');
      console.log('📈 KPIs encontrados:');
      console.log(`   - Empresas: ${response1.data.data.kpis.empresas}`);
      console.log(`   - Documentos: ${response1.data.data.kpis.documentos}`);
      console.log(`   - Impostos: R$ ${response1.data.data.kpis.impostos.toFixed(2)}`);
      console.log(`   - PROTEGE: ${response1.data.data.kpis.proteges}`);
      console.log(`   - Erros: ${response1.data.data.kpis.erros}`);
      console.log(`   - Pendências: ${response1.data.data.kpis.pendencias}`);
      console.log(`   - Faturamento: R$ ${response1.data.data.kpis.faturamento.toFixed(2)}`);
      
      console.log(`\n📋 Empresas disponíveis: ${response1.data.data.empresasList.length}`);
      if (response1.data.data.empresasList.length > 0) {
        console.log('   Primeira empresa:', response1.data.data.empresasList[0].razaoSocial);
      }
      
      console.log(`\n📅 Períodos disponíveis: ${response1.data.data.periodos.length}`);
      if (response1.data.data.periodos.length > 0) {
        console.log('   Períodos:', response1.data.data.periodos.slice(0, 5).join(', '));
      }
      
      console.log(`\n📊 Gráficos:`);
      console.log(`   - Faturamento: ${response1.data.data.graficoFaturamento.length} pontos`);
      console.log(`   - Impostos: ${response1.data.data.graficoImpostos.length} pontos`);
      
    } else {
      console.log('❌ Erro ao carregar dashboard:', response1.data.error);
    }

    // Teste 2: Dashboard com filtro de empresa (se houver empresas)
    if (response1.data.data.empresasList.length > 0) {
      const empresaId = response1.data.data.empresasList[0].id;
      console.log(`\n📊 Teste 2: Dashboard filtrado por empresa (${empresaId})`);
      
      const response2 = await axios.get(`${BASE_URL}/dashboard?empresaId=${empresaId}`);
      
      if (response2.data.success) {
        console.log('✅ Dashboard filtrado carregado com sucesso');
        console.log(`📈 Documentos da empresa: ${response2.data.data.kpis.documentos}`);
      } else {
        console.log('❌ Erro ao carregar dashboard filtrado:', response2.data.error);
      }
    }

    // Teste 3: Dashboard com filtro de período (se houver períodos)
    if (response1.data.data.periodos.length > 0) {
      const periodo = response1.data.data.periodos[0];
      console.log(`\n📊 Teste 3: Dashboard filtrado por período (${periodo})`);
      
      const response3 = await axios.get(`${BASE_URL}/dashboard?periodo=${periodo}`);
      
      if (response3.data.success) {
        console.log('✅ Dashboard por período carregado com sucesso');
        console.log(`📈 Documentos do período: ${response3.data.data.kpis.documentos}`);
      } else {
        console.log('❌ Erro ao carregar dashboard por período:', response3.data.error);
      }
    }

    // Teste 4: Verificar estrutura dos dados
    console.log('\n🔍 Teste 4: Verificando estrutura dos dados');
    const data = response1.data.data;
    
    const requiredFields = [
      'empresas', 'documentos', 'impostos', 'proteges', 'erros', 'pendencias', 'faturamento',
      'periodos', 'empresasList', 'kpis', 'graficoFaturamento', 'graficoImpostos'
    ];
    
    const missingFields = requiredFields.filter(field => !(field in data));
    
    if (missingFields.length === 0) {
      console.log('✅ Todos os campos obrigatórios estão presentes');
    } else {
      console.log('❌ Campos faltando:', missingFields);
    }

    // Teste 5: Verificar tipos de dados
    console.log('\n🔍 Teste 5: Verificando tipos de dados');
    
    const typeChecks = [
      { field: 'empresas', value: data.empresas, expected: 'number' },
      { field: 'documentos', value: data.documentos, expected: 'number' },
      { field: 'impostos', value: data.impostos, expected: 'number' },
      { field: 'periodos', value: data.periodos, expected: 'array' },
      { field: 'empresasList', value: data.empresasList, expected: 'array' },
      { field: 'graficoFaturamento', value: data.graficoFaturamento, expected: 'array' },
      { field: 'graficoImpostos', value: data.graficoImpostos, expected: 'array' }
    ];
    
    let allTypesCorrect = true;
    typeChecks.forEach(check => {
      const actualType = Array.isArray(check.value) ? 'array' : typeof check.value;
      if (actualType !== check.expected) {
        console.log(`❌ Campo ${check.field}: esperado ${check.expected}, recebido ${actualType}`);
        allTypesCorrect = false;
      }
    });
    
    if (allTypesCorrect) {
      console.log('✅ Todos os tipos de dados estão corretos');
    }

    console.log('\n🎉 Testes do Dashboard concluídos!');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    } else if (error.request) {
      console.error('Sem resposta do servidor. Verifique se o backend está rodando e acessível.');
    } else {
      console.error('Erro desconhecido:', error);
    }
  }
}

// Executar testes
testDashboard(); 