module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts',
    '**/__tests__/**/*.test.ts',
    '**/jest-test-isolado/**/*.test.ts',
    '**/basic.test.ts',
    '**/test-basic.test.js'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      isolatedModules: true,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 5000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // Configurações para resolver problemas de memória
  maxWorkers: 1,
  workerIdleMemoryLimit: '256MB',
  // Configurações de performance
  cache: false,
  // Configurações para resolver problemas de compatibilidade
  extensionsToTreatAsEsm: [],
  globals: {
    'ts-jest': {
      useESM: false,
      isolatedModules: true,
    },
  },
}; 