// Utilitário de fallback automático entre múltiplos modelos de IA
// Tenta cada modelo em ordem, usando retryWithBackoff, até obter sucesso

import { retryWithBackoff } from './retry';

/**
 * Executa uma lista de funções assíncronas (modelos IA) em ordem, com retry/backoff em cada uma.
 * @param modelFns Lista de funções assíncronas (cada uma chama um modelo de IA)
 * @param maxAttempts Tentativas por modelo (default: 3)
 * @param baseDelay Delay base para backoff (default: 500ms)
 * @returns Resultado da primeira função que obtiver sucesso
 */
export async function fallbackModels<T>(
  modelFns: Array<() => Promise<T>>,
  maxAttempts = 3,
  baseDelay = 500
): Promise<T> {
  let lastError: any;
  for (const fn of modelFns) {
    try {
      return await retryWithBackoff(fn, maxAttempts, baseDelay);
    } catch (err) {
      lastError = err;
      // tenta o próximo modelo
    }
  }
  throw lastError;
} 