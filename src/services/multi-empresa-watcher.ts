import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { EmpresaService, EmpresaData } from './empresa-service';
import { logInfo, logError } from '../utils/logger';
import prisma from '../utils/prisma';
import { DocumentProcessor } from './document-processor';
import { ProtegeService } from './protege-service';

export interface WatcherConfig {
  basePath: string;
  supportedExtensions: string[];
  maxFileSize: number; // em bytes
  scanInterval: number; // em milissegundos
  empresaFolders: string[]; // padrões de pastas para identificar empresas
  yearFolders: string[]; // padrões de pastas para identificar anos
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

export class MultiEmpresaWatcher {
  private config: WatcherConfig;
  private isRunning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private processedFiles: Set<string> = new Set();

  constructor(config: WatcherConfig) {
    this.config = {
      basePath: config.basePath,
      supportedExtensions: config.supportedExtensions || ['.xml', '.txt', '.sped', '.ecd', '.ecf', '.pdf'],
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB
      scanInterval: config.scanInterval || 30000, // 30 segundos
      empresaFolders: config.empresaFolders || ['empresa', 'company', 'cnpj'],
      yearFolders: config.yearFolders || ['2024', '2025', '2023', '2022'],
    };
  }

  /**
   * Inicia o monitoramento multiempresa
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logInfo('MultiEmpresaWatcher já está em execução');
      return;
    }

    this.isRunning = true;
    logInfo('Iniciando MultiEmpresaWatcher', {
      basePath: this.config.basePath,
      scanInterval: this.config.scanInterval,
    });

    // Primeira varredura
    await this.scanDirectory();

    // Configura varredura periódica
    this.scanInterval = setInterval(async () => {
      await this.scanDirectory();
    }, this.config.scanInterval);
  }

  /**
   * Para o monitoramento
   */
  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isRunning = false;
    logInfo('MultiEmpresaWatcher parado');
  }

  /**
   * Varre o diretório em busca de novos arquivos
   */
  private async scanDirectory(): Promise<void> {
    try {
      if (!existsSync(this.config.basePath)) {
        logInfo('Diretório base não existe', { basePath: this.config.basePath });
        return;
      }

      const files = await this.discoverFiles(this.config.basePath);
      
      for (const file of files) {
        if (!this.processedFiles.has(file.path)) {
          await this.processFile(file);
          this.processedFiles.add(file.path);
        }
      }

      logInfo('Varredura de diretório concluída', {
        totalFiles: files.length,
        newFiles: files.filter(f => !this.processedFiles.has(f.path)).length,
      });
    } catch (error) {
      logError('Erro durante varredura de diretório', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Descobre arquivos recursivamente no diretório
   */
  private async discoverFiles(dirPath: string): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    try {
      const items = readdirSync(dirPath);

      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          // Recursão para subdiretórios
          const subFiles = await this.discoverFiles(fullPath);
          files.push(...subFiles);
        } else if (stats.isFile()) {
          const extension = extname(item).toLowerCase();
          
          if (this.config.supportedExtensions.includes(extension)) {
            const fileInfo = await this.analyzeFile(fullPath, stats);
            if (fileInfo) {
              files.push(fileInfo);
            }
          }
        }
      }
    } catch (error) {
      logError('Erro ao descobrir arquivos', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dirPath,
      });
    }

