"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentIndexer = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("@/utils/logger");
const sped_fiscal_parser_1 = require("./parsers/sped-fiscal-parser");
class DocumentIndexer {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    async indexXMLData(documentId, empresaId, xmlData) {
        try {
            (0, logger_1.logInfo)('Iniciando indexação de XML', {
                documentId,
                empresaId,
                tipoDocumento: xmlData.tipoDocumento,
                numeroDocumento: xmlData.numeroDocumento,
            });
            const documento = await this.prisma.xmlDocument.create({
                data: {
                    documentId,
                    empresaId,
                    tipoDocumento: xmlData.tipoDocumento,
                    numeroDocumento: xmlData.numeroDocumento,
                    serie: xmlData.serie,
                    dataEmissao: xmlData.dataEmissao,
                    valorTotal: xmlData.valorTotal,
                    cnpjEmitente: xmlData.cnpjEmitente,
                    cnpjDestinatario: xmlData.cnpjDestinatario,
                    cpfDestinatario: xmlData.cpfDestinatario,
                    chaveAcesso: xmlData.chaveAcesso,
                    protocolo: xmlData.protocolo,
                    status: xmlData.status,
                    observacoes: xmlData.observacoes,
                    valorTotalIcms: xmlData.impostos.valorTotalIcms,
                    valorTotalIpi: xmlData.impostos.valorTotalIpi,
                    valorTotalPis: xmlData.impostos.valorTotalPis,
                    valorTotalCofins: xmlData.impostos.valorTotalCofins,
                    valorTotalIss: xmlData.impostos.valorTotalIss,
                    baseCalculoIcms: xmlData.impostos.baseCalculoIcms,
                    baseCalculoPis: xmlData.impostos.baseCalculoPis,
                    baseCalculoCofins: xmlData.impostos.baseCalculoCofins,
                },
            });
            for (const item of xmlData.itens) {
                await this.prisma.xmlItem.create({
                    data: {
                        xmlDocumentId: documento.id,
                        codigo: item.codigo,
                        descricao: item.descricao,
                        ncm: item.ncm,
                        cfop: item.cfop,
                        quantidade: item.quantidade,
                        valorUnitario: item.valorUnitario,
                        valorTotal: item.valorTotal,
                        cst: item.cst,
                        aliquotaIcms: item.aliquotaIcms,
                        valorIcms: item.valorIcms,
                        aliquotaIpi: item.aliquotaIpi,
                        valorIpi: item.valorIpi,
                        aliquotaPis: item.aliquotaPis,
                        valorPis: item.valorPis,
                        aliquotaCofins: item.aliquotaCofins,
                        valorCofins: item.valorCofins,
                    },
                });
            }
            (0, logger_1.logInfo)('Indexação de XML concluída com sucesso', {
                documentId,
                documentoId: documento.id,
                itensIndexados: xmlData.itens.length,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro na indexação de XML', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async indexSpedFiscalData(documentId, empresaId, spedData) {
        try {
            (0, logger_1.logInfo)('Iniciando indexação de SPED Fiscal', {
                documentId,
                empresaId,
                registros: spedData.registros.length,
            });
            const itens = sped_fiscal_parser_1.SpedFiscalParser.consolidarIcmsIpi(spedData);
            for (const item of itens) {
                await this.prisma.spedFiscalItem.create({
                    data: {
                        documentId,
                        empresaId,
                        documento: item.documento,
                        data: item.data,
                        cnpj: item.cnpj,
                        produto: item.produto,
                        cfop: item.cfop,
                        cst: item.cst,
                        ncm: item.ncm,
                        valor: item.valor,
                        baseIcms: item.baseIcms,
                        valorIcms: item.valorIcms,
                        baseIpi: item.baseIpi,
                        valorIpi: item.valorIpi,
                    },
                });
            }
            const apuracoes = sped_fiscal_parser_1.SpedFiscalParser.consolidarApuracao(spedData);
            for (const apuracao of apuracoes) {
                await this.prisma.spedFiscalApuracao.create({
                    data: {
                        documentId,
                        empresaId,
                        cst: apuracao.cst,
                        cfop: apuracao.cfop,
                        aliquota: apuracao.aliquota,
                        valorOperacao: apuracao.valorOperacao,
                        baseIcms: apuracao.baseIcms,
                        valorIcms: apuracao.valorIcms,
                        baseIcmsSt: apuracao.baseIcmsSt,
                        valorIcmsSt: apuracao.valorIcmsSt,
                        valorRedBc: apuracao.valorRedBc,
                        valorIpi: apuracao.valorIpi,
                    },
                });
            }
            (0, logger_1.logInfo)('Indexação de SPED Fiscal concluída com sucesso', {
                documentId,
                itensIndexados: itens.length,
                apuracoesIndexadas: apuracoes.length,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro na indexação de SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async indexSpedContribuicoesData(documentId, empresaId, spedData) {
        try {
            (0, logger_1.logInfo)('Iniciando indexação de SPED Contribuições', {
                documentId,
                empresaId,
            });
            (0, logger_1.logInfo)('Indexação de SPED Contribuições concluída com sucesso', {
                documentId,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro na indexação de SPED Contribuições', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async buscarDocumentos(empresaId, dataInicio, dataFim, tipoDocumento) {
        try {
            const where = {
                empresaId,
                dataEmissao: {
                    gte: dataInicio,
                    lte: dataFim,
                },
            };
            if (tipoDocumento) {
                where.tipoDocumento = tipoDocumento;
            }
            const documentos = await this.prisma.xmlDocument.findMany({
                where,
                include: {
                    itens: true,
                },
                orderBy: {
                    dataEmissao: 'desc',
                },
            });
            return documentos;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar documentos', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async buscarItensSpedFiscal(empresaId, dataInicio, dataFim) {
        try {
            const itens = await this.prisma.spedFiscalItem.findMany({
                where: {
                    empresaId,
                    data: {
                        gte: dataInicio,
                        lte: dataFim,
                    },
                },
                orderBy: {
                    data: 'desc',
                },
            });
            return itens;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar itens SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async buscarApuracaoSpedFiscal(empresaId, dataInicio, dataFim) {
        try {
            const apuracoes = await this.prisma.spedFiscalApuracao.findMany({
                where: {
                    empresaId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            return apuracoes;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar apurações SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async validarDadosFiscais(dados) {
        const erros = [];
        const avisos = [];
        try {
            if (dados.cnpjEmitente && !this.validarCNPJ(dados.cnpjEmitente)) {
                erros.push('CNPJ do emitente inválido');
            }
            if (dados.cnpjDestinatario && !this.validarCNPJ(dados.cnpjDestinatario)) {
                erros.push('CNPJ do destinatário inválido');
            }
            if (dados.cst && !this.validarCST(dados.cst)) {
                avisos.push('CST pode estar incorreto');
            }
            if (dados.cfop && !this.validarCFOP(dados.cfop)) {
                avisos.push('CFOP pode estar incorreto');
            }
            if (dados.ncm && !this.validarNCM(dados.ncm)) {
                avisos.push('NCM pode estar incorreto');
            }
            return {
                valido: erros.length === 0,
                erros,
                avisos,
            };
        }
        catch (error) {
            (0, logger_1.logError)('Erro na validação de dados fiscais', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    validarCNPJ(cnpj) {
        const cnpjLimpo = cnpj.replace(/\D/g, '');
        if (cnpjLimpo.length !== 14)
            return false;
        if (/^(\d)\1{13}$/.test(cnpjLimpo))
            return false;
        let soma = 0;
        let peso = 2;
        for (let i = 11; i >= 0; i--) {
            soma += parseInt(cnpjLimpo.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        const digito1 = ((soma % 11) < 2) ? 0 : 11 - (soma % 11);
        soma = 0;
        peso = 2;
        for (let i = 12; i >= 0; i--) {
            soma += parseInt(cnpjLimpo.charAt(i)) * peso;
            peso = peso === 9 ? 2 : peso + 1;
        }
        const digito2 = ((soma % 11) < 2) ? 0 : 11 - (soma % 11);
        return parseInt(cnpjLimpo.charAt(12)) === digito1 &&
            parseInt(cnpjLimpo.charAt(13)) === digito2;
    }
    validarCST(cst) {
        const cstsValidos = [
            '00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'
        ];
        return cstsValidos.includes(cst);
    }
    validarCFOP(cfop) {
        if (cfop.length !== 4)
            return false;
        const primeiroDigito = parseInt(cfop.charAt(0));
        return primeiroDigito >= 1 && primeiroDigito <= 7;
    }
    validarNCM(ncm) {
        return ncm.length === 8 && /^\d{8}$/.test(ncm);
    }
}
exports.DocumentIndexer = DocumentIndexer;
//# sourceMappingURL=document-indexer.js.map