"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpedFiscalParser = void 0;
const fs_1 = __importDefault(require("fs"));
class SpedFiscalParser {
    static parseFile(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        return this.parseContent(content);
    }
    static parseContent(content) {
        const linhas = content.split(/\r?\n/);
        const registros = [];
        for (const linha of linhas) {
            if (!linha.trim())
                continue;
            const campos = linha.split('|').filter(Boolean);
            if (campos.length < 2)
                continue;
            const tipo = campos[0];
            if ([
                'C100', 'C170', 'C190',
                '0000', '0100', '0150', '0200', 'C001', 'C990',
            ].includes(tipo)) {
                registros.push({ tipo, campos });
            }
        }
        return { registros };
    }
    static consolidarIcmsIpi(documento) {
        const items = [];
        let currentDoc = null;
        for (const reg of documento.registros) {
            if (reg.tipo === 'C100') {
                currentDoc = {
                    documento: reg.campos[4] || '',
                    data: reg.campos[9] || '',
                    cnpj: reg.campos[6] || '',
                };
            }
            if (reg.tipo === 'C170' && currentDoc) {
                const produto = reg.campos[2] || '';
                const cfop = reg.campos[10] || '';
                const cst = reg.campos[11] || '';
                const ncm = reg.campos[4] || '';
                const valor = parseFloat(reg.campos[7] || '0');
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
    static consolidarApuracao(documento) {
        const apuracoes = [];
        for (const reg of documento.registros) {
            if (reg.tipo === 'C190') {
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
exports.SpedFiscalParser = SpedFiscalParser;
//# sourceMappingURL=sped-fiscal-parser.js.map