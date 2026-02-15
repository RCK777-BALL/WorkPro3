import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@common': resolve(__dirname, './src/components/common'),
      '@backend-shared': resolve(__dirname, '../backend/shared'),
    }
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'src/**/*.e2e.test.ts',
      'src/**/*.pw.test.ts',
      'src/test/offlineQueue.test.ts',
      'src/test/loginMfa.test.tsx',
      'src/test/loginRoute.test.tsx',
      'src/test/maintenance.test.tsx',
      'src/test/maintenancePersistence.test.tsx',
      'src/test/reportsKpi.test.tsx',
    ],
  },
});
