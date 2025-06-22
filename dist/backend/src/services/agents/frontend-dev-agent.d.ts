interface FrontendDevConfig {
    openaiApiKey: string;
    frontendPath: string;
    maxRetries?: number;
    timeout?: number;
}
interface ComponentSpec {
    name: string;
    type: 'page' | 'component' | 'layout' | 'hook' | 'store';
    description: string;
    props?: string[];
    features?: string[];
    dependencies?: string[];
}
interface FrontendDevResult {
    success: boolean;
    createdFiles: string[];
    components: ComponentSpec[];
    errors: string[];
    suggestions: string[];
}
export declare class FrontendDevAgent {
    private config;
    private openai;
    private indexer;
    private cache;
    constructor(config: FrontendDevConfig);
    developFrontend(specs: ComponentSpec[]): Promise<FrontendDevResult>;
    private createComponent;
    private generateComponentCode;
    private getComponentFilePath;
    createDashboard(): Promise<FrontendDevResult>;
    createUploadSystem(): Promise<FrontendDevResult>;
    createReportingSystem(): Promise<FrontendDevResult>;
    createNotificationSystem(): Promise<FrontendDevResult>;
    developCompleteFrontend(): Promise<FrontendDevResult>;
    startContinuousDevelopment(): Promise<void>;
    private checkForUpdates;
}
export {};
//# sourceMappingURL=frontend-dev-agent.d.ts.map