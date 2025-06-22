import { EventEmitter } from 'events';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logError } from '../../utils/logger';

export interface S3Config {
  enabled: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  prefix: string;
  checkInterval: number;
}

export interface S3File {
  key: string;
  size: number;
  lastModified: Date;
  etag: string;
}

export interface S3EventMap {
  'file': (filePath: string) => void;
  'error': (error: Error) => void;
}

export class S3Watcher extends EventEmitter {
  private config: S3Config;
  private s3Client!: S3Client;
  private interval: NodeJS.Timeout | null = null;
  private processedFiles: Set<string> = new Set();
  private downloadDir: string;

  constructor(config: S3Config) {
    super();
    this.config = config;
    this.downloadDir = path.join(process.cwd(), 'downloads', 's3');
    this.ensureDownloadDir();
    this.setupS3Client();
  }

  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  private setupS3Client(): void {
    try {
      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });

      logInfo('Cliente S3 configurado com sucesso', {
        region: this.config.region,
        bucket: this.config.bucket,
      });
    } catch (error) {
      logError('Erro ao configurar cliente S3', { error });
    }
  }

  start(): void {
    if (!this.config.enabled || !this.s3Client) {
      logInfo('S3 Watcher desabilitado ou não configurado');
      return;
    }

    logInfo('Iniciando S3 Watcher', {
      bucket: this.config.bucket,
      prefix: this.config.prefix,
    });
    
    // Verificação inicial
    this.checkBucket();

    // Verificação periódica
    this.interval = setInterval(() => {
      this.checkBucket();
    }, this.config.checkInterval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkBucket(): Promise<void> {
    try {
      logInfo('Verificando bucket S3', {
        bucket: this.config.bucket,
        prefix: this.config.prefix,
      });

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: this.config.prefix,
        MaxKeys: 100,
      });

      const response = await this.s3Client.send(command);
      const files = response.Contents || [];

      if (files.length === 0) {
        logInfo('Nenhum arquivo encontrado no bucket', {
          bucket: this.config.bucket,
          prefix: this.config.prefix,
        });
        return;
      }

      logInfo('Arquivos encontrados no bucket', {
        bucket: this.config.bucket,
        count: files.length,
      });

      // Processar arquivos novos ou modificados
      for (const file of files) {
        if (file.Key) {
          await this.processFile({
            key: file.Key,
            size: file.Size || 0,
            lastModified: file.LastModified || new Date(),
            etag: file.ETag || '',
          });
        }
      }

    } catch (error) {
      logError('Erro ao verificar bucket S3', {
        bucket: this.config.bucket,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processFile(file: S3File): Promise<void> {
    try {
      // Verificar se já foi processado
      const fileId = `${file.key}-${file.etag}`;
      if (this.processedFiles.has(fileId)) {
        return;
      }

      // Verificar se é um arquivo fiscal
      if (!this.isFiscalFile(file.key)) {
        logInfo('Arquivo não é fiscal, ignorando', { key: file.key });
        return;
      }

      // Verificar se o arquivo não está vazio
      if (file.size === 0) {
        logInfo('Arquivo vazio, ignorando', { key: file.key });
        return;
      }

      // Baixar arquivo
      await this.downloadFile(file);

      // Marcar como processado
      this.processedFiles.add(fileId);

      // Manter apenas os últimos 1000 arquivos processados
      if (this.processedFiles.size > 1000) {
        const filesArray = Array.from(this.processedFiles);
        this.processedFiles = new Set(filesArray.slice(-500));
      }

    } catch (error) {
      logError('Erro ao processar arquivo do S3', {
        key: file.key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private isFiscalFile(key: string): boolean {
    const keyLower = key.toLowerCase();

    // Verificar extensão
    const fiscalExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt', '.zip'];
    const hasFiscalExtension = fiscalExtensions.some(ext => keyLower.endsWith(ext));

    if (!hasFiscalExtension) {
      return false;
    }

    // Verificar palavras-chave fiscais
    const fiscalKeywords = [
      'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
      'fiscal', 'tributario', 'contabil', 'ecd', 'ecf', 'ciap',
      'pgdas', 'simples nacional', 'sefaz', 'receita federal'
    ];

    return fiscalKeywords.some(keyword => keyLower.includes(keyword));
  }

  private async downloadFile(file: S3File): Promise<void> {
    try {
      logInfo('Baixando arquivo do S3', {
        key: file.key,
        size: file.size,
        lastModified: file.lastModified,
      });

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: file.key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Corpo da resposta vazio');
      }

      // Converter stream para buffer com tipagem apropriada
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      
      try {
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
      } catch (streamError) {
        throw new Error(`Erro ao ler stream: ${streamError instanceof Error ? streamError.message : 'Unknown stream error'}`);
      }
      
      const buffer = Buffer.concat(chunks);

      // Criar nome do arquivo local
      const filename = path.basename(file.key);
      const filePath = path.join(this.downloadDir, filename);

      // Salvar arquivo
      fs.writeFileSync(filePath, buffer);

      logInfo('Arquivo baixado com sucesso do S3', {
        key: file.key,
        filename,
        filePath,
        size: file.size,
      });

      // Emitir evento para processamento
      this.emit('file', filePath);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Erro ao baixar arquivo do S3', {
        key: file.key,
        error: errorMessage,
      });
      this.emit('error', new Error(`Erro ao baixar arquivo ${file.key}: ${errorMessage}`));
    }
  }

  // Sobrescrever método emit para tipagem correta
  public emit<K extends keyof S3EventMap>(
    event: K,
    ...args: Parameters<S3EventMap[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  // Sobrescrever método on para tipagem correta
  public on<K extends keyof S3EventMap>(
    event: K,
    listener: S3EventMap[K]
  ): this {
    return super.on(event, listener as any);
  }

  // Método para buscar arquivos por prefixo específico
  async searchFiles(prefix: string): Promise<S3File[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: 1000,
      });

      const response = await this.s3Client.send(command);
      const files: S3File[] = [];

      if (response.Contents) {
        for (const file of response.Contents) {
          if (file.Key) {
            files.push({
              key: file.Key,
              size: file.Size || 0,
              lastModified: file.LastModified || new Date(),
              etag: file.ETag || '',
            });
          }
        }
      }

      return files;
    } catch (error) {
      logError('Erro ao buscar arquivos no S3', { prefix, error });
      return [];
    }
  }

  // Método para monitorar mudanças em tempo real (S3 Event Notifications)
  async setupEventNotifications(topicArn: string): Promise<void> {
    try {
      // Configurar notificações de eventos do S3
      // Isso requer configuracao no console AWS ou via AWS SDK
      logInfo('Configurando notificações de eventos do S3', { topicArn });
      
      // Implementar configuracao de S3 Event Notifications
      // Esta é uma implementacao simplificada
      
    } catch (error) {
      logError('Erro ao configurar notificações do S3', { error });
    }
  }

  // Método para listar todos os arquivos fiscais no bucket
  async listAllFiscalFiles(): Promise<S3File[]> {
    try {
      const allFiles: S3File[] = [];
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: this.config.prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        });

        const response = await this.s3Client.send(command);

        if (response.Contents) {
          for (const file of response.Contents) {
            if (file.Key && this.isFiscalFile(file.Key)) {
              allFiles.push({
                key: file.Key,
                size: file.Size || 0,
                lastModified: file.LastModified || new Date(),
                etag: file.ETag || '',
              });
            }
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      logInfo('Listagem completa de arquivos fiscais', {
        bucket: this.config.bucket,
        count: allFiles.length,
      });

      return allFiles;
    } catch (error) {
      logError('Erro ao listar todos os arquivos fiscais', { error });
      return [];
    }
  }
}