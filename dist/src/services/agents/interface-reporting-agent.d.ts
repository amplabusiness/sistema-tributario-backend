import { Request, Response } from 'express';
export declare class InterfaceReportingAgent {
    private static instance;
    private constructor();
    static getInstance(): InterfaceReportingAgent;
    generateDashboard(req: Request, res: Response): Promise<void>;
    generateReport(req: Request, res: Response): Promise<void>;
    generateAlerts(req: Request, res: Response): Promise<void>;
    getMetrics(req: Request, res: Response): Promise<void>;
}
export default InterfaceReportingAgent;
//# sourceMappingURL=interface-reporting-agent.d.ts.map