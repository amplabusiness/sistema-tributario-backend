import { EventEmitter } from 'events';
import { Client, FileInfo, FileType } from 'basic-ftp';

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

export class FTPWatcher extends EventEmitter {
  private client: Client;
  private config: FTPConfig;
  private isWatching: boolean;
  private watchTimeout?: NodeJS.Timeout;

  constructor(config: FTPConfig) {
    super();
    this.config = config;
    this.client = new Client();
    this.isWatching = false;
  }

  // Type-safe event emitter
  on<K extends keyof FTPEventMap>(event: K, listener: FTPEventMap[K]): this {
    super.on(event, listener);
    return this;
  }

  emit<K extends keyof FTPEventMap>(event: K, ...args: Parameters<FTPEventMap[K]>): boolean {
    return super.emit(event, ...args);
  }

  async start(): Promise<void> {
    try {
      await this.connect();
      this.startWatching();
    } catch (error: any) {
      this.emit('error', new Error(`Failed to start FTP watcher: ${error.message}`));
    }
  }

  async stop(): Promise<void> {
    this.isWatching = false;
    if (this.watchTimeout) {
      clearTimeout(this.watchTimeout);
    }
    await this.client.close();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.access({
        host: this.config.host,
        port: this.config.port || 21,
        user: this.config.username,
        password: this.config.password,
        secure: this.config.secure
      });
      this.emit('connect');
    } catch (error: any) {
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }

  private startWatching(): void {
    if (!this.isWatching) {
      this.isWatching = true;
      this.watchDirectories();
    }
  }

  private async watchDirectories(): Promise<void> {
    while (this.isWatching) {
      try {
        for (const directory of this.config.directories) {
          await this.checkDirectory(directory);
        }
        await new Promise(resolve => setTimeout(resolve, this.config.watchInterval));
      } catch (error: any) {
        this.emit('error', new Error(`Error watching directories: ${error.message}`));
        await this.handleWatchError();
      }
    }
  }

  private async checkDirectory(directory: string): Promise<void> {
    try {
      const files = await this.client.list(directory);
      
      for (const file of files) {
        if (file.type === FileType.File) {
          const fileInfo = this.convertToWatcherFileInfo(file, directory);
          this.emit('file-detected', fileInfo);
          await this.processFile(directory, fileInfo);
          this.emit('file-processed', fileInfo);
        }
      }
    } catch (error: any) {
      throw new Error(`Error checking directory ${directory}: ${error.message}`);
    }
  }

  private async processFile(directory: string, fileInfo: WatcherFileInfo): Promise<void> {
    try {
      this.emit('file', fileInfo.path);
    } catch (error: any) {
      this.emit('error', new Error(`Error processing file ${fileInfo.name}: ${error.message}`));
    }
  }

  private convertToWatcherFileInfo(file: FileInfo, directory: string): WatcherFileInfo {
    return {
      name: file.name,
      path: `${directory}/${file.name}`,
      size: file.size,
      modifiedDate: file.modifiedAt || new Date(),
      type: file.type === FileType.Directory ? 'directory' : 'file'
    };
  }

  private async handleWatchError(): Promise<void> {
    this.emit('disconnect');
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      await this.connect();
      this.emit('reconnect');
    } catch (error: any) {
      this.emit('error', new Error(`Reconnection failed: ${error.message}`));
    }
  }
}