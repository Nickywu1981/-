export default {
  test: {
    include: ['src/__tests__/**/*.test.{js,mjs}'],
    exclude: ['src/__tests__/route/core.test.js'],
    testTimeout: 5000,
    mockReset: true,
    restoreMocks: true,
    globals: true,
  },
};
