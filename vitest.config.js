import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{js,vue}'],
        exclude: ['src/**/__tests__/**', 'src/main.js', 'src/stores/counter.js'],
        reporter: ['text', 'html'],
      },
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
