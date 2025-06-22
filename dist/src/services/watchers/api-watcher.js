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
exports.ApiWatcher = void 0;
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../../utils/logger");
class ApiWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.interval = null;
        this.processedFiles = new Set();
        this.config = config;
        this.downloadDir = path.join(process.cwd(), 'downloads', 'api');
        this.ensureDownloadDir();
    }
    ensureDownloadDir() {
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
    }
    start() {
        if (!this.config.enabled || this.config.endpoints.length === 0) {
            (0, logger_1.logInfo)('API Watcher desabilitado ou sem endpoints configurados');
            return;
        }
        (0, logger_1.logInfo)('Iniciando API Watcher', { endpoints: this.config.endpoints });
        this.checkEndpoints();
        this.interval = setInterval(() => {
            this.checkEndpoints();
        }, this.config.checkInterval);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    async checkEndpoints() {
        for (const endpoint of this.config.endpoints) {
            try {
                await this.checkEndpoint(endpoint);
            }
            catch (error) {
                (0, logger_1.logError)('Erro ao verificar endpoint', { endpoint, error });
            }
        }
    }
    async checkEndpoint(endpoint) {
        try {
            (0, logger_1.logInfo)('Verificando endpoint', { endpoint });
            const response = await axios_1.default.get(endpoint, {
                headers: this.config.headers,
                timeout: 30000,
                validateStatus: (status) => status < 500,
            });
            if (response.status !== 200) {
                (0, logger_1.logError)('Endpoint retornou status não esperado', {
                    endpoint,
                    status: response.status,
                });
                return;
            }
            await this.processEndpointResponse(endpoint, response);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                (0, logger_1.logError)('Erro HTTP ao verificar endpoint', {
                    endpoint,
                    status: error.response?.status,
                    message: error.message,
                });
            }
            else {
                (0, logger_1.logError)('Erro inesperado ao verificar endpoint', {
                    endpoint,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
    }
    async processEndpointResponse(endpoint, response) {
        const contentType = response.headers['content-type'] || '';
        if (this.isFileResponse(contentType, response.data)) {
            await this.processFileResponse(endpoint, response);
            return;
        }
        if (contentType.includes('application/json')) {
            await this.processFileList(endpoint, response.data);
            return;
        }
        if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            await this.processXMLResponse(endpoint, response);
            return;
        }
        (0, logger_1.logInfo)('Tipo de resposta não suportado', {
            endpoint,
            contentType,
            dataType: typeof response.data,
        });
    }
    isFileResponse(contentType, data) {
        if (contentType.includes('application/octet-stream')) {
            return true;
        }
        const fileTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/xml',
            'application/xml',
        ];
        return fileTypes.some(type => contentType.includes(type));
    }
    async processFileResponse(endpoint, response) {
        try {
            const filename = this.extractFilename(endpoint, response.headers);
            const filePath = path.join(this.downloadDir, filename);
            const fileId = this.generateFileId(endpoint, filename);
            if (this.processedFiles.has(fileId)) {
                return;
            }
            fs.writeFileSync(filePath, response.data);
            (0, logger_1.logInfo)('Arquivo baixado via API', {
                endpoint,
                filename,
                filePath,
                size: response.data.length,
            });
            this.processedFiles.add(fileId);
            this.emit('file', filePath);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar arquivo da API', {
                endpoint,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async processFileList(endpoint, data) {
        try {
            if (!Array.isArray(data) && !data.files) {
                (0, logger_1.logInfo)('Resposta JSON não contém lista de arquivos', { endpoint });
                return;
            }
            const files = Array.isArray(data) ? data : data.files;
            for (const file of files) {
                await this.processFileFromList(endpoint, file);
            }
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar lista de arquivos', {
                endpoint,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async processFileFromList(endpoint, file) {
        try {
            if (this.processedFiles.has(file.id)) {
                return;
            }
            if (!this.isFiscalFile(file.filename)) {
                (0, logger_1.logInfo)('Arquivo não é fiscal, ignorando', { filename: file.filename });
                return;
            }
            const response = await axios_1.default.get(file.url, {
                headers: this.config.headers,
                responseType: 'arraybuffer',
                timeout: 60000,
            });
            const filePath = path.join(this.downloadDir, file.filename);
            fs.writeFileSync(filePath, response.data);
            (0, logger_1.logInfo)('Arquivo baixado da lista', {
                filename: file.filename,
                filePath,
                size: file.size,
                lastModified: file.lastModified,
            });
            this.processedFiles.add(file.id);
            this.emit('file', filePath);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao baixar arquivo da lista', {
                filename: file.filename,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async processXMLResponse(endpoint, response) {
        try {
            const filename = this.extractFilename(endpoint, response.headers) || `xml-${Date.now()}.xml`;
            const filePath = path.join(this.downloadDir, filename);
            const fileId = this.generateFileId(endpoint, filename);
            if (this.processedFiles.has(fileId)) {
                return;
            }
            if (!this.isFiscalXML(response.data)) {
                (0, logger_1.logInfo)('XML não é fiscal, ignorando', { endpoint });
                return;
            }
            fs.writeFileSync(filePath, response.data);
            (0, logger_1.logInfo)('XML fiscal baixado via API', {
                endpoint,
                filename,
                filePath,
                size: response.data.length,
            });
            this.processedFiles.add(fileId);
            this.emit('file', filePath);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar XML da API', {
                endpoint,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    extractFilename(endpoint, headers) {
        const contentDisposition = headers['content-disposition'];
        if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) {
                return match[1].replace(/['"]/g, '');
            }
        }
        const urlPath = new URL(endpoint).pathname;
        const filename = path.basename(urlPath);
        if (filename && filename !== '/') {
            return filename;
        }
        return `api-file-${Date.now()}`;
    }
    generateFileId(endpoint, filename) {
        return `${endpoint}-${filename}`;
    }
    isFiscalFile(filename) {
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
    isFiscalXML(content) {
        const fiscalTags = [
            'nfeProc', 'NFe', 'infNFe', 'CFe', 'spedFiscal',
            'spedContribuicoes', 'spedEcf', 'spedEcd'
        ];
        return fiscalTags.some(tag => content.includes(tag));
    }
}
exports.ApiWatcher = ApiWatcher;
//# sourceMappingURL=api-watcher.js.map