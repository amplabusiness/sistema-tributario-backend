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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveWatcher = void 0;
const events_1 = require("events");
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../../utils/logger");
class GoogleDriveWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.interval = null;
        this.processedFiles = new Set();
        this.config = config;
        this.downloadDir = path.join(process.cwd(), 'downloads', 'google-drive');
        this.ensureDownloadDir();
        this.setupGoogleDrive();
    }
    ensureDownloadDir() {
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
    }
    setupGoogleDrive() {
        try {
            const credentials = JSON.parse(this.config.credentials);
            const auth = new googleapis_1.google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            });
            this.drive = googleapis_1.google.drive({ version: 'v3', auth });
            (0, logger_1.logInfo)('Google Drive API configurada com sucesso');
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao configurar Google Drive API', { error });
        }
    }
    start() {
        if (!this.config.enabled || !this.drive) {
            (0, logger_1.logInfo)('Google Drive Watcher desabilitado ou não configurado');
            return;
        }
        (0, logger_1.logInfo)('Iniciando Google Drive Watcher', { folderIds: this.config.folderIds });
        this.checkFolders();
        this.interval = setInterval(() => {
            this.checkFolders();
        }, this.config.checkInterval);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    async checkFolders() {
        for (const folderId of this.config.folderIds) {
            try {
                await this.checkFolder(folderId);
            }
            catch (error) {
                (0, logger_1.logError)('Erro ao verificar pasta do Google Drive', { folderId, error });
            }
        }
    }
    async checkFolder(folderId) {
        try {
            (0, logger_1.logInfo)('Verificando pasta do Google Drive', { folderId });
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'files(id,name,mimeType,size,modifiedTime,parents)',
                orderBy: 'modifiedTime desc',
                pageSize: 100,
            });
            const files = response.data.files || [];
            if (files.length === 0) {
                (0, logger_1.logInfo)('Nenhum arquivo encontrado na pasta', { folderId });
                return;
            }
            (0, logger_1.logInfo)('Arquivos encontrados na pasta', { folderId, count: files.length });
            for (const file of files) {
                await this.processFile(file);
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao listar arquivos da pasta', {
                folderId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async processFile(file) {
        try {
            if (this.processedFiles.has(file.id)) {
                return;
            }
            if (!this.isFiscalFile(file)) {
                (0, logger_1.logInfo)('Arquivo não é fiscal, ignorando', { name: file.name });
                return;
            }
            if (!this.canDownloadFile(file)) {
                (0, logger_1.logInfo)('Arquivo não pode ser baixado', { name: file.name, mimeType: file.mimeType });
                return;
            }
            await this.downloadFile(file);
            this.processedFiles.add(file.id);
            if (this.processedFiles.size > 1000) {
                const filesArray = Array.from(this.processedFiles);
                this.processedFiles = new Set(filesArray.slice(-500));
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo do Google Drive', {
                fileId: file.id,
                name: file.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    isFiscalFile(file) {
        const name = file.name.toLowerCase();
        const fiscalExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt'];
        const hasFiscalExtension = fiscalExtensions.some(ext => name.endsWith(ext));
        if (!hasFiscalExtension) {
            return false;
        }
        const fiscalKeywords = [
            'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
            'fiscal', 'tributario', 'contabil', 'ecd', 'ecf', 'ciap',
            'pgdas', 'simples nacional', 'sefaz', 'receita federal'
        ];
        return fiscalKeywords.some(keyword => name.includes(keyword));
    }
    canDownloadFile(file) {
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
    async downloadFile(file) {
        try {
            (0, logger_1.logInfo)('Baixando arquivo do Google Drive', {
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
            fs.writeFileSync(filePath, response.data);
            (0, logger_1.logInfo)('Arquivo baixado com sucesso', {
                name: file.name,
                filePath,
                size: file.size,
            });
            this.emit('file', filePath);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao baixar arquivo do Google Drive', {
                fileId: file.id,
                name: file.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async searchFiscalFiles(query = '') {
        try {
            const fiscalQuery = query || 'fiscal OR tributario OR contabil OR nfe OR sped';
            const response = await this.drive.files.list({
                q: `(name contains 'fiscal' OR name contains 'tributario' OR name contains 'contabil' OR name contains 'nfe' OR name contains 'sped') and trashed=false`,
                fields: 'files(id,name,mimeType,size,modifiedTime,parents)',
                orderBy: 'modifiedTime desc',
                pageSize: 100,
            });
            return response.data.files || [];
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar arquivos fiscais', { error });
            return [];
        }
    }
    async setupWebhook(webhookUrl) {
        try {
            const response = await this.drive.changes.watch({
                requestBody: {
                    id: `fiscal-watcher-${Date.now()}`,
                    type: 'web_hook',
                    address: webhookUrl,
                    token: 'fiscal-token',
                },
            });
            (0, logger_1.logInfo)('Webhook configurado para Google Drive', { webhookUrl });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao configurar webhook do Google Drive', { error });
        }
    }
}
exports.GoogleDriveWatcher = GoogleDriveWatcher;
//# sourceMappingURL=google-drive-watcher.js.map