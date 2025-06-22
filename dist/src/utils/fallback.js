"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackModels = fallbackModels;
const retry_1 = require("./retry");
async function fallbackModels(modelFns, maxAttempts = 3, baseDelay = 500) {
    let lastError;
    for (const fn of modelFns) {
        try {
            return await (0, retry_1.retryWithBackoff)(fn, maxAttempts, baseDelay);
        }
        catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}
//# sourceMappingURL=fallback.js.map