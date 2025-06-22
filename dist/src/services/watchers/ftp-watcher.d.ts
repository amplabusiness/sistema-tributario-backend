import { EventEmitter } from 'events';
export interface WatcherFileInfo {
    name: string;
    path: string;
    size: number;
    modifiedDate: Date;
    type: 'file' | 'directory';
}
export interface FTPConfig {
    host: string;
    port?: number;
    username: string;
    password: string;
    directories: string[];
    watchInterval: number;
    secure?: boolean;
}
export interface FTPEventMap {
    'ready': () => void;
    'file': (filePath: string) => void;
    'error': (error: Error) => void;
    'end': () => void;
    'file-detected': (fileInfo: WatcherFileInfo) => void;
    'file-processed': (fileInfo: WatcherFileInfo) => void;
    'reconnect': () => void;
    'connect': () => void;
    'disconnect': () => void;
}
export declare class FTPWatcher extends EventEmitter {
    private client;
    private config;
    private isWatching;
    private watchTimeout?;
    constructor(config: FTPConfig);
    on<K extends keyof FTPEventMap>(event: K, listener: FTPEventMap[K]): this;
    emit<K extends keyof FTPEventMap>(event: K, ...args: Parameters<FTPEventMap[K]>): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    private connect;
    private startWatching;
    private watchDirectories;
    private checkDirectory;
    private processFile;
    private convertToWatcherFileInfo;
    private handleWatchError;
}
//# sourceMappingURL=ftp-watcher.d.ts.map