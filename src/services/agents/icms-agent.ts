import { logInfo, logError } from '../../utils/logger';
import prisma from '../../config/database';
import { ICMS_RULES } from '../../constants/icms-rules';

export interface ICMSCalculation {
  baseCalculo: number;
  aliquota: number;
  valorICMS: number;
  baseReduzida?: number;
  creditoOutorgado?: number;
  protegeGoias?: number;
  difal?: {
    baseCalculo: number;
    aliquotaInterestadual: number;
    aliquotaInterna: number;
    valorInterestadual: number;
    valorInterna: number;
    valorDIFAL: number;
  };
  ciap?: {
    valorCredito: number;
    percentualApropriacao: number;
  };
}

export interface ICMSResult {
  documentId: string;
  empresaId: string;
  periodo: string;
  ufOrigem: string;
  ufDestino: string;
  tipoOperacao: 'interna' | 'interestadual' | 'exportacao';
  tipoCliente: 'consumidor_final' | 'atacado' | 'varejo';
  produtoId?: string;
  ncm: string;
  cfop: string;
  cst: string;
  calculo: ICMSCalculation;
  beneficios: string[];
  observacoes: string[];
  createdAt: Date;
}

export class ICMSAgent {
  private rules = ICMS_RULES;

  async processDocument(documentId: string): Promise<ICMSResult[]> {
    try {
      logInfo('Iniciando processamento ICMS', { documentId });

      // Buscar documento e dados relacionados
      const document = await this.getDocumentWithData(documentId);
      if (!document) {
        throw new Error('Documento não encontrado');
      }      const results: ICMSResult[] = [];

      // Extrair items do metadata do documento
      const items = (document.metadata as any)?.items || [];

      // Processar cada item do documento
      for (const item of items) {
        const icmsResult = await this.calculateICMS(document, item);
        if (icmsResult) {
          results.push(icmsResult);
        }
      }

      // Salvar resultados no banco
      await this.saveResults(results);

      logInfo('Processamento ICMS concluído', {
        documentId,
        itemsProcessed: results.length,
      });

      return results;

    } catch (error) {
      logError('Erro no processamento ICMS', {
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

  private async calculateICMS(document: any, item: any): Promise<ICMSResult | null> {
    try {
      const ufOrigem = document.emitente?.uf || '';
      const ufDestino = document.destinatario?.uf || '';
      const cfop = item.cfop || '';
      const cst = item.cst || '';
      const ncm = item.ncm || '';

      // Determinar tipo de operação
      const tipoOperacao = this.determineOperationType(cfop, ufOrigem, ufDestino);
      const tipoCliente = this.determineClientType(document.destinatario);      // Aplicar regras específicas do estado
      const stateRules = (this.rules as any)[ufOrigem] || (this.rules as any).DEFAULT;
      
      // Calcular base de cálculo
      const baseCalculo = this.calculateBase(item.valorTotal, item.descontos || 0);
      
      // Aplicar benefícios fiscais
      const beneficios = this.applyFiscalBenefits(item, stateRules, cfop, cst);
      
      // Calcular ICMS
      const calculo = await this.calculateICMSValue(
        baseCalculo,
        item,
        stateRules,
        ufOrigem,
        ufDestino,
        cfop,
        cst,
        beneficios
      );

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

    } catch (error) {
      logError('Erro ao calcular ICMS do item', {
        documentId: document.id,
        itemId: item.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  private determineOperationType(cfop: string, ufOrigem: string, ufDestino: string): 'interna' | 'interestadual' | 'exportacao' {
    // CFOPs de saída
    if (cfop.startsWith('5')) {
      if (cfop.startsWith('51') || cfop.startsWith('52')) {
        return 'interna';
      } else if (cfop.startsWith('53') || cfop.startsWith('54')) {
        return 'interestadual';
      } else if (cfop.startsWith('55') || cfop.startsWith('56')) {
        return 'exportacao';
      }
    }
    
    // CFOPs de entrada
    if (cfop.startsWith('1')) {
      if (cfop.startsWith('11') || cfop.startsWith('12')) {
        return 'interna';
      } else if (cfop.startsWith('13') || cfop.startsWith('14')) {
        return 'interestadual';
      } else if (cfop.startsWith('15') || cfop.startsWith('16')) {
        return 'exportacao';
      }
    }

    return 'interna'; // Default
  }

  private determineClientType(destinatario: any): 'consumidor_final' | 'atacado' | 'varejo' {
    if (!destinatario) return 'consumidor_final';

    // Verificar se tem IE (Inscrição Estadual)
    if (destinatario.ie && destinatario.ie !== 'ISENTO') {
      return 'atacado';
    }

    // Verificar se é pessoa jurídica
    if (destinatario.tipo === 'PJ') {
      return 'atacado';
    }

    return 'consumidor_final';
  }

  private calculateBase(valorTotal: number, descontos: number): number {
    return Math.max(0, valorTotal - descontos);
  }

  private applyFiscalBenefits(item: any, stateRules: any, cfop: string, cst: string): any[] {
    const beneficios = [];

    // Base reduzida
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

    // Crédito outorgado
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

    // Protege Goiás
    if (this.shouldApplyProtegeGoias(cfop, cst, item.ncm)) {
      beneficios.push({
        nome: 'Protege Goiás',
        percentual: 0, // Será calculado dinamicamente
        tipo: 'protege_goias',
      });
    }

    return beneficios;
  }

  private shouldApplyReducedBase(cfop: string, cst: string, ncm: string): boolean {
    // Regras para base reduzida
    const cfopsReducao = ['1102', '1113', '1116', '1117', '1121', '1122', '1124', '1125', '1126', '1128', '1131', '1132', '1135', '1136', '1138', '1141', '1142', '1143', '1144', '1145', '1146', '1147', '1148', '1149', '1151', '1152', '1153', '1154', '1155', '1156', '1157', '1158', '1159', '1161', '1162', '1163', '1164', '1165', '1166', '1167', '1168', '1169', '1171', '1172', '1173', '1174', '1175', '1176', '1177', '1178', '1179', '1181', '1182', '1183', '1184', '1185', '1186', '1187', '1188', '1189', '1191', '1192', '1193', '1194', '1195', '1196', '1197', '1198', '1199'];
    
    return cfopsReducao.includes(cfop) || 
           cst === '20' || 
           cst === '40' || 
           cst === '41' ||
           this.isNCMWithReduction(ncm);
  }

  private shouldApplyOutorgadoCredit(cfop: string, cst: string, ncm: string): boolean {
    // Regras para crédito outorgado
    const cfopsOutorgado = ['1101', '1103', '1104', '1105', '1106', '1107', '1108', '1109', '1110', '1111', '1112', '1114', '1115', '1118', '1119', '1120', '1123', '1127', '1129', '1130', '1133', '1134', '1137', '1139', '1140'];
    
    return cfopsOutorgado.includes(cfop) || 
           cst === '10' || 
           cst === '30' ||
           this.isNCMWithOutorgado(ncm);
  }

  private shouldApplyProtegeGoias(cfop: string, cst: string, ncm: string): boolean {
    // Protege Goiás - específico do estado
    return cfop.startsWith('11') && 
           (cst === '10' || cst === '20' || cst === '30' || cst === '40') &&
           this.isNCMProtegeGoias(ncm);
  }

  private isNCMWithReduction(ncm: string): boolean {
    // NCMs com redução de base
    const ncmsReducao = [
      '2201', '2202', '2203', '2204', '2205', '2206', '2207', '2208', '2209', '2210', // Bebidas
      '2401', '2402', '2403', // Tabaco
      '3301', '3302', '3303', '3304', '3305', '3306', '3307', // Perfumaria
      '9503', '9504', '9505', '9506', '9507', '9508', // Brinquedos
    ];
    
    return ncmsReducao.some(ncmReducao => ncm.startsWith(ncmReducao));
  }

  private isNCMWithOutorgado(ncm: string): boolean {
    // NCMs com crédito outorgado
    const ncmsOutorgado = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
    ];
    
    return ncmsOutorgado.some(ncmOutorgado => ncm.startsWith(ncmOutorgado));
  }

  private isNCMProtegeGoias(ncm: string): boolean {
    // NCMs do Protege Goiás
    const ncmsProtege = [
      '1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', // Cereais
      '1101', '1102', '1103', '1104', '1105', '1106', '1107', '1108', '1109', // Produtos da moagem
      '1201', '1202', '1203', '1204', '1205', '1206', '1207', '1208', '1209', // Sementes
      '1501', '1502', '1503', '1504', '1505', '1506', '1507', '1508', '1509', // Gorduras
    ];
    
    return ncmsProtege.some(ncmProtege => ncm.startsWith(ncmProtege));
  }

  private getReductionPercentage(ncm: string, stateRules: any): number {
    // Buscar percentual de redução específico do NCM no estado
    const ncmRules = stateRules.ncmReductions || {};
    return ncmRules[ncm] || stateRules.defaultReduction || 0;
  }

  private getOutorgadoPercentage(ncm: string, stateRules: any): number {
    // Buscar percentual de crédito outorgado específico do NCM no estado
    const ncmRules = stateRules.outorgadoCredits || {};
    return ncmRules[ncm] || stateRules.defaultOutorgado || 0;
  }

  private async calculateICMSValue(
    baseCalculo: number,
    item: any,
    stateRules: any,
    ufOrigem: string,
    ufDestino: string,
    cfop: string,
    cst: string,
    beneficios: any[]
  ): Promise<ICMSCalculation> {
    let baseCalculoFinal = baseCalculo;
    let aliquota = this.getAliquota(cst, ufOrigem, ufDestino, cfop);
    let valorICMS = 0;
    let baseReduzida = 0;
    let creditoOutorgado = 0;
    let protegeGoias = 0;
    let difal = undefined;

    // Aplicar base reduzida
    const reducaoBeneficio = beneficios.find(b => b.tipo === 'reducao_base');
    if (reducaoBeneficio) {
      baseReduzida = baseCalculoFinal * (reducaoBeneficio.percentual / 100);
      baseCalculoFinal -= baseReduzida;
    }

    // Calcular ICMS normal
    valorICMS = baseCalculoFinal * (aliquota / 100);

    // Aplicar crédito outorgado
    const outorgadoBeneficio = beneficios.find(b => b.tipo === 'credito_outorgado');
    if (outorgadoBeneficio) {
      creditoOutorgado = valorICMS * (outorgadoBeneficio.percentual / 100);
      valorICMS -= creditoOutorgado;
    }

    // Aplicar Protege Goiás (específico de Goiás)
    if (ufOrigem === 'GO' && beneficios.find(b => b.tipo === 'protege_goias')) {
      protegeGoias = this.calculateProtegeGoias(baseCalculoFinal, item.ncm);
      valorICMS -= protegeGoias;
    }

    // Calcular DIFAL para operações interestaduais
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

  private getAliquota(cst: string, ufOrigem: string, ufDestino: string, cfop: string): number {
    // Alíquotas por CST e estado
    const aliquotas = {
      '10': 18, // ICMS normal
      '20': 18, // ICMS com redução de base
      '30': 18, // ICMS não tributado
      '40': 18, // ICMS isento
      '41': 18, // ICMS não tributado
      '50': 18, // ICMS suspensão
      '51': 18, // ICMS diferimento
      '60': 18, // ICMS cobrado anteriormente
      '70': 18, // ICMS com redução de base e cobrança
      '90': 18, // ICMS outros
    };

    return (aliquotas as any)[cst] || 18; // Default 18%
  }

  private calculateProtegeGoias(baseCalculo: number, ncm: string): number {
    // Protege Goiás - redução específica por NCM
    const percentuaisProtege = {
      '1001': 2, // Trigo
      '1002': 2, // Centeio
      '1003': 2, // Cevada
      '1004': 2, // Aveia
      '1005': 2, // Milho
      '1006': 2, // Arroz
      '1007': 2, // Sorgo
      '1008': 2, // Trigo mourisco
    };

    const percentual = (percentuaisProtege as any)[ncm] || 0;
    return baseCalculo * (percentual / 100);
  }

  private calculateDIFAL(
    baseCalculo: number,
    ufOrigem: string,
    ufDestino: string,
    cfop: string
  ): ICMSCalculation['difal'] {
    // Alíquotas interestaduais por UF
    const aliquotasInterestaduais = {
      'AC': 7, 'AL': 7, 'AP': 7, 'AM': 7, 'BA': 7, 'CE': 7, 'DF': 7, 'ES': 7,
      'GO': 7, 'MA': 7, 'MG': 7, 'MS': 7, 'MT': 7, 'PA': 7, 'PB': 7, 'PE': 7,
      'PI': 7, 'PR': 7, 'RJ': 7, 'RN': 7, 'RO': 7, 'RR': 7, 'RS': 7, 'SC': 7,
      'SE': 7, 'SP': 7, 'TO': 7
    };

    // Alíquotas internas por UF
    const aliquotasInternas = {
      'AC': 17, 'AL': 17, 'AP': 18, 'AM': 18, 'BA': 18, 'CE': 18, 'DF': 18, 'ES': 17,
      'GO': 17, 'MA': 18, 'MG': 18, 'MS': 17, 'MT': 17, 'PA': 17, 'PB': 18, 'PE': 17.5,
      'PI': 18, 'PR': 18, 'RJ': 20, 'RN': 18, 'RO': 17.5, 'RR': 17, 'RS': 18, 'SC': 17,
      'SE': 17, 'SP': 18, 'TO': 18
    };    const aliquotaInterestadual = (aliquotasInterestaduais as any)[ufOrigem] || 7;
    const aliquotaInterna = (aliquotasInternas as any)[ufDestino] || 18;

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

  private extractPeriod(dataEmissao: Date): string {
    const date = new Date(dataEmissao);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private generateObservations(calculo: ICMSCalculation, beneficios: any[]): string[] {
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
  private async saveResults(results: ICMSResult[]): Promise<void> {
    for (const result of results) {
      await prisma.aIProcessingResult.create({
        data: {
          documentId: result.documentId,
          model: 'icms-agent',
          tokens: 0,
          processingTime: 0,
          result: result as any,
        },
      });
    }
  }
} 