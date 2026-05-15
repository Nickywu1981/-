import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname),
      '~': resolve(__dirname),
      '#app': resolve(__dirname, 'test/mocks/app.ts'),
      '#imports': resolve(__dirname, 'test/mocks/imports.ts'),
    },
  },
  plugins: [
    vue(),
    {
      name: 'nuxt-auto-import-shim',
      enforce: 'post',
      transform(code, id) {
        if (id.includes('node_modules')) return
        // Don't transform test files or mock files
        if (id.includes('__tests__') || id.includes('test/mocks')) return
        // Only transform composables, components, and stores (they use Nuxt auto-imports)
        if (!id.includes('composables') && !id.includes('components') && !id.includes('stores')) return

        const autoImports: Record<string, string[]> = {
          'vue': ['ref', 'computed', 'watch', 'watchEffect', 'onMounted', 'onUnmounted', 'reactive', 'toRef', 'toRefs', 'nextTick', 'PropType'],
          '#app': ['useNuxtApp', 'useRuntimeConfig', 'navigateTo', 'useRouter', 'useRoute'],
          '#imports': ['useI18n', 'useFetch', 'useToast', '$fetch'],
        }

        const lines: string[] = []
        for (const [mod, names] of Object.entries(autoImports)) {
          const escapedMod = mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const needed = names.filter(n =>
            new RegExp(`\\b${n}\\b`).test(code) &&
            !new RegExp(`import\\s*\\{[^}]*\\b${n}\\b[^}]*\\}\\s*from\\s*['"]${escapedMod}['"]`).test(code) &&
            !new RegExp(`import\\s+${n}\\s+from\\s*['"]${escapedMod}['"]`).test(code),
          )
          if (needed.length) lines.push(`import { ${needed.join(', ')} } from '${mod}'`)
        }

        if (!lines.length) return code

        const importBlock = lines.join('\n')

        // For raw .vue files (still have <script setup> tags), inject inside the script block
        const scriptSetupMatch = code.match(/(<script[^>]*\bsetup\b[^>]*>)/)
        if (scriptSetupMatch) {
          const tag = scriptSetupMatch[0]
          const idx = scriptSetupMatch.index! + tag.length
          return code.slice(0, idx) + '\n' + importBlock + code.slice(idx)
        }

        // For compiled .vue output or .ts/.js files, prepend imports
        return importBlock + '\n' + code
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
