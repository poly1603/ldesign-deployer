import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'lib/',
        'es/',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/types/**',
        'src/cli.ts', // CLI 需要 E2E 测试
      ],
    },
    include: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts'],
    exclude: ['node_modules', 'dist', 'lib', 'es'],
  },
})




