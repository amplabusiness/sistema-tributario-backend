import { EventEmitter } from 'events';
export interface S3Config {
    enabled: boolean;
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    prefix: string;
    checkInterval: number;
}
export interface S3File {
    key: string;
    size: number;
    lastModified: Date;
    etag: string;
}
export declare class S3Watcher extends EventEmitter {
    private config;
    private s3Client;
    private interval;
    private processedFiles;
    private downloadDir;
    constructor(config: S3Config);
    private ensureDownloadDir;
    private setupS3Client;
    start(): void;
    stop(): void;
    private checkBucket;
    private processFile;
    private isFiscalFile;
    private downloadFile;
    searchFiles(prefix: string): Promise<S3File[]>;
    setupEventNotifications(topicArn: string): Promise<void>;
    listAllFiscalFiles(): Promise<S3File[]>;
}
//# sourceMappingURL=s3-watcher.d.ts.map