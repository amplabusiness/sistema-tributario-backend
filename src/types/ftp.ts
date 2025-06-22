import { Client } from 'basic-ftp';

export type FileType = '-' | 'd' | 'l';

export interface FTPClientExtended extends Client {
  on(event: 'ready' | 'error', callback: (error?: Error) => void): void;
}

export interface FTPFileInfo {
  name: string;
  size: number;
  modifiedAt: Date;
  type: FileType;
}
