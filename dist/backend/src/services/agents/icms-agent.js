"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ICMSAgent = void 0;
const logger_1 = require("../../utils/logger");
const database_1 = require("../../config/database");
const icms_rules_1 = require("../../constants/icms-rules");
class ICMSAgent {
    constructor() {
        this.rules = icms_rules_1.ICMS_RULES;
    }
    async processDocument(documentId) {
        try {
            (0, logger_1.logInfo)('Iniciando processamento ICMS', { documentId });
            const document = await this.getDocumentWithData(documentId);
            if (!document) {
                throw new Error('Documento não encontrado');
            }
            const results = [];
            for (const item of document.items || []) {
                const icmsResult = await this.calculateICMS(document, item);
                if (icmsResult) {
                    results.push(icmsResult);
                }
            }
            await this.saveResults(results);
            (0, logger_1.logInfo)('Processamento ICMS concluído', {
                documentId,
                itemsProcessed: results.length,
            });
            return results;
        }
        catch (error) {
            (0, logger_1.logError)('Erro no processamento ICMS', {
                documentId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async getDocumentWithData(documentId) {
        return await database_1.prisma.document.findUnique({
            where: { id: documentId },
            include: {
                empresa: true,
                items: {
                    include: {
                        produto: true,
                    },
                },
                destinatario: true,
                emitente: true,
            },
        });
    }
    async calculateICMS(document, item) {
        try {
            const ufOrigem = document.emitente?.uf || '';
            const ufDestino = document.destinatario?.uf || '';
            const cfop = item.cfop || '';
            const cst = item.cst || '';
            const ncm = item.ncm || '';
            const tipoOperacao = this.determineOperationType(cfop, ufOrigem, ufDestino);
            const tipoCliente = this.determineClientType(document.destinatario);
            const stateRules = this.rules[ufOrigem] || this.rules.DEFAULT;
            const baseCalculo = this.calculateBase(item.valorTotal, item.descontos || 0);
            const beneficios = this.applyFiscalBenefits(item, stateRules, cfop, cst);
            const calculo = await this.calculateICMSValue(baseCalculo, item, stateRules, ufOrigem, ufDestino, cfop, cst, beneficios);
            return {
                documentId: document.id,
                empresaId: document.empresaId,
                periodo: this.extractPeriod(document.dataEmissao),
                ufOrigem,
                ufDestino,
                tipoOperacao,
                tipoCliente,
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
            (0, logger_1.logError)('Erro ao calcular ICMS do item', {
                documentId: document.id,
                itemId: item.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    determineOperationType(cfop, ufOrigem, ufDestino) {
        if (cfop.startsWith('5')) {
            if (cfop.startsWith('51') || cfop.startsWith('52')) {
                return 'interna';
            }
            else if (cfop.startsWith('53') || cfop.startsWith('54')) {
                return 'interestadual';
            }
            else if (cfop.startsWith('55') || cfop.startsWith('56')) {
                return 'exportacao';
            }
        }
        if (cfop.startsWith('1')) {
            if (cfop.startsWith('11') || cfop.startsWith('12')) {
                return 'interna';
            }
            else if (cfop.startsWith('13') || cfop.startsWith('14')) {
                return 'interestadual';
            }
            else if (cfop.startsWith('15') || cfop.startsWith('16')) {
                return 'exportacao';
            }
        }
        return 'interna';
    }
    determineClientType(destinatario) {
        if (!destinatario)
            return 'consumidor_final';
        if (destinatario.ie && destinatario.ie !== 'ISENTO') {
            return 'atacado';
        }
        if (destinatario.tipo === 'PJ') {
            return 'atacado';
        }
        return 'consumidor_final';
    }
    calculateBase(valorTotal, descontos) {
        return Math.max(0, valorTotal - descontos);
    }
    applyFiscalBenefits(item, stateRules, cfop, cst) {
        const beneficios = [];
        if (this.shouldApplyReducedBase(cfop, cst, item.ncm)) {
            const percentualReducao = this.getReductionPercentage(item.ncm, stateRules);
            if (percentualReducao > 0) {
                beneficios.push({
                    nome: 'Base Reduzida',
                    percentual: percentualReducao,
                    tipo: 'reducao_base',
                });
            }
        }
        if (this.shouldApplyOutorgadoCredit(cfop, cst, item.ncm)) {
            const percentualOutorgado = this.getOutorgadoPercentage(item.ncm, stateRules);
            if (percentualOutorgado > 0) {
                beneficios.push({
                    nome: 'Crédito Outorgado',
                    percentual: percentualOutorgado,
                    tipo: 'credito_outorgado',
                });
            }
        }
        if (this.shouldApplyProtegeGoias(cfop, cst, item.ncm)) {
            beneficios.push({
                nome: 'Protege Goiás',
                percentual: 0,
                tipo: 'protege_goias',
            });
        }
        return beneficios;
    }
    shouldApplyReducedBase(cfop, cst, ncm) {
        const cfopsReducao = ['1102', '1113', '1116', '1117', '1121', '1122', '1124', '1125', '1126', '1128', '1131', '1132', '1135', '1136', '1138', '1141', '1142', '1143', '1144', '1145', '1146', '1147', '1148', '1149', '1151', '1152', '1153', '1154', '1155', '1156', '1157', '1158', '1159', '1161', '1162', '1163', '1164', '1165', '1166', '1167', '1168', '1169', '1171', '1172', '1173', '1174', '1175', '1176', '1177', '1178', '1179', '1181', '1182', '1183', '1184', '1185', '1186', '1187', '1188', '1189', '1191', '1192', '1193', '1194', '1195', '1196', '1197', '1198', '1199'];
        return cfopsReducao.includes(cfop) ||
            cst === '20' ||
            cst === '40' ||
            cst === '41' ||
            this.isNCMWithReduction(ncm);
    }
    shouldApplyOutorgadoCredit(cfop, cst, ncm) {
        const cfopsOutorgado = ['1101', '1103', '1104', '1105', '1106', '1107', '1108', '1109', '1110', '1111', '1112', '1114', '1115', '1118', '1119', '1120', '1123', '1127', '1129', '1130', '1133', '1134', '1137', '1139', '1140'];
        return cfopsOutorgado.includes(cfop) ||
            cst === '10' ||
            cst === '30' ||
            this.isNCMWithOutorgado(ncm);
    }
    shouldApplyProtegeGoias(cfop, cst, ncm) {
        return cfop.startsWith('11') &&
            (cst === '10' || cst === '20' || cst === '30' || cst === '40') &&
            this.isNCMProtegeGoias(ncm);
    }
    isNCMWithReduction(ncm) {
        const ncmsReducao = [
            '2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2210',
            '2401', '2402', '2403',
            '3301', '3302', '3303', '3304', '3305', '3306', '3307',
            '9503', '9504', '9505', '9506', '9507', '9508',
        ];
        return ncmsReducao.some(ncmReducao => ncm.startsWith(ncmReducao));
    }
    isNCMWithOutorgado(ncm) {
        const ncmsOutorgado = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
        ];
        return ncmsOutorgado.some(ncmOutorgado => ncm.startsWith(ncmOutorgado));
    }
    isNCMProtegeGoias(ncm) {
        const ncmsProtege = [
            '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008',
            '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109',
            '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209',
            '1501', '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509',
        ];
        return ncmsProtege.some(ncmProtege => ncm.startsWith(ncmProtege));
    }
    getReductionPercentage(ncm, stateRules) {
        const ncmRules = stateRules.ncmReductions || {};
        return ncmRules[ncm] || stateRules.defaultReduction || 0;
    }
    getOutorgadoPercentage(ncm, stateRules) {
        const ncmRules = stateRules.outorgadoCredits || {};
        return ncmRules[ncm] || stateRules.defaultOutorgado || 0;
    }
    async calculateICMSValue(baseCalculo, item, stateRules, ufOrigem, ufDestino, cfop, cst, beneficios) {
        let baseCalculoFinal = baseCalculo;
        let aliquota = this.getAliquota(cst, ufOrigem, ufDestino, cfop);
        let valorICMS = 0;
        let baseReduzida = 0;
        let creditoOutorgado = 0;
        let protegeGoias = 0;
        let difal = undefined;
        const reducaoBeneficio = beneficios.find(b => b.tipo === 'reducao_base');
        if (reducaoBeneficio) {
            baseReduzida = baseCalculoFinal * (reducaoBeneficio.percentual / 100);
            baseCalculoFinal -= baseReduzida;
        }
        valorICMS = baseCalculoFinal * (aliquota / 100);
        const outorgadoBeneficio = beneficios.find(b => b.tipo === 'credito_outorgado');
        if (outorgadoBeneficio) {
            creditoOutorgado = valorICMS * (outorgadoBeneficio.percentual / 100);
            valorICMS -= creditoOutorgado;
        }
        if (ufOrigem === 'GO' && beneficios.find(b => b.tipo === 'protege_goias')) {
            protegeGoias = this.calculateProtegeGoias(baseCalculoFinal, item.ncm);
            valorICMS -= protegeGoias;
        }
        if (ufOrigem !== ufDestino && cfop.startsWith('5')) {
            difal = this.calculateDIFAL(baseCalculoFinal, ufOrigem, ufDestino, cfop);
        }
        return {
            baseCalculo,
            aliquota,
            valorICMS,
            baseReduzida: baseReduzida > 0 ? baseReduzida : undefined,
            creditoOutorgado: creditoOutorgado > 0 ? creditoOutorgado : undefined,
            protegeGoias: protegeGoias > 0 ? protegeGoias : undefined,
            difal,
        };
    }
    getAliquota(cst, ufOrigem, ufDestino, cfop) {
        const aliquotas = {
            '10': 18,
            '20': 18,
            '30': 18,
            '40': 18,
            '41': 18,
            '50': 18,
            '51': 18,
            '60': 18,
            '70': 18,
            '90': 18,
        };
        return aliquotas[cst] || 18;
    }
    calculateProtegeGoias(baseCalculo, ncm) {
        const percentuaisProtege = {
            '1001': 2,
            '1002': 2,
            '1003': 2,
            '1004': 2,
            '1005': 2,
            '1006': 2,
            '1007': 2,
            '1008': 2,
        };
        const percentual = percentuaisProtege[ncm] || 0;
        return baseCalculo * (percentual / 100);
    }
    calculateDIFAL(baseCalculo, ufOrigem, ufDestino, cfop) {
        const aliquotasInterestaduais = {
            'AC': 7, 'AL': 7, 'AP': 7, 'AM': 7, 'BA': 7, 'CE': 7, 'DF': 7, 'ES': 7,
            'GO': 7, 'MA': 7, 'MG': 7, 'MS': 7, 'MT': 7, 'PA': 7, 'PB': 7, 'PE': 7,
            'PI': 7, 'PR': 7, 'RJ': 7, 'RN': 7, 'RO': 7, 'RR': 7, 'RS': 7, 'SC': 7,
            'SE': 7, 'SP': 7, 'TO': 7
        };
        const aliquotasInternas = {
            'AC': 17, 'AL': 17, 'AP': 18, 'AM': 18, 'BA': 18, 'CE': 18, 'DF': 18, 'ES': 17,
            'GO': 17, 'MA': 18, 'MG': 18, 'MS': 17, 'MT': 17, 'PA': 17, 'PB': 18, 'PE': 17.5,
            'PI': 18, 'PR': 18, 'RJ': 20, 'RN': 18, 'RO': 17.5, 'RR': 17, 'RS': 18, 'SC': 17,
            'SE': 17, 'SP': 18, 'TO': 18
        };
        const aliquotaInterestadual = aliquotasInterestaduais[ufOrigem] || 7;
        const aliquotaInterna = aliquotasInternas[ufDestino] || 18;
        const valorInterestadual = baseCalculo * (aliquotaInterestadual / 100);
        const valorInterna = baseCalculo * (aliquotaInterna / 100);
        const valorDIFAL = valorInterna - valorInterestadual;
        return {
            baseCalculo,
            aliquotaInterestadual,
            aliquotaInterna,
            valorInterestadual,
            valorInterna,
            valorDIFAL: Math.max(0, valorDIFAL),
        };
    }
    extractPeriod(dataEmissao) {
        const date = new Date(dataEmissao);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    generateObservations(calculo, beneficios) {
        const observacoes = [];
        if (calculo.baseReduzida) {
            observacoes.push(`Base reduzida aplicada: R$ ${calculo.baseReduzida.toFixed(2)}`);
        }
        if (calculo.creditoOutorgado) {
            observacoes.push(`Crédito outorgado aplicado: R$ ${calculo.creditoOutorgado.toFixed(2)}`);
        }
        if (calculo.protegeGoias) {
            observacoes.push(`Protege Goiás aplicado: R$ ${calculo.protegeGoias.toFixed(2)}`);
        }
        if (calculo.difal) {
            observacoes.push(`DIFAL calculado: R$ ${calculo.difal.valorDIFAL.toFixed(2)}`);
        }
        return observacoes;
    }
    async saveResults(results) {
        for (const result of results) {
            await database_1.prisma.iCMSResult.create({
                data: {
                    documentId: result.documentId,
                    empresaId: result.empresaId,
                    periodo: result.periodo,
                    ufOrigem: result.ufOrigem,
                    ufDestino: result.ufDestino,
                    tipoOperacao: result.tipoOperacao,
                    tipoCliente: result.tipoCliente,
                    produtoId: result.produtoId,
                    ncm: result.ncm,
                    cfop: result.cfop,
                    cst: result.cst,
                    baseCalculo: result.calculo.baseCalculo,
                    aliquota: result.calculo.aliquota,
                    valorICMS: result.calculo.valorICMS,
                    baseReduzida: result.calculo.baseReduzida,
                    creditoOutorgado: result.calculo.creditoOutorgado,
                    protegeGoias: result.calculo.protegeGoias,
                    difalBaseCalculo: result.calculo.difal?.baseCalculo,
                    difalAliquotaInterestadual: result.calculo.difal?.aliquotaInterestadual,
                    difalAliquotaInterna: result.calculo.difal?.aliquotaInterna,
                    difalValorInterestadual: result.calculo.difal?.valorInterestadual,
                    difalValorInterna: result.calculo.difal?.valorInterna,
                    difalValorDIFAL: result.calculo.difal?.valorDIFAL,
                    beneficios: result.beneficios,
                    observacoes: result.observacoes,
                },
            });
        }
    }
}
exports.ICMSAgent = ICMSAgent;
//# sourceMappingURL=icms-agent.js.map