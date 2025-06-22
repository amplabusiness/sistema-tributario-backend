import { EventEmitter } from 'events';
export interface FTPConfig {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    directories: string[];
    checkInterval: number;
}
export interface FTPFile {
    name: string;
    size: number;
    modifiedAt: Date;
    type: string;
}
export declare class FTPWatcher extends EventEmitter {
    private config;
    private client;
    private interval;
    private processedFiles;
    private downloadDir;
    constructor(config: FTPConfig);
    private ensureDownloadDir;
    private setupFTPClient;
    start(): void;
    stop(): void;
    private checkDirectories;
    private checkDirectory;
    private processFile;
    private isFiscalFile;
    private downloadFile;
    private connect;
    searchFilesRecursively(directory: string): Promise<FTPFile[]>;
    private listFilesRecursively;
    startRealTimeMonitoring(): Promise<void>;
    testConnection(): Promise<boolean>;
    listAllFiscalFiles(): Promise<FTPFile[]>;
}
//# sourceMappingURL=ftp-watcher.d.ts.map