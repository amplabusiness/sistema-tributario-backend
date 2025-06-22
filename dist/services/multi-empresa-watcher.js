"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiEmpresaWatcher = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const empresa_service_1 = require("./empresa-service");
const logger_1 = require("../utils/logger");
const document_processor_1 = require("./document-processor");
const protege_service_1 = require("./protege-service");
class MultiEmpresaWatcher {
    constructor(config) {
        this.isRunning = false;
        this.scanInterval = null;
        this.processedFiles = new Set();
        this.config = {
            basePath: config.basePath,
            supportedExtensions: config.supportedExtensions || ['.xml', '.txt', '.sped', '.ecd', '.ecf', '.pdf'],
            maxFileSize: config.maxFileSize || 100 * 1024 * 1024,
            scanInterval: config.scanInterval || 30000,
            empresaFolders: config.empresaFolders || ['empresa', 'company', 'cnpj'],
            yearFolders: config.yearFolders || ['2024', '2025', '2023', '2022'],
        };
    }
    async start() {
        if (this.isRunning) {
            (0, logger_1.logInfo)('MultiEmpresaWatcher já está em execução');
            return;
        }
        this.isRunning = true;
        (0, logger_1.logInfo)('Iniciando MultiEmpresaWatcher', {
            basePath: this.config.basePath,
            scanInterval: this.config.scanInterval,
        });
        await this.scanDirectory();
        this.scanInterval = setInterval(async () => {
            await this.scanDirectory();
        }, this.config.scanInterval);
    }
    stop() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        this.isRunning = false;
        (0, logger_1.logInfo)('MultiEmpresaWatcher parado');
    }
    async scanDirectory() {
        try {
            if (!(0, fs_1.existsSync)(this.config.basePath)) {
                (0, logger_1.logInfo)('Diretório base não existe', { basePath: this.config.basePath });
                return;
            }
            const files = await this.discoverFiles(this.config.basePath);
            for (const file of files) {
                if (!this.processedFiles.has(file.path)) {
                    await this.processFile(file);
                    this.processedFiles.add(file.path);
                }
            }
            (0, logger_1.logInfo)('Varredura de diretório concluída', {
                totalFiles: files.length,
                newFiles: files.filter(f => !this.processedFiles.has(f.path)).length,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro durante varredura de diretório', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async discoverFiles(dirPath) {
        const files = [];
        try {
            const items = (0, fs_1.readdirSync)(dirPath);
            for (const item of items) {
                const fullPath = (0, path_1.join)(dirPath, item);
                const stats = (0, fs_1.statSync)(fullPath);
                if (stats.isDirectory()) {
                    const subFiles = await this.discoverFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (stats.isFile()) {
                    const extension = (0, path_1.extname)(item).toLowerCase();
                    if (this.config.supportedExtensions.includes(extension)) {
                        const fileInfo = await this.analyzeFile(fullPath, stats);
                        if (fileInfo) {
                            files.push(fileInfo);
                        }
                    }
                }
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao descobrir arquivos', {
                error: error instanceof Error ? error.message : 'Unknown error',
                dirPath,
            });
        }
        return files;
    }
    async analyzeFile(filePath, stats) {
        try {
            const filename = (0, path_1.basename)(filePath);
            const extension = (0, path_1.extname)(filename).toLowerCase();
            if (stats.size > this.config.maxFileSize) {
                (0, logger_1.logInfo)('Arquivo muito grande, ignorando', {
                    filePath,
                    size: stats.size,
                    maxSize: this.config.maxFileSize,
                });
                return null;
            }
            const pathInfo = this.extractPathInfo(filePath);
            let empresaData = null;
            try {
                const fileContent = (0, fs_1.readFileSync)(filePath, 'utf-8');
                empresaData = await empresa_service_1.EmpresaService.extractEmpresaFromFile(filePath, fileContent);
            }
            catch (error) {
                (0, logger_1.logInfo)('Não foi possível ler o arquivo para extrair dados da empresa', {
                    filePath,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            const fileInfo = {
                path: filePath,
                filename,
                size: stats.size,
                extension,
                ano: pathInfo.ano,
                mes: pathInfo.mes,
                lastModified: stats.mtime,
                tipo: this.determinarTipoArquivo(filename, extension)
            };
            if (empresaData) {
                const empresa = await empresa_service_1.EmpresaService.createOrUpdateEmpresa(empresaData);
                fileInfo.empresaId = empresa.id;
            }
            return fileInfo;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao analisar arquivo', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filePath,
            });
            return null;
        }
    }
    determinarTipoArquivo(filename, extension) {
        const filenameLower = filename.toLowerCase();
        if (extension === '.pdf' && (filenameLower.includes('protege') ||
            filenameLower.includes('guia') ||
            filenameLower.includes('manual') ||
            filenameLower.includes('auditoria'))) {
            return 'PROTEGE';
        }
        if (this.isSpedFile(filename)) {
            return 'SPED';
        }
        return 'OUTROS';
    }
    extractPathInfo(filePath) {
        const pathParts = filePath.split(/[\\\/]/);
        const info = {};
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i].toLowerCase();
            if (this.config.empresaFolders.some(folder => part.includes(folder))) {
                if (pathParts[i + 1]) {
                    info.empresaId = pathParts[i + 1];
                }
            }
            const yearMatch = part.match(/(20\d{2})/);
            if (yearMatch) {
                info.ano = parseInt(yearMatch[1]);
            }
            const monthMatch = part.match(/(0?[1-9]|1[0-2])/);
            if (monthMatch && info.ano) {
                info.mes = parseInt(monthMatch[1]);
            }
        }
        return info;
    }
    async processFile(fileInfo) {
        try {
            (0, logger_1.logInfo)('Processando arquivo', {
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
            (0, logger_1.logInfo)('Arquivo processado com sucesso', {
                filename: fileInfo.filename,
                tipo: fileInfo.tipo,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filename: fileInfo.filename,
                tipo: fileInfo.tipo,
            });
        }
    }
    async processProtegeFile(fileInfo) {
        try {
            if (!fileInfo.empresaId) {
                (0, logger_1.logInfo)('Arquivo PROTEGE sem empresa identificada', {
                    filename: fileInfo.filename,
                });
                return;
            }
            (0, logger_1.logInfo)('Processando arquivo PROTEGE', {
                filename: fileInfo.filename,
                empresaId: fileInfo.empresaId,
            });
            const arquivo = {
                nome: fileInfo.filename,
                caminho: fileInfo.path
            };
            const configuracao = await protege_service_1.ProtegeService.processarPdfsProtege(fileInfo.empresaId, [arquivo]);
            (0, logger_1.logInfo)('Arquivo PROTEGE processado com sucesso', {
                filename: fileInfo.filename,
                empresaId: fileInfo.empresaId,
                regras: configuracao.regras.length,
                beneficios: configuracao.beneficios.length,
            });
            if (fileInfo.ano && fileInfo.mes) {
                const periodo = `${fileInfo.ano.toString().padStart(4, '0')}${fileInfo.mes.toString().padStart(2, '0')}`;
                try {
                    const resultado = await protege_service_1.ProtegeService.calcularProtege(fileInfo.empresaId, periodo, configuracao);
                    (0, logger_1.logInfo)('PROTEGE calculado automaticamente', {
                        empresaId: fileInfo.empresaId,
                        periodo,
                        valorFinal: resultado.resultado.valorFinal,
                        status: resultado.status,
                    });
                }
                catch (error) {
                    (0, logger_1.logInfo)('Erro ao calcular PROTEGE automaticamente', {
                        empresaId: fileInfo.empresaId,
                        periodo,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo PROTEGE', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filename: fileInfo.filename,
                empresaId: fileInfo.empresaId,
            });
            throw error;
        }
    }
    async processGenericFile(fileInfo) {
        try {
            const documentData = {
                filename: fileInfo.filename,
                filePath: fileInfo.path,
                size: fileInfo.size,
                empresaId: fileInfo.empresaId,
                ano: fileInfo.ano,
                mes: fileInfo.mes,
                lastModified: fileInfo.lastModified,
            };
            (0, logger_1.logInfo)('Processando arquivo genérico', documentData);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo genérico', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filename: fileInfo.filename,
            });
            throw error;
        }
    }
    isSpedFile(filePath) {
        try {
            const content = (0, fs_1.readFileSync)(filePath, 'utf-8');
            return content.includes('|C100|') ||
                content.includes('|M100|') ||
                content.includes('|M200|') ||
                content.includes('|0000|') ||
                content.includes('|9999|');
        }
        catch (error) {
            return false;
        }
    }
    async processSpedFile(fileInfo) {
        try {
            (0, logger_1.logInfo)('Processando arquivo SPED automaticamente', {
                filename: fileInfo.filename,
                empresaId: fileInfo.empresaId,
            });
            const result = await document_processor_1.DocumentProcessor.processSped(fileInfo.path, fileInfo.empresaId);
            (0, logger_1.logInfo)('Arquivo SPED processado com sucesso', {
                filename: fileInfo.filename,
                tipo: result.tipo,
                documentId: result.documentId,
                itensCount: result.itens?.length || 0,
                apuracaoCount: result.apuracao?.length || 0,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo SPED', {
                error: error instanceof Error ? error.message : 'Unknown error',
                fileInfo,
            });
        }
    }
    getMimeType(extension) {
        const mimeTypes = {
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
    getStats() {
        return {
            isRunning: this.isRunning,
            processedFiles: this.processedFiles.size,
            config: this.config,
        };
    }
    clearProcessedFiles() {
        this.processedFiles.clear();
        (0, logger_1.logInfo)('Lista de arquivos processados limpa');
    }
}
exports.MultiEmpresaWatcher = MultiEmpresaWatcher;
//# sourceMappingURL=multi-empresa-watcher.js.map