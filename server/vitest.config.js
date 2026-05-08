export default {
  test: {
    include: ['src/__tests__/**/*.test.{js,mjs}'],
    testTimeout: 5000,
    mockReset: true,
    restoreMocks: true,
    globals: true,
  },
};
