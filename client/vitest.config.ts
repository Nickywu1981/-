import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['utils/__tests__/**/*.test.ts', 'stores/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**', '.nuxt/**', '.output/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['utils/**', 'stores/**', 'composables/**'],
    },
  },
});
