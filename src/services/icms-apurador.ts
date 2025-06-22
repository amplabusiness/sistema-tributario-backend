import { IcmsRule } from './parsers/icms-rules-excel-parser';
import { IcmsIpiItem } from './parsers/sped-fiscal-parser';

export interface IcmsApuracaoDetalhe {
  item: IcmsIpiItem;
  regra?: IcmsRule;
  baseCalculo: number;
  aliquota: number;
  icmsDevido: number;
  beneficio?: string;
  tipoCalculo: string;
}

export interface IcmsApuracaoResultado {
  totalIcms: number;
  detalhes: IcmsApuracaoDetalhe[];
}

export class IcmsApurador {
  static apurarICMS(itens: IcmsIpiItem[], regras: IcmsRule[]): IcmsApuracaoResultado {
    const detalhes: IcmsApuracaoDetalhe[] = [];
    let totalIcms = 0;

    for (const item of itens) {
      // Encontrar regra aplicável (por NCM, CFOP, CST, etc)
      const regra = regras.find(r =>
        (!r.ncm || r.ncm === item.ncm) &&
        (!r.cfop || r.cfop === item.cfop) &&
        (!r.cst || r.cst === item.cst)
      );

      let baseCalculo = item.baseIcms;
      let aliquota = regra?.aliquota ?? 0;
      let icmsDevido = 0;
      let tipoCalculo = 'PADRAO';
      let beneficio = regra?.beneficio;

      if (regra) {
        // Base reduzida
        if (regra.baseReduzida && regra.baseReduzida > 0 && regra.baseReduzida < 100) {
          baseCalculo = baseCalculo * (regra.baseReduzida / 100);
          tipoCalculo = 'BASE REDUZIDA';
        }
        // Crédito outorgado
        if (regra.beneficio && regra.beneficio.toLowerCase().includes('crédito outorgado')) {
          icmsDevido = baseCalculo * (aliquota / 100);
          tipoCalculo = 'CRÉDITO OUTORGADO';
        } else {
          icmsDevido = baseCalculo * (aliquota / 100);
        }
        // Protege, DIFAL, CIAP, etc podem ser tratados aqui
        // Exemplo: Protege
        if (regra.proteje) {
          tipoCalculo += ' + PROTEGE';
        }
        if (regra.difal) {
          tipoCalculo += ' + DIFAL';
        }
        if (regra.ciap) {
          tipoCalculo += ' + CIAP';
        }
      } else {
        // Sem regra específica, usar valores do item
        aliquota = item.baseIcms > 0 ? (item.valorIcms / item.baseIcms) * 100 : 0;
        icmsDevido = item.valorIcms;
        tipoCalculo = 'SEM REGRA';
      }

      totalIcms += icmsDevido;
      detalhes.push({
        item,
        regra,
        baseCalculo,
        aliquota,
        icmsDevido,
        beneficio,
        tipoCalculo
      });
    }

    return { totalIcms, detalhes };
  }
} 