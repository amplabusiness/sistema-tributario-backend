"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockQueue = exports.mockJWT = exports.mockBcrypt = void 0;
const globals_1 = require("@jest/globals");
function createMock() {
    return globals_1.jest.fn();
}
exports.mockBcrypt = {
    hash: createMock(),
    compare: createMock(),
};
exports.mockJWT = {
    sign: createMock(),
    verify: createMock(),
};
exports.mockQueue = {
    add: createMock(),
    process: globals_1.jest.fn(),
};
exports.mockBcrypt.hash.mockResolvedValue('hashed-password');
exports.mockBcrypt.compare.mockResolvedValue(true);
exports.mockJWT.sign.mockResolvedValue('mock-token');
exports.mockJWT.verify.mockResolvedValue({ id: 'mock-user-id', role: 'USER' });
exports.mockQueue.add.mockResolvedValue({ id: 'mock-job-id' });
globals_1.jest.mock('bcrypt', () => exports.mockBcrypt);
globals_1.jest.mock('jsonwebtoken', () => exports.mockJWT);
globals_1.jest.mock('bull', () => ({
    default: globals_1.jest.fn().mockImplementation(() => exports.mockQueue)
}));
//# sourceMappingURL=mocks.js.map