"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
const tiktoken_1 = require("tiktoken");
const MAX_TOKENS = 8000;
function chunkText(text, maxTokens = MAX_TOKENS, model = "gpt-4") {
    const encoder = (0, tiktoken_1.encoding_for_model)(model);
    const sentences = text.split(/(?<=[.!?])\s+/);
    let chunks = [];
    let currentChunk = "";
    for (const sentence of sentences) {
        const testChunk = currentChunk ? currentChunk + " " + sentence : sentence;
        const tokens = encoder.encode(testChunk);
        if (tokens.length > maxTokens) {
            if (currentChunk)
                chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
        else {
            currentChunk = testChunk;
        }
    }
    if (currentChunk)
        chunks.push(currentChunk.trim());
    return chunks;
}
//# sourceMappingURL=chunking.js.map