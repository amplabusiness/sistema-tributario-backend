import { ProtegeRegra, ProtegeBeneficio } from './parsers/protege-pdf-parser';
import { IcmsIpiItem } from './parsers/sped-fiscal-parser';
export interface ProtegeCalculo {
    baseCalculo: number;
    tipoProtege: 'PROTEGE_15' | 'PROTEGE_2';
    aliquotaProtege: number;
    valorProtege: number;
    beneficiosAplicados?: ProtegeBeneficioAplicado[];
    totalBeneficios?: number;
    valorFinal: number;
    icmsOriginal?: number;
    icmsComProtege?: number;
    mesPagamento?: string;
    mesCredito?: string;
}
export interface ProtegeBeneficioAplicado {
    beneficio: ProtegeBeneficio;
    valorBeneficio: number;
    tipoCalculo: string;
    condicoesAtendidas: boolean;
}
export interface ProtegeApuracaoResultado {
    empresaId: string;
    periodo: string;
    totalBaseCalculo: number;
    totalProtege15: number;
    totalProtege2: number;
    totalBeneficios: number;
    valorFinal: number;
    detalhes: ProtegeCalculoDetalhe[];
    protege2Pagamento: number;
    protege2Credito: number;
    saldoProtege2: number;
}
export interface ProtegeCalculoDetalhe {
    item: IcmsIpiItem;
    protegeCalculo: ProtegeCalculo;
    regraAplicada?: ProtegeRegra;
}
export declare class ProtegeCalculator {
    static calcularProtege(itens: IcmsIpiItem[], regras: ProtegeRegra[], empresaId: string, periodo: string, creditoMesAnterior?: number): ProtegeApuracaoResultado;
    private static calcularProtegeItem;
    private static calcularProtege15;
    private static calcularProtege2;
    private static calcularMesCredito;
    static calcularCreditoProtege2(itens: IcmsIpiItem[], regras: ProtegeRegra[], periodo: string): number;
    static gerarRelatorioCreditoCruzado(resultados: ProtegeApuracaoResultado[], periodoInicio: string, periodoFim: string): any;
    private static calcularBeneficio;
    private static verificarCondicoes;
    static validarElegibilidade(empresaId: string, regras: ProtegeRegra[]): boolean;
    static verificarProdutoProtege2(item: IcmsIpiItem, regra: ProtegeRegra): boolean;
    static gerarRelatorioBeneficios(resultado: ProtegeApuracaoResultado): any;
}
//# sourceMappingURL=protege-calculator.d.ts.map