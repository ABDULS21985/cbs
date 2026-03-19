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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
      include: [
        'src/components/shared/**',
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
