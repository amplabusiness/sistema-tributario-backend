export interface WatcherConfig {
    enabled: boolean;
    checkInterval?: number;
    watchInterval?: number;
}
export interface LocalWatcherConfig {
    enabled: boolean;
    paths: string[];
    checkInterval: number;
}
export interface FTPWatcherConfig extends WatcherConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    directories: string[];
    watchInterval: number;
}
export interface S3WatcherConfig extends WatcherConfig {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    prefix: string;
    checkInterval: number;
}
export interface EmailWatcherConfig extends WatcherConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    folders: string[];
    checkInterval: number;
}
export interface APIWatcherConfig extends WatcherConfig {
    endpoints: string[];
    headers: Record<string, string>;
    checkInterval: number;
}
export interface GoogleDriveWatcherConfig extends WatcherConfig {
    credentials: string;
    folderIds: string[];
    checkInterval: number;
}
export interface WatcherServiceConfig {
    local: LocalWatcherConfig;
    ftp: FTPWatcherConfig;
    s3: S3WatcherConfig;
    email: EmailWatcherConfig;
    api: APIWatcherConfig;
    googleDrive: GoogleDriveWatcherConfig;
}
export interface ValidatorConfig {
    maxFileSize: number;
    allowedExtensions: string[];
    validateSignature: boolean;
}
export interface AITask {
    documentId: string;
    content: string;
    model: string;
    filePath: string;
    type: string;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=watcher.d.ts.map