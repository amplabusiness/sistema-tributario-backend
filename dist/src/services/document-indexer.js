"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentIndexer = void 0;
const sped_fiscal_parser_1 = require("./parsers/sped-fiscal-parser");
const prisma_1 = __importDefault(require("@/utils/prisma"));
class DocumentIndexer {
    async indexXMLData(documentId, empresaId, xmlData) {
        try {
            console.log('Iniciando indexação de XML', {
                documentId,
                empresaId,
                tipoDocumento: xmlData.tipoDocumento,
                numeroDocumento: xmlData.numeroDocumento,
            });
            const documento = await prisma_1.default.xMLDocument.create({
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
                await prisma_1.default.xMLItem.create({
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
            console.log('Indexação de XML concluída com sucesso', {
                documentId,
                documentoId: documento.id,
                itensIndexados: xmlData.itens.length,
            });
        }
        catch (error) {
            console.error('Erro na indexação de XML', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async indexSpedFiscalData(documentId, empresaId, spedData) {
        try {
            console.log('Iniciando indexação de SPED Fiscal', {
                documentId,
                empresaId,
                registros: spedData.registros.length,
            });
            const itens = sped_fiscal_parser_1.SpedFiscalParser.consolidarIcmsIpi(spedData);
            for (const item of itens) {
                await prisma_1.default.spedFiscalItem.create({
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
                await prisma_1.default.spedFiscalApuracao.create({
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
            console.log('Indexação de SPED Fiscal concluída com sucesso', {
                documentId,
                itensIndexados: itens.length,
                apuracoesIndexadas: apuracoes.length,
            });
        }
        catch (error) {
            console.error('Erro na indexação de SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async indexSpedContribuicoesData(documentId, empresaId, spedData) {
        try {
            console.log('Iniciando indexação de SPED Contribuições', {
                documentId,
                empresaId,
            });
            console.log('Indexação de SPED Contribuições concluída com sucesso', {
                documentId,
            });
        }
        catch (error) {
            console.error('Erro na indexação de SPED Contribuições', error instanceof Error ? error : new Error('Unknown error'));
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
            const documentos = await prisma_1.default.xMLDocument.findMany({
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
            console.error('Erro ao buscar documentos', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async buscarItensSpedFiscal(empresaId, dataInicio, dataFim) {
        try {
            const itens = await prisma_1.default.spedFiscalItem.findMany({
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
            console.error('Erro ao buscar itens SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async buscarApuracaoSpedFiscal(empresaId, dataInicio, dataFim) {
        try {
            const apuracoes = await prisma_1.default.spedFiscalApuracao.findMany({
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
            console.error('Erro ao buscar apurações SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
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
            console.error('Erro na validacao de dados fiscais', error instanceof Error ? error : new Error('Unknown error'));
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
    async indexarDocumento(input) {
        try {
            return {
                id: 'doc-' + Date.now(),
                tipo: input.tipo,
                conteudo: input.conteudo,
                metadata: {
                    userId: input.userId,
                    empresaId: input.empresaId,
                    createdAt: new Date(),
                }
            };
        }
        catch (error) {
            throw new Error(`Erro ao indexar documento: ${error.message}`);
        }
    }
}
exports.DocumentIndexer = DocumentIndexer;
//# sourceMappingURL=document-indexer.js.map