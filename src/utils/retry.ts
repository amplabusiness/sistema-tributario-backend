// Utilitário de retry automático com backoff exponencial
// Tenta executar uma função assíncrona até N vezes, aguardando entre as tentativas

/**
 * Executa uma função assíncrona com retry automático e backoff exponencial.
 * @param fn Função assíncrona a ser executada
 * @param maxAttempts Número máximo de tentativas (default: 3)
 * @param baseDelay Tempo base de espera em ms (default: 500)
 * @returns Resultado da função, ou lança o último erro
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelay = 500): Promise<T> {
  let attempt = 0;
  let lastError: any;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponencial
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
} 