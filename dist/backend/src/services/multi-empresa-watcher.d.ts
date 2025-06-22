export interface WatcherConfig {
    basePath: string;
    supportedExtensions: string[];
    maxFileSize: number;
    scanInterval: number;
    empresaFolders: string[];
    yearFolders: string[];
}
export interface FileInfo {
    path: string;
    filename: string;
    size: number;
    extension: string;
    empresaId?: string;
    ano?: number;
    mes?: number;
    lastModified: Date;
    tipo?: 'SPED' | 'PROTEGE' | 'OUTROS';
}
export declare class MultiEmpresaWatcher {
    private config;
    private isRunning;
    private scanInterval;
    private processedFiles;
    constructor(config: WatcherConfig);
    start(): Promise<void>;
    stop(): void;
    private scanDirectory;
    private discoverFiles;
    private analyzeFile;
    private determinarTipoArquivo;
    private extractPathInfo;
    private processFile;
    private processProtegeFile;
    private processGenericFile;
    private isSpedFile;
    private processSpedFile;
    private getMimeType;
    getStats(): {
        isRunning: boolean;
        processedFiles: number;
        config: WatcherConfig;
    };
    clearProcessedFiles(): void;
}
//# sourceMappingURL=multi-empresa-watcher.d.ts.map