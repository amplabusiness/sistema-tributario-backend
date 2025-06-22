import { jest } from '@jest/globals';

type MockFn<T = any> = jest.Mock & {
  mockResolvedValue(value: T): MockFn<T>;
};

// Create typed mock functions
function createMock<T>(): MockFn<T> {
  return jest.fn() as MockFn<T>;
}

// Mock types
export interface BcryptMock {
  hash: MockFn<string>;
  compare: MockFn<boolean>;
}

export interface QueueMock {
  add: MockFn<{ id: string }>;
  process: jest.Mock;
}

export interface JWTMock {
  sign: MockFn<string>;
  verify: MockFn<{ id: string; role: string }>;
}

// Create mocks
export const mockBcrypt: BcryptMock = {
  hash: createMock<string>(),
  compare: createMock<boolean>(),
};

export const mockJWT: JWTMock = {
  sign: createMock<string>(),
  verify: createMock<{ id: string; role: string }>(),
};

export const mockQueue: QueueMock = {
  add: createMock<{ id: string }>(),
  process: jest.fn(),
};

// Setup mock implementations
mockBcrypt.hash.mockResolvedValue('hashed-password');
mockBcrypt.compare.mockResolvedValue(true);
mockJWT.sign.mockResolvedValue('mock-token');
mockJWT.verify.mockResolvedValue({ id: 'mock-user-id', role: 'USER' });
mockQueue.add.mockResolvedValue({ id: 'mock-job-id' });

// Mock all required modules
jest.mock('bcrypt', () => mockBcrypt);
jest.mock('jsonwebtoken', () => mockJWT);
jest.mock('bull', () => ({
  default: jest.fn().mockImplementation(() => mockQueue)
}));
