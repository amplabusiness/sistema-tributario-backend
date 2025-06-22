"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmpresaService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class EmpresaService {
    static async createOrUpdateEmpresa(data) {
        try {
            const empresa = await prisma.empresa.upsert({
                where: { cnpj: data.cnpj },
                update: {
                    razaoSocial: data.razaoSocial,
                    nomeFantasia: data.nomeFantasia,
                    ie: data.ie,
                    im: data.im,
                    cnae: data.cnae,
                    endereco: data.endereco,
                    regimeTributario: data.regimeTributario,
                    updatedAt: new Date(),
                },
                create: {
                    cnpj: data.cnpj,
                    razaoSocial: data.razaoSocial,
                    nomeFantasia: data.nomeFantasia,
                    ie: data.ie,
                    im: data.im,
                    cnae: data.cnae,
                    endereco: data.endereco,
                    regimeTributario: data.regimeTributario,
                },
            });
            logger_1.logger.info(`Empresa ${data.cnpj} criada/atualizada com sucesso`, {
                empresaId: empresa.id,
                cnpj: data.cnpj,
            });
            return empresa;
        }
        catch (error) {
            logger_1.logger.error('Erro ao criar/atualizar empresa', {
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error;
        }
    }
    static async getEmpresaByCnpj(cnpj) {
        try {
            const empresa = await prisma.empresa.findUnique({
                where: { cnpj },
                include: {
                    documentos: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    },
                },
            });
            return empresa;
        }
        catch (error) {
            logger_1.logger.error('Erro ao buscar empresa por CNPJ', {
                error: error instanceof Error ? error.message : 'Unknown error',
                cnpj,
            });
            throw error;
        }
    }
    static async listEmpresas() {
        try {
            const empresas = await prisma.empresa.findMany({
                select: {
                    id: true,
                    cnpj: true,
                    razaoSocial: true,
                    nomeFantasia: true,
                    regimeTributario: true,
                    dataCadastro: true,
                    _count: {
                        select: {
                            documentos: true,
                        },
                    },
                },
                orderBy: { razaoSocial: 'asc' },
            });
            return empresas;
        }
        catch (error) {
            logger_1.logger.error('Erro ao listar empresas', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    static async getEmpresasByPeriod(ano, mes) {
        try {
            const startDate = new Date(ano, mes ? mes - 1 : 0, 1);
            const endDate = new Date(ano, mes ? mes : 11, mes ? 31 : 31, 23, 59, 59);
            const empresas = await prisma.empresa.findMany({
                where: {
                    documentos: {
                        some: {
                            createdAt: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                    },
                },
                include: {
                    documentos: {
                        where: {
                            createdAt: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
            return empresas;
        }
        catch (error) {
            logger_1.logger.error('Erro ao buscar empresas por período', {
                error: error instanceof Error ? error.message : 'Unknown error',
                ano,
                mes,
            });
            throw error;
        }
    }
    static async extractEmpresaFromFile(filePath, fileContent) {
        try {
            const cnpjMatch = fileContent.match(/CNPJ[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
            const razaoSocialMatch = fileContent.match(/Razão Social[:\s]*([^\n\r]+)/i);
            const nomeFantasiaMatch = fileContent.match(/Nome Fantasia[:\s]*([^\n\r]+)/i);
            const ieMatch = fileContent.match(/IE[:\s]*([^\n\r]+)/i);
            const imMatch = fileContent.match(/IM[:\s]*([^\n\r]+)/i);
            const cnaeMatch = fileContent.match(/CNAE[:\s]*(\d+)/i);
            if (!cnpjMatch) {
                logger_1.logger.warn('CNPJ não encontrado no arquivo', { filePath });
                return null;
            }
            const empresaData = {
                cnpj: cnpjMatch[1].replace(/[^\d]/g, ''),
                razaoSocial: razaoSocialMatch?.[1]?.trim() || 'Empresa não identificada',
                nomeFantasia: nomeFantasiaMatch?.[1]?.trim(),
                ie: ieMatch?.[1]?.trim(),
                im: imMatch?.[1]?.trim(),
                cnae: cnaeMatch?.[1]?.trim(),
            };
            logger_1.logger.info('Dados da empresa extraídos do arquivo', {
                filePath,
                cnpj: empresaData.cnpj,
                razaoSocial: empresaData.razaoSocial,
            });
            return empresaData;
        }
        catch (error) {
            logger_1.logger.error('Erro ao extrair dados da empresa do arquivo', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath,
            });
            return null;
        }
    }
    static async associateDocumentWithEmpresa(documentId, empresaId) {
        try {
            const document = await prisma.document.update({
                where: { id: documentId },
                data: { empresaId },
            });
            logger_1.logger.info('Documento associado à empresa', {
                documentId,
                empresaId,
                filename: document.filename,
            });
            return document;
        }
        catch (error) {
            logger_1.logger.error('Erro ao associar documento à empresa', {
                error: error instanceof Error ? error.message : 'Unknown error',
                documentId,
                empresaId,
            });
            throw error;
        }
    }
    static async getEmpresaStats() {
        try {
            const stats = await prisma.empresa.aggregate({
                _count: {
                    id: true,
                },
                _count: {
                    documentos: true,
                },
            });
            const empresasPorRegime = await prisma.empresa.groupBy({
                by: ['regimeTributario'],
                _count: {
                    id: true,
                },
            });
            return {
                totalEmpresas: stats._count.id,
                totalDocumentos: stats._count.documentos,
                empresasPorRegime,
            };
        }
        catch (error) {
            logger_1.logger.error('Erro ao obter estatísticas das empresas', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
}
exports.EmpresaService = EmpresaService;
//# sourceMappingURL=empresa-service.js.map