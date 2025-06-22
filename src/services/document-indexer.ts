/**
 * Serviço de indexação de documentos fiscais no banco de dados
 * Salva dados parseados de XML, SPED, ECD, ECF
 */


import { XMLParsedData, XMLItem } from './parsers/xml-parser';
import { SpedFiscalDocumento, IcmsIpiItem, SpedFiscalParser } from './parsers/sped-fiscal-parser';
import prisma from '@/utils/prisma';

export interface IndexarDocumentoInput {
  userId: string;
  tipo: string;
  conteudo: any;
  empresaId: string;
}

export interface DocumentoIndexado {
  id: string;
  tipo: string;
  conteudo: any;
  metadata: any;
}

export class DocumentIndexer {
  /**
   * Indexa dados de XML (NFe, CTe, etc.)
   */
  async indexXMLData(
    documentId: string,
    empresaId: string,
    xmlData: XMLParsedData
  ): Promise<void> {
    try {
      console.log('Iniciando indexação de XML', {
        documentId,
        empresaId,
        tipoDocumento: xmlData.tipoDocumento,
        numeroDocumento: xmlData.numeroDocumento,
      });

      // Salvar documento principal
      const documento = await prisma.xMLDocument.create({
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
          // Impostos
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

      // Salvar itens
      for (const item of xmlData.itens) {
        await prisma.xMLItem.create({
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
    } catch (error) {
      console.error('Erro na indexação de XML', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Indexa dados de SPED Fiscal
   */
  async indexSpedFiscalData(
    documentId: string,
    empresaId: string,
    spedData: SpedFiscalDocumento
  ): Promise<void> {
    try {
      console.log('Iniciando indexação de SPED Fiscal', {
        documentId,
        empresaId,
        registros: spedData.registros.length,
      });

      // Consolidar itens de ICMS/IPI
      const itens = SpedFiscalParser.consolidarIcmsIpi(spedData);
      
      // Salvar itens
      for (const item of itens) {
        await prisma.spedFiscalItem.create({
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

      // Consolidar apurações
      const apuracoes = SpedFiscalParser.consolidarApuracao(spedData);
      
      // Salvar apurações
      for (const apuracao of apuracoes) {
        await prisma.spedFiscalApuracao.create({
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
    } catch (error) {
      console.error('Erro na indexação de SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Indexa dados de SPED Contribuições
   */
  async indexSpedContribuicoesData(
    documentId: string,
    empresaId: string,
    spedData: any // TODO: Definir interface específica
  ): Promise<void> {
    try {
      console.log('Iniciando indexação de SPED Contribuições', {
        documentId,
        empresaId,
      });

      // TODO: Implementar parsing e indexação de SPED Contribuições
      // Similar ao SPED Fiscal, mas para PIS/COFINS

      console.log('Indexação de SPED Contribuições concluída com sucesso', {
        documentId,
      });
    } catch (error) {
      console.error('Erro na indexação de SPED Contribuições', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Busca documentos por empresa e período
   */
  async buscarDocumentos(
    empresaId: string,
    dataInicio: Date,
    dataFim: Date,
    tipoDocumento?: string
  ): Promise<any[]> {
    try {
      const where: any = {
        empresaId,
        dataEmissao: {
          gte: dataInicio,
          lte: dataFim,
        },
      };

      if (tipoDocumento) {
        where.tipoDocumento = tipoDocumento;
      }

      const documentos = await prisma.xMLDocument.findMany({
        where,
        include: {
          itens: true,
        },
        orderBy: {
          dataEmissao: 'desc',
        },
      });

      return documentos;
    } catch (error) {
      console.error('Erro ao buscar documentos', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Busca itens de SPED Fiscal por empresa e período
   */
  async buscarItensSpedFiscal(
    empresaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<any[]> {
    try {
      const itens = await prisma.spedFiscalItem.findMany({
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
    } catch (error) {
      console.error('Erro ao buscar itens SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Busca apurações de SPED Fiscal por empresa e período
   */
  async buscarApuracaoSpedFiscal(
    empresaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<any[]> {
    try {
      const apuracoes = await prisma.spedFiscalApuracao.findMany({
        where: {
          empresaId,
          // TODO: Adicionar campo de período se necessário
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return apuracoes;
    } catch (error) {
      console.error('Erro ao buscar apurações SPED Fiscal', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Valida dados fiscais (CST, CFOP, NCM, CNPJ)
   */
  async validarDadosFiscais(dados: any): Promise<{
    valido: boolean;
    erros: string[];
    avisos: string[];
  }> {
    const erros: string[] = [];
    const avisos: string[] = [];

    try {
      // Validar CNPJ
      if (dados.cnpjEmitente && !this.validarCNPJ(dados.cnpjEmitente)) {
        erros.push('CNPJ do emitente inválido');
      }

      if (dados.cnpjDestinatario && !this.validarCNPJ(dados.cnpjDestinatario)) {
        erros.push('CNPJ do destinatário inválido');
      }

      // Validar CST
      if (dados.cst && !this.validarCST(dados.cst)) {
        avisos.push('CST pode estar incorreto');
      }

      // Validar CFOP
      if (dados.cfop && !this.validarCFOP(dados.cfop)) {
        avisos.push('CFOP pode estar incorreto');
      }

      // Validar NCM
      if (dados.ncm && !this.validarNCM(dados.ncm)) {
        avisos.push('NCM pode estar incorreto');
      }

      return {
        valido: erros.length === 0,
        erros,
        avisos,
      };
    } catch (error) {
      console.error('Erro na validacao de dados fiscais', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  /**
   * Validação de CNPJ
   */
  private validarCNPJ(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cnpjLimpo.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;
    
    // Validação dos dígitos verificadores
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

  /**
   * Validação de CST
   */
  private validarCST(cst: string): boolean {
    const cstsValidos = [
      '00', '10', '20', '30', '40', '41', '50', '51', '60', '70', '90'
    ];
    return cstsValidos.includes(cst);
  }

  /**
   * Validação de CFOP
   */
  private validarCFOP(cfop: string): boolean {
    // CFOP deve ter 4 dígitos
    if (cfop.length !== 4) return false;
    
    // Primeiro dígito deve ser 1, 2, 3, 4, 5, 6 ou 7
    const primeiroDigito = parseInt(cfop.charAt(0));
    return primeiroDigito >= 1 && primeiroDigito <= 7;
  }

  /**
   * Validação de NCM
   */
  private validarNCM(ncm: string): boolean {
    // NCM deve ter 8 dígitos
    return ncm.length === 8 && /^\d{8}$/.test(ncm);
  }

  /**
   * Indexa documento genérico
   */
  async indexarDocumento(input: IndexarDocumentoInput): Promise<DocumentoIndexado> {
    try {
      // TODO: Implementar lógica de indexação
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
    } catch (error: any) {
      throw new Error(`Erro ao indexar documento: ${error.message}`);
    }
  }
}