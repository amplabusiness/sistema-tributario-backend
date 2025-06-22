describe('Simple TypeScript Test', () => {
  it('should work with basic math', () => {
    expect(1 + 1).toBe(2);
  });

  it('should work with async/await', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  it('should work with TypeScript types', () => {
    const message: string = 'hello';
    expect(message).toBe('hello');
  });
}); 