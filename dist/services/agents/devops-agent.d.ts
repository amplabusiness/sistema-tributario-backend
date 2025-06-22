interface DevOpsConfig {
    openaiApiKey: string;
    projectPath: string;
    deploymentTargets: string[];
    maxRetries?: number;
    timeout?: number;
}
interface DevOpsResult {
    success: boolean;
    deployed: boolean;
    environments: string[];
    monitoring: boolean;
    errors: string[];
    suggestions: string[];
}
export declare class DevOpsAgent {
    private config;
    private openai;
    private indexer;
    private cache;
    constructor(config: DevOpsConfig);
    setupDevOpsPipeline(): Promise<DevOpsResult>;
    private setupCICD;
    private setupMonitoring;
    private setupAutoDeploy;
    private setupHealthChecks;
    private deploy;
    setupBackup(): Promise<void>;
    setupAlerts(): Promise<void>;
    startInfrastructureMonitoring(): Promise<void>;
    private checkHealth;
    private autoFix;
}
export {};
//# sourceMappingURL=devops-agent.d.ts.map