"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FTPWatcher = void 0;
const events_1 = require("events");
const basic_ftp_1 = require("basic-ftp");
class FTPWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.client = new basic_ftp_1.Client();
        this.isWatching = false;
    }
    on(event, listener) {
        super.on(event, listener);
        return this;
    }
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    async start() {
        try {
            await this.connect();
            this.startWatching();
        }
        catch (error) {
            this.emit('error', new Error(`Failed to start FTP watcher: ${error.message}`));
        }
    }
    async stop() {
        this.isWatching = false;
        if (this.watchTimeout) {
            clearTimeout(this.watchTimeout);
        }
        await this.client.close();
    }
    async connect() {
        try {
            await this.client.access({
                host: this.config.host,
                port: this.config.port || 21,
                user: this.config.username,
                password: this.config.password,
                secure: this.config.secure
            });
            this.emit('connect');
        }
        catch (error) {
            throw new Error(`FTP connection failed: ${error.message}`);
        }
    }
    startWatching() {
        if (!this.isWatching) {
            this.isWatching = true;
            this.watchDirectories();
        }
    }
    async watchDirectories() {
        while (this.isWatching) {
            try {
                for (const directory of this.config.directories) {
                    await this.checkDirectory(directory);
                }
                await new Promise(resolve => setTimeout(resolve, this.config.watchInterval));
            }
            catch (error) {
                this.emit('error', new Error(`Error watching directories: ${error.message}`));
                await this.handleWatchError();
            }
        }
    }
    async checkDirectory(directory) {
        try {
            const files = await this.client.list(directory);
            for (const file of files) {
                if (file.type === basic_ftp_1.FileType.File) {
                    const fileInfo = this.convertToWatcherFileInfo(file, directory);
                    this.emit('file-detected', fileInfo);
                    await this.processFile(directory, fileInfo);
                    this.emit('file-processed', fileInfo);
                }
            }
        }
        catch (error) {
            throw new Error(`Error checking directory ${directory}: ${error.message}`);
        }
    }
    async processFile(directory, fileInfo) {
        try {
            this.emit('file', fileInfo.path);
        }
        catch (error) {
            this.emit('error', new Error(`Error processing file ${fileInfo.name}: ${error.message}`));
        }
    }
    convertToWatcherFileInfo(file, directory) {
        return {
            name: file.name,
            path: `${directory}/${file.name}`,
            size: file.size,
            modifiedDate: file.modifiedAt || new Date(),
            type: file.type === basic_ftp_1.FileType.Directory ? 'directory' : 'file'
        };
    }
    async handleWatchError() {
        this.emit('disconnect');
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            await this.connect();
            this.emit('reconnect');
        }
        catch (error) {
            this.emit('error', new Error(`Reconnection failed: ${error.message}`));
        }
    }
}
exports.FTPWatcher = FTPWatcher;
//# sourceMappingURL=ftp-watcher.js.map