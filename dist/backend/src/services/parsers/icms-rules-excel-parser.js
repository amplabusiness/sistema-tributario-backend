"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IcmsRulesExcelParser = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
class IcmsRulesExcelParser {
    static parseFile(filePath) {
        const workbook = xlsx_1.default.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx_1.default.utils.sheet_to_json(sheet, { defval: '' });
        const rules = [];
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
exports.IcmsRulesExcelParser = IcmsRulesExcelParser;
//# sourceMappingURL=icms-rules-excel-parser.js.map