import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.ts', '**/*.spec.tsx'],
    pool: 'forks',
    isolate: true,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/components/shared/**',
        'src/features/**/pages/**',
        'src/features/**/components/**',
        'src/hooks/**',
        'src/lib/formatters.ts',
        'src/lib/errorHandler.ts',
        'src/lib/permissions.ts',
        'src/stores/**',
      ],
      exclude: [
        'src/test/**',
        'node_modules/**',
        'src/**/__tests__/**',
        'src/components/shared/index.ts',
      ],
    },
  },
});