    return files;
  }

  /**
   * Analisa um arquivo para extrair informações de empresa e período
   */
  private async analyzeFile(filePath: string, stats: any): Promise<FileInfo | null> {
    try {
      const filename = basename(filePath);
      const extension = extname(filename).toLowerCase();
      
      // Verifica tamanho do arquivo
      if (stats.size > this.config.maxFileSize) {
        logInfo('Arquivo muito grande, ignorando', {
          filePath,
          size: stats.size,
          maxSize: this.config.maxFileSize,
        });
        return null;
      }

      // Extrai informações do caminho do arquivo
      const pathInfo = this.extractPathInfo(filePath);
      
      // Tenta extrair dados da empresa do conteúdo do arquivo
      let empresaData: EmpresaData | null = null;
      try {
        const fileContent = readFileSync(filePath, 'utf-8');
        empresaData = await EmpresaService.extractEmpresaFromFile(filePath, fileContent);
      } catch (error) {
        logInfo('Não foi possível ler o arquivo para extrair dados da empresa', {
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      const fileInfo: FileInfo = {
        path: filePath,
        filename,
        size: stats.size,
        extension,
        ano: pathInfo.ano,
        mes: pathInfo.mes,
        lastModified: stats.mtime,
        tipo: this.determinarTipoArquivo(filename, extension)
      };

      // Se encontrou dados da empresa, cria/atualiza no banco
      if (empresaData) {
        const empresa = await EmpresaService.createOrUpdateEmpresa(empresaData);
        fileInfo.empresaId = empresa.id;
      }

      return fileInfo;
    } catch (error) {
      logError('Erro ao analisar arquivo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      return null;
    }
  }

  /**
   * Determina o tipo do arquivo baseado no nome e extensão
   */
  private determinarTipoArquivo(filename: string, extension: string): 'SPED' | 'PROTEGE' | 'OUTROS' {
    const filenameLower = filename.toLowerCase();
    
    // Verificar se é arquivo do PROTEGE
    if (extension === '.pdf' && (
      filenameLower.includes('protege') ||
      filenameLower.includes('guia') ||
      filenameLower.includes('manual') ||
      filenameLower.includes('auditoria')
    )) {
      return 'PROTEGE';
    }
    
    // Verificar se é arquivo SPED
    if (this.isSpedFile(filename)) {
      return 'SPED';
    }
    
    return 'OUTROS';
  }

  /**
   * Extrai informações de empresa e período do caminho do arquivo
   */
  private extractPathInfo(filePath: string): { empresaId?: string; ano?: number; mes?: number } {
    const pathParts = filePath.split(/[\\\/]/);
    const info: { empresaId?: string; ano?: number; mes?: number } = {};

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i].toLowerCase();

      // Identifica pastas de empresa
      if (this.config.empresaFolders.some(folder => part.includes(folder))) {
        // Próxima parte pode ser o CNPJ ou nome da empresa
        if (pathParts[i + 1]) {
          info.empresaId = pathParts[i + 1];
        }
      }

      // Identifica anos
      const yearMatch = part.match(/(20\d{2})/);
      if (yearMatch) {
        info.ano = parseInt(yearMatch[1]);
      }

      // Identifica meses
      const monthMatch = part.match(/(0?[1-9]|1[0-2])/);
      if (monthMatch && info.ano) {
        info.mes = parseInt(monthMatch[1]);
      }
    }

    return info;
  }

  /**
   * Processa um arquivo baseado no seu tipo
   */
  private async processFile(fileInfo: FileInfo): Promise<void> {
    try {
      logInfo('Processando arquivo', {
        filename: fileInfo.filename,
        tipo: fileInfo.tipo,
        empresaId: fileInfo.empresaId,
        size: fileInfo.size,
      });

      switch (fileInfo.tipo) {
        case 'SPED':
          await this.processSpedFile(fileInfo);
          break;
        case 'PROTEGE':
          await this.processProtegeFile(fileInfo);
          break;
        default:
          await this.processGenericFile(fileInfo);
      }

      logInfo('Arquivo processado com sucesso', {
        filename: fileInfo.filename,
        tipo: fileInfo.tipo,
      });
    } catch (error) {
      logError('Erro ao processar arquivo', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: fileInfo.filename,
        tipo: fileInfo.tipo,
      });
    }
  }

  /**
   * Processa arquivos do PROTEGE
   */
  private async processProtegeFile(fileInfo: FileInfo): Promise<void> {
    try {
      if (!fileInfo.empresaId) {
        logInfo('Arquivo PROTEGE sem empresa identificada', {
          filename: fileInfo.filename,
        });
        return;
      }

      logInfo('Processando arquivo PROTEGE', {
        filename: fileInfo.filename,
        empresaId: fileInfo.empresaId,
      });

      // Processar PDF do PROTEGE
      const arquivo = {
        nome: fileInfo.filename,
        caminho: fileInfo.path
      };

      // Processar PDF e extrair regras
      const configuracao = await ProtegeService.processarPdfsProtege(
        fileInfo.empresaId,
        [arquivo]
      );

      logInfo('Arquivo PROTEGE processado com sucesso', {
        filename: fileInfo.filename,
        empresaId: fileInfo.empresaId,
        regras: configuracao.regras.length,
        beneficios: configuracao.beneficios.length,
      });

      // Se há dados de período, calcular PROTEGE automaticamente
      if (fileInfo.ano && fileInfo.mes) {
        const periodo = `${fileInfo.ano.toString().padStart(4, '0')}${fileInfo.mes.toString().padStart(2, '0')}`;
        
        try {
          const resultado = await ProtegeService.calcularProtege(
            fileInfo.empresaId,
            periodo,
            configuracao
          );

          logInfo('PROTEGE calculado automaticamente', {
            empresaId: fileInfo.empresaId,
            periodo,
            valorFinal: resultado.resultado.valorFinal,
            status: resultado.status,
          });
        } catch (error) {
          logInfo('Erro ao calcular PROTEGE automaticamente', {
            empresaId: fileInfo.empresaId,
            periodo,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

    } catch (error) {
      logError('Erro ao processar arquivo PROTEGE', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: fileInfo.filename,
        empresaId: fileInfo.empresaId,
      });
      throw error;
    }
  }

  /**
   * Processa arquivos genéricos
   */
  private async processGenericFile(fileInfo: FileInfo): Promise<void> {
    try {
      // Processamento genérico de documentos
      const documentData = {
        filename: fileInfo.filename,
        filePath: fileInfo.path,
        size: fileInfo.size,
        empresaId: fileInfo.empresaId,
        ano: fileInfo.ano,
        mes: fileInfo.mes,
        lastModified: fileInfo.lastModified,
      };

      logInfo('Processando arquivo genérico', documentData);

      // Aqui você pode adicionar lógica específica para outros tipos de arquivo
      // Por exemplo, processamento com IA, extração de dados, etc.

    } catch (error) {
      logError('Erro ao processar arquivo genérico', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: fileInfo.filename,
      });
      throw error;
    }
  }

  /**
   * Verifica se o arquivo é SPED baseado no conteúdo
   */
  private isSpedFile(filePath: string): boolean {
    try {
      const content = readFileSync(filePath, 'utf-8');
      // Verificar se contém registros típicos de SPED
      return content.includes('|C100|') || 
             content.includes('|M100|') || 
             content.includes('|M200|') ||
             content.includes('|0000|') ||
             content.includes('|9999|');
    } catch (error) {
      return false;
    }
  }

  /**
   * Processa arquivo SPED automaticamente
   */
  private async processSpedFile(fileInfo: FileInfo): Promise<void> {
    try {
      logInfo('Processando arquivo SPED automaticamente', {
        filename: fileInfo.filename,
        empresaId: fileInfo.empresaId,
      });

      // Processar SPED
      const result = await DocumentProcessor.processSped(fileInfo.path, fileInfo.empresaId);

      logInfo('Arquivo SPED processado com sucesso', {
        filename: fileInfo.filename,
        tipo: result.tipo,
        documentId: result.documentId,
        itensCount: result.itens?.length || 0,
        apuracaoCount: result.apuracao?.length || 0,
      });
    } catch (error) {
      logError('Erro ao processar arquivo SPED', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileInfo,
      });
    }
  }

  /**
   * Determina o MIME type baseado na extensão
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.sped': 'text/plain',
      '.ecd': 'text/plain',
      '.ecf': 'text/plain',
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Obtém estatísticas do monitoramento
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      processedFiles: this.processedFiles.size,
      config: this.config,
    };
  }

  /**
   * Limpa arquivos processados (útil para reiniciar o monitoramento)
   */
  clearProcessedFiles(): void {
    this.processedFiles.clear();
    logInfo('Lista de arquivos processados limpa');
  }
}