"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
async function retryWithBackoff(fn, maxAttempts = 3, baseDelay = 500) {
    let attempt = 0;
    let lastError;
    while (attempt < maxAttempts) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            attempt++;
            if (attempt < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=retry.js.map