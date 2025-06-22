// Serviço de watcher automático para ingestão de arquivos fiscais
// Monitora pastas locais, detecta novos arquivos e enfileira para processamento

import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { addIATask } from './queue';
import { logInfo, logError } from '../utils/logger';
import { EmailWatcher } from './watchers/email-watcher';
import { ApiWatcher } from './watchers/api-watcher';
import { GoogleDriveWatcher } from './watchers/google-drive-watcher';
import { S3Watcher } from './watchers/s3-watcher';
import { FTPWatcher } from './watchers/ftp-watcher';
import { IntegrityValidator } from './validators/integrity-validator';
import { WatcherServiceConfig, AITask, ValidatorConfig } from '../types/watcher';

// Configurações de monitoramento
const DEFAULT_CONFIG: WatcherServiceConfig = {
  local: {
    enabled: true,
    paths: process.env.WATCH_LOCAL_PATHS?.split(',') || [],
    checkInterval: parseInt(process.env.LOCAL_CHECK_INTERVAL || '5000'),
  },
  ftp: {
    enabled: process.env.FTP_WATCHER_ENABLED === 'true',
    host: process.env.FTP_HOST || 'localhost',
    port: parseInt(process.env.FTP_PORT || '21'),
    username: process.env.FTP_USERNAME || '',
    password: process.env.FTP_PASSWORD || '',
    directories: process.env.FTP_DIRECTORIES?.split(',') || [],
    watchInterval: parseInt(process.env.FTP_CHECK_INTERVAL || '30000'),
  },
  s3: {
    enabled: process.env.S3_WATCHER_ENABLED === 'true',
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    prefix: process.env.S3_PREFIX || '',
    checkInterval: parseInt(process.env.S3_CHECK_INTERVAL || '60000'),
  },
  email: {
    enabled: process.env.EMAIL_WATCHER_ENABLED === 'true',
    host: process.env.EMAIL_HOST || 'imap.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '993'),
    username: process.env.EMAIL_USERNAME || '',
    password: process.env.EMAIL_PASSWORD || '',
    folders: process.env.EMAIL_FOLDERS?.split(',') || ['INBOX'],
    checkInterval: parseInt(process.env.EMAIL_CHECK_INTERVAL || '30000'),
  },
  api: {
    enabled: process.env.API_WATCHER_ENABLED === 'true',
    endpoints: process.env.API_ENDPOINTS?.split(',') || [],
    checkInterval: parseInt(process.env.API_CHECK_INTERVAL || '60000'),
    headers: {}, // TODO: Load from config
  },
  googleDrive: {
    enabled: process.env.GOOGLE_DRIVE_WATCHER_ENABLED === 'true',
    credentials: process.env.GOOGLE_DRIVE_CREDENTIALS || '',
    folderIds: process.env.GOOGLE_DRIVE_FOLDER_IDS?.split(',') || [],
    checkInterval: parseInt(process.env.GOOGLE_DRIVE_CHECK_INTERVAL || '60000'),
  }
};

const WATCH_CONFIG = DEFAULT_CONFIG;

export class FileWatcherService extends EventEmitter {
  private ftpWatcher: FTPWatcher;
  private s3Watcher: S3Watcher;
  private emailWatcher: EmailWatcher;
  private apiWatcher: ApiWatcher;
  private googleDriveWatcher: GoogleDriveWatcher;
  private integrityValidator: IntegrityValidator;
  private config: WatcherServiceConfig;

  constructor(config: Partial<WatcherServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize watchers with configuration
    this.ftpWatcher = new FTPWatcher(this.config.ftp);
    this.s3Watcher = new S3Watcher(this.config.s3);
    this.emailWatcher = new EmailWatcher(this.config.email);
    this.apiWatcher = new ApiWatcher(this.config.api);
    this.googleDriveWatcher = new GoogleDriveWatcher(this.config.googleDrive);
    
    const validatorConfig: ValidatorConfig = {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
      allowedExtensions: ['.xml', '.pdf', '.txt', '.csv', '.xlsx'],
      validateSignature: process.env.VALIDATE_SIGNATURE === 'true',
    };
    this.integrityValidator = new IntegrityValidator(validatorConfig);

    // Setup event listeners for all watchers
    this.setupWatchers();
  }

  private setupWatchers() {
    if (this.config.ftp.enabled) {
      this.setupFTPWatcher();
    }
    // ... setup other watchers ...
  }

  private setupFTPWatcher() {
    this.ftpWatcher.on('file', async (filePath: string) => {
      logInfo('FTP watcher detected new file', { filePath });
      await this.processFile(filePath);
    });

    this.ftpWatcher.on('error', (error: Error) => {
      logError('FTP watcher error', error);
    });
  }

  private async processFile(filePath: string) {
    try {
      const fileValidation = await this.integrityValidator.validateFile(filePath);
      
      if (fileValidation.isValid) {        const task: AITask = {
          documentId: path.basename(filePath),
          content: await fs.promises.readFile(filePath, 'utf8'),
          model: 'DOCUMENT_PROCESSOR',
          filePath,
          type: 'document-analysis',
          metadata: {
            source: 'ftp',
            validationResult: fileValidation,
          }
        };
        
        await addIATask(task);
        logInfo('File enqueued for processing', { filePath });
      } else {
        logError('File validation failed', { 
          filePath, 
          errors: fileValidation.errors 
        });
      }
    } catch (error: any) {
      logError('Error processing file', { 
        filePath, 
        error: error.message 
      });
    }
  }

  // ... rest of class implementation ...
}

