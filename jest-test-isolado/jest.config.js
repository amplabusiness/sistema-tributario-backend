module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  verbose: true,
  maxWorkers: 1,
  workerIdleMemoryLimit: '256MB',
  testTimeout: 3000,
  // Configurações para reduzir uso de memória
  cache: false,
  clearMocks: true,
  restoreMocks: true,
  // Configurações específicas do ts-jest
  globals: {
    'ts-jest': {
      isolatedModules: true,
      useESM: false,
    },
  },
}; 