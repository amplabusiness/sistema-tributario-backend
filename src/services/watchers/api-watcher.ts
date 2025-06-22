import { EventEmitter } from 'events';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logError } from '../../utils/logger';

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

export class ApiWatcher extends EventEmitter {
  private config: ApiConfig;
  private interval: NodeJS.Timeout | null = null;
  private processedFiles: Set<string> = new Set();
  private downloadDir: string;

  constructor(config: ApiConfig) {
    super();
    this.config = config;
    this.downloadDir = path.join(process.cwd(), 'downloads', 'api');
    this.ensureDownloadDir();
  }

  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  start(): void {
    if (!this.config.enabled || this.config.endpoints.length === 0) {
      logInfo('API Watcher desabilitado ou sem endpoints configurados');
      return;
    }

    logInfo('Iniciando API Watcher', { endpoints: this.config.endpoints });
    
    // Verificação inicial
    this.checkEndpoints();

    // Verificação periódica
    this.interval = setInterval(() => {
      this.checkEndpoints();
    }, this.config.checkInterval);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async checkEndpoints(): Promise<void> {
    for (const endpoint of this.config.endpoints) {
      try {
        await this.checkEndpoint(endpoint);
      } catch (error) {
        logError('Erro ao verificar endpoint', { endpoint, error });
      }
    }
  }

  private async checkEndpoint(endpoint: string): Promise<void> {
    try {
      logInfo('Verificando endpoint', { endpoint });

      const response: AxiosResponse = await axios.get(endpoint, {
        headers: this.config.headers,
        timeout: 30000,
        validateStatus: (status) => status < 500, // Aceita 4xx mas não 5xx
      });

      if (response.status !== 200) {
        logError('Endpoint retornou status não esperado', {
          endpoint,
          status: response.status,
        });
        return;
      }

      // Processar resposta baseado no tipo de endpoint
      await this.processEndpointResponse(endpoint, response);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        logError('Erro HTTP ao verificar endpoint', {
          endpoint,
          status: error.response?.status,
          message: error.message,
        });
      } else {
        logError('Erro inesperado ao verificar endpoint', {
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private async processEndpointResponse(endpoint: string, response: AxiosResponse): Promise<void> {
    const contentType = response.headers['content-type'] || '';

    // Se for um arquivo direto
    if (this.isFileResponse(contentType, response.data)) {
      await this.processFileResponse(endpoint, response);
      return;
    }

    // Se for uma lista de arquivos (JSON)
    if (contentType.includes('application/json')) {
      await this.processFileList(endpoint, response.data);
      return;
    }

    // Se for XML direto
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      await this.processXMLResponse(endpoint, response);
      return;
    }

    logInfo('Tipo de resposta não suportado', {
      endpoint,
      contentType,
      dataType: typeof response.data,
    });
  }

  private isFileResponse(contentType: string, data: any): boolean {
    // Verificar se é um arquivo binário
    if (contentType.includes('application/octet-stream')) {
      return true;
    }

    // Verificar se é um arquivo específico
    const fileTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/xml',
      'application/xml',
    ];

    return fileTypes.some(type => contentType.includes(type));
  }

  private async processFileResponse(endpoint: string, response: AxiosResponse): Promise<void> {
    try {
      const filename = this.extractFilename(endpoint, response.headers);
      const filePath = path.join(this.downloadDir, filename);

      // Verificar se já foi processado
      const fileId = this.generateFileId(endpoint, filename);
      if (this.processedFiles.has(fileId)) {
        return;
      }

      // Salvar arquivo
      fs.writeFileSync(filePath, response.data);

      logInfo('Arquivo baixado via API', {
        endpoint,
        filename,
        filePath,
        size: response.data.length,
      });

      // Marcar como processado
      this.processedFiles.add(fileId);

      // Emitir evento para processamento
      this.emit('file', filePath);

    } catch (error) {
      logError('Erro ao processar arquivo da API', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processFileList(endpoint: string, data: any): Promise<void> {
    try {
      // Verificar se é uma lista de arquivos
      if (!Array.isArray(data) && !data.files) {
        logInfo('Resposta JSON não contém lista de arquivos', { endpoint });
        return;
      }

      const files = Array.isArray(data) ? data : data.files;

      for (const file of files) {
        await this.processFileFromList(endpoint, file);
      }

    } catch (error) {
      logError('Erro ao processar lista de arquivos', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processFileFromList(endpoint: string, file: ApiFile): Promise<void> {
    try {
      // Verificar se já foi processado
      if (this.processedFiles.has(file.id)) {
        return;
      }

      // Verificar se é um arquivo fiscal
      if (!this.isFiscalFile(file.filename)) {
        logInfo('Arquivo não é fiscal, ignorando', { filename: file.filename });
        return;
      }

      // Baixar arquivo
      const response = await axios.get(file.url, {
        headers: this.config.headers,
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      const filePath = path.join(this.downloadDir, file.filename);
      fs.writeFileSync(filePath, response.data);

      logInfo('Arquivo baixado da lista', {
        filename: file.filename,
        filePath,
        size: file.size,
        lastModified: file.lastModified,
      });

      // Marcar como processado
      this.processedFiles.add(file.id);

      // Emitir evento para processamento
      this.emit('file', filePath);

    } catch (error) {
      logError('Erro ao baixar arquivo da lista', {
        filename: file.filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async processXMLResponse(endpoint: string, response: AxiosResponse): Promise<void> {
    try {
      const filename = this.extractFilename(endpoint, response.headers) || `xml-${Date.now()}.xml`;
      const filePath = path.join(this.downloadDir, filename);

      // Verificar se já foi processado
      const fileId = this.generateFileId(endpoint, filename);
      if (this.processedFiles.has(fileId)) {
        return;
      }

      // Verificar se é um XML fiscal
      if (!this.isFiscalXML(response.data)) {
        logInfo('XML não é fiscal, ignorando', { endpoint });
        return;
      }

      // Salvar arquivo
      fs.writeFileSync(filePath, response.data);

      logInfo('XML fiscal baixado via API', {
        endpoint,
        filename,
        filePath,
        size: response.data.length,
      });

      // Marcar como processado
      this.processedFiles.add(fileId);

      // Emitir evento para processamento
      this.emit('file', filePath);

    } catch (error) {
      logError('Erro ao processar XML da API', {
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private extractFilename(endpoint: string, headers: any): string {
    // Tentar extrair do header Content-Disposition
    const contentDisposition = headers['content-disposition'];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        return match[1].replace(/['"]/g, '');
      }
    }

    // Tentar extrair da URL
    const urlPath = new URL(endpoint).pathname;
    const filename = path.basename(urlPath);
    if (filename && filename !== '/') {
      return filename;
    }

    // Nome padrão baseado no timestamp
    return `api-file-${Date.now()}`;
  }

  private generateFileId(endpoint: string, filename: string): string {
    return `${endpoint}-${filename}`;
  }

  private isFiscalFile(filename: string): boolean {
    const fiscalExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt'];
    const ext = path.extname(filename).toLowerCase();
    
    if (!fiscalExtensions.includes(ext)) {
      return false;
    }

    const fiscalKeywords = [
      'nfe', 'nf-e', 'sped', 'icms', 'ecd', 'ecf', 'ciap',
      'fiscal', 'tributario', 'contabil', 'pgdas'
    ];

    const filenameLower = filename.toLowerCase();
    return fiscalKeywords.some(keyword => filenameLower.includes(keyword));
  }

  private isFiscalXML(content: string): boolean {
    const fiscalTags = [
      'nfeProc', 'NFe', 'infNFe', 'CFe', 'spedFiscal',
      'spedContribuicoes', 'spedEcf', 'spedEcd'
    ];

    return fiscalTags.some(tag => content.includes(tag));
  }
} 