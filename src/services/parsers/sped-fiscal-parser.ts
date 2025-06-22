import fs from 'fs';

export interface SpedFiscalRegistro {
  tipo: string;
  campos: string[];
}

export interface SpedFiscalDocumento {
  registros: SpedFiscalRegistro[];
}

export interface IcmsIpiItem {
  documento: string;
  data: string;
  cnpj: string;
  produto: string;
  cfop: string;
  cst: string;
  ncm: string;
  valor: number;
  baseIcms: number;
  valorIcms: number;
  baseIpi: number;
  valorIpi: number;
}

export class SpedFiscalParser {
  static parseFile(filePath: string): SpedFiscalDocumento {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseContent(content);
  }

  static parseContent(content: string): SpedFiscalDocumento {
    const linhas = content.split(/\r?\n/);
    const registros: SpedFiscalRegistro[] = [];

    for (const linha of linhas) {
      if (!linha.trim()) continue;
      const campos = linha.split('|').filter(Boolean);
      if (campos.length < 2) continue;
      const tipo = campos[0];
      // Foco nos principais registros do Bloco C
      if ([
        'C100', 'C170', 'C190',
        '0000', '0100', '0150', '0200', 'C001', 'C990',
      ].includes(tipo)) {
        registros.push({ tipo, campos });
      }
    }

    return { registros };
  }

  /**
   * Consolida itens de ICMS/IPI a partir dos registros C100, C170 e C190
   */
  static consolidarIcmsIpi(documento: SpedFiscalDocumento): IcmsIpiItem[] {
    const items: IcmsIpiItem[] = [];
    let currentDoc: any = null;

    for (const reg of documento.registros) {
      if (reg.tipo === 'C100') {
        // |C100|0|1|55|1234|...|CNPJ|...|DATA|
        currentDoc = {
          documento: reg.campos[4] || '', // Número do documento
          data: reg.campos[9] || '',      // Data de emissão
          cnpj: reg.campos[6] || '',      // CNPJ emitente
        };
      }
      if (reg.tipo === 'C170' && currentDoc) {
        // |C170|NUM_ITEM|COD_ITEM|DESCR|QTD|UNID|VL_ITEM|CST_ICMS|CFOP|COD_NAT|...
        const produto = reg.campos[2] || '';
        const cfop = reg.campos[10] || '';
        const cst = reg.campos[11] || '';
        const ncm = reg.campos[4] || '';
        const valor = parseFloat(reg.campos[7] || '0');
        // Os campos de base e valor ICMS/IPI podem variar conforme layout
        const baseIcms = parseFloat(reg.campos[20] || '0');
        const valorIcms = parseFloat(reg.campos[22] || '0');
        const baseIpi = parseFloat(reg.campos[24] || '0');
        const valorIpi = parseFloat(reg.campos[26] || '0');
        items.push({
          documento: currentDoc.documento,
          data: currentDoc.data,
          cnpj: currentDoc.cnpj,
          produto,
          cfop,
          cst,
          ncm,
          valor,
          baseIcms,
          valorIcms,
          baseIpi,
          valorIpi,
        });
      }
    }
    return items;
  }

  /**
   * Consolida apuracao total de ICMS/IPI a partir dos registros C190
   */
  static consolidarApuracao(documento: SpedFiscalDocumento) {
    const apuracoes: any[] = [];
    for (const reg of documento.registros) {
      if (reg.tipo === 'C190') {
        // |C190|CST|CFOP|ALIQ_ICMS|VL_OPR|VL_BC_ICMS|VL_ICMS|VL_BC_ICMS_ST|VL_ICMS_ST|VL_RED_BC|VL_IPI|COD_OBS|
        apuracoes.push({
          cst: reg.campos[1] || '',
          cfop: reg.campos[2] || '',
          aliquota: parseFloat(reg.campos[3] || '0'),
          valorOperacao: parseFloat(reg.campos[4] || '0'),
          baseIcms: parseFloat(reg.campos[5] || '0'),
          valorIcms: parseFloat(reg.campos[6] || '0'),
          baseIcmsSt: parseFloat(reg.campos[7] || '0'),
          valorIcmsSt: parseFloat(reg.campos[8] || '0'),
          valorRedBc: parseFloat(reg.campos[9] || '0'),
          valorIpi: parseFloat(reg.campos[10] || '0'),
        });
      }
    }
    return apuracoes;
  }
} 