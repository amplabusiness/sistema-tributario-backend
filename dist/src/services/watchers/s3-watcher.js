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
exports.S3Watcher = void 0;
const events_1 = require("events");
const client_s3_1 = require("@aws-sdk/client-s3");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../../utils/logger");
class S3Watcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.interval = null;
        this.processedFiles = new Set();
        this.config = config;
        this.downloadDir = path.join(process.cwd(), 'downloads', 's3');
        this.ensureDownloadDir();
        this.setupS3Client();
    }
    ensureDownloadDir() {
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
    }
    setupS3Client() {
        try {
            this.s3Client = new client_s3_1.S3Client({
                region: this.config.region,
                credentials: {
                    accessKeyId: this.config.accessKeyId,
                    secretAccessKey: this.config.secretAccessKey,
                },
            });
            (0, logger_1.logInfo)('Cliente S3 configurado com sucesso', {
                region: this.config.region,
                bucket: this.config.bucket,
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao configurar cliente S3', { error });
        }
    }
    start() {
        if (!this.config.enabled || !this.s3Client) {
            (0, logger_1.logInfo)('S3 Watcher desabilitado ou não configurado');
            return;
        }
        (0, logger_1.logInfo)('Iniciando S3 Watcher', {
            bucket: this.config.bucket,
            prefix: this.config.prefix,
        });
        this.checkBucket();
        this.interval = setInterval(() => {
            this.checkBucket();
        }, this.config.checkInterval);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    async checkBucket() {
        try {
            (0, logger_1.logInfo)('Verificando bucket S3', {
                bucket: this.config.bucket,
                prefix: this.config.prefix,
            });
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: this.config.bucket,
                Prefix: this.config.prefix,
                MaxKeys: 100,
            });
            const response = await this.s3Client.send(command);
            const files = response.Contents || [];
            if (files.length === 0) {
                (0, logger_1.logInfo)('Nenhum arquivo encontrado no bucket', {
                    bucket: this.config.bucket,
                    prefix: this.config.prefix,
                });
                return;
            }
            (0, logger_1.logInfo)('Arquivos encontrados no bucket', {
                bucket: this.config.bucket,
                count: files.length,
            });
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
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao verificar bucket S3', {
                bucket: this.config.bucket,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async processFile(file) {
        try {
            const fileId = `${file.key}-${file.etag}`;
            if (this.processedFiles.has(fileId)) {
                return;
            }
            if (!this.isFiscalFile(file.key)) {
                (0, logger_1.logInfo)('Arquivo não é fiscal, ignorando', { key: file.key });
                return;
            }
            if (file.size === 0) {
                (0, logger_1.logInfo)('Arquivo vazio, ignorando', { key: file.key });
                return;
            }
            await this.downloadFile(file);
            this.processedFiles.add(fileId);
            if (this.processedFiles.size > 1000) {
                const filesArray = Array.from(this.processedFiles);
                this.processedFiles = new Set(filesArray.slice(-500));
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo do S3', {
                key: file.key,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    isFiscalFile(key) {
        const keyLower = key.toLowerCase();
        const fiscalExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt', '.zip'];
        const hasFiscalExtension = fiscalExtensions.some(ext => keyLower.endsWith(ext));
        if (!hasFiscalExtension) {
            return false;
        }
        const fiscalKeywords = [
            'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
            'fiscal', 'tributario', 'contabil', 'ecd', 'ecf', 'ciap',
            'pgdas', 'simples nacional', 'sefaz', 'receita federal'
        ];
        return fiscalKeywords.some(keyword => keyLower.includes(keyword));
    }
    async downloadFile(file) {
        try {
            (0, logger_1.logInfo)('Baixando arquivo do S3', {
                key: file.key,
                size: file.size,
                lastModified: file.lastModified,
            });
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.config.bucket,
                Key: file.key,
            });
            const response = await this.s3Client.send(command);
            if (!response.Body) {
                throw new Error('Corpo da resposta vazio');
            }
            const stream = response.Body;
            const chunks = [];
            try {
                for await (const chunk of stream) {
                    chunks.push(Buffer.from(chunk));
                }
            }
            catch (streamError) {
                throw new Error(`Erro ao ler stream: ${streamError instanceof Error ? streamError.message : 'Unknown stream error'}`);
            }
            const buffer = Buffer.concat(chunks);
            const filename = path.basename(file.key);
            const filePath = path.join(this.downloadDir, filename);
            fs.writeFileSync(filePath, buffer);
            (0, logger_1.logInfo)('Arquivo baixado com sucesso do S3', {
                key: file.key,
                filename,
                filePath,
                size: file.size,
            });
            this.emit('file', filePath);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            (0, logger_1.logError)('Erro ao baixar arquivo do S3', {
                key: file.key,
                error: errorMessage,
            });
            this.emit('error', new Error(`Erro ao baixar arquivo ${file.key}: ${errorMessage}`));
        }
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    on(event, listener) {
        return super.on(event, listener);
    }
    async searchFiles(prefix) {
        try {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: this.config.bucket,
                Prefix: prefix,
                MaxKeys: 1000,
            });
            const response = await this.s3Client.send(command);
            const files = [];
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
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao buscar arquivos no S3', { prefix, error });
            return [];
        }
    }
    async setupEventNotifications(topicArn) {
        try {
            (0, logger_1.logInfo)('Configurando notificações de eventos do S3', { topicArn });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao configurar notificações do S3', { error });
        }
    }
    async listAllFiscalFiles() {
        try {
            const allFiles = [];
            let continuationToken;
            do {
                const command = new client_s3_1.ListObjectsV2Command({
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
            (0, logger_1.logInfo)('Listagem completa de arquivos fiscais', {
                bucket: this.config.bucket,
                count: allFiles.length,
            });
            return allFiles;
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao listar todos os arquivos fiscais', { error });
            return [];
        }
    }
}
exports.S3Watcher = S3Watcher;
//# sourceMappingURL=s3-watcher.js.map