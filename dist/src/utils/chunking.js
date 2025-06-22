"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkText = chunkText;
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS = 8000;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;
function chunkText(text, maxTokens = MAX_TOKENS, model = "gpt-4") {
    const maxChars = maxTokens * CHARS_PER_TOKEN;
    const sentences = text.split(/(?<=[.!?])\s+/);
    let chunks = [];
    let currentChunk = "";
    for (const sentence of sentences) {
        const testChunk = currentChunk ? currentChunk + " " + sentence : sentence;
        if (testChunk.length > maxChars) {
            if (currentChunk)
                chunks.push(currentChunk.trim());
            if (sentence.length > maxChars) {
                const words = sentence.split(/\s+/);
                let wordChunk = "";
                for (const word of words) {
                    const testWordChunk = wordChunk ? wordChunk + " " + word : word;
                    if (testWordChunk.length > maxChars) {
                        if (wordChunk)
                            chunks.push(wordChunk.trim());
                        wordChunk = word;
                    }
                    else {
                        wordChunk = testWordChunk;
                    }
                }
                if (wordChunk)
                    currentChunk = wordChunk;
            }
            else {
                currentChunk = sentence;
            }
        }
        else {
            currentChunk = testChunk;
        }
    }
    if (currentChunk)
        chunks.push(currentChunk.trim());
    return chunks.filter(chunk => chunk.length > 0);
}
//# sourceMappingURL=chunking.js.map