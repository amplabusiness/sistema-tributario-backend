import { Mock } from 'jest-mock';

declare global {
  namespace jest {
    type MockedFunction<T extends (...args: any[]) => any> = T & Mock<ReturnType<T>, Parameters<T>>;
    type Mock<T = any, Y extends any[] = any> = Mock<T, Y>;
  }
}
