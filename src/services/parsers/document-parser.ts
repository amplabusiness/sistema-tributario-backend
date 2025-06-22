import { readFileSync } from 'fs';
import { extname } from 'path';

import { SpedFiscalParser } from './sped-fiscal-parser';
import { SpedContribuicoesParser } from './sped-contribuicoes-parser';
import { IcmsRulesExcelParser } from './icms-rules-excel-parser';
import { ProtegePdfParser } from './protege-pdf-parser';

export interface ParsedDocument {
  id: string;
  fileName: string;
  fileType: string;
  companyData: CompanyData;
  fiscalData: FiscalData;
  validationResults: ValidationResult[];
  metadata: DocumentMetadata;
  extractedAt: Date;
}

export interface CompanyData {
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  ie?: string;
  im?: string;
  cnae?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
    cep?: string;
  };
  regimeTributario?: string;
  dataInicioAtividade?: Date;
  dataFimAtividade?: Date;
}

export interface FiscalData {
  periodoInicial?: Date;
  periodoFinal?: Date;
  totalFaturamento?: number;
  totalCompras?: number;
  produtos: ProductData[];
  operacoes: OperationData[];
  impostos: TaxData[];
}

export interface ProductData {
  codigo?: string;
  descricao?: string;
  ncm?: string;
  cest?: string;
  unidade?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
}

export interface OperationData {
  tipo: 'entrada' | 'saida';
  cfop: string;
  cst: string;
  naturezaOperacao?: string;
  valorOperacao: number;
  baseCalculo: number;
  aliquota: number;
  valorImposto: number;
  data: Date;
}

export interface TaxData {
  tipo: 'ICMS' | 'IPI' | 'PIS' | 'COFINS' | 'ISS' | 'IOF';
  baseCalculo: number;
  aliquota: number;
  valor: number;
  periodo: Date;
}

export interface ValidationResult {
  field: string;
  isValid: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DocumentMetadata {
  fileSize: number;
  encoding?: string;
  checksum: string;
  processingTime: number;
  parserVersion: string;
}

export class DocumentParser {
  private spedFiscalParser: SpedFiscalParser;
  private spedContribuicoesParser: SpedContribuicoesParser;
  private icmsRulesParser: IcmsRulesExcelParser;
  private protegeParser: ProtegePdfParser;

  constructor() {
    this.spedFiscalParser = new SpedFiscalParser();
    this.spedContribuicoesParser = new SpedContribuicoesParser();
    this.icmsRulesParser = new IcmsRulesExcelParser();
    this.protegeParser = new ProtegePdfParser();
  }

  async parseDocument(filePath: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    const fileName = filePath.split('/').pop() || filePath;
    const fileExtension = extname(fileName).toLowerCase();
    
    console.log(`Iniciando parsing do documento: ${fileName}`, { filePath, fileType: fileExtension });

    try {
      const fileBuffer = readFileSync(filePath);
      const fileSize = fileBuffer.length;
      const checksum = this.calculateChecksum(fileBuffer);

      let parsedData: any = {};
      let companyData: CompanyData = {};
      let fiscalData: FiscalData = { produtos: [], operacoes: [], impostos: [] };

      // Determinar tipo de arquivo e aplicar parser específico
      switch (fileExtension) {
        case '.txt':
          if (fileName.includes('SPED') || fileName.includes('sped')) {
            const content = fileBuffer.toString('utf-8');            if (content.includes('|0000|') && content.includes('|C100|')) {
              // SPED Fiscal
              parsedData = SpedFiscalParser.parseContent(content);
              companyData = this.extractCompanyDataFromSped(parsedData);
              fiscalData = this.extractFiscalDataFromSped(parsedData);
            } else if (content.includes('|0000|') && content.includes('|M100|')) {
              // SPED Contribuições
              parsedData = SpedContribuicoesParser.parseContent(content);
              companyData = this.extractCompanyDataFromSped(parsedData);
              fiscalData = this.extractFiscalDataFromSpedContribuicoes(parsedData);
            }
          }
          break;        case '.xlsx':
        case '.xls':
          if (fileName.toLowerCase().includes('icms') || fileName.toLowerCase().includes('regras')) {
            // Save buffer to temp file for Excel parser
            const tempPath = `/tmp/${fileName}`;
            require('fs').writeFileSync(tempPath, fileBuffer);
            parsedData = IcmsRulesExcelParser.parseFile(tempPath);
            companyData = this.extractCompanyDataFromExcel(parsedData);
          }
          break;

        case '.pdf':
          if (fileName.toLowerCase().includes('protege')) {
            // Save buffer to temp file for PDF parser
            const tempPath = `/tmp/${fileName}`;
            require('fs').writeFileSync(tempPath, fileBuffer);
            parsedData = ProtegePdfParser.parseProtegeGoias(tempPath);
            companyData = this.extractCompanyDataFromPdf(parsedData);
          }
          break;

        default:
          throw new Error(`Tipo de arquivo não suportado: ${fileExtension}`);
      }

      // Validações automáticas
      const validationResults = this.validateDocument(companyData, fiscalData);

      // Metadados do documento
      const metadata: DocumentMetadata = {
        fileSize,
        checksum,
        processingTime: Date.now() - startTime,
        parserVersion: '1.0.0'
      };

      const result: ParsedDocument = {
        id: this.generateDocumentId(fileName),
        fileName,
        fileType: fileExtension,
        companyData,
        fiscalData,
        validationResults,
        metadata,
        extractedAt: new Date()
      };

      console.log(`Documento parseado com sucesso: ${fileName}`, {
        companyData: result.companyData.cnpj,
        validationResults: result.validationResults.length,
        processingTime: metadata.processingTime
      });

      return result;

    } catch (error) {
      console.error(`Erro ao fazer parsing do documento: ${fileName}`, { error, filePath });
      throw error;
    }
  }

