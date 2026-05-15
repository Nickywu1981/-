import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'aes256-test-key-exactly-32byte!!';

export default {
  envDir: __dirname,
  test: {
    include: ['src/__tests__/**/*.test.{js,mjs}'],
    exclude: ['src/__tests__/route/core.test.js', 'src/__tests__/contract.test.js', 'src/__tests__/load/**', 'src/__tests__/concurrency/**'],
    testTimeout: 5000,
    mockReset: true,
    restoreMocks: true,
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    env: {
      ENCRYPTION_KEY: 'aes256-test-key-exactly-32byte!!',
    },
  },
};
