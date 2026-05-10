export default {
  test: {
    include: ['src/__tests__/**/*.test.{js,mjs}'],
    exclude: ['src/__tests__/route/core.test.js', 'src/__tests__/contract.test.js'],
    testTimeout: 5000,
    mockReset: true,
    restoreMocks: true,
    globals: true,
    env: {
      ENCRYPTION_KEY: 'exactly-32-byte-encryption-key!!',
    },
  },
};
