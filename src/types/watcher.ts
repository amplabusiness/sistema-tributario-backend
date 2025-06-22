// Basic watcher configuration interface
export interface WatcherConfig {
  enabled: boolean;
  checkInterval?: number;  // Default checkInterval
  watchInterval?: number;  // For legacy watchers
}

// File paths configuration for local watching
export interface LocalWatcherConfig {
  enabled: boolean;
  paths: string[];
  checkInterval: number;
}

// FTP watcher configuration
export interface FTPWatcherConfig extends WatcherConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  directories: string[];
  watchInterval: number;  // Required by FTPWatcher
}

// S3 watcher configuration
export interface S3WatcherConfig extends WatcherConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  checkInterval: number;  // Required by S3Watcher
}

// Email watcher configuration
export interface EmailWatcherConfig extends WatcherConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  folders: string[];
  checkInterval: number;  // Use checkInterval for newer watchers
}

// API watcher configuration
export interface APIWatcherConfig extends WatcherConfig {
  endpoints: string[];
  headers: Record<string, string>;
  checkInterval: number;  // Use checkInterval for newer watchers
}

// Google Drive watcher configuration
export interface GoogleDriveWatcherConfig extends WatcherConfig {
  credentials: string;
  folderIds: string[];  // Required by GoogleDriveConfig
  checkInterval: number;  // Use checkInterval for newer watchers
}

// Main watcher service configuration
export interface WatcherServiceConfig {
  local: LocalWatcherConfig;
  ftp: FTPWatcherConfig;
  s3: S3WatcherConfig;
  email: EmailWatcherConfig;
  api: APIWatcherConfig;
  googleDrive: GoogleDriveWatcherConfig;
}

// Validator configuration
export interface ValidatorConfig {
  maxFileSize: number;
  allowedExtensions: string[];
  validateSignature: boolean;
}

// AI Task interface
export interface AITask {
  documentId: string;  // Required by AIJob
  content: string;     // Required by AIJob
  model: string;       // Required by AIJob
  filePath: string;
  type: string;
  metadata?: Record<string, any>;
}