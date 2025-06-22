// Utilitário para chunking inteligente de texto para IA (OpenAI, etc)
// Divide o texto em chunks de até 8K tokens, preferencialmente em sentenças

// Fallback simples sem tiktoken - aproximadamente 4 caracteres por token
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS = 8000;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

/**
 * Divide um texto em chunks de até maxTokens tokens, quebrando preferencialmente em sentenças.
 * @param text Texto de entrada
 * @param maxTokens Limite de tokens por chunk (default: 8000)
 * @param model Modelo de tokenização (default: 'gpt-4') - ignorado na versão simplificada
 * @returns Array de chunks de texto
 */
export function chunkText(text: string, maxTokens = MAX_TOKENS, model = "gpt-4"): string[] {
  // Versão simplificada sem tiktoken - usa aproximação de caracteres
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const sentences = text.split(/(?<=[.!?])\s+/); // quebra por sentença
  let chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const testChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    
    if (testChunk.length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      
      // Se a sentença sozinha é muito grande, quebra em palavras
      if (sentence.length > maxChars) {
        const words = sentence.split(/\s+/);
        let wordChunk = "";
        
        for (const word of words) {
          const testWordChunk = wordChunk ? wordChunk + " " + word : word;
          if (testWordChunk.length > maxChars) {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk = testWordChunk;
          }
        }
        
        if (wordChunk) currentChunk = wordChunk;
      } else {
        currentChunk = sentence;
      }
    } else {
      currentChunk = testChunk;
    }
  }
    if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.filter(chunk => chunk.length > 0);
}