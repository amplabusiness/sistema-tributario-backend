"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcherService = void 0;
exports.startWatchers = startWatchers;
exports.stopWatchers = stopWatchers;
const events_1 = require("events");
const chokidar_1 = __importDefault(require("chokidar"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const queue_1 = require("./queue");
const logger_1 = require("../utils/logger");
const email_watcher_1 = require("./watchers/email-watcher");
const api_watcher_1 = require("./watchers/api-watcher");
const google_drive_watcher_1 = require("./watchers/google-drive-watcher");
const s3_watcher_1 = require("./watchers/s3-watcher");
const ftp_watcher_1 = require("./watchers/ftp-watcher");
const integrity_validator_1 = require("./validators/integrity-validator");
const DEFAULT_CONFIG = {
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
        headers: {},
    },
    googleDrive: {
        enabled: process.env.GOOGLE_DRIVE_WATCHER_ENABLED === 'true',
        credentials: process.env.GOOGLE_DRIVE_CREDENTIALS || '',
        folderIds: process.env.GOOGLE_DRIVE_FOLDER_IDS?.split(',') || [],
        checkInterval: parseInt(process.env.GOOGLE_DRIVE_CHECK_INTERVAL || '60000'),
    }
};
const WATCH_CONFIG = DEFAULT_CONFIG;
class FileWatcherService extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.ftpWatcher = new ftp_watcher_1.FTPWatcher(this.config.ftp);
        this.s3Watcher = new s3_watcher_1.S3Watcher(this.config.s3);
        this.emailWatcher = new email_watcher_1.EmailWatcher(this.config.email);
        this.apiWatcher = new api_watcher_1.ApiWatcher(this.config.api);
        this.googleDriveWatcher = new google_drive_watcher_1.GoogleDriveWatcher(this.config.googleDrive);
        const validatorConfig = {
            maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'),
            allowedExtensions: ['.xml', '.pdf', '.txt', '.csv', '.xlsx'],
            validateSignature: process.env.VALIDATE_SIGNATURE === 'true',
        };
        this.integrityValidator = new integrity_validator_1.IntegrityValidator(validatorConfig);
        this.setupWatchers();
    }
    setupWatchers() {
        if (this.config.ftp.enabled) {
            this.setupFTPWatcher();
        }
    }
    setupFTPWatcher() {
        this.ftpWatcher.on('file', async (filePath) => {
            (0, logger_1.logInfo)('FTP watcher detected new file', { filePath });
            await this.processFile(filePath);
        });
        this.ftpWatcher.on('error', (error) => {
            (0, logger_1.logError)('FTP watcher error', error);
        });
    }
    async processFile(filePath) {
        try {
            const fileValidation = await this.integrityValidator.validateFile(filePath);
            if (fileValidation.isValid) {
                const task = {
                    documentId: path_1.default.basename(filePath),
                    content: await fs_1.default.promises.readFile(filePath, 'utf8'),
                    model: 'DOCUMENT_PROCESSOR',
                    filePath,
                    type: 'document-analysis',
                    metadata: {
                        source: 'ftp',
                        validationResult: fileValidation,
                    }
                };
                await (0, queue_1.addIATask)(task);
                (0, logger_1.logInfo)('File enqueued for processing', { filePath });
            }
            else {
                (0, logger_1.logError)('File validation failed', {
                    filePath,
                    errors: fileValidation.errors
                });
            }
        }
        catch (error) {
            (0, logger_1.logError)('Error processing file', {
                filePath,
                error: error.message
            });
        }
    }
}
exports.FileWatcherService = FileWatcherService;
let emailWatcher = null;
let apiWatcher = null;
let googleDriveWatcher = null;
let s3Watcher = null;
let ftpWatcher = null;
async function validateAndProcessFile(filePath, source) {
    try {
        const validator = new integrity_validator_1.IntegrityValidator({
            maxFileSize: 50 * 1024 * 1024,
            allowedExtensions: ['.xml', '.pdf', '.xlsx', '.csv', '.json'],
            validateSignature: false
        });
        const validationResult = await validator.validateFile(filePath);
        if (!validationResult.isValid) {
            (0, logger_1.logError)('Arquivo inválido', { filePath, errors: validationResult.errors });
            return;
        }
        const task = {
            documentId: path_1.default.basename(filePath),
            content: await fs_1.default.promises.readFile(filePath, 'utf8'),
            model: 'DOCUMENT_PROCESSOR',
            filePath,
            type: path_1.default.extname(filePath).toLowerCase(),
            metadata: {
                source,
                validationResult
            }
        };
        await (0, queue_1.addIATask)(task);
        (0, logger_1.logInfo)('Arquivo enfileirado para processamento', { filePath, source });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao validar/processar arquivo', { filePath, error });
    }
}
async function startWatchers(config = DEFAULT_CONFIG) {
    (0, logger_1.logInfo)('Iniciando sistema de monitoramento completo', config);
    const localWatcher = chokidar_1.default.watch(config.local.paths, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });
    localWatcher.on('add', async (filePath) => {
        (0, logger_1.logInfo)('Novo arquivo detectado', { filePath, source: 'local' });
        await validateAndProcessFile(filePath, 'local');
    });
    if (config.email.enabled && config.email.username && config.email.password) {
        try {
            emailWatcher = new email_watcher_1.EmailWatcher({
                ...config.email,
                username: config.email.username,
                password: config.email.password,
            });
            emailWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'email');
            });
            emailWatcher.start();
            (0, logger_1.logInfo)('Watcher de e-mail iniciado', { config: config.email });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher de e-mail', error);
        }
    }
    if (config.api.enabled && config.api.endpoints.length > 0) {
        try {
            apiWatcher = new api_watcher_1.ApiWatcher(config.api);
            apiWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'api');
            });
            apiWatcher.start();
            (0, logger_1.logInfo)('Watcher de API iniciado', { endpoints: config.api.endpoints });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher de API', error);
        }
    }
    if (config.googleDrive.enabled && config.googleDrive.credentials) {
        try {
            googleDriveWatcher = new google_drive_watcher_1.GoogleDriveWatcher({
                ...config.googleDrive,
                credentials: config.googleDrive.credentials,
            });
            googleDriveWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'google-drive');
            });
            googleDriveWatcher.start();
            (0, logger_1.logInfo)('Watcher do Google Drive iniciado', { folderIds: config.googleDrive.folderIds });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher do Google Drive', error);
        }
    }
    if (config.s3.enabled && config.s3.accessKeyId && config.s3.secretAccessKey && config.s3.bucket) {
        try {
            s3Watcher = new s3_watcher_1.S3Watcher({
                ...config.s3,
                accessKeyId: config.s3.accessKeyId,
                secretAccessKey: config.s3.secretAccessKey,
                bucket: config.s3.bucket,
            });
            s3Watcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 's3');
            });
            s3Watcher.start();
            (0, logger_1.logInfo)('Watcher do S3 iniciado', { bucket: config.s3.bucket, prefix: config.s3.prefix });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher do S3', error);
        }
    }
    if (config.ftp.enabled && config.ftp.host && config.ftp.username) {
        try {
            ftpWatcher = new ftp_watcher_1.FTPWatcher({
                ...config.ftp,
                host: config.ftp.host,
                username: config.ftp.username,
                password: config.ftp.password,
            });
            ftpWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'ftp');
            });
            ftpWatcher.start();
            (0, logger_1.logInfo)('Watcher do FTP iniciado', { host: config.ftp.host, directories: config.ftp.directories });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher do FTP', error);
        }
    }
    (0, logger_1.logInfo)('Status dos watchers', {
        localPaths: config.local.paths,
        emailEnabled: config.email.enabled,
        apiEnabled: config.api.enabled,
        googleDriveEnabled: config.googleDrive.enabled,
        s3Enabled: config.s3.enabled,
        ftpEnabled: config.ftp.enabled,
    });
}
function stopWatchers() {
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
    (0, logger_1.logInfo)('Todos os watchers foram parados');
}
//# sourceMappingURL=watcher.js.map