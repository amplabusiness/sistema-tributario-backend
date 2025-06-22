import xlsx from 'xlsx';

export interface IcmsRule {
  ncm?: string;
  cfop?: string;
  cst?: string;
  descricao?: string;
  aliquota?: number;
  baseReduzida?: number;
  beneficio?: string;
  tipoCliente?: string;
  tipoOperacao?: string;
  proteje?: boolean;
  difal?: boolean;
  ciap?: boolean;
}

export class IcmsRulesExcelParser {
  static parseFile(filePath: string): IcmsRule[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' });

    const rules: IcmsRule[] = [];
    for (const row of data) {
      rules.push({
        ncm: row.NCM || row.ncm || '',
        cfop: row.CFOP || row.cfop || '',
        cst: row.CST || row.cst || '',
        descricao: row.Descricao || row.descricao || '',
        aliquota: parseFloat(row.Aliquota || row.aliquota || '0'),
        baseReduzida: parseFloat(row.BaseReduzida || row.baseReduzida || '0'),
        beneficio: row.Beneficio || row.beneficio || '',
        tipoCliente: row.TipoCliente || row.tipoCliente || '',
        tipoOperacao: row.TipoOperacao || row.tipoOperacao || '',
        proteje: !!(row.Protege || row.protege),
        difal: !!(row.DIFAL || row.difal),
        ciap: !!(row.CIAP || row.ciap),
      });
    }
    return rules;
  }
} 