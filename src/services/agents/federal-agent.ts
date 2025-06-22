import { logInfo, logError } from '../../utils/logger';
import prisma from '../../config/database';
import { FEDERAL_RULES } from '../../constants/federal-rules';

export interface FederalCalculation {
  pis: {
    baseCalculo: number;
    aliquota: number;
    valorPIS: number;
    creditoPresumido?: number;
    creditoInsumos?: number;
    creditoEnergia?: number;
    creditoFrete?: number;
    creditoEmbalagens?: number;
  };
  cofins: {
    baseCalculo: number;
    aliquota: number;
    valorCOFINS: number;
    creditoPresumido?: number;
    creditoInsumos?: number;
    creditoEnergia?: number;
    creditoFrete?: number;
    creditoEmbalagens?: number;
  };
  irpj: {
    baseCalculo: number;
    aliquota: number;
    valorIRPJ: number;
    isencao?: number;
    reducao?: number;
  };
  csll: {
    baseCalculo: number;
    aliquota: number;
    valorCSLL: number;
    isencao?: number;
    reducao?: number;
  };
}

export interface FederalResult {
  documentId: string;
  empresaId: string;
  periodo: string;
  tipoOperacao: 'entrada' | 'saida';
  produtoId?: string;
  ncm: string;
  cfop: string;
  cst: string;
  calculo: FederalCalculation;
  beneficios: string[];
  observacoes: string[];
  createdAt: Date;
}

export class FederalAgent {
  private rules = FEDERAL_RULES;

  async processDocument(documentId: string): Promise<FederalResult[]> {
    try {
      logInfo('Iniciando processamento Federal', { documentId });

      const document = await this.getDocumentWithData(documentId);
      if (!document) {
        throw new Error('Documento não encontrado');
      }      const results: FederalResult[] = [];

      // Extrair items do metadata do documento
      const items = (document.metadata as any)?.items || [];
      
      for (const item of items) {
        const federalResult = await this.calculateFederal(document, item);
        if (federalResult) {
          results.push(federalResult);
        }
      }

      await this.saveResults(results);

      logInfo('Processamento Federal concluído', {
        documentId,
        itemsProcessed: results.length,
      });

      return results;

    } catch (error) {
      logError('Erro no processamento Federal', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
  private async getDocumentWithData(documentId: string) {
    return await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        empresa: true,
      },
    });
    }

