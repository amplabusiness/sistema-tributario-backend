"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWatcher = startWatcher;
exports.stopWatcher = stopWatcher;
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
const WATCH_CONFIG = {
    LOCAL_PATHS: [
        path_1.default.resolve(__dirname, '../../../ICMS AVIZ 04-2025/ICMS 04-2025/ENTRADAS'),
        path_1.default.resolve(__dirname, '../../../ICMS AVIZ 04-2025/ICMS 04-2025/SAIDAS 01 A 15'),
        path_1.default.resolve(__dirname, '../../../ICMS AVIZ 04-2025/ICMS 04-2025/SAIDAS 16 A 30'),
    ],
    EMAIL: {
        enabled: process.env.EMAIL_WATCHER_ENABLED === 'true',
        host: process.env.EMAIL_HOST || 'imap.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 993,
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
        folders: ['INBOX', 'FISCAL', 'SPED'],
        checkInterval: 30000,
    },
    API: {
        enabled: process.env.API_WATCHER_ENABLED === 'true',
        endpoints: process.env.API_ENDPOINTS?.split(',') || [],
        checkInterval: 60000,
        headers: {
            'Authorization': `Bearer ${process.env.API_TOKEN}`,
            'Content-Type': 'application/json',
        },
    },
    GOOGLE_DRIVE: {
        enabled: process.env.GOOGLE_DRIVE_ENABLED === 'true',
        credentials: process.env.GOOGLE_DRIVE_CREDENTIALS,
        folderIds: process.env.GOOGLE_DRIVE_FOLDER_IDS?.split(',') || [],
        checkInterval: 120000,
    },
    S3: {
        enabled: process.env.S3_WATCHER_ENABLED === 'true',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET,
        prefix: process.env.S3_PREFIX || 'fiscal/',
        checkInterval: 180000,
    },
    FTP: {
        enabled: process.env.FTP_WATCHER_ENABLED === 'true',
        host: process.env.FTP_HOST,
        port: parseInt(process.env.FTP_PORT) || 21,
        username: process.env.FTP_USERNAME,
        password: process.env.FTP_PASSWORD,
        directories: process.env.FTP_DIRECTORIES?.split(',') || ['/fiscal', '/sped'],
        checkInterval: 300000,
    },
};
const ACCEPTED_EXTENSIONS = ['.xml', '.xlsx', '.xls', '.pdf', '.txt', '.zip'];
const integrityValidator = new integrity_validator_1.IntegrityValidator();
let emailWatcher = null;
let apiWatcher = null;
let googleDriveWatcher = null;
let s3Watcher = null;
let ftpWatcher = null;
function isValidFile(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext);
}
async function validateAndProcessFile(filePath, source) {
    try {
        (0, logger_1.logInfo)('Iniciando validação de arquivo', { filePath, source });
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error('Arquivo não encontrado');
        }
        const stats = fs_1.default.statSync(filePath);
        if (!stats.isFile() || stats.size === 0) {
            throw new Error('Arquivo inválido ou vazio');
        }
        if (!isValidFile(filePath)) {
            (0, logger_1.logError)('Tipo de arquivo não suportado', { filePath, source });
            return;
        }
        const integrityResult = await integrityValidator.validateFile(filePath);
        if (!integrityResult.isValid) {
            (0, logger_1.logError)('Falha na validação de integridade', {
                filePath,
                source,
                errors: integrityResult.errors,
            });
            return;
        }
        (0, logger_1.logInfo)('Arquivo validado com sucesso', {
            filePath,
            source,
            size: stats.size,
            checksum: integrityResult.checksum,
        });
        await (0, queue_1.addIATask)({
            filePath,
            source,
            receivedAt: new Date().toISOString(),
            metadata: {
                size: stats.size,
                checksum: integrityResult.checksum,
                validation: integrityResult,
            },
        });
    }
    catch (error) {
        (0, logger_1.logError)('Erro ao validar arquivo', {
            filePath,
            source,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
function startWatcher() {
    (0, logger_1.logInfo)('Iniciando sistema de monitoramento completo', WATCH_CONFIG);
    const localWatcher = chokidar_1.default.watch(WATCH_CONFIG.LOCAL_PATHS, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: true,
        depth: 2,
    });
    localWatcher.on('add', async (filePath) => {
        await validateAndProcessFile(filePath, 'local');
    });
    localWatcher.on('error', (error) => {
        (0, logger_1.logError)('Erro no watcher de pastas locais', { error });
    });
    if (WATCH_CONFIG.EMAIL.enabled && WATCH_CONFIG.EMAIL.username && WATCH_CONFIG.EMAIL.password) {
        try {
            emailWatcher = new email_watcher_1.EmailWatcher(WATCH_CONFIG.EMAIL);
            emailWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'email');
            });
            emailWatcher.start();
            (0, logger_1.logInfo)('Watcher de e-mail iniciado', { config: WATCH_CONFIG.EMAIL });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher de e-mail', { error });
        }
    }
    if (WATCH_CONFIG.API.enabled && WATCH_CONFIG.API.endpoints.length > 0) {
        try {
            apiWatcher = new api_watcher_1.ApiWatcher(WATCH_CONFIG.API);
            apiWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'api');
            });
            apiWatcher.start();
            (0, logger_1.logInfo)('Watcher de API iniciado', { endpoints: WATCH_CONFIG.API.endpoints });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher de API', { error });
        }
    }
    if (WATCH_CONFIG.GOOGLE_DRIVE.enabled && WATCH_CONFIG.GOOGLE_DRIVE.credentials) {
        try {
            googleDriveWatcher = new google_drive_watcher_1.GoogleDriveWatcher(WATCH_CONFIG.GOOGLE_DRIVE);
            googleDriveWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'google-drive');
            });
            googleDriveWatcher.start();
            (0, logger_1.logInfo)('Watcher do Google Drive iniciado', { folderIds: WATCH_CONFIG.GOOGLE_DRIVE.folderIds });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher do Google Drive', { error });
        }
    }
    if (WATCH_CONFIG.S3.enabled && WATCH_CONFIG.S3.accessKeyId && WATCH_CONFIG.S3.secretAccessKey) {
        try {
            s3Watcher = new s3_watcher_1.S3Watcher(WATCH_CONFIG.S3);
            s3Watcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 's3');
            });
            s3Watcher.start();
            (0, logger_1.logInfo)('Watcher do S3 iniciado', { bucket: WATCH_CONFIG.S3.bucket, prefix: WATCH_CONFIG.S3.prefix });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher do S3', { error });
        }
    }
    if (WATCH_CONFIG.FTP.enabled && WATCH_CONFIG.FTP.host && WATCH_CONFIG.FTP.username) {
        try {
            ftpWatcher = new ftp_watcher_1.FTPWatcher(WATCH_CONFIG.FTP);
            ftpWatcher.on('file', async (filePath) => {
                await validateAndProcessFile(filePath, 'ftp');
            });
            ftpWatcher.start();
            (0, logger_1.logInfo)('Watcher do FTP iniciado', { host: WATCH_CONFIG.FTP.host, directories: WATCH_CONFIG.FTP.directories });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao iniciar watcher do FTP', { error });
        }
    }
    (0, logger_1.logInfo)('Sistema de monitoramento completo iniciado', {
        localPaths: WATCH_CONFIG.LOCAL_PATHS,
        emailEnabled: WATCH_CONFIG.EMAIL.enabled,
        apiEnabled: WATCH_CONFIG.API.enabled,
        googleDriveEnabled: WATCH_CONFIG.GOOGLE_DRIVE.enabled,
        s3Enabled: WATCH_CONFIG.S3.enabled,
        ftpEnabled: WATCH_CONFIG.FTP.enabled,
    });
}
function stopWatcher() {
    (0, logger_1.logInfo)('Parando sistema de monitoramento');
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
}
//# sourceMappingURL=watcher.js.map