  private extractCompanyDataFromSped(spedData: any): CompanyData {
    const bloco0 = spedData.blocos?.bloco0;
    if (!bloco0) return {};

    const registro0000 = bloco0.registros?.find((r: any) => r.registro === '0000');
    const registro0005 = bloco0.registros?.find((r: any) => r.registro === '0005');

    return {
      cnpj: registro0000?.cnpj,
      razaoSocial: registro0000?.nome,
      ie: registro0000?.ie,
      im: registro0000?.im,
      cnae: registro0000?.cnae,
      endereco: registro0005 ? {
        logradouro: registro0005.logradouro,
        numero: registro0005.numero,
        complemento: registro0005.complemento,
        bairro: registro0005.bairro,
        municipio: registro0005.municipio,
        uf: registro0005.uf,
        cep: registro0005.cep
      } : undefined,
      regimeTributario: registro0000?.indPerfil,
      dataInicioAtividade: registro0000?.dtIni ? new Date(registro0000.dtIni) : undefined,
      dataFimAtividade: registro0000?.dtFin ? new Date(registro0000.dtFin) : undefined
    };
  }

  private extractFiscalDataFromSped(spedData: any): FiscalData {
    const blocoC = spedData.blocos?.blocoC;
    const blocoD = spedData.blocos?.blocoD;
    
    const produtos: ProductData[] = [];
    const operacoes: OperationData[] = [];
    const impostos: TaxData[] = [];

    // Extrair produtos do Bloco C (Notas Fiscais)
    if (blocoC?.registros) {
      blocoC.registros.forEach((registro: any) => {
        if (registro.registro === '170') {
          produtos.push({
            codigo: registro.codItem,
            descricao: registro.descrCompl,
            ncm: registro.ncm,
            cest: registro.cest,
            unidade: registro.unid,
            quantidade: parseFloat(registro.qtd) || 0,
            valorUnitario: parseFloat(registro.vlItem) || 0,
            valorTotal: parseFloat(registro.vlItem) || 0
          });
        }

        if (registro.registro === '190') {
          operacoes.push({
            tipo: 'saida',
            cfop: registro.cfop,
            cst: registro.cstIcms,
            naturezaOperacao: registro.natBcCred,
            valorOperacao: parseFloat(registro.vlBcIcms) || 0,
            baseCalculo: parseFloat(registro.vlBcIcms) || 0,
            aliquota: parseFloat(registro.aliqIcms) || 0,
            valorImposto: parseFloat(registro.vlIcms) || 0,
            data: new Date()
          });
        }
      });
    }

    // Extrair impostos
    if (blocoC?.registros) {
      blocoC.registros.forEach((registro: any) => {
        if (registro.registro === '190') {
          if (parseFloat(registro.vlIcms) > 0) {
            impostos.push({
              tipo: 'ICMS',
              baseCalculo: parseFloat(registro.vlBcIcms) || 0,
              aliquota: parseFloat(registro.aliqIcms) || 0,
              valor: parseFloat(registro.vlIcms) || 0,
              periodo: new Date()
            });
          }
        }
      });
    }

    return {
      produtos,
      operacoes,
      impostos,
      totalFaturamento: operacoes.reduce((sum, op) => sum + op.valorOperacao, 0)
    };
  }

  private extractFiscalDataFromSpedContribuicoes(spedData: any): FiscalData {
    const blocoM = spedData.blocos?.blocoM;
    
    const produtos: ProductData[] = [];
    const operacoes: OperationData[] = [];
    const impostos: TaxData[] = [];

    if (blocoM?.registros) {
      blocoM.registros.forEach((registro: any) => {
        if (registro.registro === '100') {
          operacoes.push({
            tipo: 'saida',
            cfop: registro.cfop,
            cst: registro.cstPis,
            valorOperacao: parseFloat(registro.vlItem) || 0,
            baseCalculo: parseFloat(registro.vlBcPis) || 0,
            aliquota: parseFloat(registro.aliqPis) || 0,
            valorImposto: parseFloat(registro.vlPis) || 0,
            data: new Date()
          });

          if (parseFloat(registro.vlPis) > 0) {
            impostos.push({
              tipo: 'PIS',
              baseCalculo: parseFloat(registro.vlBcPis) || 0,
              aliquota: parseFloat(registro.aliqPis) || 0,
              valor: parseFloat(registro.vlPis) || 0,
              periodo: new Date()
            });
          }

          if (parseFloat(registro.vlCofins) > 0) {
            impostos.push({
              tipo: 'COFINS',
              baseCalculo: parseFloat(registro.vlBcCofins) || 0,
              aliquota: parseFloat(registro.aliqCofins) || 0,
              valor: parseFloat(registro.vlCofins) || 0,
              periodo: new Date()
            });
          }
        }
      });
    }

    return {
      produtos,
      operacoes,
      impostos,
      totalFaturamento: operacoes.reduce((sum, op) => sum + op.valorOperacao, 0)
    };
  }

