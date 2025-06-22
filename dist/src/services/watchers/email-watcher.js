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
exports.EmailWatcher = void 0;
const events_1 = require("events");
const Imap = __importStar(require("imap"));
const mailparser_1 = require("mailparser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("../../utils/logger");
class EmailWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.interval = null;
        this.processedEmails = new Set();
        this.config = config;
        this.downloadDir = path.join(process.cwd(), 'downloads', 'email');
        this.ensureDownloadDir();
        this.connect();
    }
    ensureDownloadDir() {
        if (!fs.existsSync(this.downloadDir)) {
            fs.mkdirSync(this.downloadDir, { recursive: true });
        }
    }
    connect() {
        try {
            this.imap = new Imap({
                user: this.config.username,
                password: this.config.password,
                host: this.config.host,
                port: this.config.port,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
            });
            this.imap.on('ready', () => {
                (0, logger_1.logInfo)('Conexão IMAP estabelecida', { host: this.config.host });
                this.startMonitoring();
            });
            this.imap.on('error', (error) => {
                (0, logger_1.logError)('Erro na conexão IMAP', { error });
            });
            this.imap.on('end', () => {
                (0, logger_1.logInfo)('Conexão IMAP encerrada');
            });
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao conectar ao IMAP', { error });
        }
    }
    start() {
        this.imap.connect();
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.imap) {
            this.imap.end();
        }
    }
    startMonitoring() {
        this.checkEmails();
        this.interval = setInterval(() => {
            this.checkEmails();
        }, this.config.checkInterval);
    }
    checkEmails() {
        this.config.folders.forEach(folder => {
            this.checkFolder(folder);
        });
    }
    checkFolder(folder) {
        this.imap.openBox(folder, false, (err, box) => {
            if (err) {
                (0, logger_1.logError)('Erro ao abrir pasta de e-mail', { folder, error: err });
                return;
            }
            const searchCriteria = [
                ['UNSEEN'],
                ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
            ];
            this.imap.search(searchCriteria, (err, results) => {
                if (err) {
                    (0, logger_1.logError)('Erro ao buscar e-mails', { folder, error: err });
                    return;
                }
                if (results.length === 0) {
                    return;
                }
                (0, logger_1.logInfo)('E-mails encontrados', { folder, count: results.length });
                this.processEmails(results, folder);
            });
        });
    }
    processEmails(uids, folder) {
        const fetch = this.imap.fetch(uids, {
            bodies: '',
            struct: true,
            envelope: true,
        });
        fetch.on('message', (msg, seqno) => {
            let buffer = '';
            let attributes;
            msg.on('body', (stream, info) => {
                stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                });
            });
            msg.once('attributes', (attrs) => {
                attributes = attrs;
            });
            msg.once('end', async () => {
                try {
                    const parsed = await (0, mailparser_1.simpleParser)(buffer);
                    await this.processEmail(parsed, attributes, folder);
                }
                catch (error) {
                    (0, logger_1.logError)('Erro ao processar e-mail', { error });
                }
            });
        });
        fetch.once('error', (err) => {
            (0, logger_1.logError)('Erro ao buscar e-mails', { error: err });
        });
    }
    async processEmail(email, attributes, folder) {
        const emailId = `${folder}-${attributes.uid}`;
        if (this.processedEmails.has(emailId)) {
            return;
        }
        (0, logger_1.logInfo)('Processando e-mail', {
            subject: email.subject,
            from: email.from?.text,
            attachments: email.attachments?.length || 0,
        });
        if (!this.isFiscalEmail(email)) {
            (0, logger_1.logInfo)('E-mail não é fiscal, ignorando', { subject: email.subject });
            return;
        }
        if (email.attachments && email.attachments.length > 0) {
            for (const attachment of email.attachments) {
                await this.processAttachment(attachment, emailId);
            }
        }
        this.processedEmails.add(emailId);
        if (this.processedEmails.size > 1000) {
            const emailsArray = Array.from(this.processedEmails);
            this.processedEmails = new Set(emailsArray.slice(-500));
        }
    }
    isFiscalEmail(email) {
        const subject = email.subject?.toLowerCase() || '';
        const from = email.from?.text?.toLowerCase() || '';
        const text = email.text?.toLowerCase() || '';
        const fiscalKeywords = [
            'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
            'fiscal', 'tributário', 'contábil', 'ecd', 'ecf', 'ciap',
            'pgdas', 'simples nacional', 'sefaz', 'receita federal'
        ];
        const hasFiscalSubject = fiscalKeywords.some(keyword => subject.includes(keyword));
        if (hasFiscalSubject) {
            return true;
        }
        const fiscalDomains = [
            'sefaz', 'receita', 'contador', 'contabilidade', 'fiscal',
            'gov.br', 'sped', 'nfe'
        ];
        const hasFiscalSender = fiscalDomains.some(domain => from.includes(domain));
        if (hasFiscalSender) {
            return true;
        }
        const hasFiscalContent = fiscalKeywords.some(keyword => text.includes(keyword));
        return hasFiscalContent;
    }
    async processAttachment(attachment, emailId) {
        try {
            const filename = attachment.filename || `attachment-${Date.now()}`;
            const filePath = path.join(this.downloadDir, `${emailId}-${filename}`);
            const ext = path.extname(filename).toLowerCase();
            const allowedExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt', '.zip'];
            if (!allowedExtensions.includes(ext)) {
                (0, logger_1.logInfo)('Anexo ignorado - extensão não suportada', { filename, ext });
                return;
            }
            fs.writeFileSync(filePath, attachment.content);
            (0, logger_1.logInfo)('Anexo salvo', {
                filename,
                filePath,
                size: attachment.content.length,
            });
            this.emit('file', filePath);
        }
        catch (error) {
            (0, logger_1.logError)('Erro ao processar anexo', {
                filename: attachment.filename,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
exports.EmailWatcher = EmailWatcher;
//# sourceMappingURL=email-watcher.js.map