"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const watcher_1 = require("../../src/services/watcher");
const logger_1 = require("@/utils/logger");
jest.mock('../../src/utils/logger', () => ({
    logInfo: jest.fn(),
    logError: jest.fn(),
}));
describe('Watcher Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterEach(() => {
        try {
            (0, watcher_1.stopWatchers)();
        }
        catch (error) {
        }
    });
    it('should start watcher without errors', async () => {
        await expect((0, watcher_1.startWatchers)()).resolves.not.toThrow();
        expect(logger_1.logInfo).toHaveBeenCalledWith('Iniciando sistema de monitoramento completo', expect.any(Object));
    });
    it('should stop watcher without errors', async () => {
        await (0, watcher_1.startWatchers)();
        expect(() => {
            (0, watcher_1.stopWatchers)();
        }).not.toThrow();
        expect(logger_1.logInfo).toHaveBeenCalledWith('Todos os watchers foram parados');
    });
    it('should handle multiple start/stop cycles', async () => {
        await (0, watcher_1.startWatchers)();
        (0, watcher_1.stopWatchers)();
        await (0, watcher_1.startWatchers)();
        (0, watcher_1.stopWatchers)();
        await (0, watcher_1.startWatchers)();
        (0, watcher_1.stopWatchers)();
        expect(logger_1.logInfo).toHaveBeenCalled();
    });
    it('should log watcher configuration', async () => {
        await (0, watcher_1.startWatchers)();
        expect(logger_1.logInfo).toHaveBeenCalledWith('Status dos watchers', expect.any(Object));
    });
});
//# sourceMappingURL=watcher.test.js.map