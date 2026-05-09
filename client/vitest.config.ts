import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname),
      '~': resolve(__dirname),
      '#app': resolve(__dirname, 'test/mocks/app.ts'),
      '#imports': resolve(__dirname, 'test/mocks/imports.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
