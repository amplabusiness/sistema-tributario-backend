import { jest } from '@jest/globals';
type MockFn<T = any> = jest.Mock & {
    mockResolvedValue(value: T): MockFn<T>;
};
export interface BcryptMock {
    hash: MockFn<string>;
    compare: MockFn<boolean>;
}
export interface QueueMock {
    add: MockFn<{
        id: string;
    }>;
    process: jest.Mock;
}
export interface JWTMock {
    sign: MockFn<string>;
    verify: MockFn<{
        id: string;
        role: string;
    }>;
}
export declare const mockBcrypt: BcryptMock;
export declare const mockJWT: JWTMock;
export declare const mockQueue: QueueMock;
export {};
//# sourceMappingURL=mocks.d.ts.map