import { Router } from 'express';
import prisma from '@/utils/prisma';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import multer from 'multer';
import { IcmsRulesExcelParser } from '../services/parsers/icms-rules-excel-parser';
import { IcmsApurador } from '../services/icms-apurador';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Middleware de autenticação para todas as rotas
router.use(authenticateToken);

/**
 * GET /api/sped-reports/empresas/:empresaId
 * Relatório consolidado por empresa
 */
router.get('/empresas/:empresaId', async (req, res) => {
  try {
    const { empresaId } = req.params;
    const { ano, mes, tipo } = req.query;

    // Buscar empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId }
    });

    if (!empresa) {
      return res.status(404).json({
        success: false,
        error: 'Empresa não encontrada'
      });
    }

    // Filtros
    const whereClause: any = { empresaId };
    if (ano) {
      whereClause.data = {
        startsWith: ano as string
      };
    }

    // Buscar dados SPED
    const [contribuicoesItens, contribuicoesApuracao, fiscalItens, fiscalApuracao] = await Promise.all([
      // SPED Contribuições - Itens
      prisma.spedContribuicoesItem.findMany({
        where: whereClause,
        orderBy: { data: 'desc' }
      }),
      // SPED Contribuições - Apuração
      prisma.spedContribuicoesApuracao.findMany({
        where: { empresaId },
        orderBy: { createdAt: 'desc' }
      }),
      // SPED Fiscal - Itens
      prisma.spedFiscalItem.findMany({
        where: whereClause,
        orderBy: { data: 'desc' }
      }),
      // SPED Fiscal - Apuração
      prisma.spedFiscalApuracao.findMany({
        where: { empresaId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Calcular totais
    const totais = {
      contribuicoes: {
        totalPis: contribuicoesItens.reduce((sum, item) => sum + item.valorPis, 0),
        totalCofins: contribuicoesItens.reduce((sum, item) => sum + item.valorCofins, 0),
        totalBasePis: contribuicoesItens.reduce((sum, item) => sum + item.basePis, 0),
        totalBaseCofins: contribuicoesItens.reduce((sum, item) => sum + item.baseCofins, 0),
        itensCount: contribuicoesItens.length
      },
      fiscal: {
        totalIcms: fiscalItens.reduce((sum, item) => sum + item.valorIcms, 0),
        totalIpi: fiscalItens.reduce((sum, item) => sum + item.valorIpi, 0),
        totalBaseIcms: fiscalItens.reduce((sum, item) => sum + item.baseIcms, 0),
        totalBaseIpi: fiscalItens.reduce((sum, item) => sum + item.baseIpi, 0),
        itensCount: fiscalItens.length
      }
    };    return res.json({
      success: true,
      empresa,
      totais,
      dados: {
        contribuicoes: {
          itens: contribuicoesItens,
          apuracao: contribuicoesApuracao
        },
        fiscal: {
          itens: fiscalItens,
          apuracao: fiscalApuracao
        }
      }
    });
  } catch (error) {
    logger.error('Erro ao gerar relatório por empresa', {
      error: error instanceof Error ? error.message : 'Unknown error',
      empresaId: req.params.empresaId
    });

    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/sped-reports/consolidado
 * Relatório consolidado geral
 */
router.get('/consolidado', async (req, res) => {
  try {
    const { ano, mes } = req.query;

    // Filtros
    const whereClause: any = {};
    if (ano) {
      whereClause.data = {
        startsWith: ano as string
      };
    }

    // Buscar totais consolidados
    const [contribuicoesItens, fiscalItens, empresas] = await Promise.all([
      prisma.spedContribuicoesItem.findMany({
        where: whereClause,
        include: { empresa: true }
      }),
      prisma.spedFiscalItem.findMany({
        where: whereClause,
        include: { empresa: true }
      }),
      prisma.empresa.findMany({
        include: {
          _count: {
            select: {
              documentos: true
            }
          }
        }
      })
    ]);

    // Calcular totais gerais
    const totaisGerais = {
      pis: contribuicoesItens.reduce((sum, item) => sum + item.valorPis, 0),
      cofins: contribuicoesItens.reduce((sum, item) => sum + item.valorCofins, 0),
      icms: fiscalItens.reduce((sum, item) => sum + item.valorIcms, 0),
      ipi: fiscalItens.reduce((sum, item) => sum + item.valorIpi, 0),
      empresas: empresas.length,
      documentos: contribuicoesItens.length + fiscalItens.length
    };

    // Agrupar por empresa
    const porEmpresa = empresas.map(empresa => {
      const itensEmpresa = contribuicoesItens.filter(item => item.empresaId === empresa.id);
      const itensFiscalEmpresa = fiscalItens.filter(item => item.empresaId === empresa.id);
      
      return {
        empresa: {
          id: empresa.id,
          cnpj: empresa.cnpj,
          razaoSocial: empresa.razaoSocial
        },
        totais: {
          pis: itensEmpresa.reduce((sum, item) => sum + item.valorPis, 0),
          cofins: itensEmpresa.reduce((sum, item) => sum + item.valorCofins, 0),
          icms: itensFiscalEmpresa.reduce((sum, item) => sum + item.valorIcms, 0),
          ipi: itensFiscalEmpresa.reduce((sum, item) => sum + item.valorIpi, 0)
        }
      };
    });

    res.json({
      success: true,
      totaisGerais,
      porEmpresa,
      periodo: { ano, mes }
    });

  } catch (error) {
    logger.error('Erro ao gerar relatório consolidado', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * GET /api/sped-reports/produtos
 * Relatório por produto
 */
router.get('/produtos', async (req, res) => {
  try {
    const { empresaId, cfop, cst } = req.query;

    // Filtros
    const whereClause: any = {};
    if (empresaId) whereClause.empresaId = empresaId as string;
    if (cfop) whereClause.cfop = cfop as string;
    if (cst) whereClause.cst = cst as string;

    // Buscar itens
    const [contribuicoesItens, fiscalItens] = await Promise.all([
      prisma.spedContribuicoesItem.findMany({
        where: whereClause,
        include: { empresa: true },
        orderBy: { valor: 'desc' }
      }),
      prisma.spedFiscalItem.findMany({
        where: whereClause,
        include: { empresa: true },
        orderBy: { valor: 'desc' }
      })
    ]);

    // Agrupar por produto
    const produtos = new Map();

    // Processar itens de contribuições
    contribuicoesItens.forEach(item => {
      const key = item.produto;
      if (!produtos.has(key)) {
        produtos.set(key, {
          produto: item.produto,
          cfop: item.cfop,
          cst: item.cst,
          pis: 0,
          cofins: 0,
          icms: 0,
          ipi: 0,
          valor: 0,
          quantidade: 0
        });
      }
      const produto = produtos.get(key);
      produto.pis += item.valorPis;
      produto.cofins += item.valorCofins;
      produto.valor += item.valor;
      produto.quantidade++;
    });

    // Processar itens fiscais
    fiscalItens.forEach(item => {
      const key = item.produto;
      if (!produtos.has(key)) {
        produtos.set(key, {
          produto: item.produto,
          cfop: item.cfop,
          cst: item.cst,
          pis: 0,
          cofins: 0,
          icms: 0,
          ipi: 0,
          valor: 0,
          quantidade: 0
        });
      }
      const produto = produtos.get(key);
      produto.icms += item.valorIcms;
      produto.ipi += item.valorIpi;
      produto.valor += item.valor;
      produto.quantidade++;
    });

    res.json({
      success: true,
      produtos: Array.from(produtos.values()),
      filtros: { empresaId, cfop, cst }
    });

  } catch (error) {
    logger.error('Erro ao gerar relatório por produto', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * POST /api/sped-reports/icms-apuracao
 * Apuração dinâmica de ICMS por empresa, período e regras Excel
 */
router.post('/icms-apuracao', upload.single('regras'), async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.body;
    if (!empresaId || !req.file) {
      return res.status(400).json({ success: false, error: 'empresaId e arquivo de regras são obrigatórios' });
    }
    // Carregar regras do Excel
    const regras = IcmsRulesExcelParser.parseFile(req.file.path);
    // Buscar itens do SPED Fiscal
    const whereClause: any = { empresaId };
    if (ano) whereClause.data = { startsWith: ano };
    if (mes) whereClause.data = { startsWith: `${ano || ''}-${mes.toString().padStart(2, '0')}` };
    const itens = await prisma.spedFiscalItem.findMany({ where: whereClause });
    // Apurar ICMS
    const resultado = IcmsApurador.apurarICMS(itens, regras);    return res.json({ success: true, resultado, regrasCount: regras.length, itensCount: itens.length });
  } catch (error) {
    logger.error('Erro na apuracao dinâmica de ICMS', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
  }
});

export default router;