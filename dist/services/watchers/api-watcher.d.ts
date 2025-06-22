import { EventEmitter } from 'events';
export interface ApiConfig {
    enabled: boolean;
    endpoints: string[];
    checkInterval: number;
    headers: Record<string, string>;
}
export interface ApiFile {
    id: string;
    filename: string;
    url: string;
    size: number;
    lastModified: string;
    checksum?: string;
}
export declare class ApiWatcher extends EventEmitter {
    private config;
    private interval;
    private processedFiles;
    private downloadDir;
    constructor(config: ApiConfig);
    private ensureDownloadDir;
    start(): void;
    stop(): void;
    private checkEndpoints;
    private checkEndpoint;
    private processEndpointResponse;
    private isFileResponse;
    private processFileResponse;
    private processFileList;
    private processFileFromList;
    private processXMLResponse;
    private extractFilename;
    private generateFileId;
    private isFiscalFile;
    private isFiscalXML;
}
//# sourceMappingURL=api-watcher.d.ts.map