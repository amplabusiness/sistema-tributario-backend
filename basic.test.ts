describe('Basic TypeScript Test', () => {
  it('should add numbers', () => {
    expect(2 + 2).toBe(4);
  });

  it('should handle async/await', async () => {
    const value = await Promise.resolve('ok');
    expect(value).toBe('ok');
  });
}); 