// Watcher instances
let emailWatcher: EmailWatcher | null = null;
let apiWatcher: ApiWatcher | null = null;
let googleDriveWatcher: GoogleDriveWatcher | null = null;
let s3Watcher: S3Watcher | null = null;
let ftpWatcher: FTPWatcher | null = null;

// File validation and processing function
async function validateAndProcessFile(filePath: string, source: string): Promise<void> {
  try {
    const validator = new IntegrityValidator({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      allowedExtensions: ['.xml', '.pdf', '.xlsx', '.csv', '.json'],
      validateSignature: false
    });

    const validationResult = await validator.validateFile(filePath);

    if (!validationResult.isValid) {
      logError('Arquivo inválido', { filePath, errors: validationResult.errors });
      return;
    }

    // Queue for AI processing
    const task: AITask = {
      documentId: path.basename(filePath), // Temporary ID until document is created
      content: await fs.promises.readFile(filePath, 'utf8'),
      model: 'DOCUMENT_PROCESSOR',
      filePath,
      type: path.extname(filePath).toLowerCase(),
      metadata: {
        source,
        validationResult
      }
    };

    await addIATask(task);
    logInfo('Arquivo enfileirado para processamento', { filePath, source });
  } catch (error) {
    logError('Erro ao validar/processar arquivo', { filePath, error });
  }
}

// Monitor local directories
export async function startWatchers(config: WatcherServiceConfig = DEFAULT_CONFIG): Promise<void> {
  logInfo('Iniciando sistema de monitoramento completo', config);

  // Local file watching with chokidar
  const localWatcher = chokidar.watch(config.local.paths, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  localWatcher.on('add', async (filePath) => {
    logInfo('Novo arquivo detectado', { filePath, source: 'local' });
    await validateAndProcessFile(filePath, 'local');
  });

  // Email watcher
  if (config.email.enabled && config.email.username && config.email.password) {
    try {
      emailWatcher = new EmailWatcher({
        ...config.email,
        username: config.email.username,
        password: config.email.password,
      });

      emailWatcher.on('file', async (filePath: string) => {
        await validateAndProcessFile(filePath, 'email');
      });

      emailWatcher.start();
      logInfo('Watcher de e-mail iniciado', { config: config.email });
    } catch (error) {
      logError('Erro ao iniciar watcher de e-mail', error);
    }
  }

  // API watcher
  if (config.api.enabled && config.api.endpoints.length > 0) {
    try {
      apiWatcher = new ApiWatcher(config.api);
      apiWatcher.on('file', async (filePath: string) => {
        await validateAndProcessFile(filePath, 'api');
      });

      apiWatcher.start();
      logInfo('Watcher de API iniciado', { endpoints: config.api.endpoints });
    } catch (error) {
      logError('Erro ao iniciar watcher de API', error);
    }
  }

  // Google Drive watcher
  if (config.googleDrive.enabled && config.googleDrive.credentials) {
    try {
      googleDriveWatcher = new GoogleDriveWatcher({
        ...config.googleDrive,
        credentials: config.googleDrive.credentials,
      });

      googleDriveWatcher.on('file', async (filePath: string) => {
        await validateAndProcessFile(filePath, 'google-drive');
      });

      googleDriveWatcher.start();
      logInfo('Watcher do Google Drive iniciado', { folderIds: config.googleDrive.folderIds });
    } catch (error) {
      logError('Erro ao iniciar watcher do Google Drive', error);
    }
  }

  // S3 watcher
  if (config.s3.enabled && config.s3.accessKeyId && config.s3.secretAccessKey && config.s3.bucket) {
    try {
      s3Watcher = new S3Watcher({
        ...config.s3,
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
        bucket: config.s3.bucket,
      });

      s3Watcher.on('file', async (filePath: string) => {
        await validateAndProcessFile(filePath, 's3');
      });

      s3Watcher.start();
      logInfo('Watcher do S3 iniciado', { bucket: config.s3.bucket, prefix: config.s3.prefix });
    } catch (error) {
      logError('Erro ao iniciar watcher do S3', error);
    }
  }

  // FTP watcher
  if (config.ftp.enabled && config.ftp.host && config.ftp.username) {
    try {
      ftpWatcher = new FTPWatcher({
        ...config.ftp,
        host: config.ftp.host,
        username: config.ftp.username,
        password: config.ftp.password,
      });

      ftpWatcher.on('file', async (filePath: string) => {
        await validateAndProcessFile(filePath, 'ftp');
      });

      ftpWatcher.start();
      logInfo('Watcher do FTP iniciado', { host: config.ftp.host, directories: config.ftp.directories });
    } catch (error) {
      logError('Erro ao iniciar watcher do FTP', error);
    }
  }

  // Log status dos watchers
  logInfo('Status dos watchers', {
    localPaths: config.local.paths,
    emailEnabled: config.email.enabled,
    apiEnabled: config.api.enabled,
    googleDriveEnabled: config.googleDrive.enabled,
    s3Enabled: config.s3.enabled,
    ftpEnabled: config.ftp.enabled,
  });
}

// Stop all watchers
export function stopWatchers(): void {
  if (emailWatcher) {
    emailWatcher.stop();
  }
  if (apiWatcher) {
    apiWatcher.stop();
  }
  if (googleDriveWatcher) {
    googleDriveWatcher.stop();
  }
  if (s3Watcher) {
    s3Watcher.stop();
  }
  if (ftpWatcher) {
    ftpWatcher.stop();
  }
  logInfo('Todos os watchers foram parados');
}