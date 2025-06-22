"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpedContribuicoesParser = void 0;
const fs_1 = __importDefault(require("fs"));
class SpedContribuicoesParser {
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
                'C100', 'C170', 'M100', 'M200',
                '0000', '0100', '0140', 'F600', 'F700', 'F800', 'F990',
            ].includes(tipo)) {
                registros.push({ tipo, campos });
            }
        }
        return { registros };
    }
    static consolidarPisCofins(documento) {
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
    static consolidarApuracao(documento) {
        const apuracoes = [];
        let periodo = '';
        for (const reg of documento.registros) {
            if (reg.tipo === 'M100') {
                apuracoes.push({
                    tipo: 'PIS',
                    periodo,
                    base: parseFloat(reg.campos[3] || '0'),
                    aliquota: parseFloat(reg.campos[4] || '0'),
                    valor: parseFloat(reg.campos[5] || '0'),
                });
            }
            if (reg.tipo === 'M200') {
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
exports.SpedContribuicoesParser = SpedContribuicoesParser;
//# sourceMappingURL=sped-contribuicoes-parser.js.map