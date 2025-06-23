import { Router } from 'express';
import { DocumentParsingAgent } from '../services/agents/document-parsing-agent';
import { logInfo, logError } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const documentParsingAgent = DocumentParsingAgent.getInstance();

/**
 * POST /api/document-parsing/process
 * Processa um documento individual
 */
router.post('/process', authenticateToken, async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Caminho do arquivo não fornecido' });
    }

    logInfo(`Iniciando processamento de documento: ${filePath}`);

    const result = await documentParsingAgent.processDocument(filePath);

    return res.json({
      success: true,
      data: result,
      message: 'Documento processado com sucesso'
    });
  } catch (error) {
    logError('Erro no processamento de documento', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * POST /api/document-parsing/batch
 * Processa múltiplos documentos em lote
 */
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { filePaths } = req.body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'Lista de arquivos não fornecida' });
    }
    
    logInfo(`Iniciando processamento em lote: ${filePaths.length} arquivos`);

    const result = await documentParsingAgent.processBatch(filePaths);

    return res.json({
      success: true,
      data: result,
      message: `Lote processado: ${result.successCount}/${result.totalFiles} sucessos`
    });

  } catch (error) {
    logError('Erro no processamento em lote', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/document-parsing/validate/:documentId
 * Valida e corrige dados de um documento
 */
router.get('/validate/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    logInfo(`Validando documento: ${documentId}`);

    const result = await documentParsingAgent.validateAndCorrectData(documentId);

    return res.json({
      success: true,
      data: result,
      message: 'Documento validado e corrigido'
    });

  } catch (error) {
    logError('Erro na validacao de documento', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/document-parsing/extract-company/:companyId
 * Extrai dados cadastrais de todos os documentos de uma empresa
 */
router.get('/extract-company/:companyId', authenticateToken, async (req, res) => {
  try {
    const { companyId } = req.params;

    logInfo(`Extraindo dados cadastrais da empresa: ${companyId}`);

    const companyData = await documentParsingAgent.extractCompanyDataFromDocuments(companyId);

    return res.json({
      success: true,
      data: companyData,
      message: 'Dados cadastrais extraídos com sucesso'
    });

  } catch (error) {
    logError('Erro na extração de dados cadastrais', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/document-parsing/report
 * Gera relatório de extração de dados
 */
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    const dateRange = startDate && endDate ? {
      start: new Date(startDate as string),
      end: new Date(endDate as string)
    } : undefined;

    logInfo('Gerando relatório de extração', { companyId, dateRange });

    const report = await documentParsingAgent.generateExtractionReport(
      companyId as string,
      dateRange
    );

    return res.json({
      success: true,
      data: report,
      message: 'Relatório gerado com sucesso'
    });

  } catch (error) {
    logError('Erro na geração de relatório', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/document-parsing/status
 * Status do agente de parsing
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        agent: 'DocumentParsingAgent',
        status: 'active',
        version: '1.0.0',
        capabilities: [
          'SPED Fiscal parsing',
          'SPED Contribuições parsing',
          'Excel rules parsing',
          'PDF parsing',
          'Automatic company registration',
          'Data validation and correction',
          'Batch processing',
          'Report generation'
        ],
        supportedFormats: ['.txt', '.xlsx', '.xls', '.pdf'],
        timestamp: new Date()
      }
    });

  } catch (error) {
    logError('Erro ao obter status do agente', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/document-parsing/process-folder
 * Processa todos os documentos de uma pasta
 */
router.post('/process-folder', authenticateToken, async (req, res) => {
  try {
    const { folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'Caminho da pasta não fornecido' });
    }

    logInfo(`Processando pasta: ${folderPath}`);

    // Aqui você pode integrar com o MultiEmpresaWatcher para processar a pasta
    // Por enquanto, retornamos uma resposta de exemplo
    return res.json({
      success: true,
      data: {
        folderPath,
        status: 'processing',
        message: 'Pasta em processamento'
      }
    });

  } catch (error) {
    logError('Erro no processamento de pasta', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/document-parsing/validation-rules
 * Retorna as regras de validacao aplicadas
 */
router.get('/validation-rules', authenticateToken, async (req, res) => {
  try {
    const validationRules = {
      cnpj: {
        description: 'CNPJ deve ter 14 dígitos e ser válido',
        pattern: '^\\d{14}$',
        validation: 'Dígitos verificadores válidos'
      },
      ie: {
        description: 'IE deve ter entre 8 e 12 dígitos',
        pattern: '^\\d{8,12}$',
        validation: 'Formato básico de IE'
      },
      cfop: {
        description: 'CFOP deve ter 4 dígitos',
        pattern: '^\\d{4}$',
        validation: 'CFOP válido'
      },
      cst: {
        description: 'CST deve ter 2 ou 3 dígitos',
        pattern: '^\\d{2,3}$',
        validation: 'CST válido'
      },
      ncm: {
        description: 'NCM deve ter 8 dígitos',
        pattern: '^\\d{8}$',
        validation: 'NCM válido'
      }
    };

    return res.json({
      success: true,
      data: validationRules,
      message: 'Regras de validacao'
    });

  } catch (error) {
    logError('Erro ao obter regras de validacao', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
