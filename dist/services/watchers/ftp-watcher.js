"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FTPWatcher = void 0;
const events_1 = require("events");
const ftp = __importStar(require("basic-ftp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../../utils/logger");
class FTPWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.interval = null;
        this.processedFiles = new Set();
        this.config = config;
        this.downloadDir = path_1.default.join(process.cwd(), 'downloads', 'ftp');
        this.ensureDownloadDir();
        this.setupFTPClient();
    }
    ensureDownloadDir() {
        if (!fs_1.default.existsSync(this.downloadDir)) {
            fs_1.default.mkdirSync(this.downloadDir, { recursive: true });
        }
    }
    setupFTPClient() {
        this.client = new ftp.Client();
        this.client.ftp.verbose = false;
        this.client.on('ready', () => {
            (0, logger_1.logInfo)('Conexão FTP estabelecida', { host: this.config.host });
        });
        this.client.on('error', (error) => {
            (0, logger_1.logError)('Erro na conexão FTP', { error });
        });
    }
    start() {
        if (!this.config.enabled) {
            (0, logger_1.logInfo)('FTP Watcher desabilitado');
            return;
        }
        (0, logger_1.logInfo)('Iniciando FTP Watcher', {
            host: this.config.host,
            directories: this.config.directories,
        });
        this.checkDirectories();
        this.interval = setInterval(() => {
            this.checkDirectories();
        }, this.config.checkInterval);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.client) {
            this.client.close();
        }
    }
    async checkDirectories() {
        for (const directory of this.config.directories) {
            try {
                await this.checkDirectory(directory);
            }
            catch (error) {
                (0, logger_1.logError)('Erro ao verificar diretório FTP', { directory, error });
            }
        }
    }
    async checkDirectory(directory) {
        try {
            await this.connect();
            await this.client.cd(directory);
            const files = await this.client.list();
            if (files.length === 0) {
                (0, logger_1.logInfo)('Nenhum arquivo encontrado no diretório FTP', { directory });
                return;
            }
            (0, logger_1.logInfo)('Arquivos encontrados no diretório FTP', {
                directory,
                count: files.length,
            });
            for (const file of files) {
                if (file.type === '-') {
                    await this.processFile(file, directory);
                }
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao verificar diretório FTP', {
                directory,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        finally {
            this.client.close();
        }
    }
    async processFile(file, directory) {
        try {
            const fileId = `${directory}-${file.name}-${file.modifiedAt.getTime()}`;
            if (this.processedFiles.has(fileId)) {
                return;
            }
            if (!this.isFiscalFile(file.name)) {
                (0, logger_1.logInfo)('Arquivo não é fiscal, ignorando', { name: file.name });
                return;
            }
            if (file.size === 0) {
                (0, logger_1.logInfo)('Arquivo vazio, ignorando', { name: file.name });
                return;
            }
            await this.downloadFile(file, directory);
            this.processedFiles.add(fileId);
            if (this.processedFiles.size > 1000) {
                const filesArray = Array.from(this.processedFiles);
                this.processedFiles = new Set(filesArray.slice(-500));
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo FTP', {
                name: file.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    isFiscalFile(filename) {
        const nameLower = filename.toLowerCase();
        const fiscalExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt', '.zip'];
        const hasFiscalExtension = fiscalExtensions.some(ext => nameLower.endsWith(ext));
        if (!hasFiscalExtension) {
            return false;
        }
        const fiscalKeywords = [
            'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
            'fiscal', 'tributario', 'contabil', 'ecd', 'ecf', 'ciap',
            'pgdas', 'simples nacional', 'sefaz', 'receita federal'
        ];
        return fiscalKeywords.some(keyword => nameLower.includes(keyword));
    }
    async downloadFile(file, directory) {
        try {
            (0, logger_1.logInfo)('Baixando arquivo do FTP', {
                name: file.name,
                size: file.size,
                directory,
            });
            await this.connect();
            await this.client.cd(directory);
            const filePath = path_1.default.join(this.downloadDir, file.name);
            await this.client.downloadTo(filePath, file.name);
            (0, logger_1.logInfo)('Arquivo baixado com sucesso do FTP', {
                name: file.name,
                filePath,
                size: file.size,
            });
            this.emit('file', filePath);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao baixar arquivo do FTP', {
                name: file.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
        finally {
            this.client.close();
        }
    }
    async connect() {
        try {
            await this.client.access({
                host: this.config.host,
                port: this.config.port,
                user: this.config.username,
                password: this.config.password,
                secure: false,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao conectar ao servidor FTP', {
                host: this.config.host,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async searchFilesRecursively(directory) {
        try {
            await this.connect();
            await this.client.cd(directory);
            const allFiles = [];
            await this.listFilesRecursively(directory, allFiles);
            return allFiles.filter(file => this.isFiscalFile(file.name));
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar arquivos recursivamente', { directory, error });
            return [];
        }
        finally {
            this.client.close();
        }
    }
    async listFilesRecursively(currentDir, files) {
        try {
            const items = await this.client.list();
            for (const item of items) {
                if (item.type === '-') {
                    files.push({
                        name: item.name,
                        size: item.size,
                        modifiedAt: item.modifiedAt,
                        type: item.type,
                    });
                }
                else if (item.type === 'd') {
                    await this.client.cd(item.name);
                    await this.listFilesRecursively(path_1.default.join(currentDir, item.name), files);
                    await this.client.cd('..');
                }
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao listar arquivos recursivamente', { currentDir, error });
        }
    }
    async startRealTimeMonitoring() {
        try {
            (0, logger_1.logInfo)('Iniciando monitoramento em tempo real do FTP');
            const realTimeInterval = setInterval(async () => {
                try {
                    await this.checkDirectories();
                }
                catch (error) {
                    (0, logger_1.logError)('Erro no monitoramento em tempo real', { error });
                }
            }, 10000);
            this.interval = realTimeInterval;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar monitoramento em tempo real', { error });
        }
    }
    async testConnection() {
        try {
            await this.connect();
            (0, logger_1.logInfo)('Teste de conexão FTP bem-sucedido', { host: this.config.host });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Teste de conexão FTP falhou', { host: this.config.host, error });
            return false;
        }
        finally {
            this.client.close();
        }
    }
    async listAllFiscalFiles() {
        const allFiles = [];
        for (const directory of this.config.directories) {
            try {
                const files = await this.searchFilesRecursively(directory);
                allFiles.push(...files);
            }
            catch (error) {
                (0, logger_1.logError)('Erro ao listar arquivos do diretório', { directory, error });
            }
        }
        (0, logger_1.logInfo)('Listagem completa de arquivos fiscais do FTP', {
            count: allFiles.length,
            directories: this.config.directories,
        });
        return allFiles;
    }
}
exports.FTPWatcher = FTPWatcher;
//# sourceMappingURL=ftp-watcher.js.map