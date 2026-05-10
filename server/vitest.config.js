process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'exactly-32-byte-encryption-key!!';

export default {
  test: {
    include: ['src/__tests__/**/*.test.{js,mjs}'],
    exclude: ['src/__tests__/route/core.test.js', 'src/__tests__/contract.test.js'],
    testTimeout: 5000,
    mockReset: true,
    restoreMocks: true,
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    env: {
      ENCRYPTION_KEY: 'exactly-32-byte-encryption-key!!',
    },
  },
};
