interface CoordinatorConfig {
    openaiApiKey: string;
    projectPath: string;
    maxRetries?: number;
    timeout?: number;
}
interface DevelopmentTask {
    id: string;
    type: 'test-fix' | 'frontend-dev' | 'code-quality' | 'devops' | 'monitoring';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    assignedAgent?: string;
    result?: any;
    createdAt: Date;
    completedAt?: Date;
}
interface DevelopmentPlan {
    tasks: DevelopmentTask[];
    estimatedTime: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    dependencies: string[];
}
interface CoordinatorResult {
    success: boolean;
    completedTasks: DevelopmentTask[];
    failedTasks: DevelopmentTask[];
    totalTime: number;
    suggestions: string[];
}
export declare class DevelopmentCoordinatorAgent {
    private config;
    private openai;
    private indexer;
    private cache;
    private tasks;
    private agents;
    constructor(config: CoordinatorConfig);
    initializeAgents(): Promise<void>;
    createDevelopmentPlan(): Promise<DevelopmentPlan>;
    executeDevelopmentPlan(): Promise<CoordinatorResult>;
    private executeTask;
    private getAgentForTask;
    private generateSuggestions;
    startContinuousDevelopment(): Promise<void>;
    monitorProgress(): Promise<void>;
    private autoFixFailedTasks;
    generateDevelopmentReport(): Promise<string>;
}
export {};
//# sourceMappingURL=development-coordinator-agent.d.ts.map