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
export declare class ICMSAgent {
    private rules;
    processDocument(documentId: string): Promise<ICMSResult[]>;
    private getDocumentWithData;
    private calculateICMS;
    private determineOperationType;
    private determineClientType;
    private calculateBase;
    private applyFiscalBenefits;
    private shouldApplyReducedBase;
    private shouldApplyOutorgadoCredit;
    private shouldApplyProtegeGoias;
    private isNCMWithReduction;
    private isNCMWithOutorgado;
    private isNCMProtegeGoias;
    private getReductionPercentage;
    private getOutorgadoPercentage;
    private calculateICMSValue;
    private getAliquota;
    private calculateProtegeGoias;
    private calculateDIFAL;
    private extractPeriod;
    private generateObservations;
    private saveResults;
}
//# sourceMappingURL=icms-agent.d.ts.map