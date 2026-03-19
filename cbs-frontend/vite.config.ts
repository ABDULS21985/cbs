/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }

            if (id.includes('@tanstack')) {
              return 'vendor-tanstack';
            }

            if (id.includes('recharts')) {
              return 'vendor-charts';
            }

            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }

            if (id.includes('date-fns')) {
              return 'vendor-date';
            }

            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform/resolvers') ||
              id.includes('zod')
            ) {
              return 'vendor-forms';
            }

            return 'vendor';
          }

          if (id.includes('/src/features/reports/')) {
            return 'feature-reports';
          }

          if (id.includes('/src/features/lending/')) {
            return 'feature-lending';
          }

          if (id.includes('/src/features/risk/')) {
            return 'feature-risk';
          }

          if (id.includes('/src/features/treasury/')) {
            return 'feature-treasury';
          }

          if (id.includes('/src/features/wealth/')) {
            return 'feature-wealth';
          }

          if (id.includes('/src/features/tradefinance/')) {
            return 'feature-tradefinance';
          }

          if (id.includes('/src/features/contactcenter/')) {
            return 'feature-contactcenter';
          }

          if (id.includes('/src/features/payments/')) {
            return 'feature-payments';
          }

          if (id.includes('/src/features/cards/')) {
            return 'feature-cards';
          }

          if (id.includes('/src/features/admin/')) {
            return 'feature-admin';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/e2e/**', 'e2e/**', '**/*.spec.ts', '**/*.spec.tsx'],
    pool: 'forks',
    isolate: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/features/**/pages/**',
        'src/features/**/components/**',
        'src/components/**',
        'src/hooks/**',
        'src/lib/**',
        'src/stores/**',
      ],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
