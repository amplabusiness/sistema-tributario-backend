import { ProtegeRegra, ProtegeBeneficio } from './parsers/protege-pdf-parser';
import { ProtegeApuracaoResultado } from './protege-calculator';
export interface ProtegeConfiguracao {
    empresaId: string;
    regras: ProtegeRegra[];
    beneficios: ProtegeBeneficio[];
    ativo: boolean;
    dataInicio: Date;
    dataFim?: Date;
}
export interface ProtegeResultado {
    id: string;
    empresaId: string;
    periodo: string;
    configuracao: ProtegeConfiguracao;
    resultado: ProtegeApuracaoResultado;
    dataCalculo: Date;
    status: 'PENDENTE' | 'CALCULADO' | 'ERRO';
    erro?: string;
}
export declare class ProtegeService {
    private static cache;
    static processarPdfsProtege(empresaId: string, arquivos: {
        nome: string;
        caminho: string;
    }[]): Promise<ProtegeConfiguracao>;
    static calcularProtege(empresaId: string, periodo: string, configuracao?: ProtegeConfiguracao): Promise<ProtegeResultado>;
    private static buscarCreditoMesAnterior;
    private static salvarPagamentoProtege2;
    private static calcularMesAnterior;
    private static buscarDadosSpedFiscal;
    private static buscarDocumentosPorTipo;
    static buscarResultado(empresaId: string, periodo: string): Promise<ProtegeResultado | null>;
    static listarResultados(empresaId: string): Promise<ProtegeResultado[]>;
    private static buscarChavesCache;
    static gerarRelatorioConsolidado(empresaId: string, periodoInicio: string, periodoFim: string): Promise<any>;
    static gerarRelatorioCreditoCruzado(empresaId: string, periodoInicio: string, periodoFim: string): Promise<any>;
    static atualizarConfiguracao(empresaId: string, configuracao: Partial<ProtegeConfiguracao>): Promise<ProtegeConfiguracao>;
}
//# sourceMappingURL=protege-service.d.ts.map