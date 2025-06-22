import winston from 'winston';
declare const logger: winston.Logger;
export declare const logInfo: (message: string, meta?: any) => void;
export declare const logError: (message: string, error?: Error | any) => void;
export declare const logWarn: (message: string, meta?: any) => void;
export declare const logDebug: (message: string, meta?: any) => void;
export declare const logAI: (message: string, meta?: any) => void;
export declare const logDB: (message: string, meta?: any) => void;
export declare const logCache: (message: string, meta?: any) => void;
export declare const logUpload: (message: string, meta?: any) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map