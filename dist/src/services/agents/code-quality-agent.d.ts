export interface CodeQualityConfig {
    openaiApiKey: string;
    projectPath?: string;
}
export declare class CodeQualityAgent {
    private config;
    constructor(config: CodeQualityConfig);
    analyzeCode(filePath: string): Promise<any>;
    applyFixes(suggestions: any[]): Promise<any>;
}
//# sourceMappingURL=code-quality-agent.d.ts.map