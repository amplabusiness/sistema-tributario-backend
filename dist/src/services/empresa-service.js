"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmpresaService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = require("../utils/logger");
const logger_2 = __importDefault(require("../utils/logger"));
class EmpresaService {
    static async createOrUpdateEmpresa(data) {
        try {
            const empresa = await prisma_1.default.empresa.upsert({
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
                include: {
                    documentos: {
                        orderBy: { createdAt: 'desc' },
                        take: 10,
                    },
                },
            });
            (0, logger_1.logInfo)(`Empresa ${data.cnpj} criada/atualizada com sucesso`, {
                empresaId: empresa.id,
                cnpj: data.cnpj,
            });
            return empresa;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao criar/atualizar empresa', {
                error: error instanceof Error ? error.message : 'Unknown error',
                data,
            });
            throw error;
        }
    }
    static async getEmpresaByCnpj(cnpj) {
        try {
            const empresa = await prisma_1.default.empresa.findUnique({
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
            (0, logger_1.logError)('Erro ao buscar empresa por CNPJ', {
                error: error instanceof Error ? error.message : 'Unknown error',
                cnpj,
            });
            throw error;
        }
    }
    static async listEmpresas() {
        try {
            const empresas = await prisma_1.default.empresa.findMany({
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
            (0, logger_1.logError)('Erro ao listar empresas', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    static async getEmpresasByPeriod(ano, mes) {
        try {
            const startDate = new Date(ano, mes ? mes - 1 : 0, 1);
            const endDate = new Date(ano, mes ? mes : 11, mes ? 31 : 31, 23, 59, 59);
            const empresas = await prisma_1.default.empresa.findMany({
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
            (0, logger_1.logError)('Erro ao buscar empresas por período', {
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
                (0, logger_1.logWarn)('CNPJ não encontrado no arquivo', { filePath });
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
            (0, logger_1.logInfo)('Dados da empresa extraídos do arquivo', {
                filePath,
                cnpj: empresaData.cnpj,
                razaoSocial: empresaData.razaoSocial,
            });
            return empresaData;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao extrair dados da empresa do arquivo', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath,
            });
            return null;
        }
    }
    static async associateDocumentWithEmpresa(documentId, empresaId) {
        try {
            const document = await prisma_1.default.document.update({
                where: { id: documentId },
                data: { empresaId },
            });
            (0, logger_1.logInfo)('Documento associado à empresa', {
                documentId,
                empresaId,
                filename: document.filename,
            });
            return document;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao associar documento à empresa', {
                error: error instanceof Error ? error.message : 'Unknown error',
                documentId,
                empresaId,
            });
            throw error;
        }
    }
    static async getEmpresaStats() {
        try {
            const totalEmpresas = await prisma_1.default.empresa.count();
            const totalDocumentos = await prisma_1.default.document.count();
            const empresasPorRegime = await prisma_1.default.empresa.groupBy({
                by: ['regimeTributario'],
                _count: {
                    id: true,
                },
            });
            return {
                totalEmpresas,
                totalDocumentos,
                empresasPorRegime,
            };
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao obter estatísticas das empresas', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    static async listarEmpresas() {
        return this.listEmpresas();
    }
    static async buscarEmpresa(empresaId) {
        try {
            const empresa = await prisma_1.default.empresa.findUnique({
                where: { id: empresaId },
                include: {
                    documentos: {
                        select: {
                            id: true,
                            filename: true,
                            status: true,
                            createdAt: true
                        }
                    }
                }
            });
            return empresa;
        }
        catch (error) {
            logger_2.default.error(`Erro ao buscar empresa ${empresaId}:`, error);
            return null;
        }
    }
    static async findByCnpj(cnpj) {
        return this.getEmpresaByCnpj(cnpj);
    }
    static async createEmpresa(data) {
        return this.createOrUpdateEmpresa(data);
    }
}
exports.EmpresaService = EmpresaService;
//# sourceMappingURL=empresa-service.js.map