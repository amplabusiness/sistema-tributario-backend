import { EventEmitter } from 'events';
import { WatcherServiceConfig } from '../types/watcher';
export declare class FileWatcherService extends EventEmitter {
    private ftpWatcher;
    private s3Watcher;
    private emailWatcher;
    private apiWatcher;
    private googleDriveWatcher;
    private integrityValidator;
    private config;
    constructor(config?: Partial<WatcherServiceConfig>);
    private setupWatchers;
    private setupFTPWatcher;
    private processFile;
}
export declare function startWatchers(config?: WatcherServiceConfig): Promise<void>;
export declare function stopWatchers(): void;
//# sourceMappingURL=watcher.d.ts.map