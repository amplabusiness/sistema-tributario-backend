"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederalAgent = void 0;
const logger_1 = require("../../utils/logger");
const database_1 = __importDefault(require("../../config/database"));
const federal_rules_1 = require("../../constants/federal-rules");
class FederalAgent {
    constructor() {
        this.rules = federal_rules_1.FEDERAL_RULES;
    }
    async processDocument(documentId) {
        try {
            (0, logger_1.logInfo)('Iniciando processamento Federal', { documentId });
            const document = await this.getDocumentWithData(documentId);
            if (!document) {
                throw new Error('Documento não encontrado');
            }
            const results = [];
            const items = document.metadata?.items || [];
            for (const item of items) {
                const federalResult = await this.calculateFederal(document, item);
                if (federalResult) {
                    results.push(federalResult);
                }
            }
            await this.saveResults(results);
            (0, logger_1.logInfo)('Processamento Federal concluído', {
                documentId,
                itemsProcessed: results.length,
            });
            return results;
        }
        catch (error) {
            (0, logger_1.logError)('Erro no processamento Federal', {
                documentId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async getDocumentWithData(documentId) {
        return await database_1.default.document.findUnique({
            where: { id: documentId },
            include: {
                empresa: true,
            },
        });
    }
    async calculateFederal(document, item) {
        try {
            const cfop = item.cfop || '';
            const cst = item.cst || '';
            const ncm = item.ncm || '';
            const tipoOperacao = this.determineOperationType(cfop);
            const federalRules = this.rules;
            const baseCalculo = this.calculateBase(item.valorTotal, item.descontos || 0);
            const beneficios = this.applyFiscalBenefits(item, federalRules, cfop, cst);
            const calculo = await this.calculateFederalTaxes(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
            return {
                documentId: document.id,
                empresaId: document.empresaId,
                periodo: this.extractPeriod(document.dataEmissao),
                tipoOperacao,
                produtoId: item.produtoId,
                ncm,
                cfop,
                cst,
                calculo,
                beneficios: beneficios.map(b => b.nome),
                observacoes: this.generateObservations(calculo, beneficios),
                createdAt: new Date(),
            };
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao calcular impostos federais do item', {
                documentId: document.id,
                itemId: item.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    determineOperationType(cfop) {
        if (cfop.startsWith('1')) {
            return 'entrada';
        }
        else if (cfop.startsWith('5')) {
            return 'saida';
        }
        return 'saida';
    }
    calculateBase(valorTotal, descontos) {
        return Math.max(0, valorTotal - descontos);
    }
    applyFiscalBenefits(item, federalRules, cfop, cst) {
        const beneficios = [];
        if (this.shouldApplyZeroRate(cfop, cst, item.ncm)) {
            beneficios.push({
                nome: 'Alíquota Zero',
                tipo: 'aliquota_zero',
                percentual: 0,
            });
        }
        if (this.shouldApplyPresumedCredit(cfop, cst, item.ncm)) {
            const percentualPresumido = this.getPresumedCreditPercentage(item.ncm, federalRules);
            if (percentualPresumido > 0) {
                beneficios.push({
                    nome: 'Crédito Presumido',
                    tipo: 'credito_presumido',
                    percentual: percentualPresumido,
                });
            }
        }
        if (this.shouldApplyInputCredit(cfop, cst, item.ncm)) {
            beneficios.push({
                nome: 'Crédito de Insumos',
                tipo: 'credito_insumos',
                percentual: 0,
            });
        }
        if (this.shouldApplyEnergyCredit(cfop, cst, item.ncm)) {
            beneficios.push({
                nome: 'Crédito de Energia',
                tipo: 'credito_energia',
                percentual: 0,
            });
        }
        if (this.shouldApplyFreightCredit(cfop, cst, item.ncm)) {
            beneficios.push({
                nome: 'Crédito de Frete',
                tipo: 'credito_frete',
                percentual: 0,
            });
        }
        if (this.shouldApplyPackagingCredit(cfop, cst, item.ncm)) {
            beneficios.push({
                nome: 'Crédito de Embalagens',
                tipo: 'credito_embalagens',
                percentual: 0,
            });
        }
        return beneficios;
    }
    shouldApplyZeroRate(cfop, cst, ncm) {
        const cfopsZero = ['1101', '1102', '1111', '1113', '1116', '1117', '1121', '1122', '1124', '1125', '1126', '1128', '1131', '1132', '1135', '1136', '1138', '1141', '1142', '1143', '1144', '1145', '1146', '1147', '1148', '1149', '1151', '1152', '1153', '1154', '1155', '1156', '1157', '1158', '1159', '1161', '1162', '1163', '1164', '1165', '1166', '1167', '1168', '1169', '1171', '1172', '1173', '1174', '1175', '1176', '1177', '1178', '1179', '1181', '1182', '1183', '1184', '1185', '1186', '1187', '1188', '1189', '1191', '1192', '1193', '1194', '1195', '1196', '1197', '1198', '1199'];
        return cfopsZero.includes(cfop) ||
            cst === '01' ||
            cst === '02' ||
            cst === '03' ||
            this.isNCMWithZeroRate(ncm);
    }
    shouldApplyPresumedCredit(cfop, cst, ncm) {
        const cfopsPresumido = ['1101', '1103', '1104', '1105', '1106', '1107', '1108', '1109', '1110', '1112', '1114', '1115', '1118', '1119', '1120', '1123', '1127', '1129', '1130', '1133', '1134', '1137', '1139', '1140'];
        return cfopsPresumido.includes(cfop) ||
            cst === '01' ||
            cst === '02' ||
            this.isNCMWithPresumedCredit(ncm);
    }
    shouldApplyInputCredit(cfop, cst, ncm) {
        return cfop.startsWith('1') &&
            (cst === '01' || cst === '02' || cst === '03') &&
            this.isNCMWithInputCredit(ncm);
    }
    shouldApplyEnergyCredit(cfop, cst, ncm) {
        return cfop.startsWith('1') &&
            (cst === '01' || cst === '02' || cst === '03') &&
            this.isNCMWithEnergyCredit(ncm);
    }
    shouldApplyFreightCredit(cfop, cst, ncm) {
        return cfop.startsWith('1') &&
            (cst === '01' || cst === '02' || cst === '03') &&
            this.isNCMWithFreightCredit(ncm);
    }
    shouldApplyPackagingCredit(cfop, cst, ncm) {
        return cfop.startsWith('1') &&
            (cst === '01' || cst === '02' || cst === '03') &&
            this.isNCMWithPackagingCredit(ncm);
    }
    isNCMWithZeroRate(ncm) {
        const ncmsZero = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
            '1501', '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509',
        ];
        return ncmsZero.some(ncmZero => ncm.startsWith(ncmZero));
    }
    isNCMWithPresumedCredit(ncm) {
        const ncmsPresumido = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
        ];
        return ncmsPresumido.some(ncmPresumido => ncm.startsWith(ncmPresumido));
    }
    isNCMWithInputCredit(ncm) {
        const ncmsInsumos = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
            '1501', '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509',
            '2701', '2702', '2703', '2704', '2705', '2706', '2707', '2708', '2709',
        ];
        return ncmsInsumos.some(ncmInsumo => ncm.startsWith(ncmInsumo));
    }
    isNCMWithEnergyCredit(ncm) {
        const ncmsEnergia = [
            '2710', '2711', '2712', '2713', '2714', '2715', '2716',
            '8544', '8545', '8546', '8547',
        ];
        return ncmsEnergia.some(ncmEnergia => ncm.startsWith(ncmEnergia));
    }
    isNCMWithFreightCredit(ncm) {
        const ncmsFrete = [
            '8601', '8602', '8603', '8604', '8605', '8606', '8607', '8608', '8609',
            '8701', '8702', '8703', '8704', '8705', '8706', '8707', '8708', '8709',
            '8801', '8802', '8803', '8804', '8805',
            '8901', '8902', '8903', '8904', '8905', '8906', '8907', '8908',
        ];
        return ncmsFrete.some(ncmFrete => ncm.startsWith(ncmFrete));
    }
    isNCMWithPackagingCredit(ncm) {
        const ncmsEmbalagens = [
            '3923', '3924', '3925', '3926',
            '4819', '4820', '4821', '4822', '4823',
            '7310', '7311', '7312', '7313', '7314', '7315', '7316', '7317', '7318', '7319',
        ];
        return ncmsEmbalagens.some(ncmEmbalagem => ncm.startsWith(ncmEmbalagem));
    }
    getPresumedCreditPercentage(ncm, federalRules) {
        const ncmRules = federalRules.presumedCredits || {};
        return ncmRules[ncm] || federalRules.defaultPresumedCredit || 0;
    }
    async calculateFederalTaxes(baseCalculo, item, federalRules, cfop, cst, beneficios, document) {
        const pis = await this.calculatePIS(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
        const cofins = await this.calculateCOFINS(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
        const irpj = await this.calculateIRPJ(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
        const csll = await this.calculateCSLL(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
        return { pis, cofins, irpj, csll };
    }
    async calculatePIS(baseCalculo, item, federalRules, cfop, cst, beneficios, document) {
        let baseCalculoFinal = baseCalculo;
        let aliquota = this.getPISAliquota(cst, cfop);
        let valorPIS = 0;
        let creditoPresumido = 0;
        let creditoInsumos = 0;
        let creditoEnergia = 0;
        let creditoFrete = 0;
        let creditoEmbalagens = 0;
        const zeroRateBeneficio = beneficios.find(b => b.tipo === 'aliquota_zero');
        if (zeroRateBeneficio) {
            aliquota = 0;
        }
        valorPIS = baseCalculoFinal * (aliquota / 100);
        const presumidoBeneficio = beneficios.find(b => b.tipo === 'credito_presumido');
        if (presumidoBeneficio) {
            creditoPresumido = valorPIS * (presumidoBeneficio.percentual / 100);
            valorPIS -= creditoPresumido;
        }
        if (beneficios.find(b => b.tipo === 'credito_insumos')) {
            creditoInsumos = await this.calculateInputCredit(baseCalculoFinal, 'pis', document);
            valorPIS -= creditoInsumos;
        }
        if (beneficios.find(b => b.tipo === 'credito_energia')) {
            creditoEnergia = await this.calculateEnergyCredit(baseCalculoFinal, 'pis', document);
            valorPIS -= creditoEnergia;
        }
        if (beneficios.find(b => b.tipo === 'credito_frete')) {
            creditoFrete = await this.calculateFreightCredit(baseCalculoFinal, 'pis', document);
            valorPIS -= creditoFrete;
        }
        if (beneficios.find(b => b.tipo === 'credito_embalagens')) {
            creditoEmbalagens = await this.calculatePackagingCredit(baseCalculoFinal, 'pis', document);
            valorPIS -= creditoEmbalagens;
        }
        return {
            baseCalculo,
            aliquota,
            valorPIS,
            creditoPresumido: creditoPresumido > 0 ? creditoPresumido : undefined,
            creditoInsumos: creditoInsumos > 0 ? creditoInsumos : undefined,
            creditoEnergia: creditoEnergia > 0 ? creditoEnergia : undefined,
            creditoFrete: creditoFrete > 0 ? creditoFrete : undefined,
            creditoEmbalagens: creditoEmbalagens > 0 ? creditoEmbalagens : undefined,
        };
    }
    async calculateCOFINS(baseCalculo, item, federalRules, cfop, cst, beneficios, document) {
        let baseCalculoFinal = baseCalculo;
        let aliquota = this.getCOFINSAliquota(cst, cfop);
        let valorCOFINS = 0;
        let creditoPresumido = 0;
        let creditoInsumos = 0;
        let creditoEnergia = 0;
        let creditoFrete = 0;
        let creditoEmbalagens = 0;
        const zeroRateBeneficio = beneficios.find(b => b.tipo === 'aliquota_zero');
        if (zeroRateBeneficio) {
            aliquota = 0;
        }
        valorCOFINS = baseCalculoFinal * (aliquota / 100);
        const presumidoBeneficio = beneficios.find(b => b.tipo === 'credito_presumido');
        if (presumidoBeneficio) {
            creditoPresumido = valorCOFINS * (presumidoBeneficio.percentual / 100);
            valorCOFINS -= creditoPresumido;
        }
        if (beneficios.find(b => b.tipo === 'credito_insumos')) {
            creditoInsumos = await this.calculateInputCredit(baseCalculoFinal, 'cofins', document);
            valorCOFINS -= creditoInsumos;
        }
        if (beneficios.find(b => b.tipo === 'credito_energia')) {
            creditoEnergia = await this.calculateEnergyCredit(baseCalculoFinal, 'cofins', document);
            valorCOFINS -= creditoEnergia;
        }
        if (beneficios.find(b => b.tipo === 'credito_frete')) {
            creditoFrete = await this.calculateFreightCredit(baseCalculoFinal, 'cofins', document);
            valorCOFINS -= creditoFrete;
        }
        if (beneficios.find(b => b.tipo === 'credito_embalagens')) {
            creditoEmbalagens = await this.calculatePackagingCredit(baseCalculoFinal, 'cofins', document);
            valorCOFINS -= creditoEmbalagens;
        }
        return {
            baseCalculo,
            aliquota,
            valorCOFINS,
            creditoPresumido: creditoPresumido > 0 ? creditoPresumido : undefined,
            creditoInsumos: creditoInsumos > 0 ? creditoInsumos : undefined,
            creditoEnergia: creditoEnergia > 0 ? creditoEnergia : undefined,
            creditoFrete: creditoFrete > 0 ? creditoFrete : undefined,
            creditoEmbalagens: creditoEmbalagens > 0 ? creditoEmbalagens : undefined,
        };
    }
    async calculateIRPJ(baseCalculo, item, federalRules, cfop, cst, beneficios, document) {
        let baseCalculoFinal = baseCalculo;
        let aliquota = this.getIRPJAliquota(cst, cfop);
        let valorIRPJ = 0;
        let isencao = 0;
        let reducao = 0;
        if (this.shouldApplyIRPJExemption(cfop, cst, item.ncm)) {
            isencao = baseCalculoFinal * (aliquota / 100);
            aliquota = 0;
        }
        if (this.shouldApplyIRPJReduction(cfop, cst, item.ncm)) {
            const percentualReducao = this.getIRPJReductionPercentage(item.ncm, federalRules);
            reducao = baseCalculoFinal * (percentualReducao / 100);
            baseCalculoFinal -= reducao;
        }
        valorIRPJ = baseCalculoFinal * (aliquota / 100);
        return {
            baseCalculo,
            aliquota,
            valorIRPJ,
            isencao: isencao > 0 ? isencao : undefined,
            reducao: reducao > 0 ? reducao : undefined,
        };
    }
    async calculateCSLL(baseCalculo, item, federalRules, cfop, cst, beneficios, document) {
        let baseCalculoFinal = baseCalculo;
        let aliquota = this.getCSLLAliquota(cst, cfop);
        let valorCSLL = 0;
        let isencao = 0;
        let reducao = 0;
        if (this.shouldApplyCSLLExemption(cfop, cst, item.ncm)) {
            isencao = baseCalculoFinal * (aliquota / 100);
            aliquota = 0;
        }
        if (this.shouldApplyCSLLReduction(cfop, cst, item.ncm)) {
            const percentualReducao = this.getCSLLReductionPercentage(item.ncm, federalRules);
            reducao = baseCalculoFinal * (percentualReducao / 100);
            baseCalculoFinal -= reducao;
        }
        valorCSLL = baseCalculoFinal * (aliquota / 100);
        return {
            baseCalculo,
            aliquota,
            valorCSLL,
            isencao: isencao > 0 ? isencao : undefined,
            reducao: reducao > 0 ? reducao : undefined,
        };
    }
    getPISAliquota(cst, cfop) {
        const aliquotas = {
            '01': 1.65,
            '02': 1.65,
            '03': 0,
            '04': 0,
            '05': 0,
            '06': 0,
            '07': 0,
            '08': 0,
            '09': 0,
        };
        return aliquotas[cst] || 1.65;
    }
    getCOFINSAliquota(cst, cfop) {
        const aliquotas = {
            '01': 7.6,
            '02': 7.6,
            '03': 0,
            '04': 0,
            '05': 0,
            '06': 0,
            '07': 0,
            '08': 0,
            '09': 0,
        };
        return aliquotas[cst] || 7.6;
    }
    getIRPJAliquota(cst, cfop) {
        return 15;
    }
    getCSLLAliquota(cst, cfop) {
        return 9;
    }
    shouldApplyIRPJExemption(cfop, cst, ncm) {
        return cfop.startsWith('11') || cfop.startsWith('12') || this.isNCMWithIRPJExemption(ncm);
    }
    shouldApplyIRPJReduction(cfop, cst, ncm) {
        return this.isNCMWithIRPJReduction(ncm);
    }
    shouldApplyCSLLExemption(cfop, cst, ncm) {
        return cfop.startsWith('11') || cfop.startsWith('12') || this.isNCMWithCSLLExemption(ncm);
    }
    shouldApplyCSLLReduction(cfop, cst, ncm) {
        return this.isNCMWithCSLLReduction(ncm);
    }
    isNCMWithIRPJExemption(ncm) {
        const ncmsExemption = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
        ];
        return ncmsExemption.some(ncmExemption => ncm.startsWith(ncmExemption));
    }
    isNCMWithIRPJReduction(ncm) {
        const ncmsReduction = [
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
        ];
        return ncmsReduction.some(ncmReduction => ncm.startsWith(ncmReduction));
    }
    isNCMWithCSLLExemption(ncm) {
        const ncmsExemption = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
        ];
        return ncmsExemption.some(ncmExemption => ncm.startsWith(ncmExemption));
    }
    isNCMWithCSLLReduction(ncm) {
        const ncmsReduction = [
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
        ];
        return ncmsReduction.some(ncmReduction => ncm.startsWith(ncmReduction));
    }
    getIRPJReductionPercentage(ncm, federalRules) {
        const ncmRules = federalRules.irpjReductions || {};
        return ncmRules[ncm] || federalRules.defaultIRPJReduction || 0;
    }
    getCSLLReductionPercentage(ncm, federalRules) {
        const ncmRules = federalRules.csllReductions || {};
        return ncmRules[ncm] || federalRules.defaultCSLLReduction || 0;
    }
    async calculateInputCredit(baseCalculo, tipo, document) {
        const spedContribuicoes = document.spedContribuicoes || [];
        const creditosInsumos = spedContribuicoes.filter((sped) => sped.tipo === 'credito_insumos' && sped.imposto === tipo);
        let totalCredito = 0;
        for (const credito of creditosInsumos) {
            totalCredito += credito.valor || 0;
        }
        return totalCredito;
    }
    async calculateEnergyCredit(baseCalculo, tipo, document) {
        const spedContribuicoes = document.spedContribuicoes || [];
        const creditosEnergia = spedContribuicoes.filter((sped) => sped.tipo === 'credito_energia' && sped.imposto === tipo);
        let totalCredito = 0;
        for (const credito of creditosEnergia) {
            totalCredito += credito.valor || 0;
        }
        return totalCredito;
    }
    async calculateFreightCredit(baseCalculo, tipo, document) {
        const spedContribuicoes = document.spedContribuicoes || [];
        const creditosFrete = spedContribuicoes.filter((sped) => sped.tipo === 'credito_frete' && sped.imposto === tipo);
        let totalCredito = 0;
        for (const credito of creditosFrete) {
            totalCredito += credito.valor || 0;
        }
        return totalCredito;
    }
    async calculatePackagingCredit(baseCalculo, tipo, document) {
        const spedContribuicoes = document.spedContribuicoes || [];
        const creditosEmbalagens = spedContribuicoes.filter((sped) => sped.tipo === 'credito_embalagens' && sped.imposto === tipo);
        let totalCredito = 0;
        for (const credito of creditosEmbalagens) {
            totalCredito += credito.valor || 0;
        }
        return totalCredito;
    }
    extractPeriod(dataEmissao) {
        const date = new Date(dataEmissao);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    generateObservations(calculo, beneficios) {
        const observacoes = [];
        if (calculo.pis.creditoPresumido) {
            observacoes.push(`PIS - Crédito presumido: R$ ${calculo.pis.creditoPresumido.toFixed(2)}`);
        }
        if (calculo.pis.creditoInsumos) {
            observacoes.push(`PIS - Crédito insumos: R$ ${calculo.pis.creditoInsumos.toFixed(2)}`);
        }
        if (calculo.cofins.creditoPresumido) {
            observacoes.push(`COFINS - Crédito presumido: R$ ${calculo.cofins.creditoPresumido.toFixed(2)}`);
        }
        if (calculo.cofins.creditoInsumos) {
            observacoes.push(`COFINS - Crédito insumos: R$ ${calculo.cofins.creditoInsumos.toFixed(2)}`);
        }
        if (calculo.irpj.isencao) {
            observacoes.push(`IRPJ - Isenção: R$ ${calculo.irpj.isencao.toFixed(2)}`);
        }
        if (calculo.csll.isencao) {
            observacoes.push(`CSLL - Isenção: R$ ${calculo.csll.isencao.toFixed(2)}`);
        }
        return observacoes;
    }
    async saveResults(results) {
        for (const result of results) {
            (0, logger_1.logInfo)('Federal result calculated (not saved - table not in schema)', { documentId: result.documentId,
                empresaId: result.empresaId,
                periodo: result.periodo,
                total: result.calculo.pis.valorPIS + result.calculo.cofins.valorCOFINS + result.calculo.irpj.valorIRPJ + result.calculo.csll.valorCSLL
            });
        }
    }
}
exports.FederalAgent = FederalAgent;
//# sourceMappingURL=federal-agent.js.map