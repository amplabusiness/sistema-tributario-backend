import fs from 'fs';

export interface SpedContribuicoesRegistro {
  tipo: string;
  campos: string[];
}

export interface SpedContribuicoesDocumento {
  registros: SpedContribuicoesRegistro[];
}

export interface PisCofinsItem {
  documento: string;
  data: string;
  cnpj: string;
  produto: string;
  cfop: string;
  cst: string;
  valor: number;
  basePis: number;
  valorPis: number;
  baseCofins: number;
  valorCofins: number;
}

export class SpedContribuicoesParser {
  static parseFile(filePath: string): SpedContribuicoesDocumento {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseContent(content);
  }

  static parseContent(content: string): SpedContribuicoesDocumento {
    const linhas = content.split(/\r?\n/);
    const registros: SpedContribuicoesRegistro[] = [];

    for (const linha of linhas) {
      if (!linha.trim()) continue;
      const campos = linha.split('|').filter(Boolean);
      if (campos.length < 2) continue;
      const tipo = campos[0];
      // Foco nos principais registros
      if ([
        'C100', 'C170', 'M100', 'M200',
        '0000', '0100', '0140', 'F600', 'F700', 'F800', 'F990',
      ].includes(tipo)) {
        registros.push({ tipo, campos });
      }
    }

    return { registros };
  }

  /**
   * Consolida itens de PIS/COFINS a partir dos registros C100 e C170
   */
  static consolidarPisCofins(documento: SpedContribuicoesDocumento): PisCofinsItem[] {
    const items: PisCofinsItem[] = [];
    let currentDoc: any = null;

    for (const reg of documento.registros) {
      if (reg.tipo === 'C100') {
        // Exemplo: |C100|0|1|55|1234|...
        currentDoc = {
          documento: reg.campos[4] || '', // Número do documento
          data: reg.campos[9] || '',      // Data de emissão
          cnpj: reg.campos[6] || '',      // CNPJ emitente
        };
      }
      if (reg.tipo === 'C170' && currentDoc) {
        // Exemplo: |C170|1|PRODUTO|...|CFOP|CST_PIS|...|VL_ITEM|...
        const produto = reg.campos[2] || '';
        const cfop = reg.campos[10] || '';
        const cst = reg.campos[11] || '';
        const valor = parseFloat(reg.campos[7] || '0');
        const basePis = parseFloat(reg.campos[19] || '0');
        const valorPis = parseFloat(reg.campos[21] || '0');
        const baseCofins = parseFloat(reg.campos[23] || '0');
        const valorCofins = parseFloat(reg.campos[25] || '0');
        items.push({
          documento: currentDoc.documento,
          data: currentDoc.data,
          cnpj: currentDoc.cnpj,
          produto,
          cfop,
          cst,
          valor,
          basePis,
          valorPis,
          baseCofins,
          valorCofins,
        });
      }
    }
    return items;
  }

  /**
   * Consolida apuracao total de PIS/COFINS a partir dos registros M100/M200
   */
  static consolidarApuracao(documento: SpedContribuicoesDocumento) {
    const apuracoes: any[] = [];
    let periodo = '';
    for (const reg of documento.registros) {
      if (reg.tipo === 'M100') {
        // |M100|COD_CRED|IND_CRED_ORI|VL_BC_PIS|ALIQ_PIS|VL_PIS|...
        apuracoes.push({
          tipo: 'PIS',
          periodo,
          base: parseFloat(reg.campos[3] || '0'),
          aliquota: parseFloat(reg.campos[4] || '0'),
          valor: parseFloat(reg.campos[5] || '0'),
        });
      }
      if (reg.tipo === 'M200') {
        // |M200|VL_TOT_CONT_NC_PER|VL_CRED_DESC_NC|VL_TOT_CONT_CUM_PER|...
        apuracoes.push({
          tipo: 'COFINS',
          periodo,
          valor: parseFloat(reg.campos[1] || '0'),
        });
      }
    }
    return apuracoes;
  }
} 