import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: './src/test/globalSetup.ts',
    setupFiles:  ['./src/test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },  // run all tests in same process → share app instance
    sequence: { concurrent: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
