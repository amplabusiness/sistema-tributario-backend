/// <reference types="jest" />

// Declarações globais para Jest nos testes
declare global {
  const jest: any;
  const describe: (name: string, fn: () => void) => void;
  const it: (name: string, fn: () => void | Promise<void>) => void;
  const beforeEach: (fn: () => void | Promise<void>) => void;
  const afterEach: (fn: () => void | Promise<void>) => void;
  const beforeAll: (fn: () => void | Promise<void>) => void;
  const afterAll: (fn: () => void | Promise<void>) => void;
  const expect: any;
  const test: (name: string, fn: () => void | Promise<void>) => void;
}

export {};
