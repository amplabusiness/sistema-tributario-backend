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
export declare class FederalAgent {
    private rules;
    processDocument(documentId: string): Promise<FederalResult[]>;
    private getDocumentWithData;
    private calculateFederal;
    private determineOperationType;
    private calculateBase;
    private applyFiscalBenefits;
    private shouldApplyZeroRate;
    private shouldApplyPresumedCredit;
    private shouldApplyInputCredit;
    private shouldApplyEnergyCredit;
    private shouldApplyFreightCredit;
    private shouldApplyPackagingCredit;
    private isNCMWithZeroRate;
    private isNCMWithPresumedCredit;
    private isNCMWithInputCredit;
    private isNCMWithEnergyCredit;
    private isNCMWithFreightCredit;
    private isNCMWithPackagingCredit;
    private getPresumedCreditPercentage;
    private calculateFederalTaxes;
    private calculatePIS;
    private calculateCOFINS;
    private calculateIRPJ;
    private calculateCSLL;
    private getPISAliquota;
    private getCOFINSAliquota;
    private getIRPJAliquota;
    private getCSLLAliquota;
    private shouldApplyIRPJExemption;
    private shouldApplyIRPJReduction;
    private shouldApplyCSLLExemption;
    private shouldApplyCSLLReduction;
    private isNCMWithIRPJExemption;
    private isNCMWithIRPJReduction;
    private isNCMWithCSLLExemption;
    private isNCMWithCSLLReduction;
    private getIRPJReductionPercentage;
    private getCSLLReductionPercentage;
    private calculateInputCredit;
    private calculateEnergyCredit;
    private calculateFreightCredit;
    private calculatePackagingCredit;
    private extractPeriod;
    private generateObservations;
    private saveResults;
}
//# sourceMappingURL=federal-agent.d.ts.map