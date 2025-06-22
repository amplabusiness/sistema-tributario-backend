import { EventEmitter } from 'events';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logError } from '../../utils/logger';

export interface GoogleDriveConfig {
  enabled: boolean;
  credentials: string;
  folderIds: string[];
  checkInterval: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  parents: string[];
}

export class GoogleDriveWatcher extends EventEmitter {
  private config: GoogleDriveConfig;
  private drive: any;
  private interval: NodeJS.Timeout | null = null;
  private processedFiles: Set<string> = new Set();
  private downloadDir: string;

  constructor(config: GoogleDriveConfig) {
    super();
    this.config = config;
    this.downloadDir = path.join(process.cwd(), 'downloads', 'google-drive');
    this.ensureDownloadDir();
    this.setupGoogleDrive();
  }

  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  private setupGoogleDrive(): void {
    try {
      const credentials = JSON.parse(this.config.credentials);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      this.drive = google.drive({ version: 'v3', auth });

      logInfo('Google Drive API configurada com sucesso');
    } catch (error) {
      logError('Erro ao configurar Google Drive API', { error });
    }
  }

  start(): void {
    if (!this.config.enabled || !this.drive) {
      logInfo('Google Drive Watcher desabilitado ou não configurado');
      return;
    }

    logInfo('Iniciando Google Drive Watcher', { folderIds: this.config.folderIds });
    
    // Verificação inicial
    this.checkFolders();

    // Verificação periódica
    this.interval = setInterval(() => {
      this.checkFolders();
    }, this.config.checkInterval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkFolders(): Promise<void> {
    for (const folderId of this.config.folderIds) {
      try {
        await this.checkFolder(folderId);
      } catch (error) {
        logError('Erro ao verificar pasta do Google Drive', { folderId, error });
      }
    }
  }

  private async checkFolder(folderId: string): Promise<void> {
    try {
      logInfo('Verificando pasta do Google Drive', { folderId });

      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 100,
      });

      const files = response.data.files || [];

      if (files.length === 0) {
        logInfo('Nenhum arquivo encontrado na pasta', { folderId });
        return;
      }

      logInfo('Arquivos encontrados na pasta', { folderId, count: files.length });

      // Processar apenas arquivos novos ou modificados
      for (const file of files) {
        await this.processFile(file);
      }

    } catch (error) {
      logError('Erro ao listar arquivos da pasta', {
        folderId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processFile(file: DriveFile): Promise<void> {
    try {
      // Verificar se já foi processado
      if (this.processedFiles.has(file.id)) {
        return;
      }

      // Verificar se é um arquivo fiscal
      if (!this.isFiscalFile(file)) {
        logInfo('Arquivo não é fiscal, ignorando', { name: file.name });
        return;
      }

      // Verificar se é um arquivo que pode ser baixado
      if (!this.canDownloadFile(file)) {
        logInfo('Arquivo não pode ser baixado', { name: file.name, mimeType: file.mimeType });
        return;
      }

      // Baixar arquivo
      await this.downloadFile(file);

      // Marcar como processado
      this.processedFiles.add(file.id);

      // Manter apenas os últimos 1000 arquivos processados
      if (this.processedFiles.size > 1000) {
        const filesArray = Array.from(this.processedFiles);
        this.processedFiles = new Set(filesArray.slice(-500));
      }

    } catch (error) {
      logError('Erro ao processar arquivo do Google Drive', {
        fileId: file.id,
        name: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private isFiscalFile(file: DriveFile): boolean {
    const name = file.name.toLowerCase();

    // Verificar extensão
    const fiscalExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt'];
    const hasFiscalExtension = fiscalExtensions.some(ext => name.endsWith(ext));

    if (!hasFiscalExtension) {
      return false;
    }

    // Verificar palavras-chave fiscais
    const fiscalKeywords = [
      'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
      'fiscal', 'tributario', 'contabil', 'ecd', 'ecf', 'ciap',
      'pgdas', 'simples nacional', 'sefaz', 'receita federal'
    ];

    return fiscalKeywords.some(keyword => name.includes(keyword));
  }

  private canDownloadFile(file: DriveFile): boolean {
    // Verificar se é um arquivo que pode ser baixado
    const downloadableTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/xml',
      'application/xml',
      'text/plain',
      'application/zip',
      'application/octet-stream'
    ];

    return downloadableTypes.includes(file.mimeType);
  }

  private async downloadFile(file: DriveFile): Promise<void> {
    try {
      logInfo('Baixando arquivo do Google Drive', {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      });

      const response = await this.drive.files.get({
        fileId: file.id,
        alt: 'media',
      }, {
        responseType: 'arraybuffer',
      });

      const filePath = path.join(this.downloadDir, file.name);

      // Salvar arquivo
      fs.writeFileSync(filePath, response.data);

      logInfo('Arquivo baixado com sucesso', {
        name: file.name,
        filePath,
        size: file.size,
      });

      // Emitir evento para processamento
      this.emit('file', filePath);

    } catch (error) {
      logError('Erro ao baixar arquivo do Google Drive', {
        fileId: file.id,
        name: file.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Método para buscar arquivos em subpastas recursivamente
  async searchFiscalFiles(query: string = ''): Promise<DriveFile[]> {
    try {
      const fiscalQuery = query || 'fiscal OR tributario OR contabil OR nfe OR sped';
      
      const response = await this.drive.files.list({
        q: `(name contains 'fiscal' OR name contains 'tributario' OR name contains 'contabil' OR name contains 'nfe' OR name contains 'sped') and trashed=false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 100,
      });

      return response.data.files || [];
    } catch (error) {
      logError('Erro ao buscar arquivos fiscais', { error });
      return [];
    }
  }

  // Método para monitorar mudanças em tempo real (webhook)
  async setupWebhook(webhookUrl: string): Promise<void> {
    try {
      // Configurar webhook para mudanças no Google Drive
      const response = await this.drive.changes.watch({
        requestBody: {
          id: `fiscal-watcher-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          token: 'fiscal-token',
        },
      });

      logInfo('Webhook configurado para Google Drive', { webhookUrl });
    } catch (error) {
      logError('Erro ao configurar webhook do Google Drive', { error });
    }
  }
} 