  private async calculateFederal(document: any, item: any): Promise<FederalResult | null> {
    try {
      const cfop = item.cfop || '';
      const cst = item.cst || '';
      const ncm = item.ncm || '';
      const tipoOperacao = this.determineOperationType(cfop);

      // Aplicar regras federais
      const federalRules = this.rules;
      
      // Calcular base de cálculo
      const baseCalculo = this.calculateBase(item.valorTotal, item.descontos || 0);
      
      // Aplicar benefícios fiscais
      const beneficios = this.applyFiscalBenefits(item, federalRules, cfop, cst);
      
      // Calcular impostos federais
      const calculo = await this.calculateFederalTaxes(
        baseCalculo,
        item,
        federalRules,
        cfop,
        cst,
        beneficios,
        document
      );

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

    } catch (error) {
      logError('Erro ao calcular impostos federais do item', {
        documentId: document.id,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private determineOperationType(cfop: string): 'entrada' | 'saida' {
    if (cfop.startsWith('1')) {
      return 'entrada';
    } else if (cfop.startsWith('5')) {
      return 'saida';
    }
    return 'saida'; // Default
  }

  private calculateBase(valorTotal: number, descontos: number): number {
    return Math.max(0, valorTotal - descontos);
  }

  private applyFiscalBenefits(item: any, federalRules: any, cfop: string, cst: string): any[] {
    const beneficios = [];

    // Alíquota zero
    if (this.shouldApplyZeroRate(cfop, cst, item.ncm)) {
      beneficios.push({
        nome: 'Alíquota Zero',
        tipo: 'aliquota_zero',
        percentual: 0,
      });
    }

    // Crédito presumido
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

    // Crédito de insumos
    if (this.shouldApplyInputCredit(cfop, cst, item.ncm)) {
      beneficios.push({
        nome: 'Crédito de Insumos',
        tipo: 'credito_insumos',
        percentual: 0, // Será calculado dinamicamente
      });
    }

    // Crédito de energia
    if (this.shouldApplyEnergyCredit(cfop, cst, item.ncm)) {
      beneficios.push({
        nome: 'Crédito de Energia',
        tipo: 'credito_energia',
        percentual: 0, // Será calculado dinamicamente
      });
    }

    // Crédito de frete
    if (this.shouldApplyFreightCredit(cfop, cst, item.ncm)) {
      beneficios.push({
        nome: 'Crédito de Frete',
        tipo: 'credito_frete',
        percentual: 0, // Será calculado dinamicamente
      });
    }

    // Crédito de embalagens
    if (this.shouldApplyPackagingCredit(cfop, cst, item.ncm)) {
      beneficios.push({
        nome: 'Crédito de Embalagens',
        tipo: 'credito_embalagens',
        percentual: 0, // Será calculado dinamicamente
      });
    }

    return beneficios;
  }

  private shouldApplyZeroRate(cfop: string, cst: string, ncm: string): boolean {
    // CFOPs com alíquota zero
    const cfopsZero = ['1101', '1102', '1111', '1113', '1116', '1117', '1121', '1122', '1124', '1125', '1126', '1128', '1131', '1132', '1135', '1136', '1138', '1141', '1142', '1143', '1144', '1145', '1146', '1147', '1148', '1149', '1151', '1152', '1153', '1154', '1155', '1156', '1157', '1158', '1159', '1161', '1162', '1163', '1164', '1165', '1166', '1167', '1168', '1169', '1171', '1172', '1173', '1174', '1175', '1176', '1177', '1178', '1179', '1181', '1182', '1183', '1184', '1185', '1186', '1187', '1188', '1189', '1191', '1192', '1193', '1194', '1195', '1196', '1197', '1198', '1199'];
    
    return cfopsZero.includes(cfop) || 
           cst === '01' || 
           cst === '02' || 
           cst === '03' ||
           this.isNCMWithZeroRate(ncm);
  }

  private shouldApplyPresumedCredit(cfop: string, cst: string, ncm: string): boolean {
    // CFOPs com crédito presumido
    const cfopsPresumido = ['1101', '1103', '1104', '1105', '1106', '1107', '1108', '1109', '1110', '1112', '1114', '1115', '1118', '1119', '1120', '1123', '1127', '1129', '1130', '1133', '1134', '1137', '1139', '1140'];
    
    return cfopsPresumido.includes(cfop) || 
           cst === '01' || 
           cst === '02' ||
           this.isNCMWithPresumedCredit(ncm);
  }

  private shouldApplyInputCredit(cfop: string, cst: string, ncm: string): boolean {
    return cfop.startsWith('1') && 
           (cst === '01' || cst === '02' || cst === '03') &&
           this.isNCMWithInputCredit(ncm);
  }

  private shouldApplyEnergyCredit(cfop: string, cst: string, ncm: string): boolean {
    return cfop.startsWith('1') && 
           (cst === '01' || cst === '02' || cst === '03') &&
           this.isNCMWithEnergyCredit(ncm);
  }

  private shouldApplyFreightCredit(cfop: string, cst: string, ncm: string): boolean {
    return cfop.startsWith('1') && 
           (cst === '01' || cst === '02' || cst === '03') &&
           this.isNCMWithFreightCredit(ncm);
  }

  private shouldApplyPackagingCredit(cfop: string, cst: string, ncm: string): boolean {
    return cfop.startsWith('1') && 
           (cst === '01' || cst === '02' || cst === '03') &&
           this.isNCMWithPackagingCredit(ncm);
  }

  private isNCMWithZeroRate(ncm: string): boolean {
    const ncmsZero = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
      '1501', '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509', // Gorduras
    ];
    
    return ncmsZero.some(ncmZero => ncm.startsWith(ncmZero));
  }

  private isNCMWithPresumedCredit(ncm: string): boolean {
    const ncmsPresumido = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
    ];
    
    return ncmsPresumido.some(ncmPresumido => ncm.startsWith(ncmPresumido));
  }

  private isNCMWithInputCredit(ncm: string): boolean {
    const ncmsInsumos = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
      '1501', '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509', // Gorduras
      '2701', '2702', '2703', '2704', '2705', '2706', '2707', '2708', '2709', // Combustíveis
    ];
    
    return ncmsInsumos.some(ncmInsumo => ncm.startsWith(ncmInsumo));
  }

  private isNCMWithEnergyCredit(ncm: string): boolean {
    const ncmsEnergia = [
      '2710', '2711', '2712', '2713', '2714', '2715', '2716', // Petróleo e derivados
      '8544', '8545', '8546', '8547', // Cabos elétricos
    ];
    
    return ncmsEnergia.some(ncmEnergia => ncm.startsWith(ncmEnergia));
  }

  private isNCMWithFreightCredit(ncm: string): boolean {
    const ncmsFrete = [
      '8601', '8602', '8603', '8604', '8605', '8606', '8607', '8608', '8609', // Veículos ferroviários
      '8701', '8702', '8703', '8704', '8705', '8706', '8707', '8708', '8709', // Veículos automóveis
      '8801', '8802', '8803', '8804', '8805', // Aeronaves
      '8901', '8902', '8903', '8904', '8905', '8906', '8907', '8908', // Embarcações
    ];
    
    return ncmsFrete.some(ncmFrete => ncm.startsWith(ncmFrete));
  }

  private isNCMWithPackagingCredit(ncm: string): boolean {
    const ncmsEmbalagens = [
      '3923', '3924', '3925', '3926', // Plásticos
      '4819', '4820', '4821', '4822', '4823', // Papel e papelão
      '7310', '7311', '7312', '7313', '7314', '7315', '7316', '7317', '7318', '7319', // Metais
    ];
    
    return ncmsEmbalagens.some(ncmEmbalagem => ncm.startsWith(ncmEmbalagem));
  }

  private getPresumedCreditPercentage(ncm: string, federalRules: any): number {
    const ncmRules = federalRules.presumedCredits || {};
    return ncmRules[ncm] || federalRules.defaultPresumedCredit || 0;
  }

  private async calculateFederalTaxes(
    baseCalculo: number,
    item: any,
    federalRules: any,
    cfop: string,
    cst: string,
    beneficios: any[],
    document: any
  ): Promise<FederalCalculation> {
    // Calcular PIS
    const pis = await this.calculatePIS(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
    
    // Calcular COFINS
    const cofins = await this.calculateCOFINS(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
    
    // Calcular IRPJ
    const irpj = await this.calculateIRPJ(baseCalculo, item, federalRules, cfop, cst, beneficios, document);
    
    // Calcular CSLL
    const csll = await this.calculateCSLL(baseCalculo, item, federalRules, cfop, cst, beneficios, document);

    return { pis, cofins, irpj, csll };
  }

  private async calculatePIS(
    baseCalculo: number,
    item: any,
    federalRules: any,
    cfop: string,
    cst: string,
    beneficios: any[],
    document: any
  ): Promise<FederalCalculation['pis']> {
    let baseCalculoFinal = baseCalculo;
    let aliquota = this.getPISAliquota(cst, cfop);
    let valorPIS = 0;
    let creditoPresumido = 0;
    let creditoInsumos = 0;
    let creditoEnergia = 0;
    let creditoFrete = 0;
    let creditoEmbalagens = 0;

    // Verificar se aplica alíquota zero
    const zeroRateBeneficio = beneficios.find(b => b.tipo === 'aliquota_zero');
    if (zeroRateBeneficio) {
      aliquota = 0;
    }

    // Calcular PIS normal
    valorPIS = baseCalculoFinal * (aliquota / 100);

    // Aplicar crédito presumido
    const presumidoBeneficio = beneficios.find(b => b.tipo === 'credito_presumido');
    if (presumidoBeneficio) {
      creditoPresumido = valorPIS * (presumidoBeneficio.percentual / 100);
      valorPIS -= creditoPresumido;
    }

    // Aplicar créditos específicos
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

  private async calculateCOFINS(
    baseCalculo: number,
    item: any,
    federalRules: any,
    cfop: string,
    cst: string,
    beneficios: any[],
    document: any
  ): Promise<FederalCalculation['cofins']> {
    let baseCalculoFinal = baseCalculo;
    let aliquota = this.getCOFINSAliquota(cst, cfop);
    let valorCOFINS = 0;
    let creditoPresumido = 0;
    let creditoInsumos = 0;
    let creditoEnergia = 0;
    let creditoFrete = 0;
    let creditoEmbalagens = 0;

    // Verificar se aplica alíquota zero
    const zeroRateBeneficio = beneficios.find(b => b.tipo === 'aliquota_zero');
    if (zeroRateBeneficio) {
      aliquota = 0;
    }

    // Calcular COFINS normal
    valorCOFINS = baseCalculoFinal * (aliquota / 100);

    // Aplicar crédito presumido
    const presumidoBeneficio = beneficios.find(b => b.tipo === 'credito_presumido');
    if (presumidoBeneficio) {
      creditoPresumido = valorCOFINS * (presumidoBeneficio.percentual / 100);
      valorCOFINS -= creditoPresumido;
    }

    // Aplicar créditos específicos
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

  private async calculateIRPJ(
    baseCalculo: number,
    item: any,
    federalRules: any,
    cfop: string,
    cst: string,
    beneficios: any[],
    document: any
  ): Promise<FederalCalculation['irpj']> {
    let baseCalculoFinal = baseCalculo;
    let aliquota = this.getIRPJAliquota(cst, cfop);
    let valorIRPJ = 0;
    let isencao = 0;
    let reducao = 0;

    // Verificar isenções
    if (this.shouldApplyIRPJExemption(cfop, cst, item.ncm)) {
      isencao = baseCalculoFinal * (aliquota / 100);
      aliquota = 0;
    }

    // Verificar reduções
    if (this.shouldApplyIRPJReduction(cfop, cst, item.ncm)) {
      const percentualReducao = this.getIRPJReductionPercentage(item.ncm, federalRules);
      reducao = baseCalculoFinal * (percentualReducao / 100);
      baseCalculoFinal -= reducao;
    }

    // Calcular IRPJ
    valorIRPJ = baseCalculoFinal * (aliquota / 100);

    return {
      baseCalculo,
      aliquota,
      valorIRPJ,
      isencao: isencao > 0 ? isencao : undefined,
      reducao: reducao > 0 ? reducao : undefined,
    };
  }

  private async calculateCSLL(
    baseCalculo: number,
    item: any,
    federalRules: any,
    cfop: string,
    cst: string,
    beneficios: any[],
    document: any
  ): Promise<FederalCalculation['csll']> {
    let baseCalculoFinal = baseCalculo;
    let aliquota = this.getCSLLAliquota(cst, cfop);
    let valorCSLL = 0;
    let isencao = 0;
    let reducao = 0;

    // Verificar isenções
    if (this.shouldApplyCSLLExemption(cfop, cst, item.ncm)) {
      isencao = baseCalculoFinal * (aliquota / 100);
      aliquota = 0;
    }

    // Verificar reduções
    if (this.shouldApplyCSLLReduction(cfop, cst, item.ncm)) {
      const percentualReducao = this.getCSLLReductionPercentage(item.ncm, federalRules);
      reducao = baseCalculoFinal * (percentualReducao / 100);
      baseCalculoFinal -= reducao;
    }

    // Calcular CSLL
    valorCSLL = baseCalculoFinal * (aliquota / 100);

    return {
      baseCalculo,
      aliquota,
      valorCSLL,
      isencao: isencao > 0 ? isencao : undefined,
      reducao: reducao > 0 ? reducao : undefined,
    };
  }
  private getPISAliquota(cst: string, cfop: string): number {
    // Alíquotas PIS por CST
    const aliquotas: Record<string, number> = {
      '01': 1.65, // PIS normal
      '02': 1.65, // PIS normal
      '03': 0, // PIS isento
      '04': 0, // PIS não tributado
      '05': 0, // PIS suspensão
      '06': 0, // PIS diferimento
      '07': 0, // PIS cobrado anteriormente
      '08': 0, // PIS outros
      '09': 0, // PIS outros
    };

    return aliquotas[cst] || 1.65; // Default 1.65%
  }

  private getCOFINSAliquota(cst: string, cfop: string): number {    // Alíquotas COFINS por CST
    const aliquotas: Record<string, number> = {
      '01': 7.6, // COFINS normal
      '02': 7.6, // COFINS normal
      '03': 0, // COFINS isento
      '04': 0, // COFINS não tributado
      '05': 0, // COFINS suspensão
      '06': 0, // COFINS diferimento
      '07': 0, // COFINS cobrado anteriormente
      '08': 0, // COFINS outros
      '09': 0, // COFINS outros
    };

    return aliquotas[cst] || 7.6; // Default 7.6%
  }

  private getIRPJAliquota(cst: string, cfop: string): number {
    // Alíquotas IRPJ
    return 15; // 15% padrão
  }

  private getCSLLAliquota(cst: string, cfop: string): number {
    // Alíquotas CSLL
    return 9; // 9% padrão
  }

  private shouldApplyIRPJExemption(cfop: string, cst: string, ncm: string): boolean {
    // Verificar isenções IRPJ
    return cfop.startsWith('11') || cfop.startsWith('12') || this.isNCMWithIRPJExemption(ncm);
  }

  private shouldApplyIRPJReduction(cfop: string, cst: string, ncm: string): boolean {
    // Verificar reduções IRPJ
    return this.isNCMWithIRPJReduction(ncm);
  }

  private shouldApplyCSLLExemption(cfop: string, cst: string, ncm: string): boolean {
    // Verificar isenções CSLL
    return cfop.startsWith('11') || cfop.startsWith('12') || this.isNCMWithCSLLExemption(ncm);
  }

  private shouldApplyCSLLReduction(cfop: string, cst: string, ncm: string): boolean {
    // Verificar reduções CSLL
    return this.isNCMWithCSLLReduction(ncm);
  }

  private isNCMWithIRPJExemption(ncm: string): boolean {
    const ncmsExemption = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
    ];
    
    return ncmsExemption.some(ncmExemption => ncm.startsWith(ncmExemption));
  }

  private isNCMWithIRPJReduction(ncm: string): boolean {
    const ncmsReduction = [
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
    ];
    
    return ncmsReduction.some(ncmReduction => ncm.startsWith(ncmReduction));
  }

  private isNCMWithCSLLExemption(ncm: string): boolean {
    const ncmsExemption = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
    ];
    
    return ncmsExemption.some(ncmExemption => ncm.startsWith(ncmExemption));
  }

  private isNCMWithCSLLReduction(ncm: string): boolean {
    const ncmsReduction = [
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
    ];
    
    return ncmsReduction.some(ncmReduction => ncm.startsWith(ncmReduction));
  }

  private getIRPJReductionPercentage(ncm: string, federalRules: any): number {
    const ncmRules = federalRules.irpjReductions || {};
    return ncmRules[ncm] || federalRules.defaultIRPJReduction || 0;
  }

  private getCSLLReductionPercentage(ncm: string, federalRules: any): number {
    const ncmRules = federalRules.csllReductions || {};
    return ncmRules[ncm] || federalRules.defaultCSLLReduction || 0;
  }

  private async calculateInputCredit(baseCalculo: number, tipo: 'pis' | 'cofins', document: any): Promise<number> {
    // Buscar créditos de insumos do SPED Contribuições
    const spedContribuicoes = document.spedContribuicoes || [];
    const creditosInsumos = spedContribuicoes.filter((sped: any) => 
      sped.tipo === 'credito_insumos' && sped.imposto === tipo
    );

    let totalCredito = 0;
    for (const credito of creditosInsumos) {
      totalCredito += credito.valor || 0;
    }

    return totalCredito;
  }

  private async calculateEnergyCredit(baseCalculo: number, tipo: 'pis' | 'cofins', document: any): Promise<number> {
    // Buscar créditos de energia do SPED Contribuições
    const spedContribuicoes = document.spedContribuicoes || [];
    const creditosEnergia = spedContribuicoes.filter((sped: any) => 
      sped.tipo === 'credito_energia' && sped.imposto === tipo
    );

    let totalCredito = 0;
    for (const credito of creditosEnergia) {
      totalCredito += credito.valor || 0;
    }

    return totalCredito;
  }

  private async calculateFreightCredit(baseCalculo: number, tipo: 'pis' | 'cofins', document: any): Promise<number> {
    // Buscar créditos de frete do SPED Contribuições
    const spedContribuicoes = document.spedContribuicoes || [];
    const creditosFrete = spedContribuicoes.filter((sped: any) => 
      sped.tipo === 'credito_frete' && sped.imposto === tipo
    );

    let totalCredito = 0;
    for (const credito of creditosFrete) {
      totalCredito += credito.valor || 0;
    }

    return totalCredito;
  }

  private async calculatePackagingCredit(baseCalculo: number, tipo: 'pis' | 'cofins', document: any): Promise<number> {
    // Buscar créditos de embalagens do SPED Contribuições
    const spedContribuicoes = document.spedContribuicoes || [];
    const creditosEmbalagens = spedContribuicoes.filter((sped: any) => 
      sped.tipo === 'credito_embalagens' && sped.imposto === tipo
    );

    let totalCredito = 0;
    for (const credito of creditosEmbalagens) {
      totalCredito += credito.valor || 0;
    }

    return totalCredito;
  }

  private extractPeriod(dataEmissao: Date): string {
    const date = new Date(dataEmissao);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private generateObservations(calculo: FederalCalculation, beneficios: any[]): string[] {
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
  private async saveResults(results: FederalResult[]): Promise<void> {
    for (const result of results) {
      // Salvar no banco usando uma tabela genérica (schema não tem federalResult)
      logInfo('Federal result calculated (not saved - table not in schema)', {        documentId: result.documentId,
        empresaId: result.empresaId,
        periodo: result.periodo,
        total: result.calculo.pis.valorPIS + result.calculo.cofins.valorCOFINS + result.calculo.irpj.valorIRPJ + result.calculo.csll.valorCSLL
      });
    }
  }
}