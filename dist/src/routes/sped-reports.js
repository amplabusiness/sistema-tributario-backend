"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("@/utils/prisma"));
const auth_1 = require("../middleware/auth");
const logger_1 = __importDefault(require("../utils/logger"));
const multer_1 = __importDefault(require("multer"));
const icms_rules_excel_parser_1 = require("../services/parsers/icms-rules-excel-parser");
const icms_apurador_1 = require("../services/icms-apurador");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: 'uploads/' });
router.use(auth_1.authenticateToken);
router.get('/empresas/:empresaId', async (req, res) => {
    try {
        const { empresaId } = req.params;
        const { ano, mes, tipo } = req.query;
        const empresa = await prisma_1.default.empresa.findUnique({
            where: { id: empresaId }
        });
        if (!empresa) {
            return res.status(404).json({
                success: false,
                error: 'Empresa não encontrada'
            });
        }
        const whereClause = { empresaId };
        if (ano) {
            whereClause.data = {
                startsWith: ano
            };
        }
        const [contribuicoesItens, contribuicoesApuracao, fiscalItens, fiscalApuracao] = await Promise.all([
            prisma_1.default.spedContribuicoesItem.findMany({
                where: whereClause,
                orderBy: { data: 'desc' }
            }),
            prisma_1.default.spedContribuicoesApuracao.findMany({
                where: { empresaId },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.spedFiscalItem.findMany({
                where: whereClause,
                orderBy: { data: 'desc' }
            }),
            prisma_1.default.spedFiscalApuracao.findMany({
                where: { empresaId },
                orderBy: { createdAt: 'desc' }
            })
        ]);
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
        };
        return res.json({
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
    }
    catch (error) {
        logger_1.default.error('Erro ao gerar relatório por empresa', {
            error: error instanceof Error ? error.message : 'Unknown error',
            empresaId: req.params.empresaId
        });
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/consolidado', async (req, res) => {
    try {
        const { ano, mes } = req.query;
        const whereClause = {};
        if (ano) {
            whereClause.data = {
                startsWith: ano
            };
        }
        const [contribuicoesItens, fiscalItens, empresas] = await Promise.all([
            prisma_1.default.spedContribuicoesItem.findMany({
                where: whereClause,
                include: { empresa: true }
            }),
            prisma_1.default.spedFiscalItem.findMany({
                where: whereClause,
                include: { empresa: true }
            }),
            prisma_1.default.empresa.findMany({
                include: {
                    _count: {
                        select: {
                            documentos: true
                        }
                    }
                }
            })
        ]);
        const totaisGerais = {
            pis: contribuicoesItens.reduce((sum, item) => sum + item.valorPis, 0),
            cofins: contribuicoesItens.reduce((sum, item) => sum + item.valorCofins, 0),
            icms: fiscalItens.reduce((sum, item) => sum + item.valorIcms, 0),
            ipi: fiscalItens.reduce((sum, item) => sum + item.valorIpi, 0),
            empresas: empresas.length,
            documentos: contribuicoesItens.length + fiscalItens.length
        };
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
    }
    catch (error) {
        logger_1.default.error('Erro ao gerar relatório consolidado', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.get('/produtos', async (req, res) => {
    try {
        const { empresaId, cfop, cst } = req.query;
        const whereClause = {};
        if (empresaId)
            whereClause.empresaId = empresaId;
        if (cfop)
            whereClause.cfop = cfop;
        if (cst)
            whereClause.cst = cst;
        const [contribuicoesItens, fiscalItens] = await Promise.all([
            prisma_1.default.spedContribuicoesItem.findMany({
                where: whereClause,
                include: { empresa: true },
                orderBy: { valor: 'desc' }
            }),
            prisma_1.default.spedFiscalItem.findMany({
                where: whereClause,
                include: { empresa: true },
                orderBy: { valor: 'desc' }
            })
        ]);
        const produtos = new Map();
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
    }
    catch (error) {
        logger_1.default.error('Erro ao gerar relatório por produto', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
router.post('/icms-apuracao', upload.single('regras'), async (req, res) => {
    try {
        const { empresaId, ano, mes } = req.body;
        if (!empresaId || !req.file) {
            return res.status(400).json({ success: false, error: 'empresaId e arquivo de regras são obrigatórios' });
        }
        const regras = icms_rules_excel_parser_1.IcmsRulesExcelParser.parseFile(req.file.path);
        const whereClause = { empresaId };
        if (ano)
            whereClause.data = { startsWith: ano };
        if (mes)
            whereClause.data = { startsWith: `${ano || ''}-${mes.toString().padStart(2, '0')}` };
        const itens = await prisma_1.default.spedFiscalItem.findMany({ where: whereClause });
        const resultado = icms_apurador_1.IcmsApurador.apurarICMS(itens, regras);
        return res.json({ success: true, resultado, regrasCount: regras.length, itensCount: itens.length });
    }
    catch (error) {
        logger_1.default.error('Erro na apuração dinâmica de ICMS', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
});
exports.default = router;
//# sourceMappingURL=sped-reports.js.map