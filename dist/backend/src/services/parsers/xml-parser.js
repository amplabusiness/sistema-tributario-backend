"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XMLParser = void 0;
const xmldom_1 = require("xmldom");
const logger_1 = require("@/utils/logger");
class XMLParser {
    constructor() {
        this.xmlDoc = null;
    }
    async parseXML(xmlContent, tipoDocumento) {
        try {
            (0, logger_1.logInfo)('Iniciando parsing de XML', { tipoDocumento });
            const parser = new xmldom_1.DOMParser();
            this.xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            if (this.xmlDoc.getElementsByTagName('parsererror').length > 0) {
                throw new Error('XML inválido ou malformado');
            }
            let dados;
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
            (0, logger_1.logInfo)('Parsing de XML concluído com sucesso', {
                tipoDocumento,
                numeroDocumento: dados.numeroDocumento,
                valorTotal: dados.valorTotal,
            });
            return dados;
        }
        catch (error) {
            (0, logger_1.logError)('Erro no parsing de XML', error instanceof Error ? error : new Error('Unknown error'));
            throw error;
        }
    }
    async parseNFe() {
        if (!this.xmlDoc)
            throw new Error('XML não carregado');
        const nfeElements = this.xmlDoc.getElementsByTagName('NFe');
        if (nfeElements.length === 0)
            throw new Error('Estrutura NFe não encontrada');
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
        const numeroDocumento = this.getTextContent(ide, 'nNF') || '';
        const serie = this.getTextContent(ide, 'serie') || '';
        const dataEmissao = this.parseDate(this.getTextContent(ide, 'dhEmi') || '');
        const valorTotal = this.parseNumber(this.getTextContent(total, 'vNF') || '0');
        const cnpjEmitente = this.getTextContent(emit, 'CNPJ') || '';
        const cnpjDestinatario = this.getTextContent(dest, 'CNPJ') || '';
        const cpfDestinatario = this.getTextContent(dest, 'CPF') || '';
        const chaveAcesso = this.getTextContent(nfe, 'chNFe') || '';
        const status = this.getStatusNFe();
        const itensParsed = [];
        for (let i = 0; i < detElements.length; i++) {
            const itemData = this.parseItemNFe(detElements[i]);
            if (itemData) {
                itensParsed.push(itemData);
            }
        }
        const impostos = this.parseImpostosNFe(total);
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
    async parseCTe() {
        if (!this.xmlDoc)
            throw new Error('XML não carregado');
        const cteElements = this.xmlDoc.getElementsByTagName('CTe');
        if (cteElements.length === 0)
            throw new Error('Estrutura CTe não encontrada');
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
        const numeroDocumento = this.getTextContent(ide, 'cCT') || '';
        const serie = this.getTextContent(ide, 'serie') || '';
        const dataEmissao = this.parseDate(this.getTextContent(ide, 'dhEmi') || '');
        const valorTotal = this.parseNumber(this.getTextContent(vPrest, 'vTPrest') || '0');
        const cnpjEmitente = this.getTextContent(emit, 'CNPJ') || '';
        const cnpjRemetente = this.getTextContent(rem, 'CNPJ') || '';
        const cnpjDestinatario = this.getTextContent(dest, 'CNPJ') || '';
        const chaveAcesso = this.getTextContent(cte, 'chCTe') || '';
        const status = this.getStatusCTe();
        return {
            tipoDocumento: 'CTe',
            numeroDocumento,
            serie,
            dataEmissao,
            valorTotal,
            cnpjEmitente,
            cnpjDestinatario: cnpjDestinatario || cnpjRemetente,
            itens: [],
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
    async parseNFSe() {
        if (!this.xmlDoc)
            throw new Error('XML não carregado');
        const nfseElements = this.xmlDoc.getElementsByTagName('NFSe');
        if (nfseElements.length === 0)
            throw new Error('Estrutura NFSe não encontrada');
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
    async parseMDFe() {
        if (!this.xmlDoc)
            throw new Error('XML não carregado');
        const mdfeElements = this.xmlDoc.getElementsByTagName('MDFe');
        if (mdfeElements.length === 0)
            throw new Error('Estrutura MDFe não encontrada');
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
    parseItemNFe(det) {
        try {
            const prodElements = det.getElementsByTagName('prod');
            const impostoElements = det.getElementsByTagName('imposto');
            if (prodElements.length === 0 || impostoElements.length === 0)
                return null;
            const prod = prodElements[0];
            const imposto = impostoElements[0];
            const codigo = this.getTextContent(prod, 'cProd') || '';
            const descricao = this.getTextContent(prod, 'xProd') || '';
            const ncm = this.getTextContent(prod, 'NCM') || '';
            const cfop = this.getTextContent(prod, 'CFOP') || '';
            const quantidade = this.parseNumber(this.getTextContent(prod, 'qCom') || '0');
            const valorUnitario = this.parseNumber(this.getTextContent(prod, 'vUnCom') || '0');
            const valorTotal = this.parseNumber(this.getTextContent(prod, 'vProd') || '0');
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
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao parsear item NFe', error instanceof Error ? error : new Error('Unknown error'));
            return null;
        }
    }
    parseImpostosNFe(total) {
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
    getTextContent(parent, tagName) {
        if (!parent)
            return '';
        const elements = parent.getElementsByTagName(tagName);
        if (elements.length === 0)
            return '';
        return elements[0].textContent?.trim() || '';
    }
    parseNumber(value) {
        return parseFloat(value.replace(',', '.')) || 0;
    }
    parseDate(dateString) {
        return new Date(dateString);
    }
    getCST(icms) {
        if (!icms)
            return '';
        const grupos = ['ICMS00', 'ICMS10', 'ICMS20', 'ICMS30', 'ICMS40', 'ICMS51', 'ICMS60', 'ICMS70', 'ICMS90'];
        for (const grupo of grupos) {
            const elementos = icms.getElementsByTagName(grupo);
            if (elementos.length > 0) {
                return this.getTextContent(elementos[0], 'CST') || '';
            }
        }
        return '';
    }
    getStatusNFe() {
        if (!this.xmlDoc)
            return 'autorizada';
        const protElements = this.xmlDoc.getElementsByTagName('protNFe');
        if (protElements.length === 0)
            return 'autorizada';
        const status = this.getTextContent(protElements[0], 'cStat');
        switch (status) {
            case '100':
            case '150':
                return 'autorizada';
            case '101':
            case '151':
                return 'cancelada';
            case '110':
            case '301':
                return 'denegada';
            default:
                return 'autorizada';
        }
    }
    getStatusCTe() {
        if (!this.xmlDoc)
            return 'autorizada';
        const protElements = this.xmlDoc.getElementsByTagName('protCTe');
        if (protElements.length === 0)
            return 'autorizada';
        const status = this.getTextContent(protElements[0], 'cStat');
        switch (status) {
            case '100':
            case '150':
                return 'autorizada';
            case '101':
            case '151':
                return 'cancelada';
            case '110':
            case '301':
                return 'denegada';
            default:
                return 'autorizada';
        }
    }
}
exports.XMLParser = XMLParser;
//# sourceMappingURL=xml-parser.js.map