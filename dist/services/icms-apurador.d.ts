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
export declare class IcmsApurador {
    static apurarICMS(itens: IcmsIpiItem[], regras: IcmsRule[]): IcmsApuracaoResultado;
}
//# sourceMappingURL=icms-apurador.d.ts.map