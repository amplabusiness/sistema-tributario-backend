export interface MockFunction<T = any, Y extends any[] = any[]> {
  (...args: Y): Promise<T>;
  mockResolvedValue(value: T): MockFunction<T, Y>;
  mockRejectedValue(error: any): MockFunction<T, Y>;
  mockImplementation(fn: (...args: Y) => Promise<T>): MockFunction<T, Y>;
}

export interface MockBcrypt {
  hash: MockFunction<string, [string]>;
  compare: MockFunction<boolean, [string, string]>;
}

export interface MockQueue {
  add: MockFunction<{ id: string }, [any]>;
}

export interface MockJWT {
  sign: MockFunction<string, [object]>;
  verify: MockFunction<object, [string]>;
}