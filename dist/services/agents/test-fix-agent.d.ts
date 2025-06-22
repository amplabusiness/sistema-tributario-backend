interface TestFixConfig {
    openaiApiKey: string;
    maxRetries?: number;
    timeout?: number;
}
interface TestError {
    testFile: string;
    errorType: string;
    errorMessage: string;
    lineNumber?: number;
    suggestion?: string;
}
interface TestFixResult {
    success: boolean;
    fixedTests: string[];
    errors: TestError[];
    suggestions: string[];
    coverage: number;
}
export declare class TestFixAgent {
    private config;
    private openai;
    private indexer;
    private cache;
    constructor(config: TestFixConfig);
    fixTestIssues(): Promise<TestFixResult>;
    private analyzeTestErrors;
    private generateFixes;
    private generateFixForError;
    private categorizeFix;
    private applyFixes;
    private applyFix;
    private runTests;
    private generateReport;
    fixMockIssues(): Promise<void>;
    fixJestConfig(): Promise<void>;
    startContinuousFix(): Promise<void>;
}
export {};
//# sourceMappingURL=test-fix-agent.d.ts.map