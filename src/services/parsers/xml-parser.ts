/**
 * Parser para documentos XML fiscais brasileiros
 * Suporta NFe, CTe, NFSe, etc.
 */

import { DOMParser } from 'xmldom';
import * as xpath from 'xpath';
import crypto from 'crypto';

export interface ValidationResult {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ParseResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    encoding?: string;
    checksum?: string;
    validationResults?: ValidationResult[];
  };
}

// Tipos de documentos XML suportados
export type XMLDocumentType = 'NFe' | 'CTe' | 'NFSe' | 'MDFe' | 'SPED';

// Interface para dados extraídos do XML
export interface XMLParsedData {
  tipoDocumento: XMLDocumentType;
  numeroDocumento: string;
  serie: string;
  dataEmissao: Date;
  valorTotal: number;
  cnpjEmitente: string;
  cnpjDestinatario?: string;
  cpfDestinatario?: string;
  itens: XMLItem[];
  impostos: XMLImpostos;
  chaveAcesso?: string;
  protocolo?: string;
  status: 'autorizada' | 'cancelada' | 'denegada';
  observacoes?: string;
}

// Interface para itens do XML
export interface XMLItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  cst: string;
  aliquotaIcms: number;
  valorIcms: number;
  aliquotaIpi?: number;
  valorIpi?: number;
  aliquotaPis?: number;
  valorPis?: number;
  aliquotaCofins?: number;
  valorCofins?: number;
}

// Interface para impostos do XML
export interface XMLImpostos {
  valorTotalIcms: number;
  valorTotalIpi?: number;
  valorTotalPis: number;
  valorTotalCofins: number;
  valorTotalIss?: number;
  baseCalculoIcms: number;
  baseCalculoPis: number;
  baseCalculoCofins: number;
}

/**
 * Parser principal para documentos XML
 */
export class XMLParser {
  private xmlDoc: Document | null = null;
  private parser: DOMParser;

  constructor() {
    this.parser = new DOMParser();
  }

