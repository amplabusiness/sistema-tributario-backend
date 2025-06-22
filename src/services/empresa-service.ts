import prisma from '../utils/prisma';
import { logInfo, logError, logWarn, logDebug } from '../utils/logger';
import logger from '../utils/logger';

export interface EmpresaData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  ie?: string;
  im?: string;
  cnae?: string;
  endereco?: string;
  regimeTributario?: string;
}

export interface EmpresaWithPeriod {
  empresa: EmpresaData;
  ano: number;
  mes?: number;
}

export class EmpresaService {
  /**
   * Cria ou atualiza uma empresa no banco de dados
   */  static async createOrUpdateEmpresa(data: EmpresaData) {
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
        include: {
          documentos: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      logInfo(`Empresa ${data.cnpj} criada/atualizada com sucesso`, {
        empresaId: empresa.id,
        cnpj: data.cnpj,
      });

      return empresa;
    } catch (error) {
      logError('Erro ao criar/atualizar empresa', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data,
      });
      throw error;
    }
  }

  /**
   * Busca uma empresa por CNPJ
   */
  static async getEmpresaByCnpj(cnpj: string) {
    try {
      const empresa = await prisma.empresa.findUnique({
        where: { cnpj },
        include: {
          documentos: {
            orderBy: { createdAt: 'desc' },
            take: 10, // Últimos 10 documentos
          },
        },
      });

      return empresa;
    } catch (error) {
      logError('Erro ao buscar empresa por CNPJ', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cnpj,
      });
      throw error;
    }
  }

  /**
   * Lista todas as empresas com informações básicas
   */
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
    } catch (error) {
      logError('Erro ao listar empresas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Busca empresas por período (ano/mês)
   */
  static async getEmpresasByPeriod(ano: number, mes?: number) {
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
    } catch (error) {
      logError('Erro ao buscar empresas por período', {
        error: error instanceof Error ? error.message : 'Unknown error',
        ano,
        mes,
      });
      throw error;
    }
  }

  /**
   * Extrai dados da empresa de um arquivo XML ou SPED
   */
  static async extractEmpresaFromFile(filePath: string, fileContent: string): Promise<EmpresaData | null> {
    try {
      // Lógica para extrair dados da empresa do arquivo
      // Esta é uma implementacao básica - será expandida pelo Agente 2
      
      const cnpjMatch = fileContent.match(/CNPJ[:\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
      const razaoSocialMatch = fileContent.match(/Razão Social[:\s]*([^\n\r]+)/i);
      const nomeFantasiaMatch = fileContent.match(/Nome Fantasia[:\s]*([^\n\r]+)/i);
      const ieMatch = fileContent.match(/IE[:\s]*([^\n\r]+)/i);
      const imMatch = fileContent.match(/IM[:\s]*([^\n\r]+)/i);
      const cnaeMatch = fileContent.match(/CNAE[:\s]*(\d+)/i);

      if (!cnpjMatch) {
        logWarn('CNPJ não encontrado no arquivo', { filePath });
        return null;
      }

      const empresaData: EmpresaData = {
        cnpj: cnpjMatch[1].replace(/[^\d]/g, ''), // Remove formatação
        razaoSocial: razaoSocialMatch?.[1]?.trim() || 'Empresa não identificada',
        nomeFantasia: nomeFantasiaMatch?.[1]?.trim(),
        ie: ieMatch?.[1]?.trim(),
        im: imMatch?.[1]?.trim(),
        cnae: cnaeMatch?.[1]?.trim(),
      };

      logInfo('Dados da empresa extraídos do arquivo', {
        filePath,
        cnpj: empresaData.cnpj,
        razaoSocial: empresaData.razaoSocial,
      });

      return empresaData;
    } catch (error) {
      logError('Erro ao extrair dados da empresa do arquivo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      return null;
    }
  }

  /**
   * Associa um documento a uma empresa
   */
  static async associateDocumentWithEmpresa(documentId: string, empresaId: string) {
    try {
      const document = await prisma.document.update({
        where: { id: documentId },
        data: { empresaId },
      });

      logInfo('Documento associado à empresa', {
        documentId,
        empresaId,
        filename: document.filename,
      });

      return document;
    } catch (error) {
      logError('Erro ao associar documento à empresa', {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId,
        empresaId,
      });
      throw error;
    }
  }

  /**
   * Obtém estatísticas das empresas
   */  static async getEmpresaStats() {
    try {
      const totalEmpresas = await prisma.empresa.count();
      const totalDocumentos = await prisma.document.count();

      const empresasPorRegime = await prisma.empresa.groupBy({
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
    } catch (error) {
      logError('Erro ao obter estatísticas das empresas', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Alias methods for backward compatibility and different naming conventions
  static async listarEmpresas() {
    return this.listEmpresas();
  }
  static async buscarEmpresa(empresaId: string) {
    try {
      const empresa = await prisma.empresa.findUnique({
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
    } catch (error) {
      logger.error(`Erro ao buscar empresa ${empresaId}:`, error);
      return null;
    }
  }

  static async findByCnpj(cnpj: string) {
    // Alias for getEmpresaByCnpj
    return this.getEmpresaByCnpj(cnpj);
  }

  static async createEmpresa(data: EmpresaData) {
    // Alias for createOrUpdateEmpresa
    return this.createOrUpdateEmpresa(data);
  }
}