import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { ProtegeService } from '../services/protege-service';
import { EmpresaService } from '../services/empresa-service';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/protege/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Aceitar apenas PDFs
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * POST /protege/upload-pdfs
 * Upload de PDFs do PROTEGE para uma empresa
 */
router.post('/upload-pdfs', upload.array('pdfs', 5), async (req, res) => {
  try {
    const { empresaId } = req.body;
    
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId é obrigatório' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' });
    }

    // Verificar se empresa existe
    const empresa = await EmpresaService.buscarEmpresa(empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Preparar arquivos para processamento
    const arquivos = (req.files as Express.Multer.File[]).map(file => ({
      nome: file.originalname,
      caminho: file.path
    }));

    // Processar PDFs do PROTEGE
    const configuracao = await ProtegeService.processarPdfsProtege(empresaId, arquivos);

    logInfo('PDFs do PROTEGE processados com sucesso', { 
      empresaId, 
      arquivos: arquivos.length,
      regras: configuracao.regras.length,
      beneficios: configuracao.beneficios.length
    });

    return res.json({
      success: true,
      message: 'PDFs do PROTEGE processados com sucesso',
      configuracao: {
        empresaId: configuracao.empresaId,
        regras: configuracao.regras.length,
        beneficios: configuracao.beneficios.length,
        ativo: configuracao.ativo,
        dataInicio: configuracao.dataInicio
      }
    });

  } catch (error) {
    logError('Erro ao processar PDFs do PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar PDFs do PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /protege/calcular
 * Calcular PROTEGE para empresa e período
 */
router.post('/calcular', async (req, res) => {
  try {
    const { empresaId, periodo } = req.body;
    
    if (!empresaId || !periodo) {
      return res.status(400).json({ error: 'empresaId e periodo são obrigatórios' });
    }

    // Verificar se empresa existe
    const empresa = await EmpresaService.buscarEmpresa(empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Calcular PROTEGE
    const resultado = await ProtegeService.calcularProtege(empresaId, periodo);

    if (resultado.status === 'ERRO') {
      return res.status(400).json({
        error: 'Erro no cálculo do PROTEGE',
        details: resultado.erro
      });
    }

    logInfo('PROTEGE calculado com sucesso', { 
      empresaId, 
      periodo,
      valorFinal: resultado.resultado.valorFinal
    });

    return res.json({
      success: true,
      message: 'PROTEGE calculado com sucesso',
      resultado: {
        id: resultado.id,
        empresaId: resultado.empresaId,
        periodo: resultado.periodo,
        totalBaseCalculo: resultado.resultado.totalBaseCalculo,
        totalProtege15: resultado.resultado.totalProtege15,
        totalProtege2: resultado.resultado.totalProtege2,
        totalBeneficios: resultado.resultado.totalBeneficios,
        valorFinal: resultado.resultado.valorFinal,
        dataCalculo: resultado.dataCalculo
      }
    });

  } catch (error) {
    logError('Erro ao calcular PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao calcular PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/resultado/:empresaId/:periodo
 * Buscar resultado do PROTEGE
 */
router.get('/resultado/:empresaId/:periodo', async (req, res) => {
  try {
    const { empresaId, periodo } = req.params;

    const resultado = await ProtegeService.buscarResultado(empresaId, periodo);

    if (!resultado) {
      return res.status(404).json({ error: 'Resultado do PROTEGE não encontrado' });
    }

    return res.json({
      success: true,
      resultado: {
        id: resultado.id,
        empresaId: resultado.empresaId,
        periodo: resultado.periodo,
        status: resultado.status,
        totalBaseCalculo: resultado.resultado.totalBaseCalculo,
        totalProtege15: resultado.resultado.totalProtege15,
        totalProtege2: resultado.resultado.totalProtege2,
        totalBeneficios: resultado.resultado.totalBeneficios,
        valorFinal: resultado.resultado.valorFinal,
        dataCalculo: resultado.dataCalculo,
        erro: resultado.erro
      }
    });

  } catch (error) {
    logError('Erro ao buscar resultado do PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar resultado do PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/resultados/:empresaId
 * Listar resultados do PROTEGE por empresa
 */
router.get('/resultados/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;

    const resultados = await ProtegeService.listarResultados(empresaId);    return res.json({
      success: true,
      empresaId,
      total: resultados.length,
      resultados: resultados.map(r => ({
        id: r.id,
        periodo: r.periodo,
        status: r.status,
        totalBaseCalculo: r.resultado.totalBaseCalculo,
        totalProtege15: r.resultado.totalProtege15,
        totalProtege2: r.resultado.totalProtege2,
        totalBeneficios: r.resultado.totalBeneficios,
        valorFinal: r.resultado.valorFinal,
        dataCalculo: r.dataCalculo
      }))
    });
  } catch (error) {
    logError('Erro ao listar resultados do PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao listar resultados do PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/relatorio/:empresaId
 * Gerar relatório consolidado do PROTEGE
 */
router.get('/relatorio/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { periodoInicio, periodoFim } = req.query;

    if (!periodoInicio || !periodoFim) {
      return res.status(400).json({ error: 'periodoInicio e periodoFim são obrigatórios' });
    }

    const relatorio = await ProtegeService.gerarRelatorioConsolidado(
      empresaId,
      periodoInicio as string,
      periodoFim as string
    );

    return res.json({
      success: true,
      relatorio
    });

  } catch (error) {
    logError('Erro ao gerar relatório do PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar relatório do PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/detalhes/:empresaId/:periodo
 * Buscar detalhes do cálculo do PROTEGE
 */
router.get('/detalhes/:empresaId/:periodo', async (req, res) => {
  try {
    const { empresaId, periodo } = req.params;

    const resultado = await ProtegeService.buscarResultado(empresaId, periodo);

    if (!resultado) {
      return res.status(404).json({ error: 'Resultado do PROTEGE não encontrado' });
    }

    // Gerar relatório de benefícios
    const relatorioBeneficios = resultado.resultado.detalhes.map(detalhe => ({
      item: {
        ncm: detalhe.item.ncm,
        cfop: detalhe.item.cfop,
        cst: detalhe.item.cst,
        descricao: (detalhe.item as any).descricao || 'Sem descrição',
        baseIcms: detalhe.item.baseIcms,
        valorIcms: detalhe.item.valorIcms
      },
      protegeCalculo: {
        baseCalculo: detalhe.protegeCalculo.baseCalculo,
        aliquotaProtege: detalhe.protegeCalculo.aliquotaProtege,
        valorProtege: detalhe.protegeCalculo.valorProtege,
        totalBeneficios: detalhe.protegeCalculo.totalBeneficios,
        valorFinal: detalhe.protegeCalculo.valorFinal,
        beneficiosAplicados: (detalhe.protegeCalculo.beneficiosAplicados || []).map(b => ({
          codigo: b.beneficio.codigo,
          descricao: b.beneficio.descricao,
          tipo: b.beneficio.tipo,
          valorBeneficio: b.valorBeneficio,
          tipoCalculo: b.tipoCalculo,
          condicoesAtendidas: b.condicoesAtendidas
        }))
      }
    }));

    return res.json({
      success: true,
      empresaId: resultado.empresaId,
      periodo: resultado.periodo,
      totalItens: resultado.resultado.detalhes.length,
      totalBaseCalculo: resultado.resultado.totalBaseCalculo,
      totalProtege15: resultado.resultado.totalProtege15,
      totalProtege2: resultado.resultado.totalProtege2,
      totalBeneficios: resultado.resultado.totalBeneficios,
      valorFinal: resultado.resultado.valorFinal,
      detalhes: relatorioBeneficios
    });

  } catch (error) {
    logError('Erro ao buscar detalhes do PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar detalhes do PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /protege/configuracao/:empresaId
 * Atualizar configuracao do PROTEGE
 */
router.put('/configuracao/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const configuracao = req.body;

    // Verificar se empresa existe
    const empresa = await EmpresaService.buscarEmpresa(empresaId);
    if (!empresa) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const novaConfiguracao = await ProtegeService.atualizarConfiguracao(empresaId, configuracao);    return res.json({
      success: true,
      message: 'Configuração do PROTEGE atualizada com sucesso',
      configuracao: {
        empresaId: novaConfiguracao.empresaId,
        regras: novaConfiguracao.regras.length,
        beneficios: novaConfiguracao.beneficios.length,
        ativo: novaConfiguracao.ativo,
        dataInicio: novaConfiguracao.dataInicio
      }
    });

  } catch (error) {
    logError('Erro ao atualizar configuracao do PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao atualizar configuracao do PROTEGE',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /protege/processar-pdfs
 * Processar PDFs do PROTEGE e extrair regras
 */
router.post('/processar-pdfs', upload.array('arquivos'), async (req, res) => {
  try {
    const { empresaId } = req.body;
    const arquivos = req.files as Express.Multer.File[];

    if (!empresaId || !arquivos || arquivos.length === 0) {
      return res.status(400).json({ 
        error: 'Empresa ID e arquivos são obrigatórios' 
      });
    }

    const arquivosProcessar = arquivos.map(arquivo => ({
      nome: arquivo.originalname,
      caminho: arquivo.path
    }));

    const configuracao = await ProtegeService.processarPdfsProtege(empresaId, arquivosProcessar);

    logInfo(`PDFs PROTEGE processados para empresa ${empresaId}`, {
      arquivos: arquivos.length,
      regras: configuracao.regras.length,
      beneficios: configuracao.beneficios.length
    });    return res.json({
      success: true,
      configuracao,
      message: 'PDFs processados com sucesso'
    });
  } catch (error) {
    logError('Erro ao processar PDFs PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar PDFs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /protege/teste-calculo
 * Endpoint para testar cálculos do PROTEGE
 */
router.post('/teste-calculo', async (req, res) => {
  try {
    const { empresaId, periodo, dadosTeste } = req.body;

    if (!empresaId || !periodo || !dadosTeste) {
      return res.status(400).json({ 
        error: 'Empresa ID, período e dados de teste são obrigatórios' 
      });
    }

    // Simular dados SPED Fiscal para teste
    const itensTeste = dadosTeste.itens || [];
    const regrasTeste = dadosTeste.regras || [];
    const creditoMesAnterior = dadosTeste.creditoMesAnterior || 0;

    // Importar ProtegeCalculator para teste
    const { ProtegeCalculator } = await import('../services/protege-calculator');
    
    const resultado = ProtegeCalculator.calcularProtege(
      itensTeste,
      regrasTeste,
      empresaId,
      periodo,
      creditoMesAnterior
    );    return res.json({
      success: true,
      resultado,
      dadosTeste: {
        itens: itensTeste.length,
        regras: regrasTeste.length,
        creditoMesAnterior
      }
    });
  } catch (error) {
    logError('Erro no teste de cálculo PROTEGE:', error);
    return res.status(500).json({ 
      error: 'Erro no teste de cálculo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/relatorio-credito-cruzado/:empresaId
 * Gerar relatório de crédito cruzado do PROTEGE 2%
 */
router.get('/relatorio-credito-cruzado/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { periodoInicio, periodoFim } = req.query;

    if (!periodoInicio || !periodoFim) {
      return res.status(400).json({ 
        error: 'Período início e fim são obrigatórios' 
      });
    }

    const relatorio = await ProtegeService.gerarRelatorioCreditoCruzado(
      empresaId,
      periodoInicio.toString(),
      periodoFim.toString()
    );    return res.json({
      success: true,
      relatorio
    });
  } catch (error) {
    logError('Erro ao gerar relatório de crédito cruzado:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar relatório de crédito cruzado',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/credito-mes-anterior/:empresaId/:periodo
 * Consultar crédito do mês anterior para PROTEGE 2%
 */
router.get('/credito-mes-anterior/:empresaId/:periodo', async (req, res) => {
  try {
    const { empresaId, periodo } = req.params;

    // Calcular mês anterior
    const ano = parseInt(periodo.substring(0, 4));
    const mes = parseInt(periodo.substring(4, 6));
    
    let anoAnterior = ano;
    let mesAnterior = mes - 1;
    
    if (mesAnterior < 1) {
      mesAnterior = 12;
      anoAnterior = ano - 1;
    }
    
    const mesAnteriorStr = `${anoAnterior.toString().padStart(4, '0')}${mesAnterior.toString().padStart(2, '0')}`;

    // Buscar pagamento do mês anterior (que será o crédito do mês atual)
    const { CacheService } = await import('../services/cache');
    const cache = new CacheService();
    const pagamentoMesAnterior = await cache.get<number>(`protege:pagamento2:${empresaId}:${mesAnteriorStr}`);

    res.json({
      success: true,
      empresaId,
      periodoAtual: periodo,
      mesAnterior: mesAnteriorStr,
      creditoMesAnterior: pagamentoMesAnterior || 0,
      message: `Crédito disponível do mês ${mesAnteriorStr} para compensar no mês ${periodo}`
    });
  } catch (error) {
    logError('Erro ao consultar crédito do mês anterior:', error);
    res.status(500).json({ 
      error: 'Erro ao consultar crédito do mês anterior',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /protege/historico-pagamentos/:empresaId
 * Consultar histórico de pagamentos PROTEGE 2% para controle de crédito cruzado
 */
router.get('/historico-pagamentos/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { periodoInicio, periodoFim } = req.query;

    if (!periodoInicio || !periodoFim) {
      return res.status(400).json({ 
        error: 'Período início e fim são obrigatórios' 
      });
    }

    // Buscar histórico de pagamentos do cache
    const { CacheService } = await import('../services/cache');
    const cache = new CacheService();
    
    const historico: Array<{ periodo: string; pagamento: number; mesCredito: string }> = [];
    
    // Gerar lista de períodos entre início e fim - usando type assertion para as strings
    const periodoInicioStr = periodoInicio as string;
    const periodoFimStr = periodoFim as string;
    
    const inicio = new Date(parseInt(periodoInicioStr.substring(0, 4)), parseInt(periodoInicioStr.substring(4, 6)) - 1, 1);
    const fim = new Date(parseInt(periodoFimStr.substring(0, 4)), parseInt(periodoFimStr.substring(4, 6)) - 1, 1);
    
    for (let data = new Date(inicio); data <= fim; data.setMonth(data.getMonth() + 1)) {
      const periodo = `${data.getFullYear()}${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      const pagamento = await cache.get<number>(`protege:pagamento2:${empresaId}:${periodo}`);
      
      if (pagamento && pagamento > 0) {
        // Calcular mês de crédito
        const ano = data.getFullYear();
        const mes = data.getMonth() + 1;
        let anoCredito = ano;
        let mesCredito = mes + 1;
        
        if (mesCredito > 12) {
          mesCredito = 1;
          anoCredito = ano + 1;
        }
        
        const mesCreditoStr = `${anoCredito.toString().padStart(4, '0')}${mesCredito.toString().padStart(2, '0')}`;
        
        historico.push({
          periodo,
          pagamento,
          mesCredito: mesCreditoStr
        });
      }
    }

    return res.json({
      success: true,
      empresaId,
      periodoInicio: periodoInicioStr,
      periodoFim: periodoFimStr,
      historico,
      totalPagamentos: historico.reduce((sum, item) => sum + item.pagamento, 0),
      message: 'Histórico de pagamentos PROTEGE 2% consultado com sucesso'
    });
  } catch (error) {
    logError('Erro ao consultar histórico de pagamentos:', error);
    return res.status(500).json({ 
      error: 'Erro ao consultar histórico de pagamentos',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 