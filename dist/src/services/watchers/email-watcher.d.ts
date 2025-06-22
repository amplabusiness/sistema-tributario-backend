import { EventEmitter } from 'events';
export interface EmailConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    folders: string[];
    checkInterval: number;
}
export declare class EmailWatcher extends EventEmitter {
    private config;
    private imap;
    private interval;
    private processedEmails;
    private downloadDir;
    constructor(config: EmailConfig);
    private ensureDownloadDir;
    private connect;
    start(): void;
    stop(): void;
    private startMonitoring;
    private checkEmails;
    private checkFolder;
    private processEmails;
    private processEmail;
    private isFiscalEmail;
    private processAttachment;
}
//# sourceMappingURL=email-watcher.d.ts.map