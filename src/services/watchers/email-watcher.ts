import { EventEmitter } from 'events';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logError } from '../../utils/logger';

export interface EmailConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  folders: string[];
  checkInterval: number;
}

export class EmailWatcher extends EventEmitter {
  private config: EmailConfig;
  private imap!: Imap;
  private interval: NodeJS.Timeout | null = null;
  private processedEmails: Set<string> = new Set();
  private downloadDir: string;

  constructor(config: EmailConfig) {
    super();
    this.config = config;
    this.downloadDir = path.join(process.cwd(), 'downloads', 'email');
    this.ensureDownloadDir();
    this.connect();
  }

  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  private connect(): void {
    try {
      this.imap = new (Imap as any)({
        user: this.config.username,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      });

      this.imap.on('ready', () => {
        logInfo('Conexão IMAP estabelecida', { host: this.config.host });
        this.startMonitoring();
      });

      this.imap.on('error', (error: any) => {
        logError('Erro na conexão IMAP', { error });
      });

      this.imap.on('end', () => {
        logInfo('Conexão IMAP encerrada');
      });
    } catch (error) {
      logError('Erro ao conectar ao IMAP', { error });
    }
  }

  start(): void {
    this.imap.connect();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.imap) {
      this.imap.end();
    }
  }

  private startMonitoring(): void {
    // Verificação inicial
    this.checkEmails();

    // Verificação periódica
    this.interval = setInterval(() => {
      this.checkEmails();
    }, this.config.checkInterval);
  }

  private checkEmails(): void {
    this.config.folders.forEach(folder => {
      this.checkFolder(folder);
    });
  }

  private checkFolder(folder: string): void {
    this.imap.openBox(folder, false, (err, box) => {
      if (err) {
        logError('Erro ao abrir pasta de e-mail', { folder, error: err });
        return;
      }

      // Buscar e-mails não lidos dos últimos 7 dias
      const searchCriteria = [
        ['UNSEEN'],
        ['SINCE', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]
      ];

      this.imap.search(searchCriteria, (err, results) => {
        if (err) {
          logError('Erro ao buscar e-mails', { folder, error: err });
          return;
        }

        if (results.length === 0) {
          return;
        }

        logInfo('E-mails encontrados', { folder, count: results.length });
        this.processEmails(results, folder);
      });
    });
  }

  private processEmails(uids: number[], folder: string): void {
    const fetch = this.imap.fetch(uids, {
      bodies: '',
      struct: true,
      envelope: true,
    });

    fetch.on('message', (msg, seqno) => {
      let buffer = '';
      let attributes: any;

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
          const parsed = await simpleParser(buffer);
          await this.processEmail(parsed, attributes, folder);
        } catch (error) {
          logError('Erro ao processar e-mail', { error });
        }
      });
    });

    fetch.once('error', (err) => {
      logError('Erro ao buscar e-mails', { error: err });
    });
  }

  private async processEmail(email: any, attributes: any, folder: string): Promise<void> {
    const emailId = `${folder}-${attributes.uid}`;
    
    if (this.processedEmails.has(emailId)) {
      return;
    }

    logInfo('Processando e-mail', {
      subject: email.subject,
      from: email.from?.text,
      attachments: email.attachments?.length || 0,
    });

    // Verificar se é um e-mail fiscal
    if (!this.isFiscalEmail(email)) {
      logInfo('E-mail não é fiscal, ignorando', { subject: email.subject });
      return;
    }

    // Processar anexos
    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        await this.processAttachment(attachment, emailId);
      }
    }

    // Marcar como processado
    this.processedEmails.add(emailId);

    // Manter apenas os últimos 1000 e-mails processados
    if (this.processedEmails.size > 1000) {
      const emailsArray = Array.from(this.processedEmails);
      this.processedEmails = new Set(emailsArray.slice(-500));
    }
  }

  private isFiscalEmail(email: any): boolean {
    const subject = email.subject?.toLowerCase() || '';
    const from = email.from?.text?.toLowerCase() || '';
    const text = email.text?.toLowerCase() || '';

    // Palavras-chave fiscais
    const fiscalKeywords = [
      'nfe', 'nf-e', 'nota fiscal', 'sped', 'icms', 'pis', 'cofins',
      'fiscal', 'tributário', 'contábil', 'ecd', 'ecf', 'ciap',
      'pgdas', 'simples nacional', 'sefaz', 'receita federal'
    ];

    // Verificar no assunto
    const hasFiscalSubject = fiscalKeywords.some(keyword => 
      subject.includes(keyword)
    );

    if (hasFiscalSubject) {
      return true;
    }

    // Verificar no remetente
    const fiscalDomains = [
      'sefaz', 'receita', 'contador', 'contabilidade', 'fiscal',
      'gov.br', 'sped', 'nfe'
    ];

    const hasFiscalSender = fiscalDomains.some(domain => 
      from.includes(domain)
    );

    if (hasFiscalSender) {
      return true;
    }

    // Verificar no corpo do e-mail
    const hasFiscalContent = fiscalKeywords.some(keyword => 
      text.includes(keyword)
    );

    return hasFiscalContent;
  }

  private async processAttachment(attachment: any, emailId: string): Promise<void> {
    try {
      const filename = attachment.filename || `attachment-${Date.now()}`;
      const filePath = path.join(this.downloadDir, `${emailId}-${filename}`);

      // Verificar extensão
      const ext = path.extname(filename).toLowerCase();
      const allowedExtensions = ['.xml', '.xlsx', '.xls', '.pdf', '.txt', '.zip'];

      if (!allowedExtensions.includes(ext)) {
        logInfo('Anexo ignorado - extensão não suportada', { filename, ext });
        return;
      }

      // Salvar anexo
      fs.writeFileSync(filePath, attachment.content);

      logInfo('Anexo salvo', {
        filename,
        filePath,
        size: attachment.content.length,
      });

      // Emitir evento para processamento
      this.emit('file', filePath);

    } catch (error) {
      logError('Erro ao processar anexo', {
        filename: attachment.filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
} 