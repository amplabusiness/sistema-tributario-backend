declare const RATE_LIMIT: {
    requestsPerMinute: number;
    requestsPerHour: number;
};
export interface AIResponse {
    success: boolean;
    content: string;
    model: string;
    tokens: number;
    cost: number;
    timestamp: string;
    error?: string;
}
export interface AIPrompt {
    system: string;
    user: string;
    context?: any;
    temperature?: number;
    maxTokens?: number;
}
export interface AIConfig {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
}
export declare function analisarDocumentoFiscal(conteudo: string, tipoDocumento?: string): Promise<AIResponse>;
export declare function validarDadosFiscais(dados: any, tipoValidacao?: string): Promise<AIResponse>;
export declare function gerarRelatorioFiscal(dados: any, tipoRelatorio?: string): Promise<AIResponse>;
export declare function analisarXML(conteudoXML: string, tipo?: 'XML' | 'SPED'): Promise<AIResponse>;
export declare function corrigirErrosDocumento(documento: any, erros: string[]): Promise<AIResponse>;
export declare function fazerRequisicaoCustomizada(prompt: AIPrompt, config?: AIConfig): Promise<AIResponse>;
export declare function verificarStatus(): Promise<{
    status: 'online' | 'offline' | 'error';
    message: string;
    config: any;
}>;
export declare function obterEstatisticas(): {
    requestsThisMinute: number;
    requestsThisHour: number;
    rateLimit: typeof RATE_LIMIT;
};
export {};
//# sourceMappingURL=openai-service.d.ts.map