  /**
   * Faz o parsing de um documento XML
   */
  async parseXML(xmlContent: string, tipoDocumento: XMLDocumentType): Promise<XMLParsedData> {
    try {
      // Parse do XML
      this.xmlDoc = this.parser.parseFromString(xmlContent, 'text/xml');

      // Verificar se o XML é válido
      if (this.xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML inválido ou malformado');
      }

      // Extrair dados baseado no tipo de documento
      let dados: XMLParsedData;

      switch (tipoDocumento) {
        case 'NFe':
          dados = await this.parseNFe();
          break;
        case 'CTe':
          dados = await this.parseCTe();
          break;
        case 'NFSe':
          dados = await this.parseNFSe();
          break;
        case 'MDFe':
          dados = await this.parseMDFe();
          break;
        default:
          throw new Error(`Tipo de documento não suportado: ${tipoDocumento}`);
      }

      return dados;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse específico para NFe
   */
  private async parseNFe(): Promise<XMLParsedData> {
    if (!this.xmlDoc) throw new Error('XML não carregado');

    const nfeElements = this.xmlDoc.getElementsByTagName('NFe');
    if (nfeElements.length === 0) throw new Error('Estrutura NFe não encontrada');
    const nfe = nfeElements[0];

    const ideElements = nfe.getElementsByTagName('ide');
    const emitElements = nfe.getElementsByTagName('emit');
    const destElements = nfe.getElementsByTagName('dest');
    const totalElements = nfe.getElementsByTagName('total');
    const detElements = nfe.getElementsByTagName('det');

    const ide = ideElements.length > 0 ? ideElements[0] : null;
    const emit = emitElements.length > 0 ? emitElements[0] : null;
    const dest = destElements.length > 0 ? destElements[0] : null;
    const total = totalElements.length > 0 ? totalElements[0] : null;

    // Dados básicos
    const numeroDocumento = this.getTextContent(ide, 'nNF') || '';
    const serie = this.getTextContent(ide, 'serie') || '';
    const dataEmissao = this.parseDate(this.getTextContent(ide, 'dhEmi') || '');
    const valorTotal = this.parseNumber(this.getTextContent(total, 'vNF') || '0');

    // CNPJs
    const cnpjEmitente = this.getTextContent(emit, 'CNPJ') || '';
    const cnpjDestinatario = this.getTextContent(dest, 'CNPJ') || '';
    const cpfDestinatario = this.getTextContent(dest, 'CPF') || '';

    // Chave de acesso
    const chaveAcesso = this.getTextContent(nfe, 'chNFe') || '';

    // Status
    const status = this.getStatusNFe();

    // Itens
    const itensParsed: XMLItem[] = [];
    for (let i = 0; i < detElements.length; i++) {
      const itemData = this.parseItemNFe(detElements[i]);
      if (itemData) {
        itensParsed.push(itemData);
      }
    }    // Impostos
    const impostos = total ? this.parseImpostosNFe(total) : {
      valorTotalIcms: 0,
      valorTotalIpi: 0,
      valorTotalPis: 0,
      valorTotalCofins: 0,
      valorTotalIss: 0,
      baseCalculoIcms: 0,
      baseCalculoPis: 0,
      baseCalculoCofins: 0
    };

    return {
      tipoDocumento: 'NFe',
      numeroDocumento,
      serie,
      dataEmissao,
      valorTotal,
      cnpjEmitente,
      cnpjDestinatario: cnpjDestinatario || undefined,
      cpfDestinatario: cpfDestinatario || undefined,
      itens: itensParsed,
      impostos,
      chaveAcesso,
      status,
    };
  }

  /**
   * Parse específico para CTe
   */
  private async parseCTe(): Promise<XMLParsedData> {
    if (!this.xmlDoc) throw new Error('XML não carregado');

    const cteElements = this.xmlDoc.getElementsByTagName('CTe');
    if (cteElements.length === 0) throw new Error('Estrutura CTe não encontrada');
    const cte = cteElements[0];

    const ideElements = cte.getElementsByTagName('ide');
    const emitElements = cte.getElementsByTagName('emit');
    const remElements = cte.getElementsByTagName('rem');
    const destElements = cte.getElementsByTagName('dest');
    const vPrestElements = cte.getElementsByTagName('vPrest');

    const ide = ideElements.length > 0 ? ideElements[0] : null;
    const emit = emitElements.length > 0 ? emitElements[0] : null;
    const rem = remElements.length > 0 ? remElements[0] : null;
    const dest = destElements.length > 0 ? destElements[0] : null;
    const vPrest = vPrestElements.length > 0 ? vPrestElements[0] : null;

    // Dados básicos
    const numeroDocumento = this.getTextContent(ide, 'cCT') || '';
    const serie = this.getTextContent(ide, 'serie') || '';
    const dataEmissao = this.parseDate(this.getTextContent(ide, 'dhEmi') || '');
    const valorTotal = this.parseNumber(this.getTextContent(vPrest, 'vTPrest') || '0');

    // CNPJs
    const cnpjEmitente = this.getTextContent(emit, 'CNPJ') || '';
    const cnpjRemetente = this.getTextContent(rem, 'CNPJ') || '';
    const cnpjDestinatario = this.getTextContent(dest, 'CNPJ') || '';

    // Chave de acesso
    const chaveAcesso = this.getTextContent(cte, 'chCTe') || '';

    // Status
    const status = this.getStatusCTe();

    return {
      tipoDocumento: 'CTe',
      numeroDocumento,
      serie,
      dataEmissao,
      valorTotal,
      cnpjEmitente,
      cnpjDestinatario: cnpjDestinatario || cnpjRemetente,
      itens: [], // CTe não tem itens detalhados
      impostos: {
        valorTotalIcms: 0,
        valorTotalPis: 0,
        valorTotalCofins: 0,
        baseCalculoIcms: 0,
        baseCalculoPis: 0,
        baseCalculoCofins: 0,
      },
      chaveAcesso,
      status,
    };
  }

  /**
   * Parse específico para NFSe
   */
  private async parseNFSe(): Promise<XMLParsedData> {
    if (!this.xmlDoc) throw new Error('XML não carregado');

    const nfseElements = this.xmlDoc.getElementsByTagName('NFSe');
    if (nfseElements.length === 0) throw new Error('Estrutura NFSe não encontrada');

    // Implementar parsing específico para NFSe
    // Estrutura pode variar conforme município

    return {
      tipoDocumento: 'NFSe',
      numeroDocumento: '',
      serie: '',
      dataEmissao: new Date(),
      valorTotal: 0,
      cnpjEmitente: '',
      itens: [],
      impostos: {
        valorTotalIcms: 0,
        valorTotalPis: 0,
        valorTotalCofins: 0,
        baseCalculoIcms: 0,
        baseCalculoPis: 0,
        baseCalculoCofins: 0,
      },
      status: 'autorizada',
    };
  }

  /**
   * Parse específico para MDFe
   */
  private async parseMDFe(): Promise<XMLParsedData> {
    if (!this.xmlDoc) throw new Error('XML não carregado');

    const mdfeElements = this.xmlDoc.getElementsByTagName('MDFe');
    if (mdfeElements.length === 0) throw new Error('Estrutura MDFe não encontrada');

    // Implementar parsing específico para MDFe

    return {
      tipoDocumento: 'MDFe',
      numeroDocumento: '',
      serie: '',
      dataEmissao: new Date(),
      valorTotal: 0,
      cnpjEmitente: '',
      itens: [],
      impostos: {
        valorTotalIcms: 0,
        valorTotalPis: 0,
        valorTotalCofins: 0,
        baseCalculoIcms: 0,
        baseCalculoPis: 0,
        baseCalculoCofins: 0,
      },
      status: 'autorizada',
    };
  }

  /**
   * Parse de item de NFe
   */
  private parseItemNFe(det: Element): XMLItem | null {
    try {
      const prodElements = det.getElementsByTagName('prod');
      const impostoElements = det.getElementsByTagName('imposto');

      if (prodElements.length === 0 || impostoElements.length === 0) return null;

      const prod = prodElements[0];
      const imposto = impostoElements[0];

      const codigo = this.getTextContent(prod, 'cProd') || '';
      const descricao = this.getTextContent(prod, 'xProd') || '';
      const ncm = this.getTextContent(prod, 'NCM') || '';
      const cfop = this.getTextContent(prod, 'CFOP') || '';
      const quantidade = this.parseNumber(this.getTextContent(prod, 'qCom') || '0');
      const valorUnitario = this.parseNumber(this.getTextContent(prod, 'vUnCom') || '0');
      const valorTotal = this.parseNumber(this.getTextContent(prod, 'vProd') || '0');

      // Impostos
      const icmsElements = imposto.getElementsByTagName('ICMS');
      const ipiElements = imposto.getElementsByTagName('IPI');
      const pisElements = imposto.getElementsByTagName('PIS');
      const cofinsElements = imposto.getElementsByTagName('COFINS');

      const icms = icmsElements.length > 0 ? icmsElements[0] : null;
      const ipi = ipiElements.length > 0 ? ipiElements[0] : null;
      const pis = pisElements.length > 0 ? pisElements[0] : null;
      const cofins = cofinsElements.length > 0 ? cofinsElements[0] : null;

      const cst = this.getCST(icms);
      const aliquotaIcms = this.parseNumber(this.getTextContent(icms, 'pICMS') || '0');
      const valorIcms = this.parseNumber(this.getTextContent(icms, 'vICMS') || '0');
      const aliquotaIpi = this.parseNumber(this.getTextContent(ipi, 'pIPI') || '0');
      const valorIpi = this.parseNumber(this.getTextContent(ipi, 'vIPI') || '0');
      const aliquotaPis = this.parseNumber(this.getTextContent(pis, 'pPIS') || '0');
      const valorPis = this.parseNumber(this.getTextContent(pis, 'vPIS') || '0');
      const aliquotaCofins = this.parseNumber(this.getTextContent(cofins, 'pCOFINS') || '0');
      const valorCofins = this.parseNumber(this.getTextContent(cofins, 'vCOFINS') || '0');

      return {
        codigo,
        descricao,
        ncm,
        cfop,
        quantidade,
        valorUnitario,
        valorTotal,
        cst,
        aliquotaIcms,
        valorIcms,
        aliquotaIpi,
        valorIpi,
        aliquotaPis,
        valorPis,
        aliquotaCofins,
        valorCofins,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse de impostos da NFe
   */
  private parseImpostosNFe(total: Element): XMLImpostos {
    const icmsElements = total.getElementsByTagName('ICMSTot');
    const pisElements = total.getElementsByTagName('PIS');
    const cofinsElements = total.getElementsByTagName('COFINS');

    const icms = icmsElements.length > 0 ? icmsElements[0] : null;
    const pis = pisElements.length > 0 ? pisElements[0] : null;
    const cofins = cofinsElements.length > 0 ? cofinsElements[0] : null;

    return {
      valorTotalIcms: this.parseNumber(this.getTextContent(icms, 'vICMS') || '0'),
      valorTotalIpi: this.parseNumber(this.getTextContent(icms, 'vIPI') || '0'),
      valorTotalPis: this.parseNumber(this.getTextContent(pis, 'vPIS') || '0'),
      valorTotalCofins: this.parseNumber(this.getTextContent(cofins, 'vCOFINS') || '0'),
      baseCalculoIcms: this.parseNumber(this.getTextContent(icms, 'vBC') || '0'),
      baseCalculoPis: this.parseNumber(this.getTextContent(pis, 'vBC') || '0'),
      baseCalculoCofins: this.parseNumber(this.getTextContent(cofins, 'vBC') || '0'),
    };
  }

  /**
   * Utilitários para extração de dados
   */
  private getTextContent(parent: Element | null, tagName: string): string {
    if (!parent) return '';
    const elements = parent.getElementsByTagName(tagName);
    if (elements.length === 0) return '';
    return elements[0].textContent?.trim() || '';
  }

  private parseNumber(value: string): number {
    return parseFloat(value.replace(',', '.')) || 0;
  }

  private parseDate(dateString: string): Date {
    // Formato: 2024-01-15T14:30:45-03:00
    return new Date(dateString);
  }

  private getCST(icms: Element | null): string {
    if (!icms) return '';
    
    // Buscar CST em diferentes grupos de ICMS
    const grupos = ['ICMS00', 'ICMS10', 'ICMS20', 'ICMS30', 'ICMS40', 'ICMS51', 'ICMS60', 'ICMS70', 'ICMS90'];
    
    for (const grupo of grupos) {
      const elementos = icms.getElementsByTagName(grupo);
      if (elementos.length > 0) {
        return this.getTextContent(elementos[0], 'CST') || '';
      }
    }
    
    return '';
  }

  private getStatusNFe(): 'autorizada' | 'cancelada' | 'denegada' {
    if (!this.xmlDoc) return 'autorizada';
    
    const protElements = this.xmlDoc.getElementsByTagName('protNFe');
    if (protElements.length === 0) return 'autorizada';
    
    const status = this.getTextContent(protElements[0], 'cStat');
    
    switch (status) {
      case '100': // Autorizada
      case '150': // Autorizada fora de prazo
        return 'autorizada';
      case '101': // Cancelada
      case '151': // Cancelada fora de prazo
        return 'cancelada';
      case '110': // Denegada
      case '301': // Denegada
        return 'denegada';
      default:
        return 'autorizada';
    }
  }

  private getStatusCTe(): 'autorizada' | 'cancelada' | 'denegada' {
    if (!this.xmlDoc) return 'autorizada';
    
    const protElements = this.xmlDoc.getElementsByTagName('protCTe');
    if (protElements.length === 0) return 'autorizada';
    
    const status = this.getTextContent(protElements[0], 'cStat');
    
    switch (status) {
      case '100': // Autorizada
      case '150': // Autorizada fora de prazo
        return 'autorizada';
      case '101': // Cancelada
      case '151': // Cancelada fora de prazo
        return 'cancelada';
      case '110': // Denegada
      case '301': // Denegada
        return 'denegada';
      default:
        return 'autorizada';
    }
  }

  /**
   * Método para parsing genérico de XML
   */
  async parse(buffer: Buffer): Promise<ParseResult> {
    try {
      const xmlString = buffer.toString('utf8');
      const doc = this.parser.parseFromString(xmlString, 'text/xml');
      
      // TODO: Implementar parser XML específico
      // Por enquanto retorna um resultado simples
      return {
        success: true,
        data: {
          raw: xmlString,
          // Adicionar campos parseados
        },
        metadata: {
          fileSize: buffer.length,
          encoding: 'utf8',
          checksum: this.calculateChecksum(buffer),
          validationResults: []
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          fileSize: buffer.length,
          validationResults: [{
            field: 'xml',
            message: error.message,
            severity: 'error'
          }]
        }
      };
    }
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}