  private extractCompanyDataFromExcel(excelData: any): CompanyData {
    // Extrair dados da empresa de planilhas Excel
    return {
      razaoSocial: excelData.empresa?.nome,
      cnpj: excelData.empresa?.cnpj,
      ie: excelData.empresa?.ie
    };
  }

  private extractCompanyDataFromPdf(pdfData: any): CompanyData {
    // Extrair dados da empresa de PDFs
    return {
      razaoSocial: pdfData.empresa?.nome,
      cnpj: pdfData.empresa?.cnpj,
      ie: pdfData.empresa?.ie
    };
  }

  private validateDocument(companyData: CompanyData, fiscalData: FiscalData): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Validação de CNPJ
    if (companyData.cnpj) {
      const isValidCnpj = this.validateCnpj(companyData.cnpj);
      results.push({
        field: 'cnpj',
        isValid: isValidCnpj,
        message: isValidCnpj ? 'CNPJ válido' : 'CNPJ inválido',
        severity: isValidCnpj ? 'info' : 'error'
      });
    }

    // Validação de IE
    if (companyData.ie) {
      const isValidIe = this.validateIe(companyData.ie);
      results.push({
        field: 'ie',
        isValid: isValidIe,
        message: isValidIe ? 'IE válida' : 'IE inválida',
        severity: isValidIe ? 'info' : 'warning'
      });
    }

    // Validação de CFOP
    fiscalData.operacoes.forEach((op, index) => {
      const isValidCfop = this.validateCfop(op.cfop);
      results.push({
        field: `cfop_${index}`,
        isValid: isValidCfop,
        message: isValidCfop ? `CFOP ${op.cfop} válido` : `CFOP ${op.cfop} inválido`,
        severity: isValidCfop ? 'info' : 'error'
      });
    });

    // Validação de CST
    fiscalData.operacoes.forEach((op, index) => {
      const isValidCst = this.validateCst(op.cst);
      results.push({
        field: `cst_${index}`,
        isValid: isValidCst,
        message: isValidCst ? `CST ${op.cst} válido` : `CST ${op.cst} inválido`,
        severity: isValidCst ? 'info' : 'error'
      });
    });

    // Validação de NCM
    fiscalData.produtos.forEach((prod, index) => {
      if (prod.ncm) {
        const isValidNcm = this.validateNcm(prod.ncm);
        results.push({
          field: `ncm_${index}`,
          isValid: isValidNcm,
          message: isValidNcm ? `NCM ${prod.ncm} válido` : `NCM ${prod.ncm} inválido`,
          severity: isValidNcm ? 'info' : 'warning'
        });
      }
    });

    return results;
  }

  private validateCnpj(cnpj: string): boolean {
    const cleanCnpj = cnpj.replace(/[^\d]/g, '');
    if (cleanCnpj.length !== 14) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCnpj)) return false;
    
    // Validar dígitos verificadores
    let sum = 0;
    let weight = 2;
    
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cleanCnpj[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    const remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (parseInt(cleanCnpj[12]) !== digit1) return false;
    
    sum = 0;
    weight = 2;
    
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cleanCnpj[i]) * weight;
      weight = weight === 9 ? 2 : weight + 1;
    }
    
    const remainder2 = sum % 11;
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2;
    
    return parseInt(cleanCnpj[13]) === digit2;
  }

  private validateIe(ie: string): boolean {
    // Validação básica de IE (varia por estado)
    const cleanIe = ie.replace(/[^\d]/g, '');
    return cleanIe.length >= 8 && cleanIe.length <= 12;
  }

  private validateCfop(cfop: string): boolean {
    // CFOP deve ter 4 dígitos
    return /^\d{4}$/.test(cfop);
  }

  private validateCst(cst: string): boolean {
    // CST deve ter 2 ou 3 dígitos
    return /^\d{2,3}$/.test(cst);
  }

  private validateNcm(ncm: string): boolean {
    // NCM deve ter 8 dígitos
    return /^\d{8}$/.test(ncm);
  }

  private calculateChecksum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  private generateDocumentId(fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${fileName.replace(/[^a-zA-Z0-9]/g, '')}_${timestamp}_${random}`;
  }
}