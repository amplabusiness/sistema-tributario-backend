const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api';

// Configurações de teste
const TEST_CONFIG = {
  empresaId: 'empresa-teste-protege',
  periodo: '202501',
  pdfs: [
    'protege goias.pdf',
    'protege goias 2%.pdf',
    'guia_pratico_5.7.pdf',
    'manual de auditoria sefaz goias.pdf'
  ]
};

class ProtegeTester {
  constructor() {
    this.axios = axios.create({
      baseURL: BASE_URL,
      timeout: 30000
    });
  }

  /**
   * Teste 1: Upload de PDFs do PROTEGE
   */
  async testUploadPdfs() {
    console.log('\n=== TESTE 1: Upload de PDFs do PROTEGE ===');
    
    try {
      const formData = new FormData();
      formData.append('empresaId', TEST_CONFIG.empresaId);
      
      // Adicionar PDFs simulados (em produção, usar arquivos reais)
      for (const pdf of TEST_CONFIG.pdfs) {
        // Criar arquivo PDF simulado
        const pdfPath = path.join(__dirname, 'temp', pdf);
        if (!fs.existsSync(path.dirname(pdfPath))) {
          fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
        }
        
        // Criar conteúdo PDF simulado
        const pdfContent = `%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(${pdf}) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF`;
        fs.writeFileSync(pdfPath, pdfContent);
        
        formData.append('pdfs', fs.createReadStream(pdfPath), pdf);
      }

      const response = await this.axios.post('/protege/upload-pdfs', formData, {
        headers: {
          ...formData.getHeaders(),
        }
      });

      console.log('✅ Upload de PDFs realizado com sucesso');
      console.log('📊 Configuração:', response.data.configuracao);
      
      return response.data.configuracao;
    } catch (error) {
      console.error('❌ Erro no upload de PDFs:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Teste 2: Cálculo do PROTEGE
   */
  async testCalcularProtege() {
    console.log('\n=== TESTE 2: Cálculo do PROTEGE ===');
    
    try {
      const response = await this.axios.post('/protege/calcular', {
        empresaId: TEST_CONFIG.empresaId,
        periodo: TEST_CONFIG.periodo
      });

      console.log('✅ Cálculo do PROTEGE realizado com sucesso');
      console.log('📊 Resultado:', {
        empresaId: response.data.resultado.empresaId,
        periodo: response.data.resultado.periodo,
        totalBaseCalculo: response.data.resultado.totalBaseCalculo,
        totalProtege: response.data.resultado.totalProtege,
        totalBeneficios: response.data.resultado.totalBeneficios,
        valorFinal: response.data.resultado.valorFinal
      });
      
      return response.data.resultado;
    } catch (error) {
      console.error('❌ Erro no cálculo do PROTEGE:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Teste 3: Consulta de Resultado
   */
  async testConsultarResultado() {
    console.log('\n=== TESTE 3: Consulta de Resultado ===');
    
    try {
      const response = await this.axios.get(`/protege/resultado/${TEST_CONFIG.empresaId}/${TEST_CONFIG.periodo}`);

      console.log('✅ Consulta de resultado realizada com sucesso');
      console.log('📊 Resultado:', {
        status: response.data.resultado.status,
        totalBaseCalculo: response.data.resultado.totalBaseCalculo,
        totalProtege: response.data.resultado.totalProtege,
        totalBeneficios: response.data.resultado.totalBeneficios,
        valorFinal: response.data.resultado.valorFinal
      });
      
      return response.data.resultado;
    } catch (error) {
      console.error('❌ Erro na consulta de resultado:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Teste 4: Listar Resultados
   */
  async testListarResultados() {
    console.log('\n=== TESTE 4: Listar Resultados ===');
    
    try {
      const response = await this.axios.get(`/protege/resultados/${TEST_CONFIG.empresaId}`);

      console.log('✅ Listagem de resultados realizada com sucesso');
      console.log('📊 Total de resultados:', response.data.total);
      console.log('📋 Resultados:', response.data.resultados.map(r => ({
        periodo: r.periodo,
        status: r.status,
        valorFinal: r.valorFinal
      })));
      
      return response.data.resultados;
    } catch (error) {
      console.error('❌ Erro na listagem de resultados:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Teste 5: Relatório Consolidado
   */
  async testRelatorioConsolidado() {
    console.log('\n=== TESTE 5: Relatório Consolidado ===');
    
    try {
      const response = await this.axios.get(`/protege/relatorio/${TEST_CONFIG.empresaId}`, {
        params: {
          periodoInicio: '202501',
          periodoFim: '202501'
        }
      });

      console.log('✅ Relatório consolidado gerado com sucesso');
      console.log('📊 Relatório:', {
        totalPeriodos: response.data.relatorio.totalPeriodos,
        totalBaseCalculo: response.data.relatorio.totalBaseCalculo,
        totalProtege: response.data.relatorio.totalProtege,
        totalBeneficios: response.data.relatorio.totalBeneficios,
        valorFinal: response.data.relatorio.valorFinal,
        beneficiosPorTipo: response.data.relatorio.beneficiosPorTipo
      });
      
      return response.data.relatorio;
    } catch (error) {
      console.error('❌ Erro no relatório consolidado:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Teste 6: Detalhes do Cálculo
   */
  async testDetalhesCalculo() {
    console.log('\n=== TESTE 6: Detalhes do Cálculo ===');
    
    try {
      const response = await this.axios.get(`/protege/detalhes/${TEST_CONFIG.empresaId}/${TEST_CONFIG.periodo}`);

      console.log('✅ Detalhes do cálculo obtidos com sucesso');
      console.log('📊 Detalhes:', {
        totalItens: response.data.totalItens,
        totalBaseCalculo: response.data.totalBaseCalculo,
        totalProtege: response.data.totalProtege,
        totalBeneficios: response.data.totalBeneficios,
        valorFinal: response.data.valorFinal
      });
      
      if (response.data.detalhes.length > 0) {
        console.log('📋 Primeiro item:', {
          ncm: response.data.detalhes[0].item.ncm,
          cfop: response.data.detalhes[0].item.cfop,
          baseCalculo: response.data.detalhes[0].protegeCalculo.baseCalculo,
          valorProtege: response.data.detalhes[0].protegeCalculo.valorProtege,
          beneficiosAplicados: response.data.detalhes[0].protegeCalculo.beneficiosAplicados.length
        });
      }
      
      return response.data.detalhes;
    } catch (error) {
      console.error('❌ Erro nos detalhes do cálculo:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Executar todos os testes
   */
  async runAllTests() {
    console.log('🚀 Iniciando testes do PROTEGE...');
    console.log('📋 Configuração de teste:', TEST_CONFIG);

    try {
      // Teste 1: Upload de PDFs
      await this.testUploadPdfs();

      // Teste 2: Cálculo do PROTEGE
      await this.testCalcularProtege();

      // Teste 3: Consulta de Resultado
      await this.testConsultarResultado();

      // Teste 4: Listar Resultados
      await this.testListarResultados();

      // Teste 5: Relatório Consolidado
      await this.testRelatorioConsolidado();

      // Teste 6: Detalhes do Cálculo
      await this.testDetalhesCalculo();

      console.log('\n🎉 Todos os testes do PROTEGE foram executados com sucesso!');
      
    } catch (error) {
      console.error('\n💥 Erro durante os testes:', error.message);
      process.exit(1);
    }
  }

  /**
   * Limpar arquivos temporários
   */
  cleanup() {
    try {
      const tempDir = path.join(__dirname, 'temp');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('🧹 Arquivos temporários removidos');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao limpar arquivos temporários:', error.message);
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new ProtegeTester();
  
  // Capturar Ctrl+C para limpeza
  process.on('SIGINT', () => {
    console.log('\n🛑 Interrompendo testes...');
    tester.cleanup();
    process.exit(0);
  });

  // Executar testes
  tester.runAllTests()
    .then(() => {
      tester.cleanup();
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error.message);
      tester.cleanup();
      process.exit(1);
    });
}

module.exports = ProtegeTester; 