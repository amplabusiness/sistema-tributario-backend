import { EventEmitter } from 'events';
export interface GoogleDriveConfig {
    enabled: boolean;
    credentials: string;
    folderIds: string[];
    checkInterval: number;
}
export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    modifiedTime: string;
    parents: string[];
}
export declare class GoogleDriveWatcher extends EventEmitter {
    private config;
    private drive;
    private interval;
    private processedFiles;
    private downloadDir;
    constructor(config: GoogleDriveConfig);
    private ensureDownloadDir;
    private setupGoogleDrive;
    start(): void;
    stop(): void;
    private checkFolders;
    private checkFolder;
    private processFile;
    private isFiscalFile;
    private canDownloadFile;
    private downloadFile;
    searchFiscalFiles(query?: string): Promise<DriveFile[]>;
    setupWebhook(webhookUrl: string): Promise<void>;
}
//# sourceMappingURL=google-drive-watcher.d.ts.map